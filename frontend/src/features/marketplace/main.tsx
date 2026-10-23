import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
  </StrictMode>,
)
