<template>
  <div class="transfer-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title"><Icon name="shuffle" :size="14" /> 调拨管理</h2>
        <p class="page-header-subtitle">管理仓库间物料调拨</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="showFormModal = true">
          <Icon name="plus" :size="14" /> 新增调拨单
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-4)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">调拨单总数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)"><Icon name="shuffle" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ transferStore.totalOrders }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">待审批</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)"><Icon name="clock" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ transferStore.pendingCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">在途</span>
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)"><Icon name="truck" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ transferStore.inTransitCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">本月调拨金额</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)"><Icon name="dollar" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ formatMoney(transferStore.monthlyAmount) }}</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-4)">
      <input v-model="searchText" type="text" class="form-input" placeholder="搜索单号/备注..." style="width: 200px" />
      <select v-model="statusFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部状态</option>
        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="typeFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部类型</option>
        <option v-for="(label, key) in TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <!-- 调拨单列表 -->
    <div class="panel-card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>单号</th>
              <th>调拨类型</th>
              <th>调出仓库</th>
              <th>调入仓库</th>
              <th>状态</th>
              <th>物料数</th>
              <th>总金额</th>
              <th>申请人</th>
              <th>计划到货</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedOrders.length === 0">
              <td colspan="10" class="empty-state">暂无调拨单</td>
            </tr>
            <tr v-for="order in pagedOrders" :key="order.id">
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>
                <span class="status-badge" :class="order.type === 'same_price' ? 'info' : 'warning'">
                  {{ TYPE_LABELS[order.type] }}
                </span>
              </td>
              <td>{{ order.fromWarehouseName }}</td>
              <td>{{ order.toWarehouseName }}</td>
              <td>
                <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
              </td>
              <td>{{ order.items.length }}</td>
              <td class="cell-mono">{{ formatMoney(order.totalAmount) }}</td>
              <td>{{ order.requester || '-' }}</td>
              <td>{{ order.expectedDate || '-' }}</td>
              <td>
                <div style="display: flex; gap: var(--space-1); flex-wrap: nowrap">
                  <button v-if="order.status === 'draft'" class="action-btn" @click="handleSubmit(order)">
                    <Icon name="send" :size="12" /> 提交
                  </button>
                  <button v-if="order.status === 'pending'" class="action-btn" @click="handleApprove(order)">
                    <Icon name="check" :size="12" /> 审批
                  </button>
                  <button v-if="order.status === 'pending'" class="action-btn danger" @click="handleReject(order)">
                    <Icon name="x" :size="12" /> 拒绝
                  </button>
                  <button v-if="order.status === 'approved'" class="action-btn" @click="handleShip(order)">
                    <Icon name="truck" :size="12" /> 发货
                  </button>
                  <button v-if="order.status === 'in_transit'" class="action-btn" @click="handleReceive(order)">
                    <Icon name="package" :size="12" /> 收货
                  </button>
                  <button v-if="['draft', 'pending'].includes(order.status)" class="action-btn danger" @click="handleCancel(order)">
                    <Icon name="x" :size="12" /> 取消
                  </button>
                  <button class="action-btn" @click="handlePreview(order)">
                    <Icon name="eye" :size="12" /> 预览
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3)">
      <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
        共 {{ filteredOrders.length }} 条，第 {{ currentPage }}/{{ totalPages }} 页
      </span>
      <div style="display: flex; gap: var(--space-1)">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <TransferFormModal
      v-if="showFormModal"
      @close="showFormModal = false"
      @created="handleCreated"
    />

    <!-- 预览弹窗 -->
    <TransferPreview
      v-if="previewOrder"
      :order="previewOrder"
      @close="previewOrder = null"
    />

    <!-- 确认弹窗 -->
    <div v-if="confirmVisible" class="modal-overlay" style="z-index: 10001">
      <div class="modal-dialog" style="max-width: 400px">
        <div class="modal-header">
          <span class="modal-title">{{ confirmTitle }}</span>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">{{ confirmMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="confirmVisible = false">取消</button>
          <button class="btn btn-primary" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTransferStore } from '@/stores/transfer'
import TransferFormModal from '@/components/inventory/TransferFormModal.vue'
import TransferPreview from '@/components/inventory/TransferPreview.vue'

const transferStore = useTransferStore()
const { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } = transferStore

const searchText = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const currentPage = ref(1)
const pageSize = 15

const showFormModal = ref(false)
const previewOrder = ref(null)

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmCallback = null

onMounted(() => {
  transferStore.initSeedData()
})

const filteredOrders = computed(() => {
  let list = transferStore.transferOrders || []
  if (statusFilter.value) list = list.filter(o => o.status === statusFilter.value)
  if (typeFilter.value) list = list.filter(o => o.type === typeFilter.value)
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(o =>
      (o.orderNo || '').toLowerCase().includes(kw) ||
      (o.notes || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))
const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrders.value.slice(start, start + pageSize)
})

function showConfirm(title, message, callback) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmCallback = callback
  confirmVisible.value = true
}

function confirmAction() {
  confirmVisible.value = false
  if (confirmCallback) confirmCallback()
}

function handleSubmit(order) {
  showConfirm('提交确认', '确认提交该调拨单进行审批？', () => {
    transferStore.submitTransferOrder(order.id)
  })
}

function handleApprove(order) {
  showConfirm('审批确认', '确认审批通过该调拨单？', () => {
    transferStore.approveTransferOrder(order.id, '仓库主管')
  })
}

function handleReject(order) {
  showConfirm('拒绝确认', '确认拒绝该调拨单？', () => {
    transferStore.rejectTransferOrder(order.id)
  })
}

function handleShip(order) {
  showConfirm('发货确认', '确认该调拨单已发货？', () => {
    transferStore.shipTransferOrder(order.id)
  })
}

function handleReceive(order) {
  showConfirm('收货确认', '确认收货？收货后将更新两个仓库的库存。', () => {
    transferStore.receiveTransferOrder(order.id)
  })
}

function handleCancel(order) {
  showConfirm('取消确认', '确认取消该调拨单？', () => {
    transferStore.cancelTransferOrder(order.id)
  })
}

function handlePreview(order) {
  previewOrder.value = order
}

function handleCreated() {
  showFormModal.value = false
}

function formatMoney(val) {
  if (!val && val !== 0) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.transfer-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}
</style>
