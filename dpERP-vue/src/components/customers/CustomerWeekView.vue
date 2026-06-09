<template>
  <div class="panel-card">
    <div class="panel-card-header" style="justify-content:space-between">
      <span class="panel-card-title"><Icon name="calendar" :size="14" /> 客户周视图</span>
      <div class="cal-nav">
        <button class="dp-nav-btn" @click="custWeekPrev"><Icon name="chevronLeft" :size="14" /> 上一周</button>
        <button class="dp-today-btn" @click="custWeekGoToday">本周</button>
        <button class="dp-nav-btn" @click="custWeekNext">下一周 <Icon name="chevronRight" :size="14" /></button>
        <span class="cal-range-label">{{ custWeekRangeLabel }}</span>
      </div>
    </div>
    <div class="panel-card-body">
      <div class="cust-week-grid">
        <div
          v-for="day in custWeekDays"
          :key="day.date"
          class="cust-week-col"
          :class="{ today: day.isToday }"
        >
          <div class="cust-week-header">
            <div class="cust-week-name">{{ day.weekday }}</div>
            <div class="cust-week-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
            <div class="cust-week-date-label">{{ day.date.slice(5) }}</div>
          </div>
          <div class="cust-week-customers">
            <div
              v-for="c in day.customers"
              :key="c.id"
              class="cust-week-card"
              :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8' }"
              @click="$emit('openDetail', c)"
            >
              <div class="cust-week-card-top">
                <span class="cust-week-card-name">{{ c.fullName || c.name }}</span>
                <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
              </div>
              <div class="cust-week-card-info">
                <span v-if="c.contactName || c.contact">[用户] {{ c.contactName || c.contact }}</span>
                <span v-if="c.region"><Icon name="checkCircle" :size="14" /> {{ c.region }}</span>
              </div>
              <div class="cust-week-card-bottom">
                <span class="mono">¥{{ formatNumber(c.balance) }}</span>
                <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
              </div>
            </div>
            <div v-if="day.customers.length === 0" class="cust-week-empty">无客户</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { levelColors, levelLabel } from '@/utils/customerHelpers'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  customers: { type: Array, required: true }
})

defineEmits(['openEdit', 'openDetail'])

const calWeekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const custWeekOffset = ref(0)

const custWeekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + custWeekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayCustomers = props.customers.filter(c => c.createdAt === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: calWeekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      customers: dayCustomers
    })
  }
  return result
})

const custWeekRangeLabel = computed(() => {
  if (custWeekDays.value.length === 0) return ''
  const first = custWeekDays.value[0]
  const last = custWeekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function custWeekPrev() { custWeekOffset.value-- }
function custWeekNext() { custWeekOffset.value++ }
function custWeekGoToday() { custWeekOffset.value = 0 }
</script>

<style scoped>
.cal-nav { display: flex; align-items: center; gap: var(--space-2); }
.cal-range-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 2px 10px; border-radius: var(--radius-sm); font-weight: 600; }
.cust-week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-2); }
.cust-week-col { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); min-height: 200px; display: flex; flex-direction: column; }
.cust-week-col.today { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.cust-week-header { text-align: center; margin-bottom: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.cust-week-name { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
.cust-week-num { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); margin-top: 2px; }
.cust-week-num.is-today { color: var(--color-accent); }
.cust-week-date-label { font-size: 10px; color: var(--color-text-tertiary); margin-top: 1px; }
.cust-week-customers { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); }
.cust-week-card { padding: var(--space-2); background: var(--color-surface-elevated); border-radius: var(--radius-sm); border-left: 3px solid var(--color-border); cursor: pointer; transition: all 0.15s; }
.cust-week-card:hover { background: var(--color-surface-hover); transform: translateY(-1px); }
.cust-week-card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-1); margin-bottom: 2px; }
.cust-week-card-name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.cust-week-card-info { font-size: 10px; color: var(--color-text-tertiary); display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 2px; }
.cust-week-card-bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-1); }
.cust-week-empty { text-align: center; color: var(--color-text-tertiary); font-size: var(--font-size-sm); padding: var(--space-4) 0; }
.mono { font-family: var(--font-mono); }
.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
@media (max-width: 1024px) {
  .cust-week-grid { grid-template-columns: repeat(4, 1fr); }
  .cust-week-col:nth-child(n+5) { display: none; }
}
@media (max-width: 640px) {
  .cust-week-grid { grid-template-columns: repeat(3, 1fr); }
  .cust-week-col:nth-child(n+4) { display: none; }
}
</style>
