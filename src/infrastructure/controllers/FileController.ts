import {IFile, getFileService} from '@src/monokle-core';
import {IBaseResource} from '@src/monokle-core/core/interfaces/IBaseResource';
import {IFolder} from '@src/monokle-core/core/interfaces/IFolder';
import {FileService} from '@src/monokle-core/services/FileService';

import {FileTreeDTO} from '../dtos/FileTreeDto';
import {LocalFileRepository} from '../repositories/LocalFileRepository';

export class FileController {
  private fileService: FileService;
  constructor() {
    this.fileService = getFileService(new LocalFileRepository());
  }

  public async getFolder(rootPath: string) {
    return this.fileService.getFolder(rootPath);
  }

  public getFileMap(folder: IFolder, rootPath: string): {[key: string]: FileTreeDTO} {
    let fileTreeDTO: {[key: string]: FileTreeDTO} = {};
    const name = folder.path === rootPath ? '<root>' : folder.path.split('/')[folder.path.split('/').length - 1];
    const filePath = folder.path === rootPath ? rootPath : folder.path.replace(rootPath, '');
    fileTreeDTO[folder.path === rootPath ? name : filePath] = {
      name,
      filePath: folder.path === rootPath ? folder.path : filePath,
      isExcluded: false,
      isSupported: false,
      children: [
        ...folder.files.map(file => file.path.replace(`${folder.path}/`, '')),
        ...folder.folders.map(f => f.path.replace(`${folder.path}/`, '')),
      ],
      timestamp: 0,
    };
    folder.files.forEach(file => {
      const path = file.path.replace(`${rootPath}`, '');
      fileTreeDTO[path] = {
        name: file.path.replace(`${folder.path}/`, ''),
        filePath: path,
        isExcluded: false,
        isSupported: false,
        extension: file.extension,
        timestamp: 0,
        text: file.content,
      };
    });

    folder.folders.forEach((f: IFolder) => {
      fileTreeDTO = {
        ...fileTreeDTO,
        ...this.getFileMap(f, rootPath),
      };
    });

    return fileTreeDTO;
  }

  public async getResourceMap(folder: IFolder): Promise<{[key: string]: IBaseResource}> {
    const resourceMap: {[key: string]: IBaseResource} = {};
    const allResources = await this.fileService.getAllResources(folder);
    allResources.forEach((r: IBaseResource) => {
      resourceMap[r.id] = r as any;
    });
    return resourceMap;
  }

  private fileTreeMapper(files: IFile[], rootPath: string) {}
}
