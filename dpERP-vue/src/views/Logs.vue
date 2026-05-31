<template>
  <div class="log-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">操作日志</h2>
        <p class="page-header-subtitle">全系统操作审计追踪，按用户、模块、时间查询</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost btn-sm" @click="exportCSV">📥 导出日志</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="clearAll">🗑️ 清空日志</button>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📋</div>
        <div class="stat-card-value">{{ logStore.todayCount }}</div>
        <div class="stat-card-label">今日操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">📊</div>
        <div class="stat-card-value">{{ logStore.weekCount }}</div>
        <div class="stat-card-label">本周操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)">⚠️</div>
        <div class="stat-card-value">{{ logStore.sensitiveCount }}</div>
        <div class="stat-card-label">敏感操作</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">👤</div>
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
      <div style="display:flex;gap:var(--space-1)">
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('today')">今天</button>
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('week')">本周</button>
        <button class="btn btn-ghost btn-sm" @click="setQuickFilter('month')">本月</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">📈 操作趋势</span></div>
        <div class="panel-card-body">
          <div class="trend-chart">
            <div v-for="d in dailyTrend" :key="d.date" class="trend-bar-item">
              <div class="trend-bar-track">
                <div class="trend-bar-fill" :style="{ height: barHeight(d.count) + '%' }"></div>
              </div>
              <div class="trend-bar-label">{{ d.label }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">📊 模块分布</span></div>
        <div class="panel-card-body">
          <div class="module-dist">
            <div v-for="m in moduleDistribution" :key="m.module" class="module-item">
              <div class="module-name">{{ m.label }}</div>
              <div class="module-bar-container">
                <div class="module-bar" :style="{ width: moduleBarWidth(m.count) }"></div>
              </div>
              <div class="module-count">{{ m.count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>操作</th>
                <th>模块</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredLogs.length === 0">
                <td colspan="5" class="empty-state">
                  <div class="empty-state-icon">📜</div>暂无操作日志
                </td>
              </tr>
              <tr v-for="l in pagedLogs" :key="l.time + l.action">
                <td class="cell-mono" style="font-size:var(--font-size-xs)">{{ l.time }}</td>
                <td>{{ l.user || '-' }}</td>
                <td>
                  <span class="status-badge" :class="actionBadge(l.action)">{{ l.action || '-' }}</span>
                </td>
                <td>{{ logStore.moduleLabels[l.module] || l.module || '-' }}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="l.detail">{{ l.detail || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
          <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useLogStore } from '@/stores/log'

const logStore = useLogStore()

const filters = reactive({ search: '', module: '', dateFrom: '', dateTo: '' })
const currentPage = ref(1)
const pageSize = 20

const filteredLogs = computed(() => logStore.getFilteredLogs(filters))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize)))
const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredLogs.value.slice(start, start + pageSize)
})

const dailyTrend = computed(() => logStore.getDailyTrend(7))
const maxDaily = computed(() => Math.max(...dailyTrend.value.map(d => d.count), 1))
const moduleDistribution = computed(() => logStore.getModuleDistribution().slice(0, 8))
const maxModule = computed(() => Math.max(...moduleDistribution.value.map(m => m.count), 1))

function barHeight(count) {
  return maxDaily.value > 0 ? (count / maxDaily.value) * 100 : 0
}

function moduleBarWidth(count) {
  return maxModule.value > 0 ? Math.max(5, (count / maxModule.value) * 100) + '%' : '0%'
}

function actionBadge(action) {
  if (!action) return 'neutral'
  if (action.includes('删除')) return 'danger'
  if (action.includes('创建') || action.includes('添加')) return 'success'
  if (action.includes('修改') || action.includes('更新')) return 'warning'
  if (action.includes('审批') || action.includes('导出')) return 'info'
  return 'neutral'
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

function exportCSV() {
  const list = filteredLogs.value
  if (list.length === 0) { alert('无数据可导出'); return }
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
}

function clearAll() {
  if (confirm('确认清空所有操作日志？此操作不可恢复！')) {
    logStore.clearLogs()
  }
}

onMounted(() => {
  logStore.initSeedData()
})
</script>

<style scoped>
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 180px;
  padding: var(--space-2);
}
.trend-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.trend-bar-track {
  flex: 1;
  width: 100%;
  max-width: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}
.trend-bar-fill {
  width: 100%;
  background: rgba(59, 130, 246, 0.6);
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}
.trend-bar-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}
.module-dist {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.module-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.module-name {
  flex: 0 0 80px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: right;
}
.module-bar-container {
  flex: 1;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}
.module-bar {
  height: 100%;
  background: rgba(59, 130, 246, 0.6);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.module-count {
  flex: 0 0 30px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
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
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
