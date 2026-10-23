/**
 * Bản đồ module của 3DWorld. Mỗi module là một trang (entry) riêng của Vite,
 * dùng chung domain + cookie đăng nhập do backend Spring Boot cấp.
 *
 * Marketplace và POD hiện là trang "sắp ra mắt" (src/marketplace, src/pod) — code tiếp ở đó.
 */
export type ModuleId = 'ai' | 'studio' | 'marketplace' | 'pod'

export const MODULES: { id: ModuleId; label: string; short: string; href: string; ready: boolean }[] = [
  { id: 'ai', label: 'AI Studio', short: 'AI', href: '/ai/', ready: true },
  { id: 'studio', label: '3D Studio', short: 'Studio', href: '/studio/', ready: true },
  { id: 'marketplace', label: 'Marketplace', short: 'Market', href: '/marketplace/', ready: true },
  { id: 'pod', label: 'In 3D (POD)', short: 'POD', href: '/pod/', ready: false },
]

export const HOME_HREF = '/'

/** Trang đăng nhập dùng chung; `next` là URL quay lại sau khi đăng nhập. */
export function loginHref(next: string = location.pathname + location.search + location.hash) {
  return `/login/?next=${encodeURIComponent(safeNext(next))}`
}

/** Chỉ cho phép quay về đường dẫn nội bộ (chống open-redirect). */
export function safeNext(next: string | null | undefined, fallback = '/ai/') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return fallback
  return next
}
