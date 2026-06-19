<template>
  <div class="inventory-management-page">
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
  showItemModal.value = true
}

function closeItemModal() {
  showItemModal.value = false
  editingItemId.value = null
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
