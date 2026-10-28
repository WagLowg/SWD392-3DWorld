import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadFonts } from './lib/fonts';
import { fetchMe, goLogin } from '../../shared/session/session';
import { setSessionUser } from './session';
import './studio.css';
import './dashboard/dashboard.css';

const root = createRoot(document.getElementById('root')!);
root.render(<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#a6adbc' }}>Đang tải Studio…</div>);

// Studio cần đăng nhập (dự án lưu theo tài khoản trên server)
fetchMe().then((user) => {
  if (!user) { goLogin(); return; }
  setSessionUser(user);
  loadFonts()
    .catch((e) => console.error('Font load failed', e))
    .finally(() => root.render(<StrictMode><App /></StrictMode>));
});
