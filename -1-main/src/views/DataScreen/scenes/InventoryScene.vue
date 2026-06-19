<template>
  <div class="scene-inventory">
    <KpiBar :cards="dataScreenStore.inventoryKpiCards" />
    <div class="scene-inventory__body">
      <div class="scene-inventory__left">
        <TechBorder color="#00ff88">
          <div class="scene-inventory__panel">
            <div class="scene-inventory__panel-title">
              <span class="panel-dot" style="background: #00ff88"></span>
              入库出库趋势
            </div>
            <div ref="inoutRef" class="scene-inventory__chart"></div>
          </div>
        </TechBorder>
        <TechBorder color="#13c2c2">
          <div class="scene-inventory__panel">
            <div class="scene-inventory__panel-title">
              <span class="panel-dot" style="background: #13c2c2"></span>
              库存周转率
            </div>
            <div ref="gaugeRef" class="scene-inventory__chart"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-inventory__center">
        <TechBorder color="#00ff88">
          <div class="scene-inventory__panel">
            <div class="scene-inventory__panel-title">
              <span class="panel-dot" style="background: #00ff88"></span>
              库存分布
            </div>
            <div ref="pieRef" class="scene-inventory__chart"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-inventory__right">
        <AlertPanel title="库存预警" :alerts="dataScreenStore.inventoryAlerts" />
        <TechBorder color="#faad14">
          <div class="scene-inventory__panel">
            <div class="scene-inventory__panel-title">
              <span class="panel-dot" style="background: #faad14"></span>
              库存健康度
            </div>
            <div ref="healthRef" class="scene-inventory__chart"></div>
          </div>
        </TechBorder>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'InventoryScene' }
</script>
<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDataScreenStore } from '@/stores/dataScreen'
import { initChart, disposeChart } from '@/utils/echartsHelper'
import { getBaseOption, getThemeColors } from '@/utils/echartsThemes'
import TechBorder from '../components/TechBorder.vue'
import KpiBar from '../components/KpiBar.vue'
import AlertPanel from '../components/AlertPanel.vue'

const dataScreenStore = useDataScreenStore()
const inoutRef = ref(null),
  gaugeRef = ref(null),
  pieRef = ref(null),
  healthRef = ref(null)

onMounted(() => {
  nextTick(() => {
    initInOut()
    initGauge()
    initPie()
    initHealth()
  })
})
onUnmounted(() => {
  ;[inoutRef, gaugeRef, pieRef, healthRef].forEach((r) => {
    if (r.value) disposeChart(r.value)
  })
})

function initInOut() {
  if (!inoutRef.value) return
  const instance = initChart(inoutRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const trend = dataScreenStore.inoutTrend
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 32, left: 16, containLabel: true },
    xAxis: { type: 'category', data: trend.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [
      {
        name: '入库',
        type: 'bar',
        data: trend.inbound,
        itemStyle: { color: colors[1] + 'cc', borderRadius: [4, 4, 0, 0] },
        barWidth: '35%'
      },
      {
        name: '出库',
        type: 'bar',
        data: trend.outbound,
        itemStyle: { color: colors[2] + 'cc', borderRadius: [4, 4, 0, 0] },
        barWidth: '35%'
      }
    ]
  })
}

function initGauge() {
  if (!gaugeRef.value) return
  const instance = initChart(gaugeRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  instance.setOption({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 200,
        progress: { show: true, width: 14, itemStyle: { color: colors[1] } },
        axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.06)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: true, length: '60%', width: 4, itemStyle: { color: colors[1] } },
        title: { offsetCenter: [0, '60%'], fontSize: 13, color: 'rgba(255,255,255,0.6)' },
        detail: {
          offsetCenter: [0, '30%'],
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          formatter: '{value}%',
          fontFamily: 'DIN Alternate,Roboto Mono,monospace'
        },
        data: [{ value: dataScreenStore.stockTurnoverRate, name: '周转率' }]
      }
    ]
  })
}

function initPie() {
  if (!pieRef.value) return
  const instance = initChart(pieRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const dist = dataScreenStore.inventoryDistribution
  const catData = dist.categories.map((c, i) => ({ ...c, itemStyle: { color: colors[i % colors.length] + 'cc' } }))
  instance.setOption({
    tooltip: { trigger: 'item', ...getBaseOption(dataScreenStore.currentTheme).tooltip },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['40%', '50%'],
        data: catData,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 600 } },
        itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 }
      }
    ]
  })
}

function initHealth() {
  if (!healthRef.value) return
  const instance = initChart(healthRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const rate = dataScreenStore.inventoryHealthRate
  instance.setOption({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 12,
          itemStyle: { color: rate > 80 ? '#52c41a' : rate > 50 ? '#faad14' : '#ff4d4f' }
        },
        axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.06)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        title: { offsetCenter: [0, '60%'], fontSize: 12, color: 'rgba(255,255,255,0.6)' },
        detail: {
          offsetCenter: [0, '20%'],
          fontSize: 24,
          fontWeight: 700,
          color: '#fff',
          formatter: '{value}%',
          fontFamily: 'DIN Alternate,Roboto Mono,monospace'
        },
        data: [{ value: rate, name: '健康度' }]
      }
    ]
  })
}
</script>

<style scoped>
.scene-inventory {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
.scene-inventory__body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 16px;
  min-height: 0;
}
.scene-inventory__left,
.scene-inventory__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.scene-inventory__center {
  display: flex;
  flex-direction: column;
}
.scene-inventory__panel {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.scene-inventory__panel-title {
  padding: 12px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 8px;
}
.scene-inventory__chart {
  flex: 1;
  min-height: 180px;
  padding: 0 8px 8px;
}
@media (max-width: 1200px) {
  .scene-inventory__body {
    grid-template-columns: 1fr;
  }
}
</style>
