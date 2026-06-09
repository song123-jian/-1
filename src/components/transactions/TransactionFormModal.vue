<template>
  <div v-if="showModal" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content" style="max-width:560px">
      <div class="modal-header">
        <h3>{{ editingTransaction ? '编辑交易' : '新建交易' }}</h3>
        <button class="btn btn-ghost btn-sm" @click="emit('close')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">客户</label>
          <select class="form-select" v-model="formData.customerId">
            <option value="">请选择客户</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name || c.fullName || c.companyName }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">交易类型</label>
          <select class="form-select" v-model="formData.type">
            <option value="manual">手动记录</option>
            <option value="quotation">报价</option>
            <option value="contract">合同</option>
            <option value="collection">回款</option>
            <option value="delivery">送货</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">金额</label>
          <input type="number" class="form-input" v-model.number="formData.amount" placeholder="请输入金额" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input type="date" class="form-input" v-model="formData.date">
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea class="form-input" v-model="formData.notes" rows="3" placeholder="备注信息..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="!canSubmit">{{ editingTransaction ? '保存修改' : '创建交易' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

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

watch(() => props.showModal, (val) => {
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
    }
  }
})

function handleSave() {
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
  z-index: 1000;
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
