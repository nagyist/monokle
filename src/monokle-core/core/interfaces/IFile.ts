import {IBaseResource} from './IBaseResource';

export interface IFile {
  path: string;
  content: string;
  extension: string;
  isHelmTemplate: boolean;
  isHelmValues: boolean;

  getResources(): IBaseResource[];
}
