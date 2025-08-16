import { ParsedFile, GraphQLInfo } from '../types';
export interface GraphQLAnalyzerOptions {
    tagNames: string[];
    includeDocumentNodes: boolean;
}
export declare class GraphQLAnalyzer {
    private options;
    constructor(options: GraphQLAnalyzerOptions);
    analyzeGraphQL(files: ParsedFile[]): GraphQLInfo[];
    private analyzeGraphQLFile;
    private analyzeGraphQLInCode;
    private reconstructTemplateString;
    private parseGraphQLString;
    private analyzeHookUsage;
    private extractOperationInfo;
    findGraphQLDependencies(file: ParsedFile): string[];
    private guessOperationType;
}
