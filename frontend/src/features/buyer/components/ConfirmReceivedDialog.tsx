import { PackageCheck, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { inputClass } from '../../../shared/ui/form'
import { Btn, Pill } from '../../../shared/ui/kit'
import { useConfirmReceived } from '../hooks/useBuyer'

/**
 * MP 032 · Hộp thoại xác nhận nhận hàng.
 * Chưa có API cho người mua chuyển đơn sang RECEIVED → thao tác là dữ liệu mẫu.
 */
export function ConfirmReceivedButton({ orderId, label = 'Xác nhận đã nhận hàng' }: { orderId: number; label?: string }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  if (done) return <Pill tone="green">Đã xác nhận (mô phỏng)</Pill>
  return (
    <>
      <Btn variant="orange" icon={PackageCheck} onClick={() => setOpen(true)}>
        {label}
      </Btn>
      {open && <Dialog orderId={orderId} onClose={() => setOpen(false)} onDone={() => setDone(true)} />}
    </>
  )
}

function Dialog({ orderId, onClose, onDone }: { orderId: number; onClose: () => void; onDone: () => void }) {
  const uid = useId()
  const confirm = useConfirmReceived()
  const [note, setNote] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby={`${uid}-t`} className="relative w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-lift animate-fade-up">
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 rounded-full p-2 hover:bg-surface-low">
          <X size={16} />
        </button>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-mint text-[#0f5132]">
          <PackageCheck size={26} />
        </span>
        <h2 id={`${uid}-t`} className="mt-4 font-display text-2xl font-bold">
          Xác nhận đã nhận vật phẩm?
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sau khi xác nhận, bạn còn <strong className="text-ink">72 giờ</strong> để yêu cầu hoàn tiền nếu sản phẩm có vấn đề. Hết thời hạn, khoản ký quỹ được giải ngân cho xưởng.
        </p>
        <label htmlFor={`${uid}-n`} className="mt-4 block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Ghi chú nghiệm thu (tuỳ chọn)</span>
          <textarea id={`${uid}-n`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Btn onClick={onClose}>Kiểm tra thêm / để sau</Btn>
          <Btn
            variant="primary"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(
                { orderId, note },
                {
                  onSuccess: () => {
                    onDone()
                    onClose()
                  },
                },
              )
            }
          >
            Xác nhận nhận hàng & bắt đầu 72h bảo vệ
          </Btn>
        </div>
        <p className="mt-3 text-[11px] text-violet">Dữ liệu mẫu — chờ API người mua xác nhận RECEIVED.</p>
      </div>
    </div>
  )
}
