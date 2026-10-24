import { Download, LifeBuoy, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, DataTable, DetailLayout, Hero, KeyValues, MockNotice, MoneyRows, Pill, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useEarning, useEarnings } from '../hooks/useSeller'
import { EARNING_STATUS } from '../lib/status'

const BUCKET = { pending: 'Chờ (pending)', available: 'Khả dụng', held: 'Tạm giữ (held)' }

/** MP 054 · Chi Tiết Khoản Thu Nhập & Sổ Cái Ví */
export function EarningDetailPage() {
  const id = useParams().earningId ?? ''
  const q = useEarning(id)
  const wallet = useEarnings().data?.wallet
  useEffect(() => {
    document.title = `Khoản thu ${id} · 3DWorld`
  }, [id])

  return (
    <>
      <MockNotice api="/api/seller/earnings/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const e = q.data
            const fee = e.gross * e.feeRate
            const steps = [
              { label: 'Đơn thanh toán', done: true },
              { label: 'Người mua nhận hàng', done: !!e.receivedAt },
              { label: 'Hết cửa sổ khiếu nại 72h', done: e.status === 'RELEASED' },
              { label: 'Giải ngân vào ví', done: e.status === 'RELEASED' },
            ]
            return (
              <>
                <Hero
                  code="MP 054"
                  eyebrow="Chi tiết khoản thu nhập"
                  title={`Khoản Thu #${e.id}`}
                  accent={e.product}
                  actions={
                    <>
                      <Btn variant="white" icon={Download}>
                        Biên lai quyết toán PDF
                      </Btn>
                      <Btn variant="white" icon={LifeBuoy} to="/help">
                        Hỗ trợ ký quỹ
                      </Btn>
                    </>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Tổng quan khoản thu" aside={<StatusPill status={e.status} map={EARNING_STATUS} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Đơn hàng', value: `#ORD-${e.orderId}` },
                            { label: 'SKU', value: e.sku },
                            { label: 'Nhận hàng lúc', value: formatDateTime(e.receivedAt) },
                          ]}
                        />
                        {e.blocker && <p className="mt-4 rounded-2xl bg-peach/60 p-4 text-sm text-orange-deep">{e.blocker}</p>}
                      </Section>
                      <Section title="Vòng đời khoản thu ký quỹ">
                        <ol className="grid gap-3 sm:grid-cols-4">
                          {steps.map((s, i) => (
                            <li key={s.label} className={`rounded-2xl p-3 text-sm ${s.done ? 'bg-mint text-[#0f5132]' : 'bg-surface-low text-ink-soft'}`}>
                              <span className="font-display font-bold">{i + 1}.</span> {s.label}
                            </li>
                          ))}
                        </ol>
                      </Section>
                      <Section title="Nhật ký sổ cái kép bất biến">
                        <DataTable
                          rows={e.ledger}
                          rowKey={(l) => l.id}
                          columns={[
                            { key: 'id', header: 'Mã ledger', render: (l) => <code className="text-xs">{l.id}</code> },
                            { key: 'at', header: 'Thời điểm', render: (l) => formatDateTime(l.at) },
                            { key: 't', header: 'Loại giao dịch', render: (l) => l.type },
                            { key: 'b', header: 'Ngăn số dư', render: (l) => BUCKET[l.bucket] },
                            { key: 'a', header: 'Số tiền', render: (l) => <strong>{formatVnd(l.amount)}</strong> },
                            { key: 's', header: 'Trạng thái', render: (l) => <Pill tone={l.status === 'POSTED' ? 'green' : 'orange'}>{l.status}</Pill> },
                          ]}
                        />
                      </Section>
                    </>
                  }
                  aside={
                    <>
                      <Section title="Phân bổ dòng tiền">
                        <MoneyRows
                          rows={[
                            { label: 'Doanh số gốc', value: formatVnd(e.gross) },
                            { label: `Phí sàn (${e.feeRate * 100}%)`, value: `-${formatVnd(fee)}`, tone: 'minus' },
                          ]}
                          total={{ label: 'Thực nhận', value: formatVnd(e.gross - fee) }}
                        />
                      </Section>
                      {wallet && (
                        <Section title="Ví xưởng">
                          <MoneyRows
                            rows={[
                              { label: 'Khả dụng', value: formatVnd(wallet.available), tone: 'plus' },
                              { label: 'Chờ mở khoá', value: formatVnd(wallet.pending) },
                              { label: 'Tạm giữ', value: formatVnd(wallet.held), tone: 'minus' },
                            ]}
                          />
                          <div className="mt-3">
                            <Btn to="/wallet/payouts/new" variant="primary" size="sm" icon={Wallet}>
                              Rút tiền
                            </Btn>
                          </div>
                        </Section>
                      )}
                    </>
                  }
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
