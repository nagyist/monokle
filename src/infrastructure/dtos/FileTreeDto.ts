export interface FileTreeDTO {
  name: string;
  filePath: string;
  isExcluded: boolean;
  isSupported: boolean;
  extension?: string;
  children?: Array<string>;
  timestamp: number;
  text?: string;
}
