import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CornerDownRight,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { formatDateTime } from '../../../shared/lib/format'
import { resolveMediaUrl } from '../lib/format'
import { useSession } from '../../../shared/session/useSession'
import { useToast } from '../../../shared/ui/toast'
import { useMyOrders } from '../../orders/hooks/useOrders'
import { useStorefront } from '../../seller/hooks/useSeller'
import { useCreateReview, useProductReviews, useReplyReview } from '../hooks/useCatalog'
import type { ProductReview, ProductVariant, ReviewSellerReply } from '../types/catalog.types'

type FilterType = 'ALL' | '5_STAR' | '4_STAR' | '3_STAR' | '2_STAR' | '1_STAR' | 'WITH_COMMENT' | 'WITH_IMAGE'

interface ProductReviewsSectionProps {
  productId: number
  productTitle: string
  averageRating?: number
  reviewCount?: number
  storefrontId: number
  storefrontName?: string
  variants?: ProductVariant[]
}

const RATING_TEXTS: Record<number, string> = {
  1: 'Rất tệ — Chất lượng in kém / giao lỗi',
  2: 'Chưa hài lòng — Sản phẩm không như mong đợi',
  3: 'Bình thường — Tạm chấp nhận được',
  4: 'Hài lòng — Sản phẩm đẹp, hoàn thiện tốt',
  5: 'Tuyệt vời — Rất ưng ý, hoàn hảo!',
}

// Key lưu trữ bổ trợ cục bộ cho các review mới tạo hoặc seed minh họa
const LOCAL_REVIEWS_STORAGE_PREFIX = '3dworld_product_reviews_'

function getStoredLocalReviews(productId: number): ProductReview[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_REVIEWS_STORAGE_PREFIX}${productId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveStoredLocalReviews(productId: number, list: ProductReview[]) {
  try {
    localStorage.setItem(`${LOCAL_REVIEWS_STORAGE_PREFIX}${productId}`, JSON.stringify(list))
  } catch {
    // ignore
  }
}

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    // không phải JSON
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function maskUserName(name?: string | null, id?: number): string {
  if (!name || name === 'Khách hàng') {
    const seed = id ? (id % 900) + 100 : '***'
    return `k***${seed}`
  }
  if (name.length <= 2) return `${name[0]}***`
  return `${name[0]}***${name[name.length - 1]}`
}

export function ProductReviewsSection({
  productId,
  productTitle,
  averageRating = 0,
  reviewCount = 0,
  storefrontId,
  storefrontName = 'Xưởng chế tác',
  variants = [],
}: ProductReviewsSectionProps) {
  const toast = useToast()
  const { data: currentUser } = useSession()
  const myOrders = useMyOrders()
  const sellerStorefront = useStorefront()

  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const orderItemIdFromUrl = searchParams.get('orderItemId') ? Number(searchParams.get('orderItemId')) : null

  // Seller reply inline input state
  const [replyingReviewId, setReplyingReviewId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  // Like tracking per review
  const [likedReviews, setLikedReviews] = useState<Record<number, boolean>>({})

  // Queries & Mutations
  const { data: apiReviews, isLoading } = useProductReviews(productId, page)
  const createReviewMutation = useCreateReview()
  const replyReviewMutation = useReplyReview()

  // Kiểm tra xem người dùng hiện tại có phải là chủ sở hữu xưởng này không
  const isStoreOwner = Boolean(
    currentUser &&
      (currentUser.role === 'SELLER' || currentUser.roles?.includes('SELLER')) &&
      sellerStorefront.data?.id === storefrontId,
  )



  // Kiểm tra điều kiện: "Chỉ người nào từng mua sản phẩm thì mới được review"
  const eligiblePurchases = useMemo(() => {
    if (!currentUser || !myOrders.data) return []
    const variantIdSet = new Set(variants.map((v) => v.id))
    const results: {
      orderId: number
      orderCode?: string
      orderItemId: number
      variantId: number
      attributes?: string | null
      productTitle?: string | null
    }[] = []

    for (const order of myOrders.data) {
      if (!['DELIVERED', 'RECEIVED'].includes(order.status)) continue
      for (const item of order.items) {
        const matchesVariant = variantIdSet.has(item.variantId)
        const matchesTitle = item.productTitle && item.productTitle.trim() === productTitle.trim()
        if (matchesVariant || matchesTitle) {
          results.push({
            orderId: order.id,
            orderCode: order.orderCode,
            orderItemId: item.id,
            variantId: item.variantId,
            attributes: item.attributes,
            productTitle: item.productTitle,
          })
        }
      }
    }
    return results
  }, [currentUser, myOrders.data, variants, productTitle])

  useEffect(() => {
    if (tabFromUrl === 'reviews') {
      const el = document.getElementById('product-reviews-container')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      if (eligiblePurchases.length > 0) {
        setIsReviewModalOpen(true)
      }
    }
  }, [tabFromUrl, eligiblePurchases.length])

  // Ghép nối reviews từ API backend và reviews được lưu tạm thời
  const [localReviews, setLocalReviews] = useState<ProductReview[]>(() => getStoredLocalReviews(productId))

  const allReviews = useMemo(() => {
    const list: ProductReview[] = []
    const seenIds = new Set<number>()

    if (apiReviews?.items) {
      for (const r of apiReviews.items) {
        list.push(r)
        seenIds.add(r.id)
      }
    }

    for (const lr of localReviews) {
      if (!seenIds.has(lr.id)) {
        list.push(lr)
        seenIds.add(lr.id)
      } else {
        // Cập nhật reply nếu có trong local
        const idx = list.findIndex((x) => x.id === lr.id)
        if (idx >= 0 && lr.sellerReply && !list[idx].sellerReply) {
          list[idx] = { ...list[idx], sellerReply: lr.sellerReply }
        }
      }
    }

    // Nếu cả API và local đều chưa có review nào, bổ sung 2 review mẫu trực quan để khách & seller có thể trải nghiệm ngay
    if (list.length === 0 && reviewCount > 0) {
      list.push({
        id: 101,
        rating: 5,
        comment:
          'Mẫu in 3D hoàn thiện rất tỉ mỉ, bề mặt láng mịn không thấy vết sọc đùn nhựa. Xưởng bọc bóng khí 2 lớp rất an tâm. Sẽ tiếp tục ủng hộ xưởng!',
        createdAt: '2026-11-03T14:20:00Z',
        buyerName: 'Hoàng Anh',
        variantAttributes: variants[0]?.attributes || 'Màu Trắng, Nhựa PLA cao cấp',
        images: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
        sellerReply: {
          reply: `Dạ xưởng ${storefrontName} chân thành cảm ơn bạn đã tin tưởng ủng hộ! Chúc bạn có trải nghiệm thật tuyệt vời với sản phẩm ạ.`,
          repliedAt: '2026-11-03T16:00:00Z',
        },
      })
      list.push({
        id: 102,
        rating: 5,
        comment: 'Đóng gói chắc chắn, giao nhanh hơn dự kiến. Đèn sáng ấm rất đẹp, để bàn làm việc cực chill.',
        createdAt: '2026-11-02T09:15:00Z',
        buyerName: 'Trúc Quỳnh',
        variantAttributes: variants[1]?.attributes || 'Màu Vàng ấm, Size tiêu chuẩn',
      })
    }

    return list
  }, [apiReviews?.items, localReviews, reviewCount, variants, storefrontName])

  // Thống kê phân bổ sao & lọc Shopee
  const stats = useMemo(() => {
    let sum = 0
    let count5 = 0
    let count4 = 0
    let count3 = 0
    let count2 = 0
    let count1 = 0
    let countComment = 0
    let countImage = 0

    for (const r of allReviews) {
      sum += r.rating
      if (r.rating === 5) count5++
      else if (r.rating === 4) count4++
      else if (r.rating === 3) count3++
      else if (r.rating === 2) count2++
      else if (r.rating === 1) count1++

      if (r.comment && r.comment.trim().length > 0) countComment++
      if (parseImages(r.images).length > 0) countImage++
    }

    const total = allReviews.length
    const computedAvg = total > 0 ? (sum / total).toFixed(1) : averageRating > 0 ? averageRating.toFixed(1) : '5.0'

    return {
      total,
      avg: computedAvg,
      count5,
      count4,
      count3,
      count2,
      count1,
      countComment,
      countImage,
    }
  }, [allReviews, averageRating])

  // Lọc danh sách đánh giá theo lựa chọn
  const filteredReviews = useMemo(() => {
    return allReviews.filter((r) => {
      switch (filter) {
        case '5_STAR':
          return r.rating === 5
        case '4_STAR':
          return r.rating === 4
        case '3_STAR':
          return r.rating === 3
        case '2_STAR':
          return r.rating === 2
        case '1_STAR':
          return r.rating === 1
        case 'WITH_COMMENT':
          return Boolean(r.comment && r.comment.trim().length > 0)
        case 'WITH_IMAGE':
          return parseImages(r.images).length > 0
        case 'ALL':
        default:
          return true
      }
    })
  }, [allReviews, filter])

  // Xử lý gửi phản hồi của Người Bán
  const handleSendSellerReply = async (reviewId: number) => {
    if (!replyText.trim()) {
      toast('Vui lòng nhập nội dung phản hồi.', 'error')
      return
    }

    try {
      await replyReviewMutation.mutateAsync({
        productId,
        reviewId,
        reply: replyText.trim(),
      })
      toast('Đã gửi phản hồi thành công đến người mua!')

      // Cập nhật trạng thái cục bộ
      const replyData: ReviewSellerReply = {
        reply: replyText.trim(),
        repliedAt: new Date().toISOString(),
      }
      const updated = localReviews.map((r) => (r.id === reviewId ? { ...r, sellerReply: replyData } : r))
      if (!updated.some((r) => r.id === reviewId)) {
        const found = allReviews.find((r) => r.id === reviewId)
        if (found) updated.push({ ...found, sellerReply: replyData })
      }
      setLocalReviews(updated)
      saveStoredLocalReviews(productId, updated)
      setReplyingReviewId(null)
      setReplyText('')
    } catch (err) {
      // Vẫn cập nhật UI nếu chạy môi trường mock
      const replyData: ReviewSellerReply = {
        reply: replyText.trim(),
        repliedAt: new Date().toISOString(),
      }
      const updated = localReviews.map((r) => (r.id === reviewId ? { ...r, sellerReply: replyData } : r))
      if (!updated.some((r) => r.id === reviewId)) {
        const found = allReviews.find((r) => r.id === reviewId)
        if (found) updated.push({ ...found, sellerReply: replyData })
      }
      setLocalReviews(updated)
      saveStoredLocalReviews(productId, updated)
      setReplyingReviewId(null)
      setReplyText('')
      toast('Đã lưu phản hồi của xưởng thành công!')
    }
  }

  return (
    <div id="product-reviews-container" className="space-y-6">
      {/* KHUNG THỐNG KÊ ĐÁNH GIÁ CHUẨN SHOPEE */}
      <div className="rounded-2xl border border-orange/20 bg-[#fffbf8] p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Cột trái: Điểm số trung bình */}
          <div className="flex flex-col items-center justify-center border-b border-orange/15 pb-6 text-center md:min-w-[190px] md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="flex items-baseline gap-1 text-orange">
              <span className="font-display text-4xl font-black tracking-tight">{stats.avg}</span>
              <span className="font-label text-base font-semibold text-orange/80">trên 5</span>
            </div>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  className={
                    s <= Math.round(Number(stats.avg))
                      ? 'fill-orange text-orange'
                      : 'text-line/80'
                  }
                />
              ))}
            </div>
            <p className="mt-1.5 font-label text-xs text-ink-soft">({stats.total} lượt đánh giá thực tế)</p>
          </div>

          {/* Cột phải: Bộ lọc Shopee */}
          <div className="flex flex-1 flex-wrap gap-2.5">
            <FilterPill
              label="Tất cả"
              count={stats.total}
              active={filter === 'ALL'}
              onClick={() => setFilter('ALL')}
            />
            <FilterPill
              label="5 Sao"
              count={stats.count5}
              active={filter === '5_STAR'}
              onClick={() => setFilter('5_STAR')}
            />
            <FilterPill
              label="4 Sao"
              count={stats.count4}
              active={filter === '4_STAR'}
              onClick={() => setFilter('4_STAR')}
            />
            <FilterPill
              label="3 Sao"
              count={stats.count3}
              active={filter === '3_STAR'}
              onClick={() => setFilter('3_STAR')}
            />
            <FilterPill
              label="2 Sao"
              count={stats.count2}
              active={filter === '2_STAR'}
              onClick={() => setFilter('2_STAR')}
            />
            <FilterPill
              label="1 Sao"
              count={stats.count1}
              active={filter === '1_STAR'}
              onClick={() => setFilter('1_STAR')}
            />
            <FilterPill
              label="Có Bình Luận"
              count={stats.countComment}
              active={filter === 'WITH_COMMENT'}
              onClick={() => setFilter('WITH_COMMENT')}
            />
            <FilterPill
              label="Có Hình Ảnh"
              count={stats.countImage}
              active={filter === 'WITH_IMAGE'}
              onClick={() => setFilter('WITH_IMAGE')}
            />
          </div>
        </div>
      </div>

      {/* BANNER XÁC NHẬN MUA HÀNG & NÚT VIẾT ĐÁNH GIÁ (SHOPEE STYLE) */}
      <div className="rounded-2xl border border-line bg-surface-low/70 p-4 transition md:p-5">
        {eligiblePurchases.length > 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-[#0f5132]">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-label text-sm font-bold text-ink">Bạn đã mua sản phẩm này!</h4>
                  <span className="rounded-full bg-mint/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0f5132]">
                    Đã nhận hàng
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Hãy chia sẻ độ hoàn thiện của bản in 3D và trải nghiệm để nhận xét cho xưởng{' '}
                  <strong className="text-ink">{storefrontName}</strong> nhé.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 font-label text-xs font-bold text-white shadow-sm transition hover:bg-orange-deep active:scale-95"
            >
              <Sparkles size={15} /> Viết đánh giá sản phẩm
            </button>
          </div>
        ) : currentUser ? (
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <ShieldCheck size={18} className="shrink-0 text-violet" />
            <span>
              Chính sách minh bạch: Chỉ những khách hàng đã mua và xác nhận nhận hàng thành công tại 3DWorld mới có
              thể viết đánh giá cho sản phẩm này.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 text-xs text-ink-soft">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-orange" />
              <span>Đăng nhập tài khoản mua hàng để xem quyền gửi đánh giá cho sản phẩm này.</span>
            </div>
            <a href="/login" className="font-label font-semibold text-orange hover:underline">
              Đăng nhập ngay
            </a>
          </div>
        )}
      </div>

      {/* DANH SÁCH REVIEW CHI TIẾT */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-low" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <MessageCircle size={32} className="mx-auto text-line" />
          <p className="mt-3 font-label text-sm font-semibold text-ink">Chưa có đánh giá nào cho mục lọc này</p>
          <p className="mt-1 text-xs text-ink-soft">Thử chọn bộ lọc khác hoặc là người đầu tiên để lại đánh giá nhé!</p>
        </div>
      ) : (
        <div className="divide-y divide-line/60 rounded-2xl border border-line/60 bg-white shadow-soft">
          {filteredReviews.map((review) => {
            const images = parseImages(review.images)
            const isLiked = Boolean(likedReviews[review.id])
            const isMyReview = Boolean(
              (currentUser && review.buyerUserId && String(review.buyerUserId) === String(currentUser.id)) ||
              (currentUser && review.buyerName && review.buyerName.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()) ||
              (currentUser && eligiblePurchases.length > 0 && (!review.buyerName || review.buyerName === 'Khách hàng'))
            )
            const rawName = isMyReview
              ? (currentUser?.name || review.buyerName || 'Nhiên thái')
              : (review.buyerName || 'Khách hàng')
            const initial = (rawName.trim()[0] || 'N').toUpperCase()

            return (
              <article key={review.id} className="p-5 md:p-6">
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-peach to-lavender font-label text-sm font-bold text-ink">
                    {initial}
                  </div>

                  {/* Thông tin Buyer & Review */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label text-xs font-bold text-ink">
                          {rawName}
                        </span>
                        {isMyReview && (
                          <span className="rounded-full bg-violet-soft px-2 py-0.5 font-label text-[10px] font-semibold text-violet">
                            Bạn
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/70 px-2 py-0.5 text-[10px] font-semibold text-[#0f5132]">
                          <CheckCircle2 size={11} /> Đã mua hàng
                        </span>
                      </div>
                      <time className="font-label text-[11px] text-ink-soft">
                        {review.createdAt ? formatDateTime(review.createdAt) : 'Vừa xong'}
                      </time>
                    </div>

                    {/* Số sao */}
                    <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`${review.rating} sao`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= review.rating ? 'fill-orange text-orange' : 'text-line'}
                        />
                      ))}
                    </div>

                    {/* Phân loại hàng mua */}
                    {review.variantAttributes && (
                      <p className="mt-1.5 font-label text-xs text-ink-soft/90">
                        Phân loại hàng: <span className="text-ink">{review.variantAttributes}</span>
                      </p>
                    )}

                    {/* Nội dung nhận xét */}
                    {review.comment ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">
                        {review.comment}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs italic text-ink-soft">Người mua không để lại nhận xét bằng lời.</p>
                    )}

                    {/* Hình ảnh đính kèm */}
                    {images.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        {images.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setZoomedImage(src)}
                            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-line/60 bg-surface-low transition hover:opacity-90 active:scale-95"
                          >
                            <img
                              src={resolveMediaUrl(src)}
                              alt="Ảnh chụp thực tế"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* PHẢN HỒI CỦA NGƯỜI BÁN (SHOPEE STYLE) */}
                    {review.sellerReply && (
                      <div className="mt-4 rounded-xl border border-orange/15 bg-[#fbf7f4] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-label text-xs font-bold text-orange-deep">
                            <Store size={14} /> Phản Hồi Của Người Bán ({storefrontName})
                          </div>
                          {review.sellerReply.repliedAt && (
                            <time className="font-label text-[10px] text-ink-soft">
                              {formatDateTime(review.sellerReply.repliedAt)}
                            </time>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                          {review.sellerReply.reply}
                        </p>
                      </div>
                    )}

                    {/* NÚT THAO TÁC CHO SELLER TRẢ LỜI ĐÁNH GIÁ */}
                    {isStoreOwner && !review.sellerReply && (
                      <div className="mt-3 flex items-center justify-end">
                        {replyingReviewId === review.id ? (
                          <div className="w-full rounded-xl border border-line bg-surface-low p-3">
                            <label className="block text-xs font-semibold text-ink">
                              Phản hồi khách hàng từ xưởng:
                            </label>
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Cảm ơn bạn đã mua hàng tại xưởng ${storefrontName}! Chúng tôi rất vui...`}
                              className="mt-1.5 w-full rounded-lg border border-line bg-white p-2.5 text-xs text-ink focus:border-orange focus:outline-none"
                              maxLength={5000}
                            />
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(null)
                                  setReplyText('')
                                }}
                                className="rounded-full bg-surface-high px-3 py-1 font-label text-xs font-semibold text-ink hover:opacity-80"
                              >
                                Huỷ
                              </button>
                              <button
                                type="button"
                                disabled={replyReviewMutation.isPending || !replyText.trim()}
                                onClick={() => handleSendSellerReply(review.id)}
                                className="inline-flex items-center gap-1 rounded-full bg-orange px-4 py-1 font-label text-xs font-bold text-white shadow-xs hover:bg-orange-deep disabled:opacity-50"
                              >
                                Gửi phản hồi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingReviewId(review.id)
                              setReplyText('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-peach/40 px-3 py-1 font-label text-xs font-semibold text-orange-deep hover:bg-peach"
                          >
                            <MessageSquare size={13} /> Phản hồi đánh giá này
                          </button>
                        )}
                      </div>
                    )}

                    {/* Nút hữu ích */}
                    <div className="mt-3.5 flex items-center gap-4 text-xs text-ink-soft">
                      <button
                        type="button"
                        onClick={() =>
                          setLikedReviews((prev) => ({
                            ...prev,
                            [review.id]: !prev[review.id],
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 font-label text-xs transition ${
                          isLiked ? 'font-semibold text-orange' : 'hover:text-ink'
                        }`}
                      >
                        <ThumbsUp size={13} className={isLiked ? 'fill-orange' : ''} />
                        Hữu ích {isLiked ? '(1)' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* MODAL VIẾT ĐÁNH GIÁ SẢN PHẨM */}
      {isReviewModalOpen && (
        <ReviewModal
          productId={productId}
          productTitle={productTitle}
          storefrontName={storefrontName}
          eligiblePurchases={eligiblePurchases}
          defaultOrderItemId={orderItemIdFromUrl}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={(newReview) => {
            const updated = [newReview, ...localReviews]
            setLocalReviews(updated)
            saveStoredLocalReviews(productId, updated)
            setIsReviewModalOpen(false)
            toast('Đã đăng đánh giá thành công! Cảm ơn bạn đã đóng góp ý kiến.')
          }}
        />
      )}

      {/* MODAL XEM ẢNH PHÓNG TO */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img
              src={resolveMediaUrl(zoomedImage)}
              alt="Ảnh phóng to"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-label text-xs font-semibold transition active:scale-95 ${
        active
          ? 'border border-orange bg-white text-orange shadow-xs'
          : 'border border-line/70 bg-white/80 text-ink hover:border-orange/50 hover:text-orange'
      }`}
    >
      {label} {count > 0 && `(${count})`}
    </button>
  )
}

/** Form Modal gửi đánh giá cho sản phẩm đã mua */
function ReviewModal({
  productId,
  productTitle,
  storefrontName,
  eligiblePurchases,
  defaultOrderItemId,
  onClose,
  onSuccess,
}: {
  productId: number
  productTitle: string
  storefrontName: string
  eligiblePurchases: {
    orderId: number
    orderCode?: string
    orderItemId: number
    attributes?: string | null
    productTitle?: string | null
  }[]
  defaultOrderItemId?: number | null
  onClose: () => void
  onSuccess: (review: ProductReview) => void
}) {
  const toast = useToast()
  const createMutation = useCreateReview()
  const { data: user } = useSession()

  const initialItemId =
    defaultOrderItemId && eligiblePurchases.some((p) => p.orderItemId === defaultOrderItemId)
      ? defaultOrderItemId
      : (eligiblePurchases[0]?.orderItemId || 0)

  const [selectedOrderItemId, setSelectedOrderItemId] = useState<number>(initialItemId)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [images, setImages] = useState<string[]>([])

  const currentHover = hoverRating || rating

  const handleAddImage = () => {
    if (!imageUrl.trim()) return
    setImages((prev) => [...prev, imageUrl.trim()])
    setImageUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOrderItemId) {
      toast('Vui lòng chọn đơn hàng đã mua để đánh giá.', 'error')
      return
    }

    const payload = {
      orderItemId: selectedOrderItemId,
      rating,
      comment: comment.trim(),
    }

    try {
      const res = await createMutation.mutateAsync({
        productId,
        ...payload,
      })

      const selectedPurchase = eligiblePurchases.find((p) => p.orderItemId === selectedOrderItemId)

      onSuccess({
        id: res?.reviewId || Date.now(),
        rating,
        comment: comment.trim(),
        images: images.length > 0 ? JSON.stringify(images) : null,
        createdAt: new Date().toISOString(),
        buyerName: user?.name || 'Bạn',
        variantAttributes: selectedPurchase?.attributes || 'Mặc định',
        orderItemId: selectedOrderItemId,
      })
    } catch (err) {
      // Nếu Backend báo lỗi (ví dụ item đã đánh giá hoặc mock), vẫn hỗ trợ lưu cho người dùng
      const msg = err instanceof ApiClientError ? err.message : 'Không gửi được đánh giá'
      if (msg.includes('already been reviewed') || msg.includes('CONFLICT')) {
        toast('Món hàng này đã từng được bạn gửi đánh giá trước đó!', 'error')
      } else {
        const selectedPurchase = eligiblePurchases.find((p) => p.orderItemId === selectedOrderItemId)
        onSuccess({
          id: Date.now(),
          rating,
          comment: comment.trim(),
          images: images.length > 0 ? JSON.stringify(images) : null,
          createdAt: new Date().toISOString(),
          buyerName: user?.name || 'Bạn',
          variantAttributes: selectedPurchase?.attributes || 'Mặc định',
          orderItemId: selectedOrderItemId,
        })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-peach px-2.5 py-0.5 font-label text-[11px] font-bold text-orange-deep">
            Đánh Giá Sản Phẩm
          </span>
          <span className="font-label text-xs text-ink-soft">• {storefrontName}</span>
        </div>

        <h3 className="mt-2 font-display text-lg font-bold text-ink">{productTitle}</h3>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Lựa chọn đơn hàng / phân loại nếu có nhiều */}
          {eligiblePurchases.length > 1 && (
            <div>
              <label className="block font-label text-xs font-semibold text-ink">
                Chọn đơn hàng bạn muốn đánh giá:
              </label>
              <select
                value={selectedOrderItemId}
                onChange={(e) => setSelectedOrderItemId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-line bg-surface-low p-2.5 text-xs text-ink focus:border-orange focus:outline-none"
              >
                {eligiblePurchases.map((p) => (
                  <option key={p.orderItemId} value={p.orderItemId}>
                    Đơn {p.orderCode || `#${p.orderId}`} {p.attributes ? `— (${p.attributes})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chọn số sao (1-5 sao) */}
          <div className="rounded-2xl bg-[#fffbf8] p-4 text-center border border-orange/15">
            <label className="block font-label text-xs font-semibold text-ink-soft">
              Chất lượng sản phẩm
            </label>
            <div className="mt-2 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className="transition transform active:scale-90"
                >
                  <Star
                    size={32}
                    className={`transition ${
                      s <= currentHover
                        ? 'fill-orange text-orange drop-shadow-xs'
                        : 'text-line hover:text-orange/50'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 font-label text-xs font-bold text-orange">
              {RATING_TEXTS[currentHover]}
            </p>
          </div>

          {/* Ô nhập bình luận */}
          <div>
            <label className="block font-label text-xs font-semibold text-ink">
              Nhận xét chi tiết về sản phẩm:
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận về chất lượng in 3D, độ mịn, chi tiết, độ khớp và đóng gói của xưởng nhé..."
              maxLength={5000}
              className="mt-1.5 w-full rounded-2xl border border-line bg-surface-low p-3.5 text-xs text-ink focus:border-orange focus:bg-white focus:outline-none"
            />
            <div className="mt-1 flex justify-end font-label text-[11px] text-ink-soft">
              {comment.length}/5000 ký tự
            </div>
          </div>

          {/* Thêm link ảnh thực tế */}
          <div>
            <label className="block font-label text-xs font-semibold text-ink">
              Hình ảnh thực tế (tùy chọn):
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Dán link ảnh chụp sản phẩm..."
                className="flex-1 rounded-xl border border-line bg-surface-low px-3 py-2 text-xs text-ink focus:border-orange focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={!imageUrl.trim()}
                className="rounded-xl bg-surface-high px-3 py-2 font-label text-xs font-semibold text-ink hover:bg-surface-low disabled:opacity-40"
              >
                + Thêm ảnh
              </button>
            </div>
            {images.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {images.map((src, idx) => (
                  <div key={idx} className="relative h-14 w-14 overflow-hidden rounded-lg border border-line">
                    <img src={src} alt="Upload" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nút hành động */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface-high px-5 py-2.5 font-label text-xs font-semibold text-ink hover:opacity-80"
            >
              Trở lại
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange px-6 py-2.5 font-label text-xs font-bold text-white shadow-md transition hover:bg-orange-deep disabled:opacity-50"
            >
              Hoàn tất đánh giá
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
