<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3><Icon name="table" :size="14" /> 报价对比</h3>
          <button class="modal-close" @click="$emit('close')"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div v-if="selectedIds.length < 2" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">
            <div style="font-size:36px;margin-bottom:12px"><Icon name="table" :size="14" /></div>
            请至少勾选2条报价进行对比<br><span style="font-size:12px">最多同时对比3条报价</span>
          </div>
          <div v-else-if="selectedIds.length > 3" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">
            最多同时对比3条报价，当前已选{{ selectedIds.length }}条
          </div>
          <div v-else style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:120px">对比项</th>
                  <th v-for="q in comparisonQuotes" :key="q.id">{{ q.quoteNo }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparisonRows" :key="row.label">
                  <td style="font-weight:600;color:var(--color-accent);overflow-wrap:break-word;word-wrap:break-word">{{ row.label }}</td>
                  <td v-for="q in comparisonQuotes" :key="q.id" v-safe-html="row.fn(q)"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  showModal: Boolean,
  selectedIds: { type: Array, default: () => [] }
})

defineEmits(['close'])

const quotationStore = useQuotationStore()

const statusLabels = {
  draft: '草稿', pending: '待审批', approved: '已审批',
  sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期'
}

const comparisonQuotes = computed(() => {
  return props.selectedIds.map(id => quotationStore.getQuotationById(id)).filter(Boolean)
})

const comparisonRows = [
  { label: '客户', fn: q => q.customerName || '-' },
  { label: '日期', fn: q => q.date || '-' },
  { label: '到期日', fn: q => q.expiryDate || '-' },
  { label: '不含税金额', fn: q => '¥' + formatNumber(q.subtotal || 0) },
  { label: '含税合计', fn: q => {
    const val = '¥' + formatNumber(q.total || 0)
    const maxTotal = Math.max(...comparisonQuotes.value.map(c => c.total || 0))
    const minTotal = Math.min(...comparisonQuotes.value.map(c => c.total || 0))
    if (q.total === maxTotal && maxTotal !== minTotal) return '<span style="color:var(--color-danger)">' + val + ' <Icon name="chevronUp" :size="14" /></span>'
    if (q.total === minTotal && maxTotal !== minTotal) return '<span style="color:var(--color-success)">' + val + ' <Icon name="chevronDown" :size="14" /></span>'
    return val
  }},
  { label: '利润率', fn: q => (q.profitMargin || 0) + '%' },
  { label: '税率', fn: q => (q.taxRate || 13) + '%' },
  { label: '状态', fn: q => '<span class="status-badge status-' + q.status + '">' + (statusLabels[q.status] || q.status) + '</span>' },
  { label: '联系人', fn: q => q.custContact || '-' },
  { label: '付款方式', fn: q => q.termPayment || '-' }
]
</script>

<style scoped>
.modal-overlay { align-items: flex-start; padding: var(--space-5); overflow-y: auto; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-lg { max-width: 900px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-surface); z-index: 1; }
.modal-header h3 { margin: 0; font-size: var(--font-size-xl); }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); }
.data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.data-table th { padding: var(--space-2) var(--space-3); text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: var(--font-size-sm); white-space: nowrap; }
.data-table td {padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); overflow-wrap: break-word; word-wrap: break-word}
.data-table tbody tr:hover { background: var(--color-bg-secondary); }
.status-badge { display: inline-block; padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
.status-draft { background: #f1f5f9; color: #64748b; }
.status-pending { background: #fef3c7; color: #d97706; }
.status-approved { background: #dbeafe; color: #2563eb; }
.status-sent { background: #cffafe; color: #0891b2; }
.status-accepted { background: #dcfce7; color: #16a34a; }
.status-rejected { background: #fee2e2; color: #dc2626; }
.status-expired { background: #f1f5f9; color: #94a3b8; }
.btn { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-secondary:hover { background: var(--color-bg-tertiary); }
</style>
