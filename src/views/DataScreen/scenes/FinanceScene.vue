<template>
  <div class="scene-finance">
    <KpiBar :cards="dataScreenStore.financeKpiCards" />
    <div class="scene-finance__body">
      <div class="scene-finance__left">
        <TechBorder color="#52c41a">
          <div class="scene-finance__panel">
            <div class="scene-finance__panel-title"><span class="panel-dot" style="background:#52c41a"></span>回款趋势</div>
            <div class="scene-finance__chart" ref="collTrendRef"></div>
          </div>
        </TechBorder>
        <TechBorder color="#2f54eb">
          <div class="scene-finance__panel">
            <div class="scene-finance__panel-title"><span class="panel-dot" style="background:#2f54eb"></span>利润率</div>
            <div class="scene-finance__chart" ref="gaugeRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-finance__center">
        <TechBorder color="#eb2f96">
          <div class="scene-finance__panel">
            <div class="scene-finance__panel-title"><span class="panel-dot" style="background:#eb2f96"></span>应收应付对比</div>
            <div class="scene-finance__chart" ref="compareRef"></div>
          </div>
        </TechBorder>
        <TechBorder color="#52c41a">
          <div class="scene-finance__panel">
            <div class="scene-finance__panel-title"><span class="panel-dot" style="background:#52c41a"></span>现金流趋势</div>
            <div class="scene-finance__chart" ref="cashFlowRef"></div>
          </div>
        </TechBorder>
      </div>
      <div class="scene-finance__right">
        <AlertPanel title="财务预警" :alerts="[...dataScreenStore.overdueReceivableAlerts, ...dataScreenStore.contractExpiryAlerts]" />
        <TechBorder color="#eb2f96">
          <div class="scene-finance__panel">
            <div class="scene-finance__panel-title"><span class="panel-dot" style="background:#eb2f96"></span>费用构成</div>
            <div class="scene-finance__chart" ref="expenseRef"></div>
          </div>
        </TechBorder>
      </div>
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
import AlertPanel from '../components/AlertPanel.vue'

const dataScreenStore = useDataScreenStore()
const collTrendRef = ref(null), gaugeRef = ref(null), compareRef = ref(null), cashFlowRef = ref(null), expenseRef = ref(null)

onMounted(() => { nextTick(() => { initCollTrend(); initGauge(); initCompare(); initCashFlow(); initExpense() }) })
onUnmounted(() => { [collTrendRef, gaugeRef, compareRef, cashFlowRef, expenseRef].forEach(r => { if (r.value) disposeChart(r.value) }) })

function initCollTrend() {
  if (!collTrendRef.value) return
  const instance = initChart(collTrendRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const trend = dataScreenStore.collectionTrend
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 32, left: 16, containLabel: true },
    xAxis: { type: 'category', data: trend.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [{ name: '回款额', type: 'line', data: trend.data, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[2] + '40' }, { offset: 1, color: colors[2] + '05' }] } }, lineStyle: { width: 2, color: colors[2] }, itemStyle: { color: colors[2] }, symbol: 'none' }]
  })
}

function initGauge() {
  if (!gaugeRef.value) return
  const instance = initChart(gaugeRef.value)
  const rate = dataScreenStore.profitMargin
  instance.setOption({
    series: [{
      type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 50,
      progress: { show: true, width: 14, itemStyle: { color: rate > 20 ? '#52c41a' : rate > 10 ? '#faad14' : '#ff4d4f' } },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.06)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: true, length: '60%', width: 4, itemStyle: { color: '#2f54eb' } },
      title: { offsetCenter: [0, '60%'], fontSize: 13, color: 'rgba(255,255,255,0.6)' },
      detail: { offsetCenter: [0, '30%'], fontSize: 28, fontWeight: 700, color: '#fff', formatter: '{value}%', fontFamily: 'DIN Alternate,Roboto Mono,monospace' },
      data: [{ value: rate, name: '利润率' }]
    }]
  })
}

function initCompare() {
  if (!compareRef.value) return
  const instance = initChart(compareRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 16, left: 16, containLabel: true },
    xAxis: { type: 'category', data: ['应收', '应付'], ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [{ type: 'bar', data: [dataScreenStore.totalReceivable, dataScreenStore.totalPayable], barWidth: '40%', itemStyle: { color: (p) => p.dataIndex === 0 ? colors[6] + 'cc' : colors[2] + 'cc', borderRadius: [4,4,0,0] } }]
  })
}

function initCashFlow() {
  if (!cashFlowRef.value) return
  const instance = initChart(cashFlowRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const cf = dataScreenStore.cashFlowTrend
  instance.setOption({
    ...getBaseOption(dataScreenStore.currentTheme),
    tooltip: { ...getBaseOption(dataScreenStore.currentTheme).tooltip, trigger: 'axis' },
    grid: { top: 32, right: 16, bottom: 32, left: 16, containLabel: true },
    xAxis: { type: 'category', data: cf.labels, ...getBaseOption(dataScreenStore.currentTheme).categoryAxis },
    yAxis: { type: 'value', ...getBaseOption(dataScreenStore.currentTheme).valueAxis },
    series: [{ name: '净现金流', type: 'line', data: cf.net, smooth: true, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: colors[1] + '30' }, { offset: 1, color: colors[1] + '05' }] } }, lineStyle: { width: 2, color: colors[1] }, itemStyle: { color: colors[1] }, symbol: 'none' }]
  })
}

function initExpense() {
  if (!expenseRef.value) return
  const instance = initChart(expenseRef.value)
  const colors = getThemeColors(dataScreenStore.currentTheme)
  const exp = dataScreenStore.expenseBreakdown
  instance.setOption({
    tooltip: { trigger: 'item', ...getBaseOption(dataScreenStore.currentTheme).tooltip },
    legend: { orient: 'vertical', right: 0, top: 'center', textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 } },
    series: [{ type: 'pie', radius: ['35%', '60%'], center: ['35%', '50%'], data: exp.map((e, i) => ({ ...e, itemStyle: { color: colors[i % colors.length] + 'cc' } })), label: { show: false }, emphasis: { label: { show: true } } }]
  })
}
</script>

<style scoped>
.scene-finance { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.scene-finance__body { flex: 1; display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 16px; min-height: 0; }
.scene-finance__left, .scene-finance__right { display: flex; flex-direction: column; gap: 16px; }
.scene-finance__center { display: flex; flex-direction: column; gap: 16px; }
.scene-finance__panel { padding: 0; height: 100%; display: flex; flex-direction: column; }
.scene-finance__panel-title { padding: 12px 16px 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 8px; }
.scene-finance__chart { flex: 1; min-height: 160px; padding: 0 8px 8px; }
@media (max-width: 1200px) { .scene-finance__body { grid-template-columns: 1fr; } }
</style>
