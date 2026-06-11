<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 720px">
      <div class="modal-header">
        <span class="modal-title">新增盘点单</span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 基本信息 -->
        <div class="form-row" style="margin-bottom: var(--space-4)">
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 盘点类型</label>
            <select v-model="form.type" class="form-select" :class="{ 'form-error': errors.type }">
              <option value="full">全盘</option>
              <option value="partial">抽盘</option>
              <option value="cycle">循环盘点</option>
            </select>
            <div v-if="errors.type" class="form-error-text">{{ errors.type }}</div>
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 仓库</label>
            <select v-model="form.warehouseId" class="form-select" :class="{ 'form-error': errors.warehouseId }">
              <option value="main">主仓库</option>
            </select>
            <div v-if="errors.warehouseId" class="form-error-text">{{ errors.warehouseId }}</div>
          </div>
        </div>

        <div class="form-row" style="margin-bottom: var(--space-4)">
          <div class="form-group" style="flex: 1">
            <label class="form-label"><span class="required">*</span> 计划日期</label>
            <input v-model="form.plannedDate" type="date" class="form-input" :class="{ 'form-error': errors.plannedDate }" />
            <div v-if="errors.plannedDate" class="form-error-text">{{ errors.plannedDate }}</div>
          </div>
          <div class="form-group" style="flex: 1">
            <label class="form-label">盘点人</label>
            <input v-model="form.executor" type="text" class="form-input" placeholder="请输入盘点人" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-4)">
          <label class="form-label">备注</label>
          <textarea v-model="form.notes" class="form-input" rows="2" placeholder="备注信息..."></textarea>
        </div>

        <!-- 物料选择 -->
        <div class="form-group">
          <label class="form-label"><span class="required">*</span> 选择盘点物料</label>
          <div class="filter-bar" style="margin-bottom: var(--space-2)">
            <input v-model="materialSearch" type="text" class="form-input" placeholder="搜索编号/名称..." style="width: 200px" />
            <select v-model="materialCategoryFilter" class="form-select" style="width: auto; min-width: 120px">
              <option value="">全部类别</option>
              <option value="raw">原材料</option>
            </select>
            <button class="btn btn-sm btn-outline" @click="selectAllMaterials">全选</button>
            <button class="btn btn-sm btn-ghost" @click="deselectAllMaterials">取消全选</button>
          </div>
          <div class="material-select-list">
            <label
              v-for="item in filteredMaterials"
              :key="item.id"
              class="material-select-item"
              :class="{ selected: selectedMaterialIds.includes(item.id) }"
            >
              <input type="checkbox" :value="item.id" v-model="selectedMaterialIds" style="margin-right: var(--space-2)" />
              <span class="cell-mono" style="min-width: 80px">{{ item.code }}</span>
              <span style="flex: 1">{{ item.name }}</span>
              <span style="color: var(--color-text-tertiary); font-size: var(--font-size-xs)">{{ item.grade || '' }}</span>
            </label>
            <div v-if="filteredMaterials.length === 0" class="empty-state">无匹配物料</div>
          </div>
          <div v-if="errors.materials" class="form-error-text">{{ errors.materials }}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)">
            已选择 {{ selectedMaterialIds.length }} 种物料
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
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useStocktakingStore } from '@/modules/warehouse/stores/stocktaking'

const emit = defineEmits(['close', 'created'])

const invStore = useInventoryStore()
const stocktakingStore = useStocktakingStore()

const form = ref({
  type: 'full',
  warehouseId: 'main',
  plannedDate: new Date().toISOString().split('T')[0],
  executor: '',
  notes: ''
})

const errors = ref({})
const materialSearch = ref('')
const materialCategoryFilter = ref('')
const selectedMaterialIds = ref([])

const filteredMaterials = computed(() => {
  let list = invStore.inventory || []
  if (materialCategoryFilter.value) {
    list = list.filter(i => i.category === materialCategoryFilter.value)
  }
  if (materialSearch.value) {
    const kw = materialSearch.value.toLowerCase()
    list = list.filter(i =>
      (i.code || '').toLowerCase().includes(kw) ||
      (i.name || '').toLowerCase().includes(kw)
    )
  }
  return list
})

function selectAllMaterials() {
  selectedMaterialIds.value = filteredMaterials.value.map(i => i.id)
}

function deselectAllMaterials() {
  selectedMaterialIds.value = []
}

function validate() {
  const e = {}
  if (!form.value.type) e.type = '请选择盘点类型'
  if (!form.value.warehouseId) e.warehouseId = '请选择仓库'
  if (!form.value.plannedDate) e.plannedDate = '请选择计划日期'
  if (selectedMaterialIds.value.length === 0) e.materials = '请至少选择一种物料'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return

  const selectedItems = (invStore.inventory || []).filter(i => selectedMaterialIds.value.includes(i.id))
  const warehouseMap = { main: '主仓库' }

  const order = stocktakingStore.addStocktakingOrder({
    type: form.value.type,
    warehouseId: form.value.warehouseId,
    warehouseName: warehouseMap[form.value.warehouseId] || form.value.warehouseId,
    plannedDate: form.value.plannedDate,
    executor: form.value.executor,
    notes: form.value.notes,
    items: selectedItems
  })

  emit('created', order)
  emit('close')
}
</script>

<style scoped>
.material-select-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
}
.material-select-item {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
  font-size: var(--font-size-sm);
}
.material-select-item:last-child { border-bottom: none; }
.material-select-item:hover { background: var(--color-surface-hover); }
.material-select-item.selected { background: var(--color-accent-subtle); }
.form-error {
  border-color: var(--color-danger) !important;
}
.form-error-text {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--space-1);
}
</style>
