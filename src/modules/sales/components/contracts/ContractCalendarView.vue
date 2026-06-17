<template>
  <div>
    <div v-if="currentView === 'calendar'" class="panel-card">
      <div class="panel-card-body">
        <div class="calendar-nav">
          <button class="btn btn-ghost btn-sm" @click="$emit('prevMonth')">
            <Icon name="chevronLeft" :size="14" />
            上月
          </button>
          <button class="btn btn-ghost btn-sm" @click="$emit('todayMonth')">今天</button>
          <span class="calendar-nav-title">{{ calendarMonth }}</span>
          <button class="btn btn-ghost btn-sm" @click="$emit('nextMonth')">
            下月
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
        <div class="calendar-grid">
          <div v-for="d in ['一', '二', '三', '四', '五', '六', '日']" :key="d" class="calendar-header">周{{ d }}</div>
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="calendar-cell"
            :class="{ 'other-month': !day.isCurrentMonth, 'is-today': day.isToday }"
          >
            <div class="calendar-date">{{ day.day }}</div>
            <div class="calendar-events">
              <div
                v-for="c in day.contracts.slice(0, 3)"
                :key="c.id"
                class="calendar-event"
                :class="'cal-status-' + c.status"
                :title="c.contractNo + ' ' + (statusLabels[c.status] || '') + ' ¥' + (c.totalAmount || 0)"
                @click="$emit('openPreview', c)"
              >
                <span class="cal-dot" :style="{ background: statusColors[c.status] }"></span>
                <span class="cal-text">{{ c.contractNo }}</span>
                <span class="cal-amount">¥{{ formatNumber(c.totalAmount) }}</span>
              </div>
              <div v-if="day.contracts.length > 3" class="calendar-more">+{{ day.contracts.length - 3 }}项</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentView === 'week'" class="panel-card">
      <div class="panel-card-body">
        <div class="calendar-nav">
          <button class="btn btn-ghost btn-sm" @click="$emit('prevWeek')">
            <Icon name="chevronLeft" :size="14" />
            上一周
          </button>
          <button class="btn btn-ghost btn-sm" @click="$emit('todayWeek')">今天</button>
          <span class="calendar-nav-title">{{ weekDays[0]?.date }} ~ {{ weekDays[6]?.date }}</span>
          <button class="btn btn-ghost btn-sm" @click="$emit('nextWeek')">
            下一周
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
        <div class="week-grid">
          <div v-for="day in weekDays" :key="day.date" class="week-column" :class="{ 'is-today': day.isToday }">
            <div class="week-column-header">
              <span class="week-day-label">{{ day.label }}</span>
              <span class="week-day-num">{{ day.day }}</span>
            </div>
            <div class="week-column-body">
              <div v-if="day.contracts.length === 0" class="week-empty">无合同</div>
              <div
                v-for="c in day.contracts"
                :key="c.id"
                class="week-event"
                :class="'cal-status-' + c.status"
                :title="c.partyA + ' · ' + (statusLabels[c.status] || '')"
                @click="$emit('openPreview', c)"
              >
                <div class="week-event-row">
                  <span class="cal-dot" :style="{ background: statusColors[c.status] }"></span>
                  <strong>{{ c.contractNo }}</strong>
                  <span class="week-event-party">{{ c.partyA }}</span>
                  <span class="mono week-event-amount">¥{{ formatNumber(c.totalAmount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ContractCalendarView' }
</script>
<script setup>
import { formatNumber } from '@/utils/format'
defineProps({
  currentView: { type: String, default: 'table' },
  calendarMonth: { type: String, default: '' },
  calendarDays: { type: Array, default: () => [] },
  weekDays: { type: Array, default: () => [] },
  statusLabels: { type: Object, default: () => ({}) },
  statusColors: { type: Object, default: () => ({}) }
})

defineEmits(['openPreview', 'prevMonth', 'nextMonth', 'prevWeek', 'nextWeek', 'todayMonth', 'todayWeek'])
</script>

<style scoped>
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 100%;
}
.panel-card-body {
  padding: var(--space-4);
}
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.calendar-nav-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 120px;
  text-align: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.calendar-header {
  padding: var(--space-2);
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
}
.calendar-cell {
  background: var(--color-surface);
  min-height: 90px;
  padding: var(--space-1);
  transition: background 0.2s;
}
.calendar-cell:hover {
  background: var(--color-surface-hover);
}
.calendar-cell.other-month {
  opacity: 0.4;
}
.calendar-cell.is-today {
  background: var(--color-accent-subtle);
  border: 2px solid var(--color-accent);
}
.calendar-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: var(--space-1) var(--space-1);
}
.calendar-cell.is-today .calendar-date {
  color: var(--color-accent);
  font-weight: 700;
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-full);
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.calendar-events {
  margin-top: var(--space-1);
}
.calendar-event {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-1);
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  transition:
    transform 0.15s,
    background 0.15s;
  color: var(--color-text-primary);
}
.calendar-event:hover {
  background: var(--color-bg-tertiary);
  transform: scale(1.02);
}
.cal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cal-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-more {
  font-size: 10px;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-1);
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.week-column {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}
.week-column.is-today {
  border-color: var(--color-accent);
}
.week-column-header {
  padding: var(--space-2);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.week-day-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: block;
}
.week-day-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.week-column-body {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;
}
.week-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 12px;
  padding: var(--space-5) 0;
}
.week-event {
  padding: var(--space-2) var(--space-2);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}
.week-event:hover {
  background: var(--color-bg-secondary);
  transform: translateX(2px);
}
.week-event.cal-status-signed {
  border-left-color: #22c55e;
}
.week-event.cal-status-pending_approval {
  border-left-color: #f59e0b;
}
.week-event.cal-status-approved {
  border-left-color: #3b82f6;
}
.week-event.cal-status-draft {
  border-left-color: #64748b;
}
.week-event.cal-status-archived {
  border-left-color: #06b6d4;
}
.week-event.cal-status-cancelled {
  border-left-color: #ef4444;
}
.week-event-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  margin-bottom: var(--space-1);
  color: var(--color-text-primary);
}
.week-event-detail {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.mono {
  font-family: var(--font-mono);
}
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-draft {
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}
.status-pending_approval {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}
.status-approved {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}
.status-signed {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}
.status-archived {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}
.status-cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn:hover {
  background: var(--color-bg-secondary);
}
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
}
.week-event-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
}
.week-event-party {
  color: var(--color-text-secondary);
  font-size: 11px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.week-event-amount {
  font-size: 11px;
  color: var(--color-accent);
  flex-shrink: 0;
}
.cal-amount {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-left: auto;
  flex-shrink: 0;
}
</style>
