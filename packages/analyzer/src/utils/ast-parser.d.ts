import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { ParsedFile } from '../types';
export interface ASTParserOptions {
    typescript?: boolean;
    jsx?: boolean;
    decorators?: boolean;
}
export declare class ASTParser {
    private defaultOptions;
    parseFile(file: ParsedFile, options?: ASTParserOptions): ParsedFile;
    findNodes<T extends t.Node>(ast: t.Node, predicate: (node: t.Node, path: NodePath) => node is T): {
        node: T;
        path: NodePath;
    }[];
    findImports(ast: t.Node): Array<{
        source: string;
        specifiers: string[];
        isDefault?: boolean;
    }>;
    findExports(ast: t.Node): Array<{
        name: string;
        isDefault?: boolean;
    }>;
    findDecorators(ast: t.Node): Array<{
        name: string;
        args: any[];
        target?: string;
    }>;
}
