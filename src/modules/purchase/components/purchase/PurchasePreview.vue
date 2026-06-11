<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-dialog modal-xl preview-modal">
        <div class="modal-header">
          <h3 class="modal-title">采购单预览</h3>
          <div class="modal-header-actions">
            <button class="btn btn-sm btn-ghost" @click="handlePrint"><Icon name="print" :size="14" /> 打印</button>
            <button class="modal-close" @click="$emit('close')"><Icon name="close" :size="16" /></button>
          </div>
        </div>
        <div class="modal-body" ref="printRef">
          <div class="print-page" v-if="order">
            <!-- 打印头部 -->
            <div class="print-header">
              <div class="print-company">冠久ERP - 采购单</div>
              <div class="print-order-no">单号: {{ order.orderNo }}</div>
            </div>

            <!-- 基本信息 -->
            <div class="print-section">
              <div class="print-info-grid">
                <div class="print-info-item">
                  <span class="print-info-label">供应商:</span>
                  <span class="print-info-value">{{ order.supplierName || '-' }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">类型:</span>
                  <span class="print-info-value">{{ order.type === 'return' ? '退货' : '采购' }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">状态:</span>
                  <span class="print-info-value">{{ statusLabel(order.status) }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">创建日期:</span>
                  <span class="print-info-value">{{ order.createDate }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">预计到货日:</span>
                  <span class="print-info-value">{{ order.expectedDate || '-' }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">实际到货日:</span>
                  <span class="print-info-value">{{ order.actualDate || '-' }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">申请人:</span>
                  <span class="print-info-value">{{ order.requester || '-' }}</span>
                </div>
                <div class="print-info-item">
                  <span class="print-info-label">审批人:</span>
                  <span class="print-info-value">{{ order.approver || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- 标题 -->
            <div class="print-title" v-if="order.title">{{ order.title }}</div>

            <!-- 明细表 -->
            <div class="print-section">
              <table class="print-table">
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
                    <th>仓库</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in (order.items || [])" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td>{{ item.materialCode }}</td>
                    <td>{{ item.materialName }}</td>
                    <td>{{ item.spec || '-' }}</td>
                    <td>{{ item.unit }}</td>
                    <td class="cell-mono">{{ item.quantity }}</td>
                    <td class="cell-mono">{{ formatNum(item.unitPrice) }}</td>
                    <td class="cell-mono">{{ formatNum(item.amount) }}</td>
                    <td>{{ item.warehouseName || '-' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="7" style="text-align: right; font-weight: 600;">合计</td>
                    <td class="cell-mono" style="font-weight: 700;">{{ formatNum(order.totalAmount) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- 备注 -->
            <div class="print-section" v-if="order.notes">
              <div class="print-info-label">备注:</div>
              <div class="print-notes">{{ order.notes }}</div>
            </div>

            <!-- 签章区域 -->
            <div class="print-signatures">
              <div class="print-sign-block">
                <span class="print-sign-label">制单人:</span>
                <span class="print-sign-line"></span>
              </div>
              <div class="print-sign-block">
                <span class="print-sign-label">审批人:</span>
                <span class="print-sign-line"></span>
              </div>
              <div class="print-sign-block">
                <span class="print-sign-label">收货人:</span>
                <span class="print-sign-line"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="$emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { STATUS_LABELS } from '@/modules/purchase/stores/purchase'

defineProps({
  order: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
defineEmits(['close'])

const printRef = ref(null)

function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

function formatNum(val) {
  const n = parseFloat(val) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function handlePrint() {
  if (printRef.value) {
    const printContent = printRef.value.innerHTML
    const printWindow = window.open('', '_blank')printWindow.document.write(`<html><head><title>采购单打印</title><style>            body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; color: #1a1a1a; padding: var(--space-5); }
            .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: var(--space-2); margin-bottom: var(--space-5); }
            .print-company { font-size: 20px; font-weight: 700; }
            .print-order-no { font-size: 14px; color: #666; }
            .print-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: var(--space-2); }
            .print-info-item { font-size: 13px; }
            .print-info-label { color: #888; }
            .print-info-value { font-weight: 500; }
            .print-title { font-size: 16px; font-weight: 600; margin: var(--space-4) 0; text-align: center; }
            .print-table { width: 100%; border-collapse: collapse; margin: var(--space-4) 0; }
            .print-table th{border: 1px solid #ccc; padding: var(--space-2) var(--space-2); font-size: 12px; text-align: left; overflow-wrap: break-word; word-wrap: break-word}
.print-table td {border: 1px solid #ccc; padding: var(--space-2) var(--space-2); font-size: 12px; text-align: left; overflow-wrap: break-word; word-wrap: break-word}
            .print-table th { background: #f5f5f5; font-weight: 600; }
            .print-table tfoot td {border-top: 2px solid #333; overflow-wrap: break-word; word-wrap: break-word}
            .print-section { margin-bottom: var(--space-4); }
            .print-notes { font-size: 13px; color: #555; margin-top: var(--space-1); white-space: pre-wrap; }
            .print-signatures { display: flex; justify-content: space-between; margin-top: var(--space-10); padding-top: var(--space-5); }
            .print-sign-block { display: flex; align-items: center; gap: var(--space-2); }
            .print-sign-label { font-size: 13px; color: #666; }
            .print-sign-line { display: inline-block; width: 100px; border-bottom: 1px solid #333; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}
</script>

<style scoped>
.modal-xl {
  max-width: 900px;
}
.modal-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.preview-modal .modal-body {
  background: var(--color-bg-primary);
}
.print-page {
  background: #fff;
  color: #1a1a1a;
  padding: var(--space-8);
  border-radius: var(--radius-md);
  max-width: 800px;
  margin: 0 auto;
}
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #333;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-5);
}
.print-company {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: #1a1a1a;
}
.print-order-no {
  font-size: var(--font-size-sm);
  color: #666;
}
.print-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: var(--space-2);
}
.print-info-item {
  font-size: var(--font-size-sm);
}
.print-info-label {
  color: #888;
  margin-right: var(--space-1);
}
.print-info-value {
  font-weight: 500;
  color: #1a1a1a;
}
.print-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: var(--space-4) 0;
  text-align: center;
  color: #1a1a1a;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-4) 0;
}
.print-table th{border: 1px solid #ddd;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  text-align: left;
  color: #1a1a1a; overflow-wrap: break-word; word-wrap: break-word}
.print-table td {border: 1px solid #ddd;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  text-align: left;
  color: #1a1a1a; overflow-wrap: break-word; word-wrap: break-word}
.print-table th {
  background: #f5f5f5;
  font-weight: 600;
}
.print-table tfoot td {border-top: 2px solid #333; overflow-wrap: break-word; word-wrap: break-word}
.print-section {
  margin-bottom: var(--space-4);
}
.print-notes {
  font-size: var(--font-size-sm);
  color: #555;
  margin-top: var(--space-1);
  white-space: pre-wrap;
}
.print-signatures {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-8);
  padding-top: var(--space-5);
}
.print-sign-block {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.print-sign-label {
  font-size: var(--font-size-sm);
  color: #666;
}
.print-sign-line {
  display: inline-block;
  width: 100px;
  border-bottom: 1px solid #333;
}
</style>
