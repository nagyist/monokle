import {flatten} from 'lodash';

import {IFile} from '../core/interfaces/IFile';
import {IK8sResource} from '../core/interfaces/IK8sResource';
import {IFileRepo} from '../repositories/IFileRepo';

export class FileService {
  private fileRepo: IFileRepo;

  constructor(fileRepo: IFileRepo) {
    this.fileRepo = fileRepo;
  }

  async getAllFiles(): Promise<IFile[]> {
    const allFiles: IFile[] = await this.fileRepo.listAll();
    return allFiles;
  }

  async getAllResources(): Promise<IK8sResource[]> {
    const allFiles: IFile[] = await this.fileRepo.listAll();
    const allResources: IK8sResource[] = flatten(
      await Promise.all(allFiles.map((file: IFile) => this.fileRepo.extractResources(file)))
    );
    return allResources;
  }
}
