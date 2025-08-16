import React from 'react';
import { Node as ReaflowNode } from 'reaflow';
import { Theme } from '../types';

interface NodeComponentProps {
  node: ReaflowNode;
  theme: Theme;
  onEnter?: (event: any, node: ReaflowNode) => void;
  onLeave?: () => void;
}

export const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  theme,
  onEnter,
  onLeave
}) => {
  const originalNode = node.data?.originalNode;
  const isSelected = node.data?.isSelected;
  const isHovered = node.data?.isHovered;
  const isHighlighted = node.data?.isHighlighted;
  const isDimmed = node.data?.isDimmed;

  if (!originalNode) return null;

  const nodeStyle = theme.nodeStyles[originalNode.type];
  if (!nodeStyle) return null;

  // Calculate dynamic styles
  const opacity = isDimmed ? 0.3 : (nodeStyle.opacity || 1);
  const strokeWidth = isSelected ? nodeStyle.strokeWidth + 2 : nodeStyle.strokeWidth;
  const glowEffect = isHovered || isSelected;
  
  return (
    <g
      onMouseEnter={(e) => onEnter?.(e, node)}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect */}
      {glowEffect && (
        <circle
          cx={0}
          cy={0}
          r={(nodeStyle.radius || 20) + 8}
          fill="none"
          stroke={isSelected ? theme.text.accent : nodeStyle.stroke}
          strokeWidth={3}
          opacity={0.3}
          style={{
            filter: 'blur(4px)',
            animation: isHovered ? 'pulse 1.5s infinite' : undefined
          }}
        />
      )}
      
      {/* Main node circle */}
      <circle
        cx={0}
        cy={0}
        r={nodeStyle.radius || 20}
        fill={nodeStyle.fill}
        stroke={isSelected ? theme.text.accent : nodeStyle.stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{
          filter: glowEffect ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : undefined,
          transition: 'all 0.2s ease-in-out'
        }}
      />
      
      {/* Node type indicator */}
      <circle
        cx={(nodeStyle.radius || 20) * 0.6}
        cy={-(nodeStyle.radius || 20) * 0.6}
        r={4}
        fill={getTypeIndicatorColor(originalNode.type)}
        stroke={theme.background}
        strokeWidth={1}
        opacity={opacity}
      />
      
      {/* Text label */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.min(12, (nodeStyle.radius || 20) * 0.6)}
        fill={theme.text.primary}
        opacity={opacity}
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: isSelected ? 'bold' : 'normal',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        {truncateText(originalNode.label, (nodeStyle.radius || 20) * 0.8)}
      </text>
      
      {/* Highlight indicator for selected nodes */}
      {isHighlighted && !isSelected && (
        <circle
          cx={0}
          cy={0}
          r={(nodeStyle.radius || 20) + 4}
          fill="none"
          stroke={theme.text.accent}
          strokeWidth={2}
          opacity={0.6}
          strokeDasharray="4 4"
          style={{
            animation: 'rotate 3s linear infinite'
          }}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </g>
  );
};

function getTypeIndicatorColor(type: string): string {
  switch (type) {
    case 'screen':
      return '#ef4444'; // Red
    case 'gqlField':
      return '#8b5cf6'; // Purple
    case 'resolver':
      return '#6b7280'; // Gray
    case 'grpc':
      return '#3b82f6'; // Blue
    default:
      return '#6b7280';
  }
}

function truncateText(text: string, maxWidth: number): string {
  const maxChars = Math.floor(maxWidth / 6); // Rough estimation
  if (text.length <= maxChars) return text;
  
  return text.substring(0, maxChars - 3) + '...';
}