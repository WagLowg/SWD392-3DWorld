import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from './config/routes'
import LandingPage from './landing/LandingPage'

const FeaturePage = lazy(() => import('./pages/FeaturePage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route path={ROUTES.aiStudio} element={<FeaturePage />} />
          <Route path={ROUTES.studio3d} element={<FeaturePage />} />
          <Route path={ROUTES.marketplace} element={<FeaturePage />} />
          <Route path="/marketplace/:slug" element={<FeaturePage />} />
          <Route path={ROUTES.printOnDemand} element={<FeaturePage />} />
          <Route path={ROUTES.signIn} element={<FeaturePage />} />
          <Route path="*" element={<FeaturePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
