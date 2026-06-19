<template>
  <div class="ds-screen" :class="[`ds-theme--${currentTheme}`, { 'ds-screen--fullscreen': isFullscreen }]">
    <!-- 三层Canvas背景 -->
    <canvas ref="starCanvas" class="ds-screen__bg-star"></canvas>
    <canvas ref="gridCanvas" class="ds-screen__bg-grid"></canvas>
    <canvas ref="particleCanvas" class="ds-screen__bg-particle"></canvas>
    <!-- 扫描线 -->
    <div class="ds-screen__scanline"></div>

    <!-- 头部 -->
    <header class="ds-screen__header">
      <div class="ds-screen__header-left">
        <div class="ds-screen__logo">冠</div>
        <div>
          <h1 class="ds-screen__title">冠久ERP 数据大屏</h1>
          <p class="ds-screen__slogan">智领未来，久经考验</p>
        </div>
      </div>
      <div class="ds-screen__header-center">
        <SceneTab v-model="currentScene" />
      </div>
      <div class="ds-screen__header-right">
        <div class="ds-screen__time-dim">
          <button
            v-for="dim in timeDims"
            :key="dim.key"
            class="ds-screen__time-btn"
            :class="{ active: timeDimension === dim.key }"
            @click="setTimeDimension(dim.key)"
          >
            {{ dim.label }}
          </button>
        </div>
        <div class="ds-screen__refresh">
          <span class="ds-screen__pulse-dot"></span>
          <span class="ds-screen__refresh-text">实时 · {{ lastUpdateTime }}</span>
        </div>
        <div class="ds-screen__clock">{{ currentTime }}</div>
        <ThemeSwitch v-model="currentTheme" />
        <button class="ds-screen__fs-btn" @click="toggleFullscreen">
          <Icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="16" />
        </button>
      </div>
    </header>

    <!-- 滚动数据条 -->
    <RunningBar :items="dataScreenStore.runningNumbers" />

    <!-- 场景内容 -->
    <main class="ds-screen__main">
      <transition name="ds-scene" mode="out-in">
        <SalesScene v-if="currentScene === 'sales'" />
        <InventoryScene v-else-if="currentScene === 'inventory'" />
        <FinanceScene v-else-if="currentScene === 'finance'" />
        <OverviewScene v-else />
      </transition>
    </main>
  </div>
</template>

<script>
export default { name: 'DataScreen' }
</script>
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDataScreenStore } from '@/stores/dataScreen'
import SceneTab from './components/SceneTab.vue'
import ThemeSwitch from './components/ThemeSwitch.vue'
import RunningBar from './components/RunningBar.vue'
import SalesScene from './scenes/SalesScene.vue'
import InventoryScene from './scenes/InventoryScene.vue'
import FinanceScene from './scenes/FinanceScene.vue'
import OverviewScene from './scenes/OverviewScene.vue'

const dataScreenStore = useDataScreenStore()
const currentScene = ref(dataScreenStore.currentScene)
const currentTheme = ref(dataScreenStore.currentTheme)
const timeDimension = ref(dataScreenStore.timeDimension)

watch(currentScene, (v) => dataScreenStore.setScene(v))
watch(currentTheme, (v) => dataScreenStore.setTheme(v))
watch(timeDimension, (v) => dataScreenStore.setTimeDimension(v))

const timeDims = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' }
]

/* 时钟 */
const currentTime = ref('')
const lastUpdateTime = ref('--:--:--')
let clockTimer = null
let refreshTimer = null
let isMounted = false

function updateClock() {
  const now = new Date()
  currentTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

/* 全屏 */
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .then(() => (isFullscreen.value = true))
      .catch(() => {})
  } else {
    document
      .exitFullscreen()
      .then(() => (isFullscreen.value = false))
      .catch(() => {})
  }
}

/* 背景Canvas */
const starCanvas = ref(null)
const gridCanvas = ref(null)
const particleCanvas = ref(null)
let starAnim = null,
  gridAnim = null,
  particleAnim = null

function initStars() {
  const canvas = starCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = (canvas.width = window.innerWidth),
    h = (canvas.height = window.innerHeight)
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.3,
    alpha: Math.random() * 0.6 + 0.2,
    twinkle: Math.random() * 0.02 + 0.005
  }))
  function draw() {
    if (!isMounted) return
    ctx.clearRect(0, 0, w, h)
    stars.forEach((s) => {
      s.alpha += s.twinkle
      if (s.alpha > 0.8 || s.alpha < 0.1) s.twinkle = -s.twinkle
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`
      ctx.fill()
    })
    starAnim = requestAnimationFrame(draw)
  }
  draw()
}

function initGrid() {
  const canvas = gridCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = (canvas.width = window.innerWidth),
    h = (canvas.height = window.innerHeight)
  function draw() {
    if (!isMounted) return
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)'
    ctx.lineWidth = 0.5
    const gap = 60
    for (let x = 0; x < w; x += gap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += gap) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    gridAnim = requestAnimationFrame(draw)
  }
  draw()
}

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = (canvas.width = window.innerWidth),
    h = (canvas.height = window.innerHeight)
  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.3 + 0.1
  }))
  function draw() {
    if (!isMounted) return
    ctx.clearRect(0, 0, w, h)
    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = w
      if (p.x > w) p.x = 0
      if (p.y < 0) p.y = h
      if (p.y > h) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`
      ctx.fill()
    })
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x,
          dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 120)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    particleAnim = requestAnimationFrame(draw)
  }
  draw()
}

onMounted(() => {
  isMounted = true
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  lastUpdateTime.value = updateClock() || new Date().toTimeString().slice(0, 8)
  refreshTimer = setInterval(() => {
    lastUpdateTime.value = new Date().toTimeString().slice(0, 8)
  }, 30000)
  document.addEventListener('fullscreenchange', _handleFullscreenChange)
  initStars()
  initGrid()
  initParticles()
})

function _handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onUnmounted(() => {
  isMounted = false
  if (clockTimer) clearInterval(clockTimer)
  if (refreshTimer) clearInterval(refreshTimer)
  if (starAnim) cancelAnimationFrame(starAnim)
  if (gridAnim) cancelAnimationFrame(gridAnim)
  if (particleAnim) cancelAnimationFrame(particleAnim)
  document.removeEventListener('fullscreenchange', _handleFullscreenChange)
})
</script>

<style scoped>
/* 主题变量 */
.ds-theme--dark-tech {
  --ds-bg: #0a0e27;
  --ds-primary: #00d4ff;
  --ds-accent: #00ff88;
  --ds-surface: rgba(255, 255, 255, 0.03);
  --ds-border: rgba(255, 255, 255, 0.06);
  --ds-text: rgba(255, 255, 255, 0.85);
  --ds-text-dim: rgba(255, 255, 255, 0.45);
  --ds-glow: rgba(0, 212, 255, 0.3);
}
.ds-theme--gold-biz {
  --ds-bg: #1a1a2e;
  --ds-primary: #fbbf24;
  --ds-accent: #f59e0b;
  --ds-surface: rgba(251, 191, 36, 0.04);
  --ds-border: rgba(251, 191, 36, 0.1);
  --ds-text: rgba(255, 255, 255, 0.85);
  --ds-text-dim: rgba(255, 255, 255, 0.45);
  --ds-glow: rgba(251, 191, 36, 0.3);
}
.ds-theme--cyberpunk {
  --ds-bg: #0d0d0d;
  --ds-primary: #ff00ff;
  --ds-accent: #00ffff;
  --ds-surface: rgba(255, 0, 255, 0.04);
  --ds-border: rgba(255, 0, 255, 0.1);
  --ds-text: rgba(255, 255, 255, 0.9);
  --ds-text-dim: rgba(255, 255, 255, 0.5);
  --ds-glow: rgba(255, 0, 255, 0.3);
}
.ds-theme--light-clean {
  --ds-bg: #f8fafc;
  --ds-primary: #3b82f6;
  --ds-accent: #10b981;
  --ds-surface: rgba(0, 0, 0, 0.03);
  --ds-border: rgba(0, 0, 0, 0.08);
  --ds-text: rgba(15, 23, 42, 0.9);
  --ds-text-dim: rgba(15, 23, 42, 0.45);
  --ds-glow: rgba(59, 130, 246, 0.2);
}

.ds-screen {
  min-height: 100vh;
  background: var(--ds-bg);
  color: var(--ds-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  position: relative;
  transition:
    background 0.3s,
    color 0.3s;
}
.ds-screen--fullscreen {
  height: 100vh;
  overflow: hidden;
}

/* Canvas背景层 */
.ds-screen__bg-star,
.ds-screen__bg-grid,
.ds-screen__bg-particle {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.ds-screen__bg-star {
  z-index: 0;
}
.ds-screen__bg-grid {
  z-index: 0;
}
.ds-screen__bg-particle {
  z-index: 0;
}

/* 扫描线 */
@keyframes scanline {
  0% {
    top: -5%;
  }
  100% {
    top: 105%;
  }
}
.ds-screen__scanline {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(180deg, transparent, var(--ds-primary), transparent);
  opacity: 0.08;
  z-index: 0;
  pointer-events: none;
  animation: scanline 8s linear infinite;
}

/* 头部 */
.ds-screen__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: linear-gradient(180deg, var(--ds-glow), transparent);
  border-bottom: 1px solid var(--ds-border);
  flex-shrink: 0;
  position: relative;
  z-index: var(--z-base);
}
.ds-screen__header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ds-primary), var(--ds-accent), transparent);
}
.ds-screen__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ds-screen__logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--ds-primary), var(--ds-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.2rem;
  box-shadow: 0 0 20px var(--ds-glow);
}
.ds-screen__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(90deg, var(--ds-primary), var(--ds-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ds-screen__slogan {
  font-size: 11px;
  color: var(--ds-text-dim);
  letter-spacing: 1px;
  margin-top: 2px;
}
.ds-screen__header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.ds-screen__header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.ds-screen__time-dim {
  display: flex;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 2px;
}
.ds-screen__time-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--ds-text-dim);
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.ds-screen__time-btn.active {
  color: #fff;
  background: rgba(0, 212, 255, 0.15);
}
.ds-screen__time-btn:hover {
  color: var(--ds-text);
}
.ds-screen__refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.15);
}
.ds-screen__pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00ff88;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.6);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(0, 255, 136, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 136, 0);
  }
}
.ds-screen__refresh-text {
  font-size: 11px;
  color: var(--ds-text-dim);
  white-space: nowrap;
}
.ds-screen__clock {
  font-size: 24px;
  font-weight: 700;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
  color: var(--ds-text);
  letter-spacing: 2px;
}
.ds-screen__fs-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  color: var(--ds-text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ds-screen__fs-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ds-text);
}

/* 主体 */
.ds-screen__main {
  flex: 1;
  padding: 16px 24px 24px;
  position: relative;
  z-index: var(--z-base);
  min-height: 0;
}

/* 场景切换动画 */
.ds-scene-enter-active {
  transition: all 0.3s ease;
}
.ds-scene-leave-active {
  transition: all 0.2s ease;
}
.ds-scene-enter-from {
  opacity: 0;
  transform: scale(0.98);
}
.ds-scene-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* 响应式 */
@media (max-width: 1200px) {
  .ds-screen__header {
    padding: 8px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ds-screen__time-dim {
    display: none;
  }
  .ds-screen__main {
    padding: 12px 16px 16px;
  }
}
</style>
