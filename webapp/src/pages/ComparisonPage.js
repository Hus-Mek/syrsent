import React, { useState } from 'react';
import {
  Box, Typography, TextField, Card, CardContent, Grid, Chip, Stack,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { CompareArrows as CompareIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSourceComparison } from '../hooks/useApi';
import { SOURCE_CONFIG, SENTIMENT_COLORS, TREND_DISPLAY } from '../constants';
import SourceChipSelector from '../components/common/SourceChipSelector';
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

                {/* Source stat cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(targetData.sources).map(([sourceId, sourceData]) => {
                    const config = SOURCE_CONFIG[sourceId];
                    if (!config) return null;
                    const trend = TREND_DISPLAY[sourceData.trend] || TREND_DISPLAY.insufficient_data;
                    const sentColor = SENTIMENT_COLORS[sourceData.overall_sentiment] || '#9e9e9e';

                    return (
                      <Grid item xs={12} md={4} key={sourceId}>
                        <Card sx={{ borderTop: 3, borderColor: config.color }}>
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: config.color,
                                }}
                              />
                              <Typography variant="subtitle1" fontWeight={600}>
                                {language === 'ar' ? config.label_ar : config.label}
                              </Typography>
                            </Stack>
                            <Grid container spacing={1}>
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

                            {sourceData.key_themes?.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mt: 1.5 }}
                              >
                                {sourceData.key_themes.slice(0, 4).map((theme, i) => (
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
