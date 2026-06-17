<template>
  <div class="week-view-section">
    <div class="week-view-header">
      <span class="panel-card-title">
        <Icon name="calendar" :size="14" />
        周视图
      </span>
      <div class="week-view-nav">
        <button class="dp-nav-btn" @click="$emit('weekPrev')">
          <Icon name="chevronLeft" :size="14" />
          上一周
        </button>
        <button class="dp-today-btn" @click="$emit('weekGoToday')">本周</button>
        <button class="dp-nav-btn" @click="$emit('weekNext')">
          下一周
          <Icon name="chevronRight" :size="14" />
        </button>
        <span class="week-view-range">{{ weekRangeLabel }}</span>
      </div>
    </div>
    <div class="week-view-grid">
      <div
        v-for="(day, idx) in weekDays"
        :key="day.date"
        class="week-day-col"
        :class="{ today: day.isToday, selected: day.date === dpSelectedDate }"
        :style="{ animationDelay: idx * 50 + 'ms' }"
        @click="$emit('dpSelectDate', day.date)"
      >
        <div class="week-day-header">
          <div class="week-day-name">{{ day.weekday }}</div>
          <div class="week-day-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
          <div v-if="day.todos.length > 0" class="week-day-badge">{{ day.todos.length }}</div>
        </div>
        <div class="week-day-todos">
          <div
            v-for="todo in day.todos"
            :key="todo.id"
            class="week-todo-item"
            :class="['priority-' + todo.priority, { completed: todo.status === 'completed', overdue: isOverdue(todo) }]"
            @click.stop="todoStore.toggleTodo(todo.id, todo.auto || false)"
          >
            <span class="week-todo-dot"></span>
            <span class="week-todo-title">{{ todo.title }}</span>
          </div>
          <div v-if="day.todos.length === 0" class="week-day-empty">-</div>
        </div>
        <div v-if="day.todos.length > 0" class="week-day-count">{{ day.todos.length }}项</div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DashWeekView' }
</script>
<script setup>
import { useTodoStore } from '@/stores/todo'

const todoStore = useTodoStore()

defineProps({
  weekDays: { type: Array, default: () => [] },
  dpSelectedDate: { type: String, default: '' },
  weekRangeLabel: { type: String, default: '' }
})

defineEmits(['dpSelectDate', 'weekPrev', 'weekNext', 'weekGoToday'])

function isOverdue(todo) {
  if (todo.status === 'completed') return false
  return todo.dueDate < new Date().toISOString().slice(0, 10)
}
</script>

<style scoped>
.week-view-section {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
}

.week-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-2);
}

.week-view-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.week-view-range {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.week-view-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}

@keyframes weekColIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.week-day-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-height: 140px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  animation: weekColIn 0.4s ease-out both;
}

.week-day-col:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent-subtle);
}

.week-day-col.today {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.week-day-col.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.week-day-header {
  text-align: center;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

.week-day-name {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-day-num {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: var(--space-1);
}

.week-day-num.is-today {
  color: var(--color-accent);
}

/* 今日脉冲动画 */
.week-day-col.today .week-day-num.is-today {
  animation: todayPulse 2s ease-in-out infinite;
}

@keyframes todayPulse {
  0%,
  100% {
    text-shadow: 0 0 0 transparent;
  }
  50% {
    text-shadow: 0 0 8px var(--color-accent);
  }
}

/* 待办计数 badge */
.week-day-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.week-day-todos {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow: hidden;
}

.week-todo-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-1);
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}

.week-todo-item:hover {
  background: var(--color-bg-tertiary);
}

.week-todo-item.completed {
  opacity: 0.4;
  text-decoration: line-through;
}

.week-todo-item.overdue {
  background: var(--color-danger-subtle);
}

.week-todo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.week-todo-item.priority-high .week-todo-dot {
  background: var(--color-danger);
}
.week-todo-item.priority-medium .week-todo-dot {
  background: var(--color-warning);
}
.week-todo-item.priority-low .week-todo-dot {
  background: var(--color-info);
}

.week-todo-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}

.week-day-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--space-2) 0;
}

.week-day-count {
  text-align: center;
  font-size: 10px;
  color: var(--color-accent);
  font-weight: 600;
  margin-top: var(--space-1);
  padding-top: var(--space-1);
  border-top: 1px solid var(--color-border);
}

.dp-nav-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
  transition: all 0.15s;
}

.dp-nav-btn:hover {
  background: var(--color-accent-subtle);
}

.dp-today-btn {
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
}

.dp-today-btn:hover {
  background: var(--color-accent);
  color: #fff;
}

@media (max-width: 1024px) {
  .week-view-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .week-day-col:nth-child(n + 5) {
    display: none;
  }
}
@media (max-width: 640px) {
  .week-view-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .week-day-col:nth-child(n + 4) {
    display: none;
  }
}
</style>
