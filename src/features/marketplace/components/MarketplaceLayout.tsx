import { Box, CheckCircle2, XCircle } from 'lucide-react'
import { type PropsWithChildren, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMarketplaceUiStore } from '../stores/marketplace-ui.store'
import { MarketplaceHeader } from './MarketplaceHeader'

export function MarketplaceLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const home = pathname === '/'

  // mỗi lần đổi trang thì cuộn lên đầu
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ chạy khi đổi trang
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div
      className={`flex min-h-screen flex-col ${home ? 'bg-surface' : 'bg-gradient-to-b from-[#FFF7EC] via-[#FFF2E5] to-[#FFE2CC]'}`}
    >
      <MarketplaceHeader />
      <main className="flex-1 pb-20 pt-28 md:pt-32">{children}</main>
      <MarketplaceFooter />
      <Toast />
    </div>
  )
}

function Toast() {
  const toast = useMarketplaceUiStore((s) => s.toast)
  const clear = useMarketplaceUiStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clear, 3600)
    return () => clearTimeout(t)
  }, [toast, clear])

  if (!toast) return null
  const ok = toast.tone === 'success'
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        key={toast.id}
        className="flex items-center gap-3 rounded-full bg-ink py-2.5 pl-5 pr-2.5 font-label text-sm font-semibold text-white shadow-lift animate-fade-up"
      >
        {ok ? <CheckCircle2 size={17} className="text-mint" /> : <XCircle size={17} className="text-peach" />}
        {toast.message}
        {toast.action ? (
          <Link to={toast.action.to} onClick={clear} className="rounded-full bg-orange px-3 py-1.5 text-xs">
            {toast.action.label}
          </Link>
        ) : (
          <span className="w-2" />
        )}
      </div>
    </div>
  )
}

const FOOTER = [
  {
    title: 'Khám Phá Suite',
    links: [
      { label: 'Chợ Đồ Chơi', to: '/' },
      { label: 'Tất cả vật phẩm', to: '/products' },
      { label: 'AI Studio', href: '/ai/' },
      { label: '3D Studio', href: '/studio/' },
    ],
  },
  {
    title: 'Mua Sắm',
    links: [
      { label: 'Giỏ hàng', to: '/cart' },
      { label: 'Đơn hàng của tôi', href: '/portal/orders' },
      { label: 'Đặt in theo yêu cầu', href: '/pod/' },
    ],
  },
  {
    title: 'Tài Khoản',
    links: [
      { label: 'Hồ sơ cá nhân', href: '/portal/profile' },
      { label: 'Thông báo', href: '/portal/notifications' },
      { label: 'Trang chủ 3DWorld', href: '/' },
    ],
  },
] as const

function MarketplaceFooter() {
  return (
    <footer className="bg-white/70 px-4 pb-8 pt-14 backdrop-blur md:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-[#8b6cff] text-white">
              <Box size={18} />
            </span>
            <span className="font-display text-xl font-bold">
              3D<span className="text-violet">World</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
            Nền tảng sáng tạo đồ chơi nghệ thuật 3D — tạo mô hình bằng AI, dựng trong 3D Studio và nhận sản phẩm in hoàn
            thiện tận tay.
          </p>
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-base font-bold">{col.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {col.links.map((l) => (
                <li key={l.label}>
                  {'to' in l ? (
                    <Link to={l.to} className="hover:text-violet">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="hover:text-violet">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-[1320px] flex-wrap justify-between gap-3 border-t border-line pt-6 font-label text-xs text-ink-soft">
        <span>© {new Date().getFullYear()} 3DWorld Marketplace. Tất cả quyền được bảo lưu.</span>
        <span>Múi giờ: Asia/Ho_Chi_Minh (UTC+7)</span>
      </div>
    </footer>
  )
}
