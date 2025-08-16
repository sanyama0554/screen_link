export interface AppConfig {
  type: 'nextjs' | 'nestjs';
  path: string;
  namespace?: string;
}

export interface AnalysisConfig {
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
}

export interface OutputConfig {
  anonymize: boolean;
  includeWarnings: boolean;
  defaultLayers: string[];
}

export interface ScreenLinkConfig {
  rootDir: string;
  apps: Record<string, AppConfig>;
  packages: Record<string, AppConfig>;
  protos: {
    path: string;
  };
  analysis: AnalysisConfig;
  output: OutputConfig;
}

export const defaultConfig: ScreenLinkConfig = {
  rootDir: '.',
  apps: {},
  packages: {},
  protos: {
    path: 'packages/protos'
  },
  analysis: {
    includePatterns: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.graphql',
      '**/*.proto'
    ],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**'
    ],
    graphql: {
      tagNames: ['gql', 'graphql'],
      includeDocumentNodes: true
    },
    nestjs: {
      decorators: {
        resolver: ['Resolver'],
        query: ['Query'],
        mutation: ['Mutation'],
        resolveField: ['ResolveField']
      }
    },
    grpc: {
      clientModulePattern: 'ClientsModule.register'
    }
  },
  output: {
    anonymize: false,
    includeWarnings: true,
    defaultLayers: ['screen', 'graphql', 'resolver', 'grpc']
  }
};