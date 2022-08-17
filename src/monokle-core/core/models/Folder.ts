import {HELM_CHART_ENTRY_FILE} from '@constants/constants';

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
    this.containsHelmChart = this.files.map((file: IFile) => file.path).indexOf(HELM_CHART_ENTRY_FILE) !== -1;
  }
  addFolder(folder: IFolder): void {
    this.folders = [...this.folders, folder];
  }
  addFile(file: IFile): void {
    this.files = [...this.files, file];
    this.containsHelmChart = this.files.map((f: IFile) => f.path).indexOf(HELM_CHART_ENTRY_FILE) !== -1;
  }
}
