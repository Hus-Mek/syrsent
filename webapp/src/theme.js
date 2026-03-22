import { createTheme } from '@mui/material/styles';

const getTheme = (direction = 'ltr') => createTheme({
  direction,
  palette: {
    mode: 'dark',
    primary: { main: '#1a5490', light: '#4a7fc0', dark: '#0d3a66' },
    secondary: { main: '#2c8c99', light: '#5cb8c4' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#0f1215', paper: '#1a1e24' },
    text: { primary: '#e8eaed', secondary: '#9aa0a6' },
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans Arabic', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#141820',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default getTheme;
