<template>
  <div v-if="showModal" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content" style="max-width: 560px">
      <div class="modal-header">
        <h3>{{ editingTransaction ? '编辑交易' : '新建交易' }}</h3>
        <button class="btn btn-ghost btn-sm" @click="emit('close')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <SmartRecognizePanel
          v-if="!editingTransaction"
          v-model:show-smart-rec="showSmartRec"
          v-model:smart-rec-input="smartRecInput"
          :smart-rec-result="smartRecResult"
          :placeholder="smartRecPlaceholder"
          :template-name="smartRecTemplateName"
          :template-content="smartRecTemplateContent"
          @run-smart-recognize="runSmartRecognize"
          @apply-smart-recognize="applySmartRecognizeToForm"
          @handle-smart-file-upload="handleSmartFileUpload"
          @clear="smartRecInput = ''; smartRecResult = null"
        />
        <div class="form-group">
          <label class="form-label">客户</label>
          <select v-model="formData.customerId" class="form-select">
            <option value="">请选择客户</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">
              {{ c.name || c.fullName || c.companyName }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">交易类型</label>
          <select v-model="formData.type" class="form-select">
            <option value="manual">手动记录</option>
            <option value="quotation">报价</option>
            <option value="contract">合同</option>
            <option value="collection">回款</option>
            <option value="delivery">送货</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">金额</label>
          <input
            v-model.number="formData.amount"
            type="number"
            class="form-input"
            placeholder="请输入金额"
            min="0"
            step="0.01"
          />
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input v-model="formData.date" type="date" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea v-model="formData.notes" class="form-input" rows="3" placeholder="备注信息..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!canSubmit" @click="handleSave">
          {{ editingTransaction ? '保存修改' : '创建交易' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'TransactionFormModal' }
</script>
<script setup>
import { ref, watch, reactive } from 'vue'
import { useSmartRecognize } from './useSmartRecognize'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useFormDraft } from '@/composables/useFormDraft'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  editingTransaction: { type: Object, default: null },
  customers: { type: Array, default: () => [] },
  canSubmit: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'save'])

const formData = ref({
  customerId: '',
  type: 'manual',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  notes: ''
})

const draftData = reactive({})
watch(
  formData,
  (fd) => {
    if (props.editingTransaction) return
    Object.assign(draftData, { ...fd })
  },
  { deep: true }
)

const { restoreDraft, clearDraft, hasDraft } = useFormDraft('transaction-form', draftData, {
  debounce: 1500,
  onRestore: (draft) => {
    if (draft.data) {
      Object.assign(formData.value, draft.data)
    }
  }
})

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder,
  smartRecTemplateName: smartRecTemplateName,
  smartRecTemplateContent: smartRecTemplateContent,
  runSmartRecognize,
  handleSmartFileUpload,
  resetSmartRec
} = useSmartRecognize(formData.value)

function normalizeCustomerText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function resolveCustomerId(name) {
  const target = normalizeCustomerText(name)
  if (!target) return ''
  const customer = props.customers.find((c) => {
    return [c.id, c.name, c.fullName, c.companyName].some((field) => normalizeCustomerText(field).includes(target))
  })
  return customer ? customer.id : ''
}

function applySmartRecognizeToForm() {
  if (!smartRecResult.value || smartRecResult.value.items.length === 0) return
  smartRecResult.value.items.forEach((item) => {
    if (!item.value) return
    if (item.key === 'customerName') {
      const customerId = resolveCustomerId(item.value)
      if (customerId) {
        formData.value.customerId = customerId
      }
      return
    }
    if (Object.hasOwn(formData.value, item.key)) {
      formData.value[item.key] = item.value
    }
  })
}

watch(
  () => props.showModal,
  (val) => {
    if (val) {
      if (props.editingTransaction) {
        const src = props.editingTransaction.source || props.editingTransaction
        formData.value = {
          customerId: src.customerId || '',
          type: 'manual',
          amount: src.amount || 0,
          date: src.date || '',
          notes: src.notes || ''
        }
      } else {
        formData.value = {
          customerId: '',
          type: 'manual',
          amount: 0,
          date: new Date().toISOString().slice(0, 10),
          notes: ''
        }
        resetSmartRec()
        showSmartRec.value = true
        if (hasDraft()) {
          restoreDraft()
        }
      }
    }
  }
)

function handleSave() {
  clearDraft()
  emit('save', { ...formData.value })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
}
.modal-content {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.form-group {
  margin-bottom: var(--space-4);
}
.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
</style>
