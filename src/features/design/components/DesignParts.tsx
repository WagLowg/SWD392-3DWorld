import { Boxes, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, MoneyRows, Section } from '../../../shared/ui/kit'
import type { DesignRequest } from '../data/design.fixtures'
import { useDesignMessage } from '../hooks/useDesign'
import { DESIGN_FLOW, DESIGN_STATUS } from '../lib/status'

export function DesignTimeline({ r }: { r: DesignRequest }) {
  const idx = DESIGN_FLOW.indexOf(r.status === 'REVISION' ? 'REVIEW' : r.status === 'DELIVERED' ? 'COMPLETED' : (r.status as (typeof DESIGN_FLOW)[number]))
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {DESIGN_FLOW.map((s, i) => (
        <li key={s} className={`rounded-2xl p-3 text-xs font-semibold ${i < idx ? 'bg-mint text-[#0f5132]' : i === idx ? 'bg-orange text-white' : 'bg-surface-low text-ink-soft'}`}>
          {i + 1}. {DESIGN_STATUS[s].label}
        </li>
      ))}
    </ol>
  )
}

export function Preview3D({ label = 'Không gian xem trước 3D' }: { label?: string }) {
  return (
    <div className="grid aspect-[16/10] place-items-center rounded-[2rem] bg-gradient-to-br from-violet-soft via-[#f4f0ff] to-peach">
      <div className="flex flex-col items-center gap-2 text-ink-soft">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/85 text-violet shadow-soft">
          <Boxes size={36} strokeWidth={1.5} />
        </span>
        <span className="font-label text-xs font-semibold">{label}</span>
        <span className="text-[11px]">Trình xem sẽ dùng tệp GLB khi có API bàn giao</span>
      </div>
    </div>
  )
}

export function QuoteSummary({ r }: { r: DesignRequest }) {
  if (!r.quote) return <p className="text-sm text-ink-soft">Chưa có báo giá.</p>
  const total = r.quote.lines.reduce((s, l) => s + l.amount, 0)
  return (
    <>
      <MoneyRows rows={r.quote.lines.map((l) => ({ label: l.label, value: formatVnd(l.amount) }))} total={{ label: `Tổng (${r.quote.version})`, value: formatVnd(total) }} />
      <p className="mt-2 text-xs text-ink-soft">
        Đặt cọc 50%: {formatVnd(r.quote.deposit)} · Hết hạn {formatDateTime(r.quote.expiresAt)}
      </p>
    </>
  )
}

export function MessageThread({ r, as }: { r: DesignRequest; as: 'customer' | 'engineer' | 'staff' }) {
  const uid = useId()
  const send = useDesignMessage()
  const [text, setText] = useState('')
  const who = { customer: 'Khách hàng', engineer: 'Kỹ sư', staff: 'Nhân viên' }
  return (
    <Section title="Trao đổi kỹ thuật">
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {r.messages.length ? (
          r.messages.map((m) => (
            <li key={`${m.at}-${m.text.slice(0, 10)}`} className={`rounded-2xl p-3 text-sm ${m.from === as ? 'ml-8 bg-violet-soft/50' : 'mr-8 bg-surface-low'}`}>
              <p className="font-label text-[11px] font-semibold text-ink-soft">
                {who[m.from]} · {formatDateTime(m.at)}
              </p>
              {m.text}
            </li>
          ))
        ) : (
          <li className="text-sm text-ink-soft">Chưa có trao đổi.</li>
        )}
      </ul>
      <div className="mt-3 flex gap-2">
        <label htmlFor={`${uid}-m`} className="sr-only">
          Tin nhắn
        </label>
        <input id={`${uid}-m`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập phản hồi (tối đa 500 ký tự)…" maxLength={500} className={inputClass} />
        <Btn variant="primary" icon={Send} disabled={!text.trim() || send.isPending} onClick={() => send.mutate({ id: r.id, from: as, text: text.trim() }, { onSuccess: () => setText('') })}>
          Gửi
        </Btn>
      </div>
    </Section>
  )
}
