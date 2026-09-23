import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  root: 'renderer',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'renderer/src') },
      { find: 'react-dom/client', replacement: path.resolve(__dirname, 'node_modules/react-dom/client.js') },
      { find: 'react/jsx-runtime', replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js') },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-dom') },
      { find: /^react$/, replacement: path.resolve(__dirname, 'node_modules/react') }
    ],
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: { outDir: '../dist', emptyOutDir: true }
})
