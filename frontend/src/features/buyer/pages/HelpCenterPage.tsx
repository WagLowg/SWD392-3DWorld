import { ChevronDown, LifeBuoy, Search, ShieldCheck, ShoppingCart, Sparkles, Store, Truck } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { inputClass } from '../../../shared/ui/form'
import { Btn, Hero, MockNotice, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useHelp, useSubmitTicket } from '../hooks/useBuyer'

const ICONS: Record<string, typeof ShoppingCart> = { cart: ShoppingCart, shield: ShieldCheck, truck: Truck, store: Store, sparkles: Sparkles }

/** MP 015 · Trung Tâm Trợ Giúp */
export function HelpCenterPage() {
  const q = useHelp()
  const ticket = useSubmitTicket()
  const uid = useId()
  const [term, setTerm] = useState('')
  const [topic, setTopic] = useState('')
  const [open, setOpen] = useState<number | null>(0)
  const [form, setForm] = useState({ orderId: '', topic: 'Hoàn tiền', detail: '' })

  useEffect(() => {
    document.title = 'Trung tâm trợ giúp · 3DWorld'
  }, [])

  const faqs = (q.data?.faqs ?? []).filter(
    (f) => (!topic || f.topic === topic) && (!term || `${f.q} ${f.a}`.toLowerCase().includes(term.toLowerCase())),
  )

  return (
    <>
      <MockNotice api="POST /api/support/tickets" />
      <Hero code="MP 015" eyebrow="Trung tâm trợ giúp" title="Trung Tâm Trợ Giúp" accent="Giải Đáp & Quy Chuẩn 3DWorld." />
      <div className="mt-6 flex items-center gap-3 rounded-full bg-white p-2 pl-5 shadow-soft">
        <Search size={18} className="text-ink-soft" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Tìm câu hỏi: hoàn tiền 72h, đơn đa xưởng, COD…" aria-label="Tìm câu hỏi" className="h-11 flex-1 bg-transparent text-sm outline-none" />
      </div>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(q.data?.topics ?? []).map((t) => {
            const Icon = ICONS[t.icon] ?? LifeBuoy
            const active = topic === t.slug
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTopic(active ? '' : t.slug)}
                aria-pressed={active}
                className={`rounded-[1.75rem] p-5 text-left shadow-soft transition ${active ? 'bg-ink text-white' : 'bg-white/95 hover:-translate-y-0.5'}`}
              >
                <Icon size={20} className={active ? 'text-orange' : 'text-violet'} />
                <p className="mt-3 font-display font-bold">{t.title}</p>
                <p className={`text-xs ${active ? 'text-white/70' : 'text-ink-soft'}`}>{t.faqs} câu hỏi</p>
              </button>
            )
          })}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Section title="Giải đáp quy chuẩn chính thức">
            <ul className="space-y-2">
              {faqs.map((f, i) => (
                <li key={f.q} className="rounded-2xl bg-surface-low">
                  <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold">
                    {f.q}
                    <ChevronDown size={16} className={`shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && <p className="px-4 pb-4 text-sm text-ink-soft">{f.a}</p>}
                </li>
              ))}
              {!faqs.length && <p className="text-sm text-ink-soft">Không tìm thấy câu hỏi phù hợp.</p>}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn to="/help/policy/escrow-72h" size="sm">
                Chính sách ký quỹ 72h
              </Btn>
              <Btn to="/help/policy/dieu-khoan" size="sm">
                Điều khoản dịch vụ
              </Btn>
            </div>
          </Section>
          <Section title="Vẫn chưa tìm được lời giải?" subtitle="Gửi phiếu hỗ trợ — phản hồi trong 24h.">
            <div className="space-y-3">
              <label htmlFor={`${uid}-o`} className="block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Mã đơn hàng (nếu có)</span>
                <input id={`${uid}-o`} value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className={inputClass} placeholder="#ORD-…" />
              </label>
              <label htmlFor={`${uid}-t`} className="block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Vấn đề cần xử lý</span>
                <select id={`${uid}-t`} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={inputClass}>
                  {['Hoàn tiền', 'Giao hàng', 'Thanh toán', 'Tài khoản', 'Xưởng / gian hàng', 'Khác'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${uid}-d`} className="block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Mô tả chi tiết (≥ 20 ký tự)</span>
                <textarea id={`${uid}-d`} rows={4} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} className={inputClass} />
              </label>
              <Btn
                variant="primary"
                disabled={form.detail.trim().length < 20 || ticket.isPending}
                onClick={() => ticket.mutate({ ...form, orderId: form.orderId || undefined }, { onSuccess: () => setForm({ ...form, detail: '' }) })}
              >
                Gửi phiếu hỗ trợ
              </Btn>
              <p className="text-xs text-ink-soft">
                Tranh chấp đơn hàng? Dùng{' '}
                <Link to="/refunds/new" className="text-violet underline">
                  yêu cầu hoàn tiền
                </Link>{' '}
                để được trọng tài xử lý.
              </p>
            </div>
          </Section>
        </div>
      </QueryState>
    </>
  )
}
