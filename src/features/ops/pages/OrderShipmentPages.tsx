import { Camera, MapPin } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, CellTitle, KeyValues, MediaTile, MoneyRows, Pill, Section } from '../../../shared/ui/kit'
import { moneyColumn, OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'

/** MP 062 · Quản Trị Đơn Hàng Vận Hành Toàn Sàn */
export function PlatformOrdersPage() {
  return (
    <OpsQueue
      domain="order"
      code="MP 062"
      eyebrow="Đơn hàng vận hành"
      title="Quản Trị Đơn Hàng Toàn Sàn"
      accent="Đơn Con, Dòng Tiền Ký Quỹ & Giao Nhận."
      api="GET /api/admin/orders"
      kpis={(r) => [
        { label: 'Chờ chế tác', value: r.filter((c) => c.status === 'MAKING').length, tone: 'violet' },
        { label: 'Đếm ngược 72h', value: r.filter((c) => c.status === 'COUNTDOWN_72H').length, tone: 'teal' },
        { label: 'Yêu cầu huỷ', value: r.filter((c) => c.status === 'CANCEL_REQUESTED').length, tone: 'orange' },
        { label: 'Tranh chấp', value: r.filter((c) => c.status === 'DISPUTE').length, tone: 'danger' },
      ]}
      columns={[
        { key: 'id', header: 'Mã đơn / nhóm checkout', render: (c) => <CellTitle title={`#${c.id}`} sub={c.subtitle} to={`/ops/orders/${c.id}`} /> },
        { key: 'p', header: 'Gian hàng & tác phẩm', render: (c) => <CellTitle title={c.title} sub={val(c, 'store')} /> },
        { key: 'v', header: 'Giá trị / thanh toán', render: (c) => <CellTitle title={formatVnd(c.amount ?? 0)} sub={val(c, 'payment')} /> },
        { key: 'o', header: 'Trạng thái đơn', render: (c) => <code className="text-xs">{val(c, 'orderStatus')}</code> },
        statusColumn('order'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/orders/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Ràng buộc vận hành đơn hàng',
        items: ['Đơn đã bàn giao vận chuyển không được huỷ, chỉ xử lý qua hoàn tiền.', 'Huỷ đơn đang chế tác cần xưởng đồng ý hoặc phán quyết vận hành.', 'Đơn tranh chấp bị đóng băng giải ngân cho tới khi có phán quyết.', 'Mọi can thiệp ghi audit log kèm lý do.'],
      }}
    />
  )
}

/** MP 063 · Chi Tiết Thẩm Định Đơn Hàng & Can Thiệp Vận Hành */
export function PlatformOrderReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="order"
      id={id}
      code="MP 063"
      eyebrow="Thẩm định đơn hàng"
      titlePrefix="Đơn hàng"
      api="POST /api/admin/orders/{id}/intervene"
      closed={(c) => c.status === 'CANCELLED'}
      main={(c) => (
        <Section n={1} title="Đơn hàng con & nhóm thanh toán">
          <KeyValues
            cols={3}
            items={[
              { label: 'Gian hàng', value: val(c, 'store') },
              { label: 'Người mua', value: val(c, 'buyer') },
              { label: 'Trạng thái đơn', value: val(c, 'orderStatus') },
              { label: 'Thanh toán', value: val(c, 'payment') },
              { label: 'Vận chuyển', value: val(c, 'shipping') },
              { label: 'Lý do yêu cầu', value: val(c, 'reason') },
            ]}
          />
        </Section>
      )}
      aside={(c) => (
        <Section title="Dòng tiền ký quỹ">
          <MoneyRows rows={[{ label: 'Đã thanh toán', value: formatVnd(c.amount ?? 0) }, { label: 'Phí sàn 5%', value: formatVnd((c.amount ?? 0) * 0.05), tone: 'minus' }]} total={{ label: 'Doanh thu xưởng (chờ)', value: formatVnd((c.amount ?? 0) * 0.95) }} />
        </Section>
      )}
      decisions={[
        { value: 'approve_cancel', label: 'Phê duyệt huỷ & hoàn ký quỹ', status: 'CANCELLED', tone: 'danger' },
        { value: 'reject_cancel', label: 'Từ chối huỷ (tiếp tục chế tác)', status: 'MAKING' },
        { value: 'freeze', label: 'Đóng băng đơn (hold dispute)', status: 'FROZEN', tone: 'danger' },
      ]}
      checklist={['Đã liên hệ xưởng & khách hàng', 'Đã kiểm tra tiến độ chế tác']}
    />
  )
}

/** MP 064 · Quản Trị Vận Chuyển Toàn Sàn */
export function PlatformShipmentsPage() {
  return (
    <OpsQueue
      domain="shipment"
      code="MP 064"
      eyebrow="Vận chuyển toàn sàn"
      title="Quản Trị Vận Chuyển Toàn Sàn"
      accent="Vận Đơn, Giao Thất Bại & Hoàn Hàng."
      api="GET /api/admin/shipments"
      columns={[
        { key: 'id', header: 'Vận đơn', render: (c) => <CellTitle title={c.title} sub={`${c.id} · ${val(c, 'carrier')}`} to={`/ops/shipments/${c.id}`} /> },
        { key: 'o', header: 'Đơn & xưởng', render: (c) => <CellTitle title={c.subtitle} sub={val(c, 'store')} /> },
        { key: 'r', header: 'Người nhận', render: (c) => <span className="text-sm">{val(c, 'receiver')}</span> },
        { key: 'e', header: 'Sự kiện gần nhất', render: (c) => <CellTitle title={val(c, 'lastEvent')} sub={`${c.f.attempts} lần phát`} /> },
        statusColumn('shipment'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/shipments/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Quy chuẩn đối soát vận đơn',
        items: ['Giao thất bại 3 lần tự chuyển trạng thái hoàn về xưởng.', 'Bằng chứng giao hàng (chữ ký, ảnh) bắt buộc khi xác nhận giao thành công.', 'Phí hoàn hàng do lỗi người nhận trừ vào hoàn tiền.', 'Kiện mất được bồi thường qua bảo hiểm hãng vận chuyển.'],
      }}
    />
  )
}

/** MP 065 · Chi Tiết Thẩm Định Vận Đơn & Bằng Chứng Giao Nhận */
export function PlatformShipmentReviewPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="shipment"
      id={id}
      code="MP 065"
      eyebrow="Thẩm định vận đơn"
      titlePrefix="Vận đơn"
      api="POST /api/admin/shipments/{id}/decision"
      closed={(c) => c.status === 'DELIVERED'}
      main={(c) => (
        <>
          <Section n={1} title="Thẻ vận đơn & bưu cục">
            <KeyValues cols={3} items={[{ label: 'Hãng', value: val(c, 'carrier') }, { label: 'Đơn', value: val(c, 'order') }, { label: 'Người nhận', value: val(c, 'receiver') }, { label: 'Khối lượng', value: val(c, 'weight') }, { label: 'Số lần phát', value: val(c, 'attempts') }, { label: 'Sự kiện cuối', value: val(c, 'lastEvent') }]} />
          </Section>
          <Section n={2} title="Bằng chứng giao hàng kỹ thuật số">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(c.evidence ?? []).map((e) => (
                <MediaTile key={e} label={e} icon={Camera} tone="teal" />
              ))}
              <MediaTile label="Bản đồ GPS (chờ API hãng)" icon={MapPin} tone="neutral" />
            </div>
          </Section>
        </>
      )}
      aside={(c) => (
        <Section title="Ký quỹ 72h">
          <MoneyRows rows={[{ label: 'Giá trị kiện', value: formatVnd(c.amount ?? 0) }]} />
          <p className="mt-2 text-xs text-ink-soft">Tạo lúc {formatDateTime(c.createdAt)}</p>
        </Section>
      )}
      decisions={[
        { value: 'valid', label: 'Xác nhận bằng chứng giao hợp lệ', status: 'DELIVERED' },
        { value: 'redispatch', label: 'Điều vận bổ sung (phát lại)', status: 'REDISPATCHED' },
        { value: 'return', label: 'Chuyển hoàn về xưởng', status: 'RETURNING', tone: 'danger' },
      ]}
    />
  )
}

/** MP 066 · Quản Trị Đối Soát COD */
export function CodQueuePage() {
  return (
    <OpsQueue
      domain="cod"
      code="MP 066"
      eyebrow="Đối soát COD"
      title="Hàng Chờ Đối Soát COD"
      accent="Quyết Toán Tiền Mặt Bưu Cục & Ký Quỹ."
      api="GET /api/admin/cod-attempts"
      columns={[
        { key: 'id', header: 'Mã đối soát & đơn', render: (c) => <CellTitle title={c.id} sub={c.title} to={`/ops/cod/${c.id}`} /> },
        { key: 'b', header: 'Bưu cục & tham chiếu', render: (c) => <CellTitle title={val(c, 'carrier')} sub={c.subtitle} /> },
        { key: 'm', header: 'Mốc giao / thu / quyết toán', render: (c) => <span className="text-xs">{val(c, 'delivered')} · {val(c, 'collected')} · {val(c, 'settledAt')}</span> },
        { key: 'a', header: 'Thu hộ (kê / nộp)', render: (c) => <CellTitle title={val(c, 'declared')} sub={`Đã nộp ${val(c, 'settled')}`} /> },
        statusColumn('cod'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/cod/${c.id}`} size="sm">Thẩm định</Btn> },
      ]}
      rules={{
        title: 'Nguyên tắc hạch toán COD',
        items: ['Doanh thu xưởng chỉ ghi nhận sau cod_settled_at.', 'Chênh lệch giữa kê khai và tiền nộp phải lập biên bản.', 'Phí thu hộ trừ vào doanh thu xưởng theo biểu phí.', 'COD bị huỷ / hoàn hàng không phát sinh doanh thu.'],
      }}
    />
  )
}

function codReview(code: string, eyebrow: string, api: string, domain: 'cod' | 'codSettlement') {
  // biome-ignore lint/correctness/noComponentHookFactories: factory runs once at module initialization for route components
  return function CodReview() {
    const id = useParams().caseId ?? ''
    return (
      <OpsReview
        domain={domain}
        id={id}
        code={code}
        eyebrow={eyebrow}
        titlePrefix="Quyết toán COD"
        api={api}
        closed={(c) => c.status === 'SETTLED'}
        main={(c) => (
          <>
            <Section n={1} title="Chi tiết thu hộ & khớp nối vận đơn">
              <KeyValues
                cols={3}
                items={[
                  { label: 'Bưu cục', value: val(c, 'carrier') },
                  { label: 'Gian hàng', value: val(c, 'store') },
                  { label: 'Kê khai', value: val(c, 'declared') },
                  { label: domain === 'cod' ? 'Đã nộp' : 'Đã nộp sàn', value: domain === 'cod' ? val(c, 'settled') : val(c, 'remitted') },
                  { label: 'Trạng thái nộp', value: domain === 'cod' ? val(c, 'settledAt') : val(c, 'remittedAt') },
                  { label: 'Đơn', value: domain === 'cod' ? c.title : val(c, 'order') },
                ]}
              />
            </Section>
            <Section n={2} title="Bằng chứng đối chiếu ngân hàng">
              <div className="flex flex-wrap gap-2">
                {(c.evidence ?? ['Chưa có bằng chứng']).map((e) => (
                  <Pill key={e} tone="violet">
                    {e}
                  </Pill>
                ))}
              </div>
            </Section>
          </>
        )}
        aside={(c) => {
          const declared = Number(c.f.declared)
          const paid = Number(domain === 'cod' ? c.f.settled : c.f.remitted)
          return (
            <Section title="Bóc tách dòng tiền">
              <MoneyRows rows={[{ label: 'Kê khai thu hộ', value: formatVnd(declared) }, { label: 'Bưu cục đã nộp', value: formatVnd(paid) }, { label: 'Chênh lệch', value: formatVnd(declared - paid), tone: declared !== paid ? 'minus' : undefined }]} />
            </Section>
          )
        }}
        decisions={[
          { value: 'settle', label: 'Ký duyệt quyết toán COD', status: 'SETTLED' },
          { value: 'hold', label: 'Treo hồ sơ chờ đối chiếu', status: 'HOLD' },
          { value: 'mismatch', label: 'Ghi nhận lệch & lập biên bản', status: 'MISMATCH', tone: 'danger' },
        ]}
        checklist={['Đã đối chiếu sao kê bưu cục', 'Đã kiểm tra webhook / API payload hãng']}
      />
    )
  }
}

/** MP 067 · Chi Tiết Thẩm Định Quyết Toán COD */
export const CodReviewPage = codReview('MP 067', 'Thẩm định quyết toán COD', 'POST /api/admin/cod-attempts/{id}/settle', 'cod')
/** MP 083 · Chi Tiết Thẩm Định Quyết Toán COD Cấp Cao */
export const CodSettlementReviewPage = codReview('MP 083', 'Hồ sơ quyết toán COD cấp cao', 'POST /api/admin/cod-settlements/{id}/settle', 'codSettlement')

/** MP 082 · Quản Trị Đối Soát COD Cấp Cao */
export function CodSettlementQueuePage() {
  return (
    <OpsQueue
      domain="codSettlement"
      code="MP 082"
      eyebrow="Đối soát COD cấp cao"
      title="Quản Trị Đối Soát COD Toàn Sàn"
      accent="Quyết Toán Bưu Cục & Giải Toả Ví Xưởng."
      api="GET /api/admin/cod-settlements"
      columns={[
        { key: 'id', header: 'Vận đơn', render: (c) => <CellTitle title={c.title} sub={c.subtitle} to={`/ops/cod-settlements/${c.id}`} /> },
        { key: 'o', header: 'Đơn & xưởng', render: (c) => <CellTitle title={val(c, 'order')} sub={val(c, 'store')} /> },
        { key: 'c', header: 'Đơn vị vận chuyển', render: (c) => val(c, 'carrier') },
        moneyColumn('Tiền thu hộ'),
        { key: 'r', header: 'Đối chiếu bưu cục', render: (c) => <CellTitle title={val(c, 'remitted')} sub={val(c, 'remittedAt')} /> },
        statusColumn('codSettlement'),
        { key: 'x', header: '', render: (c) => <Btn to={`/ops/cod-settlements/${c.id}`} size="sm">Đối soát</Btn> },
      ]}
    />
  )
}
