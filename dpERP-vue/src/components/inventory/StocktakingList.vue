<template>
  <div class="stocktaking-list">
    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-4)">
      <select v-model="statusFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部状态</option>
        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="warehouseFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部仓库</option>
        <option value="main">主仓库</option>
      </select>
      <select v-model="typeFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部类型</option>
        <option v-for="(label, key) in TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <input v-model="searchText" type="text" class="form-input" placeholder="搜索单号/备注..." style="width: 200px" />
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>单号</th>
            <th>盘点类型</th>
            <th>仓库</th>
            <th>状态</th>
            <th>计划日期</th>
            <th>盘点人</th>
            <th>物料数</th>
            <th>已盘</th>
            <th>差异数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedOrders.length === 0">
            <td colspan="11" class="empty-state">暂无盘点单</td>
          </tr>
          <tr v-for="order in pagedOrders" :key="order.id">
            <td class="cell-mono">{{ order.orderNo }}</td>
            <td>
              <span class="status-badge" :class="getTypeBadgeClass(order.type)">{{ TYPE_LABELS[order.type] }}</span>
            </td>
            <td>{{ order.warehouseName }}</td>
            <td>
              <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
            </td>
            <td>{{ order.plannedDate }}</td>
            <td>{{ order.executor || '-' }}</td>
            <td>{{ order.summary.totalItems }}</td>
            <td>{{ order.summary.countedItems }}</td>
            <td :style="{ color: order.summary.diffItems > 0 ? 'var(--color-warning)' : '' }">{{ order.summary.diffItems }}</td>
            <td>{{ formatDate(order.createDate) }}</td>
            <td>
              <div style="display: flex; gap: var(--space-1); flex-wrap: nowrap">
                <button v-if="order.status === 'planned'" class="action-btn" @click="$emit('start', order)" title="开始盘点">
                  <Icon name="play" :size="12" /> 开始
                </button>
                <button v-if="order.status === 'executing'" class="action-btn" @click="$emit('execute', order)" title="录入实盘">
                  <Icon name="edit" :size="12" /> 录入
                </button>
                <button v-if="order.status === 'executing'" class="action-btn" @click="$emit('complete', order)" title="完成盘点">
                  <Icon name="check" :size="12" /> 完成
                </button>
                <button v-if="order.status === 'diff_review'" class="action-btn" @click="$emit('diff', order)" title="差异处理">
                  <Icon name="eye" :size="12" /> 审批
                </button>
                <button v-if="order.status === 'completed'" class="action-btn" @click="$emit('adjust', order)" title="调整库存">
                  <Icon name="refreshCw" :size="12" /> 调整
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStocktakingStore } from '@/stores/stocktaking'

const emit = defineEmits(['start', 'execute', 'complete', 'diff', 'adjust'])

const store = useStocktakingStore()
const { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } = store

const statusFilter = ref('')
const warehouseFilter = ref('')
const typeFilter = ref('')
const searchText = ref('')
const currentPage = ref(1)
const pageSize = 15

const filteredOrders = computed(() => {
  let list = store.stocktakingOrders || []
  if (statusFilter.value) list = list.filter(o => o.status === statusFilter.value)
  if (warehouseFilter.value) list = list.filter(o => o.warehouseId === warehouseFilter.value)
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

function formatDate(iso) {
  if (!iso) return '-'
  return iso.split('T')[0]
}

function getTypeBadgeClass(type) {
  const map = { full: 'danger', partial: 'warning', cycle: 'info' }
  return map[type] || 'neutral'
}
</script>
