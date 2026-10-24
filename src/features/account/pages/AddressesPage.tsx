import { zodResolver } from '@hookform/resolvers/zod'
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { ConfirmButton } from '../../../shared/ui/ConfirmButton'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useToast } from '../../../shared/ui/toast'
import { useAddressList, useAddressMutations } from '../hooks/useAccount'
import { type AddressFormValues, addressSchema } from '../schemas/account.schemas'
import type { Address } from '../types/account.types'

/** MP 012 · Sổ Địa Chỉ Nhận Hàng */
export function AddressesPage() {
  const list = useAddressList()
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  useEffect(() => {
    document.title = 'Sổ địa chỉ · 3DWorld'
  }, [])

  const addresses = [...(list.data ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))

  return (
    <>
      <PageHeading
        eyebrow="Tài khoản người dùng"
        title="Sổ Địa Chỉ"
        accent="Nhận Hàng Vật Lý."
        description="Địa chỉ mặc định được chọn sẵn khi đặt hàng. Mỗi đơn con lưu một bản chụp địa chỉ riêng nên sửa địa chỉ không ảnh hưởng đơn đã đặt."
        aside={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 font-label text-sm font-semibold text-white hover:bg-violet"
          >
            Thêm địa chỉ
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
              <Plus size={16} />
            </span>
          </button>
        }
      />

      <div className="mt-8 space-y-4">
        {editing === 'new' && (
          <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
            <h2 className="mb-4 font-display text-xl font-bold">Thêm địa chỉ mới</h2>
            <AddressEditor onDone={() => setEditing(null)} />
          </section>
        )}
        <QueryState isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {!addresses.length && editing !== 'new' ? (
            <StatusBlock
              tone="empty"
              title="Chưa có địa chỉ nào"
              body="Thêm địa chỉ nhận hàng để đặt mua vật phẩm nhanh hơn. Địa chỉ đầu tiên sẽ tự động là mặc định."
              action={
                <button
                  type="button"
                  onClick={() => setEditing('new')}
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Thêm địa chỉ đầu tiên
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((a) =>
                editing === a.id ? (
                  <section key={a.id} className="rounded-[2rem] bg-white/95 p-6 shadow-soft md:col-span-2">
                    <h2 className="mb-4 font-display text-xl font-bold">Sửa địa chỉ</h2>
                    <AddressEditor address={a} onDone={() => setEditing(null)} />
                  </section>
                ) : (
                  <AddressCard key={a.id} address={a} onEdit={() => setEditing(a.id)} />
                ),
              )}
            </div>
          )}
        </QueryState>
      </div>
    </>
  )
}

function AddressCard({ address: a, onEdit }: { address: Address; onEdit: () => void }) {
  const { remove, setDefault } = useAddressMutations()
  const toast = useToast()
  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast(ok)).catch((e) => toast(e instanceof ApiClientError ? e.message : 'Thao tác thất bại.', 'error'))

  return (
    <article
      className={`flex flex-col rounded-[2rem] bg-white/95 p-6 shadow-soft ${a.isDefault ? 'ring-2 ring-orange' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-3">
          <span
            className={`grid h-11 w-11 place-items-center rounded-full ${a.isDefault ? 'bg-orange text-white' : 'bg-violet-soft text-violet'}`}
          >
            {a.isDefault ? <Home size={19} /> : <MapPin size={19} />}
          </span>
          <span>
            <span className="block font-display text-lg font-bold">{a.recipientName}</span>
            {a.phone && <span className="block text-sm text-ink-soft">{a.phone}</span>}
          </span>
        </span>
        {a.isDefault && (
          <span className="rounded-full bg-peach px-2.5 py-1 font-label text-[10px] font-semibold text-orange-deep">
            MẶC ĐỊNH
          </span>
        )}
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
        {[a.addressLine, a.city].filter(Boolean).join(', ')}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!a.isDefault && (
          <button
            type="button"
            disabled={setDefault.isPending}
            onClick={() => run(setDefault.mutateAsync(a.id), 'Đã đặt làm địa chỉ mặc định.')}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-2 font-label text-xs font-semibold hover:bg-surface-high"
          >
            <Star size={13} /> Đặt mặc định
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-2 font-label text-xs font-semibold hover:bg-surface-high"
        >
          <Pencil size={13} /> Sửa
        </button>
        <ConfirmButton
          busy={remove.isPending}
          confirmLabel="Xoá địa chỉ"
          onConfirm={() => run(remove.mutateAsync(a.id), 'Đã xoá địa chỉ.')}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-label text-xs font-semibold text-ink-soft hover:text-danger"
        >
          <Trash2 size={13} /> Xoá
        </ConfirmButton>
      </div>
    </article>
  )
}

function AddressEditor({ address, onDone }: { address?: Address; onDone: () => void }) {
  const uid = useId()
  const { create, update } = useAddressMutations()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipientName: address?.recipientName ?? '',
      phone: address?.phone ?? '',
      addressLine: address?.addressLine ?? '',
      city: address?.city ?? '',
    },
  })

  const submit = handleSubmit(async (v) => {
    const input = {
      recipientName: v.recipientName,
      addressLine: v.addressLine,
      phone: v.phone || undefined,
      city: v.city || undefined,
    }
    try {
      if (address) await update.mutateAsync({ id: address.id, input })
      else await create.mutateAsync(input)
      toast(address ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ.')
      onDone()
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không lưu được địa chỉ.' })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id={`${uid}-name`} label="Người nhận *" error={errors.recipientName?.message}>
        <input
          id={`${uid}-name`}
          autoComplete="name"
          aria-invalid={!!errors.recipientName}
          className={inputClass}
          {...register('recipientName')}
        />
      </Field>
      <Field id={`${uid}-phone`} label="Số điện thoại" error={errors.phone?.message}>
        <input
          id={`${uid}-phone`}
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          className={inputClass}
          {...register('phone')}
        />
      </Field>
      <Field
        id={`${uid}-line`}
        label="Địa chỉ chi tiết *"
        error={errors.addressLine?.message}
        className="sm:col-span-2"
      >
        <input
          id={`${uid}-line`}
          autoComplete="street-address"
          placeholder="Số nhà, đường, phường/xã, quận/huyện"
          aria-invalid={!!errors.addressLine}
          className={inputClass}
          {...register('addressLine')}
        />
      </Field>
      <Field id={`${uid}-city`} label="Tỉnh / Thành phố" error={errors.city?.message}>
        <input
          id={`${uid}-city`}
          autoComplete="address-level1"
          aria-invalid={!!errors.city}
          className={inputClass}
          {...register('city')}
        />
      </Field>
      <div className="flex items-end justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-5 py-3 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low"
        >
          Huỷ
        </button>
        <SubmitButton busy={create.isPending || update.isPending}>
          {address ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
        </SubmitButton>
      </div>
      <div className="sm:col-span-2">
        <FormError message={errors.root?.message} />
      </div>
    </form>
  )
}
