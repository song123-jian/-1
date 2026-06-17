<template>
  <div class="ds-rank-list">
    <div class="ds-rank-list__header">
      <div class="ds-rank-list__title">
        <span class="ds-rank-list__title-dot"></span>
        {{ title }}
      </div>
    </div>
    <div class="ds-rank-list__body">
      <div
        v-for="(item, idx) in items"
        :key="item.name"
        class="ds-rank-list__item"
        :style="{ animationDelay: idx * 80 + 'ms' }"
      >
        <div class="ds-rank-list__rank" :class="rankClass(item.rank)">
          <span v-if="item.rank <= 3" class="ds-rank-list__rank-icon">{{ rankIcon(item.rank) }}</span>
          <span v-else>{{ item.rank }}</span>
        </div>
        <div class="ds-rank-list__info">
          <div class="ds-rank-list__name">{{ item.name }}</div>
          <div class="ds-rank-list__bar-wrap">
            <div
              class="ds-rank-list__bar"
              :style="{ width: barWidth(item.value) + '%', background: barColor(item.rank) }"
            >
              <div class="ds-rank-list__bar-shine"></div>
            </div>
          </div>
        </div>
        <div class="ds-rank-list__value">¥{{ (item.value || 0).toLocaleString() }}</div>
      </div>
      <div v-if="items.length === 0" class="ds-rank-list__empty">暂无数据</div>
    </div>
  </div>
</template>

<script>
export default { name: 'RankList' }
</script>
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

function rankIcon(rank) {
  if (rank === 1) return '\u2605' // ★
  if (rank === 2) return '\u2605'
  if (rank === 3) return '\u2605'
  return ''
}

function barWidth(value) {
  if (!props.items.length) return 0
  const max = Math.max(...props.items.map((i) => i.value || 0))
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
  transition: border-color 0.3s ease;
}

.ds-rank-list:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.ds-rank-list__header {
  padding: var(--space-4) var(--space-5) var(--space-3);
}

.ds-rank-list__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ds-rank-list__title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffa940;
  box-shadow: 0 0 8px rgba(255, 169, 64, 0.5);
  animation: dot-blink 2s ease-in-out infinite;
}

@keyframes dot-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.ds-rank-list__body {
  flex: 1;
  padding: 0 var(--space-5) var(--space-4);
  overflow-y: auto;
}

/* 入场动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ds-rank-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  animation: slideIn 0.5s ease-out both;
  transition: background 0.2s;
}

.ds-rank-list__item:hover {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding-left: var(--space-1);
  padding-right: var(--space-1);
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
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
}

.ds-rank-list__rank.silver {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
  box-shadow: 0 0 8px rgba(192, 192, 192, 0.2);
}

.ds-rank-list__rank.bronze {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #1a1a2e;
  box-shadow: 0 0 8px rgba(205, 127, 50, 0.2);
}

.ds-rank-list__rank-icon {
  font-size: 14px;
}

.ds-rank-list__info {
  flex: 1;
  min-width: 0;
}

.ds-rank-list__name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-1);
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
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

/* 进度条光泽动画 */
.ds-rank-list__bar-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: bar-shine 3s ease-in-out infinite;
}

@keyframes bar-shine {
  0% {
    left: -100%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: 100%;
  }
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
  padding: var(--space-6) 0;
}
</style>
