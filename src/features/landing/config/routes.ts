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
} as const
