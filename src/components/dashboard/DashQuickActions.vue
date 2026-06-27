<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="zap" :size="14" />
          快速操作
        </span>
      </div>
      <div class="panel-card-body">
        <div class="quick-actions">
          <div
            v-for="(action, idx) in actions"
            :key="action.label"
            class="quick-action-card"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @click="$emit('navigate', action.path)"
          >
            <div class="quick-action-icon" :style="{ background: action.gradient }">
              <Icon :name="action.icon" :size="16" />
            </div>
            <div class="quick-action-label">{{ action.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card ai-insight-panel">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <span class="ai-icon">智</span>
          本地智能分析
        </span>
        <button
          class="btn btn-ghost"
          :class="{ 'is-spinning': isRefreshingInsights }"
          @click="$emit('refreshInsights')"
        >
          <Icon name="refresh" :size="14" />
          刷新
        </button>
      </div>
      <div class="panel-card-body">
        <div v-if="isRefreshingInsights" class="ai-loading">
          <div class="ai-loading-spinner"></div>
          <span>正在分析中...</span>
        </div>
        <template v-else>
          <div class="ai-summary">
            <div class="ai-summary-icon">
              <Icon name="zap" :size="14" />
            </div>
            <div class="ai-summary-text">{{ aiSummary }}</div>
          </div>
          <div class="ai-insights">
            <div
              v-for="(insight, idx) in aiInsights"
              :key="idx"
              class="ai-insight-item"
              :style="{ animationDelay: idx * 80 + 'ms' }"
            >
              <span class="ai-insight-icon"><Icon :name="insight.icon" :size="14" /></span>
              <div class="ai-insight-text">{{ insight.text }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DashQuickActions' }
</script>
<script setup>
defineProps({
  aiSummary: { type: String, default: '' },
  aiInsights: { type: Array, default: () => [] },
  isRefreshingInsights: { type: Boolean, default: false }
})

defineEmits(['navigate', 'refreshInsights'])

const actions = [
  { label: '新建报价', icon: 'edit', path: '/quotations', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  { label: '新建合同', icon: 'file', path: '/contracts', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { label: '新建客户', icon: 'building', path: '/customers', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  {
    label: '入库登记',
    icon: 'download',
    path: '/inventory?tab=inbound',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
  },
  { label: '记录回款', icon: 'dollar', path: '/collections', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { label: '创建送货单', icon: 'truck', path: '/deliveries', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
  { label: '查看报表', icon: 'trendUp', path: '/reports', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
]
</script>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

@keyframes actionFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.25s ease;
  animation: actionFadeIn 0.4s ease-out both;
}

.quick-action-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.quick-action-card:active {
  transform: translateY(-1px);
}

.quick-action-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 0.25s ease;
}

.quick-action-card:hover .quick-action-icon {
  transform: scale(1.1);
}

.quick-action-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* AI 面板 */
.ai-insight-panel {
  border-left: 3px solid var(--color-purple);
}

.is-spinning .icon-refresh,
.is-spinning :deep(svg) {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ai-loading {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-purple);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.ai-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-purple-subtle);
  border-top-color: var(--color-purple);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  margin-right: var(--space-1);
  vertical-align: middle;
}

.ai-summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  padding: var(--space-3);
  background: var(--color-purple-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  line-height: 1.6;
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.ai-summary-icon {
  flex-shrink: 0;
  color: var(--color-purple);
  margin-top: var(--space-1);
}

.ai-summary-text {
  flex: 1;
}

.ai-insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@keyframes insightFadeIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ai-insight-item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
  animation: insightFadeIn 0.4s ease-out both;
}

.ai-insight-item:hover {
  background: var(--color-bg-tertiary);
}

.ai-insight-icon {
  flex-shrink: 0;
  color: var(--color-purple);
}

@media (max-width: 1024px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
