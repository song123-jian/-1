<template>
  <div class="ds-stat-card" :style="{ '--card-color': color }">
    <div class="ds-stat-card__glow"></div>
    <div class="ds-stat-card__pulse"></div>
    <div class="ds-stat-card__content">
      <div class="ds-stat-card__header">
        <div class="ds-stat-card__icon" :style="{ background: color + '20', color: color }">
          <Icon :name="icon" :size="20" />
        </div>
        <div class="ds-stat-card__title">{{ title }}</div>
      </div>
      <div class="ds-stat-card__value">
        <span v-if="format === 'currency'" class="ds-stat-card__prefix">¥</span>
        <span class="ds-stat-card__number">{{ displayValue }}</span>
        <span v-if="format === 'percent'" class="ds-stat-card__suffix">%</span>
      </div>
      <div class="ds-stat-card__footer">
        <div class="ds-stat-card__change" :class="changeClass">
          <Icon :name="change >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
          <span>{{ Math.abs(change) }}%</span>
          <span class="ds-stat-card__change-label">同比</span>
        </div>
        <div v-if="sparkline.length > 1" class="ds-stat-card__sparkline">
          <svg :width="sparkWidth" :height="sparkHeight" :viewBox="`0 0 ${sparkWidth} ${sparkHeight}`">
            <defs>
              <linearGradient :id="'spark-grad-' + _uid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
                <stop offset="100%" :stop-color="color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="sparkAreaPath" :fill="`url(#spark-grad-${_uid})`" />
            <path
              :d="sparkLinePath"
              fill="none"
              :stroke="color"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              :cx="sparkLastPoint.x"
              :cy="sparkLastPoint.y"
              r="2.5"
              :fill="color"
              class="ds-stat-card__spark-dot"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'StatCard' }
</script>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
const _uid = instance?.uid || Math.random().toString(36).slice(2)

const props = defineProps({
  title: { type: String, default: '' },
  value: { type: Number, default: 0 },
  icon: { type: String, default: 'circle' },
  change: { type: Number, default: 0 },
  color: { type: String, default: '#00d4ff' },
  format: { type: String, default: 'number' }, // 'number' | 'currency' | 'percent'
  sparkline: { type: Array, default: () => [] }
})

const sparkWidth = 80
const sparkHeight = 28
const sparkPadding = 2

const displayValue = ref(0)
let animationFrame = null

const changeClass = ref('up')
watch(
  () => props.change,
  (val) => {
    changeClass.value = val >= 0 ? 'up' : 'down'
  },
  { immediate: true }
)

/** 迷你趋势图路径计算 */
const sparkPoints = computed(() => {
  const data = props.sparkline
  if (!data || data.length < 2) return []
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = sparkWidth - sparkPadding * 2
  const h = sparkHeight - sparkPadding * 2
  return data.map((v, i) => ({
    x: sparkPadding + (i / (data.length - 1)) * w,
    y: sparkPadding + h - ((v - min) / range) * h
  }))
})

const sparkLinePath = computed(() => {
  const pts = sparkPoints.value
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
})

const sparkAreaPath = computed(() => {
  const pts = sparkPoints.value
  if (pts.length < 2) return ''
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  return `${line} L${pts[pts.length - 1].x},${sparkHeight} L${pts[0].x},${sparkHeight} Z`
})

const sparkLastPoint = computed(() => {
  const pts = sparkPoints.value
  if (pts.length === 0) return { x: 0, y: 0 }
  return pts[pts.length - 1]
})

/** 数字滚动动画 (countUp) */
function animateValue(from, to, duration) {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  const startTime = performance.now()
  const diff = to - from

  function step(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutExpo 缓动
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
    const current = from + diff * eased

    if (props.format === 'currency') {
      displayValue.value = Math.round(current).toLocaleString()
    } else if (props.format === 'percent') {
      displayValue.value = current.toFixed(1)
    } else {
      displayValue.value = Math.round(current).toLocaleString()
    }

    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    }
  }

  animationFrame = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (newVal) => {
    const from = parseFloat(String(displayValue.value).replace(/,/g, '')) || 0
    animateValue(from, newVal, 1200)
  },
  { immediate: false }
)

onMounted(() => {
  animateValue(0, props.value, 1500)
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.ds-stat-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: var(--space-5);
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.ds-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
}

.ds-stat-card__glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--card-color), transparent);
  opacity: 0.8;
}

/* 脉冲光效 */
@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.15;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}

.ds-stat-card__pulse {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--card-color), transparent 70%);
  opacity: 0.15;
  animation: pulse-ring 4s ease-in-out infinite;
  pointer-events: none;
}

.ds-stat-card__content {
  position: relative;
  z-index: var(--z-base);
}

.ds-stat-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.ds-stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ds-stat-card__title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 500;
}

.ds-stat-card__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.ds-stat-card__prefix {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.ds-stat-card__number {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
  letter-spacing: -0.5px;
  line-height: 1;
}

.ds-stat-card__suffix {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.ds-stat-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.ds-stat-card__change {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  font-weight: 500;
}

.ds-stat-card__change.up {
  color: #52c41a;
}

.ds-stat-card__change.down {
  color: #ff4d4f;
}

.ds-stat-card__change-label {
  color: rgba(255, 255, 255, 0.4);
  margin-left: var(--space-1);
}

/* 迷你趋势图 */
.ds-stat-card__sparkline {
  flex-shrink: 0;
  opacity: 0.85;
}

@keyframes spark-pulse {
  0%,
  100% {
    r: 2.5;
    opacity: 1;
  }
  50% {
    r: 4;
    opacity: 0.6;
  }
}

.ds-stat-card__spark-dot {
  animation: spark-pulse 2s ease-in-out infinite;
}
</style>
