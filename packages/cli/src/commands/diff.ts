import chalk from 'chalk';
import { readFileSync } from 'fs';
import { DependencyMap } from '@screen-link/analyzer';

interface DiffOptions {
  filter?: string;
}

export async function diffCommand(oldFile: string, newFile: string, options: DiffOptions) {
  try {
    // Load both map files
    const oldMapContent = readFileSync(oldFile, 'utf-8');
    const newMapContent = readFileSync(newFile, 'utf-8');
    
    const oldMap: DependencyMap = JSON.parse(oldMapContent);
    const newMap: DependencyMap = JSON.parse(newMapContent);
    
    console.log(chalk.blue('Dependency Diff'));
    console.log('===============');
    console.log(chalk.gray(`Old: ${oldFile}`));
    console.log(chalk.gray(`New: ${newFile}`));
    if (options.filter) {
      console.log(chalk.gray(`Filter: ${options.filter}`));
    }
    console.log();
    
    // Calculate differences
    const oldNodeIds = new Set(oldMap.nodes.map(n => n.id));
    const newNodeIds = new Set(newMap.nodes.map(n => n.id));
    const oldEdgeIds = new Set(oldMap.edges.map(e => e.id));
    const newEdgeIds = new Set(newMap.edges.map(e => e.id));
    
    // Find added, removed, and unchanged
    const addedNodes = newMap.nodes.filter(n => !oldNodeIds.has(n.id));
    const removedNodes = oldMap.nodes.filter(n => !newNodeIds.has(n.id));
    const addedEdges = newMap.edges.filter(e => !oldEdgeIds.has(e.id));
    const removedEdges = oldMap.edges.filter(e => !newEdgeIds.has(e.id));
    
    // Apply filter if provided
    let filteredAddedNodes = addedNodes;
    let filteredRemovedNodes = removedNodes;
    
    if (options.filter) {
      const filterRegex = createFilterRegex(options.filter);
      filteredAddedNodes = addedNodes.filter(node => {
        if (node.type === 'screen') {
          return filterRegex.test(node.label);
        }
        return true;
      });
      filteredRemovedNodes = removedNodes.filter(node => {
        if (node.type === 'screen') {
          return filterRegex.test(node.label);
        }
        return true;
      });
    }
    
    // Display results
    console.log(chalk.green(`Added Nodes (${filteredAddedNodes.length}):`));
    filteredAddedNodes.forEach(node => {
      console.log(chalk.green(`  + ${node.id} - ${node.label}`));
    });
    
    console.log();
    console.log(chalk.red(`Removed Nodes (${filteredRemovedNodes.length}):`));
    filteredRemovedNodes.forEach(node => {
      console.log(chalk.red(`  - ${node.id} - ${node.label}`));
    });
    
    console.log();
    console.log(chalk.green(`Added Edges (${addedEdges.length}):`));
    addedEdges.forEach(edge => {
      console.log(chalk.green(`  + ${edge.from} → ${edge.to}`));
    });
    
    console.log();
    console.log(chalk.red(`Removed Edges (${removedEdges.length}):`));
    removedEdges.forEach(edge => {
      console.log(chalk.red(`  - ${edge.from} → ${edge.to}`));
    });
    
    // Summary
    console.log();
    console.log(chalk.blue('Summary:'));
    console.log(`  Total changes: ${addedNodes.length + removedNodes.length + addedEdges.length + removedEdges.length}`);
    console.log(`  Node changes: +${addedNodes.length} -${removedNodes.length}`);
    console.log(`  Edge changes: +${addedEdges.length} -${removedEdges.length}`);
    
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