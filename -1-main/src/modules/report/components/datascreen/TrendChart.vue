<template>
  <div class="ds-trend-chart">
    <div class="ds-trend-chart__header">
      <div class="ds-trend-chart__title">
        <span class="ds-trend-chart__title-dot"></span>
        {{ title }}
      </div>
      <div v-if="datasets.length > 1" class="ds-trend-chart__legend">
        <span v-for="(ds, i) in datasets" :key="i" class="ds-trend-chart__legend-item">
          <span class="ds-trend-chart__legend-dot" :style="{ background: ds.borderColor || defaultColors[i] }"></span>
          {{ ds.label }}
        </span>
      </div>
    </div>
    <div class="ds-trend-chart__body">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script>
export default { name: 'TrendChart' }
</script>
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

const defaultColors = ['#00d4ff', '#00ff88', '#ffa940', '#722ed1', '#ff4d4f', '#13c2c2']

const canvasRef = ref(null)
let chartInstance = null

/** 深色主题默认配置 */
const darkThemeOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(10, 14, 39, 0.95)',
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 4,
      titleFont: { size: 12, weight: '600' },
      bodyFont: { size: 12 }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.04)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.45)',
        font: { size: 11 }
      },
      border: { display: false }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.04)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.45)',
        font: { size: 11 }
      },
      border: { display: false }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
}

/** 为数据集添加深色主题默认样式 */
function applyDarkStyle(datasets, chartType) {
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
        pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 0,
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
      borderSkipped: false,
      barPercentage: 0.6,
      categoryPercentage: 0.7
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

  // 为折线图创建渐变填充
  if (props.type === 'line') {
    for (const ds of styledDatasets) {
      if (ds.fill) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasRef.value.parentElement.clientHeight || 300)
        const baseColor = ds.borderColor || '#00d4ff'
        gradient.addColorStop(0, baseColor + '30')
        gradient.addColorStop(0.5, baseColor + '10')
        gradient.addColorStop(1, baseColor + '00')
        ds.backgroundColor = gradient
      }
    }
  }

  chartInstance = new Chart(ctx, {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: styledDatasets
    },
    options: {
      ...darkThemeOptions,
      animation: {
        duration: 1200,
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
  transition: border-color 0.3s ease;
}

.ds-trend-chart:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.ds-trend-chart__header {
  padding: var(--space-4) var(--space-5) 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ds-trend-chart__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ds-trend-chart__title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
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

.ds-trend-chart__legend {
  display: flex;
  gap: var(--space-4);
}

.ds-trend-chart__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.ds-trend-chart__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.ds-trend-chart__body {
  flex: 1;
  padding: var(--space-3) var(--space-4) var(--space-4);
  min-height: 0;
  position: relative;
}

.ds-trend-chart__body canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
