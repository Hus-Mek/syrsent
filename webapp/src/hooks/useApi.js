import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../constants';

// Hook for GET /api/sources - loads on mount
export function useSourceStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/sources`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// Hook for POST /api/analyze
export function useSentimentAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(async (targets, sources = null) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const body = { targets };
      if (sources) body.sources = sources;
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}

// Hook for POST /api/compare
export function useSourceComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(async (targets, sources, maxPeriods = 999) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const response = await fetch(`${API_BASE}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, sources, max_periods: maxPeriods }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result.comparison);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}

// Hook for GET /api/coverage
export function useCoverage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(async (target) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/coverage?target=${encodeURIComponent(target)}`
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result.coverage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}

// Hook for GET /api/relationships with localStorage cache
export function useRelationships() {
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem('relationships_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.data) return parsed.data;
      } catch (e) {
        // ignore malformed cache
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(async (minArticles = 5, maxPairs = 15) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/api/relationships?min_articles=${minArticles}&max_pairs=${maxPairs}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      setData(result);
      try {
        localStorage.setItem(
          'relationships_cache',
          JSON.stringify({ data: result, timestamp: Date.now() })
        );
      } catch (e) {
        // ignore storage quota errors
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem('relationships_cache');
    setData(null);
  }, []);

  return { data, loading, error, execute, clearCache };
}
