import type { PodScreenDefinition } from './types'

const s = (
  id: number,
  route: string,
  title: string,
  eyebrow: string,
  description: string,
  group: PodScreenDefinition['group'],
  apiState: PodScreenDefinition['apiState'],
): PodScreenDefinition => ({ id, route, title, eyebrow, description, group, apiState })

export const podScreens: PodScreenDefinition[] = [
  s(1, '/', 'Khởi Tạo Ý Tưởng. Chúng Tôi In Hoàn Hảo.', 'Trang chủ Print on Demand', 'Tải tệp 3D, chọn vật liệu và gửi yêu cầu thẩm định tới xưởng chế tác.', 'public', 'connected'),
  s(2, '/how-it-works', 'Quy Trình Chế Tác In 3D', 'Minh bạch từng giai đoạn', 'Từ kiểm tra tệp, báo giá, ký quỹ đến Micro-QC và vận chuyển.', 'public', 'missing'),
  s(3, '/materials', 'Vật Liệu Chuẩn Xưởng', 'Kho nguyên vật liệu', 'So sánh công nghệ FDM, SLA và SLS theo mục đích chế tác.', 'public', 'connected'),
  s(4, '/help', 'Hỗ Trợ & Chính Sách', 'Trung tâm trợ giúp', 'Tiêu chuẩn tệp, hiệu lực báo giá, thanh toán và bảo hành.', 'public', 'missing'),
  s(5, '/auth/register', 'Đăng Ký Tài Khoản', 'Một tài khoản 3DWorld', 'Dùng chung luồng đăng ký đã kết nối backend.', 'account', 'shared-auth'),
  s(6, '/auth/verify-email', 'Xác Thực Địa Chỉ Email', 'Kích hoạt tài khoản', 'Dùng chung luồng xác thực email của 3DWorld.', 'account', 'shared-auth'),
  s(7, '/auth/login', 'Đăng Nhập 3DWorld', 'Cổng truy cập POD', 'Dùng chung phiên đăng nhập giữa POD, Marketplace, AI và Studio.', 'account', 'shared-auth'),
  s(8, '/auth/forgot-password', 'Khôi Phục Mật Khẩu', 'Bảo mật tài khoản', 'Nhận liên kết đặt lại mật khẩu có thời hạn.', 'account', 'shared-auth'),
  s(9, '/auth/reset-password', 'Thiết Lập Mật Khẩu Mới', 'Bảo mật tài khoản', 'Thiết lập mật khẩu mới từ token một lần.', 'account', 'shared-auth'),
  s(10, '/account', 'Hồ Sơ Tài Khoản Khách Hàng', 'Thông tin cá nhân & quyền in ấn', 'Quản lý hồ sơ dùng chung và tổng quan hoạt động POD.', 'account', 'connected'),
  s(11, '/account/security', 'Bảo Mật Tài Khoản', 'Mật khẩu & phiên đăng nhập', 'Quản lý 2FA, thiết bị và nhật ký bảo mật.', 'account', 'missing'),
  s(12, '/account/addresses', 'Sổ Địa Chỉ Nhận Hàng', 'Giao mô hình an toàn', 'Quản lý địa chỉ và lựa chọn địa chỉ mặc định.', 'account', 'connected'),
  s(13, '/notifications', 'Thông Báo Tiến Trình', 'Cập nhật xưởng theo thời gian thực', 'Theo dõi slicing, ký quỹ, QC và vận chuyển.', 'account', 'missing'),
  s(14, '/403', 'Khu Vực Giới Hạn', 'Lỗi 403', 'Bạn không có quyền truy cập tài nguyên này.', 'system', 'missing'),
  s(15, '/404', 'Tệp In Không Tồn Tại', 'Lỗi 404', 'Đường dẫn hoặc mã đơn in không còn khả dụng.', 'system', 'missing'),
  s(16, '/requests', 'Danh Sách Yêu Cầu In', 'Bản thảo, báo giá & trạng thái', 'Theo dõi hồ sơ từ lúc gửi tệp tới khi khóa sản xuất.', 'request', 'connected'),
  s(17, '/requests/:requestId', 'Chi Tiết Yêu Cầu In', 'Hồ sơ kỹ thuật', 'Xem cấu hình mô hình, vật liệu và trạng thái xử lý.', 'request', 'connected'),
  s(18, '/requests/:requestId/revise', 'Điều Chỉnh Yêu Cầu In', 'Tải phiên bản tệp mới', 'Thay thế file theo góp ý kỹ thuật của xưởng.', 'request', 'connected'),
  s(19, '/quotes/:quoteId', 'Chi Tiết Báo Giá In 3D', 'Báo giá chính thức', 'Bóc tách vật liệu, giờ máy và đặt cọc Escrow.', 'request', 'missing'),
  s(20, '/orders', 'Đơn In Đang Hoạt Động', 'Theo dõi sản xuất', 'Các yêu cầu đã khóa thông số và đang trong chu kỳ chế tác.', 'request', 'partial'),
  s(21, '/orders/:requestId', 'Chi Tiết Đơn In Đang Hoạt Động', 'Locked production order', 'Tiến trình, thông số khóa và linh kiện sản xuất.', 'request', 'partial'),
  s(22, '/orders/:requestId/production', 'Tiến Độ Chế Tác Xưởng', 'Sản xuất thời gian thực', 'Theo dõi từng phôi, máy in và công đoạn hậu kỳ.', 'request', 'missing'),
  s(23, '/orders/:requestId/payment', 'Thanh Toán Đợt 2', 'Tất toán sản xuất', 'Giải ngân số dư sau khi mẫu in vượt Micro-QC.', 'finance', 'partial'),
  s(24, '/orders/:requestId/shipping', 'Vận Chuyển Đơn In', 'Theo dõi kiện hàng', 'Lịch trình giao nhận và bảo hộ bưu phẩm.', 'finance', 'missing'),
  s(25, '/payments/:transactionId', 'Chi Tiết Giao Dịch', 'Đối soát ký quỹ', 'Biên lai, bằng chứng và trạng thái hạch toán.', 'finance', 'partial'),
  s(26, '/payments', 'Lịch Sử Giao Dịch', 'Quản trị ký quỹ', 'Danh sách đặt cọc, tất toán và hoàn tiền.', 'finance', 'missing'),
  s(27, '/claims', 'Khiếu Nại & Đền Bù', 'Bảo vệ quyền lợi in ấn', 'Đối soát sai lệch kỹ thuật so với snapshot báo giá.', 'finance', 'missing'),
  s(28, '/claims/new', 'Tạo Khiếu Nại Kỹ Thuật', 'Bảo hành khuyết tật phôi', 'Gửi bằng chứng và đề xuất phương án xử lý.', 'finance', 'missing'),
  s(29, '/claims/:claimId', 'Chi Tiết Thẩm Định Khiếu Nại', 'Đối soát snapshot', 'Theo dõi bằng chứng, phán quyết và audit trail.', 'finance', 'missing'),
  s(30, '/orders/:requestId/complete', 'Nghiệm Thu Hoàn Tất Đơn In', 'Ký duyệt chất lượng', 'Xác nhận nhận hàng và đánh giá dịch vụ chế tác.', 'finance', 'missing'),
  s(31, '/reports/new', 'Tạo Báo Cáo Vi Phạm', 'Bản quyền & chống gian lận', 'Gửi báo cáo độc lập tới bộ phận kiểm soát.', 'finance', 'partial'),
  s(32, '/reports/:reportId', 'Chi Tiết Báo Cáo Vi Phạm', 'Hồ sơ thẩm tra', 'Theo dõi chứng cứ, trao đổi và kết quả xử lý.', 'finance', 'missing'),
  s(33, '/requests/:requestId/log', 'Nhật Ký Trao Đổi Kỹ Thuật', 'Audit log & evidence', 'Làm rõ dung sai, vật liệu và bằng chứng khắc phục.', 'finance', 'missing'),
  s(34, '/staff', 'Tổng Quan Vận Hành Xưởng', 'Staff POD Portal', 'Giám sát hàng đợi, báo giá và điều phối máy in.', 'staff', 'missing'),
  s(35, '/staff/reviews', 'Hàng Đợi Thẩm Định Tệp In', 'Technical review queue', 'Phân tích DFM, độ dày thành và tính khả thi.', 'staff', 'missing'),
  s(36, '/staff/reviews/:requestId', 'Thẩm Định Kỹ Thuật Tệp In', 'Staff workspace', 'Viewport CAD, thông số hình học và cảnh báo DFM.', 'staff', 'missing'),
  s(37, '/staff/reviews/:requestId/decision', 'Phán Quyết Kỹ Thuật', 'Decision workspace', 'Phê duyệt, yêu cầu sửa hoặc từ chối tiếp nhận.', 'staff', 'missing'),
  s(38, '/staff/quotes', 'Danh Sách Báo Giá Xưởng', 'Workshop quotes', 'Quản lý báo giá và thời hạn bảo lưu 24 giờ.', 'staff', 'missing'),
  s(39, '/staff/quotes/new', 'Thiết Lập Báo Giá Xưởng', 'Create technical quote', 'Bóc tách chi phí vật liệu, giờ máy và ký quỹ.', 'staff', 'missing'),
  s(40, '/staff/quotes/:quoteId', 'Chi Tiết Báo Giá Kỹ Thuật', 'Immutable quote snapshot', 'Phiên bản, cấu thành giá và lịch sử phát hành.', 'staff', 'missing'),
  s(41, '/staff/requests/:requestId', 'Hồ Sơ Yêu Cầu In Toàn Diện', 'Staff request detail', 'Tổng hợp yêu cầu, báo giá, ký quỹ và vận chuyển.', 'staff', 'missing'),
  s(42, '/staff/production', 'Bảng Sản Xuất Chế Tác', 'Production board', 'Điều phối buồng in và công đoạn hậu kỳ.', 'staff', 'missing'),
  s(43, '/staff/production/:requestId', 'Thực Thi Lệnh Chế Tác', 'Production workspace', 'Điều khiển từng phôi và giám sát cảm biến máy.', 'staff', 'missing'),
  s(44, '/staff/production/:requestId/update', 'Cập Nhật Trạng Thái Sản Xuất', 'Audit production stage', 'Ghi nhận vật tư, giờ máy và bằng chứng nghiệm thu.', 'staff', 'missing'),
]

export function screenById(id: number): PodScreenDefinition {
  const match = podScreens.find((item) => item.id === id)
  if (!match) throw new Error(`Không tìm thấy cấu hình màn hình POD ${id}.`)
  return match
}
