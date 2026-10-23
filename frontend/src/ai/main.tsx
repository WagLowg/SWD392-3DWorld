import { StrictMode, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import './styles/global.css';
import { AuthProvider, ToastProvider, useAuth } from './lib/app-state';
import { AppShell } from './components/AppShell';
import { goLogin } from '../shared/auth';

const Studio = lazy(() => import('./pages/Studio'));
const Library = lazy(() => import('./pages/Library'));
const ExportPage = lazy(() => import('./pages/Export'));
const PrintPage = lazy(() => import('./pages/Print'));
const Credits = lazy(() => import('./pages/Credits'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // Đăng nhập dùng chung cho mọi module: chuyển sang /login/ rồi quay lại trang hiện tại
  useEffect(() => { if (!loading && !user) goLogin(); }, [loading, user]);
  if (loading || !user) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
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
        <BrowserRouter basename="/ai">
          <Suspense fallback={Fallback}>
            <Routes>
              <Route path="/login" element={<Navigate to="/studio" replace />} />
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
