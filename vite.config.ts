import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  base: './', // <-- Le point devant la barre force des chemins relatifs partout automatiquement
})
