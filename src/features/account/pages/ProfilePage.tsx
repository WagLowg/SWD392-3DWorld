import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, History, Mail, Phone, ShieldCheck, ShoppingBag, Store, User } from 'lucide-react'
import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { useToast } from '../../../shared/ui/toast'
import { QueryState } from '../../../shared/ui/QueryState'
import { useProfile, useUpdateProfile } from '../hooks/useAccount'
import { type ProfileFormValues, profileSchema } from '../schemas/account.schemas'
import type { Profile } from '../types/account.types'

const CAPABILITY_LABELS: Record<string, string> = {
  PROFILE_READ: 'Xem hồ sơ',
  PROFILE_UPDATE: 'Cập nhật hồ sơ',
  ADDRESS_MANAGE: 'Quản lý địa chỉ',
  BANK_ACCOUNT_MANAGE: 'Quản lý tài khoản ngân hàng',
  STOREFRONT_MANAGE_OWN: 'Quản lý gian hàng',
  CATALOG_PUBLISH: 'Đăng sản phẩm',
  ORDER_PROCESS_EXISTING: 'Xử lý đơn hàng',
  USER_ROLE_MANAGE: 'Phân quyền người dùng',
  USER_STATUS_MANAGE: 'Khoá / mở người dùng',
  REPORT_REVIEW: 'Duyệt báo cáo vi phạm',
  PLATFORM_CONFIG_MANAGE: 'Cấu hình nền tảng',
}

const ROLE_LABELS: Record<string, { label: string; icon: typeof User }> = {
  CUSTOMER: { label: 'Người mua', icon: ShoppingBag },
  BUYER: { label: 'Người mua', icon: ShoppingBag },
  SELLER: { label: 'Người bán / Xưởng', icon: Store },
  ADMIN: { label: 'Quản trị viên', icon: ShieldCheck },
  STAFF: { label: 'Nhân viên', icon: ShieldCheck },
}

/** MP 010 · Hồ Sơ Cá Nhân */
export function ProfilePage() {
  const profile = useProfile()

  useEffect(() => {
    document.title = 'Hồ sơ cá nhân · 3DWorld'
  }, [])

  return (
    <>
      <PageHeading
        eyebrow="Tài khoản người dùng"
        title="Hồ Sơ Cá Nhân"
        accent="Quản Lý Danh Tính Sáng Tạo."
        description="Cập nhật thông tin nhận diện, trạng thái xác thực và quyền của tài khoản."
      />
      <div className="mt-8">
        <QueryState isLoading={profile.isLoading} error={profile.error} onRetry={() => profile.refetch()}>
          {profile.data && <ProfileContent profile={profile.data} />}
        </QueryState>
      </div>
    </>
  )
}

function ProfileContent({ profile }: { profile: Profile }) {
  const uid = useId()
  const update = useUpdateProfile()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: profile.fullName ?? '', phone: profile.phone ?? '' },
  })

  const submit = handleSubmit(async (v) => {
    try {
      const saved = await update.mutateAsync({ fullName: v.fullName, phone: v.phone || undefined })
      reset({ fullName: saved.fullName ?? '', phone: saved.phone ?? '' })
      toast('Đã lưu hồ sơ.')
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không lưu được hồ sơ.' })
    }
  })

  const roles = profile.roles?.length ? profile.roles : ['CUSTOMER']

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-[2rem] bg-white/95 p-6 text-center shadow-soft">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-orange to-violet p-1">
            <span className="grid h-full w-full place-items-center rounded-full bg-white font-display text-5xl font-bold text-violet">
              {profile.fullName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">{profile.fullName}</h2>
          <p className="mt-1 font-mono text-xs text-ink-soft">UID: usr_{profile.userId}</p>
          <p
            className={`mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-xs font-semibold ${
              profile.emailVerified ? 'bg-mint text-[#0f5132]' : 'bg-peach text-orange-deep'
            }`}
          >
            <BadgeCheck size={14} /> {profile.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
          </p>
          {!profile.emailVerified && (
            <a
              href={`/login/verify-email?email=${encodeURIComponent(profile.email)}`}
              className="mt-2 block font-label text-xs font-semibold text-violet hover:underline"
            >
              Gửi lại email xác thực →
            </a>
          )}
        </div>
        <div className="rounded-[2rem] bg-white/90 p-5 shadow-soft">
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">Quyền hiện có</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(profile.capabilities ?? []).map((c) => (
              <span
                key={c}
                className="rounded-full bg-violet-soft px-2.5 py-1 font-label text-[11px] font-semibold text-violet"
              >
                {CAPABILITY_LABELS[c] ?? c}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-low p-4">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-peach text-orange-deep">
              <User size={18} />
            </span>
            <span>
              <span className="block font-display text-lg font-bold">Chi Tiết Hồ Sơ</span>
              <span className="block text-xs text-ink-soft">Thông tin liên hệ và định tuyến đơn hàng vật lý</span>
            </span>
          </span>
        </div>

        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <Field
            id={`${uid}-name`}
            label="Họ và tên đầy đủ *"
            error={errors.fullName?.message}
            aside={<span className="font-label text-[11px] text-ink-soft">Hiển thị trên hoá đơn & đơn hàng</span>}
          >
            <input
              id={`${uid}-name`}
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              className={inputClass}
              {...register('fullName')}
            />
          </Field>
          <Field
            id={`${uid}-email`}
            label="Địa chỉ email đăng ký"
            hint="Email dùng để đăng nhập, không đổi được tại đây."
            aside={
              profile.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 font-label text-[11px] font-semibold text-teal">
                  <Mail size={11} /> Đã xác thực
                </span>
              ) : null
            }
          >
            <input id={`${uid}-email`} value={profile.email} readOnly disabled className={inputClass} />
          </Field>
          <Field
            id={`${uid}-phone`}
            label="Số điện thoại nhận hàng & COD"
            error={errors.phone?.message}
            hint={
              <span className="inline-flex items-center gap-1">
                <Phone size={11} /> Dùng để đối soát giao hàng COD và liên hệ khi giao.
              </span>
            }
          >
            <input
              id={`${uid}-phone`}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              className={inputClass}
              {...register('phone')}
            />
          </Field>

          <div>
            <p className="mb-2 font-label text-xs font-semibold text-ink-soft">Vai trò người dùng</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((r) => {
                const meta = ROLE_LABELS[r] ?? { label: r, icon: User }
                const Icon = meta.icon
                return (
                  <div key={r} className="flex items-center gap-3 rounded-2xl bg-surface-low p-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-violet">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{meta.label}</span>
                      <span className="block font-mono text-[11px] text-ink-soft">{r}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            <ApiNote className="mt-2">Vai trò do quản trị viên cấp, người dùng không tự đổi được.</ApiNote>
          </div>

          <FormError message={errors.root?.message} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton busy={update.isPending}>Lưu thay đổi hồ sơ</SubmitButton>
            <button
              type="button"
              disabled={!isDirty}
              onClick={() => reset()}
              className="rounded-full px-5 py-3 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low disabled:opacity-40"
            >
              Huỷ thao tác
            </button>
          </div>
        </form>

        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-surface-low px-4 py-3 text-xs text-ink-soft">
          <History size={14} /> Mọi thay đổi hồ sơ được ghi vào nhật ký kiểm toán của hệ thống.
        </p>
      </section>
    </div>
  )
}
