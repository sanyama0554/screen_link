#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from './commands/analyze.js';
import { viewCommand } from './commands/view.js';
import { impactCommand } from './commands/impact.js';
import { diffCommand } from './commands/diff.js';

const program = new Command();

program
  .name('screen-link')
  .description('Dependency visualization tool for monorepo')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze dependencies and generate map.json')
  .option('-c, --config <path>', 'path to config file', 'screen-link.config.json')
  .option('-o, --output <path>', 'output file path', 'map.json')
  .option('--verbose', 'verbose logging')
  .action(analyzeCommand);

program
  .command('view')
  .description('View dependencies with filters')
  .option('-f, --filter <pattern>', 'screen filter pattern')
  .option('-l, --layers <layers>', 'comma-separated layers to show', 'screen,graphql,resolver,grpc')
  .option('-h, --hops <number>', 'hop limit from selected nodes', '2')
  .option('-i, --input <path>', 'input map.json file', 'map.json')
  .action(viewCommand);

program
  .command('impact')
  .description('Show impact analysis for API changes')
  .argument('<api>', 'API identifier (e.g., "gql:mutation.createOrder")')
  .option('-f, --filter <pattern>', 'additional screen filter')
  .option('-i, --input <path>', 'input map.json file', 'map.json')
  .action(impactCommand);

program
  .command('diff')
  .description('Compare two map.json files')
  .argument('<old>', 'old map.json file')
  .argument('<new>', 'new map.json file')
  .option('-f, --filter <pattern>', 'screen filter pattern')
  .action(diffCommand);

program.parse();

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});