<template>
  <div class="flip-number" :style="cssVars">
    <span v-if="prefix" class="flip-number__prefix">{{ prefix }}</span>
    <span class="flip-number__value">{{ displayValue }}</span>
    <span v-if="suffix" class="flip-number__suffix">{{ suffix }}</span>
  </div>
</template>

<script>
export default { name: 'FlipNumber' }
</script>
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  format: { type: String, default: 'number' },
  color: { type: String, default: '#fff' },
  fontSize: { type: String, default: '28px' }
})

const displayValue = ref('0')
let animFrame = null

function formatNum(val) {
  if (props.format === 'currency') return Math.round(val).toLocaleString()
  if (props.format === 'percent') return val.toFixed(1)
  return Math.round(val).toLocaleString()
}

function animate(from, to, duration = 1200) {
  if (animFrame) cancelAnimationFrame(animFrame)
  const start = performance.now()
  const diff = to - from
  function step(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(2, -10 * progress)
    displayValue.value = formatNum(from + diff * eased)
    if (progress < 1) animFrame = requestAnimationFrame(step)
  }
  animFrame = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (newVal) => {
    const from = parseFloat(String(displayValue.value).replace(/,/g, '')) || 0
    animate(from, newVal)
  }
)

onMounted(() => animate(0, props.value, 1500))
onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})

const cssVars = { '--fn-color': props.color, '--fn-size': props.fontSize }
</script>

<style scoped>
.flip-number {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
}
.flip-number__prefix {
  font-size: calc(var(--fn-size) * 0.55);
  color: var(--fn-color);
  font-weight: 600;
  opacity: 0.85;
}
.flip-number__value {
  font-size: var(--fn-size);
  font-weight: 700;
  color: var(--fn-color);
  letter-spacing: -0.5px;
  line-height: 1;
}
.flip-number__suffix {
  font-size: calc(var(--fn-size) * 0.5);
  color: var(--fn-color);
  font-weight: 600;
  opacity: 0.85;
}
</style>
