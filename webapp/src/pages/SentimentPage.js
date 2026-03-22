import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Card, CardContent, Grid, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ExpandMore as ExpandMoreIcon, Search as SearchIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSentimentAnalysis } from '../hooks/useApi';
import { SOURCE_CONFIG } from '../constants';
import { getScoreColor } from '../utils/chartConfig';
import SentimentLineChart from '../components/charts/SentimentLineChart';
import SentimentBadge from '../components/common/SentimentBadge';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ErrorAlert from '../components/common/ErrorAlert';
import StatCard from '../components/common/StatCard';

import '../utils/chartConfig';

export default function SentimentPage() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [targets, setTargets] = useState(searchParams.get('targets') || '');
  const [selectedSource, setSelectedSource] = useState(null);
  const { data: result, loading, error, execute } = useSentimentAnalysis();

  useEffect(() => {
    const urlTargets = searchParams.get('targets');
    if (urlTargets) {
      const list = urlTargets.split(',').map(t => t.trim()).filter(Boolean);
      if (list.length > 0) execute(list);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    const list = targets.split(',').map(t => t.trim()).filter(Boolean);
    if (list.length === 0) return;
    execute(list, selectedSource ? [selectedSource] : null);
  };

  const parseSentiment = () => {
    if (!result?.sentiment_analysis) return null;
    try {
      const parsed = typeof result.sentiment_analysis === 'string'
        ? JSON.parse(result.sentiment_analysis)
        : result.sentiment_analysis;
      if (parsed.error) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const sentiment = parseSentiment();

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        {t('sentimentAnalysis')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('analyzeDesc')}
      </Typography>

      {/* Input Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label={t('targetEntities')}
            placeholder={t('targetPlaceholder')}
            value={targets}
            onChange={e => setTargets(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            inputProps={{ dir: 'auto' }}
            helperText={t('separateWithCommas')}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('filterBySource')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip
              label={t('allSources')}
              variant={!selectedSource ? 'filled' : 'outlined'}
              color="primary"
              onClick={() => setSelectedSource(null)}
            />
            {Object.values(SOURCE_CONFIG).map(src => (
              <Chip
                key={src.id}
                label={language === 'ar' ? src.label_ar : src.label}
                variant={selectedSource === src.id ? 'filled' : 'outlined'}
                onClick={() => setSelectedSource(src.id)}
                sx={{
                  borderColor: src.color,
                  '&.MuiChip-filled': { bgcolor: src.color, color: '#fff' },
                }}
              />
            ))}
          </Stack>

          <LoadingButton
            variant="contained"
            loading={loading}
            onClick={handleAnalyze}
            disabled={!targets.trim()}
            startIcon={<SearchIcon />}
            size="large"
          >
            {t('analyzeSentiment')}
          </LoadingButton>
        </CardContent>
      </Card>

      <ErrorAlert message={error} />
      {loading && <LoadingOverlay message={t('runningAnalysis')} submessage={t('mayTake')} />}

      {/* Results */}
      {sentiment?.targets && Object.entries(sentiment.targets).map(([target, data]) => (
        <Card key={target} sx={{ mb: 3 }}>
          <CardContent>
            {/* Target Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Typography variant="h5" fontWeight={700} dir="auto" sx={{ flexGrow: 1 }}>
                {target}
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: getScoreColor(data.overall_score) }}>
                {data.overall_score?.toFixed(2) || 'N/A'}
              </Typography>
              <SentimentBadge sentiment={data.overall_sentiment} />
              <Chip label={data.trend} size="small" variant="outlined" />
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <StatCard label={t('articles')} value={data.total_articles} />
              </Grid>
              <Grid item xs={4}>
                <StatCard label={t('mentions')} value={data.total_mentions} />
              </Grid>
              <Grid item xs={4}>
                <StatCard label={t('periods')} value={data.periods_analyzed} />
              </Grid>
            </Grid>

            {/* Chart */}
            <Box sx={{ mb: 3 }}>
              <SentimentLineChart timeline={data.timeline} title={t('sentimentTimeline')} />
            </Box>

            {/* Key Themes */}
            {data.key_themes?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  {t('keyThemes')}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {data.key_themes.map((theme, i) => (
                    <Chip key={i} label={theme} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Period Analysis */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              {t('periodAnalysis')}
            </Typography>
            {data.timeline?.map((period, i) => (
              <Accordion
                key={i}
                disableGutters
                sx={{
                  bgcolor: 'background.default',
                  '&:before': { display: 'none' },
                  mb: 0.5,
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Typography fontWeight={600}>{period.period}</Typography>
                    <SentimentBadge sentiment={period.sentiment} />
                    <Typography
                      variant="body2"
                      sx={{ color: getScoreColor(period.score), ml: 'auto', mr: 2 }}
                    >
                      {period.score?.toFixed(2)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {period.article_count} {t('articles')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {period.mention_count} {t('mentions')}
                    </Typography>
                  </Stack>
                  {period.themes?.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      {period.themes.map((theme, j) => (
                        <Chip
                          key={j}
                          label={theme}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                        />
                      ))}
                    </Stack>
                  )}
                  {period.reasoning && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {period.reasoning}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}

            {/* Evidence */}
            {data.evidence?.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  {t('evidenceQuotes')}
                </Typography>
                {data.evidence.map((ev, i) => {
                  const sentColor = ev.sentiment === 'positive'
                    ? '#10b981'
                    : ev.sentiment === 'negative'
                      ? '#ef4444'
                      : '#f59e0b';
                  return (
                    <Card
                      key={i}
                      sx={{
                        mb: 1,
                        borderLeft: 4,
                        borderColor: sentColor,
                        bgcolor: 'background.default',
                      }}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" dir="auto" sx={{ fontStyle: 'italic' }}>
                          "{typeof ev === 'string' ? ev : ev.quote}"
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {ev.period && <Chip label={ev.period} size="small" variant="outlined" />}
                          {ev.sentiment && <SentimentBadge sentiment={ev.sentiment} />}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
