import { join, dirname, relative, basename } from 'path';
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

export class NextJSAnalyzer {
  constructor(private options: NextJSAnalyzerOptions) {}

  analyzeRoutes(files: ParsedFile[]): ScreenInfo[] {
    const screens: ScreenInfo[] = [];
    
    // Analyze App Router routes
    const appRoutes = this.analyzeAppRouter(files);
    screens.push(...appRoutes);
    
    // Analyze Pages Router routes
    const pagesRoutes = this.analyzePagesRouter(files);
    screens.push(...pagesRoutes);
    
    return screens;
  }

  private analyzeAppRouter(files: ParsedFile[]): ScreenInfo[] {
    const screens: ScreenInfo[] = [];
    const appPath = this.options.appPath;
    
    // Find app directory files
    const appFiles = files.filter(file => 
      file.path.includes('/app/') && 
      (file.path.endsWith('/page.tsx') || file.path.endsWith('/page.ts') || 
       file.path.endsWith('/page.jsx') || file.path.endsWith('/page.js'))
    );

    for (const file of appFiles) {
      const route = this.extractAppRouterRoute(file.path, appPath);
      if (route) {
        const screenId = this.createScreenId(route);
        screens.push({
          id: screenId,
          route,
          file: file.path,
          namespace: this.options.namespace,
          type: 'app-router'
        });
      }
    }

    return screens;
  }

  private analyzePagesRouter(files: ParsedFile[]): ScreenInfo[] {
    const screens: ScreenInfo[] = [];
    
    // Find pages directory files
    const pageFiles = files.filter(file => 
      file.path.includes('/pages/') && 
      !file.path.includes('/_') && // Exclude special files like _app.tsx, _document.tsx
      !file.path.includes('/api/') && // Exclude API routes
      (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || 
       file.path.endsWith('.jsx') || file.path.endsWith('.js'))
    );

    for (const file of pageFiles) {
      const route = this.extractPagesRouterRoute(file.path);
      if (route) {
        const screenId = this.createScreenId(route);
        screens.push({
          id: screenId,
          route,
          file: file.path,
          namespace: this.options.namespace,
          type: 'pages-router'
        });
      }
    }

    return screens;
  }

  private extractAppRouterRoute(filePath: string, appPath: string): string | null {
    // Example: apps/web/app/(marketing)/about/page.tsx -> /about
    // Example: apps/web/app/products/[id]/page.tsx -> /products/[id]
    
    const appIndex = filePath.indexOf('/app/');
    if (appIndex === -1) return null;
    
    const routePart = filePath.substring(appIndex + 5); // Remove '/app/'
    const segments = routePart.split('/');
    
    // Remove 'page.tsx' from the end
    if (segments[segments.length - 1].startsWith('page.')) {
      segments.pop();
    }
    
    // Process segments
    const processedSegments: string[] = [];
    
    for (const segment of segments) {
      // Skip route groups (marketing), (dashboard), etc.
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue;
      }
      
      // Skip slot routes @slot, @modal, etc.
      if (segment.startsWith('@')) {
        continue;
      }
      
      // Handle dynamic routes [id], [slug], [...rest]
      if (segment.startsWith('[') && segment.endsWith(']')) {
        processedSegments.push(segment);
      } else if (segment) {
        processedSegments.push(segment);
      }
    }
    
    const route = '/' + processedSegments.join('/');
    return this.normalizeRoute(route);
  }

  private extractPagesRouterRoute(filePath: string): string | null {
    // Example: apps/web/pages/products/[id].tsx -> /products/[id]
    // Example: apps/web/pages/index.tsx -> /
    
    const pagesIndex = filePath.indexOf('/pages/');
    if (pagesIndex === -1) return null;
    
    const routePart = filePath.substring(pagesIndex + 7); // Remove '/pages/'
    
    // Remove file extension
    const withoutExt = routePart.replace(/\.(tsx?|jsx?)$/, '');
    
    // Handle index files
    if (withoutExt === 'index') {
      return '/';
    }
    
    // Handle nested index files
    if (withoutExt.endsWith('/index')) {
      return '/' + withoutExt.replace('/index', '');
    }
    
    const route = '/' + withoutExt;
    return this.normalizeRoute(route);
  }

  private normalizeRoute(route: string): string {
    // Remove basePath if configured
    if (this.options.basePath) {
      const basePath = this.options.basePath.startsWith('/') 
        ? this.options.basePath 
        : '/' + this.options.basePath;
      
      if (route.startsWith(basePath)) {
        route = route.substring(basePath.length) || '/';
      }
    }
    
    // Remove locale prefixes if i18n is configured
    if (this.options.i18n) {
      for (const locale of this.options.i18n.locales) {
        if (route.startsWith('/' + locale + '/') || route === '/' + locale) {
          route = route.substring(locale.length + 1) || '/';
          break;
        }
      }
    }
    
    // Ensure route starts with /
    if (!route.startsWith('/')) {
      route = '/' + route;
    }
    
    // Remove trailing slash except for root
    if (route !== '/' && route.endsWith('/')) {
      route = route.slice(0, -1);
    }
    
    return route;
  }

  private createScreenId(route: string): string {
    const namespace = this.options.namespace;
    return namespace ? `screen:${namespace}:${route}` : `screen:${route}`;
  }

  // Extract GraphQL usage from screen components
  analyzeScreenDependencies(file: ParsedFile): string[] {
    const dependencies: string[] = [];
    
    if (!file.ast) return dependencies;
    
    // This would be enhanced with actual AST traversal to find:
    // - useQuery, useMutation calls
    // - gql template literals
    // - imported GraphQL documents
    
    // For now, return empty array - will be implemented in GraphQL analyzer
    return dependencies;
  }
}