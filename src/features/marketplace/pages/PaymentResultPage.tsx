import { useQueries, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, CreditCard, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { formatDateTime } from '../../../shared/format'
import { useSession } from '../../../shared/session/useSession'
import { LoginRequired } from '../../../shared/ui/LoginRequired'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { orderKeys, usePayOrder } from '../../orders/hooks/useOrders'
import { orderService } from '../../orders/services/order.service'
import type { Order } from '../../orders/types/order.types'
import { type ApiSubscription, storefrontOwnerApi } from '../../seller/services/seller.api'
import { sellerService } from '../../seller/services/seller.service'
import {
  combineStates,
  gatewayMessage,
  orderPaymentState,
  type PaymentState,
  parsePaymentParams,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  subscriptionPaymentState,
} from '../lib/payment'
import { formatVnd } from '../lib/format'

/**
 * MP 023 · Kết Quả Thanh Toán ZaloPay — đang xác nhận / thành công / thất bại.
 * Trạng thái thật lấy từ Backend (callback ZaloPay → Backend), hỏi lại mỗi 3 giây tối đa 90 giây.
 */
export function PaymentResultPage() {
  const [search] = useSearchParams()
  const params = useMemo(() => parsePaymentParams(search), [search])
  const session = useSession()

  useEffect(() => {
    document.title = 'Kết quả thanh toán · 3DWorld'
  }, [])

  return (
    <div className="mx-auto max-w-[960px] px-4 md:px-8">
      {session.isLoading ? (
        <div className="h-80 animate-pulse rounded-[2rem] bg-white/70" />
      ) : !session.data ? (
        <LoginRequired
          title="Đăng nhập để xem kết quả thanh toán"
          body="Kết quả thanh toán gắn với tài khoản của bạn."
        />
      ) : params.kind === 'order' && params.ids.length ? (
        <OrderResult ids={params.ids} gatewaySuccess={params.gatewaySuccess} gatewayCode={params.gatewayCode} />
      ) : params.kind === 'subscription' ? (
        <SubscriptionResult
          id={params.ids[0]}
          gatewaySuccess={params.gatewaySuccess}
          gatewayCode={params.gatewayCode}
        />
      ) : (
        <StatusBlock
          tone="empty"
          title="Thiếu thông tin giao dịch"
          body="Đường dẫn kết quả thanh toán không có mã đơn hoặc mã gói thuê bao."
          action={
            <a
              href="/portal/orders"
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
            >
              Xem đơn hàng của tôi
            </a>
          }
        />
      )}
    </div>
  )
}

/** true sau POLL_TIMEOUT_MS kể từ lúc mở trang (hoặc lúc bấm kiểm tra lại). */
function useTimedOut(resetKey: number) {
  const [timedOut, setTimedOut] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey đổi → đếm lại từ đầu
  useEffect(() => {
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [resetKey])
  return timedOut
}

type GatewayProps = { gatewaySuccess: boolean | null; gatewayCode: string | null }

/* -------------------------------------------------------------- order */

function OrderResult({ ids, gatewaySuccess, gatewayCode }: { ids: number[] } & GatewayProps) {
  const [round, setRound] = useState(0)
  const timedOut = useTimedOut(round)
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: orderKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => orderService.detail(id, signal),
      refetchInterval: (q: { state: { data?: Order } }) =>
        !timedOut && orderPaymentState(q.state.data?.status, gatewaySuccess) === 'confirming'
          ? POLL_INTERVAL_MS
          : false,
    })),
  })

  const firstError = queries.find((q) => q.isError)?.error
  if (queries.every((q) => q.isError)) {
    return (
      <StatusBlock
        tone="error"
        title="Không tải được đơn hàng"
        body={firstError instanceof ApiClientError ? firstError.message : 'Vui lòng thử lại.'}
      />
    )
  }

  const states = queries.map((q) =>
    q.data ? orderPaymentState(q.data.status, gatewaySuccess) : ('confirming' as PaymentState),
  )
  let overall = combineStates(states)
  if (overall === 'confirming' && timedOut) overall = 'timeout'
  const total = queries.reduce((s, q) => s + (Number(q.data?.totalAmount) || 0), 0)

  return (
    <ResultShell
      state={overall}
      kindLabel={ids.length > 1 ? `${ids.length} đơn hàng` : 'đơn hàng'}
      amount={total}
      gatewayCode={gatewayCode}
      onRecheck={() => {
        setRound((r) => r + 1)
        for (const q of queries) q.refetch()
      }}
      primary={
        <a
          href={ids.length === 1 ? `/portal/orders/${ids[0]}` : '/portal/orders'}
          className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
        >
          {ids.length === 1 ? 'Xem chi tiết đơn' : 'Xem đơn hàng của tôi'}
        </a>
      }
    >
      <ul className="mt-6 space-y-2">
        {queries.map((q, i) => (
          <OrderRow
            key={ids[i]}
            id={ids[i]}
            order={q.data}
            state={timedOut && states[i] === 'confirming' ? 'timeout' : states[i]}
          />
        ))}
      </ul>
    </ResultShell>
  )
}

function OrderRow({ id, order, state }: { id: number; order?: Order; state: PaymentState }) {
  const pay = usePayOrder()
  const [error, setError] = useState('')
  const retry = () => {
    setError('')
    pay
      .mutateAsync(id)
      .then((p) => p.orderUrl && window.location.assign(p.orderUrl))
      .catch((e) => setError(e instanceof ApiClientError ? e.message : 'Không tạo được liên kết ZaloPay.'))
  }
  const canRetry = state === 'failed' && order && ['CREATED', 'PENDING_PAYMENT'].includes(order.status)

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-low p-4">
      <StateIcon state={state} size={18} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Đơn {order?.orderCode || `#${id}`}</p>
        <p className="text-xs text-ink-soft">
          {order ? `${order.status} · ${formatVnd(order.totalAmount)}` : 'Đang tải…'}
          {order?.status === 'PENDING_PAYMENT' && order.reservationExpiresAt
            ? ` · giữ chỗ đến ${formatDateTime(order.reservationExpiresAt)}`
            : ''}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={pay.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0068ff] px-4 py-2 font-label text-xs font-semibold text-white disabled:opacity-50"
        >
          <CreditCard size={13} /> {pay.isPending ? 'Đang tạo…' : 'Thanh toán lại'}
        </button>
      )}
    </li>
  )
}

/* ------------------------------------------------------- subscription */

/** Kỳ thuê bao cần xác nhận: theo id nếu có, không thì kỳ đang chờ / kỳ mới nhất. */
function pickSubscription(
  o: { latest?: ApiSubscription | null; pending?: ApiSubscription | null } | undefined,
  id?: number,
) {
  if (!o) return undefined
  if (id) return [o.pending, o.latest].find((s) => s?.id === id) ?? null
  return o.pending ?? o.latest ?? null
}

function SubscriptionResult({ id, gatewaySuccess, gatewayCode }: { id?: number } & GatewayProps) {
  const [round, setRound] = useState(0)
  const timedOut = useTimedOut(round)
  const [retryError, setRetryError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const q = useQuery({
    queryKey: ['payment-result', 'subscription'],
    queryFn: () => storefrontOwnerApi.subscription(),
    refetchInterval: (query) => {
      const sub = pickSubscription(query.state.data, id)
      return !timedOut && subscriptionPaymentState(sub?.status, gatewaySuccess) === 'confirming'
        ? POLL_INTERVAL_MS
        : false
    },
  })

  if (q.isError) {
    return (
      <StatusBlock
        tone="error"
        title="Không tải được gói thuê bao"
        body={q.error instanceof ApiClientError ? q.error.message : 'Vui lòng thử lại.'}
      />
    )
  }

  const sub = pickSubscription(q.data, id)
  let state = q.data ? subscriptionPaymentState(sub?.status, gatewaySuccess) : 'confirming'
  if (state === 'confirming' && timedOut) state = 'timeout'

  const retry = async () => {
    setRetryError('')
    setRetrying(true)
    try {
      await sellerService.renew('monthly')
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'Không tạo được liên kết ZaloPay.')
      setRetrying(false)
    }
  }

  return (
    <ResultShell
      state={state}
      kindLabel="gói thuê bao gian hàng"
      amount={Number(sub?.fee) || undefined}
      gatewayCode={gatewayCode}
      onRecheck={() => {
        setRound((r) => r + 1)
        q.refetch()
      }}
      primary={
        state === 'failed' ? (
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-full bg-[#0068ff] px-6 py-3 font-label text-sm font-semibold text-white disabled:opacity-50"
          >
            <CreditCard size={15} /> {retrying ? 'Đang chuyển…' : 'Thanh toán lại'}
          </button>
        ) : (
          <a
            href="/portal/seller/subscription"
            className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
          >
            Về trang gói thuê bao
          </a>
        )
      }
    >
      {sub && (
        <div className="mt-6 rounded-2xl bg-surface-low p-4 text-sm">
          <p className="font-semibold">Kỳ thuê bao #{sub.id}</p>
          <p className="text-xs text-ink-soft">
            {sub.status}
            {sub.startAt && sub.endAt
              ? ` · ${new Date(sub.startAt).toLocaleDateString('vi-VN')} – ${new Date(sub.endAt).toLocaleDateString('vi-VN')}`
              : ''}
          </p>
          {state === 'success' && q.data?.storefrontExpiresAt && (
            <p className="mt-1 text-xs text-teal">
              Gian hàng hoạt động đến {formatDateTime(q.data.storefrontExpiresAt)}
            </p>
          )}
        </div>
      )}
      {retryError && <p className="mt-3 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm text-danger">{retryError}</p>}
    </ResultShell>
  )
}

/* -------------------------------------------------------------- shell */

const COPY: Record<PaymentState, { title: string; body: string; tone: string }> = {
  confirming: {
    title: 'Đang xác nhận thanh toán…',
    body: 'Hệ thống đang chờ ZaloPay xác nhận giao dịch. Thường chỉ mất vài giây — vui lòng không đóng trang.',
    tone: 'bg-violet-soft text-violet',
  },
  success: {
    title: 'Thanh toán thành công',
    body: 'ZaloPay đã xác nhận giao dịch của bạn.',
    tone: 'bg-mint text-[#0f5132]',
  },
  failed: {
    title: 'Thanh toán không thành công',
    body: 'Giao dịch chưa được ghi nhận nên bạn có thể thanh toán lại. Nếu tài khoản đã bị trừ tiền, hãy liên hệ hỗ trợ để được kiểm tra.',
    tone: 'bg-[#ffdad6] text-danger',
  },
  timeout: {
    title: 'Chưa nhận được xác nhận',
    body: 'ZaloPay chưa gửi kết quả về hệ thống. Nếu bạn đã trả tiền, trạng thái sẽ tự cập nhật — hãy kiểm tra lại sau ít phút.',
    tone: 'bg-peach text-orange-deep',
  },
}

function StateIcon({ state, size }: { state: PaymentState; size: number }) {
  if (state === 'success') return <CheckCircle2 size={size} className="shrink-0 text-[#0f5132]" />
  if (state === 'failed') return <XCircle size={size} className="shrink-0 text-danger" />
  if (state === 'timeout') return <Clock size={size} className="shrink-0 text-orange-deep" />
  return <Loader2 size={size} className="shrink-0 animate-spin text-violet" />
}

function ResultShell({
  state,
  kindLabel,
  amount,
  gatewayCode,
  onRecheck,
  primary,
  children,
}: {
  state: PaymentState
  kindLabel: string
  amount?: number
  gatewayCode: string | null
  onRecheck: () => void
  primary: ReactNode
  children?: ReactNode
}) {
  const copy = COPY[state]
  const gatewayNote = state !== 'success' ? gatewayMessage(gatewayCode) : null
  return (
    <section
      className="rounded-[2.5rem] bg-white/95 p-6 text-center shadow-soft sm:p-10"
      aria-live="polite"
      aria-busy={state === 'confirming'}
    >
      <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${copy.tone}`}>
        <StateIcon state={state} size={36} />
      </span>
      <p className="mt-5 font-label text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Thanh toán {kindLabel} qua ZaloPay
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{copy.title}</h1>
      {!!amount && <p className="mt-2 font-display text-2xl font-bold text-orange-deep">{formatVnd(amount)}</p>}
      <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">{copy.body}</p>
      {gatewayNote && (
        <p className="mx-auto mt-3 max-w-lg rounded-xl bg-surface-low px-4 py-2 text-xs text-ink-soft">{gatewayNote}</p>
      )}

      <div className="text-left">{children}</div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {primary}
        {(state === 'timeout' || state === 'confirming') && (
          <button
            type="button"
            onClick={onRecheck}
            className="inline-flex items-center gap-2 rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold hover:bg-surface-high"
          >
            <RefreshCw size={15} className={state === 'confirming' ? 'animate-spin' : ''} /> Kiểm tra lại
          </button>
        )}
        <Link
          to="/products"
          className="rounded-full bg-white px-6 py-3 font-label text-sm font-semibold shadow-soft hover:bg-surface-low"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </section>
  )
}
