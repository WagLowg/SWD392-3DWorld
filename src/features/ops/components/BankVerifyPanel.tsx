import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { type ApiEnvelope, ApiClientError, http } from '../../../shared/api'
import { FormError, inputClass } from '../../../shared/ui/form'
import { Btn, Pill, Section } from '../../../shared/ui/kit'

type BankResponse = { id: number; bankName: string; accountNumberMasked: string; verificationStatus: string }

/**
 * Duyệt tài khoản ngân hàng — API THẬT: PATCH /api/admin/bank-accounts/{id}/verification { approved, reason }.
 * Chưa có API liệt kê tài khoản chờ duyệt → chuyên viên nhập mã tài khoản.
 */
export function BankVerifyPanel({ defaultId }: { defaultId?: string }) {
  const uid = useId()
  const [id, setId] = useState(defaultId ?? '')
  const [reason, setReason] = useState('')
  const review = useMutation({
    mutationFn: async (approved: boolean) =>
      (await http.patch<ApiEnvelope<BankResponse>, { approved: boolean; reason: string }>(`/api/admin/bank-accounts/${Number(id)}/verification`, { approved, reason: reason.trim() })).data,
  })
  const ok = Number(id) > 0 && reason.trim().length >= 5

  return (
    <Section title="Duyệt tài khoản ngân hàng nhận doanh thu" aside={<Pill tone="green">API thật</Pill>}>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <label htmlFor={`${uid}-id`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Mã tài khoản (id)</span>
          <input id={`${uid}-id`} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </label>
        <label htmlFor={`${uid}-r`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Lý do (ghi audit) *</span>
          <input id={`${uid}-r`} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Đã đối chiếu tên chủ tài khoản với CCCD…" />
        </label>
      </div>
      <div className="mt-3">
        <FormError message={review.error instanceof ApiClientError ? review.error.message : review.error ? 'Không duyệt được tài khoản.' : undefined} />
      </div>
      {review.data && (
        <p className="mt-3 rounded-2xl bg-mint p-3 text-sm text-[#0f5132]">
          {review.data.bankName} {review.data.accountNumberMasked} → <strong>{review.data.verificationStatus}</strong>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="primary" disabled={!ok || review.isPending} onClick={() => review.mutate(true)}>
          Phê duyệt tài khoản
        </Btn>
        <Btn variant="danger" disabled={!ok || review.isPending} onClick={() => review.mutate(false)}>
          Từ chối
        </Btn>
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">Cần quyền quản trị — tài khoản thường sẽ nhận lỗi 403 từ Backend.</p>
    </Section>
  )
}
