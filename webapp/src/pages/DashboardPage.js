import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Grid, Card, CardContent,
  CardActionArea, Chip, Stack, Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  BarChart as BarChartIcon,
  CompareArrows as CompareArrowsIcon,
  Explore as ExploreIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSourceStats } from '../hooks/useApi';
import { SOURCE_CONFIG } from '../constants';

const SUGGESTED = ['\u0627\u0644\u0623\u0633\u062f', '\u0647\u062a\u0634', '\u062a\u0631\u0643\u064a\u0627', '\u0631\u0648\u0633\u064a\u0627', '\u0625\u064a\u0631\u0627\u0646', '\u062d\u0632\u0628 \u0627\u0644\u0644\u0647', '\u0627\u0644\u062c\u0648\u0644\u0627\u0646\u064a'];

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: sourceStats, loading } = useSourceStats();
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    if (search.trim()) navigate(`/coverage?target=${encodeURIComponent(search.trim())}`);
  };

  const quickActions = [
    { path: '/sentiment', labelKey: 'sentimentAnalysis', descKey: 'analyzeDesc', icon: <BarChartIcon sx={{ fontSize: 40, color: 'primary.main' }} /> },
    { path: '/comparison', labelKey: 'sourceComparison', descKey: 'compareDesc', icon: <CompareArrowsIcon sx={{ fontSize: 40, color: 'secondary.main' }} /> },
    { path: '/coverage', labelKey: 'coverageExplorer', descKey: 'coverageDesc', icon: <ExploreIcon sx={{ fontSize: 40, color: '#f59e0b' }} /> },
    { path: '/relationships', labelKey: 'relationshipMap', descKey: 'relationshipsDesc', icon: <AccountTreeIcon sx={{ fontSize: 40, color: '#10b981' }} /> },
  ];

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
        <Typography variant="h2" fontWeight={800} sx={{
          background: 'linear-gradient(135deg, #4a7fc0, #5cb8c4)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1,
        }}>
          {t('appTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('appSubtitle')}
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            inputProps={{ dir: 'auto' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
          />
        </Box>
      </Box>

      {/* Source Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))
        ) : sourceStats?.sources?.map(src => {
          const config = SOURCE_CONFIG[src.id];
          return (
            <Grid item xs={12} sm={4} key={src.id}>
              <Card sx={{ borderTop: 3, borderColor: config?.color || src.color }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {language === 'ar' ? config?.label_ar : config?.label || src.name}
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {src.article_count?.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('articles')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" sx={{ mb: 2 }}>{t('quickActions')}</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickActions.map(action => (
          <Grid item xs={12} sm={6} md={3} key={action.path}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardActionArea onClick={() => navigate(action.path)} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ mb: 1 }}>{action.icon}</Box>
                <Typography variant="subtitle1" fontWeight={600}>{t(action.labelKey)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t(action.descKey)}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Suggested Searches */}
      <Typography variant="h6" sx={{ mb: 2 }}>{t('suggestedSearches')}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {SUGGESTED.map(term => (
          <Chip
            key={term}
            label={term}
            variant="outlined"
            onClick={() => navigate(`/coverage?target=${encodeURIComponent(term)}`)}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
          />
        ))}
      </Stack>
    </Box>
  );
}
