import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: browser → same origin `/api`, Vite forwards to Express.
// Default `127.0.0.1` (not `localhost`) avoids Windows Node trying IPv6 ::1 first
// when the API only listens on IPv4 — that mismatch yields ECONNREFUSED / AggregateError.
// Set `VITE_PROXY_API` in `.env` to match server `PORT` (e.g. http://127.0.0.1:5002).

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fromFile = env.VITE_PROXY_API?.trim()
  const API_TARGET =
    fromFile ||
    process.env.VITE_PROXY_API?.trim() ||
    'http://127.0.0.1:5002'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: API_TARGET, changeOrigin: true },
        '/uploads': { target: API_TARGET, changeOrigin: true },
        '/socket.io': { target: API_TARGET, ws: true, changeOrigin: true },
      },
    },
  }
})
