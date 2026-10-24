import { zodResolver } from '@hookform/resolvers/zod'
import { XCircle } from 'lucide-react'
import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, SubmitButton } from '../../../shared/ui/form'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { type ResetValues, resetSchema, TOKEN_PATTERN } from '../schemas/auth.schemas'

/** MP 009 · Đặt lại mật khẩu từ link email (?email&token). */
export function ResetPasswordPage() {
  const uid = useId()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const validLink = !!email && TOKEN_PATTERN.test(token)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } })

  useEffect(() => {
    document.title = 'Đặt lại mật khẩu · 3DWorld'
  }, [])

  const submit = handleSubmit(async ({ password }) => {
    try {
      await authService.resetPassword({ email, token, newPassword: password })
      navigate(`/?reset=1&email=${encodeURIComponent(email)}`, { replace: true })
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không đặt lại được mật khẩu.' })
    }
  })

  return (
    <AuthLayout eyebrow="Bảo mật tài khoản" title="Đặt Lại Mật Khẩu" accent="Bảo Vệ Tài Khoản Của Bạn.">
      {!validLink ? (
        <div className="flex flex-col items-start gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ffdad6] text-danger">
            <XCircle size={30} />
          </span>
          <h2 className="font-display text-2xl font-bold">Liên kết không hợp lệ</h2>
          <p className="text-sm text-ink-soft">
            Liên kết đặt lại mật khẩu bị thiếu hoặc sai. Hãy yêu cầu liên kết mới.
          </p>
          <Link
            to="/forgot-password"
            className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
          >
            Yêu cầu liên kết mới
          </Link>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold">Tạo mật khẩu mới</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Cho tài khoản <strong className="text-ink">{email}</strong>. Sau khi đổi, các phiên đăng nhập cũ sẽ bị đăng
            xuất.
          </p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <Field
              id={`${uid}-pw`}
              label="Mật khẩu mới *"
              error={errors.password?.message}
              hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
            >
              <PasswordInput
                id={`${uid}-pw`}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
            </Field>
            <Field id={`${uid}-confirm`} label="Nhập lại mật khẩu mới *" error={errors.confirm?.message}>
              <PasswordInput
                id={`${uid}-confirm`}
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...register('confirm')}
              />
            </Field>
            <FormError message={errors.root?.message} />
            {errors.root && (
              <Link to="/forgot-password" className="block text-sm font-semibold text-violet hover:underline">
                Yêu cầu liên kết mới →
              </Link>
            )}
            <SubmitButton busy={isSubmitting} className="w-full">
              Lưu mật khẩu mới
            </SubmitButton>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
