import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { ApiClientError } from '../../../shared/api'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { AuthLayout } from '../components/AuthLayout'
import { type EmailOnlyValues, emailOnlySchema } from '../schemas/auth.schemas'

/** MP 008 · Quên mật khẩu (không tiết lộ email có tồn tại hay không). */
export function ForgotPasswordPage() {
  const uid = useId()
  const [sentTo, setSentTo] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })

  useEffect(() => {
    document.title = 'Quên mật khẩu · 3DWorld'
  }, [])

  const submit = handleSubmit(async ({ email }) => {
    try {
      await authService.forgotPassword(email)
      setSentTo(email)
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không gửi được yêu cầu.' })
    }
  })

  return (
    <AuthLayout eyebrow="Khôi phục truy cập" title="Quên Mật Khẩu?" accent="Lấy Lại Quyền Truy Cập.">
      {sentTo ? (
        <div className="flex flex-col items-start gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-violet-soft text-violet">
            <MailCheck size={30} />
          </span>
          <h2 className="font-display text-2xl font-bold">Kiểm tra email của bạn</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Nếu <strong className="text-ink">{sentTo}</strong> đã đăng ký 3DWorld, bạn sẽ nhận được liên kết đặt lại mật
            khẩu trong vài phút. Liên kết chỉ dùng một lần và có thời hạn.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
            >
              Quay lại đăng nhập
            </Link>
            <button
              type="button"
              onClick={() => setSentTo('')}
              className="rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold"
            >
              Dùng email khác
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold">Đặt lại mật khẩu</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <Field id={`${uid}-email`} label="Email đăng ký *" error={errors.email?.message}>
              <input
                id={`${uid}-email`}
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                className={inputClass}
                {...register('email')}
              />
            </Field>
            <FormError message={errors.root?.message} />
            <SubmitButton busy={isSubmitting} className="w-full">
              Gửi liên kết đặt lại
            </SubmitButton>
          </form>
          <p className="mt-6 text-sm text-ink-soft">
            Nhớ ra mật khẩu?{' '}
            <Link to="/" className="font-semibold text-violet hover:underline">
              Đăng nhập
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
