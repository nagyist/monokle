import {IBaseResource} from '../../interfaces/IBaseResource';

export interface IBaseResourceFactory {
  createResource(baseValues: IBaseResource): IBaseResource;
}
