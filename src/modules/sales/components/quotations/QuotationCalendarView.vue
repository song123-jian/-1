<template>
  <div v-if="currentView === 'calendar'" class="panel-card">
    <div class="panel-card-body">
      <div class="calendar-nav">
        <button class="btn btn-secondary btn-sm" @click="calMonth--"><Icon name="chevronLeft" :size="14" /></button>
        <span class="calendar-month-label"><Icon name="calendar" :size="14" /> {{ calYear }}年{{ calMonth }}月</span>
        <button class="btn btn-secondary btn-sm" @click="calMonth++"><Icon name="chevronRight" :size="14" /></button>
        <button class="btn btn-ghost btn-sm" @click="calYear = new Date().getFullYear(); calMonth = new Date().getMonth() + 1"><Icon name="mapPin" :size="14" /> 今天</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-header-cell" v-for="d in ['周一','周二','周三','周四','周五','周六','周日']" :key="d">{{ d }}</div>
        <div v-for="(day, idx) in calendarDays" :key="idx" class="calendar-cell" :class="{ 'other-month': !day.currentMonth, 'today': day.isToday }">
          <div class="calendar-day-num">{{ day.day || '' }}</div>
          <div class="calendar-events">
            <div v-for="q in day.quotations" :key="q.id" class="calendar-event" :class="'cal-status-' + q.status" @click="$emit('edit', q)" :title="q.quoteNo + ' ' + q.customerName">
              <Icon name="checkCircle" :size="14" /> {{ q.quoteNo.slice(-3) }} {{ q.customerName }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="currentView === 'week'" class="panel-card">
    <div class="panel-card-body">
      <div class="calendar-nav">
        <button class="btn btn-secondary btn-sm" @click="weekPrev"><Icon name="chevronLeft" :size="14" /></button>
        <span class="calendar-month-label"><Icon name="calendar" :size="14" /> {{ weekRangeLabel }}</span>
        <button class="btn btn-secondary btn-sm" @click="weekNext"><Icon name="chevronRight" :size="14" /></button>
        <button class="btn btn-ghost btn-sm" @click="weekToday"><Icon name="mapPin" :size="14" /> 本周</button>
      </div>
      <div class="week-grid">
        <div v-for="day in weekDays" :key="day.date" class="week-column" :class="{ 'week-today': day.isToday }">
          <div class="week-column-header">
            <span class="week-weekday">{{ day.weekday }}</span>
            <span class="week-date-num" :class="{ 'week-date-num-today': day.isToday }">{{ day.day }}</span>
          </div>
          <div class="week-column-body">
            <div v-if="day.quotations.length === 0" class="week-empty"><Icon name="empty" :size="32" /> 无报价</div>
            <div v-for="q in day.quotations" :key="q.id" class="week-event" :class="'cal-status-' + q.status" @click="$emit('edit', q)">
              <div class="week-event-header">
                <span class="week-event-id"><Icon name="checkCircle" :size="14" /> {{ q.quoteNo }}</span>
                <span class="week-event-status" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
              </div>
              <div class="week-event-customer"><Icon name="building" :size="14" /> {{ q.customerName }}</div>
              <div class="week-event-amount"><Icon name="dollar" :size="14" /> ¥{{ (q.totalAmount || 0).toLocaleString('zh-CN') }}</div>
              <div v-if="q.margin" class="week-event-margin"><Icon name="chevronDown" :size="14" /> 利润率 {{ q.margin }}%</div>
            </div>
          </div>
        </div>
      </div>
      <div class="week-summary">
        <span><Icon name="table" :size="14" /> 本周报价: <strong>{{ weekDays.reduce((s, d) => s + d.quotations.length, 0) }}</strong> 条</span>
        <span><Icon name="dollar" :size="14" /> 总金额: <strong>¥{{ weekDays.reduce((s, d) => s + d.quotations.reduce((a, q) => a + (q.totalAmount || 0), 0), 0).toLocaleString('zh-CN') }}</strong></span>
        <span><Icon name="trendUp" :size="14" /> 日均: <strong>¥{{ Math.round(weekDays.reduce((s, d) => s + d.quotations.reduce((a, q) => a + (q.totalAmount || 0), 0), 0) / 7).toLocaleString('zh-CN') }}</strong></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  currentView: String,
  quotations: Array
})

defineEmits(['edit'])

const statusLabels = {
  draft: '草稿', pending: '待审批', approved: '已审批',
  sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期'
}

const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth() + 1)

watch(calMonth, (newVal) => {
  if (newVal < 1) { calMonth.value = 12; calYear.value-- }
  else if (newVal > 12) { calMonth.value = 1; calYear.value++ }
})
const weekStartDate = ref(getMonday(new Date()))

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const weekDays = computed(() => {
  const monday = new Date(weekStartDate.value)
  const today = new Date().toISOString().split('T')[0]
  const days = []
  const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dateStr === today
    const dayQuotes = props.quotations.filter(q => q.date === dateStr)
    days.push({
      date: dateStr,
      day: d.getDate(),
      month: d.getMonth() + 1,
      weekday: weekLabels[i],
      isToday,
      quotations: dayQuotes
    })
  }
  return days
})

const weekRangeLabel = computed(() => {
  const days = weekDays.value
  if (!days.length) return ''
  const s = days[0]
  const e = days[6]
  return s.month + '月' + s.day + '日 — ' + e.month + '月' + e.day + '日'
})

function weekPrev() { weekStartDate.value = new Date(weekStartDate.value.getTime() - 7 * 86400000) }
function weekNext() { weekStartDate.value = new Date(weekStartDate.value.getTime() + 7 * 86400000) }
function weekToday() { weekStartDate.value = getMonday(new Date()) }

const calendarDays = computed(() => {
  const y = calYear.value
  const m = calMonth.value
  if (m < 1) return []
  if (m > 12) return []
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]
  const days = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    days.push({ day, currentMonth: false, isToday: false, quotations: [] })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    const isToday = dateStr === today
    const dayQuotes = props.quotations.filter(q => q.date === dateStr)
    days.push({ day: d, currentMonth: true, isToday, quotations: dayQuotes })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, currentMonth: false, isToday: false, quotations: [] })
  }
  return days
})
</script>

<style scoped>
.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.panel-card-body { padding: var(--space-4); }
.btn { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-secondary:hover { background: var(--color-bg-tertiary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs); }
.calendar-nav { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.calendar-month-label { font-size: var(--font-size-lg); font-weight: 700; min-width: 120px; text-align: center; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.calendar-header-cell { padding: var(--space-2); text-align: center; font-weight: 600; font-size: var(--font-size-sm); background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); }
.calendar-cell { min-height: 80px; padding: var(--space-1); border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.calendar-cell:nth-child(7n) { border-right: none; }
.calendar-cell.other-month { background: var(--color-bg-tertiary); opacity: 0.5; }
.calendar-cell.today { background: var(--color-accent-subtle, #eff6ff); }
.calendar-day-num { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--space-1); }
.calendar-events { display: flex; flex-direction: column; gap: var(--space-1); }
.calendar-event { font-size: 10px; padding: var(--space-1) var(--space-1); border-radius: 3px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; display: flex; align-items: center; gap: var(--space-1); }
.cal-status-draft { background: #64748b; }
.cal-status-pending { background: #f59e0b; }
.cal-status-approved { background: #3b82f6; }
.cal-status-sent { background: #06b6d4; }
.cal-status-accepted { background: #22c55e; }
.cal-status-rejected { background: #ef4444; }
.cal-status-expired { background: #94a3b8; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-1); background: var(--color-border); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.week-column { background: var(--color-surface); display: flex; flex-direction: column; min-height: 400px; }
.week-column.week-today { background: var(--color-accent-subtle, #eff6ff); }
.week-column-header { padding: var(--space-3) var(--space-2); text-align: center; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); display: flex; flex-direction: column; align-items: center; gap: var(--space-1); }
.week-weekday { font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-weight: 600; }
.week-date-num { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); line-height: 1.2; }
.week-date-num-today { color: var(--color-accent); background: var(--color-accent); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); }
.week-column-body { padding: var(--space-2); flex: 1; display: flex; flex-direction: column; gap: var(--space-2); overflow-y: auto; }
.week-empty { font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-align: center; padding: var(--space-4) 0; }
.week-event { padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; border-left: 3px solid transparent; background: var(--color-surface); }
.week-event:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.week-event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1); }
.week-event-id { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: var(--space-1); }
.week-event-status { font-size: 9px; padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-weight: 600; }
.week-event-status.status-draft { background: rgba(100,116,139,0.15); color: #64748b; }
.week-event-status.status-pending { background: rgba(245,158,11,0.15); color: #d97706; }
.week-event-status.status-approved { background: rgba(59,130,246,0.15); color: #3b82f6; }
.week-event-status.status-sent { background: rgba(6,182,212,0.15); color: #06b6d4; }
.week-event-status.status-accepted { background: rgba(34,197,94,0.15); color: #22c55e; }
.week-event-status.status-rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
.week-event-status.status-expired { background: rgba(148,163,184,0.15); color: #94a3b8; }
.week-event-customer { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: var(--space-1); }
.week-event-amount { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-accent); display: flex; align-items: center; gap: var(--space-1); }
.week-event-margin { font-size: var(--font-size-xs); color: var(--color-text-tertiary); display: flex; align-items: center; gap: var(--space-1); }
.week-summary { display: flex; gap: var(--space-6); padding: var(--space-3) var(--space-4); background: var(--color-bg-secondary); border-radius: var(--radius-md); margin-top: var(--space-4); font-size: var(--font-size-base); color: var(--color-text-secondary); }
.week-summary strong { color: var(--color-text-primary); }
@media (max-width: 768px) {
  .week-grid { grid-template-columns: 1fr; }
  .week-column { min-height: auto; }
  .week-summary { flex-direction: column; gap: var(--space-2); }
}
</style>
