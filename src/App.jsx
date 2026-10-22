import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ThemeProvider from './providers/ThemeProvider';
import { BrandLoader } from './components/ui/Loading';

// El portal (login, panel clínico y de plataforma) se descarga solo al visitarlo.
const PortalRoutes = lazy(() => import('./PortalRoutes'));

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<BrandLoader fullscreen label="Cargando SmartDental" />}>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Portal routes (auth, toasts and clinic pages) */}
            <Route path="/*" element={<PortalRoutes />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
