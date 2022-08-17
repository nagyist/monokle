import {flatten} from 'lodash';

import {IBaseResource} from '../core/interfaces/IBaseResource';
import {IFile} from '../core/interfaces/IFile';
import {IFolder} from '../core/interfaces/IFolder';
import {IFileRepo} from '../repositories/IFileRepo';

export class FileService {
  private fileRepo: IFileRepo;

  constructor(fileRepo: IFileRepo) {
    this.fileRepo = fileRepo;
  }

  async getFolder(basePath: string): Promise<IFolder> {
    return this.fileRepo.getFolder(basePath, null);
  }

  async getAllFiles(folder: IFolder): Promise<IFile[]> {
    return this.getFiles(folder);
  }

  async getFiles(folder: IFolder): Promise<IFile[]> {
    const files: IFile[] = [];
    files.push(...folder.files);
    await Promise.all(
      folder.folders.map(async (f: IFolder) => {
        files.push(...(await this.getFiles(f)));
      })
    );
    return Promise.resolve(files);
  }

  async getAllResources(folder: IFolder): Promise<IBaseResource[]> {
    const allFiles: IFile[] = await this.getFiles(folder);
    const allResources: IBaseResource[] = flatten(
      await Promise.all(allFiles.map((file: IFile) => this.fileRepo.extractResources(file)))
    );
    return allResources;
  }
}
