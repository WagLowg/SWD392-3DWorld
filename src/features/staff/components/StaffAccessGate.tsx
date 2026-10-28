import { useEffect, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { goLogin, hasStoredSession } from '../../../shared/session/session'
import { useSession } from '../../../shared/session/useSession'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { LoginRequired } from '../../../shared/ui/LoginRequired'

/**
 * Cổng kiểm soát quyền truy cập phân hệ Staff (Frontend Route Protection).
 *
 * Tiêu chí thẩm định:
 * - Khách vãng lai (Guest): Chuyển hướng tới trang /login/?next=... bảo lưu đích đến an toàn.
 * - Phiên hết hạn (Session Expired): Hiển thị ErrorScreen kind="session".
 * - Người dùng chỉ có quyền CUSTOMER / SELLER / ADMIN (không có PRINT_STAFF): Hiển thị ErrorScreen kind="403".
 * - Người dùng có quyền PRINT_STAFF (độc lập hoặc kết hợp CUSTOMER + PRINT_STAFF): Cho phép truy cập.
 */
export function StaffAccessGate({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const { data: user, isLoading } = useSession()

  // Chuyển hướng khách chưa đăng nhập sang màn login kèm đường dẫn đầy đủ (/portal/staff...)
  useEffect(() => {
    if (!isLoading && !user && !hasStoredSession()) {
      const fullPath = location.pathname.startsWith('/portal')
        ? location.pathname
        : `/portal${location.pathname}`
      goLogin(fullPath + location.search)
    }
  }, [isLoading, user, location])

  // Tránh nhấp nháy giao diện khi đang nạp phiên
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-4 px-4 py-8 md:px-8">
        <div className="h-24 animate-pulse rounded-[2rem] bg-white/70" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 animate-pulse rounded-[1.75rem] bg-white/70" />
          <div className="h-28 animate-pulse rounded-[1.75rem] bg-white/70" />
          <div className="h-28 animate-pulse rounded-[1.75rem] bg-white/70" />
          <div className="h-28 animate-pulse rounded-[1.75rem] bg-white/70" />
        </div>
        <div className="h-72 animate-pulse rounded-[2rem] bg-white/70" />
      </div>
    )
  }

  // Chưa có phiên đăng nhập
  if (!user) {
    if (hasStoredSession()) {
      return <ErrorScreen kind="session" />
    }
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-12 md:px-8">
        <LoginRequired
          title="Đăng nhập tài khoản Staff"
          body="Khu vực này yêu cầu tài khoản nhân viên vận hành (PRINT_STAFF). Đang chuyển hướng sang trang đăng nhập..."
        />
      </div>
    )
  }

  // Kiểm tra vai trò PRINT_STAFF
  const roles = user.roles ?? (user.role ? [user.role] : [])
  const isPrintStaff = roles.includes('PRINT_STAFF')

  if (!isPrintStaff) {
    return <ErrorScreen kind="403" />
  }

  return <>{children ?? <Outlet />}</>
}
