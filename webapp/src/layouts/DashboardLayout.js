import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import TopAppBar from '../components/layout/TopAppBar';
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED } from '../components/layout/Sidebar';
import { useSourceStats } from '../hooks/useApi';

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: sourceStats } = useSourceStats();

  const currentWidth = isMobile ? 0 : (sidebarOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopAppBar
        onMenuClick={() => setMobileOpen(true)}
        sourceStats={sourceStats}
      />
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // account for fixed AppBar height
          width: { md: `calc(100% - ${currentWidth}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
