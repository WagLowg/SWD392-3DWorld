import { Download, Fingerprint } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, DetailLayout, Hero, KeyValues, MockNotice, Pill, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useLedgerEntry } from '../hooks/useWallet'
import { BUCKET_LABEL, LEDGER_TYPE } from '../lib/labels'

/** MP-098 · Chi Tiết Giao Dịch Sổ Cái Ví */
export function LedgerEntryPage() {
  const id = useParams().entryId ?? ''
  const q = useLedgerEntry(id)
  useEffect(() => {
    document.title = `Bút toán ${id} · 3DWorld`
  }, [id])
  return (
    <>
      <MockNotice api="GET /api/wallets/me/ledger/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const l = q.data
            return (
              <>
                <Hero
                  code="MP-098"
                  eyebrow="Chi tiết bút toán sổ cái"
                  title={`#${l.id}`}
                  accent={l.label}
                  actions={
                    <Btn variant="white" icon={Download}>
                      Biên lai đối soát PDF
                    </Btn>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Thông tin biến động tài chính" aside={<StatusPill status={l.type} map={LEDGER_TYPE} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Thời điểm', value: formatDateTime(l.at) },
                            { label: 'Nhóm số dư', value: BUCKET_LABEL[l.bucket] },
                            { label: 'Trạng thái', value: <Pill tone={l.status === 'POSTED' ? 'green' : 'orange'}>{l.status}</Pill> },
                            { label: 'Nghiệp vụ liên kết', value: <code>{l.ref}</code> },
                            { label: 'Khoá idempotency', value: <code>{l.idempotencyKey}</code> },
                            { label: 'Mã băm', value: <code className="text-xs">{l.hash}</code> },
                          ]}
                        />
                      </Section>
                      <Section title="Dòng đời luân chuyển dòng tiền">
                        <ol className="grid gap-3 sm:grid-cols-3">
                          {['Nghiệp vụ phát sinh', 'Ghi sổ bất biến', 'Cập nhật số dư'].map((s, i) => (
                            <li key={s} className={`rounded-2xl p-4 text-sm ${l.status === 'POSTED' || i === 0 ? 'bg-mint text-[#0f5132]' : 'bg-surface-low text-ink-soft'}`}>
                              <span className="font-display font-bold">{i + 1}.</span> {s}
                            </li>
                          ))}
                        </ol>
                      </Section>
                    </>
                  }
                  aside={
                    <Section title="Số tiền">
                      <p className={`font-display text-4xl font-bold ${l.amount < 0 ? 'text-danger' : 'text-teal'}`}>
                        {l.amount > 0 ? '+' : ''}
                        {formatVnd(l.amount)}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">Số dư sau: {formatVnd(l.balanceAfter)}</p>
                      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-low p-3 text-xs text-ink-soft">
                        <Fingerprint size={14} /> Bút toán không thể sửa; mọi điều chỉnh dùng bút toán bù trừ.
                      </p>
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
