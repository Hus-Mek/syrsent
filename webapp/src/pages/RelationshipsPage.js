import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea, Grid, Chip, Stack,
  Button, Collapse, Link, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon, DeleteOutline as ClearIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { useLanguage } from '../contexts/LanguageContext';
import { useRelationships } from '../hooks/useApi';
import { RELATIONSHIP_COLORS, ENTITY_COLORS, relationshipToScore } from '../utils/chartConfig';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ErrorAlert from '../components/common/ErrorAlert';
import StatCard from '../components/common/StatCard';

import '../utils/chartConfig';

const TREND_ICONS = {
  improving: { icon: '\u2191', color: '#4caf50' },
  deteriorating: { icon: '\u2193', color: '#f44336' },
  stable: { icon: '\u2192', color: '#9e9e9e' },
};

export default function RelationshipsPage() {
  const { language, t } = useLanguage();
  const { data, loading, error, execute, clearCache } = useRelationships();
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    if (data === null && !loading) {
      execute();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = (index) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const relationships = data?.relationships || [];
  const nodes = data?.nodes || [];
  const stats = data?.stats || {};

  const getEntityName = (info) => {
    if (!info) return '';
    if (language === 'ar' && info.name_ar) return info.name_ar;
    return info.name_en || info.name_ar || '';
  };

  const buildChartData = (rel) => ({
    labels: rel.timeline.map((t) => t.period),
    datasets: [{
      label: 'Relationship Score',
      data: rel.timeline.map((t) => relationshipToScore(t.relationship_type)),
      borderColor: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 8,
      pointBackgroundColor: rel.timeline.map((t) => RELATIONSHIP_COLORS[t.relationship_type] || '#9e9e9e'),
    }],
  });

  const timelineOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Relationship Evolution',
        color: '#9aa0a6',
      },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const rel = relationships[selectedIndex];
            if (!rel || !rel.timeline[idx]) return '';
            const tp = rel.timeline[idx];
            return `${tp.relationship_type} (${tp.article_count} articles)`;
          },
        },
      },
    },
    scales: {
      y: {
        min: -1.2,
        max: 1.2,
        title: {
          display: true,
          text: 'Conflict \u2190 \u2192 Alliance',
          color: '#9aa0a6',
        },
        ticks: {
          color: '#9aa0a6',
          callback: (value) => {
            if (value >= 0.7) return 'Alliance';
            if (value >= -0.3 && value <= 0.3) return 'Neutral';
            if (value <= -0.7) return 'Conflict';
            return '';
          },
        },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      x: {
        ticks: { color: '#9aa0a6' },
        grid: { display: false },
      },
    },
  };

  return (
    <Box>
      {/* Header + Controls */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {t('relationshipMap')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('relationshipsDesc')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {data && (
            <Chip
              label={t('cached')}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => execute()}
            disabled={loading}
          >
            {t('refreshData')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearCache}
            disabled={loading}
          >
            {t('clearCache')}
          </Button>
        </Stack>
      </Box>

      <ErrorAlert message={error} />
      {loading && <LoadingOverlay message={t('loadingRelationships')} />}

      {/* Stats Bar */}
      {data && (
        <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <StatCard
              label={t('totalArticles')}
              value={stats.total_articles || 0}
              subtitle={t('articlesAnalyzed')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label={t('relationshipMap')}
              value={relationships.length}
              subtitle={t('relationshipsMapped')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label={t('entities')}
              value={nodes.length}
            />
          </Grid>
        </Grid>
      )}

      {/* Legend */}
      {data && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {t('relationshipTypes')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
              <Chip
                key={type}
                label={type}
                size="small"
                sx={{
                  bgcolor: color,
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Relationship Cards */}
      {relationships.map((rel, index) => {
        const isExpanded = selectedIndex === index;
        const relColor = RELATIONSHIP_COLORS[rel.current_relationship] || '#9e9e9e';
        const trendInfo = TREND_ICONS[rel.trend] || { icon: '?', color: '#9e9e9e' };

        return (
          <Card key={index} sx={{ mb: 2 }}>
            <CardActionArea onClick={() => handleCardClick(index)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                  {/* Entity pair */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} dir="auto">
                      {getEntityName(rel.source_info)} {'\u2194'} {getEntityName(rel.target_info)}
                    </Typography>
                    {language === 'ar' && (rel.source_info?.name_en || rel.target_info?.name_en) && (
                      <Typography variant="caption" color="text.secondary">
                        {rel.source_info?.name_en || ''} {'\u2194'} {rel.target_info?.name_en || ''}
                      </Typography>
                    )}
                    {language !== 'ar' && (rel.source_info?.name_ar || rel.target_info?.name_ar) && (
                      <Typography variant="caption" color="text.secondary" dir="rtl">
                        {rel.source_info?.name_ar || ''} {'\u2194'} {rel.target_info?.name_ar || ''}
                      </Typography>
                    )}
                  </Box>

                  {/* Entity type chips */}
                  {rel.source_info?.type && (
                    <Chip
                      label={rel.source_info.type.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: ENTITY_COLORS[rel.source_info.type] || '#616161',
                        color: ENTITY_COLORS[rel.source_info.type] || '#616161',
                        fontSize: '0.65rem',
                      }}
                    />
                  )}
                  {rel.target_info?.type && (
                    <Chip
                      label={rel.target_info.type.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: ENTITY_COLORS[rel.target_info.type] || '#616161',
                        color: ENTITY_COLORS[rel.target_info.type] || '#616161',
                        fontSize: '0.65rem',
                      }}
                    />
                  )}

                  {/* Relationship type chip */}
                  <Chip
                    label={rel.current_relationship}
                    size="small"
                    sx={{
                      bgcolor: relColor,
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />

                  {/* Trend chip */}
                  <Chip
                    label={`${trendInfo.icon} ${rel.trend}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: trendInfo.color,
                      color: trendInfo.color,
                      textTransform: 'capitalize',
                    }}
                  />

                  {/* Stats */}
                  <Typography variant="caption" color="text.secondary">
                    {rel.total_articles} {t('articles')} &middot; {rel.periods_analyzed} {t('periods')}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>

            {/* Expanded Section */}
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <CardContent sx={{ pt: 0 }}>
                <Divider sx={{ mb: 2 }} />

                {/* Timeline Chart */}
                {rel.timeline && rel.timeline.length > 0 ? (
                  <Box sx={{ mb: 3, maxHeight: 350 }}>
                    <Line data={buildChartData(rel)} options={timelineOptions} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('noTimeline')}
                  </Typography>
                )}

                {/* Period-by-Period Breakdown */}
                {rel.timeline && rel.timeline.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                      {t('periodByPeriod')}
                    </Typography>
                    {rel.timeline.map((period, pIdx) => {
                      const periodColor = RELATIONSHIP_COLORS[period.relationship_type] || '#9e9e9e';

                      return (
                        <Card
                          key={pIdx}
                          sx={{
                            mb: 1.5,
                            borderLeft: 4,
                            borderColor: periodColor,
                            bgcolor: 'background.default',
                          }}
                        >
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            {/* Period header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {period.period}
                              </Typography>
                              <Chip
                                label={period.relationship_type}
                                size="small"
                                sx={{
                                  bgcolor: periodColor,
                                  color: '#fff',
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  fontSize: '0.7rem',
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                {period.article_count} {t('articles')}
                              </Typography>
                            </Box>

                            {/* Description */}
                            {period.description && (
                              <Typography variant="body2" color="text.secondary" dir="auto" sx={{ mb: 1 }}>
                                {period.description}
                              </Typography>
                            )}

                            {/* Key Events */}
                            {period.key_events && period.key_events.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                  {t('keyEvents')}
                                </Typography>
                                <List dense disablePadding sx={{ pl: 2 }}>
                                  {period.key_events.map((event, eIdx) => (
                                    <ListItem key={eIdx} disablePadding sx={{ py: 0.25 }}>
                                      <ListItemText
                                        primary={`\u2022 ${event}`}
                                        primaryTypographyProps={{
                                          variant: 'body2',
                                          dir: 'auto',
                                        }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}

                            {/* Evidence Quotes */}
                            {period.evidence && period.evidence.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                  {t('evidenceQuotes')}
                                </Typography>
                                {period.evidence.map((ev, evIdx) => (
                                  <Card
                                    key={evIdx}
                                    sx={{
                                      mt: 0.5,
                                      bgcolor: 'rgba(255,255,255,0.03)',
                                      borderLeft: 3,
                                      borderColor: 'primary.main',
                                    }}
                                  >
                                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                      <Typography variant="body2" dir="auto" sx={{ fontStyle: 'italic', mb: 0.5 }}>
                                        &ldquo;{ev.quote}&rdquo;
                                      </Typography>
                                      {ev.interpretation && (
                                        <Typography variant="caption" color="text.secondary" dir="auto" sx={{ display: 'block', mb: 0.5 }}>
                                          {ev.interpretation}
                                        </Typography>
                                      )}
                                      {ev.article_url && (
                                        <Link
                                          href={ev.article_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          variant="caption"
                                          sx={{ color: 'primary.light' }}
                                        >
                                          {ev.article_title || t('viewArticle')}
                                        </Link>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </Box>
                            )}

                            {/* Source Articles */}
                            {period.articles && period.articles.length > 0 && (
                              <Box>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                  {t('sourceArticles')}
                                </Typography>
                                <List dense disablePadding>
                                  {period.articles.map((article, aIdx) => (
                                    <ListItem key={aIdx} disablePadding sx={{ py: 0.25 }}>
                                      <ListItemText
                                        primary={
                                          article.url ? (
                                            <Link
                                              href={article.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              variant="body2"
                                              dir="auto"
                                              sx={{ color: 'primary.light' }}
                                            >
                                              {article.title || article.url}
                                            </Link>
                                          ) : (
                                            <Typography variant="body2" dir="auto">
                                              {article.title}
                                            </Typography>
                                          )
                                        }
                                        secondary={article.date || null}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Collapse>
          </Card>
        );
      })}

      {/* Entity Reference (shown when no relationship data) */}
      {!data && !loading && nodes.length === 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {t('noData')}
          </Typography>
        </Box>
      )}

      {data && nodes.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            {t('entities')}
          </Typography>
          <Grid container spacing={1.5}>
            {nodes.map((node, idx) => {
              const typeColor = ENTITY_COLORS[node.type] || '#616161';
              return (
                <Grid item xs={6} sm={4} md={3} key={idx}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" fontWeight={600}>
                        {node.name_en}
                      </Typography>
                      {node.name_ar && (
                        <Typography variant="body2" color="text.secondary" dir="rtl">
                          {node.name_ar}
                        </Typography>
                      )}
                      {node.type && (
                        <Chip
                          label={node.type.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                          sx={{
                            mt: 0.5,
                            borderColor: typeColor,
                            color: typeColor,
                            fontSize: '0.65rem',
                            textTransform: 'capitalize',
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
