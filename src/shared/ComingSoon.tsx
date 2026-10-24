import type { ModuleId } from './modules'
import { ModuleSwitcher } from './ModuleSwitcher'

/**
 * Trang tạm cho module chưa làm (Marketplace, POD). Thay bằng ứng dụng thật trong src/<module>/main.tsx.
 */
export function ComingSoon({ module, title, body, accent, todo }: { module: ModuleId; title: string; body: string; accent: string; todo: string[] }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#202027', fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 20px', maxWidth: 1080, margin: '0 auto' }}>
        <a href="/" style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, color: '#202027', textDecoration: 'none' }}>3DWorld</a>
        <ModuleSwitcher current={module} theme="light" />
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 20px' }}>
        <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: accent, fontSize: 12, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase' }}>
          Sắp ra mắt
        </span>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 'clamp(44px, 9vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.04em', margin: '24px 0 16px' }}>{title}</h1>
        <p style={{ fontSize: 18, maxWidth: 560, color: '#55556a', margin: 0 }}>{body}</p>
        <ul style={{ marginTop: 32, padding: 20, borderRadius: 20, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,.05)', maxWidth: 560, color: '#55556a', fontSize: 14, lineHeight: 1.7 }}>
          {todo.map((t) => <li key={t} style={{ marginLeft: 16 }}>{t}</li>)}
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <a href="/ai/" style={{ padding: '12px 20px', borderRadius: 999, background: '#202027', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Thử AI Studio</a>
          <a href="/studio/" style={{ padding: '12px 20px', borderRadius: 999, background: '#fff', color: '#202027', fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}>Mở 3D Studio</a>
        </div>
      </main>
    </div>
  )
}
