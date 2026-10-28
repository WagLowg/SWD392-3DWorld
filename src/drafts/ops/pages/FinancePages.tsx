import { FileJson, MessageSquare } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, KeyValues, MediaTile, MoneyRows, Pill, Section } from '../../../shared/ui/kit'
import { moneyColumn, OpsQueue, OpsReview, statusColumn, val } from '../../../features/ops/components/OpsScaffold'

/** MP 070 · Quản Trị Tài Chính & Hàng Chờ Đối Soát */
export function FinanceQueuePage() {
  return (
    <OpsQueue
      domain="finance"
      code="MP 070"
      eyebrow="Tài chính toàn sàn"
      title="Hàng Chờ Đối Soát Giao Dịch"
      accent="Lệch Số Dư & Trạng Thái Bất Định (UNKNOWN)."
      api="GET /api/admin/reconciliation"
      columns={[
        { key: 'id', header: 'Mã giao dịch & idempotency', render: (c) => <CellTitle title={c.id} sub={c.subtitle} to={`/ops/finance/${c.id}`} /> },
        { key: 'o', header: 'Nghiệp vụ', render: (c) => <CellTitle title={c.title} sub={val(c, 'order')} /> },
        { key: 'g', header: 'Cổng & tham chiếu', render: (c) => <CellTitle title={val(c, 'gateway')} sub={val(c, 'ref')} /> },
        { key: 'a', header: 'Kê khai / thực thu', render: (c) => <CellTitle title={val(c, 'declared')} sub={`Thực thu ${val(c, 'received')}`} /> },
        { key: 'c', header: 'Nguyên nhân treo', render: (c) => <span className="text-xs text-danger">{val(c, 'cause')}</span> },
        statusColumn('finance'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/finance/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Khung đối soát nghiệp vụ tài chính',
        items: ['UNKNOWN không được tự đánh dấu thành công hay thất bại — phải truy vấn cổng.', 'Mọi điều chỉnh dùng bút toán bù trừ, không sửa bút toán gốc.', 'Khoá idempotency đảm bảo một nghiệp vụ không ghi hai lần.', 'Bằng chứng ngân hàng phải gắn evidence_key trước khi ký.'],
      }}
    />
  )
}

function financeReview(code: string, eyebrow: string, domain: 'finance' | 'transaction', api: string) {
  // biome-ignore lint/correctness/noComponentHookFactories: factory runs once at module initialization for route components
  return function FinanceReview() {
    const id = useParams().caseId ?? ''
    return (
      <OpsReview
        domain={domain}
        id={id}
        code={code}
        eyebrow={eyebrow}
        titlePrefix="Giao dịch"
        api={api}
        closed={(c) => c.status === 'RECONCILED' || c.status === 'MATCHED'}
        main={(c) => (
          <>
            <Section n={1} title="Giao dịch gốc & nhóm thanh toán">
              <KeyValues
                cols={3}
                items={[
                  { label: 'Cổng', value: val(c, 'gateway') },
                  { label: 'Tham chiếu', value: val(c, 'ref') },
                  { label: 'Số lần thử', value: val(c, 'attempts') },
                  { label: 'Kê khai', value: domain === 'finance' ? val(c, 'declared') : val(c, 'expected') },
                  { label: 'Thực thu', value: val(c, 'received') },
                  { label: domain === 'finance' ? 'Nguyên nhân' : 'Mục đích', value: domain === 'finance' ? val(c, 'cause') : val(c, 'purpose') },
                ]}
              />
            </Section>
            <Section n={2} title="Bằng chứng đối chiếu ngân hàng">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(c.evidence ?? []).map((e) => (
                  <MediaTile key={e} label={e} icon={FileJson} tone="violet" />
                ))}
                <MediaTile label="Webhook raw log (chờ API)" icon={FileJson} tone="neutral" />
              </div>
            </Section>
          </>
        )}
        aside={(c) => {
          const exp = Number(c.f.declared ?? c.f.expected)
          const got = Number(c.f.received)
          return (
            <Section title="Tổng quan dòng tiền">
              <MoneyRows rows={[{ label: 'Kê khai', value: formatVnd(exp) }, { label: 'Thực thu', value: formatVnd(got) }]} total={{ label: 'Chênh lệch', value: formatVnd(exp - got) }} />
            </Section>
          )
        }}
        decisions={[
          { value: 'reconcile', label: domain === 'finance' ? 'Duyệt đối soát & quyết toán' : 'Xác thực đối soát & nhập quỹ bù trừ', status: domain === 'finance' ? 'RECONCILED' : 'MATCHED' },
          { value: 'hold', label: 'Treo giao dịch chờ đối chất', status: 'HOLD', tone: 'danger' },
        ]}
        checklist={['Đã truy vấn trạng thái tại cổng thanh toán', 'Đã gắn bằng chứng sao kê (evidence_key)']}
      />
    )
  }
}

/** MP 071 · Chi Tiết Thẩm Định Quyết Toán Giao Dịch */
export const FinanceReviewPage = financeReview('MP 071', 'Thẩm định quyết toán giao dịch', 'finance', 'POST /api/admin/reconciliation/{id}/decision')
/** MP 081 · Chi Tiết Đối Soát Nghĩa Vụ Thanh Toán */
export const TransactionReviewPage = financeReview('MP 081', 'Đối soát nghĩa vụ thanh toán', 'transaction', 'POST /api/admin/transactions/{id}/reconcile')

/** MP 080 · Quản Trị Giao Dịch Toàn Sàn */
export function TransactionsPage() {
  return (
    <OpsQueue
      domain="transaction"
      code="MP 080"
      eyebrow="Giao dịch tài chính"
      title="Quản Trị Giao Dịch Toàn Sàn"
      accent="Lịch Sử Thanh Toán & Đối Soát Sổ Cái."
      api="GET /api/admin/transactions"
      columns={[
        { key: 'id', header: 'Mã giao dịch & idempotency', render: (c) => <CellTitle title={c.id} sub={c.subtitle} to={`/ops/transactions/${c.id}`} /> },
        { key: 'p', header: 'Mục đích', render: (c) => <CellTitle title={c.title} sub={val(c, 'purpose')} /> },
        { key: 'g', header: 'Cổng & ngân hàng', render: (c) => <CellTitle title={val(c, 'gateway')} sub={val(c, 'bank')} /> },
        moneyColumn(),
        { key: 'a', header: 'Lần thử', render: (c) => val(c, 'attempts') },
        statusColumn('transaction'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/transactions/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
    />
  )
}

/** MP 072 · Chi Tiết Nhật Ký Thẩm Tra & Bằng Chứng */
export function InquiryPage() {
  const id = useParams().caseId ?? 'INQ-88192-DISP'
  return (
    <OpsReview
      domain="inquiry"
      id={id}
      code="MP 072"
      eyebrow="Thẩm tra đa bên"
      titlePrefix="Hồ sơ thẩm tra"
      api="POST /api/admin/inquiries/{id}/statements"
      closed={(c) => c.status === 'CLOSED'}
      main={(c) => (
        <>
          <Section n={1} title="Thực thể được thẩm tra">
            <KeyValues cols={4} items={[{ label: 'Thực thể', value: val(c, 'entity') }, { label: 'Người mua', value: val(c, 'buyer') }, { label: 'Xưởng', value: val(c, 'store') }, { label: 'Hãng', value: val(c, 'carrier') }]} />
          </Section>
          <Section n={2} title="Dòng bằng chứng & lời khai đa bên">
            <ul className="space-y-2">
              {(c.evidence ?? []).map((e, i) => (
                <li key={e} className="flex items-center gap-3 rounded-2xl bg-surface-low p-3 text-sm">
                  <MessageSquare size={16} className="text-violet" /> {e}
                  <Pill tone={i === 0 ? 'orange' : i === 1 ? 'violet' : 'teal'}>{['Người mua', 'Xưởng', 'Hãng vận chuyển'][i] ?? 'Khác'}</Pill>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
      decisions={[
        { value: 'request', label: 'Yêu cầu bổ sung bằng chứng', status: 'AWAITING_EVIDENCE' },
        { value: 'lock', label: 'Tạm khoá đơn hàng', status: 'LOCKED', tone: 'danger' },
        { value: 'close', label: 'Ghi nhận & kết luận thẩm tra', status: 'CLOSED' },
      ]}
      checklist={['Đã ghi nhận lời khai các bên', 'Đã khoá băm nội dung vào audit_logs']}
    />
  )
}

/** MP 086 · Quản Trị Chi Trả Ví Xưởng */
export function PayoutsAdminPage() {
  return (
    <OpsQueue
      domain="payout"
      code="MP 086"
      eyebrow="Chi trả doanh thu xưởng"
      title="Quản Trị Chi Trả Ví Xưởng"
      accent="Lệnh Rút Quỹ, Khoá Tạm Giữ & Đối Soát Ngân Hàng."
      api="GET /api/admin/payouts"
      columns={[
        { key: 'id', header: 'Mã GD / ví xưởng', render: (c) => <CellTitle title={c.id} sub={c.subtitle} to={`/ops/payouts/${c.id}`} /> },
        { key: 's', header: 'Xưởng thụ hưởng', render: (c) => c.title },
        moneyColumn('Số tiền yêu cầu'),
        { key: 'b', header: 'Tài khoản & cổng chi', render: (c) => <CellTitle title={val(c, 'bank')} sub={val(c, 'gateway')} /> },
        { key: 'h', header: 'Khoá tạm giữ', render: (c) => val(c, 'held') },
        statusColumn('payout'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/payouts/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Quy chuẩn rút quỹ ví xưởng',
        items: ['Số tiền rút được khoá ở held_balance ngay khi tạo lệnh.', 'Chỉ chi trả về tài khoản ngân hàng đã được duyệt.', 'UNKNOWN phải tra soát với ngân hàng trước khi chi lại.', 'Lệnh từ chối hoàn held_balance về khả dụng bằng bút toán bù trừ.'],
      }}
    />
  )
}

/** MP 087 · Chi Tiết Thẩm Định Chi Trả Ví Xưởng */
export function PayoutAdminReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="payout"
      id={id}
      code="MP 087"
      eyebrow="Thẩm định chi trả"
      titlePrefix="Lệnh chi trả"
      api="POST /api/admin/payouts/{id}/decision"
      closed={(c) => c.status === 'COMPLETED' || c.status === 'REJECTED'}
      main={(c) => (
        <Section n={1} title="Đối chiếu số dư ví & lệnh rút">
          <KeyValues cols={3} items={[{ label: 'Khả dụng', value: val(c, 'available') }, { label: 'Đang tạm giữ', value: val(c, 'held') }, { label: 'Lệnh rút', value: formatVnd(c.amount ?? 0) }, { label: 'Tài khoản', value: val(c, 'bank') }, { label: 'Xác minh TK', value: val(c, 'bankStatus') }, { label: 'Cổng', value: val(c, 'gateway') }]} />
        </Section>
      )}
      aside={(c) => (
        <Section title="Tác động dòng tiền">
          <MoneyRows rows={[{ label: 'Giải phóng tạm giữ', value: `-${formatVnd(c.amount ?? 0)}`, tone: 'minus' }, { label: 'Chuyển ngân hàng', value: formatVnd(c.amount ?? 0) }]} />
        </Section>
      )}
      decisions={[
        { value: 'approve', label: 'Ký lệnh chi trả', status: 'TRANSFERRING' },
        { value: 'complete', label: 'Xác nhận ngân hàng ghi có', status: 'COMPLETED' },
        { value: 'reject', label: 'Từ chối giải ngân', status: 'REJECTED', tone: 'danger' },
      ]}
      checklist={['Tài khoản thụ hưởng đã được duyệt', 'Số dư tạm giữ khớp lệnh rút', 'Đã nhập mã tham chiếu ngân hàng (external_reference)']}
    />
  )
}
