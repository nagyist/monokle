import {IFile} from '../core/interfaces/IFile';
import {IK8sResource} from '../core/interfaces/IK8sResource';

export interface IFileRepo {
    listAll(): Promise<IFile[]>;
    updateFile(file: IFile): Promise<boolean>;
    deleteFile(file: IFile): Promise<boolean>;
    extractResources(file: IFile): Promise<IK8sResource[]>;
    removeResource(file: IFile, kind: IK8sResource): Promise<IFile>;
}
