import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Grid, Card, CardContent,
  List, ListItem, ListItemText, Stack,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Bar, Line } from 'react-chartjs-2';
import { useLanguage } from '../contexts/LanguageContext';
import { useCoverage } from '../hooks/useApi';
import { SOURCE_CONFIG } from '../constants';
import { getBarOptions } from '../utils/chartConfig';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ErrorAlert from '../components/common/ErrorAlert';

import '../utils/chartConfig';

const CHART_TEXT = '#9aa0a6';
const CHART_GRID = 'rgba(255,255,255,0.06)';

export default function CoveragePage() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState(searchParams.get('target') || '');
  const { data: coverage, loading, error, execute } = useCoverage();

  // Auto-search if target came from URL
  useEffect(() => {
    const urlTarget = searchParams.get('target');
    if (urlTarget) execute(urlTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    if (target.trim()) execute(target.trim());
  };

  // Build article bar chart data
  const getArticleBarData = () => {
    if (!coverage) return null;
    const ids = Object.keys(coverage);
    return {
      labels: ids.map(id => SOURCE_CONFIG[id]?.label || id),
      datasets: [{
        label: t('articles'),
        data: ids.map(id => coverage[id]?.article_count || 0),
        backgroundColor: ids.map(id => (SOURCE_CONFIG[id]?.color || '#999') + 'cc'),
        borderColor: ids.map(id => SOURCE_CONFIG[id]?.color || '#999'),
        borderWidth: 1,
      }],
    };
  };

  // Build mention bar chart data
  const getMentionBarData = () => {
    if (!coverage) return null;
    const ids = Object.keys(coverage);
    return {
      labels: ids.map(id => SOURCE_CONFIG[id]?.label || id),
      datasets: [{
        label: t('mentions'),
        data: ids.map(id => coverage[id]?.mention_count || 0),
        backgroundColor: ids.map(id => (SOURCE_CONFIG[id]?.color || '#999') + '88'),
        borderColor: ids.map(id => SOURCE_CONFIG[id]?.color || '#999'),
        borderWidth: 1,
      }],
    };
  };

  // Build timeline data
  const getTimelineData = () => {
    if (!coverage) return null;
    const allPeriods = new Set();
    Object.values(coverage).forEach(src => {
      (src.periods || []).forEach(p => allPeriods.add(p));
    });
    const sorted = [...allPeriods].sort();
    if (sorted.length === 0) return null;

    const datasets = Object.entries(coverage).map(([sourceId, srcData]) => {
      const config = SOURCE_CONFIG[sourceId];
      const periodSet = new Set(srcData.periods || []);
      return {
        label: config?.label || sourceId,
        data: sorted.map(p => periodSet.has(p) ? 1 : 0),
        borderColor: config?.color || '#999',
        backgroundColor: (config?.color || '#999') + '33',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      };
    });

    return { labels: sorted, datasets };
  };

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: t('coverageTimeline'), color: CHART_TEXT },
      legend: { labels: { color: CHART_TEXT } },
    },
    scales: {
      y: {
        min: 0,
        max: 1.2,
        ticks: {
          callback: v => v === 1 ? 'Has articles' : v === 0 ? 'No articles' : '',
          color: CHART_TEXT,
        },
        grid: { color: CHART_GRID },
      },
      x: {
        ticks: { color: CHART_TEXT },
        grid: { display: false },
      },
    },
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>{t('coverageExplorer')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('coverageDesc')}
      </Typography>

      {/* Search */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={t('targetPlaceholder')}
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          inputProps={{ dir: 'auto' }}
          size="small"
          sx={{ maxWidth: 500 }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !target.trim()}
          startIcon={<SearchIcon />}
        >
          {loading ? t('exploring') : t('explore')}
        </Button>
      </Stack>

      <ErrorAlert message={error} />
      {loading && <LoadingOverlay message={t('scanningArticles')} />}

      {coverage && (
        <>
          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(coverage).map(([sourceId, srcData]) => {
              const config = SOURCE_CONFIG[sourceId];
              return (
                <Grid item xs={12} sm={4} key={sourceId}>
                  <Card sx={{ borderLeft: 4, borderColor: config?.color }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: config?.color, mb: 1 }}>
                        {language === 'ar' ? config?.label_ar : config?.label}
                      </Typography>
                      <Stack direction="row" spacing={3}>
                        <Box>
                          <Typography variant="h5" fontWeight={700}>{srcData.article_count}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('articles')}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700}>{srcData.mention_count}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('mentions')}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700}>{srcData.period_count}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('periods')}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Charts */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ height: 250 }}>
                    {getArticleBarData() && (
                      <Bar data={getArticleBarData()} options={getBarOptions(t('articlesPerSource'))} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ height: 250 }}>
                    {getMentionBarData() && (
                      <Bar data={getMentionBarData()} options={getBarOptions(t('mentionsPerSource'))} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Timeline */}
          {getTimelineData() && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ height: 250 }}>
                  <Line data={getTimelineData()} options={timelineOptions} />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Categories */}
          <Typography variant="h6" sx={{ mb: 2 }}>{t('categories')}</Typography>
          <Grid container spacing={2}>
            {Object.entries(coverage).map(([sourceId, srcData]) => {
              const config = SOURCE_CONFIG[sourceId];
              const cats = srcData.categories || {};
              const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
              return (
                <Grid item xs={12} sm={4} key={sourceId}>
                  <Card sx={{ borderTop: 3, borderColor: config?.color }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: config?.color, mb: 1 }}>
                        {language === 'ar' ? config?.label_ar : config?.label}
                      </Typography>
                      <List dense>
                        {sorted.map(([cat, count]) => (
                          <ListItem key={cat} disablePadding sx={{ justifyContent: 'space-between' }}>
                            <ListItemText primary={cat} primaryTypographyProps={{ variant: 'body2' }} />
                            <Typography variant="body2" color="text.secondary">{count}</Typography>
                          </ListItem>
                        ))}
                        {sorted.length === 0 && (
                          <Typography variant="body2" color="text.secondary">{t('noCategories')}</Typography>
                        )}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}
