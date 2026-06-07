<template>
  <div class="monthly-stats-page">
    <div class="ms-header">
      <div class="ms-header-left">
        <h2>DP仓库月度出入库统计与趋势分析</h2>
        <p>数据驱动 · 智能仓储管理</p>
      </div>
      <div class="ms-controls">
        <select class="form-select" v-model.number="store.selectedYear" style="width:100px">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select class="form-select" v-model.number="store.selectedMonth" style="width:90px">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
        <div class="ms-quick-btns">
          <button class="btn btn-ghost" :class="{ active: store.quickRange === 'prev' }" @click="store.setQuickRange('prev')">上月</button>
          <button class="btn btn-ghost" :class="{ active: store.quickRange === 'curr' }" @click="store.setQuickRange('curr')">本月</button>
          <button class="btn btn-ghost" :class="{ active: store.quickRange === '3m' }" @click="store.setQuickRange('3m')">近3月</button>
          <button class="btn btn-ghost" :class="{ active: store.quickRange === '6m' }" @click="store.setQuickRange('6m')">近6月</button>
          <button class="btn btn-ghost" :class="{ active: store.quickRange === '12m' }" @click="store.setQuickRange('12m')">近12月</button>
        </div>
        <select class="form-select" v-model="store.selectedWarehouse" style="width:120px">
          <option value="">全部仓库</option>
          <option value="main">主仓库</option>
          <option value="east">东区仓库</option>
          <option value="west">西区仓库</option>
          <option value="south">南区仓库</option>
        </select>
        <select class="form-select" v-model="store.selectedBizType" style="width:120px">
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
        <button class="btn btn-secondary" @click="store.refresh()"><Icon name="refresh" :size="14" /> 刷新</button>
        <button class="btn btn-secondary" @click="handleExportExcel"><Icon name="upload" :size="14" /> 导出Excel</button>
        <button class="btn btn-secondary" @click="handleExportPDF"><Icon name="file" :size="14" /> 导出PDF</button>
        <button class="btn btn-ghost" @click="handlePrint"><Icon name="print" :size="14" /> 打印</button>
      </div>
    </div>

    <div class="ms-kpi-grid">
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="package" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-success)">{{ store.kpiData.inCount }}</div><div class="ms-kpi-label">入库单数</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="truck" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-info)">{{ store.kpiData.outCount }}</div><div class="ms-kpi-label">出库单数</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="weight" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-success)">{{ store.kpiData.inWeight.toFixed(1) }}kg</div><div class="ms-kpi-label">入库总重量</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="scale" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-info)">{{ store.kpiData.outWeight.toFixed(1) }}kg</div><div class="ms-kpi-label">出库总重量</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="dollar" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-success)">¥{{ formatNum(store.kpiData.inAmount) }}</div><div class="ms-kpi-label">入库总金额</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="dollarSign" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-info)">¥{{ formatNum(store.kpiData.outAmount) }}</div><div class="ms-kpi-label">出库总金额</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="clock" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-warning)">{{ store.kpiData.pending }}</div><div class="ms-kpi-label">待处理</div></div>
      <div class="ms-kpi-card"><span class="ms-kpi-icon"><Icon name="checkCircle" :size="20" /></span><div class="ms-kpi-value" style="color:var(--color-accent)">{{ store.kpiData.confirmed }}</div><div class="ms-kpi-label">已完成</div></div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('biz')">
        <h3><Icon name="table" :size="14" /> 出入库业务结构汇总表 <span class="ms-toggle-icon"><Icon :name="store.collapsedSections.biz ? 'chevronRight' : 'chevronDown'" :size="14" /></span></h3>
      </div>
      <div class="ms-section-body" v-show="!store.collapsedSections.biz">
        <div class="panel-card"><div class="panel-card-body no-padding"><div class="table-container">
          <table class="data-table">
            <thead><tr><th>业务类型</th><th>入库单数</th><th>入库重量(kg)</th><th>入库金额(元)</th><th>出库单数</th><th>出库重量(kg)</th><th>出库金额(元)</th></tr></thead>
            <tbody>
              <tr v-if="store.bizSummary.length === 0"><td colspan="7" class="empty-state">暂无数据</td></tr>
              <tr v-for="row in store.bizSummary" :key="row.type">
                <td>{{ bizTypeLabel(row.type) }}</td>
                <td>{{ row.inCount }}</td>
                <td>{{ row.inWeight.toFixed(1) }}</td>
                <td>¥{{ formatNum(row.inAmount) }}</td>
                <td>{{ row.outCount }}</td>
                <td>{{ row.outWeight.toFixed(1) }}</td>
                <td>¥{{ formatNum(row.outAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </div></div></div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-top-grid">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">入库金额Top10</span></div>
          <div class="panel-card-body no-padding"><div class="table-container">
            <table class="data-table">
              <thead><tr><th>#</th><th>物料</th><th>金额</th></tr></thead>
              <tbody>
                <tr v-for="(item, idx) in store.topItems" :key="'in'+item.code"><td>{{ idx+1 }}</td><td>{{ item.name }}</td><td>¥{{ formatNum(item.inAmount) }}</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">出库金额Top10</span></div>
          <div class="panel-card-body no-padding"><div class="table-container">
            <table class="data-table">
              <thead><tr><th>#</th><th>物料</th><th>金额</th></tr></thead>
              <tbody>
                <tr v-for="(item, idx) in store.topItems" :key="'out'+item.code"><td>{{ idx+1 }}</td><td>{{ item.name }}</td><td>¥{{ formatNum(item.outAmount) }}</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('category')">
        <h3><Icon name="package" :size="14" /> 物料品类汇总表 <span class="ms-toggle-icon"><Icon :name="store.collapsedSections.category ? 'chevronRight' : 'chevronDown'" :size="14" /></span></h3>
      </div>
      <div class="ms-section-body" v-show="!store.collapsedSections.category">
        <div class="panel-card"><div class="panel-card-body no-padding"><div class="table-container">
          <table class="data-table">
            <thead><tr><th>品类</th><th>物料数</th><th>库存(kg)</th><th>库存金额(元)</th></tr></thead>
            <tbody>
              <tr v-for="row in store.categorySummary" :key="row.category"><td>{{ row.category }}</td><td>{{ row.count }}</td><td>{{ row.stock.toFixed(1) }}</td><td>¥{{ formatNum(row.value) }}</td></tr>
            </tbody>
          </table>
        </div></div></div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('daily')">
        <h3><Icon name="calendar" :size="14" /> 每日明细汇总表 <span class="ms-toggle-icon"><Icon :name="store.collapsedSections.daily ? 'chevronRight' : 'chevronDown'" :size="14" /></span></h3>
      </div>
      <div class="ms-section-body" v-show="!store.collapsedSections.daily">
        <div class="panel-card"><div class="panel-card-body no-padding"><div class="table-container">
          <table class="data-table">
            <thead><tr><th>日期</th><th>入库单数</th><th>入库重量</th><th>入库金额</th><th>出库单数</th><th>出库重量</th><th>出库金额</th></tr></thead>
            <tbody>
              <tr v-for="row in store.dailySummary" :key="row.date"><td>{{ row.date }}</td><td>{{ row.inCount }}</td><td>{{ row.inWeight.toFixed(1) }}</td><td>¥{{ formatNum(row.inAmount) }}</td><td>{{ row.outCount }}</td><td>{{ row.outWeight.toFixed(1) }}</td><td>¥{{ formatNum(row.outAmount) }}</td></tr>
            </tbody>
          </table>
        </div></div></div>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header" @click="store.toggleSection('health')">
        <h3><Icon name="heart" :size="14" /> 库存健康度与风险预警 <span class="ms-toggle-icon"><Icon :name="store.collapsedSections.health ? 'chevronRight' : 'chevronDown'" :size="14" /></span></h3>
      </div>
      <div class="ms-section-body" v-show="!store.collapsedSections.health">
        <div class="ms-health-grid">
          <div class="ms-health-card" style="text-align:center">
            <div :style="{ fontSize: '48px', fontWeight: 800, color: store.healthData.healthScore >= 80 ? 'var(--color-success)' : store.healthData.healthScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }">{{ store.healthData.healthScore }}<span style="font-size:20px;color:var(--color-text-tertiary)">/100</span></div>
            <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">健康度评分</div>
          </div>
          <div class="ms-health-card"><div class="ms-health-value" style="color:var(--color-danger)">{{ store.healthData.exhausted }}</div><div class="ms-health-label">库存耗尽</div></div>
          <div class="ms-health-card"><div class="ms-health-value" style="color:var(--color-warning)">{{ store.healthData.low }}</div><div class="ms-health-label">低于安全库存</div></div>
          <div class="ms-health-card"><div class="ms-health-value" style="color:var(--color-purple)">{{ store.healthData.over }}</div><div class="ms-health-label">超量库存</div></div>
          <div class="ms-health-card"><div class="ms-health-value" style="color:var(--color-success)">{{ store.healthData.normal }}</div><div class="ms-health-label">库存正常</div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMonthlyStatsStore } from '@/stores/monthlyStats'

const store = useMonthlyStatsStore()

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 3; y <= current + 1; y++) years.push(y)
  return years
})

function bizTypeLabel(type) {
  const map = { purchase: '采购入库', sales: '销售出库', customer_return: '客户退货', production: '生产领料', production_return: '生产退料', transfer: '调拨', scrap: '报废出库', surplus: '盘盈入库', loss: '盘亏出库', other: '其他' }
  return map[type] || type
}

function formatNum(n) {
  return (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function handleExportExcel() {
  const headers = ['业务类型', '入库单数', '入库重量(kg)', '入库金额(元)', '出库单数', '出库重量(kg)', '出库金额(元)']
  const rows = store.bizSummary.map(r => [
    bizTypeLabel(r.type),
    r.inCount,
    r.inWeight.toFixed(1),
    r.inAmount.toFixed(2),
    r.outCount,
    r.outWeight.toFixed(1),
    r.outAmount.toFixed(2)
  ])
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '月度统计_' + store.selectedYear + String(store.selectedMonth).padStart(2, '0') + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportPDF() {
  window.print()
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
  gap: 2px;
}
.ms-quick-btns .btn.active {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}
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
}
.ms-kpi-icon {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--color-text-tertiary);
  opacity: 0.5;
}
.ms-kpi-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}
.ms-kpi-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
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
.ms-health-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}
.ms-health-card {
  text-align: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.ms-health-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}
.ms-health-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
@media (max-width: 1024px) {
  .ms-kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .ms-top-grid { grid-template-columns: 1fr 1fr; }
  .ms-health-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .ms-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .ms-top-grid { grid-template-columns: 1fr; }
  .ms-health-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
