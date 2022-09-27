import axios from 'axios';

import {File, IFile, IFileRepo} from '@src/monokle-core';
import {IBaseResource} from '@src/monokle-core/core/interfaces/IBaseResource';
import {IFolder} from '@src/monokle-core/core/interfaces/IFolder';
import {Folder} from '@src/monokle-core/core/models/Folder';

axios.create({
  auth: {
    username: 'erdkse',
    password: '',
  },
});

export class GithubRepo implements IFileRepo {
  async getFolder(basePath: string, folder: IFolder | null): Promise<IFolder> {
    const {data} = await axios.get(`https://api.github.com/repos${basePath}/git/trees/master?recursive=1`);

    if (!folder) {
      folder = new Folder(basePath, [], []);
    }

    const folderName = '';
    await Promise.all(
      data.tree
        .filter((t: {type: string}) => t.type === 'blob')
        .map(async (d: {path: string; url: string}) => {
          const test = await this.addFilesAndFolders(
            d.path.split('/'),
            folder as Folder,
            folder as Folder,
            d,
            basePath
          );
          console.log('test', test);
          folder = test;
        })
    );

    return folder;
  }
  updateFile(file: IFile): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  deleteFile(file: IFile): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  extractResources(file: IFile): Promise<IBaseResource[]> {
    return Promise.resolve(file.getResources());
  }
  removeResource(file: IFile, kind: IBaseResource): Promise<IFile> {
    throw new Error('Method not implemented.');
  }
  async getFileContent(path: string): Promise<string> {
    return 'NOT FOUND';
    // try {
    //   const {data} = await axios.get(path);
    //   return Buffer.from(data.content, 'base64').toString();
    // } catch (error) {
    //   return 'NOT FOUND';
    // }
  }

  private async addFilesAndFolders(
    paths: Array<string>,
    mainFolder: Folder,
    parentFolder: Folder,
    d: any,
    basePath: string
  ): Promise<Folder> {
    if (paths.length === 1) {
      const filePaths = basePath.split('/');

      const folder = this.findFolder(mainFolder, filePaths);
      const dotArray = paths[0].split('.');
      folder?.files.push(
        new File(`${basePath}/${d.path}`, await this.getFileContent(d.url), dotArray[dotArray.length - 1])
      );
      return mainFolder;
    }

    const mainPath = paths.slice(0, 1);
    const restPath = paths.slice(1, paths.length);
    const childFolder = parentFolder.folders.find(f => f.path === `${basePath}/${mainPath}`);

    if (childFolder) {
      return this.addFilesAndFolders(restPath, mainFolder, childFolder, d, `${basePath}/${mainPath}`);
    }

    return this.addFilesAndFolders(
      restPath,
      mainFolder,
      new Folder(`${basePath}/${mainPath}`, [], []),
      d,
      `${basePath}/${mainPath}`
    );
  }

  private findFolder(folder: Folder, paths: Array<string>) {
    console.log('paths', paths);
    return folder;
  }
}
