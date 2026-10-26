import { fetchMe } from '../../features/auth/services/session'

/**
 * 401 từ một API phụ (AI Studio, 3D Studio) chưa chắc là hết phiên: nếu dịch vụ đó không chạy,
 * backend chính trả 401 cho đường dẫn nó không có. Hỏi lại /api/auth/me để phân biệt.
 * Kết quả được nhớ 30 giây để nhiều request lỗi cùng lúc chỉ tạo một lần kiểm tra.
 */
let cached: { at: number; valid: Promise<boolean> } | null = null

export function sessionStillValid(): Promise<boolean> {
  if (!cached || Date.now() - cached.at > 30_000) {
    cached = {
      at: Date.now(),
      valid: fetchMe()
        .then((u) => !!u)
        .catch(() => false),
    }
  }
  return cached.valid
}

/** Gọi khi chắc chắn phiên đã hết, để lần kiểm tra sau hỏi lại Backend. */
export function resetSessionCheck() {
  cached = null
}
