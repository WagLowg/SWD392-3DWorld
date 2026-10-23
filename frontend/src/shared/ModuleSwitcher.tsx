import type { CSSProperties } from 'react'
import { MODULES, HOME_HREF, type ModuleId } from './modules'

/**
 * Thanh chuyển module dùng chung cho header của AI Studio / 3D Studio / Marketplace / POD.
 * Dùng style inline để không phụ thuộc CSS riêng của từng module.
 */
export function ModuleSwitcher({ current, theme = 'dark', compact = false }: { current: ModuleId; theme?: 'dark' | 'light'; compact?: boolean }) {
  const dark = theme === 'dark'
  const wrap: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999,
    background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
    border: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'}`,
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
  }
  const item = (active: boolean): CSSProperties => ({
    padding: '7px 11px', borderRadius: 999, textDecoration: 'none', transition: 'background .15s, color .15s',
    color: active ? (dark ? '#0B0E14' : '#fff') : dark ? 'rgba(235,238,245,.72)' : 'rgba(32,32,39,.7)',
    background: active ? (dark ? 'linear-gradient(135deg,#72D6F7,#A78BFA)' : '#202027') : 'transparent',
  })
  return (
    <nav aria-label="Chuyển module 3DWorld" style={wrap}>
      <a href={HOME_HREF} style={item(false)} title="Trang chủ 3DWorld">⌂</a>
      {MODULES.map((m) => (
        <a key={m.id} href={m.href} style={item(m.id === current)} aria-current={m.id === current ? 'page' : undefined}
          title={m.ready ? m.label : `${m.label} · sắp ra mắt`}>
          {compact ? m.short : m.label}
        </a>
      ))}
    </nav>
  )
}
