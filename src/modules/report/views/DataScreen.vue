<template>
  <div class="ds-screen" :class="{ 'ds-screen--fullscreen': isFullscreen }">
    <!-- 粒子背景 -->
    <canvas ref="particleCanvas" class="ds-screen__particles"></canvas>

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
        <div class="ds-screen__refresh-indicator">
          <span class="ds-screen__pulse-dot"></span>
          <span class="ds-screen__refresh-text">实时更新 · {{ lastUpdateTime }} · {{ refreshInterval }}s</span>
        </div>
        <div class="ds-screen__clock">{{ currentTime }}</div>
        <button class="ds-screen__fullscreen-btn" :title="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen">
          <Icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="18" />
        </button>
      </div>
    </header>

    <!-- 实时滚动数据条 -->
    <div class="ds-screen__running">
      <RunningNumbers :items="dataScreenStore.runningNumbers" />
      <transition name="ds-toast">
        <div v-if="showToast" class="ds-screen__toast">
          <span class="ds-screen__toast-dot"></span>
          新数据已更新
        </div>
      </transition>
    </div>

    <!-- 主体内容 -->
    <main class="ds-screen__main">
      <!-- 第一行：统计卡片 -->
      <section class="ds-screen__cards">
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="trendUp" :size="14" />
            <span>销售概览</span>
          </div>
          <div class="ds-screen__card-grid" :class="{ 'ds-screen__card-grid--flash': isFlashing }">
            <StatCard v-for="card in dataScreenStore.salesCards" :key="card.title" v-bind="card" />
          </div>
        </div>
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="package" :size="14" />
            <span>库存概览</span>
          </div>
          <div class="ds-screen__card-grid" :class="{ 'ds-screen__card-grid--flash': isFlashing }">
            <StatCard v-for="card in dataScreenStore.inventoryCards" :key="card.title" v-bind="card" />
          </div>
        </div>
        <div class="ds-screen__card-group">
          <div class="ds-screen__group-label">
            <Icon name="dollar" :size="14" />
            <span>财务概览</span>
          </div>
          <div class="ds-screen__card-grid" :class="{ 'ds-screen__card-grid--flash': isFlashing }">
            <StatCard v-for="card in dataScreenStore.financeCards" :key="card.title" v-bind="card" />
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
          <RankList title="热销排行 Top10" :items="dataScreenStore.topProducts" />
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
          <AlertList title="预警中心" :alerts="dataScreenStore.allAlerts" />
        </div>
      </section>
    </main>
  </div>
</template>

<script>
export default { name: 'ReportDataScreen' }
</script>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDataScreenStore } from '@/modules/report/stores/dataScreen'
import StatCard from '@/modules/report/components/datascreen/StatCard.vue'
import TrendChart from '@/modules/report/components/datascreen/TrendChart.vue'
import RankList from '@/modules/report/components/datascreen/RankList.vue'
import AlertList from '@/modules/report/components/datascreen/AlertList.vue'
import RunningNumbers from '@/modules/report/components/datascreen/RunningNumbers.vue'

const dataScreenStore = useDataScreenStore()

/* ==================== 组件存活标记 ==================== */
let isMounted = false

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

/* ==================== 实时数据刷新 ==================== */
const refreshInterval = ref(30)
const lastUpdateTime = ref('--:--:--')
const isFlashing = ref(false)
const showToast = ref(false)
let refreshTimer = null
let toastTimer = null
let flashTimer = null

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function onRefreshData() {
  if (!isMounted) return
  lastUpdateTime.value = formatTime(new Date())

  // 触发卡片闪烁效果
  isFlashing.value = true
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    isFlashing.value = false
  }, 600)

  // 显示toast提示
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    if (isMounted) showToast.value = false
  }, 3000)
}

/* ==================== 全屏切换 ==================== */
const isFullscreen = ref(false)

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
}

function requestFullscreen(el) {
  if (el.requestFullscreen) return el.requestFullscreen()
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen()
  if (el.msRequestFullscreen) return el.msRequestFullscreen()
  return Promise.reject(new Error('Fullscreen API not supported'))
}

function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen()
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen()
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen()
  if (document.msExitFullscreen) return document.msExitFullscreen()
  return Promise.reject(new Error('Fullscreen API not supported'))
}

function toggleFullscreen() {
  if (!getFullscreenElement()) {
    requestFullscreen(document.documentElement)
      .then(() => {
        isFullscreen.value = true
      })
      .catch(() => {
        // 全屏请求被拒绝或不支持
      })
  } else {
    exitFullscreen()
      .then(() => {
        isFullscreen.value = false
      })
      .catch(() => {
        // 退出全屏失败
      })
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!getFullscreenElement()
}

/* ==================== 粒子背景 ==================== */
const particleCanvas = ref(null)
let particleAnimFrame = null
let onParticleResize = null

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let width = (canvas.width = window.innerWidth)
  let height = (canvas.height = window.innerHeight)

  const particles = []
  const count = 40

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.1
    })
  }

  function draw() {
    if (!isMounted) return
    ctx.clearRect(0, 0, width, height)

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`
      ctx.fill()
    }

    // 连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 150)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    particleAnimFrame = requestAnimationFrame(draw)
  }

  draw()

  onParticleResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onParticleResize)
}

/* ==================== 统一生命周期管理 ==================== */
onMounted(() => {
  isMounted = true

  // 时钟
  updateClock()
  clockTimer = setInterval(updateClock, 1000)

  // 数据刷新
  lastUpdateTime.value = formatTime(new Date())
  refreshTimer = setInterval(onRefreshData, refreshInterval.value * 1000)

  // 全屏事件
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)

  // 粒子动画
  initParticles()
})

onUnmounted(() => {
  isMounted = false

  // 时钟
  if (clockTimer) clearInterval(clockTimer)

  // 数据刷新
  if (refreshTimer) clearInterval(refreshTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (flashTimer) clearTimeout(flashTimer)

  // 全屏事件
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)

  // 粒子动画
  if (particleAnimFrame) cancelAnimationFrame(particleAnimFrame)
  if (onParticleResize) window.removeEventListener('resize', onParticleResize)
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
  position: relative;
}

.ds-screen--fullscreen {
  height: 100vh;
  overflow: hidden;
}

/* 粒子背景 */
.ds-screen__particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* ==================== 头部 ==================== */
.ds-screen__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  background: linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  position: relative;
  z-index: var(--z-base);
}

/* 头部底部装饰线 */
.ds-screen__header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), rgba(0, 255, 136, 0.3), transparent);
}

.ds-screen__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.ds-screen__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #00d4ff, #0088cc);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  position: relative;
}

/* Logo呼吸动画 */
@keyframes logo-breathe {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
  }
}

.ds-screen__logo {
  animation: logo-breathe 3s ease-in-out infinite;
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
  gap: var(--space-4);
}

/* ==================== 实时刷新指示器 ==================== */
.ds-screen__refresh-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 20px;
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.ds-screen__pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ff88;
  position: relative;
  flex-shrink: 0;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.6);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(0, 255, 136, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 136, 0);
  }
}

.ds-screen__pulse-dot {
  animation: pulse-ring 2s ease-out infinite;
}

.ds-screen__refresh-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
  white-space: nowrap;
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

/* ==================== 滚动数据条 ==================== */
.ds-screen__running {
  padding: 0 var(--space-8);
  margin-top: var(--space-3);
  position: relative;
  z-index: var(--z-base);
}

/* ==================== 数据更新Toast提示 ==================== */
.ds-screen__toast {
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 20px;
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.3);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  white-space: nowrap;
  z-index: 2;
  pointer-events: none;
}

.ds-screen__toast-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00ff88;
  flex-shrink: 0;
}

/* toast 进入/离开动画 */
.ds-toast-enter-active {
  transition: all 0.4s ease-out;
}
.ds-toast-leave-active {
  transition: all 0.3s ease-in;
}
.ds-toast-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}
.ds-toast-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}

/* ==================== 卡片数据闪烁效果 ==================== */
@keyframes data-flash {
  0% {
    background-color: transparent;
  }
  30% {
    background-color: rgba(0, 212, 255, 0.12);
  }
  100% {
    background-color: transparent;
  }
}

.ds-screen__card-grid--flash {
  animation: data-flash 0.6s ease-out;
  border-radius: 8px;
}

/* ==================== 主体 ==================== */
.ds-screen__main {
  flex: 1;
  padding: var(--space-4) var(--space-8) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-height: 0;
  position: relative;
  z-index: var(--z-base);
}

/* ==================== 卡片区域 ==================== */
.ds-screen__cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  flex-shrink: 0;
}

.ds-screen__card-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ds-screen__group-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.ds-screen__card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}

/* ==================== 图表行 ==================== */
.ds-screen__charts-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr;
  gap: var(--space-5);
  min-height: 300px;
}

.ds-screen__bottom-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: var(--space-5);
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
    padding: var(--space-4);
  }
  .ds-screen__header {
    padding: var(--space-3) var(--space-4);
  }
  .ds-screen__running {
    padding: 0 var(--space-4);
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
  .ds-screen__refresh-indicator {
    display: none;
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
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 255, 136, 0.02) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(114, 46, 209, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
</style>
