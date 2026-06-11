<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-content" style="max-width:560px">
      <div class="modal-header">
        <h3>新增收款单</h3>
        <button class="btn btn-ghost btn-sm" @click="handleCancel"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">应收单 <span style="color:var(--color-danger)">*</span></label>
          <select class="form-select" v-model="formData.receivableId" @change="onReceivableChange">
            <option value="">请选择应收单</option>
            <option
              v-for="rv in availableReceivables"
              :key="rv.id"
              :value="rv.id"
            >{{ rv.receivableNo }} - {{ rv.customerName }} (未收: ¥{{ formatMoney(rv.remainingAmount) }})</option>
          </select>
          <span v-if="errors.receivableId" class="form-error">{{ errors.receivableId }}</span>
        </div>

        <div v-if="selectedReceivable" class="info-bar">
          <div class="info-bar-item">
            <span class="info-bar-label">客户</span>
            <span>{{ selectedReceivable.customerName }}</span>
          </div>
          <div class="info-bar-item">
            <span class="info-bar-label">应收金额</span>
            <span class="cell-mono">¥{{ formatMoney(selectedReceivable.amount) }}</span>
          </div>
          <div class="info-bar-item">
            <span class="info-bar-label">未收金额</span>
            <span class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(selectedReceivable.remainingAmount) }}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">收款金额 <span style="color:var(--color-danger)">*</span></label>
            <input
              type="number"
              class="form-input"
              v-model.number="formData.amount"
              min="0.01"
              :max="maxAmount"
              step="0.01"
              placeholder="请输入收款金额"
            >
            <span v-if="errors.amount" class="form-error">{{ errors.amount }}</span>
            <span v-if="maxAmount > 0" class="form-hint">最大可收: ¥{{ formatMoney(maxAmount) }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">收款方式 <span style="color:var(--color-danger)">*</span></label>
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
            <input type="text" class="form-input" v-model="formData.bankName" placeholder="收款银行名称">
          </div>
          <div class="form-group">
            <label class="form-label">参考号</label>
            <input type="text" class="form-input" v-model="formData.referenceNo" placeholder="银行流水号等">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">收款日期 <span style="color:var(--color-danger)">*</span></label>
          <input type="date" class="form-input" v-model="formData.receiptDate">
          <span v-if="errors.receiptDate" class="form-error">{{ errors.receiptDate }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" v-model="formData.notes" rows="2" placeholder="备注信息"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="handleCancel">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">确认收款</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useReceivableStore } from '@/modules/finance/stores/receivable'

const props = defineProps({
  receivable: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'saved'])

const receivableStore = useReceivableStore()

const formData = reactive({
  receivableId: '',
  amount: 0,
  method: 'bank',
  bankName: '',
  referenceNo: '',
  receiptDate: new Date().toISOString().split('T')[0],
  notes: ''
})

const errors = reactive({
  receivableId: '',
  amount: '',
  receiptDate: ''
})

/* 可选应收单：未完成的 */
const availableReceivables = computed(() =>
  receivableStore.receivables.filter(r => r.status !== 'completed')
)

/* 当前选中的应收单 */
const selectedReceivable = computed(() => {
  if (!formData.receivableId) return null
  return receivableStore.receivables.find(r => r.id === formData.receivableId) || null
})

/* 最大可收金额 */
const maxAmount = computed(() => {
  if (!selectedReceivable.value) return 0
  return (parseFloat(selectedReceivable.value.amount) || 0) - (parseFloat(selectedReceivable.value.receivedAmount) || 0)
})

/* 当传入receivable时自动选中 */
watch(() => props.receivable, (val) => {
  if (val && val.id) {
    formData.receivableId = val.id
  }
}, { immediate: true })

watch(() => props.visible, (val) => {
  if (val && props.receivable && props.receivable.id) {
    formData.receivableId = props.receivable.id
  }
})

function onReceivableChange() {
  formData.amount = 0
  errors.receivableId = ''
  errors.amount = ''
}

function validate() {
  let valid = true
  errors.receivableId = ''
  errors.amount = ''
  errors.receiptDate = ''

  if (!formData.receivableId) {
    errors.receivableId = '请选择应收单'
    valid = false
  }
  if (!formData.amount || formData.amount <= 0) {
    errors.amount = '收款金额必须大于0'
    valid = false
  } else if (maxAmount.value > 0 && formData.amount > maxAmount.value) {
    errors.amount = `收款金额不能超过未收金额 ¥${formatMoney(maxAmount.value)}`
    valid = false
  }
  if (!formData.receiptDate) {
    errors.receiptDate = '请选择收款日期'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!validate()) return
  const result = receivableStore.addReceipt({
    receivableId: formData.receivableId,
    amount: formData.amount,
    method: formData.method,
    bankName: formData.bankName,
    referenceNo: formData.referenceNo,
    receiptDate: formData.receiptDate,
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
  formData.receivableId = ''
  formData.amount = 0
  formData.method = 'bank'
  formData.bankName = ''
  formData.referenceNo = ''
  formData.receiptDate = new Date().toISOString().split('T')[0]
  formData.notes = ''
  errors.receivableId = ''
  errors.amount = ''
  errors.receiptDate = ''
}

// 保留本地版本：minimumFractionDigits 为 0（整数不显示小数位），与全局 formatMoney 固定2位小数不同
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
  gap: var(--space-1);
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
  margin-top: var(--space-1);
}
.form-hint {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .info-bar { flex-direction: column; gap: var(--space-2); }
}
</style>
