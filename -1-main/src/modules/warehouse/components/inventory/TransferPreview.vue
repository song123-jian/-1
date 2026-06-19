<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog" style="max-width: 800px">
      <div class="modal-header">
        <span class="modal-title">调拨单预览</span>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 打印风格预览 -->
        <div ref="printContent" class="print-preview-content">
          <div class="print-header">
            <h2 style="text-align: center; font-size: var(--font-size-xl); margin-bottom: var(--space-2)">调拨单</h2>
            <div
              style="
                text-align: center;
                font-size: var(--font-size-xs);
                color: var(--color-text-tertiary);
                margin-bottom: var(--space-4);
              "
            >
              单号: {{ order.orderNo }}
            </div>
          </div>

          <div class="print-info-grid">
            <div class="print-info-item">
              <span class="print-info-label">调拨类型:</span>
              <span>{{ TYPE_LABELS[order.type] }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">调出仓库:</span>
              <span>{{ order.fromWarehouseName }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">调入仓库:</span>
              <span>{{ order.toWarehouseName }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">状态:</span>
              <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">申请人:</span>
              <span>{{ order.requester || '-' }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">审批人:</span>
              <span>{{ order.approver || '-' }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">计划到货:</span>
              <span>{{ order.expectedDate || '-' }}</span>
            </div>
            <div class="print-info-item">
              <span class="print-info-label">实际到货:</span>
              <span>{{ order.actualDate || '-' }}</span>
            </div>
          </div>

          <table class="data-table" style="margin-top: var(--space-4)">
            <thead>
              <tr>
                <th>序号</th>
                <th>编号</th>
                <th>物料名称</th>
                <th>规格</th>
                <th>单位</th>
                <th>数量</th>
                <th>单价</th>
                <th>金额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in order.items" :key="item.id">
                <td>{{ idx + 1 }}</td>
                <td class="cell-mono">{{ item.materialCode }}</td>
                <td>{{ item.materialName }}</td>
                <td>{{ item.spec }}</td>
                <td>{{ item.unit }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.unitPrice }}</td>
                <td class="cell-mono">{{ formatMoney(item.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td :colspan="7" style="text-align: right; font-weight: 600">合计</td>
                <td class="cell-mono" style="font-weight: 600; color: var(--color-accent)">
                  {{ formatMoney(order.totalAmount) }}
                </td>
              </tr>
            </tfoot>
          </table>

          <div v-if="order.notes" style="margin-top: var(--space-4); font-size: var(--font-size-sm)">
            <span style="color: var(--color-text-tertiary)">备注:</span>
            {{ order.notes }}
          </div>

          <div class="print-signatures" style="margin-top: var(--space-8)">
            <div class="print-sign-item">
              <span>制单人:________</span>
            </div>
            <div class="print-sign-item">
              <span>审批人:________</span>
            </div>
            <div class="print-sign-item">
              <span>收货人:________</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('close')">关闭</button>
        <button class="btn btn-primary" @click="handlePrint">
          <Icon name="printer" :size="14" />
          打印
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'TransferPreview' }
</script>
<script setup>
import { ref } from 'vue'
import { useTransferStore } from '@/modules/warehouse/stores/transfer'
import { formatMoney, escapeHtml } from '@/utils/format'

const props = defineProps({
  order: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const transferStore = useTransferStore()
const { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } = transferStore

const printContent = ref(null)

function handlePrint() {
  const content = printContent.value
  if (!content) return
  const printWindow = window.open('', '_blank')
  printWindow.document.write(
    `<html><head><title>调拨单 - ${escapeHtml(props.order.orderNo)}</title><style>body{font-family:-apple-system,"Microsoft YaHei",sans-serif;padding:var(--space-5);color:#333}table{width:100%;border-collapse:collapse}th{border:1px solid #ccc;padding:var(--space-2) var(--space-2);text-align:left;font-size:13px;overflow-wrap:break-word;word-wrap:break-word}td{border:1px solid #ccc;padding:var(--space-2) var(--space-2);text-align:left;font-size:13px;overflow-wrap:break-word;word-wrap:break-word}th{background:#f5f5f5;font-weight:600}.print-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);font-size:13px}.print-info-label{color:#888;margin-right:var(--space-2)}.print-signatures{display:flex;justify-content:space-around;margin-top:var(--space-10);font-size:13px}</style></head><body>${content.innerHTML}</body></html>`
  )
  printWindow.document.close()
  printWindow.print()
}
</script>

<style scoped>
.print-preview-content {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
}
.print-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.print-info-label {
  color: var(--color-text-tertiary);
  margin-right: var(--space-2);
}
.print-signatures {
  display: flex;
  justify-content: space-around;
  font-size: var(--font-size-sm);
}
</style>
