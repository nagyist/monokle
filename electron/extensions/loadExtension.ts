import log from 'loglevel';
import path from 'path';

import {doesPathExist, readFile} from './fileSystem';
import {LoadExtensionOptions} from './types';

async function loadExtension<ExtensionEntryType, ExtensionType>(
  options: LoadExtensionOptions<ExtensionEntryType, ExtensionType>
): Promise<ExtensionType | undefined> {
  const {
    folderPath,
    entryFileName,
    parseEntryFileContent,
    validateEntryFileContent,
    transformEntryFileContentToExtension,
  } = options;
  const entryFilePath = path.join(folderPath, entryFileName);
  const doesEntryFileExist = await doesPathExist(entryFilePath);
  if (!doesEntryFileExist) {
    log.warn(`[LoadExtension]: Missing ${entryFileName} in ${folderPath}.`);
    return undefined;
  }
  const entryFileContent = await readFile(entryFilePath);
  const parsedEntryFileContent = parseEntryFileContent(entryFileContent);
  try {
    validateEntryFileContent(parsedEntryFileContent);
  } catch (e) {
    if (e instanceof Error) {
      log.warn(`[LoadExtension]: Invalid ${entryFileName} in ${folderPath}: `, e.message);
    }
    return undefined;
  }
  const extension = transformEntryFileContentToExtension(parsedEntryFileContent, folderPath);
  return extension;
}

export default loadExtension;
