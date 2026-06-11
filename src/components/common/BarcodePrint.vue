<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 800px">
      <div class="modal-header">
        <span class="modal-title">
          <Icon name="printer" :size="14" /> 条码打印
        </span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 标签大小选择 -->
        <div class="form-group">
          <label class="form-label">标签大小</label>
          <div style="display: flex; gap: var(--space-2)">
            <button
              v-for="size in labelSizes"
              :key="size.value"
              class="btn"
              :class="selectedSize === size.value ? 'btn-primary' : 'btn-outline'"
              @click="selectedSize = size.value"
            >
              {{ size.label }}
            </button>
          </div>
        </div>

        <!-- 显示二维码 -->
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer">
            <input type="checkbox" v-model="showQR" />
            <span class="form-label" style="margin-bottom: 0">同时显示二维码</span>
          </label>
        </div>

        <!-- 条码预览 -->
        <div class="form-group">
          <label class="form-label">预览 ({{ items.length }} 项)</label>
          <div class="barcode-preview-list">
            <div v-for="item in items" :key="item.code" class="barcode-preview-item">
              <div class="barcode-preview-name">{{ item.name }}</div>
              <div class="barcode-preview-code">
                <span v-html="sanitizeHtml(getBarcodeSvg(item.code))"></span>
              </div>
              <div v-if="showQR" class="barcode-preview-qr">
                <img :src="getQRCode(item.code)" style="width: 50px; height: 50px" />
              </div>
              <div v-if="item.spec" class="barcode-preview-spec">{{ item.spec }}</div>
            </div>
            <div v-if="items.length === 0" class="empty-state">无条码数据</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">关闭</button>
        <button class="btn btn-outline" @click="handlePrint">
          <Icon name="printer" :size="14" /> 打印
        </button>
        <button class="btn btn-primary" @click="handleBatchPrint">
          <Icon name="layers" :size="14" /> 批量打印
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { generateBarcode, generateQRCode, generateLabels } from '@/utils/barcode'
import { sanitizeHtml } from '@/utils/format'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const selectedSize = ref('medium')
const showQR = ref(false)

const labelSizes = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' }
]

function getBarcodeSvg(code) {
  if (!code) return ''
  return generateBarcode(code, { width: 1, height: 30, fontSize: 9 })
}

function getQRCode(code) {
  if (!code) return ''
  return generateQRCode(code, { size: 50 })
}

function handlePrint() {
  const html = generateLabels(props.items, {
    labelSize: selectedSize.value,
    showQR: showQR.value
  })
  printHtml(html)
}

function handleBatchPrint() {
  const html = generateLabels(props.items, {
    labelSize: selectedSize.value,
    showQR: showQR.value
  })
  printHtml(html)
}

function printHtml(html) {
  const printWindow = window.open('', '_blank')printWindow.document.write(`<html><head><title>条码打印</title><style>        body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; padding: var(--space-2); }
        @page { margin: 5mm; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => { printWindow.print() }, 300)
}
</script>

<style scoped>
.barcode-preview-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.barcode-preview-item {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  min-width: 180px;
  max-width: 220px;
}
.barcode-preview-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin-bottom: var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.barcode-preview-code {
  margin-bottom: var(--space-1);
}
.barcode-preview-code :deep(svg) {
  max-width: 100%;
  height: auto;
}
.barcode-preview-qr {
  margin-top: var(--space-1);
}
.barcode-preview-spec {
  font-size: 10px;
  color: var(--color-text-tertiary);
}
</style>
