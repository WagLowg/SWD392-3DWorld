import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '../../../shared/ui/toast'
import { StaffSidebar } from './StaffSidebar'

export function StaffLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#FFF7EC] via-[#FFF2E5] to-[#FFE2CC] font-body text-ink antialiased">
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <StaffSidebar />
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  )
}
