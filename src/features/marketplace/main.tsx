import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../app/providers/AppProviders'
import { StatusBlock } from '../../shared/ui/StatusBlock'
import { MarketplaceLayout } from './components/MarketplaceLayout'
import { CartPage } from './pages/CartPage'
import { CatalogPage } from './pages/CatalogPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import './marketplace.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Không tìm thấy phần tử #root để khởi tạo Marketplace.')

/**
 * Route (basename /marketplace — xem moduleFallback trong vite.config.ts):
 *   /            MP 001 Trang chủ Chợ Đồ Chơi
 *   /products    MP 002 Danh sách + bộ lọc
 *   /:productId  MP 003 Chi tiết sản phẩm
 *   /cart        MP 020 Giỏ hàng vật lý
 *   /checkout    MP 021 Đặt hàng & thanh toán đa xưởng (?items=1,2)
 */
createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter basename="/marketplace">
        <MarketplaceLayout>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="products" element={<CatalogPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path=":productId" element={<ProductDetailPage />} />
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-[1320px] px-4 md:px-8">
                  <StatusBlock
                    tone="empty"
                    title="Không tìm thấy trang"
                    body="Đường dẫn này không tồn tại trong Chợ Đồ Chơi."
                    action={
                      <Link
                        to="/"
                        className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                      >
                        Về Chợ Đồ Chơi
                      </Link>
                    }
                  />
                </div>
              }
            />
          </Routes>
        </MarketplaceLayout>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
