import { ParsedFile, ResolverInfo } from '../types';
export interface NestJSAnalyzerOptions {
    decorators: {
        resolver: string[];
        query: string[];
        mutation: string[];
        resolveField: string[];
    };
}
export declare class NestJSAnalyzer {
    private options;
    constructor(options: NestJSAnalyzerOptions);
    analyzeResolvers(files: ParsedFile[]): ResolverInfo[];
    private analyzeResolverFile;
    private hasDecorator;
    private findDecorator;
    private extractDecoratorArgument;
    private analyzeDependencies;
    private inferGrpcCall;
    private toPascalCase;
    analyzeGrpcClients(files: ParsedFile[]): Record<string, {
        service: string;
        package: string;
    }>;
    private inferServiceName;
}
