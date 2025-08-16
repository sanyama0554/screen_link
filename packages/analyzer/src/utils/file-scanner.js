"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileScanner = void 0;
const glob_1 = require("glob");
const fs_1 = require("fs");
const path_1 = require("path");
class FileScanner {
    constructor(options) {
        this.options = options;
    }
    async scanFiles() {
        const files = [];
        for (const pattern of this.options.includePatterns) {
            const matches = await (0, glob_1.glob)(pattern, {
                cwd: this.options.rootDir,
                ignore: this.options.excludePatterns,
                absolute: true,
                nodir: true
            });
            for (const filePath of matches) {
                try {
                    const stats = (0, fs_1.statSync)(filePath);
                    if (stats.isFile() && stats.size < 10 * 1024 * 1024) { // Skip files > 10MB
                        const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
                        const relativePath = (0, path_1.relative)(this.options.rootDir, filePath);
                        files.push({
                            path: relativePath,
                            content,
                            type: this.getFileType(filePath)
                        });
                    }
                }
                catch (error) {
                    console.warn(`Failed to read file ${filePath}:`, error);
                }
            }
        }
        return files;
    }
    getFileType(filePath) {
        const ext = (0, path_1.extname)(filePath).toLowerCase();
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
    filterFilesByType(files, type) {
        return files.filter(file => file.type === type);
    }
    filterFilesByPattern(files, pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        return files.filter(file => regex.test(file.path));
    }
}
exports.FileScanner = FileScanner;
