import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import getTheme from './theme';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SentimentPage from './pages/SentimentPage';
import ComparisonPage from './pages/ComparisonPage';
import CoveragePage from './pages/CoveragePage';
import RelationshipsPage from './pages/RelationshipsPage';

function AppContent() {
  const { direction, emotionCache } = useLanguage();
  const theme = React.useMemo(() => getTheme(direction), [direction]);

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="sentiment" element={<SentimentPage />} />
              <Route path="comparison" element={<ComparisonPage />} />
              <Route path="coverage" element={<CoveragePage />} />
              <Route path="relationships" element={<RelationshipsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
