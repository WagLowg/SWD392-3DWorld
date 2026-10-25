import {
  ArrowLeft,
  ArrowRight,
  Box,
  Flag,
  Gem,
  Image as ImageIcon,
  Link2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { ProductCard } from '../components/ProductCard'
import { ProductMedia } from '../components/ProductMedia'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { Breadcrumbs, QuantityStepper, StockBar } from '../../../shared/ui/primitives'
import { VariantPicker } from '../components/VariantPicker'
import { useAddToCart } from '../hooks/useCart'
import { useCatalog, useProductDetail, useProductReviews } from '../hooks/useCatalog'
import {
  activeVariants,
  badgeLabel,
  categoryLabel,
  formatAttributes,
  formatRating,
  formatVnd,
  resolveMediaUrl,
} from '../lib/format'
import { useMarketplaceUiStore } from '../stores/marketplace-ui.store'
import type { ProductDetail, ProductVariant } from '../types/catalog.types'

/** MP 003 · Chi Tiết Sản Phẩm */
export function ProductDetailPage() {
  const { productId } = useParams()
  const id = Number(productId)
  const valid = Number.isInteger(id) && id > 0
  const { data, isLoading, isError, error, refetch } = useProductDetail(valid ? id : undefined)

  useEffect(() => {
    if (data) document.title = `${data.product.title} · Chợ Đồ Chơi 3DWorld`
  }, [data])

  const notFound =
    !valid || (isError && error instanceof ApiClientError && (error.status === 404 || error.status === 400))

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      {notFound ? (
        <StatusBlock
          tone="empty"
          title="Không tìm thấy vật phẩm"
          body={
            error instanceof ApiClientError ? error.message : 'Sản phẩm có thể đã ngừng bán hoặc đường dẫn không đúng.'
          }
          action={
            <Link to="/products" className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white">
              Về Chợ Đồ Chơi
            </Link>
          }
        />
      ) : isLoading ? (
        <DetailSkeleton />
      ) : isError || !data ? (
        <StatusBlock
          tone="error"
          title="Không tải được vật phẩm"
          body={error instanceof ApiClientError ? error.message : 'Vui lòng thử lại.'}
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          }
        />
      ) : (
        <ProductView detail={data} />
      )}
    </div>
  )
}

function ProductView({ detail }: { detail: ProductDetail }) {
  const { product } = detail
  const media = detail.media ?? []
  const variants = useMemo(() => activeVariants(detail.variants), [detail.variants])
  const [selected, setSelected] = useState<ProductVariant | undefined>(
    () => variants.find((v) => v.available > 0) ?? variants[0],
  )
  const [quantity, setQuantity] = useState(1)
  const [mediaIndex, setMediaIndex] = useState(0)
  const { addToCart, isPending } = useAddToCart()
  const showToast = useMarketplaceUiStore((s) => s.showToast)
  const navigate = useNavigate()

  const available = Math.max(0, selected?.available ?? 0)
  const soldOut = !selected || available <= 0
  const shop = detail.storefront
  const shopName = shop?.name || `Xưởng #${product.storefrontId}`
  const shopClosed = shop?.available === false
  const buyNowBlocked = detail.buyNowEligible === false || shopClosed
  const reportHref = `/portal/reports/new?type=PRODUCT&productId=${product.id}&target=${encodeURIComponent(product.title)}`

  useEffect(() => setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, available))), [available])

  const add = () => selected && addToCart({ variantId: selected.id, quantity })

  // Mua ngay: thêm vào giỏ rồi chuyển thẳng sang thanh toán chỉ với món này
  const buyNow = async () => {
    if (!selected) return
    const cart = await addToCart({ variantId: selected.id, quantity }, { silent: true })
    const item = cart?.items.find((i) => i.variantId === selected.id)
    if (item) navigate(`/checkout?items=${item.itemId}`)
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      showToast('Đã sao chép liên kết sản phẩm.')
    } catch {
      showToast('Không sao chép được liên kết.', 'error')
    }
  }

  return (
    <>
      {/* Breadcrumb + meta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            {
              label: 'Trang Chủ',
              render: (l) => (
                <Link to="/" className="hover:text-violet">
                  {l}
                </Link>
              ),
            },
            {
              label: 'Chợ Đồ Chơi',
              render: (l) => (
                <Link to="/products" className="hover:text-violet">
                  {l}
                </Link>
              ),
            },
            ...(product.category
              ? [
                  {
                    label: categoryLabel(product.category),
                    render: (l: string) => (
                      <Link
                        to={`/products?category=${encodeURIComponent(product.category)}`}
                        className="hover:text-violet"
                      >
                        {l}
                      </Link>
                    ),
                  },
                ]
              : []),
            { label: product.title },
          ]}
        />
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft hover:bg-surface-low"
        >
          <ArrowLeft size={14} /> Quay lại danh mục
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-full bg-white/70 px-5 py-2.5 font-label text-xs text-ink-soft">
        <span>
          Mã định danh: <code className="rounded-md bg-surface-low px-1.5 py-0.5 text-ink">prd_{product.id}</code>
        </span>
        {selected && (
          <span>
            Biến thể SKU: <code className="rounded-md bg-violet-soft px-1.5 py-0.5 text-violet">{selected.sku}</code>
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 font-semibold text-ink">
          <span className={`h-2 w-2 rounded-full ${variants.length ? 'bg-teal' : 'bg-line'}`} />
          {variants.length ? 'Đang mở bán vật lý (Active)' : 'Tạm ngừng bán'}
        </span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        {/* Cột trái: ảnh + thư viện */}
        <div className="min-w-0 animate-fade-up">
          <div className="group relative rounded-[2.5rem] bg-white/90 p-4 shadow-soft">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 font-label text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange" /> Ảnh sản phẩm · Chế độ chi tiết
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1 text-ink-soft">
                <Box size={12} /> Xem 3D sẽ có khi API trả file mô hình
              </span>
            </div>
            <ProductMedia
              key={media[mediaIndex] ?? 'none'}
              src={media[mediaIndex]}
              alt={product.title}
              seed={product.id}
              className="aspect-square rounded-[2rem]"
            />
          </div>

          <div className="mt-6">
            <h2 className="inline-flex flex-wrap items-center gap-2 font-display text-xl font-bold">
              <ImageIcon size={18} className="text-orange" /> Thư Viện Ảnh Chế Tác
              <span className="font-label text-xs font-semibold text-ink-soft">
                ({media.length} ảnh từ product_media)
              </span>
            </h2>
            {media.length ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {media.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setMediaIndex(i)}
                    aria-label={`Ảnh ${i + 1}`}
                    aria-pressed={i === mediaIndex}
                    className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-soft transition ${
                      i === mediaIndex ? 'ring-2 ring-orange' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ProductMedia src={src} alt="" seed={product.id + i} className="h-full w-full rounded-xl" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">Xưởng chưa tải ảnh cho sản phẩm này.</p>
            )}
          </div>

          <ul className="mt-6 grid gap-3 rounded-[2rem] bg-white/90 p-5 shadow-soft sm:grid-cols-3">
            {[
              { icon: Gem, title: 'In 3D vật lý', sub: 'Không bán file số', tone: 'bg-violet-soft text-violet' },
              { icon: ShieldCheck, title: 'Bảo vệ người mua', sub: 'Hỗ trợ hoàn tiền', tone: 'bg-teal-soft text-teal' },
              {
                icon: Package,
                title: 'Hộp chống va đập',
                sub: 'Đóng gói theo xưởng',
                tone: 'bg-peach text-orange-deep',
              },
            ].map(({ icon: Icon, title, sub, tone }) => (
              <li key={title} className="flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-ink-soft">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột phải: thông tin mua */}
        <div className="min-w-0 animate-fade-up [animation-delay:80ms]">
          <div className="rounded-[2.5rem] bg-white/95 p-6 shadow-soft sm:p-8 lg:sticky lg:top-28">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {product.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 font-label text-xs font-semibold text-[#0f5132]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0f5132]" /> {categoryLabel(product.category)}
                  </span>
                )}
                {variants.length > 1 && (
                  <span className="rounded-full bg-peach px-3 py-1 font-label text-xs font-semibold text-orange-deep">
                    {variants.length} phiên bản
                  </span>
                )}
                {product.badgeType && (
                  <span className="rounded-full bg-butter px-3 py-1 font-label text-xs font-semibold text-[#6b4e00]">
                    {badgeLabel(product.badgeType)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={share}
                aria-label="Sao chép liên kết"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-low hover:bg-surface-high"
              >
                <Link2 size={16} />
              </button>
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {product.title}
            </h1>
            {selected && (
              <p className="mt-1 font-display text-xl font-semibold text-orange">
                {formatAttributes(selected.attributes)}
              </p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-label text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <Star size={13} className={product.reviewCount ? 'fill-orange text-orange' : 'text-line'} />
                {product.reviewCount
                  ? `${formatRating(product.averageRating)} · ${product.reviewCount} đánh giá`
                  : 'Chưa có đánh giá'}
              </span>
              {!!product.salesCount && <span>Đã bán {product.salesCount.toLocaleString('vi-VN')}</span>}
            </p>

            {/* Xưởng */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-low p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet text-white">
                <Store size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{shopName}</p>
                <p className="line-clamp-1 font-label text-[11px] text-ink-soft">
                  {shopClosed ? 'Xưởng đang tạm ngừng nhận đơn' : shop?.description || 'Xưởng chế tác trên 3DWorld'}
                </p>
              </div>
              <Link
                to={`/shop/${product.storefrontId}`}
                className="rounded-full bg-white px-3 py-1.5 font-label text-xs font-semibold text-violet hover:bg-violet-soft"
              >
                Xem xưởng
              </Link>
            </div>

            {/* Giá */}
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-peach/70 to-butter/60 p-5">
              <p className="font-display text-4xl font-bold">
                {selected ? formatVnd(selected.price).replace('₫', '') : '—'}
                <span className="ml-1 text-2xl">₫</span>
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-label text-xs text-ink-soft">
                <ShieldCheck size={13} className="text-teal" /> Giá niêm yết theo phiên bản đã chọn
              </p>
            </div>

            {/* Chọn phiên bản */}
            {variants.length > 0 && (
              <div className="mt-6">
                <VariantPicker variants={variants} selected={selected} onSelect={setSelected} />
              </div>
            )}

            {/* Tồn kho */}
            {selected && (
              <div className="mt-6 rounded-2xl bg-surface-low p-4">
                <div className="flex items-center justify-between font-label text-xs font-semibold">
                  <span>Tình trạng khả dụng tồn kho:</span>
                  <span className={soldOut || available <= 5 ? 'text-danger' : 'text-teal'}>
                    {soldOut ? 'Tạm hết hàng' : `Còn ${available} sản phẩm`}
                  </span>
                </div>
                <div className="mt-2.5">
                  <StockBar available={available} stock={selected.stock} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-ink-soft">
                  stock: {selected.stock} · đang giữ chỗ: {selected.reserved} · sẵn sàng giao: {available}
                </p>
              </div>
            )}

            {/* Số lượng + mua */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                max={Math.max(1, available)}
                disabled={soldOut}
                onChange={setQuantity}
              />
              <span className="font-label text-xs text-ink-soft">Tối đa {available} sản phẩm theo tồn kho</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={add}
                disabled={soldOut || isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-low px-5 py-3.5 font-label text-sm font-semibold hover:bg-surface-high disabled:opacity-40"
              >
                <ShoppingCart size={17} className="text-orange" /> Thêm Vào Giỏ Hàng
              </button>
              <button
                type="button"
                onClick={buyNow}
                disabled={soldOut || isPending || buyNowBlocked}
                title={buyNowBlocked ? 'Sản phẩm hiện chưa hỗ trợ mua ngay' : undefined}
                className="inline-flex items-center justify-between gap-2 rounded-full bg-ink py-2 pl-6 pr-2 font-label text-sm font-semibold text-white hover:bg-violet disabled:opacity-40"
              >
                Mua Ngay Vật Lý
                <span className="grid h-9 w-9 place-items-center rounded-full bg-orange">
                  <ArrowRight size={16} />
                </span>
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 font-label text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-teal">
                <ShieldCheck size={14} /> Bảo vệ người mua 3DWorld
              </span>
              <a href={reportHref} className="inline-flex items-center gap-1.5 text-ink-soft hover:text-danger">
                <Flag size={13} /> Báo cáo sản phẩm vi phạm
              </a>
            </div>
          </div>
        </div>
      </div>

      <DetailTabs detail={detail} variants={variants} />
      <RelatedProducts category={product.category} excludeId={product.id} />
    </>
  )
}

const TABS = [
  { id: 'story', label: 'Mô Tả & Nghệ Thuật Chế Tác' },
  { id: 'specs', label: 'Đặc Tả Kỹ Thuật' },
  { id: 'reviews', label: 'Đánh Giá' },
  { id: 'shipping', label: 'Vận Chuyển & Quy Tắc' },
] as const

function DetailTabs({ detail, variants }: { detail: ProductDetail; variants: ProductVariant[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('story')
  const { product } = detail

  return (
    <section className="mt-16">
      <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-full bg-white/80 p-1 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-5 py-2.5 font-label text-sm font-semibold transition ${
              tab === t.id ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[2.5rem] bg-white/95 p-6 shadow-soft sm:p-10">
        {tab === 'story' && (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="font-display text-2xl font-bold">{product.title}</h2>
              {detail.description ? (
                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                  {detail.description}
                </p>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                  <strong className="text-ink">{product.title}</strong> thuộc danh mục{' '}
                  <strong className="text-ink">{categoryLabel(product.category)}</strong>, được chế tác và đóng gói bởi{' '}
                  {detail.storefront?.name || `Xưởng #${product.storefrontId}`}. Hiện có {variants.length} phiên bản
                  đang mở bán: {variants.map((v) => formatAttributes(v.attributes) || v.sku).join('; ')}.
                </p>
              )}
            </div>
            <div className="rounded-[1.75rem] bg-surface-low p-6">
              <span className="rounded-full bg-peach px-3 py-1 font-label text-[11px] font-semibold text-orange-deep">
                Quy cách đóng gói
              </span>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[
                  'Vật phẩm in 3D đã hoàn thiện',
                  'Hộp chống va đập theo chuẩn xưởng',
                  'Mã SKU in trên nhãn kiện hàng',
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="text-orange">✓</span> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'specs' && (
          <div className="overflow-x-auto">
            {detail.specifications && (
              <p className="mb-6 whitespace-pre-line rounded-2xl bg-surface-low p-5 text-sm leading-relaxed">
                {detail.specifications}
              </p>
            )}
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="font-label text-xs uppercase tracking-wider text-ink-soft">
                <tr className="border-b border-line">
                  <th className="py-3 pr-4">SKU</th>
                  <th className="py-3 pr-4">Thuộc tính</th>
                  <th className="py-3 pr-4 text-right">Giá</th>
                  <th className="py-3 pr-4 text-right">Tồn kho</th>
                  <th className="py-3 pr-4 text-right">Đang giữ</th>
                  <th className="py-3 text-right">Sẵn sàng</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{v.sku}</td>
                    <td className="py-3 pr-4">{formatAttributes(v.attributes) || '—'}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatVnd(v.price)}</td>
                    <td className="py-3 pr-4 text-right">{v.stock}</td>
                    <td className="py-3 pr-4 text-right">{v.reserved}</td>
                    <td className={`py-3 text-right font-semibold ${v.available > 0 ? 'text-teal' : 'text-danger'}`}>
                      {v.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-label text-xs text-ink-soft">
              Mã sản phẩm: prd_{product.id} · Ảnh: {detail.media?.length ?? 0}
              {detail.media?.[0] && (
                <>
                  {' · '}
                  <a
                    href={resolveMediaUrl(detail.media[0])}
                    className="text-violet underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mở ảnh gốc
                  </a>
                </>
              )}
            </p>
          </div>
        )}

        {tab === 'reviews' && <ReviewList productId={product.id} />}

        {tab === 'shipping' && (
          <div className="grid gap-5 md:grid-cols-3">
            {detail.shippingClass && (
              <p className="rounded-2xl bg-teal-soft/60 p-4 text-sm text-teal md:col-span-3">
                Hạng vận chuyển: <strong>{categoryLabel(detail.shippingClass)}</strong>
              </p>
            )}
            {[
              {
                icon: Store,
                title: 'Tách đơn theo xưởng',
                body: 'Khi đặt hàng, các món của cùng một xưởng gộp thành một đơn con. Mỗi đơn con có vận đơn và phí ship riêng.',
              },
              {
                icon: Truck,
                title: 'Theo dõi từng kiện',
                body: 'Hành trình vận chuyển của từng kiện được cập nhật trong mục Đơn hàng của tôi.',
              },
              {
                icon: ShieldCheck,
                title: 'Hoàn tiền khi có sự cố',
                body: 'Thanh toán qua ZaloPay hoặc khi nhận hàng. Có thể gửi yêu cầu hoàn tiền nếu sản phẩm lỗi hoặc vỡ.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[1.75rem] bg-surface-low p-5">
                <Icon size={20} className="text-violet" />
                <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function reviewImages(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    // không phải JSON → danh sách cách nhau bởi dấu phẩy
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function ReviewList({ productId }: { productId: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useProductReviews(productId, page)

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-surface-low" />
  if (isError) return <p className="text-sm text-danger">Không tải được đánh giá.</p>
  if (!data?.items.length) return <p className="text-sm text-ink-soft">Sản phẩm chưa có đánh giá công khai.</p>

  return (
    <div className="space-y-4">
      {data.items.map((r) => (
        <article key={r.id} className="rounded-[1.5rem] bg-surface-low p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-0.5" role="img" aria-label={`${r.rating} trên 5 sao`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={15} className={n <= r.rating ? 'fill-orange text-orange' : 'text-line'} />
              ))}
            </div>
            <time className="font-label text-[11px] text-ink-soft">
              {new Date(r.createdAt).toLocaleDateString('vi-VN')}
            </time>
          </div>
          {r.comment && <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>}
          {reviewImages(r.images).length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {reviewImages(r.images).map((src) => (
                <img
                  key={src}
                  src={resolveMediaUrl(src)}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </article>
      ))}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 font-label text-xs font-semibold">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full bg-surface-low px-4 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span>
            {page + 1} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full bg-surface-low px-4 py-2 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}

function RelatedProducts({ category, excludeId }: { category: string; excludeId: number }) {
  const { data } = useCatalog({ category, page: 0, size: 4 }, !!category)
  const items = (data?.items ?? []).filter((p) => p.id !== excludeId).slice(0, 3)
  if (!category || !items.length) return null

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-bold tracking-tight">Cùng danh mục {categoryLabel(category)}</h2>
        <Link
          to={`/products?category=${encodeURIComponent(category)}`}
          className="inline-flex items-center gap-1 font-label text-sm font-semibold text-violet"
        >
          Xem tất cả <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      <div className="aspect-square animate-pulse rounded-[2.5rem] bg-white/70" />
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-full bg-white/70" />
        <div className="h-12 w-3/4 animate-pulse rounded-full bg-white/70" />
        <div className="h-96 animate-pulse rounded-[2.5rem] bg-white/70" />
      </div>
    </div>
  )
}
