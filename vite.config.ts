import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // One chunk per big screen keeps the first load light.
    chunkSizeWarningLimit: 900,
  },
})
