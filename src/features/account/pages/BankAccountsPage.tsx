import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Landmark, Lock, Pencil, Plus, ShieldCheck, ShieldX, Star, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { ConfirmButton } from '../../../shared/ui/ConfirmButton'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useToast } from '../../../shared/ui/toast'
import { useBankAccountMutations, useBankAccounts } from '../hooks/useAccount'
import { type BankAccountFormValues, bankAccountSchema } from '../schemas/account.schemas'
import type { BankAccount } from '../types/account.types'

const VERIFY: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  PENDING: { label: 'Chờ xác minh', tone: 'bg-peach text-orange-deep', icon: Clock },
  APPROVED: { label: 'Đã xác minh', tone: 'bg-mint text-[#0f5132]', icon: ShieldCheck },
  VERIFIED: { label: 'Đã xác minh', tone: 'bg-mint text-[#0f5132]', icon: ShieldCheck },
  REJECTED: { label: 'Bị từ chối', tone: 'bg-[#ffdad6] text-danger', icon: ShieldX },
}

/** MP 013 · Tài Khoản Ngân Hàng (nhận tiền hoàn / doanh thu). */
export function BankAccountsPage() {
  const list = useBankAccounts()
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  useEffect(() => {
    document.title = 'Tài khoản ngân hàng · 3DWorld'
  }, [])

  const accounts = [...(list.data ?? [])]
    .filter((a) => a.isActive !== false)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))

  return (
    <>
      <PageHeading
        eyebrow="Tài khoản người dùng"
        title="Tài Khoản Ngân Hàng"
        accent="Nhận Tiền Hoàn & Doanh Thu."
        description="Tài khoản mặc định dùng để nhận tiền hoàn hoặc chi trả doanh thu xưởng. Mỗi tài khoản cần quản trị viên xác minh trước khi sử dụng."
        aside={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 font-label text-sm font-semibold text-white hover:bg-violet"
          >
            Thêm tài khoản
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
              <Plus size={16} />
            </span>
          </button>
        }
      />

      <div className="mt-8 flex items-start gap-3 rounded-[1.75rem] bg-white/80 p-5 text-sm text-ink-soft shadow-soft">
        <Lock size={18} className="mt-0.5 shrink-0 text-violet" />
        <p>
          Số tài khoản được mã hoá và <strong className="text-ink">không bao giờ hiển thị đầy đủ</strong> sau khi lưu.
          Sửa thông tin tài khoản sẽ đưa trạng thái xác minh về <strong className="text-ink">Chờ xác minh</strong>.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {editing === 'new' && (
          <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
            <h2 className="mb-4 font-display text-xl font-bold">Thêm tài khoản ngân hàng</h2>
            <BankEditor onDone={() => setEditing(null)} />
          </section>
        )}
        <QueryState isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {!accounts.length && editing !== 'new' ? (
            <StatusBlock
              tone="empty"
              title="Chưa có tài khoản ngân hàng"
              body="Thêm tài khoản để nhận tiền hoàn hoặc doanh thu từ gian hàng."
              action={
                <button
                  type="button"
                  onClick={() => setEditing('new')}
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Thêm tài khoản
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accounts.map((a) =>
                editing === a.id ? (
                  <section key={a.id} className="rounded-[2rem] bg-white/95 p-6 shadow-soft md:col-span-2">
                    <h2 className="mb-4 font-display text-xl font-bold">Sửa tài khoản {a.bankName}</h2>
                    <BankEditor account={a} onDone={() => setEditing(null)} />
                  </section>
                ) : (
                  <BankCard key={a.id} account={a} onEdit={() => setEditing(a.id)} />
                ),
              )}
            </div>
          )}
        </QueryState>
      </div>
    </>
  )
}

function BankCard({ account: a, onEdit }: { account: BankAccount; onEdit: () => void }) {
  const { remove, setDefault } = useBankAccountMutations()
  const toast = useToast()
  const v = VERIFY[a.verificationStatus] ?? {
    label: a.verificationStatus,
    tone: 'bg-surface-high text-ink-soft',
    icon: Clock,
  }
  const VIcon = v.icon
  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast(ok)).catch((e) => toast(e instanceof ApiClientError ? e.message : 'Thao tác thất bại.', 'error'))

  return (
    <article
      className={`overflow-hidden rounded-[2rem] bg-white/95 shadow-soft ${a.isDefault ? 'ring-2 ring-orange' : ''}`}
    >
      <div className="bg-gradient-to-br from-ink to-[#3a2f7a] p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
              <Landmark size={20} />
            </span>
            <span>
              <span className="block font-display text-lg font-bold">{a.bankName}</span>
              <span className="block font-mono text-xs text-white/70">{a.bankCode}</span>
            </span>
          </span>
          {a.isDefault && (
            <span className="rounded-full bg-orange px-2.5 py-1 font-label text-[10px] font-semibold">MẶC ĐỊNH</span>
          )}
        </div>
        <p className="mt-6 font-mono text-2xl tracking-[0.2em]">{a.accountNumberMasked}</p>
        <p className="mt-2 font-label text-xs uppercase tracking-widest text-white/80">{a.accountHolder}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-label text-xs font-semibold ${v.tone}`}
        >
          <VIcon size={13} /> {v.label}
        </span>
        {!a.isDefault && (
          <button
            type="button"
            disabled={setDefault.isPending}
            onClick={() => run(setDefault.mutateAsync(a.id), 'Đã đặt làm tài khoản mặc định.')}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-2 font-label text-xs font-semibold hover:bg-surface-high"
          >
            <Star size={13} /> Mặc định
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
          confirmLabel="Ngừng sử dụng"
          onConfirm={() => run(remove.mutateAsync(a.id), 'Đã ngừng sử dụng tài khoản.')}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-label text-xs font-semibold text-ink-soft hover:text-danger"
        >
          <Trash2 size={13} /> Xoá
        </ConfirmButton>
      </div>
    </article>
  )
}

function BankEditor({ account, onDone }: { account?: BankAccount; onDone: () => void }) {
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
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không lưu được tài khoản.' })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id={`${uid}-code`} label="Mã ngân hàng *" error={errors.bankCode?.message} hint="Vd. VCB, TCB, MB, ACB">
        <input
          id={`${uid}-code`}
          aria-invalid={!!errors.bankCode}
          className={`${inputClass} uppercase`}
          {...register('bankCode')}
        />
      </Field>
      <Field id={`${uid}-bank`} label="Tên ngân hàng *" error={errors.bankName?.message}>
        <input id={`${uid}-bank`} aria-invalid={!!errors.bankName} className={inputClass} {...register('bankName')} />
      </Field>
      <Field
        id={`${uid}-holder`}
        label="Chủ tài khoản *"
        error={errors.accountHolder?.message}
        hint="Viết hoa không dấu như trên thẻ."
      >
        <input
          id={`${uid}-holder`}
          autoComplete="name"
          aria-invalid={!!errors.accountHolder}
          className={`${inputClass} uppercase`}
          {...register('accountHolder')}
        />
      </Field>
      <Field
        id={`${uid}-number`}
        label="Số tài khoản *"
        error={errors.accountNumber?.message}
        hint={
          account
            ? `Nhập lại số đầy đủ (hiện tại: ${account.accountNumberMasked}).`
            : 'Chỉ hiển thị dạng che sau khi lưu.'
        }
      >
        <input
          id={`${uid}-number`}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={!!errors.accountNumber}
          className={`${inputClass} font-mono tracking-widest`}
          {...register('accountNumber')}
        />
      </Field>
      <div className="sm:col-span-2">
        <FormError message={errors.root?.message} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-5 py-3 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low"
        >
          Huỷ
        </button>
        <SubmitButton busy={create.isPending || update.isPending}>
          {account ? 'Lưu & gửi xác minh lại' : 'Thêm tài khoản'}
        </SubmitButton>
      </div>
    </form>
  )
}
