<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <span class="alert-title-dot" :class="worstLevel"></span>
          <Icon name="alertCircle" :size="14" />
          预警中心
        </span>
        <button class="btn btn-ghost btn-sm" @click="emit('navigate', '/inbound')">查看全部</button>
      </div>
      <div class="panel-card-body">
        <div class="alert-list">
          <div
            v-for="(alert, idx) in alerts"
            :key="alert.id"
            class="alert-item"
            :class="['alert-' + alert.level, { blink: alert.level === 'danger' }]"
            :style="{ animationDelay: idx * 80 + 'ms' }"
          >
            <span class="alert-indicator" :class="alert.level">
              <span class="alert-indicator-ring" :class="alert.level"></span>
            </span>
            <div class="alert-content">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-desc">{{ alert.desc }}</div>
            </div>
            <span class="alert-time">{{ alert.time }}</span>
          </div>
          <div v-if="alerts.length === 0" class="alert-empty">
            <Icon name="check" :size="16" />
            <span>暂无预警信息</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <span class="activity-title-dot"></span>
          <Icon name="clock" :size="14" />
          最近活动
        </span>
      </div>
      <div class="panel-card-body">
        <div class="timeline">
          <div
            v-for="(activity, idx) in recentActivities"
            :key="activity.id"
            class="timeline-item"
            :style="{ animationDelay: idx * 100 + 'ms' }"
          >
            <div
              class="timeline-dot"
              :style="{ background: activity.color, boxShadow: '0 0 8px ' + activity.color + '40' }"
            ></div>
            <div v-if="idx < recentActivities.length - 1" class="timeline-line"></div>
            <div class="timeline-content">
              <div class="timeline-text">{{ activity.text }}</div>
              <div class="timeline-time">{{ activity.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DashAlerts' }
</script>
<script setup>
import { computed } from 'vue'

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  recentActivities: { type: Array, default: () => [] }
})

defineEmits(['navigate'])

const worstLevel = computed(() => {
  if (props.alerts.some((a) => a.level === 'danger')) return 'danger'
  if (props.alerts.some((a) => a.level === 'warning')) return 'warning'
  return 'info'
})
</script>

<style scoped>
/* 预警标题指示灯 */
.alert-title-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  margin-right: var(--space-1);
  vertical-align: middle;
}

.alert-title-dot.danger {
  background: #ef4444;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.alert-title-dot.warning {
  background: #f59e0b;
}

.alert-title-dot.info {
  background: #3b82f6;
}

@keyframes dotPulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
  }
}

.activity-title-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  margin-right: var(--space-1);
  vertical-align: middle;
  box-shadow: 0 0 6px rgba(139, 92, 246, 0.4);
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  animation: alertSlideIn 0.4s ease-out both;
  transition: background 0.2s;
}

.alert-item:hover {
  background: var(--color-bg-tertiary);
}

@keyframes alertBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.alert-item.blink {
  animation:
    alertSlideIn 0.4s ease-out both,
    alertBlink 2s ease-in-out 0.5s infinite;
}

.alert-indicator {
  width: 10px;
  height: 10px;
  margin-top: var(--space-1);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-indicator-ring {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.alert-indicator-ring.danger {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  animation: ringPulseDanger 2s ease-in-out infinite;
}

.alert-indicator-ring.warning {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.3);
}

.alert-indicator-ring.info {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.3);
}

@keyframes ringPulseDanger {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
  }
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.alert-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.alert-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.alert-empty {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

/* 时间线 */
.timeline {
  position: relative;
  padding-left: var(--space-6);
}

@keyframes timelineSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.timeline-item {
  position: relative;
  padding-bottom: var(--space-4);
  display: flex;
  gap: var(--space-3);
  animation: timelineSlideIn 0.5s ease-out both;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--space-6) + 4px);
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  z-index: var(--z-base);
}

.timeline-line {
  position: absolute;
  left: calc(-1 * var(--space-6) + 7px);
  top: 16px;
  bottom: -4px;
  width: 2px;
  background: var(--color-border);
  border-radius: 1px;
}

.timeline-content {
  flex: 1;
}

.timeline-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.timeline-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
</style>
