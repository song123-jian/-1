<template>
  <div class="payable-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">应付管理</h2>
        <p class="page-header-subtitle">应付账款跟踪，付款记录管理，账龄分析</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openPaymentForm()">
          <Icon name="add" :size="14" /> 新增付款单
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-accent);font-size:var(--font-size-xl)">¥{{ formatMoney(payableStore.totalAmount) }}</div>
        <div class="stat-card-label">应付总额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">¥{{ formatMoney(payableStore.totalPaid) }}</div>
        <div class="stat-card-label">已付金额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">¥{{ formatMoney(payableStore.totalRemaining) }}</div>
        <div class="stat-card-label">未付金额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(payableStore.totalOverdue) }}</div>
        <div class="stat-card-label">逾期金额</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        <Icon :name="tab.icon" :size="14" /> {{ tab.label }}
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        type="text"
        class="form-input"
        v-model="filters.search"
        placeholder="搜索单号/供应商..."
        style="min-width:160px"
      >
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="pending">待付款</option>
        <option value="partial">部分付款</option>
        <option value="completed">已付完</option>
        <option value="overdue">已逾期</option>
      </select>
      <DataSelect module="supplier" variant="active" v-model="filters.supplierId" value-field="id" label-field="name" placeholder="选择供应商" @change="onSupplierChange" />
      <button class="btn btn-ghost btn-sm" @click="resetFilters">
        <Icon name="refresh" :size="14" /> 重置
      </button>
    </div>

    <!-- Tab: 应付列表 -->
    <div v-show="currentTab === 'payables'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>应付编号</th>
                <th>供应商</th>
                <th>来源</th>
                <th>来源单号</th>
                <th>应付金额</th>
                <th>已付金额</th>
                <th>未付金额</th>
                <th>到期日</th>
                <th>状态</th>
                <th style="min-width:100px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedPayables.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无应付记录
                </td>
              </tr>
              <tr
                v-for="py in paginatedPayables"
                :key="py.id"
                :style="getRowStyle(py)"
              >
                <td class="cell-mono" style="color:var(--color-accent)">{{ py.payableNo }}</td>
                <td>{{ py.supplierName }}</td>
                <td>{{ payableStore.sourceTypeLabels[py.sourceType] || py.sourceType }}</td>
                <td class="cell-mono">{{ py.sourceNo || '-' }}</td>
                <td class="cell-mono">¥{{ formatMoney(py.amount) }}</td>
                <td class="cell-mono" style="color:var(--color-success)">¥{{ formatMoney(py.paidAmount) }}</td>
                <td class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(py.remainingAmount) }}</td>
                <td>{{ py.dueDate || '-' }}</td>
                <td>
                  <span class="status-badge" :class="payableStore.statusBadgeMap[py.status] || 'neutral'">
                    {{ payableStore.statusLabels[py.status] || py.status }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button
                    v-if="py.status !== 'completed'"
                    class="btn btn-ghost btn-sm"
                    style="color:var(--color-success)"
                    @click="openPaymentForm(py)"
                    title="付款"
                  ><Icon name="dollar" :size="14" /></button>
                  <span v-else style="color:var(--color-text-tertiary);font-size:var(--font-size-xs)">已结清</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalPayablePages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="payablePage <= 1" @click="payablePage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ payablePage }} / {{ totalPayablePages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="payablePage >= totalPayablePages" @click="payablePage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 付款记录 -->
    <div v-show="currentTab === 'payments'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>付款单号</th>
                <th>供应商</th>
                <th>付款金额</th>
                <th>付款方式</th>
                <th>银行</th>
                <th>参考号</th>
                <th>付款日期</th>
                <th>操作人</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedPayments.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无付款记录
                </td>
              </tr>
              <tr v-for="pm in paginatedPayments" :key="pm.id">
                <td class="cell-mono" style="color:var(--color-accent)">{{ pm.paymentNo }}</td>
                <td>{{ pm.supplierName }}</td>
                <td class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(pm.amount) }}</td>
                <td>{{ payableStore.methodLabels[pm.method] || pm.method }}</td>
                <td>{{ pm.bankName || '-' }}</td>
                <td class="cell-mono">{{ pm.referenceNo || '-' }}</td>
                <td>{{ pm.paymentDate }}</td>
                <td>{{ pm.operator }}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="pm.notes">{{ pm.notes || '-' }}</td>
                <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleRevokePayment(pm)">撤销</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalPaymentPages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="paymentPage <= 1" @click="paymentPage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ paymentPage }} / {{ totalPaymentPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="paymentPage >= totalPaymentPages" @click="paymentPage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 账龄分析 -->
    <div v-show="currentTab === 'aging'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="chart" :size="14" /> 账龄分析</span>
      </div>
      <div class="panel-card-body">
        <AgingAnalysis :data="agingData" type="payable" />
      </div>
    </div>

    <!-- 付款弹窗 -->
    <PaymentFormModal
      v-model:visible="showPaymentForm"
      :payable="selectedPayable"
      @saved="onPaymentSaved"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePayableStore } from '@/stores/payable'
import { useInventoryStore } from '@/stores/inventory'
import PaymentFormModal from '@/components/finance/PaymentFormModal.vue'
import AgingAnalysis from '@/components/finance/AgingAnalysis.vue'
import DataSelect from '@/components/DataSelect.vue'
import { formatMoney } from '@/utils/format'
import { useFinancePage } from '@/composables/useFinancePage'

const payableStore = usePayableStore()
const inventoryStore = useInventoryStore()

const {
  currentTab, tabs, filters, agingData, getRowStyle, resetFilters, onEntityChange,
  /* 重命名为模板中使用的变量名 */
  showForm: showPaymentForm,
  selectedItem: selectedPayable,
  primaryPage: payablePage,
  secondaryPage: paymentPage,
  paginatedPrimaryList: paginatedPayables,
  totalPrimaryPages: totalPayablePages,
  paginatedSecondaryList: paginatedPayments,
  totalSecondaryPages: totalPaymentPages,
  openForm: openPaymentForm,
  onFormSaved: onPaymentSaved,
  handleRevoke: handleRevokePayment,
} = useFinancePage({
  financeStore: payableStore,
  secondaryStore: inventoryStore,
  type: 'payable'
})

/* 保留 onSupplierChange 作为 onEntityChange 的别名，兼容模板 */
const onSupplierChange = onEntityChange

onMounted(() => {
  payableStore.initSeedData()
  inventoryStore.initSeedData()
  payableStore.refreshOverdueStatus()
})
</script>

<style scoped>
.payable-page {
}
.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.tab-bar {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .filter-bar { flex-direction: column; }
  .tab-bar { overflow-x: auto; }
}
</style>
