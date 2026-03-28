import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/todo/',
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    exclude: ['tests/e2e/**'],
  },
})
