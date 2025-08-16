import { DependencyMap } from './types';
export interface AnalysisEngineConfig {
    rootDir: string;
    apps: Record<string, {
        type: string;
        path: string;
        namespace?: string;
    }>;
    packages: Record<string, {
        type: string;
        path: string;
    }>;
    protos: {
        path: string;
    };
    analysis: {
        includePatterns: string[];
        excludePatterns: string[];
        graphql: {
            tagNames: string[];
            includeDocumentNodes: boolean;
        };
        nestjs: {
            decorators: {
                resolver: string[];
                query: string[];
                mutation: string[];
                resolveField: string[];
            };
        };
        grpc: {
            clientModulePattern: string;
        };
    };
    output: {
        anonymize: boolean;
        includeWarnings: boolean;
        defaultLayers: string[];
    };
}
export declare class AnalysisEngine {
    private config;
    private fileScanner;
    private astParser;
    private nextjsAnalyzer;
    private graphqlAnalyzer;
    private nestjsAnalyzer;
    private grpcAnalyzer;
    constructor(config: AnalysisEngineConfig);
    analyze(): Promise<DependencyMap>;
    private analyzeAll;
    private buildEdges;
    private findFuzzyGrpcMatch;
    private buildDependencyMap;
    private buildIndex;
}
