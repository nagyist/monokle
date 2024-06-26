import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {AutoComplete, Input, Modal, Tag} from 'antd';

import {ExclamationCircleOutlined} from '@ant-design/icons';

import styled from 'styled-components';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {resetResourceFilter, selectResource, updateResourceFilter} from '@redux/reducers/main';
import {closeQuickSearchActionsPopup} from '@redux/reducers/ui';
import {knownResourceKindsSelector} from '@redux/selectors/resourceKindSelectors';
import {useActiveResourceMetaMap} from '@redux/selectors/resourceMapSelectors';
import {useSelectedResourceMeta} from '@redux/selectors/resourceSelectors';

import {useNamespaces} from '@hooks/useNamespaces';

import {isResourcePassingFilter} from '@utils/resources';

import {AppDispatch} from '@shared/models/appDispatch';
import {ResourceFilterType} from '@shared/models/appState';
import {ResourceIdentifier, ResourceStorage} from '@shared/models/k8sResource';
import {Colors} from '@shared/styles/colors';
import {trackEvent} from '@shared/utils/telemetry';

import LabelMapper from './LabelMapper';

const StyledModal = styled(Modal)`
  & .ant-input {
    height: 34px;
  }

  & .ant-input:focus {
    box-shadow: none !important;
  }

  & .ant-input:hover + .ant-input-group-addon {
    border: 1px solid #165996 !important;
  }

  & .ant-input-search-button {
    border: 0px !important;
  }

  & .ant-input-group-addon {
    border: 1px solid rgb(67, 67, 67) !important;
  }

  & .ant-select-focused .ant-input-group-addon {
    border: 1px solid #165996 !important;
  }
`;

const applyFilterWithConfirm = (
  option: string,
  type: 'namespaces' | 'kinds',
  resourceFilter: ResourceFilterType,
  dispatch: AppDispatch
) => {
  let title = `Are you sure you want apply ${option} ${type} filter? It will replace the currently applied ${resourceFilter[type]} ${type} filter.`;

  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    onOk() {
      return new Promise(resolve => {
        dispatch(
          updateResourceFilter({
            ...resourceFilter,
            [type]: type === 'kinds' ? [option] : option,
          })
        );
        dispatch(closeQuickSearchActionsPopup());
        resolve({});
      });
    },
    onCancel() {
      document.getElementById('quick_search_input')?.focus();
    },
  });
};

const selectK8sResourceWithConfirm = (
  resourceIdentifier: ResourceIdentifier,
  resourceName: string,
  dispatch: AppDispatch
) => {
  let title = `Are you sure you want to select ${resourceName}? It will reset the currently applied filters.`;
  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    onOk() {
      return new Promise(resolve => {
        dispatch(resetResourceFilter());
        dispatch(selectResource({resourceIdentifier}));
        dispatch(closeQuickSearchActionsPopup());
        resolve({});
      });
    },
    onCancel() {
      document.getElementById('quick_search_input')?.focus();
    },
  });
};

const QuickSearchActionsV3: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.quickSearchActionsPopup.isOpen);
  const resourceFilter = useAppSelector(state => state.main.resourceFilter);
  const activeResourceMetaMap = useActiveResourceMetaMap();
  const selectedResourceMeta = useSelectedResourceMeta();
  const knownResourceKinds = useAppSelector(knownResourceKindsSelector);

  const [namespaces] = useNamespaces({extra: ['default']});

  const [searchingValue, setSearchingValue] = useState<string>('');

  const allResourceKinds = useMemo(() => {
    return [
      ...new Set([
        ...knownResourceKinds,
        ...Object.values(activeResourceMetaMap)
          .filter(r => !knownResourceKinds.includes(r.kind))
          .map(r => r.kind),
      ]),
    ].sort();
  }, [knownResourceKinds, activeResourceMetaMap]);

  const filteredResources = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(activeResourceMetaMap).filter(([, resource]) =>
          isResourcePassingFilter(resource, resourceFilter)
        )
      ),
    [resourceFilter, activeResourceMetaMap]
  );

  const applyOption = useCallback(
    (type: string, option: string, resourceStorage?: ResourceStorage) => {
      if (type === 'namespaces' || type === 'kinds') {
        if (resourceFilter[type]) {
          if (!resourceFilter[type]?.includes(option)) {
            applyFilterWithConfirm(option, type, resourceFilter, dispatch);
          }
        } else {
          dispatch(
            updateResourceFilter({
              ...resourceFilter,
              [type]: [option],
            })
          );
          dispatch(closeQuickSearchActionsPopup());
        }
      } else if (type === 'resource' && resourceStorage) {
        if (!filteredResources[option]) {
          selectK8sResourceWithConfirm(
            {id: option, storage: resourceStorage},
            activeResourceMetaMap[option].name,
            dispatch
          );
        } else {
          if (selectedResourceMeta?.id !== option) {
            dispatch(selectResource({resourceIdentifier: {id: option, storage: resourceStorage}}));
          }
          dispatch(closeQuickSearchActionsPopup());
        }
      }
    },
    [dispatch, filteredResources, resourceFilter, activeResourceMetaMap, selectedResourceMeta]
  );

  const matchingCharactersLabel = useCallback(
    (label: string, type: string) => {
      const inputValue = searchingValue.replaceAll('\\', '\\\\');
      const regex = new RegExp(`(${inputValue})`, 'gi');
      const parts = label.split(regex);

      return parts.map((part, index) => {
        const key = `${type}-${label}-${index}`;

        if (part) {
          if (part.toLowerCase() === searchingValue) {
            return (
              <span key={key} style={{color: Colors.cyan7}}>
                {part}
              </span>
            );
          }
          return part;
        }

        return '';
      });
    },
    [searchingValue]
  );

  const options = useMemo(() => {
    const namespaceOptions = namespaces
      .sort((a, b) => a.localeCompare(b))
      .reduce((filteredOpt, ns) => {
        if (ns.toLowerCase().includes(searchingValue.toLowerCase())) {
          const optionLabel = <span>{matchingCharactersLabel(ns, 'namespace')}</span>;

          filteredOpt.push({value: `namespace:${ns}`, label: optionLabel});
        }

        return filteredOpt;
      }, [] as {value: string; label: JSX.Element}[]);

    const kindOptions = allResourceKinds.reduce((filteredOpt, kind) => {
      if (kind.toLowerCase().includes(searchingValue.toLowerCase())) {
        const optionLabel = <span>{matchingCharactersLabel(kind, 'kind')}</span>;

        filteredOpt.push({value: `kinds:${kind}`, label: optionLabel});
      }

      return filteredOpt;
    }, [] as {value: string; label: JSX.Element}[]);

    const resourceOptions = Object.entries(activeResourceMetaMap)
      .sort((a, b) => {
        const resA = a[1];
        const resB = b[1];
        if (resA.kind !== resB.kind) {
          return resA.kind.localeCompare(resB.kind);
        }
        if (resA.namespace && !resB.namespace) {
          return -1;
        }
        if (!resA.namespace && resB.namespace) {
          return 1;
        }
        if (resA.namespace && resB.namespace && resA.namespace !== resB.namespace) {
          return resA.namespace.localeCompare(resB.namespace);
        }
        return resA.name.localeCompare(resB.name);
      })
      .reduce((filteredOpt, resourceEntry) => {
        const resourceName = resourceEntry[1].name;

        if (!resourceName.startsWith('Patch:') && resourceName.toLowerCase().includes(searchingValue.toLowerCase())) {
          const optionLabel = (
            <div>
              {resourceEntry[1].namespace && <Tag>{resourceEntry[1].namespace}</Tag>}
              <span>{matchingCharactersLabel(resourceName, 'resource')}</span>
              {resourceEntry[1].kind && (
                <span style={{fontStyle: 'italic', marginLeft: '8px', color: Colors.grey7}}>
                  {resourceEntry[1].kind}
                </span>
              )}
            </div>
          );

          filteredOpt.push({
            value: `resource:${resourceEntry[0]}:${resourceEntry[1].storage}`,
            label: optionLabel,
          });
        }

        return filteredOpt;
      }, [] as {value: string; label: JSX.Element}[]);

    return [
      {label: LabelMapper['kind'], options: kindOptions},
      {label: LabelMapper['namespace'], options: namespaceOptions},
      {label: LabelMapper['resource'], options: resourceOptions},
    ];
  }, [allResourceKinds, matchingCharactersLabel, namespaces, activeResourceMetaMap, searchingValue]);

  const previousInputListFirstChild = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      trackEvent('explore/quick_search');
      setSearchingValue('');
    }
  }, [isOpen]);

  return (
    <StyledModal
      bodyStyle={{padding: '0px'}}
      closable={false}
      destroyOnClose
      footer={null}
      open={isOpen}
      onCancel={() => dispatch(closeQuickSearchActionsPopup())}
    >
      <AutoComplete
        id="quick_search_input"
        autoFocus
        defaultActiveFirstOption
        listHeight={500}
        notFoundContent="Kind, namespace or resource not found."
        onDropdownVisibleChange={open => {
          if (open) {
            setImmediate(() => {
              previousInputListFirstChild.current = document.getElementById('quick_search_input_list_0');
            });
          }
        }}
        options={options}
        showAction={['focus']}
        style={{width: '100%'}}
        value={searchingValue}
        onPopupScroll={e => {
          const currentFirstInputListNode = document.getElementById('quick_search_input_list_0');
          // check if the previous first element from the dropdown list is equal to the current first element
          // if not, scroll to the top in order to show the label
          if (
            currentFirstInputListNode &&
            !currentFirstInputListNode.isEqualNode(previousInputListFirstChild.current)
          ) {
            setTimeout(() => (e.target as HTMLDivElement).scrollTo({top: 0, left: 0}), 20);
          }

          previousInputListFirstChild.current = currentFirstInputListNode;
        }}
        onKeyDown={e => {
          if (e.code === 'Escape') {
            e.preventDefault();
            dispatch(closeQuickSearchActionsPopup());
          }
        }}
        onSearch={value => setSearchingValue(value)}
        onSelect={(value: string) => {
          // options are of type : `type:value`
          applyOption(value.split(':')[0], value.split(':')[1], value.split(':')[2] as ResourceStorage);
        }}
        filterOption={(inputValue, opt) => {
          if (opt?.options?.length) {
            return true;
          }

          return false;
        }}
      >
        <Input.Search placeholder="Search by namespace, kind and resource" />
      </AutoComplete>
    </StyledModal>
  );
};

export default QuickSearchActionsV3;
