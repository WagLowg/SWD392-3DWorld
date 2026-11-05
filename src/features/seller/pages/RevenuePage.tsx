import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Percent,
  ShieldCheck,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Pagination } from '../../../shared/ui/Pagination'
import {
  Btn,
  CellTitle,
  DataTable,
  FilterTabs,
  Hero,
  RuleBox,
  StatCard,
  StatusPill,
  Toolbar,
} from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { EarningStatus } from '../data/seller.fixtures'
import { useEarnings, usePayoutHistory, useWalletLedgers } from '../hooks/useSeller'
import { earningCommission, realizedCommissionTotal } from '../lib/earnings'
import { EARNING_STATUS } from '../lib/status'
import { LEDGER_BUCKET_MAP, type SellerPayoutRecord, type SellerWalletLedgerRecord } from '../services/seller.service'

const EARNINGS_PAGE_SIZE = 5
const PAYOUTS_PAGE_SIZE = 5
const LEDGERS_PAGE_SIZE = 5

type FinanceViewTab = 'EARNINGS' | 'LEDGERS' | 'PAYOUTS'

/** MP 053 · Quản Lý Doanh Thu Người Bán & Sổ Cái Biến Động Số Dư Ví */
export function RevenuePage() {
  const q = useEarnings()
  const qPayouts = usePayoutHistory()
  const qLedgers = useWalletLedgers()

  const [viewTab, setViewTab] = useState<FinanceViewTab>('EARNINGS')
  const [tab, setTab] = useState<EarningStatus | ''>('')
  const [ledgerBucket, setLedgerBucket] = useState<string>('')
  const [page, setPage] = useState(0)
  const [payoutPage, setPayoutPage] = useState(0)
  const [ledgerPage, setLedgerPage] = useState(0)

  useEffect(() => {
    document.title = 'Doanh thu xưởng · 3DWorld'
  }, [])

  const all = q.data?.earnings ?? []
  const w = q.data?.wallet
  const commission = realizedCommissionTotal(all)

  // Dữ liệu Payout từ BE API GET /api/users/me/payouts
  const payoutList: SellerPayoutRecord[] = qPayouts.data ?? []
  const processingPayoutTotal = payoutList
    .filter((p) => p.status === 'PROCESSING')
    .reduce((total, p) => total + p.amount, 0)

  // Dữ liệu Ledgers từ BE API GET /api/users/me/wallet/ledgers
  const rawLedgers: SellerWalletLedgerRecord[] = qLedgers.data ?? []

  const handleTabChange = (nextTab: EarningStatus | '') => {
    setTab(nextTab)
    setPage(0)
  }

  const handleLedgerBucketChange = (bucket: string) => {
    setLedgerBucket(bucket)
    setLedgerPage(0)
  }

  const filteredEarnings = all.filter((e) => !tab || e.status === tab)
  const earningsTotalPages = Math.ceil(filteredEarnings.length / EARNINGS_PAGE_SIZE)
  const pagedEarnings = filteredEarnings.slice(page * EARNINGS_PAGE_SIZE, (page + 1) * EARNINGS_PAGE_SIZE)

  const filteredLedgers = rawLedgers.filter((l) => !ledgerBucket || l.bucket === ledgerBucket)
  const ledgersTotalPages = Math.ceil(filteredLedgers.length / LEDGERS_PAGE_SIZE)
  const pagedLedgers = filteredLedgers.slice(ledgerPage * LEDGERS_PAGE_SIZE, (ledgerPage + 1) * LEDGERS_PAGE_SIZE)

  const payoutTotalPages = Math.ceil(payoutList.length / PAYOUTS_PAGE_SIZE)
  const pagedPayouts = payoutList.slice(payoutPage * PAYOUTS_PAGE_SIZE, (payoutPage + 1) * PAYOUTS_PAGE_SIZE)

  return (
    <>
      <Hero
        code="MP 053"
        eyebrow="Doanh thu & dòng tiền"
        title="Doanh Thu Xưởng Chế Tác"
        accent="Rút Trực Tiếp Số Dư Khả Dụng."
        actions={
          <>
            <Btn to="/seller/payouts/new" variant="primary" icon={Wallet}>
              Rút tiền
            </Btn>
            <Btn to="/bank-accounts" variant="white" icon={Wallet}>
              Tài khoản nhận tiền
            </Btn>
          </>
        }
      />

      {w && w.returnShippingDebt > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#ffdad6] p-4 text-xs font-semibold text-danger">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            Xưởng đang có công nợ phí vận chuyển hoàn trả: {formatVnd(w.returnShippingDebt)}. Hệ thống sẽ tự động ưu
            tiên cấn trừ khi có doanh thu giải ngân mới.
          </span>
        </div>
      )}

      {processingPayoutTotal > 0 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-4 border border-amber-200/80 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800 shadow-xs">
              <Clock size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-ink">Đang chuyển khoản {formatVnd(processingPayoutTotal)}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  Tự động xử lý
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Tiền đang được tự động chuyển về tài khoản ngân hàng. Giao dịch không cần quản trị viên phê duyệt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewTab('PAYOUTS')
              const el = document.getElementById('seller-finance-tabs')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="shrink-0 self-start sm:self-auto rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 border border-amber-200 shadow-soft hover:bg-amber-100/60 transition cursor-pointer"
          >
            Xem lịch sử rút tiền ↓
          </button>
        </div>
      )}

      {/* Tổng quan số dư có thể rút, tiền chờ mở khóa, công nợ và phí sàn. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Có thể rút"
          value={w ? formatVnd(w.withdrawable) : '—'}
          icon={Wallet}
          tone="green"
          hint={w ? `Khả dụng: ${formatVnd(w.available)}` : 'Được phép rút'}
        />
        <StatCard
          label="Chờ mở khoá"
          value={w ? formatVnd(w.pending) : '—'}
          icon={ShieldCheck}
          tone="orange"
          hint="Giải ngân sau 72h nhận hàng"
        />
        <StatCard
          label="Nợ cước hoàn trả"
          value={w ? formatVnd(w.returnShippingDebt) : '0đ'}
          icon={Truck}
          tone={w && w.returnShippingDebt > 0 ? 'danger' : 'green'}
          hint={w && w.returnShippingDebt > 0 ? 'Cần cấn trừ trước khi rút' : 'Không có công nợ'}
        />
        <StatCard
          label="Phí sàn đã ghi nhận"
          value={formatVnd(commission)}
          icon={Percent}
          tone="neutral"
          hint="Chỉ tính các khoản đã giải ngân"
        />
      </div>

      {/* Thanh điều hướng 3 chế độ xem tài chính */}
      <div id="seller-finance-tabs" className="mt-10 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewTab('EARNINGS')
                setPage(0)
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                viewTab === 'EARNINGS'
                  ? 'bg-ink text-white shadow-soft'
                  : 'bg-white text-ink-soft hover:bg-surface-low hover:text-ink'
              }`}
            >
              <FileText size={15} />
              <span>Khoản Thu Đơn Hàng</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${viewTab === 'EARNINGS' ? 'bg-white/20 text-white' : 'bg-surface-low text-ink-soft'}`}
              >
                {all.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('LEDGERS')
                setLedgerPage(0)
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                viewTab === 'LEDGERS'
                  ? 'bg-ink text-white shadow-soft'
                  : 'bg-white text-ink-soft hover:bg-surface-low hover:text-ink'
              }`}
            >
              <BookOpen size={15} />
              <span>Sổ Cái Biến Động Số Dư</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${viewTab === 'LEDGERS' ? 'bg-white/20 text-white' : 'bg-surface-low text-ink-soft'}`}
              >
                {rawLedgers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('PAYOUTS')
                setPayoutPage(0)
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                viewTab === 'PAYOUTS'
                  ? 'bg-ink text-white shadow-soft'
                  : 'bg-white text-ink-soft hover:bg-surface-low hover:text-ink'
              }`}
            >
              <History size={15} />
              <span>Lịch Sử Rút Tiền</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${viewTab === 'PAYOUTS' ? 'bg-white/20 text-white' : 'bg-surface-low text-ink-soft'}`}
              >
                {payoutList.length}
              </span>
            </button>
          </div>

          {viewTab === 'PAYOUTS' && (
            <Btn to="/seller/payouts/new" variant="primary" size="sm" icon={Wallet}>
              Rút tiền
            </Btn>
          )}
        </div>
      </div>

      {/* TAB 1: Khoản Thu & Bút Toán Cấn Trừ Đơn Hàng */}
      {viewTab === 'EARNINGS' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Khoản Thu & Bút Toán Cấn Trừ Đơn Hàng</h2>
              <p className="text-xs text-ink-soft">
                Doanh thu bán hàng thực nhận (sau phí sàn 5%) và các bút toán hoàn tiền/cấn trừ cước vận chuyển 2 chiều.
              </p>
            </div>
          </div>

          <Toolbar>
            <FilterTabs
              value={tab}
              onChange={handleTabChange}
              options={[
                { value: '', label: 'Tất cả khoản thu', count: all.length },
                ...(Object.keys(EARNING_STATUS) as EarningStatus[]).map((s) => ({
                  value: s,
                  label: EARNING_STATUS[s].label,
                  count: all.filter((e) => e.status === s).length,
                })),
              ]}
            />
          </Toolbar>
          <QueryState isLoading={q.isLoading} error={q.error}>
            <DataTable
              rows={pagedEarnings}
              rowKey={(e) => e.id}
              columns={[
                {
                  key: 'id',
                  header: 'Mã thu nhập / đơn',
                  render: (e) => <CellTitle title={e.id} sub={`#ORD-${e.orderId}`} to={`/seller/revenue/${e.id}`} />,
                },
                { key: 'p', header: 'Mẫu & SKU', render: (e) => <CellTitle title={e.product} sub={e.sku} /> },
                { key: 'g', header: 'Doanh số gốc', render: (e) => formatVnd(e.gross) },
                {
                  key: 'f',
                  header: 'Phí sàn (5%)',
                  render: (e) =>
                    e.status === 'REFUNDED' ? (
                      <span className="text-ink-soft">0đ (Đã huỷ)</span>
                    ) : (
                      <span className={e.status === 'RELEASED' ? 'text-danger' : 'text-ink-soft'}>
                        -{formatVnd(earningCommission(e))} {e.status === 'RELEASED' ? '' : '(Tạm tính)'}
                      </span>
                    ),
                },
                {
                  key: 'n',
                  header: 'Thực nhận (Net)',
                  render: (e) =>
                    e.status === 'REFUNDED' ? (
                      <strong className="text-danger">-{formatVnd(e.returnShippingFee ?? 0)} (Cước hoàn)</strong>
                    ) : (
                      <strong>
                        {formatVnd(
                          e.netAmount && e.netAmount > 0
                            ? e.netAmount
                            : e.gross * (1 - (e.feeRate > 0 ? e.feeRate : 0.05)),
                        )}
                      </strong>
                    ),
                },
                {
                  key: 's',
                  header: 'Trạng thái',
                  render: (e) => <StatusPill status={e.status} map={EARNING_STATUS} />,
                },
                {
                  key: 'b',
                  header: 'Chi tiết & Ghi chú',
                  render: (e) => (
                    <span className="block max-w-[15rem] text-xs text-ink-soft">
                      {e.blocker ?? 'Đã giải ngân vào ví khả dụng.'}
                    </span>
                  ),
                },
                {
                  key: 'x',
                  header: '',
                  render: (e) => (
                    <Btn to={`/seller/revenue/${e.id}`} size="sm">
                      Sổ cái
                    </Btn>
                  ),
                },
              ]}
            />
            {earningsTotalPages > 1 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-ink-soft">
                <span>
                  Hiển thị{' '}
                  <strong>
                    {filteredEarnings.length === 0 ? 0 : page * EARNINGS_PAGE_SIZE + 1} -{' '}
                    {Math.min((page + 1) * EARNINGS_PAGE_SIZE, filteredEarnings.length)}
                  </strong>{' '}
                  trên tổng số <strong>{filteredEarnings.length}</strong> khoản thu
                </span>
                <Pagination
                  page={page}
                  totalPages={earningsTotalPages}
                  onChange={setPage}
                  className="flex items-center justify-center gap-1.5"
                />
              </div>
            )}
          </QueryState>
        </div>
      )}

      {/* TAB 2: Sổ Cái Biến Động Số Dư Ví (API GET /api/users/me/wallet/ledgers) */}
      {viewTab === 'LEDGERS' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Sổ Cái Biến Động Số Dư Ví (Wallet Ledgers)</h2>
              <p className="text-xs text-ink-soft">
                Ghi nhận toàn bộ dòng tiền cộng, trừ và luân chuyển giữa các ngăn số dư (Khả dụng, Chờ mở khoá 72h, Tạm
                giữ rút tiền).
              </p>
            </div>
          </div>

          <Toolbar>
            <FilterTabs
              value={ledgerBucket}
              onChange={handleLedgerBucketChange}
              options={[
                { value: '', label: 'Tất cả ngăn số dư', count: rawLedgers.length },
                {
                  value: 'available',
                  label: 'Khả dụng',
                  count: rawLedgers.filter((l) => l.bucket === 'available').length,
                },
                {
                  value: 'pending',
                  label: 'Chờ mở khoá 72h',
                  count: rawLedgers.filter((l) => l.bucket === 'pending').length,
                },
                {
                  value: 'held',
                  label: 'Tạm giữ rút tiền',
                  count: rawLedgers.filter((l) => l.bucket === 'held').length,
                },
              ]}
            />
          </Toolbar>

          <QueryState isLoading={qLedgers.isLoading} error={qLedgers.error}>
            {filteredLedgers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface-low/40 p-8 text-center text-xs text-ink-soft">
                Chưa phát sinh bút toán biến động số dư nào trong danh mục này.
              </div>
            ) : (
              <>
                <DataTable
                  rows={pagedLedgers}
                  rowKey={(l) => l.id}
                  columns={[
                    {
                      key: 'id',
                      header: 'Mã bút toán',
                      render: (l) => <code className="text-xs font-bold text-ink">{l.id}</code>,
                    },
                    {
                      key: 'at',
                      header: 'Thời điểm',
                      render: (l) => formatDateTime(l.at),
                    },
                    {
                      key: 't',
                      header: 'Loại biến động',
                      render: (l) => (
                        <div>
                          <p className="font-semibold text-ink text-xs">{l.entryTypeLabel}</p>
                          <span className="text-[11px] text-ink-soft">{l.entryType}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'b',
                      header: 'Ngăn số dư',
                      render: (l) => {
                        const bInfo = LEDGER_BUCKET_MAP[l.bucket.toUpperCase()] ?? {
                          label: l.bucketLabel,
                          tone: 'neutral',
                        }
                        const badgeClass =
                          l.bucket === 'available'
                            ? 'bg-mint text-[#0f5132]'
                            : l.bucket === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-danger'
                        return (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                          >
                            {bInfo.label}
                          </span>
                        )
                      },
                    },
                    {
                      key: 'a',
                      header: 'Biến động',
                      render: (l) => (
                        <strong
                          className={
                            l.signedAmount > 0
                              ? 'text-teal font-bold text-sm'
                              : l.signedAmount < 0
                                ? 'text-danger font-bold text-sm'
                                : 'text-ink-soft text-sm'
                          }
                        >
                          {l.signedAmount > 0 ? `+${formatVnd(l.signedAmount)}` : formatVnd(l.signedAmount)}
                        </strong>
                      ),
                    },
                    {
                      key: 'after',
                      header: 'Số dư sau GD',
                      render: (l) => (
                        <span className="text-xs font-semibold text-ink">{formatVnd(l.balanceAfter)}</span>
                      ),
                    },
                    {
                      key: 'ref',
                      header: 'Tham chiếu',
                      render: (l) => {
                        if (l.orderId) {
                          return (
                            <Btn to={`/seller/revenue/ERN-${l.orderId}`} size="sm">
                              Đơn #{l.orderId}
                            </Btn>
                          )
                        }
                        if (l.transactionId) {
                          return <span className="text-xs text-ink-soft">GD #{l.transactionId}</span>
                        }
                        return <span className="text-xs text-ink-soft">—</span>
                      },
                    },
                  ]}
                />
                {ledgersTotalPages > 1 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-ink-soft">
                    <span>
                      Hiển thị{' '}
                      <strong>
                        {ledgerPage * LEDGERS_PAGE_SIZE + 1} -{' '}
                        {Math.min((ledgerPage + 1) * LEDGERS_PAGE_SIZE, filteredLedgers.length)}
                      </strong>{' '}
                      trên tổng số <strong>{filteredLedgers.length}</strong> bút toán
                    </span>
                    <Pagination
                      page={ledgerPage}
                      totalPages={ledgersTotalPages}
                      onChange={setLedgerPage}
                      className="flex items-center justify-center gap-1.5"
                    />
                  </div>
                )}
              </>
            )}
          </QueryState>
        </div>
      )}

      {/* TAB 3: Lịch Sử Yêu Cầu Rút Tiền (API GET /api/users/me/payouts) */}
      {viewTab === 'PAYOUTS' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Lịch Sử Yêu Cầu Rút Tiền</h2>
              <p className="text-xs text-ink-soft">
                Theo dõi tiến độ đối soát và giải ngân tiền về tài khoản ngân hàng của bạn.
              </p>
            </div>
          </div>

          <QueryState isLoading={qPayouts.isLoading} error={qPayouts.error}>
            {payoutList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface-low/40 p-8 text-center text-xs text-ink-soft">
                Chưa phát sinh giao dịch rút tiền nào. Tiến độ chuyển khoản sẽ được hiển thị tại đây sau khi bạn rút
                tiền.
              </div>
            ) : (
              <>
                <DataTable
                  rows={pagedPayouts}
                  rowKey={(p) => p.id}
                  columns={[
                    {
                      key: 'id',
                      header: 'Mã giao dịch',
                      render: (p) => <code className="font-bold text-ink text-xs">{p.id}</code>,
                    },
                    {
                      key: 'at',
                      header: 'Thời điểm yêu cầu',
                      render: (p) => formatDateTime(p.createdAt),
                    },
                    {
                      key: 'a',
                      header: 'Số tiền rút',
                      render: (p) => <strong className="text-teal font-bold text-sm">{formatVnd(p.amount)}</strong>,
                    },
                    {
                      key: 'b',
                      header: 'Tài khoản nhận',
                      render: (p) => (
                        <span className="text-xs font-medium text-ink">
                          {p.bankInfo ?? 'Tài khoản ngân hàng đã xác minh'}
                        </span>
                      ),
                    },
                    {
                      key: 'r',
                      header: 'Lý do rút tiền',
                      render: (p) => (
                        <span className="text-xs text-ink-soft">{p.reason ?? 'Rút doanh thu bán hàng'}</span>
                      ),
                    },
                    {
                      key: 'ref',
                      header: 'Mã đối soát / NH',
                      render: (p) =>
                        p.transferReference ? (
                          <code className="text-xs text-ink font-semibold">{p.transferReference}</code>
                        ) : (
                          <span className="text-xs text-ink-soft">Đang xử lý</span>
                        ),
                    },
                    {
                      key: 's',
                      header: 'Trạng thái xử lý',
                      render: (p) => {
                        const st = p.status?.toUpperCase()
                        if (st === 'COMPLETED' || st === 'SUCCESS') {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-[#0f5132]">
                              <CheckCircle2 size={13} /> Đã chuyển khoản
                            </span>
                          )
                        }
                        if (st === 'FAILED' || st === 'REJECTED') {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-2.5 py-1 text-xs font-semibold text-danger">
                              <XCircle size={13} /> Chuyển khoản thất bại
                            </span>
                          )
                        }
                        if (st === 'REQUESTED') {
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 text-xs font-semibold text-ink-soft border border-line">
                              <Clock size={13} /> Giao dịch cũ chờ xử lý
                            </span>
                          )
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                            <Clock size={13} /> Đang xử lý chuyển khoản
                          </span>
                        )
                      },
                    },
                  ]}
                />
                {payoutTotalPages > 1 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-ink-soft">
                    <span>
                      Hiển thị{' '}
                      <strong>
                        {payoutPage * PAYOUTS_PAGE_SIZE + 1} -{' '}
                        {Math.min((payoutPage + 1) * PAYOUTS_PAGE_SIZE, payoutList.length)}
                      </strong>{' '}
                      trên tổng số <strong>{payoutList.length}</strong> yêu cầu
                    </span>
                    <Pagination
                      page={payoutPage}
                      totalPages={payoutTotalPages}
                      onChange={setPayoutPage}
                      className="flex items-center justify-center gap-1.5"
                    />
                  </div>
                )}
              </>
            )}
          </QueryState>
        </div>
      )}

      <div className="mt-8">
        <RuleBox
          title="4 quy tắc dòng tiền người bán"
          rules={[
            'Tự động cấn trừ hoa hồng sàn 5% tại nguồn: Với mỗi đơn hàng thanh toán thành công, hệ thống tự động khấu trừ ngay 5% phí dịch vụ nền tảng từ doanh số gốc và chỉ ghi nhận 95% thực nhận (Net Amount) vào ví người bán. Người bán tuyệt đối KHÔNG cần nạp tiền để đóng phí sàn.',
            'Rút tiền tự động: Seller được rút toàn bộ số dư khả dụng về tài khoản ngân hàng đã xác minh. Hệ thống xử lý giao dịch ngay mà không cần quản trị viên phê duyệt.',
            'Công nợ cước hoàn trả (Chỉ khi ví xưởng không đủ bù ship): Khi phát sinh khiếu nại hoàn tiền mà số dư ví không đủ cấn trừ phí ship 2 chiều, phần thiếu mới ghi nhận thành nợ cước và tự động thu hồi khi có doanh thu giải ngân mới.',
            'Chu kỳ giải ngân & đơn COD: Doanh thu thực nhận chuyển từ “chờ mở khóa” sang “khả dụng” sau 72h kể từ lúc người mua nhận hàng. Riêng đơn COD, doanh thu được ghi nhận sau khi bưu cục GHTK hoàn tất đối soát tiền thu hộ về sàn.',
          ]}
        />
      </div>
    </>
  )
}
