<template>
  <div class="stocktaking-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title"><Icon name="clipboardCheck" :size="14" /> 盘点管理</h2>
        <p class="page-header-subtitle">管理库存盘点、差异审核与库存调整</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="showFormModal = true">
          <Icon name="plus" :size="14" /> 新增盘点单
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-4)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">盘点单总数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)"><Icon name="clipboardCheck" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ store.totalOrders }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">盘点中</span>
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)"><Icon name="edit" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ store.executingCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">待审核</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)"><Icon name="clock" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ store.diffReviewCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">已完成</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)"><Icon name="checkCircle" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ store.completedCount }}</div>
      </div>
    </div>

    <!-- 盘点单列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">盘点单列表</span>
      </div>
      <div class="panel-card-body no-padding">
        <StocktakingList
          @start="handleStart"
          @execute="handleExecute"
          @complete="handleComplete"
          @diff="handleDiff"
          @adjust="handleAdjust"
        />
      </div>
    </div>

    <!-- 新增盘点单弹窗 -->
    <StocktakingFormModal
      v-if="showFormModal"
      @close="showFormModal = false"
      @created="handleCreated"
    />

    <!-- 盘点执行弹窗 -->
    <StocktakingExecute
      v-if="executingOrder"
      :order="executingOrder"
      @close="executingOrder = null"
      @completed="handleExecCompleted"
    />

    <!-- 差异处理弹窗 -->
    <StocktakingDiff
      v-if="diffOrder"
      :order="diffOrder"
      @close="diffOrder = null"
      @reviewed="handleReviewed"
      @adjusted="handleAdjusted"
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

    <!-- Toast提示 -->
    <div v-if="toastMessage" class="toast-container">
      <div class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStocktakingStore } from '@/stores/stocktaking'
import StocktakingList from '@/components/inventory/StocktakingList.vue'
import StocktakingFormModal from '@/components/inventory/StocktakingFormModal.vue'
import StocktakingExecute from '@/components/inventory/StocktakingExecute.vue'
import StocktakingDiff from '@/components/inventory/StocktakingDiff.vue'

const store = useStocktakingStore()

const showFormModal = ref(false)
const executingOrder = ref(null)
const diffOrder = ref(null)

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmCallback = null

const toastMessage = ref('')
const toastType = ref('toast-success')

onMounted(() => {
  store.initSeedData()
})

function showToast(msg, type = 'toast-success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

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

function handleStart(order) {
  showConfirm('开始盘点', '确认开始盘点？开始后将进入盘点执行阶段。', () => {
    store.startStocktaking(order.id)
    showToast('盘点已开始')
  })
}

function handleExecute(order) {
  executingOrder.value = order
}

function handleComplete(order) {
  showConfirm('完成盘点', '确认完成盘点？请确保所有物料已录入实盘数量。', () => {
    const result = store.completeStocktaking(order.id)
    if (result) {
      showToast('盘点已完成，进入差异审核')
    } else {
      showToast('请先录入所有物料的实盘数量', 'toast-warning')
    }
  })
}

function handleDiff(order) {
  diffOrder.value = order
}

function handleAdjust(order) {
  diffOrder.value = order
}

function handleCreated() {
  showFormModal.value = false
  showToast('盘点单已创建')
}

function handleExecCompleted() {
  executingOrder.value = null
  showToast('盘点已完成，进入差异审核')
}

function handleReviewed() {
  diffOrder.value = null
  showToast('差异审批完成')
}

function handleAdjusted(result) {
  diffOrder.value = null
  showToast(`库存调整完成，调整了 ${result.adjustedCount} 项物料`)
}
</script>

<style scoped>
.stocktaking-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}
</style>
