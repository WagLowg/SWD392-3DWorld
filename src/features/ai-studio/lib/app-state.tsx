import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { authEvents, type ConfigOptions, type User, type Wallet } from './api';
import { aiStudio } from './backend';
import { fetchMe, logout as logoutSession } from '../../../shared/session/session';

// ---------------- Toasts ----------------
type ToastKind = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; kind: ToastKind; title: string; text?: string };
type ToastFn = (kind: ToastKind, title: string, text?: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback<ToastFn>((kind, title, text) => {
    const id = ++seq.current;
    setItems((x) => [...x.slice(-3), { id, kind, title, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4500);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className={`toast ${t.kind}`}>
              <I size={18} style={{ flex: 'none', marginTop: 1 }} />
              <div><b>{t.title}</b>{t.text && <span className="muted">{t.text}</span>}</div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Auth + ví ----------------
type AuthState = {
  user: User | null;
  loading: boolean;
  provider: ConfigOptions['provider'] | null;
  wallet: Wallet | null;
  refreshWallet: () => Promise<void>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
};
const AuthCtx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ConfigOptions['provider'] | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;

    fetchMe()
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Nhà cung cấp AI đọc từ config-options; lỗi không được chặn phiên đăng nhập hay treo toàn màn hình.
    aiStudio
      .configOptions()
      .then((o) => {
        if (active) setProvider(o.provider);
      })
      .catch(() => {
        if (active) setProvider(null);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      toast('warning', 'Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại.');
    };
    // Báo một lần mỗi lần mở trang, không đăng xuất người dùng.
    let warned = false;
    const onAiUnauthorized = () => {
      if (warned) return;
      warned = true;
      toast(
        'warning',
        'Máy chủ từ chối một yêu cầu AI Studio',
        'Bạn vẫn đăng nhập bình thường. Thử lại sau hoặc báo lỗi Backend nếu lặp lại.',
      );
    };
    authEvents.addEventListener('expired', onExpired);
    authEvents.addEventListener('ai-unauthorized', onAiUnauthorized);
    return () => {
      authEvents.removeEventListener('expired', onExpired);
      authEvents.removeEventListener('ai-unauthorized', onAiUnauthorized);
    };
  }, [toast]);

  const refreshWallet = useCallback(async () => {
    try { setWallet(await aiStudio.wallet()); } catch { /* bỏ qua */ }
  }, []);
  useEffect(() => { if (user) refreshWallet(); else setWallet(null); }, [user, refreshWallet]);

  const logout = useCallback(async () => {
    await logoutSession('/');
  }, []);

  const value = useMemo(() => ({ user, loading, provider, wallet, refreshWallet, setUser, logout }), [user, loading, provider, wallet, refreshWallet, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ---------------- Online/offline (BR-19) ----------------
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
