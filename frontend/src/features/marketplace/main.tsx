import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
<<<<<<< HEAD:frontend/src/features/marketplace/main.tsx
import { ComingSoon } from '../../shared/ComingSoon'

// TODO(Marketplace): thay trang tạm bằng ứng dụng Marketplace. Route con /marketplace/<slug> cũng trỏ về file này.
const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Missing #root element for Marketplace.')

createRoot(rootElement).render(
  <StrictMode>
    <ComingSoon
      module="marketplace"
      title="Marketplace"
      body="Sản phẩm in 3D do 3DWorld thiết kế và sản xuất. Module đang được phát triển."
      accent="#FFE58F"
      todo={[
        'Frontend: code trong frontend/src/features/marketplace (entry: frontend/marketplace/index.html).',
        'Backend: thêm controller dưới /api/marketplace trong package com.threedworld.marketplace.',
        'Ảnh sản phẩm: dùng StorageService (Cloudinary) như AI/Studio, URL lưu ở Supabase.',
      ]}
    />
=======
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../app/providers/AppProviders'
import { MarketplaceLayout } from '../features/marketplace/components/MarketplaceLayout'
import { StatusBlock } from '../shared/ui/StatusBlock'
import { CartPage } from '../features/marketplace/pages/CartPage'
import { CatalogPage } from '../features/marketplace/pages/CatalogPage'
import { CheckoutPage } from '../features/marketplace/pages/CheckoutPage'
import { HomePage } from '../features/marketplace/pages/HomePage'
import { ProductDetailPage } from '../features/marketplace/pages/ProductDetailPage'
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
>>>>>>> 1fc0e32357a9aa864933cad3201aa7a66639e148:frontend/src/marketplace/main.tsx
  </StrictMode>,
)
