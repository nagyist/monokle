import {ImageType} from './image';
import {HelmRelease} from './ui';

export type DashboardMenu = {
  key: string;
  label: string;
  icon?: string;
  order?: number;
  resourceCount?: number;
  errorCount?: number;
  warningCount?: number;
  children?: DashboardMenu[];
};

export type DashboardAccordionType = 'cluster-resources' | 'helm-releases' | 'images';
export type DashboardActiveTab = 'Info' | 'Manifest' | 'Logs' | 'Shell' | 'Graph';
export type HelmReleaseTab =
  | 'revision-history'
  | 'release-values'
  | 'release-manifest'
  | 'release-hooks'
  | 'release-notes'
  | 'cluster-resources';
export type DashboardState = {
  isOpen: boolean;
  ui: {
    activeAccordion: DashboardAccordionType;
    activeMenu: DashboardMenu;
    activeTab: DashboardActiveTab;
    menuList: Array<DashboardMenu>;
  };
  tableDrawer: {
    selectedResourceId?: string;
  };
  helm: {
    helmReleases: HelmRelease[] | null;
    selectedHelmRelease: HelmRelease | null;
    activeHelmReleaseTab: HelmReleaseTab;
  };
  selectedImage: ImageType | null;
};
