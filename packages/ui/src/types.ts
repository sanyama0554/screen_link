export interface Node {
  id: string;
  type: 'screen' | 'gqlField' | 'resolver' | 'grpc';
  label: string;
  group: string;
  meta: Record<string, any>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
}

export interface DependencyIndex {
  apiToScreens: Record<string, string[]>;
  screenToApis: Record<string, string[]>;
  routeGroups: Record<string, string[]>;
}

export interface DependencyMap {
  version: string;
  nodes: Node[];
  edges: Edge[];
  index: DependencyIndex;
  meta?: {
    warnings?: string[];
    timestamp?: string;
    config?: any;
  };
}

export interface ViewConfig {
  filter?: string;
  layers: string[];
  hopsLimit: number;
  selectedNodes: string[];
}

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius?: number;
  opacity?: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Theme {
  name: string;
  background: string;
  nodeStyles: Record<string, NodeStyle>;
  edgeStyles: Record<string, EdgeStyle>;
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
}