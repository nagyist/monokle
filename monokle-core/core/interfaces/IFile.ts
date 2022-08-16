import {K8sResource} from '../models/K8sResource';

export interface IFile {
    path: string;
    content: string;
    extension: string;

    getK8sResorces(): K8sResource[];
}
