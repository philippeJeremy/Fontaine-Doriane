import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['localhost', '127.0.0.1', 'mondomaine.fr'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
})