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

    <!-- 供应商列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">供应商列表</span>
        <span class="panel-card-count">共 {{ filteredSuppliers.length }} 条</span>
      </div>
      <div class="table-container">
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
          <Icon name="search" :size="32" />
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
            <div class="confirm-icon"><Icon name="warning" :size="32" /></div>
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
}
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
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .detail-grid {
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
</style>
