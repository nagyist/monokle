import {HelmValueMatch} from '@models/helm';

import {IHelmValuesResource} from '../interfaces/IHelmValuesResource';
import {ISelectable} from '../interfaces/ISelectable';
import {BaseResource} from './BaseResource';

export class HelmValuesResource extends BaseResource implements IHelmValuesResource, ISelectable {
  helmChartId: string;
  values: HelmValueMatch[];

  constructor(resource: IHelmValuesResource) {
    super(resource.filePath, resource.name, resource.id);
    this.helmChartId = resource.helmChartId;
    this.values = resource.values;
    this.isSelected = false;
  }
  isSelected: boolean;
}
