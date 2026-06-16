<template>
  <div class="running-bar">
    <div class="running-bar__track" @mouseenter="paused = true" @mouseleave="paused = false">
      <div class="running-bar__inner" :class="{ paused }">
        <div v-for="(item, idx) in doubledItems" :key="idx" class="running-bar__item">
          <span class="running-bar__label">{{ item.label }}</span>
          <span class="running-bar__value" :style="{ color: item.color }">{{ item.formatted }}</span>
          <span class="running-bar__sep">|</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const paused = ref(false)

const doubledItems = computed(() => {
  const formatted = props.items.map(item => ({
    ...item,
    formatted: item.format === 'currency' ? '¥' + (item.value || 0).toLocaleString() : item.format === 'percent' ? (item.value || 0).toFixed(1) + '%' : (item.value || 0).toLocaleString()
  }))
  return [...formatted, ...formatted]
})
</script>

<style scoped>
.running-bar { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 0; overflow: hidden; }
.running-bar__track { overflow: hidden; width: 100%; }
@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
.running-bar__inner { display: flex; white-space: nowrap; animation: marquee 30s linear infinite; }
.running-bar__inner.paused { animation-play-state: paused; }
.running-bar__item { display: flex; align-items: center; gap: 8px; padding: 0 20px; flex-shrink: 0; }
.running-bar__label { font-size: 12px; color: rgba(255,255,255,0.45); }
.running-bar__value { font-size: 14px; font-weight: 700; font-family: 'DIN Alternate', 'Roboto Mono', monospace; }
.running-bar__sep { font-size: 12px; color: rgba(255,255,255,0.1); margin-left: 12px; }
</style>
