import { ParsedFile, GrpcInfo } from '../types';
export declare class GrpcAnalyzer {
    analyzeProtos(files: ParsedFile[]): GrpcInfo[];
    private analyzeProtoFile;
    private extractPackageName;
    private extractServices;
    private extractRpcs;
    private cleanTypeName;
    private removeComments;
    parseProtoSimple(content: string): {
        package?: string;
        services: Array<{
            name: string;
            methods: Array<{
                name: string;
                inputType: string;
                outputType: string;
                options?: Record<string, any>;
            }>;
        }>;
        messages: Array<{
            name: string;
            fields: Array<{
                name: string;
                type: string;
                number: number;
                repeated?: boolean;
                optional?: boolean;
            }>;
        }>;
    };
}
