<template>
  <TechBorder :color="worstColor">
    <div class="alert-panel">
      <div class="alert-panel__header">
        <div class="alert-panel__title">
          <span class="alert-panel__dot" :class="worstLevel"></span>
          {{ title }}
        </div>
        <div class="alert-panel__stats" v-if="alerts.length">
          <span class="alert-panel__badge critical" v-if="criticalCount">{{ criticalCount }}</span>
          <span class="alert-panel__badge warning" v-if="warningCount">{{ warningCount }}</span>
        </div>
      </div>
      <div class="alert-panel__body" ref="scrollBody">
        <div v-for="(alert, idx) in alerts" :key="idx" class="alert-panel__item" :class="[alert.level]" :style="{ animationDelay: idx * 60 + 'ms' }">
          <div class="alert-panel__indicator" :class="alert.level"></div>
          <div class="alert-panel__content">
            <div class="alert-panel__message">{{ alert.message }}</div>
            <div class="alert-panel__time">{{ alert.time }}</div>
          </div>
          <span class="alert-panel__type" :class="alert.type">{{ typeLabel(alert.type) }}</span>
        </div>
        <div v-if="!alerts.length" class="alert-panel__empty">暂无预警</div>
      </div>
    </div>
  </TechBorder>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import TechBorder from './TechBorder.vue'

const props = defineProps({
  title: { type: String, default: '预警中心' },
  alerts: { type: Array, default: () => [] }
})

const scrollBody = ref(null)
let scrollTimer = null

const criticalCount = computed(() => props.alerts.filter(a => a.level === 'critical').length)
const warningCount = computed(() => props.alerts.filter(a => a.level === 'warning').length)
const worstLevel = computed(() => criticalCount.value ? 'critical' : warningCount.value ? 'warning' : 'info')
const worstColor = computed(() => worstLevel.value === 'critical' ? '#ff4d4f' : worstLevel.value === 'warning' ? '#faad14' : '#52c41a')

function typeLabel(type) {
  return { inventory: '库存', receivable: '应收', contract: '合同', quotation: '报价', delivery: '送货' }[type] || type
}

onMounted(() => {
  if (!scrollBody.value) return
  const el = scrollBody.value
  let dir = 1
  scrollTimer = setInterval(() => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1
    else if (el.scrollTop <= 0) dir = 1
    el.scrollTop += dir * 0.5
  }, 50)
})

onUnmounted(() => { if (scrollTimer) clearInterval(scrollTimer) })
</script>

<style scoped>
.alert-panel { display: flex; flex-direction: column; height: 100%; }
.alert-panel__header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 8px; }
.alert-panel__title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 8px; }
.alert-panel__dot { width: 6px; height: 6px; border-radius: 50%; }
.alert-panel__dot.critical { background: #ff4d4f; box-shadow: 0 0 8px rgba(255,77,79,0.5); animation: blink 1.5s infinite; }
.alert-panel__dot.warning { background: #faad14; box-shadow: 0 0 6px rgba(250,173,20,0.3); }
.alert-panel__dot.info { background: #52c41a; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.alert-panel__stats { display: flex; gap: 6px; }
.alert-panel__badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.alert-panel__badge.critical { background: rgba(255,77,79,0.2); color: #ff4d4f; }
.alert-panel__badge.warning { background: rgba(250,173,20,0.2); color: #faad14; }
.alert-panel__body { flex: 1; padding: 0 16px 12px; overflow-y: auto; max-height: 260px; }
.alert-panel__body::-webkit-scrollbar { width: 4px; }
.alert-panel__body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.alert-panel__item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); animation: slideIn 0.4s ease both; }
.alert-panel__item.critical { animation: slideIn 0.4s ease both, blink 2s ease-in-out 0.5s infinite; }
@keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.alert-panel__indicator { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.alert-panel__indicator.critical { background: #ff4d4f; box-shadow: 0 0 8px rgba(255,77,79,0.5); }
.alert-panel__indicator.warning { background: #faad14; }
.alert-panel__indicator.info { background: #1890ff; }
.alert-panel__content { flex: 1; min-width: 0; }
.alert-panel__message { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; }
.alert-panel__time { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px; }
.alert-panel__type { font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; font-weight: 500; }
.alert-panel__type.inventory { background: rgba(19,194,194,0.15); color: #13c2c2; }
.alert-panel__type.receivable { background: rgba(235,47,150,0.15); color: #eb2f96; }
.alert-panel__type.contract { background: rgba(114,46,209,0.15); color: #722ed1; }
.alert-panel__type.delivery { background: rgba(250,140,22,0.15); color: #fa8c16; }
.alert-panel__empty { text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; padding: 32px 0; }
</style>
