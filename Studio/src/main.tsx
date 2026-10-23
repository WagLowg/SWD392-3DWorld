import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadFonts } from './fonts';
import './styles.css';
import './dashboard/dashboard.css';

const root = createRoot(document.getElementById('root')!);
root.render(<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#a6adbc' }}>Đang tải Studio…</div>);

loadFonts()
  .catch((e) => console.error('Font load failed', e))
  .finally(() => root.render(<StrictMode><App /></StrictMode>));
