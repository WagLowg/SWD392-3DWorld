import {
  AlarmClock,
  ChevronDown,
  CircleDollarSign,
  CircleSlash,
  Clock3,
  Hourglass,
  Search,
  Store,
  Wallet,
} from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { formatDate, formatDateTime, formatVnd } from '../../../shared/lib/format'
import { QueryState } from '../../../shared/ui/QueryState'
import {
  type AdminStorefrontRow,
  type PlanStatus,
  type ShopStatus,
  type StorefrontSort,
  useAdminStorefrontSubscriptions,
  useAdminStorefronts,
} from '../services/admin-storefront.service'

const PLAN_META: Record<PlanStatus, { label: string; tone: string; dot: string }> = {
  ACTIVE: { label: 'Đang thuê', tone: 'bg-[#e3f8ea] text-[#15783e]', dot: 'bg-[#15783e]' },
  EXPIRED: { label: 'Hết hạn', tone: 'bg-[#ffe8e5] text-[#b42318]', dot: 'bg-[#b42318]' },
  PENDING_PAYMENT: { label: 'Chờ thanh toán', tone: 'bg-[#fff0df] text-[#b45309]', dot: 'bg-[#d96017]' },
  NONE: { label: 'Chưa thuê gói', tone: 'bg-[#f1f0f5] text-ink-soft', dot: 'bg-ink-soft' },
}

const SHOP_META: Record<ShopStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'text-[#15783e]' },
  INACTIVE: { label: 'Chưa kích hoạt', tone: 'text-ink-soft' },
  SUSPENDED: { label: 'Bị tạm ngưng', tone: 'text-[#b42318]' },
}

const SUB_STATUS: Record<string, string> = {
  ACTIVE: 'Đã thanh toán',
  PENDING_PAYMENT: 'Chờ thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã huỷ',
}

const SELECT =
  'rounded-2xl border border-line bg-[#faf9ff] px-4 py-3 text-sm font-semibold outline-none focus:border-violet'

export function StorefrontPlansPanel() {
  const [term, setTerm] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<ShopStatus | ''>('')
  const [plan, setPlan] = useState<PlanStatus | ''>('')
  const [sort, setSort] = useState<StorefrontSort>('newest')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [open, setOpen] = useState<number | null>(null)

  // chờ người dùng ngừng gõ rồi mới gọi API
  useEffect(() => {
    const t = window.setTimeout(() => {
      setKeyword(term.trim())
      setPage(0)
    }, 350)
    return () => window.clearTimeout(t)
  }, [term])

  const query = useAdminStorefronts({ keyword, status, plan, sort, page, size })
  const data = query.data
  const summary = data?.summary
  const rows = data?.items ?? []
  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const hasFilters = !!keyword || !!status || !!plan || sort !== 'newest'

  const pick = (next: PlanStatus | '') => {
    setPlan((cur) => (cur === next ? '' : next))
    setPage(0)
  }

  return (
    <section className="space-y-5" aria-label="Gian hàng và gói thuê">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Store}
          label="Tổng gian hàng"
          value={summary?.total}
          detail={summary ? `${summary.suspended} bị tạm ngưng` : ' '}
          tone="bg-[#eee8ff] text-violet"
          active={plan === ''}
          onClick={() => pick('')}
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Đang thuê gói"
          value={summary?.active}
          detail={summary ? `${summary.expiringSoon} hết hạn trong 7 ngày` : ' '}
          tone="bg-[#e3f8ea] text-[#15783e]"
          active={plan === 'ACTIVE'}
          onClick={() => pick('ACTIVE')}
        />
        <SummaryCard
          icon={AlarmClock}
          label="Đã hết hạn"
          value={summary?.expired}
          detail="Cần gia hạn để bán tiếp"
          tone="bg-[#ffe8e5] text-[#b42318]"
          active={plan === 'EXPIRED'}
          onClick={() => pick('EXPIRED')}
        />
        <SummaryCard
          icon={Hourglass}
          label="Chờ thanh toán"
          value={summary?.pendingPayment}
          detail="Đã tạo gói, chưa trả tiền"
          tone="bg-[#fff0df] text-[#d96017]"
          active={plan === 'PENDING_PAYMENT'}
          onClick={() => pick('PENDING_PAYMENT')}
        />
        <SummaryCard
          icon={CircleSlash}
          label="Chưa thuê gói"
          value={summary?.none}
          detail={data ? `Giá gói hiện tại ${formatVnd(data.currentMonthlyFee)}` : ' '}
          tone="bg-[#f1f0f5] text-ink-soft"
          active={plan === 'NONE'}
          onClick={() => pick('NONE')}
        />
      </div>

      <div className="rounded-[1.75rem] border border-line bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_repeat(3,auto)]">
          <label className="relative min-w-0">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm theo mã, tên gian hàng, chủ shop, email, SĐT…"
              className="w-full rounded-2xl border border-line bg-[#faf9ff] py-3 pl-11 pr-4 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/10"
            />
          </label>
          <select
            aria-label="Lọc trạng thái gói"
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as PlanStatus | '')
              setPage(0)
            }}
            className={SELECT}
          >
            <option value="">Mọi tình trạng gói</option>
            <option value="ACTIVE">Đang thuê</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán</option>
            <option value="NONE">Chưa thuê gói</option>
          </select>
          <select
            aria-label="Lọc trạng thái gian hàng"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ShopStatus | '')
              setPage(0)
            }}
            className={SELECT}
          >
            <option value="">Mọi trạng thái shop</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Chưa kích hoạt</option>
            <option value="SUSPENDED">Bị tạm ngưng</option>
          </select>
          <select
            aria-label="Sắp xếp"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as StorefrontSort)
              setPage(0)
            }}
            className={SELECT}
          >
            <option value="newest">Mới tạo trước</option>
            <option value="oldest">Cũ trước</option>
            <option value="expiring">Sắp hết hạn trước</option>
            <option value="revenue">Đã trả nhiều nhất</option>
            <option value="name">Tên A → Z</option>
          </select>
        </div>

        {hasFilters && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[#f8f7fc] px-4 py-3 text-xs text-ink-soft">
            <span>Tìm thấy {data?.totalElements ?? 0} gian hàng theo bộ lọc hiện tại.</span>
            <button
              type="button"
              onClick={() => {
                setTerm('')
                setKeyword('')
                setStatus('')
                setPlan('')
                setSort('newest')
                setPage(0)
              }}
              className="font-bold text-violet hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
          <div className={query.isFetching && !query.isLoading ? 'opacity-60 transition' : 'transition'}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[.08em] text-ink-soft">
                    <th className="border-b border-line px-4 py-3">Gian hàng</th>
                    <th className="border-b border-line px-4 py-3">Chủ sở hữu</th>
                    <th className="border-b border-line px-4 py-3">Gói đang thuê</th>
                    <th className="border-b border-line px-4 py-3">Thời hạn</th>
                    <th className="border-b border-line px-4 py-3 text-right">Đã thanh toán</th>
                    <th className="border-b border-line px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Fragment key={row.id}>
                      <StorefrontRow
                        row={row}
                        open={open === row.id}
                        onToggle={() => setOpen(open === row.id ? null : row.id)}
                      />
                      {open === row.id && (
                        <tr>
                          <td colSpan={6} className="border-b border-line bg-[#faf9ff] px-4 py-4">
                            <SubscriptionHistory storefrontId={row.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="py-12 text-center text-sm text-ink-soft">Không có gian hàng phù hợp bộ lọc.</p>
              )}
            </div>

            {rows.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  <span>
                    Hiển thị{' '}
                    <strong className="text-ink">
                      {page * size + 1}–{page * size + rows.length}
                    </strong>{' '}
                    trong <strong className="text-ink">{data?.totalElements ?? 0}</strong> gian hàng
                  </span>
                  <label className="flex items-center gap-2">
                    Số dòng
                    <select
                      value={size}
                      onChange={(e) => {
                        setSize(Number(e.target.value))
                        setPage(0)
                      }}
                      className="rounded-xl border border-line bg-[#faf9ff] px-2 py-1.5 font-semibold text-ink outline-none focus:border-violet"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <nav className="flex items-center gap-1" aria-label="Phân trang gian hàng">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-bold hover:border-violet disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Trước
                  </button>
                  <span className="px-3 text-xs font-bold">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-bold hover:border-violet disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            )}
          </div>
        </QueryState>
      </div>
    </section>
  )
}

function StorefrontRow({ row, open, onToggle }: { row: AdminStorefrontRow; open: boolean; onToggle: () => void }) {
  const meta = PLAN_META[row.plan.status] ?? PLAN_META.NONE
  const shop = SHOP_META[row.status] ?? { label: row.status, tone: 'text-ink-soft' }
  const { plan } = row
  const total = plan.durationDays || 30
  const left = plan.daysLeft ?? 0
  const pct = plan.status === 'ACTIVE' ? Math.min(100, Math.max(4, (left / total) * 100)) : 0
  const urgent = plan.status === 'ACTIVE' && left <= 7

  return (
    <tr className="group align-top hover:bg-[#faf9ff]">
      <td className="border-b border-line px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet to-[#8b6cff] font-display text-sm font-bold text-white">
            {(row.name.trim()[0] ?? '#').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-ink">{row.name}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              SHOP-{row.id} · tạo {formatDate(row.createdAt)}
            </p>
            <p className={`mt-1 text-xs font-semibold ${shop.tone}`}>{shop.label}</p>
          </div>
        </div>
      </td>
      <td className="border-b border-line px-4 py-4">
        <p className="font-semibold text-ink">{row.owner.fullName}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{row.owner.email}</p>
        {row.owner.phone && <p className="text-xs text-ink-soft">{row.owner.phone}</p>}
      </td>
      <td className="border-b border-line px-4 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
        </span>
        {plan.status === 'NONE' || plan.status === 'PENDING_PAYMENT' ? (
          <p className="mt-2 text-xs text-ink-soft">
            {row.pending
              ? `Đã tạo gói ${formatVnd(row.pending.fee)} lúc ${formatDateTime(row.pending.createdAt)}`
              : 'Chưa từng đăng ký'}
          </p>
        ) : (
          <>
            <p className="mt-2 font-semibold text-ink">{plan.name}</p>
            <p className="text-xs text-ink-soft">{plan.fee != null ? `${formatVnd(plan.fee)} / ${total} ngày` : '—'}</p>
          </>
        )}
        {row.pending && plan.status !== 'PENDING_PAYMENT' && plan.status !== 'NONE' && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#b45309]">
            <Clock3 size={11} /> Có yêu cầu gia hạn chưa thanh toán
          </p>
        )}
      </td>
      <td className="border-b border-line px-4 py-4">
        {plan.startAt || row.expiresAt ? (
          <>
            <p className="text-xs text-ink-soft">
              {formatDate(plan.startAt)} →{' '}
              <span className="font-semibold text-ink">{formatDate(row.expiresAt ?? plan.endAt)}</span>
            </p>
            {plan.status === 'ACTIVE' ? (
              <>
                <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-surface-high">
                  <div
                    className={`h-full rounded-full ${urgent ? 'bg-[#d96017]' : 'bg-gradient-to-r from-violet to-[#15783e]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`mt-1 text-xs font-bold ${urgent ? 'text-[#d96017]' : 'text-[#15783e]'}`}>
                  Còn {left} ngày
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs font-bold text-[#b42318]">Đã hết hạn</p>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-soft">—</p>
        )}
      </td>
      <td className="border-b border-line px-4 py-4 text-right">
        <p className="font-display text-base font-bold text-ink">{formatVnd(row.totalPaid)}</p>
        <p className="text-xs text-ink-soft">{row.paidSubscriptions} lần thanh toán</p>
      </td>
      <td className="border-b border-line px-4 py-4 text-right">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold transition hover:border-violet"
        >
          Lịch sử <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </td>
    </tr>
  )
}

function SubscriptionHistory({ storefrontId }: { storefrontId: number }) {
  const { data, isLoading, error } = useAdminStorefrontSubscriptions(storefrontId)
  return (
    <QueryState isLoading={isLoading} error={error}>
      {data?.length ? (
        <div className="overflow-x-auto">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.08em] text-ink-soft">
            <Wallet size={13} /> Lịch sử thuê gói ({data.length})
          </p>
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-2 pr-4">Mã</th>
                <th className="py-2 pr-4">Số tiền</th>
                <th className="py-2 pr-4">Trạng thái</th>
                <th className="py-2 pr-4">Thời hạn</th>
                <th className="py-2 pr-4">Thanh toán lúc</th>
                <th className="py-2">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.subscriptionId} className="border-t border-line">
                  <td className="py-2 pr-4 font-mono">SUB-{s.subscriptionId}</td>
                  <td className="py-2 pr-4 font-semibold">{formatVnd(s.fee)}</td>
                  <td className="py-2 pr-4">{SUB_STATUS[s.status] ?? s.status}</td>
                  <td className="py-2 pr-4">{s.startAt ? `${formatDate(s.startAt)} → ${formatDate(s.endAt)}` : '—'}</td>
                  <td className="py-2 pr-4">{s.paidAt ? formatDateTime(s.paidAt) : '—'}</td>
                  <td className="py-2">{formatDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-ink-soft">Gian hàng chưa có lần thuê gói nào.</p>
      )}
    </QueryState>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  active,
  onClick,
}: {
  icon: typeof Store
  label: string
  value: number | undefined
  detail: string
  tone: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[1.5rem] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-violet ring-2 ring-violet/15' : 'border-line'
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
        <Icon size={18} />
      </span>
      <p className="mt-3 font-label text-xs font-bold uppercase tracking-[.12em] text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value ?? '—'}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
    </button>
  )
}
