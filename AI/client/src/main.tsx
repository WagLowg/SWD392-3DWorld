import { StrictMode, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import './styles/global.css';
import { AuthProvider, ToastProvider, useAuth } from './lib/app-state';
import { AppShell } from './components/AppShell';
import Login from './pages/Login';

const Studio = lazy(() => import('./pages/Studio'));
const Library = lazy(() => import('./pages/Library'));
const ExportPage = lazy(() => import('./pages/Export'));
const PrintPage = lazy(() => import('./pages/Print'));
const Credits = lazy(() => import('./pages/Credits'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

const Fallback = <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <h3>Không tìm thấy trang</h3>
        <p>Trang không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link className="btn primary" to="/studio">Về AI Studio</Link>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={Fallback}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route path="/" element={<Navigate to="/studio" replace />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/studio/:projectId" element={<Studio />} />
                <Route path="/models" element={<Library />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/export/:versionId" element={<ExportPage />} />
                <Route path="/print" element={<PrintPage />} />
                <Route path="/print/:versionId" element={<PrintPage />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
