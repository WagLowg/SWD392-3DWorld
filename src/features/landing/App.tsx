import { BrowserRouter } from 'react-router-dom'
import LandingPage from './landing/LandingPage'

/** Trang chủ (Landing). Các module khác là trang riêng: /ai/, /studio/, /marketplace/, /pod/, /login/. */
export default function App() {
  return (
    <BrowserRouter>
      <LandingPage />
    </BrowserRouter>
  )
}
