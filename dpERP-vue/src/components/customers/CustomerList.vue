<template>
  <div class="panel-card">
    <div class="panel-card-body">
      <div v-for="c in customers" :key="c.id" class="list-item" :class="{ 'list-item-dormant': c.status === 'dormant' }" @click="$emit('openDetail', c)">
        <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="handleToggleSelect(c.id)"><Icon name="checkCircle" :size="14" /></div></div>
        <div class="list-item-avatar" :style="{ background: levelColors[c.level] || '#94a3b8' }">{{ (c.fullName || c.name || '?').charAt(0) }}</div>
        <div class="list-item-main">
          <div class="list-item-row1">
            <strong class="list-item-name">{{ c.fullName || c.name }}</strong>
            <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
            <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
            <span v-for="tagId in (c.tags || [])" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
          </div>
          <div class="list-item-row2">
            <span>{{ c.customerNo }}</span>
            <span v-if="c.contactName || c.contact">[用户] {{ c.contactName || c.contact }}</span>
            <span v-if="c.department"><Icon name="building" :size="14" /> {{ c.department }}</span>
            <span v-if="c.phone">[电话] {{ c.phone }}</span>
            <span v-if="c.region"><Icon name="checkCircle" :size="14" /> {{ c.region }}</span>
            <span v-if="c.decisionAuthority"><Icon name="shield" :size="14" /> {{ c.decisionAuthority }}</span>
          </div>
          <div class="list-item-row3">
            <span class="mono">余额 ¥{{ formatNumber(c.balance) }}</span>
            <span class="mono">授信 ¥{{ formatNumber(c.creditLimit) }}</span>
            <span v-if="c.coreConcerns" class="text-muted">关注: {{ c.coreConcerns }}</span>
          </div>
        </div>
        <div class="list-item-actions" @click.stop>
          <button class="action-btn" @click="$emit('openEdit', c)" title="编辑"><Icon name="edit" :size="14" /></button>
          <button class="action-btn danger" @click="$emit('handleDelete', c)" title="删除"><Icon name="delete" :size="14" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCustomerStore } from '@/stores/customer'

const customerStore = useCustomerStore()

const props = defineProps({
  customers: { type: Array, required: true },
  selectedIds: { type: Array, required: true }
})

const emit = defineEmits(['update:selectedIds', 'openEdit', 'openDetail', 'handleDelete'])

const levelColors = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' }
const levelLabelMap = { A: '大客户', B: 'B类客户', C: 'C类客户' }
function levelLabel(lvl) { return levelLabelMap[lvl] || lvl }

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function getTagName(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  return tag ? tag.name : tagId
}

function getTagStyle(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  if (!tag) return {}
  return { background: tag.color + '20', color: tag.color }
}

function handleToggleSelect(id) {
  const ids = [...props.selectedIds]
  const idx = ids.indexOf(id)
  if (idx === -1) ids.push(id)
  else ids.splice(idx, 1)
  emit('update:selectedIds', ids)
}
</script>

<style scoped>
.list-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background var(--transition-fast); }
.list-item:hover { background: var(--color-surface-hover); }
.list-item-dormant { opacity: 0.6; }
.list-item-check { flex-shrink: 0; }
.list-item-avatar { width: 36px; height: 36px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-sm); flex-shrink: 0; }
.list-item-main { flex: 1; min-width: 0; }
.list-item-row1 { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.list-item-name { font-size: var(--font-size-sm); color: var(--color-text-primary); }
.list-item-row2 { display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px; flex-wrap: wrap; }
.list-item-row3 { display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; flex-wrap: wrap; }
.list-item-actions { display: flex; gap: var(--space-1); flex-shrink: 0; }
.text-muted { color: var(--color-text-tertiary); }
.mono { font-family: var(--font-mono); }
.checkbox { width: 18px; height: 18px; border: 2px solid var(--color-border-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all var(--transition-fast); flex-shrink: 0; }
.checkbox:hover { border-color: var(--color-accent); }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.mini-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
.action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: var(--radius-sm); transition: all var(--transition-fast); color: var(--color-text-secondary); white-space: nowrap; }
.action-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.action-btn.danger:hover { background: var(--color-danger-subtle); color: var(--color-danger); }
</style>
