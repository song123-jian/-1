<template>
  <div class="panel-card">
    <div class="panel-card-header" style="justify-content: space-between">
      <span class="panel-card-title">
        <Icon name="calendar" :size="14" />
        客户日历视图
      </span>
      <div class="cal-nav">
        <button class="dp-nav-btn" @click="calPrevMonth">
          <Icon name="chevronLeft" :size="14" />
          上月
        </button>
        <button class="dp-today-btn" @click="calGoToday">本月</button>
        <button class="dp-nav-btn" @click="calNextMonth">
          下月
          <Icon name="chevronRight" :size="14" />
        </button>
        <span class="cal-range-label">{{ calYear }}年{{ calMonth + 1 }}月</span>
      </div>
    </div>
    <div class="panel-card-body">
      <div class="cal-weekday-row">
        <div v-for="d in calWeekdayNames" :key="d" class="cal-weekday-cell">{{ d }}</div>
      </div>
      <div class="cal-grid">
        <div
          v-for="day in calDays"
          :key="day.date"
          class="cal-day-cell"
          :class="{ today: day.isToday, selected: day.date === calSelectedDate, 'other-month': !day.inMonth }"
          @click="calSelectedDate = day.date"
        >
          <div class="cal-day-num">{{ day.dayNum }}</div>
          <div class="cal-day-customers">
            <div
              v-for="c in day.customers.slice(0, 3)"
              :key="c.id"
              class="cal-customer-chip"
              :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8' }"
              @click.stop="$emit('openDetail', c)"
            >
              {{ c.fullName || c.name }}
            </div>
            <div v-if="day.customers.length > 3" class="cal-more">+{{ day.customers.length - 3 }}更多</div>
          </div>
        </div>
      </div>

      <div v-if="calSelectedCustomers.length > 0" class="cal-selected-panel">
        <div class="cal-selected-header">{{ calSelectedDate }} 创建的客户 ({{ calSelectedCustomers.length }})</div>
        <div class="cal-selected-list">
          <div
            v-for="c in calSelectedCustomers"
            :key="c.id"
            class="cal-selected-item"
            :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8' }"
            @click="$emit('openDetail', c)"
          >
            <div class="cal-selected-name">{{ c.fullName || c.name }}</div>
            <div class="cal-selected-info">
              <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
              <span v-if="c.contactName || c.contact">[用户] {{ c.contactName || c.contact }}</span>
              <span v-if="c.region">
                <Icon name="checkCircle" :size="14" />
                {{ c.region }}
              </span>
            </div>
            <div class="cal-selected-bottom">
              <span class="mono">¥{{ formatNumber(c.balance) }}</span>
              <span class="status-badge" :class="'status-' + c.status">
                {{ c.status === 'active' ? '活跃' : '休眠' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'CustomerCalendarView' }
</script>
<script setup>
import { ref, computed } from 'vue'
import { levelColors, levelLabel } from '@/utils/customerHelpers'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  customers: { type: Array, required: true }
})

defineEmits(['openDetail'])

const calWeekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth())
const calSelectedDate = ref('')

const calDays = computed(() => {
  const year = calYear.value
  const month = calMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // 周一为起始日
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const todayStr = new Date().toISOString().slice(0, 10)
  const result = []

  // 上月填充
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i
    const d = new Date(year, month - 1, dayNum)
    const dateStr = d.toISOString().slice(0, 10)
    const dayCustomers = props.customers.filter((c) => c.createdAt === dateStr)
    result.push({ date: dateStr, dayNum, inMonth: false, isToday: dateStr === todayStr, customers: dayCustomers })
  }

  // 本月
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayCustomers = props.customers.filter((c) => c.createdAt === dateStr)
    result.push({ date: dateStr, dayNum: i, inMonth: true, isToday: dateStr === todayStr, customers: dayCustomers })
  }

  // 下月填充
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayCustomers = props.customers.filter((c) => c.createdAt === dateStr)
    result.push({ date: dateStr, dayNum: i, inMonth: false, isToday: dateStr === todayStr, customers: dayCustomers })
  }

  return result
})

const calSelectedCustomers = computed(() => {
  if (!calSelectedDate.value) return []
  return props.customers.filter((c) => c.createdAt === calSelectedDate.value)
})

function calPrevMonth() {
  if (calMonth.value === 0) {
    calYear.value--
    calMonth.value = 11
  } else {
    calMonth.value--
  }
  calSelectedDate.value = ''
}

function calNextMonth() {
  if (calMonth.value === 11) {
    calYear.value++
    calMonth.value = 0
  } else {
    calMonth.value++
  }
  calSelectedDate.value = ''
}

function calGoToday() {
  const n = new Date()
  calYear.value = n.getFullYear()
  calMonth.value = n.getMonth()
  calSelectedDate.value = ''
}
</script>

<style scoped>
.cal-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cal-range-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.cal-weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--color-border);
}
.cal-weekday-cell {
  text-align: center;
  padding: var(--space-2);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-day-cell {
  min-height: 100px;
  border: 1px solid var(--color-border);
  padding: var(--space-1);
  cursor: pointer;
  transition: background var(--transition-fast);
  background: var(--color-bg-primary);
}
.cal-day-cell:hover {
  background: var(--color-surface-hover);
}
.cal-day-cell.today {
  background: var(--color-accent-subtle);
}
.cal-day-cell.selected {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
.cal-day-cell.other-month {
  opacity: 0.4;
}
.cal-day-num {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
.cal-day-cell.today .cal-day-num {
  color: var(--color-accent);
}
.cal-day-customers {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.cal-customer-chip {
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
  border-left: 3px solid var(--color-border);
  background: var(--color-surface-elevated);
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.cal-customer-chip:hover {
  background: var(--color-surface-hover);
}
.cal-more {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-align: center;
}
.cal-selected-panel {
  margin-top: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.cal-selected-header {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-elevated);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}
.cal-selected-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-2);
  padding: var(--space-3);
}
.cal-selected-item {
  padding: var(--space-2);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}
.cal-selected-item:hover {
  background: var(--color-surface-hover);
  transform: translateY(-1px);
}
.cal-selected-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
.cal-selected-info {
  font-size: 10px;
  color: var(--color-text-tertiary);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
}
.cal-selected-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}
.mono {
  font-family: var(--font-mono);
}
.level-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}
.level-A {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.level-B {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}
.level-C {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}
.status-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
}
.status-active {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-dormant {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}
@media (max-width: 1024px) {
  .cal-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  .cal-weekday-row {
    grid-template-columns: repeat(5, 1fr);
  }
  .cal-day-cell:nth-child(n + 36) {
    display: none;
  }
}
@media (max-width: 640px) {
  .cal-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .cal-weekday-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .cal-day-cell {
    min-height: 60px;
  }
}
</style>
