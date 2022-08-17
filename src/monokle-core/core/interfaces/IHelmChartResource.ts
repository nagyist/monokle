import {IBaseResource} from './IBaseResource';

export interface IHelmChartResource extends IBaseResource {
  valueFileIds: string[];
  templateIds: string[];
}
