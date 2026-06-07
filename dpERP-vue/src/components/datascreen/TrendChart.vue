<template>
  <div class="ds-trend-chart">
    <div class="ds-trend-chart__header">
      <div class="ds-trend-chart__title">{{ title }}</div>
    </div>
    <div class="ds-trend-chart__body">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  title: { type: String, default: '' },
  labels: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  type: { type: String, default: 'line' } // 'line' | 'bar'
})

const canvasRef = ref(null)
let chartInstance = null

/** 深色主题默认配置 */
const darkThemeOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: { size: 11 },
        boxWidth: 12,
        boxHeight: 12,
        borderRadius: 2,
        useBorderRadius: true,
        padding: 16
      }
    },
    tooltip: {
      backgroundColor: 'rgba(10, 14, 39, 0.9)',
      titleColor: 'rgba(255, 255, 255, 0.9)',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 4
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.06)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
        font: { size: 11 }
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.06)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
        font: { size: 11 }
      }
    }
  }
}

/** 为数据集添加深色主题默认样式 */
function applyDarkStyle(datasets, chartType) {
  const defaultColors = ['#00d4ff', '#00ff88', '#ffa940', '#722ed1', '#ff4d4f', '#13c2c2']
  return datasets.map((ds, i) => {
    const color = ds.borderColor || defaultColors[i % defaultColors.length]
    const baseConfig = {
      ...ds,
      borderColor: color,
      borderWidth: ds.borderWidth || 2
    }

    if (chartType === 'line') {
      return {
        ...baseConfig,
        tension: ds.tension !== undefined ? ds.tension : 0.4,
        fill: ds.fill !== undefined ? ds.fill : true,
        backgroundColor: ds.backgroundColor || color + '15',
        pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 3,
        pointBackgroundColor: color,
        pointBorderColor: 'transparent',
        pointHoverRadius: 6,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }
    }

    // bar 类型
    return {
      ...baseConfig,
      backgroundColor: ds.backgroundColor || color + '80',
      hoverBackgroundColor: color,
      borderRadius: ds.borderRadius !== undefined ? ds.borderRadius : 4,
      borderSkipped: false
    }
  })
}

function createChart() {
  if (!canvasRef.value) return
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const ctx = canvasRef.value.getContext('2d')
  const styledDatasets = applyDarkStyle(props.datasets, props.type)

  chartInstance = new Chart(ctx, {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: styledDatasets
    },
    options: {
      ...darkThemeOptions,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  })
}

watch(
  () => [props.labels, props.datasets, props.type],
  () => {
    nextTick(() => createChart())
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => createChart())
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.ds-trend-chart {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ds-trend-chart__header {
  padding: 16px 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ds-trend-chart__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.ds-trend-chart__body {
  flex: 1;
  padding: 12px 16px 16px;
  min-height: 0;
  position: relative;
}

.ds-trend-chart__body canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
