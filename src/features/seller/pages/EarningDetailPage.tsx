import { Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import {
  Btn,
  DataTable,
  DetailLayout,
  Hero,
  KeyValues,
  MoneyRows,
  Pill,
  Section,
  StatusPill,
} from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useEarning, useEarnings } from '../hooks/useSeller'
import { earningCommission } from '../lib/earnings'
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
    <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const e = q.data
            const isRefund = e.status === 'REFUNDED' || e.isRefunded
            const fee = earningCommission(e)
            const returnShippingFee = e.returnShippingFee ?? 0
            const net = isRefund ? -returnShippingFee : e.netAmount && e.netAmount > 0 ? e.netAmount : e.gross - fee
            const isReceived = !!e.receivedAt || e.status === 'RELEASED' || isRefund
            const isWindowPassed =
              e.status === 'RELEASED' ||
              (!!e.receivedAt && new Date(e.receivedAt).getTime() + 72 * 3600 * 1000 <= Date.now())
            const steps = isRefund
              ? [
                  { label: 'Đơn thanh toán', done: true },
                  { label: 'Người mua nhận hàng', done: true },
                  { label: 'Khách khiếu nại hoàn tiền', done: true },
                  { label: `Cấn trừ phí ship 2 chiều (-${formatVnd(returnShippingFee)})`, done: true },
                ]
              : [
                  { label: 'Đơn thanh toán', done: true },
                  { label: 'Người mua nhận hàng', done: isReceived },
                  { label: 'Hết cửa sổ khiếu nại 72h', done: isWindowPassed },
                  { label: 'Giải ngân vào ví', done: e.status === 'RELEASED' },
                ]
            return (
              <>
                <Hero code="MP 054" eyebrow="Chi tiết khoản thu nhập" title={`Khoản Thu #${e.id}`} accent={e.product} />
                <DetailLayout
                  main={
                    <>
                      <Section
                        title="Tổng quan khoản thu"
                        aside={<StatusPill status={e.status} map={EARNING_STATUS} />}
                      >
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Đơn hàng', value: `#ORD-${e.orderId}` },
                            { label: 'SKU', value: e.sku },
                            {
                              label: 'Nhận hàng lúc',
                              value: e.receivedAt
                                ? formatDateTime(e.receivedAt)
                                : e.status === 'RELEASED'
                                  ? e.releaseAt
                                    ? formatDateTime(
                                        new Date(new Date(e.releaseAt).getTime() - 72 * 3600 * 1000).toISOString(),
                                      )
                                    : 'Đã nhận'
                                  : '—',
                            },
                          ]}
                        />
                        {e.blocker && (
                          <p className="mt-4 rounded-2xl bg-peach/60 p-4 text-sm text-orange-deep">{e.blocker}</p>
                        )}
                      </Section>
                      <Section title="Vòng đời khoản thu ký quỹ">
                        <ol className="grid gap-3 sm:grid-cols-4">
                          {steps.map((s, i) => (
                            <li
                              key={s.label}
                              className={`rounded-2xl p-3 text-sm ${s.done ? 'bg-mint text-[#0f5132]' : 'bg-surface-low text-ink-soft'}`}
                            >
                              <span className="font-display font-bold">{i + 1}.</span> {s.label}
                            </li>
                          ))}
                        </ol>
                      </Section>
                      <Section title="Dòng tiền khoản thu">
                        <DataTable
                          rows={e.ledger}
                          rowKey={(l) => l.id}
                          columns={[
                            { key: 'id', header: 'Mã ledger', render: (l) => <code className="text-xs">{l.id}</code> },
                            { key: 'at', header: 'Thời điểm', render: (l) => formatDateTime(l.at) },
                            { key: 't', header: 'Loại giao dịch', render: (l) => l.type },
                            { key: 'b', header: 'Ngăn số dư', render: (l) => BUCKET[l.bucket] },
                            {
                              key: 'a',
                              header: 'Số tiền',
                              render: (l) => (
                                <strong
                                  className={
                                    l.amount > 0
                                      ? 'text-teal font-bold'
                                      : l.amount < 0
                                        ? 'text-danger font-bold'
                                        : 'text-ink'
                                  }
                                >
                                  {l.amount > 0 ? `+${formatVnd(l.amount)}` : formatVnd(l.amount)}
                                </strong>
                              ),
                            },
                            {
                              key: 's',
                              header: 'Trạng thái',
                              render: (l) => <Pill tone={l.status === 'POSTED' ? 'green' : 'orange'}>{l.status}</Pill>,
                            },
                          ]}
                        />
                      </Section>
                    </>
                  }
                  aside={
                    <>
                      <Section title="Phân bổ dòng tiền">
                        {isRefund ? (
                          <MoneyRows
                            rows={[
                              { label: 'Doanh số gốc', value: formatVnd(e.gross) },
                              { label: 'Thu hồi tiền hoàn khách', value: `-${formatVnd(e.gross)}`, tone: 'minus' },
                              {
                                label: 'Phí ship 2 chiều (Xưởng chịu)',
                                value: `-${formatVnd(returnShippingFee)}`,
                                tone: 'minus',
                              },
                            ]}
                            total={{ label: 'Thực nhận (Sau cấn trừ)', value: `-${formatVnd(returnShippingFee)}` }}
                          />
                        ) : (
                          <MoneyRows
                            rows={[
                              { label: 'Doanh số gốc', value: formatVnd(e.gross) },
                              {
                                label: `${e.status === 'RELEASED' ? 'Phí sàn' : 'Phí sàn tạm tính'} (${e.feeRate * 100}%)`,
                                value: `-${formatVnd(fee)}`,
                                tone: 'minus',
                              },
                            ]}
                            total={{ label: 'Thực nhận', value: formatVnd(net) }}
                          />
                        )}
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
                            <Btn to="/bank-accounts" variant="primary" size="sm" icon={Wallet}>
                              Tài khoản nhận tiền
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
  )
}
