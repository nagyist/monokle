import {IFile} from './IFile';

export interface IFolder {
  path: string;
  folders: IFolder[];
  files: IFile[];
  containsHelmChart: boolean;

  addFolder(folder: IFolder): void;
  addFile(file: IFile): void;
}
