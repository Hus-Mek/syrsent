import React, { useState, useEffect, useRef } from 'react';

// Relationship type colors
const RELATIONSHIP_COLORS = {
  alliance: '#4caf50',    // Green
  support: '#8bc34a',     // Light green
  conflict: '#f44336',    // Red
  tension: '#ff9800',     // Orange
  opposition: '#ff5722',  // Deep orange
  negotiation: '#2196f3', // Blue
  neutral: '#9e9e9e',     // Gray
};

// Entity type colors
const ENTITY_COLORS = {
  government: '#1a237e',  // Dark blue
  rebel: '#c62828',       // Dark red
  terrorist: '#000000',   // Black
  foreign_power: '#4a148c', // Purple
  militia: '#bf360c',     // Brown
  unknown: '#616161',     // Gray
};

function RelationshipMap({ apiBase }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [entities, setEntities] = useState([]);
  const canvasRef = useRef(null);

  // Load available entities on mount
  useEffect(() => {
    fetch(`${apiBase}/api/relationships/entities`)
      .then(res => res.json())
      .then(data => setEntities(data))
      .catch(err => console.error('Failed to load entities:', err));
  }, [apiBase]);

  // Build relationship map
  const buildMap = async () => {
    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch(`${apiBase}/api/relationships?min_articles=5`);
      if (!response.ok) throw new Error('Failed to build relationship map');
      
      const result = await response.json();
      console.log('Relationship data:', result);
      setData(result);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Draw network graph
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, width, height);

    const nodes = data.nodes || [];
    const edges = data.edges || [];

    if (nodes.length === 0) return;

    // Position nodes in a circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const nodePositions = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      nodePositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...node
      };
    });

    // Draw edges
    edges.forEach(edge => {
      const source = nodePositions[edge.source];
      const target = nodePositions[edge.target];
      
      if (!source || !target) return;

      const color = RELATIONSHIP_COLORS[edge.type] || '#9e9e9e';
      const lineWidth = Math.max(1, edge.strength * 5);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      // Draw relationship label at midpoint
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.type, midX, midY - 5);
    });

    // Draw nodes
    Object.values(nodePositions).forEach(node => {
      const color = ENTITY_COLORS[node.type] || '#616161';
      
      // Circle
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name_en, node.x, node.y + 35);
      
      // Arabic name
      ctx.font = '11px sans-serif';
      ctx.fillText(node.id, node.x, node.y + 48);
    });

  }, [data]);

  // Render relationship details
  const renderEdgeDetails = (edge) => (
    <div className="edge-details">
      <h4>{edge.source_en} ↔ {edge.target_en}</h4>
      <div className="edge-meta">
        <span 
          className="relationship-type"
          style={{ background: RELATIONSHIP_COLORS[edge.type] }}
        >
          {edge.type}
        </span>
        <span className="strength">Strength: {(edge.strength * 100).toFixed(0)}%</span>
        <span className="articles">{edge.article_count} articles</span>
      </div>
      
      <p className="description">{edge.description}</p>
      
      {edge.themes && edge.themes.length > 0 && (
        <div className="themes">
          <strong>Key themes:</strong>
          {edge.themes.map((theme, i) => (
            <span key={i} className="theme-tag">{theme}</span>
          ))}
        </div>
      )}

      {edge.evidence && edge.evidence.length > 0 && (
        <div className="evidence">
          <strong>Evidence:</strong>
          {edge.evidence.slice(0, 3).map((ev, i) => (
            <blockquote key={i}>
              "{ev.quote}"
              <cite>— {ev.date}</cite>
            </blockquote>
          ))}
        </div>
      )}

      <div className="evolution">
        <strong>Trend:</strong> {edge.evolution}
      </div>
    </div>
  );

  return (
    <div className="relationship-map">
      <div className="map-header">
        <h2>🕸️ Relationship Map</h2>
        <p>How the Syrian Dialogue Center portrays relationships between factions</p>
        <button onClick={buildMap} disabled={loading}>
          {loading ? 'Building map...' : 'Build Relationship Map'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing relationships across all articles...</p>
          <p className="loading-sub">This may take a few minutes</p>
        </div>
      )}

      {data && (
        <div className="map-container">
          {/* Stats */}
          <div className="map-stats">
            <span>📄 {data.stats?.total_articles} articles analyzed</span>
            <span>🔗 {data.stats?.relationships_analyzed} relationships found</span>
            <span>👥 {data.nodes?.length} entities</span>
          </div>

          {/* Canvas for network visualization */}
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600}
            className="network-canvas"
          />

          {/* Legend */}
          <div className="legend">
            <h4>Relationship Types</h4>
            <div className="legend-items">
              {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
                <div key={type} className="legend-item">
                  <span className="color-box" style={{ background: color }}></span>
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Relationship list */}
          <div className="relationships-list">
            <h3>Relationship Details</h3>
            {data.edges?.map((edge, i) => (
              <div 
                key={i} 
                className="relationship-card"
                onClick={() => setSelectedEdge(selectedEdge === i ? null : i)}
              >
                <div className="relationship-header">
                  <span className="entities">
                    {edge.source_en} ↔ {edge.target_en}
                  </span>
                  <span 
                    className="type-badge"
                    style={{ background: RELATIONSHIP_COLORS[edge.type] }}
                  >
                    {edge.type}
                  </span>
                </div>
                
                {selectedEdge === i && renderEdgeDetails(edge)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity reference */}
      {entities.length > 0 && !data && (
        <div className="entities-reference">
          <h3>Tracked Entities</h3>
          <div className="entity-grid">
            {entities.map(entity => (
              <div 
                key={entity.id} 
                className="entity-card"
                style={{ borderLeftColor: ENTITY_COLORS[entity.type] }}
              >
                <strong>{entity.name_en}</strong>
                <span className="arabic">{entity.id}</span>
                <span className="type">{entity.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RelationshipMap;