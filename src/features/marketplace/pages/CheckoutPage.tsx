import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tag,
  Truck,
  Wallet,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { LoginRequired } from '../../../shared/ui/LoginRequired'
import { ProductMedia } from '../components/ProductMedia'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { StorefrontBadge } from '../components/StorefrontBadge'
import { ApiNote, PageHeading, QuantityStepper } from '../../../shared/ui/primitives'
import { cartKey, useCart, useUpdateCartItem } from '../hooks/useCart'
import { addressKey, useAddresses, useCheckout, useShippingQuote, useZaloPayPayment } from '../hooks/useCheckout'
import { useSession } from '../../../shared/session/useSession'
import { groupByStorefront, storefrontName } from '../lib/cart'
import { formatAttributes, formatVnd } from '../lib/format'
import { paymentResultUrl } from '../lib/payment'
import { ordersRequiringGatewayPayment } from '../lib/checkoutPayment'
import { isShippingQuoteUsable, SHIPPING_QUOTE_EXPIRY_BUFFER_MS } from '../lib/shipping'
import { useVariantIndexStore } from '../stores/variant-index.store'
import { useOrderPaymentsStore } from '../../orders/stores/order-payments.store'
import { goLogin } from '../../auth/services/session'
import {
  clearPendingCheckout,
  loadPendingCheckout,
  savePendingCheckout,
  type PendingCheckoutAttempt,
} from '../lib/checkoutAttempt'
import type { Address, CheckoutInput, Order, Payment, PaymentMethod, ShippingQuoteInput } from '../types/catalog.types'
import { AddressForm } from '../components/AddressForm'

type PaymentState = { orderId: number; payment?: Payment; error?: string }

function addressLine(a: Address) {
  return [a.addressLine, a.ward, a.district, a.province || a.city].filter(Boolean).join(', ')
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** MP 021 · Đặt Hàng & Thanh Toán Đa Xưởng */
export function CheckoutPage() {
  const session = useSession()
  const cart = useCart()
  const [params] = useSearchParams()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [payments, setPayments] = useState<PaymentState[]>([])
  const [pendingAttempt, setPendingAttempt] = useState<PendingCheckoutAttempt | null>(() => loadPendingCheckout())
  const [method, setMethod] = useState<PaymentMethod>(() => pendingAttempt?.payload.paymentMethod ?? 'GATEWAY')

  useEffect(() => {
    document.title = 'Đặt Hàng & Thanh Toán · 3DWorld'
  }, [])

  const requested = useMemo(
    () =>
      (params.get('items') ?? '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    [params],
  )
  const items = useMemo(() => {
    const buyable = (cart.data?.items ?? []).filter((i) => !i.unavailable)
    return requested.length ? buyable.filter((i) => requested.includes(i.itemId)) : buyable
  }, [cart.data, requested])

  const done = !!orders

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHeading
        eyebrow="Đặt hàng · Đa xưởng"
        title="Đặt Hàng & Thanh Toán"
        accent="Xác Thực Giữ Chỗ & Phân Tách Đa Xưởng."
        description="Đơn hàng được tự động tách thành các đơn con cho từng xưởng in độc lập, mỗi đơn có vận đơn và phí vận chuyển riêng."
      />

      <Stepper step={done ? 3 : 2} />

      <div className="mt-6">
        {session.isLoading || (session.data && cart.isLoading) ? (
          <div className="h-96 animate-pulse rounded-[2rem] bg-white/70" />
        ) : !session.data ? (
          <LoginRequired title="Đăng nhập để đặt hàng" body="Bạn cần đăng nhập để chọn địa chỉ và thanh toán." />
        ) : done ? (
          <OrderResult orders={orders} payments={payments} method={method} onPaymentsChange={setPayments} />
        ) : !items.length && !pendingAttempt ? (
          <StatusBlock
            tone="empty"
            title="Chưa có vật phẩm để đặt"
            body="Các món đã chọn không còn trong giỏ hoặc đã hết hàng."
            action={
              <Link to="/cart" className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white">
                Quay lại giỏ hàng
              </Link>
            }
          />
        ) : (
          <CheckoutForm
            items={items}
            method={method}
            onMethodChange={setMethod}
            pendingAttempt={pendingAttempt}
            onPendingAttemptChange={setPendingAttempt}
            onPlaced={(placed, paid) => {
              setOrders(placed)
              setPayments(paid)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Giỏ Hàng & Phôi 3D', 'Địa Chỉ & Thanh Toán', 'Hoàn Tất & Thanh Toán']
  return (
    <ol className="mt-8 grid gap-2 rounded-[2rem] bg-white/90 p-2 shadow-soft sm:grid-cols-3">
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < step ? 'done' : n === step ? 'current' : 'todo'
        return (
          <li
            key={label}
            className={`flex items-center gap-3 rounded-[1.5rem] px-4 py-3 ${state === 'current' ? 'bg-peach/60' : state === 'done' ? 'bg-surface-low' : ''}`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-bold ${
                state === 'done'
                  ? 'bg-ink text-white'
                  : state === 'current'
                    ? 'bg-orange text-white'
                    : 'bg-surface-high text-ink-soft'
              }`}
            >
              {state === 'done' ? <Check size={16} /> : n}
            </span>
            <span className={state === 'todo' ? 'text-ink-soft' : ''}>
              <span className="block font-label text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
                Bước {String(n).padStart(2, '0')}
                {state === 'current' && ' (hiện tại)'}
              </span>
              <span className="block font-display text-base font-bold">{label}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function CheckoutForm({
  items,
  method,
  onMethodChange,
  pendingAttempt,
  onPendingAttemptChange,
  onPlaced,
}: {
  items: NonNullable<ReturnType<typeof useCart>['data']>['items']
  method: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
  pendingAttempt: PendingCheckoutAttempt | null
  onPendingAttemptChange: (attempt: PendingCheckoutAttempt | null) => void
  onPlaced: (orders: Order[], payments: PaymentState[]) => void
}) {
  const queryClient = useQueryClient()
  const index = useVariantIndexStore((s) => s.variants)
  const addresses = useAddresses()
  const checkout = useCheckout()
  const pay = useZaloPayPayment()
  const updateCartItem = useUpdateCartItem()
  const [addressId, setAddressId] = useState<number>()
  const [adding, setAdding] = useState(false)
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0)
  const [expiryTick, setExpiryTick] = useState(() => Date.now())
  const rememberPayment = useOrderPaymentsStore((s) => s.remember)

  const list = addresses.data ?? []
  useEffect(() => {
    if (addressId === undefined && list.length) setAddressId((list.find((a) => a.isDefault) ?? list[0]).id)
  }, [list, addressId])
  const address = list.find((a) => a.id === addressId)

  const groups = groupByStorefront(items, index)
  const subtotal = items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0)
  const cartItemIds = useMemo(() => [...items.map((item) => item.itemId)].sort((a, b) => a - b), [items])
  const hasDuplicateIds = new Set(cartItemIds).size !== cartItemIds.length
  const invalidCartSelection = hasDuplicateIds || cartItemIds.length > 100
  const cartFingerprint = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.itemId - b.itemId)
        .map((item) => `${item.itemId}:${item.quantity}:${item.unitPrice}:${item.lineTotal}`)
        .join('|'),
    [items],
  )
  const quoteInput = useMemo<ShippingQuoteInput | null>(
    () =>
      addressId && cartItemIds.length && !invalidCartSelection
        ? { cartItemIds, shippingAddressId: addressId }
        : null,
    [addressId, cartItemIds, invalidCartSelection],
  )
  const shippingQuote = useShippingQuote(quoteInput, cartFingerprint, quoteRefreshKey)
  const quote = shippingQuote.data
  const quoteUsable = isShippingQuoteUsable(quote, Math.max(expiryTick, Date.now()))
  const quoteExpired = !!quote && !quoteUsable
  const shippingQuoteLoading = shippingQuote.isDebouncing || shippingQuote.isFetching
  const shippingQuoteError = invalidCartSelection
    ? hasDuplicateIds
      ? 'Danh sách sản phẩm có ID trùng lặp.'
      : 'Mỗi lần checkout chỉ hỗ trợ tối đa 100 sản phẩm trong giỏ.'
    : shippingQuote.error instanceof ApiClientError
      ? shippingQuote.error.message
      : shippingQuote.error
        ? 'Không tính được phí vận chuyển.'
        : ''
  const grandTotal = subtotal + (quoteUsable ? Number(quote?.totalShippingFee) || 0 : 0)
  const shopFees = useMemo(
    () => new Map((quote?.shops ?? []).map((shop) => [shop.storefrontId, Number(shop.selected.shippingFee) || 0])),
    [quote],
  )
  const busy = checkout.isPending || pay.isPending || updateCartItem.isPending
  const priceChanged = items.filter((i) => i.priceChanged)

  useEffect(() => {
    if (!quote) return
    const delay = Math.max(0, quote.expiresAt - SHIPPING_QUOTE_EXPIRY_BUFFER_MS - Date.now())
    const timer = window.setTimeout(() => setExpiryTick((value) => value + 1), delay + 20)
    return () => window.clearTimeout(timer)
  }, [quote])

  useEffect(() => {
    if (shippingQuote.error instanceof ApiClientError && [401, 403].includes(shippingQuote.error.status)) goLogin()
  }, [shippingQuote.error])

  const refreshShippingQuote = () => {
    setError('')
    setQuoteRefreshKey((value) => value + 1)
  }

  const submit = async () => {
    if (!pendingAttempt && !address) return setError('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.')
    if (!pendingAttempt && priceChanged.length)
      return setError('Có món đã đổi giá — vui lòng chấp nhận giá mới trong giỏ hàng.')
    if (!pendingAttempt && !isShippingQuoteUsable(quote))
      return setError('Phí vận chuyển chưa sẵn sàng hoặc đã hết hạn. Vui lòng lấy phí lại.')
    setError('')

    let payload: CheckoutInput
    if (pendingAttempt) {
      payload = pendingAttempt.payload
    } else {
      if (!address || !quote) return setError('Phí vận chuyển chưa sẵn sàng. Vui lòng lấy phí lại.')
      payload = {
        cartItemIds,
        shippingAddressId: address.id,
        idempotencyKey: newKey(),
        shippingQuoteToken: quote.quoteToken,
        paymentMethod: method,
      }
    }
    const attempt = pendingAttempt ?? savePendingCheckout(payload)
    if (!pendingAttempt) onPendingAttemptChange(attempt)

    try {
      const placed = await checkout.mutateAsync(payload)
      clearPendingCheckout(payload.idempotencyKey)
      onPendingAttemptChange(null)
      const paid: PaymentState[] = []
      if (payload.paymentMethod === 'GATEWAY') {
        for (const order of ordersRequiringGatewayPayment(placed, payload.paymentMethod)) {
          try {
            const payment = await pay.mutateAsync(order.id)
            rememberPayment(order.id, { transactionId: payment.transactionId, amount: payment.amount })
            paid.push({ orderId: order.id, payment })
          } catch (e) {
            paid.push({
              orderId: order.id,
              error: e instanceof ApiClientError ? e.message : 'Không tạo được thanh toán.',
            })
          }
        }
      }
      onPlaced(placed, paid)
    } catch (e) {
      if (e instanceof ApiClientError && e.status > 0) {
        clearPendingCheckout(payload.idempotencyKey)
        onPendingAttemptChange(null)

        if (e.status === 409) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: cartKey }),
            queryClient.invalidateQueries({ queryKey: addressKey }),
          ])
          refreshShippingQuote()
        } else if (e.status === 400 || e.status === 422 || e.status === 503) {
          refreshShippingQuote()
        }

        if (e.status === 401 || e.status === 403) return goLogin()
      }

      const message = e instanceof ApiClientError ? e.message : 'Không đặt được hàng. Vui lòng thử lại.'
      setError(
        e instanceof ApiClientError && e.status === 409
          ? `${message} Giỏ hàng và phí vận chuyển đang được cập nhật; vui lòng xác nhận lại.`
          : e instanceof ApiClientError && e.status === 0
            ? `${message} Yêu cầu trước chưa rõ kết quả; lần thử lại sẽ dùng đúng mã và payload cũ.`
            : message,
      )
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-gradient-to-r from-peach/70 to-butter/60 p-5 shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange text-white">
            <Clock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">Giữ chỗ tồn kho vật lý (reserved_quantity)</p>
            <p className="text-sm text-ink-soft">
              Khi bạn xác nhận, hệ thống giữ chỗ tồn kho cho từng món và tách đơn theo xưởng trong một giao dịch.
            </p>
          </div>
        </div>

        {/* 1. Địa chỉ */}
        <Section
          n={1}
          icon={<MapPin size={18} />}
          title="Địa Chỉ Nhận Hàng Vật Lý"
          tag="Bản chụp địa chỉ lưu riêng cho từng đơn con"
        >
          {addresses.isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-surface-low" />
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition ${
                    a.id === addressId ? 'bg-violet-soft/50 ring-2 ring-violet' : 'bg-surface-low hover:bg-surface-high'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={a.id === addressId}
                    disabled={checkout.isPending}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 accent-violet"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong>{a.recipientName}</strong>
                      {a.phone && <span className="text-sm text-ink-soft">| {a.phone}</span>}
                      {a.isDefault && (
                        <span className="rounded-full bg-peach px-2 py-0.5 font-label text-[10px] font-semibold text-orange-deep">
                          MẶC ĐỊNH
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-ink-soft">{addressLine(a)}</span>
                  </span>
                </label>
              ))}
              {adding || !list.length ? (
                <AddressForm
                  onCreated={(a) => {
                    setAddressId(a.id)
                    setAdding(false)
                  }}
                  onCancel={list.length ? () => setAdding(false) : undefined}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2.5 font-label text-sm font-semibold hover:bg-surface-high"
                >
                  <Plus size={15} /> Thêm địa chỉ khác
                </button>
              )}
            </div>
          )}
        </Section>

        {/* 2. Đơn con theo xưởng */}
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h2 className="font-display text-xl font-bold">2. Danh Sách Đơn Hàng Con Theo Xưởng Chế Tác</h2>
            <p className="text-sm text-ink-soft">Mỗi xưởng sẽ thành một đơn con độc lập khi xác nhận.</p>
          </div>
          <span className="rounded-full bg-teal-soft px-3 py-1 font-label text-xs font-semibold text-teal">
            {groups.length} kiện hàng độc lập
          </span>
        </div>
        {groups.map((g, gi) => (
          <section key={g.storefrontId ?? 'unknown'} className="rounded-[2rem] bg-white/90 p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StorefrontBadge
                storefrontId={g.storefrontId}
                sub={g.storefrontId === null ? undefined : `storefront_${g.storefrontId}`}
              />
              <span className="rounded-full bg-surface-low px-3 py-1 font-label text-[11px] font-semibold text-ink-soft">
                Đơn con #{String(gi + 1).padStart(2, '0')}
              </span>
            </div>
            <ul className="mt-4 divide-y divide-line/70">
              {g.items.map((item) => {
                const info = index[item.variantId]
                return (
                  <li key={item.itemId} className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap">
                    <ProductMedia
                      src={item.thumbnailUrl ?? info?.image}
                      alt=""
                      seed={item.productId ?? info?.productId ?? item.variantId}
                      className="h-16 w-16 shrink-0 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.productTitle}</p>
                      {info && <p className="text-xs text-ink-soft">{formatAttributes(info.attributes)}</p>}
                      <p className="font-mono text-[11px] text-violet">Mã kho: {item.sku}</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-1 font-label text-[10px] font-semibold uppercase text-ink-soft">Số lượng</p>
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        disabled={busy || !!pendingAttempt}
                        onChange={(quantity) => updateCartItem.mutate({ itemId: item.itemId, quantity })}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-soft">{formatVnd(item.unitPrice)}/sản phẩm</p>
                      <p className="font-display text-lg font-bold">{formatVnd(item.lineTotal)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 rounded-2xl bg-surface-low p-4">
              <p className="inline-flex items-center gap-1.5 font-label text-xs font-semibold uppercase tracking-wider">
                <Truck size={14} className="text-orange" /> Đơn vị giao vận
              </p>
              <label className="mt-3 flex items-start gap-3 rounded-xl bg-white p-3">
                <input type="radio" checked readOnly className="mt-1 accent-orange" />
                <span>
                  <span className="block text-sm font-semibold">Giao tiêu chuẩn của xưởng</span>
                  <span className="block text-xs text-ink-soft">
                    {shippingQuoteLoading
                      ? 'Đang tính phí vận chuyển…'
                      : quoteUsable && g.storefrontId !== null && shopFees.has(g.storefrontId)
                        ? `Phí vận chuyển: ${formatVnd(shopFees.get(g.storefrontId) ?? 0)}`
                        : shippingQuoteError
                          ? 'Chưa tính được phí vận chuyển'
                          : quoteExpired
                            ? 'Báo giá vận chuyển đã hết hạn'
                            : 'Chờ địa chỉ nhận hàng'}
                  </span>
                </span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-ink-soft">
                Tạm tính {storefrontName(g.storefrontId).toLowerCase()}:{' '}
                <strong className="text-ink">{formatVnd(g.subtotal)}</strong>
              </span>
              <span className="font-display text-xl font-bold">
                {quoteUsable && g.storefrontId !== null && shopFees.has(g.storefrontId)
                  ? `Gồm ship: ${formatVnd(g.subtotal + (shopFees.get(g.storefrontId) ?? 0))}`
                  : `Tạm tính: ${formatVnd(g.subtotal)}`}
              </span>
            </div>
          </section>
        ))}

        {/* 3. Thanh toán */}
        <Section n={3} icon={<Wallet size={18} />} title="Phương Thức Thanh Toán">
          <div className="space-y-3">
            <PayOption
              active={method === 'GATEWAY'}
              disabled={!!pendingAttempt}
              onSelect={() => onMethodChange('GATEWAY')}
              icon={<CreditCard size={18} />}
              title="Cổng thanh toán ZaloPay"
              badge="Khuyên dùng"
              body="Sau khi tạo đơn, mỗi đơn con có một liên kết ZaloPay để thanh toán (ATM, thẻ quốc tế, ví ZaloPay)."
            />
            <PayOption
              active={method === 'COD'}
              disabled={!!pendingAttempt}
              onSelect={() => onMethodChange('COD')}
              icon={<Banknote size={18} />}
              title="Thanh toán khi nhận hàng (COD)"
              body="Thanh toán toàn bộ tiền hàng và phí vận chuyển cho đơn vị giao hàng khi nhận từng kiện."
            />
            <PayOption
              disabled
              icon={<Wallet size={18} />}
              title="Ví 3DWorld Escrow"
              badge="Sắp có"
              body="Thanh toán bằng số dư ví, tiền được giữ an toàn đến khi bạn nhận hàng."
            />
            <ApiNote>COD không tạo giao dịch ZaloPay. Báo giá vận chuyển GHTK vẫn bắt buộc cho cả hai phương thức.</ApiNote>
          </div>
        </Section>
      </div>

      {/* Tổng kết */}
      <aside className="lg:sticky lg:top-28">
        <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-orange-deep">
            Phiên thanh toán nhóm
          </p>
          <h2 className="font-display text-2xl font-bold">Tổng Kết Đơn Hàng</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <SummaryRow label={`Tổng tiền hàng (${groups.length} xưởng):`} value={formatVnd(subtotal)} />
            <SummaryRow
              label={`Phí vận chuyển (${groups.length} xưởng):`}
              value={
                shippingQuoteLoading
                  ? 'Đang tính…'
                  : quoteUsable
                    ? formatVnd(quote?.totalShippingFee ?? 0)
                    : quoteExpired
                      ? 'Đã hết hạn'
                      : 'Chưa có'
              }
            />
            <SummaryRow label="Khấu trừ voucher ưu đãi:" value="0₫" />
          </dl>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-low px-3 py-2.5 font-label text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Tag size={13} /> Mã giảm giá
            </span>
            <span>Chưa hỗ trợ</span>
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
            <span className="font-label text-xs font-semibold uppercase tracking-wider">Tổng thanh toán</span>
            <span className="font-display text-3xl font-bold text-orange-deep">
              {quoteUsable ? formatVnd(grandTotal) : '—'}
            </span>
          </div>
          <p className="text-right font-label text-[11px] text-ink-soft">
            {quoteUsable ? 'Đã gồm phí vận chuyển GHTK' : 'Cần phí vận chuyển hợp lệ trước khi đặt hàng'}
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-peach/40 p-4 text-sm">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange"
            />
            <span>
              Tôi hiểu và xác nhận: đơn hàng gồm <strong>{groups.length} gói hàng</strong> gửi từ {groups.length} xưởng
              chế tác khác nhau. Mỗi đơn con được vận chuyển và giao nhận độc lập.
            </span>
          </label>

          {priceChanged.length > 0 && (
            <p className="mt-3 rounded-xl bg-peach/60 px-4 py-3 text-sm text-orange-deep">
              {priceChanged.length} món đã đổi giá.{' '}
              <Link to="/cart" className="font-semibold underline">
                Quay lại giỏ để chấp nhận giá mới
              </Link>
            </p>
          )}

          {pendingAttempt && (
            <p className="mt-3 rounded-xl bg-butter/70 px-4 py-3 text-sm text-ink">
              Yêu cầu đặt hàng trước chưa nhận được kết quả. Lần xác nhận tiếp theo sẽ kiểm tra lại bằng đúng mã và
              payload cũ để tránh tạo đơn trùng.
            </p>
          )}

          {!pendingAttempt && (shippingQuoteError || quoteExpired) && (
            <div className="mt-3 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm text-danger">
              <p>{shippingQuoteError || 'Báo giá vận chuyển đã hết hạn. Vui lòng lấy phí lại.'}</p>
              <button
                type="button"
                onClick={refreshShippingQuote}
                disabled={shippingQuoteLoading || !quoteInput}
                className="mt-2 inline-flex items-center gap-1.5 font-label text-xs font-semibold underline disabled:opacity-50"
              >
                <RefreshCw size={13} className={shippingQuoteLoading ? 'animate-spin' : ''} /> Thử lại
              </button>
            </div>
          )}

          {error && <p className="mt-3 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm text-danger">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={
              !agree ||
              busy ||
              (!pendingAttempt &&
                (!address ||
                  !items.length ||
                  priceChanged.length > 0 ||
                  shippingQuoteLoading ||
                  !!shippingQuoteError ||
                  !quoteUsable))
            }
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-full bg-ink py-2.5 pl-6 pr-2.5 font-label text-sm font-semibold text-white transition hover:bg-violet disabled:opacity-40"
          >
            <span>
              {busy
                ? 'Đang xử lý…'
                : pendingAttempt
                  ? 'Kiểm Tra Lại Yêu Cầu'
                  : method === 'COD'
                    ? 'Xác Nhận Đặt Hàng'
                    : 'Xác Nhận Thanh Toán'}
            </span>
            <span className="inline-flex items-center gap-2 font-display text-base">
              {pendingAttempt ? 'Retry' : quoteUsable ? formatVnd(grandTotal) : '—'}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-orange">
                <ArrowRight size={16} />
              </span>
            </span>
          </button>
          <Link
            to="/cart"
            className="mt-4 flex items-center justify-center gap-1.5 font-label text-sm font-semibold hover:text-violet"
          >
            <ArrowLeft size={14} /> Quay lại giỏ hàng
          </Link>
          <div className="mt-5 flex gap-3 rounded-2xl bg-violet-soft/40 p-4 text-xs text-ink-soft">
            <ShieldCheck size={18} className="shrink-0 text-violet" />
            <span>
              <strong className="block text-ink">Bảo vệ người mua</strong>
              Có thể gửi yêu cầu hoàn tiền nếu sản phẩm lỗi, vỡ hoặc sai mô tả.
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function OrderResult({
  orders,
  payments,
  method,
  onPaymentsChange,
}: {
  orders: Order[]
  payments: PaymentState[]
  method: PaymentMethod
  onPaymentsChange: (p: PaymentState[]) => void
}) {
  const pay = useZaloPayPayment()
  const rememberPayment = useOrderPaymentsStore((s) => s.remember)
  const total = orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
  const gatewayOrders = ordersRequiringGatewayPayment(orders, method)

  const retry = async (orderId: number) => {
    try {
      const payment = await pay.mutateAsync(orderId)
      rememberPayment(orderId, { transactionId: payment.transactionId, amount: payment.amount })
      onPaymentsChange(payments.map((p) => (p.orderId === orderId ? { orderId, payment } : p)))
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Không tạo được thanh toán.'
      onPaymentsChange(payments.map((p) => (p.orderId === orderId ? { orderId, error: message } : p)))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-mint text-[#0f5132]">
          <CheckCircle2 size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold">Đã tạo {orders.length} đơn con thành công</h2>
          <p className="text-sm text-ink-soft">
            Tồn kho đã được giữ chỗ.{' '}
            {method === 'GATEWAY'
              ? 'Thanh toán từng đơn con qua ZaloPay bên dưới.'
              : 'Đặt hàng COD thành công, đang chờ người bán xác nhận.'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-label text-xs text-ink-soft">Tổng cộng (gồm phí ship)</p>
          <p className="font-display text-3xl font-bold text-orange-deep">{formatVnd(total)}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {orders.map((order) => {
          const p = payments.find((x) => x.orderId === order.id)
          return (
            <section key={order.id} className="rounded-[2rem] bg-white/90 p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <StorefrontBadge
                  storefrontId={order.storefrontId}
                  sub={`Đơn con ${order.orderCode ?? `#${order.id}`}`}
                />
                <span className="rounded-full bg-violet-soft px-3 py-1 font-label text-[11px] font-semibold text-violet">
                  {order.status}
                </span>
              </div>
              {order.reservationExpiresAt && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-peach/50 px-3 py-1 font-label text-[11px] font-semibold text-orange-deep">
                  <Clock size={12} /> {method === 'COD' ? 'Người bán nhận đơn trước' : 'Giữ chỗ tồn kho đến'}{' '}
                  {formatTime(order.reservationExpiresAt)}
                </p>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                {order.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-xs">
                      {i.sku} × {i.quantity}
                    </span>
                    <span>{formatVnd(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                <SummaryRow label="Tiền hàng:" value={formatVnd(order.subtotal)} />
                <SummaryRow label="Phí vận chuyển:" value={formatVnd(order.shippingFee)} />
                <SummaryRow
                  label="Tổng đơn con:"
                  value={<strong className="font-display text-lg">{formatVnd(order.totalAmount)}</strong>}
                />
              </dl>
              {method === 'GATEWAY' && order.onlinePaymentRequired !== false && order.paymentMethod !== 'COD' && (
                <div className="mt-4">
                  {p?.payment?.orderUrl ? (
                    <a
                      href={p.payment.orderUrl}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0068ff] px-5 py-3 font-label text-sm font-semibold text-white hover:opacity-90"
                    >
                      Thanh toán {formatVnd(p.payment.amount)} qua ZaloPay <ExternalLink size={15} />
                    </a>
                  ) : (
                    <div className="space-y-2">
                      {p?.error && <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-xs text-danger">{p.error}</p>}
                      <button
                        type="button"
                        onClick={() => retry(order.id)}
                        disabled={pay.isPending}
                        className="w-full rounded-full bg-ink px-5 py-3 font-label text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Tạo lại liên kết ZaloPay
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {gatewayOrders.length > 0 && (
          <Link
            to={paymentResultUrl(
              'order',
              gatewayOrders.map((o) => o.id),
            ).replace('/marketplace', '')}
            className="rounded-full bg-[#0068ff] px-6 py-3 font-label text-sm font-semibold text-white hover:opacity-90"
          >
            Tôi đã thanh toán — kiểm tra kết quả
          </Link>
        )}
        <a
          href="/portal/orders"
          className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
        >
          Xem đơn hàng của tôi
        </a>
        <Link to="/" className="rounded-full bg-white px-6 py-3 font-label text-sm font-semibold shadow-soft">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  )
}

function Section({
  n,
  icon,
  title,
  tag,
  children,
}: {
  n: number
  icon: ReactNode
  title: string
  tag?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[2rem] bg-white/90 p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-3 font-display text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-violet text-white">{icon}</span>
          {n}. {title}
        </h2>
        {tag && (
          <span className="rounded-full bg-surface-low px-3 py-1 font-label text-[11px] font-semibold text-ink-soft">
            {tag}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function PayOption({
  active = false,
  disabled = false,
  onSelect,
  icon,
  title,
  badge,
  body,
}: {
  active?: boolean
  disabled?: boolean
  onSelect?: () => void
  icon: ReactNode
  title: string
  badge?: string
  body: string
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl p-4 transition ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${active ? 'bg-peach/50 ring-2 ring-orange' : 'bg-surface-low hover:bg-surface-high'}`}
    >
      <input
        type="radio"
        name="payment"
        checked={active}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1.5 accent-orange"
      />
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-violet">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="font-display text-lg">{title}</strong>
          {badge && (
            <span className="rounded-full bg-violet px-2 py-0.5 font-label text-[10px] font-semibold uppercase text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-ink-soft">{body}</span>
      </span>
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
