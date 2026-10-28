import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Field, inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, MockNotice, Section } from '../../../shared/ui/kit'
import { useCreateDesign, useDesignStatus } from '../hooks/useDesign'

const FORMATS = ['STL', 'OBJ', 'GLB', 'STEP', '3MF']
const BUDGETS = ['Dưới 1.5M ₫', '1.5M – 3.0M ₫', '3.0M – 6.0M ₫', 'Cao cấp > 6.0M ₫']

const schema = z.object({
  title: z.string().trim().min(5, 'Tối thiểu 5 ký tự').max(120),
  purpose: z.string().min(1, 'Chọn mục đích'),
  description: z.string().trim().min(30, 'Mô tả tối thiểu 30 ký tự').max(1000, 'Tối đa 1.000 ký tự'),
  size: z.string().trim().min(3, 'Nhập kích thước phủ bì'),
  formats: z.array(z.string()).min(1, 'Chọn ít nhất 1 định dạng'),
  budget: z.string().min(1, 'Chọn ngân sách'),
  deadline: z.string().min(1, 'Chọn thời hạn'),
  agree: z.boolean().refine((v) => v, 'Bạn cần xác nhận quyền sở hữu ý tưởng'),
})
type Values = z.infer<typeof schema>

/** DS-002 · Tạo Yêu Cầu Thiết Kế Mới */
export function NewDesignRequestPage() {
  const uid = useId()
  const navigate = useNavigate()
  const status = useDesignStatus()
  const create = useCreateDesign()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', purpose: '', description: '', size: '', formats: ['STL'], budget: '', deadline: '', agree: false },
  })
  const formats = watch('formats')
  const budget = watch('budget')
  const desc = watch('description') ?? ''

  useEffect(() => {
    document.title = 'Tạo yêu cầu thiết kế · 3DWorld'
  }, [])

  if (status.data && !status.data.accepting) return <Navigate to="/design/unavailable" replace />

  const submit = handleSubmit(({ agree, deadline, ...v }) =>
    create.mutate({ ...v, deadline: new Date(deadline).toISOString() }, { onSuccess: (r) => navigate(`/design/requests/${r.id}`) }),
  )

  return (
    <>
      <MockNotice api="POST /api/design-requests" />
      <Hero code="DS-002" eyebrow="Yêu cầu thiết kế mới" title="Tạo Yêu Cầu Thiết Kế 3D" accent="Brief Rõ Ràng — Báo Giá Chính Xác." />
      <form onSubmit={submit} noValidate>
        <DetailLayout
          main={
            <>
              <Section n={1} title="Thông tin dự án & mục đích sử dụng">
                <div className="grid gap-4">
                  <Field id={`${uid}-t`} label="Tên dự án thiết kế *" error={errors.title?.message}>
                    <input id={`${uid}-t`} className={inputClass} {...register('title')} />
                  </Field>
                  <Field id={`${uid}-p`} label="Mục đích sử dụng chính *" error={errors.purpose?.message}>
                    <select id={`${uid}-p`} className={inputClass} {...register('purpose')}>
                      <option value="">Chọn mục đích</option>
                      {['Art toy sưu tầm', 'Mascot thương hiệu', 'Phụ kiện kỹ thuật', 'Cosplay mini', 'Decor bàn làm việc'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id={`${uid}-d`} label="Mô tả chi tiết yêu cầu tạo hình *" error={errors.description?.message} aside={<span className="text-[11px] text-ink-soft">{desc.length}/1.000</span>}>
                    <textarea id={`${uid}-d`} rows={5} className={inputClass} {...register('description')} />
                  </Field>
                </div>
              </Section>
              <Section n={2} title="Tệp tham khảo & kích thước phủ bì">
                <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-sm text-ink-soft">
                  <Upload size={20} />
                  <span className="mt-1">Ảnh phác thảo / tham khảo (chờ API lưu tệp)</span>
                </div>
                <Field id={`${uid}-s`} label="Kích thước phủ bì mục tiêu (D × R × C) *" error={errors.size?.message} className="mt-4">
                  <input id={`${uid}-s`} placeholder="vd. 130 × 90 × 85 mm" className={inputClass} {...register('size')} />
                </Field>
              </Section>
              <Section n={3} title="Tiêu chuẩn kỹ thuật & định dạng">
                <p className="mb-2 font-label text-xs font-semibold text-ink-soft">Định dạng bàn giao (chọn ít nhất 1)</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => {
                    const on = formats.includes(f)
                    return (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setValue('formats', on ? formats.filter((x) => x !== f) : [...formats, f], { shouldValidate: true })}
                        className={`rounded-full px-4 py-2 font-mono text-xs font-semibold ${on ? 'bg-violet text-white' : 'bg-surface-low'}`}
                      >
                        .{f.toLowerCase()}
                      </button>
                    )
                  })}
                </div>
                {errors.formats && <p className="mt-1 text-xs text-danger">{errors.formats.message}</p>}
                <Field id={`${uid}-dl`} label="Thời hạn mong muốn hoàn tất *" error={errors.deadline?.message} className="mt-4">
                  <input id={`${uid}-dl`} type="date" className={inputClass} {...register('deadline')} />
                </Field>
              </Section>
              <Section n={4} title="Dự toán ngân sách & cam kết bản quyền">
                <div className="grid gap-2 sm:grid-cols-4">
                  {BUDGETS.map((b) => (
                    <button key={b} type="button" aria-pressed={budget === b} onClick={() => setValue('budget', b, { shouldValidate: true })} className={`rounded-2xl px-3 py-3 font-label text-sm font-semibold ${budget === b ? 'bg-ink text-white' : 'bg-surface-low'}`}>
                      {b}
                    </button>
                  ))}
                </div>
                {errors.budget && <p className="mt-1 text-xs text-danger">{errors.budget.message}</p>}
                <label className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-low p-4 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet" {...register('agree')} />
                  <span>
                    Tôi xác nhận ý tưởng / tham khảo không vi phạm bản quyền bên thứ ba.
                    {errors.agree && <span className="mt-1 block text-xs text-danger">{errors.agree.message}</span>}
                  </span>
                </label>
              </Section>
            </>
          }
          aside={
            <Section title="Gửi yêu cầu">
              <p className="text-sm text-ink-soft">Kỹ sư thẩm định brief và gửi báo giá cố định trong 24h làm việc. Chưa phát sinh chi phí cho tới khi bạn chấp thuận báo giá.</p>
              <div className="mt-4 grid gap-2">
                <Btn type="submit" variant="primary" disabled={create.isPending}>
                  Xác nhận & gửi yêu cầu
                </Btn>
                <Btn to="/design">Huỷ</Btn>
              </div>
            </Section>
          }
        />
      </form>
    </>
  )
}
