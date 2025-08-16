export interface Node {
    id: string;
    type: 'screen' | 'gqlField' | 'resolver' | 'grpc';
    label: string;
    group: string;
    meta: Record<string, any>;
}
export interface Edge {
    id: string;
    from: string;
    to: string;
}
export interface DependencyIndex {
    apiToScreens: Record<string, string[]>;
    screenToApis: Record<string, string[]>;
    routeGroups: Record<string, string[]>;
}
export interface DependencyMap {
    version: string;
    nodes: Node[];
    edges: Edge[];
    index: DependencyIndex;
    meta?: {
        warnings?: string[];
        timestamp?: string;
        config?: any;
    };
}
export interface ParsedFile {
    path: string;
    content: string;
    ast?: any;
    type: 'typescript' | 'javascript' | 'graphql' | 'proto';
}
export interface ScreenInfo {
    id: string;
    route: string;
    file: string;
    namespace?: string;
    type: 'app-router' | 'pages-router';
}
export interface GraphQLInfo {
    id: string;
    operationType: 'query' | 'mutation' | 'subscription';
    fieldName: string;
    operationName?: string;
    file: string;
    content: string;
}
export interface ResolverInfo {
    id: string;
    className: string;
    methodName: string;
    type: 'query' | 'mutation' | 'field';
    graphqlName: string;
    file: string;
    dependencies: string[];
}
export interface GrpcInfo {
    id: string;
    serviceName: string;
    methodName: string;
    packageName: string;
    file: string;
}
export interface AnalysisResult {
    screens: ScreenInfo[];
    graphql: GraphQLInfo[];
    resolvers: ResolverInfo[];
    grpc: GrpcInfo[];
    edges: {
        from: string;
        to: string;
        type: string;
    }[];
    warnings: string[];
}
