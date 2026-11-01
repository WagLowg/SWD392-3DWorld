import { AddressRegionFields } from '../../../shared/ui/AddressRegionFields'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { useCreateAddress } from '../hooks/useCheckout'
import { type AddressFormValues, addressSchema } from '../schemas/address.schema'
import type { Address } from '../types/catalog.types'

const field =
  'w-full rounded-2xl bg-surface-low px-4 py-3 text-sm outline-none ring-violet/40 focus:ring-2 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/50'

/** Form thêm địa chỉ nhận hàng (POST /api/users/me/addresses). */
export function AddressForm({ onCreated, onCancel }: { onCreated: (address: Address) => void; onCancel?: () => void }) {
  const uid = useId()
  const [regionValid, setRegionValid] = useState(false)
  const create = useCreateAddress()
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { recipientName: '', phone: '', addressLine: '', ward: '', district: '', city: '' },
  })

  const submit = handleSubmit(async (values) => {
    if (!regionValid) return setError('root', { message: 'Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.' })
    try {
      const address = await create.mutateAsync({
        recipientName: values.recipientName,
        addressLine: values.addressLine,
        phone: values.phone || undefined,
        ward: values.ward || undefined,
        district: values.district || undefined,
        // Backend có cả city và province — gửi cùng giá trị để tương thích.
        city: values.city || undefined,
        province: values.city || undefined,
      })
      onCreated(address)
    } catch (error) {
      setError('root', { message: error instanceof ApiClientError ? error.message : 'Không lưu được địa chỉ.' })
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-2"
    >
      <Field id={`${uid}-recipientName`} label="Người nhận" error={errors.recipientName?.message}>
        <input
          id={`${uid}-recipientName`}
          {...register('recipientName')}
          autoComplete="name"
          aria-invalid={!!errors.recipientName}
          className={field}
        />
      </Field>
      <Field id={`${uid}-phone`} label="Số điện thoại" error={errors.phone?.message}>
        <input
          id={`${uid}-phone`}
          {...register('phone')}
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          className={field}
        />
      </Field>
      <Field id={`${uid}-addressLine`} label="Địa chỉ chi tiết" error={errors.addressLine?.message} wide>
        <input
          id={`${uid}-addressLine`}
          {...register('addressLine')}
          autoComplete="street-address"
          placeholder="Số nhà, tên đường"
          aria-invalid={!!errors.addressLine}
          className={field}
        />
      </Field>
      <AddressRegionFields value={{ province: watch('city'), ward: watch('ward') }}
        onValidityChange={setRegionValid} onChange={(region) => {
          setValue('city', region.province, { shouldValidate: true, shouldDirty: true })
          setValue('ward', region.ward, { shouldValidate: true, shouldDirty: true })
          setValue('district', '', { shouldDirty: true })
        }} />
      <div className="flex items-end justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 font-label text-sm font-semibold"
          >
            Huỷ
          </button>
        )}
        <button
          type="submit"
          disabled={create.isPending || !regionValid}
          className="rounded-full bg-ink px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-violet disabled:opacity-50"
        >
          {create.isPending ? 'Đang lưu…' : 'Lưu địa chỉ'}
        </button>
      </div>
      {errors.root?.message && <p className="text-sm text-danger sm:col-span-2">{errors.root.message}</p>}
    </form>
  )
}

function Field({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string
  label: string
  error?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  )
}
