import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '../../../services/auth/auth.service'
import { ApiClientError } from '../../../services/http'
import { fetchMe } from '../../../shared/auth'
import { safeNext } from '../../../shared/modules'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { type LoginValues, loginSchema } from '../schemas/auth.schemas'

/** MP 007 · Đăng nhập */
export function LoginPage() {
  const uid = useId()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [checking, setChecking] = useState(true)
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.get('email') ?? '', password: '' },
  })
  const [unverified, setUnverified] = useState(false)

  useEffect(() => {
    document.title = 'Đăng nhập · 3DWorld'
    // Đã đăng nhập rồi thì quay lại luôn
    fetchMe().then((u) => (u ? location.replace(next) : setChecking(false)))
  }, [next])

  const submit = handleSubmit(async (values) => {
    setUnverified(false)
    try {
      await authService.login(values)
      location.replace(next)
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Không đăng nhập được. Vui lòng thử lại.'
      if (/verif|xác (thực|minh)/i.test(message)) setUnverified(true)
      setError('root', { message })
    }
  })

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FFF7EC]">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-violet-soft border-t-violet" />
      </div>
    )
  }

  return (
    <AuthLayout eyebrow="Xác thực bảo mật" title="Chào Mừng Trở Lại" accent="Không Gian Sáng Tạo.">
      <h2 className="font-display text-2xl font-bold">Đăng Nhập 3DWorld</h2>
      <p className="mt-1 text-sm text-ink-soft">Tiếp tục theo dõi đơn hàng, quản lý mô hình hoặc giỏ hàng của bạn.</p>
      {params.get('reset') === '1' && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm text-[#0f5132]">
          Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới.
        </p>
      )}
      {params.get('verified') === '1' && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm text-[#0f5132]">
          Email đã được xác thực. Mời bạn đăng nhập.
        </p>
      )}
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <Field id={`${uid}-email`} label="Địa chỉ Email *" error={errors.email?.message}>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={inputClass}
            {...register('email')}
          />
        </Field>
        <Field
          id={`${uid}-password`}
          label="Mật khẩu *"
          error={errors.password?.message}
          aside={
            <Link to="/forgot-password" className="font-label text-xs font-semibold text-violet hover:underline">
              Quên mật khẩu?
            </Link>
          }
        >
          <PasswordInput
            id={`${uid}-password`}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <FormError message={errors.root?.message} />
        {unverified && (
          <Link
            to={`/verify-email?email=${encodeURIComponent(getValues('email'))}`}
            className="block text-sm font-semibold text-violet hover:underline"
          >
            Gửi lại email xác thực →
          </Link>
        )}
        <SubmitButton busy={isSubmitting} className="w-full">
          Đăng Nhập Vào Hệ Thống
        </SubmitButton>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-low px-4 py-3 text-sm">
        <span className="text-ink-soft">
          Chưa có tài khoản?{' '}
          <Link to={`/register${location.search}`} className="font-semibold text-violet hover:underline">
            Đăng ký ngay
          </Link>
        </span>
        <a
          href="/marketplace/"
          className="inline-flex items-center gap-1 font-label text-xs font-semibold hover:text-violet"
        >
          <ArrowLeft size={13} /> Về Chợ Đồ Chơi
        </a>
      </div>
    </AuthLayout>
  )
}
