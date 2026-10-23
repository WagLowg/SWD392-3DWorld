import { type ReactNode, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AddressesPage } from '../features/account/pages/AddressesPage'
import { BankAccountsPage } from '../features/account/pages/BankAccountsPage'
import { ProfilePage } from '../features/account/pages/ProfilePage'
import { ModelDetailPage } from '../features/models/pages/ModelDetailPage'
import { ModelLibraryPage } from '../features/models/pages/ModelLibraryPage'
import { ModelUploadPage } from '../features/models/pages/ModelUploadPage'
import { ModelVersionsPage } from '../features/models/pages/ModelVersionsPage'
import { MyOrdersPage } from '../features/orders/pages/MyOrdersPage'
import { OrderDetailPage } from '../features/orders/pages/OrderDetailPage'
import { OrderTrackingPage } from '../features/orders/pages/OrderTrackingPage'
import { RefundRequestPage } from '../features/orders/pages/RefundRequestPage'
import { SellerOrderDetailPage } from '../features/orders/pages/SellerOrderDetailPage'
import { SellerOrdersPage } from '../features/orders/pages/SellerOrdersPage'
import { SellerShipmentDetailPage } from '../features/orders/pages/SellerShipmentDetailPage'
import { SellerShipmentsPage } from '../features/orders/pages/SellerShipmentsPage'
import { ErrorScreen } from '../shared/ui/ErrorScreen'
import { AccountLayout, AccountTabs, RequireUser } from './components/AccountLayout'
import { PortalShell } from './components/PortalShell'
import { OverviewPage } from './pages/OverviewPage'
import { ScreenPage } from './pages/ScreenPage'
import { internalScreens, relativePortalRoute } from './requirements'

/** Màn đã làm thật (Stitch nhóm 1) — không render skeleton FRD cho các route này. */
const ACCOUNT_ROUTES: { path: string; element: ReactNode }[] = [
  { path: 'profile', element: <ProfilePage /> },
  { path: 'addresses', element: <AddressesPage /> },
  { path: 'bank-accounts', element: <BankAccountsPage /> },
  { path: 'orders', element: <MyOrdersPage /> },
  { path: 'orders/:orderId', element: <OrderDetailPage /> },
  { path: 'orders/:orderId/tracking', element: <OrderTrackingPage /> },
  { path: 'refunds', element: <RefundRequestPage /> },
  { path: 'seller/orders', element: <SellerOrdersPage /> },
  { path: 'seller/orders/:orderId', element: <SellerOrderDetailPage /> },
  { path: 'seller/shipments', element: <SellerShipmentsPage /> },
  { path: 'seller/shipments/:orderId', element: <SellerShipmentDetailPage /> },
  { path: 'models', element: <ModelLibraryPage /> },
  { path: 'models/upload', element: <ModelUploadPage /> },
  { path: 'models/:modelId', element: <ModelDetailPage /> },
  { path: 'models/:modelId/versions', element: <ModelVersionsPage /> },
]

const IMPLEMENTED = new Set([
  ...ACCOUNT_ROUTES.map((r) => r.path.split('/:')[0]),
  'models/demo-model',
  'cart',
  'checkout',
])

/** Giỏ hàng / thanh toán đã chuyển sang Marketplace. */
function Redirect({ to }: { to: string }) {
  useEffect(() => location.replace(to), [to])
  return null
}

function AccountPage({ children }: { children: ReactNode }) {
  return (
    <RequireUser>
      <AccountTabs />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">{children}</div>
    </RequireUser>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AccountLayout />}>
        {ACCOUNT_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<AccountPage>{r.element}</AccountPage>} />
        ))}
        {/* Xem trước các màn lỗi chung (MP 017 / MP-103 / MP-104) */}
        <Route path="error/403" element={<ErrorScreen kind="403" />} />
        <Route path="error/503" element={<ErrorScreen kind="503" />} />
        <Route path="error/session-expired" element={<ErrorScreen kind="session" />} />
        <Route path="cart" element={<Redirect to="/marketplace/cart" />} />
        <Route path="checkout" element={<Redirect to="/marketplace/checkout" />} />
      </Route>

      {/* Bản đồ FRD cho các nghiệp vụ còn lại */}
      <Route element={<PortalShell />}>
        <Route index element={<OverviewPage />} />
        {internalScreens
          .filter((screen) => !IMPLEMENTED.has(relativePortalRoute(screen.route)))
          .map((screen) => (
            <Route key={screen.id} path={relativePortalRoute(screen.route)} element={<ScreenPage screen={screen} />} />
          ))}
      </Route>

      {/* MP 018 · 404 */}
      <Route element={<AccountLayout />}>
        <Route path="*" element={<ErrorScreen kind="404" />} />
      </Route>
    </Routes>
  )
}
