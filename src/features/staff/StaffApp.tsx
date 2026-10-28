import { Route, Routes } from 'react-router-dom'
import { StaffAccessGate } from './components/StaffAccessGate'
import { StaffLayout } from './components/StaffLayout'
import { StaffDashboardPage } from './pages/StaffDashboardPage'
import { StaffRefundDetailPage } from './pages/StaffRefundDetailPage'
import { StaffRefundListPage } from './pages/StaffRefundListPage'
import { StaffShippingDetailPage } from './pages/StaffShippingDetailPage'
import { StaffShippingListPage } from './pages/StaffShippingListPage'

export function StaffApp() {
  return (
    <Routes>
      <Route
        element={
          <StaffAccessGate>
            <StaffLayout />
          </StaffAccessGate>
        }
      >
        <Route index element={<StaffDashboardPage />} />
        <Route path="shipments" element={<StaffShippingListPage />} />
        <Route path="shipments/:shipmentId" element={<StaffShippingDetailPage />} />
        <Route path="refunds" element={<StaffRefundListPage />} />
        <Route path="refunds/:refundId" element={<StaffRefundDetailPage />} />
      </Route>
    </Routes>
  )
}

export { StaffAccessGate }
export { StaffLayout }
export { StaffDashboardPage }
export { StaffShippingListPage }
export { StaffShippingDetailPage }
export { StaffRefundListPage }
export { StaffRefundDetailPage }
