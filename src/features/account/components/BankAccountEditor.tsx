import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { useToast } from '../../../shared/ui/toast'
import { useBankAccountMutations } from '../hooks/useAccount'
import { type BankAccountFormValues, bankAccountSchema } from '../schemas/account.schemas'
import type { BankAccount } from '../types/account.types'

/** Form ngân hàng dùng chung cho trang tài khoản và onboarding seller. */
export function BankAccountEditor({
  account,
  onDone,
  compact = false,
}: {
  account?: BankAccount
  onDone: () => void
  compact?: boolean
}) {
  const uid = useId()
  const { create, update } = useBankAccountMutations()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankCode: account?.bankCode ?? '',
      bankName: account?.bankName ?? '',
      accountHolder: account?.accountHolder ?? '',
      accountNumber: '',
    },
  })

  const submit = handleSubmit(async (input) => {
    try {
      if (account) await update.mutateAsync({ id: account.id, input })
      else await create.mutateAsync(input)
      toast(account ? 'Đã cập nhật — tài khoản chờ xác minh lại.' : 'Đã thêm tài khoản, chờ xác minh.')
      onDone()
    } catch (error) {
      setError('root', {
        message: error instanceof ApiClientError ? error.message : 'Không lưu được tài khoản.',
      })
    }
  })

  return (
    <form onSubmit={submit} noValidate className={`grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <Field id={`${uid}-code`} label="Mã ngân hàng *" error={errors.bankCode?.message} hint="Ví dụ: VCB, TCB, MB, ACB">
        <input id={`${uid}-code`} aria-invalid={!!errors.bankCode} className={`${inputClass} uppercase`} {...register('bankCode')} />
      </Field>
      <Field id={`${uid}-bank`} label="Tên ngân hàng *" error={errors.bankName?.message}>
        <input id={`${uid}-bank`} aria-invalid={!!errors.bankName} className={inputClass} {...register('bankName')} />
      </Field>
      <Field id={`${uid}-holder`} label="Chủ tài khoản *" error={errors.accountHolder?.message} hint="Viết hoa không dấu như trên tài khoản ngân hàng.">
        <input id={`${uid}-holder`} autoComplete="name" aria-invalid={!!errors.accountHolder} className={`${inputClass} uppercase`} {...register('accountHolder')} />
      </Field>
      <Field
        id={`${uid}-number`}
        label="Số tài khoản *"
        error={errors.accountNumber?.message}
        hint={account ? `Nhập lại số đầy đủ (hiện tại: ${account.accountNumberMasked}).` : 'Số tài khoản sẽ được che sau khi lưu.'}
      >
        <input id={`${uid}-number`} inputMode="numeric" autoComplete="off" aria-invalid={!!errors.accountNumber} className={`${inputClass} font-mono tracking-widest`} {...register('accountNumber')} />
      </Field>
      <div className={compact ? '' : 'sm:col-span-2'}><FormError message={errors.root?.message} /></div>
      <div className={`flex justify-end gap-2 ${compact ? '' : 'sm:col-span-2'}`}>
        <button type="button" onClick={onDone} className="rounded-full px-4 py-2.5 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low">Huỷ</button>
        <SubmitButton busy={create.isPending || update.isPending}>{account ? 'Lưu & gửi lại' : 'Thêm tài khoản'}</SubmitButton>
      </div>
    </form>
  )
}
