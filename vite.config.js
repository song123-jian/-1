import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Chrome >= 60', 'Firefox >= 60', 'Safari >= 12', 'Edge >= 79'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      modernPolyfills: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src')
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('/vue/') || normalizedId.includes('/pinia/')) return 'vue-vendor'
            if (normalizedId.includes('/vue-router/')) return 'router-state'
            if (normalizedId.includes('/@supabase/supabase-js/')) return 'supabase'
            if (normalizedId.includes('/dompurify/')) return 'sanitize'
            if (normalizedId.includes('/chart.js/')) return 'chartjs'
            if (normalizedId.includes('/xlsx/')) return 'xlsx'
            if (normalizedId.includes('/html2canvas/')) return 'html2canvas'
            if (normalizedId.includes('/jspdf/') || normalizedId.includes('/jspdf-autotable/')) return 'pdf'
            if (normalizedId.includes('/echarts/core/')) return 'echarts-core'
            if (normalizedId.includes('/echarts/charts/')) return 'echarts-charts'
            if (normalizedId.includes('/echarts/components/')) return 'echarts-components'
            if (normalizedId.includes('/echarts/features/')) return 'echarts-features'
            if (normalizedId.includes('/echarts/renderers/')) return 'echarts-renderers'
            return undefined
          }

          return undefined
        }
      }
    }
  }
})
