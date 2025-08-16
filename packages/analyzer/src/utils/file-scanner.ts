import { glob } from 'glob';
import { readFileSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { ParsedFile } from '../types';

export interface FileScannerOptions {
  includePatterns: string[];
  excludePatterns: string[];
  rootDir: string;
}

export class FileScanner {
  constructor(private options: FileScannerOptions) {}

  async scanFiles(): Promise<ParsedFile[]> {
    const files: ParsedFile[] = [];
    
    for (const pattern of this.options.includePatterns) {
      const matches = await glob(pattern, {
        cwd: this.options.rootDir,
        ignore: this.options.excludePatterns,
        absolute: true,
        nodir: true
      });

      for (const filePath of matches) {
        try {
          const stats = statSync(filePath);
          if (stats.isFile() && stats.size < 10 * 1024 * 1024) { // Skip files > 10MB
            const content = readFileSync(filePath, 'utf-8');
            const relativePath = relative(this.options.rootDir, filePath);
            
            files.push({
              path: relativePath,
              content,
              type: this.getFileType(filePath)
            });
          }
        } catch (error) {
          console.warn(`Failed to read file ${filePath}:`, error);
        }
      }
    }

    return files;
  }

  private getFileType(filePath: string): ParsedFile['type'] {
    const ext = extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.graphql':
      case '.gql':
        return 'graphql';
      case '.proto':
        return 'proto';
      default:
        // Default to typescript for unknown extensions in TypeScript projects
        return 'typescript';
    }
  }

  filterFilesByType(files: ParsedFile[], type: ParsedFile['type']): ParsedFile[] {
    return files.filter(file => file.type === type);
  }

  filterFilesByPattern(files: ParsedFile[], pattern: string | RegExp): ParsedFile[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return files.filter(file => regex.test(file.path));
  }
}