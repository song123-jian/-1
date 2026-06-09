<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">[操作] 快速操作</span>
      </div>
      <div class="panel-card-body">
        <div class="quick-actions">
          <div class="quick-action-card" @click="$emit('navigate', '/quotations')">
            <div class="quick-action-icon"><Icon name="edit" :size="14" /></div>
            <div class="quick-action-label">新建报价</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/contracts')">
            <div class="quick-action-icon"><Icon name="file" :size="14" /></div>
            <div class="quick-action-label">新建合同</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/customers')">
            <div class="quick-action-icon"><Icon name="building" :size="14" /></div>
            <div class="quick-action-label">新建客户</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/inventory?tab=inbound')">
            <div class="quick-action-icon"><Icon name="download" :size="14" /></div>
            <div class="quick-action-label">入库登记</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/collections')">
            <div class="quick-action-icon"><Icon name="dollar" :size="14" /></div>
            <div class="quick-action-label">记录回款</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/deliveries')">
            <div class="quick-action-icon"><Icon name="truck" :size="14" /></div>
            <div class="quick-action-label">创建送货单</div>
          </div>
          <div class="quick-action-card" @click="$emit('navigate', '/reports')">
            <div class="quick-action-icon"><Icon name="trendUp" :size="14" /></div>
            <div class="quick-action-label">查看报表</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card ai-insight-panel">
      <div class="panel-card-header">
        <span class="panel-card-title"><span class="ai-icon">AI</span> AI 智能分析</span>
        <button class="btn btn-ghost" @click="$emit('refreshInsights')"><Icon name="refresh" :size="14" /> 刷新</button>
      </div>
      <div class="panel-card-body">
        <div v-if="isRefreshingInsights" class="ai-loading"><Icon name="refresh" :size="14" /> 正在分析中...</div>
        <template v-else>
          <div class="ai-summary">{{ aiSummary }}</div>
          <div class="ai-insights">
            <div v-for="(insight, idx) in aiInsights" :key="idx" class="ai-insight-item">
              <span class="ai-insight-icon"><Icon :name="insight.icon" :size="14" /></span>
              <div class="ai-insight-text">{{ insight.text }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  aiSummary: { type: String, default: '' },
  aiInsights: { type: Array, default: () => [] },
  isRefreshingInsights: { type: Boolean, default: false }
})

defineEmits(['navigate', 'refreshInsights'])
</script>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
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
  transition: all var(--transition-fast);
}
.quick-action-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  transform: translateY(-2px);
}
.quick-action-icon {
  font-size: 24px;
}
.quick-action-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.ai-insight-panel {
  border-left: 3px solid var(--color-purple);
}
.ai-loading {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-purple);
  font-size: var(--font-size-sm);
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
}
.ai-insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ai-insight-item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.ai-insight-icon {
  flex-shrink: 0;
}
@media (max-width: 1024px) {
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
}
</style>
