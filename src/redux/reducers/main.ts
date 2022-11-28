import {Draft, PayloadAction, createAsyncThunk, createNextState, createSlice} from '@reduxjs/toolkit';

import isEqual from 'lodash/isEqual';
import log from 'loglevel';
import path from 'path';
import {v4 as uuidv4} from 'uuid';

import {CLUSTER_DIFF_PREFIX, PREVIEW_PREFIX} from '@constants/constants';

import {transferResource} from '@redux/compare';
import {AppListenerFn} from '@redux/listeners/base';
import {currentConfigSelector} from '@redux/selectors';
import {HelmChartEventEmitter} from '@redux/services/helm';
import {previewSavedCommand} from '@redux/services/previewCommand';
import {getK8sVersion} from '@redux/services/projectConfig';
import {reprocessOptionalRefs} from '@redux/services/resourceRefs';
import {resetSelectionHistory} from '@redux/services/selectionHistory';
import {loadPolicies} from '@redux/thunks/loadPolicies';
import {multiplePathsAdded} from '@redux/thunks/multiplePathsAdded';
import {multiplePathsChanged} from '@redux/thunks/multiplePathsChanged';
import {previewCluster, repreviewCluster} from '@redux/thunks/previewCluster';
import {previewHelmValuesFile} from '@redux/thunks/previewHelmValuesFile';
import {previewKustomization} from '@redux/thunks/previewKustomization';
import {removeResources} from '@redux/thunks/removeResources';
import {runPreviewConfiguration} from '@redux/thunks/runPreviewConfiguration';
import {saveUnsavedResources} from '@redux/thunks/saveUnsavedResources';
import {setRootFolder} from '@redux/thunks/setRootFolder';
import {updateFileEntries, updateFileEntry} from '@redux/thunks/updateFileEntry';
import {updateMultipleResources} from '@redux/thunks/updateMultipleResources';
import {updateResource} from '@redux/thunks/updateResource';

import {isResourcePassingFilter} from '@utils/resources';
import {parseYamlDocument} from '@utils/yaml';

import {ROOT_FILE_ENTRY} from '@shared/constants/fileEntry';
import {DIFF} from '@shared/constants/telemetry';
import {AlertType} from '@shared/models/alert';
import {
  AppState,
  FileMapType,
  HelmChartMapType,
  HelmTemplatesMapType,
  HelmValuesMapType,
  ImagesListType,
  MatchParamProps,
  PreviewType,
  ResourceFilterType,
  ResourceMapType,
  SelectionHistoryEntry,
} from '@shared/models/appState';
import {ProjectConfig} from '@shared/models/config';
import {CurrentMatch, FileEntry} from '@shared/models/fileEntry';
import {HelmChart} from '@shared/models/helm';
import {ImageType} from '@shared/models/image';
import {ValidationIntegration} from '@shared/models/integrations';
import {K8sResource} from '@shared/models/k8sResource';
import {ThunkApi} from '@shared/models/thunk';
import electronStore from '@shared/utils/electronStore';
import {trackEvent} from '@shared/utils/telemetry';

import initialState from '../initialState';
import {createFileEntry, getFileEntryForAbsolutePath, removePath, selectFilePath} from '../services/fileEntry';
import {
  deleteResource,
  getResourceKindsWithTargetingRefs,
  isFileResource,
  processResources,
  recalculateResourceRanges,
  saveResource,
} from '../services/resource';
import {clearResourceSelections, highlightResource, updateSelectionAndHighlights} from '../services/selection';
import {setAlert} from './alert';
import {setLeftMenuSelection, toggleLeftMenu} from './ui';

export type SetRootFolderPayload = {
  projectConfig: ProjectConfig;
  fileMap: FileMapType;
  resourceMap: ResourceMapType;
  helmChartMap: HelmChartMapType;
  helmValuesMap: HelmValuesMapType;
  helmTemplatesMap: HelmTemplatesMapType;
  alert?: AlertType;
  isScanExcludesUpdated: 'outdated' | 'applied';
  isScanIncludesUpdated: 'outdated' | 'applied';
  isGitRepo: boolean;
};

export type UpdateMultipleResourcesPayload = {
  resourceId: string;
  content: string;
}[];

export type UpdateFileEntryPayload = {
  path: string;
  text: string;
};

export type UpdateFilesEntryPayload = {
  pathes: {relativePath: string; absolutePath: string}[];
};

export type SetPreviewDataPayload = {
  previewResourceId?: string;
  previewResources?: ResourceMapType;
  alert?: AlertType;
  previewKubeConfigPath?: string;
  previewKubeConfigContext?: string;
};

export type SetDiffDataPayload = {
  diffResourceId?: string;
  diffContent?: string;
};

export type StartPreviewLoaderPayload = {
  targetId: string;
  previewType: PreviewType;
};

function getImages(resourceMap: ResourceMapType) {
  let images: ImagesListType = [];

  Object.values(resourceMap).forEach(k8sResource => {
    if (k8sResource.refs?.length) {
      k8sResource.refs.forEach(ref => {
        if (ref.type === 'outgoing' && ref.target?.type === 'image') {
          const refName = ref.name;
          const refTag = ref.target?.tag || 'latest';

          const foundImage = images.find(image => image.id === `${refName}:${refTag}`);

          if (!foundImage) {
            images.push({id: `${refName}:${refTag}`, name: refName, tag: refTag, resourcesIds: [k8sResource.id]});
          } else if (!foundImage.resourcesIds.includes(k8sResource.id)) {
            foundImage.resourcesIds.push(k8sResource.id);
          }
        }
      });
    }
  });

  return images;
}

function updateSelectionHistory(type: 'resource' | 'path' | 'image', isVirtualSelection: boolean, state: AppState) {
  if (isVirtualSelection) {
    return;
  }

  if (type === 'resource' && state.selectedResourceId) {
    state.selectionHistory.push({
      type,
      selectedResourceId: state.selectedResourceId,
    });
  }

  if (type === 'path' && state.selectedPath) {
    state.selectionHistory.push({
      type,
      selectedPath: state.selectedPath,
    });
  }

  if (type === 'image' && state.selectedImage) {
    state.selectionHistory.push({
      type,
      selectedImage: state.selectedImage,
    });
  }

  state.currentSelectionHistoryIndex = undefined;
}

export const performResourceContentUpdate = (
  resource: K8sResource,
  newText: string,
  fileMap: FileMapType,
  resourceMap: ResourceMapType
) => {
  if (isFileResource(resource)) {
    const updatedFileText = saveResource(resource, newText, fileMap);
    resource.text = updatedFileText;
    fileMap[resource.filePath].text = updatedFileText;
    resource.content = parseYamlDocument(updatedFileText).toJS();
    recalculateResourceRanges(resource, fileMap, resourceMap);
  } else {
    resource.text = newText;
    resource.content = parseYamlDocument(newText).toJS();
  }
};

export const updateShouldOptionalIgnoreUnsatisfiedRefs = createAsyncThunk<AppState, boolean, ThunkApi>(
  'main/resourceRefsProcessingOptions/shouldIgnoreOptionalUnsatisfiedRefs',
  async (shouldIgnore, thunkAPI) => {
    const state = thunkAPI.getState();

    const nextMainState = createNextState(state.main, mainState => {
      electronStore.set('main.resourceRefsProcessingOptions.shouldIgnoreOptionalUnsatisfiedRefs', shouldIgnore);
      mainState.resourceRefsProcessingOptions.shouldIgnoreOptionalUnsatisfiedRefs = shouldIgnore;

      const projectConfig = currentConfigSelector(state);
      const schemaVersion = getK8sVersion(projectConfig);
      const userDataDir = String(state.config.userDataDir);
      const resourceMap = getActiveResourceMap(mainState);

      reprocessOptionalRefs(schemaVersion, userDataDir, resourceMap, mainState.resourceRefsProcessingOptions);
    });

    return nextMainState;
  }
);

export const addResource = createAsyncThunk<AppState, K8sResource, ThunkApi>(
  'main/addResource',
  async (resource, thunkAPI) => {
    const state = thunkAPI.getState();
    const projectConfig = currentConfigSelector(state);
    const schemaVersion = getK8sVersion(projectConfig);
    const userDataDir = String(state.config.userDataDir);

    const nextMainState = createNextState(state.main, mainState => {
      mainState.resourceMap[resource.id] = resource;
      clearResourceSelections(mainState.resourceMap);
      resource.isSelected = true;
      resource.isHighlighted = true;
      mainState.selectedResourceId = resource.id;
      const resourceKinds = getResourceKindsWithTargetingRefs(resource);

      processResources(
        schemaVersion,
        userDataDir,
        getActiveResourceMap(mainState),
        mainState.resourceRefsProcessingOptions,
        {
          resourceIds: [resource.id],
          resourceKinds,
          policyPlugins: mainState.policies.plugins,
        }
      );
    });

    return nextMainState;
  }
);

export const addMultipleResources = createAsyncThunk<AppState, K8sResource[], ThunkApi>(
  'main/addMultipleResources',
  async (resources, thunkAPI) => {
    const state = thunkAPI.getState();
    const projectConfig = currentConfigSelector(state);
    const schemaVersion = getK8sVersion(projectConfig);
    const userDataDir = String(state.config.userDataDir);

    const nextMainState = createNextState(state.main, mainState => {
      clearResourceSelections(mainState.resourceMap);

      resources.forEach((resource, index) => {
        // select first resource
        if (!index) {
          resource.isSelected = true;
          resource.isHighlighted = true;
          mainState.selectedResourceId = resource.id;
        }

        mainState.resourceMap[resource.id] = resource;
        const resourceKinds = getResourceKindsWithTargetingRefs(resource);

        processResources(
          schemaVersion,
          userDataDir,
          getActiveResourceMap(mainState),
          mainState.resourceRefsProcessingOptions,
          {
            resourceIds: [resource.id],
            resourceKinds,
            policyPlugins: mainState.policies.plugins,
          }
        );
      });
    });

    return nextMainState;
  }
);

export const reprocessResource = createAsyncThunk<AppState, K8sResource, ThunkApi>(
  'main/reprocessResource',
  async (resource, thunkAPI) => {
    const state = thunkAPI.getState();
    const projectConfig = currentConfigSelector(state);
    const schemaVersion = getK8sVersion(projectConfig);
    const userDataDir = String(state.config.userDataDir);

    const nextMainState = createNextState(state.main, mainState => {
      const resourceKinds = getResourceKindsWithTargetingRefs(resource);

      processResources(
        schemaVersion,
        userDataDir,
        getActiveResourceMap(mainState),
        mainState.resourceRefsProcessingOptions,
        {
          resourceIds: [resource.id],
          resourceKinds,
          policyPlugins: mainState.policies.plugins,
        }
      );
    });

    return nextMainState;
  }
);

export const reprocessAllResources = createAsyncThunk<AppState, void, ThunkApi>(
  'main/reprocessAllResources',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    const projectConfig = currentConfigSelector(state);
    const userDataDir = String(state.config.userDataDir);
    const schemaVersion = getK8sVersion(projectConfig);
    const policyPlugins = state.main.policies.plugins;

    const nextMainState = createNextState(state.main, mainState => {
      processResources(schemaVersion, userDataDir, mainState.resourceMap, mainState.resourceRefsProcessingOptions, {
        policyPlugins,
      });
    });

    return nextMainState;
  }
);

const clearSelectedResourceOnPreviewExit = (state: AppState) => {
  if (state.selectedResourceId) {
    const selectedResource = state.resourceMap[state.selectedResourceId];
    if (selectedResource && selectedResource.filePath.startsWith(PREVIEW_PREFIX)) {
      state.selectedResourceId = undefined;
    }
  }
};

/**
 * Returns a resourceMap containing only active resources depending if we are in preview mode
 */

export function getActiveResourceMap(state: AppState) {
  if (state.previewResourceId || state.previewValuesFileId) {
    let activeResourceMap: ResourceMapType = {};
    Object.values(state.resourceMap)
      .filter(r => r.filePath.startsWith(PREVIEW_PREFIX))
      .forEach(r => {
        activeResourceMap[r.id] = r;
      });

    return activeResourceMap;
  }
  return state.resourceMap;
}

/**
 * Returns a resourceMap containing only local resources
 */

export function getLocalResourceMap(state: AppState) {
  let localResourceMap: ResourceMapType = {};
  Object.values(state.resourceMap)
    .filter(r => !r.filePath.startsWith(PREVIEW_PREFIX) && !r.filePath.startsWith(CLUSTER_DIFF_PREFIX))
    .forEach(r => {
      localResourceMap[r.id] = r;
    });

  return localResourceMap;
}

/**
 * The main reducer slice
 */

export const mainSlice = createSlice({
  name: 'main',
  initialState: initialState.main,
  reducers: {
    setAppRehydrating: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.isRehydrating = action.payload;
      if (!action.payload) {
        state.wasRehydrated = !action.payload;
      }
    },
    setAutosavingError: (state: Draft<AppState>, action: PayloadAction<any>) => {
      state.autosaving.error = action.payload;
    },
    setAutosavingStatus: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.autosaving.status = action.payload;
    },
    /**
     * called by the file monitor when a path is removed from the file system
     */
    multiplePathsRemoved: (state: Draft<AppState>, action: PayloadAction<Array<string>>) => {
      let filePaths: Array<string> = action.payload;
      filePaths.forEach((filePath: string) => {
        let fileEntry = getFileEntryForAbsolutePath(filePath, state.fileMap);
        if (fileEntry) {
          removePath(filePath, state, fileEntry);
        }
      });
    },
    /**
     * Marks the specified resource as selected and highlights all related resources
     */
    selectK8sResource: (
      state: Draft<AppState>,
      action: PayloadAction<{resourceId: string; isVirtualSelection?: boolean}>
    ) => {
      const resource = state.resourceMap[action.payload.resourceId];
      state.lastChangedLine = 0;
      if (resource) {
        updateSelectionAndHighlights(state, resource);
        updateSelectionHistory('resource', Boolean(action.payload.isVirtualSelection), state);
      }
    },
    /**
     * Marks the specified values as selected
     */
    selectHelmValuesFile: (
      state: Draft<AppState>,
      action: PayloadAction<{valuesFileId: string; isVirtualSelection?: boolean}>
    ) => {
      const valuesFileId = action.payload.valuesFileId;
      Object.values(state.helmValuesMap).forEach(values => {
        values.isSelected = values.id === valuesFileId;
      });

      state.selectedValuesFileId = state.helmValuesMap[valuesFileId].isSelected ? valuesFileId : undefined;
      selectFilePath({filePath: state.helmValuesMap[valuesFileId].filePath, state});
      updateSelectionHistory('path', Boolean(action.payload.isVirtualSelection), state);
    },
    /**
     * Marks the specified file as selected and highlights all related resources
     */
    selectFile: (state: Draft<AppState>, action: PayloadAction<{filePath: string; isVirtualSelection?: boolean}>) => {
      const filePath = action.payload.filePath;
      if (filePath.length > 0) {
        selectFilePath({filePath, state});
        updateSelectionHistory('path', Boolean(action.payload.isVirtualSelection), state);
      }
    },
    updateSearchQuery: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.search.searchQuery = action.payload;
    },
    updateReplaceQuery: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.search.replaceQuery = action.payload;
    },
    toggleMatchParams: (state: Draft<AppState>, action: PayloadAction<keyof MatchParamProps>) => {
      const param = action.payload;
      state.search.queryMatchParams = {
        ...state.search.queryMatchParams,
        [param]: !state.search.queryMatchParams[param],
      };
    },
    highlightFileMatches: (state: Draft<AppState>, action: PayloadAction<CurrentMatch | null>) => {
      state.search.currentMatch = action.payload;
    },
    selectPreviewConfiguration: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.selectedPreviewConfigurationId = action.payload;
      state.selectedPath = undefined;
      state.selectedResourceId = undefined;
      state.selectedValuesFileId = undefined;
      state.selectedImage = undefined;
    },
    setSelectingFile: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.isSelectingFile = action.payload;
    },
    setFiltersToBeChanged: (state: Draft<AppState>, action: PayloadAction<ResourceFilterType | undefined>) => {
      state.filtersToBeChanged = action.payload;
    },
    setApplyingResource: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.isApplyingResource = action.payload;
    },
    clearPreview: (state: Draft<AppState>, action: PayloadAction<{type: 'restartPreview'}>) => {
      if (action.payload.type !== 'restartPreview') {
        clearSelectedResourceOnPreviewExit(state);
      }
      setPreviewData({}, state);
      state.previewType = undefined;
      state.checkedResourceIds = [];
    },
    clearPreviewAndSelectionHistory: (state: Draft<AppState>) => {
      state.previousSelectionHistory = state.selectionHistory;
      clearSelectedResourceOnPreviewExit(state);
      setPreviewData({}, state);
      state.previewType = undefined;
      state.currentSelectionHistoryIndex = undefined;
      state.selectionHistory = [];
      state.checkedResourceIds = [];
      state.selectedImage = undefined;
    },
    startPreviewLoader: (state: Draft<AppState>, action: PayloadAction<StartPreviewLoaderPayload>) => {
      state.previewLoader.isLoading = true;
      state.previewLoader.targetId = action.payload.targetId;
      state.previewType = action.payload.previewType;
    },
    stopPreviewLoader: (state: Draft<AppState>) => {
      state.previewLoader.isLoading = false;
      state.previewLoader.targetId = undefined;
    },
    resetResourceFilter: (state: Draft<AppState>) => {
      state.resourceFilter = {labels: {}, annotations: {}};
    },
    updateResourceFilter: (state: Draft<AppState>, action: PayloadAction<ResourceFilterType>) => {
      if (state.checkedResourceIds.length && !state.filtersToBeChanged) {
        state.filtersToBeChanged = action.payload;
        return;
      }

      if (state.filtersToBeChanged) {
        state.filtersToBeChanged = undefined;
      }

      state.resourceFilter = action.payload;
    },
    extendResourceFilter: (state: Draft<AppState>, action: PayloadAction<ResourceFilterType>) => {
      const filter = action.payload;

      if (state.checkedResourceIds.length && !state.filtersToBeChanged) {
        state.filtersToBeChanged = filter;
        return;
      }

      if (state.filtersToBeChanged) {
        state.filtersToBeChanged = undefined;
      }

      // construct new filter
      let newFilter: ResourceFilterType = {
        names: filter.names
          ? isEqual(filter.names, state.resourceFilter.names)
            ? undefined
            : filter.names
          : state.resourceFilter.names,
        namespace: filter.namespace
          ? filter.namespace === state.resourceFilter.namespace
            ? undefined
            : filter.namespace
          : state.resourceFilter.namespace,
        kinds: filter.kinds
          ? isEqual(filter.kinds, state.resourceFilter.kinds)
            ? undefined
            : filter.kinds
          : state.resourceFilter.kinds,
        fileOrFolderContainedIn: filter.fileOrFolderContainedIn
          ? filter.fileOrFolderContainedIn === state.resourceFilter.fileOrFolderContainedIn
            ? undefined
            : filter.fileOrFolderContainedIn
          : state.resourceFilter.fileOrFolderContainedIn,
        labels: state.resourceFilter.labels,
        annotations: state.resourceFilter.annotations,
      };

      Object.keys(filter.labels).forEach(key => {
        if (newFilter.labels[key] === filter.labels[key]) {
          delete newFilter.labels[key];
        } else {
          newFilter.labels[key] = filter.labels[key];
        }
      });
      Object.keys(filter.annotations).forEach(key => {
        if (newFilter.annotations[key] === filter.annotations[key]) {
          delete newFilter.annotations[key];
        } else {
          newFilter.annotations[key] = filter.annotations[key];
        }
      });
      state.resourceFilter = newFilter;
    },
    setSelectionHistory: (
      state: Draft<AppState>,
      action: PayloadAction<{nextSelectionHistoryIndex?: number; newSelectionHistory: SelectionHistoryEntry[]}>
    ) => {
      state.currentSelectionHistoryIndex = action.payload.nextSelectionHistoryIndex;
      state.selectionHistory = action.payload.newSelectionHistory;
    },
    editorHasReloadedSelectedPath: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.shouldEditorReloadSelectedPath = action.payload;
    },
    checkResourceId: (state: Draft<AppState>, action: PayloadAction<string>) => {
      if (!state.checkedResourceIds.includes(action.payload)) {
        state.checkedResourceIds.push(action.payload);
      }
    },
    uncheckResourceId: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.checkedResourceIds = state.checkedResourceIds.filter(resourceId => action.payload !== resourceId);
    },
    checkMultipleResourceIds: (state: Draft<AppState>, action: PayloadAction<string[]>) => {
      action.payload.forEach(resourceId => {
        if (!state.checkedResourceIds.includes(resourceId)) {
          state.checkedResourceIds.push(resourceId);
        }
      });
    },
    uncheckAllResourceIds: (state: Draft<AppState>) => {
      state.checkedResourceIds = [];
    },
    uncheckMultipleResourceIds: (state: Draft<AppState>, action: PayloadAction<string[]>) => {
      state.checkedResourceIds = state.checkedResourceIds.filter(resourceId => !action.payload.includes(resourceId));
    },
    openResourceDiffModal: (state: Draft<AppState>, action: PayloadAction<string>) => {
      trackEvent(DIFF);
      state.resourceDiff.targetResourceId = action.payload;
    },
    closeResourceDiffModal: (state: Draft<AppState>) => {
      state.resourceDiff.targetResourceId = undefined;
    },
    addMultipleKindHandlers: (state: Draft<AppState>, action: PayloadAction<string[]>) => {
      action.payload.forEach(kind => {
        if (!state.registeredKindHandlers.includes(kind)) {
          state.registeredKindHandlers.push(kind);
        }
      });
    },
    addKindHandler: (state: Draft<AppState>, action: PayloadAction<string>) => {
      if (!state.registeredKindHandlers.includes(action.payload)) {
        state.registeredKindHandlers.push(action.payload);
      }
    },
    seenNotifications: (state: Draft<AppState>) => {
      state.notifications.forEach(notification => {
        notification.hasSeen = true;
      });
    },
    clearNotifications: (state: Draft<AppState>) => {
      state.notifications = [];
    },
    openPreviewConfigurationEditor: (
      state: Draft<AppState>,
      action: PayloadAction<{helmChartId: string; previewConfigurationId?: string}>
    ) => {
      const {helmChartId, previewConfigurationId} = action.payload;
      state.prevConfEditor = {
        helmChartId,
        previewConfigurationId,
        isOpen: true,
      };
    },
    closePreviewConfigurationEditor: (state: Draft<AppState>) => {
      state.prevConfEditor = {
        isOpen: false,
        helmChartId: undefined,
        previewConfigurationId: undefined,
      };
    },
    clearSelected: (state: Draft<AppState>) => {
      state.selectedPath = undefined;
      state.selectedResourceId = undefined;
      state.selectedPreviewConfigurationId = undefined;
      state.selectedValuesFileId = undefined;
      state.selectedImage = undefined;
    },
    clearSelectedPath: (state: Draft<AppState>) => {
      state.selectedPath = undefined;
    },
    toggleAllRules: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      const enable = action.payload;
      const plugin = state.policies.plugins[0];
      if (!plugin) return; // not yet loaded;

      if (enable) {
        const allRuleIds = plugin.metadata.rules.map(r => r.id);
        plugin.config.enabledRules = allRuleIds;
        trackEvent('OPA_ENABLED', {all: true});
      } else {
        plugin.config.enabledRules = [];
        trackEvent('OPA_DISABLED', {all: true});
      }

      // persist latest configuration
      const allConfig = state.policies.plugins.map(p => p.config);
      electronStore.set('pluginConfig.policies', allConfig);
    },
    toggleRule: (state: Draft<AppState>, action: PayloadAction<{ruleId: string; enable?: boolean}>) => {
      const plugin = state.policies.plugins[0];
      if (!plugin) return; // not yet loaded;

      const ruleId = action.payload.ruleId;
      const shouldToggle = action.payload.enable === undefined;
      const isEnabled = plugin.config.enabledRules.includes(ruleId);
      const enable = shouldToggle ? !isEnabled : action.payload.enable;

      if (enable) {
        if (isEnabled) return;
        plugin.config.enabledRules.push(ruleId);
        trackEvent('OPA_ENABLED', {all: false});
      } else {
        if (!isEnabled) return;
        plugin.config.enabledRules = plugin.config.enabledRules.filter(id => id !== ruleId);
        trackEvent('OPA_DISABLED', {all: false});
      }

      // persist latest configuration
      const allConfig = state.policies.plugins.map(p => p.config);
      electronStore.set('pluginConfig.policies', allConfig);
    },
    selectImage: (state: Draft<AppState>, action: PayloadAction<{image: ImageType; isVirtualSelection?: boolean}>) => {
      state.selectedImage = action.payload.image;

      clearResourceSelections(state.resourceMap);
      action.payload.image.resourcesIds.forEach(resourceId => highlightResource(state.resourceMap, resourceId));

      updateSelectionHistory('image', Boolean(action.payload.isVirtualSelection), state);

      state.selectedResourceId = undefined;
      state.selectedPreviewConfigurationId = undefined;
      state.selectedPath = undefined;
      state.selectedValuesFileId = undefined;
    },
    setImagesSearchedValue: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.imagesSearchedValue = action.payload;
    },
    setLastChangedLine: (state: Draft<AppState>, action: PayloadAction<number>) => {
      state.lastChangedLine = action.payload;
    },
    setImagesList: (state: Draft<AppState>, action: PayloadAction<ImagesListType>) => {
      state.imagesList = action.payload;
    },
    deleteFilterPreset: (state: Draft<AppState>, action: PayloadAction<string>) => {
      delete state.filtersPresets[action.payload];
      electronStore.set('main.filtersPresets', state.filtersPresets);
    },
    loadFilterPreset: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.resourceFilter = state.filtersPresets[action.payload];
    },
    saveFilterPreset: (state: Draft<AppState>, action: PayloadAction<string>) => {
      state.filtersPresets[action.payload] = state.resourceFilter;
      electronStore.set('main.filtersPresets', state.filtersPresets);
    },
    updateValidationIntegration: (state: Draft<AppState>, action: PayloadAction<ValidationIntegration | undefined>) => {
      state.validationIntegration = action.payload;
    },
    updateSearchHistory: (state: Draft<AppState>, action: PayloadAction<string>) => {
      let newSearchHistory: string[] = [...state.search.searchHistory];
      if (state.search.searchHistory.length >= 5) {
        newSearchHistory.shift();
      }
      electronStore.set('appConfig.recentSearch', [...newSearchHistory, action.payload]);
      state.search.searchHistory = [...newSearchHistory, action.payload];
    },
    updateClusterResource: (state: Draft<AppState>, action: PayloadAction<K8sResource>) => {
      state.resourceMap[action.payload.id] = action.payload;
    },
    deleteClusterResource: (state: Draft<AppState>, action: PayloadAction<K8sResource>) => {
      delete state.resourceMap[action.payload.id];
    },
    setIsClusterConnected: (state: Draft<AppState>, action: PayloadAction<boolean>) => {
      state.isClusterConnected = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(setAlert, (state, action) => {
      const notification: AlertType = {
        ...action.payload,
        id: uuidv4(),
        hasSeen: false,
        createdAt: new Date().getTime(),
      };

      state.notifications = [notification, ...state.notifications];
    });

    builder
      .addCase(previewKustomization.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        resetSelectionHistory(state, {initialResourceIds: [state.previewResourceId]});
        state.selectedResourceId = action.payload.previewResourceId;
        state.selectedPath = undefined;
        state.selectedValuesFileId = undefined;
        state.selectedPreviewConfigurationId = undefined;
        state.checkedResourceIds = [];
        state.previousSelectionHistory = [];
      })
      .addCase(previewKustomization.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
        state.selectionHistory = state.previousSelectionHistory;
        state.previousSelectionHistory = [];
      });

    builder
      .addCase(previewHelmValuesFile.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.currentSelectionHistoryIndex = undefined;
        resetSelectionHistory(state);
        state.selectedResourceId = undefined;
        state.selectedImage = undefined;
        state.checkedResourceIds = [];
        if (action.payload.previewResourceId && state.helmValuesMap[action.payload.previewResourceId]) {
          selectFilePath({filePath: state.helmValuesMap[action.payload.previewResourceId].filePath, state});
        }
        state.selectedValuesFileId = action.payload.previewResourceId;
        state.previousSelectionHistory = [];
      })
      .addCase(previewHelmValuesFile.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
        state.selectionHistory = state.previousSelectionHistory;
        state.previousSelectionHistory = [];
      });

    builder
      .addCase(runPreviewConfiguration.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.currentSelectionHistoryIndex = undefined;
        resetSelectionHistory(state);
        state.selectedResourceId = undefined;
        state.selectedImage = undefined;
        state.selectedPath = undefined;
        state.checkedResourceIds = [];
        state.previousSelectionHistory = [];
      })
      .addCase(runPreviewConfiguration.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
        state.selectionHistory = state.previousSelectionHistory;
        state.previousSelectionHistory = [];
      });

    builder
      .addCase(previewSavedCommand.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.currentSelectionHistoryIndex = undefined;
        resetSelectionHistory(state);
        state.selectedResourceId = undefined;
        state.selectedImage = undefined;
        state.selectedPath = undefined;
        state.checkedResourceIds = [];
        state.previousSelectionHistory = [];
      })
      .addCase(previewSavedCommand.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
        state.selectionHistory = state.previousSelectionHistory;
        state.previousSelectionHistory = [];
      });

    builder
      .addCase(previewCluster.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        resetSelectionHistory(state, {initialResourceIds: [state.previewResourceId]});
        state.selectedResourceId = undefined;
        state.selectedPath = undefined;
        state.selectedValuesFileId = undefined;
        state.selectedPreviewConfigurationId = undefined;
        state.checkedResourceIds = [];
        state.selectedImage = undefined;
        Object.values(state.resourceMap).forEach(resource => {
          resource.isSelected = false;
          resource.isHighlighted = false;
        });
        state.previousSelectionHistory = [];
      })
      .addCase(previewCluster.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
        state.selectionHistory = state.previousSelectionHistory;
        state.previousSelectionHistory = [];
      });

    builder
      .addCase(repreviewCluster.fulfilled, (state, action) => {
        setPreviewData(action.payload, state);
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        let resource = null;
        if (action && action.payload && action.payload.previewResources && state && state.selectedResourceId) {
          resource = action.payload.previewResources[state.selectedResourceId];
        }
        if (resource) {
          updateSelectionAndHighlights(state, resource);
        }
      })
      .addCase(repreviewCluster.rejected, state => {
        state.previewLoader.isLoading = false;
        state.previewLoader.targetId = undefined;
        state.previewType = undefined;
      });

    builder.addCase(setRootFolder.pending, state => {
      const existingHelmCharts: HelmChart[] = JSON.parse(JSON.stringify(Object.values(state.helmChartMap)));
      if (existingHelmCharts.length) {
        setImmediate(() => existingHelmCharts.forEach(chart => HelmChartEventEmitter.emit('remove', chart.id)));
      }
    });

    builder.addCase(setRootFolder.fulfilled, (state, action) => {
      state.resourceMap = action.payload.resourceMap;
      state.fileMap = action.payload.fileMap;
      state.helmChartMap = action.payload.helmChartMap;
      state.helmValuesMap = action.payload.helmValuesMap;
      state.helmTemplatesMap = action.payload.helmTemplatesMap;
      state.previewLoader.isLoading = false;
      state.previewLoader.targetId = undefined;
      state.selectedResourceId = undefined;
      state.selectedImage = undefined;
      state.selectedValuesFileId = undefined;
      state.selectedPath = undefined;
      state.previewResourceId = undefined;
      state.previewConfigurationId = undefined;
      state.previewCommandId = undefined;
      state.previewType = undefined;
      state.previewValuesFileId = undefined;
      state.selectedPreviewConfigurationId = undefined;
      state.previewLoader = {
        isLoading: false,
        targetId: undefined,
      };
      state.checkedResourceIds = [];
      state.resourceDiff = {
        targetResourceId: undefined,
      };
      state.isSelectingFile = false;
      state.isApplyingResource = false;
      state.resourceFilter = {
        labels: {},
        annotations: {},
      };
      resetSelectionHistory(state);
    });

    builder.addCase(saveUnsavedResources.fulfilled, (state, action) => {
      const rootFolder = state.fileMap[ROOT_FILE_ENTRY].filePath;

      action.payload.resourcePayloads.forEach(resourcePayload => {
        const resource = state.resourceMap[resourcePayload.resourceId];
        const relativeFilePath = resourcePayload.resourceFilePath.substr(rootFolder.length);
        const resourceFileEntry = state.fileMap[relativeFilePath];

        if (resourceFileEntry) {
          resourceFileEntry.timestamp = resourcePayload.fileTimestamp;
        } else {
          const extension = path.extname(relativeFilePath);
          const newFileEntry: FileEntry = {
            ...createFileEntry({fileEntryPath: relativeFilePath, fileMap: state.fileMap, extension}),
            isSupported: true,
            timestamp: resourcePayload.fileTimestamp,
          };
          state.fileMap[relativeFilePath] = newFileEntry;

          // add to parent's children
          const childFileName = path.basename(relativeFilePath);
          const parentPath = path.join(path.sep, relativeFilePath.replace(`${path.sep}${childFileName}`, '')).trim();
          const isRoot = parentPath === path.sep;

          if (isRoot) {
            const rootFileEntry = state.fileMap[ROOT_FILE_ENTRY];
            if (rootFileEntry.children) {
              rootFileEntry.children.push(childFileName);
              rootFileEntry.children.sort();
            } else {
              rootFileEntry.children = [childFileName];
            }
          } else {
            const parentPathFileEntry = state.fileMap[parentPath];
            if (parentPathFileEntry) {
              if (parentPathFileEntry.children !== undefined) {
                parentPathFileEntry.children.push(childFileName);
                parentPathFileEntry.children.sort();
              } else {
                parentPathFileEntry.children = [childFileName];
              }
            } else {
              log.warn(`[saveUnsavedResource]: Couldn't find parent path for ${relativeFilePath}`);
            }
          }
        }

        if (resource) {
          resource.filePath = relativeFilePath;
          resource.range = resourcePayload.resourceRange;

          if (state.selectedPath === relativeFilePath) {
            resource.isHighlighted = true;
          }
        }
      });
    });

    builder.addCase(multiplePathsChanged.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(multiplePathsAdded.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(updateResource.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(removeResources.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(updateMultipleResources.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(updateFileEntry.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(updateFileEntries.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(updateShouldOptionalIgnoreUnsatisfiedRefs.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(addResource.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(addMultipleResources.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(reprocessResource.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(reprocessAllResources.fulfilled, (state, action) => {
      return action.payload;
    });

    builder.addCase(transferResource.fulfilled, (state, action) => {
      const {side, delta} = action.payload;

      // Warning: The compare feature has its own slice and does bookkeeping
      // of its own resources. This reducer works because transfer only works
      // for cluster and local which are also in main slice. Should we add
      // transfer for other resource set types this will give unexpected behavior.
      delta.forEach(comparison => {
        if (side === 'left') {
          state.resourceMap[comparison.left.id] = comparison.left;
        } else {
          state.resourceMap[comparison.right.id] = comparison.right;
        }
      });
    });
    builder.addCase(loadPolicies.fulfilled, (state, action) => {
      state.policies = {
        plugins: action.payload,
      };
    });

    builder.addMatcher(
      () => true,
      (state, action) => {
        if (action.payload?.alert) {
          const notification: AlertType = action.payload.alert;

          state.notifications = [
            {...notification, id: uuidv4(), hasSeen: false, createdAt: new Date().getTime()},
            ...state.notifications,
          ];
        }
      }
    );
  },
});

// function groupResourcesByIdentifier(
//   resources: K8sResource[],
//   makeIdentifier: (resource: K8sResource) => string
// ): Record<string, K8sResource[]> {
//   const groupedResources: Record<string, K8sResource[]> = {};
//   resources.forEach(resource => {
//     const identifier = makeIdentifier(resource);
//     if (groupedResources[identifier]) {
//       groupedResources[identifier].push(resource);
//     } else {
//       groupedResources[identifier] = [resource];
//     }
//   });
//   return groupedResources;
// }

/**
 * Sets/clears preview resources
 */

function setPreviewData(payload: SetPreviewDataPayload, state: AppState) {
  state.previewResourceId = undefined;
  state.previewValuesFileId = undefined;
  state.previewConfigurationId = undefined;
  state.previewCommandId = undefined;

  // TODO: rename "previewResourceId" to "previewTargetId" and maybe add a comment to the property

  if (payload.previewResourceId) {
    if (state.previewType === 'kustomization') {
      if (state.resourceMap[payload.previewResourceId]) {
        state.previewResourceId = payload.previewResourceId;
      } else {
        log.error(`Unknown preview id: ${payload.previewResourceId}`);
      }
    }
    if (state.previewType === 'helm') {
      if (state.helmValuesMap[payload.previewResourceId]) {
        state.previewValuesFileId = payload.previewResourceId;
      } else {
        log.error(`Unknown preview id: ${payload.previewResourceId}`);
      }
    }
    if (state.previewType === 'cluster') {
      state.previewResourceId = payload.previewResourceId;
      state.previewKubeConfigPath = payload.previewKubeConfigPath;
      state.previewKubeConfigContext = payload.previewKubeConfigContext;
    }
    if (state.previewType === 'helm-preview-config') {
      state.previewConfigurationId = payload.previewResourceId;
    }
    if (state.previewType === 'command') {
      state.previewCommandId = payload.previewResourceId;
    }
  }

  // remove previous preview resources
  Object.values(state.resourceMap)
    .filter(r => r.filePath.startsWith(PREVIEW_PREFIX))
    .forEach(r => deleteResource(r, state.resourceMap));

  if (payload.previewResourceId && payload.previewResources) {
    Object.values(payload.previewResources).forEach(r => {
      state.resourceMap[r.id] = r;
    });
  }
}

export const {
  addKindHandler,
  addMultipleKindHandlers,
  checkMultipleResourceIds,
  checkResourceId,
  clearNotifications,
  clearPreview,
  clearPreviewAndSelectionHistory,
  clearSelected,
  clearSelectedPath,
  closePreviewConfigurationEditor,
  closeResourceDiffModal,
  deleteFilterPreset,
  editorHasReloadedSelectedPath,
  extendResourceFilter,
  loadFilterPreset,
  multiplePathsRemoved,
  openPreviewConfigurationEditor,
  openResourceDiffModal,
  resetResourceFilter,
  saveFilterPreset,
  seenNotifications,
  selectFile,
  selectHelmValuesFile,
  selectImage,
  selectK8sResource,
  selectPreviewConfiguration,
  setAppRehydrating,
  setApplyingResource,
  setAutosavingError,
  setAutosavingStatus,
  setFiltersToBeChanged,
  setImagesList,
  setImagesSearchedValue,
  setSelectingFile,
  setSelectionHistory,
  startPreviewLoader,
  stopPreviewLoader,
  toggleAllRules,
  toggleMatchParams,
  toggleRule,
  uncheckAllResourceIds,
  uncheckMultipleResourceIds,
  uncheckResourceId,
  updateResourceFilter,
  updateValidationIntegration,
  highlightFileMatches,
  updateSearchHistory,
  updateSearchQuery,
  updateReplaceQuery,
  setLastChangedLine,
  updateClusterResource,
  deleteClusterResource,
  setIsClusterConnected,
} = mainSlice.actions;
export default mainSlice.reducer;

/* * * * * * * * * * * * * *
 * Listeners
 * * * * * * * * * * * * * */
export const resourceMapChangedListener: AppListenerFn = listen => {
  listen({
    predicate: (action, currentState, previousState) => {
      return (
        !isEqual(currentState.main.resourceMap, previousState.main.resourceMap) ||
        !isEqual(currentState.main.resourceFilter, previousState.main.resourceFilter)
      );
    },

    effect: async (_action, {dispatch, getState}) => {
      const resourceFilter = getState().main.resourceFilter;
      const resourceMap = getActiveResourceMap(getState().main);

      const currentResourcesMap = Object.fromEntries(
        Object.entries(resourceMap).filter(([, value]) => isResourcePassingFilter(value, resourceFilter))
      );

      const imagesList = getState().main.imagesList;
      const images = getImages(currentResourcesMap);

      if (!isEqual(images, imagesList)) {
        dispatch(setImagesList(images));
      }
    },
  });
};

export const imageSelectedListener: AppListenerFn = listen => {
  listen({
    type: selectImage.type,
    effect: async (_action, {dispatch, getState}) => {
      const leftMenu = getState().ui.leftMenu;

      if (!leftMenu.isActive) {
        dispatch(toggleLeftMenu());
      }

      if (leftMenu.selection !== 'images-pane') {
        dispatch(setLeftMenuSelection('images-pane'));
      }
    },
  });
};
