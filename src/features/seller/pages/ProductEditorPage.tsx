import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, PackageCheck, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { resolveMediaUrl } from '../../marketplace/lib/format'
import { Field, FormError, inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { SellerProduct } from '../data/seller.fixtures'
import { useRemoveProductMedia, useSaveProduct, useSellerProduct, useUploadProductMedia } from '../hooks/useSeller'
import { PRODUCT_STATUS } from '../lib/status'
import type { PendingProductMedia } from '../services/seller.service'

const CATEGORIES = [
  { value: 'FIGURINE', label: 'Tượng & Figure' },
  { value: 'ART_TOY', label: 'Art toy' },
  { value: 'MINIATURE', label: 'Mô hình mini' },
  { value: 'DESK_ACCESSORY', label: 'Phụ kiện bàn' },
  { value: 'KEYCAP', label: 'Keycap' },
]

const PACKING_GROUPS = [
  { value: 'STANDARD', label: 'Tiêu chuẩn' },
  { value: 'FRAGILE', label: 'Dễ vỡ / chống sốc' },
  { value: 'OVERSIZED', label: 'Cồng kềnh' },
]

const SHIPPING_CLASSES = [
  { value: 'STANDARD', label: 'Hộp tiêu chuẩn' },
  { value: 'FRAGILE', label: 'Hộp collector chống sốc' },
  { value: 'OVERSIZED', label: 'Kiện cồng kềnh' },
]

const MATERIALS = ['Resin SLA', 'Resin DLP', 'Resin ABS-like', 'FDM PLA', 'FDM PETG', 'FDM ABS', 'FDM TPU', 'Nylon']

const COLORS = [
  'Nguyên bản / chưa sơn',
  'Trắng',
  'Đen',
  'Xám',
  'Đỏ',
  'Cam',
  'Vàng',
  'Xanh lá',
  'Xanh dương',
  'Tím',
  'Hồng',
  'Trong suốt',
  'Đa màu',
  'Theo yêu cầu',
]

const SIZES = [
  { value: 'MINI', label: 'Mini · tối đa 5 cm' },
  { value: 'S', label: 'S · 6–10 cm' },
  { value: 'M', label: 'M · 11–15 cm' },
  { value: 'L', label: 'L · 16–20 cm' },
  { value: 'XL', label: 'XL · 21–30 cm' },
  { value: 'OVERSIZED', label: 'Cỡ lớn · trên 30 cm' },
  { value: 'ONE_SIZE', label: 'Một kích cỡ' },
  { value: 'CUSTOM', label: 'Theo yêu cầu' },
]

const variantSchema = z.object({
  id: z.number().optional(),
  sku: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{3,32}$/, 'SKU: 3–32 ký tự A-Z, 0-9, -'),
  material: z.string().trim().min(1, 'Nhập chất liệu'),
  color: z.string().trim().min(1, 'Nhập màu'),
  size: z.string().trim().min(1, 'Nhập kích thước'),
  price: z.coerce.number().min(10_000, 'Giá tối thiểu 10.000₫'),
  stock: z.coerce.number().int().min(0, 'Tồn kho phải ≥ 0'),
  active: z.boolean(),
  fragile: z.boolean(),
  lowStockThreshold: z.coerce.number().int().min(0, 'Ngưỡng phải ≥ 0'),
  packingGroup: z.string().trim().min(1, 'Chọn nhóm đóng gói').max(50),
  weightGrams: z.coerce.number().int().positive('Khối lượng phải > 0'),
  lengthCm: z.coerce.number().min(0.01, 'Chiều dài phải ≥ 0,01'),
  widthCm: z.coerce.number().min(0.01, 'Chiều rộng phải ≥ 0,01'),
  heightCm: z.coerce.number().min(0.01, 'Chiều cao phải ≥ 0,01'),
})

const schema = z.object({
  title: z.string().trim().min(5, 'Tối thiểu 5 ký tự').max(120, 'Tối đa 120 ký tự'),
  category: z.string().min(1, 'Chọn danh mục'),
  description: z.string().trim().min(30, 'Mô tả tối thiểu 30 ký tự').max(5000),
  shippingClass: z.string().min(1, 'Chọn quy chuẩn vận chuyển'),
  polygonCount: z.coerce.number().int().min(0),
  manifold: z.boolean(),
  variants: z
    .array(variantSchema)
    .min(1, 'Cần ít nhất 1 biến thể')
    .max(100, 'Tối đa 100 biến thể cho một sản phẩm')
    .refine(
      (items) => new Set(items.map((item) => item.sku.trim().toUpperCase())).size === items.length,
      'SKU trong sản phẩm không được trùng nhau',
    )
    .refine((items) => items.some((item) => item.active), 'Cần ít nhất 1 biến thể đang hoạt động'),
})

type Values = z.input<typeof schema>
type PendingMediaPreview = PendingProductMedia & { previewUrl: string }

const blankVariant = () => ({
  sku: '',
  material: 'Resin SLA',
  color: '',
  size: '',
  price: 0,
  stock: 0,
  active: true,
  fragile: false,
  lowStockThreshold: 5,
  packingGroup: 'STANDARD',
  weightGrams: 250,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
})

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
  const [variantId, setVariantId] = useState('')
  const [error, setError] = useState<string>()
  const upload = useUploadProductMedia()
  const remove = useRemoveProductMedia()
  const items = product.mediaItems ?? []
  const busy = upload.isPending || remove.isPending

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const all = Array.from(files)
    const valid = all.filter((file) => /^image\/(jpeg|png)$/.test(file.type) && file.size <= 5 * 1024 * 1024)
    const accepted = valid.slice(0, Math.max(0, 20 - items.length))
    setError(
      valid.length !== all.length
        ? 'Chỉ nhận JPEG/PNG, tối đa 5 MB mỗi ảnh.'
        : accepted.length !== valid.length
          ? 'Mỗi sản phẩm được tải tối đa 20 ảnh.'
          : undefined,
    )

    let order = items.length
    for (const file of accepted) {
      await upload
        .mutateAsync({
          productId: product.id,
          file,
          sortOrder: order++,
          variantId: variantId ? Number(variantId) : undefined,
        })
        .catch(() => undefined)
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface-low p-3">
        <Field id="media-variant" label="Ảnh áp dụng cho" className="min-w-56 flex-1">
          <select
            id="media-variant"
            className={`${inputClass} bg-white py-2.5`}
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
          >
            <option value="">Ảnh chung của sản phẩm</option>
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                Biến thể {variant.sku}
              </option>
            ))}
          </select>
        </Field>
        <p className="pb-2 text-xs text-ink-soft">Ảnh mới sẽ được gắn vào lựa chọn này.</p>
      </div>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((media, index) => {
          const variant = product.variants.find((item) => item.id === media.variantId)
          return (
            <div key={media.id} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-low">
              <img
                src={resolveMediaUrl(media.url)}
                alt={`Ảnh sản phẩm ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink">
                {variant ? variant.sku : 'Ảnh chung'}
              </span>
              <button
                type="button"
                aria-label={`Gỡ ảnh ${index + 1}`}
                disabled={busy}
                onClick={() => remove.mutate({ productId: product.id, mediaId: media.id })}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-danger shadow disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
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
          onChange={(event) => onFiles(event.target.files)}
        />
      </div>
    </div>
  )
}

function PendingMediaManager({
  items,
  skus,
  error,
  onAdd,
  onRemove,
  onVariantChange,
}: {
  items: PendingMediaPreview[]
  skus: string[]
  error?: string
  onAdd: (files: FileList | null) => void
  onRemove: (index: number) => void
  onVariantChange: (index: number, variantSku?: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.previewUrl} className="overflow-hidden rounded-2xl bg-surface-low p-2">
            <div className="relative aspect-square overflow-hidden rounded-xl">
              <img src={item.previewUrl} alt={`Ảnh chờ tải ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Gỡ ảnh ${index + 1}`}
                onClick={() => onRemove(index)}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-danger shadow"
              >
                <X size={14} />
              </button>
            </div>
            <select
              aria-label={`Biến thể cho ảnh ${index + 1}`}
              className="mt-2 w-full rounded-xl bg-white px-2 py-2 text-xs outline-none ring-violet/40 focus:ring-2"
              value={item.variantSku ?? ''}
              onChange={(event) => onVariantChange(index, event.target.value || undefined)}
            >
              <option value="">Ảnh chung</option>
              {skus.map((sku) => (
                <option key={sku} value={sku}>
                  {sku}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-line text-center text-xs text-ink-soft hover:border-violet"
        >
          <span className="flex flex-col items-center gap-1">
            <ImagePlus size={22} /> Chọn ảnh
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(event) => {
            onAdd(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">
        Khi lưu, hệ thống tự tạo bản nháp rồi tải ảnh lên. Bạn có thể để ảnh chung hoặc gắn ảnh với một SKU cụ thể.
      </p>
    </div>
  )
}

function VariantField({
  label,
  error,
  className = '',
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </div>
  )
}

function EditorForm({ product }: { product?: SellerProduct }) {
  const uid = useId()
  const navigate = useNavigate()
  const save = useSaveProduct()
  const [pendingMedia, setPendingMedia] = useState<PendingMediaPreview[]>([])
  const pendingMediaRef = useRef<PendingMediaPreview[]>([])
  const [mediaError, setMediaError] = useState<string>()
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { ...product, variants: product.variants.map(({ reserved: _reserved, ...variant }) => variant) }
      : {
          title: '',
          category: 'FIGURINE',
          description: '',
          shippingClass: 'STANDARD',
          polygonCount: 0,
          manifold: true,
          variants: [blankVariant()],
        },
  })
  const variants = useFieldArray({ control, name: 'variants', keyName: 'fieldKey' })
  const title = watch('title') ?? ''
  const colorListId = `${uid}-product-colors`
  const watchedVariants = watch('variants') ?? []
  const skus = watchedVariants
    .map((variant) => (typeof variant.sku === 'string' ? variant.sku.trim().toUpperCase() : ''))
    .filter(Boolean)

  useEffect(() => {
    pendingMediaRef.current = pendingMedia
  }, [pendingMedia])

  useEffect(
    () => () => {
      pendingMediaRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl)
      })
    },
    [],
  )

  const addPendingMedia = (files: FileList | null) => {
    if (!files) return
    const all = Array.from(files)
    const valid = all.filter((file) => /^image\/(jpeg|png)$/.test(file.type) && file.size <= 5 * 1024 * 1024)
    const accepted = valid.slice(0, Math.max(0, 20 - pendingMedia.length))
    setMediaError(
      valid.length !== all.length
        ? 'Chỉ nhận JPEG/PNG, tối đa 5 MB mỗi ảnh.'
        : accepted.length !== valid.length
          ? 'Mỗi sản phẩm được tải tối đa 20 ảnh.'
          : undefined,
    )
    setPendingMedia((current) => [
      ...current,
      ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
  }

  const removePendingMedia = (index: number) => {
    setPendingMedia((current) => {
      URL.revokeObjectURL(current[index].previewUrl)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  const changePendingVariant = (index: number, variantSku?: string) => {
    setPendingMedia((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, variantSku } : item)),
    )
  }

  const submit = (send: boolean) =>
    handleSubmit((raw) => {
      const parsed = schema.parse(raw)
      const totalMedia = (product?.mediaItems?.length ?? 0) + pendingMedia.length
      if (send && totalMedia === 0) {
        setMediaError('Cần ít nhất 1 ảnh sản phẩm trước khi gửi duyệt.')
        return
      }
      setMediaError(undefined)
      const old = product?.variants ?? []
      save.mutate(
        {
          submit: send,
          pendingMedia: pendingMedia.map(({ file, variantSku }) => ({ file, variantSku })),
          input: {
            ...parsed,
            id: product?.id,
            media: product?.media,
            specifications: product?.specifications,
            variants: parsed.variants.map((variant, index) => ({
              ...variant,
              id: variant.id ?? Date.now() + index,
              reserved: old.find((item) => item.id === variant.id)?.reserved ?? 0,
            })),
          },
        },
        {
          onSuccess: (saved) => {
            pendingMedia.forEach((item) => {
              URL.revokeObjectURL(item.previewUrl)
            })
            setPendingMedia([])
            if (saved) navigate(send ? `/seller/products/${saved.id}` : `/seller/products/${saved.id}/edit`)
          },
        },
      )
    })

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <datalist id={colorListId}>
        {COLORS.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>
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
                <Field
                  id={`${uid}-title`}
                  label="Tên tác phẩm *"
                  error={errors.title?.message}
                  aside={<span className="text-[11px] text-ink-soft">{title.length}/120</span>}
                  className="sm:col-span-2"
                >
                  <input id={`${uid}-title`} className={inputClass} {...register('title')} />
                </Field>
                <Field id={`${uid}-category`} label="Danh mục" error={errors.category?.message}>
                  <select id={`${uid}-category`} className={inputClass} {...register('category')}>
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`${uid}-shipping`} label="Quy chuẩn vận chuyển" error={errors.shippingClass?.message}>
                  <select id={`${uid}-shipping`} className={inputClass} {...register('shippingClass')}>
                    {SHIPPING_CLASSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id={`${uid}-description`}
                  label="Mô tả câu chuyện & quy trình đúc *"
                  error={errors.description?.message}
                  className="sm:col-span-2"
                >
                  <textarea id={`${uid}-description`} rows={5} className={inputClass} {...register('description')} />
                </Field>
              </div>
            </Section>

            <Section
              n={2}
              title="Hình ảnh chế tác"
              subtitle="Ảnh chụp mẫu in thực tế (JPEG/PNG ≤ 5 MB). BE yêu cầu ít nhất 1 ảnh để gửi duyệt."
            >
              {product ? (
                <>
                  <FormError message={mediaError} />
                  <MediaManager product={product} />
                </>
              ) : (
                <PendingMediaManager
                  items={pendingMedia}
                  skus={skus}
                  error={mediaError}
                  onAdd={addPendingMedia}
                  onRemove={removePendingMedia}
                  onVariantChange={changePendingVariant}
                />
              )}
            </Section>

            <Section
              n={3}
              title="Biến thể, tồn kho & đóng gói"
              subtitle="Mỗi SKU có giá, kho và thông số kiện hàng riêng để tính phí và tạo đơn GHTK."
            >
              <FormError message={errors.variants?.message ?? errors.variants?.root?.message} />
              <div className="space-y-4">
                {variants.fields.map((field, index) => {
                  const error = errors.variants?.[index]
                  const currentMaterial = String(watchedVariants[index]?.material ?? '')
                  const currentSize = String(watchedVariants[index]?.size ?? '')
                  return (
                    <article
                      key={field.fieldKey}
                      className="rounded-[1.75rem] border border-line bg-surface-low p-4 sm:p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-label text-sm font-bold">Biến thể {String(index + 1).padStart(2, '0')}</p>
                          <p className="text-xs text-ink-soft">Mã SKU phải duy nhất trên toàn hệ thống.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-violet"
                              {...register(`variants.${index}.active`)}
                            />
                            Đang bán
                          </label>
                          <button
                            type="button"
                            aria-label="Xoá biến thể"
                            disabled={variants.fields.length === 1}
                            onClick={() => variants.remove(index)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-soft shadow-sm hover:text-danger disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <VariantField label="SKU *" error={error?.sku?.message} className="sm:col-span-2">
                          <input
                            aria-label={`SKU biến thể ${index + 1}`}
                            placeholder="VD: JADE-RESIN-GREEN-S"
                            className={`${inputClass} bg-white font-mono uppercase`}
                            {...register(`variants.${index}.sku`)}
                          />
                        </VariantField>
                        <VariantField label="Chất liệu *" error={error?.material?.message}>
                          <select
                            aria-label={`Chất liệu biến thể ${index + 1}`}
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.material`)}
                          >
                            <option value="" disabled>
                              Chọn chất liệu
                            </option>
                            {currentMaterial && !MATERIALS.includes(currentMaterial) && (
                              <option value={currentMaterial}>{currentMaterial}</option>
                            )}
                            {MATERIALS.map((material) => (
                              <option key={material} value={material}>
                                {material}
                              </option>
                            ))}
                          </select>
                        </VariantField>
                        <VariantField label="Màu sắc *" error={error?.color?.message}>
                          <input
                            aria-label={`Màu sắc biến thể ${index + 1}`}
                            list={colorListId}
                            placeholder="Chọn hoặc nhập màu khác"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.color`)}
                          />
                        </VariantField>
                        <VariantField label="Kích cỡ / phiên bản *" error={error?.size?.message}>
                          <select
                            aria-label={`Kích cỡ biến thể ${index + 1}`}
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.size`)}
                          >
                            <option value="" disabled>
                              Chọn kích cỡ
                            </option>
                            {currentSize && !SIZES.some((size) => size.value === currentSize) && (
                              <option value={currentSize}>{currentSize}</option>
                            )}
                            {SIZES.map((size) => (
                              <option key={size.value} value={size.value}>
                                {size.label}
                              </option>
                            ))}
                          </select>
                        </VariantField>
                        <VariantField label="Giá bán (₫) *" error={error?.price?.message}>
                          <input
                            aria-label={`Giá bán biến thể ${index + 1}`}
                            inputMode="numeric"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.price`)}
                          />
                        </VariantField>
                        <VariantField label="Tồn kho *" error={error?.stock?.message}>
                          <input
                            aria-label={`Tồn kho biến thể ${index + 1}`}
                            inputMode="numeric"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.stock`)}
                          />
                        </VariantField>
                        <VariantField label="Cảnh báo sắp hết" error={error?.lowStockThreshold?.message}>
                          <input
                            aria-label={`Ngưỡng sắp hết biến thể ${index + 1}`}
                            inputMode="numeric"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.lowStockThreshold`)}
                          />
                        </VariantField>
                      </div>

                      <div className="my-4 border-t border-line" />
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                        <PackageCheck size={15} /> Kiện hàng sau đóng gói
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <VariantField
                          label="Nhóm đóng gói *"
                          error={error?.packingGroup?.message}
                          className="lg:col-span-2"
                        >
                          <select
                            aria-label={`Nhóm đóng gói biến thể ${index + 1}`}
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.packingGroup`)}
                          >
                            {PACKING_GROUPS.map((group) => (
                              <option key={group.value} value={group.value}>
                                {group.label}
                              </option>
                            ))}
                          </select>
                        </VariantField>
                        <VariantField label="Khối lượng (gram) *" error={error?.weightGrams?.message}>
                          <input
                            aria-label={`Khối lượng biến thể ${index + 1}`}
                            inputMode="numeric"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.weightGrams`)}
                          />
                        </VariantField>
                        <VariantField label="Dài (cm) *" error={error?.lengthCm?.message}>
                          <input
                            aria-label={`Chiều dài biến thể ${index + 1}`}
                            inputMode="decimal"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.lengthCm`)}
                          />
                        </VariantField>
                        <VariantField label="Rộng (cm) *" error={error?.widthCm?.message}>
                          <input
                            aria-label={`Chiều rộng biến thể ${index + 1}`}
                            inputMode="decimal"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.widthCm`)}
                          />
                        </VariantField>
                        <VariantField label="Cao (cm) *" error={error?.heightCm?.message}>
                          <input
                            aria-label={`Chiều cao biến thể ${index + 1}`}
                            inputMode="decimal"
                            className={`${inputClass} bg-white`}
                            {...register(`variants.${index}.heightCm`)}
                          />
                        </VariantField>
                        <label className="flex items-center gap-3 self-end rounded-2xl bg-white px-4 py-3 text-sm sm:col-span-2 lg:col-span-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-violet"
                            {...register(`variants.${index}.fragile`)}
                          />
                          Hàng dễ vỡ, yêu cầu chống sốc
                        </label>
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="mt-4">
                <Btn icon={Plus} size="sm" onClick={() => variants.append(blankVariant())}>
                  Thêm biến thể
                </Btn>
              </div>
            </Section>

            <Section n={4} title="Thông số kỹ thuật lưới">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${uid}-polygon`} label="Số đỉnh lưới (polygon count)" error={errors.polygonCount?.message}>
                  <input
                    id={`${uid}-polygon`}
                    inputMode="numeric"
                    className={inputClass}
                    {...register('polygonCount')}
                  />
                </Field>
                <label className="flex items-center gap-3 self-end rounded-2xl bg-surface-low p-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-violet" {...register('manifold')} />
                  Lưới kín (manifold), đã kiểm tra slicer
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
            <p className="text-sm leading-relaxed text-ink-soft">
              Sản phẩm cần có ảnh thật và ít nhất một biến thể hoạt động. Khi tạo mới, FE sẽ lưu nháp, tải ảnh rồi mới
              gửi duyệt.
            </p>
            <div className="mt-4 rounded-2xl bg-surface-low p-3 text-xs leading-relaxed text-ink-soft">
              <strong className="text-ink">BE đang nhận đầy đủ:</strong> thông tin sản phẩm, specifications, ảnh, SKU,
              thuộc tính, giá, tồn kho, trạng thái, đóng gói, cân nặng và kích thước từng biến thể.
            </div>
            <div className="mt-4 grid gap-2">
              <Btn variant="primary" disabled={save.isPending} onClick={submit(true)}>
                {save.isPending
                  ? 'Đang xử lý…'
                  : product?.status === 'REJECTED'
                    ? 'Nộp lại thẩm định'
                    : 'Gửi duyệt sản phẩm'}
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
