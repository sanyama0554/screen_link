"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLAnalyzer = void 0;
const graphql_1 = require("graphql");
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
class GraphQLAnalyzer {
    constructor(options) {
        this.options = options;
    }
    analyzeGraphQL(files) {
        const graphqlInfo = [];
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
    analyzeGraphQLFile(file) {
        const results = [];
        try {
            const document = (0, graphql_1.parse)(file.content);
            for (const definition of document.definitions) {
                if (definition.kind === 'OperationDefinition') {
                    const operation = definition;
                    const info = this.extractOperationInfo(operation, file, file.content);
                    if (info) {
                        results.push(info);
                    }
                }
            }
        }
        catch (error) {
            console.warn(`Failed to parse GraphQL in ${file.path}:`, error);
        }
        return results;
    }
    analyzeGraphQLInCode(file) {
        const results = [];
        if (!file.ast)
            return results;
        (0, traverse_1.default)(file.ast, {
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
                        if (firstArg && t.isExpression(firstArg)) {
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
    reconstructTemplateString(quasi) {
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
    parseGraphQLString(content, file) {
        try {
            // Remove template literal expressions
            const cleanContent = content.replace(/\$\{[^}]*\}/g, '');
            const document = (0, graphql_1.parse)(cleanContent);
            for (const definition of document.definitions) {
                if (definition.kind === 'OperationDefinition') {
                    const operation = definition;
                    return this.extractOperationInfo(operation, file, content);
                }
            }
        }
        catch (error) {
            // GraphQL parsing failed, but that's okay for templates with variables
        }
        return null;
    }
    analyzeHookUsage(arg, hookName, file) {
        // Try to resolve the GraphQL document from the argument
        if (t.isIdentifier(arg)) {
            // It's a reference to a variable/import
            // We'd need to trace the import/definition (simplified for now)
            const operationType = hookName.includes('Mutation') ? 'mutation' : 'query';
            return {
                id: `gql:${operationType}.${arg.name}`,
                operationType: operationType,
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
    extractOperationInfo(operation, file, content) {
        const operationType = operation.operation;
        const operationName = operation.name?.value;
        // Get the first field from the selection set
        let firstFieldName = '';
        if (operation.selectionSet.selections.length > 0) {
            const firstSelection = operation.selectionSet.selections[0];
            if (firstSelection.kind === 'Field') {
                const field = firstSelection;
                firstFieldName = field.name.value;
            }
        }
        const fieldName = operationName || firstFieldName;
        if (!fieldName)
            return null;
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
    findGraphQLDependencies(file) {
        const dependencies = [];
        if (!file.ast)
            return dependencies;
        (0, traverse_1.default)(file.ast, {
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
                        if (firstArg && t.isExpression(firstArg)) {
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
    guessOperationType(name) {
        const lower = name.toLowerCase();
        if (lower.includes('mutation') || lower.includes('create') ||
            lower.includes('update') || lower.includes('delete')) {
            return 'mutation';
        }
        return 'query';
    }
}
exports.GraphQLAnalyzer = GraphQLAnalyzer;
