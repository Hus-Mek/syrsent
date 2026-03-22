import React from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Button, Chip, Box, Stack,
} from '@mui/material';
import { Menu as MenuIcon, Translate as TranslateIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { SOURCE_CONFIG } from '../../constants';

export default function TopAppBar({ onMenuClick, sourceStats }) {
  const { t, language, toggleLanguage } = useLanguage();

  const sourceEntries = sourceStats
    ? Object.values(SOURCE_CONFIG).map((cfg) => {
        const match = sourceStats.sources?.find((s) => s.id === cfg.id);
        return {
          id: cfg.id,
          label: language === 'ar' ? cfg.label_ar : cfg.label,
          color: cfg.color,
          count: match ? match.article_count : 0,
        };
      })
    : [];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(135deg, #141820 0%, #1a2332 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left section: menu icon (mobile) + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.5px',
              background: 'linear-gradient(135deg, #90caf9, #ce93d8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SyrSent
          </Typography>
        </Box>

        {/* Center section: source stats chips (hidden on mobile) */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
          }}
        >
          {sourceStats && sourceEntries.map((source) => (
            <Chip
              key={source.id}
              size="small"
              avatar={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: source.color,
                  }}
                />
              }
              label={`${source.label}: ${source.count.toLocaleString()}`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.06)',
                color: 'text.secondary',
                fontSize: '0.75rem',
                '& .MuiChip-avatar': {
                  width: 8,
                  height: 8,
                  ml: '8px',
                },
              }}
            />
          ))}
          {sourceStats && (
            <Chip
              size="small"
              label={`${t('total')}: ${sourceStats.total_articles?.toLocaleString() ?? 0}`}
              sx={{
                bgcolor: 'rgba(144,202,249,0.1)',
                color: 'primary.light',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
          )}
        </Stack>

        {/* Right section: language toggle */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<TranslateIcon />}
          onClick={toggleLanguage}
          sx={{
            color: 'text.secondary',
            borderColor: 'rgba(255,255,255,0.12)',
            textTransform: 'none',
            minWidth: 64,
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.3)',
              bgcolor: 'rgba(255,255,255,0.04)',
            },
          }}
        >
          {language === 'ar' ? 'EN' : 'AR'}
        </Button>
      </Toolbar>
    </AppBar>
  );
}
