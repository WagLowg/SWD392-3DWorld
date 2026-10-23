import { Download, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, DataTable, DetailLayout, Hero, KeyValues, MockNotice, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { usePayout } from '../hooks/useWallet'
import { PAYOUT_STATUS } from '../lib/labels'

/** MP-101 · Chi Tiết Yêu Cầu Rút Tiền */
export function PayoutDetailPage() {
  const id = useParams().payoutId ?? ''
  const q = usePayout(id)
  useEffect(() => {
    document.title = `Rút tiền ${id} · 3DWorld`
  }, [id])
  return (
    <>
      <MockNotice api="GET /api/payouts/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const p = q.data
            const steps = ['Tạo lệnh & khoá số dư', 'Gửi lệnh tới ngân hàng', p.status === 'REJECTED' ? 'Từ chối & hoàn số dư' : 'Ngân hàng ghi có']
            const reached = p.status === 'SUCCEEDED' || p.status === 'REJECTED' ? 3 : 2
            return (
              <>
                <Hero
                  code="MP-101"
                  eyebrow="Chi tiết rút tiền"
                  title={`#${p.id} · ${formatVnd(p.amount)}`}
                  actions={
                    <>
                      <Btn variant="white" icon={Download}>
                        Biên nhận PDF
                      </Btn>
                      {(p.status === 'UNKNOWN' || p.status === 'PROCESSING') && (
                        <Btn variant="primary" icon={RefreshCw} onClick={() => q.refetch()}>
                          Kiểm tra trạng thái ngân hàng
                        </Btn>
                      )}
                    </>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Thông tin giao dịch chi trả" aside={<StatusPill status={p.status} map={PAYOUT_STATUS} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Tạo lúc', value: formatDateTime(p.at) },
                            { label: 'Bút toán tạm giữ', value: <code>{p.ledgerRef}</code> },
                            { label: 'Ghi chú', value: p.note ?? '—' },
                          ]}
                        />
                        {p.rejectReason && <p className="mt-3 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">{p.rejectReason}</p>}
                      </Section>
                      <Section title="Vòng đời giao dịch">
                        <ol className="grid gap-3 sm:grid-cols-3">
                          {steps.map((s, i) => (
                            <li key={s} className={`rounded-2xl p-4 text-sm ${i < reached ? (p.status === 'REJECTED' && i === 2 ? 'bg-[#ffdad6] text-danger' : 'bg-mint text-[#0f5132]') : 'bg-surface-low text-ink-soft'}`}>
                              <span className="font-display font-bold">{i + 1}.</span> {s}
                            </li>
                          ))}
                        </ol>
                      </Section>
                      <Section title="Nhật ký gateway attempt">
                        <DataTable
                          rows={p.attempts}
                          rowKey={(a) => a.no}
                          columns={[
                            { key: 'n', header: 'Lượt', render: (a) => `#${a.no}` },
                            { key: 'g', header: 'Cổng', render: (a) => a.gateway },
                            { key: 's', header: 'Kết quả', render: (a) => <code className="text-xs">{a.status}</code> },
                            { key: 't', header: 'Thời điểm', render: (a) => formatDateTime(a.at) },
                            { key: 'm', header: 'Phản hồi', render: (a) => <span className="text-xs text-ink-soft">{a.message}</span> },
                          ]}
                        />
                      </Section>
                    </>
                  }
                  aside={
                    <Section title="Tài khoản thụ hưởng">
                      <p className="font-display text-xl font-bold">{p.bank.name}</p>
                      <p className="font-mono text-sm">{p.bank.masked}</p>
                      <p className="text-xs uppercase tracking-widest text-ink-soft">{p.bank.holder}</p>
                    </Section>
                  }
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
