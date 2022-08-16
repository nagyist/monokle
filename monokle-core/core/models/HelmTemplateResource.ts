import {RangeAndValue} from '@models/helm';

import {IHelmTemplateResource} from '../interfaces/IHelmTemplateResource';
import {BaseResource} from './BaseResource';

export class HelmTemplateResource extends BaseResource implements IHelmTemplateResource {
  values: RangeAndValue[];
  helmChartId: string;

  constructor(resource: IHelmTemplateResource) {
    super(resource.filePath, resource.name, resource.id);
    this.helmChartId = resource.helmChartId;
    this.values = resource.values;
  }
}
