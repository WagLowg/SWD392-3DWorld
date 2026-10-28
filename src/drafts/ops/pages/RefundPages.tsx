import { Camera, FileVideo } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, Countdown, KeyValues, MediaTile, MoneyRows, Section } from '../../../shared/ui/kit'
import { moneyColumn, OpsQueue, OpsReview, statusColumn, val } from '../../../features/ops/components/OpsScaffold'

/** MP 068 · Trọng Tài Khiếu Nại & Hoàn Tiền */
export function RefundArbitrationQueuePage() {
  return (
    <OpsQueue
      domain="refund"
      code="MP 068"
      eyebrow="Trọng tài hoàn tiền"
      title="Hàng Chờ Trọng Tài Khiếu Nại"
      accent="Phán Quyết Hoàn Tiền & Khoá Ký Quỹ."
      api="GET /api/admin/refund-cases"
      kpis={(r) => [
        { label: 'Chờ thẩm định', value: r.filter((c) => c.status === 'PENDING').length, tone: 'orange' },
        { label: 'Cần video', value: r.filter((c) => c.status === 'NEEDS_VIDEO').length, tone: 'violet' },
        { label: 'Đã chấp thuận', value: r.filter((c) => c.status === 'APPROVED').length, tone: 'green' },
        { label: 'Đang khoá ký quỹ', value: formatVnd(r.filter((c) => c.status !== 'APPROVED').reduce((s, c) => s + (c.amount ?? 0), 0)), tone: 'danger' },
      ]}
      columns={[
        { key: 'id', header: 'Mã giao dịch & đơn', render: (c) => <CellTitle title={c.id} sub={c.subtitle} to={`/ops/refunds/${c.id}`} /> },
        { key: 'p', header: 'Khiếu nại', render: (c) => <CellTitle title={c.title} sub={val(c, 'reason')} /> },
        { key: 'e', header: 'Bằng chứng', render: (c) => `${c.evidence?.length ?? 0} tệp` },
        moneyColumn('Số tiền hoàn (yêu cầu)'),
        statusColumn('refund'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/refunds/${c.id}`} size="sm" variant="primary">Thẩm định</Btn> },
      ]}
      rules={{
        title: '4 nguyên tắc trọng tài hoàn tiền',
        items: ['Yêu cầu phải nộp trong cửa sổ 72h kể từ received_at.', 'Số tiền hoàn không vượt quá tổng đã thanh toán (invariance cap).', 'Hàng vỡ do vận chuyển ưu tiên kích hoạt bảo hiểm hãng, không trừ xưởng.', 'Phán quyết ký số và ghi bất biến vào audit logs.'],
      }}
    />
  )
}

/** MP 069 · Chi Tiết Thẩm Định Tranh Chấp */
export function RefundArbitrationReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="refund"
      id={id}
      code="MP 069"
      eyebrow="Hồ sơ thẩm định trọng tài"
      titlePrefix="Trọng tài"
      api="POST /api/admin/refund-cases/{id}/decision"
      closed={(c) => c.status === 'APPROVED' || c.status === 'REJECTED'}
      main={(c) => (
        <>
          <Section n={1} title="Thông tin giao dịch & căn cứ hoàn tiền">
            <KeyValues cols={3} items={[{ label: 'Người mua', value: val(c, 'buyer') }, { label: 'Xưởng', value: val(c, 'store') }, { label: 'Lý do', value: val(c, 'reason') }]} />
          </Section>
          <Section n={2} title="Bằng chứng giám định từ người mua">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(c.evidence ?? []).map((e, i) => (
                <MediaTile key={e} label={e} icon={i === 0 ? FileVideo : Camera} tone={i === 0 ? 'violet' : 'orange'} />
              ))}
            </div>
          </Section>
          <Section n={3} title="Bối cảnh kiện hàng & phản hồi xưởng">
            <p className="rounded-2xl bg-surface-low p-4 text-sm italic">“{val(c, 'storeReply')}”</p>
            <p className="mt-2 text-xs text-ink-soft">Vận chuyển: {val(c, 'carrier')}</p>
          </Section>
        </>
      )}
      aside={(c) => (
        <>
          {c.deadline && <Countdown deadline={c.deadline} label="Thời gian còn lại của cửa sổ khiếu nại" />}
          <Section title="Dòng tiền ký quỹ">
            <MoneyRows
              rows={[
                { label: 'Đã thanh toán', value: val(c, 'paid') },
                { label: 'Đã hoàn trước', value: val(c, 'refundedBefore') === '—' ? formatVnd(0) : val(c, 'refunded') },
              ]}
              total={{ label: 'Trần hoàn hợp lệ', value: formatVnd(Number(c.f.paid) - Number(c.f.refunded ?? 0)) }}
            />
          </Section>
        </>
      )}
      decisions={[
        { value: 'approve', label: 'Chấp thuận hoàn tiền', status: 'APPROVED' },
        { value: 'video', label: 'Yêu cầu bổ sung video', status: 'NEEDS_VIDEO' },
        { value: 'reject', label: 'Bác bỏ khiếu nại', status: 'REJECTED', tone: 'danger' },
      ]}
      checklist={['Yêu cầu nộp trong cửa sổ 72h', 'Số tiền hoàn không vượt quá đã thanh toán', 'Đã xem phản hồi của xưởng']}
    />
  )
}

/** MP 084 · Sổ Cái Quản Trị Hoàn Tiền Toàn Sàn */
export function RefundLedgerPage() {
  return (
    <OpsQueue
      domain="refundLedger"
      code="MP 084"
      eyebrow="Sổ cái hoàn tiền"
      title="Sổ Cái Hoàn Tiền Toàn Sàn"
      accent="Lệnh Bồi Hoàn & Phục Hồi Dòng Tiền."
      api="GET /api/admin/refund-ledger"
      columns={[
        { key: 'id', header: 'Mã hoàn & đơn gốc', render: (c) => <CellTitle title={c.id} sub={`${c.title} · ${c.subtitle}`} to={`/ops/refund-ledger/${c.id}`} /> },
        { key: 'k', header: 'Khách & xưởng', render: (c) => <CellTitle title={val(c, 'customer')} sub={val(c, 'store')} /> },
        { key: 'r', header: 'Lý do & trọng tài', render: (c) => <span className="text-xs">{val(c, 'reason')}</span> },
        moneyColumn('Số tiền hoàn'),
        { key: 's', header: 'Nguồn / cổng', render: (c) => <CellTitle title={val(c, 'source')} sub={val(c, 'gateway')} /> },
        statusColumn('refundLedger'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/refund-ledger/${c.id}`} size="sm">Thực thi</Btn> },
      ]}
    />
  )
}

/** MP 085 · Chi Tiết Thực Thi Hoàn Tiền & Phục Hồi Số Dư */
export function RefundExecutionPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="refundLedger"
      id={id}
      code="MP 085"
      eyebrow="Thực thi lệnh hoàn"
      titlePrefix="Lệnh hoàn"
      api="POST /api/payments/{transactionId}/refund (đã có) + /api/admin/refund-ledger/{id}/execute"
      closed={(c) => c.status === 'SUCCEEDED' || c.status === 'REJECTED'}
      main={(c) => (
        <Section n={1} title="Đối chiếu hạn mức trần hoàn tiền">
          <KeyValues cols={3} items={[{ label: 'Đã thanh toán', value: val(c, 'paid') }, { label: 'Đã hoàn trước', value: val(c, 'refundedBefore') }, { label: 'Lệnh hiện tại', value: formatVnd(c.amount ?? 0) }, { label: 'Nguồn bồi hoàn', value: val(c, 'source') }, { label: 'Cổng', value: val(c, 'gateway') }, { label: 'Khách hàng', value: val(c, 'customer') }]} />
        </Section>
      )}
      aside={(c) => (
        <Section title="Cân đối sổ cái">
          <MoneyRows rows={[{ label: 'Trừ ký quỹ đơn', value: `-${formatVnd(c.amount ?? 0)}`, tone: 'minus' }, { label: 'Hoàn về khách', value: `+${formatVnd(c.amount ?? 0)}`, tone: 'plus' }]} />
        </Section>
      )}
      decisions={[
        { value: 'execute', label: 'Ký thực thi hoàn tiền', status: 'SUCCEEDED' },
        { value: 'bank', label: 'Chuyển chờ ngân hàng xử lý', status: 'PENDING_BANK' },
        { value: 'hold', label: 'Treo lệnh hoàn', status: 'HOLD', tone: 'danger' },
      ]}
      checklist={['Lệnh không vượt trần hoàn', 'Đã kiểm tra trạng thái UNKNOWN với cổng']}
    />
  )
}
