export class ScreenLinkError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ScreenLinkError';
  }
}

export class ConfigError extends ScreenLinkError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class AnalysisError extends ScreenLinkError {
  constructor(message: string, public readonly file?: string, details?: any) {
    super(message, 'ANALYSIS_ERROR', details);
    this.name = 'AnalysisError';
  }
}

export class FileSystemError extends ScreenLinkError {
  constructor(message: string, public readonly path?: string, details?: any) {
    super(message, 'FILESYSTEM_ERROR', details);
    this.name = 'FileSystemError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof ScreenLinkError) {
    let message = `${error.name}: ${error.message}`;
    
    if (error instanceof AnalysisError && error.file) {
      message += `\n  File: ${error.file}`;
    }
    
    if (error instanceof FileSystemError && error.path) {
      message += `\n  Path: ${error.path}`;
    }
    
    if (error.code) {
      message += `\n  Code: ${error.code}`;
    }
    
    if (error.details) {
      message += `\n  Details: ${JSON.stringify(error.details, null, 2)}`;
    }
    
    return message;
  }
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  
  return `Unknown error: ${String(error)}`;
}

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AnalysisError) {
    // Most analysis errors are recoverable (just warnings)
    return true;
  }
  
  if (error instanceof FileSystemError) {
    // File not found errors are usually recoverable
    return error.message.includes('ENOENT') || error.message.includes('not found');
  }
  
  return false;
}

export function createErrorContext(file?: string, line?: number, column?: number) {
  return {
    file,
    line,
    column,
    timestamp: new Date().toISOString()
  };
}