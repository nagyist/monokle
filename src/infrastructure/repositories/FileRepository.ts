import {readFileSync, readdirSync, statSync} from 'fs';
import {extname, join, sep} from 'path';

import {File, IFile, IFileRepo, IK8sResource} from '@root/monokle-core';

export class LocalFileRepository implements IFileRepo {
  private filePath: string;
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  listAll(): Promise<IFile[]> {
    const allFilePaths = this.getAllFiles(this.filePath, []);
    const allFiles: IFile[] = allFilePaths.map(
      (path: string) => new File(path, readFileSync(path, 'utf8'), extname(path))
    );
    return Promise.resolve(allFiles);
  }
  updateFile(file: IFile): Promise<boolean> {
    console.log('file', file);
    throw new Error('Method not implemented.');
  }
  deleteFile(file: IFile): Promise<boolean> {
    console.log('file', file);

    throw new Error('Method not implemented.');
  }
  extractResources(file: IFile): Promise<IK8sResource[]> {
    return Promise.resolve(file.getK8sResorces());
  }
  removeResource(file: IFile, kind: IK8sResource): Promise<IFile> {
    console.log('file', file);
    console.log('kind', kind);

    throw new Error('Method not implemented.');
  }

  getAllFiles(basePath: string, arrayOfFiles: string[]): string[] {
    const files = readdirSync(basePath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
      if (statSync(join(basePath, sep, file)).isDirectory()) {
        arrayOfFiles = this.getAllFiles(join(basePath, sep, file), arrayOfFiles);
      } else {
        arrayOfFiles.push(join(basePath, sep, file));
      }
    });

    return arrayOfFiles;
  }
}
