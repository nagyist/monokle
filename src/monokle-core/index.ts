import {IFile} from './core/interfaces/IFile';
import {IK8sResource} from './core/interfaces/IK8sResource';
import {File} from './core/models/File';
import {IFileRepo} from './repositories/IFileRepo';
import {FileService} from './services/FileService';

export type {IFileRepo, IFile, IK8sResource};
export {File};

export const getFileService = (fileRepo: IFileRepo): FileService => new FileService(fileRepo);
