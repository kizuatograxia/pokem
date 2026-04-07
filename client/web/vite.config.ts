import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const battleWsPort = process.env.BATTLE_WS_PORT || '8788'
const battleWsTarget = process.env.BATTLE_WS_TARGET || `ws://localhost:${battleWsPort}`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/battle-ws': {
        target: battleWsTarget,
        ws: true,
        rewrite: (path) => path.replace(/^\/battle-ws/, ''),
      },
    },
  },
})
