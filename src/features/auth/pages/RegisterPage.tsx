import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { type RegisterValues, registerSchema } from '../schemas/auth.schemas'

/** MP 005 · Đăng ký tài khoản */
export function RegisterPage() {
  const uid = useId()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirm: '', agree: false },
  })

  useEffect(() => {
    document.title = 'Đăng ký · 3DWorld'
  }, [])

  const submit = handleSubmit(async (v) => {
    try {
      await authService.register({
        name: v.fullName,
        email: v.email,
        password: v.password,
        phone: v.phone || undefined,
      })
      // Backend gửi email xác thực ngay sau khi đăng ký
      navigate(`/verify-email?email=${encodeURIComponent(v.email)}&sent=1`)
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không tạo được tài khoản.' })
    }
  })

  return (
    <AuthLayout eyebrow="Tạo tài khoản mới" title="Gia Nhập 3DWorld" accent="Bắt Đầu Sáng Tạo.">
      <h2 className="font-display text-2xl font-bold">Đăng Ký Tài Khoản</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Một tài khoản dùng cho AI Studio, 3D Studio, Chợ Đồ Chơi và Đặt In 3D. Tài khoản mới có vai trò người mua.
      </p>
      <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field id={`${uid}-name`} label="Họ và tên *" error={errors.fullName?.message} className="sm:col-span-2">
          <input
            id={`${uid}-name`}
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            className={inputClass}
            {...register('fullName')}
          />
        </Field>
        <Field id={`${uid}-email`} label="Email *" error={errors.email?.message}>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={inputClass}
            {...register('email')}
          />
        </Field>
        <Field id={`${uid}-phone`} label="Số điện thoại" error={errors.phone?.message} hint="Dùng cho giao hàng & COD.">
          <input
            id={`${uid}-phone`}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            className={inputClass}
            {...register('phone')}
          />
        </Field>
        <Field id={`${uid}-pw`} label="Mật khẩu *" error={errors.password?.message} hint="8–72 ký tự.">
          <PasswordInput
            id={`${uid}-pw`}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Field id={`${uid}-confirm`} label="Nhập lại mật khẩu *" error={errors.confirm?.message}>
          <PasswordInput
            id={`${uid}-confirm`}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
        </Field>
        <label className="flex items-start gap-3 rounded-2xl bg-surface-low p-4 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet" {...register('agree')} />
          <span>
            Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của 3DWorld.
            {errors.agree && <span className="mt-1 block text-xs text-danger">{errors.agree.message}</span>}
          </span>
        </label>
        <div className="sm:col-span-2">
          <FormError message={errors.root?.message} />
        </div>
        <SubmitButton busy={isSubmitting} className="w-full sm:col-span-2">
          Tạo Tài Khoản
        </SubmitButton>
      </form>
      <p className="mt-6 rounded-2xl bg-surface-low px-4 py-3 text-sm text-ink-soft">
        Đã có tài khoản?{' '}
        <Link to={`/${location.search}`} className="font-semibold text-violet hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
