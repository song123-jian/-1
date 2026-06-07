<template>
  <div class="production-schedule">
    <div class="schedule-header">
      <div class="schedule-title">
        <Icon name="calendar" :size="14" /> 生产排程甘特图
      </div>
      <div class="schedule-controls">
        <button class="btn btn-ghost btn-sm" @click="scrollLeft"><Icon name="chevronLeft" :size="14" /></button>
        <span class="schedule-range">{{ dateRangeLabel }}</span>
        <button class="btn btn-ghost btn-sm" @click="scrollRight"><Icon name="chevronRight" :size="14" /></button>
      </div>
    </div>

    <div class="schedule-body" ref="scheduleBody">
      <!-- 日期轴 -->
      <div class="schedule-timeline">
        <div class="schedule-label-col"></div>
        <div class="schedule-dates">
          <div
            v-for="date in dateList"
            :key="date.value"
            class="schedule-date-cell"
            :class="{ weekend: date.isWeekend, today: date.isToday }"
          >
            <span class="date-day">{{ date.day }}</span>
            <span class="date-weekday">{{ date.weekday }}</span>
          </div>
        </div>
      </div>

      <!-- 工单行 -->
      <div v-if="scheduleOrders.length === 0" class="schedule-empty">暂无排程数据</div>
      <div
        v-for="order in scheduleOrders"
        :key="order.id"
        class="schedule-row"
      >
        <div class="schedule-label-col">
          <span class="schedule-order-no">{{ order.orderNo }}</span>
          <span class="schedule-product-name">{{ order.productName }}</span>
        </div>
        <div class="schedule-bars">
          <div
            v-for="date in dateList"
            :key="date.value"
            class="schedule-cell"
            :class="{ weekend: date.isWeekend, today: date.isToday }"
          ></div>
          <!-- 进度条 -->
          <div
            class="schedule-bar"
            :class="'bar-' + order.status"
            :style="barStyle(order)"
            :title="barTooltip(order)"
          >
            <div class="bar-progress" :style="{ width: order.progress + '%' }"></div>
            <span class="bar-label">{{ order.progress }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="schedule-legend">
      <span class="legend-item"><span class="legend-dot" style="background:var(--color-text-tertiary)"></span> 已计划</span>
      <span class="legend-item"><span class="legend-dot" style="background:var(--color-info)"></span> 已下达</span>
      <span class="legend-item"><span class="legend-dot" style="background:var(--color-accent)"></span> 生产中</span>
      <span class="legend-item"><span class="legend-dot" style="background:var(--color-warning)"></span> 质检中</span>
      <span class="legend-item"><span class="legend-dot" style="background:var(--color-success)"></span> 已完成</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  orders: { type: Array, default: () => [] }
})

const scheduleBody = ref(null)
const viewOffset = ref(0)
const VIEW_DAYS = 21

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/* 过滤出有日期的工单 */
const scheduleOrders = computed(() => {
  return props.orders.filter(o => o.plannedStartDate && o.plannedEndDate && o.status !== 'cancelled')
})

/* 日期列表 */
const dateList = computed(() => {
  const start = new Date()
  start.setDate(start.getDate() + viewOffset.value - 3)
  const dates = []
  for (let i = 0; i < VIEW_DAYS; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    dates.push({
      value: d.toISOString().split('T')[0],
      day: d.getDate(),
      weekday: WEEKDAYS[d.getDay()],
      isWeekend,
      isToday,
      date: d
    })
  }
  return dates
})

/* 日期范围标签 */
const dateRangeLabel = computed(() => {
  if (dateList.value.length === 0) return ''
  const first = dateList.value[0].value
  const last = dateList.value[dateList.value.length - 1].value
  return first + ' ~ ' + last
})

/* 计算进度条位置 */
function barStyle(order) {
  if (dateList.value.length === 0) return { display: 'none' }

  const firstDate = new Date(dateList.value[0].value)
  const totalDays = VIEW_DAYS
  const cellWidth = 100 / totalDays

  const startDate = new Date(order.plannedStartDate)
  const endDate = new Date(order.plannedEndDate)

  const startOffset = Math.max(0, (startDate - firstDate) / (1000 * 60 * 60 * 24))
  const duration = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24) + 1)

  const left = startOffset * cellWidth
  const width = Math.min(duration * cellWidth, 100 - left)

  return {
    left: left + '%',
    width: Math.max(width, cellWidth) + '%'
  }
}

function barTooltip(order) {
  return `${order.productName} | ${order.plannedStartDate} ~ ${order.plannedEndDate} | 进度: ${order.progress}%`
}

function scrollLeft() {
  viewOffset.value -= 7
}

function scrollRight() {
  viewOffset.value += 7
}
</script>

<style scoped>
.production-schedule {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}

.schedule-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.schedule-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.schedule-range {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 200px;
  text-align: center;
}

.schedule-body {
  overflow-x: auto;
}

.schedule-timeline {
  display: flex;
  border-bottom: 2px solid var(--color-border);
}

.schedule-label-col {
  width: 160px;
  min-width: 160px;
  padding: var(--space-2) var(--space-3);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}

.schedule-dates {
  display: flex;
  flex: 1;
}

.schedule-date-cell {
  min-width: 40px;
  flex: 1;
  text-align: center;
  padding: var(--space-1);
  border-right: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
}

.schedule-date-cell.weekend {
  background: var(--color-surface-hover);
}

.schedule-date-cell.today {
  background: var(--color-accent-subtle);
}

.date-day {
  display: block;
  font-weight: 600;
  color: var(--color-text-primary);
}

.date-weekday {
  display: block;
  color: var(--color-text-tertiary);
  font-size: 10px;
}

.schedule-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  min-height: 40px;
}

.schedule-row:hover {
  background: var(--color-surface-hover);
}

.schedule-label-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.schedule-order-no {
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.schedule-product-name {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schedule-bars {
  position: relative;
  display: flex;
  flex: 1;
}

.schedule-cell {
  min-width: 40px;
  flex: 1;
  border-right: 1px solid var(--color-border);
}

.schedule-cell.weekend {
  background: rgba(255, 255, 255, 0.02);
}

.schedule-cell.today {
  background: var(--color-accent-subtle);
}

.schedule-bar {
  position: absolute;
  top: 6px;
  bottom: 6px;
  border-radius: var(--radius-sm);
  background: var(--color-text-tertiary);
  opacity: 0.3;
  overflow: hidden;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.schedule-bar:hover {
  opacity: 0.8;
}

.schedule-bar.bar-planned { background: var(--color-text-tertiary); opacity: 0.4; }
.schedule-bar.bar-released { background: var(--color-info); opacity: 0.5; }
.schedule-bar.bar-in_progress { background: var(--color-accent); opacity: 0.6; }
.schedule-bar.bar-quality_check { background: var(--color-warning); opacity: 0.6; }
.schedule-bar.bar-completed { background: var(--color-success); opacity: 0.6; }

.bar-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: currentColor;
  opacity: 0.4;
  border-radius: var(--radius-sm);
}

.bar-planned .bar-progress { background: var(--color-text-tertiary); }
.bar-released .bar-progress { background: var(--color-info); }
.bar-in_progress .bar-progress { background: var(--color-accent); }
.bar-quality_check .bar-progress { background: var(--color-warning); }
.bar-completed .bar-progress { background: var(--color-success); }

.bar-label {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.schedule-empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.schedule-legend {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}
</style>
