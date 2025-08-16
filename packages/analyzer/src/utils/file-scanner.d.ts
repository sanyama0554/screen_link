import { ParsedFile } from '../types';
export interface FileScannerOptions {
    includePatterns: string[];
    excludePatterns: string[];
    rootDir: string;
}
export declare class FileScanner {
    private options;
    constructor(options: FileScannerOptions);
    scanFiles(): Promise<ParsedFile[]>;
    private getFileType;
    filterFilesByType(files: ParsedFile[], type: ParsedFile['type']): ParsedFile[];
    filterFilesByPattern(files: ParsedFile[], pattern: string | RegExp): ParsedFile[];
}
