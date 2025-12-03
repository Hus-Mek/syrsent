import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Relationship type colors
const RELATIONSHIP_COLORS = {
  alliance: '#4caf50',
  support: '#8bc34a',
  cooperation: '#00bcd4',
  negotiation: '#2196f3',
  neutral: '#9e9e9e',
  tension: '#ff9800',
  opposition: '#ff5722',
  conflict: '#f44336',
};

// Entity type colors
const ENTITY_COLORS = {
  former_government: '#5c1a1a',
  current_government: '#1a5c1a',
  ruling_faction: '#1a3d5c',
  opposition: '#5c3d1a',
  armed_faction: '#3d1a5c',
  terrorist: '#1a1a1a',
  foreign_power: '#3d3d5c',
  militia: '#5c1a3d',
  unknown: '#616161',
};

function RelationshipMap({ apiBase }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState(null);

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
    setSelectedRelationship(null);

    try {
      const response = await fetch(`${apiBase}/api/relationships?min_articles=5&max_pairs=15`);
      if (!response.ok) throw new Error('Failed to build relationship map');
      
      const result = await response.json();
      console.log('Relationship data:', result);
      setData(result);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Get timeline chart data for a relationship
  const getTimelineChartData = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    const relationshipToScore = (type) => {
      const scores = {
        alliance: 1, support: 0.7, cooperation: 0.5,
        negotiation: 0.2, neutral: 0,
        tension: -0.3, opposition: -0.6, conflict: -1
      };
      return scores[type] || 0;
    };

    return {
      labels: timeline.map(t => t.period),
      datasets: [{
        label: 'Relationship Score',
        data: timeline.map(t => relationshipToScore(t.relationship_type)),
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 8,
        pointBackgroundColor: timeline.map(t => RELATIONSHIP_COLORS[t.relationship_type] || '#9e9e9e'),
      }]
    };
  };

  const timelineOptions = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Relationship Evolution Over Time' },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const idx = context.dataIndex;
            const timeline = selectedRelationship?.timeline || [];
            if (timeline[idx]) {
              return `${timeline[idx].relationship_type} (${timeline[idx].article_count} articles)`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        min: -1.2,
        max: 1.2,
        title: { display: true, text: 'Relationship (Conflict ← → Alliance)' },
        ticks: {
          callback: (value) => {
            if (value >= 0.7) return 'Alliance';
            if (value >= 0.3) return 'Support';
            if (value >= -0.3) return 'Neutral';
            if (value >= -0.7) return 'Tension';
            return 'Conflict';
          }
        }
      },
      x: { title: { display: true, text: 'Time Period' } }
    }
  };

  // Render relationship card
  const renderRelationshipCard = (rel, index) => {
    const isSelected = selectedRelationship === rel;
    
    return (
      <div 
        key={index}
        className={`relationship-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedRelationship(isSelected ? null : rel)}
      >
        <div className="relationship-header">
          <div className="entities-pair">
            <span className="entity-name" style={{ borderColor: ENTITY_COLORS[rel.source_info?.type] }}>
              {rel.source_info?.name_en}
              <small>{rel.source_info?.name_ar}</small>
            </span>
            <span className="relationship-arrow">↔</span>
            <span className="entity-name" style={{ borderColor: ENTITY_COLORS[rel.target_info?.type] }}>
              {rel.target_info?.name_en}
              <small>{rel.target_info?.name_ar}</small>
            </span>
          </div>
          <div className="relationship-badges">
            <span 
              className="type-badge"
              style={{ background: RELATIONSHIP_COLORS[rel.current_relationship] }}
            >
              {rel.current_relationship}
            </span>
            <span className="trend-badge">
              {rel.trend === 'improving' ? '📈' : rel.trend === 'deteriorating' ? '📉' : '➡️'}
              {rel.trend}
            </span>
          </div>
        </div>
        
        <div className="relationship-stats">
          <span>📄 {rel.total_articles} articles</span>
          <span>📅 {rel.periods_analyzed} periods</span>
        </div>

        {isSelected && rel.timeline && (
          <div className="relationship-detail" onClick={(e) => e.stopPropagation()}>
            {/* Timeline Chart */}
            {rel.timeline.length > 1 && (
              <div className="timeline-chart">
                <Line data={getTimelineChartData(rel.timeline)} options={timelineOptions} />
              </div>
            )}

            {/* Period Breakdown */}
            <div className="periods-breakdown">
              <h4>📅 Period by Period Analysis</h4>
              {rel.timeline.map((period, i) => (
                <div key={i} className="period-item" style={{ borderLeftColor: RELATIONSHIP_COLORS[period.relationship_type] }}>
                  <div className="period-header">
                    <strong>{period.period}</strong>
                    <span className="period-type" style={{ background: RELATIONSHIP_COLORS[period.relationship_type] }}>
                      {period.relationship_type}
                    </span>
                    <span className="period-count">{period.article_count} articles</span>
                  </div>
                  
                  {period.description && (
                    <p className="period-description">{period.description}</p>
                  )}
                  
                  {period.key_events && period.key_events.length > 0 && (
                    <div className="period-events">
                      <strong>Key Events:</strong>
                      <ul>
                        {period.key_events.map((event, j) => (
                          <li key={j}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence with Article Links */}
                  {period.evidence && period.evidence.length > 0 && (
                    <div className="period-evidence">
                      <strong>Evidence:</strong>
                      {period.evidence.map((ev, j) => (
                        <div key={j} className="evidence-quote">
                          <blockquote>"{ev.quote}"</blockquote>
                          {ev.interpretation && <p className="interpretation">{ev.interpretation}</p>}
                          {ev.article_url && (
                            <a href={ev.article_url} target="_blank" rel="noopener noreferrer" className="article-link">
                              📰 {ev.article_title || 'View Article'}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Source Articles */}
                  {period.articles && period.articles.length > 0 && (
                    <div className="period-articles">
                      <strong>Source Articles:</strong>
                      <ul>
                        {period.articles.map((art, j) => (
                          <li key={j}>
                            <a href={art.url} target="_blank" rel="noopener noreferrer">
                              {art.title}
                            </a>
                            <small> ({art.date})</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relationship-map">
      <div className="map-header">
        <h2>🕸️ Relationship Map</h2>
        <p>Track how relationships between Syrian political entities evolve over time</p>
        <p className="note">
          <strong>Note:</strong> Distinguishes between Assad Regime (pre-Dec 2024) and New Syrian Government (post-Dec 2024)
        </p>
        <button onClick={buildMap} disabled={loading} className="build-button">
          {loading ? 'Building map... (this takes a few minutes)' : 'Build Relationship Map'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing relationships across all articles...</p>
          <p className="loading-sub">Building timelines for each entity pair</p>
        </div>
      )}

      {data && (
        <div className="map-container">
          {/* Stats */}
          <div className="map-stats">
            <span>📄 {data.stats?.total_articles} articles analyzed</span>
            <span>🔗 {data.stats?.relationships_analyzed} relationships mapped</span>
            <span>👥 {data.nodes?.length} entities</span>
          </div>

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

          {/* Relationships List */}
          <div className="relationships-list">
            <h3>Entity Relationships (click to expand)</h3>
            {data.relationships?.map((rel, i) => renderRelationshipCard(rel, i))}
          </div>
        </div>
      )}

      {/* Entity Reference */}
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
                <span className="arabic">{entity.name_ar}</span>
                <span className="type">{entity.type?.replace('_', ' ')}</span>
                {entity.active_period?.end && (
                  <span className="period-note">Until {entity.active_period.end}</span>
                )}
                {entity.active_period?.start && (
                  <span className="period-note">From {entity.active_period.start}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RelationshipMap;