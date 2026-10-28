import { Banknote, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { ApiClientError } from '../../../shared/api'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { inputClass } from '../../../shared/ui/form'
import { isAdmin } from '../../auth/services/session'
import { codPaymentLabel } from '../../orders/components/CodPaymentPanel'
import { useCodPayment, useRecordCodCollection, useRecordCodSettlement } from '../../orders/hooks/useOrders'
import { canRecordCodCollection, canRecordCodSettlement } from '../../orders/lib/cod'
import type { CodRecordInput } from '../../orders/types/order.types'
import { useSession } from '../../../shared/session/useSession'

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function CodOperationsPanel({
  orderId,
  paymentMethod,
  fulfillmentStatus,
}: {
  orderId: number
  paymentMethod: 'COD' | 'ZALOPAY'
  fulfillmentStatus: string
}) {
  const session = useSession()
  const admin = isAdmin(session.data)
  const cod = useCodPayment(orderId, paymentMethod === 'COD' ? 'COD' : 'GATEWAY')
  const collection = useRecordCodCollection()
  const settlement = useRecordCodSettlement()
  const [mode, setMode] = useState<'collection' | 'settlement' | null>(null)
  const [reference, setReference] = useState('')
  const [evidenceKey, setEvidenceKey] = useState('')
  const [reason, setReason] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => localDateTimeValue())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (paymentMethod !== 'COD') return null

  if (cod.isLoading) return <div className="h-32 animate-pulse rounded-2xl bg-white/70" />
  if (cod.isError || !cod.data) {
    return (
      <section className="rounded-[2rem] bg-white/95 p-5 shadow-soft">
        <p className="text-sm text-danger">Không tải được trạng thái COD.</p>
        <button type="button" onClick={() => cod.refetch()} className="mt-2 font-label text-xs font-semibold underline">
          Thử lại
        </button>
      </section>
    )
  }

  const payment = cod.data
  const canCollect = canRecordCodCollection(fulfillmentStatus, payment)
  const canSettle = canRecordCodSettlement(admin, payment)
  const activeMutation = mode === 'settlement' ? settlement : collection

  const open = (nextMode: 'collection' | 'settlement') => {
    setMode(nextMode)
    setReference('')
    setEvidenceKey('')
    setReason(nextMode === 'collection' ? 'GHTK xác nhận đã thu COD' : 'Đã nhận tiền đối soát từ GHTK')
    setOccurredAt(localDateTimeValue())
    setError('')
    setSuccess('')
  }

  const submit = async () => {
    if (!mode) return
    const timestamp = new Date(occurredAt).getTime()
    if (!reference.trim() || !evidenceKey.trim() || !reason.trim()) {
      setError('Nhập đầy đủ tham chiếu, mã bằng chứng và lý do.')
      return
    }
    if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
      setError('Thời điểm ghi nhận phải là hiện tại hoặc trong quá khứ.')
      return
    }
    if (mode === 'settlement' && payment.collectedAt && timestamp < Date.parse(payment.collectedAt)) {
      setError('Thời điểm đối soát không được trước thời điểm thu tiền.')
      return
    }

    const input: CodRecordInput = {
      amount: payment.expectedAmount,
      reference: reference.trim(),
      evidenceKey: evidenceKey.trim(),
      reason: reason.trim(),
      occurredAt: new Date(timestamp).toISOString(),
    }

    setError('')
    try {
      await activeMutation.mutateAsync({ orderId, input })
      setSuccess(mode === 'collection' ? 'Đã ghi nhận đơn vị vận chuyển thu tiền.' : 'Đã xác nhận tiền COD về nền tảng.')
      setMode(null)
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Không thể ghi nhận trạng thái COD.')
      if (caught instanceof ApiClientError && caught.status === 409) await cod.refetch()
    }
  }

  return (
    <section className="rounded-[2rem] bg-white/95 p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-peach text-orange-deep">
          <Banknote size={18} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Đối soát COD</h2>
          <p className="text-xs text-ink-soft">{codPaymentLabel(payment)}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Số tiền toàn đơn</dt>
          <dd className="font-semibold">{formatVnd(payment.expectedAmount)}</dd>
        </div>
        {payment.collectedAt && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Thu tiền</dt>
            <dd className="text-right font-semibold">{formatDateTime(payment.collectedAt)}</dd>
          </div>
        )}
        {payment.settledAt && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Đối soát</dt>
            <dd className="text-right font-semibold">{formatDateTime(payment.settledAt)}</dd>
          </div>
        )}
      </dl>

      {success && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-mint p-3 text-xs font-semibold text-[#0f5132]">
          <CheckCircle2 size={14} /> {success}
        </p>
      )}

      {!mode && (
        <div className="mt-4 grid gap-2">
          {canCollect && (
            <button
              type="button"
              onClick={() => open('collection')}
              className="rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white"
            >
              Xác nhận đơn vị vận chuyển đã thu tiền
            </button>
          )}
          {canSettle && (
            <button
              type="button"
              onClick={() => open('settlement')}
              className="rounded-full bg-violet px-4 py-2.5 font-label text-xs font-semibold text-white"
            >
              Xác nhận tiền COD đã về nền tảng
            </button>
          )}
        </div>
      )}

      {mode && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="block text-xs font-semibold">
            Số tiền
            <input className={`${inputClass} mt-1`} value={payment.expectedAmount} readOnly disabled />
          </label>
          <label className="block text-xs font-semibold">
            Mã tham chiếu
            <input className={`${inputClass} mt-1`} value={reference} onChange={(event) => setReference(event.target.value)} />
          </label>
          <label className="block text-xs font-semibold">
            Mã bằng chứng
            <input className={`${inputClass} mt-1`} value={evidenceKey} onChange={(event) => setEvidenceKey(event.target.value)} />
          </label>
          <label className="block text-xs font-semibold">
            Thời điểm ghi nhận
            <input
              type="datetime-local"
              max={localDateTimeValue()}
              className={`${inputClass} mt-1`}
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold">
            Lý do
            <textarea className={`${inputClass} mt-1`} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {error && <p className="rounded-xl bg-[#ffdad6] p-3 text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className="rounded-full px-4 py-2 text-xs font-semibold">
              Huỷ
            </button>
            <button
              type="button"
              disabled={activeMutation.isPending}
              onClick={submit}
              className="rounded-full bg-ink px-4 py-2 font-label text-xs font-semibold text-white disabled:opacity-50"
            >
              {activeMutation.isPending ? 'Đang ghi nhận…' : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

