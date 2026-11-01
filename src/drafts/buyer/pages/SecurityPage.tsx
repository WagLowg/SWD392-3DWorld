import { KeyRound, LogOut, Monitor, Smartphone } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { formatDateTime } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, Hero, MockNotice, Pill, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { PasswordInput } from '../../../features/auth/components/PasswordInput'
import { useChangePassword, useRevokeSession, useSessions } from '../../../features/buyer/hooks/useBuyer'

/** MP 011 · Bảo Mật Tài Khoản */
export function SecurityPage() {
  const uid = useId()
  const sessions = useSessions()
  const revoke = useRevokeSession()
  const change = useChangePassword()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    document.title = 'Bảo mật tài khoản · 3DWorld'
  }, [])

  const error =
    pw.next && pw.next.length < 8 ? 'Mật khẩu mới tối thiểu 8 ký tự.' : pw.confirm && pw.confirm !== pw.next ? 'Mật khẩu nhập lại không khớp.' : ''
  const ready = pw.current && pw.next.length >= 8 && pw.next === pw.confirm

  return (
    <>
      <MockNotice api="POST /api/users/me/password, GET /api/users/me/sessions" />
      <Hero code="MP 011" eyebrow="Bảo mật tài khoản" title="Bảo Mật Tài Khoản" accent="Thiết Lập Mật Khẩu & Phiên." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Section title="Cập nhật mật khẩu" aside={<KeyRound size={18} className="text-violet" />}>
          <div className="space-y-4">
            <label htmlFor={`${uid}-c`} className="block">
              <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Mật khẩu hiện tại</span>
              <PasswordInput id={`${uid}-c`} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </label>
            <label htmlFor={`${uid}-n`} className="block">
              <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Mật khẩu mới</span>
              <PasswordInput id={`${uid}-n`} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </label>
            <label htmlFor={`${uid}-r`} className="block">
              <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Xác nhận mật khẩu mới</span>
              <input id={`${uid}-r`} type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={inputClass} autoComplete="new-password" />
            </label>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Btn
              variant="primary"
              disabled={!ready || change.isPending}
              onClick={() => change.mutate({ current: pw.current, next: pw.next }, { onSuccess: () => setPw({ current: '', next: '', confirm: '' }) })}
            >
              Cập nhật mật khẩu
            </Btn>
            <p className="text-xs text-ink-soft">
              Backend hiện chỉ có đặt lại mật khẩu qua email — dùng{' '}
              <a href="/login/forgot-password" className="text-violet underline">
                Quên mật khẩu
              </a>{' '}
              để đổi thật.
            </p>
          </div>
        </Section>

        <Section
          title="Phiên đăng nhập đang hoạt động"
          aside={
            <Btn size="sm" variant="danger" icon={LogOut} onClick={() => revoke.mutate(undefined)}>
              Đăng xuất thiết bị khác
            </Btn>
          }
        >
          <QueryState isLoading={sessions.isLoading} error={sessions.error}>
            <ul className="space-y-2">
              {(sessions.data ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-low p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet">
                    {/iphone|android/i.test(s.device) ? <Smartphone size={18} /> : <Monitor size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{s.device}</span>
                    <span className="text-xs text-ink-soft">
                      {s.location} · {s.ip} · {formatDateTime(s.lastActive)}
                    </span>
                  </span>
                  {s.current ? (
                    <Pill tone="green">Thiết bị này</Pill>
                  ) : (
                    <Btn size="sm" onClick={() => revoke.mutate(s.id)}>
                      Đăng xuất
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
          </QueryState>
          <p className="mt-4 rounded-2xl bg-violet-soft/40 p-3 text-xs text-violet">
            Token đăng nhập (JWT) có thời hạn; đổi mật khẩu sẽ thu hồi mọi phiên khác.
          </p>
        </Section>
      </div>
    </>
  )
}
