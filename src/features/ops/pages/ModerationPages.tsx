import { Camera, Fingerprint, Ruler } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, KeyValues, MediaTile, MoneyRows, Pill, Section } from '../../../shared/ui/kit'
import { categoryLabel, resolveMediaUrl } from '../../marketplace/lib/format'
import type { OpsCase } from '../data/ops.fixtures'
import { moneyColumn, OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'

const risk = (c: OpsCase) =>
  c.risk === undefined ? (
    <span className="text-xs text-ink-soft">—</span>
  ) : (
    <Pill tone={c.risk >= 70 ? 'danger' : c.risk >= 40 ? 'orange' : 'green'}>Rủi ro {c.risk}</Pill>
  )

/** MP 058 · Hàng Chờ Kiểm Duyệt Sản Phẩm */
export function ProductQueuePage() {
  return (
    <OpsQueue
      domain="product"
      code="MP 058"
      eyebrow="Kiểm duyệt sản phẩm"
      title="Hàng Chờ Kiểm Duyệt Sản Phẩm"
      accent="Phẩm Chất, Bản Quyền & Lưới In."
      api="GET /api/admin/products/pending"
      columns={[
        { key: 'p', header: 'Sản phẩm', render: (c) => <CellTitle title={c.title} sub={`prd_${c.id} · ${c.subtitle}`} to={`/ops/products/${c.id}`} /> },
        { key: 'c', header: 'Phân loại', render: (c) => `${categoryLabel(String(c.f.category))} · ${c.f.variants} SKU` },
        { key: 's', header: 'Gian hàng', render: (c) => val(c, 'store') },
        { key: 'pr', header: 'Giá từ', render: (c) => val(c, 'price') },
        statusColumn('product'),
        { key: 't', header: 'Gửi lúc', render: (c) => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/products/${c.id}`} size="sm" variant="primary">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Quy trình kiểm soát phẩm chất & bản quyền',
        items: ['Ảnh sản phẩm phải chụp mẫu in thực tế.', 'Lưới 3D phải kín (manifold) và đối soát mã băm chống in lậu.', 'Giá niêm yết và tồn kho từng biến thể phải hợp lệ.', 'Lý do thẩm định bắt buộc ghi moderation_reason.'],
      }}
    />
  )
}

/** MP 059 · Chi Tiết Thẩm Định Sản Phẩm */
export function ProductReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="product"
      id={id}
      code="MP 059"
      eyebrow="Thẩm định sản phẩm"
      titlePrefix="Sản phẩm"
      api="POST /api/admin/products/{id}/approve | reject"
      closed={(c) => c.status === 'APPROVED' || c.status === 'REJECTED'}
      main={(c) => (
        <>
          <Section n={1} title="Thư viện phương tiện sản phẩm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(c.evidence ?? []).map((e) =>
                /^(https?:|\/)/.test(e) ? (
                  <img key={e} src={resolveMediaUrl(e)} alt="" className="aspect-square w-full rounded-2xl object-cover" />
                ) : (
                  <MediaTile key={e} label={e} icon={/caliper|thước/i.test(e) ? Ruler : Camera} tone="violet" />
                ),
              )}
              {!c.evidence?.length && <p className="text-sm text-danger">Sản phẩm chưa có ảnh.</p>}
            </div>
          </Section>
          <Section n={2} title="Thông tin khai báo & biến thể">
            <KeyValues
              cols={3}
              items={[
                { label: 'Gian hàng', value: val(c, 'store') },
                { label: 'Danh mục', value: categoryLabel(String(c.f.category)) },
                { label: 'Giá từ', value: val(c, 'price') },
                { label: 'Số biến thể', value: val(c, 'variants') },
                { label: 'Vận chuyển', value: val(c, 'shippingClass') },
                { label: 'Bản sửa đổi', value: <code className="text-xs">{val(c, 'revision')}</code> },
              ]}
            />
            {c.f.description && <p className="mt-4 whitespace-pre-line text-sm text-ink-soft">{String(c.f.description)}</p>}
            {c.f.specs && c.f.specs !== '—' && (
              <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-low p-3 text-sm">{String(c.f.specs)}</p>
            )}
          </Section>
        </>
      )}
      decisions={[
        { value: 'approve', label: 'Duyệt mở bán', status: 'APPROVED' },
        { value: 'reject', label: 'Từ chối (ghi lý do để người bán sửa)', status: 'REJECTED', tone: 'danger' },
      ]}
      checklist={['Ảnh là mẫu in thực tế', 'Đã đối soát mã băm lưới', 'Giá & tồn kho hợp lệ']}
    />
  )
}

/** MP 060 · Hàng Chờ Báo Cáo Vi Phạm */
export function ReportQueuePage() {
  return (
    <OpsQueue
      domain="report"
      code="MP 060"
      eyebrow="Báo cáo vi phạm"
      title="Hàng Chờ Báo Cáo Vi Phạm"
      accent="Tác Quyền, Nội Dung Cấm & Chế Tài."
      api="GET /api/admin/reports"
      columns={[
        { key: 'id', header: 'Mã báo cáo & thời gian', render: (c) => <CellTitle title={`#${c.id}`} sub={formatDateTime(c.createdAt)} to={`/ops/reports/${c.id}`} /> },
        { key: 't', header: 'Đối tượng', render: (c) => <CellTitle title={c.title} sub={val(c, 'description')} /> },
        { key: 'r', header: 'Lý do & bằng chứng', render: (c) => <CellTitle title={val(c, 'reason')} sub={`${c.evidence?.length ?? 0} bằng chứng`} /> },
        statusColumn('report'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/reports/${c.id}`} size="sm" variant="primary">Thẩm định</Btn> },
      ]}
    />
  )
}

/** MP 061 · Chi Tiết Thẩm Định Báo Cáo & Chế Tài */
export function ReportReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="report"
      id={id}
      code="MP 061"
      eyebrow="Thẩm định báo cáo"
      titlePrefix="Báo cáo"
      api="PATCH /api/admin/reports/{id}"
      closed={(c) => c.status === 'ACTION_TAKEN' || c.status === 'DISMISSED'}
      main={(c) => (
        <>
          <Section n={1} title="Căn cứ khiếu nại">
            <KeyValues
              items={[
                {
                  label: 'Đối tượng',
                  value: c.f.productId ? (
                    <a href={`/marketplace/${c.f.productId}`} className="text-violet underline">
                      {val(c, 'target')}
                    </a>
                  ) : (
                    val(c, 'target')
                  ),
                },
                { label: 'Lý do', value: val(c, 'reason') },
              ]}
            />
            {c.f.description && <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{String(c.f.description)}</p>}
          </Section>
          <Section n={2} title="Giám định kỹ thuật & bằng chứng">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(c.evidence ?? []).map((e) => (
                <MediaTile key={e} label={e} icon={Fingerprint} tone="orange" />
              ))}
            </div>
          </Section>
        </>
      )}
      decisions={[
        { value: 'takedown', label: 'Xác nhận vi phạm (ẩn sản phẩm nếu có)', status: 'ACTION_TAKEN', tone: 'danger' },
        { value: 'dismiss', label: 'Bác bỏ (không vi phạm)', status: 'DISMISSED' },
      ]}
      checklist={['Đã xem bằng chứng đính kèm', 'Đã xem xét quyền tác giả gốc', 'Đơn hàng hiện có không bị thay đổi']}
    />
  )
}

/** MP 078 · Quản Trị Kiểm Duyệt Cấp Cao */
export function EscalationQueuePage() {
  return (
    <OpsQueue
      domain="escalation"
      code="MP 078"
      eyebrow="Kiểm duyệt cấp cao"
      title="Hàng Chờ Kiểm Duyệt Cấp Cao"
      accent="Vi Phạm Nghiêm Trọng & Chế Tài."
      api="GET /api/admin/escalations"
      columns={[
        { key: 'id', header: 'Hồ sơ & thực thể', render: (c) => <CellTitle title={c.title} sub={`${c.id} · ${val(c, 'entity')}`} to={`/ops/escalations/${c.id}`} /> },
        { key: 'l', header: 'Mức độ & nguồn', render: (c) => <CellTitle title={val(c, 'level')} sub={val(c, 'source')} /> },
        { key: 'k', header: 'Rủi ro', render: (c) => risk(c) },
        moneyColumn('Dòng tiền liên quan'),
        statusColumn('escalation'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/escalations/${c.id}`} size="sm" variant="primary">Thẩm định</Btn> },
      ]}
    />
  )
}

/** MP 079 · Chi Tiết Thẩm Định Vi Phạm & Chế Tài */
export function EscalationReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="escalation"
      id={id}
      code="MP 079"
      eyebrow="Thẩm định vi phạm cấp cao"
      titlePrefix="Hồ sơ vi phạm"
      api="POST /api/admin/escalations/{id}/sanction"
      closed={(c) => c.status === 'SANCTIONED' || c.status === 'DISMISSED'}
      minReason={50}
      main={(c) => (
        <>
          <Section n={1} title="Thực thể bị tố giác">
            <KeyValues cols={3} items={[{ label: 'Thực thể', value: val(c, 'entity') }, { label: 'Mức độ', value: val(c, 'level') }, { label: 'Nguồn leo thang', value: val(c, 'source') }]} />
          </Section>
          <Section n={2} title="Tiền sử vi phạm & bằng chứng">
            <KeyValues items={[{ label: 'Lịch sử', value: val(c, 'history') }, { label: 'Niêm yết đang mở', value: val(c, 'listings') }]} />
            <div className="mt-3 flex flex-wrap gap-2">
              {(c.evidence ?? []).map((e) => (
                <Pill key={e} tone="danger">
                  {e}
                </Pill>
              ))}
            </div>
          </Section>
        </>
      )}
      aside={(c) => (
        <Section title="Tác động dòng tiền & đơn">
          <MoneyRows rows={[{ label: 'Đơn đang chạy', value: String(c.f.orders) }]} total={{ label: 'Ký quỹ có thể đóng băng', value: formatVnd(c.amount ?? 0) }} />
        </Section>
      )}
      decisions={[
        { value: 'sanction', label: 'Thi hành chế tài (đình chỉ xưởng)', status: 'SANCTIONED', tone: 'danger' },
        { value: 'freeze', label: 'Đóng băng ví ký quỹ', status: 'FROZEN', tone: 'danger' },
        { value: 'dismiss', label: 'Bác bỏ khiếu nại', status: 'DISMISSED' },
      ]}
      checklist={['Đã xem toàn bộ tiền sử vi phạm', 'Đã thông báo cho bên bị xử lý', 'Đã đánh giá tác động tới đơn của người mua']}
    />
  )
}
