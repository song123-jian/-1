<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog" style="max-width: 900px">
      <div class="modal-header">
        <span class="modal-title">盘点执行 - {{ order.orderNo }}</span>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 汇总信息 -->
        <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap">
          <div class="stat-card" style="flex: 1; min-width: 120px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-label">总物料</div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl)">{{ order.summary.totalItems }}</div>
          </div>
          <div class="stat-card" style="flex: 1; min-width: 120px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-label">已盘</div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl); color: var(--color-success)">
              {{ order.summary.countedItems }}
            </div>
          </div>
          <div class="stat-card" style="flex: 1; min-width: 120px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-label">待盘</div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl); color: var(--color-warning)">
              {{ order.summary.totalItems - order.summary.countedItems }}
            </div>
          </div>
          <div class="stat-card" style="flex: 1; min-width: 120px; padding: var(--space-3) var(--space-4)">
            <div class="stat-card-label">差异数</div>
            <div class="stat-card-value" style="font-size: var(--font-size-xl); color: var(--color-danger)">
              {{ order.summary.diffItems }}
            </div>
          </div>
        </div>

        <!-- 进度条 -->
        <div style="margin-bottom: var(--space-4)">
          <div class="progress-bar">
            <div
              class="progress-bar-fill"
              :style="{
                width: progressPercent + '%',
                background: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-accent)'
              }"
            ></div>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)">
            盘点进度 {{ progressPercent }}%
          </div>
        </div>

        <!-- 物料列表 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>物料名称</th>
                <th>规格</th>
                <th>仓位</th>
                <th>系统数量</th>
                <th>实盘数量</th>
                <th>差异数量</th>
                <th>差异率</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in order.items" :key="item.id">
                <td class="cell-mono">{{ item.materialCode }}</td>
                <td>{{ item.materialName }}</td>
                <td>{{ item.spec }}</td>
                <td>{{ item.warehouseLocation }}</td>
                <td>{{ item.systemQty }}</td>
                <td>
                  <input
                    v-if="order.status === 'executing'"
                    type="number"
                    class="form-input"
                    style="width: 100px; text-align: right"
                    :value="item.actualQty"
                    min="0"
                    step="0.01"
                    placeholder="输入实盘"
                    @input="handleInput(item, $event)"
                  />
                  <span v-else>{{ item.actualQty !== null ? item.actualQty : '-' }}</span>
                </td>
                <td :class="getDiffClass(item.diffQty)">
                  {{ item.diffQty !== null ? (item.diffQty > 0 ? '+' : '') + item.diffQty : '-' }}
                </td>
                <td :class="getDiffClass(item.diffQty)">
                  {{ item.diffRate !== null ? item.diffRate + '%' : '-' }}
                </td>
                <td>
                  <span class="status-badge" :class="getItemStatusClass(item.status)">
                    {{ ITEM_STATUS_LABELS[item.status] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('close')">关闭</button>
        <button
          v-if="order.status === 'executing'"
          class="btn btn-primary"
          :disabled="!allCounted"
          @click="handleComplete"
        >
          <Icon name="check" :size="14" />
          完成盘点
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'StocktakingExecute' }
</script>
<script setup>
import { computed } from 'vue'
import { useStocktakingStore } from '@/modules/warehouse/stores/stocktaking'

const props = defineProps({
  order: { type: Object, required: true }
})

const emit = defineEmits(['close', 'completed'])

const store = useStocktakingStore()
const { ITEM_STATUS_LABELS } = store

const progressPercent = computed(() => {
  if (!props.order.items || props.order.items.length === 0) return 0
  return Math.round((props.order.summary.countedItems / props.order.summary.totalItems) * 100)
})

const allCounted = computed(() => {
  return props.order.items && props.order.items.every((i) => i.actualQty !== null && i.actualQty !== undefined)
})

function handleInput(item, event) {
  const val = event.target.value
  if (val === '' || val === null) return
  store.updateItemCount(props.order.id, item.id, parseFloat(val))
}

function handleComplete() {
  if (!allCounted.value) return
  const result = store.completeStocktaking(props.order.id)
  if (result) {
    emit('completed', props.order)
  }
}

function getDiffClass(diffQty) {
  if (diffQty === null || diffQty === 0) return ''
  return diffQty > 0 ? 'diff-profit' : 'diff-loss'
}

function getItemStatusClass(status) {
  const map = { pending: 'neutral', counted: 'success', diff: 'warning' }
  return map[status] || 'neutral'
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
