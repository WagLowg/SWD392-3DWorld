import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Field, FormError, inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { SellerProduct } from '../data/seller.fixtures'
import { resolveMediaUrl } from '../../marketplace/lib/format'
import { useRemoveProductMedia, useSaveProduct, useSellerProduct, useUploadProductMedia } from '../hooks/useSeller'
import { PRODUCT_STATUS } from '../lib/status'

const CATEGORIES = [
  { value: 'FIGURINE', label: 'Tượng & Figure' },
  { value: 'ART_TOY', label: 'Art toy' },
  { value: 'MINIATURE', label: 'Mô hình mini' },
  { value: 'DESK_ACCESSORY', label: 'Phụ kiện bàn' },
  { value: 'KEYCAP', label: 'Keycap' },
]

const variantSchema = z.object({
  id: z.number().optional(),
  sku: z.string().trim().regex(/^[A-Z0-9-]{3,32}$/, 'SKU: 3–32 ký tự A-Z, 0-9, -'),
  material: z.string().trim().min(1, 'Nhập chất liệu'),
  color: z.string().trim().min(1, 'Nhập màu'),
  size: z.string().trim().min(1, 'Nhập kích thước'),
  price: z.coerce.number().min(10_000, '≥ 10.000₫'),
  stock: z.coerce.number().int().min(0, '≥ 0'),
})

const schema = z.object({
  title: z.string().trim().min(5, 'Tối thiểu 5 ký tự').max(120, 'Tối đa 120 ký tự'),
  category: z.string().min(1),
  description: z.string().trim().min(30, 'Mô tả tối thiểu 30 ký tự').max(5000),
  shippingClass: z.string().min(1),
  polygonCount: z.coerce.number().int().min(0),
  manifold: z.boolean(),
  variants: z.array(variantSchema).min(1, 'Cần ít nhất 1 biến thể'),
})
type Values = z.input<typeof schema>

/** MP 043 Tạo mới · MP 044 Chỉnh sửa sản phẩm */
export function ProductEditorPage() {
  const { productId } = useParams()
  const id = productId ? Number(productId) : undefined
  const q = useSellerProduct(id ?? Number.NaN)

  useEffect(() => {
    document.title = id ? 'Chỉnh sửa sản phẩm · 3DWorld' : 'Tạo sản phẩm mới · 3DWorld'
  }, [id])

  return (
    <>
      <Hero
        code={id ? 'MP 044' : 'MP 043'}
        eyebrow={id ? 'Chỉnh sửa mẫu phôi' : 'Khởi tạo mẫu mới'}
        title={id ? 'Chỉnh Sửa Sản Phẩm' : 'Đăng Bán Đồ Chơi Nghệ Thuật'}
        accent={id ? 'Cập Nhật Thông Số & Khắc Phục Lỗi.' : 'Thông Tin, Hình Ảnh & Biến Thể.'}
      />
      {id ? (
        <QueryState isLoading={q.isLoading} error={q.error}>
          {q.data && <EditorForm product={q.data} />}
        </QueryState>
      ) : (
        <EditorForm />
      )}
    </>
  )
}

function MediaManager({ product }: { product: SellerProduct }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadProductMedia()
  const remove = useRemoveProductMedia()
  const items = product.mediaItems ?? []
  const busy = upload.isPending || remove.isPending

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    let order = items.length
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png)$/.test(file.type) || file.size > 5 * 1024 * 1024) continue
      await upload.mutateAsync({ productId: product.id, file, sortOrder: order++ }).catch(() => undefined)
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((m, i) => (
        <div key={m.id} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-low">
          <img src={resolveMediaUrl(m.url)} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label={`Gỡ ảnh ${i + 1}`}
            disabled={busy}
            onClick={() => remove.mutate({ productId: product.id, mediaId: m.id })}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-danger shadow disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line text-center text-xs text-ink-soft hover:border-violet disabled:opacity-50"
      >
        <span className="flex flex-col items-center gap-1">
          <ImagePlus size={20} /> {upload.isPending ? 'Đang tải…' : 'Thêm ảnh'}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  )
}

function EditorForm({ product }: { product?: SellerProduct }) {
  const uid = useId()
  const navigate = useNavigate()
  const save = useSaveProduct()
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { ...product, variants: product.variants.map(({ reserved, active, ...v }) => v) }
      : {
          title: '',
          category: 'FIGURINE',
          description: '',
          shippingClass: 'Hộp tiêu chuẩn',
          polygonCount: 0,
          manifold: true,
          variants: [{ sku: '', material: 'Resin SLA', color: '', size: '', price: 0, stock: 0 }],
        },
  })
  const variants = useFieldArray({ control, name: 'variants' })
  const title = watch('title') ?? ''

  const submit = (send: boolean) =>
    handleSubmit((raw) => {
      const v = schema.parse(raw)
      const old = product?.variants ?? []
      save.mutate(
        {
          submit: send,
          input: {
            ...v,
            id: product?.id,
            media: product?.media,
            variants: v.variants.map((x, i) => ({
              ...x,
              id: x.id ?? Date.now() + i,
              reserved: old.find((o) => o.id === x.id)?.reserved ?? 0,
              active: true,
            })),
          },
        },
        { onSuccess: (p) => p && navigate(send ? `/seller/products/${p.id}` : `/seller/products/${p.id}/edit`) },
      )
    })

  return (
    <form noValidate onSubmit={(e) => e.preventDefault()}>
      <DetailLayout
        main={
          <>
            {product?.status === 'REJECTED' && product.rejectReason && (
              <p className="rounded-[1.75rem] bg-[#ffdad6] p-5 text-sm text-danger">
                <strong>Lý do bị từ chối:</strong> {product.rejectReason}
              </p>
            )}
            <Section n={1} title="Thông tin tác phẩm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${uid}-t`} label="Tên tác phẩm *" error={errors.title?.message} aside={<span className="text-[11px] text-ink-soft">{title.length}/120</span>} className="sm:col-span-2">
                  <input id={`${uid}-t`} className={inputClass} {...register('title')} />
                </Field>
                <Field id={`${uid}-c`} label="Danh mục">
                  <select id={`${uid}-c`} className={inputClass} {...register('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`${uid}-sh`} label="Quy chuẩn vận chuyển">
                  <select id={`${uid}-sh`} className={inputClass} {...register('shippingClass')}>
                    {['Hộp tiêu chuẩn', 'Hộp collector chống sốc', 'Kiện cồng kềnh'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field id={`${uid}-d`} label="Mô tả câu chuyện & quy trình đúc *" error={errors.description?.message} className="sm:col-span-2">
                  <textarea id={`${uid}-d`} rows={5} className={inputClass} {...register('description')} />
                </Field>
              </div>
            </Section>

            <Section n={2} title="Hình ảnh chế tác" subtitle="Ảnh chụp mẫu in thực tế (JPEG/PNG ≤ 5 MB, không dùng ảnh render).">
              {product ? (
                <MediaManager product={product} />
              ) : (
                <p className="rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">
                  Lưu bản nháp trước, sau đó tải ảnh lên. Cần ít nhất 1 ảnh để gửi duyệt.
                </p>
              )}
            </Section>

            <Section n={3} title="Biến thể & tồn kho" subtitle="Mỗi biến thể là một SKU với giá và kho riêng.">
              {errors.variants?.root?.message && <FormError message={errors.variants.root.message} />}
              <div className="space-y-3">
                {variants.fields.map((f, i) => {
                  const e = errors.variants?.[i]
                  return (
                    <div key={f.id} className="grid gap-2 rounded-2xl bg-surface-low p-3 sm:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_0.7fr_auto]">
                      {(
                        [
                          ['sku', 'SKU'],
                          ['material', 'Chất liệu'],
                          ['color', 'Màu'],
                          ['size', 'Kích thước'],
                          ['price', 'Giá (₫)'],
                          ['stock', 'Kho'],
                        ] as const
                      ).map(([name, label]) => (
                        <div key={name}>
                          <label htmlFor={`${uid}-v${i}-${name}`} className="sr-only">
                            {label}
                          </label>
                          <input
                            id={`${uid}-v${i}-${name}`}
                            placeholder={label}
                            inputMode={name === 'price' || name === 'stock' ? 'numeric' : undefined}
                            className={`${inputClass} bg-white py-2 ${name === 'sku' ? 'font-mono uppercase' : ''}`}
                            {...register(`variants.${i}.${name}`)}
                          />
                          {e?.[name]?.message && <p className="mt-0.5 text-[11px] text-danger">{e[name]?.message}</p>}
                        </div>
                      ))}
                      <button
                        type="button"
                        aria-label="Xoá biến thể"
                        disabled={variants.fields.length === 1}
                        onClick={() => variants.remove(i)}
                        className="grid h-10 w-10 place-items-center self-start rounded-full text-ink-soft hover:bg-white hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3">
                <Btn icon={Plus} size="sm" onClick={() => variants.append({ sku: '', material: 'Resin SLA', color: '', size: '', price: 0, stock: 0 })}>
                  Thêm biến thể
                </Btn>
              </div>
            </Section>

            <Section n={4} title="Thông số kỹ thuật lưới">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${uid}-poly`} label="Số đỉnh lưới (polygon count)" error={errors.polygonCount?.message}>
                  <input id={`${uid}-poly`} inputMode="numeric" className={inputClass} {...register('polygonCount')} />
                </Field>
                <label className="flex items-center gap-3 self-end rounded-2xl bg-surface-low p-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-violet" {...register('manifold')} /> Lưới kín (manifold), đã kiểm tra slicer
                </label>
              </div>
            </Section>
          </>
        }
        aside={
          <Section title="Nộp duyệt">
            {product && (
              <div className="mb-3">
                <StatusPill status={product.status} map={PRODUCT_STATUS} />
              </div>
            )}
            <p className="text-sm text-ink-soft">Sản phẩm được chuyên viên kiểm duyệt (bản quyền, ảnh thực tế, lưới in) trước khi mở bán.</p>
            <div className="mt-4 grid gap-2">
              <Btn variant="primary" disabled={save.isPending} onClick={submit(true)}>
                {product?.status === 'REJECTED' ? 'Nộp lại thẩm định' : 'Gửi duyệt sản phẩm'}
              </Btn>
              <Btn disabled={save.isPending} onClick={submit(false)}>
                Lưu bản nháp
              </Btn>
              <Btn to={product ? `/seller/products/${product.id}` : '/seller/products'} variant="white">
                Huỷ
              </Btn>
            </div>
          </Section>
        }
      />
    </form>
  )
}
