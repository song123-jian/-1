<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>[电话] 跟进记录 - {{ quote?.quoteNo }}</h3>
          <button class="modal-close" @click="emit('close')"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-2" style="margin-bottom: 12px">
            <div class="form-group">
              <label class="form-label">跟进日期</label>
              <input v-model="followUpDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">跟进内容</label>
              <input v-model="followUpNote" class="form-input" placeholder="沟通内容/结果" />
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-bottom: 16px" @click="addFollowUp">添加跟进</button>
          <div style="max-height: 300px; overflow-y: auto">
            <div
              v-if="!currentQuote?.followUps?.length"
              style="text-align: center; padding: 20px; color: var(--color-text-tertiary)"
            >
              暂无跟进记录
            </div>
            <div v-for="f in [...(currentQuote?.followUps || [])].reverse()" :key="f.createdAt" class="follow-up-item">
              <div class="follow-up-date">
                {{ f.date || '-' }}
                <span class="follow-up-by">{{ f.createdBy }}</span>
              </div>
              <div class="follow-up-note">{{ f.note }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'QuotationFollowUpModal' }
</script>
<script setup>
import { ref, watch } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'

const props = defineProps({
  showModal: Boolean,
  quote: Object
})

defineEmits(['close'])

const quotationStore = useQuotationStore()
const followUpDate = ref('')
const followUpNote = ref('')
const currentQuote = ref(null)

watch(
  () => props.showModal,
  (val) => {
    if (val && props.quote) {
      followUpDate.value = new Date().toISOString().split('T')[0]
      followUpNote.value = ''
      currentQuote.value = props.quote
    }
  }
)

function addFollowUp() {
  if (!followUpDate.value || !followUpNote.value) {
    alert('请填写跟进日期和内容')
    return
  }
  quotationStore.addFollowUp(currentQuote.value.id, followUpDate.value, followUpNote.value)
  currentQuote.value = quotationStore.getQuotationById(currentQuote.value.id)
  followUpNote.value = ''
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
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: var(--z-base);
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
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.form-input,
.form-select {
  padding: var(--space-2) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.form-row {
  display: grid;
  gap: var(--space-3);
}
.form-row-2 {
  grid-template-columns: 1fr 1fr;
}
.follow-up-item {
  padding: var(--space-2);
  border-left: 3px solid var(--color-accent);
  margin-bottom: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.follow-up-date {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.follow-up-by {
  color: var(--color-text-tertiary);
  font-weight: 400;
}
.follow-up-note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}
</style>
