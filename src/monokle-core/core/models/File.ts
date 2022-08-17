import log from 'loglevel';
import {parse} from 'path';
import {LineCounter, parseAllDocuments} from 'yaml';

import {k8sResourceFactory} from '../factories/K8sResourceFactory';
import {IBaseResource} from '../interfaces/IBaseResource';
import {IFile} from '../interfaces/IFile';

export class File implements IFile {
  path: string;
  content: string;
  extension: string;
  isHelmTemplate: boolean;
  isHelmValues: boolean;

  constructor(path: string, content: string, extension: string) {
    this.path = path;
    this.extension = extension;
    this.content = content;
    this.isHelmTemplate = false; // To be implemented later
    this.isHelmValues = false; // To be implemented later
  }

  getResources(): IBaseResource[] {
    const lineCounter: LineCounter = new LineCounter();
    const documents: any = parseAllDocuments(this.content, {
      lineCounter,
      uniqueKeys: false,
      strict: false,
    });
    const result: IBaseResource[] = [];
    let splitDocs: any;

    if (!documents && documents.length <= 0) {
      return [];
    }

    documents.forEach((doc: any, index: number) => {
      if (doc.errors.length > 0) {
        if (!splitDocs) {
          splitDocs = this.content.split('---');
        }

        log.warn(`Ignoring document ${index} in ${parse(this.path).name} due to ${doc.errors.length} error(s)`);
      } else {
        if (doc.warnings.length > 0) {
          log.warn('[extractK8sResources]: Doc has warnings', doc);
        }

        const content = doc.toJS();

        if (content && content.apiVersion && content.kind) {
          const text = this.content.slice(doc.range[0], doc.range[1]);
          result.push(k8sResourceFactory(content, text, this.path));
        }
      }
    });

    return result;
  }
}
