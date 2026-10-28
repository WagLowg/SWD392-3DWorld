import { useQuery } from '@tanstack/react-query'
import { Camera, FileText } from 'lucide-react'
import { useParams } from 'react-router-dom'
import type { BankAccount } from '../../account/types/account.types'
import { type ApiEnvelope, http } from '../../../shared/api'
import { formatDateTime } from '../../../shared/lib/format'
import { Btn, CellTitle, KeyValues, MediaTile, Pill, Section } from '../../../shared/ui/kit'
import { OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'
import { adminUsersApi } from '../services/ops.api'

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
      api="PATCH /api/admin/users/{id}/seller-verification"
      closed={(c) => c.status === 'VERIFIED' || c.status === 'REJECTED'}
      main={(c) => (
        <>
          <SellerIdentity userId={Number(c.id)} />
          <Section n={1} title="Thông tin gian hàng & cơ sở thực địa">
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
          <Section n={2} title="Thư viện minh chứng đính kèm">
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
      aside={(c) => <BankVerificationEvidence bankAccountId={Number(c.f.bankAccountId) || 0} />}
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

function BankVerificationEvidence({ bankAccountId }: { bankAccountId: number }) {
  const query = useQuery({
    queryKey: ['ops', 'bank-verification', bankAccountId],
    queryFn: async () =>
      (await http.get<ApiEnvelope<BankVerificationDetail>>(`/api/admin/bank-accounts/${bankAccountId}/verification`))
        .data,
    enabled: bankAccountId > 0,
    staleTime: 30_000,
  })

  if (!bankAccountId) {
    return (
      <Section title="Ngân hàng khai báo">
        <p className="rounded-2xl bg-[#ffe8e5] p-3 text-sm text-danger">Hồ sơ không chứa mã tài khoản ngân hàng.</p>
      </Section>
    )
  }

  return (
    <Section title="Tài khoản nhận doanh thu">
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
              <Pill tone={query.data.bank.verificationStatus === 'VERIFIED' ? 'green' : 'orange'}>
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
