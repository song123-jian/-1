<template>
  <div class="ds-stat-card" :style="{ '--card-color': color }">
    <div class="ds-stat-card__glow"></div>
    <div class="ds-stat-card__content">
      <div class="ds-stat-card__header">
        <div class="ds-stat-card__icon" :style="{ background: color + '20', color: color }">
          <Icon :name="icon" :size="20" />
        </div>
        <div class="ds-stat-card__title">{{ title }}</div>
      </div>
      <div class="ds-stat-card__value">
        <span class="ds-stat-card__prefix" v-if="format === 'currency'">¥</span>
        <span class="ds-stat-card__number">{{ displayValue }}</span>
        <span class="ds-stat-card__suffix" v-if="format === 'percent'">%</span>
      </div>
      <div class="ds-stat-card__change" :class="changeClass">
        <Icon :name="change >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
        <span>{{ Math.abs(change) }}%</span>
        <span class="ds-stat-card__change-label">同比</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  value: { type: Number, default: 0 },
  icon: { type: String, default: 'circle' },
  change: { type: Number, default: 0 },
  color: { type: String, default: '#00d4ff' },
  format: { type: String, default: 'number' } // 'number' | 'currency' | 'percent'
})

const displayValue = ref(0)
let animationFrame = null

const changeClass = ref('up')
watch(() => props.change, (val) => {
  changeClass.value = val >= 0 ? 'up' : 'down'
}, { immediate: true })

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

watch(() => props.value, (newVal) => {
  const from = parseFloat(String(displayValue.value).replace(/,/g, '')) || 0
  animateValue(from, newVal, 1200)
}, { immediate: false })

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
  padding: 20px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.ds-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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

.ds-stat-card__content {
  position: relative;
  z-index: 1;
}

.ds-stat-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
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
  gap: 2px;
  margin-bottom: 12px;
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

.ds-stat-card__change {
  display: flex;
  align-items: center;
  gap: 4px;
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
  margin-left: 4px;
}
</style>
