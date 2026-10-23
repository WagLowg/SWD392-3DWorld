import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

/**
 * Mỗi module là một trang riêng (multi-page) để CSS của Landing / AI / Studio không đè nhau.
 * Thêm module mới: tạo <module>/index.html + src/<module>/main.tsx rồi khai báo ở đây.
 */
const MODULES = ['marketplace', 'pod', 'login', 'register', 'portal'] as const

const input = Object.fromEntries([
  ['main', resolve(import.meta.dirname, 'index.html')],
  ...MODULES.map((m) => [m, resolve(import.meta.dirname, `${m}/index.html`)]),
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
          req.url = `/${mod}/index.html`
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), moduleFallback()],
  server: {
    port: 5173,
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8080}` },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input },
  },
})
