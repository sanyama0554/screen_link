import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ScreenLinkConfig, defaultConfig } from './types';

export function loadConfig(configPath?: string): ScreenLinkConfig {
  // Try to find config file
  const possiblePaths = [
    configPath,
    'screen-link.config.json',
    'screen-link.config.js',
    '.screen-link.json'
  ].filter(Boolean) as string[];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return loadConfigFromFile(path);
    }
  }

  // Return default config if no file found
  return defaultConfig;
}

function loadConfigFromFile(configPath: string): ScreenLinkConfig {
  try {
    if (configPath.endsWith('.json')) {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return mergeWithDefaults(config);
    } else if (configPath.endsWith('.js')) {
      // Support for JS config files (require)
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      return mergeWithDefaults(config.default || config);
    }
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : error}`);
  }

  throw new Error(`Unsupported config file format: ${configPath}`);
}

function mergeWithDefaults(userConfig: Partial<ScreenLinkConfig>): ScreenLinkConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    analysis: {
      ...defaultConfig.analysis,
      ...userConfig.analysis,
      graphql: {
        ...defaultConfig.analysis.graphql,
        ...userConfig.analysis?.graphql
      },
      nestjs: {
        ...defaultConfig.analysis.nestjs,
        ...userConfig.analysis?.nestjs,
        decorators: {
          ...defaultConfig.analysis.nestjs.decorators,
          ...userConfig.analysis?.nestjs?.decorators
        }
      },
      grpc: {
        ...defaultConfig.analysis.grpc,
        ...userConfig.analysis?.grpc
      }
    },
    output: {
      ...defaultConfig.output,
      ...userConfig.output
    }
  };
}

export function validateConfig(config: ScreenLinkConfig): string[] {
  const errors: string[] = [];

  if (!config.rootDir) {
    errors.push('rootDir is required');
  }

  if (!config.protos?.path) {
    errors.push('protos.path is required');
  }

  // Validate app configs
  Object.entries(config.apps).forEach(([name, app]) => {
    if (!app.path) {
      errors.push(`apps.${name}.path is required`);
    }
    if (!['nextjs', 'nestjs'].includes(app.type)) {
      errors.push(`apps.${name}.type must be 'nextjs' or 'nestjs'`);
    }
  });

  // Validate package configs
  Object.entries(config.packages).forEach(([name, pkg]) => {
    if (!pkg.path) {
      errors.push(`packages.${name}.path is required`);
    }
    if (!['nextjs', 'nestjs'].includes(pkg.type)) {
      errors.push(`packages.${name}.type must be 'nextjs' or 'nestjs'`);
    }
  });

  return errors;
}