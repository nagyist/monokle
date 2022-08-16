import {IBaseResource} from '../../interfaces/IBaseResource';
import {IBaseResourceFactory} from '../interfaces/IBaseResourceFactory';

export class ResourceFactory implements IBaseResourceFactory {
  createResource(baseValues: IBaseResource): IBaseResource {
    throw new Error('Method not implemented.');
  }
}
