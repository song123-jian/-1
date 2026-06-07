<template>
  <div class="inv-section" id="section-alert">
    <div class="inv-section-header" @click="emit('toggle')">
      <span class="inv-section-icon"><Icon name="warning" :size="14" /></span>
      <span class="inv-section-title">预警中心</span>
      <span class="inv-section-count">{{ inventoryStore.exhaustedCount + inventoryStore.lowStockCount }} 项预警</span>
      <span class="inv-section-toggle"><Icon :name="isOpen ? 'chevronDown' : 'chevronRight'" :size="14" /></span>
    </div>
    <div v-show="isOpen" class="inv-section-body">
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)"><Icon name="warning" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.exhaustedCount }}</div>
          <div class="inv-stat-label">库存耗尽</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="warning" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.lowStockCount }}</div>
          <div class="inv-stat-label">低库存预警</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-info-subtle);color:var(--color-info)"><Icon name="chart" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.overStockCount }}</div>
          <div class="inv-stat-label">超量库存</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="check" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.normalStockCount }}</div>
          <div class="inv-stat-label">库存正常</div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="warning" :size="14" /> 预警物料列表</span>
          <span class="result-count">共 {{ inventoryStore.alertItems.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>物料名称</th>
                  <th>当前库存</th>
                  <th>安全库存</th>
                  <th>库存缺口</th>
                  <th>预警状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="inventoryStore.alertItems.length === 0">
                  <td colspan="7" class="empty-cell"><Icon name="check" :size="14" /> 所有物料库存正常，无预警信息</td>
                </tr>
                <tr v-for="item in inventoryStore.alertItems" :key="item.id">
                  <td class="cell-mono">{{ item.code }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td :style="{ color: alertColor(item.alertStatus), fontWeight: 700 }">{{ item.stock.toFixed(1) }}</td>
                  <td>{{ item.safetyStockVal }}</td>
                  <td class="cell-mono" style="color:var(--color-danger)">{{ (item.safetyStockVal - item.stock).toFixed(1) }}</td>
                  <td><span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span></td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-accent)" @click="emit('quick-inbound', item)">快速补货</button>
                    <button class="btn btn-ghost btn-sm" @click="emit('edit-item', item)">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useInventoryStore } from '@/stores/inventory'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['toggle', 'edit-item', 'quick-inbound'])

const inventoryStore = useInventoryStore()

function alertColor(status) {
  return inventoryStore.ALERT_STATUS_COLORS[status] || 'var(--color-text-secondary)'
}
</script>

<style scoped>
.inv-section {
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}
.inv-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.inv-section-header:hover {
  background: var(--color-surface-hover);
}
.inv-section-icon { font-size: 1.3em; line-height: 1; }
.inv-section-title { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text-primary); flex: 1; }
.inv-section-count { font-size: var(--font-size-sm); color: var(--color-text-secondary); background: var(--color-surface); padding: 2px var(--space-2); border-radius: var(--radius-sm); }
.inv-section-toggle { font-size: var(--font-size-sm); color: var(--color-text-secondary); width: 20px; text-align: center; }
.inv-section-body { padding: var(--space-3); }

.inv-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.inv-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.inv-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.inv-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.inv-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.inv-table-wrap {
  overflow-x: auto;
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.inv-table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  font-size: var(--font-size-sm);
  letter-spacing: 0.02em;
}

.inv-table td {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  vertical-align: middle;
}

.inv-table tr:hover td {
  background: var(--color-surface-hover);
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

.cell-actions {
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
}

.alert-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
}

.alert-exhausted {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.alert-low {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.alert-ok {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.alert-over {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}
</style>
