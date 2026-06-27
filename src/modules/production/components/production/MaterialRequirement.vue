<template>
  <div class="material-requirement">
    <div class="mr-header">
      <div class="mr-title">
        <Icon name="calculator" :size="14" />
        物料需求计划 (MRP)
      </div>
    </div>

    <!-- MRP输入 -->
    <div class="mr-input-section">
      <div class="form-row form-row-3">
        <div class="form-group">
          <label class="form-label">
            选择产品BOM
            <span class="required">*</span>
          </label>
          <select v-model="selectedBomId" class="form-select" @change="handleBomChange">
            <option value="">请选择BOM</option>
            <option v-for="bom in activeBomList" :key="bom.id" :value="bom.id">
              {{ bom.code }} - {{ bom.productName || bom.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">
            生产数量
            <span class="required">*</span>
          </label>
          <input
            v-model.number="planQuantity"
            type="number"
            class="form-input"
            min="1"
            placeholder="计划生产数量"
            @input="calculateRequirement"
          />
        </div>
        <div class="form-group">
          <label class="form-label">&nbsp;</label>
          <button
            class="btn btn-primary btn-sm"
            :disabled="!selectedBomId || planQuantity <= 0"
            @click="calculateRequirement"
          >
            <Icon name="calculator" :size="14" />
            计算需求
          </button>
        </div>
      </div>
    </div>

    <!-- MRP结果 -->
    <div v-if="requirementResults.length > 0" class="mr-results">
      <div class="mr-summary">
        <div class="mr-summary-item">
          <span class="mr-summary-label">物料种类</span>
          <span class="mr-summary-value">{{ requirementResults.length }}</span>
        </div>
        <div class="mr-summary-item">
          <span class="mr-summary-label">充足物料</span>
          <span class="mr-summary-value" style="color: var(--color-success)">{{ sufficientCount }}</span>
        </div>
        <div class="mr-summary-item">
          <span class="mr-summary-label">缺口物料</span>
          <span class="mr-summary-value" style="color: var(--color-danger)">{{ shortageCount }}</span>
        </div>
      </div>

      <div class="mr-table-wrap">
        <table class="inv-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>物料名称</th>
              <th>规格</th>
              <th>需求数量</th>
              <th>当前库存</th>
              <th>缺口数量</th>
              <th>状态</th>
              <th>采购建议</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in requirementResults"
              :key="item.materialCode"
              :class="{ 'row-shortage': item.shortage > 0 }"
            >
              <td class="cell-mono">{{ item.materialCode }}</td>
              <td>
                <strong>{{ item.materialName }}</strong>
              </td>
              <td>{{ item.spec || '-' }}</td>
              <td class="cell-mono">{{ item.requiredQty.toFixed(2) }} {{ item.unit }}</td>
              <td class="cell-mono">{{ item.stockQty.toFixed(2) }} {{ item.unit }}</td>
              <td
                class="cell-mono"
                :style="{ color: item.shortage > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }"
              >
                {{ item.shortage > 0 ? item.shortage.toFixed(2) : '0' }} {{ item.unit }}
              </td>
              <td>
                <span class="mr-status-badge" :class="item.shortage > 0 ? 'status-shortage' : 'status-sufficient'">
                  {{ item.shortage > 0 ? '缺口' : '充足' }}
                </span>
              </td>
              <td>
                <span v-if="item.shortage > 0" class="mr-purchase-suggest">
                  建议采购 {{ item.shortage.toFixed(2) }} {{ item.unit }}
                </span>
                <span v-else style="color: var(--color-text-tertiary)">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="mr-empty">
      <Icon name="info" :size="16" />
      <span>请选择产品BOM并输入生产数量，点击"计算需求"查看物料需求分析</span>
    </div>
  </div>
</template>

<script>
export default { name: 'MaterialRequirement' }
</script>
<script setup>
import { ref, computed } from 'vue'
import { useBomStore } from '@/modules/production/stores/bom'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'

const props = defineProps({
  bomId: { type: String, default: '' },
  quantity: { type: Number, default: 0 }
})

const bomStore = useBomStore()
const inventoryStore = useInventoryStore()

const selectedBomId = ref(props.bomId || '')
const planQuantity = ref(props.quantity || 0)
const requirementResults = ref([])

const activeBomList = computed(() => bomStore.activeBomList)

const sufficientCount = computed(() => requirementResults.value.filter((r) => r.shortage <= 0).length)
const shortageCount = computed(() => requirementResults.value.filter((r) => r.shortage > 0).length)

function handleBomChange() {
  requirementResults.value = []
}

function calculateRequirement() {
  if (!selectedBomId.value || planQuantity.value <= 0) {
    requirementResults.value = []
    return
  }

  const bom = bomStore.getBomById(selectedBomId.value)
  if (!bom || !bom.components) {
    requirementResults.value = []
    return
  }

  const results = []
  for (const comp of bom.components) {
    const requiredQty =
      (parseFloat(comp.quantity) || 0) *
      (parseFloat(planQuantity.value) || 0) *
      (1 + (parseFloat(comp.scrapRate) || 0) / 100)
    const invItem = inventoryStore.inventory.find((i) => i.code === comp.materialCode)
    const stockQty = invItem ? parseFloat(invItem.quantity) || 0 : 0
    const shortage = Math.max(0, requiredQty - stockQty)

    results.push({
      materialCode: comp.materialCode,
      materialName: comp.materialName,
      spec: comp.spec || (invItem ? invItem.grade : ''),
      unit: comp.unit,
      requiredQty,
      stockQty,
      shortage
    })
  }

  requirementResults.value = results
}

/* 初始化时如果有props则自动计算 */
if (props.bomId && props.quantity > 0) {
  calculateRequirement()
}
</script>

<style scoped>
.material-requirement {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.mr-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}

.mr-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.mr-input-section {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.form-row-3 > .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-input,
.form-select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.mr-results {
  padding: var(--space-4);
}

.mr-summary {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.mr-summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.mr-summary-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.mr-summary-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.mr-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.inv-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  font-size: var(--font-size-xs);
  background: var(--color-surface-elevated);
}

.inv-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  vertical-align: middle;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.inv-table tr:hover td {
  background: var(--color-surface-hover);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.inv-table tr.row-shortage td {
  background: var(--color-danger-subtle);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.inv-table tr.row-shortage:hover td {
  background: rgba(239, 68, 68, 0.2);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

.mr-status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.status-sufficient {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.status-shortage {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.mr-purchase-suggest {
  font-size: var(--font-size-xs);
  color: var(--color-warning);
  font-weight: 500;
}

.mr-empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .form-row-3 {
    flex-direction: column;
    gap: 0;
  }
  .mr-summary {
    flex-direction: column;
    gap: var(--space-3);
  }
}
</style>
