import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = env.VITE_REPO_NAME || ''
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || (repoName ? `/${repoName}/` : '/'),
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
      include: ['tests/**/*.{test,spec}.{js,jsx}'],
      exclude: ['tests/e2e/**'],
    },
  }
})
