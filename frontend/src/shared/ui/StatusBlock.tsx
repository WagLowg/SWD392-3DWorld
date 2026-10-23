import { CloudOff, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  tone: 'empty' | 'error'
  title: string
  body: string
  action?: ReactNode
}

export function StatusBlock({ tone, title, body, action }: Props) {
  const Icon = tone === 'error' ? CloudOff : SearchX
  return (
    <div className="flex flex-col items-center rounded-[2rem] bg-white px-6 py-16 text-center shadow-soft">
      <div
        className={`grid h-20 w-20 place-items-center rounded-full ${tone === 'error' ? 'bg-peach text-orange-deep' : 'bg-violet-soft text-violet'}`}
      >
        <Icon size={30} />
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
