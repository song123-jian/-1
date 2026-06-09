<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-content" style="max-width:560px">
      <div class="modal-header">
        <h3>新增付款单</h3>
        <button class="btn btn-ghost btn-sm" @click="handleCancel"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">应付单 <span style="color:var(--color-danger)">*</span></label>
          <select class="form-select" v-model="formData.payableId" @change="onPayableChange">
            <option value="">请选择应付单</option>
            <option
              v-for="py in availablePayables"
              :key="py.id"
              :value="py.id"
            >{{ py.payableNo }} - {{ py.supplierName }} (未付: ¥{{ formatMoney(py.remainingAmount) }})</option>
          </select>
          <span v-if="errors.payableId" class="form-error">{{ errors.payableId }}</span>
        </div>

        <div v-if="selectedPayable" class="info-bar">
          <div class="info-bar-item">
            <span class="info-bar-label">供应商</span>
            <span>{{ selectedPayable.supplierName }}</span>
          </div>
          <div class="info-bar-item">
            <span class="info-bar-label">应付金额</span>
            <span class="cell-mono">¥{{ formatMoney(selectedPayable.amount) }}</span>
          </div>
          <div class="info-bar-item">
            <span class="info-bar-label">未付金额</span>
            <span class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(selectedPayable.remainingAmount) }}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">付款金额 <span style="color:var(--color-danger)">*</span></label>
            <input
              type="number"
              class="form-input"
              v-model.number="formData.amount"
              min="0.01"
              :max="maxAmount"
              step="0.01"
              placeholder="请输入付款金额"
            >
            <span v-if="errors.amount" class="form-error">{{ errors.amount }}</span>
            <span v-if="maxAmount > 0" class="form-hint">最大可付: ¥{{ formatMoney(maxAmount) }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">付款方式 <span style="color:var(--color-danger)">*</span></label>
            <select class="form-select" v-model="formData.method">
              <option value="bank">银行转账</option>
              <option value="cash">现金</option>
              <option value="check">支票</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">银行名称</label>
            <input type="text" class="form-input" v-model="formData.bankName" placeholder="付款银行名称">
          </div>
          <div class="form-group">
            <label class="form-label">参考号</label>
            <input type="text" class="form-input" v-model="formData.referenceNo" placeholder="银行流水号等">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">付款日期 <span style="color:var(--color-danger)">*</span></label>
          <input type="date" class="form-input" v-model="formData.paymentDate">
          <span v-if="errors.paymentDate" class="form-error">{{ errors.paymentDate }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" v-model="formData.notes" rows="2" placeholder="备注信息"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="handleCancel">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">确认付款</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { usePayableStore } from '@/stores/payable'

const props = defineProps({
  payable: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'saved'])

const payableStore = usePayableStore()

const formData = reactive({
  payableId: '',
  amount: 0,
  method: 'bank',
  bankName: '',
  referenceNo: '',
  paymentDate: new Date().toISOString().split('T')[0],
  notes: ''
})

const errors = reactive({
  payableId: '',
  amount: '',
  paymentDate: ''
})

/* 可选应付单：未完成的 */
const availablePayables = computed(() =>
  payableStore.payables.filter(p => p.status !== 'completed')
)

/* 当前选中的应付单 */
const selectedPayable = computed(() => {
  if (!formData.payableId) return null
  return payableStore.payables.find(p => p.id === formData.payableId) || null
})

/* 最大可付金额 */
const maxAmount = computed(() => {
  if (!selectedPayable.value) return 0
  return (parseFloat(selectedPayable.value.amount) || 0) - (parseFloat(selectedPayable.value.paidAmount) || 0)
})

/* 当传入payable时自动选中 */
watch(() => props.payable, (val) => {
  if (val && val.id) {
    formData.payableId = val.id
  }
}, { immediate: true })

watch(() => props.visible, (val) => {
  if (val && props.payable && props.payable.id) {
    formData.payableId = props.payable.id
  }
})

function onPayableChange() {
  formData.amount = 0
  errors.payableId = ''
  errors.amount = ''
}

function validate() {
  let valid = true
  errors.payableId = ''
  errors.amount = ''
  errors.paymentDate = ''

  if (!formData.payableId) {
    errors.payableId = '请选择应付单'
    valid = false
  }
  if (!formData.amount || formData.amount <= 0) {
    errors.amount = '付款金额必须大于0'
    valid = false
  } else if (maxAmount.value > 0 && formData.amount > maxAmount.value) {
    errors.amount = `付款金额不能超过未付金额 ¥${formatMoney(maxAmount.value)}`
    valid = false
  }
  if (!formData.paymentDate) {
    errors.paymentDate = '请选择付款日期'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!validate()) return
  const result = payableStore.addPayment({
    payableId: formData.payableId,
    amount: formData.amount,
    method: formData.method,
    bankName: formData.bankName,
    referenceNo: formData.referenceNo,
    paymentDate: formData.paymentDate,
    notes: formData.notes
  })
  if (result) {
    emit('saved', result)
    resetForm()
    emit('update:visible', false)
  }
}

function handleCancel() {
  resetForm()
  emit('update:visible', false)
}

function resetForm() {
  formData.payableId = ''
  formData.amount = 0
  formData.method = 'bank'
  formData.bankName = ''
  formData.referenceNo = ''
  formData.paymentDate = new Date().toISOString().split('T')[0]
  formData.notes = ''
  errors.payableId = ''
  errors.amount = ''
  errors.paymentDate = ''
}

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.info-bar {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}
.info-bar-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}
.info-bar-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-error {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: 2px;
}
.form-hint {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .info-bar { flex-direction: column; gap: var(--space-2); }
}
</style>
