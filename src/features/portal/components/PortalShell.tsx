import { Box, ExternalLink, Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { MODULES } from '../../../shared/config/modules'
import { useUiStore } from '../../../shared/stores/ui.store'
import { features } from '../requirements'

export function PortalShell() {
  const menuOpen = useUiStore((state) => state.mobileNavigationOpen)
  const setMenuOpen = useUiStore((state) => state.setMobileNavigationOpen)

  return (
    <div className="portal-layout">
      <aside className={`portal-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <a className="brand" href="/" aria-label="Về landing page">
            <span className="brand-mark">
              <Box size={19} />
            </span>
            <span>
              3DWorld<small>Product Portal</small>
            </span>
          </a>
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="portal-nav" aria-label="Các nhóm nghiệp vụ">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            Tổng quan FRD
          </NavLink>
          {features.map((feature) => {
            const target = feature.screens.find((item) => item.route.startsWith('/portal/'))
            if (!target) return null
            return (
              <NavLink key={feature.id} to={target.route.replace('/portal', '')} onClick={() => setMenuOpen(false)}>
                <span>{feature.title}</span>
                <span className="portal-nav__wave">{feature.wave}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span>Module đang có</span>
          {MODULES.map((module) => (
            <a href={module.href} key={module.id}>
              <span>
                {module.label}
                {module.ready ? '' : ' · skeleton'}
              </span>
              <ExternalLink size={13} />
            </a>
          ))}
        </div>
      </aside>

      <div className="portal-content">
        <header className="portal-topbar">
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <strong>FRD v1.2</strong>
            <span>23/10/2026 · ERD aligned</span>
          </div>
          <a className="topbar-link" href="/">
            Về trang chủ
          </a>
        </header>
        <main className="portal-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
