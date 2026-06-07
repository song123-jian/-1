<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 800px">
      <div class="modal-header">
        <span class="modal-title">新增调拨单</span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 基本信息 -->
        <div class="form-row" style="margin-bottom: var(--space-4)">
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 调拨类型</label>
            <select v-model="form.type" class="form-select" :class="{ 'form-error': errors.type }">
              <option value="same_price">同价调拨</option>
              <option value="diff_price">异价调拨</option>
            </select>
            <div v-if="errors.type" class="form-error-text">{{ errors.type }}</div>
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 调出仓库</label>
            <DataSelect
              module="warehouse"
              v-model="form.fromWarehouseId"
              value-field="id"
              label-field="name"
              placeholder="选择调出仓库"
              :class="{ 'form-error': errors.fromWarehouseId }"
              @change="onFromWarehouseChange"
            />
            <div v-if="errors.fromWarehouseId" class="form-error-text">{{ errors.fromWarehouseId }}</div>
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 调入仓库</label>
            <DataSelect
              module="warehouse"
              v-model="form.toWarehouseId"
              value-field="id"
              label-field="name"
              placeholder="选择调入仓库"
              :class="{ 'form-error': errors.toWarehouseId }"
              @change="onToWarehouseChange"
            />
            <div v-if="errors.toWarehouseId" class="form-error-text">{{ errors.toWarehouseId }}</div>
          </div>
        </div>

        <!-- 仓位级联 -->
        <div class="form-row" style="margin-bottom: var(--space-4)">
          <div class="form-group" style="flex: 1">
            <label class="form-label">调出仓位</label>
            <DataSelect
              module="warehouseLocation"
              variant="byWarehouse"
              v-model="form.fromLocation"
              value-field="locationCode"
              label-field="locationCode"
              placeholder="选择调出仓位"
              :parent-filters="[{ field: 'warehouseName', operator: 'eq', value: form.fromWarehouseId }]"
            />
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label">调入仓位</label>
            <DataSelect
              module="warehouseLocation"
              variant="byWarehouse"
              v-model="form.toLocation"
              value-field="locationCode"
              label-field="locationCode"
              placeholder="选择调入仓位"
              :parent-filters="[{ field: 'warehouseName', operator: 'eq', value: form.toWarehouseId }]"
            />
          </div>
        </div>

        <div class="form-row" style="margin-bottom: var(--space-4)">
          <div class="form-group" style="flex: 1">
            <label class="form-label">申请人</label>
            <input v-model="form.requester" type="text" class="form-input" placeholder="请输入申请人" />
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label">计划到货日期</label>
            <input v-model="form.expectedDate" type="date" class="form-input" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-4)">
          <label class="form-label">备注</label>
          <textarea v-model="form.notes" class="form-input" rows="2" placeholder="备注信息..."></textarea>
        </div>

        <!-- 物料明细 -->
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2)">
            <label class="form-label" style="margin-bottom: 0"><span class="required">*</span> 物料明细</label>
            <button class="btn btn-sm btn-outline" @click="addItem">
              <Icon name="plus" :size="12" /> 添加物料
            </button>
          </div>
          <div v-if="errors.items" class="form-error-text" style="margin-bottom: var(--space-2)">{{ errors.items }}</div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>物料</th>
                  <th>规格</th>
                  <th>单位</th>
                  <th>数量</th>
                  <th v-if="form.type === 'diff_price'">单价</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in form.items" :key="idx">
                  <td>
                    <DataSelect
                      module="inventory"
                      variant="inStock"
                      v-model="item.materialCode"
                      value-field="code"
                      label-field="name"
                      placeholder="选择物料"
                      style="min-width: 140px"
                      @change="onMaterialChange(idx, $event)"
                    />
                  </td>
                  <td><input v-model="item.spec" type="text" class="form-input" style="width: 100px" placeholder="规格" /></td>
                  <td><input v-model="item.unit" type="text" class="form-input" style="width: 60px" placeholder="单位" /></td>
                  <td>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      class="form-input"
                      style="width: 80px; text-align: right"
                      min="0"
                      step="0.01"
                      @input="calcItemAmount(idx)"
                    />
                  </td>
                  <td v-if="form.type === 'diff_price'">
                    <input
                      v-model.number="item.unitPrice"
                      type="number"
                      class="form-input"
                      style="width: 100px; text-align: right"
                      min="0"
                      step="0.01"
                      @input="calcItemAmount(idx)"
                    />
                  </td>
                  <td class="cell-mono">{{ formatMoney(item.amount) }}</td>
                  <td>
                    <button class="action-btn danger" @click="removeItem(idx)">
                      <Icon name="trash" :size="12" />
                    </button>
                  </td>
                </tr>
                <tr v-if="form.items.length === 0">
                  <td :colspan="form.type === 'diff_price' ? 7 : 6" class="empty-state">请添加物料明细</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="text-align: right; margin-top: var(--space-2); font-size: var(--font-size-sm)">
            合计金额: <strong style="color: var(--color-accent)">{{ formatMoney(totalAmount) }}</strong>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">
          <Icon name="check" :size="14" /> 确认创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useTransferStore } from '@/stores/transfer'
import DataSelect from '@/components/DataSelect.vue'

const emit = defineEmits(['close', 'created'])

const invStore = useInventoryStore()
const transferStore = useTransferStore()

const form = ref({
  type: 'same_price',
  fromWarehouseId: '',
  toWarehouseId: '',
  fromLocation: '',
  toLocation: '',
  requester: '',
  expectedDate: '',
  notes: '',
  items: []
})

const errors = ref({})

const inventoryList = computed(() => invStore.inventory || [])

const totalAmount = computed(() => form.value.items.reduce((s, i) => s + (i.amount || 0), 0))

function addItem() {
  form.value.items.push({
    materialCode: '',
    materialName: '',
    spec: '',
    unit: 'kg',
    quantity: 0,
    unitPrice: 0,
    amount: 0
  })
}

function removeItem(idx) {
  form.value.items.splice(idx, 1)
}

/* DataSelect change 事件提供 { value, data, option }，data 为完整数据对象 */
function onMaterialChange(idx, event) {
  const item = form.value.items[idx]
  const inv = event?.data
  if (inv) {
    item.materialName = inv.name || ''
    item.spec = inv.grade || ''
    item.unit = inv.unit || 'kg'
    if (form.value.type === 'same_price') {
      item.unitPrice = parseFloat(inv.unitCost) || 0
    }
    calcItemAmount(idx)
  }
}

/* 仓库变更时清空对应仓位 */
function onFromWarehouseChange() {
  form.value.fromLocation = ''
}

function onToWarehouseChange() {
  form.value.toLocation = ''
}

function calcItemAmount(idx) {
  const item = form.value.items[idx]
  item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
}

function validate() {
  const e = {}
  if (!form.value.type) e.type = '请选择调拨类型'
  if (!form.value.fromWarehouseId) e.fromWarehouseId = '请选择调出仓库'
  if (!form.value.toWarehouseId) e.toWarehouseId = '请选择调入仓库'
  if (form.value.fromWarehouseId && form.value.toWarehouseId && form.value.fromWarehouseId === form.value.toWarehouseId) {
    e.toWarehouseId = '调入仓库不能与调出仓库相同'
  }
  if (form.value.items.length === 0) {
    e.items = '请至少添加一条物料明细'
  } else {
    const hasEmpty = form.value.items.some(i => !i.materialCode)
    if (hasEmpty) e.items = '请为所有明细行选择物料'
    const hasZeroQty = form.value.items.some(i => !i.quantity || i.quantity <= 0)
    if (!hasEmpty && hasZeroQty) e.items = '物料数量必须大于0'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return

  transferStore.addTransferOrder({
    type: form.value.type,
    fromWarehouseId: form.value.fromWarehouseId,
    fromWarehouseName: form.value.fromWarehouseId || '',
    toWarehouseId: form.value.toWarehouseId,
    toWarehouseName: form.value.toWarehouseId || '',
    fromLocation: form.value.fromLocation,
    toLocation: form.value.toLocation,
    requester: form.value.requester,
    expectedDate: form.value.expectedDate,
    notes: form.value.notes,
    items: form.value.items
  })

  emit('created')
  emit('close')
}

function formatMoney(val) {
  if (!val && val !== 0) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.form-error {
  border-color: var(--color-danger) !important;
}
.form-error-text {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: 2px;
}
</style>
