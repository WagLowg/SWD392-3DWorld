import { Route, Routes } from 'react-router-dom'
import { PortalShell } from './components/PortalShell'
import { internalScreens, relativePortalRoute } from './requirements'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { ScreenPage } from './pages/ScreenPage'

export function App() {
  return (
    <Routes>
      <Route element={<PortalShell />}>
        <Route index element={<OverviewPage />} />
        {internalScreens.map((screen) => (
          <Route key={screen.id} path={relativePortalRoute(screen.route)} element={<ScreenPage screen={screen} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
