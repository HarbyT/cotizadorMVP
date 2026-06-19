import React from 'react';
import type { GeometryResult } from '../../domain/geometryEngine';

interface CutLayoutViewerProps {
  result: GeometryResult;
  bleedCm: number;
  gripperCm: number;
  grainDirection?: 'long' | 'short' | 'unknown';
}

const COLORS = {
  normal: {
    fill: '#dbeafe',
    stroke: '#2563eb',
  },
  rotated: {
    fill: '#ffedd5',
    stroke: '#ea580c',
  },
};

export const CutLayoutViewer: React.FC<CutLayoutViewerProps> = ({
  result,
  bleedCm,
  gripperCm,
  grainDirection = 'unknown',
}) => {
  const margin = 8;
  const width = Math.max(1, result.containerWidthCm);
  const height = Math.max(1, result.containerHeightCm);
  const viewWidth = width + margin * 2;
  const viewHeight = height + margin * 2;
  const placements = result.placements.slice(0, 300);

  return (
    <div className="cut-layout-viewer">
      <div className="cut-layout-legend">
        <span><i className="legend-swatch normal" />Normal</span>
        <span><i className="legend-swatch rotated" />Girado</span>
        <span><i className="legend-swatch waste" />Sobrante</span>
        {result.substrateKind === 'sheet' && gripperCm > 0 && (
          <span><i className="legend-swatch gripper" />Pinza</span>
        )}
      </div>

      <div className="cut-layout-canvas">
        <svg
          role="img"
          aria-label="Mapa de aprovechamiento del material"
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="waste-pattern" width="2" height="2" patternUnits="userSpaceOnUse">
              <path d="M0 2 L2 0" stroke="#cbd5e1" strokeWidth="0.15" />
            </pattern>
            <pattern id="gripper-pattern" width="2" height="2" patternUnits="userSpaceOnUse">
              <path d="M0 0 L2 2 M2 0 L0 2" stroke="#f59e0b" strokeWidth="0.15" />
            </pattern>
          </defs>

          <rect
            x={margin}
            y={margin}
            width={width}
            height={height}
            rx="0.8"
            fill="url(#waste-pattern)"
            stroke="#334155"
            strokeWidth="0.45"
          />

          {result.substrateKind === 'sheet' && gripperCm > 0 && (
            <rect
              x={margin}
              y={margin}
              width={width}
              height={Math.min(gripperCm, height)}
              fill="url(#gripper-pattern)"
              stroke="#f59e0b"
              strokeWidth="0.25"
            />
          )}

          {placements.map((placement, index) => {
            const color = COLORS[placement.orientation];
            const innerX = placement.xCm + margin + bleedCm;
            const innerY = placement.yCm + margin + bleedCm;
            const innerWidth = Math.max(0, placement.widthCm - bleedCm * 2);
            const innerHeight = Math.max(0, placement.heightCm - bleedCm * 2);

            return (
              <g key={`${placement.xCm}-${placement.yCm}-${index}`}>
                <rect
                  x={placement.xCm + margin}
                  y={placement.yCm + margin}
                  width={placement.widthCm}
                  height={placement.heightCm}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="0.25"
                />
                {bleedCm > 0 && innerWidth > 0 && innerHeight > 0 && (
                  <rect
                    x={innerX}
                    y={innerY}
                    width={innerWidth}
                    height={innerHeight}
                    fill="none"
                    stroke={color.stroke}
                    strokeDasharray="0.7 0.5"
                    strokeWidth="0.18"
                  />
                )}
              </g>
            );
          })}

          <line
            x1={margin}
            y1={margin - 2.2}
            x2={margin + width}
            y2={margin - 2.2}
            stroke="#475569"
            strokeWidth="0.25"
          />
          <text
            x={margin + width / 2}
            y={margin - 3}
            textAnchor="middle"
            fontSize="2.8"
            fill="#334155"
          >
            {width.toLocaleString('es-CO', { maximumFractionDigits: 2 })} cm
          </text>

          <line
            x1={margin - 2.2}
            y1={margin}
            x2={margin - 2.2}
            y2={margin + height}
            stroke="#475569"
            strokeWidth="0.25"
          />
          <text
            x={margin - 3}
            y={margin + height / 2}
            textAnchor="middle"
            fontSize="2.8"
            fill="#334155"
            transform={`rotate(-90 ${margin - 3} ${margin + height / 2})`}
          >
            {height.toLocaleString('es-CO', { maximumFractionDigits: 2 })} cm
          </text>

          {grainDirection !== 'unknown' && (
            <g>
              <line
                x1={margin + width - 8}
                y1={margin + height - 4}
                x2={grainDirection === 'long' ? margin + width - 2 : margin + width - 8}
                y2={grainDirection === 'long' ? margin + height - 4 : margin + height - 10}
                stroke="#059669"
                strokeWidth="0.5"
              />
              <text
                x={margin + width - 9}
                y={margin + height - 1.5}
                textAnchor="end"
                fontSize="2.5"
                fill="#047857"
              >
                Fibra
              </text>
            </g>
          )}
        </svg>
      </div>

      {result.substrateKind === 'roll' && (
        <p className="cut-layout-note">
          Vista de las primeras filas. El consumo total calculado es{' '}
          {(result.materialConsumption.requiredLinearMeters || 0).toLocaleString('es-CO', {
            maximumFractionDigits: 2,
          })}{' '}
          ML.
        </p>
      )}
    </div>
  );
};
