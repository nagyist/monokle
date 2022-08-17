import {IK8sResource} from '../core/interfaces/IK8sResource';

export interface IK8sResourceRepo {
  getAll(): Promise<IK8sResource[]>;
  getbyNamespace(namespace: string): Promise<IK8sResource[]>;
  deleteFromCluster(kind: IK8sResource): Promise<boolean>;
}
