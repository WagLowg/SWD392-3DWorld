const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ''

/**
 * Biến môi trường public đã được Vite đưa vào bundle.
 * Không đặt secret, private key hoặc Meshy API key ở đây.
 */
export const env = {
  apiBaseUrl,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const
