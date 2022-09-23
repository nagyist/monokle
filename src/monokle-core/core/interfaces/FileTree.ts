export interface FileTree {
  name: string;
  filePath: string;
  isExcluded: boolean;
  isSupported: boolean;
  extension: string;
  children: Array<string>;
  timestamp: number;
}
