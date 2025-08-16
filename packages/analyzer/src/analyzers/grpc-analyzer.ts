import { ParsedFile, GrpcInfo } from '../types';

export class GrpcAnalyzer {
  analyzeProtos(files: ParsedFile[]): GrpcInfo[] {
    const grpcInfo: GrpcInfo[] = [];
    
    const protoFiles = files.filter(f => f.type === 'proto');
    
    for (const file of protoFiles) {
      const info = this.analyzeProtoFile(file);
      grpcInfo.push(...info);
    }
    
    return grpcInfo;
  }

  private analyzeProtoFile(file: ParsedFile): GrpcInfo[] {
    const results: GrpcInfo[] = [];
    const content = file.content;
    
    try {
      // Parse proto file content
      const packageName = this.extractPackageName(content);
      const services = this.extractServices(content);
      
      for (const service of services) {
        for (const rpc of service.rpcs) {
          const id = `grpc:${service.name}.${rpc.name}`;
          
          results.push({
            id,
            serviceName: service.name,
            methodName: rpc.name,
            packageName: packageName || '',
            file: file.path
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to parse proto file ${file.path}:`, error);
    }
    
    return results;
  }

  private extractPackageName(content: string): string | null {
    // Extract package declaration
    const packageMatch = content.match(/^\\s*package\\s+([\\w\\.]+)\\s*;/m);
    return packageMatch ? packageMatch[1] : null;
  }

  private extractServices(content: string): Array<{ name: string; rpcs: Array<{ name: string; input: string; output: string }> }> {
    const services: Array<{ name: string; rpcs: Array<{ name: string; input: string; output: string }> }> = [];
    
    // Remove comments
    const cleanContent = this.removeComments(content);
    
    // Extract service blocks
    const serviceRegex = /service\\s+(\\w+)\\s*\\{([^}]*)\\}/g;
    let serviceMatch;
    
    while ((serviceMatch = serviceRegex.exec(cleanContent)) !== null) {
      const serviceName = serviceMatch[1];
      const serviceBody = serviceMatch[2];
      
      const rpcs = this.extractRpcs(serviceBody);
      
      services.push({
        name: serviceName,
        rpcs
      });
    }
    
    return services;
  }

  private extractRpcs(serviceBody: string): Array<{ name: string; input: string; output: string }> {
    const rpcs: Array<{ name: string; input: string; output: string }> = [];
    
    // Extract RPC declarations
    const rpcRegex = /rpc\\s+(\\w+)\\s*\\(\\s*([^)]+)\\s*\\)\\s*returns\\s*\\(\\s*([^)]+)\\s*\\)/g;
    let rpcMatch;
    
    while ((rpcMatch = rpcRegex.exec(serviceBody)) !== null) {
      const rpcName = rpcMatch[1];
      const input = rpcMatch[2].trim();
      const output = rpcMatch[3].trim();
      
      rpcs.push({
        name: rpcName,
        input: this.cleanTypeName(input),
        output: this.cleanTypeName(output)
      });
    }
    
    return rpcs;
  }

  private cleanTypeName(typeName: string): string {
    // Remove stream keywords and clean up type names
    return typeName
      .replace(/^stream\\s+/i, '')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  private removeComments(content: string): string {
    // Remove single-line comments
    let result = content.replace(/\\/\\/.*$/gm, '');
    
    // Remove multi-line comments
    result = result.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
    
    return result;
  }

  // Simple proto parser implementation
  // Note: For production use, consider using protobufjs or similar library
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
  } {
    const result = {
      services: [] as any[],
      messages: [] as any[]
    };

    const lines = content.split('\\n');
    let currentContext: 'root' | 'service' | 'message' = 'root';
    let currentService: any = null;
    let currentMessage: any = null;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      // Package declaration
      if (line.startsWith('package ')) {
        const match = line.match(/package\\s+([\\w\\.]+);/);
        if (match) {
          (result as any).package = match[1];
        }
        continue;
      }

      // Service declaration
      if (line.startsWith('service ')) {
        const match = line.match(/service\\s+(\\w+)\\s*\\{?/);
        if (match) {
          currentService = {
            name: match[1],
            methods: []
          };
          currentContext = 'service';
          if (line.includes('{')) braceLevel++;
        }
        continue;
      }

      // Message declaration
      if (line.startsWith('message ')) {
        const match = line.match(/message\\s+(\\w+)\\s*\\{?/);
        if (match) {
          currentMessage = {
            name: match[1],
            fields: []
          };
          currentContext = 'message';
          if (line.includes('{')) braceLevel++;
        }
        continue;
      }

      // RPC declaration
      if (currentContext === 'service' && line.startsWith('rpc ')) {
        const match = line.match(/rpc\\s+(\\w+)\\s*\\(([^)]+)\\)\\s*returns\\s*\\(([^)]+)\\)/);
        if (match && currentService) {
          currentService.methods.push({
            name: match[1],
            inputType: match[2].trim(),
            outputType: match[3].trim()
          });
        }
        continue;
      }

      // Field declaration in message
      if (currentContext === 'message' && currentMessage) {
        // Simple field parsing: type name = number;
        const fieldMatch = line.match(/(repeated\\s+)?(optional\\s+)?(\\w+)\\s+(\\w+)\\s*=\\s*(\\d+);/);
        if (fieldMatch) {
          currentMessage.fields.push({
            repeated: !!fieldMatch[1],
            optional: !!fieldMatch[2],
            type: fieldMatch[3],
            name: fieldMatch[4],
            number: parseInt(fieldMatch[5], 10)
          });
        }
        continue;
      }

      // Handle braces
      if (line.includes('{')) {
        braceLevel++;
      }
      if (line.includes('}')) {
        braceLevel--;
        
        if (braceLevel === 0) {
          if (currentContext === 'service' && currentService) {
            result.services.push(currentService);
            currentService = null;
          } else if (currentContext === 'message' && currentMessage) {
            result.messages.push(currentMessage);
            currentMessage = null;
          }
          currentContext = 'root';
        }
      }
    }

    return result;
  }
}