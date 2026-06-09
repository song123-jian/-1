<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="warning" :size="14" /> 预警中心</span>
        <button class="btn btn-ghost btn-sm" @click="$emit('navigate', '/inbound')">查看全部</button>
      </div>
      <div class="panel-card-body">
        <div class="alert-list">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="alert-item"
            :class="'alert-' + alert.level"
          >
            <span class="alert-icon">{{ alert.level === 'danger' ? '[红色]' : alert.level === 'warning' ? '[黄圆]' : '[蓝圆]' }}</span>
            <div class="alert-content">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-desc">{{ alert.desc }}</div>
            </div>
            <span class="alert-time">{{ alert.time }}</span>
          </div>
          <div v-if="alerts.length === 0" class="alert-empty">暂无预警信息 <Icon name="check" :size="14" /></div>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">[时钟] 最近活动</span>
      </div>
      <div class="panel-card-body">
        <div class="timeline">
          <div v-for="activity in recentActivities" :key="activity.id" class="timeline-item">
            <div class="timeline-dot" :style="{ background: activity.color }"></div>
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

<script setup>
defineProps({
  alerts: { type: Array, default: () => [] },
  recentActivities: { type: Array, default: () => [] }
})

defineEmits(['navigate'])
</script>

<style scoped>
.alert-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
}
.alert-icon {
  font-size: 12px;
  margin-top: 2px;
  flex-shrink: 0;
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
  margin-top: 2px;
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
}
.timeline {
  position: relative;
  padding-left: var(--space-6);
}
.timeline-item {
  position: relative;
  padding-bottom: var(--space-4);
  display: flex;
  gap: var(--space-3);
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
  margin-top: 2px;
}
</style>
