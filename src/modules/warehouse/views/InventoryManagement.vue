<template>
  <div class="inventory-management-page">
    <div class="page-header" style="margin-bottom: var(--space-4)">
      <div>
        <h2 class="page-header-title">库存管理</h2>
        <p class="page-header-subtitle">先看库存预警，再查明细，最后处理补货和调整</p>
      </div>
    </div>
    <StockSection @edit-item="openEditItem" @open-inbound-wizard="handleOpenInbound" />

    <AlertSection
      :is-open="alertOpen"
      @toggle="alertOpen = !alertOpen"
      @edit-item="openEditItem"
      @quick-inbound="handleQuickInbound"
    />

    <!-- 新增/编辑物料模态框 -->
    <Teleport to="body">
      <div v-if="showItemModal" class="wizard-overlay" @click.self="closeItemModal">
        <div class="wizard-modal">
          <div class="wizard-header">
            <h3>{{ editingItemId ? '编辑物料' : '新增物料' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closeItemModal"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <SmartRecognizePanel
              v-if="!editingItemId"
              v-model:show-smart-rec="showSmartRec"
              v-model:smart-rec-input="smartRecInput"
              :smart-rec-result="smartRecResult"
              :placeholder="smartRecPlaceholder"
              @run-smart-recognize="runSmartRecognize"
              @apply-smart-recognize="applySmartRecognize"
              @handle-smart-file-upload="handleSmartFileUpload"
              @clear="resetSmartRec"
            />
            <!-- 基本信息 -->
            <div class="form-section">
              <div class="form-section-title">基本信息</div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">
                    编号
                    <span class="required">*</span>
                  </label>
                  <input
                    v-model="itemForm.code"
                    type="text"
                    class="form-input"
                    placeholder="如 MTL-001"
                    :readonly="!!editingItemId"
                    :style="editingItemId ? 'opacity:0.7;cursor:not-allowed' : ''"
                    title="物料唯一编码，保存后不可修改"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">
                    物料名称
                    <span class="required">*</span>
                  </label>
                  <input
                    v-model="itemForm.name"
                    type="text"
                    class="form-input"
                    placeholder="如 ABS树脂"
                    title="物料显示名称"
                  />
                </div>
              </div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">类别</label>
                  <select v-model="itemForm.category" class="form-select" title="物料所属类别">
                    <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    仓库
                    <span class="required">*</span>
                  </label>
                  <select v-model="itemForm.warehouse" class="form-select" title="物料存放仓库">
                    <option v-for="wh in warehouseOptions" :key="wh.value" :value="wh.value">{{ wh.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">库位/货位</label>
                  <input
                    v-model="itemForm.location"
                    type="text"
                    class="form-input"
                    placeholder="如: A-01-03"
                    title="物料在仓库中的具体存放位置"
                  />
                </div>
              </div>
            </div>

            <!-- 库存信息 -->
            <div class="form-section">
              <div class="form-section-title">库存信息</div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">数量</label>
                  <input
                    v-model.number="itemForm.quantity"
                    type="number"
                    class="form-input"
                    min="0"
                    title="当前库存数量"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">安全库存</label>
                  <input
                    v-model.number="itemForm.safetyStock"
                    type="number"
                    class="form-input"
                    min="0"
                    step="1"
                    title="低于此数量将触发低库存预警"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">最大库存</label>
                  <input
                    v-model.number="itemForm.maxStock"
                    type="number"
                    class="form-input"
                    min="0"
                    step="1"
                    title="超过此数量将触发超量预警，0表示不限制"
                  />
                </div>
              </div>
            </div>

            <!-- 成本信息 -->
            <div class="form-section">
              <div class="form-section-title">成本信息</div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">单位成本</label>
                  <input
                    v-model.number="itemForm.unitCost"
                    type="number"
                    class="form-input"
                    min="0"
                    step="0.01"
                    title="单个物料的采购成本，用于计算库存总价值"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">等级/牌号</label>
                  <input
                    v-model="itemForm.grade"
                    type="text"
                    class="form-input"
                    placeholder="如: 通用级"
                    title="物料的等级或牌号信息"
                  />
                </div>
              </div>
            </div>

            <div v-if="formErrors.length > 0" class="form-errors">
              <div v-for="(err, idx) in formErrors" :key="idx" class="form-error">{{ err }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeItemModal">取消</button>
            <button class="btn btn-primary" @click="handleSaveItem">{{ editingItemId ? '更新' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default { name: 'InventoryManagement' }
</script>
<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore, categoryOptions, warehouseOptions } from '@/modules/warehouse/stores/inventory'
import StockSection from '@/modules/warehouse/components/inventory/StockSection.vue'
import AlertSection from '@/modules/warehouse/components/inventory/AlertSection.vue'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useSmartRecognizeBase, makeItem } from '@/composables/useSmartRecognizeBase'

const router = useRouter()
const inventoryStore = useInventoryStore()

/* 物料编辑模态框 */
const showItemModal = ref(false)
const editingItemId = ref(null)
const alertOpen = ref(true)
const formErrors = ref([])
const itemForm = reactive({
  code: '',
  name: '',
  category: 'raw',
  warehouse: 'main',
  quantity: 0,
  safetyStock: 50,
  maxStock: 0,
  unitCost: 0,
  grade: '',
  color: '',
  location: ''
})

function parseInventoryItemInfo(text) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0

  const pushItem = (key, label, value, confidence) => {
    items.push(makeItem(key, label, value, confidence))
    identifiedCount += 1
    if (confidence < 80) lowConfCount += 1
  }

  const codeMatch = text.match(/(?:编号|物料编号|物料编码|物料号)[:\s：]*([A-Za-z0-9_-]{2,30})/)
  if (codeMatch) pushItem('code', '编号', codeMatch[1], 90)

  const nameMatch = text.match(/(?:物料名称|名称)[:\s：]*([^\n\r]{2,40})/)
  if (nameMatch) pushItem('name', '物料名称', nameMatch[1].trim(), 85)

  const categoryMatch = text.match(/(?:类别|类型|物料类别)[:\s：]*([^\n\r]{2,20})/)
  if (categoryMatch) pushItem('category', '类别', categoryMatch[1].trim(), 70)

  const warehouseMatch = text.match(/(?:仓库|仓库名称)[:\s：]*([^\n\r]{2,20})/)
  if (warehouseMatch) pushItem('warehouse', '仓库', warehouseMatch[1].trim(), 85)

  const locationMatch = text.match(/(?:库位|货位|位置)[:\s：]*([^\n\r]{2,30})/)
  if (locationMatch) pushItem('location', '库位/货位', locationMatch[1].trim(), 80)

  const quantityMatch = text.match(/(?:数量|库存数量)[:\s：]*([\d.]+)/)
  if (quantityMatch) pushItem('quantity', '数量', Number(quantityMatch[1]), 85)

  const safetyMatch = text.match(/(?:安全库存|安全库存量)[:\s：]*([\d.]+)/)
  if (safetyMatch) pushItem('safetyStock', '安全库存', Number(safetyMatch[1]), 85)

  const maxMatch = text.match(/(?:最大库存|库存上限|最大存量)[:\s：]*([\d.]+)/)
  if (maxMatch) pushItem('maxStock', '最大库存', Number(maxMatch[1]), 75)

  const costMatch = text.match(/(?:单位成本|成本|单价)[:\s：]*([\d.]+)/)
  if (costMatch) pushItem('unitCost', '单位成本', Number(costMatch[1]), 85)

  const gradeMatch = text.match(/(?:等级|牌号)[:\s：]*([^\n\r]{1,20})/)
  if (gradeMatch) pushItem('grade', '等级/牌号', gradeMatch[1].trim(), 70)

  return { items, identifiedCount, lowConfCount }
}

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder,
  runSmartRecognize,
  applySmartRecognize,
  handleSmartFileUpload,
  resetSmartRec
} = useSmartRecognizeBase(itemForm, parseInventoryItemInfo, '粘贴物料资料或表格文本，系统将自动识别并提取编号、名称、仓库、数量、成本和规格。')

function openEditItem(item) {
  formErrors.value = []
  if (!item) {
    editingItemId.value = null
    Object.assign(itemForm, {
      code: '',
      name: '',
      category: 'raw',
      warehouse: 'main',
      quantity: 0,
      safetyStock: 50,
      maxStock: 0,
      unitCost: 0,
      grade: '',
      color: '',
      location: ''
    })
  } else {
    editingItemId.value = item.id
    Object.assign(itemForm, {
      code: item.code,
      name: item.name,
      category: item.category || 'raw',
      warehouse: item.warehouse || 'main',
      quantity: item.quantity || item.stock || 0,
      safetyStock: item.safetyStock || 50,
      maxStock: item.maxStock || 0,
      unitCost: item.unitCost || 0,
      grade: item.grade || '',
      color: item.color || '',
      location: item.location || ''
    })
  }
  resetSmartRec()
  showItemModal.value = true
}

function closeItemModal() {
  showItemModal.value = false
  editingItemId.value = null
  resetSmartRec()
}

function handleSaveItem() {
  formErrors.value = []

  // 编码必填
  if (!itemForm.code || !itemForm.code.trim()) {
    formErrors.value.push('编号为必填项')
  }
  // 名称必填
  if (!itemForm.name || !itemForm.name.trim()) {
    formErrors.value.push('物料名称为必填项')
  }
  // 编码唯一性校验（新增时或编辑时编码变更）
  if (itemForm.code) {
    const existing = inventoryStore.inventory.find((i) => i.code === itemForm.code && i.id !== editingItemId.value)
    if (existing) {
      formErrors.value.push('编号已存在，请使用其他编码')
    }
  }
  // 数量非负校验
  if (itemForm.quantity !== undefined && itemForm.quantity !== '' && Number(itemForm.quantity) < 0) {
    formErrors.value.push('数量不能为负数')
  }
  // 仓库必选校验
  if (!itemForm.warehouse) {
    formErrors.value.push('请选择仓库')
  }

  if (formErrors.value.length > 0) return

  if (editingItemId.value) {
    inventoryStore.updateInventoryItem(editingItemId.value, { ...itemForm })
  } else {
    inventoryStore.addInventoryItem({ ...itemForm })
  }
  closeItemModal()
}

function handleOpenInbound() {
  router.push('/inbound').catch(() => {})
}

function handleQuickInbound(item) {
  router.push({ path: '/inbound', query: { materialCode: item.code, materialName: item.name } }).catch(() => {})
}
</script>

<style scoped>
.inventory-management-page {
  width: 100%;
}

/* ====== 表单分组 ====== */
.form-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}
.form-section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.form-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background: var(--color-accent);
  border-radius: 2px;
}

/* ====== 必填字段指示器 ====== */
.required {
  color: var(--color-danger);
  font-weight: 700;
  margin-left: 2px;
}

.form-errors {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.form-error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  padding: var(--space-1) 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .form-row-2 {
    flex-direction: column;
    gap: 0;
  }
  .form-row-3 {
    flex-direction: column;
    gap: 0;
  }
}
</style>
