<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 900px; height: 85vh; display: flex; flex-direction: column">
      <div class="modal-header">
        <span class="modal-title">{{ title || '打印预览' }}</span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body" style="flex: 1; overflow-y: auto; padding: var(--space-4)">
        <div ref="previewFrame" class="print-preview-frame" v-html="sanitizeHtml(html)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">关闭</button>
        <button class="btn btn-outline" @click="handleExportPDF">
          <Icon name="download" :size="14" />
          导出PDF
        </button>
        <button class="btn btn-primary" @click="handlePrint">
          <Icon name="printer" :size="14" />
          打印
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'PrintPreview' }
</script>
<script setup>
import { ref } from 'vue'
import { getPrintEngine } from '@/utils/printEngine'
import { sanitizeHtml } from '@/utils/format'

const props = defineProps({
  html: { type: String, required: true },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const previewFrame = ref(null)
const engine = getPrintEngine()

function handlePrint() {
  engine.print(props.html)
}

function handleExportPDF() {
  engine.exportPDF(props.html, props.title || '导出文档')
}
</script>

<style scoped>
.print-preview-frame {
  background: #fff;
  color: #333;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  min-height: 400px;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: var(--shadow-md);
}
</style>
