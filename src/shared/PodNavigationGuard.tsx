import { useEffect, useState } from 'react'
import { POD_NAVIGATION_ENABLED } from './modules'

const POD_PATH = /^\/pod(?:\/|$)/

/** Giữ nguyên link POD trong UI nhưng chặn chuyển trang khi module chưa sẵn sàng. */
export function PodNavigationGuard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (POD_NAVIGATION_ENABLED) return

    const blockPodLink = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin || !POD_PATH.test(destination.pathname)) return

      event.preventDefault()
      event.stopPropagation()
      setVisible(true)
    }

    document.addEventListener('click', blockPodLink, true)
    return () => document.removeEventListener('click', blockPodLink, true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const timeout = window.setTimeout(() => setVisible(false), 4500)
    return () => window.clearTimeout(timeout)
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        zIndex: 10000,
        left: '50%',
        bottom: 24,
        display: 'flex',
        maxWidth: 'calc(100vw - 32px)',
        transform: 'translateX(-50%)',
        alignItems: 'center',
        gap: 14,
        border: '1px solid rgba(255,255,255,.16)',
        borderRadius: 18,
        background: '#202027',
        padding: '13px 14px 13px 18px',
        color: '#fff',
        boxShadow: '0 18px 55px rgba(20,18,28,.28)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>Tính năng đang phát triển</strong>
        <span style={{ display: 'block', marginTop: 3, color: 'rgba(255,255,255,.72)', fontSize: 12 }}>
          Đặt In 3D (POD) sẽ được mở trong buổi demo sau.
        </span>
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Đóng thông báo"
        style={{
          flex: 'none',
          border: 0,
          borderRadius: 999,
          background: '#f47a2a',
          padding: '8px 12px',
          color: '#fff',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Đã hiểu
      </button>
    </div>
  )
}
