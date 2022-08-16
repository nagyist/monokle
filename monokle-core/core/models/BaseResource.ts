import {v4 as uuidv4} from 'uuid';

import {IBaseResource} from '../interfaces/IBaseResource';

export class BaseResource implements IBaseResource {
  id: string;
  filePath: string;
  name: string;

  constructor(filePath: string, name: string, id?: string) {
    this.filePath = filePath;
    this.name = name;
    this.id = id || uuidv4();
  }
}
