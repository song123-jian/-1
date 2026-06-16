<template>
  <TechBorder color="#ffa940">
    <div class="rank-panel">
      <div class="rank-panel__header">
        <span class="rank-panel__dot"></span>
        <span class="rank-panel__title">{{ title }}</span>
      </div>
      <div class="rank-panel__body">
        <div v-for="(item, idx) in items" :key="item.name" class="rank-panel__item" :style="{ animationDelay: idx * 80 + 'ms' }">
          <div class="rank-panel__rank" :class="rankClass(item.rank)">
            <span v-if="item.rank <= 3">★</span>
            <span v-else>{{ item.rank }}</span>
          </div>
          <div class="rank-panel__info">
            <div class="rank-panel__name">{{ item.name }}</div>
            <div class="rank-panel__bar-wrap">
              <div class="rank-panel__bar" :style="{ width: barWidth(item.value) + '%', background: barColor(item.rank) }">
                <div class="rank-panel__bar-shine"></div>
              </div>
            </div>
          </div>
          <div class="rank-panel__value">¥{{ (item.value || 0).toLocaleString() }}</div>
        </div>
        <div v-if="!items.length" class="rank-panel__empty">暂无数据</div>
      </div>
    </div>
  </TechBorder>
</template>

<script setup>
import TechBorder from './TechBorder.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] }
})

function rankClass(rank) { return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '' }
function barWidth(value) { const max = Math.max(...props.items.map(i => i.value || 0)); return max ? Math.max((value / max) * 100, 2) : 0 }
function barColor(rank) {
  if (rank === 1) return 'linear-gradient(90deg, #ffd700, #ffaa00)'
  if (rank === 2) return 'linear-gradient(90deg, #c0c0c0, #a0a0a0)'
  if (rank === 3) return 'linear-gradient(90deg, #cd7f32, #b87333)'
  return 'linear-gradient(90deg, #00d4ff, #0088cc)'
}
</script>

<style scoped>
.rank-panel { display: flex; flex-direction: column; height: 100%; }
.rank-panel__header { padding: 12px 16px 8px; display: flex; align-items: center; gap: 8px; }
.rank-panel__dot { width: 6px; height: 6px; border-radius: 50%; background: #ffa940; box-shadow: 0 0 8px rgba(255,169,64,0.5); animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
.rank-panel__title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }
.rank-panel__body { flex: 1; padding: 0 16px 12px; overflow-y: auto; }
.rank-panel__body::-webkit-scrollbar { width: 4px; }
.rank-panel__body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.rank-panel__item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); animation: slideIn 0.5s ease both; transition: background 0.2s; }
@keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
.rank-panel__item:hover { background: rgba(255,255,255,0.03); border-radius: 6px; padding-left: 4px; padding-right: 4px; }
.rank-panel__rank { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.06); flex-shrink: 0; }
.rank-panel__rank.gold { background: linear-gradient(135deg, #ffd700, #ffaa00); color: #1a1a2e; box-shadow: 0 0 12px rgba(255,215,0,0.3); }
.rank-panel__rank.silver { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); color: #1a1a2e; }
.rank-panel__rank.bronze { background: linear-gradient(135deg, #cd7f32, #b87333); color: #1a1a2e; }
.rank-panel__info { flex: 1; min-width: 0; }
.rank-panel__name { font-size: 13px; color: rgba(255,255,255,0.8); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-panel__bar-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.rank-panel__bar { height: 100%; border-radius: 3px; transition: width 1.2s cubic-bezier(0.25,0.46,0.45,0.94); position: relative; overflow: hidden; }
.rank-panel__bar-shine { position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: shine 3s infinite; }
@keyframes shine { 0%{left:-100%} 50%{left:100%} 100%{left:100%} }
.rank-panel__value { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); white-space: nowrap; flex-shrink: 0; font-family: 'DIN Alternate', 'Roboto Mono', monospace; }
.rank-panel__empty { text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; padding: 24px 0; }
</style>
