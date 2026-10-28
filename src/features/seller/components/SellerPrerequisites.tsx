import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Landmark, Mail, Pencil, Phone, RefreshCw, Send } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { BankAccountEditor } from '../../account/components/BankAccountEditor'
import { accountKeys, useBankAccounts, useProfile, useUpdateProfile } from '../../account/hooks/useAccount'
import { authService } from '../../auth/services/auth.service'
import { inputClass } from '../../../shared/ui/form'
import { useToast } from '../../../shared/ui/toast'
import type { SellerApplication } from '../data/seller.fixtures'
import { sellerKeys } from '../hooks/useSeller'

const verifiedBank = (status: string | undefined) => /^(VERIFIED|APPROVED)$/i.test(status ?? '')

export function SellerPrerequisites({ application }: { application: SellerApplication }) {
  const profile = useProfile()
  const banks = useBankAccounts()
  const updateProfile = useUpdateProfile()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [editingBank, setEditingBank] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => setPhone(profile.data?.phone ?? ''), [profile.data?.phone])

  const resendEmail = useMutation({
    mutationFn: () => authService.resendVerification(profile.data?.email ?? ''),
    onSuccess: () => toast('Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.'),
    onError: (error) => toast(error instanceof Error ? error.message : 'Không gửi được email xác thực.', 'error'),
  })

  const accounts = useMemo(() => (banks.data ?? []).filter((account) => account.isActive !== false), [banks.data])
  const approved = accounts.find((account) => verifiedBank(account.verificationStatus))
  const currentBank = approved ?? accounts.find((account) => account.isDefault) ?? accounts[0]
  const bankRejected = currentBank?.verificationStatus?.toUpperCase() === 'REJECTED'
  const phoneChanged = phone.trim() !== (profile.data?.phone ?? '')

  const refresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.profile }),
        queryClient.invalidateQueries({ queryKey: accountKeys.banks }),
        queryClient.invalidateQueries({ queryKey: sellerKeys.application }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ])
      toast('Đã kiểm tra lại trạng thái xác thực.')
    } finally {
      setRefreshing(false)
    }
  }

  const savePhone = async () => {
    const value = phone.trim()
    if (!/^\+?[0-9]{8,15}$/.test(value)) return setPhoneError('Số điện thoại gồm 8–15 chữ số.')
    if (!profile.data) return setPhoneError('Không tải được hồ sơ người dùng.')
    setPhoneError('')
    try {
      await updateProfile.mutateAsync({ fullName: profile.data.fullName, phone: value })
      toast('Đã cập nhật số điện thoại vào hồ sơ. Số điện thoại đang chờ quản trị viên xác minh.')
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Không cập nhật được số điện thoại.')
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Hoàn tất thông tin xác thực tại đây</h3>
          <p className="mt-1 text-xs text-ink-soft">Thông tin được lưu trực tiếp vào hồ sơ tài khoản, không cần chuyển sang trang khác.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-full bg-surface-low px-4 py-2 font-label text-xs font-semibold hover:bg-surface-high disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Kiểm tra trạng thái
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PrerequisiteCard icon={Mail} title="Xác thực email" ok={application.emailVerified}>
          <p className="break-all text-sm font-medium">{profile.data?.email ?? 'Đang tải email…'}</p>
          {application.emailVerified ? <VerifiedLabel /> : (
            <>
              <p className="text-xs leading-5 text-ink-soft">Email đăng nhập không thể đổi tại đây. Gửi lại liên kết xác thực ngay trên màn hình này.</p>
              <button type="button" disabled={!profile.data?.email || resendEmail.isPending} onClick={() => resendEmail.mutate()} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white hover:bg-violet disabled:opacity-50">
                <Send size={13} /> {resendEmail.isPending ? 'Đang gửi…' : 'Gửi email xác thực'}
              </button>
            </>
          )}
        </PrerequisiteCard>

        <PrerequisiteCard icon={Phone} title="Xác thực số điện thoại" ok={application.phoneVerified}>
          {application.phoneVerified ? (
            <><p className="text-sm font-medium">{profile.data?.phone}</p><VerifiedLabel /></>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Số điện thoại *</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="0901234567" className={inputClass} />
              </label>
              {phoneError && <p className="text-xs text-danger">{phoneError}</p>}
              <p className="text-xs leading-5 text-ink-soft">Sau khi lưu, số điện thoại chờ Admin xác minh. Backend hiện chưa có luồng OTP/SMS cho người dùng.</p>
              <button type="button" disabled={!phone.trim() || !phoneChanged || updateProfile.isPending} onClick={savePhone} className="rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white hover:bg-violet disabled:opacity-40">
                {updateProfile.isPending ? 'Đang lưu…' : profile.data?.phone ? 'Cập nhật số điện thoại' : 'Lưu vào hồ sơ'}
              </button>
              {!!profile.data?.phone && !phoneChanged && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-deep"><Clock3 size={13} /> Đã lưu · chờ xác minh</span>}
            </>
          )}
        </PrerequisiteCard>

        <PrerequisiteCard icon={Landmark} title="Tài khoản ngân hàng" ok={!!approved}>
          {approved ? (
            <><p className="text-sm font-semibold">{approved.bankName}</p><p className="font-mono text-sm text-ink-soft">{approved.accountNumberMasked}</p><VerifiedLabel /></>
          ) : currentBank && !editingBank && !bankRejected ? (
            <>
              <p className="text-sm font-semibold">{currentBank.bankName}</p>
              <p className="font-mono text-sm text-ink-soft">{currentBank.accountNumberMasked}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-deep"><Clock3 size={13} /> Đã lưu · chờ Admin xác minh</span>
              <button type="button" onClick={() => setEditingBank(true)} className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface-high px-3 py-2 font-label text-xs font-semibold"><Pencil size={13} /> Sửa thông tin</button>
            </>
          ) : (
            <>
              {bankRejected && <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-xs text-danger">Tài khoản đã bị từ chối. Vui lòng nhập lại thông tin chính xác.</p>}
              <BankAccountEditor account={currentBank} compact onDone={() => setEditingBank(false)} />
            </>
          )}
          {banks.error && <p className="text-xs text-danger">Không tải được danh sách tài khoản ngân hàng.</p>}
        </PrerequisiteCard>
      </div>
    </div>
  )
}

function PrerequisiteCard({ icon: Icon, title, ok, children }: { icon: typeof Mail; title: string; ok: boolean; children: ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-2xl border p-4 ${ok ? 'border-mint bg-mint/25' : 'border-orange/20 bg-surface-low'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ok ? 'bg-mint text-[#0f5132]' : 'bg-peach text-orange-deep'}`}>{ok ? <CheckCircle2 size={17} /> : <Icon size={17} />}</span>
        <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-ink-soft">{ok ? 'Đã xác thực' : 'Cần hoàn tất'}</p></div>
      </div>
      {children}
    </section>
  )
}

function VerifiedLabel() {
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f7050]"><CheckCircle2 size={13} /> Đã xác thực</span>
}
