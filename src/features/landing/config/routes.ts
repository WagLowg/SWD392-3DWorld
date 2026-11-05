/**
 * [Giải thích] Đường dẫn sang các module khác (AI Studio, 3D Studio, Marketplace, POD, Login).
 */
/**
 * Route của 4 module 3DWorld (mỗi module là một trang riêng, xem frontend/vite.config.ts).
 */
export const ROUTES = {
  home: '/',
  aiStudio: '/ai/',
  studio3d: '/studio/',
  marketplace: '/marketplace/',
  product: (slug: string) => `/marketplace/${slug}`,
  printOnDemand: '/pod/',
  signIn: '/login/',
  profile: '/portal/profile',
} as const
