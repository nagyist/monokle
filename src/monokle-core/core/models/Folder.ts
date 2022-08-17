import {IFile} from '../interfaces/IFile';
import {IFolder} from '../interfaces/IFolder';

export class Folder implements IFolder {
  path: string;
  folders: IFolder[];
  files: IFile[];
  containsHelmChart: boolean;

  constructor(path: string, folders: IFolder[], files: IFile[]) {
    this.path = path;
    this.folders = folders;
    this.files = files;
    this.containsHelmChart = false; // To be implemented later
  }
  addFolder(folder: IFolder): void {
    this.folders = [...this.folders, folder];
  }
  addFile(file: IFile): void {
    this.files = [...this.files, file];
  }
}
