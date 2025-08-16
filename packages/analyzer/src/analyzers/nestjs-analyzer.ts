import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ParsedFile, ResolverInfo } from '../types';

export interface NestJSAnalyzerOptions {
  decorators: {
    resolver: string[];
    query: string[];
    mutation: string[];
    resolveField: string[];
  };
}

export class NestJSAnalyzer {
  constructor(private options: NestJSAnalyzerOptions) {}

  analyzeResolvers(files: ParsedFile[]): ResolverInfo[] {
    const resolvers: ResolverInfo[] = [];
    
    const tsFiles = files.filter(f => f.type === 'typescript');
    
    for (const file of tsFiles) {
      // Try AST-based analysis first
      if (file.ast) {
        const astResolvers = this.analyzeResolverFile(file);
        resolvers.push(...astResolvers);
      } else {
        // Fallback to regex-based analysis
        const regexResolvers = this.analyzeResolverFileWithRegex(file);
        resolvers.push(...regexResolvers);
      }
    }
    
    return resolvers;
  }

  private analyzeResolverFile(file: ParsedFile): ResolverInfo[] {
    const resolvers: ResolverInfo[] = [];
    
    if (!file.ast) return resolvers;
    
    traverse(file.ast, {
      ClassDeclaration: (path) => {
        // Check if class has @Resolver decorator
        const hasResolverDecorator = this.hasDecorator(
          path.node.decorators || [], 
          this.options.decorators.resolver
        );
        
        if (hasResolverDecorator && path.node.id) {
          const className = path.node.id.name;
          
          // Analyze methods in the resolver class
          path.node.body.body.forEach(member => {
            if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
              const methodName = member.key.name;
              const methodDecorators = member.decorators || [];
              
              // Check for GraphQL decorators
              const queryDecorator = this.findDecorator(methodDecorators, this.options.decorators.query);
              const mutationDecorator = this.findDecorator(methodDecorators, this.options.decorators.mutation);
              const fieldDecorator = this.findDecorator(methodDecorators, this.options.decorators.resolveField);
              
              let resolverType: 'query' | 'mutation' | 'field';
              let graphqlName = methodName;
              
              if (queryDecorator) {
                resolverType = 'query';
                graphqlName = this.extractDecoratorArgument(queryDecorator) || methodName;
              } else if (mutationDecorator) {
                resolverType = 'mutation';
                graphqlName = this.extractDecoratorArgument(mutationDecorator) || methodName;
              } else if (fieldDecorator) {
                resolverType = 'field';
                graphqlName = this.extractDecoratorArgument(fieldDecorator) || methodName;
              } else {
                return; // Skip methods without GraphQL decorators
              }
              
              // Analyze method body for dependencies
              const dependencies = this.analyzeDependencies(member, file);
              
              const resolverId = `resolver:${className}.${methodName}`;
              
              resolvers.push({
                id: resolverId,
                className,
                methodName,
                type: resolverType,
                graphqlName,
                file: file.path,
                dependencies
              });
            }
          });
        }
      }
    });
    
    return resolvers;
  }

  private hasDecorator(decorators: t.Decorator[], decoratorNames: string[]): boolean {
    return decorators.some(decorator => {
      if (t.isCallExpression(decorator.expression) && t.isIdentifier(decorator.expression.callee)) {
        return decoratorNames.includes(decorator.expression.callee.name);
      }
      if (t.isIdentifier(decorator.expression)) {
        return decoratorNames.includes(decorator.expression.name);
      }
      return false;
    });
  }

  private findDecorator(decorators: t.Decorator[], decoratorNames: string[]): t.Decorator | null {
    return decorators.find(decorator => {
      if (t.isCallExpression(decorator.expression) && t.isIdentifier(decorator.expression.callee)) {
        return decoratorNames.includes(decorator.expression.callee.name);
      }
      if (t.isIdentifier(decorator.expression)) {
        return decoratorNames.includes(decorator.expression.name);
      }
      return false;
    }) || null;
  }

  private extractDecoratorArgument(decorator: t.Decorator): string | null {
    if (t.isCallExpression(decorator.expression)) {
      const firstArg = decorator.expression.arguments[0];
      if (t.isStringLiteral(firstArg)) {
        return firstArg.value;
      }
    }
    return null;
  }

  private analyzeDependencies(method: t.ClassMethod, file: ParsedFile): string[] {
    const dependencies: string[] = [];
    
    // Traverse method body to find service calls
    traverse(method as any, {
      MemberExpression: (methodPath) => {
        // Look for this.someService.someMethod() patterns
        if (t.isThisExpression(methodPath.node.object) && t.isIdentifier(methodPath.node.property)) {
          const serviceName = methodPath.node.property.name;
          
          // Check if this is followed by a method call
          const parent = methodPath.parent;
          if (t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
            const methodName = parent.property.name;
            
            // Try to infer gRPC service calls
            const grpcCall = this.inferGrpcCall(serviceName, methodName);
            if (grpcCall) {
              dependencies.push(grpcCall);
            }
          }
        }
        
        // Look for getService() calls for gRPC clients
        if (t.isMemberExpression(methodPath.node) && 
            t.isCallExpression(methodPath.node.object) &&
            t.isMemberExpression(methodPath.node.object.callee) &&
            t.isThisExpression(methodPath.node.object.callee.object) &&
            t.isIdentifier(methodPath.node.object.callee.property) &&
            methodPath.node.object.callee.property.name === 'getService') {
          
          // this.client.getService('ServiceName').methodName
          const serviceArg = methodPath.node.object.arguments[0];
          if (t.isStringLiteral(serviceArg) && t.isIdentifier(methodPath.node.property)) {
            const serviceName = serviceArg.value;
            const methodName = methodPath.node.property.name;
            dependencies.push(`grpc:${serviceName}.${this.toPascalCase(methodName)}`);
          }
        }
      }
    });
    
    return dependencies;
  }

  private inferGrpcCall(serviceName: string, methodName: string): string | null {
    // Heuristic: if service name contains certain patterns, assume it's a gRPC client
    const grpcPatterns = ['client', 'service', 'grpc'];
    const serviceNameLower = serviceName.toLowerCase();
    
    if (grpcPatterns.some(pattern => serviceNameLower.includes(pattern))) {
      // Convert camelCase method to PascalCase
      const pascalMethodName = this.toPascalCase(methodName);
      
      // Try to extract service name from property name
      let inferredServiceName = serviceName;
      
      // Remove common suffixes/prefixes
      inferredServiceName = inferredServiceName
        .replace(/Client$/i, '')
        .replace(/Service$/i, '')
        .replace(/^grpc/i, '');
      
      // Convert to PascalCase
      inferredServiceName = this.toPascalCase(inferredServiceName);
      
      if (inferredServiceName) {
        return `grpc:${inferredServiceName}Service.${pascalMethodName}`;
      }
    }
    
    return null;
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Analyze ClientsModule.register configurations
  analyzeGrpcClients(files: ParsedFile[]): Record<string, { service: string; package: string }> {
    const clientMapping: Record<string, { service: string; package: string }> = {};
    
    const tsFiles = files.filter(f => f.type === 'typescript' && f.ast);
    
    for (const file of tsFiles) {
      if (!file.ast) continue;
      
      traverse(file.ast, {
        CallExpression: (path) => {
          // Look for ClientsModule.register()
          if (t.isMemberExpression(path.node.callee) &&
              t.isMemberExpression(path.node.callee.object) &&
              t.isIdentifier(path.node.callee.object.object) &&
              path.node.callee.object.object.name === 'ClientsModule' &&
              t.isIdentifier(path.node.callee.object.property) &&
              path.node.callee.object.property.name === 'register') {
            
            // Extract configuration
            const config = path.node.arguments[0];
            if (t.isArrayExpression(config)) {
              config.elements.forEach(element => {
                if (t.isObjectExpression(element)) {
                  let name = '';
                  let packageName = '';
                  let protoPath = '';
                  
                  element.properties.forEach(prop => {
                    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                      if (prop.key.name === 'name' && t.isStringLiteral(prop.value)) {
                        name = prop.value.value;
                      } else if (prop.key.name === 'transport' && t.isMemberExpression(prop.value)) {
                        // Skip transport config for now
                      } else if (prop.key.name === 'options' && t.isObjectExpression(prop.value)) {
                        prop.value.properties.forEach(optProp => {
                          if (t.isObjectProperty(optProp) && t.isIdentifier(optProp.key)) {
                            if (optProp.key.name === 'package' && t.isStringLiteral(optProp.value)) {
                              packageName = optProp.value.value;
                            } else if (optProp.key.name === 'protoPath' && t.isStringLiteral(optProp.value)) {
                              protoPath = optProp.value.value;
                            }
                          }
                        });
                      }
                    }
                  });
                  
                  if (name && packageName) {
                    // Infer service name from package or name
                    const serviceName = this.inferServiceName(name, packageName, protoPath);
                    clientMapping[name] = { service: serviceName, package: packageName };
                  }
                }
              });
            }
          }
        }
      });
    }
    
    return clientMapping;
  }

  private inferServiceName(name: string, packageName: string, protoPath: string): string {
    // Try to infer service name from various sources
    
    // 1. From name if it looks like a service name
    if (name.toLowerCase().includes('service')) {
      return this.toPascalCase(name.replace(/client|service/gi, '')) + 'Service';
    }
    
    // 2. From package name
    const packageParts = packageName.split('.');
    if (packageParts.length > 0) {
      const lastPart = packageParts[packageParts.length - 1];
      return this.toPascalCase(lastPart) + 'Service';
    }
    
    // 3. From proto path
    if (protoPath) {
      const filename = protoPath.split('/').pop()?.replace('.proto', '') || '';
      return this.toPascalCase(filename) + 'Service';
    }
    
    // Fallback
    return this.toPascalCase(name) + 'Service';
  }

  /**
   * Regex-based fallback analysis when AST parsing fails
   */
  private analyzeResolverFileWithRegex(file: ParsedFile): ResolverInfo[] {
    const resolvers: ResolverInfo[] = [];
    const content = file.content;
    
    // Find class declarations with @Resolver decorator
    const resolverClassRegex = /@Resolver\s*\(\s*[^)]*\s*\)\s*(?:export\s+)?class\s+(\w+)/g;
    let resolverMatch;
    
    while ((resolverMatch = resolverClassRegex.exec(content)) !== null) {
      const className = resolverMatch[1];
      
      // Find methods with @Query, @Mutation, @ResolveField decorators
      const methodRegex = new RegExp(
        `@(Query|Mutation|ResolveField)\\s*\\([^)]*\\)\\s*(?:async\\s+)?(\\w+)\\s*\\(`,
        'g'
      );
      
      let methodMatch;
      while ((methodMatch = methodRegex.exec(content)) !== null) {
        const decoratorType = methodMatch[1].toLowerCase() as 'query' | 'mutation' | 'resolveField';
        const methodName = methodMatch[2];
        
        const resolverId = `resolver:${className}.${methodName}`;
        
        resolvers.push({
          id: resolverId,
          className,
          methodName,
          type: decoratorType === 'resolveField' ? 'field' : decoratorType,
          graphqlName: methodName, // Use method name as GraphQL name
          dependencies: [], // Simple regex can't extract dependencies reliably
          file: file.path
        });
      }
    }
    
    return resolvers;
  }
}