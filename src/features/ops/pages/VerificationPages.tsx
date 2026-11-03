import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, FileText, Phone, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { BankAccount } from '../../account/types/account.types'
import { type ApiEnvelope, http } from '../../../shared/api'
import { formatDateTime } from '../../../shared/lib/format'
import { Btn, CellTitle, KeyValues, MediaTile, Pill, Section } from '../../../shared/ui/kit'
import { inputClass } from '../../../shared/ui/form'
import { useToast } from '../../../shared/ui/toast'
import { OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'
import { adminUsersApi, generatePhoneCandidates } from '../services/ops.api'

type BankVerificationDetail = {
  bank: BankAccount & { verificationFingerprint: string }
  history: {
    actorId: number
    action: string
    reason: string
    evidence?: string | null
    createdAt: string
  }[]
}

/** MP 056 · Hàng Chờ Xác Thực Xưởng */
export function StorefrontQueuePage() {
  return (
    <OpsQueue
      domain="storefront"
      code="MP 056"
      eyebrow="Xác thực xưởng"
      title="Hàng Chờ Xác Thực Xưởng"
      accent="Năng Lực Chế Tác, Danh Tính & Ngân Hàng."
      api="GET /api/admin/seller-verifications"
      kpis={(r) => [
        { label: 'Chờ duyệt', value: r.filter((c) => c.status === 'PENDING').length, tone: 'orange' },
        { label: 'Cần bổ sung', value: r.filter((c) => c.status === 'NEEDS_INFO').length, tone: 'violet' },
        { label: 'Đã xác thực', value: r.filter((c) => c.status === 'VERIFIED').length, tone: 'green' },
        { label: 'Bị từ chối', value: r.filter((c) => c.status === 'REJECTED').length, tone: 'danger' },
      ]}
      columns={[
        {
          key: 'id',
          header: 'Mã & gian hàng',
          render: (c) => <CellTitle title={c.title} sub={`${c.id} · ${c.subtitle}`} to={`/ops/storefronts/${c.id}`} />,
        },
        {
          key: 'o',
          header: 'Chủ xưởng',
          render: (c) => <CellTitle title={val(c, 'owner')} sub={`${val(c, 'ownerId')} · ${val(c, 'phone')}`} />,
        },
        {
          key: 'b',
          header: 'Ngân hàng ký quỹ',
          render: (c) => (
            <div className="space-y-1">
              <p className="text-sm">{val(c, 'bank')}</p>
              <Pill
                tone={c.f.bankStatus === 'APPROVED' ? 'green' : c.f.bankStatus === 'REJECTED' ? 'danger' : 'orange'}
              >
                {val(c, 'bankStatus')}
              </Pill>
            </div>
          ),
        },
        {
          key: 'l',
          header: 'Hạ tầng & vị trí',
          render: (c) => <CellTitle title={val(c, 'equipment')} sub={val(c, 'location')} />,
        },
        statusColumn('storefront'),
        { key: 't', header: 'Gửi lúc', render: (c) => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
        {
          key: 'x',
          header: '',
          render: (c) => (
            <Btn to={`/ops/storefronts/${c.id}`} size="sm" variant={c.status === 'PENDING' ? 'primary' : 'soft'}>
              Thẩm định
            </Btn>
          ),
        },
      ]}
      rules={{
        title: 'Tiêu chí xác thực xưởng',
        items: [
          'Ảnh xưởng thực tế và mẫu in thử phải do chính xưởng chụp (không dùng ảnh internet).',
          'Tên chủ tài khoản ngân hàng trùng với chủ xưởng đã xác thực danh tính.',
          'Email và số điện thoại phải được xác thực trước khi phê duyệt.',
          'Mọi quyết định ghi lý do vào audit_logs.reason.',
        ],
      }}
    />
  )
}

/** MP 057 · Chi Tiết Thẩm Định Hồ Sơ Xưởng */
export function StorefrontReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="storefront"
      id={id}
      code="MP 057"
      eyebrow="Thẩm định hồ sơ xưởng"
      titlePrefix="Hồ sơ xưởng"
      backTo="/admin/storefronts"
      backLabel="Quay về hàng chờ"
      api="PATCH /api/admin/users/{id}/seller-verification"
      closed={(c) => c.status === 'VERIFIED' || c.status === 'REJECTED'}
      main={(c) => (
        <>
          <SellerIdentity userId={Number(c.id)} />
          <SellerPhoneVerification
            userId={Number(c.id)}
            phone={String(c.f.phoneNumber ?? '')}
            verified={Number(c.f.phoneVerified) === 1}
          />
          <BankVerificationEvidence bankAccountId={Number(c.f.bankAccountId) || 0} />
          <Section n={2} title="Thông tin gian hàng & cơ sở thực địa">
            <KeyValues
              cols={3}
              items={[
                { label: 'Chủ xưởng', value: val(c, 'owner') },
                { label: 'Mã người dùng', value: val(c, 'ownerId') },
                { label: 'Vị trí', value: val(c, 'location') },
                { label: 'Điều kiện', value: val(c, 'eligible') },
                { label: 'Công nghệ', value: val(c, 'tech') },
                { label: 'Email / SĐT', value: `${val(c, 'email')} · ${val(c, 'phone')}` },
              ]}
            />
          </Section>
          <Section n={3} title="Thư viện minh chứng đính kèm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(c.evidence ?? []).map((e) =>
                /^https?:/.test(e) ? (
                  <a
                    key={e}
                    href={e}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all rounded-2xl bg-surface-low p-3 text-sm text-violet underline sm:col-span-4"
                  >
                    {e}
                  </a>
                ) : (
                  <MediaTile key={e} label={e} icon={/pdf/i.test(e) ? FileText : Camera} tone="violet" />
                ),
              )}
            </div>
          </Section>
        </>
      )}
      decisions={[
        { value: 'approve', label: 'Phê duyệt người bán', status: 'VERIFIED' },
        { value: 'reject', label: 'Từ chối (ghi lý do để bổ sung)', status: 'REJECTED', tone: 'danger' },
      ]}
      minReason={1}
      checklist={[
        'Đã đối chiếu ảnh xưởng thực tế',
        'Tài khoản ngân hàng trong hồ sơ đã được xác minh',
        'Email & SĐT đã xác thực',
      ]}
    />
  )
}

function SellerIdentity({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['ops', 'seller-identity', userId],
    queryFn: async () => (await adminUsersApi.list()).find((account) => account.id === userId) ?? null,
    enabled: userId > 0,
    staleTime: 60_000,
  })

  return (
    <Section title="Danh tính tài khoản đăng ký bán hàng">
      {query.isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface-low" />
      ) : query.error ? (
        <p className="rounded-2xl bg-[#ffe8e5] p-3 text-sm text-danger">Không tải được thông tin tài khoản.</p>
      ) : query.data ? (
        <KeyValues
          cols={3}
          items={[
            { label: 'Họ và tên', value: query.data.fullName },
            { label: 'Email đăng ký', value: query.data.email },
            { label: 'Mã người dùng', value: `USR-${query.data.id}` },
            { label: 'Trạng thái tài khoản', value: query.data.status },
            { label: 'Xác thực email', value: query.data.emailVerified ? 'Đã xác thực' : 'Chưa xác thực' },
            { label: 'Vai trò hiện tại', value: query.data.grants.join(', ') || 'Chưa có vai trò' },
          ]}
        />
      ) : (
        <p className="rounded-2xl bg-[#fff7e8] p-3 text-sm text-[#85500d]">
          Không tìm thấy người dùng #{userId} trong danh sách tài khoản quản trị.
        </p>
      )}
    </Section>
  )
}

function SellerPhoneVerification({ userId, phone, verified }: { userId: number; phone: string; verified: boolean }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [phoneInput, setPhoneInput] = useState(phone?.trim() || '')
  const [evidence, setEvidence] = useState('Số điện thoại trong hồ sơ đăng ký người bán')
  const [reason, setReason] = useState('Đã đối chiếu số điện thoại với minh chứng seller cung cấp')

  useEffect(() => {
    if (phone && !phoneInput) {
      setPhoneInput(phone.trim())
    }
  }, [phone])

  const targetPhone = phoneInput.trim() || phone.trim()
  const candidates = useMemo(() => generatePhoneCandidates(phoneInput || phone || ''), [phoneInput, phone])

  const review = useMutation({
    mutationFn: (approved: boolean) => {
      if (!targetPhone) {
        throw new Error('Vui lòng nhập số điện thoại seller để xác minh.')
      }
      return adminUsersApi.reviewPhone(userId, {
        phone: targetPhone,
        approved,
        evidenceReference: evidence.trim(),
        reason: reason.trim(),
      })
    },
    onSuccess: async (_, approved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops'] }),
        queryClient.invalidateQueries({ queryKey: ['ops', 'seller-identity', userId] }),
        queryClient.invalidateQueries({ queryKey: ['ops', 'storefront', String(userId)] }),
      ])
      toast(approved ? 'Đã xác minh số điện thoại seller.' : 'Đã từ chối số điện thoại seller.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'Không thể duyệt số điện thoại.', 'error'),
  })

  const canReview = targetPhone.length >= 8 && evidence.trim().length >= 3 && reason.trim().length >= 3

  return (
    <Section
      title="Xác minh số điện thoại"
      subtitle="Bước 1 · Admin đối chiếu SĐT được seller gửi trong hồ sơ."
      aside={<Pill tone={verified ? 'green' : 'orange'}>{verified ? 'Đã xác thực' : 'Chờ xác thực'}</Pill>}
    >
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-low p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet">
          <Phone size={17} />
        </span>
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Số điện thoại đối chiếu với tài khoản
          </p>
          {!verified ? (
            <>
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Nhập chính xác SĐT của user (vd: 0999999999)"
                className="mt-1 font-mono text-base font-bold bg-white rounded-xl border border-line px-3 py-1.5 w-full max-w-sm outline-none focus:border-violet"
              />
              {candidates.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-ink-soft">Thử định dạng:</span>
                  {candidates.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPhoneInput(c)}
                      className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold transition ${
                        phoneInput === c
                          ? 'bg-violet text-white shadow-sm'
                          : 'bg-white border border-line text-ink hover:border-violet hover:text-violet'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-1 font-mono text-base font-bold text-[#0f7050]">
              {targetPhone || 'Đã xác thực'}
            </p>
          )}
        </div>
      </div>

      {!verified && (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Minh chứng đối chiếu *</span>
              <input value={evidence} onChange={(event) => setEvidence(event.target.value)} className={inputClass} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Lý do ghi audit *</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant="primary"
              icon={CheckCircle2}
              disabled={!canReview || review.isPending}
              onClick={() => review.mutate(true)}
            >
              {review.isPending ? 'Đang đối chiếu SĐT...' : 'Duyệt số điện thoại'}
            </Btn>
            <Btn
              variant="danger"
              icon={XCircle}
              disabled={!canReview || review.isPending}
              onClick={() => review.mutate(false)}
            >
              Từ chối
            </Btn>
          </div>
          {review.isError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-[#ffe8e5] p-3 text-xs text-danger">
              <p className="font-semibold">Lưu ý khi duyệt số điện thoại:</p>
              <p className="mt-1">
                Backend kiểm tra khớp chính xác với cột <code>users.phone</code> trong database. Hệ thống đã tự động thử các biến thể ({candidates.join(', ')}).
              </p>
              <p className="mt-1 text-ink-soft">
                Nếu vẫn gặp lỗi &quot;Phone changed&quot;, vui lòng kiểm tra xem tài khoản seller đã có số điện thoại trong hồ sơ cá nhân hay chưa, hoặc bấm chọn một trong các định dạng gợi ý ở trên.
              </p>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            Lưu ý: Hệ thống tự động thử các định dạng (+84, 84, 9 số) để khớp chính xác số trong database.
          </p>
        </>
      )}
    </Section>
  )
}
function BankVerificationEvidence({ bankAccountId }: { bankAccountId: number }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [evidence, setEvidence] = useState('Tài khoản ngân hàng trong hồ sơ đăng ký người bán')
  const [reason, setReason] = useState('Đã đối chiếu tên chủ tài khoản và thông tin ngân hàng')
  const query = useQuery({
    queryKey: ['ops', 'bank-verification', bankAccountId],
    queryFn: async () =>
      (await http.get<ApiEnvelope<BankVerificationDetail>>(`/api/admin/bank-accounts/${bankAccountId}/verification`))
        .data,
    enabled: bankAccountId > 0,
    staleTime: 30_000,
  })

  const review = useMutation({
    mutationFn: async (approved: boolean) => {
      if (!query.data) throw new Error('Chưa tải được thông tin ngân hàng.')
      return (
        await http.patch<
          ApiEnvelope<BankAccount>,
          { approved: boolean; reason: string; evidenceReference: string; accountFingerprint: string }
        >(`/api/admin/bank-accounts/${bankAccountId}/verification`, {
          approved,
          reason: reason.trim(),
          evidenceReference: evidence.trim(),
          accountFingerprint: query.data.bank.verificationFingerprint,
        })
      ).data
    },
    onSuccess: async (_, approved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops'] }),
        queryClient.invalidateQueries({ queryKey: ['ops', 'bank-verification', bankAccountId] }),
      ])
      toast(approved ? 'Đã xác minh tài khoản ngân hàng.' : 'Đã từ chối tài khoản ngân hàng.')
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'Không thể duyệt tài khoản ngân hàng.', 'error'),
  })

  if (!bankAccountId) {
    return (
      <Section title="Ngân hàng khai báo">
        <p className="rounded-2xl bg-[#ffe8e5] p-3 text-sm text-danger">Hồ sơ không chứa mã tài khoản ngân hàng.</p>
      </Section>
    )
  }

  return (
    <Section title="Tài khoản nhận doanh thu" subtitle="Bước 2 · Admin đối chiếu và duyệt tài khoản nhận doanh thu của xưởng.">
      {query.isLoading ? (
        <div className="h-36 animate-pulse rounded-2xl bg-surface-low" />
      ) : query.error ? (
        <p className="rounded-2xl bg-[#ffe8e5] p-3 text-sm text-danger">
          Không tải được chi tiết tài khoản ngân hàng #{bankAccountId}.
        </p>
      ) : query.data ? (
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg font-bold">{query.data.bank.bankName}</p>
              <Pill
                tone={
                  query.data.bank.verificationStatus === 'VERIFIED'
                    ? 'green'
                    : query.data.bank.verificationStatus === 'REJECTED'
                      ? 'danger'
                      : 'orange'
                }
              >
                {query.data.bank.verificationStatus}
              </Pill>
            </div>
            <p className="mt-1 font-mono text-xs text-ink-soft">
              {query.data.bank.bankCode} · ID #{query.data.bank.id}
            </p>
          </div>

          <dl className="grid gap-3 rounded-2xl bg-surface-low p-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Chủ tài khoản</dt>
              <dd className="mt-1 font-semibold">{query.data.bank.accountHolder}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Số tài khoản đã che</dt>
              <dd className="mt-1 font-mono text-base font-bold tracking-wider">
                {query.data.bank.accountNumberMasked}
              </dd>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={`rounded-full px-2 py-1 font-semibold ${query.data.bank.isActive ? 'bg-mint text-[#15783e]' : 'bg-[#ffe8e5] text-danger'}`}
              >
                {query.data.bank.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              </span>
              {query.data.bank.isDefault && (
                <span className="rounded-full bg-violet-soft px-2 py-1 font-semibold text-violet">Mặc định</span>
              )}
            </div>
          </dl>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Fingerprint đối chiếu</p>
            <code className="mt-1 block break-all rounded-xl bg-[#f8f7fc] p-2 text-[10px] text-ink-soft">
              {query.data.bank.verificationFingerprint}
            </code>
          </div>

          {query.data.bank.verificationStatus === 'PENDING' && (
            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Bước 2 · Quyết định tài khoản ngân hàng
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Minh chứng đối chiếu *</span>
                <input value={evidence} onChange={(event) => setEvidence(event.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Lý do ghi audit *</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="primary"
                  icon={CheckCircle2}
                  disabled={evidence.trim().length < 3 || reason.trim().length < 3 || review.isPending}
                  onClick={() => review.mutate(true)}
                >
                  Duyệt ngân hàng
                </Btn>
                <Btn
                  variant="danger"
                  icon={XCircle}
                  disabled={evidence.trim().length < 3 || reason.trim().length < 3 || review.isPending}
                  onClick={() => review.mutate(false)}
                >
                  Từ chối
                </Btn>
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-ink-soft">
            Backend chỉ trả số tài khoản đã che để bảo vệ dữ liệu tài chính. Admin được nhận diện từ JWT; không cần nhập
            mã quản trị viên.
          </p>

          {query.data.history.length > 0 && (
            <div className="border-t border-line pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Lịch sử duyệt ngân hàng</p>
              <div className="mt-3 space-y-3">
                {query.data.history.map((entry) => (
                  <div
                    key={`${entry.actorId}-${entry.createdAt}-${entry.action}`}
                    className="rounded-xl bg-surface-low p-3"
                  >
                    <p className="text-xs font-bold">{entry.action}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Admin #{entry.actorId} · {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="mt-1 text-xs">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Section>
  )
}
