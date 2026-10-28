import { Box, Clock3, Layers, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MODULES } from '../../../shared/config/modules'

/** Khung chung MP 005–009: header gọn, cột trái là form, cột phải là thẻ trưng bày. */
export function AuthLayout({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string
  title: string
  accent: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#FFF7EC] via-[#FFF2E5] to-[#FFE2CC] font-body text-ink antialiased">
      <header className="px-3 pt-3 sm:px-6 md:pt-4">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 rounded-full bg-white/85 px-3 shadow-soft backdrop-blur-xl sm:px-5">
          <a href="/" className="flex items-center gap-2" aria-label="3DWorld">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-[#8b6cff] text-white">
              <Box size={18} />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              3D<span className="text-violet">World</span>
            </span>
          </a>
          <nav aria-label="Module" className="hidden items-center gap-1 rounded-full bg-surface-low p-1 md:flex">
            {MODULES.map((m) => (
              <a
                key={m.id}
                href={m.href}
                className="rounded-full px-4 py-2 font-label text-sm font-semibold text-ink-soft hover:text-ink"
              >
                {m.id === 'marketplace' ? 'Chợ Đồ Chơi' : m.id === 'pod' ? 'Đặt In 3D' : m.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden px-3 font-label text-sm font-semibold text-ink-soft hover:text-ink sm:block">
              Đăng Nhập
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-ink px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-violet"
            >
              Đăng Ký
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest shadow-soft">
            <span className="h-2 w-2 rounded-full bg-orange" /> {eyebrow}
          </span>
          <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
            {title}
            <span className="block text-orange">{accent}</span>
          </h1>
          <div className="mt-8 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">{children}</div>
        </div>
        <Showcase />
      </main>

      <footer className="px-4 pb-6 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-label text-xs text-ink-soft">
          <span>© {new Date().getFullYear()} 3DWorld. Một tài khoản cho cả thế giới 3D của bạn.</span>
          <span>Asia/Ho_Chi_Minh (UTC+7)</span>
        </div>
      </footer>
    </div>
  )
}

function Showcase() {
  return (
    <aside className="hidden animate-fade-up rounded-[2.5rem] bg-white/90 p-5 shadow-lift [animation-delay:120ms] lg:block">
      <div className="flex items-center justify-between font-label text-[11px] font-semibold">
        <span className="rounded-full bg-violet-soft px-3 py-1 text-violet">Một tài khoản · 4 module</span>
        <span className="text-ink-soft">3DWorld</span>
      </div>
      <div className="mt-4 grid aspect-[4/3] place-items-center rounded-[2rem] bg-gradient-to-br from-violet-soft via-peach to-mint">
        <div className="grid place-items-center">
          <div className="grid h-24 w-24 place-items-center rounded-[1.75rem] bg-white/85 text-violet shadow-soft">
            <Sparkles size={40} strokeWidth={1.5} />
          </div>
          <div className="mt-4 h-4 w-32 rounded-[50%] bg-ink/10 blur-[2px]" />
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {[
          { icon: Sparkles, title: 'AI Studio', body: 'Tạo mô hình 3D từ ảnh hoặc mô tả.' },
          { icon: Layers, title: '3D Studio & Thư viện', body: 'Dựng, lưu phiên bản và tải tệp mô hình.' },
          { icon: ShieldCheck, title: 'Chợ Đồ Chơi', body: 'Mua vật phẩm in 3D, thanh toán ZaloPay / COD.' },
          { icon: Clock3, title: 'Đặt In 3D', body: 'Gửi mô hình, nhận sản phẩm in tận tay.' },
        ].map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl bg-surface-low p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-violet">
              <Icon size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-ink-soft">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
