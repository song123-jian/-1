<template>
  <div class="transaction-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">交易管理</h2>
        <p class="page-header-subtitle">
          全链路交易记录追踪：报价
          <Icon name="chevronRight" :size="14" />
          合同
          <Icon name="chevronRight" :size="14" />
          回款
          <Icon name="chevronRight" :size="14" />
          对账
        </p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in primaryViewOptions"
            :key="v.key"
            class="btn btn-outline"
            :class="{ active: currentView === v.key }"
            @click="currentView = v.key"
          >
            <Icon :name="v.icon" :size="14" />
            {{ v.label }}
          </button>
          <div class="view-more-wrapper">
            <button
              class="btn btn-outline"
              :class="{ active: moreViewOptions.some((v) => currentView === v.key) }"
              @click="showViewMore = !showViewMore"
            >
              更多
              <Icon name="chevronDown" :size="12" />
            </button>
            <div v-if="showViewMore" class="view-more-dropdown">
              <button
                v-for="v in moreViewOptions"
                :key="v.key"
                class="view-more-item"
                :class="{ active: currentView === v.key }"
                @click="currentView = v.key; showViewMore = false"
              >
                <Icon :name="v.icon" :size="14" />
                {{ v.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig">
            <Icon name="setting" :size="14" />
            列
          </button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label
              v-for="col in columnDefs.filter((c) => c.hideable !== false)"
              :key="col.key"
              class="column-config-item"
            >
              <input v-model="columnVisible[col.key]" type="checkbox" />
              {{ col.label }}
            </label>
          </div>
        </div>
        <button class="btn btn-outline" @click="exportCSV">导出</button>
        <button class="btn btn-primary" @click="openForm()">新建交易</button>
      </div>
    </div>

    <div class="stats-row stats-grid-5">
      <div class="stat-card" @click="onStatCardClick('total')">
        <div class="stat-card-header">
          <Icon name="layers" :size="14" class="stat-card-icon" />
          <span class="stat-card-label">交易总数</span>
        </div>
        <div class="stat-card-value" style="font-size: var(--font-size-xl)">{{ allTransactions.length }}</div>
        <div class="stat-card-trend" :class="statTrends.total.dir">
          {{ statTrends.total.dir === 'up' ? '↑' : '↓' }} {{ statTrends.total.pct }}%
        </div>
      </div>
      <div class="stat-card" @click="onStatCardClick('amount')">
        <div class="stat-card-header">
          <Icon name="dollarSign" :size="14" class="stat-card-icon" />
          <span class="stat-card-label">交易总额</span>
        </div>
        <div class="stat-card-value" style="color: var(--color-accent); font-size: var(--font-size-xl)">
          ¥{{ formatMoney(totalAmount) }}
        </div>
        <div class="stat-card-trend" :class="statTrends.amount.dir">
          {{ statTrends.amount.dir === 'up' ? '↑' : '↓' }} {{ statTrends.amount.pct }}%
        </div>
      </div>
      <div class="stat-card" @click="onStatCardClick('completed')">
        <div class="stat-card-header">
          <Icon name="checkCircle" :size="14" class="stat-card-icon" />
          <span class="stat-card-label">已完成</span>
        </div>
        <div class="stat-card-value" style="color: var(--color-success); font-size: var(--font-size-xl)">
          {{ completedCount }}
        </div>
        <div class="stat-card-trend" :class="statTrends.completed.dir">
          {{ statTrends.completed.dir === 'up' ? '↑' : '↓' }} {{ statTrends.completed.pct }}%
        </div>
      </div>
      <div class="stat-card" @click="onStatCardClick('pending')">
        <div class="stat-card-header">
          <Icon name="clock" :size="14" class="stat-card-icon" />
          <span class="stat-card-label">进行中</span>
        </div>
        <div class="stat-card-value" style="color: var(--color-warning); font-size: var(--font-size-xl)">
          {{ pendingCount }}
        </div>
        <div class="stat-card-trend" :class="statTrends.pending.dir">
          {{ statTrends.pending.dir === 'up' ? '↑' : '↓' }} {{ statTrends.pending.pct }}%
        </div>
      </div>
      <div class="stat-card stat-card-overdue" @click="onStatCardClick('overdue')">
        <div class="stat-card-header">
          <Icon name="alertTriangle" :size="14" class="stat-card-icon" />
          <span class="stat-card-label">逾期金额</span>
        </div>
        <div class="stat-card-value" style="color: var(--color-danger); font-size: var(--font-size-xl)">
          ¥{{ formatMoney(overdueAmount) }}
        </div>
        <div class="stat-card-trend" :class="statTrends.overdue.dir">
          {{ statTrends.overdue.dir === 'up' ? '↑' : '↓' }} {{ statTrends.overdue.pct }}%
        </div>
      </div>
    </div>

    <div class="quick-filter-bar">
      <span class="tag-filter-item" :class="{ active: quickFilter === 'today' }" @click="applyQuickFilter('today')">
        今日
      </span>
      <span class="tag-filter-item" :class="{ active: quickFilter === 'week' }" @click="applyQuickFilter('week')">
        本周
      </span>
      <span class="tag-filter-item" :class="{ active: quickFilter === 'month' }" @click="applyQuickFilter('month')">
        本月
      </span>
      <span class="tag-filter-item" :class="{ active: quickFilter === 'quarter' }" @click="applyQuickFilter('quarter')">
        本季度
      </span>
    </div>
    <div class="filter-bar">
      <input
        v-model="filters.search"
        type="text"
        class="form-input"
        placeholder="搜索编号/客户名称..."
        style="min-width: 180px"
      />
      <select v-model="filters.type" class="form-select">
        <option value="">全部类型</option>
        <option value="quotation">报价</option>
        <option value="contract">合同</option>
        <option value="collection">回款</option>
        <option value="delivery">送货</option>
      </select>
      <select v-model="filters.status" class="form-select">
        <option value="">全部状态</option>
        <option value="completed">已完成</option>
        <option value="in_progress">进行中</option>
        <option value="pending">待处理</option>
        <option value="overdue">已逾期</option>
        <option value="cancelled">已取消</option>
      </select>
      <input v-model="filters.dateFrom" type="date" class="form-input" title="起始日期" style="width: 140px" />
      <input v-model="filters.dateTo" type="date" class="form-input" title="截止日期" style="width: 140px" />
      <button class="btn btn-outline" @click="resetFilters">重置</button>
    </div>
    <div v-if="hasActiveFilters" class="filter-tags-bar">
      <span v-if="filters.type" class="filter-tag">
        {{ typeLabels[filters.type] }}
        <button @click="filters.type = ''">×</button>
      </span>
      <span v-if="filters.status" class="filter-tag">
        {{ statusLabels[filters.status] }}
        <button @click="filters.status = ''">×</button>
      </span>
      <span v-if="filters.dateFrom" class="filter-tag">
        {{ filters.dateFrom }}起
        <button @click="filters.dateFrom = ''">×</button>
      </span>
      <span v-if="filters.dateTo" class="filter-tag">
        {{ filters.dateTo }}止
        <button @click="filters.dateTo = ''">×</button>
      </span>
      <span v-if="filters.search" class="filter-tag">
        搜索: {{ filters.search }}
        <button @click="filters.search = ''">×</button>
      </span>
      <button class="filter-tag-clear" @click="resetFilters">清除全部</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <TransactionTable
          v-if="currentView === 'table'"
          v-model="currentPage"
          :transactions="filteredTransactions"
          :column-visible="columnVisible"
          :type-labels="typeLabels"
          :status-labels="statusLabels"
          :status-badge-map="statusBadgeMap"
          @view-detail="viewDetail"
          @open-form="openForm"
          @handle-delete="handleDelete"
          @navigate-to-path="navigateToPath"
        />

        <TransactionList
          v-else-if="currentView === 'list'"
          :transactions="filteredTransactions"
          :type-labels="typeLabels"
          :status-labels="statusLabels"
          :status-badge-map="statusBadgeMap"
          @view-detail="viewDetail"
          @navigate-to-path="navigateToPath"
        />

        <TransactionCardView
          v-else-if="currentView === 'card'"
          :transactions="filteredTransactions"
          :type-labels="typeLabels"
          :status-labels="statusLabels"
          :status-badge-map="statusBadgeMap"
          @view-detail="viewDetail"
          @open-form="openForm"
          @handle-delete="handleDelete"
          @navigate-to-path="navigateToPath"
        />

        <!-- 日历视图 -->
        <div v-else-if="currentView === 'calendar'" class="calendar-view">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="calendarPrev">
              <Icon name="chevronLeft" :size="14" />
              上月
            </button>
            <span class="calendar-title">{{ calendarYear }}年{{ calendarMonth }}月</span>
            <button class="btn btn-ghost btn-sm" @click="calendarNext">
              下月
              <Icon name="chevronRight" :size="14" />
            </button>
            <button class="btn btn-ghost btn-sm" style="margin-left: 8px" @click="calendarToday">今天</button>
          </div>
          <div class="calendar-grid">
            <div v-for="d in weekDayNames" :key="d" class="calendar-header-cell">{{ d }}</div>
            <div
              v-for="(cell, idx) in calendarCells"
              :key="idx"
              class="calendar-cell"
              :class="{
                'other-month': !cell.currentMonth,
                'is-today': cell.isToday,
                'has-events': cell.transactions.length > 0
              }"
            >
              <div class="cell-date">{{ cell.day }}</div>
              <div class="cell-events">
                <div
                  v-for="t in cell.transactions.slice(0, 3)"
                  :key="t.id"
                  class="cell-event"
                  :class="'event-type-' + t.type"
                  :title="t.refNo + ' ' + t.customerName + ' ¥' + formatMoney(t.amount)"
                  @click="viewDetail(t)"
                >
                  <span class="type-badge" :class="'type-' + t.type" style="font-size: 9px; padding: 0 3px">
                    {{ typeLabels[t.type] }}
                  </span>
                  <span class="cell-event-text">{{ t.customerName }} ¥{{ formatMoney(t.amount) }}</span>
                </div>
                <div v-if="cell.transactions.length > 3" class="cell-more" @click="showDayDetail(cell.dateStr)">
                  +{{ cell.transactions.length - 3 }} 更多
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 周视图 -->
        <div v-else-if="currentView === 'week'" class="week-view">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="weekPrev">
              <Icon name="chevronLeft" :size="14" />
              上一周
            </button>
            <span class="calendar-title">{{ weekRangeLabel }}</span>
            <button class="btn btn-ghost btn-sm" @click="weekNext">
              下一周
              <Icon name="chevronRight" :size="14" />
            </button>
            <button class="btn btn-ghost btn-sm" style="margin-left: 8px" @click="weekToday">本周</button>
          </div>
          <div class="week-grid">
            <div v-for="(day, dIdx) in weekDays" :key="dIdx" class="week-day-col" :class="{ 'is-today': day.isToday }">
              <div class="week-day-header">
                <div class="week-day-name">{{ day.name }}</div>
                <div class="week-day-date">{{ day.dateStr.slice(5) }}</div>
              </div>
              <div class="week-day-body">
                <div v-if="day.transactions.length === 0" class="week-empty">暂无交易</div>
                <div
                  v-for="t in day.transactions"
                  :key="t.id"
                  class="week-event"
                  :class="'event-type-' + t.type"
                  @click="viewDetail(t)"
                >
                  <div class="week-event-header">
                    <span class="type-badge" :class="'type-' + t.type" style="font-size: 10px; padding: 1px 4px">
                      {{ typeLabels[t.type] }}
                    </span>
                    <span
                      class="status-badge"
                      :class="statusBadgeMap[t.status] || 'neutral'"
                      style="font-size: 10px; padding: 1px 4px"
                    >
                      {{ statusLabels[t.status] || t.status }}
                    </span>
                  </div>
                  <div class="week-event-ref">{{ t.refNo }}</div>
                  <div class="week-event-customer">{{ t.customerName }}</div>
                  <div class="week-event-amount">¥{{ formatMoney(t.amount) }}</div>
                  <div v-if="t.relatedDocs && t.relatedDocs.length > 0" class="week-event-related">
                    <span
                      v-for="rd in t.relatedDocs"
                      :key="rd.refNo"
                      class="related-ref"
                      style="font-size: 10px"
                      @click.stop="navigateToPath(rd.path)"
                    >
                      {{ typeLabels[rd.type] }}:{{ rd.refNo }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <TransactionFormModal
      :show-modal="showForm"
      :editing-transaction="editingTxn"
      :customers="customerStore.customers"
      :can-submit="canSubmit"
      @close="closeForm"
      @save="handleFormSave"
    />

    <!-- 详情弹窗 -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-content" style="max-width: 700px">
        <div class="modal-header">
          <h3>交易详情</h3>
          <button class="btn btn-ghost btn-sm" @click="showDetail = false">关闭</button>
        </div>
        <div v-if="detailTxn" class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">编号</span>
              <span class="detail-value mono">{{ detailTxn.refNo }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">类型</span>
              <span class="detail-value">
                <span class="type-badge" :class="'type-' + detailTxn.type">{{ typeLabels[detailTxn.type] }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">客户</span>
              <span class="detail-value">{{ detailTxn.customerName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">日期</span>
              <span class="detail-value">{{ detailTxn.date }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">金额</span>
              <span class="detail-value mono" style="font-size: var(--font-size-lg); font-weight: 700">
                ¥{{ formatMoney(detailTxn.amount) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">状态</span>
              <span class="detail-value">
                <span class="status-badge" :class="statusBadgeMap[detailTxn.status] || 'neutral'">
                  {{ statusLabels[detailTxn.status] || detailTxn.status }}
                </span>
              </span>
            </div>
          </div>
          <div v-if="detailTxn.relatedDocs && detailTxn.relatedDocs.length > 0" class="detail-related-section">
            <div class="detail-related-title">关联单据</div>
            <div class="detail-related-list">
              <div
                v-for="rd in detailTxn.relatedDocs"
                :key="rd.refNo"
                class="detail-related-item"
                @click="navigateToPath(rd.path)"
              >
                <span class="type-badge" :class="'type-' + rd.type">{{ typeLabels[rd.type] }}</span>
                <span class="detail-related-ref">{{ rd.refNo }}</span>
                <span v-if="rd.amount" class="detail-related-amount">¥{{ formatMoney(rd.amount) }}</span>
                <span v-if="rd.status" class="detail-related-status">{{ statusLabels[rd.status] || rd.status }}</span>
                <span class="detail-related-link">
                  查看
                  <Icon name="chevronRight" :size="14" />
                </span>
              </div>
            </div>
          </div>
          <div v-if="detailTxn.notes" class="detail-notes">
            <div class="detail-label" style="margin-bottom: 4px">备注</div>
            <div class="detail-notes-content">{{ detailTxn.notes }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDetail = false">关闭</button>
          <button v-if="detailTxn && detailTxn.type === 'manual'" class="btn btn-outline" @click="openForm(detailTxn); showDetail = false">
            编辑
          </button>
          <button
            v-if="detailTxn && detailTxn.relatedPath"
            class="btn btn-primary"
            @click="navigateToPath(detailTxn.relatedPath)"
          >
            查看关联单据
          </button>
        </div>
      </div>
    </div>

    <!-- 日历日期详情弹窗 -->
    <div v-if="showDayModal" class="modal-overlay" @click.self="showDayModal = false">
      <div class="modal-content" style="max-width: 640px">
        <div class="modal-header">
          <h3>{{ dayModalDate }} 交易记录</h3>
          <button class="btn btn-ghost btn-sm" @click="showDayModal = false">关闭</button>
        </div>
        <div class="modal-body">
          <div v-if="dayModalTransactions.length === 0" class="empty-state">当日无交易记录</div>
          <div
            v-for="t in dayModalTransactions"
            :key="t.id"
            class="day-modal-item"
            @click="viewDetail(t); showDayModal = false"
          >
            <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
            <span class="day-modal-ref">{{ t.refNo }}</span>
            <span class="day-modal-customer">{{ t.customerName }}</span>
            <span class="day-modal-amount cell-mono">¥{{ formatMoney(t.amount) }}</span>
            <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">
              {{ statusLabels[t.status] || t.status }}
            </span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDayModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'Transactions' }
</script>
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useClickOutside } from '@/composables/useClickOutside'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import TransactionTable from '@/modules/sales/components/transactions/TransactionTable.vue'
import TransactionList from '@/modules/sales/components/transactions/TransactionList.vue'
import TransactionCardView from '@/modules/sales/components/transactions/TransactionCardView.vue'
import TransactionFormModal from '@/modules/sales/components/transactions/TransactionFormModal.vue'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()

const STORAGE_KEY = 'gj_erp_manual_transactions'

function loadManual() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return []
}

function saveManual(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    /* ignore */
  }
}

const manualTransactions = ref(loadManual())

const currentView = ref('table')
const currentPage = ref(1)
const showForm = ref(false)
const showDetail = ref(false)
const editingTxn = ref(null)
const detailTxn = ref(null)
const showDayModal = ref(false)
const dayModalDate = ref('')
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth() + 1)
const weekStartDate = ref(getMonday(new Date()))
const quickFilter = ref('')
const showViewMore = ref(false)

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const filters = ref({
  search: '',
  type: '',
  status: '',
  dateFrom: '',
  dateTo: ''
})

const primaryViewOptions = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'archive', label: '卡片' }
]

const moreViewOptions = [
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const typeLabels = {
  quotation: '报价',
  contract: '合同',
  collection: '回款',
  delivery: '送货',
  manual: '手动记录'
}

const statusLabels = {
  completed: '已完成',
  in_progress: '进行中',
  pending: '待处理',
  overdue: '已逾期',
  cancelled: '已取消'
}

const statusBadgeMap = {
  completed: 'success',
  in_progress: 'accent',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'neutral'
}

function getCustomerName(customerId) {
  const c = customerStore.customers.find((c) => c.id === customerId)
  return c ? c.name || c.fullName || c.companyName || '未知客户' : '未知客户'
}

function getQuotationStatus(q) {
  if (q.status === 'accepted') return 'completed'
  if (q.status === 'rejected' || q.status === 'expired') return 'cancelled'
  if (q.status === 'approved' || q.status === 'sent') return 'in_progress'
  return 'pending'
}

function getContractStatus(c) {
  if (c.status === 'signed' || c.status === 'archived') return 'completed'
  if (c.status === 'cancelled') return 'cancelled'
  if (c.status === 'approved') return 'in_progress'
  return 'pending'
}

function getCollectionStatus(c) {
  if (c.status === 'completed' || c.status === 'confirmed') return 'completed'
  if (c.status === 'voided') return 'cancelled'
  return 'pending'
}

function getDeliveryStatus(d) {
  if (d.status === 'received' || d.status === 'accepted') return 'completed'
  if (d.status === 'returned' || d.status === 'exception') return 'cancelled'
  if (d.status === 'shipped' || d.status === 'transit') return 'in_progress'
  return 'pending'
}

function findRelatedDocs(type, source) {
  const docs = []
  if (type === 'quotation' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find((x) => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c)
        docs.push({
          type: 'contract',
          refNo: c.contractNo,
          amount: c.totalAmount,
          status: getContractStatus(c),
          path: '/contracts'
        })
    }
  } else if (type === 'contract' && source) {
    if (source.quoteId || source.quoteNo) {
      const q = quotationStore.quotations.find((x) => x.id === source.quoteId || x.quoteNo === source.quoteNo)
      if (q)
        docs.push({
          type: 'quotation',
          refNo: q.quoteNo,
          amount: q.total || q.subtotal,
          status: getQuotationStatus(q),
          path: '/quotations'
        })
    }
    const relatedCols = collectionStore.collections.filter(
      (x) => x.contractId === source.id || x.contractNo === source.contractNo
    )
    relatedCols.forEach((c) =>
      docs.push({
        type: 'collection',
        refNo: c.collectionNo,
        amount: parseFloat(c.amount) || 0,
        status: getCollectionStatus(c),
        path: '/collections'
      })
    )
    const relatedDel = deliveryStore.deliveries.filter(
      (x) => x.contractId === source.id || x.contractNo === source.contractNo
    )
    relatedDel.forEach((d) =>
      docs.push({
        type: 'delivery',
        refNo: d.deliveryNo || d.orderNo,
        amount: d.totalAmount,
        status: getDeliveryStatus(d),
        path: '/deliveries'
      })
    )
  } else if (type === 'collection' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find((x) => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c)
        docs.push({
          type: 'contract',
          refNo: c.contractNo,
          amount: c.totalAmount,
          status: getContractStatus(c),
          path: '/contracts'
        })
    }
  } else if (type === 'delivery' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find((x) => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c)
        docs.push({
          type: 'contract',
          refNo: c.contractNo,
          amount: c.totalAmount,
          status: getContractStatus(c),
          path: '/contracts'
        })
    }
  }
  return docs
}

const allTransactions = computed(() => {
  const list = []

  quotationStore.quotations.forEach((q) => {
    const relatedDocs = findRelatedDocs('quotation', q)
    list.push({
      id: 'q-' + q.id,
      refNo: q.quoteNo,
      type: 'quotation',
      customerName: q.customerName || getCustomerName(q.customerId),
      date: q.date,
      amount: q.total || q.subtotal || 0,
      status: getQuotationStatus(q),
      relatedDocs,
      relatedPath: '/quotations',
      source: q
    })
  })

  contractStore.contracts.forEach((c) => {
    const relatedDocs = findRelatedDocs('contract', c)
    list.push({
      id: 'c-' + c.id,
      refNo: c.contractNo,
      type: 'contract',
      customerName: c.partyA || c.customerName || getCustomerName(c.customerId),
      date: c.signDate || c.startDate,
      amount: c.totalAmount || c.amount || 0,
      status: getContractStatus(c),
      relatedDocs,
      relatedPath: '/contracts',
      source: c
    })
  })

  collectionStore.collections.forEach((c) => {
    const relatedDocs = findRelatedDocs('collection', c)
    list.push({
      id: 'col-' + c.id,
      refNo: c.collectionNo,
      type: 'collection',
      customerName: c.customerName || getCustomerName(c.customerId),
      date: c.date,
      amount: parseFloat(c.amount) || 0,
      status: getCollectionStatus(c),
      relatedDocs,
      relatedPath: '/collections',
      source: c
    })
  })

  deliveryStore.deliveries.forEach((d) => {
    const relatedDocs = findRelatedDocs('delivery', d)
    list.push({
      id: 'd-' + d.id,
      refNo: d.deliveryNo || d.orderNo || '',
      type: 'delivery',
      customerName: d.customerName || d.buyerName || getCustomerName(d.customerId),
      date: d.date || d.deliveryDate,
      amount: d.totalAmount || 0,
      status: getDeliveryStatus(d),
      relatedDocs,
      relatedPath: '/deliveries',
      source: d
    })
  })

  manualTransactions.value.forEach((t) => {
    list.push({
      id: 'm-' + t.id,
      refNo: t.refNo,
      type: 'manual',
      customerName: t.customerName || getCustomerName(t.customerId),
      date: t.date,
      amount: t.amount || 0,
      status: t.status || 'pending',
      relatedDocs: [],
      relatedPath: '',
      notes: t.notes || '',
      source: t
    })
  })

  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const filteredTransactions = computed(() => {
  let list = allTransactions.value
  if (filters.value.search) {
    const s = filters.value.search.toLowerCase()
    list = list.filter(
      (t) => (t.refNo || '').toLowerCase().includes(s) || (t.customerName || '').toLowerCase().includes(s)
    )
  }
  if (filters.value.type) {
    list = list.filter((t) => t.type === filters.value.type)
  }
  if (filters.value.status) {
    list = list.filter((t) => t.status === filters.value.status)
  }
  if (filters.value.dateFrom) {
    list = list.filter((t) => t.date && t.date >= filters.value.dateFrom)
  }
  if (filters.value.dateTo) {
    list = list.filter((t) => t.date && t.date <= filters.value.dateTo)
  }
  return list
})

const totalAmount = computed(() => {
  return allTransactions.value.reduce((s, t) => s + (t.amount || 0), 0)
})

const completedCount = computed(() => {
  return allTransactions.value.filter((t) => t.status === 'completed').length
})

const pendingCount = computed(() => {
  return allTransactions.value.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
})

const overdueAmount = computed(() => {
  return allTransactions.value.filter((t) => t.status === 'overdue').reduce((s, t) => s + (t.amount || 0), 0)
})

const canSubmit = computed(() => {
  return true
})

const hasActiveFilters = computed(() => {
  return !!(
    filters.value.type ||
    filters.value.status ||
    filters.value.dateFrom ||
    filters.value.dateTo ||
    filters.value.search
  )
})

const statTrends = computed(() => {
  const now = new Date()
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = lastMonthDate.getFullYear() + '-' + String(lastMonthDate.getMonth() + 1).padStart(2, '0')

  const thisMonthTxns = allTransactions.value.filter((t) => t.date && t.date.startsWith(thisMonth))
  const lastMonthTxns = allTransactions.value.filter((t) => t.date && t.date.startsWith(lastMonth))

  const thisTotal = thisMonthTxns.length
  const lastTotal = lastMonthTxns.length
  const thisAmount = thisMonthTxns.reduce((s, t) => s + (t.amount || 0), 0)
  const lastAmount = lastMonthTxns.reduce((s, t) => s + (t.amount || 0), 0)
  const thisCompleted = thisMonthTxns.filter((t) => t.status === 'completed').length
  const lastCompleted = lastMonthTxns.filter((t) => t.status === 'completed').length
  const thisPending = thisMonthTxns.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const lastPending = lastMonthTxns.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const thisOverdue = thisMonthTxns.filter((t) => t.status === 'overdue').reduce((s, t) => s + (t.amount || 0), 0)
  const lastOverdue = lastMonthTxns.filter((t) => t.status === 'overdue').reduce((s, t) => s + (t.amount || 0), 0)

  function calcTrend(cur, prev) {
    if (prev === 0) return { dir: cur > 0 ? 'up' : 'down', pct: cur > 0 ? 100 : 0 }
    const pct = Math.round((Math.abs(cur - prev) / prev) * 100)
    return { dir: cur >= prev ? 'up' : 'down', pct }
  }

  return {
    total: calcTrend(thisTotal, lastTotal),
    amount: calcTrend(thisAmount, lastAmount),
    completed: calcTrend(thisCompleted, lastCompleted),
    pending: calcTrend(thisPending, lastPending),
    overdue: calcTrend(thisOverdue, lastOverdue)
  }
})

function onStatCardClick(type) {
  if (type === 'overdue') {
    filters.value.status = 'overdue'
  } else if (type === 'completed') {
    filters.value.status = 'completed'
  } else if (type === 'pending') {
    filters.value.status = 'in_progress'
  } else if (type === 'amount' || type === 'total') {
    filters.value.type = ''
    filters.value.status = ''
  }
  currentPage.value = 1
}

function applyQuickFilter(period) {
  if (quickFilter.value === period) {
    quickFilter.value = ''
    filters.value.dateFrom = ''
    filters.value.dateTo = ''
    return
  }
  quickFilter.value = period
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  let dateFrom = ''
  const dateTo = today

  if (period === 'today') {
    dateFrom = today
  } else if (period === 'week') {
    const monday = getMonday(now)
    dateFrom = monday.toISOString().slice(0, 10)
  } else if (period === 'month') {
    dateFrom = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'
  } else if (period === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3
    dateFrom = now.getFullYear() + '-' + String(qMonth + 1).padStart(2, '0') + '-01'
  }

  filters.value.dateFrom = dateFrom
  filters.value.dateTo = dateTo
  currentPage.value = 1
}

function resetFilters() {
  filters.value = { search: '', type: '', status: '', dateFrom: '', dateTo: '' }
  quickFilter.value = ''
  currentPage.value = 1
}

function openForm(txn) {
  editingTxn.value = txn || null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTxn.value = null
}

function handleFormSave(formData) {
  const customerName = getCustomerName(formData.customerId)
  if (editingTxn.value) {
    const src = editingTxn.value.source || editingTxn.value
    const idx = manualTransactions.value.findIndex((t) => t.id === src.id)
    if (idx !== -1) {
      manualTransactions.value[idx] = {
        ...manualTransactions.value[idx],
        customerId: formData.customerId,
        customerName,
        amount: formData.amount,
        date: formData.date,
        notes: formData.notes
      }
      saveManual(manualTransactions.value)
    }
  } else {
    const now = new Date()
    const refNo =
      'TXN-' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(manualTransactions.value.length + 1).padStart(3, '0')
    manualTransactions.value.push({
      id: 'txn-' + Date.now(),
      refNo,
      customerId: formData.customerId,
      customerName,
      type: 'manual',
      amount: formData.amount,
      date: formData.date,
      status: 'pending',
      notes: formData.notes,
      createdAt: now.toISOString()
    })
    saveManual(manualTransactions.value)
  }
  closeForm()
}

function handleDelete(id) {
  const realId = id.replace('m-', '')
  manualTransactions.value = manualTransactions.value.filter((t) => t.id !== realId)
  saveManual(manualTransactions.value)
}

function viewDetail(t) {
  detailTxn.value = t
  showDetail.value = true
}

function navigateToPath(path) {
  if (path) router.push(path).catch(() => {})
}

function showDayDetail(dateStr) {
  dayModalDate.value = dateStr
  showDayModal.value = true
}

const dayModalTransactions = computed(() => {
  if (!dayModalDate.value) return []
  return filteredTransactions.value.filter((t) => t.date === dayModalDate.value)
})

function exportCSV() {
  try {
    const headers = ['编号', '类型', '客户', '日期', '金额', '状态', '关联单据']
    const rows = filteredTransactions.value.map((t) => [
      t.refNo,
      typeLabels[t.type] || t.type,
      t.customerName,
      t.date || '',
      t.amount || 0,
      statusLabels[t.status] || t.status,
      (t.relatedDocs || []).map((rd) => typeLabels[rd.type] + ':' + rd.refNo).join('; ')
    ])
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v == null ? '' : v)
            return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s
          })
          .join(',')
      )
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '交易记录_' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

const calendarCells = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  let startWeekDay = firstDay.getDay()
  if (startWeekDay === 0) startWeekDay = 7
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const cells = []
  const txMap = buildTransactionDateMap()

  for (let i = startWeekDay - 1; i > 0; i--) {
    const day = prevMonthLastDay - i + 1
    const pm = month - 1 <= 0 ? 12 : month - 1
    const py = month - 1 <= 0 ? year - 1 : year
    const dateStr = py + '-' + String(pm).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    cells.push({ day, currentMonth: false, isToday: false, dateStr, transactions: txMap[dateStr] || [] })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    cells.push({ day: d, currentMonth: true, isToday: dateStr === today, dateStr, transactions: txMap[dateStr] || [] })
  }

  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nm = month + 1 > 12 ? 1 : month + 1
    const ny = month + 1 > 12 ? year + 1 : year
    const dateStr = ny + '-' + String(nm).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    cells.push({ day: d, currentMonth: false, isToday: false, dateStr, transactions: txMap[dateStr] || [] })
  }

  return cells
})

function buildTransactionDateMap() {
  const map = {}
  filteredTransactions.value.forEach((t) => {
    if (!t.date) return
    if (!map[t.date]) map[t.date] = []
    map[t.date].push(t)
  })
  return map
}

function calendarPrev() {
  if (calendarMonth.value <= 1) {
    calendarMonth.value = 12
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

function calendarNext() {
  if (calendarMonth.value >= 12) {
    calendarMonth.value = 1
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

function calendarToday() {
  const now = new Date()
  calendarYear.value = now.getFullYear()
  calendarMonth.value = now.getMonth() + 1
}

const weekDays = computed(() => {
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const txMap = buildTransactionDateMap()
  const today = new Date().toISOString().slice(0, 10)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate.value)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      name: names[i],
      dateStr,
      isToday: dateStr === today,
      transactions: txMap[dateStr] || []
    })
  }
  return days
})

const weekRangeLabel = computed(() => {
  const start = new Date(weekStartDate.value)
  const end = new Date(weekStartDate.value)
  end.setDate(end.getDate() + 6)
  return formatShortDate(start) + ' ~ ' + formatShortDate(end)
})

function formatShortDate(d) {
  return d.getMonth() + 1 + '月' + d.getDate() + '日'
}

function weekPrev() {
  const d = new Date(weekStartDate.value)
  d.setDate(d.getDate() - 7)
  weekStartDate.value = d
}

function weekNext() {
  const d = new Date(weekStartDate.value)
  d.setDate(d.getDate() + 7)
  weekStartDate.value = d
}

function weekToday() {
  weekStartDate.value = getMonday(new Date())
}

const columnDefs = [
  { key: 'refNo', label: '编号' },
  { key: 'type', label: '类型' },
  { key: 'customerName', label: '客户' },
  { key: 'date', label: '日期' },
  { key: 'amount', label: '金额' },
  { key: 'status', label: '状态' },
  { key: 'relatedDocs', label: '关联单据' },
  { key: 'actions', label: '操作', hideable: false }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter((c) => c.hideable !== false).map((c) => [c.key, true])))
const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 8 + 'px', left: rect.left + 'px' }
  }
}

function handleClickOutside(e) {
  const wrapper = document.querySelector('.column-config-wrapper')
  if (showColumnConfig.value && wrapper && !wrapper.contains(e.target)) {
    showColumnConfig.value = false
  }
}

useClickOutside(handleClickOutside)
</script>

<style scoped>
.transaction-page {
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}
.page-header-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.stats-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stats-grid-5 {
  grid-template-columns: repeat(5, 1fr);
}
.stat-card {
  background: var(--color-surface-elevated);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  text-align: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  animation: statCardIn 0.4s ease-out both;
  cursor: pointer;
}
.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}
.stat-card-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}
.stat-card-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.stat-card-trend {
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  margin-top: var(--space-1);
}
.stat-card-trend.up {
  color: var(--color-success);
}
.stat-card-trend.down {
  color: var(--color-danger);
}
.stat-card-overdue {
  animation:
    statCardIn 0.4s ease-out both,
    pendingPulse 2s ease-in-out infinite;
}
.stat-card:nth-child(1) {
  animation-delay: 0ms;
}
.stat-card:nth-child(2) {
  animation-delay: 60ms;
}
.stat-card:nth-child(3) {
  animation-delay: 120ms;
}
.stat-card:nth-child(4) {
  animation-delay: 180ms;
}
.stat-card:nth-child(5) {
  animation-delay: 240ms;
}
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
@keyframes pendingPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.15);
  }
}
.filter-bar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}
.quick-filter-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  align-items: center;
}
.filter-tags-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}
.filter-tag button {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-xs);
  padding: 0;
  line-height: 1;
}
.filter-tag button:hover {
  color: var(--color-danger);
}
.filter-tag-clear {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  cursor: pointer;
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-tertiary);
}
.filter-tag-clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.type-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.type-quotation {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.type-contract {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.type-collection {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.type-delivery {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.type-manual {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}
.related-ref {
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.related-ref:hover {
  text-decoration: underline;
}
.view-toggle {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.view-more-wrapper {
  position: relative;
  display: inline-block;
}
.view-more-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-overlay, 1000);
  min-width: 120px;
  padding: var(--space-1) 0;
  margin-top: var(--space-1);
}
.view-more-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}
.view-more-item:hover {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.view-more-item.active {
  background: var(--color-accent);
  color: #fff;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-item {
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}
.detail-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-related-section {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-related-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.detail-related-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.detail-related-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: relatedSlideIn 0.3s ease-out both;
}
@keyframes relatedSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.detail-related-item:hover {
  background: var(--color-accent-subtle);
  transform: translateX(2px);
}
.detail-related-ref {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-related-amount {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.detail-related-status {
  font-size: var(--font-size-xs);
}
.detail-related-link {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-accent);
}
.detail-notes {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-notes-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
}
.modal-content {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.cell-mono {
  font-family: var(--font-mono);
}
.calendar-view {
  padding: var(--space-3);
}
.calendar-nav {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.calendar-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 140px;
  text-align: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.calendar-header-cell {
  padding: var(--space-2);
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}
.calendar-cell {
  min-height: 100px;
  padding: var(--space-1);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  transition: background 0.15s;
}
.calendar-cell:nth-child(7n) {
  border-right: none;
}
.calendar-cell:hover {
  background: var(--color-bg-secondary);
}
.calendar-cell.other-month {
  background: var(--color-bg-tertiary);
  opacity: 0.5;
}
.calendar-cell.is-today {
  background: var(--color-accent-subtle);
}
.calendar-cell.is-today .cell-date {
  background: var(--color-accent);
  color: #fff;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: todayPulse 2s ease-in-out infinite;
}
@keyframes todayPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  }
}
.cell-date {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.cell-events {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.cell-event {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s;
  overflow: hidden;
}
.cell-event:hover {
  background: var(--color-bg-tertiary);
  transform: scale(1.02);
}
.event-type-quotation {
  border-left: 2px solid var(--color-info);
}
.event-type-contract {
  border-left: 2px solid var(--color-accent);
}
.event-type-collection {
  border-left: 2px solid var(--color-success);
}
.event-type-delivery {
  border-left: 2px solid var(--color-warning);
}
.event-type-manual {
  border-left: 2px solid var(--color-purple);
}
.cell-event-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
}
.cell-more {
  font-size: 10px;
  color: var(--color-accent);
  cursor: pointer;
  padding: var(--space-1) var(--space-1);
}
.cell-more:hover {
  text-decoration: underline;
}
.week-view {
  padding: var(--space-3);
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.week-day-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}
.week-day-col.is-today {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.week-day-header {
  padding: var(--space-2) var(--space-3);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.week-day-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.week-day-date {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}
.is-today .week-day-date {
  color: var(--color-accent);
}
.week-day-body {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.week-empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4) 0;
}
.week-event {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}
.week-event:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
  transform: translateX(2px);
}
.week-event-header {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
}
.week-event-ref {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
}
.week-event-customer {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.week-event-amount {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent);
}
.week-event-related {
  margin-top: var(--space-1);
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.day-modal-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-bottom: var(--space-2);
  transition: all 0.15s;
}
.day-modal-item:hover {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}
.day-modal-ref {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--font-size-sm);
}
.day-modal-customer {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.day-modal-amount {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.column-config-wrapper {
  position: relative;
}
.column-config-dropdown {
  position: fixed;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  z-index: var(--z-popover, 9999);
  min-width: 160px;
  max-height: 360px;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}
.column-config-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  white-space: nowrap;
}
.column-config-item:hover {
  background: var(--color-surface-hover);
  border-radius: var(--radius-sm);
}
@media (max-width: 1024px) {
  .stats-grid-5 {
    grid-template-columns: repeat(3, 1fr);
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .week-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-grid-5 {
    grid-template-columns: repeat(2, 1fr);
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  table {
    font-size: 12px;
  }
}
@media (max-width: 640px) {
  .stats-grid-5 {
    grid-template-columns: 1fr;
  }
  .week-grid {
    grid-template-columns: 1fr;
  }
  .calendar-cell {
    min-height: 60px;
  }
}
</style>
