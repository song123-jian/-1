<template>
  <div class="scene-tab">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="scene-tab__btn"
      :class="{ active: modelValue === tab.key }"
      @click="$emit('update:modelValue', tab.key)"
    >
      <Icon :name="tab.icon" :size="14" />
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'overview' }
})
defineEmits(['update:modelValue'])

const tabs = [
  { key: 'sales', label: '销售', icon: 'trendUp' },
  { key: 'inventory', label: '库存', icon: 'package' },
  { key: 'finance', label: '财务', icon: 'dollar' },
  { key: 'overview', label: '综合', icon: 'grid' }
]
</script>

<style scoped>
.scene-tab {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 3px;
}
.scene-tab__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s;
}
.scene-tab__btn:hover {
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.06);
}
.scene-tab__btn.active {
  color: #fff;
  background: rgba(0, 212, 255, 0.15);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.2);
}
</style>
