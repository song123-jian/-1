<template>
  <div class="kpi-bar">
    <TechBorder v-for="card in cards" :key="card.title" :color="card.color">
      <div class="kpi-bar__card">
        <div class="kpi-bar__header">
          <div class="kpi-bar__icon" :style="{ background: card.color + '20', color: card.color }">
            <Icon :name="card.icon" :size="18" />
          </div>
          <div class="kpi-bar__title">{{ card.title }}</div>
        </div>
        <div class="kpi-bar__value">
          <FlipNumber
            :value="card.value"
            :format="card.format"
            :color="'#fff'"
            font-size="28px"
            :prefix="card.format === 'currency' ? '¥' : ''"
            :suffix="card.format === 'percent' ? '%' : ''"
          />
        </div>
        <div class="kpi-bar__change" :class="card.change >= 0 ? 'up' : 'down'">
          <Icon :name="card.change >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
          <span>{{ Math.abs(card.change) }}%</span>
          <span class="kpi-bar__change-label">同比</span>
        </div>
      </div>
    </TechBorder>
  </div>
</template>

<script>
export default { name: 'KpiBar' }
</script>
<script setup>
import TechBorder from './TechBorder.vue'
import FlipNumber from './FlipNumber.vue'

defineProps({
  cards: { type: Array, default: () => [] }
})
</script>

<style scoped>
.kpi-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--ds-gap, 16px);
}
.kpi-bar__card {
  padding: var(--ds-space, 16px);
}
.kpi-bar__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.kpi-bar__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-bar__title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}
.kpi-bar__value {
  margin-bottom: 8px;
}
.kpi-bar__change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}
.kpi-bar__change.up {
  color: #52c41a;
}
.kpi-bar__change.down {
  color: #ff4d4f;
}
.kpi-bar__change-label {
  color: rgba(255, 255, 255, 0.35);
  margin-left: 4px;
}

@media (max-width: 1200px) {
  .kpi-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .kpi-bar {
    grid-template-columns: 1fr;
  }
}
</style>
