<template>
  <div class="theme-switch">
    <button
      v-for="t in themes"
      :key="t.key"
      class="theme-switch__dot"
      :class="{ active: modelValue === t.key }"
      :style="{ background: t.color }"
      :title="t.label"
      @click="$emit('update:modelValue', t.key)"
    ></button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'dark-tech' }
})
defineEmits(['update:modelValue'])

const themes = [
  { key: 'dark-tech', label: '深蓝科技', color: '#00d4ff' },
  { key: 'gold-biz', label: '金色商务', color: '#fbbf24' },
  { key: 'cyberpunk', label: '赛博朋克', color: '#ff00ff' },
  { key: 'light-clean', label: '极简白', color: '#3b82f6' }
]
</script>

<style scoped>
.theme-switch {
  display: flex;
  gap: 8px;
  align-items: center;
}
.theme-switch__dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s;
}
.theme-switch__dot:hover {
  transform: scale(1.15);
}
.theme-switch__dot.active {
  border-color: #fff;
  box-shadow: 0 0 8px rgba(255,255,255,0.3);
  transform: scale(1.2);
}
</style>
