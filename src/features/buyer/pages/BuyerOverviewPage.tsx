import { Bell, Boxes, Package, Undo2, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { useSession } from '../../../shared/session/useSession'
import { Btn, DataTable, Hero, Pill, Section, StatCard, StatGrid, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useMyModels } from '../../models/hooks/useModels'
import { OrderStatusBadge, orderCode } from '../../orders/components/OrderParts'
import { useMyOrders } from '../../orders/hooks/useOrders'
import { useWallet } from '../../wallet/hooks/useWallet'
import { useNotifications, useRefundCases } from '../hooks/useBuyer'
import { REFUND_STATUS } from '../lib/status'

/** MP 019 · Tổng Quan Người Mua — đơn hàng & mô hình dùng API thật; ví, hoàn tiền, thông báo là dữ liệu mẫu. */
export function BuyerOverviewPage() {
  const { data: user } = useSession()
  const orders = useMyOrders()
  const models = useMyModels(0, 4)
  const wallet = useWallet()
  const refunds = useRefundCases()
  const notes = useNotifications()

  useEffect(() => {
    document.title = 'Tổng quan tài khoản · 3DWorld'
  }, [])

  const list = [...(orders.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const active = list.filter((o) => ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status))
  const unread = (notes.data ?? []).filter((n) => !n.read).length

  return (
    <>
      <Hero
        code="MP 019"
        eyebrow="Tổng quan người mua"
        title={`Xin chào, ${user?.name ?? ''}`}
        accent="Trung Tâm Đơn Hàng, Ví & Mô Hình."
        actions={
          <>
            <Btn href="/marketplace/" variant="primary">
              Mua sắm
            </Btn>
            <Btn to="/notifications" variant="white" icon={Bell}>
              Thông báo {unread ? `(${unread})` : ''}
            </Btn>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Đơn đang xử lý" value={active.length} hint="API thật /api/orders/mine" icon={Package} tone="violet" to="/orders" />
        <StatCard label="Số dư ví khả dụng" value={wallet.data ? formatVnd(wallet.data.balances.available) : '—'} hint="Dữ liệu mẫu" icon={Wallet} tone="green" to="/wallet" />
        <StatCard
          label="Hoàn tiền đang xử lý"
          value={(refunds.data ?? []).filter((r) => r.status === 'PENDING_STAFF' || r.status === 'NEEDS_EVIDENCE').length}
          hint="Dữ liệu mẫu"
          icon={Undo2}
          tone="orange"
          to="/refunds"
        />
        <StatCard label="Mô hình 3D" value={models.data?.totalElements ?? '—'} hint="API thật /api/models/my" icon={Boxes} tone="teal" to="/models" />
      </StatGrid>

      <Section title="Đơn hàng vật lý gần đây" className="mt-6" aside={<Btn to="/orders" size="sm">Tất cả đơn</Btn>}>
        <QueryState isLoading={orders.isLoading} error={orders.error}>
          {list.length ? (
            <DataTable
              rows={list.slice(0, 5)}
              rowKey={(o) => o.id}
              columns={[
                { key: 'id', header: 'Mã đơn / xưởng', render: (o) => <Link to={`/orders/${o.id}`} className="font-display font-bold hover:text-violet">{orderCode(o.id)} · Xưởng #{o.storefrontId}</Link> },
                { key: 'n', header: 'Vật phẩm', render: (o) => `${o.items.length} món` },
                { key: 'v', header: 'Giá trị', render: (o) => <strong>{formatVnd(o.totalAmount)}</strong> },
                { key: 's', header: 'Trạng thái', render: (o) => <OrderStatusBadge status={o.status} /> },
                { key: 'd', header: 'Đặt lúc', render: (o) => <span className="text-xs">{formatDateTime(o.createdAt)}</span> },
              ]}
            />
          ) : (
            <p className="text-sm text-ink-soft">Chưa có giao dịch nào. Khám phá Chợ Đồ Chơi để đặt món đầu tiên.</p>
          )}
        </QueryState>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Hoàn tiền & tranh chấp" aside={<Pill tone="violet">Dữ liệu mẫu</Pill>}>
          <ul className="space-y-2">
            {(refunds.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface-low p-3 text-sm">
                <Link to={`/refunds/${r.id}`} className="font-semibold hover:text-violet">
                  {r.id} · {r.product}
                </Link>
                <StatusPill status={r.status} map={REFUND_STATUS} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Thông báo mới" aside={<Btn to="/notifications" size="sm">Xem tất cả</Btn>}>
          <ul className="space-y-2">
            {(notes.data ?? []).slice(0, 4).map((n) => (
              <li key={n.id} className={`rounded-2xl p-3 text-sm ${n.read ? 'bg-surface-low' : 'bg-violet-soft/40'}`}>
                <p className="font-semibold">{n.title}</p>
                <p className="text-xs text-ink-soft">{formatDateTime(n.at)}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
