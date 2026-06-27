<template>
  <div>
    <div v-if="currentView === 'list'" class="panel-card">
      <div class="panel-card-body">
        <div v-if="contracts.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="file" :size="14" /></div>
          暂无合同数据
        </div>
        <div
          v-for="(c, idx) in contracts"
          :key="c.id"
          class="list-item"
          :style="{ animationDelay: idx * 50 + 'ms' }"
          @click="emit('openPreview', c)"
        >
          <div class="list-item-check" @click.stop>
            <div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="emit('toggleSelect', c.id)">
              ✓
            </div>
          </div>
          <div class="list-item-avatar" :style="{ background: statusColors[c.status] || '#94a3b8' }">
            {{ getAvatarText(c.contractNo) }}
          </div>
          <div class="list-item-main">
            <div class="list-item-row1">
              <strong class="list-item-name">{{ c.contractNo }}</strong>
              <span class="list-item-party">{{ c.partyA }}</span>
              <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
            </div>
            <div class="list-item-row2">
              <span class="mono amount-text">¥{{ formatNumber(c.totalAmount) }}</span>
              <span>{{ c.signDate }}</span>
              <span v-if="c.endDate">到期 {{ c.endDate }}</span>
            </div>
          </div>
          <div class="list-item-actions" @click.stop>
            <button class="action-btn" title="编辑" @click="emit('openWizard', c.id)">
              <Icon name="edit" :size="14" />
            </button>
            <button class="action-btn" title="复制" @click="emit('duplicate', c)">
              <Icon name="list" :size="14" />
            </button>
            <button v-if="canDelete" class="action-btn danger" title="删除" @click="emit('delete', c)">
              <Icon name="delete" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentView === 'card'" class="card-grid">
      <div v-if="contracts.length === 0" class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state-icon"><Icon name="file" :size="14" /></div>
        暂无合同数据
      </div>
      <div
        v-for="(c, idx) in contracts"
        :key="c.id"
        class="contract-card"
        :class="'card-status-' + c.status"
        :style="{ animationDelay: idx * 60 + 'ms', borderLeftColor: statusColors[c.status] || 'var(--color-border)' }"
      >
        <div class="contract-card-header">
          <strong class="mono">{{ c.contractNo }}</strong>
          <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
        </div>
        <div class="contract-card-stage-bar">
          <div class="stage-track">
            <div
              v-for="(stage, si) in stageList"
              :key="stage.key"
              class="stage-dot"
              :class="{ active: stageIndex(c) >= si, current: stageIndex(c) === si }"
              :title="stage.label"
            ></div>
          </div>
          <div class="stage-labels">
            <span
              v-for="(stage, si) in stageList"
              :key="stage.key"
              class="stage-label"
              :class="{ active: stageIndex(c) >= si }"
            >
              {{ stage.label }}
            </span>
          </div>
        </div>
        <div class="contract-card-body">
          <div class="contract-card-field">
            <span class="field-icon">👤</span>
            <span>{{ c.partyA }}</span>
          </div>
          <div class="contract-card-amount mono">¥{{ formatNumber(c.totalAmount) }}</div>
          <div class="contract-card-field">
            <span class="field-icon">💱</span>
            <span>{{ c.settlement }}</span>
          </div>
          <div class="contract-card-field">
            <span class="field-icon">📅</span>
            <span>{{ c.signDate }}</span>
          </div>
          <div class="contract-card-field">
            <span class="field-icon">⏰</span>
            <span :style="endDateStyle(c)">{{ c.endDate || '-' }}</span>
            <span
              v-if="getExpiryCountdown(c)"
              class="expiry-countdown"
              :class="{ urgent: getExpiryCountdown(c).urgent }"
            >
              {{ getExpiryCountdown(c).text }}
            </span>
          </div>
          <div v-if="c.relatedDocs > 0" class="contract-card-field">
            <span class="field-icon">📎</span>
            <span class="related-docs-badge">{{ c.relatedDocs }}份关联单据</span>
          </div>
        </div>
        <div class="contract-card-footer">
          <button class="action-btn" @click="emit('openPreview', c)">
            <Icon name="eye" :size="14" />
            预览
          </button>
          <button class="action-btn" @click="emit('openWizard', c.id)">
            <Icon name="edit" :size="14" />
            编辑
          </button>
          <button v-if="c.status === 'draft'" class="action-btn" @click="emit('submitApproval', c)">
            <Icon name="download" :size="14" />
            审批
          </button>
          <button v-if="c.status === 'approved' && canSign" class="action-btn" @click="emit('sign', c)">
            <Icon name="edit" :size="14" />
            签订
          </button>
          <button v-if="canDelete" class="action-btn danger" @click="emit('delete', c)">
            <Icon name="delete" :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ContractListView' }
</script>
<script setup>
import { formatNumber } from '@/utils/format'
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

function endDateStyle(c) {
  if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) return {}
  const days = Math.floor((new Date(c.endDate) - new Date()) / 86400000)
  if (days <= 0) return { color: 'var(--color-danger)', fontWeight: '700', textDecoration: 'line-through' }
  if (days <= 7) return { color: 'var(--color-danger)', fontWeight: '700' }
  if (days <= 30) return { color: 'var(--color-warning)', fontWeight: '600' }
  return {}
}

const stageList = [
  { key: 'draft', label: '草稿' },
  { key: 'pending_approval', label: '审批' },
  { key: 'signed', label: '签订' },
  { key: 'archived', label: '归档' }
]

function stageIndex(c) {
  const map = { draft: 0, pending_approval: 1, approved: 2, signed: 2, archived: 3, cancelled: -1 }
  return map[c.status] ?? 0
}

function getExpiryCountdown(c) {
  if (!c.endDate || (c.status !== 'signed' && c.status !== 'approved')) return null
  const days = Math.floor((new Date(c.endDate) - new Date()) / 86400000)
  if (days <= 30) {
    if (days <= 0) return { text: '已过期', urgent: true }
    return { text: days + '天后到期', urgent: days <= 7 }
  }
  return null
}

function getAvatarText(contractNo) {
  if (!contractNo) return '?'
  const letters = contractNo.match(/[A-Za-z]/g)
  return letters && letters.length >= 2
    ? letters.slice(0, 2).join('').toUpperCase()
    : contractNo.slice(0, 2).toUpperCase()
}
</script>

<style scoped>
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 100%;
}
.panel-card-body {
  padding: var(--space-4);
}
.empty-state {
  text-align: center;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
  color: var(--color-text-tertiary);
  font-size: 24px;
}
.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: listSlideIn 0.3s ease-out both;
}
@keyframes listSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.list-item:hover {
  background: var(--color-bg-secondary);
  transform: translateX(2px);
}
.list-item-check {
  flex-shrink: 0;
}
.list-item-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}
.list-item:hover .list-item-avatar {
  transform: scale(1.08);
}
.list-item-main {
  flex: 1;
  min-width: 0;
}
.list-item-row1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.list-item-name {
  font-size: 14px;
}
.list-item-row2 {
  display: flex;
  gap: var(--space-3);
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.list-item-row3 {
  display: flex;
  gap: var(--space-3);
  font-size: 12px;
}
.list-item-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
}
.contract-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.25s ease;
  animation: cardFadeIn 0.4s ease-out both;
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.contract-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.contract-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.contract-card-body {
  padding: var(--space-3) var(--space-4);
}
.contract-card-field {
  display: flex;
  justify-content: space-between;
  padding: var(--space-1) 0;
  font-size: 13px;
}
.field-label {
  color: var(--color-text-secondary);
}
.contract-card-footer {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  flex-wrap: wrap;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: all 0.2s ease;
}
.contract-card:hover .contract-card-footer {
  opacity: 1;
  max-height: 60px;
  padding: var(--space-2) var(--space-4);
}
.mono {
  font-family: var(--font-mono);
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-badge::before {
  font-size: 10px;
}
.status-draft {
  background: var(--status-draft-subtle);
  color: var(--status-draft);
}
.status-draft::before {
  content: '✎';
}
.status-pending_approval {
  background: var(--status-pending-subtle);
  color: var(--status-pending);
}
.status-pending_approval::before {
  content: '⏳';
}
.status-approved {
  background: var(--status-approved-subtle);
  color: var(--status-approved);
}
.status-approved::before {
  content: '●';
}
.status-signed {
  background: var(--status-signed-subtle);
  color: var(--status-signed);
}
.status-signed::before {
  content: '✓';
}
.status-archived {
  background: var(--status-archived-subtle);
  color: var(--status-archived);
}
.status-archived::before {
  content: '✓';
}
.status-cancelled {
  background: var(--status-cancelled-subtle);
  color: var(--status-cancelled);
}
.status-cancelled::before {
  content: '✕';
}
.checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--color-border);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  color: transparent;
  transition: all 0.15s;
  user-select: none;
}
.checkbox.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.action-btn {
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.action-btn:hover {
  background: var(--color-bg-tertiary);
}
.action-btn.danger {
  color: var(--color-danger);
}
.contract-card-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-accent);
  padding: var(--space-2) var(--space-4);
}
.list-item-party {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.amount-text {
  font-weight: 600;
  color: var(--color-accent);
}
.field-icon {
  font-size: 12px;
  margin-right: 4px;
}
.contract-card-stage-bar {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.stage-track {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
}
.stage-track::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--color-border);
  transform: translateY(-50%);
  z-index: 0;
}
.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
  z-index: var(--z-base);
  margin: 0 auto;
  transition: all 0.3s;
}
.stage-dot.active {
  background: var(--color-accent);
}
.stage-dot.current {
  background: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
.stage-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
}
.stage-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-align: center;
  flex: 1;
  transition: color 0.3s;
}
.stage-label.active {
  color: var(--color-accent);
  font-weight: 600;
}
.expiry-countdown {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.expiry-countdown.urgent {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  animation: countdownPulse 1.5s ease-in-out infinite;
}
@keyframes countdownPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
.related-docs-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
</style>
