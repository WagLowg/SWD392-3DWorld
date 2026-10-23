import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, MailCheck, XCircle } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '../../../services/auth/auth.service'
import { ApiClientError } from '../../../services/http'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { AuthLayout } from '../components/AuthLayout'
import { type EmailOnlyValues, emailOnlySchema, TOKEN_PATTERN } from '../schemas/auth.schemas'

type State = 'idle' | 'verifying' | 'success' | 'failed'

/**
 * MP 006 · Xác thực email.
 * - Có ?email&token (link trong email) → tự gọi POST /api/auth/verify-email.
 * - Không có token → màn "kiểm tra hộp thư" + gửi lại link.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const [state, setState] = useState<State>(token ? 'verifying' : 'idle')
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    document.title = 'Xác thực email · 3DWorld'
    if (!token || started.current) return
    started.current = true
    if (!TOKEN_PATTERN.test(token) || !email) {
      setState('failed')
      setError('Liên kết xác thực không hợp lệ.')
      return
    }
    authService
      .verifyEmail({ email, token })
      .then(() => setState('success'))
      .catch((e) => {
        setState('failed')
        setError(e instanceof ApiClientError ? e.message : 'Không xác thực được email.')
      })
  }, [email, token])

  return (
    <AuthLayout eyebrow="Xác thực email" title="Xác Thực Email" accent="Kích Hoạt Tài Khoản.">
      {state === 'verifying' && (
        <div className="flex items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-violet-soft border-t-violet" />
          <p className="font-semibold">Đang xác thực email {email}…</p>
        </div>
      )}
      {state === 'success' && (
        <Result
          icon={<CheckCircle2 size={30} />}
          tone="bg-mint text-[#0f5132]"
          title="Email đã được xác thực"
          body="Tài khoản của bạn đã kích hoạt đầy đủ. Đăng nhập để tiếp tục."
          action={
            <Link
              to={`/?verified=1&email=${encodeURIComponent(email)}`}
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
            >
              Đăng nhập
            </Link>
          }
        />
      )}
      {state === 'failed' && (
        <>
          <Result
            icon={<XCircle size={30} />}
            tone="bg-[#ffdad6] text-danger"
            title="Liên kết không còn hiệu lực"
            body={`${error} Liên kết chỉ dùng được một lần và có thời hạn — hãy yêu cầu liên kết mới.`}
          />
          <ResendForm defaultEmail={email} />
        </>
      )}
      {state === 'idle' && (
        <>
          <Result
            icon={<MailCheck size={30} />}
            tone="bg-violet-soft text-violet"
            title={params.get('sent') ? 'Kiểm tra hộp thư của bạn' : 'Xác thực địa chỉ email'}
            body={
              email
                ? `Chúng tôi đã gửi liên kết xác thực tới ${email}. Mở email và bấm vào liên kết để kích hoạt tài khoản.`
                : 'Nhập email để nhận liên kết xác thực mới.'
            }
          />
          <ResendForm defaultEmail={email} />
        </>
      )}
    </AuthLayout>
  )
}

function Result({
  icon,
  tone,
  title,
  body,
  action,
}: {
  icon: ReactNode
  tone: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <span className={`grid h-16 w-16 place-items-center rounded-full ${tone}`}>{icon}</span>
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
      {action}
    </div>
  )
}

function ResendForm({ defaultEmail }: { defaultEmail: string }) {
  const uid = useId()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: defaultEmail } })

  const submit = handleSubmit(async ({ email }) => {
    try {
      await authService.resendVerification(email)
      setSent(true)
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không gửi được email.' })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4 border-t border-line pt-6">
      <Field id={`${uid}-email`} label="Gửi lại liên kết xác thực tới" error={errors.email?.message}>
        <input id={`${uid}-email`} type="email" autoComplete="email" className={inputClass} {...register('email')} />
      </Field>
      <FormError message={errors.root?.message} />
      {sent && (
        <p className="rounded-2xl bg-mint px-4 py-3 text-sm text-[#0f5132]">
          Đã gửi liên kết mới. Liên kết cũ không còn dùng được.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubmitButton busy={isSubmitting}>Gửi lại email</SubmitButton>
        <Link to="/" className="font-label text-sm font-semibold hover:text-violet">
          Quay lại đăng nhập
        </Link>
      </div>
    </form>
  )
}
