/**
 * Route map for the four core 3DWorld features.
 * When this landing page is merged into the main app, point these at the
 * app's existing routes instead of adding new ones.
 */
export const ROUTES = {
  home: '/',
  aiStudio: '/ai-studio',
  studio3d: '/3d-studio',
  marketplace: '/marketplace',
  product: (slug: string) => `/marketplace/${slug}`,
  printOnDemand: '/print-on-demand',
  signIn: '/sign-in',
} as const
