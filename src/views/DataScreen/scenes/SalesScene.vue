<template>
  <div class="scene-sales">
    <KpiBar :cards="dataScreenStore.salesKpiCards" />
    <div class="scene-sales__body">
      <div class="scene-sales__left">
        <TechBorder color="#00d4ff">
          <div class="scene-sales__panel">
            <div class="scene-sales__panel-title"><span class="panel-dot"></span>销售趋势（近12月）</div>
            <div class="scene-sales__chart" ref="salesTrendRef"></div>
          </div>
        </TechBorder>
        <TechBorder color="#722ed1">
          <div class="scene-sales__panel">
            <div class="scene-sales__panel-title"><span class="panel-dot" style="background:#722ed1"></span>客户维度分析</div>
            <div class="scene-sales__chart" ref="radarRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-sales__center">
        <TechBorder color="#00d4ff">
          <div class="scene-sales__panel">
            <div class="scene-sales__panel-title"><span class="panel-dot"></span>区域销售分布</div>
            <div class="scene-sales__chart" ref="mapRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-sales__right">
        <RankPanel title="热销排行 Top10" :items="dataScreenStore.topProducts" />
        <RankPanel title="客户贡献 Top10" :items="dataScreenStore.topCustomers.map((c,i) => ({name:c.name||c.fullName,value:Math.round(c.balance||0),rank:i+1}))" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDataScreenStore } from '@/stores/dataScreen'
import { initChart, disposeChart, setChartOption } from '@/utils/echartsHelper'
import { getBaseOption, getThemeColors } from '@/utils/echartsThemes'
import TechBorder from '../components/TechBorder.vue'
import KpiBar from '../components/KpiBar.vue'
import RankPanel from '../components/RankPanel.vue'

const dataScreenStore = useDataScreenStore()
const salesTrendRef = ref(null)
const radarRef = ref(null)
const mapRef = ref(null)

onMounted(() => {
  nextTick(() => {
    initSalesTrend()
    initRadar()
    initMap()
  })
})

onUnmounted(() => {
  if (salesTrendRef.value) disposeChart(salesTrendRef.value)
  if (radarRef.value) disposeChart(radarRef.value)
  if (mapRef.value) disposeChart(mapRef.value)
})

function initSalesTrend() {
  if (!salesTrendRef.value) return
  const instance = initChart(salesTrendRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const trend = dataScreenStore.salesTrend
  const coll = dataScreenStore.collectionTrend
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 32, left: 16, containLabel: true },
    xAxis: { type: 'category', data: trend.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    dataZoom: [{ type: 'inside', start: 50, end: 100 }],
    series: [
      { name: '销售额', type: 'line', data: trend.data, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[0] + '40' }, { offset: 1, color: colors[0] + '05' }] } }, lineStyle: { width: 2, color: colors[0] }, itemStyle: { color: colors[0] }, symbol: 'none' },
      { name: '回款额', type: 'line', data: coll.data, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[1] + '30' }, { offset: 1, color: colors[1] + '05' }] } }, lineStyle: { width: 2, color: colors[1] }, itemStyle: { color: colors[1] }, symbol: 'none' }
    ]
  })
}

function initRadar() {
  if (!radarRef.value) return
  const instance = initChart(radarRef.value)
  const radar = dataScreenStore.customerRadar
  const colors = getThemeColors(dataScreenStore.currentTheme)
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    radar: { indicator: radar.indicators, shape: 'polygon', splitNumber: 4, axisName: { color: 'rgba(255,255,255,0.5)', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }, splitArea: { show: false }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
    series: [{ type: 'radar', data: [{ value: radar.values, name: '客户综合评分', areaStyle: { color: colors[0] + '30' }, lineStyle: { color: colors[0], width: 2 }, itemStyle: { color: colors[0] } }] }]
  })
}

function initMap() {
  if (!mapRef.value) return
  const instance = initChart(mapRef.value)
  const region = dataScreenStore.regionDistribution
  const colors = getThemeColors(dataScreenStore.currentTheme)
  // 使用柱状图替代地图（避免需要额外GeoJSON）
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 16, right: 16, bottom: 16, left: 16, containLabel: true },
    xAxis: { type: 'category', data: region.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis, axisLabel: { ...getBaseOption(dataScreenStore.currentTheme).categoryAxis.axisLabel, rotate: 30 } },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [{ type: 'bar', data: region.data, barWidth: '50%', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[0] + 'cc' }, { offset: 1, color: colors[0] + '30' }] }, borderRadius: [4, 4, 0, 0] } }]
  })
}
</script>

<style scoped>
.scene-sales { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.scene-sales__body { flex: 1; display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 16px; min-height: 0; }
.scene-sales__left, .scene-sales__right { display: flex; flex-direction: column; gap: 16px; }
.scene-sales__center { display: flex; flex-direction: column; }
.scene-sales__panel { padding: 0; height: 100%; display: flex; flex-direction: column; }
.scene-sales__panel-title { padding: 12px 16px 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 8px; }
.panel-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.5); }
.scene-sales__chart { flex: 1; min-height: 200px; padding: 0 8px 8px; }
@media (max-width: 1200px) { .scene-sales__body { grid-template-columns: 1fr; } }
</style>
