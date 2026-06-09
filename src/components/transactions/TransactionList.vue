<template>
  <div class="list-view">
    <div v-for="(t, idx) in transactions" :key="t.id" class="list-item" :style="{ animationDelay: idx * 50 + 'ms' }" @click="emit('viewDetail', t)">
      <div class="list-item-header">
        <span class="list-item-title">{{ t.refNo }}</span>
        <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
        <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">{{ statusLabels[t.status] || t.status }}</span>
      </div>
      <div class="list-item-meta">
        <span>{{ t.customerName }}</span>
        <span class="cell-mono">¥{{ formatMoney(t.amount) }}</span>
        <span>{{ t.date }}</span>
      </div>
      <div class="list-item-related" v-if="t.relatedDocs && t.relatedDocs.length > 0">
        <span class="list-related-label">关联：</span>
        <span v-for="(rd, idx) in t.relatedDocs" :key="rd.refNo" class="list-related-item">
          <span class="type-badge" :class="'type-' + rd.type" style="font-size:10px;padding:1px 4px">{{ typeLabels[rd.type] }}</span>
          <span class="related-ref" @click.stop="emit('navigateToPath', rd.path)">{{ rd.refNo }}</span>
          <span v-if="idx < t.relatedDocs.length - 1" style="margin:0 2px">·</span>
        </span>
      </div>
    </div>
    <div v-if="transactions.length === 0" class="empty-state">
      <div class="empty-state-icon"><Icon name="creditCard" :size="14" /></div>暂无交易记录
    </div>
  </div>
</template>

<script setup>
defineProps({
  transactions: { type: Array, default: () => [] },
  typeLabels: { type: Object, default: () => ({}) },
  statusLabels: { type: Object, default: () => ({}) },
  statusBadgeMap: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['viewDetail', 'navigateToPath'])

function formatMoney(num) {
  if (num === undefined || num === null) return '0.00'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: listSlideIn 0.3s ease-out both;
}
@keyframes listSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.list-item:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  transform: translateX(2px);
}
.list-item-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.list-item-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.list-item-related {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.list-related-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}
.list-related-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.type-quotation { background: var(--color-info-subtle); color: var(--color-info); }
.type-contract { background: var(--color-accent-subtle); color: var(--color-accent); }
.type-collection { background: var(--color-success-subtle); color: var(--color-success); }
.type-delivery { background: var(--color-warning-subtle); color: var(--color-warning); }
.type-manual { background: var(--color-purple-subtle); color: var(--color-purple); }
.related-ref {
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.related-ref:hover {
  text-decoration: underline;
}
.cell-mono {
  font-family: var(--font-mono);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 64px; height: 64px; border-radius: 50%; background: var(--color-bg-secondary);
  display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2);
  color: var(--color-text-tertiary); font-size: 24px;
}
</style>
