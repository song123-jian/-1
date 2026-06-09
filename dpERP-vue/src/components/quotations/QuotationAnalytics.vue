<template>
  <div class="analytics-panel">
    <div class="analytics-kpis">
      <div class="kpi-card"><div class="kpi-value"><Icon name="table" :size="14" /> {{ quotationStore.quotations.length }}</div><div class="kpi-label">报价总数</div></div>
      <div class="kpi-card"><div class="kpi-value text-success"><Icon name="trendUp" :size="14" /> {{ quotationStore.conversionRate }}%</div><div class="kpi-label">转化率</div></div>
      <div class="kpi-card"><div class="kpi-value text-accent"><Icon name="chevronDown" :size="14" /> {{ quotationStore.avgProfitMargin }}%</div><div class="kpi-label">平均利润率</div></div>
      <div class="kpi-card"><div class="kpi-value"><Icon name="dollar" :size="14" /> ¥{{ formatNumber(quotationStore.avgQuoteAmount) }}</div><div class="kpi-label">平均报价金额</div></div>
      <div class="kpi-card"><div class="kpi-value text-warning"><Icon name="check" :size="14" /> ¥{{ formatNumber(quotationStore.acceptedAmount) }}</div><div class="kpi-label">已接受金额</div></div>
    </div>
    <div class="analytics-grid">
      <div class="panel-card">
        <div class="panel-card-header"><Icon name="list" :size="14" /> 状态分布</div>
        <div class="panel-card-body">
          <div v-for="(label, key) in statusLabels" :key="key" class="bar-row">
            <span class="bar-label">{{ label }}</span>
            <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(key), background: statusColors[key] }"></div></div>
            <span class="bar-value">{{ quotationStore.statusCounts[key] }}</span>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header">[奖杯] 客户报价 TOP10</div>
        <div class="panel-card-body">
          <div v-for="(c, i) in quotationStore.customerTopList" :key="c.name" class="top-row">
            <span class="top-rank">{{ i + 1 }}</span>
            <span class="top-name"><Icon name="building" :size="14" /> {{ c.name }}</span>
            <span class="top-amount mono"><Icon name="dollar" :size="14" /> ¥{{ formatNumber(c.amount) }}</span>
          </div>
          <div v-if="quotationStore.customerTopList.length === 0" class="empty-hint">暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from '@/stores/quotation'

const quotationStore = useQuotationStore()

const statusLabels = {
  draft: '草稿', pending: '待审批', approved: '已审批',
  sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期'
}

const statusColors = {
  draft: '#64748b', pending: '#f59e0b', approved: '#3b82f6',
  sent: '#06b6d4', accepted: '#22c55e', rejected: '#ef4444', expired: '#94a3b8'
}

function barWidth(key) {
  const total = quotationStore.quotations.length
  if (total === 0) return '0%'
  return (quotationStore.statusCounts[key] / total * 100).toFixed(0) + '%'
}

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.analytics-panel { margin-bottom: var(--space-4); }
.analytics-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
.kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; text-align: center; }
.kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); }
.kpi-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px; }
.analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.panel-card-header { padding: 12px 16px; font-weight: 600; font-size: var(--font-size-base); border-bottom: 1px solid var(--color-border); }
.panel-card-body { padding: 16px; }
.bar-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.bar-label { width: 60px; font-size: var(--font-size-sm); }
.bar-track { flex: 1; height: 20px; background: var(--color-bg-tertiary); border-radius: var(--radius-sm); overflow: hidden; }
.bar-fill { height: 100%; border-radius: var(--radius-sm); transition: width 0.3s; }
.bar-value { font-size: var(--font-size-sm); min-width: 30px; text-align: right; }
.top-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-base); }
.top-rank { width: 24px; font-weight: 700; color: var(--color-accent); }
.top-name { flex: 1; }
.top-amount { font-weight: 600; }
.empty-hint { text-align: center; color: var(--color-text-tertiary); padding: 20px; }
.text-success { color: var(--color-success, #22c55e); }
.text-warning { color: var(--color-warning, #f59e0b); }
.text-accent { color: var(--color-accent); }
.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
@media (max-width: 768px) {
  .analytics-kpis { grid-template-columns: repeat(2, 1fr); }
  .analytics-grid { grid-template-columns: 1fr; }
}
</style>
