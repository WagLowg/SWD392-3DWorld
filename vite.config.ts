import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

/**
 * Mỗi module là một trang riêng (multi-page) để CSS của Landing / AI / Studio không đè nhau.
 * Thêm module mới: tạo entries/<module>/index.html + src/features/<module>/main.tsx rồi khai báo ở đây.
 */
const MODULES = ['ai', 'studio', 'marketplace', 'pod', 'login', 'portal'] as const

const input = Object.fromEntries([
  ['main', resolve(import.meta.dirname, 'index.html')],
  ...MODULES.map((m) => [m, resolve(import.meta.dirname, `entries/${m}/index.html`)]),
])

/** Dev server: /ai/models, /marketplace/abc… trả về index.html của đúng module (SPA fallback). */
function moduleFallback(): Plugin {
  return {
    name: '3dworld-module-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || '/'
        const path = url.split('?')[0]
        const mod = MODULES.find((m) => path === `/${m}` || path.startsWith(`/${m}/`))
        // chỉ rewrite các route "trang", không đụng tới file tĩnh / module JS
        if (mod && !/\.[a-z0-9]+$/i.test(path) && req.headers.accept?.includes('text/html')) {
          req.url = `/entries/${mod}/index.html`
        }
        next()
      })
    },
  }
}

/** Proxy tới một backend; bỏ Origin của :5173 để Spring không xử lý nhầm như request CORS trực tiếp. */
const backend = (port: string | number): ProxyOptions => ({
  target: `http://localhost:${port}`,
  changeOrigin: true,
  configure(proxy) {
    proxy.on('proxyReq', (proxyRequest) => proxyRequest.removeHeader('origin'))
  },
})

/**
 * AI Studio và 3D Studio có thể chạy ở dịch vụ riêng (vd. backend/ Spring trong repo, chạy port khác 8080):
 *   AI_API_PORT      → /api/ai-studio, /api/health, /api/webhooks
 *   STUDIO_API_PORT  → /api/studio (mặc định dùng AI_API_PORT)
 * Không đặt → mọi /api đi về backend chính như trước.
 */
const aiPort = process.env.AI_API_PORT?.trim()
const studioPort = process.env.STUDIO_API_PORT?.trim() || aiPort
const aiProxy = {
  ...(aiPort ? Object.fromEntries(['/api/ai-studio', '/api/health', '/api/webhooks'].map((p) => [p, backend(aiPort)])) : {}),
  ...(studioPort ? { '/api/studio': backend(studioPort) } : {}),
}

export default defineConfig({
  plugins: [react(), tailwindcss(), moduleFallback()],
  server: {
    port: 5173,
    // Đường dẫn AI khai báo trước '/api' để được ưu tiên.
    proxy: { ...aiProxy, '/api': backend(process.env.API_PORT || 8080) },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input },
  },
})
