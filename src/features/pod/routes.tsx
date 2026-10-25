import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PodShell } from './components/PodShell'
import { AddressesPage, ProfilePage } from './pages/AccountPages'
import { GenericPage } from './pages/GenericPage'
import { HomePage } from './pages/HomePage'
import { MaterialsPage } from './pages/MaterialsPage'
import { ReportNewPage } from './pages/ReportPage'
import { RequestDetailPage, RequestListPage, RequestRevisePage } from './pages/RequestPages'

function SharedAuth({ target }: { target: string }) {
  const location = useLocation()
  useEffect(() => { window.location.replace(`/login${target}${location.search}`) }, [location.search, target])
  return <div className="pod-page"><div className="pod-state is-loading">Đang chuyển tới cổng tài khoản 3DWorld dùng chung...</div></div>
}

export function PodApp() {
  return <PodShell><Routes>
    <Route index element={<HomePage />} />
    <Route path="how-it-works" element={<GenericPage id={2} />} />
    <Route path="materials" element={<MaterialsPage />} />
    <Route path="help" element={<GenericPage id={4} />} />

    <Route path="auth/register" element={<SharedAuth target="/register" />} />
    <Route path="auth/verify-email" element={<SharedAuth target="/verify-email" />} />
    <Route path="auth/login" element={<SharedAuth target="" />} />
    <Route path="auth/forgot-password" element={<SharedAuth target="/forgot-password" />} />
    <Route path="auth/reset-password" element={<SharedAuth target="/reset-password" />} />

    <Route path="account" element={<ProfilePage />} />
    <Route path="account/security" element={<GenericPage id={11} />} />
    <Route path="account/addresses" element={<AddressesPage />} />
    <Route path="notifications" element={<GenericPage id={13} />} />
    <Route path="403" element={<GenericPage id={14} />} />
    <Route path="404" element={<GenericPage id={15} />} />

    <Route path="requests" element={<RequestListPage />} />
    <Route path="requests/new" element={<Navigate to="/" replace />} />
    <Route path="requests/:requestId/revise" element={<RequestRevisePage />} />
    <Route path="requests/:requestId/log" element={<GenericPage id={33} />} />
    <Route path="requests/:requestId" element={<RequestDetailPage />} />
    <Route path="quotes/:quoteId" element={<GenericPage id={19} />} />
    <Route path="orders" element={<GenericPage id={20} />} />
    <Route path="orders/:requestId/production" element={<GenericPage id={22} />} />
    <Route path="orders/:requestId/payment" element={<GenericPage id={23} />} />
    <Route path="orders/:requestId/shipping" element={<GenericPage id={24} />} />
    <Route path="orders/:requestId/complete" element={<GenericPage id={30} />} />
    <Route path="orders/:requestId" element={<GenericPage id={21} />} />

    <Route path="payments" element={<GenericPage id={26} />} />
    <Route path="payments/:transactionId" element={<GenericPage id={25} />} />
    <Route path="claims" element={<GenericPage id={27} />} />
    <Route path="claims/new" element={<GenericPage id={28} />} />
    <Route path="claims/:claimId" element={<GenericPage id={29} />} />
    <Route path="reports/new" element={<ReportNewPage />} />
    <Route path="reports/:reportId" element={<GenericPage id={32} />} />

    <Route path="staff" element={<GenericPage id={34} />} />
    <Route path="staff/reviews" element={<GenericPage id={35} />} />
    <Route path="staff/reviews/:requestId/decision" element={<GenericPage id={37} />} />
    <Route path="staff/reviews/:requestId" element={<GenericPage id={36} />} />
    <Route path="staff/quotes" element={<GenericPage id={38} />} />
    <Route path="staff/quotes/new" element={<GenericPage id={39} />} />
    <Route path="staff/quotes/:quoteId" element={<GenericPage id={40} />} />
    <Route path="staff/requests/:requestId" element={<GenericPage id={41} />} />
    <Route path="staff/production" element={<GenericPage id={42} />} />
    <Route path="staff/production/:requestId/update" element={<GenericPage id={44} />} />
    <Route path="staff/production/:requestId" element={<GenericPage id={43} />} />
    <Route path="*" element={<GenericPage id={15} />} />
  </Routes></PodShell>
}
