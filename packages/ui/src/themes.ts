import { Theme } from './types';

export const elegantDarkTheme: Theme = {
  name: 'elegant-dark',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
  nodeStyles: {
    screen: {
      fill: '#f1e3e3', // 桜鼠 (sakura-nezumi)
      stroke: '#d4a4a4',
      strokeWidth: 2,
      radius: 8,
      opacity: 0.9
    },
    gqlField: {
      fill: '#d8bfd8', // 薄藤 (usu-fuji)
      stroke: '#b19fb1',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    },
    resolver: {
      fill: '#2c2c54', // 墨 (sumi)
      stroke: '#4a4a7a',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    },
    grpc: {
      fill: '#4a5568', // 青褐 (ao-kachi)
      stroke: '#6b7280',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    }
  },
  edgeStyles: {
    default: {
      stroke: '#6b7280',
      strokeWidth: 1.5,
      opacity: 0.7
    },
    highlighted: {
      stroke: '#f59e0b',
      strokeWidth: 3,
      opacity: 1
    },
    dimmed: {
      stroke: '#374151',
      strokeWidth: 1,
      opacity: 0.3
    }
  },
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    accent: '#fbbf24'
  }
};

export const elegantLightTheme: Theme = {
  name: 'elegant-light',
  background: 'linear-gradient(135deg, #faf7f7 0%, #f3f4f6 50%, #e5e7eb 100%)',
  nodeStyles: {
    screen: {
      fill: '#fce7e7',
      stroke: '#f87171',
      strokeWidth: 2,
      radius: 8,
      opacity: 0.9
    },
    gqlField: {
      fill: '#ede9fe',
      stroke: '#a78bfa',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    },
    resolver: {
      fill: '#f3f4f6',
      stroke: '#6b7280',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    },
    grpc: {
      fill: '#dbeafe',
      stroke: '#3b82f6',
      strokeWidth: 2,
      radius: 6,
      opacity: 0.9
    }
  },
  edgeStyles: {
    default: {
      stroke: '#6b7280',
      strokeWidth: 1.5,
      opacity: 0.7
    },
    highlighted: {
      stroke: '#f59e0b',
      strokeWidth: 3,
      opacity: 1
    },
    dimmed: {
      stroke: '#d1d5db',
      strokeWidth: 1,
      opacity: 0.3
    }
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    accent: '#d97706'
  }
};

export const themes = {
  'elegant-dark': elegantDarkTheme,
  'elegant-light': elegantLightTheme
};