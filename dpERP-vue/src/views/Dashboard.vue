<template>
  <div class="dashboard-page">
    <div v-if="isLoading" class="skeleton-wrapper">
      <div class="skeleton-row-4">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
      <div class="skeleton-row-2">
        <div class="skeleton" style="height:300px"></div>
        <div class="skeleton" style="height:300px"></div>
      </div>
    </div>

    <div v-else>
    <div class="page-header">
      <div>
        <h2 class="page-header-title">仪表盘</h2>
        <p class="page-header-subtitle">实时业务概览与关键指标监控</p>
      </div>
    </div>

    <div class="dashboard-toolbar">
      <span class="toolbar-label">数据范围</span>
      <div class="btn-group">
        <button
          v-for="r in dateRanges"
          :key="r.key"
          class="btn btn-ghost"
          :class="{ active: selectedRange === r.key }"
          @click="selectedRange = r.key"
        >{{ r.label }}</button>
      </div>
      <button class="btn btn-ghost" @click="refreshData"><Icon name="refresh" :size="14" /> 刷新</button>
    </div>

    <DashStatsCards
      :total-revenue="totalRevenue"
      :revenue-growth="revenueGrowth"
      :collection-rate="collectionRate"
      :month-collected="monthCollected"
      :quotation-store="quotationStore"
      :contract-store="contractStore"
      :inventory-store="inventoryStore"
      :todo-store="todoStore"
      :stat-cards="statCards"
      :format-number="formatNumber"
    />

    <DashWeekView
      :week-days="weekDays"
      :dp-selected-date="dpSelectedDate"
      :week-range-label="weekRangeLabel"
      @dp-select-date="dpSelectDate"
      @week-prev="weekPrev"
      @week-next="weekNext"
      @week-go-today="weekGoToday"
    />

    <DashCharts ref="chartsRef" />

    <DashAlerts
      :alerts="alerts"
      :recent-activities="recentActivities"
      @navigate="$router.push($event)"
    />

    <DashQuickActions
      :ai-summary="aiSummary"
      :ai-insights="aiInsights"
      :is-refreshing-insights="isRefreshingInsights"
      @navigate="$router.push($event)"
      @refresh-insights="refreshInsights"
    />

    <div class="date-todo-section">
      <div class="date-picker-container">
        <div class="date-picker-header">
          <div class="dp-header-left">
            <span class="dp-icon"><Icon name="calendar" :size="14" /></span>
            <div class="dp-year-month-selectors">
              <select class="dp-year-select" v-model="dpYear">
                <option v-for="y in dpYears" :key="y" :value="y">{{ y }}年</option>
              </select>
              <select class="dp-month-select" v-model="dpMonth">
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
          </div>
          <div class="date-picker-nav">
            <button @click="dpPrevYear" title="上一年" class="dp-nav-btn">«</button>
            <button @click="dpPrevMonth" title="上一月" class="dp-nav-btn"><Icon name="chevronLeft" :size="14" /></button>
            <button class="dp-today-btn" @click="dpGoToday">今天</button>
            <button @click="dpNextMonth" title="下一月" class="dp-nav-btn"><Icon name="chevronRight" :size="14" /></button>
            <button @click="dpNextYear" title="下一年" class="dp-nav-btn">»</button>
          </div>
        </div>
        <div class="dp-manual-input-row">
          <label class="dp-input-label">手动输入：</label>
          <input type="date" class="dp-manual-input" v-model="dpManualDate">
          <button class="btn btn-ghost btn-sm dp-apply-btn" @click="dpApplyManual">应用</button>
        </div>
        <div class="date-picker-body">
          <div class="date-picker-weekdays">
            <div class="date-picker-weekday" v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</div>
          </div>
          <div class="date-picker-days">
            <div
              v-for="day in dpDays"
              :key="day.key"
              class="dp-day"
              :class="[
                { 'other-month': !day.currentMonth },
                { today: day.isToday },
                { selected: day.date === dpSelectedDate },
                { 'has-todo': day.todoCount > 0 }
              ]"
              @click="dpSelectDate(day.date)"
            >
              {{ day.day }}
              <span v-if="day.todoCount > 0" class="dp-day-dot"></span>
            </div>
          </div>
        </div>
        <div class="date-picker-footer">
          <div class="dp-selected-info">
            <span>已选择：{{ dpSelectedDate || '今天' }}</span>
            <span class="dp-weekday-label">{{ dpSelectedWeekday }}</span>
          </div>
          <span class="dp-task-count">{{ dpSelectedTodoCount }} 项待办</span>
        </div>
      </div>

      <div class="panel-card todo-panel-wrapper">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="list" :size="14" /> 待办事项</span>
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
            <div class="todo-view-toggle">
              <button
                v-for="v in todoViewModes"
                :key="v.key"
                class="todo-view-btn"
                :class="{ active: todoViewMode === v.key }"
                @click="todoViewMode = v.key"
              >{{ v.label }} <Icon :name="v.icon" :size="14" /></button>
            </div>
            <span class="dp-date-label">{{ dpSelectedDate || '今天' }}</span>
            <div class="todo-filters">
              <button
                v-for="f in todoFilterOptions"
                :key="f.key"
                class="todo-filter-btn"
                :class="{ active: todoFilter === f.key }"
                @click="todoFilter = f.key"
              >{{ f.label }}</button>
            </div>
            <button class="btn btn-primary btn-sm" @click="showTodoForm = !showTodoForm">{{ showTodoForm ? '取消' : '+ 新建' }}</button>
          </div>
        </div>
        <div class="panel-card-body">
          <div v-if="showTodoForm" class="todo-add-form">
            <input type="text" v-model="newTodoTitle" placeholder="输入待办事项..." @keydown.enter="addNewTodo">
            <select v-model="newTodoPriority">
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="low">低</option>
            </select>
            <input type="date" v-model="newTodoDue">
            <button class="btn btn-primary btn-sm" @click="addNewTodo">添加</button>
            <button class="btn btn-ghost btn-sm" @click="showTodoForm = false">取消</button>
          </div>
          <div class="todo-toolbar">
            <div class="todo-priority-filters">
              <div class="todo-priority-btn p-all" :class="{ active: todoPriorityFilter === 'all' }" @click="todoPriorityFilter = 'all'" title="全部优先级"></div>
              <div class="todo-priority-btn p-high" :class="{ active: todoPriorityFilter === 'high' }" @click="todoPriorityFilter = 'high'" title="高优先级"></div>
              <div class="todo-priority-btn p-medium" :class="{ active: todoPriorityFilter === 'medium' }" @click="todoPriorityFilter = 'medium'" title="中优先级"></div>
              <div class="todo-priority-btn p-low" :class="{ active: todoPriorityFilter === 'low' }" @click="todoPriorityFilter = 'low'" title="低优先级"></div>
            </div>
            <div class="todo-toolbar-right">
              <button class="btn btn-ghost btn-sm" @click="completeAllTodos"><Icon name="check" :size="14" /> 全部完成</button>
              <button class="btn btn-ghost btn-sm" @click="clearCompletedTodos"><Icon name="delete" :size="14" /> 清除已完成</button>
            </div>
          </div>

          <!-- <Icon name="table" :size="14" /> 表格视图 -->
          <div v-if="todoViewMode === 'table'" class="todo-table-view">
            <table class="todo-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>待办事项</th>
                  <th>优先级</th>
                  <th>截止日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="todo in filteredDpTodos" :key="todo.id" :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }">
                  <td>
                    <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                      <Icon v-if="todo.status === 'completed'" name="check" :size="14" />
                      <span v-else class="todo-uncheck">[未完成]</span>
                    </button>
                  </td>
                  <td class="todo-table-title">{{ todo.title }}</td>
                  <td><span class="todo-priority" :class="'priority-' + todo.priority">{{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}</span></td>
                  <td><span class="todo-due" :class="{ overdue: isOverdue(todo) }">{{ todo.dueDate || '-' }}</span></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="todoStore.deleteTodo(todo.id)"><Icon name="delete" :size="14" /></button>
                  </td>
                </tr>
                <tr v-if="filteredDpTodos.length === 0">
                  <td colspan="5" class="todo-empty">暂无待办事项 <Icon name="check" :size="14" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- <Icon name="list" :size="14" /> 列表视图（默认） -->
          <div v-if="todoViewMode === 'list'" class="todo-list">
            <div
              v-for="todo in filteredDpTodos"
              :key="todo.id"
              class="todo-quick-item"
              :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }"
            >
              <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                <Icon v-if="todo.status === 'completed'" name="check" :size="14" />
                <span v-else class="todo-uncheck">[未完成]</span>
              </button>
              <div class="todo-info">
                <span class="todo-title">{{ todo.title }}</span>
                <span class="todo-due" :class="{ overdue: isOverdue(todo) }">{{ todo.dueDate }}</span>
              </div>
              <span class="todo-priority" :class="'priority-' + todo.priority">
                {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
              </span>
            </div>
            <div v-if="filteredDpTodos.length === 0" class="todo-empty">暂无待办事项 <Icon name="check" :size="14" /></div>
          </div>

          <!-- <Icon name="card" :size="14" /> 卡片视图 -->
          <div v-if="todoViewMode === 'card'" class="todo-card-view">
            <div
              v-for="todo in filteredDpTodos"
              :key="todo.id"
              class="todo-card-item"
              :class="[
                'priority-border-' + todo.priority,
                { completed: todo.status === 'completed', overdue: isOverdue(todo) }
              ]"
            >
              <div class="todo-card-top">
                <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                  <Icon v-if="todo.status === 'completed'" name="check" :size="14" />
                  <span v-else class="todo-uncheck">[未完成]</span>
                </button>
                <span class="todo-priority" :class="'priority-' + todo.priority">
                  {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                </span>
              </div>
              <div class="todo-card-title">{{ todo.title }}</div>
              <div class="todo-card-meta">
                <span class="todo-due" :class="{ overdue: isOverdue(todo) }"><Icon name="calendar" :size="14" /> {{ todo.dueDate || '无截止日期' }}</span>
                <button class="btn btn-ghost btn-sm" @click="todoStore.deleteTodo(todo.id)" style="padding:0 4px;font-size:12px"><Icon name="delete" :size="14" /> 删除</button>
              </div>
            </div>
            <div v-if="filteredDpTodos.length === 0" class="todo-empty">暂无待办事项 <Icon name="check" :size="14" /></div>
          </div>

          <!-- <Icon name="calendar" :size="14" /> 日历视图 -->
          <div v-if="todoViewMode === 'calendar'" class="todo-calendar-view">
            <div class="todo-cal-nav">
              <button class="dp-nav-btn" @click="todoCalPrevYear">«</button>
              <button class="dp-nav-btn" @click="todoCalPrevMonth"><Icon name="chevronLeft" :size="14" /></button>
              <button class="dp-today-btn" @click="todoCalGoToday">今天</button>
              <button class="dp-nav-btn" @click="todoCalNextMonth"><Icon name="chevronRight" :size="14" /></button>
              <button class="dp-nav-btn" @click="todoCalNextYear">»</button>
              <span class="todo-cal-label">{{ todoCalYear }}年{{ todoCalMonth }}月</span>
            </div>
            <div class="todo-cal-weekdays">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="todo-cal-weekday">{{ d }}</div>
            </div>
            <div class="todo-cal-days">
              <div
                v-for="day in todoCalDays"
                :key="day.key"
                class="todo-cal-day"
                :class="{ 'other-month': !day.currentMonth, today: day.isToday, selected: day.date === todoCalSelectedDate }"
                @click="todoCalSelectDate(day.date)"
              >
                <div class="todo-cal-day-num">{{ day.day }}</div>
                <div class="todo-cal-day-items">
                  <div
                    v-for="todo in day.todos"
                    :key="todo.id"
                    class="todo-cal-dot"
                    :class="'priority-dot-' + todo.priority"
                    :title="todo.title"
                    @click.stop="todoStore.toggleTodo(todo.id, todo.auto || false)"
                  ></div>
                </div>
              </div>
            </div>
            <div v-if="todoCalSelectedTodos.length > 0" class="todo-cal-detail">
              <div class="todo-cal-detail-header">{{ todoCalSelectedDate }} 的待办 ({{ todoCalSelectedTodos.length }})</div>
              <div class="todo-cal-detail-list">
                <div
                  v-for="todo in todoCalSelectedTodos"
                  :key="todo.id"
                  class="todo-quick-item"
                  :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }"
                >
                  <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                    <Icon v-if="todo.status === 'completed'" name="check" :size="14" />
                    <span v-else class="todo-uncheck">[未完成]</span>
                  </button>
                  <div class="todo-info">
                    <span class="todo-title">{{ todo.title }}</span>
                    <span class="todo-due">{{ todo.dueDate }}</span>
                  </div>
                  <span class="todo-priority" :class="'priority-' + todo.priority">
                    {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- <Icon name="calendar" :size="14" /> 周视图 -->
          <div v-if="todoViewMode === 'week'" class="todo-week-view">
            <div class="todo-week-nav">
              <button class="dp-nav-btn" @click="todoWeekPrev"><Icon name="chevronLeft" :size="14" /> 上一周</button>
              <button class="dp-today-btn" @click="todoWeekGoToday">本周</button>
              <button class="dp-nav-btn" @click="todoWeekNext">下一周 <Icon name="chevronRight" :size="14" /></button>
              <span class="todo-cal-label">{{ todoWeekRangeLabel }}</span>
            </div>
            <div class="todo-week-grid">
              <div
                v-for="day in todoWeekDays"
                :key="day.date"
                class="todo-week-col"
                :class="{ today: day.isToday }"
              >
                <div class="todo-week-header">
                  <div class="todo-week-name">{{ day.weekday }}</div>
                  <div class="todo-week-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
                </div>
                <div class="todo-week-items">
                  <div
                    v-for="todo in day.todos"
                    :key="todo.id"
                    class="todo-week-item"
                    :class="[
                      'priority-border-' + todo.priority,
                      { completed: todo.status === 'completed', overdue: isOverdue(todo) }
                    ]"
                    @click="todoStore.toggleTodo(todo.id, todo.auto || false)"
                  >
                    <span class="todo-week-item-title">{{ todo.title }}</span>
                    <span class="todo-priority" :class="'priority-' + todo.priority" style="font-size:9px">
                      {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                    </span>
                  </div>
                  <div v-if="day.todos.length === 0" class="todo-week-empty">-</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDataStore } from '@/stores/data'
import { useTodoStore } from '@/stores/todo'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useInventoryStore } from '@/stores/inventory'
import { useCollectionStore } from '@/stores/collection'
import DashStatsCards from '@/components/dashboard/DashStatsCards.vue'
import DashWeekView from '@/components/dashboard/DashWeekView.vue'
import DashCharts from '@/components/dashboard/DashCharts.vue'
import DashAlerts from '@/components/dashboard/DashAlerts.vue'
import DashQuickActions from '@/components/dashboard/DashQuickActions.vue'

const dataStore = useDataStore()
const todoStore = useTodoStore()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const inventoryStore = useInventoryStore()
const collectionStore = useCollectionStore()

const isLoading = ref(true)

const selectedRange = ref('month')
const chartsRef = ref(null)

const dateRanges = [
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' },
  { key: 'year', label: '本年' }
]

function getRangeStart() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (selectedRange.value === 'month') {
    return new Date(y, m, 1).toISOString().slice(0, 10)
  } else if (selectedRange.value === 'quarter') {
    const qStart = Math.floor(m / 3) * 3
    return new Date(y, qStart, 1).toISOString().slice(0, 10)
  }
  return new Date(y, 0, 1).toISOString().slice(0, 10)
}

const totalRevenue = computed(() => {
  const start = getRangeStart()
  return contractStore.contracts
    .filter(c => c.signDate && c.signDate >= start && c.status !== 'cancelled' && c.status !== 'draft')
    .reduce((s, c) => s + (c.totalAmount || 0), 0)
})

const revenueGrowth = computed(() => {
  const ma = contractStore.monthlyAmounts
  if (ma.length < 2) return 0
  const sorted = [...ma].sort((a, b) => b.month.localeCompare(a.month))
  const current = sorted[0].amount
  const prev = sorted[1].amount
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
})

const monthCollected = computed(() => {
  const start = getRangeStart()
  return collectionStore.collections
    .filter(c => c.status !== 'voided' && (c.status === 'confirmed' || c.status === 'completed') && c.date && c.date >= start)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
})

const collectionRate = computed(() => {
  const total = totalRevenue.value
  if (total === 0) return 0
  return Math.round((monthCollected.value / total) * 100)
})

const todayTransactionCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  let count = 0
  contractStore.contracts.forEach(c => { if (c.signDate === today && c.status !== 'cancelled' && c.status !== 'draft') count++ })
  collectionStore.collections.forEach(c => { if (c.date === today && c.status !== 'voided') count++ })
  dataStore.quotations.forEach(q => { if (q.date === today) count++ })
  return count
})

const todayTransactionAmount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  let amount = 0
  contractStore.contracts.forEach(c => { if (c.signDate === today && c.status !== 'cancelled' && c.status !== 'draft') amount += (c.totalAmount || 0) })
  collectionStore.collections.forEach(c => { if (c.date === today && c.status !== 'voided') amount += (parseFloat(c.amount) || 0) })
  dataStore.quotations.forEach(q => { if (q.date === today) amount += (q.total || q.subtotal || 0) })
  return amount
})

const statCards = computed(() => [
  {
    icon: 'building', label: '客户总数',
    value: customerStore.activeCount,
    change: `共 ${customerStore.customers.length} 个客户`,
    color: 'var(--color-accent)', bgColor: 'var(--color-accent-subtle)'
  },
  {
    icon: 'edit', label: '本月报价',
    value: dataStore.quotations.length,
    change: `${dataStore.pendingQuotationCount} 待处理`,
    color: 'var(--color-success)', bgColor: 'var(--color-success-subtle)',
    changeColor: 'var(--color-success)'
  },
  {
    icon: 'package', label: '库存品类',
    value: inventoryStore.enrichedInventory.length,
    change: `${inventoryStore.lowStockCount + inventoryStore.exhaustedCount} 低库存预警`,
    color: 'var(--color-warning)', bgColor: 'var(--color-warning-subtle)',
    changeColor: inventoryStore.lowStockCount + inventoryStore.exhaustedCount > 0 ? 'var(--color-danger)' : undefined
  },
  {
    icon: 'file', label: '本月合同',
    value: contractStore.contracts.filter(c => c.signDate && c.signDate >= getRangeStart() && c.status !== 'cancelled').length,
    change: `${contractStore.signedCount} 已签订`,
    color: 'var(--color-purple)', bgColor: 'var(--color-purple-subtle)'
  },
  {
    icon: 'list', label: '待办事项',
    value: todoStore.stats.pending,
    change: todoStore.stats.overdue > 0 ? `${todoStore.stats.overdue} 项逾期` : '无逾期',
    color: 'var(--color-danger)', bgColor: 'var(--color-danger-subtle)',
    changeColor: todoStore.stats.overdue > 0 ? 'var(--color-danger)' : undefined
  },
  {
    icon: 'card', label: '今日交易',
    value: todayTransactionCount,
    change: '¥' + formatNumber(todayTransactionAmount),
    color: 'var(--color-info)', bgColor: 'var(--color-info-subtle)'
  },
  {
    icon: 'clock', label: '待回款金额',
    value: '¥' + formatNumber(Math.max(0, totalRevenue.value - monthCollected.value)),
    change: '应收未收',
    color: 'var(--color-danger)', bgColor: 'var(--color-danger-subtle)'
  }
])

const alerts = computed(() => {
  const list = []
  inventoryStore.alertItems.forEach(item => {
    list.push({
      id: 'stock-' + item.id,
      level: item.alertStatus === 'exhausted' ? 'danger' : 'warning',
      title: `${item.name} 库存不足`,
      desc: `当前库存 ${item.stock.toFixed(1)}kg，安全库存 ${item.safetyStockVal}kg`,
      time: '实时'
    })
  })
  todoStore.allTodos.filter(t => t.status !== 'completed' && isOverdue(t)).forEach(todo => {
    list.push({
      id: 'todo-' + todo.id,
      level: 'danger',
      title: `待办逾期: ${todo.title}`,
      desc: `截止日期 ${todo.dueDate} 已过期`,
      time: todo.dueDate
    })
  })
  return list
})

const recentActivities = computed(() => {
  const activities = []
  const now = new Date()

  function timeAgo(dateStr) {
    if (!dateStr) return '未知'
    const d = new Date(dateStr)
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return mins <= 1 ? '刚刚' : `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return dateStr.slice(0, 10)
  }

  contractStore.contracts
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)
    .forEach(c => {
      activities.push({
        id: 'contract-' + c.id,
        text: `${c.partyA || '客户'} ${c.status === 'signed' ? '合同签署' : '合同创建'}`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-success)'
      })
    })

  collectionStore.collections
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)
    .forEach(c => {
      activities.push({
        id: 'collection-' + c.id,
        text: `${c.customerName || '客户'} 回款 ¥${formatNumber(parseFloat(c.amount) || 0)} ${c.status === 'confirmed' ? '已确认' : '待确认'}`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-warning)'
      })
    })

  customerStore.customers
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 1)
    .forEach(c => {
      activities.push({
        id: 'customer-' + c.id,
        text: `${c.name} 新客户建档`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-purple)'
      })
    })

  return activities.sort((a, b) => {
    const order = { '刚刚': 0, '分钟前': 1, '小时前': 2, '天前': 3 }
    const getOrd = t => { for (const [k, v] of Object.entries(order)) { if (t.includes(k)) return v } return 9 }
    return getOrd(a.time) - getOrd(b.time)
  }).slice(0, 5)
})

const aiSummary = computed(() => {
  const parts = []
  const alertCount = inventoryStore.lowStockCount + inventoryStore.exhaustedCount
  if (alertCount > 0) parts.push(`${alertCount}项库存低于安全线`)
  if (todoStore.stats.overdue > 0) parts.push(`${todoStore.stats.overdue}项待办逾期`)
  if (dataStore.pendingQuotationCount > 0) parts.push(`${dataStore.pendingQuotationCount}份报价待处理`)
  if (parts.length === 0) return '当前业务运行正常，无异常指标。'
  return `检测到 ${parts.join('、')}，建议优先处理。`
})

const aiInsights = computed(() => {
  const insights = []
  const alertCount = inventoryStore.lowStockCount + inventoryStore.exhaustedCount
  if (alertCount > 0) {
    insights.push({ icon: 'package', text: `有 ${alertCount} 项物料低于最低库存，建议尽快补货` })
  }
  if (todoStore.stats.overdue > 0) {
    insights.push({ icon: 'bell', text: `${todoStore.stats.overdue} 项待办已逾期，请及时跟进` })
  }
  if (contractStore.pendingApprovalCount > 0) {
    insights.push({ icon: 'file', text: `${contractStore.pendingApprovalCount} 份合同待审批，可能影响回款周期` })
  }
  if (collectionRate.value < 60) {
    insights.push({ icon: 'dollar', text: `回款率仅 ${collectionRate.value}%，建议加强催收力度` })
  }
  if (insights.length === 0) {
    insights.push({ icon: 'check', text: '所有指标正常，业务运行良好' })
  }
  return insights
})

function isOverdue(todo) {
  if (todo.status === 'completed') return false
  return todo.dueDate < new Date().toISOString().slice(0, 10)
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function refreshData() {
  if (chartsRef.value) {
    chartsRef.value.refreshCharts()
  }
}

const isRefreshingInsights = ref(false)
function refreshInsights() {
  isRefreshingInsights.value = true
  setTimeout(() => {
    isRefreshingInsights.value = false
  }, 800)
}

const dpYear = ref(new Date().getFullYear())
const dpMonth = ref(new Date().getMonth() + 1)
const dpSelectedDate = ref(new Date().toISOString().slice(0, 10))
const dpManualDate = ref('')
const dpYears = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)
const weekOffset = ref(0)
const showTodoForm = ref(false)
const newTodoTitle = ref('')
const newTodoPriority = ref('medium')
const newTodoDue = ref('')
const todoFilter = ref('all')
const todoPriorityFilter = ref('all')
const todoViewMode = ref('list')

const todoFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'overdue', label: '已逾期' },
  { key: 'completed', label: '已完成' }
]

const todoViewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const todoCalYear = ref(new Date().getFullYear())
const todoCalMonth = ref(new Date().getMonth() + 1)
const todoCalSelectedDate = ref(new Date().toISOString().slice(0, 10))

const todoCalDays = computed(() => {
  const year = todoCalYear.value
  const month = todoCalMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const result = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    const date = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({
      key: date, day, currentMonth: false, isToday: date === today, date,
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: true, isToday: date === today, date,
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const date = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: false, isToday: date === today, date,
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  return result
})

const todoCalSelectedTodos = computed(() => {
  return todoStore.allTodos.filter(t => t.dueDate === todoCalSelectedDate.value)
})

const todoWeekOffset = ref(0)

const todoWeekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + todoWeekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTodos = filteredDpTodos.value.filter(t => t.dueDate === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: weekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      todos: dayTodos
    })
  }
  return result
})

const todoWeekRangeLabel = computed(() => {
  if (todoWeekDays.value.length === 0) return ''
  const first = todoWeekDays.value[0]
  const last = todoWeekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function todoCalPrevYear() { todoCalYear.value-- }
function todoCalNextYear() { todoCalYear.value++ }
function todoCalPrevMonth() {
  if (todoCalMonth.value === 1) { todoCalMonth.value = 12; todoCalYear.value-- }
  else todoCalMonth.value--
}
function todoCalNextMonth() {
  if (todoCalMonth.value === 12) { todoCalMonth.value = 1; todoCalYear.value++ }
  else todoCalMonth.value++
}
function todoCalGoToday() {
  const now = new Date()
  todoCalYear.value = now.getFullYear()
  todoCalMonth.value = now.getMonth() + 1
  todoCalSelectedDate.value = now.toISOString().slice(0, 10)
}
function todoCalSelectDate(date) { todoCalSelectedDate.value = date }
function todoWeekPrev() { todoWeekOffset.value-- }
function todoWeekNext() { todoWeekOffset.value++ }
function todoWeekGoToday() { todoWeekOffset.value = 0 }

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + weekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTodos = todoStore.allTodos.filter(t => t.dueDate === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: weekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      todos: dayTodos.slice(0, 5)
    })
  }
  return result
})

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function weekPrev() { weekOffset.value-- }
function weekNext() { weekOffset.value++ }
function weekGoToday() { weekOffset.value = 0 }

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const dpSelectedWeekday = computed(() => {
  if (!dpSelectedDate.value) return ''
  const d = new Date(dpSelectedDate.value)
  return '星期' + weekdays[d.getDay()]
})

const dpDays = computed(() => {
  const year = dpYear.value
  const month = dpMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const result = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    const date = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({ key: date, day, currentMonth: false, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({ key: date, day: i, currentMonth: true, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const date = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({ key: date, day: i, currentMonth: false, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  return result
})

const dpSelectedTodoCount = computed(() => {
  return todoStore.allTodos.filter(t => t.dueDate === dpSelectedDate.value && t.status !== 'completed').length
})

const filteredDpTodos = computed(() => {
  let list = todoStore.allTodos
  if (todoFilter.value === 'today') {
    const today = new Date().toISOString().slice(0, 10)
    list = list.filter(t => t.dueDate === today)
  } else if (todoFilter.value === 'overdue') {
    list = list.filter(t => t.status !== 'completed' && isOverdue(t))
  } else if (todoFilter.value === 'completed') {
    list = list.filter(t => t.status === 'completed')
  }
  if (todoPriorityFilter.value !== 'all') {
    list = list.filter(t => t.priority === todoPriorityFilter.value)
  }
  return list.slice(0, 10)
})

function dpPrevYear() { dpYear.value-- }
function dpNextYear() { dpYear.value++ }
function dpPrevMonth() {
  if (dpMonth.value === 1) { dpMonth.value = 12; dpYear.value-- }
  else dpMonth.value--
}
function dpNextMonth() {
  if (dpMonth.value === 12) { dpMonth.value = 1; dpYear.value++ }
  else dpMonth.value++
}
function dpGoToday() {
  const now = new Date()
  dpYear.value = now.getFullYear()
  dpMonth.value = now.getMonth() + 1
  dpSelectedDate.value = now.toISOString().slice(0, 10)
}
function dpSelectDate(date) { dpSelectedDate.value = date }
function dpApplyManual() {
  if (dpManualDate.value) {
    const d = new Date(dpManualDate.value)
    dpYear.value = d.getFullYear()
    dpMonth.value = d.getMonth() + 1
    dpSelectedDate.value = dpManualDate.value
  }
}
function addNewTodo() {
  if (!newTodoTitle.value.trim()) return
  todoStore.addTodo({
    title: newTodoTitle.value,
    priority: newTodoPriority.value,
    dueDate: newTodoDue.value || dpSelectedDate.value,
    status: 'pending'
  })
  newTodoTitle.value = ''
  newTodoPriority.value = 'medium'
  newTodoDue.value = ''
  showTodoForm.value = false
}
function completeAllTodos() {
  filteredDpTodos.value.forEach(t => {
    if (t.status !== 'completed') todoStore.toggleTodo(t.id, t.auto || false)
  })
}
function clearCompletedTodos() {
  todoStore.clearCompleted()
}

onMounted(async () => {
  customerStore.initSeedData()
  dataStore.initSeedData()
  inventoryStore.initSeedData()
  collectionStore.initSeedData()
  isLoading.value = false
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1600px;
  margin: 0 auto;
}
.dashboard-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.toolbar-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.btn-group {
  display: flex;
  gap: 2px;
}
.btn-group .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.skeleton-wrapper {
  padding: var(--space-4);
}
.skeleton-row-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.skeleton-row-2 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
}
.skeleton {
  background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-surface-hover) 50%, var(--color-bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
.skeleton-card { height: 100px; }
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.date-todo-section {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.date-picker-container {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
}
.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.dp-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.dp-icon { font-size: 18px; }
.dp-year-month-selectors {
  display: flex;
  gap: var(--space-1);
}
.dp-year-select, .dp-month-select {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 2px 4px;
  font-size: var(--font-size-sm);
}
.date-picker-nav {
  display: flex;
  gap: 2px;
}
.dp-nav-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 12px;
}
.dp-nav-btn:hover { background: var(--color-accent-subtle); }
.dp-today-btn {
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}
.dp-manual-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.dp-input-label { white-space: nowrap; }
.dp-manual-input {
  flex: 1;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 2px 6px;
  font-size: var(--font-size-xs);
}
.date-picker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.date-picker-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dp-day {
  text-align: center;
  padding: 6px 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  position: relative;
  transition: all 0.15s;
}
.dp-day:hover { background: var(--color-accent-subtle); }
.dp-day.other-month { color: var(--color-text-tertiary); opacity: 0.4; }
.dp-day.today { background: var(--color-accent-subtle); font-weight: 700; color: var(--color-accent); }
.dp-day.selected { background: var(--color-accent); color: #fff; }
.dp-day-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-danger);
}
.dp-day.selected .dp-day-dot { background: #fff; }
.date-picker-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.dp-weekday-label { margin-left: var(--space-2); color: var(--color-text-tertiary); }
.dp-task-count { color: var(--color-accent); font-weight: 600; }
.todo-panel-wrapper { flex: 1; }
.dp-date-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.todo-filters {
  display: flex;
  gap: 2px;
}
.todo-filter-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.todo-filter-btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.todo-add-form {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.todo-add-form input, .todo-add-form select {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 4px 8px;
  font-size: var(--font-size-sm);
}
.todo-add-form input[type="text"] { flex: 1; }
.todo-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.todo-priority-filters {
  display: flex;
  gap: 4px;
}
.todo-priority-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.todo-priority-btn.p-all { background: var(--color-bg-tertiary); }
.todo-priority-btn.p-high { background: var(--color-danger); }
.todo-priority-btn.p-medium { background: var(--color-warning); }
.todo-priority-btn.p-low { background: var(--color-info); }
.todo-priority-btn.active { border-color: var(--color-text-primary); transform: scale(1.2); }
.todo-toolbar-right {
  display: flex;
  gap: var(--space-2);
}
.todo-quick-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  transition: all var(--transition-fast);
}
.todo-quick-item.overdue {
  border-left: 3px solid var(--color-danger);
}
.todo-quick-item.completed {
  opacity: 0.5;
}
.todo-check {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.todo-uncheck {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.todo-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}
.todo-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-due {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.todo-due.overdue {
  color: var(--color-danger);
  font-weight: 600;
}
.todo-priority {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.priority-high { background: var(--color-danger-subtle); color: var(--color-danger); }
.priority-medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.priority-low { background: var(--color-info-subtle); color: var(--color-info); }
.todo-empty {
  text-align: center;
  padding: var(--space-6) 0;
  color: var(--color-text-tertiary);
}
.todo-view-toggle {
  display: flex;
  gap: 2px;
}
.todo-view-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.todo-view-btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.todo-table-view { overflow-x: auto; }
.todo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.todo-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.todo-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.todo-table tr.completed { opacity: 0.5; }
.todo-table tr.overdue { border-left: 3px solid var(--color-danger); }
.todo-table-title {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}
.todo-card-item {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  transition: all 0.15s;
}
.todo-card-item:hover { border-color: var(--color-accent); }
.todo-card-item.completed { opacity: 0.5; }
.todo-card-item.overdue { border-color: var(--color-danger); }
.todo-card-item.priority-border-high { border-left: 3px solid var(--color-danger); }
.todo-card-item.priority-border-medium { border-left: 3px solid var(--color-warning); }
.todo-card-item.priority-border-low { border-left: 3px solid var(--color-info); }
.todo-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.todo-card-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: var(--space-2);
  line-height: 1.4;
}
.todo-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.todo-calendar-view { }
.todo-cal-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.todo-cal-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.todo-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.todo-cal-weekday { padding: var(--space-1) 0; font-weight: 600; }
.todo-cal-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.todo-cal-day {
  min-height: 60px;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-bg-primary);
}
.todo-cal-day:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.todo-cal-day.other-month { opacity: 0.35; }
.todo-cal-day.today { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.todo-cal-day.selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent); }
.todo-cal-day-num { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
.todo-cal-day.today .todo-cal-day-num { color: var(--color-accent); }
.todo-cal-day-items { display: flex; flex-wrap: wrap; gap: 2px; }
.todo-cal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s;
}
.todo-cal-dot:hover { transform: scale(1.5); }
.todo-cal-dot.priority-dot-high { background: var(--color-danger); }
.todo-cal-dot.priority-dot-medium { background: var(--color-warning); }
.todo-cal-dot.priority-dot-low { background: var(--color-info); }
.todo-cal-detail {
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}
.todo-cal-detail-header {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.todo-cal-detail-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.todo-week-view { }
.todo-week-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.todo-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.todo-week-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-height: 120px;
  display: flex;
  flex-direction: column;
}
.todo-week-col.today {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.todo-week-header {
  text-align: center;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.todo-week-name {
  font-size: 10px;
  color: var(--color-text-tertiary);
  letter-spacing: 0.5px;
}
.todo-week-num {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 2px;
}
.todo-week-num.is-today { color: var(--color-accent); }
.todo-week-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.todo-week-item {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  border-left: 3px solid transparent;
}
.todo-week-item:hover { background: var(--color-bg-tertiary); }
.todo-week-item.completed { opacity: 0.4; text-decoration: line-through; }
.todo-week-item.overdue { background: var(--color-danger-subtle); }
.todo-week-item.priority-border-high { border-left-color: var(--color-danger); }
.todo-week-item.priority-border-medium { border-left-color: var(--color-warning); }
.todo-week-item.priority-border-low { border-left-color: var(--color-info); }
.todo-week-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}
.todo-week-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--space-2) 0;
}

/* 响应式适配 */
@media (max-width: 1024px) {
  .skeleton-row-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .skeleton-row-2 {
    grid-template-columns: 1fr;
  }
  .date-todo-section {
    grid-template-columns: 1fr;
  }
  .todo-week-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .dashboard-toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .skeleton-row-4 {
    grid-template-columns: 1fr;
  }
  .skeleton-row-2 {
    grid-template-columns: 1fr;
  }
  .date-todo-section {
    grid-template-columns: 1fr;
  }
  .todo-week-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .todo-card-view {
    grid-template-columns: 1fr;
  }
  .todo-add-form {
    flex-direction: column;
  }
  .todo-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .todo-cal-days {
    grid-template-columns: repeat(7, 1fr);
  }
  .todo-cal-weekdays {
    grid-template-columns: repeat(7, 1fr);
  }
  .dashboard-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
