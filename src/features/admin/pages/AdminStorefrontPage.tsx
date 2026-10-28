import { BadgeCheck, CreditCard, RefreshCw, ShieldCheck, Store, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusPill } from '../../../shared/ui/kit'
import { useOpsList } from '../../ops/hooks/useOps'
import { OPS_STATUS } from '../../ops/lib/status'

type View = 'verification' | 'storefront'

const LIFECYCLE = [
  {
    icon: ShieldCheck,
    title: '1. Duyệt người bán',
    body: 'Admin duyệt hồ sơ bằng PATCH /api/admin/users/{id}/seller-verification.',
    tone: 'bg-[#eee8ff] text-violet',
  },
  {
    icon: Store,
    title: '2. Tạo gian hàng',
    body: 'Người dùng đã được duyệt tự tạo shop. Backend lưu trạng thái INACTIVE.',
    tone: 'bg-[#fff0df] text-[#d96017]',
  },
  {
    icon: CreditCard,
    title: '3. Thuê gian hàng',
    body: 'Người dùng tạo subscription và thanh toán đúng số tiền của gói.',
    tone: 'bg-[#e9f8ff] text-[#087aa3]',
  },
  {
    icon: Zap,
    title: '4. Kích hoạt tự động',
    body: 'Callback thanh toán hợp lệ kích hoạt 30 ngày và cấp role SELLER.',
    tone: 'bg-[#e3f8ea] text-[#15783e]',
  },
]

export function AdminStorefrontPage() {
  const [view, setView] = useState<View>('verification')
  const [status, setStatus] = useState('')
  const [term, setTerm] = useState('')
  const query = useOpsList('storefront')

  useEffect(() => {
    document.title = 'Quản lý gian hàng · Admin 3DWorld'
  }, [])

  const rows = useMemo(() => {
    const normalized = term.trim().toLowerCase()
    return (query.data ?? []).filter(
      (item) =>
        (!status || item.status === status) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.subtitle ?? ''} ${item.f.phone ?? ''}`.toLowerCase().includes(normalized)),
    )
  }, [query.data, status, term])

  const all = query.data ?? []
  const pending = all.filter((item) => item.status === 'PENDING').length
  const verified = all.filter((item) => item.status === 'VERIFIED').length
  const rejected = all.filter((item) => item.status === 'REJECTED').length

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[.18em] text-violet">Admin · Marketplace</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Quản lý gian hàng</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft sm:text-base">
            Thẩm định điều kiện bán hàng và theo dõi đúng vòng đời storefront — từ hồ sơ người bán đến khi gói thuê được
            thanh toán.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 font-label text-sm font-semibold shadow-sm hover:border-violet disabled:opacity-60"
        >
          <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} /> Làm mới dữ liệu
        </button>
      </header>

      <div
        className="mb-6 inline-flex rounded-2xl border border-line bg-white p-1.5 shadow-sm"
        role="tablist"
        aria-label="Quản lý gian hàng"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'verification'}
          onClick={() => setView('verification')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === 'verification' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
        >
          Duyệt người bán
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-orange px-2 py-0.5 text-[10px] text-white">{pending}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'storefront'}
          onClick={() => setView('storefront')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === 'storefront' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
        >
          Gian hàng & thuê gói
        </button>
      </div>

      {view === 'verification' ? (
        <section className="space-y-5" aria-label="Hàng chờ duyệt người bán">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Chờ duyệt" value={pending} detail="Cần chuyên viên xử lý" color="text-[#d96017]" />
            <Metric label="Đã xác minh" value={verified} detail="Đủ điều kiện tạo shop" color="text-[#15783e]" />
            <Metric label="Đã từ chối" value={rejected} detail="Có lý do trong hồ sơ" color="text-[#b42318]" />
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap gap-3">
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Tìm theo mã, tên gian hàng, số điện thoại…"
                className="min-w-[240px] flex-1 rounded-2xl border border-line bg-[#faf9ff] px-4 py-3 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/10"
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-2xl border border-line bg-[#faf9ff] px-4 py-3 text-sm font-semibold outline-none focus:border-violet"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="VERIFIED">Đã xác minh</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>

            <QueryState isLoading={query.isLoading} error={query.error}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[.08em] text-ink-soft">
                      <th className="border-b border-line px-4 py-3">Hồ sơ</th>
                      <th className="border-b border-line px-4 py-3">Chủ sở hữu</th>
                      <th className="border-b border-line px-4 py-3">Điều kiện</th>
                      <th className="border-b border-line px-4 py-3">Trạng thái</th>
                      <th className="border-b border-line px-4 py-3">Ngày gửi</th>
                      <th className="border-b border-line px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id} className="group hover:bg-[#faf9ff]">
                        <td className="border-b border-line px-4 py-4">
                          <p className="font-bold text-ink">{item.title}</p>
                          <p className="mt-1 text-xs text-ink-soft">
                            USR-{item.id} · {String(item.f.location ?? '—')}
                          </p>
                        </td>
                        <td className="border-b border-line px-4 py-4">
                          <p className="font-semibold">{String(item.f.owner ?? '—')}</p>
                          <p className="mt-1 text-xs text-ink-soft">{String(item.f.phone ?? '—')}</p>
                        </td>
                        <td className="border-b border-line px-4 py-4">
                          <p>{String(item.f.eligible ?? '—')}</p>
                          <p className="mt-1 text-xs text-ink-soft">Ngân hàng: {String(item.f.bankStatus ?? '—')}</p>
                        </td>
                        <td className="border-b border-line px-4 py-4">
                          <StatusPill status={item.status} map={OPS_STATUS.storefront} />
                        </td>
                        <td className="border-b border-line px-4 py-4 text-xs text-ink-soft">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="border-b border-line px-4 py-4 text-right">
                          <Link
                            to={`/admin/storefronts/verifications/${item.id}`}
                            className="inline-flex rounded-xl bg-ink px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet"
                          >
                            {item.status === 'PENDING' ? 'Thẩm định' : 'Xem hồ sơ'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <p className="py-12 text-center text-sm text-ink-soft">Không có hồ sơ phù hợp bộ lọc.</p>
                )}
              </div>
            </QueryState>
          </div>
        </section>
      ) : (
        <section className="space-y-5" aria-label="Vòng đời gian hàng">
          <div className="rounded-[1.75rem] border border-[#d9cffd] bg-gradient-to-br from-white to-[#f3efff] p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet text-white">
                <BadgeCheck size={23} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">Gian hàng không có bước duyệt thủ công riêng</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-soft">
                  Sau khi hồ sơ người bán được Admin duyệt, chủ shop tự tạo storefront. Shop chỉ được kích hoạt khi
                  Backend xác minh thanh toán subscription thành công; lúc đó Backend đồng thời cấp role SELLER. Admin
                  không sửa trạng thái trực tiếp trong database.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LIFECYCLE.map(({ icon: Icon, title, body, tone }) => (
              <article key={title} className="rounded-[1.5rem] border border-line bg-white p-5 shadow-sm">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold">Phạm vi API quản trị hiện tại</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ApiRow
                method="GET"
                path="/api/admin/seller-verifications"
                description="Danh sách hồ sơ người bán theo trạng thái"
                ready
              />
              <ApiRow
                method="PATCH"
                path="/api/admin/users/{id}/seller-verification"
                description="Phê duyệt hoặc từ chối hồ sơ"
                ready
              />
              <ApiRow
                method="GET"
                path="/api/admin/storefronts"
                description="Danh sách mọi gian hàng và tình trạng thuê gói"
                ready={false}
              />
              <ApiRow
                method="PATCH"
                path="/api/admin/storefronts/{id}/status"
                description="Tạm ngưng / mở lại gian hàng có audit log"
                ready={false}
              />
            </div>
            <p className="mt-4 rounded-2xl bg-[#fff7e8] px-4 py-3 text-sm text-[#85500d]">
              Hai API storefront dành cho Admin chưa tồn tại trong BE, nên FE chưa dựng nút can thiệp giả. Khi BE bổ
              sung, bảng quản lý có thể nối trực tiếp mà không đổi luồng thanh toán tự động.
            </p>
          </div>
        </section>
      )}
    </>
  )
}

function Metric({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <article className="rounded-[1.5rem] border border-line bg-white p-5 shadow-sm">
      <p className="font-label text-xs font-bold uppercase tracking-[.12em] text-ink-soft">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
    </article>
  )
}

function ApiRow({
  method,
  path,
  description,
  ready,
}: {
  method: string
  path: string
  description: string
  ready: boolean
}) {
  return (
    <div className="rounded-2xl bg-[#f8f7fc] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${method === 'GET' ? 'bg-[#dff4ff] text-[#087aa3]' : 'bg-[#eee8ff] text-violet'}`}
        >
          {method}
        </span>
        <code className="break-all text-xs font-semibold">{path}</code>
        <span
          className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${ready ? 'bg-mint text-[#15783e]' : 'bg-[#ffe8e5] text-[#b42318]'}`}
        >
          {ready ? 'ĐÃ CÓ' : 'CÒN THIẾU'}
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{description}</p>
    </div>
  )
}
