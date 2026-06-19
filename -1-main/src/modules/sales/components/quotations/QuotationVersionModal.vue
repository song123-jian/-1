<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            <Icon name="file" :size="14" />
            版本历史 - {{ quote?.quoteNo }}
          </h3>
          <button class="modal-close" @click="emit('close')"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div
            v-if="versionList.length === 0"
            style="text-align: center; padding: 40px; color: var(--color-text-tertiary)"
          >
            暂无版本历史
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>版本</th>
                <th>修改人</th>
                <th>修改时间</th>
                <th>金额</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in [...versionList].reverse()" :key="v.version">
                <td>v{{ v.version }}</td>
                <td>{{ v.changedBy }}</td>
                <td>{{ (v.changedAt || '').substring(0, 16).replace('T', ' ') }}</td>
                <td class="mono">¥{{ formatNumber(v.data?.total || 0) }}</td>
                <td>{{ v.changeNote || '-' }}</td>
                <td><button class="action-btn" @click="handleRollback(v.version)">回滚</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'QuotationVersionModal' }
</script>
<script setup>
import { ref, watch } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  showModal: Boolean,
  quote: Object
})

defineEmits(['close'])

const quotationStore = useQuotationStore()
const versionList = ref([])

watch(
  () => props.showModal,
  (val) => {
    if (val && props.quote) {
      versionList.value = quotationStore.getVersions(props.quote.id)
    }
  }
)

function handleRollback(version) {
  if (confirm('确认回滚到 v' + version + '？当前数据将被覆盖。')) {
    quotationStore.rollbackVersion(props.quote.id, version)
    versionList.value = quotationStore.getVersions(props.quote.id)
  }
}
</script>

<style scoped>
.modal-overlay {
  align-items: flex-start;
  padding: var(--space-5);
  overflow-y: auto;
}
.modal-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: var(--z-base);
}
.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
}
.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary);
}
.modal-close:hover {
  background: var(--color-bg-tertiary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.data-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.data-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.data-table tbody tr:hover {
  background: var(--color-bg-secondary);
}
.mono {
  font-family: var(--font-mono);
}
.action-btn {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.action-btn:hover {
  background: var(--color-bg-tertiary);
}
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
</style>
