<template>
  <div class="supplier-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-header-title">供应商管理</h1>
          <p class="page-header-subtitle">管理供应商信息、评估与合作关系</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openAddModal">
            <Icon name="add" :size="14" /> 新增供应商
          </button>
        </div>
      </div>
      <div class="filter-bar" style="margin-top: var(--space-4);">
        <input v-model="searchText" type="text" class="form-input" placeholder="搜索供应商名称/编码/联系人..." style="min-width: 220px;" />
        <select v-model="filterCategory" class="form-select" style="min-width: 120px;">
          <option value="">全部类别</option>
          <option value="原材料">原材料</option>
          <option value="成品">成品</option>
          <option value="服务">服务</option>
          <option value="物流">物流</option>
        </select>
        <select v-model="filterStatus" class="form-select" style="min-width: 120px;">
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="pending">待审核</option>
          <option value="blacklist">黑名单</option>
        </select>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">供应商总数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent);">
            <Icon name="building" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ supplierStore.totalCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">活跃供应商</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success);">
            <Icon name="checkCircle" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ supplierStore.activeSuppliers.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">待审核</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning);">
            <Icon name="clock" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ supplierStore.pendingSuppliers.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">黑名单</span>
          <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger);">
            <Icon name="shield" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ supplierStore.blacklistSuppliers.length }}</div>
      </div>
    </div>

    <!-- 概览面板：活跃率 + 类别分布 + 平均评分 -->
    <div class="overview-row">
      <div class="overview-card overview-ring">
        <div class="overview-card-title">活跃率</div>
        <div class="overview-ring-body">
          <svg width="80" height="80" viewBox="0 0 80 80" class="overview-ring-svg">
            <circle cx="40" cy="40" r="30" fill="none" stroke="var(--color-border)" stroke-width="5" />
            <circle cx="40" cy="40" r="30" fill="none" :stroke="activeRateColor" stroke-width="5" stroke-linecap="round"
              :stroke-dasharray="activeRateDash" stroke-dashoffset="0" transform="rotate(-90 40 40)" class="overview-ring-progress" />
          </svg>
          <div class="overview-ring-text">
            <span class="overview-ring-percent" :style="{ color: activeRateColor }">{{ activeRate }}%</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-category">
        <div class="overview-card-title">类别分布</div>
        <div class="category-bars">
          <div v-for="cat in categoryStats" :key="cat.name" class="category-bar-item">
            <span class="category-bar-label">{{ cat.name }}</span>
            <div class="category-bar-track">
              <div class="category-bar-fill" :style="{ width: cat.percent + '%', background: cat.color }"></div>
            </div>
            <span class="category-bar-count">{{ cat.count }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-rating">
        <div class="overview-card-title">平均评分</div>
        <div class="overview-rating-body">
          <div class="overview-rating-score" :style="{ color: avgRatingColor }">{{ avgCompositeScore.toFixed(1) }}</div>
          <div class="overview-rating-stars">
            <Icon v-for="i in 5" :key="i" name="star" :size="16" :style="{ color: i <= Math.round(avgCompositeScore / 20) ? '#f59e0b' : 'var(--color-border)' }" />
          </div>
          <div class="overview-rating-dims">
            <div class="rating-dim"><span class="rating-dim-dot" style="background:#3b82f6"></span>交货 {{ avgDelivery.toFixed(0) }}</div>
            <div class="rating-dim"><span class="rating-dim-dot" style="background:#22c55e"></span>质量 {{ avgQuality.toFixed(0) }}</div>
            <div class="rating-dim"><span class="rating-dim-dot" style="background:#f59e0b"></span>价格 {{ avgPrice.toFixed(0) }}</div>
            <div class="rating-dim"><span class="rating-dim-dot" style="background:#a855f7"></span>服务 {{ avgService.toFixed(0) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 资质到期预警 -->
    <div v-if="expiringQualifications.length > 0" class="panel-card alert-panel">
      <div class="panel-card-header">
        <span class="panel-card-title" style="color:var(--color-warning)"><span class="alert-dot"></span> 资质到期预警</span>
      </div>
      <div class="panel-card-body">
        <div v-for="item in expiringQualifications" :key="item.id" class="alert-qual-item" :class="{ 'alert-qual-urgent': item.daysLeft <= 30 }">
          <span class="alert-qual-name">{{ item.name }}</span>
          <span class="alert-qual-qual">{{ item.qualification }}</span>
          <span class="alert-qual-expiry">到期日：{{ item.qualificationExpiry }}</span>
          <span class="alert-qual-badge" :class="item.daysLeft <= 30 ? 'badge-danger' : 'badge-warning'">剩余 {{ item.daysLeft }} 天</span>
        </div>
      </div>
    </div>

    <!-- 供应商列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">供应商列表</span>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span class="panel-card-count">共 {{ filteredSuppliers.length }} 条</span>
          <div class="view-toggle">
            <button class="btn btn-sm" :class="currentView === 'table' ? 'btn-outline active' : 'btn-ghost'" @click="currentView = 'table'"><Icon name="table" :size="14" /></button>
            <button class="btn btn-sm" :class="currentView === 'card' ? 'btn-outline active' : 'btn-ghost'" @click="currentView = 'card'"><Icon name="archive" :size="14" /></button>
          </div>
        </div>
      </div>
      <div class="table-container" v-if="currentView === 'table'">
        <table class="data-table" v-if="paginatedList.length > 0">
          <thead>
            <tr>
              <th>编码</th>
              <th>名称</th>
              <th>类别</th>
              <th>联系人</th>
              <th>电话</th>
              <th>评级</th>
              <th>状态</th>
              <th>创建日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedList" :key="item.id">
              <td class="cell-mono">{{ item.code }}</td>
              <td>{{ item.name }}</td>
              <td>
                <span class="tag-badge">{{ item.category }}</span>
              </td>
              <td>{{ item.contact || '-' }}</td>
              <td class="cell-mono">{{ item.phone || '-' }}</td>
              <td>
                <span class="rating-stars">
                  <Icon v-for="i in 5" :key="i" name="star" :size="12"
                    :style="{ color: i <= (item.rating || 0) ? '#f59e0b' : 'var(--color-border)' }" />
                </span>
              </td>
              <td>
                <span class="status-badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              </td>
              <td>{{ item.createDate }}</td>
              <td>
                <div class="action-cell">
                  <button class="action-btn" @click="openDetail(item)" title="查看详情"><Icon name="eye" :size="14" /></button>
                  <button class="action-btn" @click="openEditModal(item)" title="编辑"><Icon name="edit" :size="14" /></button>
                  <button class="action-btn" @click="handleToggleBlacklist(item)" :title="item.status === 'blacklist' ? '移出黑名单' : '加入黑名单'">
                    <Icon :name="item.status === 'blacklist' ? 'checkCircle' : 'shield'" :size="14" />
                  </button>
                  <button class="action-btn danger" @click="openDeleteConfirm(item)" title="删除"><Icon name="delete" :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="search" :size="24" /></div>
          <p>暂无匹配的供应商数据</p>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-if="currentView === 'card'" class="supplier-card-grid">
        <div v-for="(item, idx) in paginatedList" :key="item.id" class="supplier-card" :style="{ animationDelay: idx * 60 + 'ms' }" @click="openDetail(item)">
          <div class="supplier-card-top" :style="{ background: categoryColor(item.category) }"></div>
          <div class="supplier-card-body">
            <div class="supplier-card-header">
              <span class="supplier-card-name">{{ item.name }}</span>
              <span class="status-badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="supplier-card-code">{{ item.code }}</div>
            <div class="supplier-card-meta">
              <span><Icon name="tag" :size="12" /> {{ item.category }}</span>
              <span><Icon name="user" :size="12" /> {{ item.contact || '-' }}</span>
            </div>
            <div class="supplier-card-rating">
              <span class="rating-stars">
                <Icon v-for="i in 5" :key="i" name="star" :size="12" :style="{ color: i <= (item.rating || 0) ? '#f59e0b' : 'var(--color-border)' }" />
              </span>
              <span class="supplier-card-score">{{ compositeScore(item).toFixed(1) }}</span>
            </div>
            <div class="supplier-card-scores">
              <div class="mini-score"><span class="mini-score-dot" style="background:#3b82f6"></span>交货 {{ item.deliveryScore }}</div>
              <div class="mini-score"><span class="mini-score-dot" style="background:#22c55e"></span>质量 {{ item.qualityScore }}</div>
              <div class="mini-score"><span class="mini-score-dot" style="background:#f59e0b"></span>价格 {{ item.priceScore }}</div>
              <div class="mini-score"><span class="mini-score-dot" style="background:#a855f7"></span>服务 {{ item.serviceScore }}</div>
            </div>
          </div>
        </div>
        <div v-if="paginatedList.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="search" :size="24" /></div>
          <p>暂无匹配的供应商数据</p>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--"><Icon name="chevronLeft" :size="12" /> 上一页</button>
        <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">下一页 <Icon name="chevronRight" :size="12" /></button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <SupplierFormModal
      :visible="showFormModal"
      :supplier="editingSupplier"
      @save="handleFormSave"
      @cancel="showFormModal = false"
    />

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">供应商详情</h3>
            <button class="modal-close" @click="showDetailModal = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body" v-if="detailSupplier">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">编码</span>
                <span class="detail-value cell-mono">{{ detailSupplier.code }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">名称</span>
                <span class="detail-value">{{ detailSupplier.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">简称</span>
                <span class="detail-value">{{ detailSupplier.shortName || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">类别</span>
                <span class="detail-value"><span class="tag-badge">{{ detailSupplier.category }}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">联系人</span>
                <span class="detail-value">{{ detailSupplier.contact || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">电话</span>
                <span class="detail-value cell-mono">{{ detailSupplier.phone || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">邮箱</span>
                <span class="detail-value">{{ detailSupplier.email || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span class="detail-value"><span class="status-badge" :class="statusClass(detailSupplier.status)">{{ statusLabel(detailSupplier.status) }}</span></span>
              </div>
              <div class="detail-item detail-full">
                <span class="detail-label">地址</span>
                <span class="detail-value">{{ detailSupplier.address || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">开户银行</span>
                <span class="detail-value">{{ detailSupplier.bankName || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">银行账号</span>
                <span class="detail-value cell-mono">{{ detailSupplier.bankAccount || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">资质认证</span>
                <span class="detail-value">{{ detailSupplier.qualification || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">资质到期日</span>
                <span class="detail-value">{{ detailSupplier.qualificationExpiry || '-' }}</span>
              </div>
              <div class="detail-item detail-full">
                <span class="detail-label">备注</span>
                <span class="detail-value">{{ detailSupplier.notes || '-' }}</span>
              </div>
            </div>

            <!-- 评估雷达图 -->
            <SupplierEvaluation :supplier="detailSupplier" @update="handleEvalUpdate" />

            <!-- 采购历史 -->
            <div class="detail-section">
              <h4 class="detail-section-title">采购历史</h4>
              <div v-if="purchaseHistory.length > 0" class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>采购单号</th>
                      <th>标题</th>
                      <th>金额</th>
                      <th>状态</th>
                      <th>日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="po in purchaseHistory" :key="po.id">
                      <td class="cell-mono">{{ po.orderNo }}</td>
                      <td>{{ po.title }}</td>
                      <td class="cell-mono">{{ formatAmount(po.totalAmount) }}</td>
                      <td><span class="status-badge" :class="poStatusClass(po.status)">{{ poStatusLabel(po.status) }}</span></td>
                      <td>{{ po.createDate }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-state">暂无采购记录</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDetailModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-dialog" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="modal-title">确认删除</h3>
            <button class="modal-close" @click="showDeleteConfirm = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon"><div class="confirm-icon-circle"><Icon name="warning" :size="24" /></div></div>
            <p class="confirm-text">确定要删除供应商 <strong>{{ deletingSupplier?.name }}</strong> 吗？</p>
            <p v-if="deleteWarning" class="confirm-warning">{{ deleteWarning }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" @click="handleDelete" :disabled="!!deleteWarning">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import { usePurchaseStore, STATUS_LABELS as PO_STATUS_LABELS, STATUS_COLORS as PO_STATUS_COLORS } from '@/stores/purchase'
import SupplierFormModal from '@/components/suppliers/SupplierFormModal.vue'
import SupplierEvaluation from '@/components/suppliers/SupplierEvaluation.vue'

const supplierStore = useSupplierStore()
const purchaseStore = usePurchaseStore()

onMounted(() => {
  supplierStore.initSeedData()
  purchaseStore.initSeedData()
})

/* 筛选 */
const searchText = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const currentView = ref('table')

/* 活跃率 */
const activeRate = computed(() => {
  const total = supplierStore.totalCount
  if (total === 0) return 0
  return Math.round((supplierStore.activeSuppliers.length / total) * 100)
})
const RING_CIRC = 2 * Math.PI * 30
const activeRateColor = computed(() => {
  const r = activeRate.value
  if (r >= 70) return 'var(--color-success)'
  if (r >= 40) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const activeRateDash = computed(() => {
  const p = activeRate.value / 100
  return `${p * RING_CIRC} ${RING_CIRC}`
})

/* 类别分布 */
const CATEGORY_COLORS = { '原材料': '#3b82f6', '成品': '#22c55e', '服务': '#a855f7', '物流': '#f59e0b' }
const categoryStats = computed(() => {
  const map = {}
  supplierStore.suppliers.forEach(s => { map[s.category] = (map[s.category] || 0) + 1 })
  const total = supplierStore.totalCount || 1
  return Object.entries(map).map(([name, count]) => ({
    name, count,
    percent: Math.round((count / total) * 100),
    color: CATEGORY_COLORS[name] || '#64748b'
  }))
})

/* 平均评分 */
const avgDelivery = computed(() => { const list = supplierStore.suppliers; return list.length ? list.reduce((s, x) => s + (x.deliveryScore || 0), 0) / list.length : 0 })
const avgQuality = computed(() => { const list = supplierStore.suppliers; return list.length ? list.reduce((s, x) => s + (x.qualityScore || 0), 0) / list.length : 0 })
const avgPrice = computed(() => { const list = supplierStore.suppliers; return list.length ? list.reduce((s, x) => s + (x.priceScore || 0), 0) / list.length : 0 })
const avgService = computed(() => { const list = supplierStore.suppliers; return list.length ? list.reduce((s, x) => s + (x.serviceScore || 0), 0) / list.length : 0 })
const avgCompositeScore = computed(() => avgDelivery.value * 0.3 + avgQuality.value * 0.35 + avgPrice.value * 0.2 + avgService.value * 0.15)
const avgRatingColor = computed(() => {
  const s = avgCompositeScore.value
  if (s >= 90) return 'var(--color-success)'
  if (s >= 70) return 'var(--color-accent)'
  if (s >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

/* 资质到期预警 */
const expiringQualifications = computed(() => {
  const today = new Date()
  const threshold = 180
  return supplierStore.suppliers
    .filter(s => s.qualificationExpiry && s.status !== 'blacklist')
    .map(s => {
      const expiry = new Date(s.qualificationExpiry)
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      return { ...s, daysLeft }
    })
    .filter(s => s.daysLeft >= 0 && s.daysLeft <= threshold)
    .sort((a, b) => a.daysLeft - b.daysLeft)
})

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#64748b'
}

function compositeScore(item) {
  return (item.deliveryScore || 0) * 0.3 + (item.qualityScore || 0) * 0.35 + (item.priceScore || 0) * 0.2 + (item.serviceScore || 0) * 0.15
}

const filteredSuppliers = computed(() => {
  let list = [...supplierStore.suppliers]
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(kw) ||
      (s.code || '').toLowerCase().includes(kw) ||
      (s.contact || '').toLowerCase().includes(kw)
    )
  }
  if (filterCategory.value) {
    list = list.filter(s => s.category === filterCategory.value)
  }
  if (filterStatus.value) {
    list = list.filter(s => s.status === filterStatus.value)
  }
  return list
})

/* 分页 */
const pageSize = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredSuppliers.value.length / pageSize)))
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredSuppliers.value.slice(start, start + pageSize)
})

/* 状态映射 */
function statusLabel(status) {
  const map = { active: '活跃', blacklist: '黑名单', pending: '待审核' }
  return map[status] || status
}
function statusClass(status) {
  const map = { active: 'success', blacklist: 'danger', pending: 'warning' }
  return map[status] || 'neutral'
}
function poStatusLabel(status) {
  return PO_STATUS_LABELS[status] || status
}
function poStatusClass(status) {
  return PO_STATUS_COLORS[status] || 'neutral'
}

/* 表单弹窗 */
const showFormModal = ref(false)
const editingSupplier = ref(null)

function openAddModal() {
  editingSupplier.value = null
  showFormModal.value = true
}
function openEditModal(item) {
  editingSupplier.value = { ...item }
  showFormModal.value = true
}
function handleFormSave() {
  showFormModal.value = false
  editingSupplier.value = null
}

/* 详情弹窗 */
const showDetailModal = ref(false)
const detailSupplier = ref(null)
const purchaseHistory = ref([])

function openDetail(item) {
  detailSupplier.value = { ...item }
  purchaseHistory.value = purchaseStore.getPurchaseOrdersBySupplier(item.id)
  showDetailModal.value = true
}

function handleEvalUpdate(scores) {
  if (detailSupplier.value) {
    supplierStore.updateSupplier(detailSupplier.value.id, scores)
    detailSupplier.value = { ...detailSupplier.value, ...scores }
  }
}

/* 删除确认 */
const showDeleteConfirm = ref(false)
const deletingSupplier = ref(null)
const deleteWarning = ref('')

function openDeleteConfirm(item) {
  deletingSupplier.value = item
  /* 检查是否有关联采购单 */
  const related = purchaseStore.getPurchaseOrdersBySupplier(item.id)
  const activeOrders = related.filter(o => !['completed', 'cancelled', 'returned'].includes(o.status))
  if (activeOrders.length > 0) {
    deleteWarning.value = `该供应商有 ${activeOrders.length} 条进行中的采购单，无法删除`
  } else {
    deleteWarning.value = ''
  }
  showDeleteConfirm.value = true
}

function handleDelete() {
  if (deletingSupplier.value) {
    supplierStore.deleteSupplier(deletingSupplier.value.id)
  }
  showDeleteConfirm.value = false
  deletingSupplier.value = null
}

/* 黑名单切换 */
function handleToggleBlacklist(item) {
  supplierStore.toggleBlacklist(item.id)
}

/* 金额格式化 */
function formatAmount(val) {
  const n = parseFloat(val) || 0
  return n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}
</script>

<style scoped>
.supplier-management-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:nth-child(1) { animation-delay: 0ms; }
.stat-card:nth-child(2) { animation-delay: 60ms; }
.stat-card:nth-child(3) { animation-delay: 120ms; }
.stat-card:nth-child(4) { animation-delay: 180ms; }
@keyframes statCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.stat-card-value { font-family: var(--font-mono); }

/* 概览面板 */
.overview-row { display: grid; grid-template-columns: 200px 1fr 240px; gap: var(--space-4); margin-bottom: var(--space-5); }
.overview-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); animation: statCardIn 0.4s ease-out both; }
.overview-card:nth-child(1) { animation-delay: 100ms; }
.overview-card:nth-child(2) { animation-delay: 160ms; }
.overview-card:nth-child(3) { animation-delay: 220ms; }
.overview-card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--space-3); }
.overview-ring-body { display: flex; align-items: center; justify-content: center; gap: var(--space-3); }
@keyframes ringDraw { from { stroke-dashoffset: 188.5; } }
.overview-ring-progress { animation: ringDraw 1s ease-out; transition: stroke-dasharray 0.6s ease; }
.overview-ring-text { display: flex; flex-direction: column; }
.overview-ring-percent { font-size: var(--font-size-2xl); font-weight: 700; font-family: var(--font-mono); line-height: 1; }
.category-bars { display: flex; flex-direction: column; gap: var(--space-3); }
.category-bar-item { display: flex; align-items: center; gap: var(--space-2); }
.category-bar-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); min-width: 48px; }
.category-bar-track { flex: 1; height: 8px; background: var(--color-bg-tertiary); border-radius: var(--radius-full); overflow: hidden; }
.category-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.6s ease; position: relative; }
.category-bar-fill::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent); animation: barShimmer 2s ease-in-out infinite; }
@keyframes barShimmer { 0% { left: -100%; } 100% { left: 100%; } }
.category-bar-count { font-size: var(--font-size-sm); font-weight: 600; font-family: var(--font-mono); color: var(--color-text-primary); min-width: 20px; text-align: right; }
.overview-rating-body { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.overview-rating-score { font-size: var(--font-size-3xl); font-weight: 700; font-family: var(--font-mono); line-height: 1; }
.overview-rating-stars { display: flex; gap: 2px; }
.overview-rating-dims { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1) var(--space-3); margin-top: var(--space-1); }
.rating-dim { font-size: var(--font-size-xs); color: var(--color-text-secondary); display: flex; align-items: center; gap: 4px; }
.rating-dim-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* 资质预警 */
.alert-panel { margin-bottom: var(--space-4); border-left: 3px solid var(--color-warning); }
.alert-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); animation: alertDotPulse 1.5s ease-in-out infinite; margin-right: 4px; }
@keyframes alertDotPulse { 0%, 100% { box-shadow: 0 0 4px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 10px rgba(245,158,11,0.7); } }
.alert-qual-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); animation: listSlideIn 0.3s ease-out both; transition: background 0.15s; }
.alert-qual-item:hover { background: var(--color-surface-hover); }
.alert-qual-item:last-child { border-bottom: none; }
.alert-qual-name { font-weight: 600; color: var(--color-text-primary); min-width: 140px; }
.alert-qual-qual { color: var(--color-text-secondary); font-size: var(--font-size-sm); flex: 1; }
.alert-qual-expiry { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.alert-qual-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
.badge-danger { background: var(--color-danger-subtle); color: var(--color-danger); }
.badge-warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.alert-qual-urgent { background: var(--color-danger-subtle); }

/* 视图切换 */
.view-toggle { display: flex; gap: 2px; background: var(--color-bg-tertiary); border-radius: var(--radius-md); padding: 2px; }
.view-toggle .btn.active { background: var(--color-accent-subtle); color: var(--color-accent); border-color: var(--color-accent); }

/* 供应商卡片视图 */
.supplier-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); padding: var(--space-4); }
.supplier-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all 0.25s ease; animation: cardFadeIn 0.4s ease-out both; }
@keyframes cardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.supplier-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--color-accent); }
.supplier-card-top { height: 4px; }
.supplier-card-body { padding: var(--space-4); }
.supplier-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-1); }
.supplier-card-name { font-weight: 600; color: var(--color-text-primary); font-size: var(--font-size-base); }
.supplier-card-code { font-family: var(--font-mono); font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-2); }
.supplier-card-meta { display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2); }
.supplier-card-meta span { display: flex; align-items: center; gap: 4px; }
.supplier-card-rating { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.supplier-card-score { font-family: var(--font-mono); font-weight: 700; font-size: var(--font-size-sm); color: var(--color-accent); }
.supplier-card-scores { display: grid; grid-template-columns: 1fr 1fr; gap: 2px var(--space-2); }
.mini-score { font-size: var(--font-size-xs); color: var(--color-text-secondary); display: flex; align-items: center; gap: 4px; }
.mini-score-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.action-cell {
  display: flex;
  gap: var(--space-1);
}
.rating-stars {
  display: inline-flex;
  gap: 1px;
}
@keyframes rowSlideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.data-table tbody tr { animation: rowSlideIn 0.3s ease-out both; }
.data-table tbody tr:nth-child(1) { animation-delay: 0ms; }
.data-table tbody tr:nth-child(2) { animation-delay: 20ms; }
.data-table tbody tr:nth-child(3) { animation-delay: 40ms; }
.data-table tbody tr:nth-child(4) { animation-delay: 60ms; }
.data-table tbody tr:nth-child(5) { animation-delay: 80ms; }
.data-table tbody tr:nth-child(n+6) { animation-delay: 100ms; }
.modal-lg {
  max-width: 780px;
}
/* 详情 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  animation: detailFadeIn 0.3s ease-out both;
}
@keyframes detailFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.detail-full {
  grid-column: 1 / -1;
}
.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-section {
  margin-top: var(--space-5);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}
.detail-section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}
/* 删除确认 */
.confirm-icon {
  text-align: center;
  color: var(--color-warning);
  margin-bottom: var(--space-3);
}
.confirm-icon-circle { width: 64px; height: 64px; border-radius: 50%; background: var(--color-warning-subtle); display: inline-flex; align-items: center; justify-content: center; }
.confirm-text {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.confirm-warning {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  background: var(--color-danger-subtle);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
.panel-card-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.empty-state { text-align: center; padding: var(--space-8) var(--space-4); color: var(--color-text-tertiary); }
.empty-state-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2); color: var(--color-text-tertiary); }
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .page-header-row {
    flex-direction: column;
    gap: var(--space-3);
  }
}
.table-container {
  overflow-x: auto;
}
</style>
