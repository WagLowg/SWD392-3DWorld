import { Upload } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, MockNotice, Section } from '../../../shared/ui/kit'
import type { ViolationReport } from '../data/buyer.fixtures'
import { useCreateReport } from '../hooks/useBuyer'
import { TARGET_TYPE } from '../lib/status'

const REASONS = ['Vi phạm bản quyền thiết kế', 'Tải lại trái phép tệp 3D', 'Sai lệch phôi in so với mô tả', 'Nội dung vũ khí / cấm', 'Gian lận giao dịch ngoài ký quỹ', 'Khác']

/** MP 033 · Tạo Báo Cáo Vi Phạm Mới */
export function NewReportPage() {
  const uid = useId()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const create = useCreateReport()
  const [form, setForm] = useState({
    targetType: (params.get('type') as ViolationReport['targetType']) || 'PRODUCT',
    target: params.get('target') ?? '',
    reason: '',
    description: '',
  })
  useEffect(() => {
    document.title = 'Báo cáo vi phạm mới · 3DWorld'
  }, [])
  const ok = form.target.trim().length >= 3 && form.reason && form.description.trim().length >= 30

  return (
    <>
      <MockNotice api="POST /api/reports" />
      <Hero code="MP 033" eyebrow="Báo cáo vi phạm" title="Tạo Báo Cáo Vi Phạm" accent="Bảo Vệ Cộng Đồng & Bản Quyền 3D." />
      <DetailLayout
        main={
          <>
            <Section n={1} title="Đối tượng báo cáo">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TARGET_TYPE) as ViolationReport['targetType'][]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={form.targetType === t}
                    onClick={() => setForm({ ...form, targetType: t })}
                    className={`rounded-full px-4 py-2 font-label text-sm font-semibold ${form.targetType === t ? 'bg-ink text-white' : 'bg-surface-low'}`}
                  >
                    {TARGET_TYPE[t]}
                  </button>
                ))}
              </div>
              <label htmlFor={`${uid}-t`} className="mt-4 block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Tên / mã đối tượng * (vd. prd_9941, tên xưởng)</span>
                <input id={`${uid}-t`} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputClass} />
              </label>
            </Section>
            <Section n={2} title="Lý do vi phạm">
              <div className="grid gap-2 sm:grid-cols-2">
                {REASONS.map((r) => (
                  <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-2xl p-3 text-sm ${form.reason === r ? 'bg-peach/60 ring-2 ring-orange' : 'bg-surface-low'}`}>
                    <input type="radio" name="reason" checked={form.reason === r} onChange={() => setForm({ ...form, reason: r })} className="accent-orange" /> {r}
                  </label>
                ))}
              </div>
            </Section>
            <Section n={3} title="Mô tả chi tiết & bằng chứng">
              <label htmlFor={`${uid}-d`} className="block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Mô tả (≥ 30 ký tự) — nêu nguồn gốc bản quyền nếu có</span>
                <textarea id={`${uid}-d`} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </label>
              <div className="mt-4 grid place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-sm text-ink-soft">
                <Upload size={20} />
                <span className="mt-1">Đính kèm bằng chứng (chờ API lưu tệp)</span>
              </div>
            </Section>
          </>
        }
        aside={
          <Section title="Gửi báo cáo">
            <ol className="space-y-2 text-sm text-ink-soft">
              <li>1. Báo cáo được chuyển tới chuyên viên kiểm duyệt.</li>
              <li>2. Thẩm định & đối soát bằng chứng (24–72h).</li>
              <li>3. Bạn nhận thông báo kết quả xử lý.</li>
            </ol>
            <div className="mt-4">
              <Btn variant="primary" disabled={!ok || create.isPending} onClick={() => create.mutate(form, { onSuccess: (r) => navigate(`/reports/${r.id}`) })}>
                Gửi báo cáo cho bộ phận thẩm định
              </Btn>
            </div>
          </Section>
        }
      />
    </>
  )
}
