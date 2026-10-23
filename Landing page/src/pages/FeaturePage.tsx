import { Link, useLocation, useParams } from 'react-router-dom'
import { PRODUCTS } from '../config/content'
import { ROUTES } from '../config/routes'
import { Logo } from '../landing/ui/LandingNavigation'

const COPY: Record<string, { title: string; body: string; bg: string }> = {
  [ROUTES.aiStudio]: { title: 'AI Studio', body: 'Tải ảnh 2D và để AI dựng mô hình 3D.', bg: '#EEE8FF' },
  [ROUTES.studio3d]: { title: '3D Studio', body: 'Trình dựng mô hình 3D đơn giản ngay trên trình duyệt.', bg: '#EAFBF3' },
  [ROUTES.marketplace]: { title: 'Marketplace', body: 'Sản phẩm in 3D do 3DWorld thiết kế và sản xuất.', bg: '#FFF7EC' },
  [ROUTES.printOnDemand]: { title: 'Order Print', body: 'Tải mô hình, cấu hình, nhận báo giá và đặt in.', bg: '#EFF7FF' },
  [ROUTES.signIn]: { title: 'Sign In', body: 'Đăng nhập vào tài khoản 3DWorld.', bg: '#F8F7F4' },
}

/**
 * Placeholder destinations for the landing CTAs. In the full product these
 * routes are owned by the real feature modules — replace this component there.
 */
export default function FeaturePage() {
  const { pathname } = useLocation()
  const { slug } = useParams()
  const product = slug ? PRODUCTS.find((p) => p.slug === slug) : undefined
  const base = slug ? ROUTES.marketplace : pathname
  const c = COPY[base] ?? { title: 'Not found', body: 'Trang này không tồn tại.', bg: '#F8F7F4' }

  return (
    <main className="min-h-screen px-5 py-6" style={{ background: c.bg }}>
      <div className="mx-auto max-w-4xl">
        <Link to="/" aria-label="Về trang chủ">
          <Logo />
        </Link>
        <div className="mt-24">
          <span className="eyebrow rounded-full bg-white/70 px-3 py-1.5">Feature route · {pathname}</span>
          <h1 className="display mt-6 text-6xl font-bold sm:text-8xl">{product ? product.name : c.title}</h1>
          <p className="mt-5 max-w-lg text-lg text-ink-soft">{product ? product.description : c.body}</p>
          {product && (
            <p className="mt-3 font-nav text-sm font-semibold">
              {product.category} · {product.demoPrice} <span className="text-ink/50">(giá demo)</span>
            </p>
          )}
          <p className="mt-10 max-w-lg rounded-2xl bg-white/70 p-4 text-sm text-ink-soft ring-1 ring-black/5">
            Đây là trang đích tạm thời của bản landing demo. Khi tích hợp vào ứng dụng chính, route này được trỏ tới module tính năng thật (xem <code>src/config/routes.ts</code>).
          </p>
          <Link to="/" className="btn btn-primary mt-8">
            ← Back to 3DWorld
          </Link>
        </div>
      </div>
    </main>
  )
}
