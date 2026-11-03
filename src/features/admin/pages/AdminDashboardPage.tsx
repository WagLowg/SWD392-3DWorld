import {
  Banknote,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  Eye,
  Filter,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Store,
  TriangleAlert,
  WalletCards,
  X,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { ApiClientError } from '../../../shared/api'
import { formatDate, formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Pagination } from '../../../shared/ui/Pagination'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import {
  useCommissionRows,
  useDashboardMetrics,
  useEarningReconciliation,
  useReconcileEarning,
  useRestoreShop,
  useShippingDebt,
  useShopFinance,
  useSubscriptionRows,
  useSuspendShop,
  useWalletRows,
} from '../hooks/useAdminFinance'
import type { AdminDateRange, WalletFilters, WalletRow } from '../types/admin-finance.types'

type DashboardTab = 'commissions' | 'subscriptions' | 'wallets'
type ShopAction = 'suspend' | 'restore'

const PAGE_SIZE = 20

function localDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultRange(): AdminDateRange {
  const now = new Date()
  return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) }
}

function statusLabel(status: string) {
  return (
    {
      PENDING_REFUND_WINDOW: 'Chờ hết hạn hoàn tiền',
      RECOGNIZED: 'Đã ghi nhận',
      REFUNDED: 'Đã hoàn tiền',
      ACTIVE: 'Đang hoạt động',
      SUSPENDED: 'Đã đình chỉ',
      INACTIVE: 'Chưa hoạt động',
      EXPIRED: 'Hết hạn',
      LOCKED: 'Đã khóa',
    }[status] ?? status.replaceAll('_', ' ')
  )
}

function statusTone(status: string) {
  if (['RECOGNIZED', 'ACTIVE', 'PAID'].includes(status)) return 'bg-[#e5f7eb] text-[#126b37]'
  if (['REFUNDED', 'SUSPENDED', 'LOCKED'].includes(status)) return 'bg-[#fde8e7] text-[#a1261d]'
  return 'bg-[#fff2d8] text-[#8a5200]'
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  )
}

function percentage(value: number) {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(normalized)}%`
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  loading,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  tone: string
  loading: boolean
}) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>{icon}</span>
      </div>
      {loading ? (
        <div className="mt-5 h-8 w-3/4 animate-pulse rounded bg-surface-mid" />
      ) : (
        <p className="mt-4 break-words font-display text-2xl font-bold sm:text-[28px]">{formatVnd(value)}</p>
      )}
      <p className="mt-2 text-xs leading-5 text-ink-soft">{detail}</p>
    </article>
  )
}

export function AdminDashboardPage() {
  const initialRange = defaultRange()
  const [draftRange, setDraftRange] = useState(initialRange)
  const [range, setRange] = useState(initialRange)
  const [rangeError, setRangeError] = useState('')
  const [tab, setTab] = useState<DashboardTab>('commissions')
  const [page, setPage] = useState(0)
  const [shopSearch, setShopSearch] = useState('')
  const [shopId, setShopId] = useState<number | undefined>()
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState<number | undefined>()
  const [walletFilters, setWalletFilters] = useState<WalletFilters>({
    debtOnly: false,
    lockedOnly: false,
    inactiveDays: 30,
    page: 0,
    size: PAGE_SIZE,
  })
  const [selectedWallet, setSelectedWallet] = useState<WalletRow | null>(null)

  const metrics = useDashboardMetrics(range)
  const commissions = useCommissionRows(range, page, PAGE_SIZE, shopId, tab === 'commissions')
  const subscriptions = useSubscriptionRows(range, page, PAGE_SIZE, shopId, userId, tab === 'subscriptions')
  const wallets = useWalletRows(walletFilters, tab === 'wallets')

  useEffect(() => {
    document.title = 'Tổng quan tài chính · Admin 3DWorld'
  }, [])

  function applyRange(event: FormEvent) {
    event.preventDefault()
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
      setRangeError('Khoảng ngày không hợp lệ.')
      return
    }
    setRangeError('')
    setPage(0)
    setRange(draftRange)
  }

  function applyIds(event: FormEvent) {
    event.preventDefault()
    const nextShopId = shopSearch.trim() ? Number(shopSearch) : undefined
    const nextUserId = userSearch.trim() ? Number(userSearch) : undefined
    setShopId(Number.isFinite(nextShopId) ? nextShopId : undefined)
    setUserId(Number.isFinite(nextUserId) ? nextUserId : undefined)
    setPage(0)
  }

  function changeTab(nextTab: DashboardTab) {
    setTab(nextTab)
    setPage(0)
  }

  function refresh() {
    metrics.refetch()
    if (tab === 'commissions') commissions.refetch()
    if (tab === 'subscriptions') subscriptions.refetch()
    if (tab === 'wallets') wallets.refetch()
  }

  const isRefreshing =
    metrics.isFetching ||
    (tab === 'commissions' && commissions.isFetching) ||
    (tab === 'subscriptions' && subscriptions.isFetching) ||
    (tab === 'wallets' && wallets.isFetching)

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-violet">Admin · Tài chính người bán</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Tổng quan vận hành</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
            Theo dõi doanh thu nền tảng, hoa hồng đang chờ ghi nhận và công nợ phí vận chuyển của từng gian hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold shadow-sm hover:border-violet disabled:opacity-60"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> Làm mới
        </button>
      </header>

      <form
        onSubmit={applyRange}
        className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4 shadow-sm"
      >
        <span className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-violet-soft text-violet sm:mb-0">
          <CalendarRange size={18} />
        </span>
        <label className="grid gap-1.5 text-xs font-bold text-ink-soft">
          Từ ngày
          <input
            type="date"
            value={draftRange.from}
            onChange={(event) => setDraftRange((value) => ({ ...value, from: event.target.value }))}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-violet"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-ink-soft">
          Đến ngày
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) => setDraftRange((value) => ({ ...value, to: event.target.value }))}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-violet"
          />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-ink px-5 text-sm font-bold text-white hover:bg-violet">
          Áp dụng
        </button>
        <p className={`text-xs ${rangeError ? 'text-danger' : 'text-ink-soft'}`}>
          {rangeError || 'Số liệu doanh thu tính theo múi giờ Việt Nam.'}
        </p>
      </form>

      {metrics.error ? (
        <div className="mb-5 rounded-lg border border-[#f2c7c3] bg-[#fff5f4] px-4 py-3 text-sm text-[#8d2119]">
          Không tải được số liệu tổng quan.{' '}
          <button type="button" onClick={() => metrics.refetch()} className="font-bold underline">
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số tài chính">
        <MetricCard
          label="Hoa hồng đã ghi nhận"
          value={metrics.data?.realizedCommission ?? 0}
          detail="Theo thời điểm khoản thu được giải phóng"
          icon={<CircleDollarSign size={19} />}
          tone="bg-[#e5f7eb] text-[#126b37]"
          loading={metrics.isLoading}
        />
        <MetricCard
          label="Hoa hồng tạm tính"
          value={metrics.data?.provisionalCommission ?? 0}
          detail="Khoản đã thu, còn trong cửa sổ hoàn tiền"
          icon={<Clock3 size={19} />}
          tone="bg-[#fff2d8] text-[#8a5200]"
          loading={metrics.isLoading}
        />
        <MetricCard
          label="Doanh thu thuê gian hàng"
          value={metrics.data?.subscriptionIncome ?? 0}
          detail="Các giao dịch subscription đã thanh toán"
          icon={<Landmark size={19} />}
          tone="bg-[#e5f3fb] text-[#08637f]"
          loading={metrics.isLoading}
        />
        <MetricCard
          label="Tổng nợ phí vận chuyển"
          value={metrics.data?.totalShippingDebt ?? 0}
          detail="Dư nợ hiện tại, không phụ thuộc khoảng ngày"
          icon={<TriangleAlert size={19} />}
          tone="bg-[#fde8e7] text-[#a1261d]"
          loading={metrics.isLoading}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-line px-4 py-4 lg:flex-row lg:items-center sm:px-5">
          <div className="flex w-full gap-1 overflow-x-auto" role="tablist" aria-label="Dữ liệu tài chính">
            <TabButton
              active={tab === 'commissions'}
              onClick={() => changeTab('commissions')}
              icon={<Banknote size={16} />}
            >
              Hoa hồng
            </TabButton>
            <TabButton
              active={tab === 'subscriptions'}
              onClick={() => changeTab('subscriptions')}
              icon={<Store size={16} />}
            >
              Thuê gian hàng
            </TabButton>
            <TabButton active={tab === 'wallets'} onClick={() => changeTab('wallets')} icon={<WalletCards size={16} />}>
              Ví & công nợ
            </TabButton>
          </div>
          {tab !== 'wallets' ? (
            <form onSubmit={applyIds} className="flex w-full flex-wrap items-end gap-2 lg:justify-end">
              <label className="grid gap-1 text-[11px] font-bold text-ink-soft">
                Mã shop
                <input
                  inputMode="numeric"
                  value={shopSearch}
                  onChange={(event) => setShopSearch(event.target.value.replace(/\D/g, ''))}
                  placeholder="Tất cả"
                  className="h-9 w-28 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-violet"
                />
              </label>
              {tab === 'subscriptions' && (
                <label className="grid gap-1 text-[11px] font-bold text-ink-soft">
                  Mã người dùng
                  <input
                    inputMode="numeric"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value.replace(/\D/g, ''))}
                    placeholder="Tất cả"
                    className="h-9 w-32 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-violet"
                  />
                </label>
              )}
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-bold hover:border-violet"
              >
                <Filter size={14} /> Lọc
              </button>
            </form>
          ) : (
            <WalletFilterBar filters={walletFilters} onChange={(next) => setWalletFilters({ ...next, page: 0 })} />
          )}
        </div>

        {tab === 'commissions' && (
          <QueryState isLoading={commissions.isLoading} error={commissions.error} onRetry={() => commissions.refetch()}>
            <CommissionTable data={commissions.data} page={page} onPage={setPage} />
          </QueryState>
        )}
        {tab === 'subscriptions' && (
          <QueryState
            isLoading={subscriptions.isLoading}
            error={subscriptions.error}
            onRetry={() => subscriptions.refetch()}
          >
            <SubscriptionTable data={subscriptions.data} page={page} onPage={setPage} />
          </QueryState>
        )}
        {tab === 'wallets' && (
          <QueryState isLoading={wallets.isLoading} error={wallets.error} onRetry={() => wallets.refetch()}>
            <WalletTable
              data={wallets.data}
              page={walletFilters.page}
              onPage={(nextPage) => setWalletFilters((value) => ({ ...value, page: nextPage }))}
              onOpen={setSelectedWallet}
            />
          </QueryState>
        )}
      </section>

      {selectedWallet && <ShopFinanceDrawer wallet={selectedWallet} onClose={() => setSelectedWallet(null)} />}
    </>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-low hover:text-ink'}`}
    >
      {icon} {children}
    </button>
  )
}

function WalletFilterBar({
  filters,
  onChange,
}: {
  filters: WalletFilters
  onChange: (filters: WalletFilters) => void
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3 lg:justify-end">
      <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
        <input
          type="checkbox"
          checked={filters.debtOnly}
          onChange={(event) => onChange({ ...filters, debtOnly: event.target.checked })}
          className="h-4 w-4 accent-violet"
        />
        Chỉ có nợ
      </label>
      <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
        <input
          type="checkbox"
          checked={filters.lockedOnly}
          onChange={(event) => onChange({ ...filters, lockedOnly: event.target.checked })}
          className="h-4 w-4 accent-violet"
        />
        Khóa rút tiền
      </label>
      <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
        Không bán trong
        <input
          type="number"
          min={1}
          max={3650}
          value={filters.inactiveDays}
          onChange={(event) =>
            onChange({ ...filters, inactiveDays: Math.min(3650, Math.max(1, Number(event.target.value) || 1)) })
          }
          className="h-9 w-20 rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none focus:border-violet"
        />
        ngày
      </label>
    </div>
  )
}

function EmptyRows({ columns, label }: { columns: number; label: string }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-14 text-center text-sm text-ink-soft">
        {label}
      </td>
    </tr>
  )
}

function TableFooter({
  total,
  page,
  totalPages,
  onPage,
}: {
  total: number
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
      <p className="text-xs text-ink-soft">{new Intl.NumberFormat('vi-VN').format(total)} bản ghi</p>
      <div className="[&>nav]:mt-0">
        <Pagination page={page} totalPages={totalPages} onChange={onPage} />
      </div>
    </div>
  )
}

function CommissionTable({
  data,
  page,
  onPage,
}: {
  data: ReturnType<typeof useCommissionRows>['data']
  page: number
  onPage: (page: number) => void
}) {
  const [earningOrderId, setEarningOrderId] = useState<number | null>(null)
  const earning = useEarningReconciliation(earningOrderId)
  const reconcile = useReconcileEarning()
  const toast = useToast()

  async function runReconcile() {
    if (earningOrderId === null) return
    try {
      const result = await reconcile.mutateAsync(earningOrderId)
      toast(
        result.recognitionStatus === 'RECOGNIZED'
          ? 'Đã giải ngân và ghi nhận hoa hồng.'
          : 'Đã đối soát lại; khoản hoa hồng vẫn còn điều kiện chặn.',
        result.recognitionStatus === 'RECOGNIZED' ? 'success' : 'error',
      )
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : 'Không thể chạy lại đối soát.', 'error')
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-surface-low text-[11px] uppercase text-ink-soft">
            <tr>
              <th className="px-5 py-3">Đơn hàng / Shop</th>
              <th className="px-4 py-3 text-right">Giá trị đơn</th>
              <th className="px-4 py-3 text-right">Tỷ lệ</th>
              <th className="px-4 py-3 text-right">Hoa hồng</th>
              <th className="px-4 py-3 text-right">Quyền lợi shop</th>
              <th className="px-4 py-3 text-right">Bù nợ</th>
              <th className="px-4 py-3 text-right">Đã ghi có</th>
              <th className="px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-surface/70">
                <td className="px-5 py-4">
                  <p className="font-bold">{row.orderCode}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {row.shopName} · #{row.shopId}
                  </p>
                </td>
                <td className="px-4 py-4 text-right font-semibold">{formatVnd(row.orderValue)}</td>
                <td className="px-4 py-4 text-right">{percentage(row.commissionRate)}</td>
                <td className="px-4 py-4 text-right font-bold">{formatVnd(row.commissionAmount)}</td>
                <td className="px-4 py-4 text-right">{formatVnd(row.sellerNetAmount)}</td>
                <td className="px-4 py-4 text-right text-[#a1261d]">
                  {row.debtOffset ? `-${formatVnd(row.debtOffset)}` : '—'}
                </td>
                <td className="px-4 py-4 text-right font-bold text-[#126b37]">{formatVnd(row.creditedToShop)}</td>
                <td className="px-5 py-4">
                  <StatusChip status={row.status} />
                  {row.refundUnderReview && (
                    <p className="mt-2 text-[11px] font-bold text-[#a1261d]">Đang xét hoàn tiền</p>
                  )}
                  <p className="mt-2 text-[11px] text-ink-soft">{formatDateTime(row.releasedAt ?? row.createdAt)}</p>
                  {row.orderId !== null && (
                    <button
                      type="button"
                      onClick={() => setEarningOrderId(row.orderId)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet hover:underline"
                    >
                      <Eye size={13} /> Kiểm tra giải ngân
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!data?.items.length && <EmptyRows columns={8} label="Không có khoản hoa hồng trong kỳ này." />}
          </tbody>
        </table>
      </div>
      {data && <TableFooter total={data.totalElements} page={page} totalPages={data.totalPages} onPage={onPage} />}
      {earningOrderId !== null && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kiểm tra giải ngân hoa hồng"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-violet">Đối soát hoa hồng</p>
                <h3 className="mt-1 font-display text-xl font-bold">Đơn #{earningOrderId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEarningOrderId(null)}
                aria-label="Đóng"
                className="grid h-8 w-8 place-items-center rounded-lg border border-line"
              >
                <X size={16} />
              </button>
            </div>
            <QueryState isLoading={earning.isLoading} error={earning.error} onRetry={() => earning.refetch()}>
              {earning.data && (
                <div className="mt-5 space-y-5">
                  <dl className="grid overflow-hidden rounded-lg border border-line bg-line/60 sm:grid-cols-2">
                    <EarningDatum label="Trạng thái đơn" value={earning.data.orderStatus} />
                    <EarningDatum label="Trạng thái earning" value={earning.data.earningStatus ?? 'Chưa tạo'} />
                    <EarningDatum
                      label="Tiền sàn đã nhận"
                      value={`${formatVnd(earning.data.platformReceived)} / ${formatVnd(earning.data.totalAmount)}`}
                    />
                    <EarningDatum label="Số dư pending" value={formatVnd(earning.data.pendingBalance)} />
                    <EarningDatum label="Khách đã nhận" value={formatDateTime(earning.data.receivedAt)} />
                    <EarningDatum
                      label="Hết hạn hoàn tiền"
                      value={formatDateTime(earning.data.effectiveRefundDeadline)}
                    />
                    <EarningDatum label="Đã giải ngân" value={formatDateTime(earning.data.releasedAt)} />
                    <EarningDatum
                      label="Kết quả ghi nhận"
                      value={earning.data.recognitionStatus === 'RECOGNIZED' ? 'Đã ghi nhận' : 'Chưa ghi nhận'}
                    />
                  </dl>
                  {earning.data.blockers.length ? (
                    <section className="rounded-lg border border-[#f2c7c3] bg-[#fff4f3] p-4">
                      <h4 className="text-sm font-bold text-[#a1261d]">Điều kiện đang chặn</h4>
                      <ul className="mt-3 space-y-2 text-sm">
                        {earning.data.blockers.map((blocker) => (
                          <li key={blocker} className="flex gap-2">
                            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#a1261d]" />
                            <span>
                              {blockerLabel(blocker)} <code className="text-[10px] text-ink-soft">{blocker}</code>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : (
                    <p className="rounded-lg bg-[#e5f7eb] p-4 text-sm font-semibold text-[#126b37]">
                      {earning.data.recognitionStatus === 'RECOGNIZED'
                        ? 'Khoản hoa hồng đã được ghi nhận.'
                        : 'Đã đủ điều kiện để chạy lại giải ngân.'}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEarningOrderId(null)}
                      className="h-10 rounded-lg border border-line px-4 text-sm font-bold"
                    >
                      Đóng
                    </button>
                    {earning.data.recognitionStatus !== 'RECOGNIZED' && (
                      <button
                        type="button"
                        onClick={runReconcile}
                        disabled={reconcile.isPending}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet px-4 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {reconcile.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}{' '}
                        Chạy lại giải ngân
                      </button>
                    )}
                  </div>
                </div>
              )}
            </QueryState>
          </div>
        </div>
      )}
    </div>
  )
}

function EarningDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  )
}

function blockerLabel(blocker: string) {
  return (
    (
      {
        EARNING_NOT_CREATED: 'Chưa tạo khoản thu cho đơn.',
        EARNING_NOT_PENDING: 'Khoản thu không ở trạng thái chờ giải ngân.',
        ORDER_NOT_RECEIVED: 'Người mua chưa xác nhận đã nhận hàng.',
        FUNDS_RECEIPT_NOT_POSTED: 'Chưa ghi nhận thời điểm tiền về sàn.',
        PLATFORM_RECEIPT_NOT_RECONCILED: 'Tiền sàn nhận chưa khớp tổng đơn.',
        REFUND_WINDOW_NOT_EXPIRED: 'Cửa sổ hoàn tiền chưa kết thúc.',
        REFUND_IN_PROGRESS_OR_PAID: 'Đơn có yêu cầu hoàn tiền đang xử lý hoặc đã chi.',
        INSUFFICIENT_PENDING_BALANCE: 'Số dư pending không đủ để giải ngân.',
        RELEASE_TIMESTAMP_MISSING: 'Earning đã release nhưng thiếu thời điểm released_at.',
      } as Record<string, string>
    )[blocker] ?? blocker.replaceAll('_', ' ')
  )
}

function SubscriptionTable({
  data,
  page,
  onPage,
}: {
  data: ReturnType<typeof useSubscriptionRows>['data']
  page: number
  onPage: (page: number) => void
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-low text-[11px] uppercase text-ink-soft">
            <tr>
              <th className="px-5 py-3">Gian hàng</th>
              <th className="px-4 py-3">Người thanh toán</th>
              <th className="px-4 py-3">Gói / Chu kỳ</th>
              <th className="px-4 py-3 text-right">Số tiền</th>
              <th className="px-4 py-3">Thanh toán</th>
              <th className="px-5 py-3">Hiệu lực</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-surface/70">
                <td className="px-5 py-4">
                  <p className="font-bold">{row.shopName}</p>
                  <p className="mt-1 text-xs text-ink-soft">Shop #{row.shopId}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{row.userName}</p>
                  <p className="mt-1 text-xs text-ink-soft">{row.userId ? `User #${row.userId}` : '—'}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{row.packageName.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-xs text-ink-soft">{row.cycle.replaceAll('_', ' ')}</p>
                </td>
                <td className="px-4 py-4 text-right font-bold">{formatVnd(row.amount)}</td>
                <td className="px-4 py-4">{formatDateTime(row.paidAt)}</td>
                <td className="px-5 py-4">
                  <p>{formatDate(row.activatedAt)}</p>
                  <p className="mt-1 text-xs text-ink-soft">đến {formatDate(row.expiresAt)}</p>
                </td>
              </tr>
            ))}
            {!data?.items.length && <EmptyRows columns={6} label="Không có giao dịch thuê gian hàng trong kỳ này." />}
          </tbody>
        </table>
      </div>
      {data && <TableFooter total={data.totalElements} page={page} totalPages={data.totalPages} onPage={onPage} />}
    </div>
  )
}

function WalletTable({
  data,
  page,
  onPage,
  onOpen,
}: {
  data: ReturnType<typeof useWalletRows>['data']
  page: number
  onPage: (page: number) => void
  onOpen: (wallet: WalletRow) => void
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-surface-low text-[11px] uppercase text-ink-soft">
            <tr>
              <th className="px-5 py-3">Gian hàng</th>
              <th className="px-4 py-3 text-right">Khả dụng</th>
              <th className="px-4 py-3 text-right">Đang giữ</th>
              <th className="px-4 py-3 text-right">Nợ vận chuyển</th>
              <th className="px-4 py-3">Tuổi nợ / Đơn cuối</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.shopId} className="border-t border-line hover:bg-surface/70">
                <td className="px-5 py-4">
                  <p className="font-bold">{row.shopName}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    #{row.shopId} · {row.ownerName}
                  </p>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="font-bold">{formatVnd(row.availableBalance)}</p>
                  <p className="mt-1 text-[11px] text-ink-soft">Giữ tối thiểu {formatVnd(row.retainedReserve)}</p>
                </td>
                <td className="px-4 py-4 text-right">{formatVnd(row.heldBalance)}</td>
                <td className="px-4 py-4 text-right">
                  <p className={`font-bold ${row.shippingDebt > 0 ? 'text-[#a1261d]' : 'text-[#126b37]'}`}>
                    {formatVnd(row.signedShippingDebt)}
                  </p>
                  {row.withdrawalLocked && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#a1261d]">
                      <LockKeyhole size={11} /> Khóa rút tiền
                    </p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <p>{row.debtAgeDays === null ? '—' : `${row.debtAgeDays} ngày`}</p>
                  <p className="mt-1 text-xs text-ink-soft">Đơn cuối: {formatDate(row.lastOrderAt)}</p>
                </td>
                <td className="px-4 py-4">
                  <StatusChip status={row.storefrontStatus} />
                  {row.suspensionCandidate && (
                    <p className="mt-2 text-[11px] font-bold text-[#8a5200]">Đủ điều kiện xem xét</p>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    aria-label={`Xem chi tiết ${row.shopName}`}
                    className="inline-grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft hover:border-violet hover:text-violet"
                    title="Xem chi tiết công nợ"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!data?.items.length && <EmptyRows columns={7} label="Không có ví phù hợp với bộ lọc." />}
          </tbody>
        </table>
      </div>
      {data && <TableFooter total={data.totalElements} page={page} totalPages={data.totalPages} onPage={onPage} />}
    </div>
  )
}

function ShopFinanceDrawer({ wallet, onClose }: { wallet: WalletRow; onClose: () => void }) {
  const toast = useToast()
  const shop = useShopFinance(wallet.shopId)
  const debt = useShippingDebt(wallet.shopId)
  const suspend = useSuspendShop()
  const restore = useRestoreShop()
  const [action, setAction] = useState<ShopAction | null>(null)
  const [reason, setReason] = useState('')
  const [inactiveDays, setInactiveDays] = useState(30)

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const currentStatus = shop.data?.storefrontStatus ?? wallet.storefrontStatus
  const currentDebt = debt.data?.currentDebt ?? wallet.shippingDebt
  const canRestore = currentStatus === 'SUSPENDED' && currentDebt <= 0
  const canSuspend = currentStatus !== 'SUSPENDED' && wallet.suspensionCandidate && currentDebt > 0

  async function confirmAction(event: FormEvent) {
    event.preventDefault()
    if (!action || reason.trim().length < 5) return
    try {
      if (action === 'suspend')
        await suspend.mutateAsync({ shopId: wallet.shopId, inactiveDays, reason: reason.trim() })
      else await restore.mutateAsync({ shopId: wallet.shopId, reason: reason.trim() })
      toast(
        action === 'suspend'
          ? 'Đã đình chỉ gian hàng và ghi audit log.'
          : 'Đã khôi phục gian hàng sau khi tất toán nợ.',
      )
      setAction(null)
      shop.refetch()
      debt.refetch()
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : 'Không thể cập nhật gian hàng.', 'error')
    }
  }

  const mutating = suspend.isPending || restore.isPending

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Đóng chi tiết công nợ"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/35"
      />
      <aside
        className="relative h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Tài chính ${wallet.shopName}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-violet">Shop #{wallet.shopId}</p>
            <h2 className="mt-1 truncate font-display text-2xl font-bold">{shop.data?.shopName ?? wallet.shopName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line hover:border-violet"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-7 px-5 py-6 sm:px-7">
          <QueryState isLoading={shop.isLoading} error={shop.error} onRetry={() => shop.refetch()}>
            <section aria-label="Tổng hợp gian hàng">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold">Tổng hợp trọn đời</h3>
                <StatusChip status={currentStatus} />
              </div>
              <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                <FinanceDatum label="Thuê gian hàng" value={shop.data?.lifetimeSubscriptionIncome ?? 0} />
                <FinanceDatum label="Hoa hồng thực nhận" value={shop.data?.realizedCommission ?? 0} />
                <FinanceDatum
                  label="Nợ hiện tại"
                  value={shop.data?.currentShippingDebt ?? wallet.shippingDebt}
                  danger
                />
              </dl>
            </section>
          </QueryState>

          <QueryState isLoading={debt.isLoading} error={debt.error} onRetry={() => debt.refetch()}>
            <section aria-label="Chi tiết công nợ">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold">Phí vận chuyển hai chiều</h3>
                  <p className="mt-1 text-xs text-ink-soft">Kỳ nợ bắt đầu: {formatDate(debt.data?.debtSince)}</p>
                </div>
                <p className="font-display text-xl font-bold text-[#a1261d]">
                  {formatVnd(-(debt.data?.currentDebt ?? wallet.shippingDebt))}
                </p>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead className="bg-surface-low uppercase text-ink-soft">
                    <tr>
                      <th className="px-3 py-3">Đơn hàng</th>
                      <th className="px-3 py-3 text-right">Phí đi</th>
                      <th className="px-3 py-3 text-right">Phí hoàn</th>
                      <th className="px-3 py-3 text-right">Trừ số dư</th>
                      <th className="px-3 py-3 text-right">Phát sinh nợ</th>
                      <th className="px-3 py-3 text-right">Còn lại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debt.data?.assessments.map((row) => (
                      <tr key={row.id} className="border-t border-line">
                        <td className="px-3 py-3">
                          <p className="font-bold">{row.orderCode}</p>
                          <p className="mt-1 text-ink-soft">{formatDateTime(row.assessedAt)}</p>
                        </td>
                        <td className="px-3 py-3 text-right">{formatVnd(row.outboundFee)}</td>
                        <td className="px-3 py-3 text-right">{formatVnd(row.returnFee)}</td>
                        <td className="px-3 py-3 text-right">{formatVnd(row.debitedFromBalance)}</td>
                        <td className="px-3 py-3 text-right text-[#a1261d]">{formatVnd(row.addedToDebt)}</td>
                        <td className="px-3 py-3 text-right font-bold">{formatVnd(row.outstandingAmount)}</td>
                      </tr>
                    ))}
                    {!debt.data?.assessments.length && (
                      <EmptyRows columns={6} label="Không có chứng từ phí chi tiết cho khoản nợ này." />
                    )}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-6 text-sm font-bold">Lịch sử bù trừ & sổ cái</h4>
              <div className="mt-3 divide-y divide-line rounded-lg border border-line">
                {debt.data?.ledgerEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold">{entry.type.replaceAll('_', ' ')}</p>
                      <p className="mt-1 break-words text-xs text-ink-soft">
                        {entry.description} · {entry.reference} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-[#126b37]">{formatVnd(entry.amount)}</p>
                  </div>
                ))}
                {!debt.data?.ledgerEntries.length && (
                  <p className="px-4 py-8 text-center text-sm text-ink-soft">Chưa có giao dịch bù trừ.</p>
                )}
              </div>
            </section>
          </QueryState>

          <section className="border-t border-line pt-6" aria-label="Hành động quản trị">
            <h3 className="font-display text-lg font-bold">Kiểm soát gian hàng</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Đình chỉ chỉ chặn giao dịch mới; đơn hàng hiện hữu và nạp tiền vẫn tiếp tục để shop có thể hoàn thành
              nghĩa vụ.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canSuspend}
                onClick={() => {
                  setAction('suspend')
                  setReason('Nợ phí vận chuyển quá hạn và không có đơn hàng gần đây')
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#a1261d] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <LockKeyhole size={16} /> Đình chỉ vì nợ
              </button>
              <button
                type="button"
                disabled={!canRestore}
                onClick={() => {
                  setAction('restore')
                  setReason('Công nợ phí vận chuyển đã được tất toán')
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-bold hover:border-[#126b37] hover:text-[#126b37] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RotateCcw size={16} /> Khôi phục gian hàng
              </button>
            </div>
            {!canSuspend && !canRestore && (
              <p className="mt-3 text-xs text-ink-soft">
                Gian hàng hiện không đủ điều kiện để đình chỉ hoặc khôi phục.
              </p>
            )}
          </section>
        </div>
      </aside>

      {action && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận hành động quản trị"
        >
          <form onSubmit={confirmAction} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-violet">Xác nhận quản trị</p>
                <h3 className="mt-1 font-display text-xl font-bold">
                  {action === 'suspend' ? 'Đình chỉ gian hàng' : 'Khôi phục gian hàng'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAction(null)}
                aria-label="Hủy"
                className="grid h-8 w-8 place-items-center rounded-lg border border-line"
              >
                <X size={16} />
              </button>
            </div>
            {action === 'suspend' && (
              <label className="mt-5 grid gap-2 text-sm font-bold">
                Số ngày không hoạt động
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={inactiveDays}
                  onChange={(event) => setInactiveDays(Math.min(3650, Math.max(1, Number(event.target.value) || 1)))}
                  className="h-10 rounded-lg border border-line px-3 outline-none focus:border-violet"
                />
              </label>
            )}
            <label className="mt-4 grid gap-2 text-sm font-bold">
              Lý do
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={500}
                required
                className="resize-none rounded-lg border border-line p-3 font-normal outline-none focus:border-violet"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAction(null)}
                className="h-10 rounded-lg border border-line px-4 text-sm font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={mutating || reason.trim().length < 5}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50 ${action === 'suspend' ? 'bg-[#a1261d]' : 'bg-[#126b37]'}`}
              >
                {mutating && <Loader2 size={15} className="animate-spin" />} Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FinanceDatum({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className={`mt-2 break-words font-display text-lg font-bold ${danger && value > 0 ? 'text-[#a1261d]' : ''}`}>
        {formatVnd(value)}
      </dd>
    </div>
  )
}
