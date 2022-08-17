import {readFileSync, readdirSync, statSync} from 'fs';
import {extname, join, sep} from 'path';

import {File, IFile, IFileRepo} from '@src/monokle-core';
import {IBaseResource} from '@src/monokle-core/core/interfaces/IBaseResource';
import {IFolder} from '@src/monokle-core/core/interfaces/IFolder';
import {Folder} from '@src/monokle-core/core/models/Folder';

export class LocalFileRepository implements IFileRepo {
  updateFile(file: IFile): Promise<boolean> {
    console.log('file', file);
    throw new Error('Method not implemented.');
  }
  deleteFile(file: IFile): Promise<boolean> {
    console.log('file', file);

    throw new Error('Method not implemented.');
  }
  extractResources(file: IFile): Promise<IBaseResource[]> {
    return Promise.resolve(file.getResources());
  }
  removeResource(file: IFile, kind: IBaseResource): Promise<IFile> {
    console.log('file', file);
    console.log('kind', kind);

    throw new Error('Method not implemented.');
  }

  async getFolder(basePath: string, folder: IFolder | null): Promise<IFolder> {
    const files = readdirSync(basePath);

    if (!folder) {
      folder = new Folder(basePath, [], []);
    }

    await Promise.all(
      files.map(async file => {
        if (statSync(join(basePath, sep, file)).isDirectory()) {
          const newFolder = new Folder(join(basePath, sep, file), [], []);
          folder?.addFolder(newFolder);
          this.getFolder(join(basePath, sep, file), newFolder);
        } else {
          const path = join(basePath, sep, file);
          folder?.addFile(new File(path, await this.getFileContent(path), extname(path)));
        }
      })
    );

    return folder;
  }

  getFileContent(path: string): Promise<string> {
    return Promise.resolve(readFileSync(path, 'utf8'));
  }
}
