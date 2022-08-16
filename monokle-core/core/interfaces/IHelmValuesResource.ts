import {HelmValueMatch} from '@models/helm';

import {IBaseResource} from './IBaseResource';

export interface IHelmValuesResource extends IBaseResource {
  id: string;
  filePath: string;
  name: string;
  helmChartId: string;
  values: HelmValueMatch[];
}
