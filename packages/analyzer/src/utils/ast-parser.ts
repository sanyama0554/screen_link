import { parse as babelParse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { ParsedFile } from '../types';

export interface ASTParserOptions {
  typescript?: boolean;
  jsx?: boolean;
  decorators?: boolean;
}

export class ASTParser {
  private defaultOptions: ASTParserOptions = {
    typescript: true,
    jsx: true,
    decorators: true
  };

  parseFile(file: ParsedFile, options?: ASTParserOptions): ParsedFile {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      if (file.type === 'typescript' || file.type === 'javascript') {
        const plugins: any[] = [];
        
        if (opts.typescript) plugins.push('typescript');
        if (opts.jsx) plugins.push('jsx');
        if (opts.decorators) plugins.push(['decorators', { decoratorsBeforeExport: false }]);
        
        try {
          const ast = babelParse(file.content, {
            sourceType: 'module',
            plugins
          });
          
          return { ...file, ast };
        } catch (decoratorError) {
          // Fallback: try without decorators
          const fallbackPlugins = plugins.filter(p => !Array.isArray(p) || p[0] !== 'decorators');
          
          try {
            const ast = babelParse(file.content, {
              sourceType: 'module',
              plugins: fallbackPlugins
            });
            
            console.warn(`Parse with decorators failed for ${file.path}, using fallback`);
            return { ...file, ast };
          } catch (fallbackError) {
            console.warn(`Failed to parse ${file.path}:`, decoratorError instanceof Error ? decoratorError.message : decoratorError);
            return file;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse ${file.path}:`, error);
    }
    
    return file;
  }

  findNodes<T extends t.Node>(
    ast: t.Node,
    predicate: (node: t.Node, path: NodePath) => node is T
  ): { node: T; path: NodePath }[] {
    const results: { node: T; path: NodePath }[] = [];
    
    traverse(ast, {
      enter(path) {
        if (predicate(path.node, path)) {
          results.push({ node: path.node as T, path });
        }
      }
    });
    
    return results;
  }

  findImports(ast: t.Node): Array<{ source: string; specifiers: string[]; isDefault?: boolean }> {
    const imports: Array<{ source: string; specifiers: string[]; isDefault?: boolean }> = [];
    
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        const specifiers: string[] = [];
        let isDefault = false;
        
        path.node.specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            specifiers.push(spec.local.name);
            isDefault = true;
          } else if (t.isImportSpecifier(spec)) {
            specifiers.push(spec.local.name);
          } else if (t.isImportNamespaceSpecifier(spec)) {
            specifiers.push(spec.local.name);
          }
        });
        
        imports.push({ source, specifiers, isDefault });
      }
    });
    
    return imports;
  }

  findExports(ast: t.Node): Array<{ name: string; isDefault?: boolean }> {
    const exports: Array<{ name: string; isDefault?: boolean }> = [];
    
    traverse(ast, {
      ExportDefaultDeclaration(path) {
        if (t.isIdentifier(path.node.declaration)) {
          exports.push({ name: path.node.declaration.name, isDefault: true });
        } else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          exports.push({ name: path.node.declaration.id.name, isDefault: true });
        }
      },
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            exports.push({ name: path.node.declaration.id.name });
          } else if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                exports.push({ name: decl.id.name });
              }
            });
          }
        }
        
        path.node.specifiers?.forEach(spec => {
          if (t.isExportSpecifier(spec)) {
            const exportedName = t.isIdentifier(spec.exported) ? spec.exported.name : spec.local.name;
            exports.push({ name: exportedName });
          }
        });
      }
    });
    
    return exports;
  }

  findDecorators(ast: t.Node): Array<{ name: string; args: any[]; target?: string }> {
    const decorators: Array<{ name: string; args: any[]; target?: string }> = [];
    
    traverse(ast, {
      ClassDeclaration(path) {
        const className = path.node.id?.name;
        path.node.decorators?.forEach(decorator => {
          if (t.isCallExpression(decorator.expression) && t.isIdentifier(decorator.expression.callee)) {
            const args = decorator.expression.arguments.map(arg => {
              if (t.isStringLiteral(arg)) return arg.value;
              if (t.isNumericLiteral(arg)) return arg.value;
              return null;
            });
            decorators.push({
              name: decorator.expression.callee.name,
              args,
              target: className
            });
          } else if (t.isIdentifier(decorator.expression)) {
            decorators.push({
              name: decorator.expression.name,
              args: [],
              target: className
            });
          }
        });
        
        // Check method decorators
        path.node.body.body.forEach(member => {
          if (t.isClassMethod(member) && member.decorators) {
            member.decorators.forEach(decorator => {
              if (t.isCallExpression(decorator.expression) && t.isIdentifier(decorator.expression.callee)) {
                const args = decorator.expression.arguments.map(arg => {
                  if (t.isStringLiteral(arg)) return arg.value;
                  if (t.isNumericLiteral(arg)) return arg.value;
                  return null;
                });
                decorators.push({
                  name: decorator.expression.callee.name,
                  args,
                  target: `${className}.${(member.key as any).name}`
                });
              }
            });
          }
        });
      }
    });
    
    return decorators;
  }
}