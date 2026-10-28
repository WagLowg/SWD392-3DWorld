import { AlertTriangle, ArrowRight, Boxes, Hammer, Package, ShieldAlert, Store, Truck, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatVnd } from '../../../shared/format'
import { Btn, Hero, Pill, Section, StatCard, StatGrid, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useSellerOrders } from '../../orders/hooks/useOrders'
import { useEarnings, useSellerProducts, useStorefront, useSubscription } from '../hooks/useSeller'
import { PRODUCT_STATUS, STOREFRONT_STATUS } from '../lib/status'

/** MP 041 · Tổng Quan Kênh Người Bán */
export function SellerDashboardPage() {
  const products = useSellerProducts()
  const earnings = useEarnings()
  const storefront = useStorefront()
  const sub = useSubscription()
  const orders = useSellerOrders()

  useEffect(() => {
    document.title = 'Bảng điều khiển xưởng · 3DWorld'
  }, [])

  const waiting = (orders.data ?? []).filter((o) => o.status === 'PAID').length
  const lowStock = (products.data ?? []).flatMap((p) => p.variants).filter((v) => v.active && v.stock - v.reserved < 5)
  const w = earnings.data?.wallet

  return (
    <>
      <Hero
        code="MP 041"
        eyebrow="Kênh người bán"
        title="Bảng Điều Khiển Xưởng"
        accent="Tổng Quan Hoạt Động & Doanh Thu."
        description="Theo dõi đơn chờ chế tác, sản phẩm, tồn kho, tranh chấp và dòng tiền ký quỹ của xưởng."
        actions={
          <>
            <Btn to="/seller/products/new" variant="primary" icon={Package}>
              Đăng sản phẩm
            </Btn>
            <Btn to="/bank-accounts" variant="white" icon={Wallet}>
              Tài khoản nhận tiền
            </Btn>
          </>
        }
      />

      {waiting > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.75rem] bg-peach/60 p-4 text-sm">
          <AlertTriangle size={18} className="text-orange-deep" />
          <span className="flex-1">
            Có <strong>{waiting}</strong> đơn đã thanh toán đang chờ xưởng tiếp nhận chế tác.
          </span>
          <Btn to="/seller/orders?status=making" size="sm" variant="primary">
            Xử lý ngay
          </Btn>
        </div>
      )}

      <StatGrid>
        <StatCard label="Khả dụng" value={w ? formatVnd(w.available) : '—'} hint="Có thể rút về ngân hàng" icon={Wallet} tone="green" to="/seller/revenue" />
        <StatCard label="Chờ mở khoá 72h" value={w ? formatVnd(w.pending) : '—'} hint="Sau cửa sổ khiếu nại" icon={ShieldAlert} tone="orange" />
        <StatCard label="Đơn chờ tiếp nhận" value={waiting} hint="Đơn đã thanh toán (API thật)" icon={Hammer} tone="violet" to="/seller/orders" />
        <StatCard label="Tạm giữ / chờ chi" value={w ? formatVnd(w.held) : '—'} hint="Số dư payout hold từ backend" icon={AlertTriangle} tone="danger" to="/seller/revenue" />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Section title="Sản phẩm vật lý" aside={<Btn to="/seller/products" size="sm" icon={ArrowRight}>Tất cả</Btn>}>
          <QueryState isLoading={products.isLoading} error={products.error}>
            <ul className="space-y-2">
              {(products.data ?? []).slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface-low p-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-violet">
                    <Boxes size={18} />
                  </span>
                  <Link to={`/seller/products/${p.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-violet">
                    {p.title}
                  </Link>
                  <StatusPill status={p.status} map={PRODUCT_STATUS} />
                </li>
              ))}
            </ul>
          </QueryState>
        </Section>

        <div className="space-y-6">
          <Section title="Gian hàng & gói">
            {storefront.data && sub.data && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-violet text-white">
                    <Store size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold">{storefront.data.name}</p>
                    <p className="text-xs text-ink-soft">
                      {storefront.data.expiresAt
                        ? `Gói đến ${new Date(storefront.data.expiresAt).toLocaleDateString('vi-VN')}`
                        : 'Chưa kích hoạt gói'}
                    </p>
                  </div>
                  <StatusPill status={sub.data.subscription.status} map={STOREFRONT_STATUS} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn to="/seller/storefront" size="sm">
                    Hồ sơ gian hàng
                  </Btn>
                  <Btn to="/seller/subscription" size="sm" variant="orange">
                    Gia hạn gói
                  </Btn>
                </div>
              </div>
            )}
          </Section>

          <Section title="Giám sát rủi ro tồn kho">
            {lowStock.length ? (
              <ul className="space-y-2 text-sm">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-2xl bg-surface-low px-3 py-2">
                    <code className="text-xs">{v.sku}</code>
                    <Pill tone="danger">Còn {v.stock - v.reserved}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Không có biến thể sắp hết kho.</p>
            )}
            <div className="mt-3 flex gap-2">
              <Btn to="/seller/inventory" size="sm" icon={Package}>
                Quản lý tồn kho
              </Btn>
              <Btn to="/seller/shipments" size="sm" icon={Truck}>
                Vận đơn
              </Btn>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}
