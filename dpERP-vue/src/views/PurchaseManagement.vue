<template>
  <div class="purchase-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-header-title">采购管理</h1>
          <p class="page-header-subtitle">管理采购订单、审批与入库流程</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openAddModal">
            <Icon name="add" :size="14" /> 新增采购单
          </button>
        </div>
      </div>
      <div class="filter-bar" style="margin-top: var(--space-4);">
        <input v-model="searchText" type="text" class="form-input" placeholder="搜索单号/标题/供应商..." style="min-width: 200px;" />
        <select v-model="filterType" class="form-select" style="min-width: 100px;">
          <option value="">全部类型</option>
          <option value="purchase">采购</option>
          <option value="return">退货</option>
        </select>
        <select v-model="filterStatus" class="form-select" style="min-width: 120px;">
          <option value="">全部状态</option>
          <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="filterSupplier" class="form-select" style="min-width: 140px;">
          <option value="">全部供应商</option>
          <option v-for="s in supplierStore.activeSuppliers" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</option>
        </select>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">采购单总数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent);">
            <Icon name="clipboard" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ purchaseStore.totalCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">待审批</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning);">
            <Icon name="clock" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ purchaseStore.pendingCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">进行中</span>
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info);">
            <Icon name="refresh" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ purchaseStore.inProgressCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">本月采购金额</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success);">
            <Icon name="dollar" :size="16" />
          </div>
        </div>
        <div class="stat-card-value">{{ formatAmount(purchaseStore.thisMonthAmount) }}</div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">采购列表</button>
      <button class="tab-btn" :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'">采购明细</button>
      <button class="tab-btn" :class="{ active: activeTab === 'return' }" @click="activeTab = 'return'">采购退货</button>
    </div>

    <!-- 采购列表 -->
    <div v-show="activeTab === 'list'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购单列表</span>
        <span class="panel-card-count">共 {{ filteredOrders.length }} 条</span>
      </div>
      <div class="table-container">
        <table class="data-table" v-if="paginatedOrders.length > 0">
          <thead>
            <tr>
              <th>采购单号</th>
              <th>标题</th>
              <th>供应商</th>
              <th>类型</th>
              <th>金额</th>
              <th>状态</th>
              <th>预计到货</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in paginatedOrders" :key="order.id">
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>{{ order.title || '-' }}</td>
              <td>{{ order.supplierName || '-' }}</td>
              <td>
                <span class="tag-badge" :style="{ background: order.type === 'return' ? 'var(--color-danger-subtle)' : 'var(--color-accent-subtle)', color: order.type === 'return' ? 'var(--color-danger)' : 'var(--color-accent)' }">
                  {{ order.type === 'return' ? '退货' : '采购' }}
                </span>
              </td>
              <td class="cell-mono">{{ formatAmount(order.totalAmount) }}</td>
              <td><span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span></td>
              <td>{{ order.expectedDate || '-' }}</td>
              <td>
                <div class="action-cell">
                  <button class="action-btn" @click="openPreview(order)" title="预览"><Icon name="eye" :size="14" /></button>
                  <button v-if="order.status === 'draft'" class="action-btn" @click="openEditModal(order)" title="编辑"><Icon name="edit" :size="14" /></button>
                  <button v-if="order.status === 'draft'" class="action-btn" @click="handleSubmit(order.id)" title="提交审批"><Icon name="send" :size="14" /></button>
                  <button v-if="order.status === 'pending'" class="action-btn" @click="openApproveModal(order)" title="审批"><Icon name="checkCircle" :size="14" /></button>
                  <button v-if="order.status === 'approved'" class="action-btn" @click="handleOrder(order.id)" title="下单"><Icon name="truck" :size="14" /></button>
                  <button v-if="order.status === 'ordered'" class="action-btn" @click="handleReceive(order.id)" title="收货"><Icon name="download" :size="14" /></button>
                  <button v-if="order.status === 'receiving'" class="action-btn" @click="handleInspect(order.id)" title="质检"><Icon name="shield" :size="14" /></button>
                  <button v-if="order.status === 'inspecting'" class="action-btn" @click="handleComplete(order.id)" title="完成入库"><Icon name="check" :size="14" /></button>
                  <button v-if="['ordered', 'receiving', 'inspecting', 'completed'].includes(order.status) && order.type !== 'return'" class="action-btn" @click="handleReturn(order)" title="退货"><Icon name="refresh" :size="14" /></button>
                  <button v-if="['draft', 'pending', 'approved'].includes(order.status)" class="action-btn danger" @click="handleCancel(order.id)" title="取消"><Icon name="close" :size="14" /></button>
                  <button v-if="order.status === 'draft'" class="action-btn danger" @click="handleDelete(order)" title="删除"><Icon name="delete" :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <Icon name="search" :size="32" />
          <p>暂无匹配的采购单数据</p>
        </div>
      </div>
      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--"><Icon name="chevronLeft" :size="12" /> 上一页</button>
        <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">下一页 <Icon name="chevronRight" :size="12" /></button>
      </div>
    </div>

    <!-- 采购明细 -->
    <div v-show="activeTab === 'detail'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购明细</span>
      </div>
      <div class="table-container">
        <table class="data-table" v-if="allItemDetails.length > 0">
          <thead>
            <tr>
              <th>采购单号</th>
              <th>物料编码</th>
              <th>物料名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>仓库</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(detail, idx) in paginatedDetails" :key="idx">
              <td class="cell-mono">{{ detail.orderNo }}</td>
              <td>{{ detail.materialCode }}</td>
              <td>{{ detail.materialName }}</td>
              <td>{{ detail.spec || '-' }}</td>
              <td>{{ detail.unit }}</td>
              <td class="cell-mono">{{ detail.quantity }}</td>
              <td class="cell-mono">{{ formatAmount(detail.unitPrice) }}</td>
              <td class="cell-mono">{{ formatAmount(detail.amount) }}</td>
              <td>{{ detail.warehouseName || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">暂无采购明细数据</div>
      </div>
    </div>

    <!-- 采购退货 -->
    <div v-show="activeTab === 'return'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购退货</span>
        <span class="panel-card-count">共 {{ purchaseStore.returnOrders.length }} 条</span>
      </div>
      <div class="table-container">
        <table class="data-table" v-if="purchaseStore.returnOrders.length > 0">
          <thead>
            <tr>
              <th>退货单号</th>
              <th>标题</th>
              <th>供应商</th>
              <th>金额</th>
              <th>状态</th>
              <th>日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in purchaseStore.returnOrders" :key="order.id">
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>{{ order.title || '-' }}</td>
              <td>{{ order.supplierName || '-' }}</td>
              <td class="cell-mono">{{ formatAmount(order.totalAmount) }}</td>
              <td><span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span></td>
              <td>{{ order.createDate }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">暂无退货记录</div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <PurchaseFormModal
      :visible="showFormModal"
      :order="editingOrder"
      @save="handleFormSave"
      @cancel="showFormModal = false"
    />

    <!-- 预览弹窗 -->
    <PurchasePreview
      :visible="showPreviewModal"
      :order="previewOrder"
      @close="showPreviewModal = false"
    />

    <!-- 审批弹窗 -->
    <Teleport to="body">
      <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
        <div class="modal-dialog" style="max-width: 460px;">
          <div class="modal-header">
            <h3 class="modal-title">采购单审批</h3>
            <button class="modal-close" @click="showApproveModal = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="approve-info">
              <p><strong>单号:</strong> {{ approvingOrder?.orderNo }}</p>
              <p><strong>供应商:</strong> {{ approvingOrder?.supplierName }}</p>
              <p><strong>金额:</strong> {{ formatAmount(approvingOrder?.totalAmount) }}</p>
            </div>
            <div class="form-group">
              <label class="form-label">拒绝原因（拒绝时填写）</label>
              <textarea v-model="rejectReason" class="form-input" rows="3" placeholder="请输入拒绝原因..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showApproveModal = false">取消</button>
            <button class="btn btn-danger" @click="handleReject">拒绝</button>
            <button class="btn btn-primary" @click="handleApprove">通过</button>
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
            <p class="confirm-text">确定要删除采购单 <strong>{{ deletingOrder?.orderNo }}</strong> 吗？</p>
            <p class="confirm-hint">仅草稿状态的采购单可以删除</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 取消确认弹窗 -->
    <Teleport to="body">
      <div v-if="showCancelConfirm" class="modal-overlay" @click.self="showCancelConfirm = false">
        <div class="modal-dialog" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="modal-title">确认取消</h3>
            <button class="modal-close" @click="showCancelConfirm = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon"><Icon name="warning" :size="32" /></div>
            <p class="confirm-text">确定要取消采购单 <strong>{{ cancellingOrderNo }}</strong> 吗？</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showCancelConfirm = false">返回</button>
            <button class="btn btn-danger" @click="confirmCancel">确认取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePurchaseStore, STATUS_LABELS, STATUS_COLORS } from '@/stores/purchase'
import { useSupplierStore } from '@/stores/supplier'
import PurchaseFormModal from '@/components/purchase/PurchaseFormModal.vue'
import PurchasePreview from '@/components/purchase/PurchasePreview.vue'

const purchaseStore = usePurchaseStore()
const supplierStore = useSupplierStore()

onMounted(() => {
  purchaseStore.initSeedData()
  supplierStore.initSeedData()
})

/* 筛选 */
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const filterSupplier = ref('')
const activeTab = ref('list')

const filteredOrders = computed(() => {
  let list = purchaseStore.purchaseOrders.filter(o => o.type !== 'return')
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(o =>
      (o.orderNo || '').toLowerCase().includes(kw) ||
      (o.title || '').toLowerCase().includes(kw) ||
      (o.supplierName || '').toLowerCase().includes(kw)
    )
  }
  if (filterType.value) {
    list = list.filter(o => o.type === filterType.value)
  }
  if (filterStatus.value) {
    list = list.filter(o => o.status === filterStatus.value)
  }
  if (filterSupplier.value) {
    list = list.filter(o => o.supplierId === filterSupplier.value)
  }
  return list
})

/* 采购明细 */
const allItemDetails = computed(() => {
  const details = []
  for (const order of purchaseStore.purchaseOrders) {
    if (order.type === 'return') continue
    for (const item of (order.items || [])) {
      details.push({
        orderNo: order.orderNo,
        ...item
      })
    }
  }
  return details
})

/* 分页 */
const pageSize = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrders.value.slice(start, start + pageSize)
})
const paginatedDetails = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return allItemDetails.value.slice(start, start + pageSize)
})

/* 表单弹窗 */
const showFormModal = ref(false)
const editingOrder = ref(null)

function openAddModal() {
  editingOrder.value = null
  showFormModal.value = true
}
function openEditModal(order) {
  editingOrder.value = { ...order }
  showFormModal.value = true
}
function handleFormSave() {
  showFormModal.value = false
  editingOrder.value = null
}

/* 预览弹窗 */
const showPreviewModal = ref(false)
const previewOrder = ref(null)

function openPreview(order) {
  previewOrder.value = { ...order }
  showPreviewModal.value = true
}

/* 审批弹窗 */
const showApproveModal = ref(false)
const approvingOrder = ref(null)
const rejectReason = ref('')

function openApproveModal(order) {
  approvingOrder.value = { ...order }
  rejectReason.value = ''
  showApproveModal.value = true
}
function handleApprove() {
  if (approvingOrder.value) {
    purchaseStore.approvePurchaseOrder(approvingOrder.value.id, '')
    showApproveModal.value = false
  }
}
function handleReject() {
  if (approvingOrder.value) {
    purchaseStore.rejectPurchaseOrder(approvingOrder.value.id, rejectReason.value)
    showApproveModal.value = false
  }
}

/* 状态操作 */
function handleSubmit(id) {
  purchaseStore.submitPurchaseOrder(id)
}
function handleOrder(id) {
  purchaseStore.orderPurchaseOrder(id)
}
function handleReceive(id) {
  purchaseStore.receivePurchaseOrder(id)
}
function handleInspect(id) {
  purchaseStore.inspectPurchaseOrder(id)
}
function handleComplete(id) {
  purchaseStore.completePurchaseOrder(id)
}
function handleReturn(order) {
  const result = purchaseStore.returnPurchaseOrder(order.id)
  if (result) {
    /* 退货成功 */
  }
}

/* 取消确认 */
const showCancelConfirm = ref(false)
const cancellingOrderId = ref('')
const cancellingOrderNo = ref('')

function handleCancel(id) {
  cancellingOrderId.value = id
  const order = purchaseStore.purchaseOrders.find(o => o.id === id)
  cancellingOrderNo.value = order?.orderNo || ''
  showCancelConfirm.value = true
}
function confirmCancel() {
  purchaseStore.cancelPurchaseOrder(cancellingOrderId.value)
  showCancelConfirm.value = false
}

/* 删除确认 */
const showDeleteConfirm = ref(false)
const deletingOrder = ref(null)

function handleDelete(order) {
  deletingOrder.value = order
  showDeleteConfirm.value = true
}
function confirmDelete() {
  if (deletingOrder.value) {
    const result = purchaseStore.deletePurchaseOrder(deletingOrder.value.id)
    if (!result) {
      /* 删除失败，非草稿状态 */
    }
  }
  showDeleteConfirm.value = false
  deletingOrder.value = null
}

/* 金额格式化 */
function formatAmount(val) {
  const n = parseFloat(val) || 0
  return n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}
</script>

<style scoped>
.purchase-management-page {
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
.tab-bar {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 2px;
  width: fit-content;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  background: var(--color-accent);
  color: #fff;
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
  gap: 2px;
  flex-wrap: wrap;
}
.panel-card-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
/* 审批弹窗 */
.approve-info {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
}
.approve-info p {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
/* 确认弹窗 */
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
.confirm-hint {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
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
  .tab-bar {
    width: 100%;
  }
  .tab-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
