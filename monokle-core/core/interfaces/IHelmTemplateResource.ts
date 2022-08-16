import {RangeAndValue} from '@models/helm';

import {IBaseResource} from './IBaseResource';

export interface IHelmTemplateResource extends IBaseResource {
  id: string;
  filePath: string;
  name: string;
  values: RangeAndValue[];
  helmChartId: string;
}
