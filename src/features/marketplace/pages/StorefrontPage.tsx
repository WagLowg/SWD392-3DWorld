import { CalendarClock, Flag, Search, ShieldCheck, Store } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { Pagination } from '../../../shared/ui/Pagination'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { ProductCard, ProductCardSkeleton, SKELETON_KEYS } from '../components/ProductCard'
import { usePublicStorefront, useStorefrontProducts } from '../hooks/useCatalog'
import type { CatalogSort } from '../types/catalog.types'

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
]

/** MP 004 · Chi Tiết Gian Hàng — GET /api/storefronts/{id} + /products */
export function StorefrontPage() {
  const id = Number(useParams().storefrontId)
  const [params, setParams] = useSearchParams()
  const keyword = params.get('q') ?? ''
  const sort = (SORTS.find((s) => s.value === params.get('sort'))?.value ?? 'newest') as CatalogSort
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1) || 0

  const shop = usePublicStorefront(id)
  const products = useStorefrontProducts(id, { keyword, sort, page, size: 12 })
  const [q, setQ] = useState(keyword)
  useEffect(() => setQ(keyword), [keyword])

  useEffect(() => {
    document.title = `${shop.data?.name ?? 'Gian hàng'} · Chợ Đồ Chơi 3DWorld`
  }, [shop.data?.name])

  const update = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!('page' in patch)) next.delete('page')
      return next
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    update({ q: q.trim() })
  }

  const notFound =
    !Number.isInteger(id) || id <= 0 || (shop.error instanceof ApiClientError && shop.error.status === 404)

  if (notFound) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <StatusBlock
          tone="empty"
          title="Không tìm thấy gian hàng"
          body="Gian hàng có thể đã đóng hoặc đường dẫn không đúng."
          action={
            <Link to="/" className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white">
              Về Chợ Đồ Chơi
            </Link>
          }
        />
      </div>
    )
  }

  const s = shop.data
  const name = s?.name || `Xưởng #${id}`

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <section className="overflow-hidden rounded-[2.5rem] bg-white/95 shadow-soft">
        <div className="h-36 bg-gradient-to-r from-violet-soft via-peach to-mint sm:h-48" />
        <div className="-mt-12 flex flex-wrap items-end gap-5 px-6 pb-6 sm:px-8">
          <span className="grid h-24 w-24 place-items-center rounded-[1.75rem] bg-violet text-white shadow-lift">
            <Store size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-label text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Xưởng chế tác · storefront_{id}
            </p>
            {shop.isLoading ? (
              <div className="mt-2 h-9 w-64 animate-pulse rounded-full bg-surface-mid" />
            ) : (
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{name}</h1>
            )}
            {s?.description && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{s.description}</p>}
            <div className="mt-2 flex flex-wrap gap-2 font-label text-[11px] font-semibold">
              {s?.available === false ? (
                <span className="rounded-full bg-peach px-3 py-1 text-orange-deep">Tạm ngừng nhận đơn</span>
              ) : (
                <span className="rounded-full bg-mint px-3 py-1 text-[#0f5132]">Đang mở bán</span>
              )}
              {s?.verificationStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-3 py-1 text-violet">
                  <ShieldCheck size={12} /> {s.verificationStatus === 'VERIFIED' ? 'Đã xác thực' : s.verificationStatus}
                </span>
              )}
              {products.data && (
                <span className="rounded-full bg-surface-low px-3 py-1 text-ink-soft">
                  {products.data.totalElements} sản phẩm
                </span>
              )}
              {s?.expiresAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-low px-3 py-1 text-ink-soft">
                  <CalendarClock size={12} /> Gói đến {new Date(s.expiresAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          </div>
          <a
            href={`/portal/reports/new?type=STOREFRONT&target=${encodeURIComponent(name)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2.5 font-label text-xs font-semibold text-ink-soft hover:text-danger"
          >
            <Flag size={14} /> Báo cáo gian hàng
          </a>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[2rem] bg-white/90 p-3 shadow-soft">
        <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Search size={17} className="shrink-0 text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Tìm trong ${name}…`}
            aria-label="Tìm trong gian hàng"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </form>
        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
          aria-label="Sắp xếp"
          className="rounded-full bg-surface-low px-4 py-2 text-sm font-semibold outline-none"
        >
          {SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {products.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SKELETON_KEYS.map((k) => (
              <ProductCardSkeleton key={k} />
            ))}
          </div>
        ) : products.isError ? (
          <StatusBlock
            tone="error"
            title="Không tải được sản phẩm của xưởng"
            body={products.error instanceof ApiClientError ? products.error.message : 'Vui lòng thử lại.'}
          />
        ) : !products.data?.items.length ? (
          <StatusBlock tone="empty" title="Chưa có sản phẩm" body="Xưởng chưa có sản phẩm nào được duyệt mở bán." />
        ) : (
          <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${products.isPlaceholderData ? 'opacity-60' : ''}`}>
            {products.data.items.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>

      {products.data && products.data.totalPages > 1 && (
        <div className="mt-8 flex justify-end">
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onChange={(p) => update({ page: p > 0 ? String(p + 1) : '' })}
          />
        </div>
      )}
    </div>
  )
}
