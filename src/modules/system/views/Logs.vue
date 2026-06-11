<template>
  <div class="log-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">操作日志</h2>
        <p class="page-header-subtitle">全系统操作审计追踪，按用户、模块、时间查询</p>
      </div>
      <div class="page-header-actions">
        <div style="position:relative;display:inline-block">
          <button class="btn btn-secondary" @click="showExportMenu = !showExportMenu"><Icon name="upload" :size="14" /> 导出日志 ▾</button>
          <div v-if="showExportMenu" style="position:absolute;right:0;top:100%;background:var(--color-surface-elevated);border:1px solid var(--color-border);border-radius:var(--radius-md);box-shadow:var(--shadow-md);z-index:10;min-width:120px">
            <div style="padding:var(--space-2) var(--space-3);cursor:pointer;font-size:var(--font-size-sm)" @click="exportLogs('csv');showExportMenu=false">CSV</div>
            <div style="padding:var(--space-2) var(--space-3);cursor:pointer;font-size:var(--font-size-sm)" @click="exportLogs('excel');showExportMenu=false">Excel</div>
            <div style="padding:var(--space-2) var(--space-3);cursor:pointer;font-size:var(--font-size-sm)" @click="exportLogs('pdf');showExportMenu=false">PDF</div>
          </div>
        </div>

        <button class="btn btn-ghost" style="border-radius:50%;width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center" @click="showHelp = !showHelp">?</button>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="check" :size="14" /></div>
        <div class="stat-card-value">{{ logStore.todayCount }}</div>
        <div class="stat-card-label">今日操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)"><Icon name="table" :size="14" /></div>
        <div class="stat-card-value">{{ logStore.weekCount }}</div>
        <div class="stat-card-label">本周操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)"><Icon name="warning" :size="14" /></div>
        <div class="stat-card-value">{{ logStore.sensitiveCount }}</div>
        <div class="stat-card-label">敏感操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="users" :size="14" /></div>
        <div class="stat-card-value">{{ logStore.activeUsers }}</div>
        <div class="stat-card-label">活跃用户</div>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:var(--space-3)">
      <input type="text" class="form-input" v-model="filters.search" placeholder="搜索操作内容..." style="min-width:160px">
      <select class="form-select" v-model="filters.module" style="width:auto;min-width:120px">
        <option value="">全部模块</option>
        <option v-for="(label, key) in logStore.moduleLabels" :key="key" :value="key">{{ label }}</option>
      </select>
      <input type="date" class="form-input" v-model="filters.dateFrom" style="width:140px">
      <span style="color:var(--color-text-tertiary);align-self:center">至</span>
      <input type="date" class="form-input" v-model="filters.dateTo" style="width:140px">
      <select class="form-select" v-model="logUser">
        <option value="">全部用户</option>
        <option v-for="u in userOptions" :key="u" :value="u">{{ u }}</option>
      </select>
      <div style="display:flex;gap:var(--space-1)">
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('today')">今天</button>
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('week')">本周</button>
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('month')">本月</button>
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('custom')">自定义</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="trendUp" :size="14" /> 操作趋势</span></div>
        <div class="panel-card-body">
          <canvas ref="trendCanvas" style="width:100%;height:220px"></canvas>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="table" :size="14" /> 模块分布</span></div>
        <div class="panel-card-body">
          <canvas ref="moduleCanvas" style="width:100%;height:220px"></canvas>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:50px;text-align:center">序号</th>
                <th>时间</th>
                <th>用户</th>
                <th>操作</th>
                <th>模块</th>
                <th>敏感</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredLogs.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-state-icon"><Icon name="log" :size="14" /></div>暂无操作日志
                </td>
              </tr>
              <tr v-for="(l, idx) in pagedLogs" :key="l.time + l.action">
                <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word">{{ (currentPage - 1) * perPage + idx + 1 }}</td>
                <td class="cell-mono" style="font-size:var(--font-size-xs)">{{ l.time }}</td>
                <td>{{ l.user || '-' }}</td>
                <td>
                  <span class="status-badge" :class="actionBadge(l.action)">{{ l.action || '-' }}</span>
                </td>
                <td>{{ logStore.moduleLabels[l.module] || l.module || '-' }}</td>
                <td><Icon v-if="isSensitiveAction(l.action)" name="warning" :size="14" /></td>
                <td style="max-width:300px;overflow-wrap:break-word;word-wrap:break-word" :title="l.detail">{{ l.detail || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);flex-wrap:wrap;gap:var(--space-2)">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">每页</span>
            <select class="form-select" v-model="perPage" style="width:80px;font-size:var(--font-size-xs)">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">条</span>
          </div>
          <div style="display:flex;gap:var(--space-1);align-items:center">
            <button v-for="p in visiblePages" :key="p" class="btn" :class="p === currentPage ? 'btn-primary' : 'btn-ghost'" style="padding:4px 8px;font-size:12px;min-width:28px" @click="currentPage = p">{{ p }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useLogStore } from '@/modules/system/stores/log'
import { escapeHtml } from '@/utils/format'

const logStore = useLogStore()

const showHelp = ref(false)
const showExportMenu = ref(false)
const logUser = ref('')
const perPage = ref(20)
const userOptions = computed(() => {
  const users = new Set(logStore.logs.map(l => l.user).filter(Boolean))
  return [...users].sort()
})
const filters = reactive({ search: '', module: '', dateFrom: '', dateTo: '' })
const currentPage = ref(1)

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage.value > 3) pages.push('...')
    for (let i = Math.max(2, currentPage.value - 1); i <= Math.min(total - 1, currentPage.value + 1); i++) pages.push(i)
    if (currentPage.value < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages.filter(p => typeof p === 'number')
})

const filteredLogs = computed(() => logStore.getFilteredLogs(filters))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / perPage.value)))
const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredLogs.value.slice(start, start + perPage.value)
})

const dailyTrend = computed(() => logStore.getDailyTrend(7))
const moduleDistribution = computed(() => logStore.getModuleDistribution().slice(0, 8))

const trendCanvas = ref(null)
const moduleCanvas = ref(null)

function renderTrendChart() {
  const canvas = trendCanvas.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const w = rect.width, h = rect.height
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-secondary').trim() || '#1e293b'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, w, h)
  const data = dailyTrend.value
  if (data.length === 0) return
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const barW = Math.max(20, (w - 60) / data.length - 10)
  const chartH = h - 40
  const startX = 30
  for (let i = 0; i < data.length; i++) {
    const x = startX + i * (barW + 10)
    const barH = (data[i].count / maxVal) * chartH
    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'
    ctx.beginPath()
    if (ctx.roundRect) { ctx.roundRect(x, h - 20 - barH, barW, barH, [3, 3, 0, 0]) } else { ctx.fillRect(x, h - 20 - barH, barW, barH) }
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(data[i].label, x + barW / 2, h - 6)
    ctx.fillText(String(data[i].count), x + barW / 2, h - 24 - barH)
  }
}

function renderModuleChart() {
  const canvas = moduleCanvas.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const w = rect.width, h = rect.height
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-secondary').trim() || '#1e293b'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, w, h)
  const data = moduleDistribution.value
  if (data.length === 0) return
  const maxVal = Math.max(...data.map(m => m.count), 1)
  const barH = Math.max(16, (h - 20) / data.length - 6)
  for (let i = 0; i < data.length; i++) {
    const y = 10 + i * (barH + 6)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(data[i].label, 80, y + barH / 2 + 4)
    const barW = (data[i].count / maxVal) * (w - 120)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'
    ctx.beginPath()
    if (ctx.roundRect) { ctx.roundRect(90, y, barW, barH, 3) } else { ctx.fillRect(90, y, barW, barH) }
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(String(data[i].count), 90 + barW + 6, y + barH / 2 + 4)
  }
}

function actionBadge(action) {
  if (!action) return 'neutral'
  if (action.includes('删除')) return 'danger'
  if (action.includes('创建') || action.includes('添加')) return 'success'
  if (action.includes('修改') || action.includes('更新')) return 'warning'
  if (action.includes('审批') || action.includes('导出')) return 'info'
  return 'neutral'
}

function isSensitiveAction(action) {
  if (!action) return false
  return ['删除', '修改', '审批', '导出', '禁用'].some(a => action.includes(a))
}

function setQuickFilter(period) {
  const now = new Date()
  filters.dateTo = now.toISOString().split('T')[0]
  if (period === 'today') {
    filters.dateFrom = filters.dateTo
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    filters.dateFrom = weekAgo.toISOString().split('T')[0]
  } else if (period === 'month') {
    filters.dateFrom = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'
  }
}

function exportLogs(format) {
  const list = filteredLogs.value
  if (list.length === 0) { alert('无数据可导出'); return }
  if (format === 'csv') {
    let csv = '时间,用户,操作,模块,详情\n'
    for (const l of list) {
      csv += [l.time, l.user, l.action, logStore.moduleLabels[l.module] || l.module, l.detail]
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',') + '\n'
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '操作日志_' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  } else if (format === 'excel') {
    let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="操作日志"><Table><Row><Cell><Data ss:Type="String">时间</Data></Cell><Cell><Data ss:Type="String">用户</Data></Cell><Cell><Data ss:Type="String">操作</Data></Cell><Cell><Data ss:Type="String">模块</Data></Cell><Cell><Data ss:Type="String">详情</Data></Cell><Cell><Data ss:Type="String">敏感</Data></Cell></Cell></Row>'
    for (const l of list) {
      const isSensitive = isSensitiveAction(l.action)
      xml += '<Row><Cell><Data ss:Type="String">' + (l.time || '') + '</Data></Cell><Cell><Data ss:Type="String">' + (l.user || '') + '</Data></Cell><Cell><Data ss:Type="String">' + (l.action || '') + '</Data></Cell><Cell><Data ss:Type="String">' + (logStore.moduleLabels[l.module] || l.module || '') + '</Data></Cell><Cell><Data ss:Type="String">' + (l.detail || '') + '</Data></Cell><Cell><Data ss:Type="String">' + (isSensitive ? '<Icon name="warning" :size="14" />' : '') + '</Data></Cell></Row>'
    }
    xml += '</Table></Worksheet></Workbook>'
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '操作日志_' + new Date().toISOString().split('T')[0] + '.xls'
    a.click()
    URL.revokeObjectURL(url)
  } else if (format === 'pdf') {
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>操作日志</title><style>body{font-family:sans-serif;padding:var(--space-5)}table{width:100%;border-collapse:collapse;margin-top:var(--space-2)}th{border:1px solid #ccc;padding:var(--space-2) var(--space-2);font-size:12px;text-align:left;overflow-wrap:break-word;word-wrap:break-word}td{border:1px solid #ccc;padding:var(--space-2) var(--space-2);font-size:12px;text-align:left;overflow-wrap:break-word;word-wrap:break-word}th{background:#f0f0f0;font-weight:bold}.sensitive{color:red;font-weight:bold}h1{font-size:18px}</style></head><body>'
    const now = new Date().toLocaleString('zh-CN')
    let body = '<h1>操作日志报告</h1><p>导出时间: ' + now + ' | 共 ' + list.length + ' 条</p><table><thead><tr><th>时间</th><th>用户</th><th>操作</th><th>模块</th><th>详情</th><th>敏感</th></tr></thead><tbody>'
    for (const l of list) {
      const isSensitive = isSensitiveAction(l.action)
      body += '<tr><td>' + escapeHtml(l.time || '') + '</td><td>' + escapeHtml(l.user || '') + '</td><td>' + escapeHtml(l.action || '') + '</td><td>' + escapeHtml(logStore.moduleLabels[l.module] || l.module || '') + '</td><td>' + escapeHtml(l.detail || '') + '</td><td class="' + (isSensitive ? 'sensitive' : '') + '">' + (isSensitive ? '&#9888;' : '') + '</td></tr>'
    }
    body += '</tbody></table></body></html>'
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html + body)
      printWindow.document.close()
      printWindow.print()
    }
  }
}


onMounted(() => {
  nextTick(() => { renderTrendChart(); renderModuleChart() })
})

watch([dailyTrend, moduleDistribution], () => {
  nextTick(() => { renderTrendChart(); renderModuleChart() })
}, { deep: true })

onBeforeUnmount(() => {
  try {
    if (trendCanvas.value) {
      const ctx = trendCanvas.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, trendCanvas.value.width, trendCanvas.value.height)
    }
  } catch (e) { /* ignore */ }
  try {
    if (moduleCanvas.value) {
      const ctx = moduleCanvas.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, moduleCanvas.value.width, moduleCanvas.value.height)
    }
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
