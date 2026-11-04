import {
  Award,
  Check,
  CheckCircle2,
  Flag,
  Info,
  Layers,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { Pagination } from '../../../shared/ui/Pagination'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useToast } from '../../../shared/ui/toast'
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

export function StorefrontPage() {
  const id = Number(useParams().storefrontId)
  const [params, setParams] = useSearchParams()
  const toast = useToast()

  const keyword = params.get('q') ?? ''
  const sort = (SORTS.find((s) => s.value === params.get('sort'))?.value ?? 'newest') as CatalogSort
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1) || 0
  const activeTab = params.get('tab') === 'about' ? 'about' : 'products'

  const shop = usePublicStorefront(id)
  const products = useStorefrontProducts(id, { keyword, sort, page, size: 12 })
  const [q, setQ] = useState(keyword)

  // Lưu trạng thái theo dõi trong localStorage
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`follow_shop_${id}`)
      return saved === 'true'
    } catch {
      return false
    }
  })

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
    update({ q: q.trim(), tab: 'products' })
  }

  const handleToggleFollow = () => {
    const next = !isFollowing
    setIsFollowing(next)
    try {
      localStorage.setItem(`follow_shop_${id}`, String(next))
    } catch {
      // ignore
    }
    if (next) {
      toast(`Đã theo dõi xưởng ${shop.data?.name || ''}!`, 'success')
    } else {
      toast(`Đã bỏ theo dõi xưởng ${shop.data?.name || ''}.`)
    }
  }

  const handleChat = () => {
    toast(`Đang mở kết nối nhắn tin với xưởng ${shop.data?.name || ''}…`, 'success')
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
  const totalProducts = products.data?.totalElements ?? 0

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8 space-y-6">
      {/* Shopee-style Shop Profile Card */}
      <section className="overflow-hidden rounded-[2.5rem] bg-white border border-line shadow-soft">
        {/* Cover Background Banner */}
        <div className="relative h-32 bg-gradient-to-r from-violet-soft/90 via-peach/80 to-mint/80 sm:h-40">
          <div className="absolute inset-0 bg-[radial-gradient(#8069f3_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          <div className="absolute right-4 top-4">
            <a
              href={`/portal/reports/new?type=STOREFRONT&target=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm px-3.5 py-1.5 font-label text-xs font-semibold text-ink-soft hover:bg-white hover:text-danger shadow-xs transition"
            >
              <Flag size={13} /> Báo cáo gian hàng
            </a>
          </div>
        </div>

        {/* Shop Info Container: Left Avatar & Action + Right Shop Stats Grid */}
        <div className="relative px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1.6fr] lg:items-center">
            {/* Left: Avatar, Name, Description, Follow & Chat Buttons */}
            <div className="-mt-14 sm:-mt-16 flex flex-wrap items-start gap-4 sm:gap-5">
              <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-violet to-[#6c52ee] text-white shadow-lift ring-4 ring-white sm:h-28 sm:w-28 font-display text-4xl font-bold">
                {name.charAt(0).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1 pt-2 sm:pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {name}
                  </h1>
                  {s?.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2.5 py-0.5 font-label text-[11px] font-bold text-violet border border-violet/20">
                      <ShieldCheck size={13} className="text-violet" />
                      Xưởng Uy Tín
                    </span>
                  )}
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                  {s?.description || 'Chuyên chế tác mô hình in 3D theo yêu cầu, Art Toy & phụ kiện sáng tạo.'}
                </p>

                <div className="mt-2.5 flex items-center gap-2 text-xs text-ink-soft">
                  <span className="flex items-center gap-1.5 font-semibold text-[#0f7050]">
                    <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                    Đang mở bán
                  </span>
                  <span>·</span>
                  <span>Hoạt động 5 phút trước</span>
                </div>

                {/* Follow & Chat Buttons */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 font-label text-xs font-bold transition shadow-xs ${
                      isFollowing
                        ? 'bg-surface-low text-ink-soft hover:bg-surface-high border border-line'
                        : 'bg-violet text-white hover:bg-violet/90'
                    }`}
                  >
                    {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                    {isFollowing ? 'Đang theo dõi' : '+ Theo dõi shop'}
                  </button>

                  <button
                    type="button"
                    onClick={handleChat}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-white px-4 py-2 font-label text-xs font-bold text-ink hover:border-violet hover:text-violet transition shadow-xs"
                  >
                    <MessageCircle size={14} className="text-violet" />
                    Chat với shop
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Shopee-style 6-metrics trust grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-2xl bg-surface-low/70 p-4 border border-line/60 text-xs">
              <div className="space-y-0.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <Package size={13} className="text-violet" /> Sản phẩm:
                </span>
                <span className="font-bold text-sm text-ink block">{totalProducts} sản phẩm</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <Star size={13} className="text-orange" /> Đánh giá shop:
                </span>
                <span className="font-bold text-sm text-ink flex items-center gap-1">
                  4.9 <span className="text-[11px] font-normal text-ink-soft">(100% hài lòng)</span>
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <MessageCircle size={13} className="text-[#0f7050]" /> Tỉ lệ phản hồi:
                </span>
                <span className="font-bold text-sm text-ink block">100% (Vài phút)</span>
              </div>

              <div className="space-y-0.5 border-t border-line/60 pt-2.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <Truck size={13} className="text-blue-600" /> Vận chuyển:
                </span>
                <span className="font-bold text-sm text-ink block">Toàn quốc (GHTK)</span>
              </div>

              <div className="space-y-0.5 border-t border-line/60 pt-2.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <Award size={13} className="text-violet" /> Chứng nhận:
                </span>
                <span className="font-bold text-sm text-ink block">Xưởng in kiểm duyệt</span>
              </div>

              <div className="space-y-0.5 border-t border-line/60 pt-2.5">
                <span className="text-ink-soft flex items-center gap-1.5 text-[11px]">
                  <Sparkles size={13} className="text-amber-500" /> Tham gia:
                </span>
                <span className="font-bold text-sm text-ink block">Năm 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Tất cả sản phẩm | Giới thiệu xưởng) */}
        <div className="flex items-center gap-2 border-t border-line px-6 sm:px-8">
          <button
            type="button"
            onClick={() => update({ tab: 'products' })}
            className={`flex items-center gap-2 border-b-2 py-3.5 font-label text-sm font-bold transition ${
              activeTab === 'products'
                ? 'border-violet text-violet'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            <Package size={16} />
            Tất cả sản phẩm ({totalProducts})
          </button>
          <button
            type="button"
            onClick={() => update({ tab: 'about' })}
            className={`flex items-center gap-2 border-b-2 py-3.5 font-label text-sm font-bold transition ${
              activeTab === 'about'
                ? 'border-violet text-violet'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            <Info size={16} />
            Hồ sơ & Giới thiệu xưởng
          </button>
        </div>
      </section>

      {/* Tab: Tất cả sản phẩm */}
      {activeTab === 'products' && (
        <>
          {/* Search & Sort Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-[2rem] bg-white p-3 shadow-soft border border-line">
            <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search size={17} className="shrink-0 text-ink-soft" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Tìm kiếm sản phẩm trong ${name}…`}
                aria-label="Tìm trong gian hàng"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
              />
            </form>
            <div className="flex items-center gap-2 border-l border-line/60 pl-3">
              <span className="hidden text-xs font-semibold text-ink-soft sm:inline">Sắp xếp:</span>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
                aria-label="Sắp xếp sản phẩm"
                className="rounded-full bg-surface-low px-4 py-2 text-sm font-semibold outline-none hover:bg-surface-mid transition cursor-pointer"
              >
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid: 4 columns on large screens for balanced e-commerce look */}
          <div>
            {products.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
              <div className="rounded-3xl border border-line bg-white p-12 text-center shadow-soft">
                <Store size={44} className="mx-auto text-ink-soft/40 mb-3" />
                <h3 className="font-display text-lg font-bold text-ink">Chưa tìm thấy sản phẩm nào</h3>
                <p className="mt-1 text-sm text-ink-soft max-w-md mx-auto">
                  {keyword
                    ? `Không có sản phẩm nào khớp với từ khóa "${keyword}". Vui lòng thử tìm với từ khóa khác.`
                    : 'Xưởng hiện tại chưa đăng sản phẩm nào mới hoặc sản phẩm đang chờ duyệt mở bán.'}
                </p>
                {keyword && (
                  <button
                    type="button"
                    onClick={() => update({ q: '' })}
                    className="mt-4 rounded-full bg-violet px-5 py-2 font-label text-xs font-bold text-white shadow-xs hover:bg-violet/90 transition"
                  >
                    Xem tất cả sản phẩm của shop
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
                  products.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                {products.data.items.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {products.data && products.data.totalPages > 1 && (
            <div className="mt-8 flex justify-end">
              <Pagination
                page={products.data.page}
                totalPages={products.data.totalPages}
                onChange={(p) => update({ page: p > 0 ? String(p + 1) : '' })}
              />
            </div>
          )}
        </>
      )}

      {/* Tab: Hồ sơ & Giới thiệu xưởng */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          {/* Giới thiệu chi tiết */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 text-violet">
              <Info size={20} />
              <h2 className="font-display text-xl font-bold text-ink">Giới thiệu về xưởng chế tác</h2>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft max-w-3xl whitespace-pre-line">
              {s?.description || (
                <>
                  Chào mừng bạn đến với <strong>{name}</strong> trên sàn 3DWorld!
                  <br />
                  Xưởng chuyên thiết kế, chế tác mô hình in 3D hoàn thiện với độ chi tiết cao, Art Toy nghệ thuật và các
                  vật phẩm sáng tạo độc bản. Mọi mẫu sản phẩm đều được kiểm định kỹ lưỡng về độ hoàn thiện trước khi đóng
                  hộp gửi tới quý khách.
                </>
              )}
            </p>
          </div>

          {/* 4 Cam kết dịch vụ của xưởng */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-xs space-y-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-soft text-violet">
                <Layers size={18} />
              </div>
              <h3 className="font-bold text-sm text-ink">In 3D chuẩn xác</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Ứng dụng máy in 3D công nghệ cao, kiểm soát mật độ in và tối ưu độ mịn bề mặt sản phẩm.
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-xs space-y-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ecfdf5] text-[#059669]">
                <Package size={18} />
              </div>
              <h3 className="font-bold text-sm text-ink">Đóng gói an toàn</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Đóng gói chống sốc đa lớp chuyên dụng, gia cố chống gãy vỡ cho các chi tiết mô hình nhạy cảm.
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-xs space-y-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eff6ff] text-blue-600">
                <Truck size={18} />
              </div>
              <h3 className="font-bold text-sm text-ink">Giao hàng GHTK</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Liên kết vận chuyển Giao Hàng Tiết Kiệm toàn quốc, theo dõi hành trình đơn hàng minh bạch.
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-xs space-y-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fffbeb] text-amber-600">
                <ShieldCheck size={18} />
              </div>
              <h3 className="font-bold text-sm text-ink">Bảo vệ đơn hàng</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Cam kết hỗ trợ đổi trả hoặc hoàn tiền nhanh chóng nếu sản phẩm có lỗi từ khâu vận chuyển.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
