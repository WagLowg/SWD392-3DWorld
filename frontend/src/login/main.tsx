import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../app/providers/AppProviders'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage'
import { ErrorScreen } from '../shared/ui/ErrorScreen'
import './login.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Không tìm thấy phần tử #root để khởi tạo trang đăng nhập.')

/**
 * Trang tài khoản dùng chung (basename /login):
 *   /                 MP 007 Đăng nhập (?next=…)
 *   /register         MP 005 Đăng ký
 *   /verify-email     MP 006 Xác thực email (?email&token từ link email)
 *   /forgot-password  MP 008 Quên mật khẩu
 *   /reset-password   MP 009 Đặt lại mật khẩu (?email&token)
 * Link email của Backend = {APP_BASE_URL}/verify-email | /reset-password → đặt APP_BASE_URL=<origin>/login.
 */
createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter basename="/login">
        <Routes>
          <Route index element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-gradient-to-b from-[#FFF7EC] to-[#FFE2CC] py-10 font-body text-ink">
                <ErrorScreen kind="404" />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
