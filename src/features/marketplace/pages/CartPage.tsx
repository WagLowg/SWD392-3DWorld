import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  GitBranch,
  Info,
  Lock,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../../shared/session/useSession'
import { LoginRequired } from '../../../shared/ui/LoginRequired'
import { ApiNote, PageHeading, QuantityStepper } from '../../../shared/ui/primitives'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { ProductMedia } from '../components/ProductMedia'
import { StorefrontBadge } from '../components/StorefrontBadge'
import { useAcknowledgePrice, useCart, useRemoveCartItem, useRevalidateCart, useUpdateCartItem } from '../hooks/useCart'
import { groupByStorefront, storefrontName } from '../lib/cart'
import { formatAttributes, formatVnd } from '../lib/format'
import { useVariantIndexStore } from '../stores/variant-index.store'
import type { CartItem } from '../types/catalog.types'

/** MP 020 · Giỏ Hàng Vật Lý */
export function CartPage() {
  const session = useSession()
  const cart = useCart()

  useEffect(() => {
    document.title = 'Giỏ Hàng Vật Lý · 3DWorld'
  }, [])

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHeading
        eyebrow="Giỏ hàng vật lý · carts & cart_items"
        title="Giỏ Hàng Vật Lý"
        accent="Tách Nhánh Đa Xưởng & Giữ Chỗ Đơn Hàng."
      />

      <div className="mt-8 flex gap-4 rounded-[1.75rem] border-l-4 border-orange bg-white/90 p-5 shadow-soft">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-peach text-orange-deep">
          <Info size={18} />
        </span>
        <div className="text-sm leading-relaxed text-ink-soft">
          <p className="font-label text-xs font-semibold text-violet">Cơ chế kho hàng</p>
          <p className="mt-1">
            Giỏ hàng chỉ lưu biến thể vật phẩm bạn chọn. Giỏ{' '}
            <strong className="text-danger">không giữ giá cố định</strong> và{' '}
            <strong className="text-danger">không giữ chỗ tồn kho trước</strong> — tồn kho được kiểm tra và giữ chỗ khi
            bạn tiến hành Đặt hàng.
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs">
            <Lock size={12} /> Nền tảng chỉ bán vật phẩm vật lý, không bán hay cho thuê tệp 3D.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {session.isLoading || (session.data && cart.isLoading) ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="h-96 animate-pulse rounded-[2rem] bg-white/70" />
            <div className="h-80 animate-pulse rounded-[2rem] bg-white/70" />
          </div>
        ) : !session.data ? (
          <LoginRequired title="Đăng nhập để xem giỏ hàng" body="Giỏ hàng được lưu theo tài khoản 3DWorld của bạn." />
        ) : cart.isError || !cart.data ? (
          <StatusBlock
            tone="error"
            title="Không tải được giỏ hàng"
            body="Vui lòng thử lại sau ít phút."
            action={
              <button
                type="button"
                onClick={() => cart.refetch()}
                className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
              >
                Thử lại
              </button>
            }
          />
        ) : !cart.data.items.length ? (
          <StatusBlock
            tone="empty"
            title="Giỏ hàng đang trống"
            body="Khám phá các vật phẩm in 3D và thêm món bạn thích nhé."
            action={
              <Link to="/" className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white">
                Tiếp tục mua sắm tại Chợ Đồ Chơi
              </Link>
            }
          />
        ) : (
          <CartContent items={cart.data.items} />
        )}
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          { icon: Boxes, title: 'Chất lượng in chuẩn xưởng', body: 'Mỗi xưởng kiểm định vật phẩm trước khi đóng gói.' },
          { icon: ShieldCheck, title: 'Không bán file số 3D', body: 'Cam kết bảo mật tệp nguồn của nghệ sĩ sáng lập.' },
          { icon: Package, title: 'Hộp chống va đập', body: 'Đóng gói riêng theo từng xưởng, gửi kèm mã SKU.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-center gap-4 rounded-[1.75rem] bg-white/90 p-5 shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-soft text-violet">
              <Icon size={20} />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="text-xs text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CartContent({ items }: { items: CartItem[] }) {
  const navigate = useNavigate()
  const index = useVariantIndexStore((s) => s.variants)
  const remove = useRemoveCartItem()
  const revalidate = useRevalidateCart()

  const buyable = useMemo(() => items.filter((i) => !i.unavailable), [items])
  const unavailable = useMemo(() => items.filter((i) => i.unavailable), [items])
  const groups = useMemo(() => groupByStorefront(buyable, index), [buyable, index])

  // Lưu các món người dùng BỎ chọn → mặc định chọn tất cả, món mới thêm cũng tự được chọn.
  const [deselected, setDeselected] = useState<Set<number>>(() => new Set())
  const selected = useMemo(
    () => new Set(buyable.filter((i) => !deselected.has(i.itemId)).map((i) => i.itemId)),
    [buyable, deselected],
  )

  const toggle = (ids: number[], on: boolean) =>
    setDeselected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.delete(id)
        else next.add(id)
      }
      return next
    })

  const chosen = buyable.filter((i) => selected.has(i.itemId))
  const chosenGroups = groupByStorefront(chosen, index)
  const subtotal = chosen.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0)
  const quantity = chosen.reduce((s, i) => s + i.quantity, 0)
  const allChecked = buyable.length > 0 && chosen.length === buyable.length
  const hasUnknown = groups.some((g) => g.storefrontId === null)
  const priceChanged = chosen.filter((i) => i.priceChanged)

  const removeSelected = async () => {
    for (const item of chosen) await remove.mutateAsync(item.itemId).catch(() => undefined)
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] bg-white/90 px-5 py-4 shadow-soft">
          <div className="inline-flex items-center gap-3 font-display text-lg font-bold">
            <Checkbox
              label="Chọn tất cả vật phẩm có sẵn"
              checked={allChecked}
              onChange={(on) =>
                toggle(
                  buyable.map((i) => i.itemId),
                  on,
                )
              }
            />
            Chọn tất cả vật phẩm có sẵn ({buyable.length})
          </div>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!chosen.length || remove.isPending}
            className="inline-flex items-center gap-1.5 font-label text-xs font-semibold text-ink-soft hover:text-danger disabled:opacity-40"
          >
            <Trash2 size={14} /> Xoá các mục đã chọn
          </button>
        </div>

        {groups.map((group) => {
          const ids = group.items.map((i) => i.itemId)
          const groupChecked = ids.every((id) => selected.has(id))
          return (
            <section
              key={group.storefrontId ?? 'unknown'}
              className="overflow-hidden rounded-[2rem] bg-white/90 shadow-soft"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    checked={groupChecked}
                    onChange={(on) => toggle(ids, on)}
                    label={`Chọn ${storefrontName(group.storefrontId)}`}
                  />
                  <StorefrontBadge
                    storefrontId={group.storefrontId}
                    sub={
                      group.storefrontId === null
                        ? 'Mở trang sản phẩm để hệ thống nhận diện xưởng'
                        : `storefront_${group.storefrontId}`
                    }
                  />
                </div>
                <span className="inline-flex items-center gap-1.5 font-label text-[11px] font-semibold text-ink-soft">
                  Tách kiện độc lập <span className="h-2 w-2 rounded-full bg-orange" />
                </span>
              </header>
              <ul className="divide-y divide-line/70 px-5">
                {group.items.map((item) => (
                  <CartRow
                    key={item.itemId}
                    item={item}
                    checked={selected.has(item.itemId)}
                    onCheck={(on) => toggle([item.itemId], on)}
                  />
                ))}
              </ul>
              <footer className="flex flex-wrap items-center justify-between gap-2 bg-surface-low/70 px-5 py-4">
                <span className="inline-flex items-center gap-1.5 font-label text-xs text-ink-soft">
                  <Truck size={14} /> Đóng gói và gửi trực tiếp từ xưởng · phí ship tính khi đặt hàng
                </span>
                <span className="text-sm">
                  Tạm tính {storefrontName(group.storefrontId).toLowerCase()} ({group.quantity} sản phẩm):{' '}
                  <strong className="font-display text-xl">{formatVnd(group.subtotal)}</strong>
                </span>
              </footer>
            </section>
          )
        })}
        {hasUnknown && (
          <ApiNote>Một số món chưa có storefrontId trong CartItemResponse nên chưa xác định được xưởng.</ApiNote>
        )}

        {unavailable.length > 0 && (
          <section className="rounded-[2rem] bg-white/70 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                <AlertTriangle size={18} className="text-orange" /> Vật Phẩm Chưa Thể Mua / Hết Tồn Kho (
                {unavailable.length})
              </h2>
              <span className="rounded-full bg-surface-high px-3 py-1 font-label text-[11px] font-semibold text-ink-soft">
                Giữ lại theo dõi
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {unavailable.map((item) => (
                <li key={item.itemId} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4">
                  <Thumb item={item} dim />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-soft line-through">{item.productTitle}</p>
                    <p className="font-label text-[11px] text-ink-soft">SKU: {item.sku}</p>
                    <p className="mt-2 rounded-xl bg-peach/60 px-3 py-2 text-xs text-orange-deep">
                      Sản phẩm hoặc phiên bản tạm ngừng bán / hết tồn kho. Món được giữ trong giỏ để bạn theo dõi và
                      không tính vào đơn hàng.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-ink-soft">{formatVnd(item.lineTotal)}</p>
                    <button
                      type="button"
                      onClick={() => remove.mutate(item.itemId)}
                      className="mt-1 inline-flex items-center gap-1 font-label text-xs font-semibold text-ink-soft hover:text-danger"
                    >
                      <Trash2 size={13} /> Xoá khỏi giỏ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Tóm tắt */}
      <aside className="space-y-4 lg:sticky lg:top-28">
        <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Tóm Tắt Giỏ Hàng</h2>
            <span className="rounded-full bg-violet-soft px-2.5 py-1 font-label text-[11px] font-semibold text-violet">
              {chosenGroups.length} xưởng
            </span>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Số xưởng được chọn:" value={`${chosenGroups.length} xưởng chế tác độc lập`} />
            <Row label="Tổng sản phẩm chọn:" value={`${quantity} vật phẩm`} />
            <Row
              label="Tạm tính giỏ hàng:"
              value={<strong className="font-display text-lg">{formatVnd(subtotal)}</strong>}
            />
          </dl>
          <div className="mt-4 rounded-2xl bg-teal-soft/50 p-3 text-xs leading-relaxed text-teal">
            <p className="font-semibold">Phí vận chuyển ước tính:</p>
            Được tính riêng theo từng xưởng ở bước Đặt hàng, dựa theo địa chỉ và khối lượng thực tế.
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-peach/60 to-butter/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-bold">Tổng Tạm Tính:</span>
              <span className="font-display text-2xl font-bold text-orange-deep">{formatVnd(subtotal)}</span>
            </div>
            <p className="text-right font-label text-[11px] text-ink-soft">Chưa bao gồm cước vận chuyển xưởng</p>
          </div>
          {priceChanged.length > 0 && (
            <p className="mt-4 rounded-2xl bg-peach/60 p-3 text-xs text-orange-deep">
              {priceChanged.length} món đã thay đổi giá. Vui lòng chấp nhận giá mới ở từng món trước khi đặt hàng.
            </p>
          )}
          <button
            type="button"
            disabled={!chosen.length || priceChanged.length > 0}
            onClick={() => navigate(`/checkout?items=${chosen.map((i) => i.itemId).join(',')}`)}
            className="mt-5 flex w-full items-center justify-between gap-2 rounded-full bg-ink py-2 pl-6 pr-2 font-label text-sm font-semibold text-white transition hover:bg-violet disabled:opacity-40"
          >
            Tiến Hành Đặt Hàng
            <span className="inline-flex items-center gap-2">
              <span className="text-orange">({formatVnd(subtotal)})</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-orange">
                <ArrowRight size={16} />
              </span>
            </span>
          </button>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link to="/" className="font-label text-sm font-semibold hover:text-violet">
              Tiếp tục mua sắm
            </Link>
            <button
              type="button"
              onClick={() => revalidate.mutate(undefined)}
              disabled={revalidate.isPending}
              className="inline-flex items-center gap-1.5 font-label text-xs font-semibold text-violet disabled:opacity-50"
            >
              <RefreshCw size={13} className={revalidate.isPending ? 'animate-spin' : ''} /> Kiểm tra lại tồn kho
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white/70 p-5 text-xs leading-relaxed text-ink-soft shadow-soft">
          <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <GitBranch size={14} className="text-violet" /> Cơ chế tách nhánh đơn hàng
          </p>
          <p className="mt-1.5">
            Mỗi xưởng sẽ có mã đơn con riêng, thời gian đóng gói và lịch giao riêng. Bạn theo dõi tiến độ từng xưởng
            trong hồ sơ đơn hàng.
          </p>
        </div>
      </aside>
    </div>
  )
}

function CartRow({ item, checked, onCheck }: { item: CartItem; checked: boolean; onCheck: (on: boolean) => void }) {
  const info = useVariantIndexStore((s) => s.variants[item.variantId])
  const productId = item.productId ?? info?.productId
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const acknowledge = useAcknowledgePrice()
  const busy = update.isPending || remove.isPending || acknowledge.isPending
  const attrs = formatAttributes(info?.attributes)

  return (
    <li className={`flex flex-wrap items-center gap-4 py-5 ${busy ? 'opacity-60' : ''}`}>
      <Checkbox checked={checked} onChange={onCheck} label={`Chọn ${item.productTitle}`} />
      <Thumb item={item} />
      <div className="min-w-0 flex-1">
        {productId ? (
          <Link to={`/${productId}`} className="font-display text-lg font-bold hover:text-violet">
            {item.productTitle}
          </Link>
        ) : (
          <p className="font-display text-lg font-bold">{item.productTitle}</p>
        )}
        <p className="mt-1">
          <code className="rounded-md bg-violet-soft px-1.5 py-0.5 font-label text-[11px] text-violet">
            SKU: {item.sku}
          </code>
        </p>
        {attrs && <p className="mt-1.5 text-xs text-ink-soft">{attrs}</p>}
        {item.priceChanged && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-peach/60 px-3 py-2 text-xs text-orange-deep">
            <AlertTriangle size={13} />
            <span>
              Giá đã đổi
              {item.previousUnitPrice != null && (
                <>
                  {' '}
                  từ <s>{formatVnd(item.previousUnitPrice)}</s>
                </>
              )}{' '}
              thành <strong>{formatVnd(item.unitPrice)}</strong>
            </span>
            <button
              type="button"
              onClick={() => acknowledge.mutate(item.itemId)}
              disabled={busy}
              className="rounded-full bg-ink px-3 py-1 font-label text-[11px] font-semibold text-white hover:bg-violet disabled:opacity-50"
            >
              Chấp nhận giá mới
            </button>
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-bold text-orange-deep">{formatVnd(item.lineTotal)}</p>
        <p className="font-label text-[11px] text-ink-soft">Đơn giá: {formatVnd(item.unitPrice)}</p>
      </div>
      <QuantityStepper
        size="sm"
        value={item.quantity}
        disabled={busy}
        onChange={(q) => update.mutate({ itemId: item.itemId, quantity: q })}
      />
      <button
        type="button"
        onClick={() => remove.mutate(item.itemId)}
        disabled={busy}
        aria-label={`Xoá ${item.productTitle}`}
        className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-low hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </li>
  )
}

function Thumb({ item, dim = false }: { item: CartItem; dim?: boolean }) {
  const info = useVariantIndexStore((s) => s.variants[item.variantId])
  const image = item.thumbnailUrl ?? info?.image
  const seed = item.productId ?? info?.productId
  return (
    <div className={`relative h-20 w-20 shrink-0 ${dim ? 'grayscale' : ''}`}>
      {image || seed ? (
        <ProductMedia
          src={image ?? undefined}
          alt=""
          seed={seed ?? item.variantId}
          className="h-full w-full rounded-2xl"
        />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-2xl bg-gradient-to-br from-violet-soft to-peach text-ink-soft">
          <ShoppingBag size={22} />
        </div>
      )}
      {dim && (
        <span className="absolute inset-x-1 bottom-1 rounded-full bg-ink/80 py-0.5 text-center font-label text-[9px] font-semibold text-white">
          HẾT HÀNG
        </span>
      )}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label?: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-5 shrink-0 cursor-pointer rounded-md accent-violet"
    />
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
