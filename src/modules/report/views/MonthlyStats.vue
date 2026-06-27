<template>
  <div class="monthly-stats-page">
    <div class="ms-header">
      <div class="ms-header-left">
        <h2>月度统计</h2>
        <p>按月查看出入库、库存和业务变化趋势</p>
      </div>
      <div class="ms-controls">
        <select v-model.number="store.selectedYear" class="form-select" style="width: 100px">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select v-model.number="store.selectedMonth" class="form-select" style="width: 90px">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
        <div class="ms-quick-btns">
          <button
            class="btn btn-ghost"
            :class="{ active: store.quickRange === 'prev' }"
            @click="store.setQuickRange('prev')"
          >
            上月
          </button>
          <button
            class="btn btn-ghost"
            :class="{ active: store.quickRange === 'curr' }"
            @click="store.setQuickRange('curr')"
          >
            本月
          </button>
          <button
            class="btn btn-ghost"
            :class="{ active: store.quickRange === '3m' }"
            @click="store.setQuickRange('3m')"
          >
            近3月
          </button>
          <button
            class="btn btn-ghost"
            :class="{ active: store.quickRange === '6m' }"
            @click="store.setQuickRange('6m')"
          >
            近6月
          </button>
          <button
            class="btn btn-ghost"
            :class="{ active: store.quickRange === '12m' }"
            @click="store.setQuickRange('12m')"
          >
            近12月
          </button>
        </div>
        <select v-model="store.selectedWarehouse" class="form-select" style="width: 120px">
          <option value="">全部仓库</option>
          <option value="main">主仓库</option>
          <option value="east">东区仓库</option>
          <option value="west">西区仓库</option>
          <option value="south">南区仓库</option>
        </select>
        <select v-model="store.selectedBizType" class="form-select" style="width: 120px">
          <option value="">全部业务类型</option>
          <option value="purchase">采购入库</option>
          <option value="sales">销售出库</option>
          <option value="customer_return">客户退货</option>
          <option value="production">生产领料</option>
          <option value="production_return">生产退料</option>
          <option value="transfer">调拨</option>
          <option value="scrap">报废出库</option>
          <option value="surplus">盘盈入库</option>
          <option value="loss">盘亏出库</option>
        </select>
        <button class="btn btn-secondary" @click="store.refresh()">
          <Icon name="refresh" :size="14" />
          刷新
        </button>
        <button class="btn btn-secondary" @click="handleExportCSV">
          <Icon name="upload" :size="14" />
          导出统计
        </button>
        <button class="btn btn-secondary" @click="handleExportPDF">
          <Icon name="file" :size="14" />
          导出PDF
        </button>
        <button class="btn btn-ghost" @click="handlePrint">
          <Icon name="print" :size="14" />
          打印报表
        </button>
      </div>
    </div>

    <!-- KPI卡片 -->
    <div class="ms-kpi-grid">
      <div class="ms-kpi-card" style="animation-delay: 0ms">
        <span class="ms-kpi-icon"><Icon name="package" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-success)">{{ store.kpiData.inCount }}</div>
        <div class="ms-kpi-label">入库单数</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 60ms">
        <span class="ms-kpi-icon"><Icon name="truck" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-info)">{{ store.kpiData.outCount }}</div>
        <div class="ms-kpi-label">出库单数</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 120ms">
        <span class="ms-kpi-icon"><Icon name="weight" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-success)">{{ store.kpiData.inWeight.toFixed(1) }}kg</div>
        <div class="ms-kpi-label">入库总重量</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 180ms">
        <span class="ms-kpi-icon"><Icon name="scale" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-info)">{{ store.kpiData.outWeight.toFixed(1) }}kg</div>
        <div class="ms-kpi-label">出库总重量</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 240ms">
        <span class="ms-kpi-icon"><Icon name="dollar" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-success)">¥{{ formatNum(store.kpiData.inAmount) }}</div>
        <div class="ms-kpi-label">入库总金额</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 300ms">
        <span class="ms-kpi-icon"><Icon name="dollarSign" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-info)">¥{{ formatNum(store.kpiData.outAmount) }}</div>
        <div class="ms-kpi-label">出库总金额</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 360ms">
        <span class="ms-kpi-icon"><Icon name="clock" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-warning)">
          <span class="stat-dot-halo" style="background: var(--color-warning)"></span>
          {{ store.kpiData.pending }}
        </div>
        <div class="ms-kpi-label">待处理</div>
      </div>
      <div class="ms-kpi-card" style="animation-delay: 420ms">
        <span class="ms-kpi-icon"><Icon name="checkCircle" :size="20" /></span>
        <div class="ms-kpi-value" style="color: var(--color-accent)">{{ store.kpiData.confirmed }}</div>
        <div class="ms-kpi-label">已完成</div>
      </div>
    </div>

    <!-- 概览面板：出入库完成率 + 业务类型分布 + 出入库金额对比趋势 -->
    <div class="ms-overview-row">
      <div class="overview-card overview-ring-card">
        <div class="overview-card-title">出入库完成率</div>
        <div class="overview-ring-body">
          <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
            <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
            <circle
              cx="36"
              cy="36"
              r="26"
              fill="none"
              :stroke="completionRateColor"
              stroke-width="5"
              stroke-linecap="round"
              :stroke-dasharray="completionRateDash"
              stroke-dashoffset="0"
              transform="rotate(-90 36 36)"
              class="overview-ring-progress"
            />
          </svg>
          <div class="overview-ring-text">
            <span class="overview-ring-percent" :style="{ color: completionRateColor }">{{ completionRate }}%</span>
            <span class="overview-ring-sub">已完成/总单数</span>
          </div>
        </div>
        <div class="overview-ring-detail">
          <span class="ring-detail-item">
            <span class="ring-dot" style="background: var(--color-success)"></span>
            入库 {{ store.kpiData.inCount }}
          </span>
          <span class="ring-detail-item">
            <span class="ring-dot" style="background: var(--color-info)"></span>
            出库 {{ store.kpiData.outCount }}
          </span>
        </div>
      </div>
      <div class="overview-card overview-biz-card">
        <div class="overview-card-title">业务类型分布</div>
        <div class="biz-bars">
          <div v-for="b in bizTypeStats" :key="b.type" class="biz-bar-item">
            <span class="biz-bar-label">{{ b.label }}</span>
            <div class="biz-bar-track">
              <div class="biz-bar-fill" :style="{ width: b.percent + '%', background: b.color }"></div>
            </div>
            <span class="biz-bar-count">{{ b.count }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-trend-card">
        <div class="overview-card-title">出入库金额对比</div>
        <div class="amount-compare">
          <div class="amount-compare-item">
            <span class="amount-compare-label" style="color: var(--color-success)">入库金额</span>
            <span class="amount-compare-val" style="color: var(--color-success)">
              ¥{{ formatNum(store.kpiData.inAmount) }}
            </span>
          </div>
          <div class="amount-compare-bar">
            <div class="amount-compare-in" :style="{ width: inAmountPercent + '%' }"></div>
            <div class="amount-compare-out" :style="{ width: outAmountPercent + '%' }"></div>
          </div>
          <div class="amount-compare-item">
            <span class="amount-compare-label" style="color: var(--color-info)">出库金额</span>
            <span class="amount-compare-val" style="color: var(--color-info)">
              ¥{{ formatNum(store.kpiData.outAmount) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 库存健康度进度环 + 预警 -->
    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('health')">
        <h3>
          <Icon name="heart" :size="14" />
          库存健康度与风险预警
          <span class="ms-toggle-icon">
            <Icon :name="store.collapsedSections.health ? 'chevronRight' : 'chevronDown'" :size="14" />
          </span>
        </h3>
      </div>
      <div v-show="!store.collapsedSections.health" class="ms-section-body">
        <div class="ms-health-grid">
          <div class="ms-health-card ms-health-ring-card">
            <div class="ms-health-ring-body">
              <svg width="80" height="80" viewBox="0 0 80 80" class="ms-health-ring-svg">
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--color-border)" stroke-width="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  :stroke="healthScoreColor"
                  stroke-width="6"
                  stroke-linecap="round"
                  :stroke-dasharray="healthScoreDash"
                  stroke-dashoffset="0"
                  transform="rotate(-90 40 40)"
                  class="ms-health-ring-progress"
                />
              </svg>
              <div class="ms-health-ring-text">
                <span class="ms-health-ring-percent" :style="{ color: healthScoreColor }">
                  {{ store.healthData.healthScore }}
                </span>
                <span class="ms-health-ring-sub">健康度评分</span>
              </div>
            </div>
          </div>
          <div class="ms-health-card" style="animation-delay: 60ms">
            <div class="ms-health-value" style="color: var(--color-danger)">{{ store.healthData.exhausted }}</div>
            <div class="ms-health-label">库存耗尽</div>
            <span
              v-if="store.healthData.exhausted > 0"
              class="health-alert-dot"
              style="background: var(--color-danger)"
            ></span>
          </div>
          <div class="ms-health-card" style="animation-delay: 120ms">
            <div class="ms-health-value" style="color: var(--color-warning)">{{ store.healthData.low }}</div>
            <div class="ms-health-label">低于安全库存</div>
            <span
              v-if="store.healthData.low > 0"
              class="health-alert-dot"
              style="background: var(--color-warning)"
            ></span>
          </div>
          <div class="ms-health-card" style="animation-delay: 180ms">
            <div class="ms-health-value" style="color: var(--color-purple)">{{ store.healthData.over }}</div>
            <div class="ms-health-label">超量库存</div>
            <span
              v-if="store.healthData.over > 0"
              class="health-alert-dot"
              style="background: var(--color-purple)"
            ></span>
          </div>
          <div class="ms-health-card" style="animation-delay: 240ms">
            <div class="ms-health-value" style="color: var(--color-success)">{{ store.healthData.normal }}</div>
            <div class="ms-health-label">库存正常</div>
          </div>
        </div>
        <!-- 库存预警区域 -->
        <div v-if="healthAlerts.length > 0" class="ms-health-alert-panel">
          <div
            v-for="(a, idx) in healthAlerts"
            :key="idx"
            class="ms-health-alert-item"
            :style="{ animationDelay: idx * 60 + 'ms' }"
          >
            <span class="ms-health-alert-badge" :class="'alert-' + a.type">{{ a.label }}</span>
            <span class="ms-health-alert-text">{{ a.message }}</span>
            <span class="ms-health-alert-count">{{ a.count }}项</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('biz')">
        <h3>
          <Icon name="table" :size="14" />
          出入库业务结构汇总表
          <span class="ms-toggle-icon">
            <Icon :name="store.collapsedSections.biz ? 'chevronRight' : 'chevronDown'" :size="14" />
          </span>
        </h3>
      </div>
      <div v-show="!store.collapsedSections.biz" class="ms-section-body">
        <div class="panel-card">
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>业务类型</th>
                    <th>入库单数</th>
                    <th>入库重量(kg)</th>
                    <th>入库金额(元)</th>
                    <th>出库单数</th>
                    <th>出库重量(kg)</th>
                    <th>出库金额(元)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.bizSummary.length === 0">
                    <td colspan="7" class="empty-state">
                      <div class="empty-state-icon"><Icon name="table" :size="24" /></div>
                      暂无结果，先切换月份或仓库查看
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in store.bizSummary"
                    :key="row.type"
                    :style="{ animationDelay: idx * 20 + 'ms' }"
                  >
                    <td>
                      <strong>{{ bizTypeLabel(row.type) }}</strong>
                    </td>
                    <td class="cell-mono">{{ row.inCount }}</td>
                    <td class="cell-mono">{{ row.inWeight.toFixed(1) }}</td>
                    <td class="cell-mono">¥{{ formatNum(row.inAmount) }}</td>
                    <td class="cell-mono">{{ row.outCount }}</td>
                    <td class="cell-mono">{{ row.outWeight.toFixed(1) }}</td>
                    <td class="cell-mono">¥{{ formatNum(row.outAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-top-grid">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">入库金额Top10</span></div>
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>物料</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.topItems.length === 0">
                    <td colspan="3" class="empty-state">
                      <div class="empty-state-icon"><Icon name="package" :size="24" /></div>
                      暂无结果，先切换月份或仓库查看
                    </td>
                  </tr>
                  <tr
                    v-for="(item, idx) in store.topItems"
                    :key="'in' + item.code"
                    :style="{ animationDelay: idx * 20 + 'ms' }"
                  >
                    <td class="cell-mono">{{ idx + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td class="cell-mono">¥{{ formatNum(item.inAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">出库金额Top10</span></div>
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>物料</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.topItems.length === 0">
                    <td colspan="3" class="empty-state">
                      <div class="empty-state-icon"><Icon name="package" :size="24" /></div>
                      暂无结果，先切换月份或仓库查看
                    </td>
                  </tr>
                  <tr
                    v-for="(item, idx) in store.topItems"
                    :key="'out' + item.code"
                    :style="{ animationDelay: idx * 20 + 'ms' }"
                  >
                    <td class="cell-mono">{{ idx + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td class="cell-mono">¥{{ formatNum(item.outAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('category')">
        <h3>
          <Icon name="package" :size="14" />
          物料品类汇总表
          <span class="ms-toggle-icon">
            <Icon :name="store.collapsedSections.category ? 'chevronRight' : 'chevronDown'" :size="14" />
          </span>
        </h3>
      </div>
      <div v-show="!store.collapsedSections.category" class="ms-section-body">
        <div class="panel-card">
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>品类</th>
                    <th>物料数</th>
                    <th>库存(kg)</th>
                    <th>库存金额(元)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.categorySummary.length === 0">
                    <td colspan="4" class="empty-state">
                      <div class="empty-state-icon"><Icon name="package" :size="24" /></div>
                      暂无结果，先切换月份或仓库查看
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in store.categorySummary"
                    :key="row.category"
                    :style="{ animationDelay: idx * 20 + 'ms' }"
                  >
                    <td>
                      <strong>{{ row.category }}</strong>
                    </td>
                    <td class="cell-mono">{{ row.count }}</td>
                    <td class="cell-mono">{{ row.stock.toFixed(1) }}</td>
                    <td class="cell-mono">¥{{ formatNum(row.value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('daily')">
        <h3>
          <Icon name="calendar" :size="14" />
          每日明细汇总表
          <span class="ms-toggle-icon">
            <Icon :name="store.collapsedSections.daily ? 'chevronRight' : 'chevronDown'" :size="14" />
          </span>
        </h3>
      </div>
      <div v-show="!store.collapsedSections.daily" class="ms-section-body">
        <div class="panel-card">
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>入库单数</th>
                    <th>入库重量</th>
                    <th>入库金额</th>
                    <th>出库单数</th>
                    <th>出库重量</th>
                    <th>出库金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.dailySummary.length === 0">
                    <td colspan="7" class="empty-state">
                      <div class="empty-state-icon"><Icon name="calendar" :size="24" /></div>
                      暂无结果，先切换月份或仓库查看
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in store.dailySummary"
                    :key="row.date"
                    :style="{ animationDelay: idx * 20 + 'ms' }"
                  >
                    <td class="cell-mono">{{ row.date }}</td>
                    <td class="cell-mono">{{ row.inCount }}</td>
                    <td class="cell-mono">{{ row.inWeight.toFixed(1) }}</td>
                    <td class="cell-mono">¥{{ formatNum(row.inAmount) }}</td>
                    <td class="cell-mono">{{ row.outCount }}</td>
                    <td class="cell-mono">{{ row.outWeight.toFixed(1) }}</td>
                    <td class="cell-mono">¥{{ formatNum(row.outAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'MonthlyStats' }
</script>
<script setup>
import { computed } from 'vue'
import { useMonthlyStatsStore } from '@/modules/report/stores/monthlyStats'

const store = useMonthlyStatsStore()

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 3; y <= current + 1; y++) years.push(y)
  return years
})

function bizTypeLabel(type) {
  const map = {
    purchase: '采购入库',
    sales: '销售出库',
    customer_return: '客户退货',
    production: '生产领料',
    production_return: '生产退料',
    transfer: '调拨',
    scrap: '报废出库',
    surplus: '盘盈入库',
    loss: '盘亏出库',
    other: '其他'
  }
  return map[type] || type
}

function formatNum(n) {
  return (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/* ====== 概览面板计算 ====== */

/* 出入库完成率 */
const totalOrders = computed(() => store.kpiData.inCount + store.kpiData.outCount)
const completionRate = computed(() => {
  const total = totalOrders.value
  if (total === 0) return 0
  return Math.round((store.kpiData.confirmed / total) * 100)
})
const RING_C = 2 * Math.PI * 26
const completionRateColor = computed(() => {
  const r = completionRate.value
  if (r >= 80) return 'var(--color-success)'
  if (r >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const completionRateDash = computed(() => {
  const p = completionRate.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 业务类型分布 */
const BIZ_COLORS = {
  purchase: '#10b981',
  sales: '#3b82f6',
  customer_return: '#f59e0b',
  production: '#a855f7',
  production_return: '#8b5cf6',
  transfer: '#06b6d4',
  scrap: '#ef4444',
  surplus: '#22c55e',
  loss: '#f97316',
  other: '#64748b'
}
const bizTypeStats = computed(() => {
  const list = store.bizSummary || []
  const max = list.length > 0 ? Math.max(...list.map((r) => r.inCount + r.outCount)) : 1
  return list
    .map((r) => ({
      type: r.type,
      label: bizTypeLabel(r.type),
      count: r.inCount + r.outCount,
      percent: max > 0 ? Math.round(((r.inCount + r.outCount) / max) * 100) : 0,
      color: BIZ_COLORS[r.type] || '#64748b'
    }))
    .sort((a, b) => b.count - a.count)
})

/* 出入库金额对比 */
const totalAmount = computed(() => store.kpiData.inAmount + store.kpiData.outAmount)
const inAmountPercent = computed(() => {
  const t = totalAmount.value
  return t > 0 ? Math.round((store.kpiData.inAmount / t) * 100) : 0
})
const outAmountPercent = computed(() => {
  const t = totalAmount.value
  return t > 0 ? Math.round((store.kpiData.outAmount / t) * 100) : 0
})

/* 库存健康度进度环 */
const HEALTH_RING_C = 2 * Math.PI * 30
const healthScoreColor = computed(() => {
  const s = store.healthData.healthScore
  if (s >= 80) return 'var(--color-success)'
  if (s >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const healthScoreDash = computed(() => {
  const p = (store.healthData.healthScore || 0) / 100
  return `${p * HEALTH_RING_C} ${HEALTH_RING_C}`
})

/* 库存预警 */
const healthAlerts = computed(() => {
  const alerts = []
  if (store.healthData.exhausted > 0) {
    alerts.push({
      type: 'exhausted',
      label: '库存耗尽',
      count: store.healthData.exhausted,
      message: '有物料库存已耗尽，需立即补货'
    })
  }
  if (store.healthData.low > 0) {
    alerts.push({
      type: 'low',
      label: '低于安全库存',
      count: store.healthData.low,
      message: '有物料库存低于安全线，建议尽快补货'
    })
  }
  if (store.healthData.over > 0) {
    alerts.push({
      type: 'over',
      label: '超量库存',
      count: store.healthData.over,
      message: '有物料库存超量，建议优化库存结构'
    })
  }
  return alerts
})

function handleExportCSV() {
  try {
    const headers = ['业务类型', '入库单数', '入库重量(kg)', '入库金额(元)', '出库单数', '出库重量(kg)', '出库金额(元)']
    const rows = store.bizSummary.map((r) => [
      bizTypeLabel(r.type),
      r.inCount,
      r.inWeight.toFixed(1),
      r.inAmount.toFixed(2),
      r.outCount,
      r.outWeight.toFixed(1),
      r.outAmount.toFixed(2)
    ])
    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '月度统计_' + store.selectedYear + String(store.selectedMonth).padStart(2, '0') + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function handleExportPDF() {
  try {
    window.print()
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function handlePrint() {
  window.print()
}
</script>

<style scoped>
.monthly-stats-page {
  padding: var(--space-4);
}
.ms-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}
.ms-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0;
}
.ms-header p {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}
.ms-controls {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}
.ms-quick-btns {
  display: flex;
  gap: var(--space-1);
}
.ms-quick-btns .btn.active {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}

/* ====== KPI卡片 ====== */
.ms-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.ms-kpi-card {
  text-align: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  position: relative;
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.ms-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.ms-kpi-icon {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--color-text-tertiary);
  opacity: 0.5;
}
.ms-kpi-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
.ms-kpi-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.stat-dot-halo {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 1.5s ease-in-out infinite;
}
@keyframes alertDotPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
  }
}

/* ====== 概览面板 ====== */
.ms-overview-row {
  display: grid;
  grid-template-columns: 200px 1fr 220px;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.overview-card {
  background: var(--color-bg-primary, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.overview-card:nth-child(1) {
  animation-delay: 0ms;
}
.overview-card:nth-child(2) {
  animation-delay: 80ms;
}
.overview-card:nth-child(3) {
  animation-delay: 160ms;
}
.overview-card-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
  font-weight: 500;
}

/* 进度环 */
.overview-ring-body {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.overview-ring-svg {
  flex-shrink: 0;
}
.overview-ring-progress {
  transition: stroke-dasharray 0.6s ease;
}
.overview-ring-text {
  display: flex;
  flex-direction: column;
}
.overview-ring-percent {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
}
.overview-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.overview-ring-detail {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.ring-detail-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.ring-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 业务类型分布条形图 */
.biz-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.biz-bar-item {
  display: grid;
  grid-template-columns: 80px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.biz-bar-label {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.biz-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.biz-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.biz-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* 出入库金额对比 */
.amount-compare {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.amount-compare-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
}
.amount-compare-val {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
}
.amount-compare-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.amount-compare-in {
  background: var(--color-success);
  transition: width 0.5s ease;
}
.amount-compare-out {
  background: var(--color-info);
  transition: width 0.5s ease;
}

/* ====== 库存健康度 ====== */
.ms-health-grid {
  display: grid;
  grid-template-columns: 180px repeat(4, 1fr);
  gap: var(--space-3);
}
.ms-health-card {
  text-align: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
}
.ms-health-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.ms-health-ring-card {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ms-health-ring-body {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.ms-health-ring-svg {
  flex-shrink: 0;
}
.ms-health-ring-progress {
  transition: stroke-dasharray 0.6s ease;
}
.ms-health-ring-text {
  display: flex;
  flex-direction: column;
}
.ms-health-ring-percent {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
}
.ms-health-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.ms-health-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-2xl);
  font-weight: 700;
}
.ms-health-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.health-alert-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 1.5s ease-in-out infinite;
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
}

/* 库存预警区域 */
.ms-health-alert-panel {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-warning);
}
.ms-health-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.ms-health-alert-item:last-child {
  border-bottom: none;
}
@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.ms-health-alert-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.ms-health-alert-badge.alert-exhausted {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.ms-health-alert-badge.alert-low {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.ms-health-alert-badge.alert-over {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.ms-health-alert-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.ms-health-alert-count {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-primary);
  margin-left: auto;
  font-size: var(--font-size-xs);
}

/* ====== 表格行入场动画 ====== */
.data-table tbody tr {
  animation: rowSlideIn 0.3s ease-out both;
}
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ====== 空状态圆形图标 ====== */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-bg-secondary, var(--color-surface-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-2);
  color: var(--color-text-tertiary);
}

/* ====== 章节样式 ====== */
.ms-section {
  margin-bottom: var(--space-4);
}
.ms-section-header {
  cursor: pointer;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.ms-section-header h3 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.ms-toggle-icon {
  font-size: 10px;
  color: var(--color-text-tertiary);
}
.ms-section-body {
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  overflow: hidden;
}
.ms-top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 1024px) {
  .ms-kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .ms-overview-row {
    grid-template-columns: 1fr;
  }
  .ms-health-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .ms-top-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .ms-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .ms-health-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .ms-top-grid {
    grid-template-columns: 1fr;
  }
}
.table-container {
  overflow-x: auto;
}
</style>
