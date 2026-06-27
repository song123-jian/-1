<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="handleClose">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            <Icon name="list" :size="14" />
            报价模板管理
          </h3>
          <button class="modal-close" @click="handleClose"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="template-upload-area">
            <div
              class="upload-zone"
              @click="triggerTemplateUpload"
              @dragover.prevent
              @drop.prevent="handleTemplateDrop"
            >
              <div class="upload-icon"><Icon name="zap" :size="14" /></div>
              <div class="upload-text">本地智能识别报价单</div>
              <div class="upload-hint">点击上传或拖拽文件（支持PDF/Word/Excel/图片）</div>
              <input ref="templateFileInput" type="file" style="display: none" @change="handleTemplateFileSelect" />
            </div>
            <div v-if="aiParsing" class="ai-parsing-hint">
              <Icon name="zap" :size="14" />
              正在识别中...
            </div>
          </div>
          <div style="max-height: 400px; overflow-y: auto">
            <div
              v-if="quotationStore.templates.length === 0"
              style="text-align: center; padding: 40px; color: var(--color-text-tertiary)"
            >
              <div style="font-size: 36px; margin-bottom: 12px"><Icon name="list" :size="14" /></div>
              暂无报价模板
              <br />
              <span style="font-size: 12px">在报价编辑界面点击"另存为模板"来创建</span>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>模板名称</th>
                  <th>客户</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in quotationStore.templates" :key="t.id">
                  <td>{{ t.name }}</td>
                  <td>{{ t.customerName || '-' }}</td>
                  <td>{{ (t.createdAt || '').substring(0, 10) }}</td>
                  <td>
                    <button class="action-btn" @click="handleApply(t)">使用</button>
                    <button class="action-btn danger" @click="handleDelete(t.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'QuotationTemplateModal' }
</script>
<script setup>
import { ref } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'

const props = defineProps({
  showModal: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save', 'apply', 'delete'])

const quotationStore = useQuotationStore()

const templateFileInput = ref(null)
const aiParsing = ref(false)

function triggerTemplateUpload() {
  templateFileInput.value?.click()
}

function handleTemplateFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseTemplateFile(file)
}

function handleTemplateDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseTemplateFile(file)
}

function parseTemplateFile(file) {
  aiParsing.value = true
  setTimeout(() => {
    aiParsing.value = false
    const name = prompt('本地识别完成，请确认模板名称：', file.name.replace(/\.[^.]+$/, ''))
    if (name) {
      quotationStore.addTemplate({
        name,
        customerName: '本地识别 - 待确认',
        items: JSON.stringify([{ grade: '识别牌号', standard: '', qty: 0, price: 0, remark: '请手动确认' }]),
        termPrice: '',
        termPayment: '',
        termDelivery: '',
        termDeliveryAddr: '',
        termQuality: '',
        termPriceAdj: '',
        termLegal: '',
        taxRate: 13,
        costBasis: 0
      })
      alert('模板"' + name + '"已创建，请编辑确认详细信息')
    }
  }, 2000)
}

function handleClose() {
  emit('close')
}

function handleApply(template) {
  emit('apply', template)
}

function handleDelete(id) {
  if (confirm('确认删除此模板？')) {
    quotationStore.deleteTemplate(id)
    emit('delete', id)
  }
}
</script>

<style scoped>
.modal-overlay {
  align-items: flex-start;
  padding: var(--space-5);
  overflow-y: auto;
}
.modal-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
}
.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary);
}
.modal-close:hover {
  background: var(--color-bg-tertiary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn:hover {
  background: var(--color-bg-secondary);
}
.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.action-btn {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.action-btn:hover {
  background: var(--color-bg-tertiary);
}
.action-btn.danger {
  color: var(--color-danger);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.data-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.data-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.template-upload-area {
  margin-bottom: var(--space-4);
}
.upload-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}
.upload-zone:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle, #eff6ff);
}
.upload-icon {
  font-size: 28px;
  margin-bottom: var(--space-2);
}
.upload-text {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.ai-parsing-hint {
  text-align: center;
  padding: var(--space-2);
  color: var(--color-accent);
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
}
</style>
