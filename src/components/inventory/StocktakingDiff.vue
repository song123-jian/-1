<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 900px">
      <div class="modal-header">
        <span class="modal-title">差异处理 - {{ order.orderNo }}</span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 差异汇总 -->
        <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap">
          <div class="stat-card" style="flex: 1; min-width: 140px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="trendUp" :size="14" />
            </div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl); color: var(--color-success)">{{ profitCount }}</div>
            <div class="stat-card-label">盘盈笔数</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-success); margin-top: var(--space-1)">
              金额: {{ formatMoney(order.summary.profitAmount) }}
            </div>
          </div>
          <div class="stat-card" style="flex: 1; min-width: 140px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
              <Icon name="trendDown" :size="14" />
            </div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl); color: var(--color-danger)">{{ lossCount }}</div>
            <div class="stat-card-label">盘亏笔数</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-danger); margin-top: var(--space-1)">
              金额: {{ formatMoney(order.summary.lossAmount) }}
            </div>
          </div>
          <div class="stat-card" style="flex: 1; min-width: 140px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="checkCircle" :size="14" />
            </div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl)">{{ matchCount }}</div>
            <div class="stat-card-label">账实相符</div>
          </div>
        </div>

        <!-- 差异明细 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>物料编码</th>
                <th>物料名称</th>
                <th>规格</th>
                <th>系统数量</th>
                <th>实盘数量</th>
                <th>差异数量</th>
                <th>差异率</th>
                <th>差异类型</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in order.items" :key="item.id">
                <td class="cell-mono">{{ item.materialCode }}</td>
                <td>{{ item.materialName }}</td>
                <td>{{ item.spec }}</td>
                <td>{{ item.systemQty }}</td>
                <td>{{ item.actualQty }}</td>
                <td :class="getDiffClass(item.diffQty)">
                  {{ item.diffQty !== null ? (item.diffQty > 0 ? '+' : '') + item.diffQty : '-' }}
                </td>
                <td :class="getDiffClass(item.diffQty)">
                  {{ item.diffRate !== null ? item.diffRate + '%' : '-' }}
                </td>
                <td>
                  <span v-if="item.diffQty > 0" class="status-badge success">盘盈</span>
                  <span v-else-if="item.diffQty < 0" class="status-badge danger">盘亏</span>
                  <span v-else class="status-badge neutral">相符</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">关闭</button>
        <template v-if="order.status === 'diff_review'">
          <button class="btn btn-danger" @click="handleReject">
            <Icon name="x" :size="14" /> 驳回
          </button>
          <button class="btn btn-primary" @click="handleApprove">
            <Icon name="check" :size="14" /> 审批通过
          </button>
        </template>
        <button v-if="order.status === 'completed'" class="btn btn-primary" @click="handleAdjust">
          <Icon name="refreshCw" :size="14" /> 调整库存
        </button>
      </div>

      <!-- 确认弹窗 -->
      <div v-if="confirmVisible" class="modal-overlay" style="z-index: var(--z-toast); background: rgba(0,0,0,0.4)">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStocktakingStore } from '@/stores/stocktaking'

const props = defineProps({
  order: { type: Object, required: true }
})

const emit = defineEmits(['close', 'reviewed', 'adjusted'])

const store = useStocktakingStore()

const profitCount = computed(() => (props.order.items || []).filter(i => i.diffQty > 0).length)
const lossCount = computed(() => (props.order.items || []).filter(i => i.diffQty < 0).length)
const matchCount = computed(() => (props.order.items || []).filter(i => !i.diffQty || i.diffQty === 0).length)

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmCallback = null

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

function handleApprove() {
  showConfirm('审批确认', '确认审批通过该盘点差异？审批后将标记为已完成，可进行库存调整。', () => {
    store.reviewDiff(props.order.id, true)
    emit('reviewed', props.order)
  })
}

function handleReject() {
  showConfirm('驳回确认', '确认驳回该盘点差异？驳回后盘点单将标记为已取消。', () => {
    store.reviewDiff(props.order.id, false)
    emit('reviewed', props.order)
  })
}

function handleAdjust() {
  showConfirm('库存调整确认', '确认根据盘点差异调整库存？盘盈物料将入库，盘亏物料将出库。', () => {
    const result = store.adjustInventory(props.order.id)
    if (result.success) {
      emit('adjusted', result)
    }
  })
}

function getDiffClass(diffQty) {
  if (diffQty === null || diffQty === 0) return ''
  return diffQty > 0 ? 'diff-profit' : 'diff-loss'
}

function formatMoney(val) {
  if (!val && val !== 0) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.diff-profit {
  color: var(--color-success);
  font-weight: 600;
}
.diff-loss {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
