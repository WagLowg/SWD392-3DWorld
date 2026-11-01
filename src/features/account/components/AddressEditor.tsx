import { AddressRegionFields } from '../../../shared/ui/AddressRegionFields'
import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { useToast } from '../../../shared/ui/toast'
import { useAddressMutations } from '../hooks/useAccount'
import { type AddressFormValues, addressSchema } from '../schemas/account.schemas'
import type { Address } from '../types/account.types'

/** Form địa chỉ dùng chung cho Sổ địa chỉ và địa chỉ lấy hàng của seller. */
export function AddressEditor({
  address,
  onDone,
  forceDefault = false,
}: {
  address?: Address
  onDone: () => void
  forceDefault?: boolean
}) {
  const uid = useId()
  const [regionValid, setRegionValid] = useState(false)
  const { create, update, setDefault } = useAddressMutations()
  const toast = useToast()
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipientName: address?.recipientName ?? '',
      phone: address?.phone ?? '',
      addressLine: address?.addressLine ?? '',
      province: address?.province ?? address?.city ?? '',
      district: address?.district ?? '',
      ward: address?.ward ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    if (!regionValid) return setError('root', { message: 'Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.' })
    const input = {
      recipientName: values.recipientName,
      addressLine: values.addressLine,
      phone: values.phone,
      city: values.province,
      province: values.province,
      district: values.district || undefined,
      ward: values.ward,
    }
    try {
      const saved = address
        ? await update.mutateAsync({ id: address.id, input })
        : await create.mutateAsync(input)
      if (forceDefault && !saved.isDefault) await setDefault.mutateAsync(saved.id)
      toast(address ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ.')
      onDone()
    } catch (error) {
      setError('root', {
        message: error instanceof ApiClientError ? error.message : 'Không lưu được địa chỉ.',
      })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id={`${uid}-name`} label="Người liên hệ *" error={errors.recipientName?.message}>
        <input id={`${uid}-name`} autoComplete="name" aria-invalid={!!errors.recipientName} className={inputClass} {...register('recipientName')} />
      </Field>
      <Field id={`${uid}-phone`} label="Số điện thoại *" error={errors.phone?.message}>
        <input id={`${uid}-phone`} inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} className={inputClass} {...register('phone')} />
      </Field>
      <Field id={`${uid}-line`} label="Địa chỉ chi tiết *" error={errors.addressLine?.message} className="sm:col-span-2">
        <input
          id={`${uid}-line`}
          autoComplete="street-address"
          placeholder="Số nhà, tên đường, toà nhà/căn hộ"
          aria-invalid={!!errors.addressLine}
          className={inputClass}
          {...register('addressLine')}
        />
      </Field>
      <AddressRegionFields value={{ province: watch('province'), ward: watch('ward') }}
        onValidityChange={setRegionValid} onChange={(region) => {
          setValue('province', region.province, { shouldValidate: true, shouldDirty: true })
          setValue('ward', region.ward, { shouldValidate: true, shouldDirty: true })
          setValue('district', '', { shouldDirty: true })
        }} />
      <div className="flex items-end justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-full px-5 py-3 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low">
          Huỷ
        </button>
        <SubmitButton disabled={!regionValid} busy={create.isPending || update.isPending || setDefault.isPending}>
          {address ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
        </SubmitButton>
      </div>
      <div className="sm:col-span-2"><FormError message={errors.root?.message} /></div>
    </form>
  )
}
