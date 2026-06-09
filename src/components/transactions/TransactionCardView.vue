<template>
  <div class="card-view">
    <div v-for="(t, idx) in transactions" :key="t.id" class="txn-card" :class="'card-type-' + t.type" :style="{ animationDelay: idx * 60 + 'ms' }" @click="emit('viewDetail', t)">
      <div class="card-header">
        <span class="card-title">{{ t.refNo }}</span>
        <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
      </div>
      <div class="card-body">
        <div class="card-field"><span class="card-label">客户</span><span>{{ t.customerName }}</span></div>
        <div class="card-field"><span class="card-label">金额</span><span class="cell-mono">¥{{ formatMoney(t.amount) }}</span></div>
        <div class="card-field"><span class="card-label">日期</span><span>{{ t.date }}</span></div>
        <div class="card-field"><span class="card-label">状态</span><span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">{{ statusLabels[t.status] || t.status }}</span></div>
        <div class="card-field" v-if="t.relatedDocs && t.relatedDocs.length > 0">
          <span class="card-label">关联</span>
          <span class="card-related-refs">
            <span v-for="rd in t.relatedDocs" :key="rd.refNo" class="related-ref" @click.stop="emit('navigateToPath', rd.path)">{{ rd.refNo }}</span>
          </span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-outline" @click.stop="emit('viewDetail', t)">详情</button>
        <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" @click.stop="emit('openForm', t)">编辑</button>
        <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click.stop="emit('handleDelete', t.id)">删除</button>
        <button v-if="t.relatedPath" class="btn btn-sm btn-outline" @click.stop="emit('navigateToPath', t.relatedPath)">跳转</button>
        <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click.stop="emit('handleDelete', t.id)">删除</button>
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

const emit = defineEmits(['viewDetail', 'openForm', 'handleDelete', 'navigateToPath'])

function formatMoney(num) {
  if (num === undefined || num === null) return '0.00'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  padding: var(--space-3);
}
.txn-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  cursor: pointer;
  transition: all 0.25s ease;
  animation: cardFadeIn 0.4s ease-out both;
}
@keyframes cardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.txn-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.card-title {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.card-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}
.card-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.card-related-refs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.card-type-quotation { border-left: 3px solid var(--color-info); }
.card-type-contract { border-left: 3px solid var(--color-accent); }
.card-type-collection { border-left: 3px solid var(--color-success); }
.card-type-delivery { border-left: 3px solid var(--color-warning); }
.card-type-manual { border-left: 3px solid var(--color-purple); }
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
