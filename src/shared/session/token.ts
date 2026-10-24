/**
 * Access token (JWT) cho Backend dùng `Authorization: Bearer`.
 * Lưu ở sessionStorage (mất khi đóng tab) để đi qua được các entry Vite (login → marketplace…),
 * không dùng localStorage cho dữ liệu nhạy cảm.
 */
const KEY = '3dworld.accessToken'
/** Đánh dấu phiên vừa bị Backend từ chối → hiển thị màn "Phiên hết hạn" thay vì "Chưa đăng nhập". */
const EXPIRED_KEY = '3dworld.sessionExpired'

type StoredToken = { token: string; expiresAt?: string }

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const tokenStore = {
  get(): string | null {
    return safe(() => {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return null
      const stored = JSON.parse(raw) as StoredToken
      if (stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now()) {
        tokenStore.expire()
        return null
      }
      return stored.token || null
    }, null)
  },

  set(token: string, expiresAt?: string) {
    safe(() => {
      sessionStorage.setItem(KEY, JSON.stringify({ token, expiresAt } satisfies StoredToken))
      sessionStorage.removeItem(EXPIRED_KEY)
    }, undefined)
  },

  /** Token hết hạn / bị thu hồi: xoá token nhưng nhớ là phiên đã hết hạn. */
  expire() {
    safe(() => {
      sessionStorage.removeItem(KEY)
      sessionStorage.setItem(EXPIRED_KEY, '1')
    }, undefined)
  },

  wasExpired(): boolean {
    return safe(() => sessionStorage.getItem(EXPIRED_KEY) === '1', false)
  },

  clear() {
    safe(() => {
      sessionStorage.removeItem(KEY)
      sessionStorage.removeItem(EXPIRED_KEY)
    }, undefined)
  },
}
