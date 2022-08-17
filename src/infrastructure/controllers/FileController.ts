import {getFileService} from '@src/monokle-core';

import {LocalFileRepository} from '../repositories/LocalFileRepository';

const fileService = getFileService(new LocalFileRepository());

export {fileService};
