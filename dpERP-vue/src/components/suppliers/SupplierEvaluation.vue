<template>
  <div class="supplier-evaluation">
    <div class="eval-header">
      <h4 class="eval-title">供应商评估</h4>
      <div class="eval-rating">
        <span class="eval-rating-label">综合评级:</span>
        <span v-for="i in 5" :key="i" class="eval-star" :class="{ active: i <= computedRating }">
          <Icon name="star" :size="16" />
        </span>
        <span class="eval-score">{{ compositeScore.toFixed(1) }}</span>
      </div>
    </div>

    <div class="eval-dimensions">
      <div v-for="dim in dimensions" :key="dim.key" class="eval-dimension">
        <div class="eval-dim-header">
          <span class="eval-dim-label">{{ dim.label }}</span>
          <span class="eval-dim-value">{{ dim.value }}</span>
        </div>
        <div class="eval-slider-wrap">
          <input
            type="range"
            :min="0"
            :max="100"
            :value="dim.value"
            class="eval-slider"
            :style="{ '--slider-color': dim.color }"
            @input="onSliderInput(dim.key, $event)"
          />
          <div class="eval-slider-track">
            <div class="eval-slider-fill" :style="{ width: dim.value + '%', background: dim.color }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 雷达图模拟 -->
    <div class="eval-radar">
      <div class="radar-container">
        <svg viewBox="0 0 200 200" class="radar-svg">
          <!-- 背景网格 -->
          <polygon v-for="level in 4" :key="'bg' + level"
            :points="getPolygonPoints(level * 25)"
            fill="none"
            stroke="var(--color-border)"
            stroke-width="0.5"
          />
          <!-- 轴线 -->
          <line v-for="(_, idx) in dimensions" :key="'axis' + idx"
            x1="100" y1="100"
            :x2="getAxisEnd(idx).x" :y2="getAxisEnd(idx).y"
            stroke="var(--color-border)"
            stroke-width="0.5"
          />
          <!-- 数据区域 -->
          <polygon
            :points="getDataPoints()"
            fill="var(--color-accent-subtle)"
            stroke="var(--color-accent)"
            stroke-width="1.5"
          />
          <!-- 数据点 -->
          <circle v-for="(pt, idx) in getDataPointCoords()" :key="'pt' + idx"
            :cx="pt.x" :cy="pt.y" r="3"
            fill="var(--color-accent)"
          />
        </svg>
        <div class="radar-labels">
          <span v-for="(dim, idx) in dimensions" :key="'label' + idx"
            class="radar-label"
            :style="getLabelStyle(idx)"
          >{{ dim.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  supplier: { type: Object, required: true }
})

const emit = defineEmits(['update'])

const scores = reactive({
  deliveryScore: props.supplier.deliveryScore || 70,
  qualityScore: props.supplier.qualityScore || 70,
  priceScore: props.supplier.priceScore || 70,
  serviceScore: props.supplier.serviceScore || 70
})

const dimensions = computed(() => [
  { key: 'deliveryScore', label: '交货', value: scores.deliveryScore, color: '#3b82f6' },
  { key: 'qualityScore', label: '质量', value: scores.qualityScore, color: '#22c55e' },
  { key: 'priceScore', label: '价格', value: scores.priceScore, color: '#f59e0b' },
  { key: 'serviceScore', label: '服务', value: scores.serviceScore, color: '#a855f7' }
])

/* 加权平均: 交货30% 质量35% 价格20% 服务15% */
const compositeScore = computed(() => {
  return scores.deliveryScore * 0.3 +
    scores.qualityScore * 0.35 +
    scores.priceScore * 0.2 +
    scores.serviceScore * 0.15
})

const computedRating = computed(() => {
  const s = compositeScore.value
  if (s >= 90) return 5
  if (s >= 80) return 4
  if (s >= 70) return 3
  if (s >= 60) return 2
  return 1
})

function onSliderInput(key, event) {
  scores[key] = parseInt(event.target.value, 10)
  emit('update', { ...scores, rating: computedRating.value })
}

/* 雷达图计算 */
const CENTER = 100
const RADIUS = 70
const ANGLES = [-90, 0, 90, 180] // 上右下左

function getAxisEnd(idx) {
  const angle = ANGLES[idx] * Math.PI / 180
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle)
  }
}

function getPolygonPoints(percent) {
  return ANGLES.map((angle, idx) => {
    const rad = angle * Math.PI / 180
    const r = RADIUS * percent / 100
    return `${CENTER + r * Math.cos(rad)},${CENTER + r * Math.sin(rad)}`
  }).join(' ')
}

function getDataPoints() {
  const values = [scores.deliveryScore, scores.qualityScore, scores.priceScore, scores.serviceScore]
  return ANGLES.map((angle, idx) => {
    const rad = angle * Math.PI / 180
    const r = RADIUS * values[idx] / 100
    return `${CENTER + r * Math.cos(rad)},${CENTER + r * Math.sin(rad)}`
  }).join(' ')
}

function getDataPointCoords() {
  const values = [scores.deliveryScore, scores.qualityScore, scores.priceScore, scores.serviceScore]
  return ANGLES.map((angle, idx) => {
    const rad = angle * Math.PI / 180
    const r = RADIUS * values[idx] / 100
    return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
  })
}

function getLabelStyle(idx) {
  const angle = ANGLES[idx] * Math.PI / 180
  const r = RADIUS + 20
  const x = CENTER + r * Math.cos(angle)
  const y = CENTER + r * Math.sin(angle)
  return {
    left: x + 'px',
    top: y + 'px',
    transform: 'translate(-50%, -50%)'
  }
}
</script>

<style scoped>
.supplier-evaluation {
  padding: var(--space-4);
}
.eval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}
.eval-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}
.eval-rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.eval-rating-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-right: var(--space-2);
}
.eval-star {
  color: var(--color-border);
  transition: color var(--transition-fast);
}
.eval-star.active {
  color: #f59e0b;
}
.eval-score {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-accent);
  margin-left: var(--space-2);
  font-family: var(--font-mono);
}
.eval-dimensions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.eval-dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}
.eval-dim-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.eval-dim-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.eval-slider-wrap {
  position: relative;
  height: 20px;
}
.eval-slider {
  position: absolute;
  width: 100%;
  height: 20px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  z-index: 1;
  margin: 0;
}
.eval-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--slider-color, var(--color-accent));
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.eval-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--slider-color, var(--color-accent));
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.eval-slider-track {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.eval-slider-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-fast);
}
.eval-radar {
  display: flex;
  justify-content: center;
  padding: var(--space-4) 0;
}
.radar-container {
  position: relative;
  width: 200px;
  height: 200px;
}
.radar-svg {
  width: 100%;
  height: 100%;
}
.radar-labels {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.radar-label {
  position: absolute;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}
</style>
