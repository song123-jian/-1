<template>
  <div>
    <div v-if="currentView === 'list'" class="panel-card">
      <div class="panel-card-body">
        <div v-if="contracts.length === 0" class="empty-state"><div class="empty-state-icon"><Icon name="file" :size="14" /></div>暂无合同数据</div>
        <div v-for="c in contracts" :key="c.id" class="list-item" @click="$emit('openPreview', c)">
          <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="$emit('toggleSelect', c.id)">[√]</div></div>
          <div class="list-item-avatar" :style="{ background: statusColors[c.status] || '#94a3b8' }">{{ (c.contractNo || '?').slice(-3) }}</div>
          <div class="list-item-main">
            <div class="list-item-row1">
              <strong class="list-item-name">{{ c.contractNo }}</strong>
              <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
              <span class="mono">¥{{ formatNumber(c.totalAmount) }}</span>
            </div>
            <div class="list-item-row2">
              <span>{{ c.partyA }}</span>
              <span>{{ c.signDate }}</span>
              <span v-if="c.endDate">到期 {{ c.endDate }}</span>
            </div>
            <div class="list-item-row3">
              <span>{{ c.settlement }}</span>
              <span>{{ c.contractType }}</span>
            </div>
          </div>
          <div class="list-item-actions" @click.stop>
            <button class="action-btn" @click="$emit('openWizard', c.id)" title="编辑"><Icon name="edit" :size="14" /></button>
            <button class="action-btn" @click="$emit('duplicate', c)" title="复制"><Icon name="list" :size="14" /></button>
            <button v-if="canDelete" class="action-btn danger" @click="$emit('delete', c)" title="删除"><Icon name="delete" :size="14" /></button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentView === 'card'" class="card-grid">
      <div v-if="contracts.length === 0" class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><Icon name="file" :size="14" /></div>暂无合同数据</div>
      <div v-for="c in contracts" :key="c.id" class="contract-card" :class="'card-status-' + c.status">
        <div class="contract-card-header">
          <strong class="mono">{{ c.contractNo }}</strong>
          <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
        </div>
        <div class="contract-card-body">
          <div class="contract-card-field"><span class="field-label">甲方</span><span>{{ c.partyA }}</span></div>
          <div class="contract-card-field"><span class="field-label">金额</span><span class="mono">¥{{ formatNumber(c.totalAmount) }}</span></div>
          <div class="contract-card-field"><span class="field-label">结算方式</span><span>{{ c.settlement }}</span></div>
          <div class="contract-card-field"><span class="field-label">签订日期</span><span>{{ c.signDate }}</span></div>
          <div class="contract-card-field"><span class="field-label">到期日</span><span :style="endDateStyle(c)">{{ c.endDate || '-' }}</span></div>
        </div>
        <div class="contract-card-footer">
          <button class="action-btn" @click="$emit('openPreview', c)"><Icon name="eye" :size="14" /> 预览</button>
          <button class="action-btn" @click="$emit('openWizard', c.id)"><Icon name="edit" :size="14" /> 编辑</button>
          <button v-if="c.status === 'draft'" class="action-btn" @click="$emit('submitApproval', c)"><Icon name="download" :size="14" /> 审批</button>
          <button v-if="c.status === 'approved' && canSign" class="action-btn" @click="$emit('sign', c)"><Icon name="edit" :size="14" /> 签订</button>
          <button v-if="canDelete" class="action-btn danger" @click="$emit('delete', c)"><Icon name="delete" :size="14" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentView: { type: String, default: 'table' },
  contracts: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  statusLabels: { type: Object, default: () => ({}) },
  statusColors: { type: Object, default: () => ({}) },
  canDelete: { type: Boolean, default: false },
  canSign: { type: Boolean, default: false }
})

defineEmits(['openPreview', 'openWizard', 'toggleSelect', 'duplicate', 'delete', 'submitApproval', 'sign'])

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function endDateStyle(c) {
  if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) return {}
  const days = Math.floor((new Date(c.endDate) - new Date()) / 86400000)
  if (days <= 0) return { color: 'var(--color-danger)', fontWeight: '700', textDecoration: 'line-through' }
  if (days <= 7) return { color: 'var(--color-danger)', fontWeight: '700' }
  if (days <= 30) return { color: 'var(--color-warning)', fontWeight: '600' }
  return {}
}
</script>

<style scoped>
.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); width: 100%; }
.panel-card-body { padding: 16px; }
.empty-state { text-align: center; padding: 40px; color: var(--color-text-tertiary); }
.empty-state-icon { font-size: 36px; margin-bottom: 12px; }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.15s; }
.list-item:hover { background: var(--color-bg-secondary); }
.list-item-check { flex-shrink: 0; }
.list-item-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.list-item-main { flex: 1; min-width: 0; }
.list-item-row1 { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.list-item-name { font-size: 14px; }
.list-item-row2 { display: flex; gap: 12px; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 2px; }
.list-item-row3 { display: flex; gap: 12px; font-size: 12px; }
.list-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); }
.contract-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; transition: box-shadow 0.15s; }
.contract-card:hover { box-shadow: var(--shadow-md); }
.contract-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.contract-card-body { padding: 12px 16px; }
.contract-card-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.field-label { color: var(--color-text-secondary); }
.contract-card-footer { display: flex; gap: 4px; padding: 8px 16px; border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); flex-wrap: wrap; }
.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-draft { background: rgba(100,116,139,0.2); color: #94a3b8; }
.status-pending_approval { background: rgba(245,158,11,0.2); color: #fbbf24; }
.status-approved { background: rgba(59,130,246,0.2); color: #60a5fa; }
.status-signed { background: rgba(34,197,94,0.2); color: #4ade80; }
.status-archived { background: rgba(6,182,212,0.2); color: #22d3ee; }
.status-cancelled { background: rgba(239,68,68,0.2); color: #f87171; }
.checkbox { width: 16px; height: 16px; border: 1.5px solid var(--color-border); border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all 0.15s; user-select: none; }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.action-btn { padding: 3px 6px; font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }
</style>
