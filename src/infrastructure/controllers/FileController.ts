import {getFileService} from '@root/monokle-core';

import {LocalFileRepository} from '../repositories/FileRepository';

const fileService = getFileService(new LocalFileRepository('/Users/erdkse/Monokle/main-cluster'));
