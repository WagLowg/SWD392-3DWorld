import { Fragment, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { dateTime, num } from '../lib/format';
import { useAuth, useToast } from '../lib/app-state';
import { useCrumb } from '../components/AppShell';
import { Empty } from '../components/ui';

const TYPE_LABEL: Record<string, string> = {
  GRANT: 'Tặng', TOPUP: 'Nạp', HOLD: 'Giữ cho tác vụ', RELEASE: 'Hoàn', SETTLE: 'Đã tính phí',
};
const PRICES = [
  ['Meshy 7.1 · Chỉ Mesh', 20], ['Meshy 7.1 · Mesh + Texture 2K/4K', 30], ['Meshy 7.1 · Texture 8K', 35],
  ['Meshy 6 Lite · Chỉ Mesh', 5], ['Meshy 6 Lite · Mesh + Texture', 15], ['Hình học 2K/4K (cộng thêm)', 5],
] as const;

export default function Credits() {
  useCrumb(<><span>Tài khoản</span><span>/</span><b>Tín dụng</b></>);
  const { wallet, refreshWallet } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { refreshWallet(); }, [refreshWallet]);

  const topup = async (amount: number) => {
    setBusy(amount);
    try {
      await api('/api/ai-studio/wallet/topup', { body: { amount } });
      toast('success', `Đã nạp ${amount} tín dụng (demo)`);
      refreshWallet();
    } catch (e) { toast('error', 'Không nạp được', (e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="page">
      <div className="page-head"><div><h1>Tín dụng & sử dụng</h1><p>Tín dụng AI dùng cho tạo mô hình. Chi phí in 3D được thanh toán riêng.</p></div></div>
      <div className="stat-grid">
        <div className="stat"><span>Số dư khả dụng</span><b style={{ color: 'var(--primary)' }}>{num(wallet?.balance)}</b></div>
        <div className="stat"><span>Đang giữ cho tác vụ</span><b>{num(wallet?.held)}</b></div>
        <div className="stat"><span>Đã sử dụng</span><b>{num(wallet?.spent)}</b></div>
      </div>
      <div className="two-col">
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 20px 4px' }}><h3>Lịch sử giao dịch</h3><p className="sub">Sổ cái tín dụng phía máy chủ — mỗi tác vụ chỉ giữ, hoàn hoặc tính phí một lần.</p></div>
          {wallet && wallet.ledger.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Thời gian</th><th>Loại</th><th>Nội dung</th><th style={{ textAlign: 'right' }}>Tín dụng</th></tr></thead>
                <tbody>
                  {wallet.ledger.map((l) => (
                    <tr key={l.id}>
                      <td className="muted">{dateTime(l.createdAt)}</td>
                      <td>{TYPE_LABEL[l.type] || l.type}</td>
                      <td className="muted">{l.note}{l.projectTitle ? ` · ${l.projectTitle}` : ''}</td>
                      <td className="num" style={{ color: l.amount > 0 ? 'var(--success)' : l.amount < 0 ? 'var(--text)' : 'var(--muted)' }}>{l.amount > 0 ? '+' : ''}{l.amount === 0 ? '—' : num(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={<Plus />} title="Chưa có giao dịch" />}
        </div>
        <div className="stack lg">
          <div className="card">
            <h3>Nạp thêm tín dụng</h3>
            <p className="sub">Bản demo: chưa tích hợp cổng thanh toán, nạp trực tiếp để thử nghiệm.</p>
            <div className="pkg-grid">
              {[100, 500, 1000].map((a) => (
                <button key={a} className="btn outline" style={{ height: 64, flexDirection: 'column', gap: 0 }} onClick={() => topup(a)} disabled={busy !== null}>
                  {busy === a ? <span className="spinner" /> : <><b style={{ fontSize: 18 }}>+{num(a)}</b><span className="muted small">tín dụng</span></>}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Bảng giá tạo mô hình</h3>
            <p className="sub">Giá được máy chủ tính lại trước mỗi lần tạo.</p>
            <dl className="kv">
              {PRICES.map(([l, c]) => <Fragment key={l}><dt>{l}</dt><dd style={{ textAlign: 'right' }}>{c}</dd></Fragment>)}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
