import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/battle-ws': {
        target: 'ws://localhost:8788',
        ws: true,
        rewrite: (path) => path.replace(/^\/battle-ws/, ''),
      },
    },
  },
})
