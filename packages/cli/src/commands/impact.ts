import chalk from 'chalk';
import { readFileSync } from 'fs';
import { DependencyMap } from '@screen-link/analyzer';

interface ImpactOptions {
  filter?: string;
  input: string;
}

export async function impactCommand(api: string, options: ImpactOptions) {
  try {
    // Load map.json
    const mapContent = readFileSync(options.input, 'utf-8');
    const map: DependencyMap = JSON.parse(mapContent);
    
    console.log(chalk.blue('Impact Analysis'));
    console.log('===============');
    console.log(chalk.gray(`API: ${api}`));
    if (options.filter) {
      console.log(chalk.gray(`Additional filter: ${options.filter}`));
    }
    console.log();
    
    // Find impacted screens
    const impactedScreens = map.index.apiToScreens[api] || [];
    
    if (impactedScreens.length === 0) {
      console.log(chalk.yellow('No screens found that depend on this API'));
      return;
    }
    
    // Apply additional screen filter if provided
    let filteredScreens = impactedScreens;
    if (options.filter) {
      const filterRegex = createFilterRegex(options.filter);
      filteredScreens = impactedScreens.filter(screenId => {
        const screen = map.nodes.find(n => n.id === screenId);
        return screen && filterRegex.test(screen.label);
      });
    }
    
    console.log(chalk.green(`Impacted Screens (${filteredScreens.length}):`));
    filteredScreens.forEach(screenId => {
      const screen = map.nodes.find(n => n.id === screenId);
      if (screen) {
        console.log(`  ${chalk.cyan(screen.label)} (${screen.id})`);
        if (screen.meta?.file) {
          console.log(chalk.gray(`    File: ${screen.meta.file}`));
        }
      }
    });
    
    if (filteredScreens.length !== impactedScreens.length) {
      console.log();
      console.log(chalk.gray(`Note: ${impactedScreens.length - filteredScreens.length} additional screens filtered out`));
    }
    
    // Show dependency path for first few screens
    if (filteredScreens.length > 0) {
      console.log();
      console.log(chalk.blue('Dependency Paths:'));
      for (const screenId of filteredScreens.slice(0, 3)) {
        showDependencyPath(map, screenId, api);
      }
      
      if (filteredScreens.length > 3) {
        console.log(chalk.gray(`... and ${filteredScreens.length - 3} more screens`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function createFilterRegex(filter: string): RegExp {
  let pattern = filter
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/');
  
  return new RegExp(`^${pattern}$`);
}

function showDependencyPath(map: DependencyMap, screenId: string, targetApi: string) {
  const screen = map.nodes.find(n => n.id === screenId);
  if (!screen) return;
  
  console.log(chalk.cyan(`  ${screen.label}:`));
  
  // Simple path finding (could be enhanced with proper graph traversal)
  const path = [screenId];
  let currentId = screenId;
  
  while (currentId !== targetApi) {
    const edge = map.edges.find(e => e.from === currentId);
    if (!edge) break;
    
    path.push(edge.to);
    currentId = edge.to;
    
    if (path.length > 10) break; // Prevent infinite loops
  }
  
  path.forEach((nodeId, index) => {
    const node = map.nodes.find(n => n.id === nodeId);
    if (node) {
      const indent = '    ' + '  '.repeat(index);
      const arrow = index > 0 ? '→ ' : '';
      console.log(`${indent}${arrow}${node.label}`);
    }
  });
}