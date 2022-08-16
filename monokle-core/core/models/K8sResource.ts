import {KubernetesObject} from '@models/appstate';
import {ResourceRef, ResourceValidation} from '@models/k8sresource';

import {IHighlightable} from '../interfaces/IHighlightable';
import {IK8sResource} from '../interfaces/IK8sResource';
import {ISelectable} from '../interfaces/ISelectable';
import {BaseResource} from './BaseResource';

export class K8sResource extends BaseResource implements IK8sResource, ISelectable, IHighlightable {
  namespace?: string;
  text: string;
  version: string;
  kind: string;
  isClusterScoped: boolean;
  content: KubernetesObject;
  refs?: ResourceRef[] | undefined;
  range?: {start: number; length: number} | undefined;
  validation?: ResourceValidation;
  issues?: ResourceValidation;
  isSelected: boolean;
  isHighlighted: boolean;

  constructor(resource: IK8sResource, text: string) {
    super(resource.filePath, resource.name, resource.id);
    this.content = resource.content;
    this.namespace = resource.namespace;
    this.text = text;
    this.version = resource.version;
    this.kind = resource.kind;
    this.isClusterScoped = resource.isClusterScoped;
    this.refs = resource.refs;
    this.range = resource.range;
    this.validation = resource.validation;
    this.issues = resource.issues;
    this.isHighlighted = false;
    this.isSelected = false;
  }
}
