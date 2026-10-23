import { Printer, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Btn, Hero, MockNotice, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { usePolicy } from '../hooks/useBuyer'

/** MP 016 · Chi Tiết Chính Sách */
export function PolicyPage() {
  const slug = useParams().slug ?? 'escrow-72h'
  const q = usePolicy(slug)
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    if (q.data) document.title = `${q.data.title} · 3DWorld`
  }, [q.data])

  return (
    <>
      <MockNotice api="GET /api/policies/{slug}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <Hero
              code="MP 016"
              eyebrow={`Chính sách · cập nhật ${q.data.updated}`}
              title={q.data.title}
              actions={
                <Btn variant="white" icon={Printer} onClick={() => window.print()}>
                  In / lưu PDF
                </Btn>
              }
            />
            <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
              <nav aria-label="Mục lục" className="h-fit space-y-1 rounded-[1.75rem] bg-white/90 p-4 shadow-soft lg:sticky lg:top-28">
                {q.data.sections.map((s, i) => (
                  <a key={s.h} href={`#sec-${i}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-surface-low">
                    {s.h}
                  </a>
                ))}
                <Link to="/help" className="block px-3 pt-2 font-label text-xs font-semibold text-violet">
                  ← Trung tâm trợ giúp
                </Link>
              </nav>
              <div className="space-y-4">
                {q.data.sections.map((s, i) => (
                  <Section key={s.h} title={s.h}>
                    <p id={`sec-${i}`} className="scroll-mt-32 text-[15px] leading-relaxed text-ink-soft">
                      {s.p}
                    </p>
                  </Section>
                ))}
                <Section title="Chính sách này có hữu ích không?">
                  {voted ? (
                    <p className="text-sm text-teal">Cảm ơn phản hồi của bạn!</p>
                  ) : (
                    <div className="flex gap-2">
                      <Btn icon={ThumbsUp} onClick={() => setVoted('yes')}>
                        Có, rất rõ ràng
                      </Btn>
                      <Btn icon={ThumbsDown} onClick={() => setVoted('no')}>
                        Cần làm rõ thêm
                      </Btn>
                    </div>
                  )}
                </Section>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  )
}
