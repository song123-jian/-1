import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{js,ts}'],
    setupFiles: ['src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/services/**', 'src/stores/**', 'src/modules/**/stores/**']
    }
  }
})