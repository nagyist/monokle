import {IHelmChartResource} from '../interfaces/IHelmChartResource';
import {BaseResource} from './BaseResource';

export class HelmChartResource extends BaseResource implements IHelmChartResource {
  valueFileIds: string[];
  templateIds: string[];

  constructor(resource: IHelmChartResource) {
    super(resource.filePath, resource.name, resource.id);
    this.valueFileIds = resource.valueFileIds;
    this.templateIds = resource.templateIds;
  }
}
