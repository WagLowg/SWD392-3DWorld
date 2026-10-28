import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { StaffSidebar } from './StaffSidebar'

export function StaffLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      <StaffSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

