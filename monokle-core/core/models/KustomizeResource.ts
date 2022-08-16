import {KubernetesObject} from '@models/appstate';
import {ResourceRef, ResourceValidation} from '@models/k8sresource';

import {IHighlightable} from '../interfaces/IHighlightable';
import {IKustomizeResource} from '../interfaces/IKustomizeResource';
import {ISelectable} from '../interfaces/ISelectable';
import {BaseResource} from './BaseResource';

export class KustomizeResource extends BaseResource implements IKustomizeResource, ISelectable, IHighlightable {
  kind: string;
  version: string;
  namespace?: string | undefined;
  isClusterScoped: boolean;
  text: string;
  content: KubernetesObject;
  refs?: ResourceRef[] | undefined;
  range?: {start: number; length: number} | undefined;
  validation?: ResourceValidation | undefined;
  issues?: ResourceValidation | undefined;
  isSelected: boolean;
  isHighlighted: boolean;

  constructor(resource: IKustomizeResource, text: string) {
    super(resource.filePath, resource.name, resource.id);
    this.kind = 'Kustomization';
    this.version = 'kustomize.config.k8s.io/v1beta1';
    this.content = resource.content;
    this.namespace = resource.namespace;
    this.text = text;
    this.isClusterScoped = resource.isClusterScoped;
    this.refs = resource.refs;
    this.range = resource.range;
    this.validation = resource.validation;
    this.issues = resource.issues;
    this.isSelected = false;
    this.isHighlighted = false;
  }
}
