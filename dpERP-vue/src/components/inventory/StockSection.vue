<template>
  <div class="stock-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title"><Icon name="package" :size="14" /> 库存管理</h2>
        <p class="page-header-subtitle">{{ inventoryStore.enrichedInventory.length }} 种物料</p>
      </div>
      <div class="page-header-actions">
      </div>
    </div>
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="package" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.enrichedInventory.length }}</div>
          <div class="inv-stat-label">物料种类</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="shield" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</div>
          <div class="inv-stat-label">总库存(kg)</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)"><Icon name="warning" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.exhaustedCount }}</div>
          <div class="inv-stat-label">库存耗尽</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="warning" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.lowStockCount }}</div>
          <div class="inv-stat-label">低于安全库存</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-info-subtle);color:var(--color-info)"><Icon name="checkCircle" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.normalStockCount }}</div>
          <div class="inv-stat-label">库存正常</div>
        </div>
      </div>

      <div class="inv-toolbar">
        <div class="inv-search">
          <span class="search-icon"><Icon name="search" :size="14" /></span>
          <input v-model="stockSearch" type="text" class="search-input" placeholder="搜索物料编码/名称/牌号..." />
        </div>
        <div class="inv-filters">
          <select v-model="stockCategoryFilter" class="form-select filter-select">
            <option value="">全部类别</option>
            <option value="raw">原材料</option>
          </select>
          <select v-model="stockWarehouseFilter" class="form-select filter-select">
            <option value="">全部仓库</option>
            <option value="main">主仓库</option>
          </select>
          <select v-model="stockAlertFilter" class="form-select filter-select">
            <option value="">全部预警状态</option>
            <option value="exhausted">库存耗尽</option>
            <option value="low">低于安全库存</option>
            <option value="over">超量库存</option>
            <option value="ok">库存正常</option>
          </select>
          <select v-model="stockPageSize" class="form-select filter-select" style="width:auto">
            <option :value="15">15条/页</option>
            <option :value="30">30条/页</option>
            <option :value="50">50条/页</option>
            <option :value="100">100条/页</option>
          </select>
        </div>
        <div class="inv-toolbar-right">
          <div class="column-config-wrapper">
            <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
            <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
              <label v-for="col in stockColumnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
                <input type="checkbox" v-model="stockColumnVisible[col.key]">{{ col.label }}
              </label>
            </div>
          </div>
          <div class="view-toggle-dropdown">
            <button class="btn btn-ghost btn-sm" @click="stockViewMenuOpen = !stockViewMenuOpen"><Icon name="chart" :size="14" /> 视图</button>
            <div v-if="stockViewMenuOpen" class="view-toggle-menu">
              <button :class="{ active: stockView === 'table' }" @click="stockView = 'table'; stockViewMenuOpen = false"><Icon name="chart" :size="14" /> 表格视图</button>
              <button :class="{ active: stockView === 'list' }" @click="stockView = 'list'; stockViewMenuOpen = false"><Icon name="list" :size="14" /> 列表视图</button>
              <button :class="{ active: stockView === 'card' }" @click="stockView = 'card'; stockViewMenuOpen = false"><Icon name="card" :size="14" /> 卡片视图</button>
              <button :class="{ active: stockView === 'calendar' }" @click="stockView = 'calendar'; stockViewMenuOpen = false"><Icon name="calendar" :size="14" /> 日历视图</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="handleExport"><Icon name="upload" :size="14" /> 导出</button>
          <button class="btn btn-secondary btn-sm" @click="runInventoryAssessment"><Icon name="search" :size="14" /> 自主评估</button>
          <button v-if="canDeleteInbound" class="btn btn-sm" style="background:var(--color-danger);color:#fff;border-color:var(--color-danger)" @click="handleBatchDeleteInventory"><Icon name="delete" :size="14" /> 批量删除</button>
          <button class="btn btn-primary btn-sm" @click="emit('edit-item', null)">+ 新增物料</button>
        </div>
      </div>

      <div v-if="stockView === 'table'" class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">库存查询表</span>
          <span class="result-count">共 {{ filteredInventory.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th style="width:40px"><input type="checkbox" v-model="stockSelectAll" @change="toggleStockSelectAll"></th>
                  <th v-if="stockColumnVisible.materialCode">物料编码</th>
                  <th v-if="stockColumnVisible.materialName">物料名称</th>
                  <th v-if="stockColumnVisible.grade">牌号</th>
                  <th v-if="stockColumnVisible.color">颜色</th>
                  <th v-if="stockColumnVisible.lastInboundDate">最近入库日期</th>
                  <th v-if="stockColumnVisible.remainingStock" @click="toggleStockSort('stock')" style="cursor:pointer">剩余库存(kg) <Icon :name="stockSortIcon" :size="14" class="sort-icon" /></th>
                  <th v-if="stockColumnVisible.safetyStock">安全库存</th>
                  <th v-if="stockColumnVisible.unitPrice && canViewCost">单价</th>
                  <th v-if="stockColumnVisible.totalValue && canViewCost">总价值</th>
                  <th v-if="stockColumnVisible.alertStatus">预警状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedInventory.length === 0">
                  <td colspan="12" class="empty-cell">暂无库存数据</td>
                </tr>
                <tr v-for="item in paginatedInventory" :key="item.id">
                  <td><input type="checkbox" :value="item.id" v-model="stockSelectedIds"></td>
                  <td v-if="stockColumnVisible.materialCode" class="cell-mono">{{ item.code }}</td>
                  <td v-if="stockColumnVisible.materialName"><strong>{{ item.name }}</strong></td>
                  <td v-if="stockColumnVisible.grade">{{ item.grade || item.brand || '-' }}</td>
                  <td v-if="stockColumnVisible.color">{{ item.color || '-' }}</td>
                  <td v-if="stockColumnVisible.lastInboundDate" class="cell-xs">{{ item.lastInboundDate }}</td>
                  <td v-if="stockColumnVisible.remainingStock" class="cell-mono" :style="{ color: alertColor(item.alertStatus), fontWeight: item.alertStatus === 'exhausted' || item.alertStatus === 'low' ? 700 : 400 }">{{ item.stock.toFixed(1) }}</td>
                  <td v-if="stockColumnVisible.safetyStock">{{ item.safetyStockVal }}</td>
                  <td v-if="stockColumnVisible.unitPrice && canViewCost">{{ item.unitCost.toFixed(2) }}</td>
                  <td v-if="stockColumnVisible.totalValue && canViewCost">{{ item.totalValue.toFixed(2) }}</td>
                  <td v-if="stockColumnVisible.alertStatus"><span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span></td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" @click="emit('edit-item', item)"><Icon name="edit" :size="14" /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="pagination-bar" v-if="stockView === 'table' && stockTotalPages > 1">
        <span class="page-info">第 {{ stockPage }} / {{ stockTotalPages }} 页，共 {{ filteredInventory.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="stockPage <= 1" @click="stockPage--"><Icon name="chevronLeft" :size="14" /></button>
          <button class="btn btn-ghost btn-sm" :disabled="stockPage >= stockTotalPages" @click="stockPage++"><Icon name="chevronRight" :size="14" /></button>
        </div>
      </div>

      <div v-if="stockView === 'list'" class="panel-card" style="margin-top:var(--space-3)">
        <div class="panel-card-header">
          <span class="panel-card-title">库存列表视图</span>
          <span class="result-count">共 {{ filteredInventory.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div v-for="item in paginatedInventory" :key="item.id" class="inbound-list-item" style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border);cursor:pointer" @click="emit('edit-item', item)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="color:var(--color-text-primary)">{{ item.name }}</strong>
                <span style="margin-left:var(--space-2);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">{{ item.code }}</span>
              </div>
              <span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span>
            </div>
            <div style="display:flex;gap:var(--space-4);margin-top:var(--space-1);font-size:var(--font-size-xs);color:var(--color-text-tertiary)">
              <span>牌号: {{ item.grade || item.brand || '-' }}</span>
              <span>库存: {{ item.stock.toFixed(1) }}kg</span>
              <span>最近入库: {{ item.lastInboundDate }}</span>
            </div>
          </div>
          <div v-if="filteredInventory.length === 0" class="empty-cell" style="padding:var(--space-8)">暂无库存数据</div>
        </div>
      </div>

      <div v-if="stockView === 'card'" style="margin-top:var(--space-3)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <span style="font-size:var(--font-size-sm);color:var(--color-text-tertiary)">共 {{ filteredInventory.length }} 条</span>
        </div>
        <div class="inbound-card-grid">
          <div v-for="item in paginatedInventory" :key="item.id" class="inbound-card-item" @click="emit('edit-item', item)" style="cursor:pointer">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
              <strong>{{ item.name }}</strong>
              <span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span>
            </div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">
              <div><span class="detail-label">编码</span> {{ item.code }}</div>
              <div><span class="detail-label">仓库</span> {{ item.warehouse === 'main' ? '主仓库' : item.warehouse }}</div>
              <div><span class="detail-label">数量</span> {{ item.stock.toFixed(1) }} kg</div>
              <div><span class="detail-label">安全库存</span> {{ item.safetyStockVal }} kg</div>
              <div v-if="canViewCost"><span class="detail-label">单价</span> {{ item.unitCost.toFixed(2) }} 元</div>
              <div v-if="canViewCost"><span class="detail-label">总值</span> {{ item.totalValue.toFixed(2) }} 元</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="stockView === 'calendar'" class="panel-card" style="margin-top:var(--space-3)">
        <div class="panel-card-header">
          <button class="btn btn-ghost btn-sm" @click="stockCalPrev"><Icon name="chevronLeft" :size="14" /></button>
          <span class="panel-card-title">{{ stockCalYear }}年{{ stockCalMonth + 1 }}月</span>
          <button class="btn btn-ghost btn-sm" @click="stockCalNext"><Icon name="chevronRight" :size="14" /></button>
          <button class="btn btn-ghost btn-sm" @click="stockCalToday">今天</button>
        </div>
        <div class="panel-card-body no-padding" v-safe-html="stockCalHtml"></div>
      </div>

      <div v-if="showAssessment" style="margin-top:var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title"><Icon name="search" :size="14" /> 库存自主评估报告</span>
            <button class="btn btn-ghost btn-sm" @click="showAssessment = false"><Icon name="close" :size="14" /> 关闭</button>
          </div>
          <div class="panel-card-body">
            <div class="assess-section">
              <div class="assess-section-title"><Icon name="chart" :size="14" /> 健康度评分</div>
              <div style="text-align:center;margin-bottom:var(--space-4)">
                <div :style="{ fontSize: '48px', fontWeight: 800, color: healthScore >= 80 ? 'var(--color-success)' : healthScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }">{{ healthScore }}<span style="font-size:20px;color:var(--color-text-tertiary)">/100</span></div>
                <div class="assess-bar" style="max-width:300px;margin:var(--space-3) auto"><div class="assess-bar-fill" :style="{ width: healthScore + '%', background: healthScore >= 80 ? 'var(--color-success)' : healthScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }"></div></div>
                <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">{{ healthScore >= 80 ? '库存状况良好' : healthScore >= 50 ? '库存需要关注' : '库存状况危急' }}</div>
              </div>
            </div>
            <div class="assess-grid">
              <div class="assess-section">
                <div class="assess-section-title"><Icon name="list" :size="14" /> 基础指标</div>
                <div class="assess-metric"><span class="assess-metric-label">物料种类</span><span class="assess-metric-value">{{ inventoryStore.enrichedInventory.length }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">总库存(kg)</span><span class="assess-metric-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">库存总值(元)</span><span class="assess-metric-value">{{ formatNumber(inventoryStore.totalStockValue) }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">安全库存总量(kg)</span><span class="assess-metric-value">{{ totalSafetyStock.toFixed(1) }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">库存满足率</span><span class="assess-metric-value" :style="{ color: fillRate >= 100 ? 'var(--color-success)' : 'var(--color-warning)' }">{{ fillRate }}%</span></div>
              </div>
              <div class="assess-section">
                <div class="assess-section-title"><Icon name="warning" :size="14" /> 预警分布</div>
                <div class="assess-metric"><span class="assess-metric-label">库存耗尽</span><span class="assess-metric-value" style="color:var(--color-danger)">{{ inventoryStore.exhaustedCount }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">低于安全库存</span><span class="assess-metric-value" style="color:var(--color-warning)">{{ inventoryStore.lowStockCount }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">超量库存</span><span class="assess-metric-value" style="color:var(--color-purple)">{{ inventoryStore.overStockCount }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">库存正常</span><span class="assess-metric-value" style="color:var(--color-success)">{{ inventoryStore.normalStockCount }}</span></div>
                <div class="assess-metric"><span class="assess-metric-label">预警率</span><span class="assess-metric-value" :style="{ color: alertRate > 30 ? 'var(--color-danger)' : 'var(--color-warning)' }">{{ alertRate }}%</span></div>
              </div>
            </div>
            <div class="assess-section">
              <div class="assess-section-title"><Icon name="info" :size="14" /> 改进建议</div>
              <div v-for="(rec, idx) in assessmentRecommendations" :key="idx" class="assess-recommendation"><Icon :name="rec.icon" :size="14" /> {{ rec.text }}</div>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePermission } from '@/utils/permissionGuard'

const emit = defineEmits(['edit-item', 'open-inbound-wizard'])

const inventoryStore = useInventoryStore()
const perm = usePermission()

const canDeleteInbound = computed(() => perm.isAllowed('inbound', 'inboundDelete'))
const canViewCost = computed(() => perm.isAllowed('inbound', 'inboundViewCost'))

/* 库存列表列配置 */
const stockColumnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'materialCode', label: '物料编码' },
  { key: 'materialName', label: '物料名称' },
  { key: 'grade', label: '牌号' },
  { key: 'color', label: '颜色' },
  { key: 'lastInboundDate', label: '最近入库日期' },
  { key: 'remainingStock', label: '剩余库存(kg)' },
  { key: 'safetyStock', label: '安全库存' },
  { key: 'unitPrice', label: '单价' },
  { key: 'totalValue', label: '总价值' },
  { key: 'alertStatus', label: '预警状态' },
  { key: 'actions', label: '操作', hideable: false }
]
const stockColumnVisible = ref(Object.fromEntries(stockColumnDefs.filter(c => c.hideable !== false).map(c => [c.key, true])))

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})

function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 8 + 'px', left: rect.left + 'px' }
  }
}

const stockSearch = ref('')
const stockCategoryFilter = ref('')
const stockAlertFilter = ref('')
const stockWarehouseFilter = ref('')
const stockPage = ref(1)
const stockPageSize = ref(15)
const stockSortField = ref('')
const stockSortDir = ref('asc')
const stockView = ref('table')
const stockViewMenuOpen = ref(false)
const stockSelectAll = ref(false)
const stockSelectedIds = ref([])
const showAssessment = ref(false)
const stockCalYear = ref(new Date().getFullYear())
const stockCalMonth = ref(new Date().getMonth())

const filteredInventory = computed(() => {
  let list = inventoryStore.enrichedInventory
  const search = stockSearch.value.toLowerCase()
  if (search) {
    list = list.filter(i => [i.code, i.name, i.grade, i.brand, i.color].join(' ').toLowerCase().includes(search))
  }
  if (stockCategoryFilter.value) {
    list = list.filter(i => i.category === stockCategoryFilter.value)
  }
  if (stockAlertFilter.value) {
    list = list.filter(i => i.alertStatus === stockAlertFilter.value)
  }
  if (stockWarehouseFilter.value) {
    list = list.filter(i => i.warehouse === stockWarehouseFilter.value)
  }
  if (stockSortField.value) {
    list = [...list].sort((a, b) => {
      const va = a[stockSortField.value]
      const vb = b[stockSortField.value]
      if (typeof va === 'string') {
        return stockSortDir.value === 'asc' ? va.localeCompare(vb || '') : (vb || '').localeCompare(va)
      }
      return stockSortDir.value === 'asc' ? va - vb : vb - va
    })
  }
  return list
})

const stockTotalPages = computed(() => Math.max(1, Math.ceil(filteredInventory.value.length / stockPageSize.value)))
const paginatedInventory = computed(() => {
  const start = (stockPage.value - 1) * stockPageSize.value
  return filteredInventory.value.slice(start, start + stockPageSize.value)
})

const stockSortIcon = computed(() => {
  if (!stockSortField.value) return 'filter'
  return stockSortDir.value === 'asc' ? 'chevronUp' : 'chevronDown'
})

const healthScore = computed(() => {
  const total = inventoryStore.enrichedInventory.length
  return total > 0 ? Math.round((inventoryStore.normalStockCount / total) * 100) : 100
})

const totalSafetyStock = computed(() => inventoryStore.enrichedInventory.reduce((s, i) => s + i.safetyStockVal, 0))

const fillRate = computed(() => {
  const ts = totalSafetyStock.value
  return ts > 0 ? Math.round((inventoryStore.totalStockWeight / ts) * 100) : 100
})

const alertRate = computed(() => {
  const total = inventoryStore.enrichedInventory.length
  return total > 0 ? Math.round(((inventoryStore.exhaustedCount + inventoryStore.lowStockCount) / total) * 100) : 0
})

const assessmentRecommendations = computed(() => {
  const recs = []
  if (inventoryStore.exhaustedCount > 0) recs.push({ icon: 'warning', text: '有 ' + inventoryStore.exhaustedCount + ' 种物料库存已耗尽，建议立即安排采购补货' })
  if (inventoryStore.lowStockCount > 0) recs.push({ icon: 'warning', text: '有 ' + inventoryStore.lowStockCount + ' 种物料低于安全库存，建议尽快补货至安全水位' })
  if (inventoryStore.overStockCount > 0) recs.push({ icon: 'circle', text: '有 ' + inventoryStore.overStockCount + ' 种物料超量库存，建议控制采购节奏，减少资金占用' })
  if (alertRate.value > 30) recs.push({ icon: 'warning', text: '预警率超过30%，建议重新评估安全库存阈值和采购策略' })
  if (fillRate.value < 80) recs.push({ icon: 'chevronDown', text: '库存满足率不足80%，建议增加安全库存或缩短采购周期' })
  if (recs.length === 0) recs.push({ icon: 'check', text: '库存状况良好，请继续保持当前管理水平' })
  return recs
})

const stockCalHtml = computed(() => {
  const year = stockCalYear.value
  const month = stockCalMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  const itemsByDate = {}
  for (const item of inventoryStore.enrichedInventory) {
    const d = item.lastInboundDate && item.lastInboundDate !== '无入库记录' ? item.lastInboundDate : ''
    if (d) {
      if (!itemsByDate[d]) itemsByDate[d] = []
      itemsByDate[d].push(item)
    }
  }
  let html = '<table class="cal-table"><thead><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr></thead><tbody>'
  let day = 1
  for (let i = 0; i < 6; i++) {
    if (day > daysInMonth) break
    html += '<tr>'
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) { html += '<td></td>'; continue }
      if (day > daysInMonth) { html += '<td></td>'; continue }
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      const isToday = dateStr === todayStr
      const dayItems = itemsByDate[dateStr] || []
      html += '<td' + (isToday ? ' style="background:var(--color-accent-subtle)"' : '') + '><div style="font-weight:' + (isToday ? '700' : '400') + '">' + day + '</div>'
      for (const di of dayItems.slice(0, 2)) {
        html += '<div style="font-size:10px;color:var(--color-text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + di.name + '</div>'
      }
      if (dayItems.length > 2) html += '<div style="font-size:10px;color:var(--color-accent)">+' + (dayItems.length - 2) + '</div>'
      html += '</td>'
      day++
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
})

function toggleStockSort(field) {
  if (stockSortField.value === field) {
    stockSortDir.value = stockSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    stockSortField.value = field
    stockSortDir.value = 'asc'
  }
}

function alertColor(status) {
  return inventoryStore.ALERT_STATUS_COLORS[status] || 'var(--color-text-secondary)'
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function toggleStockSelectAll() {
  stockSelectedIds.value = stockSelectAll.value ? paginatedInventory.value.map(i => i.id) : []
}

function handleBatchDeleteInventory() {
  if (stockSelectedIds.value.length === 0) { alert('请先勾选要删除的物料'); return }
  if (!confirm('确认删除选中的 ' + stockSelectedIds.value.length + ' 条物料？此操作不可撤销。')) return
  inventoryStore.batchDeleteInventory(stockSelectedIds.value)
  stockSelectedIds.value = []
  stockSelectAll.value = false
  inventoryStore.addAuditLog('delete', 'inventory', '批量删除物料')
}

function runInventoryAssessment() {
  showAssessment.value = true
}

function stockCalPrev() {
  stockCalMonth.value--
  if (stockCalMonth.value < 0) { stockCalMonth.value = 11; stockCalYear.value-- }
}

function stockCalNext() {
  stockCalMonth.value++
  if (stockCalMonth.value > 11) { stockCalMonth.value = 0; stockCalYear.value++ }
}

function stockCalToday() {
  stockCalYear.value = new Date().getFullYear()
  stockCalMonth.value = new Date().getMonth()
}

function handleExport() {
  const data = inventoryStore.enrichedInventory
  const filename = '库存数据'
  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, filename)
    XLSX.writeFile(wb, filename + '_' + new Date().toISOString().split('T')[0] + '.xlsx')
  } else {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }
}

function handleColumnConfigClick(e) {
  const wrapper = document.querySelector('.column-config-wrapper')
  if (showColumnConfig.value && wrapper && !wrapper.contains(e.target)) {
    showColumnConfig.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleColumnConfigClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleColumnConfigClick)
})
</script>

<style scoped>
/* 手风琴折叠面板 */
.inv-section {
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}
.inv-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.inv-section-header:hover {
  background: var(--color-surface-hover);
}
.inv-section-icon { font-size: 1.3em; line-height: 1; }
.inv-section-title { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text-primary); flex: 1; }
.inv-section-count { font-size: var(--font-size-sm); color: var(--color-text-secondary); background: var(--color-surface); padding: 2px var(--space-2); border-radius: var(--radius-sm); }
.inv-section-toggle { font-size: var(--font-size-sm); color: var(--color-text-secondary); width: 20px; text-align: center; }
.inv-section-body { padding: var(--space-3); }

.inv-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.inv-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.inv-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.inv-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.inv-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.inv-toolbar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.inv-search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.inv-filters {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-select {
  min-width: 120px;
}

.inv-toolbar-right {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}

.inv-table-wrap {
  overflow-x: auto;
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.inv-table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  font-size: var(--font-size-sm);
  letter-spacing: 0.02em;
}

.inv-table td {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  vertical-align: middle;
}

.inv-table tr:hover td {
  background: var(--color-surface-hover);
}

.inv-table-sm th,
.inv-table-sm td {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

.cell-xs {
  font-size: var(--font-size-xs);
}

.cell-actions {
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
}

.alert-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
}

.alert-exhausted {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.alert-low {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.alert-ok {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.alert-over {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  margin-top: var(--space-3);
}

.page-info {
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
}

.page-btns {
  display: flex;
  gap: var(--space-2);
}

.sort-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.inbound-list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.inbound-list-item:hover {
  background: var(--color-surface-hover);
}

.inbound-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.inbound-card-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
}

.inbound-card-item:hover {
  box-shadow: var(--shadow-md);
}

.assess-section {
  margin-bottom: var(--space-4);
}

.assess-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.assess-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.assess-metric {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-base);
}

.assess-metric-label {
  color: var(--color-text-tertiary);
}

.assess-metric-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.assess-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.assess-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.assess-recommendation {
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.cal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.cal-table th {
  padding: var(--space-2);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}

.cal-table td {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  vertical-align: top;
  min-height: 60px;
  height: 60px;
  font-size: var(--font-size-xs);
}

.view-toggle-dropdown {
  position: relative;
  display: inline-block;
}

.view-toggle-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 100;
  min-width: 120px;
  padding: var(--space-1) 0;
}

.view-toggle-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.view-toggle-menu button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.view-toggle-menu button.active {
  color: var(--color-accent);
  font-weight: 600;
}

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  margin-right: var(--space-2);
}

@media (max-width: 1200px) {
  .inv-stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .inv-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .assess-grid {
    grid-template-columns: 1fr;
  }
  .inv-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .inv-filters {
    flex-direction: column;
  }
  .inv-toolbar-right {
    margin-left: 0;
  }
}
</style>
