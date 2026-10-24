import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, FileUp, Lock, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { type DragEvent, useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiClientError } from '../../../shared/api'
import { formatBytes } from '../../../shared/format'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { PageHeading } from '../../../shared/ui/primitives'
import { useUploadModel } from '../hooks/useModels'
import { MODEL_FORMATS, MODEL_MAX_BYTES } from '../services/model.service'
import type { UploadResult } from '../types/model.types'

// CreateModelRequest: modelName ≤255, description ≤10000, không ký tự điều khiển
const noControl = (v: string) => !/\p{Cc}/u.test(v.replace(/[\n\r\t]/g, ''))
const schema = z.object({
  modelName: z
    .string()
    .trim()
    .min(1, 'Nhập tên mô hình.')
    .max(255, 'Tối đa 255 ký tự.')
    .refine(noControl, 'Có ký tự không hợp lệ.'),
  description: z.string().trim().max(10000, 'Tối đa 10.000 ký tự.').optional(),
})
type Values = z.infer<typeof schema>

function validateFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!MODEL_FORMATS.includes(ext as (typeof MODEL_FORMATS)[number]))
    return `Chỉ hỗ trợ ${MODEL_FORMATS.map((f) => `.${f}`).join(', ')}.`
  if (file.size > MODEL_MAX_BYTES) return `Tệp tối đa ${formatBytes(MODEL_MAX_BYTES)}.`
  if (file.size === 0) return 'Tệp rỗng.'
  return ''
}

/** CR-007 · Tải Lên Mô Hình 3D (POST /api/models/uploads, multipart). */
export function ModelUploadPage() {
  const uid = useId()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)
  const upload = useUploadModel(setProgress)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [drag, setDrag] = useState(false)
  const [done, setDone] = useState<UploadResult | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { modelName: '', description: '' } })

  useEffect(() => {
    document.title = 'Tải lên mô hình 3D · 3DWorld'
  }, [])

  const pick = (f: File | undefined) => {
    if (!f) return
    const err = validateFile(f)
    setFileError(err)
    setFile(err ? null : f)
    if (!err && !getValues('modelName')) setValue('modelName', f.name.replace(/\.[^.]+$/, ''))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    pick(e.dataTransfer.files[0])
  }

  const submit = handleSubmit(async (v) => {
    if (!file) return setFileError('Chọn tệp mô hình.')
    setProgress(0)
    try {
      setDone(await upload.mutateAsync({ modelName: v.modelName, description: v.description || undefined, file }))
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Tải lên thất bại.' })
    }
  })

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-[#0f5132]">
          <CheckCircle2 size={36} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold">Đã tải lên “{done.modelName}”</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Phiên bản v{done.versionNumber} · {done.fileFormat?.toUpperCase()} · {formatBytes(done.fileSize)} ·{' '}
          {done.visibility}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/models/${done.modelId}`)}
            className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
          >
            Xem mô hình
          </button>
          <a
            href={`/pod/new?versionId=${done.modelVersionId}`}
            className="rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold"
          >
            Gửi đặt in 3D
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeading
        eyebrow="Tải lên trực tiếp"
        title="Tải Lên Mô Hình 3D"
        accent="Lưu Trữ Riêng Tư & Sẵn Sàng In."
        description="Tệp được kiểm tra định dạng và lưu riêng tư trong thư viện của bạn. Mỗi lần tải lên tạo một mô hình mới với phiên bản v1."
        aside={
          <Link to="/models" className="rounded-full bg-white px-4 py-2.5 font-label text-xs font-semibold shadow-soft">
            ← Thư viện 3D
          </Link>
        }
      />
      <form onSubmit={submit} noValidate className="mt-8 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <label
            htmlFor={`${uid}-file`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 py-14 text-center transition ${
              drag ? 'border-violet bg-violet-soft/40' : 'border-line bg-surface-low hover:border-violet/50'
            }`}
          >
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet shadow-soft">
              <UploadCloud size={30} />
            </span>
            <span className="mt-4 font-display text-lg font-bold">Kéo thả tệp vào đây hoặc bấm để chọn</span>
            <span className="mt-1 text-sm text-ink-soft">
              {MODEL_FORMATS.map((f) => f.toUpperCase()).join(' · ')} — tối đa {formatBytes(MODEL_MAX_BYTES)}
            </span>
            <input
              id={`${uid}-file`}
              type="file"
              accept={MODEL_FORMATS.map((f) => `.${f}`).join(',')}
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
          {fileError && <p className="mt-3 text-sm text-danger">{fileError}</p>}
          {file && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-low p-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-violet">
                <FileUp size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{file.name}</span>
                <span className="font-mono text-[11px] text-ink-soft">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                aria-label="Bỏ tệp"
                onClick={() => setFile(null)}
                className="rounded-full p-2 text-ink-soft hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {upload.isPending && (
            <div className="mt-4">
              <div className="flex justify-between font-label text-xs font-semibold">
                <span>Đang tải lên & kiểm tra lưới…</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-high">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-orange transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <Field id={`${uid}-name`} label="Tên mô hình *" error={errors.modelName?.message}>
            <input
              id={`${uid}-name`}
              aria-invalid={!!errors.modelName}
              className={inputClass}
              {...register('modelName')}
            />
          </Field>
          <Field id={`${uid}-desc`} label="Mô tả" error={errors.description?.message}>
            <textarea
              id={`${uid}-desc`}
              rows={5}
              className={inputClass}
              placeholder="Chất liệu dự kiến, tỉ lệ, ghi chú in…"
              {...register('description')}
            />
          </Field>
          <FormError message={errors.root?.message} />
          <SubmitButton busy={upload.isPending} className="w-full">
            Tải lên thư viện
          </SubmitButton>
          <div className="space-y-2 rounded-2xl bg-surface-low p-4 text-xs text-ink-soft">
            <p className="flex gap-2">
              <Lock size={14} className="shrink-0 text-violet" /> Mô hình mặc định riêng tư, không công khai và không
              bán dưới dạng tệp.
            </p>
            <p className="flex gap-2">
              <ShieldCheck size={14} className="shrink-0 text-teal" /> Backend kiểm tra định dạng & cấu trúc tệp trước
              khi lưu.
            </p>
          </div>
        </section>
      </form>
    </>
  )
}
