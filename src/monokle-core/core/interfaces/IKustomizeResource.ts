import {KubernetesObject} from '@models/appstate';
import {ResourceRef, ResourceValidation} from '@models/k8sresource';

import {IBaseResource} from './IBaseResource';

export interface IKustomizeResource extends IBaseResource {
  kind: string;
  version: string;
  namespace?: string;
  isClusterScoped: boolean;
  text: string;
  content: KubernetesObject;
  refs?: ResourceRef[];
  range?: {
    start: number;
    length: number;
  };
  validation?: ResourceValidation;
  issues?: ResourceValidation;
}
