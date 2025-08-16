import { ParsedFile, ScreenInfo } from '../types';
export interface NextJSAnalyzerOptions {
    appPath: string;
    namespace?: string;
    basePath?: string;
    i18n?: {
        locales: string[];
        defaultLocale: string;
    };
}
export declare class NextJSAnalyzer {
    private options;
    constructor(options: NextJSAnalyzerOptions);
    analyzeRoutes(files: ParsedFile[]): ScreenInfo[];
    private analyzeAppRouter;
    private analyzePagesRouter;
    private extractAppRouterRoute;
    private extractPagesRouterRoute;
    private normalizeRoute;
    private createScreenId;
    analyzeScreenDependencies(file: ParsedFile): string[];
}
