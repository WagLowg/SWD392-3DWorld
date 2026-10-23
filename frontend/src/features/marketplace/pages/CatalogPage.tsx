import { ArrowRight, Link2, PackageCheck, Search, ShieldCheck, Truck, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../services/http'
import { goLogin } from '../../../shared/auth'
import { Pagination } from '../../../shared/ui/Pagination'
import { ProductCard, ProductCardSkeleton, SKELETON_KEYS } from '../components/ProductCard'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { useCatalog, useCategories, useProductDetails } from '../hooks/useCatalog'
import { useSession } from '../../../shared/session/useSession'
import { activeVariants, categoryLabel, formatVnd, parseAttributes, summarizeVariants } from '../lib/format'
import type { ProductDetail, ProductSummary } from '../types/catalog.types'

const PAGE_SIZE = 12

const SORTS = [
  { value: '', label: 'Mới nhất tuyển chọn' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'name', label: 'Tên A → Z' },
] as const

const PRICE_PRESETS = [
  { label: 'Dưới 350k', min: '', max: '350000' },
  { label: '350k – 600k', min: '350000', max: '600000' },
  { label: 'Trên 600k', min: '600000', max: '' },
] as const

/** MP 002 · Chợ Đồ Chơi (danh sách + bộ lọc) */
export function CatalogPage() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const keyword = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1) || 0
  const sort = params.get('sort') ?? ''
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''
  const material = params.get('material') ?? ''
  const ready = params.get('ready') === '1'

  const catalog = useCatalog({ keyword, category, page, size: PAGE_SIZE })
  const categories = useCategories()
  const session = useSession()
  const items = catalog.data?.items ?? []
  const detailQueries = useProductDetails(items.map((p) => p.id))

  useEffect(() => {
    document.title = 'Khám Phá Vật Phẩm · Chợ Đồ Chơi 3DWorld'
  }, [])

  const update = (patch: Record<string, string>, resetPage = true) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (resetPage && !('page' in patch)) next.delete('page')
      return next
    })
  }

  // Bộ lọc phía client (API chưa hỗ trợ): giá, chất liệu, còn hàng, sắp xếp
  const details = useMemo(() => {
    const map = new Map<number, ProductDetail>()
    detailQueries.forEach((q, i) => {
      if (q.data && items[i]) map.set(items[i].id, q.data)
    })
    return map
  }, [detailQueries, items])

  const materials = useMemo(() => {
    const set = new Set<string>()
    for (const d of details.values())
      for (const v of activeVariants(d.variants)) {
        const m = parseAttributes(v.attributes).material
        if (m) set.add(m)
      }
    return [...set].sort()
  }, [details])

  const clientFiltered = !!(min || max || material || ready || sort)
  const detailsLoading = detailQueries.some((q) => q.isLoading)

  const visible = useMemo(() => {
    if (!clientFiltered) return items
    const minN = min ? Number(min) : undefined
    const maxN = max ? Number(max) : undefined
    const rows = items
      .map((p) => ({ p, d: details.get(p.id) }))
      .filter(({ d }) => {
        if (!d) return false
        const s = summarizeVariants(d.variants)
        if (!s) return false
        if (minN !== undefined && s.maxPrice < minN) return false
        if (maxN !== undefined && s.minPrice > maxN) return false
        if (ready && s.available <= 0) return false
        if (material && !activeVariants(d.variants).some((v) => parseAttributes(v.attributes).material === material))
          return false
        return true
      })
    const price = (d?: ProductDetail) => summarizeVariants(d?.variants)?.minPrice ?? 0
    if (sort === 'price_asc') rows.sort((a, b) => price(a.d) - price(b.d))
    if (sort === 'price_desc') rows.sort((a, b) => price(b.d) - price(a.d))
    if (sort === 'name') rows.sort((a, b) => a.p.title.localeCompare(b.p.title, 'vi'))
    return rows.map(({ p }) => p)
  }, [items, details, clientFiltered, min, max, material, ready, sort])

  const chips = [
    category && { key: 'category', label: `Danh mục: ${categoryLabel(category)}` },
    keyword && { key: 'q', label: `Từ khoá: “${keyword}”` },
    (min || max) && {
      key: 'price',
      label: `Giá: ${min ? formatVnd(Number(min)) : '0₫'} – ${max ? formatVnd(Number(max)) : '∞'}`,
    },
    material && { key: 'material', label: `Chất liệu: ${material}` },
    ready && { key: 'ready', label: 'Còn hàng' },
  ].filter(Boolean) as { key: string; label: string }[]

  const removeChip = (key: string) => (key === 'price' ? update({ min: '', max: '' }) : update({ [key]: '' }))

  const resetAll = () => setParams(new URLSearchParams())
  const data = catalog.data
  const unauthorized = catalog.error instanceof ApiClientError && catalog.error.status === 401

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHeading
        eyebrow="Danh mục sản phẩm · Hiện vật vật lý"
        title="Khám Phá"
        accent="Vật Phẩm Sáng Tạo."
        description="Bộ sưu tập mô hình 3D, đồ chơi nghệ thuật, bàn phím cơ artisan và sinh vật bàn làm việc được chế tác tỉ mỉ từ các xưởng in uy tín trên 3DWorld."
      />
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-label text-xs font-semibold text-ink-soft">
        <li className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-violet" /> Thanh toán ZaloPay / COD
        </li>
        <li className="inline-flex items-center gap-1.5">
          <PackageCheck size={14} className="text-orange" /> Đóng gói chống sốc theo từng xưởng
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Truck size={14} className="text-teal" /> Theo dõi vận đơn từng kiện
        </li>
      </ul>

      <SearchRow
        keyword={keyword}
        category={category}
        categories={categories.data?.categories ?? []}
        onSubmit={(q, c) => update({ q, category: c })}
      />

      {/* Bộ lọc */}
      <div className="mt-4 space-y-4 rounded-[2rem] bg-white/90 p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <FilterChip active={!category} onClick={() => update({ category: '' })}>
              Tất Cả{categories.data ? ` (${categories.data.total})` : ''}
            </FilterChip>
            {(categories.data?.categories ?? []).map((c) => (
              <FilterChip key={c.code} active={category === c.code} onClick={() => update({ category: c.code })}>
                {categoryLabel(c.code)} ({c.count})
              </FilterChip>
            ))}
          </div>
          <label className="flex items-center gap-2 font-label text-xs font-semibold text-ink-soft">
            Sắp xếp:
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value }, false)}
              className="rounded-full bg-surface-low px-4 py-2 text-sm font-semibold text-ink outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
          <PriceRange min={min} max={max} onApply={(a, b) => update({ min: a, max: b }, false)} />
          <label className="flex items-center gap-2 font-label text-xs font-semibold text-ink-soft">
            Chất liệu:
            <select
              value={material}
              onChange={(e) => update({ material: e.target.value }, false)}
              className="min-w-40 rounded-full bg-surface-low px-4 py-2 text-sm font-semibold text-ink outline-none"
            >
              <option value="">Tất cả chất liệu</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 font-label text-xs font-semibold">
            <input
              type="checkbox"
              checked={ready}
              onChange={(e) => update({ ready: e.target.checked ? '1' : '' }, false)}
              className="peer sr-only"
            />
            <span className="relative h-6 w-11 rounded-full bg-surface-high transition peer-checked:bg-orange after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
            Còn hàng, sẵn sàng gửi
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 font-label text-xs">
          <span className="font-semibold text-ink-soft">Đang lọc:</span>
          {chips.length ? (
            chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-3 py-1.5 font-semibold text-violet"
              >
                {c.label}
                <button type="button" aria-label={`Bỏ ${c.label}`} onClick={() => removeChip(c.key)}>
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-ink-soft">Không có bộ lọc</span>
          )}
          {chips.length > 0 && (
            <button type="button" onClick={resetAll} className="font-semibold text-danger hover:underline">
              Đặt lại bộ lọc
            </button>
          )}
          {data && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-orange" />
              Hiển thị {visible.length} trong tổng số {data.totalElements} vật phẩm
            </span>
          )}
        </div>
        {clientFiltered && (
          <ApiNote>
            Lọc giá, chất liệu, còn hàng và sắp xếp đang áp dụng trên trang hiện tại — API /api/catalog mới hỗ trợ
            keyword, category, page, size.
          </ApiNote>
        )}
      </div>

      <div className="mt-8">
        {catalog.isLoading || (clientFiltered && detailsLoading && !visible.length) ? (
          <Grid>
            {SKELETON_KEYS.map((k) => (
              <ProductCardSkeleton key={k} />
            ))}
          </Grid>
        ) : catalog.isError ? (
          <StatusBlock
            tone="error"
            title="Không tải được vật phẩm"
            body={
              catalog.error instanceof ApiClientError ? catalog.error.message : 'Vui lòng kiểm tra kết nối và thử lại.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {unauthorized && !session.data && (
                  <button
                    type="button"
                    onClick={() => goLogin()}
                    className="rounded-full bg-violet px-6 py-3 font-label text-sm font-semibold text-white"
                  >
                    Đăng nhập
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => catalog.refetch()}
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Thử lại
                </button>
              </div>
            }
          />
        ) : !visible.length ? (
          <StatusBlock
            tone="empty"
            title="Không có vật phẩm phù hợp"
            body="Thử từ khoá khác, nới khoảng giá hoặc bỏ bớt bộ lọc."
            action={
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
              >
                Đặt lại bộ lọc
              </button>
            }
          />
        ) : (
          <Grid dim={catalog.isPlaceholderData}>
            {visible.map((p: ProductSummary, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </Grid>
        )}
      </div>

      {data && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 font-label text-xs text-ink-soft">
            <Link2 size={14} /> Đang lưu ngữ cảnh bộ lọc trên URL:
            <code className="rounded-md bg-white/80 px-2 py-1 text-[11px] text-ink">
              /marketplace{location.pathname}
              {location.search}
            </code>
          </p>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => update({ page: p > 0 ? String(p + 1) : '' })}
          />
        </div>
      )}

      <section className="mt-14 flex flex-wrap items-start gap-5 rounded-[2rem] bg-white/90 p-6 shadow-soft md:p-8">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-peach text-orange-deep">
          <ShieldCheck size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">Chính Sách Bảo Vệ Người Mua</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Mỗi xưởng xử lý và giao phần đơn của mình như một đơn con độc lập. Bạn theo dõi vận đơn từng kiện, thanh
            toán qua ZaloPay hoặc khi nhận hàng, và có thể gửi yêu cầu hoàn tiền nếu sản phẩm có vấn đề.
          </p>
        </div>
        <a
          href="/portal/orders"
          className="inline-flex items-center gap-1 self-center rounded-full bg-violet-soft px-4 py-2 font-label text-xs font-semibold text-violet"
        >
          Đơn hàng của tôi <ArrowRight size={13} />
        </a>
      </section>
    </div>
  )
}

function Grid({ children, dim = false }: { children: ReactNode; dim?: boolean }) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6 ${dim ? 'opacity-60 transition-opacity' : ''}`}>
      {children}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-label text-xs font-semibold transition-colors ${
        active ? 'bg-ink text-white' : 'bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink'
      }`}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full bg-orange" />}
      {children}
    </button>
  )
}

function SearchRow({
  keyword,
  category,
  categories,
  onSubmit,
}: {
  keyword: string
  category: string
  categories: { code: string; count: number }[]
  onSubmit: (q: string, category: string) => void
}) {
  const [q, setQ] = useState(keyword)
  const [c, setC] = useState(category)
  useEffect(() => setQ(keyword), [keyword])
  useEffect(() => setC(category), [category])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(q.trim(), c)
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Tìm kiếm vật phẩm"
      className="mt-8 flex flex-wrap items-center gap-2 rounded-full bg-white p-2 shadow-soft sm:flex-nowrap"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
        <Search size={18} className="shrink-0 text-ink-soft" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên mô hình, xưởng chế tác, nhân vật, chất liệu (PLA, Resin, PETG)…"
          aria-label="Từ khoá"
          className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70"
        />
      </div>
      <select
        value={c}
        onChange={(e) => setC(e.target.value)}
        aria-label="Danh mục"
        className="hidden rounded-full bg-surface-low px-4 py-2.5 text-sm font-semibold outline-none sm:block"
      >
        <option value="">Tất cả danh mục</option>
        {categories.map((x) => (
          <option key={x.code} value={x.code}>
            {categoryLabel(x.code)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink py-1.5 pl-5 pr-1.5 font-label text-sm font-semibold text-white hover:bg-violet"
      >
        Tìm Kiếm
        <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
          <ArrowRight size={15} />
        </span>
      </button>
    </form>
  )
}

function PriceRange({ min, max, onApply }: { min: string; max: string; onApply: (min: string, max: string) => void }) {
  const [a, setA] = useState(min)
  const [b, setB] = useState(max)
  useEffect(() => setA(min), [min])
  useEffect(() => setB(max), [max])
  const apply = () => onApply(a.replace(/\D/g, ''), b.replace(/\D/g, ''))

  return (
    <div className="flex flex-wrap items-center gap-2 font-label text-xs font-semibold text-ink-soft">
      Khoảng giá:
      <input
        inputMode="numeric"
        value={a}
        onChange={(e) => setA(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="Từ"
        aria-label="Giá từ"
        className="w-24 rounded-full bg-surface-low px-3 py-2 text-sm text-ink outline-none"
      />
      <span>đến</span>
      <input
        inputMode="numeric"
        value={b}
        onChange={(e) => setB(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="Đến"
        aria-label="Giá đến"
        className="w-24 rounded-full bg-surface-low px-3 py-2 text-sm text-ink outline-none"
      />
      {PRICE_PRESETS.map((p) => {
        const active = min === p.min && max === p.max
        return (
          <button
            key={p.label}
            type="button"
            aria-pressed={active}
            onClick={() => onApply(active ? '' : p.min, active ? '' : p.max)}
            className={`rounded-full px-3 py-2 ${active ? 'bg-orange text-white' : 'bg-surface-low hover:bg-surface-high'}`}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
