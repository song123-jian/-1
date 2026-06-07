<template>
  <div class="ds-screen" :class="{ 'ds-screen--fullscreen': isFullscreen }">
    <!-- 头部标题栏 -->
    <header class="ds-screen__header">
      <div class="ds-screen__header-left">
        <div class="ds-screen__logo"></div>
        <h1 class="ds-screen__title">冠久ERP 数据大屏</h1>
      </div>
      <div class="ds-screen__header-center">
        <div class="ds-screen__date">{{ currentDate }}</div>
      </div>
      <div class="ds-screen__header-right">
        <div class="ds-screen__clock">{{ currentTime }}</div>
        <button class="ds-screen__fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
          <Icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="18" />
        </button>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="ds-screen__main">
      <!-- 第一行：统计卡片 -->
      <section class="ds-screen__cards">
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="trendUp" :size="14" />
            <span>销售概览</span>
          </div>
          <div class="ds-screen__card-grid">
            <StatCard
              v-for="card in dataScreenStore.salesCards"
              :key="card.title"
              v-bind="card"
            />
          </div>
        </div>
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="package" :size="14" />
            <span>库存概览</span>
          </div>
          <div class="ds-screen__card-grid">
            <StatCard
              v-for="card in dataScreenStore.inventoryCards"
              :key="card.title"
              v-bind="card"
            />
          </div>
        </div>
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="dollar" :size="14" />
            <span>财务概览</span>
          </div>
          <div class="ds-screen__card-grid">
            <StatCard
              v-for="card in dataScreenStore.financeCards"
              :key="card.title"
              v-bind="card"
            />
          </div>
        </div>
      </section>

      <!-- 第二行：销售趋势 + 区域分布 + 热销排行 -->
      <section class="ds-screen__charts-row">
        <div class="ds-screen__chart-wide">
          <TrendChart
            title="销售趋势（近12个月）"
            type="line"
            :labels="dataScreenStore.salesTrend.labels"
            :datasets="salesTrendDatasets"
          />
        </div>
        <div class="ds-screen__chart-medium">
          <TrendChart
            title="区域分布"
            type="bar"
            :labels="dataScreenStore.regionDistribution.labels"
            :datasets="regionDatasets"
          />
        </div>
        <div class="ds-screen__chart-medium">
          <RankList
            title="热销排行 Top10"
            :items="dataScreenStore.topProducts"
          />
        </div>
      </section>

      <!-- 第三行：入库出库趋势 + 预警中心 -->
      <section class="ds-screen__bottom-row">
        <div class="ds-screen__chart-medium">
          <TrendChart
            title="入库出库趋势（近12个月）"
            type="bar"
            :labels="dataScreenStore.inoutTrend.labels"
            :datasets="inoutTrendDatasets"
          />
        </div>
        <div class="ds-screen__chart-wide">
          <AlertList
            title="预警中心"
            :alerts="dataScreenStore.allAlerts"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDataScreenStore } from '@/stores/dataScreen'
import StatCard from '@/components/datascreen/StatCard.vue'
import TrendChart from '@/components/datascreen/TrendChart.vue'
import RankList from '@/components/datascreen/RankList.vue'
import AlertList from '@/components/datascreen/AlertList.vue'

const dataScreenStore = useDataScreenStore()

/* ==================== 实时时钟 ==================== */
const currentTime = ref('')
const currentDate = ref('')
let clockTimer = null

function updateClock() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${year}年${month}月${day}日 ${weekDays[now.getDay()]}`
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})

/* ==================== 全屏切换 ==================== */
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      isFullscreen.value = true
    }).catch(() => {
      // 全屏请求被拒绝
    })
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false
    }).catch(() => {
      // 退出全屏失败
    })
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

/* ==================== 图表数据集 ==================== */

const salesTrendDatasets = computed(() => [
  {
    label: '销售额',
    data: dataScreenStore.salesTrend.data,
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.08)'
  }
])

const regionDatasets = computed(() => [
  {
    label: '销售额',
    data: dataScreenStore.regionDistribution.data,
    backgroundColor: [
      'rgba(0, 212, 255, 0.7)',
      'rgba(0, 255, 136, 0.7)',
      'rgba(255, 169, 64, 0.7)',
      'rgba(114, 46, 209, 0.7)',
      'rgba(255, 77, 79, 0.7)',
      'rgba(19, 194, 194, 0.7)',
      'rgba(235, 47, 150, 0.7)',
      'rgba(82, 196, 26, 0.7)'
    ]
  }
])

const inoutTrendDatasets = computed(() => [
  {
    label: '入库',
    data: dataScreenStore.inoutTrend.inbound,
    borderColor: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.6)'
  },
  {
    label: '出库',
    data: dataScreenStore.inoutTrend.outbound,
    borderColor: '#ffa940',
    backgroundColor: 'rgba(255, 169, 64, 0.6)'
  }
])
</script>

<style scoped>
/* ==================== 全局深色背景 ==================== */
.ds-screen {
  min-height: 100vh;
  background: #0a0e27;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.ds-screen--fullscreen {
  height: 100vh;
  overflow: hidden;
}

/* ==================== 头部 ==================== */
.ds-screen__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.ds-screen__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ds-screen__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #00d4ff, #0088cc);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.ds-screen__title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.ds-screen__header-center {
  flex: 1;
  text-align: center;
}

.ds-screen__date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.ds-screen__header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ds-screen__clock {
  font-size: 28px;
  font-weight: 700;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.ds-screen__fullscreen-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.ds-screen__fullscreen-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(0, 212, 255, 0.5);
}

/* ==================== 主体 ==================== */
.ds-screen__main {
  flex: 1;
  padding: 20px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}

/* ==================== 卡片区域 ==================== */
.ds-screen__cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  flex-shrink: 0;
}

.ds-screen__card-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ds-screen__group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.ds-screen__card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* ==================== 图表行 ==================== */
.ds-screen__charts-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr;
  gap: 20px;
  min-height: 300px;
}

.ds-screen__bottom-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 20px;
  min-height: 300px;
}

.ds-screen__chart-wide {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ds-screen__chart-medium {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 让 TrendChart 和 RankList、AlertList 填满容器 */
.ds-screen__chart-wide > *,
.ds-screen__chart-medium > * {
  flex: 1;
  min-height: 0;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1600px) {
  .ds-screen__card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .ds-screen__charts-row {
    grid-template-columns: 1fr 1fr;
  }
  .ds-screen__chart-wide {
    grid-column: span 2;
  }
  .ds-screen__bottom-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 1200px) {
  .ds-screen__cards {
    grid-template-columns: 1fr;
  }
  .ds-screen__charts-row {
    grid-template-columns: 1fr;
  }
  .ds-screen__chart-wide {
    grid-column: span 1;
  }
  .ds-screen__bottom-row {
    grid-template-columns: 1fr;
  }
  .ds-screen__main {
    padding: 16px;
  }
  .ds-screen__header {
    padding: 12px 16px;
  }
}

@media (max-width: 768px) {
  .ds-screen__card-grid {
    grid-template-columns: 1fr;
  }
  .ds-screen__title {
    font-size: 16px;
  }
  .ds-screen__clock {
    font-size: 20px;
  }
}

/* ==================== 背景装饰 ==================== */
.ds-screen::before {
  content: '';
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.03) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(0, 255, 136, 0.02) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(114, 46, 209, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.ds-screen__header,
.ds-screen__main {
  position: relative;
  z-index: 1;
}
</style>
