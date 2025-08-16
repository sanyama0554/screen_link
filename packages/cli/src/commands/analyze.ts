import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AnalysisEngine } from '@screen-link/analyzer';
import { loadConfig, validateConfig } from '../config/index.js';

interface AnalyzeOptions {
  config: string;
  output: string;
  verbose?: boolean;
}

export async function analyzeCommand(options: AnalyzeOptions) {
  const spinner = ora('Starting dependency analysis...').start();
  
  try {
    // Load configuration
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);
    
    // Validate configuration
    const errors = validateConfig(config);
    if (errors.length > 0) {
      spinner.fail('Configuration validation failed');
      console.error(chalk.red('Configuration errors:'));
      errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
      process.exit(1);
    }

    if (options.verbose) {
      console.log(chalk.gray(`Using config: ${JSON.stringify(config, null, 2)}`));
    }

    // Initialize analysis engine
    const engine = new AnalysisEngine(config);
    
    spinner.text = 'Scanning files...';
    const result = await engine.analyze();
    
    spinner.text = 'Writing output...';
    writeFileSync(options.output, JSON.stringify(result, null, 2));
    
    spinner.succeed(`Analysis complete! Output written to ${options.output}`);
    
    // Show summary
    console.log(chalk.green('\nSummary:'));
    console.log(`  Nodes: ${result.nodes.length}`);
    console.log(`  Edges: ${result.edges.length}`);
    console.log(`  Screens: ${result.nodes.filter(n => n.type === 'screen').length}`);
    console.log(`  GraphQL Fields: ${result.nodes.filter(n => n.type === 'gqlField').length}`);
    console.log(`  Resolvers: ${result.nodes.filter(n => n.type === 'resolver').length}`);
    console.log(`  gRPC Services: ${result.nodes.filter(n => n.type === 'grpc').length}`);
    
    if (result.meta?.warnings && result.meta.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${result.meta.warnings.length}`));
      if (options.verbose) {
        result.meta.warnings.forEach((warning: string) => {
          console.log(chalk.yellow(`  - ${warning}`));
        });
      }
    }
    
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}