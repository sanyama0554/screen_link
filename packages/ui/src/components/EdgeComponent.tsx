import React from 'react';
import { Edge as ReaflowEdge } from 'reaflow';
import { Theme } from '../types';

interface EdgeComponentProps {
  edge: ReaflowEdge;
  theme: Theme;
}

export const EdgeComponent: React.FC<EdgeComponentProps> = ({
  edge,
  theme
}) => {
  const isHighlighted = edge.data?.isHighlighted;
  const isDimmed = edge.data?.isDimmed;

  const edgeStyle = isHighlighted 
    ? theme.edgeStyles.highlighted 
    : isDimmed 
    ? theme.edgeStyles.dimmed 
    : theme.edgeStyles.default;

  return (
    <g>
      {/* Main edge path */}
      <path
        d={edge.path || ''}
        fill="none"
        stroke={edgeStyle.stroke}
        strokeWidth={edgeStyle.strokeWidth}
        strokeDasharray={edgeStyle.strokeDasharray}
        opacity={edgeStyle.opacity}
        style={{
          transition: 'all 0.2s ease-in-out',
          filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.3))' : undefined
        }}
        markerEnd="url(#arrowhead)"
      />
      
      {/* Animated flow effect for highlighted edges */}
      {isHighlighted && (
        <path
          d={edge.path || ''}
          fill="none"
          stroke={theme.text.accent}
          strokeWidth={1}
          opacity={0.6}
          strokeDasharray="4 4"
          style={{
            animation: 'flow 1.5s linear infinite'
          }}
        />
      )}

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={edgeStyle.stroke}
            opacity={edgeStyle.opacity}
          />
        </marker>
      </defs>

      <style jsx>{`
        @keyframes flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 8; }
        }
      `}</style>
    </g>
  );
};