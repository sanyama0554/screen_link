import chalk from 'chalk';
import { readFileSync } from 'fs';
import { DependencyMap } from '@screen-link/analyzer';

interface ViewOptions {
  filter?: string;
  layers: string;
  hops: string;
  input: string;
}

export async function viewCommand(options: ViewOptions) {
  try {
    // Load map.json
    const mapContent = readFileSync(options.input, 'utf-8');
    const map: DependencyMap = JSON.parse(mapContent);
    
    // Parse options
    const layers = options.layers.split(',').map(l => l.trim());
    const hopsLimit = parseInt(options.hops, 10);
    
    console.log(chalk.blue('Dependency View'));
    console.log('================');
    
    if (options.filter) {
      console.log(chalk.gray(`Filter: ${options.filter}`));
    }
    console.log(chalk.gray(`Layers: ${layers.join(', ')}`));
    console.log(chalk.gray(`Hops limit: ${hopsLimit}`));
    console.log();
    
    // Apply filtering logic
    let filteredNodes = map.nodes;
    let filteredEdges = map.edges;
    
    if (options.filter) {
      const filterRegex = createFilterRegex(options.filter);
      filteredNodes = map.nodes.filter(node => {
        if (node.type === 'screen') {
          return filterRegex.test(node.label);
        }
        return true;
      });
      
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = map.edges.filter(edge => 
        nodeIds.has(edge.from) || nodeIds.has(edge.to)
      );
    }
    
    // Apply layer filtering
    filteredNodes = filteredNodes.filter(node => layers.includes(node.type === 'gqlField' ? 'graphql' : node.type));
    
    // Display results
    console.log(chalk.green('Filtered Results:'));
    console.log(`  Nodes: ${filteredNodes.length}`);
    console.log(`  Edges: ${filteredEdges.length}`);
    console.log();
    
    // Group by type
    const groupedNodes = filteredNodes.reduce((acc, node) => {
      const type = node.type === 'gqlField' ? 'graphql' : node.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(node);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(groupedNodes).forEach(([type, nodes]) => {
      console.log(chalk.cyan(`${type.toUpperCase()}:`));
      nodes.forEach(node => {
        console.log(`  ${node.id} - ${node.label}`);
      });
      console.log();
    });
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function createFilterRegex(filter: string): RegExp {
  // Convert wildcard pattern to regex
  let pattern = filter
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/');
  
  return new RegExp(`^${pattern}$`);
}