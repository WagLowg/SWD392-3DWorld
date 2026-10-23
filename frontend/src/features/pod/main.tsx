import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ComingSoon } from '../../shared/ComingSoon'

// TODO(POD): thay trang tạm bằng ứng dụng In 3D theo yêu cầu.
const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Missing #root element for POD.')

createRoot(rootElement).render(
  <StrictMode>
    <ComingSoon
      module="pod"
      title="In 3D theo yêu cầu"
      body="Tải mô hình, cấu hình, nhận báo giá và đặt in. Module đang được phát triển."
      accent="#98DFFF"
      todo={[
        'Frontend: code trong frontend/src/features/pod (entry: frontend/pod/index.html).',
        'Yêu cầu in từ AI Studio và 3D Studio đã được lưu chung ở bảng print_requests (cột source = AI | STUDIO).',
        'Backend: thêm báo giá / thanh toán dưới /api/pod trong package com.threedworld.pod.',
      ]}
    />
  </StrictMode>,
)
