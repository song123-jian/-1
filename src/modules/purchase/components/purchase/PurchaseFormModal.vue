<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEdit ? '编辑采购单' : '新增采购单' }}</h3>
          <button class="modal-close" @click="handleCancel"><Icon name="close" :size="16" /></button>
        </div>
        <div class="modal-body">
          <SmartRecognizePanel
            v-if="!isEdit"
            v-model:show-smart-rec="showSmartRec"
            v-model:smart-rec-input="smartRecInput"
            :smart-rec-result="smartRecResult"
            :placeholder="smartRecPlaceholder"
            @run-smart-recognize="runSmartRecognize"
            @apply-smart-recognize="onApplySmartRecognize"
            @handle-smart-file-upload="handleSmartFileUpload"
          />
          <div v-if="hasErrors || hasWarnings" class="form-validation-panel">
            <div v-for="e in errors" :key="e.field" class="val-error">{{ e.message }}</div>
            <div v-for="w in warnings" :key="w.field" class="val-warning">{{ w.message }}</div>
          </div>
          <!-- 基本信息 -->
          <div class="section-title">基本信息</div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购单号</label>
              <input :value="form.orderNo" type="text" class="form-input" readonly disabled />
            </div>
            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="form.title" type="text" class="form-input" placeholder="请输入采购单标题" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                供应商
                <span class="required">*</span>
              </label>
              <DataSelect
                v-model="form.supplierId"
                module="supplier"
                variant="active"
                value-field="id"
                label-field="name"
                placeholder="选择供应商"
                @change="onSupplierChange"
              />
              <span v-if="fieldErrors.supplierId" class="form-error">{{ fieldErrors.supplierId }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">供应商名称</label>
              <input
                v-model="form.supplierName"
                type="text"
                class="form-input"
                placeholder="选择供应商后自动填充，可手动修改"
              />
            </div>
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="form.type" class="form-select">
                <option value="purchase">采购</option>
                <option value="return">退货</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">预计到货日</label>
              <input v-model="form.expectedDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <input v-model="form.notes" type="text" class="form-input" placeholder="请输入备注" />
            </div>
          </div>

          <!-- 采购明细 -->
          <div class="section-title" style="margin-top: var(--space-5)">
            采购明细
            <button class="btn btn-sm btn-primary" style="margin-left: var(--space-2)" @click="addItem">
              <Icon name="add" :size="12" />
              添加行
            </button>
            <span v-if="fieldErrors.items" class="form-error" style="margin-left: var(--space-2)">
              {{ fieldErrors.items }}
            </span>
          </div>
          <div class="table-container">
            <table class="data-table items-table">
              <thead>
                <tr>
                  <th style="width: 120px">编号</th>
                  <th style="width: 120px">物料名称</th>
                  <th style="width: 100px">规格</th>
                  <th style="width: 60px">单位</th>
                  <th style="width: 80px">数量</th>
                  <th style="width: 100px">单价</th>
                  <th style="width: 100px">金额</th>
                  <th style="width: 100px">仓库</th>
                  <th style="width: 50px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in form.items" :key="item.id || idx">
                  <td>
                    <input
                      v-model="item.materialCode"
                      type="text"
                      class="form-input form-input-sm"
                      placeholder="编码"
                    />
                  </td>
                  <td>
                    <input
                      v-model="item.materialName"
                      type="text"
                      class="form-input form-input-sm"
                      placeholder="名称"
                    />
                  </td>
                  <td>
                    <input v-model="item.spec" type="text" class="form-input form-input-sm" placeholder="规格" />
                  </td>
                  <td>
                    <input v-model="item.unit" type="text" class="form-input form-input-sm" placeholder="单位" />
                  </td>
                  <td>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      class="form-input form-input-sm"
                      min="0"
                      placeholder="0"
                      @input="calcItemAmount(idx)"
                    />
                    <span v-if="itemErrors[idx]?.quantity" class="form-error">{{ itemErrors[idx].quantity }}</span>
                  </td>
                  <td>
                    <input
                      v-model.number="item.unitPrice"
                      type="number"
                      class="form-input form-input-sm"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      @input="calcItemAmount(idx)"
                    />
                    <span v-if="itemErrors[idx]?.unitPrice" class="form-error">{{ itemErrors[idx].unitPrice }}</span>
                  </td>
                  <td class="cell-mono">{{ formatNum(item.amount) }}</td>
                  <td>
                    <select v-model="item.warehouseId" class="form-select form-input-sm">
                      <option value="main">主仓库</option>
                      <option value="A">A区</option>
                      <option value="B">B区</option>
                      <option value="C">C区</option>
                    </select>
                  </td>
                  <td>
                    <button class="action-btn danger" title="删除行" @click="removeItem(idx)">
                      <Icon name="delete" :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="form.items.length === 0" class="empty-state">请添加采购明细行</div>
          </div>

          <!-- 合计 -->
          <div class="form-total">
            <span class="total-label">合计金额:</span>
            <span class="total-value">{{ formatNum(totalAmount) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="handleCancel">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'PurchaseFormModal' }
</script>
<script setup>
import { reactive, computed, watch } from 'vue'
import { usePurchaseStore } from '@/modules/purchase/stores/purchase'
import { generateId } from '@/utils/uid'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import DataSelect from '@/components/DataSelect.vue'
import { useSmartRecognize } from './useSmartRecognize'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useFormDraft } from '@/composables/useFormDraft'
import { useFormValidator } from '@/composables/useFormValidator'

const props = defineProps({
  order: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['save', 'cancel'])

const purchaseStore = usePurchaseStore()
const supplierStore = useSupplierStore()
const isEdit = computed(() => !!props.order?.id)

const form = reactive({
  orderNo: '',
  title: '',
  supplierId: '',
  supplierName: '',
  type: 'purchase',
  expectedDate: '',
  notes: '',
  items: []
})

const formValidator = useFormValidator(form, {
  required: [
    { key: 'supplierName', label: '供应商名称' },
    { key: 'expectedDate', label: '预计到货日' }
  ],
  dateCheck: [{ startField: 'expectedDate', endField: 'expectedDate', message: '日期格式不正确' }]
})
const warnings = computed(() => formValidator.warnings?.value || [])
const errors = computed(() => formValidator.errors?.value || [])
const hasErrors = computed(() => formValidator.hasErrors?.value || false)
const hasWarnings = computed(() => formValidator.hasWarnings?.value || false)
const clearWarnings = () => formValidator.clearWarnings?.()

const draftData = reactive({})
watch(
  [form],
  ([f]) => {
    if (!isEdit.value) {
      Object.assign(draftData, { ...f, items: f.items ? [...f.items] : [] })
    }
  },
  { deep: true }
)

const { restoreDraft, clearDraft, hasDraft } = useFormDraft('purchase-form', draftData, {
  debounce: 1500,
  onRestore: (draft) => {
    if (draft.data.items) {
      form.items = draft.data.items.map((item) => ({ ...item }))
    }
  }
})

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder,
  runSmartRecognize,
  applySmartRecognize,
  handleSmartFileUpload,
  resetSmartRec
} = useSmartRecognize(form)

const fieldErrors = reactive({
  supplierId: '',
  items: ''
})
const itemErrors = reactive({})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetErrors()
      if (props.order?.id) {
        Object.assign(form, {
          orderNo: props.order.orderNo || '',
          title: props.order.title || '',
          supplierId: props.order.supplierId || '',
          supplierName: props.order.supplierName || '',
          type: props.order.type || 'purchase',
          expectedDate: props.order.expectedDate || '',
          notes: props.order.notes || '',
          items: (props.order.items || []).map((item) => ({ ...item }))
        })
      } else {
        Object.assign(form, {
          orderNo: '',
          title: '',
          supplierId: '',
          supplierName: '',
          type: 'purchase',
          expectedDate: '',
          notes: '',
          items: []
        })
        resetSmartRec()
        if (hasDraft()) {
          restoreDraft()
        }
      }
    }
  }
)

function resetErrors() {
  fieldErrors.supplierId = ''
  fieldErrors.items = ''
  Object.keys(itemErrors).forEach((k) => delete itemErrors[k])
}

function addItem() {
  form.items.push({
    id: generateId('pi'),
    materialCode: '',
    materialName: '',
    spec: '',
    unit: 'kg',
    quantity: 0,
    unitPrice: 0,
    amount: 0,
    warehouseId: 'main',
    warehouseName: '主仓库'
  })
}

function removeItem(idx) {
  form.items.splice(idx, 1)
}

function calcItemAmount(idx) {
  const item = form.items[idx]
  if (item) {
    item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
  }
}

const totalAmount = computed(() => form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))

function onSupplierChange(event) {
  const supplier = supplierStore.suppliers.find((s) => s.id === event?.value)
  if (supplier) {
    if (!form.supplierName) form.supplierName = supplier.shortName || supplier.name || ''
    if (supplier.contactName && !form.contactName) form.contactName = supplier.contactName
    if (supplier.phone && !form.phone) form.phone = supplier.phone
    if (supplier.email && !form.email) form.email = supplier.email
  }
}

function validateForm() {
  resetErrors()
  let valid = true
  if (!form.supplierId) {
    fieldErrors.supplierId = '请选择供应商'
    valid = false
  }
  if (form.items.length === 0) {
    fieldErrors.items = '至少添加一条采购明细'
    valid = false
  }
  form.items.forEach((item, idx) => {
    const ie = {}
    if (!item.quantity || item.quantity <= 0) {
      ie.quantity = '数量必须大于0'
      valid = false
    }
    if (!item.unitPrice || item.unitPrice < 0) {
      ie.unitPrice = '单价不能为负'
      valid = false
    }
    if (Object.keys(ie).length > 0) {
      itemErrors[idx] = ie
    }
  })
  return valid
}

function handleSave() {
  formValidator.validate()
  if (hasErrors.value) {
    return
  }
  if (!validateForm()) return
  const data = {
    ...form,
    totalAmount: totalAmount.value,
    items: form.items.map((item) => ({
      ...item,
      warehouseName: item.warehouseId === 'main' ? '主仓库' : item.warehouseId + '区'
    }))
  }
  if (isEdit.value) {
    purchaseStore.updatePurchaseOrder(props.order.id, data)
  } else {
    purchaseStore.addPurchaseOrder(data)
  }
  clearDraft()
  emit('save', data)
}

function handleCancel() {
  emit('cancel')
}

function onApplySmartRecognize() {
  applySmartRecognize()
  // 填入表格明细行
  if (smartRecResult.value && smartRecResult.value.tableRows && smartRecResult.value.tableRows.length > 0) {
    smartRecResult.value.tableRows.forEach((row) => {
      form.items.push({
        id: generateId('pi'),
        materialCode: row.materialCode || '',
        materialName: row.materialName || '',
        spec: row.spec || '',
        unit: row.unit || 'kg',
        quantity: row.quantity || 0,
        unitPrice: row.unitPrice || 0,
        amount: row.quantity && row.unitPrice ? row.quantity * row.unitPrice : row.amount || 0,
        warehouseId: 'main',
        warehouseName: '主仓库'
      })
    })
  }
}

function formatNum(val) {
  const n = parseFloat(val) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.form-validation-panel {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.val-error {
  color: var(--color-danger);
  background: var(--color-danger-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  font-size: var(--font-size-sm);
}
.val-warning {
  color: var(--color-warning);
  background: var(--color-warning-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  font-size: var(--font-size-sm);
}
.modal-xl {
  max-width: 960px;
}
.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
}
.form-error {
  display: block;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
}
.form-input-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  min-width: 0;
}
.form-input:read-only {
  opacity: 0.6;
  cursor: not-allowed;
}
.items-table td {
  padding: var(--space-1);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.items-table .form-input,
.items-table .form-select {
  width: 100%;
}
.form-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-3);
}
.total-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}
.total-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
</style>
