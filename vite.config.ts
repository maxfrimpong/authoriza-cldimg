import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Note: client-side config is read via import.meta.env.VITE_* (see vite-env.d.ts).
// We do NOT inline process.env into the bundle — doing so leaks the entire
// build environment (including secrets) into shipped JavaScript.
export default defineConfig({
  plugins: [react()],
})
