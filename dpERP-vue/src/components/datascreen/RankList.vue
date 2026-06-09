<template>
  <div class="ds-rank-list">
    <div class="ds-rank-list__header">
      <div class="ds-rank-list__title">{{ title }}</div>
    </div>
    <div class="ds-rank-list__body">
      <div
        v-for="item in items"
        :key="item.name"
        class="ds-rank-list__item"
      >
        <div class="ds-rank-list__rank" :class="rankClass(item.rank)">
          {{ item.rank }}
        </div>
        <div class="ds-rank-list__info">
          <div class="ds-rank-list__name">{{ item.name }}</div>
          <div class="ds-rank-list__bar-wrap">
            <div
              class="ds-rank-list__bar"
              :style="{ width: barWidth(item.value) + '%', background: barColor(item.rank) }"
            ></div>
          </div>
        </div>
        <div class="ds-rank-list__value">¥{{ (item.value || 0).toLocaleString() }}</div>
      </div>
      <div v-if="items.length === 0" class="ds-rank-list__empty">暂无数据</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] } // [{name, value, rank}]
})

function rankClass(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

function barWidth(value) {
  if (!props.items.length) return 0
  const max = Math.max(...props.items.map(i => i.value || 0))
  if (max === 0) return 0
  return Math.max((value / max) * 100, 2)
}

function barColor(rank) {
  if (rank === 1) return 'linear-gradient(90deg, #ffd700, #ffaa00)'
  if (rank === 2) return 'linear-gradient(90deg, #c0c0c0, #a0a0a0)'
  if (rank === 3) return 'linear-gradient(90deg, #cd7f32, #b87333)'
  return 'linear-gradient(90deg, #00d4ff, #0088cc)'
}
</script>

<style scoped>
.ds-rank-list {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ds-rank-list__header {
  padding: 16px 20px 12px;
}

.ds-rank-list__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.ds-rank-list__body {
  flex: 1;
  padding: 0 20px 16px;
  overflow-y: auto;
}

.ds-rank-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.ds-rank-list__item:last-child {
  border-bottom: none;
}

.ds-rank-list__rank {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.ds-rank-list__rank.gold {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
}

.ds-rank-list__rank.silver {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
}

.ds-rank-list__rank.bronze {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #1a1a2e;
}

.ds-rank-list__info {
  flex: 1;
  min-width: 0;
}

.ds-rank-list__name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-rank-list__bar-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.ds-rank-list__bar {
  height: 100%;
  border-radius: 3px;
  transition: width 1s ease-out;
}

.ds-rank-list__value {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  flex-shrink: 0;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
}

.ds-rank-list__empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 24px 0;
}
</style>
