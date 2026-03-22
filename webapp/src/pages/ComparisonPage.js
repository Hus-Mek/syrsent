import React, { useState } from 'react';
import {
  Box, Typography, TextField, Card, CardContent, Grid, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails, Divider, Link,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  CompareArrows as CompareIcon, ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon, OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSourceComparison } from '../hooks/useApi';
import { SOURCE_CONFIG, SENTIMENT_COLORS, TREND_DISPLAY } from '../constants';
import { getScoreColor } from '../utils/chartConfig';
import SourceChipSelector from '../components/common/SourceChipSelector';
import SentimentBadge from '../components/common/SentimentBadge';
import ComparisonChart from '../components/charts/ComparisonChart';
import CoverageBarChart from '../components/charts/CoverageBarChart';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ErrorAlert from '../components/common/ErrorAlert';

import '../utils/chartConfig';

export default function ComparisonPage() {
  const { t, language } = useLanguage();
  const [targets, setTargets] = useState('');
  const [selectedSources, setSelectedSources] = useState(Object.keys(SOURCE_CONFIG));
  const { data: result, loading, error, execute } = useSourceComparison();

  const handleCompare = () => {
    const list = targets.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    execute(list, selectedSources);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        {t('sourceComparison')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('compareDesc')}
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label={t('targetEntities')}
            placeholder={t('targetPlaceholder')}
            value={targets}
            onChange={e => setTargets(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCompare()}
            inputProps={{ dir: 'auto' }}
            helperText={t('separateWithCommas')}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('sources')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <SourceChipSelector selected={selectedSources} onChange={setSelectedSources} />
          </Box>

          <LoadingButton
            variant="contained"
            loading={loading}
            onClick={handleCompare}
            disabled={!targets.trim()}
            startIcon={<CompareIcon />}
            size="large"
          >
            {t('compareSources')}
          </LoadingButton>
        </CardContent>
      </Card>

      <ErrorAlert message={error} />
      {loading && (
        <LoadingOverlay
          message={t('comparing')}
          submessage={t('mayTake')}
        />
      )}

      {/* Results */}
      {result?.targets && Object.entries(result.targets).map(([target, targetData]) => (
        <Card key={target} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={700} dir="auto" sx={{ mb: 2 }}>
              {target}
            </Typography>

            {Object.keys(targetData.sources || {}).length === 0 ? (
              <Typography color="text.secondary">{t('noData')}</Typography>
            ) : (
              <>
                {/* Comparison Chart */}
                <Box sx={{ mb: 3 }}>
                  <ComparisonChart targetData={targetData} />
                </Box>

                {/* High Disagreements Section */}
                {targetData.disagreements?.length > 0 && (
                  <Card sx={{ mb: 3, border: 1, borderColor: 'warning.dark' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <WarningIcon sx={{ color: 'warning.main' }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {t('disagreements')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('disagreementDesc')}
                      </Typography>
                      {targetData.disagreements.map((d, i) => (
                        <Box
                          key={i}
                          sx={{
                            py: 1.5,
                            borderBottom: i < targetData.disagreements.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip label={d.period} size="small" variant="outlined" />
                            <Chip
                              label={`${t('scoreGap')}: ${d.gap}`}
                              size="small"
                              sx={{ bgcolor: 'warning.dark', color: '#fff', fontWeight: 700 }}
                            />
                          </Stack>
                          <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                            {Object.entries(d.scores).map(([srcId, score]) => {
                              const srcConfig = SOURCE_CONFIG[srcId];
                              return (
                                <Stack key={srcId} direction="row" spacing={0.5} alignItems="center">
                                  <Box
                                    sx={{
                                      width: 8, height: 8, borderRadius: '50%',
                                      bgcolor: srcConfig?.color || '#666',
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {language === 'ar' ? (srcConfig?.label_ar || srcId) : (srcConfig?.label || srcId)}:
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: getScoreColor(score) }}>
                                    {score.toFixed(2)}
                                  </Typography>
                                </Stack>
                              );
                            })}
                          </Stack>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Source cards with evidence and reasoning */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(targetData.sources).map(([sourceId, sourceData]) => {
                    const config = SOURCE_CONFIG[sourceId];
                    if (!config) return null;
                    const trend = TREND_DISPLAY[sourceData.trend] || TREND_DISPLAY.insufficient_data;
                    const sentColor = SENTIMENT_COLORS[sourceData.overall_sentiment] || '#9e9e9e';

                    return (
                      <Grid item xs={12} key={sourceId}>
                        <Card sx={{ borderTop: 3, borderColor: config.color }}>
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                              <Box
                                sx={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  bgcolor: config.color,
                                }}
                              />
                              <Typography variant="subtitle1" fontWeight={600}>
                                {language === 'ar' ? config.label_ar : config.label}
                              </Typography>
                            </Stack>

                            {/* Stats row */}
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                              <Grid item xs={3}>
                                <Typography variant="h6" fontWeight={700}>
                                  {sourceData.total_articles}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('articles')}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="h6" fontWeight={700}>
                                  {sourceData.total_mentions}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('mentions')}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="h6" fontWeight={700} sx={{ color: sentColor }}>
                                  {sourceData.overall_score?.toFixed(2) || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('score')}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="h6" fontWeight={700}>
                                  {trend.icon}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t(sourceData.trend) || trend.label}
                                </Typography>
                              </Grid>
                            </Grid>

                            {/* Overall reasoning */}
                            {sourceData.reasoning && (
                              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                  {t('overallReasoning')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {sourceData.reasoning}
                                </Typography>
                              </Box>
                            )}

                            {/* Themes */}
                            {sourceData.key_themes?.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mb: 2 }}
                              >
                                {sourceData.key_themes.slice(0, 6).map((theme, i) => (
                                  <Chip
                                    key={i}
                                    label={theme}
                                    size="small"
                                    sx={{
                                      bgcolor: config.colorLight + '22',
                                      color: config.color,
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                ))}
                              </Stack>
                            )}

                            {/* Evidence Quotes */}
                            {sourceData.evidence?.length > 0 && (
                              <Accordion
                                disableGutters
                                sx={{ bgcolor: 'background.default', '&:before': { display: 'none' } }}
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {t('sourceEvidence')} ({sourceData.evidence.length})
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  {sourceData.evidence.map((ev, j) => {
                                    const evColor = ev.sentiment === 'positive'
                                      ? '#10b981'
                                      : ev.sentiment === 'negative'
                                        ? '#ef4444'
                                        : '#f59e0b';
                                    return (
                                      <Box
                                        key={j}
                                        sx={{
                                          py: 1,
                                          borderLeft: 3,
                                          borderColor: evColor,
                                          pl: 1.5,
                                          mb: 1,
                                        }}
                                      >
                                        <Typography variant="body2" dir="auto" sx={{ fontStyle: 'italic' }}>
                                          "{typeof ev === 'string' ? ev : ev.quote}"
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                          {ev.period && <Chip label={ev.period} size="small" variant="outlined" />}
                                          {ev.sentiment && <SentimentBadge sentiment={ev.sentiment} />}
                                        </Stack>
                                      </Box>
                                    );
                                  })}
                                </AccordionDetails>
                              </Accordion>
                            )}

                            {/* Period-by-period with articles */}
                            {sourceData.timeline?.length > 0 && (
                              <Accordion
                                disableGutters
                                sx={{ bgcolor: 'background.default', '&:before': { display: 'none' }, mt: 1 }}
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {t('periodAnalysis')} ({sourceData.timeline.length})
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  {sourceData.timeline.map((period, pi) => (
                                    <Box key={pi} sx={{ mb: 2 }}>
                                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Chip label={period.period} size="small" variant="outlined" />
                                        <SentimentBadge sentiment={period.sentiment} />
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          sx={{ color: getScoreColor(period.score) }}
                                        >
                                          {period.score?.toFixed(2)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {period.article_count} {t('articles')}
                                        </Typography>
                                      </Stack>
                                      {period.reasoning && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                          {period.reasoning}
                                        </Typography>
                                      )}
                                      {/* Article citations per period */}
                                      {period.articles?.map((art, ai) => (
                                        <Box
                                          key={ai}
                                          sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            py: 0.25, pl: 1,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: 4, height: 4, borderRadius: '50%',
                                              bgcolor: 'text.secondary', flexShrink: 0,
                                            }}
                                          />
                                          {art.url ? (
                                            <Link
                                              href={art.url}
                                              target="_blank"
                                              rel="noopener"
                                              underline="hover"
                                              color="primary.light"
                                              variant="caption"
                                              dir="auto"
                                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                            >
                                              {art.title || 'Untitled'}
                                              <OpenInNewIcon sx={{ fontSize: 10 }} />
                                            </Link>
                                          ) : (
                                            <Typography variant="caption" dir="auto">
                                              {art.title || 'Untitled'}
                                            </Typography>
                                          )}
                                        </Box>
                                      ))}
                                      {pi < sourceData.timeline.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                                    </Box>
                                  ))}
                                </AccordionDetails>
                              </Accordion>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Coverage bar chart */}
                {targetData.coverage_comparison && (
                  <Card>
                    <CardContent>
                      <CoverageBarChart
                        coverageData={Object.fromEntries(
                          Object.entries(targetData.sources).map(([id, d]) => [
                            id,
                            {
                              article_count: d.total_articles,
                              mention_count: d.total_mentions,
                            },
                          ])
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
