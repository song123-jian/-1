<template>
  <div class="scene-overview">
    <div class="scene-overview__cards">
      <div class="scene-overview__card-group">
        <div class="scene-overview__group-label"><Icon name="trendUp" :size="14" /> 销售概览</div>
        <KpiBar :cards="dataScreenStore.salesKpiCards" />
      </div>
      <div class="scene-overview__card-group">
        <div class="scene-overview__group-label"><Icon name="package" :size="14" /> 库存概览</div>
        <KpiBar :cards="dataScreenStore.inventoryKpiCards" />
      </div>
      <div class="scene-overview__card-group">
        <div class="scene-overview__group-label"><Icon name="dollar" :size="14" /> 财务概览</div>
        <KpiBar :cards="dataScreenStore.financeKpiCards" />
      </div>
    </div>
    <div class="scene-overview__body">
      <div class="scene-overview__left">
        <TechBorder color="#00d4ff">
          <div class="scene-overview__panel">
            <div class="scene-overview__panel-title"><span class="panel-dot"></span>销售趋势</div>
            <div class="scene-overview__chart" ref="salesTrendRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-overview__center">
        <TechBorder color="#00ff88">
          <div class="scene-overview__panel">
            <div class="scene-overview__panel-title"><span class="panel-dot" style="background:#00ff88"></span>区域分布</div>
            <div class="scene-overview__chart" ref="regionRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-overview__right">
        <RankPanel title="热销排行 Top10" :items="dataScreenStore.topProducts" />
      </div>
    </div>
    <div class="scene-overview__bottom">
      <TechBorder color="#00ff88">
        <div class="scene-overview__panel">
          <div class="scene-overview__panel-title"><span class="panel-dot" style="background:#00ff88"></span>入库出库趋势</div>
          <div class="scene-overview__chart" ref="inoutRef"></div>
        </div>
      </TechBorder>
      <AlertPanel title="预警中心" :alerts="dataScreenStore.allAlerts" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDataScreenStore } from '@/stores/dataScreen'
import { initChart, disposeChart } from '@/utils/echartsHelper'
import { getBaseOption, getThemeColors } from '@/utils/echartsThemes'
import TechBorder from '../components/TechBorder.vue'
import KpiBar from '../components/KpiBar.vue'
import RankPanel from '../components/RankPanel.vue'
import AlertPanel from '../components/AlertPanel.vue'

const dataScreenStore = useDataScreenStore()
const salesTrendRef = ref(null), regionRef = ref(null), inoutRef = ref(null)

onMounted(() => { nextTick(() => { initSalesTrend(); initRegion(); initInOut() }) })
onUnmounted(() => { [salesTrendRef, regionRef, inoutRef].forEach(r => { if (r.value) disposeChart(r.value) }) })

function initSalesTrend() {
  if (!salesTrendRef.value) return
  const instance = initChart(salesTrendRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const trend = dataScreenStore.salesTrend
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 32, left: 16, containLabel: true },
    xAxis: { type: 'category', data: trend.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    dataZoom: [{ type: 'inside', start: 50, end: 100 }],
    series: [{ name: '销售额', type: 'line', data: trend.data, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[0] + '40' }, { offset: 1, color: colors[0] + '05' }] } }, lineStyle: { width: 2, color: colors[0] }, itemStyle: { color: colors[0] }, symbol: 'none' }]
  })
}

function initRegion() {
  if (!regionRef.value) return
  const instance = initChart(regionRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const region = dataScreenStore.regionDistribution
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 16, right: 16, bottom: 16, left: 16, containLabel: true },
    xAxis: { type: 'category', data: region.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis, axisLabel: { ...getBaseOption(dataScreenStore.currentTheme).categoryAxis.axisLabel, rotate: 30 } },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [{ type: 'bar', data: region.data, barWidth: '50%', itemStyle: { color: (p) => colors[p.dataIndex % colors.length] + 'cc', borderRadius: [4,4,0,0] } }]
  })
}

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
      { name: '入库', type: 'bar', data: trend.inbound, itemStyle: { color: colors[1] + 'cc', borderRadius: [4,4,0,0] }, barWidth: '35%' },
      { name: '出库', type: 'bar', data: trend.outbound, itemStyle: { color: colors[2] + 'cc', borderRadius: [4,4,0,0] }, barWidth: '35%' }
    ]
  })
}
</script>

<style scoped>
.scene-overview { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.scene-overview__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.scene-overview__card-group { display: flex; flex-direction: column; gap: 8px; }
.scene-overview__group-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }
.scene-overview__body { display: grid; grid-template-columns: 2fr 1.2fr 1fr; gap: 16px; min-height: 280px; }
.scene-overview__bottom { display: grid; grid-template-columns: 1.2fr 2fr; gap: 16px; min-height: 280px; }
.scene-overview__panel { padding: 0; height: 100%; display: flex; flex-direction: column; }
.scene-overview__panel-title { padding: 12px 16px 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 8px; }
.scene-overview__chart { flex: 1; min-height: 200px; padding: 0 8px 8px; }
.panel-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.5); }
@media (max-width: 1200px) {
  .scene-overview__cards { grid-template-columns: 1fr; }
  .scene-overview__body { grid-template-columns: 1fr; }
  .scene-overview__bottom { grid-template-columns: 1fr; }
}
</style>
