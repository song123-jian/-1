<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">报表中心</h2>
        <p class="page-header-subtitle">先选报表，再看趋势和异常，最后按需导出</p>
      </div>
      <div class="page-header-actions">
        <div class="export-dropdown-wrapper" style="position: relative; display: inline-block">
          <button class="btn btn-ghost btn-sm" @click="showExportFormatMenu = !showExportFormatMenu">
            <Icon name="upload" :size="14" />
            导出报表
          </button>
          <div
            v-if="showExportFormatMenu"
            class="export-format-menu"
            style="
              position: absolute;
              right: 0;
              top: 100%;
              margin-top: 4px;
              background: var(--color-bg-primary);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-md);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
              z-index: var(--z-dropdown);
              min-width: 120px;
            "
          >
            <button
              class="export-format-item"
              style="
                display: block;
                width: 100%;
                padding: var(--space-2) var(--space-3);
                background: none;
                border: none;
                cursor: pointer;
                text-align: left;
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
              "
              @click="exportAllReports('csv')"
            >
              CSV
            </button>
            <button
              class="export-format-item"
              style="
                display: block;
                width: 100%;
                padding: var(--space-2) var(--space-3);
                background: none;
                border: none;
                cursor: pointer;
                text-align: left;
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
                border-top: 1px solid var(--color-border);
              "
              @click="exportAllReports('excel')"
            >
              Excel
            </button>
            <button
              class="export-format-item"
              style="
                display: block;
                width: 100%;
                padding: var(--space-2) var(--space-3);
                background: none;
                border: none;
                cursor: pointer;
                text-align: left;
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
                border-top: 1px solid var(--color-border);
              "
              @click="exportAllReports('pdf')"
            >
              PDF
            </button>
          </div>
        </div>
        <button class="btn btn-secondary" @click="exportAllReports('csv')">
          <Icon name="upload" :size="14" />
          导出汇总
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-card" style="animation-delay: 0ms">
        <div class="stat-icon"><Icon name="chart" :size="18" /></div>
        <div class="stat-value">6</div>
        <div class="stat-label">可用报表</div>
      </div>
      <div class="stat-card" style="animation-delay: 60ms">
        <div class="stat-icon"><Icon name="checkCircle" :size="18" /></div>
        <div class="stat-value">5</div>
        <div class="stat-label">可用报表</div>
      </div>
      <div class="stat-card" style="animation-delay: 120ms">
        <div class="stat-icon"><Icon name="pieChart" :size="18" /></div>
        <div class="stat-value">92%</div>
        <div class="stat-label">数据覆盖率</div>
      </div>
      <div class="stat-card" style="animation-delay: 180ms">
        <div class="stat-icon"><Icon name="clock" :size="18" /></div>
        <div class="stat-value">刚刚</div>
        <div class="stat-label">最近同步</div>
      </div>
    </div>

    <div class="content-grid content-grid-2">
      <div class="panel-card report-card" style="--i: 0" @click="generateReport('sales')">
        <div class="panel-card-body">
          <div style="font-size: 2rem; margin-bottom: var(--space-3)"><Icon name="chart" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">销售分析报告</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">
            按客户、产品、周期的销售趋势分析与排名
          </p>
          <div v-safe-html="salesSummary" style="margin: var(--space-2) 0; font-size: var(--font-size-sm)"></div>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge success">可用</span>
          </div>
        </div>
      </div>

      <div class="panel-card report-card" style="--i: 1" @click="generateReport('inventory')">
        <div class="panel-card-body">
          <div style="font-size: 2rem; margin-bottom: var(--space-3)"><Icon name="package" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">库存状态报告</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">
            含估值的库存明细、周转率分析、低库存预警
          </p>
          <div v-safe-html="inventorySummary" style="margin: var(--space-2) 0; font-size: var(--font-size-sm)"></div>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge success">可用</span>
          </div>
        </div>
      </div>

      <div class="panel-card report-card" style="--i: 2" @click="generateReport('finance')">
        <div class="panel-card-body">
          <div style="font-size: 2rem; margin-bottom: var(--space-3)"><Icon name="dollar" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">财务汇总报告</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">
            营收汇总、应收账款账龄、毛利率分析
          </p>
          <div v-safe-html="financeSummary" style="margin: var(--space-2) 0; font-size: var(--font-size-sm)"></div>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge success">可用</span>
          </div>
        </div>
      </div>

      <div class="panel-card report-card" style="--i: 3" @click="generateReport('purchase')">
        <div class="panel-card-body">
          <div style="font-size: 2rem; margin-bottom: var(--space-3)"><Icon name="shoppingCart" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">采购支出分析</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">
            按类别、供应商、周期的采购支出统计
          </p>
          <div v-safe-html="purchaseSummary" style="margin: var(--space-2) 0; font-size: var(--font-size-sm)"></div>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge success">可用</span>
          </div>
        </div>
      </div>

      <div class="panel-card report-card" style="--i: 4" @click="openCustomReportBuilder">
        <div class="panel-card-body" style="text-align: center">
          <div style="font-size: 2rem; margin-bottom: var(--space-2)"><Icon name="setting" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">自定义报告</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">支持字段选择和筛选条件配置</p>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge success">可用</span>
          </div>
        </div>
      </div>

      <div class="panel-card report-card" style="--i: 5; opacity: 0.6">
        <div class="panel-card-body" style="text-align: center">
          <div style="font-size: 2rem; margin-bottom: var(--space-2)"><Icon name="clock" :size="28" /></div>
          <div class="panel-card-title" style="margin-bottom: var(--space-2)">定时报告</div>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">设置周期报告自动生成和分发</p>
          <div style="margin-top: var(--space-3)">
            <span class="status-badge neutral">计划中</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top: var(--space-6)">
      <div class="panel-card-header"><span class="panel-card-title">报表参数配置</span></div>
      <div class="panel-card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: var(--space-4); align-items: end">
          <div class="form-group">
            <label class="form-label">报表类型</label>
            <select v-model="reportType" class="form-select">
              <option value="sales">销售分析</option>
              <option value="inventory">库存状态</option>
              <option value="finance">财务汇总</option>
              <option value="purchase">采购支出</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">开始日期</label>
            <input v-model="dateFrom" class="form-input" type="date" />
          </div>
          <div class="form-group">
            <label class="form-label">结束日期</label>
            <input v-model="dateTo" class="form-input" type="date" />
          </div>
          <button class="btn btn-primary" @click="generateReportWithParams">生成报表</button>
        </div>
        <div
          v-if="paramError"
          style="margin-top: var(--space-2); color: var(--color-danger); font-size: var(--font-size-sm)"
        >
          {{ paramError }}
        </div>
        <div v-if="paramReportHtml" v-safe-html="paramReportHtml" style="margin-top: var(--space-4)"></div>
      </div>
    </div>

    <div class="panel-card" style="margin-top: var(--space-6)">
      <div class="panel-card-header"><span class="panel-card-title">数据可视化</span></div>
      <div class="panel-card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4)">
          <div>
            <h4 style="margin-bottom: var(--space-2); color: var(--color-accent)">营收趋势</h4>
            <div class="chart-container">
              <div v-if="revenueChartData.length === 0" class="empty-state">
                <div class="empty-icon"><Icon name="chart" :size="24" /></div>
                <div class="empty-text">暂无结果，先选择条件或生成报表</div>
              </div>
              <div v-else class="bar-chart">
                <div v-for="(item, idx) in revenueChartData" :key="idx" class="bar-item">
                  <div class="bar-label">{{ item.label }}</div>
                  <div class="bar-track">
                    <div class="bar-fill revenue" :style="{ height: barHeight(item.value, maxRevenue) + '%' }">
                      <span v-if="item.value > 0" class="bar-value">{{ formatChartValue(item.value) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 style="margin-bottom: var(--space-2); color: var(--color-success)">回款趋势</h4>
            <div class="chart-container">
              <div v-if="collectionChartData.length === 0" class="empty-state">
                <div class="empty-icon"><Icon name="chart" :size="24" /></div>
                <div class="empty-text">暂无结果，先选择条件或生成报表</div>
              </div>
              <div v-else class="bar-chart">
                <div v-for="(item, idx) in collectionChartData" :key="idx" class="bar-item">
                  <div class="bar-label">{{ item.label }}</div>
                  <div class="bar-track">
                    <div class="bar-fill collection" :style="{ height: barHeight(item.value, maxCollection) + '%' }">
                      <span v-if="item.value > 0" class="bar-value">{{ formatChartValue(item.value) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCustomBuilder" class="modal-overlay" @click.self="showCustomBuilder = false">
      <div class="modal-panel" style="max-width: 700px">
        <div class="modal-header">
          <h3>自定义报表</h3>
          <button class="btn btn-ghost btn-sm" @click="showCustomBuilder = false">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">数据源</label>
            <select v-model="customSource" class="form-select" @change="updateCustomFields">
              <option value="quotations">报价数据</option>
              <option value="customers">客户数据</option>
              <option value="inventory">库存数据</option>
              <option value="deliveries">送货数据</option>
              <option value="collections">回款数据</option>
              <option value="costAnalysis">成本数据</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">选择字段</label>
            <div
              style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--space-2);
                max-height: 200px;
                overflow-y: auto;
                padding: var(--space-2);
              "
            >
              <label
                v-for="f in customFields"
                :key="f"
                style="display: flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); cursor: pointer"
              >
                <input v-model="selectedFields" type="checkbox" :value="f" />
                {{ f }}
              </label>
            </div>
            <div v-if="customFields.length === 0" class="empty-state-inline">
              <div class="empty-icon-sm"><Icon name="package" :size="20" /></div>
              <div class="empty-text">暂无字段</div>
            </div>
          </div>
          <div
            v-if="customError"
            style="margin-top: var(--space-2); color: var(--color-danger); font-size: var(--font-size-sm)"
          >
            {{ customError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showCustomBuilder = false">取消</button>
          <button class="btn btn-primary" @click="generateCustomReport">生成报表</button>
        </div>
      </div>
    </div>

    <div v-if="showExportDialog" class="modal-overlay" @click.self="showExportDialog = false">
      <div class="modal-panel" style="max-width: 800px">
        <div class="modal-header">
          <h3>{{ exportTitle }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showExportDialog = false">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="h in exportHeaders" :key="h.key">{{ h.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in exportData" :key="idx">
                  <td v-for="h in exportHeaders" :key="h.key">{{ row[h.key] ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showExportDialog = false">关闭</button>
          <button class="btn btn-primary" @click="doExportCSV">
            <Icon name="upload" :size="14" />
            导出表格
          </button>
        </div>
      </div>
    </div>

    <div v-if="reportDialog.show" class="modal-overlay" @click.self="reportDialog.show = false">
      <div class="modal-panel" style="max-width: 600px">
        <div class="modal-header">
          <h3>{{ reportDialog.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="reportDialog.show = false">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <p style="white-space: pre-line; color: var(--color-text-secondary)">{{ reportDialog.content }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="reportDialog.show = false">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'Reports' }
</script>
<script setup>
import { ref, computed } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useDeliveryStore } from '@/stores/delivery'
import { useClickOutside } from '@/composables/useClickOutside'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useCostStore } from '@/modules/finance/stores/cost'
import { useDataStore } from '@/stores/data'
import { escapeHtml } from '@/utils/format'
import { CJK_SANS_FONT_STACK } from '@/utils/fontStacks'

const quotationStore = useQuotationStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const deliveryStore = useDeliveryStore()
const collectionStore = useCollectionStore()
const costStore = useCostStore()
const dataStore = useDataStore()

const reportType = ref('sales')
const dateFrom = ref('')
const dateTo = ref('')
const paramReportHtml = ref('')
const showCustomBuilder = ref(false)
const customSource = ref('quotations')
const customFields = ref([])
const selectedFields = ref([])
const showExportDialog = ref(false)
const exportTitle = ref('')
const exportHeaders = ref([])
const exportData = ref([])
const reportDialog = ref({ show: false, title: '', content: '' })
const paramError = ref('')
const customError = ref('')
const showExportFormatMenu = ref(false)

const salesSummary = computed(() => {
  const q = quotationStore.quotations || []
  const approved = q.filter((x) => x.status === 'approved' || x.status === 'accepted')
  const revenue = approved.reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  const active = (customerStore.customers || []).filter((c) => c.status === 'active').length
  return `报价总数：<strong>${q.length}</strong> | 已确认报价：<strong>${approved.length}</strong> | 确认营收：<strong>¥${revenue.toLocaleString()}</strong> | 活跃客户：<strong>${active}</strong>`
})

const inventorySummary = computed(() => {
  const inv = inventoryStore.inventory || []
  const totalValue = inv.reduce((s, i) => s + (parseFloat(i.totalValue) || 0), 0)
  const lowStock = inv.filter((i) => i.safetyStock > 0 && i.quantity <= i.safetyStock).length
  return `物料总数：<strong>${inv.length}</strong> | 库存总值：<strong>¥${totalValue.toLocaleString()}</strong> | 低库存预警：<strong style="color:var(--color-danger)">${lowStock}</strong>`
})

const financeSummary = computed(() => {
  const q = quotationStore.quotations || []
  const c = collectionStore.collections || []
  const revenue = q
    .filter((x) => x.status === 'approved' || x.status === 'accepted')
    .reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  const collected = c.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
  const outstanding = revenue - collected
  return `总营收：<strong>¥${revenue.toLocaleString()}</strong> | 已回款：<strong style="color:var(--color-success)">¥${collected.toLocaleString()}</strong> | 应收未收：<strong style="color:var(--color-warning)">¥${outstanding.toLocaleString()}</strong>`
})

const purchaseSummary = computed(() => {
  const purchases = dataStore.purchases || []
  const suppliers = dataStore.suppliers || []
  const totalPurchase = purchases.reduce((s, p) => s + (parseFloat(p.total) || 0), 0)
  const activeSup = suppliers.filter((s) => s.status === 'active').length
  return `采购订单：<strong>${purchases.length}</strong> | 采购总额：<strong>¥${totalPurchase.toLocaleString()}</strong> | 活跃供应商：<strong>${activeSup}</strong>`
})

function getMonthRange(from, to) {
  const months = []
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
  const end = to ? new Date(to) : new Date()
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  while (d <= end) {
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
    d.setMonth(d.getMonth() + 1)
  }
  return months.length ? months : [new Date().toISOString().substring(0, 7)]
}

const revenueChartData = computed(() => {
  const months = getMonthRange(dateFrom.value, dateTo.value)
  const q = quotationStore.quotations || []
  return months.map((m) => ({
    label: m.substring(5),
    value: q
      .filter(
        (x) => x.createdAt && x.createdAt.indexOf(m) === 0 && (x.status === 'approved' || x.status === 'accepted')
      )
      .reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  }))
})

const collectionChartData = computed(() => {
  const months = getMonthRange(dateFrom.value, dateTo.value)
  const c = collectionStore.collections || []
  return months.map((m) => ({
    label: m.substring(5),
    value: c.filter((x) => x.date && x.date.indexOf(m) === 0).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
  }))
})

const maxRevenue = computed(() => Math.max(...revenueChartData.value.map((d) => d.value), 1))
const maxCollection = computed(() => Math.max(...collectionChartData.value.map((d) => d.value), 1))

function barHeight(val, max) {
  return max > 0 ? Math.max((val / max) * 100, 2) : 0
}

function formatChartValue(val) {
  return val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(0)
}

function generateReport(type) {
  const summaries = {
    sales: salesSummary,
    inventory: inventorySummary,
    finance: financeSummary,
    purchase: purchaseSummary
  }
  const labels = { sales: '销售分析报告', inventory: '库存状态报告', finance: '财务汇总报告', purchase: '采购支出分析' }
  reportDialog.value = {
    show: true,
    title: labels[type] + ' 已生成',
    content: summaries[type]?.value?.replace(/<[^>]+>/g, ' ') || ''
  }
}

function generateReportWithParams() {
  paramError.value = ''
  if (!dateFrom.value || !dateTo.value) {
    paramError.value = '请选择开始日期和结束日期'
    setTimeout(() => {
      paramError.value = ''
    }, 3000)
    return
  }
  if (dateFrom.value > dateTo.value) {
    paramError.value = '开始日期不能晚于结束日期'
    setTimeout(() => {
      paramError.value = ''
    }, 3000)
    return
  }
  const fromTime = new Date(dateFrom.value).getTime()
  const toTime = new Date(dateTo.value).getTime() + 86400000
  if (toTime - fromTime > 366 * 86400000) {
    paramError.value = '日期范围不能超过1年'
    setTimeout(() => {
      paramError.value = ''
    }, 3000)
    return
  }

  const type = reportType.value
  function filterByDate(arr, dateField) {
    return arr.filter((item) => {
      const d = item[dateField]
      if (!d) return false
      const t = new Date(d).getTime()
      return t >= fromTime && t < toTime
    })
  }

  let html = ''
  const q = quotationStore.quotations || []
  const c = collectionStore.collections || []
  const inv = inventoryStore.inventory || []
  const purchases = dataStore.purchases || []
  const suppliers = dataStore.suppliers || []
  const customers = customerStore.customers || []

  if (type === 'sales' || type === 'custom') {
    const fq = filterByDate(q, 'createdAt')
    const approved = fq.filter((x) => x.status === 'approved' || x.status === 'accepted')
    const revenue = approved.reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
    const activeCust = customers.filter((x) => x.status === 'active').length
    html += `<div style="margin-bottom:var(--space-4)"><h4 style="color:var(--color-accent);margin-bottom:var(--space-2)">📊 销售分析</h4>`
    html += `<p>期间报价：<strong>${fq.length}</strong> | 已确认：<strong>${approved.length}</strong> | 确认营收：<strong>¥${revenue.toLocaleString()}</strong> | 活跃客户：<strong>${activeCust}</strong></p></div>`
  }
  if (type === 'inventory' || type === 'custom') {
    const totalItems = inv.length
    const totalValue = inv.reduce((s, i) => s + (parseFloat(i.totalValue) || 0), 0)
    const lowStock = inv.filter((i) => i.safetyStock > 0 && i.quantity <= i.safetyStock).length
    html += `<div style="margin-bottom:var(--space-4)"><h4 style="color:var(--color-accent);margin-bottom:var(--space-2)">📦 库存状态</h4>`
    html += `<p>物料总数：<strong>${totalItems}</strong> | 库存总值：<strong>¥${totalValue.toLocaleString()}</strong> | 低库存预警：<strong style="color:var(--color-danger)">${lowStock}</strong></p></div>`
  }
  if (type === 'finance' || type === 'custom') {
    const fq2 = filterByDate(q, 'createdAt')
    const totalRev = fq2
      .filter((x) => x.status === 'approved' || x.status === 'accepted')
      .reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
    const fc = filterByDate(c, 'date')
    const totalCol = fc.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
    html += `<div style="margin-bottom:var(--space-4)"><h4 style="color:var(--color-accent);margin-bottom:var(--space-2)">💰 财务汇总</h4>`
    html += `<p>营收：<strong>¥${totalRev.toLocaleString()}</strong> | 已回款：<strong style="color:var(--color-success)">¥${totalCol.toLocaleString()}</strong> | 应收未收：<strong style="color:var(--color-warning)">¥${(totalRev - totalCol).toLocaleString()}</strong></p></div>`
  }
  if (type === 'purchase' || type === 'custom') {
    const fp = filterByDate(purchases, 'createdAt')
    const totalPO = fp.length
    const totalPurch = fp.reduce((s, p) => s + (parseFloat(p.total) || 0), 0)
    const activeSup = suppliers.filter((s) => s.status === 'active').length
    html += `<div style="margin-bottom:var(--space-4)"><h4 style="color:var(--color-accent);margin-bottom:var(--space-2)">🛒 采购支出</h4>`
    html += `<p>采购订单：<strong>${totalPO}</strong> | 采购总额：<strong>¥${totalPurch.toLocaleString()}</strong> | 活跃供应商：<strong>${activeSup}</strong></p></div>`
  }
  html += `<p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm)">统计期间：${dateFrom.value} 至 ${dateTo.value}</p>`
  paramReportHtml.value = html
}

function openCustomReportBuilder() {
  showCustomBuilder.value = true
  customSource.value = 'quotations'
  updateCustomFields()
}

function updateCustomFields() {
  const sourceMap = {
    quotations: quotationStore.quotations,
    customers: customerStore.customers,
    inventory: inventoryStore.inventory,
    deliveries: deliveryStore.deliveries,
    collections: collectionStore.collections,
    costAnalysis: costStore.records
  }
  const data = sourceMap[customSource.value] || []
  customFields.value = data.length > 0 ? Object.keys(data[0]) : []
  selectedFields.value = [...customFields.value]
}

function generateCustomReport() {
  customError.value = ''
  if (selectedFields.value.length === 0) {
    customError.value = '请至少选择一个字段'
    setTimeout(() => {
      customError.value = ''
    }, 3000)
    return
  }
  const sourceMap = {
    quotations: quotationStore.quotations,
    customers: customerStore.customers,
    inventory: inventoryStore.inventory,
    deliveries: deliveryStore.deliveries,
    collections: collectionStore.collections,
    costAnalysis: costStore.records
  }
  const data = sourceMap[customSource.value] || []
  if (data.length === 0) {
    customError.value = '所选数据源没有数据'
    setTimeout(() => {
      customError.value = ''
    }, 3000)
    return
  }
  exportHeaders.value = selectedFields.value.map((f) => ({ key: f, label: f }))
  exportData.value = data.map((item) => {
    const row = {}
    for (const f of selectedFields.value) row[f] = item[f] ?? ''
    return row
  })
  exportTitle.value = '自定义报表 - ' + customSource.value
  showCustomBuilder.value = false
  showExportDialog.value = true
}

function exportAllReports(format = 'csv') {
  showExportFormatMenu.value = false
  const types = ['sales', 'inventory', 'finance', 'purchase']
  const labels = { sales: '销售分析', inventory: '库存状态', finance: '财务汇总', purchase: '采购支出' }
  const headers = [
    { key: 'type', label: '报表类型' },
    { key: 'metric1', label: '关键指标1' },
    { key: 'metric2', label: '关键指标2' },
    { key: 'metric3', label: '关键指标3' }
  ]
  const rows = []
  for (const t of types) {
    const row = { type: labels[t] }
    if (t === 'sales') {
      const q = quotationStore.quotations || []
      row.metric1 = '报价' + q.length + '条'
      row.metric2 = '确认' + q.filter((x) => x.status === 'approved' || x.status === 'accepted').length + '条'
      row.metric3 =
        '营收¥' +
        q
          .filter((x) => x.status === 'approved' || x.status === 'accepted')
          .reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
          .toLocaleString()
    } else if (t === 'inventory') {
      const inv = inventoryStore.inventory || []
      row.metric1 = '物料' + inv.length + '种'
      row.metric2 = '总值¥' + inv.reduce((s, x) => s + (parseFloat(x.totalValue) || 0), 0).toLocaleString()
      row.metric3 = '低库存' + inv.filter((x) => x.safetyStock > 0 && x.quantity <= x.safetyStock).length + '项'
    } else if (t === 'finance') {
      const q = quotationStore.quotations || []
      const c = collectionStore.collections || []
      const rev = q
        .filter((x) => x.status === 'approved' || x.status === 'accepted')
        .reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
      const col = c.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
      row.metric1 = '营收¥' + rev.toLocaleString()
      row.metric2 = '回款¥' + col.toLocaleString()
      row.metric3 = '应收¥' + (rev - col).toLocaleString()
    } else if (t === 'purchase') {
      const purchases = dataStore.purchases || []
      const suppliers = dataStore.suppliers || []
      row.metric1 = '订单' + purchases.length + '条'
      row.metric2 = '总额¥' + purchases.reduce((s, x) => s + (parseFloat(x.total) || 0), 0).toLocaleString()
      row.metric3 = '供应商' + suppliers.filter((s) => s.status === 'active').length + '家'
    }
    rows.push(row)
  }
  exportHeaders.value = headers
  exportData.value = rows
  exportTitle.value = '全部报表汇总'
  if (format === 'csv') {
    doExportCSV()
  } else if (format === 'excel') {
    doExportExcel()
  } else if (format === 'pdf') {
    doExportPDF()
  } else {
    showExportDialog.value = true
  }
}

function doExportCSV() {
  try {
    const list = exportData.value
    const headers = exportHeaders.value
    if (list.length === 0) return
    let csv = headers.map((h) => h.label).join(',') + '\n'
    for (const row of list) {
      csv += headers.map((h) => '"' + String(row[h.key] ?? '').replace(/"/g, '""') + '"').join(',') + '\n'
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportTitle.value + '_' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function doExportExcel() {
  try {
    const list = exportData.value
    const headers = exportHeaders.value
    if (list.length === 0) return
    let html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>'
    html += '<tr>' + headers.map((h) => '<th>' + h.label + '</th>').join('') + '</tr>'
    for (const row of list) {
      html += '<tr>' + headers.map((h) => '<td>' + escapeHtml(String(row[h.key] ?? '')) + '</td>').join('') + '</tr>'
    }
    html += '</table></body></html>'
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportTitle.value + '_' + new Date().toISOString().split('T')[0] + '.xls'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function doExportPDF() {
  try {
    const list = exportData.value
    const headers = exportHeaders.value
    if (list.length === 0) return
    let html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
      exportTitle.value +
      `</title><style>body{font-family:${CJK_SANS_FONT_STACK};padding:var(--space-5)}table{border-collapse:collapse;width:100%}th{border:1px solid #ddd;padding:var(--space-2);text-align:left; overflow-wrap:break-word; word-wrap:break-word}td{border:1px solid #ddd;padding:var(--space-2);text-align:left; overflow-wrap:break-word; word-wrap:break-word}th{background:#f5f5f5}h1{font-size:18px}</style></head><body>`
    html += '<h1>' + exportTitle.value + '</h1>'
    html += '<p>生成时间：' + new Date().toLocaleString() + '</p>'
    html += '<table><thead><tr>' + headers.map((h) => '<th>' + h.label + '</th>').join('') + '</tr></thead><tbody>'
    for (const row of list) {
      html += '<tr>' + headers.map((h) => '<td>' + escapeHtml(String(row[h.key] ?? '')) + '</td>').join('') + '</tr>'
    }
    html += '</tbody></table></body></html>'
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function closeExportMenuOnClickOutside(e) {
  const wrapper = document.querySelector('.export-dropdown-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    showExportFormatMenu.value = false
  }
}

useClickOutside(closeExportMenuOnClickOutside)
</script>

<style scoped>
.export-format-item:hover {
  background: var(--color-bg-secondary);
}
.report-card {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.chart-container {
  min-height: 200px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 180px;
  padding-top: var(--space-2);
}
.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.bar-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.bar-track {
  flex: 1;
  width: 100%;
  max-width: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.bar-fill {
  width: 100%;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
  position: relative;
}
.bar-fill.revenue {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.7));
  border: 1px solid rgba(59, 130, 246, 0.8);
  animation: barShimmer 2.5s ease-in-out infinite;
}
.bar-fill.collection {
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.7));
  border: 1px solid rgba(34, 197, 94, 0.8);
  animation: barShimmer 2.5s ease-in-out infinite;
}
.bar-value {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes barShimmer {
  0% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 0% 100%;
  }
  100% {
    background-position: 0% 0%;
  }
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-align: center;
  animation: statCardIn 0.5s ease both;
  animation-delay: var(--delay, 0ms);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  color: var(--color-accent);
  margin-bottom: var(--space-2);
}
.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  line-height: 1.2;
}
.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.report-card {
  cursor: pointer;
  animation: cardFadeIn 0.5s ease both;
  animation-delay: calc(var(--i, 0) * 60ms);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--color-text-tertiary);
}
.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}
.empty-text {
  font-size: var(--font-size-sm);
}
.empty-state-inline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-tertiary);
  padding: var(--space-2) 0;
}
.empty-icon-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

@media (max-width: 1024px) {
  .content-grid-2 {
    grid-template-columns: 1fr 1fr;
  }
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .content-grid-2 {
    grid-template-columns: 1fr;
  }
  .stats-bar {
    grid-template-columns: 1fr;
  }
}
</style>
