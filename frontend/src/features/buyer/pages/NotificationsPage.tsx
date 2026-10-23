import { Bell, CheckCheck, Package, Sparkles, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { Btn, FilterTabs, Hero, MockNotice, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import type { NotificationKind } from '../data/buyer.fixtures'
import { useMarkRead, useNotifications } from '../hooks/useBuyer'

const ICON = { ORDER: Package, FINANCE: Wallet, SYSTEM: Sparkles }
const TONE = { ORDER: 'bg-teal-soft text-teal', FINANCE: 'bg-mint text-[#0f5132]', SYSTEM: 'bg-violet-soft text-violet' }

/** MP 014 · Trung Tâm Thông Báo */
export function NotificationsPage() {
  const q = useNotifications()
  const mark = useMarkRead()
  const [tab, setTab] = useState<'' | 'unread' | NotificationKind>('')
  useEffect(() => {
    document.title = 'Thông báo · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((n) => (tab === 'unread' ? !n.read : !tab || n.kind === tab))

  return (
    <>
      <MockNotice api="GET /api/notifications" />
      <Hero
        code="MP 014"
        eyebrow="Trung tâm thông báo"
        title="Thông Báo Hệ Thống"
        accent="Cập Nhật Thời Gian Thực."
        actions={
          <Btn icon={CheckCheck} variant="white" onClick={() => mark.mutate(undefined)}>
            Đánh dấu tất cả đã đọc
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            { value: 'unread', label: 'Chưa đọc', count: all.filter((n) => !n.read).length },
            { value: 'ORDER', label: 'Đơn hàng & giao vận' },
            { value: 'FINANCE', label: 'Tài chính & ví' },
            { value: 'SYSTEM', label: 'Hệ thống & AI Studio' },
          ]}
        />
      </Toolbar>
      <div className="mt-6 space-y-3">
        <QueryState isLoading={q.isLoading} error={q.error}>
          {!rows.length ? (
            <StatusBlock tone="empty" title="Không có thông báo" body="Bạn đã xem hết thông báo trong mục này." />
          ) : (
            rows.map((n) => {
              const Icon = ICON[n.kind] ?? Bell
              return (
                <article key={n.id} className={`flex gap-4 rounded-[1.75rem] p-5 shadow-soft ${n.read ? 'bg-white/80' : 'bg-white ring-2 ring-violet/30'}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${TONE[n.kind]}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-ink-soft">{n.body}</p>
                    <p className="mt-1 font-label text-xs text-ink-soft">{formatDateTime(n.at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {n.link && (
                      <Link to={n.link} className="font-label text-xs font-semibold text-violet">
                        Xem →
                      </Link>
                    )}
                    {!n.read && (
                      <button type="button" onClick={() => mark.mutate(n.id)} className="font-label text-xs text-ink-soft hover:text-ink">
                        Đã đọc
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </QueryState>
      </div>
    </>
  )
}
