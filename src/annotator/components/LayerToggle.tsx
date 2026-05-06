import type { AnnotationLayer } from '../types';

interface LayerToggleProps {
  layers: AnnotationLayer[];
  visibleLayerIds: Set<string>;
  onToggle: (layerId: string) => void;
}

export function LayerToggle({ layers, visibleLayerIds, onToggle }: LayerToggleProps) {
  if (layers.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      <span style={{ color: '#555', fontSize: 10, fontFamily: 'monospace' }}>Layers:</span>
      {layers.map((layer) => {
        const visible = visibleLayerIds.has(layer.id);
        return (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            style={{
              padding: '2px 8px',
              backgroundColor: visible ? '#222' : '#111',
              color: visible ? layer.userColor : '#444',
              border: `1px solid ${visible ? layer.userColor : '#333'}`,
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 10,
              opacity: visible ? 1 : 0.5,
            }}
          >
            {layer.userName}
          </button>
        );
      })}
    </div>
  );
}
