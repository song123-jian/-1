<template>
  <div class="ds-alert-list">
    <div class="ds-alert-list__header">
      <div class="ds-alert-list__title">
        <span class="ds-alert-list__title-dot" :class="worstLevel"></span>
        {{ title }}
      </div>
      <div class="ds-alert-list__stats" v-if="alerts.length > 0">
        <span class="ds-alert-list__badge critical" v-if="criticalCount > 0">
          <span class="ds-alert-list__badge-dot critical"></span>
          {{ criticalCount }}
        </span>
        <span class="ds-alert-list__badge warning" v-if="warningCount > 0">
          <span class="ds-alert-list__badge-dot warning"></span>
          {{ warningCount }}
        </span>
        <span class="ds-alert-list__badge info" v-if="infoCount > 0">
          <span class="ds-alert-list__badge-dot info"></span>
          {{ infoCount }}
        </span>
      </div>
    </div>
    <div class="ds-alert-list__body" ref="scrollBody">
      <div
        v-for="(alert, idx) in alerts"
        :key="idx"
        class="ds-alert-list__item"
        :class="[alert.level, { blink: alert.level === 'critical' }]"
        :style="{ animationDelay: idx * 60 + 'ms' }"
      >
        <div class="ds-alert-list__indicator" :class="alert.level">
          <div class="ds-alert-list__indicator-ring" :class="alert.level"></div>
        </div>
        <div class="ds-alert-list__content">
          <div class="ds-alert-list__message">{{ alert.message }}</div>
          <div class="ds-alert-list__time">{{ formatTime(alert.time) }}</div>
        </div>
        <div class="ds-alert-list__type-badge" :class="alert.type">
          {{ typeLabel(alert.type) }}
        </div>
      </div>
      <div v-if="alerts.length === 0" class="ds-alert-list__empty">
        <Icon name="check" :size="20" />
        <span>暂无预警</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '预警中心' },
  alerts: { type: Array, default: () => [] } // [{type, message, time, level}]
})

const scrollBody = ref(null)
let scrollTimer = null

const criticalCount = computed(() => props.alerts.filter(a => a.level === 'critical').length)
const warningCount = computed(() => props.alerts.filter(a => a.level === 'warning').length)
const infoCount = computed(() => props.alerts.filter(a => a.level === 'info').length)

const worstLevel = computed(() => {
  if (criticalCount.value > 0) return 'critical'
  if (warningCount.value > 0) return 'warning'
  return 'info'
})

function typeLabel(type) {
  const map = {
    inventory: '库存',
    receivable: '应收',
    contract: '合同',
    quotation: '报价',
    delivery: '送货'
  }
  return map[type] || type
}

function formatTime(time) {
  if (!time) return ''
  // 简化日期显示
  const today = new Date().toISOString().split('T')[0]
  if (time === today) return '今天'
  if (time.startsWith(today.slice(0, 7))) return time.slice(8) + '日'
  return time
}

/** 自动滚动效果 */
onMounted(() => {
  if (!scrollBody.value) return
  const el = scrollBody.value
  let scrollDir = 1

  scrollTimer = setInterval(() => {
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      scrollDir = -1
    } else if (el.scrollTop <= 0) {
      scrollDir = 1
    }
    el.scrollTop += scrollDir * 0.5
  }, 50)
})

onUnmounted(() => {
  if (scrollTimer) clearInterval(scrollTimer)
})
</script>

<style scoped>
.ds-alert-list {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s ease;
}

.ds-alert-list:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.ds-alert-list__header {
  padding: 16px 20px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ds-alert-list__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 8px;
}

.ds-alert-list__title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
}

.ds-alert-list__title-dot.critical {
  background: #ff4d4f;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.5);
  animation: dot-blink 1.5s ease-in-out infinite;
}

.ds-alert-list__title-dot.warning {
  background: #faad14;
  box-shadow: 0 0 8px rgba(250, 173, 20, 0.5);
}

.ds-alert-list__title-dot.info {
  background: #1890ff;
  box-shadow: 0 0 8px rgba(24, 144, 255, 0.5);
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ds-alert-list__stats {
  display: flex;
  gap: 6px;
}

.ds-alert-list__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  padding: 0 6px;
}

.ds-alert-list__badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.ds-alert-list__badge.critical {
  background: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
}

.ds-alert-list__badge.warning {
  background: rgba(250, 173, 20, 0.2);
  color: #faad14;
}

.ds-alert-list__badge.info {
  background: rgba(24, 144, 255, 0.2);
  color: #1890ff;
}

.ds-alert-list__badge-dot.critical { background: #ff4d4f; }
.ds-alert-list__badge-dot.warning { background: #faad14; }
.ds-alert-list__badge-dot.info { background: #1890ff; }

.ds-alert-list__body {
  flex: 1;
  padding: 0 20px 16px;
  overflow-y: auto;
  max-height: 280px;
}

.ds-alert-list__body::-webkit-scrollbar {
  width: 4px;
}

.ds-alert-list__body::-webkit-scrollbar-track {
  background: transparent;
}

.ds-alert-list__body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

/* 入场动画 */
@keyframes alertSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.ds-alert-list__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s;
  animation: alertSlideIn 0.4s ease-out both;
}

.ds-alert-list__item:last-child {
  border-bottom: none;
}

.ds-alert-list__item:hover {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding-left: 4px;
  padding-right: 4px;
}

/* 闪烁动画 - critical级别 */
@keyframes alertBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.ds-alert-list__item.blink {
  animation: alertSlideIn 0.4s ease-out both, alertBlink 2s ease-in-out 0.5s infinite;
}

.ds-alert-list__indicator {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ds-alert-list__indicator-ring {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ds-alert-list__indicator-ring.critical {
  background: #ff4d4f;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.5);
  animation: ring-pulse-critical 2s ease-in-out infinite;
}

.ds-alert-list__indicator-ring.warning {
  background: #faad14;
  box-shadow: 0 0 6px rgba(250, 173, 20, 0.3);
}

.ds-alert-list__indicator-ring.info {
  background: #1890ff;
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.3);
}

@keyframes ring-pulse-critical {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 77, 79, 0.4); }
  50% { box-shadow: 0 0 12px rgba(255, 77, 79, 0.7); }
}

.ds-alert-list__content {
  flex: 1;
  min-width: 0;
}

.ds-alert-list__message {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.ds-alert-list__time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 2px;
}

.ds-alert-list__type-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 500;
}

.ds-alert-list__type-badge.inventory {
  background: rgba(19, 194, 194, 0.15);
  color: #13c2c2;
}

.ds-alert-list__type-badge.receivable {
  background: rgba(235, 47, 150, 0.15);
  color: #eb2f96;
}

.ds-alert-list__type-badge.contract {
  background: rgba(114, 46, 209, 0.15);
  color: #722ed1;
}

.ds-alert-list__type-badge.quotation {
  background: rgba(24, 144, 255, 0.15);
  color: #1890ff;
}

.ds-alert-list__type-badge.delivery {
  background: rgba(250, 140, 22, 0.15);
  color: #fa8c16;
}

.ds-alert-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 32px 0;
}
</style>
