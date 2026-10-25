import { ArrowRight, CheckCircle2, CircleAlert, Database, LoaderCircle, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PodScreenDefinition } from '../types'

export function ApiBadge({ state }: { state: PodScreenDefinition['apiState'] }) {
  const labels = {
    connected: 'API đã kết nối',
    partial: 'API kết nối một phần',
    missing: 'Giao diện chờ API',
    'shared-auth': 'Dùng Auth chung',
  }
  return <span className={`pod-api-badge is-${state}`}><Database size={13} /> {labels[state]}</span>
}

export function PageHero({ screen, action }: { screen: PodScreenDefinition; action?: ReactNode }) {
  return (
    <section className="pod-page-hero">
      <div>
        <div className="pod-eyebrow"><span>POD {String(screen.id).padStart(3, '0')}</span> · {screen.eyebrow}</div>
        <h1>{screen.title}</h1>
        <p>{screen.description}</p>
        <ApiBadge state={screen.apiState} />
      </div>
      {action && <div className="pod-hero-action">{action}</div>}
    </section>
  )
}

export function Panel({ title, hint, children, className = '' }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return <section className={`pod-panel ${className}`}>{(title || hint) && <header><div><h2>{title}</h2>{hint && <p>{hint}</p>}</div></header>}{children}</section>
}

export function Metric({ icon, label, value, note }: { icon?: ReactNode; label: string; value: string; note?: string }) {
  return <article className="pod-metric"><span className="pod-metric-icon">{icon ?? <ShieldCheck size={20} />}</span><div><small>{label}</small><strong>{value}</strong>{note && <p>{note}</p>}</div></article>
}

export function StateBlock({ state, title, body }: { state: 'loading' | 'error' | 'empty' | 'success'; title: string; body: string }) {
  const Icon = state === 'loading' ? LoaderCircle : state === 'error' ? CircleAlert : state === 'success' ? CheckCircle2 : Database
  return <div className={`pod-state is-${state}`}><Icon className={state === 'loading' ? 'spin' : ''} /><div><strong>{title}</strong><p>{body}</p></div></div>
}

export function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="pod-primary" to={to}>{children}<ArrowRight size={17} /></Link>
}

export function StatusPill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate' }) {
  return <span className={`pod-status is-${tone}`}>{children}</span>
}
