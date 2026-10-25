import { type ReactNode, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AddressesPage } from '../account/pages/AddressesPage'
import { BankAccountsPage } from '../account/pages/BankAccountsPage'
import { ProfilePage } from '../account/pages/ProfilePage'
import { CancelOrderPage } from '../buyer/pages/CancelOrderPage'
import { NewReportPage } from '../buyer/pages/NewReportPage'
import { ReportDetailPage } from '../buyer/pages/ReportDetailPage'
import { ReportsPage } from '../buyer/pages/ReportsPage'
import { ModelDetailPage } from '../models/pages/ModelDetailPage'
import { ProductQueuePage, ProductReviewPage, ReportQueuePage, ReportReviewPage } from '../ops/pages/ModerationPages'
import { UserAdminDetailPage, UsersAdminPage } from '../ops/pages/UserAuditPages'
import { StorefrontQueuePage, StorefrontReviewPage } from '../ops/pages/VerificationPages'
import { InventoryPage } from '../seller/pages/InventoryPage'
import { ProductEditorPage } from '../seller/pages/ProductEditorPage'
import { SellerDashboardPage } from '../seller/pages/SellerDashboardPage'
import { SellerProductDetailPage } from '../seller/pages/SellerProductDetailPage'
import { SellerProductsPage } from '../seller/pages/SellerProductsPage'
import { SellerRegisterPage } from '../seller/pages/SellerRegisterPage'
import { StorefrontProfilePage } from '../seller/pages/StorefrontProfilePage'
import { SubscriptionPage } from '../seller/pages/SubscriptionPage'
import { ModelLibraryPage } from '../models/pages/ModelLibraryPage'
import { ModelUploadPage } from '../models/pages/ModelUploadPage'
import { ModelVersionsPage } from '../models/pages/ModelVersionsPage'
import { MyOrdersPage } from '../orders/pages/MyOrdersPage'
import { OrderDetailPage } from '../orders/pages/OrderDetailPage'
import { OrderTrackingPage } from '../orders/pages/OrderTrackingPage'
import { RefundRequestPage } from '../orders/pages/RefundRequestPage'
import { SellerOrderDetailPage } from '../orders/pages/SellerOrderDetailPage'
import { SellerOrdersPage } from '../orders/pages/SellerOrdersPage'
import { SellerShipmentDetailPage } from '../orders/pages/SellerShipmentDetailPage'
import { SellerShipmentsPage } from '../orders/pages/SellerShipmentsPage'
import { ErrorScreen } from '../../shared/ui/ErrorScreen'
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
  { path: 'orders/:orderId/cancel', element: <CancelOrderPage /> },
  { path: 'refunds', element: <RefundRequestPage /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'reports/new', element: <NewReportPage /> },
  { path: 'reports/:reportId', element: <ReportDetailPage /> },
  { path: 'seller', element: <SellerDashboardPage /> },
  { path: 'seller/register', element: <SellerRegisterPage /> },
  { path: 'seller/storefront', element: <StorefrontProfilePage /> },
  { path: 'seller/subscription', element: <SubscriptionPage /> },
  { path: 'seller/products', element: <SellerProductsPage /> },
  { path: 'seller/products/new', element: <ProductEditorPage /> },
  { path: 'seller/products/:productId', element: <SellerProductDetailPage /> },
  { path: 'seller/products/:productId/edit', element: <ProductEditorPage /> },
  { path: 'seller/inventory', element: <InventoryPage /> },
  { path: 'ops/products', element: <ProductQueuePage /> },
  { path: 'ops/products/:caseId', element: <ProductReviewPage /> },
  { path: 'ops/reports', element: <ReportQueuePage /> },
  { path: 'ops/reports/:caseId', element: <ReportReviewPage /> },
  { path: 'ops/storefronts', element: <StorefrontQueuePage /> },
  { path: 'ops/storefronts/:caseId', element: <StorefrontReviewPage /> },
  { path: 'ops/users', element: <UsersAdminPage /> },
  { path: 'ops/users/:caseId', element: <UserAdminDetailPage /> },
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
