<template>
  <div class="customer-card-view">
    <div v-for="(c, idx) in customers" :key="c.id" class="customer-card" :class="{ 'dormant-card': c.status === 'dormant', 'selected-card': selectedIds.includes(c.id) }" :style="{ animationDelay: idx * 60 + 'ms' }">
      <div class="card-prio-bar" :style="{ background: levelColors[c.level] || '#94a3b8' }"></div>
      <div class="card-header">
        <div class="card-checkbox" @click.stop="$emit('toggleSelect', c.id)">
          <span class="checkbox" :class="{ checked: selectedIds.includes(c.id) }">{{ selectedIds.includes(c.id) ? '✓' : '' }}</span>
        </div>
        <div class="card-avatar" :style="{ background: levelColors[c.level] || '#94a3b8' }">{{ (c.fullName || c.name || '?').charAt(0) }}</div>
        <div class="card-title-area">
          <div class="card-title">{{ c.fullName || c.name }}</div>
          <div class="card-sub">{{ c.customerNo }} · {{ c.department || '' }}</div>
        </div>
        <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
      </div>
      <div class="card-body">
        <div class="card-field"><span class="field-label">联系人</span><span>{{ c.contactName || c.contact || '-' }}</span></div>
        <div class="card-field"><span class="field-label">电话</span><span class="mono">{{ c.phone || '-' }}</span></div>
        <div class="card-field"><span class="field-label">区域</span><span>{{ c.region || '-' }}</span></div>
        <div class="card-field"><span class="field-label">余额</span><span class="mono">¥{{ formatNumber(c.balance) }}</span></div>
        <div class="card-field"><span class="field-label">信用额度</span><span class="mono">¥{{ formatNumber(c.creditLimit) }}</span></div>
        <div v-if="c.tags && c.tags.length > 0" class="card-tags">
          <span v-for="tagId in c.tags" :key="tagId" class="mini-tag" :style="_getTagStyle(tagId)">{{ _getTagName(tagId) }}</span>
        </div>
      </div>
      <div class="card-footer">
        <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
        <div class="card-actions">
          <button class="action-btn" @click="$emit('openEdit', c)"><Icon name="edit" :size="14" /></button>
          <button class="action-btn" @click="$emit('openDetail', c)"><Icon name="eye" :size="14" /></button>
          <button class="action-btn danger" @click="$emit('handleDelete', c)"><Icon name="delete" :size="14" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { levelColors, levelLabel, getTagName, getTagStyle } from '@/utils/customerHelpers'
import { formatNumber } from '@/utils/format'

const customerStore = useCustomerStore()

defineProps({
  customers: { type: Array, required: true },
  selectedIds: { type: Array, default: () => [] }
})

defineEmits(['toggleSelect', 'openEdit', 'openDetail', 'handleDelete'])

function _getTagName(tagId) {
  return getTagName(customerStore.tags, tagId)
}

function _getTagStyle(tagId) {
  return getTagStyle(customerStore.tags, tagId)
}
</script>

<style scoped>
.customer-card-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-4); }
.customer-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: all 0.25s ease; animation: cardFadeIn 0.4s ease-out both; }
@keyframes cardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.customer-card:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.customer-card.dormant-card { opacity: 0.6; }
.customer-card.selected-card { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle); }
.card-checkbox { cursor: pointer; flex-shrink: 0; }
.card-prio-bar { height: 3px; }
.card-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
.card-avatar { width: 40px; height: 40px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-lg); flex-shrink: 0; }
.card-title-area { flex: 1; min-width: 0; }
.card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); }
.card-sub { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.card-body { padding: 0 var(--space-4) var(--space-3); }
.card-field { display: flex; justify-content: space-between; padding: var(--space-1) 0; font-size: var(--font-size-xs); }
.field-label { color: var(--color-text-tertiary); }
.card-tags { display: flex; gap: var(--space-1); flex-wrap: wrap; margin-top: var(--space-2); }
.card-footer { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-4) var(--space-3); }
.card-actions { display: flex; gap: var(--space-1); }
.mono { font-family: var(--font-mono); }
.level-badge { padding: var(--space-1) var(--space-2); border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge { padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.mini-tag { display: inline-block; font-size: 10px; padding: var(--space-1) var(--space-2); border-radius: 10px; }
.action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); transition: all var(--transition-fast); color: var(--color-text-secondary); white-space: nowrap; }
.action-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.action-btn.danger:hover { background: var(--color-danger-subtle); color: var(--color-danger); }
@media (max-width: 768px) {
  .customer-card-view { grid-template-columns: 1fr; }
}
</style>
