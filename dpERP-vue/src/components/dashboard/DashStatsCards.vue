<template>
  <div class="dash-highlight-grid stats-grid-4">
    <div class="dash-stat-card" style="--card-color: var(--color-accent)">
      <div class="dash-stat-label">本月营收</div>
      <div class="dash-stat-value" style="color: var(--color-accent)">¥{{ formatNumber(totalRevenue) }}</div>
      <div class="dash-stat-sub">
        <span :style="{ color: revenueGrowth >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }">
          <Icon v-if="revenueGrowth >= 0" name="chevronUp" :size="14" />
          <Icon v-else name="chevronDown" :size="14" />
          {{ Math.abs(revenueGrowth) }}%
        </span>
        较上月
      </div>
    </div>
    <div class="dash-stat-card" style="--card-color: var(--color-success)">
      <div class="dash-stat-label">回款率</div>
      <div class="dash-stat-value" style="color: var(--color-success)">{{ collectionRate }}%</div>
      <div class="dash-stat-sub">本月回款: ¥{{ formatNumber(monthCollected) }}</div>
    </div>
    <div class="dash-stat-card" style="--card-color: var(--color-warning)">
      <div class="dash-stat-label">待处理</div>
      <div class="dash-stat-value" style="color: var(--color-warning)">
        {{ quotationStore.pendingCount }} 报价 / {{ contractStore.pendingApprovalCount }} 合同
      </div>
    </div>
    <div class="dash-stat-card" style="--card-color: var(--color-danger)">
      <div class="dash-stat-label">预警</div>
      <div class="dash-stat-value" style="color: var(--color-danger)">
        {{ inventoryStore.lowStockCount + inventoryStore.exhaustedCount }} 低库存 / {{ todoStore.stats.overdue }} 逾期
      </div>
    </div>
  </div>

  <div class="stats-row stats-grid-7">
    <div class="stat-card" v-for="stat in statCards" :key="stat.label">
      <div class="stat-card-header">
        <div class="stat-card-icon" :style="{ background: stat.bgColor, color: stat.color }"><Icon :name="stat.icon" :size="14" /></div>
      </div>
      <div class="stat-card-value">{{ stat.value }}</div>
      <div class="stat-card-label">{{ stat.label }}</div>
      <div class="stat-card-change" :style="{ color: stat.changeColor || 'var(--color-text-tertiary)' }">{{ stat.change }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalRevenue: { type: Number, default: 0 },
  revenueGrowth: { type: Number, default: 0 },
  collectionRate: { type: Number, default: 0 },
  monthCollected: { type: Number, default: 0 },
  quotationStore: { type: Object, required: true },
  contractStore: { type: Object, required: true },
  inventoryStore: { type: Object, required: true },
  todoStore: { type: Object, required: true },
  statCards: { type: Array, default: () => [] },
  formatNumber: { type: Function, required: true }
})
</script>

<style scoped>
.dash-highlight-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.stats-grid-7 {
  grid-template-columns: repeat(7, 1fr);
}
.dash-stat-card {
  background: var(--color-surface-elevated);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--card-color, var(--color-accent));
  transition: transform var(--transition-fast);
}
.dash-stat-card:hover {
  transform: translateY(-2px);
}
.dash-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.dash-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
  margin-bottom: var(--space-1);
}
.dash-stat-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.stats-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .stats-grid-7 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .stats-grid-7 { grid-template-columns: repeat(2, 1fr); }
}
</style>
