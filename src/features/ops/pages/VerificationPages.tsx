import { Camera, FileText } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { Btn, CellTitle, KeyValues, MediaTile, Pill, Section } from '../../../shared/ui/kit'
import { BankVerifyPanel } from '../components/BankVerifyPanel'
import { OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'

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
        { key: 'id', header: 'Mã & gian hàng', render: (c) => <CellTitle title={c.title} sub={`${c.id} · ${c.subtitle}`} to={`/ops/storefronts/${c.id}`} /> },
        { key: 'o', header: 'Chủ xưởng', render: (c) => <CellTitle title={val(c, 'owner')} sub={`${val(c, 'ownerId')} · ${val(c, 'phone')}`} /> },
        { key: 'b', header: 'Ngân hàng ký quỹ', render: (c) => <div className="space-y-1"><p className="text-sm">{val(c, 'bank')}</p><Pill tone={c.f.bankStatus === 'APPROVED' ? 'green' : c.f.bankStatus === 'REJECTED' ? 'danger' : 'orange'}>{val(c, 'bankStatus')}</Pill></div> },
        { key: 'l', header: 'Hạ tầng & vị trí', render: (c) => <CellTitle title={val(c, 'equipment')} sub={val(c, 'location')} /> },
        statusColumn('storefront'),
        { key: 't', header: 'Gửi lúc', render: (c) => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/storefronts/${c.id}`} size="sm" variant={c.status === 'PENDING' ? 'primary' : 'soft'}>Thẩm định</Btn> },
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
                  <a key={e} href={e} target="_blank" rel="noreferrer" className="break-all rounded-2xl bg-surface-low p-3 text-sm text-violet underline sm:col-span-4">
                    {e}
                  </a>
                ) : (
                  <MediaTile key={e} label={e} icon={/pdf/i.test(e) ? FileText : Camera} tone="violet" />
                ),
              )}
            </div>
          </Section>
          <BankVerifyPanel />
        </>
      )}
      aside={(c) => (
        <Section title="Ngân hàng khai báo">
          <p className="font-semibold">{val(c, 'bank')}</p>
          <Pill tone={c.f.bankStatus === 'APPROVED' ? 'green' : 'orange'}>{val(c, 'bankStatus')}</Pill>
          <p className="mt-2 text-xs text-ink-soft">Điểm rủi ro: {c.risk ?? 0}/100</p>
        </Section>
      )}
      decisions={[
        { value: 'approve', label: 'Phê duyệt người bán', status: 'VERIFIED' },
        { value: 'reject', label: 'Từ chối (ghi lý do để bổ sung)', status: 'REJECTED', tone: 'danger' },
      ]}
      checklist={['Đã đối chiếu ảnh xưởng thực tế', 'Đã kiểm tra tên chủ tài khoản ngân hàng', 'Email & SĐT đã xác thực']}
    />
  )
}
