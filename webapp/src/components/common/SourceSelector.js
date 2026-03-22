import React from 'react';
import { SOURCE_CONFIG } from '../../constants';

function SourceSelector({ selected, onChange }) {
  const allSources = Object.values(SOURCE_CONFIG);

  const toggle = (sourceId) => {
    if (selected.includes(sourceId)) {
      if (selected.length > 1) {
        onChange(selected.filter((s) => s !== sourceId));
      }
    } else {
      onChange([...selected, sourceId]);
    }
  };

  return (
    <div className="source-selector">
      {allSources.map((src) => (
        <button
          key={src.id}
          className={`source-toggle ${selected.includes(src.id) ? 'active' : ''}`}
          style={{
            '--source-color': src.color,
            '--source-bg': src.colorLight,
          }}
          onClick={() => toggle(src.id)}
        >
          <span className="source-dot" style={{ background: src.color }}></span>
          <span className="source-label">{src.label}</span>
          <span className="source-label-ar">{src.label_ar}</span>
        </button>
      ))}
    </div>
  );
}

export default SourceSelector;
