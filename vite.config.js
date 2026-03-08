import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/lcd': { target: 'http://prod-full-1.omnistar.io:1317', rewrite: (path) => path.replace(/^\/lcd/, '') },
      '/rpc': { target: 'http://prod-full-1.omnistar.io:26657', rewrite: (path) => path.replace(/^\/rpc/, '') },
    },
  },
})
