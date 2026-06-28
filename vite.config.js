import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path, { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3005,
    host: true
  },
  esbuild: {
    drop: ['console', 'debugger']
  },
  css: {
    devSourcemap: true
  },
  build: {
    cssTarget: 'chrome60',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-core': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          supabase: ['@supabase/supabase-js'],
          chart: ['echarts/core'],
          chartjs: ['chart.js'],
          xlsx: ['xlsx'],
          pdf: ['jspdf', 'jspdf-autotable'],
          html2canvas: ['html2canvas']
        }
      }
    }
  }
})
