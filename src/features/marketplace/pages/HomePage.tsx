import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { goLogin } from '../../auth/services/session'
import { HeroSection } from '../components/HeroSection'
import { EcosystemSection, PolicySection } from '../components/InfoSections'
import { ProductCard, ProductCardSkeleton, SKELETON_KEYS } from '../components/ProductCard'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useCatalog, useCategories } from '../hooks/useCatalog'
import { useSession } from '../../../shared/session/useSession'
import { categoryLabel } from '../lib/format'

/** MP 001 · Trang Chủ Chợ Đồ Chơi */
export function HomePage() {
  const featured = useCatalog({ page: 0, size: 5 })
  const curated = useCatalog({ page: 0, size: 6 })
  const categories = useCategories()

  useEffect(() => {
    document.title = 'Chợ Đồ Chơi · 3DWorld'
  }, [])

  return (
    <>
      <HeroSection featured={featured.data?.items ?? []} />

      <section className="mx-auto mt-14 max-w-[1320px] px-4 md:px-8">
        <HomeSearch categories={categories.data?.categories ?? []} total={categories.data?.total} />
      </section>

      <section className="mx-auto mt-14 max-w-[1320px] px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Hiện Vật Vật Lý Tuyển Chọn
            {curated.data && (
              <span className="ml-3 align-middle font-label text-sm font-semibold text-ink-soft">
                ({curated.data.totalElements} vật phẩm sẵn sàng)
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-label text-xs font-semibold text-ink-soft">
              <ShieldCheck size={14} className="text-teal" /> Bảo đảm sản phẩm vật lý · không bán file STL
            </span>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 font-label text-sm font-semibold text-violet"
            >
              Xem tất cả <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <CuratedGrid query={curated} />
      </section>

      <EcosystemSection />
      <PolicySection />
    </>
  )
}

function CuratedGrid({ query }: { query: ReturnType<typeof useCatalog> }) {
  const { data: user } = useSession()
  if (query.isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SKELETON_KEYS.map((k) => (
          <ProductCardSkeleton key={k} />
        ))}
      </div>
    )
  }
  if (query.isError) {
    const unauthorized = query.error instanceof ApiClientError && query.error.status === 401
    return (
      <StatusBlock
        tone="error"
        title="Không tải được vật phẩm"
        body={query.error instanceof ApiClientError ? query.error.message : 'Vui lòng kiểm tra kết nối và thử lại.'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {unauthorized && !user && (
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
              onClick={() => query.refetch()}
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          </div>
        }
      />
    )
  }
  if (!query.data?.items.length) {
    return (
      <StatusBlock
        tone="empty"
        title="Chưa có vật phẩm nào"
        body="Các xưởng sẽ sớm đăng sản phẩm mới. Quay lại sau nhé!"
      />
    )
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
      {query.data.items.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  )
}

function HomeSearch({ categories, total }: { categories: { code: string; count: number }[]; total?: number }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products')
  }

  return (
    <div className="rounded-[2rem] bg-white p-3 shadow-soft sm:p-4">
      <form onSubmit={submit} aria-label="Tìm kiếm vật phẩm" className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-full bg-surface-low px-4 focus-within:ring-2 focus-within:ring-violet/40">
          <Search size={18} className="shrink-0 text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm mô hình, tượng nhỏ, artisan keycap, hoặc nhà thiết kế…"
            aria-label="Từ khoá"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70"
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 font-label text-sm font-semibold text-white hover:bg-violet"
        >
          Tìm Kiếm
          <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
            <ArrowRight size={15} />
          </span>
        </button>
      </form>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Link
          to="/products"
          className="shrink-0 rounded-full bg-violet px-4 py-2 font-label text-xs font-semibold text-white shadow-sm"
        >
          Tất Cả Sản Phẩm{total !== undefined ? ` (${total})` : ''}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.code}
            to={`/products?category=${encodeURIComponent(c.code)}`}
            className="shrink-0 rounded-full bg-surface-low px-4 py-2 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high hover:text-ink"
          >
            {categoryLabel(c.code)} ({c.count})
          </Link>
        ))}
      </div>
    </div>
  )
}
