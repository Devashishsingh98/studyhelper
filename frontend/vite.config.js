import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/highlight':  'http://localhost:8000',
      '/notes':      'http://localhost:8000',
      '/peek':       'http://localhost:8000',
      '/checkpoint': 'http://localhost:8000',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
