<template>
  <div class="finance-summary">
    <div class="summary-row">
      <div class="summary-card summary-receivable">
        <div class="summary-card-header">
          <Icon name="trendUp" :size="16" />
          <span>应收总额</span>
        </div>
        <div class="summary-card-value cell-mono" style="color:var(--color-success)">¥{{ formatMoney(receivableStore.totalAmount) }}</div>
      </div>
      <div class="summary-vs">
        <span class="vs-label">VS</span>
      </div>
      <div class="summary-card summary-payable">
        <div class="summary-card-header">
          <Icon name="arrowDown" :size="16" />
          <span>应付总额</span>
        </div>
        <div class="summary-card-value cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(payableStore.totalAmount) }}</div>
      </div>
    </div>

    <div class="summary-net">
      <div class="summary-net-label">净额 (应收 - 应付)</div>
      <div class="summary-net-value cell-mono" :style="{ color: netAmount >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }">
        {{ netAmount >= 0 ? '+' : '' }}¥{{ formatMoney(Math.abs(netAmount)) }}
      </div>
    </div>

    <div class="summary-monthly">
      <div class="summary-monthly-item">
        <div class="summary-monthly-label">本月收款</div>
        <div class="summary-monthly-value cell-mono" style="color:var(--color-success)">¥{{ formatMoney(receivableStore.thisMonthReceipts) }}</div>
      </div>
      <div class="summary-monthly-divider"></div>
      <div class="summary-monthly-item">
        <div class="summary-monthly-label">本月付款</div>
        <div class="summary-monthly-value cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(payableStore.thisMonthPayments) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useReceivableStore } from '@/stores/receivable'
import { usePayableStore } from '@/stores/payable'

const receivableStore = useReceivableStore()
const payableStore = usePayableStore()

const netAmount = computed(() => receivableStore.totalAmount - payableStore.totalAmount)

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.finance-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.summary-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.summary-card {
  flex: 1;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}
.summary-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.summary-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
}
.summary-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.vs-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 700;
  background: var(--color-bg-primary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.summary-net {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
}
.summary-net-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.summary-net-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
}
.summary-monthly {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.summary-monthly-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.summary-monthly-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.summary-monthly-value {
  font-size: var(--font-size-md);
  font-weight: 600;
}
.summary-monthly-divider {
  width: 1px;
  height: 32px;
  background: var(--color-border);
}
@media (max-width: 640px) {
  .summary-row { flex-direction: column; }
  .summary-vs { display: none; }
}
</style>
