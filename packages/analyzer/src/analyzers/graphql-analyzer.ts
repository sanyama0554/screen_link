import { parse as parseGraphQL, DocumentNode, DefinitionNode, OperationDefinitionNode, FieldNode } from 'graphql';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ParsedFile, GraphQLInfo } from '../types';

export interface GraphQLAnalyzerOptions {
  tagNames: string[];
  includeDocumentNodes: boolean;
}

export class GraphQLAnalyzer {
  constructor(private options: GraphQLAnalyzerOptions) {}

  analyzeGraphQL(files: ParsedFile[]): GraphQLInfo[] {
    const graphqlInfo: GraphQLInfo[] = [];
    
    // Analyze .graphql files
    const graphqlFiles = files.filter(f => f.type === 'graphql');
    for (const file of graphqlFiles) {
      const info = this.analyzeGraphQLFile(file);
      graphqlInfo.push(...info);
    }
    
    // Analyze gql template literals in TypeScript/JavaScript files
    const codeFiles = files.filter(f => f.type === 'typescript' || f.type === 'javascript');
    for (const file of codeFiles) {
      if (file.ast) {
        const info = this.analyzeGraphQLInCode(file);
        graphqlInfo.push(...info);
      }
    }
    
    return graphqlInfo;
  }

  private analyzeGraphQLFile(file: ParsedFile): GraphQLInfo[] {
    const results: GraphQLInfo[] = [];
    
    try {
      const document = parseGraphQL(file.content);
      
      for (const definition of document.definitions) {
        if (definition.kind === 'OperationDefinition') {
          const operation = definition as OperationDefinitionNode;
          const info = this.extractOperationInfo(operation, file, file.content);
          if (info) {
            results.push(info);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse GraphQL in ${file.path}:`, error);
    }
    
    return results;
  }

  private analyzeGraphQLInCode(file: ParsedFile): GraphQLInfo[] {
    const results: GraphQLInfo[] = [];
    
    if (!file.ast) return results;
    
    traverse(file.ast, {
      TaggedTemplateExpression: (path) => {
        const tag = path.node.tag;
        
        // Check if it's a gql or graphql tagged template
        let isGraphQLTag = false;
        if (t.isIdentifier(tag)) {
          isGraphQLTag = this.options.tagNames.includes(tag.name);
        }
        
        if (isGraphQLTag && path.node.quasi.quasis.length > 0) {
          const graphqlContent = this.reconstructTemplateString(path.node.quasi);
          const info = this.parseGraphQLString(graphqlContent, file);
          if (info) {
            results.push(info);
          }
        }
      },
      
      // Look for useQuery, useMutation, etc. hooks
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee)) {
          const funcName = path.node.callee.name;
          
          if (funcName.startsWith('use') && funcName.includes('Query') || 
              funcName.startsWith('use') && funcName.includes('Mutation')) {
            
            // First argument should be the GraphQL document
            const firstArg = path.node.arguments[0];
            if (firstArg) {
              const info = this.analyzeHookUsage(firstArg, funcName, file);
              if (info) {
                results.push(info);
              }
            }
          }
        }
      }
    });
    
    return results;
  }

  private reconstructTemplateString(quasi: t.TemplateLiteral): string {
    let result = '';
    
    for (let i = 0; i < quasi.quasis.length; i++) {
      result += quasi.quasis[i].value.raw;
      
      if (i < quasi.expressions.length) {
        // For now, just add placeholder for expressions
        result += '${...}';
      }
    }
    
    return result;
  }

  private parseGraphQLString(content: string, file: ParsedFile): GraphQLInfo | null {
    try {
      // Remove template literal expressions
      const cleanContent = content.replace(/\$\{[^}]*\}/g, '');
      const document = parseGraphQL(cleanContent);
      
      for (const definition of document.definitions) {
        if (definition.kind === 'OperationDefinition') {
          const operation = definition as OperationDefinitionNode;
          return this.extractOperationInfo(operation, file, content);
        }
      }
    } catch (error) {
      // GraphQL parsing failed, but that's okay for templates with variables
    }
    
    return null;
  }

  private analyzeHookUsage(arg: t.Expression, hookName: string, file: ParsedFile): GraphQLInfo | null {
    // Try to resolve the GraphQL document from the argument
    if (t.isIdentifier(arg)) {
      // It's a reference to a variable/import
      // We'd need to trace the import/definition (simplified for now)
      const operationType = hookName.includes('Mutation') ? 'mutation' : 'query';
      
      return {
        id: `gql:${operationType}.${arg.name}`,
        operationType: operationType as 'query' | 'mutation',
        fieldName: arg.name,
        file: file.path,
        content: `// Referenced: ${arg.name}`
      };
    }
    
    if (t.isTaggedTemplateExpression(arg)) {
      const content = this.reconstructTemplateString(arg.quasi);
      return this.parseGraphQLString(content, file);
    }
    
    return null;
  }

  private extractOperationInfo(operation: OperationDefinitionNode, file: ParsedFile, content: string): GraphQLInfo | null {
    const operationType = operation.operation;
    const operationName = operation.name?.value;
    
    // Get the first field from the selection set
    let firstFieldName = '';
    if (operation.selectionSet.selections.length > 0) {
      const firstSelection = operation.selectionSet.selections[0];
      if (firstSelection.kind === 'Field') {
        const field = firstSelection as FieldNode;
        firstFieldName = field.name.value;
      }
    }
    
    const fieldName = operationName || firstFieldName;
    if (!fieldName) return null;
    
    const id = `gql:${operationType}.${fieldName}`;
    
    return {
      id,
      operationType,
      fieldName,
      operationName,
      file: file.path,
      content
    };
  }

  // Find GraphQL dependencies in screen files
  findGraphQLDependencies(file: ParsedFile): string[] {
    const dependencies: string[] = [];
    
    if (!file.ast) return dependencies;
    
    traverse(file.ast, {
      TaggedTemplateExpression: (path) => {
        const tag = path.node.tag;
        if (t.isIdentifier(tag) && this.options.tagNames.includes(tag.name)) {
          const content = this.reconstructTemplateString(path.node.quasi);
          const info = this.parseGraphQLString(content, file);
          if (info) {
            dependencies.push(info.id);
          }
        }
      },
      
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee)) {
          const funcName = path.node.callee.name;
          
          if ((funcName.startsWith('use') && funcName.includes('Query')) || 
              (funcName.startsWith('use') && funcName.includes('Mutation'))) {
            
            const firstArg = path.node.arguments[0];
            if (firstArg) {
              const info = this.analyzeHookUsage(firstArg, funcName, file);
              if (info) {
                dependencies.push(info.id);
              }
            }
          }
        }
      },
      
      // Look for imported GraphQL documents
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        if (source.endsWith('.graphql') || source.endsWith('.gql')) {
          // Add dependency based on import specifiers
          path.node.specifiers.forEach(spec => {
            if (t.isImportDefaultSpecifier(spec) || t.isImportSpecifier(spec)) {
              const operationType = this.guessOperationType(spec.local.name);
              dependencies.push(`gql:${operationType}.${spec.local.name}`);
            }
          });
        }
      }
    });
    
    return dependencies;
  }

  private guessOperationType(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('mutation') || lower.includes('create') || 
        lower.includes('update') || lower.includes('delete')) {
      return 'mutation';
    }
    return 'query';
  }
}