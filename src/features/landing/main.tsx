/**
 * [Giải thích] Điểm khởi động trang Landing: render <App/> vào #root.
 * Ngoại lệ: URL /payment-result (ZaloPay trả về) được chuyển sang trang kết quả thanh toán.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '../../app/providers/AppProviders'
import './landing.css'
import App from './App'

// ZALOPAY_REDIRECT_URL của Backend trỏ về /payment-result → chuyển sang trang kết quả, giữ tham số ZaloPay.
if (/^\/payment-result\/?$/.test(location.pathname)) {
  location.replace(`/marketplace/payment/result${location.search}`)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
}
