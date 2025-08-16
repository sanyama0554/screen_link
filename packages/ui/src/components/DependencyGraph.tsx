import React, { useMemo, useCallback, useState } from 'react';
import { Canvas, Node as ReaflowNode, Edge as ReaflowEdge, CanvasPosition, CanvasDirection } from 'reaflow';
import { DependencyMap, ViewConfig, Theme } from '../types';
import { NodeComponent } from './NodeComponent';
import { EdgeComponent } from './EdgeComponent';

interface DependencyGraphProps {
  data: DependencyMap;
  config: ViewConfig;
  theme: Theme;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onSelectionChange?: (selectedNodes: string[]) => void;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  data,
  config,
  theme,
  onNodeClick,
  onNodeHover,
  onSelectionChange
}) => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>(config.selectedNodes);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter and transform data based on config
  const { nodes, edges } = useMemo(() => {
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;

    // Apply layer filtering
    if (config.layers.length > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const layerName = node.type === 'gqlField' ? 'graphql' : node.type;
        return config.layers.includes(layerName);
      });

      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(edge => 
        nodeIds.has(edge.from) && nodeIds.has(edge.to)
      );
    }

    // Apply screen filter
    if (config.filter) {
      const filterRegex = createFilterRegex(config.filter);
      const matchingScreens = filteredNodes.filter(node => 
        node.type === 'screen' && filterRegex.test(node.label)
      );

      if (matchingScreens.length > 0) {
        const connectedNodeIds = getConnectedNodes(
          matchingScreens.map(n => n.id),
          filteredEdges,
          config.hopsLimit
        );

        filteredNodes = filteredNodes.filter(node => 
          connectedNodeIds.has(node.id)
        );

        const finalNodeIds = new Set(filteredNodes.map(n => n.id));
        filteredEdges = filteredEdges.filter(edge => 
          finalNodeIds.has(edge.from) && finalNodeIds.has(edge.to)
        );
      }
    }

    // Transform to Reaflow format
    const reaflowNodes: ReaflowNode[] = filteredNodes.map(node => ({
      id: node.id,
      text: node.label,
      data: {
        originalNode: node,
        isSelected: selectedNodes.includes(node.id),
        isHovered: hoveredNode === node.id,
        isHighlighted: isNodeHighlighted(node.id, selectedNodes, filteredEdges),
        isDimmed: selectedNodes.length > 0 && !isNodeHighlighted(node.id, selectedNodes, filteredEdges)
      }
    }));

    const reaflowEdges: ReaflowEdge[] = filteredEdges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      data: {
        originalEdge: edge,
        isHighlighted: isEdgeHighlighted(edge, selectedNodes),
        isDimmed: selectedNodes.length > 0 && !isEdgeHighlighted(edge, selectedNodes)
      }
    }));

    return { nodes: reaflowNodes, edges: reaflowEdges };
  }, [data, config, selectedNodes, hoveredNode]);

  const handleNodeClick = useCallback((event: any, node: ReaflowNode) => {
    const nodeId = node.id;
    let newSelection: string[];

    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      if (selectedNodes.includes(nodeId)) {
        newSelection = selectedNodes.filter(id => id !== nodeId);
      } else {
        newSelection = [...selectedNodes, nodeId];
      }
    } else {
      // Single select mode
      newSelection = selectedNodes.includes(nodeId) ? [] : [nodeId];
    }

    setSelectedNodes(newSelection);
    onSelectionChange?.(newSelection);
    onNodeClick?.(nodeId);
  }, [selectedNodes, onNodeClick, onSelectionChange]);

  const handleNodeEnter = useCallback((event: any, node: ReaflowNode) => {
    setHoveredNode(node.id);
    onNodeHover?.(node.id);
  }, [onNodeHover]);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  const renderNode = useCallback((node: ReaflowNode) => (
    <NodeComponent
      key={node.id}
      node={node}
      theme={theme}
      onEnter={handleNodeEnter}
      onLeave={handleNodeLeave}
    />
  ), [theme, handleNodeEnter, handleNodeLeave]);

  const renderEdge = useCallback((edge: ReaflowEdge) => (
    <EdgeComponent
      key={edge.id}
      edge={edge}
      theme={theme}
    />
  ), [theme]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: theme.background,
      position: 'relative'
    }}>
      <Canvas
        nodes={nodes}
        edges={edges}
        direction={CanvasDirection.RIGHT}
        node={renderNode}
        edge={renderEdge}
        onNodeClick={handleNodeClick}
        fit={true}
        center={true}
        maxZoom={3}
        minZoom={0.1}
        animated={true}
        readonly={false}
        pannable={true}
        zoomable={true}
      />
      
      {/* Node count indicator */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: theme.text.primary,
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {nodes.length} nodes, {edges.length} edges
      </div>

      {/* Selection indicator */}
      {selectedNodes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 12px',
          background: 'rgba(251, 191, 36, 0.9)',
          color: '#000',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {selectedNodes.length} selected
        </div>
      )}
    </div>
  );
};

function createFilterRegex(filter: string): RegExp {
  // Convert wildcard pattern to regex
  let pattern = filter
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/');
  
  return new RegExp(`^${pattern}$`);
}

function getConnectedNodes(
  startNodes: string[],
  edges: { from: string; to: string }[],
  hopsLimit: number
): Set<string> {
  const connected = new Set(startNodes);
  const edgeMap = new Map<string, string[]>();
  const reverseEdgeMap = new Map<string, string[]>();

  // Build adjacency maps
  edges.forEach(edge => {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
    if (!reverseEdgeMap.has(edge.to)) reverseEdgeMap.set(edge.to, []);
    
    edgeMap.get(edge.from)!.push(edge.to);
    reverseEdgeMap.get(edge.to)!.push(edge.from);
  });

  // BFS to find connected nodes within hop limit
  const queue: Array<{ nodeId: string; hops: number }> = 
    startNodes.map(id => ({ nodeId: id, hops: 0 }));

  while (queue.length > 0) {
    const { nodeId, hops } = queue.shift()!;

    if (hops >= hopsLimit) continue;

    // Add outgoing connections
    const outgoing = edgeMap.get(nodeId) || [];
    outgoing.forEach(targetId => {
      if (!connected.has(targetId)) {
        connected.add(targetId);
        queue.push({ nodeId: targetId, hops: hops + 1 });
      }
    });

    // Add incoming connections  
    const incoming = reverseEdgeMap.get(nodeId) || [];
    incoming.forEach(sourceId => {
      if (!connected.has(sourceId)) {
        connected.add(sourceId);
        queue.push({ nodeId: sourceId, hops: hops + 1 });
      }
    });
  }

  return connected;
}

function isNodeHighlighted(
  nodeId: string,
  selectedNodes: string[],
  edges: { from: string; to: string }[]
): boolean {
  if (selectedNodes.length === 0) return false;
  
  if (selectedNodes.includes(nodeId)) return true;

  // Check if node is connected to any selected node
  return edges.some(edge => 
    (selectedNodes.includes(edge.from) && edge.to === nodeId) ||
    (selectedNodes.includes(edge.to) && edge.from === nodeId)
  );
}

function isEdgeHighlighted(
  edge: { from: string; to: string },
  selectedNodes: string[]
): boolean {
  if (selectedNodes.length === 0) return false;
  
  return selectedNodes.includes(edge.from) || selectedNodes.includes(edge.to);
}