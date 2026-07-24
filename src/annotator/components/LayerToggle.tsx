import type { AnnotationLayer } from '../types';
import { T, label } from '../../shared/theme';

interface LayerToggleProps {
  layers: AnnotationLayer[];
  visibleLayerIds: Set<string>;
  onToggle: (layerId: string) => void;
}

export function LayerToggle({ layers, visibleLayerIds, onToggle }: LayerToggleProps) {
  if (layers.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      <span style={{ ...label, fontFamily: T.mono }}>Layers</span>
      {layers.map((layer) => {
        const visible = visibleLayerIds.has(layer.id);
        return (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            style={{
              padding: '2px 8px',
              backgroundColor: visible ? T.bg3 : T.bg1,
              color: visible ? layer.userColor : T.ink3,
              border: `1px solid ${visible ? layer.userColor : T.line1}`,
              borderRadius: T.radius.m,
              cursor: 'pointer',
              fontFamily: T.mono,
              fontSize: T.fs.t1,
              fontWeight: 600,
              letterSpacing: '0.04em',
              opacity: visible ? 1 : 0.55,
              transition: `background-color ${T.fast} ${T.ease}, color ${T.fast} ${T.ease}, border-color ${T.fast} ${T.ease}, opacity ${T.fast} ${T.ease}`,
            }}
          >
            {layer.userName}
          </button>
        );
      })}
    </div>
  );
}
