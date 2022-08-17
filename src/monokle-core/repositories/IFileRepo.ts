import {IBaseResource} from '../core/interfaces/IBaseResource';
import {IFile} from '../core/interfaces/IFile';
import {IFolder} from '../core/interfaces/IFolder';

export interface IFileRepo {
  getFolder(basePath: string, folder: IFolder | null): Promise<IFolder>;
  updateFile(file: IFile): Promise<boolean>;
  deleteFile(file: IFile): Promise<boolean>;
  extractResources(file: IFile): Promise<IBaseResource[]>;
  removeResource(file: IFile, kind: IBaseResource): Promise<IFile>;
  getFileContent(path: string): Promise<string>;
}
