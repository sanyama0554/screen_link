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
exports.ASTParser = void 0;
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
class ASTParser {
    constructor() {
        this.defaultOptions = {
            typescript: true,
            jsx: true,
            decorators: true
        };
    }
    parseFile(file, options) {
        const opts = { ...this.defaultOptions, ...options };
        try {
            if (file.type === 'typescript' || file.type === 'javascript') {
                const plugins = [];
                if (opts.typescript)
                    plugins.push('typescript');
                if (opts.jsx)
                    plugins.push('jsx');
                if (opts.decorators)
                    plugins.push(['decorators', { decoratorsBeforeExport: true }]);
                const ast = (0, parser_1.parse)(file.content, {
                    sourceType: 'module',
                    plugins
                });
                return { ...file, ast };
            }
        }
        catch (error) {
            console.warn(`Failed to parse ${file.path}:`, error);
        }
        return file;
    }
    findNodes(ast, predicate) {
        const results = [];
        (0, traverse_1.default)(ast, {
            enter(path) {
                if (predicate(path.node, path)) {
                    results.push({ node: path.node, path });
                }
            }
        });
        return results;
    }
    findImports(ast) {
        const imports = [];
        (0, traverse_1.default)(ast, {
            ImportDeclaration(path) {
                const source = path.node.source.value;
                const specifiers = [];
                let isDefault = false;
                path.node.specifiers.forEach(spec => {
                    if (t.isImportDefaultSpecifier(spec)) {
                        specifiers.push(spec.local.name);
                        isDefault = true;
                    }
                    else if (t.isImportSpecifier(spec)) {
                        specifiers.push(spec.local.name);
                    }
                    else if (t.isImportNamespaceSpecifier(spec)) {
                        specifiers.push(spec.local.name);
                    }
                });
                imports.push({ source, specifiers, isDefault });
            }
        });
        return imports;
    }
    findExports(ast) {
        const exports = [];
        (0, traverse_1.default)(ast, {
            ExportDefaultDeclaration(path) {
                if (t.isIdentifier(path.node.declaration)) {
                    exports.push({ name: path.node.declaration.name, isDefault: true });
                }
                else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                    exports.push({ name: path.node.declaration.id.name, isDefault: true });
                }
            },
            ExportNamedDeclaration(path) {
                if (path.node.declaration) {
                    if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
                        exports.push({ name: path.node.declaration.id.name });
                    }
                    else if (t.isVariableDeclaration(path.node.declaration)) {
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
    findDecorators(ast) {
        const decorators = [];
        (0, traverse_1.default)(ast, {
            ClassDeclaration(path) {
                const className = path.node.id?.name;
                path.node.decorators?.forEach(decorator => {
                    if (t.isCallExpression(decorator.expression) && t.isIdentifier(decorator.expression.callee)) {
                        const args = decorator.expression.arguments.map(arg => {
                            if (t.isStringLiteral(arg))
                                return arg.value;
                            if (t.isNumericLiteral(arg))
                                return arg.value;
                            return null;
                        });
                        decorators.push({
                            name: decorator.expression.callee.name,
                            args,
                            target: className
                        });
                    }
                    else if (t.isIdentifier(decorator.expression)) {
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
                                    if (t.isStringLiteral(arg))
                                        return arg.value;
                                    if (t.isNumericLiteral(arg))
                                        return arg.value;
                                    return null;
                                });
                                decorators.push({
                                    name: decorator.expression.callee.name,
                                    args,
                                    target: `${className}.${member.key.name}`
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
exports.ASTParser = ASTParser;
