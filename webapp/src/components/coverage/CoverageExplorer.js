import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { SOURCE_CONFIG } from '../../constants';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend
);

function CoverageExplorer({ apiBase }) {
  const [target, setTarget] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [coverage, setCoverage] = React.useState(null);

  const handleSearch = async () => {
    if (!target.trim()) {
      setError('Please enter a target entity.');
      return;
    }

    setLoading(true);
    setError('');
    setCoverage(null);

    try {
      const response = await fetch(
        `${apiBase}/api/coverage?target=${encodeURIComponent(target.trim())}`
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setCoverage(data.coverage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderArticleBar = () => {
    if (!coverage) return null;
    const sourceIds = Object.keys(coverage);
    const labels = sourceIds.map((id) => SOURCE_CONFIG[id]?.label || id);
    const colors = sourceIds.map((id) => SOURCE_CONFIG[id]?.color || '#999');

    return (
      <div style={{ height: '250px' }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Articles',
                data: sourceIds.map((id) => coverage[id]?.article_count || 0),
                backgroundColor: colors.map((c) => c + 'cc'),
                borderColor: colors,
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Articles per Source' } },
          }}
        />
      </div>
    );
  };

  const renderMentionBar = () => {
    if (!coverage) return null;
    const sourceIds = Object.keys(coverage);
    const labels = sourceIds.map((id) => SOURCE_CONFIG[id]?.label || id);
    const colors = sourceIds.map((id) => SOURCE_CONFIG[id]?.color || '#999');

    return (
      <div style={{ height: '250px' }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Mentions',
                data: sourceIds.map((id) => coverage[id]?.mention_count || 0),
                backgroundColor: colors.map((c) => c + '88'),
                borderColor: colors,
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Total Mentions per Source' } },
          }}
        />
      </div>
    );
  };

  const renderTimeline = () => {
    if (!coverage) return null;

    // Collect all periods
    const allPeriods = new Set();
    Object.values(coverage).forEach((src) => {
      (src.periods || []).forEach((p) => allPeriods.add(p));
    });
    const sorted = [...allPeriods].sort();
    if (sorted.length === 0) return null;

    const datasets = Object.entries(coverage).map(([sourceId, srcData]) => {
      const config = SOURCE_CONFIG[sourceId];
      const periodSet = new Set(srcData.periods || []);

      return {
        label: config?.label || sourceId,
        data: sorted.map((p) => (periodSet.has(p) ? 1 : 0)),
        borderColor: config?.color || '#999',
        backgroundColor: (config?.color || '#999') + '33',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      };
    });

    return (
      <div style={{ height: '250px' }}>
        <Line
          data={{ labels: sorted, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Coverage Timeline (presence per period)' } },
            scales: {
              y: {
                min: 0,
                max: 1.2,
                ticks: {
                  callback: (v) => (v === 1 ? 'Has articles' : v === 0 ? 'No articles' : ''),
                },
              },
            },
          }}
        />
      </div>
    );
  };

  const renderCategories = () => {
    if (!coverage) return null;

    return (
      <div className="coverage-categories-grid">
        {Object.entries(coverage).map(([sourceId, srcData]) => {
          const config = SOURCE_CONFIG[sourceId];
          const cats = srcData.categories || {};
          const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

          return (
            <div key={sourceId} className="category-card" style={{ borderTopColor: config?.color }}>
              <h4 style={{ color: config?.color }}>{config?.label || sourceId}</h4>
              <div className="category-list">
                {sortedCats.map(([cat, count]) => (
                  <div key={cat} className="category-item">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-count">{count}</span>
                  </div>
                ))}
                {sortedCats.length === 0 && <span className="no-cats">No categories</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="coverage-explorer">
      <div className="coverage-header">
        <h2>Coverage Explorer</h2>
        <p>Explore how different sources cover a topic - no AI analysis, instant results</p>
      </div>

      <div className="coverage-controls">
        <div className="input-group">
          <label>Entity / Topic</label>
          <div className="input-row">
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. هتش, تركيا, الأسد"
              className="target-input"
              dir="auto"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={loading || !target.trim()}
            >
              {loading ? 'Loading...' : 'Explore'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Scanning articles...</p>
        </div>
      )}

      {coverage && (
        <div className="coverage-results">
          <div className="coverage-summary">
            {Object.entries(coverage).map(([sourceId, srcData]) => {
              const config = SOURCE_CONFIG[sourceId];
              return (
                <div key={sourceId} className="coverage-summary-card" style={{ borderLeftColor: config?.color }}>
                  <span className="summary-source" style={{ color: config?.color }}>{config?.label}</span>
                  <span className="summary-stat">{srcData.article_count} articles</span>
                  <span className="summary-stat">{srcData.mention_count} mentions</span>
                  <span className="summary-stat">{srcData.period_count} periods</span>
                </div>
              );
            })}
          </div>

          <div className="coverage-charts">
            <div className="chart-row">
              {renderArticleBar()}
              {renderMentionBar()}
            </div>
            {renderTimeline()}
            {renderCategories()}
          </div>
        </div>
      )}
    </div>
  );
}

export default CoverageExplorer;
