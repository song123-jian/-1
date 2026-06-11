<template>
  <div class="table-container">
    <div class="table-toolbar">
      <span class="table-toolbar-info">共 {{ transactions.length }} 条记录</span>
      <button class="btn btn-outline" @click="showSpacingPanel = !showSpacingPanel" :class="{ active: showSpacingPanel }">间距评估</button>
    </div>

    <div v-if="showSpacingPanel" class="spacing-eval-panel">
      <div class="spacing-eval-header">
        <span class="spacing-eval-title"><Icon name="table" :size="14" /> 自动化内容间距评估报告</span>
        <button class="btn btn-outline" @click="runSpacingEval">重新评估</button>
      </div>
      <div class="spacing-eval-body">
        <div class="spacing-eval-summary">
          <div class="eval-score-card" :class="spacingScoreClass">
            <div class="eval-score-value">{{ spacingScore }}</div>
            <div class="eval-score-label">综合评分</div>
          </div>
          <div class="eval-metrics">
            <div class="eval-metric">
              <span class="eval-metric-label">列间距均衡度</span>
              <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.columnBalance + '%' }"></div></div>
              <span class="eval-metric-value">{{ spacingMetrics.columnBalance }}%</span>
            </div>
            <div class="eval-metric">
              <span class="eval-metric-label">文本对齐一致性</span>
              <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.alignmentConsistency + '%' }"></div></div>
              <span class="eval-metric-value">{{ spacingMetrics.alignmentConsistency }}%</span>
            </div>
            <div class="eval-metric">
              <span class="eval-metric-label">内容密度适宜度</span>
              <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.densityScore + '%' }"></div></div>
              <span class="eval-metric-value">{{ spacingMetrics.densityScore }}%</span>
            </div>
            <div class="eval-metric">
              <span class="eval-metric-label">视觉层级清晰度</span>
              <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.visualHierarchy + '%' }"></div></div>
              <span class="eval-metric-value">{{ spacingMetrics.visualHierarchy }}%</span>
            </div>
          </div>
        </div>
        <div class="spacing-eval-columns">
          <div class="eval-col-title">各列间距详情</div>
          <div class="eval-col-list">
            <div v-for="col in columnSpacingDetails" :key="col.key" class="eval-col-item">
              <span class="eval-col-name">{{ col.label }}</span>
              <span class="eval-col-width">{{ col.currentWidth }}px</span>
              <span class="eval-col-optimal">建议 {{ col.optimalWidth }}px</span>
              <span class="eval-col-status" :class="col.statusClass">{{ col.statusText }}</span>
            </div>
          </div>
        </div>
        <div class="spacing-eval-suggestions" v-if="spacingSuggestions.length > 0">
          <div class="eval-suggest-title">优化建议</div>
          <div v-for="(s, i) in spacingSuggestions" :key="i" class="eval-suggest-item">
            <span class="eval-suggest-icon">{{ s.icon }}</span>
            <span class="eval-suggest-text">{{ s.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <table class="data-table txn-table" ref="txnTableRef">
      <colgroup>
        <col v-if="columnVisible.refNo" class="col-ref" />
        <col v-if="columnVisible.type" class="col-type" />
        <col v-if="columnVisible.customerName" class="col-customer" />
        <col v-if="columnVisible.date" class="col-date" />
        <col v-if="columnVisible.amount" class="col-amount" />
        <col v-if="columnVisible.status" class="col-status" />
        <col v-if="columnVisible.relatedDocs" class="col-related" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th v-if="columnVisible.refNo" class="th-ref">编号</th>
          <th v-if="columnVisible.type" class="th-type">类型</th>
          <th v-if="columnVisible.customerName" class="th-customer">客户</th>
          <th v-if="columnVisible.date" class="th-date">日期</th>
          <th v-if="columnVisible.amount" class="th-amount">金额</th>
          <th v-if="columnVisible.status" class="th-status">状态</th>
          <th v-if="columnVisible.relatedDocs" class="th-related">关联单据</th>
          <th class="th-actions">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pagedTransactions.length === 0">
          <td colspan="8" class="empty-state">
            <div class="empty-state-icon"><Icon name="creditCard" :size="14" /></div>暂无交易记录
          </td>
        </tr>
        <tr v-for="t in pagedTransactions" :key="t.id" :class="{ 'row-overdue': t.status === 'overdue' }">
          <td v-if="columnVisible.refNo" class="cell-ref cell-mono" @click="emit('viewDetail', t)">{{ t.refNo }}</td>
          <td v-if="columnVisible.type" class="cell-type">
            <span class="type-badge" :class="'type-' + t.type">
              {{ typeLabels[t.type] || t.type }}
            </span>
          </td>
          <td v-if="columnVisible.customerName" class="cell-customer">{{ t.customerName }}</td>
          <td v-if="columnVisible.date" class="cell-date">{{ t.date || '-' }}</td>
          <td v-if="columnVisible.amount" class="cell-amount cell-mono">¥{{ formatMoney(t.amount) }}</td>
          <td v-if="columnVisible.status" class="cell-status">
            <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">
              {{ statusLabels[t.status] || t.status }}
            </span>
          </td>
          <td v-if="columnVisible.relatedDocs" class="cell-related">
            <template v-if="t.relatedDocs && t.relatedDocs.length > 0">
              <div v-for="rd in t.relatedDocs" :key="rd.refNo" class="related-doc-item">
                <span class="type-badge" :class="'type-' + rd.type" style="font-size:10px;padding:1px 4px">{{ typeLabels[rd.type] }}</span>
                <span class="related-ref" @click="emit('navigateToPath', rd.path)">{{ rd.refNo }}</span>
              </div>
            </template>
            <span v-else class="cell-placeholder">—</span>
          </td>
          <td class="cell-actions">
            <button class="btn btn-sm btn-outline" @click="emit('viewDetail', t)" title="查看详情">查看</button>
            <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" @click="emit('openForm', t)" title="编辑">编辑</button>
            <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click="emit('handleDelete', t.id)" title="删除">删除</button>
            <button v-if="t.relatedPath" class="btn btn-sm btn-outline" @click="emit('navigateToPath', t.relatedPath)" title="跳转关联">跳转</button>
            <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click="emit('handleDelete', t.id)" title="删除">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="totalPages > 1" class="pagination-bar">
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
      <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
      <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ transactions.length }} 条</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { formatMoney } from '@/utils/format'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  columnVisible: { type: Object, default: () => ({}) },
  modelValue: { type: Number, default: 1 },
  typeLabels: { type: Object, default: () => ({}) },
  statusLabels: { type: Object, default: () => ({}) },
  statusBadgeMap: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['viewDetail', 'openForm', 'handleDelete', 'navigateToPath', 'update:modelValue'])

const currentPage = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const pageSize = 15

const totalPages = computed(() => Math.max(1, Math.ceil(props.transactions.length / pageSize)))

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const pagedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return props.transactions.slice(start, start + pageSize)
})

watch(() => props.transactions, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1
  }
})

const showSpacingPanel = ref(false)
const txnTableRef = ref(null)

const spacingColumnDefs = [
  { key: 'ref', label: '编号', optimalWidth: 140, align: 'left' },
  { key: 'type', label: '类型', optimalWidth: 80, align: 'center' },
  { key: 'customer', label: '客户', optimalWidth: 140, align: 'left' },
  { key: 'date', label: '日期', optimalWidth: 110, align: 'center' },
  { key: 'amount', label: '金额', optimalWidth: 120, align: 'right' },
  { key: 'status', label: '状态', optimalWidth: 80, align: 'center' },
  { key: 'related', label: '关联单据', optimalWidth: 205, align: 'left' },
  { key: 'actions', label: '操作', optimalWidth: 230, align: 'center' }
]

const spacingMetrics = ref({
  columnBalance: 0,
  alignmentConsistency: 0,
  densityScore: 0,
  visualHierarchy: 0
})

const columnSpacingDetails = ref([])
const spacingSuggestions = ref([])

const spacingScore = computed(() => {
  const m = spacingMetrics.value
  return Math.round((m.columnBalance + m.alignmentConsistency + m.densityScore + m.visualHierarchy) / 4)
})

const spacingScoreClass = computed(() => {
  const s = spacingScore.value
  if (s >= 90) return 'score-excellent'
  if (s >= 75) return 'score-good'
  if (s >= 60) return 'score-fair'
  return 'score-poor'
})

function runSpacingEval() {
  nextTick(() => {
    const table = txnTableRef.value
    if (!table) return

    const ths = table.querySelectorAll('thead th')
    const currentWidths = []

    ths.forEach((th) => {
      currentWidths.push(th.offsetWidth || 0)
    })

    const totalWidth = currentWidths.reduce((s, w) => s + w, 0) || 1

    const details = spacingColumnDefs.map((def, i) => {
      const cw = currentWidths[i] || 0
      const ow = def.optimalWidth
      const diff = Math.abs(cw - ow)
      let statusClass = 'status-optimal'
      let statusText = '最佳'
      if (diff > 40) { statusClass = 'status-warning'; statusText = '偏窄' }
      if (cw > ow + 60) { statusClass = 'status-loose'; statusText = '偏宽' }
      if (diff <= 20) { statusClass = 'status-optimal'; statusText = '最佳' }
      return { key: def.key, label: def.label, currentWidth: cw, optimalWidth: ow, statusClass, statusText }
    })
    columnSpacingDetails.value = details

    const avgDiff = details.reduce((s, d) => s + Math.abs(d.currentWidth - d.optimalWidth), 0) / details.length
    const maxOptimal = Math.max(...spacingColumnDefs.map(d => d.optimalWidth))
    const balanceScore = Math.max(0, Math.min(100, Math.round(100 - (avgDiff / maxOptimal) * 100)))

    const actualAligns = []
    ths.forEach((th) => {
      const style = window.getComputedStyle(th)
      actualAligns.push(style.textAlign || 'left')
    })
    const expectedAligns = spacingColumnDefs.map(d => d.align)
    let alignMatches = 0
    expectedAligns.forEach((ea, i) => {
      if (actualAligns[i] === ea) alignMatches++
    })
    const alignScore = Math.round((alignMatches / expectedAligns.length) * 100)

    const rowCount = pagedTransactions.value.length
    const rowHeight = table.querySelector('tbody tr') ? table.querySelector('tbody tr').offsetHeight : 40
    const idealRowHeight = 44
    const densityRatio = rowHeight / idealRowHeight
    let densityScore = 100
    if (densityRatio < 0.8) densityScore = 60
    else if (densityRatio < 0.9) densityScore = 80
    else if (densityRatio > 1.3) densityScore = 70
    else if (densityRatio > 1.1) densityScore = 90

    const hasColgroup = table.querySelectorAll('colgroup col').length === spacingColumnDefs.length
    const hasFixedLayout = window.getComputedStyle(table).tableLayout === 'fixed'
    let hierarchyScore = 70
    if (hasColgroup) hierarchyScore += 15
    if (hasFixedLayout) hierarchyScore += 10
    if (balanceScore >= 80) hierarchyScore += 5
    hierarchyScore = Math.min(100, hierarchyScore)

    spacingMetrics.value = {
      columnBalance: balanceScore,
      alignmentConsistency: alignScore,
      densityScore,
      visualHierarchy: hierarchyScore
    }

    const suggestions = []
    if (balanceScore < 80) suggestions.push({ icon: '', text: '部分列宽偏离建议值较大，建议通过colgroup精确控制各列宽度比例' })
    if (alignScore < 100) suggestions.push({ icon: '', text: '部分列文本对齐方式与最佳实践不一致：数字列应右对齐，标签列应居中，文本列应左对齐' })
    if (densityScore < 85) suggestions.push({ icon: '', text: '行高偏小导致内容密度过高，建议增加行内间距(padding)至12px 16px以提升可读性' })
    if (hierarchyScore < 85) suggestions.push({ icon: '', text: '视觉层级不够清晰，建议使用table-layout:fixed配合colgroup确保列宽稳定' })
    details.forEach(d => {
      if (d.statusClass !== 'status-optimal') {
        suggestions.push({ icon: '', text: `「${d.label}」列当前${d.currentWidth}px，建议调整为${d.optimalWidth}px（${d.statusText}）` })
      }
    })
    if (suggestions.length === 0) {
      suggestions.push({ icon: '', text: '表格排版已达到最佳状态，各列间距均衡、对齐一致、密度适宜' })
    }
    spacingSuggestions.value = suggestions
  })
}

</script>

<style scoped>
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
.table-toolbar-info {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.txn-table {
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.txn-table col.col-ref { width: 140px; }
.txn-table col.col-type { width: 80px; }
.txn-table col.col-customer { width: 140px; }
.txn-table col.col-date { width: 110px; }
.txn-table col.col-amount { width: 120px; }
.txn-table col.col-status { width: 80px; }
.txn-table col.col-related { width: 205px; }
.txn-table col.col-actions { width: 230px; }
.txn-table thead th {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  text-transform: none;
  letter-spacing: 0;
}
.th-ref, .th-customer, .th-related { text-align: left; }
.th-type, .th-date, .th-status, .th-actions { text-align: center; }
.th-amount { text-align: right; }
.txn-table tbody td {padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
  line-height: 1.5; overflow-wrap: break-word; word-wrap: break-word}
.cell-ref {
  cursor: pointer;
  color: var(--color-accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-ref:hover {
  text-decoration: underline;
}
.cell-type { text-align: center; }
.cell-customer {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.cell-date { text-align: center; color: var(--color-text-secondary); }
.cell-amount { text-align: right; font-weight: 600; }
.cell-status { text-align: center; }
.cell-related {
  max-width: 160px;
  overflow: hidden;
}
.cell-actions {
  text-align: center;
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  justify-content: center;
}
.type-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.type-quotation { background: var(--color-info-subtle); color: var(--color-info); }
.type-contract { background: var(--color-accent-subtle); color: var(--color-accent); }
.type-collection { background: var(--color-success-subtle); color: var(--color-success); }
.type-delivery { background: var(--color-warning-subtle); color: var(--color-warning); }
.type-manual { background: var(--color-purple-subtle); color: var(--color-purple); }
.related-doc-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-right: var(--space-2);
}
.related-ref {
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.related-ref:hover {
  text-decoration: underline;
}
.row-overdue {
  background: var(--color-danger-subtle);
  animation: overduePulse 3s ease-in-out infinite;
}
@keyframes overduePulse { 0%, 100% { background: var(--color-danger-subtle); } 50% { background: rgba(239, 68, 68, 0.08); } }
@keyframes rowSlideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.txn-table tbody tr { animation: rowSlideIn 0.3s ease-out both; }
.txn-table tbody tr:nth-child(1) { animation-delay: 0ms; }
.txn-table tbody tr:nth-child(2) { animation-delay: 20ms; }
.txn-table tbody tr:nth-child(3) { animation-delay: 40ms; }
.txn-table tbody tr:nth-child(4) { animation-delay: 60ms; }
.txn-table tbody tr:nth-child(5) { animation-delay: 80ms; }
.txn-table tbody tr:nth-child(n+6) { animation-delay: 100ms; }
.cell-mono {
  font-family: var(--font-mono);
}
.cell-placeholder {
  color: var(--color-text-tertiary);
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
.pagination-bar {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.pagination-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.pagination-btn:hover:not(:disabled) {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.pagination-btn.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pagination-info {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.spacing-eval-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin: var(--space-3);
  background: var(--color-surface-elevated);
  overflow: hidden;
}
.spacing-eval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}
.spacing-eval-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
}
.spacing-eval-body {
  padding: var(--space-4);
}
.spacing-eval-summary {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-4);
  align-items: flex-start;
}
.eval-score-card {
  text-align: center;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  min-width: 100px;
}
.score-excellent { background: var(--color-success-subtle); color: var(--color-success); }
.score-good { background: var(--color-info-subtle); color: var(--color-accent); }
.score-fair { background: var(--color-warning-subtle); color: var(--color-warning); }
.score-poor { background: var(--color-danger-subtle); color: var(--color-danger); }
.eval-score-value {
  font-size: 2rem;
  font-weight: 800;
  font-family: var(--font-mono);
  line-height: 1;
}
.eval-score-label {
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
  opacity: 0.8;
}
.eval-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.eval-metric {
  display: grid;
  grid-template-columns: 120px 1fr 48px;
  align-items: center;
  gap: var(--space-2);
}
.eval-metric-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.eval-metric-bar {
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}
.eval-metric-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.eval-metric-value {
  font-size: var(--font-size-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
  text-align: right;
}
.spacing-eval-columns {
  margin-bottom: var(--space-4);
}
.eval-col-title, .eval-suggest-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}
.eval-col-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-2);
}
.eval-col-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
.eval-col-name {
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 56px;
}
.eval-col-width {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}
.eval-col-optimal {
  color: var(--color-text-tertiary);
}
.eval-col-status {
  margin-left: auto;
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 10px;
}
.status-optimal { background: #e6f9ee; color: #0d8042; }
.status-warning { background: #fce8e6; color: #c5221f; }
.status-loose { background: #fef7e0; color: #b06000; }
.spacing-eval-suggestions {
  padding-top: var(--space-2);
}
.eval-suggest-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.eval-suggest-icon {
  flex-shrink: 0;
}
.eval-suggest-text {
  flex: 1;
}
</style>
