"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisEngine = void 0;
const path_1 = require("path");
const utils_1 = require("./utils");
const analyzers_1 = require("./analyzers");
class AnalysisEngine {
    constructor(config) {
        this.config = config;
        this.fileScanner = new utils_1.FileScanner({
            includePatterns: config.analysis.includePatterns,
            excludePatterns: config.analysis.excludePatterns,
            rootDir: config.rootDir
        });
        this.astParser = new utils_1.ASTParser();
        this.nextjsAnalyzer = new analyzers_1.NextJSAnalyzer({
            appPath: 'app', // Will be set per app
            namespace: undefined // Will be set per app
        });
        this.graphqlAnalyzer = new analyzers_1.GraphQLAnalyzer({
            tagNames: config.analysis.graphql.tagNames,
            includeDocumentNodes: config.analysis.graphql.includeDocumentNodes
        });
        this.nestjsAnalyzer = new analyzers_1.NestJSAnalyzer({
            decorators: config.analysis.nestjs.decorators
        });
        this.grpcAnalyzer = new analyzers_1.GrpcAnalyzer();
    }
    async analyze() {
        const warnings = [];
        try {
            // Scan all files
            const files = await this.fileScanner.scanFiles();
            // Parse AST for TypeScript/JavaScript files
            const parsedFiles = files.map(file => {
                if (file.type === 'typescript' || file.type === 'javascript') {
                    return this.astParser.parseFile(file);
                }
                return file;
            });
            // Analyze each layer
            const result = await this.analyzeAll(parsedFiles);
            // Build dependency map
            const dependencyMap = this.buildDependencyMap(result, warnings);
            return dependencyMap;
        }
        catch (error) {
            warnings.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
            // Return empty map with warnings
            return {
                version: '1.0',
                nodes: [],
                edges: [],
                index: {
                    apiToScreens: {},
                    screenToApis: {},
                    routeGroups: {}
                },
                meta: {
                    warnings,
                    timestamp: new Date().toISOString(),
                    config: this.config.output.anonymize ? undefined : this.config
                }
            };
        }
    }
    async analyzeAll(files) {
        const screens = [];
        const graphql = [];
        const resolvers = [];
        const grpc = [];
        const warnings = [];
        // Analyze screens from Next.js apps
        for (const [appName, appConfig] of Object.entries(this.config.apps)) {
            if (appConfig.type === 'nextjs') {
                try {
                    const appFiles = files.filter(f => f.path.startsWith(appConfig.path));
                    const analyzer = new analyzers_1.NextJSAnalyzer({
                        appPath: (0, path_1.join)(appConfig.path, 'app'),
                        namespace: appConfig.namespace
                    });
                    const appScreens = analyzer.analyzeRoutes(appFiles);
                    screens.push(...appScreens);
                }
                catch (error) {
                    warnings.push(`Failed to analyze app ${appName}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        // Analyze GraphQL
        try {
            const gqlInfo = this.graphqlAnalyzer.analyzeGraphQL(files);
            graphql.push(...gqlInfo);
        }
        catch (error) {
            warnings.push(`GraphQL analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Analyze NestJS resolvers
        for (const [pkgName, pkgConfig] of Object.entries(this.config.packages)) {
            if (pkgConfig.type === 'nestjs') {
                try {
                    const pkgFiles = files.filter(f => f.path.startsWith(pkgConfig.path));
                    const pkgResolvers = this.nestjsAnalyzer.analyzeResolvers(pkgFiles);
                    resolvers.push(...pkgResolvers);
                }
                catch (error) {
                    warnings.push(`Failed to analyze package ${pkgName}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        // Analyze gRPC protos
        try {
            const protoFiles = files.filter(f => f.path.startsWith(this.config.protos.path));
            const grpcInfo = this.grpcAnalyzer.analyzeProtos(protoFiles);
            grpc.push(...grpcInfo);
        }
        catch (error) {
            warnings.push(`gRPC analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Build edges (dependencies)
        const edges = this.buildEdges(screens, graphql, resolvers, grpc, files, warnings);
        return {
            screens,
            graphql,
            resolvers,
            grpc,
            edges,
            warnings
        };
    }
    buildEdges(screens, graphql, resolvers, grpc, files, warnings) {
        const edges = [];
        // 1. Screen -> GraphQL edges
        for (const screen of screens) {
            try {
                const screenFile = files.find(f => f.path === screen.file);
                if (screenFile) {
                    const gqlDeps = this.graphqlAnalyzer.findGraphQLDependencies(screenFile);
                    for (const gqlId of gqlDeps) {
                        edges.push({
                            from: screen.id,
                            to: gqlId,
                            type: 'uses'
                        });
                    }
                }
            }
            catch (error) {
                warnings.push(`Failed to analyze screen dependencies for ${screen.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // 2. GraphQL -> Resolver edges
        for (const gql of graphql) {
            const matchingResolver = resolvers.find(r => `${r.type}.${r.graphqlName}` === `${gql.operationType}.${gql.fieldName}`);
            if (matchingResolver) {
                edges.push({
                    from: gql.id,
                    to: matchingResolver.id,
                    type: 'resolves'
                });
            }
            else {
                warnings.push(`No resolver found for GraphQL field: ${gql.id}`);
            }
        }
        // 3. Resolver -> gRPC edges
        for (const resolver of resolvers) {
            for (const dep of resolver.dependencies) {
                const matchingGrpc = grpc.find(g => g.id === dep);
                if (matchingGrpc) {
                    edges.push({
                        from: resolver.id,
                        to: dep,
                        type: 'calls'
                    });
                }
                else {
                    // Try fuzzy matching
                    const fuzzyMatch = this.findFuzzyGrpcMatch(dep, grpc);
                    if (fuzzyMatch) {
                        edges.push({
                            from: resolver.id,
                            to: fuzzyMatch.id,
                            type: 'calls'
                        });
                        warnings.push(`Fuzzy matched ${dep} to ${fuzzyMatch.id}`);
                    }
                    else {
                        warnings.push(`No gRPC service found for dependency: ${dep}`);
                    }
                }
            }
        }
        return edges;
    }
    findFuzzyGrpcMatch(dependency, grpcServices) {
        // Simple fuzzy matching logic
        const depLower = dependency.toLowerCase();
        for (const grpc of grpcServices) {
            const grpcLower = grpc.id.toLowerCase();
            if (grpcLower.includes(depLower.split(':')[1]?.split('.')[0] || '')) {
                return grpc;
            }
        }
        return null;
    }
    buildDependencyMap(result, warnings) {
        const nodes = [];
        const edges = [];
        // Create nodes
        result.screens.forEach(screen => {
            nodes.push({
                id: screen.id,
                type: 'screen',
                label: screen.route,
                group: 'screens',
                meta: {
                    file: screen.file,
                    namespace: screen.namespace,
                    type: screen.type
                }
            });
        });
        result.graphql.forEach(gql => {
            nodes.push({
                id: gql.id,
                type: 'gqlField',
                label: `${gql.operationType}.${gql.fieldName}`,
                group: 'graphql',
                meta: {
                    operationName: gql.operationName,
                    file: gql.file
                }
            });
        });
        result.resolvers.forEach(resolver => {
            nodes.push({
                id: resolver.id,
                type: 'resolver',
                label: `${resolver.className}.${resolver.methodName}`,
                group: 'bff',
                meta: {
                    file: resolver.file,
                    graphqlName: resolver.graphqlName,
                    type: resolver.type
                }
            });
        });
        result.grpc.forEach(grpc => {
            nodes.push({
                id: grpc.id,
                type: 'grpc',
                label: `${grpc.serviceName}.${grpc.methodName}`,
                group: 'grpc',
                meta: {
                    file: grpc.file,
                    package: grpc.packageName
                }
            });
        });
        // Create edges
        result.edges.forEach((edge, index) => {
            edges.push({
                id: `e${index + 1}`,
                from: edge.from,
                to: edge.to
            });
        });
        // Build index
        const index = this.buildIndex(nodes, edges);
        return {
            version: '1.0',
            nodes,
            edges,
            index,
            meta: {
                warnings: [...warnings, ...result.warnings],
                timestamp: new Date().toISOString(),
                config: this.config.output.anonymize ? undefined : this.config
            }
        };
    }
    buildIndex(nodes, edges) {
        const apiToScreens = {};
        const screenToApis = {};
        const routeGroups = {};
        // Build reverse mappings
        for (const edge of edges) {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                // Screen -> API mapping
                if (fromNode.type === 'screen' && (toNode.type === 'gqlField' || toNode.type === 'grpc')) {
                    if (!screenToApis[fromNode.id])
                        screenToApis[fromNode.id] = [];
                    screenToApis[fromNode.id].push(toNode.id);
                    if (!apiToScreens[toNode.id])
                        apiToScreens[toNode.id] = [];
                    apiToScreens[toNode.id].push(fromNode.id);
                }
            }
        }
        // Build route groups
        const screenNodes = nodes.filter(n => n.type === 'screen');
        const routeGroupMap = {};
        for (const screen of screenNodes) {
            const route = screen.label;
            const segments = route.split('/').filter(Boolean);
            if (segments.length > 0) {
                const firstSegment = segments[0];
                const groupKey = `screen:/${firstSegment}/*`;
                if (!routeGroupMap[groupKey])
                    routeGroupMap[groupKey] = [];
                routeGroupMap[groupKey].push(screen.id);
            }
        }
        Object.assign(routeGroups, routeGroupMap);
        return {
            apiToScreens,
            screenToApis,
            routeGroups
        };
    }
}
exports.AnalysisEngine = AnalysisEngine;
