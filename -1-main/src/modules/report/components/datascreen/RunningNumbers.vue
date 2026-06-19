<template>
  <div class="ds-running-numbers">
    <div class="ds-running-numbers__track">
      <div class="ds-running-numbers__inner" :class="{ 'is-paused': isPaused }">
        <div v-for="(item, idx) in doubledItems" :key="idx" class="ds-running-numbers__item">
          <span class="ds-running-numbers__label">{{ item.label }}</span>
          <span class="ds-running-numbers__value" :style="{ color: item.color }">{{ item.formatted }}</span>
          <span class="ds-running-numbers__sep">|</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'RunningNumbers' }
</script>
<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] } // [{label, value, color, format}]
})

const isPaused = ref(false)
let trackEl = null
const onMouseEnter = () => {
  isPaused.value = true
}
const onMouseLeave = () => {
  isPaused.value = false
}

const doubledItems = computed(() => {
  const formatted = props.items.map((item) => ({
    ...item,
    formatted:
      item.format === 'currency'
        ? '¥' + (item.value || 0).toLocaleString()
        : item.format === 'percent'
          ? (item.value || 0).toFixed(1) + '%'
          : (item.value || 0).toLocaleString()
  }))
  // 重复一次实现无缝滚动
  return [...formatted, ...formatted]
})

onMounted(() => {
  // 鼠标悬停暂停
  trackEl = document.querySelector('.ds-running-numbers__track')
  if (trackEl) {
    trackEl.addEventListener('mouseenter', onMouseEnter)
    trackEl.addEventListener('mouseleave', onMouseLeave)
  }
})

onUnmounted(() => {
  if (trackEl) {
    trackEl.removeEventListener('mouseenter', onMouseEnter)
    trackEl.removeEventListener('mouseleave', onMouseLeave)
  }
})
</script>

<style scoped>
.ds-running-numbers {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: var(--space-2) 0;
  overflow: hidden;
}

.ds-running-numbers__track {
  overflow: hidden;
  width: 100%;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.ds-running-numbers__inner {
  display: flex;
  white-space: nowrap;
  animation: marquee 30s linear infinite;
}

.ds-running-numbers__inner.is-paused {
  animation-play-state: paused;
}

.ds-running-numbers__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-5);
  flex-shrink: 0;
}

.ds-running-numbers__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.ds-running-numbers__value {
  font-size: 14px;
  font-weight: 700;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
}

.ds-running-numbers__sep {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.1);
  margin-left: var(--space-3);
}
</style>
