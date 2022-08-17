import {sep} from 'path';
import {v4 as uuidv4} from 'uuid';

import {KubernetesObject} from '@models/appstate';

import {K8sResource} from '../models/K8sResource';

export const KUSTOMIZATION_KIND = 'Kustomization';
export const KUSTOMIZATION_API_GROUP = 'kustomize.config.k8s.io';

export function createResourceName(filePath: string, content: any, kind: string) {
  // for Kustomizations we return the name of the containing folder ('base', 'staging', etc)
  if (kind === KUSTOMIZATION_KIND && (!content?.apiVersion || content.apiVersion.startsWith(KUSTOMIZATION_API_GROUP))) {
    const ix = filePath.lastIndexOf(sep);
    if (ix > 0) {
      return filePath.substr(1, ix - 1);
    }
    return filePath;
  }

  // use metadata name if available
  if (content.metadata?.name) {
    // name could be an object if it's a helm template value...
    if (typeof content.metadata.name !== 'string') {
      return JSON.stringify(content.metadata.name).trim();
    }

    return content.metadata.name;
  }

  // use filename as last resort
  const ix = filePath.lastIndexOf(sep);
  if (ix > 0) {
    return filePath.substr(ix + 1);
  }

  return filePath;
}

export function extractNamespace(content: any) {
  // namespace could be an object if it's a helm template value...
  return content.metadata?.namespace && typeof content.metadata.namespace === 'string'
    ? content.metadata.namespace
    : undefined;
}

export function k8sResourceFactory(content: KubernetesObject, text: string, path: string) {
  return new K8sResource(
    {
      name: createResourceName(path, content, content.kind),
      id: (content.metadata && content.metadata.uid) || uuidv4(),
      kind: content.kind,
      version: content.apiVersion,
      content,
      text,
      namespace: extractNamespace(content),
      isClusterScoped: false,
      filePath: path,
    },
    text
  );
}
