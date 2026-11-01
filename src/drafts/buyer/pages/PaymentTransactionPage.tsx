import { Download, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, DataTable, DetailLayout, Hero, KeyValues, MockNotice, RuleBox, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useTransaction } from '../../../features/buyer/hooks/useBuyer'
import { TXN_STATUS } from '../../../features/buyer/lib/status'

/** MP 023 · Chi Tiết Giao Dịch Thanh Toán */
export function PaymentTransactionPage() {
  const id = useParams().transactionId ?? ''
  const q = useTransaction(id)
  useEffect(() => {
    document.title = `Giao dịch ${id} · 3DWorld`
  }, [id])
  return (
    <>
      <MockNotice api="GET /api/payments/{transactionId}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const t = q.data
            return (
              <>
                <Hero
                  code="MP 023"
                  eyebrow="Chi tiết giao dịch"
                  title={`Giao Dịch #${t.id}`}
                  accent="Đối Soát Thanh Toán & Ký Quỹ."
                  actions={
                    <>
                      <Btn variant="white" icon={Download}>
                        Biên lai PDF
                      </Btn>
                      {t.status === 'UNKNOWN' && (
                        <Btn variant="primary" icon={RefreshCw} onClick={() => q.refetch()}>
                          Kiểm tra lại trạng thái
                        </Btn>
                      )}
                    </>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Bản ghi giao dịch" aside={<StatusPill status={t.status} map={TXN_STATUS} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Mục đích', value: t.purpose },
                            { label: 'Đơn liên quan', value: t.orderIds.length ? t.orderIds.map((o) => `#${o}`).join(', ') : '—' },
                            { label: 'Tạo lúc', value: formatDateTime(t.createdAt) },
                          ]}
                        />
                      </Section>
                      <Section title="Nhật ký các lần thử thanh toán">
                        <DataTable
                          rows={t.attempts}
                          rowKey={(a) => a.no}
                          columns={[
                            { key: 'n', header: 'Lượt', render: (a) => `#${a.no}` },
                            { key: 'm', header: 'Phương thức & cổng', render: (a) => `${a.method} · ${a.gateway}` },
                            { key: 'r', header: 'Mã tham chiếu', render: (a) => <code className="text-xs">{a.ref}</code> },
                            { key: 's', header: 'Trạng thái', render: (a) => <StatusPill status={a.status} map={TXN_STATUS} /> },
                            { key: 't', header: 'Thời điểm', render: (a) => formatDateTime(a.at) },
                            { key: 'x', header: 'Ghi chú', render: (a) => <span className="text-xs text-ink-soft">{a.note}</span> },
                          ]}
                        />
                      </Section>
                    </>
                  }
                  aside={
                    <Section title="Số tiền">
                      <p className="font-display text-4xl font-bold">{formatVnd(t.amount)}</p>
                      <p className="mt-1 text-xs text-ink-soft">Tiền được giữ ký quỹ cho tới khi hết cửa sổ khiếu nại.</p>
                    </Section>
                  }
                />
                <RuleBox
                  title="Cơ chế chống thu phí trùng lặp"
                  rules={[
                    'Mỗi lần thử thanh toán có khoá idempotency riêng — thử lại không tạo khoản trừ mới.',
                    'Trạng thái UNKNOWN nghĩa là chưa nhận được kết quả từ cổng; hệ thống tự đối soát, bạn không cần thanh toán lại.',
                    'Chỉ callback có chữ ký MAC hợp lệ mới thay đổi trạng thái giao dịch.',
                    'Hoàn tiền được trả về đúng phương thức đã thanh toán.',
                  ]}
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
