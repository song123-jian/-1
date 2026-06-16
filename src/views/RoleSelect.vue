<template>
  <div class="role-select-page">
    <!-- Canvas粒子背景 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
    <!-- 动态渐变背景 -->
    <div class="animated-bg"></div>

    <div class="role-select-container">
      <!-- 头部标题 -->
      <header class="role-header">
        <div class="role-logo">冠</div>
        <h1 class="role-title">冠久ERP</h1>
        <p class="role-slogan">智领未来，久经考验</p>
        <p class="role-subtitle">选择您的身份以进入系统</p>
      </header>

      <!-- 角色分组卡片 -->
      <div class="role-categories">
        <div v-for="category in roleCategories" :key="category.label" class="role-category">
          <div class="category-label">{{ category.label }}</div>
          <div class="category-grid">
            <div
              v-for="role in category.roles"
              :key="role.name"
              class="role-card"
              :class="{ selected: selectedRole === role.name }"
              @click="selectedRole = role.name"
            >
              <div class="role-card-icon"><Icon :name="role.icon" :size="28" /></div>
              <div class="role-card-name">{{ role.name }}</div>
              <div class="role-card-desc">{{ role.desc }}</div>
              <div v-if="isLastUsedRole(role.name)" class="role-card-badge">上次使用</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 在线成员（仅团队模式显示） -->
      <div v-if="!sessionStore.isSoloMode" class="online-section">
        <div class="online-header">
          <span class="online-dot"></span>
          <span class="online-label">当前在线</span>
          <span class="online-count">{{ sessionStore.onlineMembers.length }}人</span>
        </div>
        <div class="online-members" v-if="sessionStore.onlineMembers.length">
          <span v-for="m in sessionStore.onlineMembers" :key="m" class="online-member">
            <span class="member-dot"></span>
            {{ m }}
          </span>
        </div>
        <div class="online-empty" v-else>暂无其他成员在线</div>
      </div>

      <!-- 记住身份复选框 -->
      <label class="remember-check">
        <input type="checkbox" v-model="rememberRole" />
        <span class="checkmark"></span>
        <span class="remember-label">记住我的身份</span>
        <span class="remember-hint">下次自动进入，无需重新选择</span>
      </label>

      <!-- 进入按钮 -->
      <button
        class="enter-btn btn-ripple"
        :disabled="!selectedRole"
        @click="handleEnter"
      >
        进入系统
      </button>

      <!-- 底部 -->
      <footer class="role-footer">
        {{ sessionStore.isSoloMode ? '个人使用模式 · 自动记住身份' : '团队共享模式 · 无需个人账号密码' }}
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { RoleCategories } from '@/constants/roles'

const router = useRouter()
const sessionStore = useSessionStore()

/* 选中的角色 */
const selectedRole = ref(null)

/* 是否记住角色 */
const rememberRole = ref(!!sessionStore.rememberedRole)

/* 角色分组定义 */
const roleCategories = RoleCategories

/* 判断是否为上次使用的角色 */
function isLastUsedRole(roleName) {
  return sessionStore.rememberedRole === roleName
}

/* 进入系统 */
function handleEnter() {
  if (!selectedRole.value) return
  sessionStore.selectRole(selectedRole.value, rememberRole.value)
  router.push('/dashboard')
}

/* Canvas粒子背景 */
const particleCanvas = ref(null)
let animationId = null

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let width = canvas.width = window.innerWidth
  let height = canvas.height = window.innerHeight

  const particles = []
  const count = 60
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.1
    })
  }

  function draw() {
    ctx.clearRect(0, 0, width, height)
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`
      ctx.fill()
    })
    /* 连线 */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - dist / 120)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    animationId = requestAnimationFrame(draw)
  }
  draw()

  const handleResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', handleResize)
}

/* 页面加载时检查已有会话或记住的角色 */
onMounted(() => {
  /* 初始化粒子背景 */
  initParticles()
  /* 尝试恢复已有会话 */
  if (sessionStore.restoreSession()) {
    router.replace('/dashboard')
    return
  }
  /* 如果有记住的角色，自动选中 */
  if (sessionStore.rememberedRole) {
    selectedRole.value = sessionStore.rememberedRole
    rememberRole.value = true
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
})
</script>

<style scoped>
/* 页面容器 */
.role-select-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  overflow-y: auto;
  z-index: var(--z-popover, 9999);
}

/* Canvas粒子背景 */
.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* 动态渐变背景 */
.animated-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    var(--color-bg-primary) 0%,
    var(--color-bg-secondary) 40%,
    var(--color-bg-primary) 70%,
    var(--color-bg-tertiary, var(--color-bg-secondary)) 100%
  );
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 内容容器 */
.role-select-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 720px;
  padding: var(--space-8, 2rem) var(--space-6, 1.5rem);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 头部 */
.role-header {
  text-align: center;
  margin-bottom: var(--space-8, 2rem);
}

.role-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-4, 1rem);
  background: linear-gradient(135deg, var(--color-accent, #3b82f6), var(--color-purple, #8b5cf6), #ec4899);
  background-size: 200% 200%;
  animation: gradientShift 4s ease infinite, fadeInScale 600ms ease;
  border-radius: var(--radius-xl, 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.75rem;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.role-title {
  font-size: var(--font-size-2xl, 1.5rem);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2, 0.5rem);
}

.role-slogan {
  font-size: var(--font-size-sm, 0.8125rem);
  font-weight: 500;
  background: linear-gradient(90deg, var(--color-accent, #3b82f6), var(--color-purple, #8b5cf6));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-1, 0.25rem);
  animation: fadeInUp 600ms ease 200ms both;
}

.role-subtitle {
  font-size: var(--font-size-base, 0.875rem);
  color: var(--color-text-secondary);
}

/* 角色分组 */
.role-categories {
  width: 100%;
  margin-bottom: var(--space-6, 1.5rem);
}

.role-category {
  margin-bottom: var(--space-4, 1rem);
}

.category-label {
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2, 0.5rem);
  padding-left: var(--space-1, 0.25rem);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-1, 0.25rem);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3, 0.75rem);
}

/* 角色卡片 */
.role-card {
  background: var(--color-surface, var(--color-bg-secondary));
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 1rem) var(--space-3, 0.75rem);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  position: relative;
}

.role-card:hover {
  border-color: var(--color-accent, #3b82f6);
  background: var(--color-surface-hover, var(--color-bg-tertiary));
  transform: translateY(-4px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1)), 0 0 16px rgba(59, 130, 246, 0.1);
}

.role-card.selected {
  border-color: var(--color-accent, #3b82f6);
  background: var(--color-accent-subtle, rgba(79,70,229,0.1));
  box-shadow: 0 0 0 1px var(--color-accent, #3b82f6), 0 0 20px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.role-card-icon {
  font-size: 2rem;
  margin-bottom: var(--space-2, 0.5rem);
  line-height: 1;
}

.role-card-name {
  font-size: var(--font-size-md, 0.9375rem);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1, 0.25rem);
}

.role-card-desc {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.role-card-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  padding: 1px 6px;
  background: var(--color-accent, #4F46E5);
  color: #fff;
  border-radius: var(--radius-full, 9999px);
  font-weight: 500;
}

/* 在线成员区域 */
.online-section {
  width: 100%;
  background: var(--color-surface, var(--color-bg-secondary));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 1rem);
  margin-bottom: var(--space-6, 1.5rem);
}

.online-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
  margin-bottom: var(--space-3, 0.75rem);
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success, #10B981);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.online-label {
  font-size: var(--font-size-sm, 0.8125rem);
  font-weight: 500;
  color: var(--color-text-primary);
}

.online-count {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.online-members {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem);
}

.online-member {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 0.25rem);
  padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
  background: var(--color-success-subtle, rgba(16,185,129,0.1));
  border-radius: var(--radius-full, 9999px);
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-success, #10B981);
}

.member-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success, #10B981);
  flex-shrink: 0;
}

.online-empty {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
}

/* 记住身份复选框 */
.remember-check {
  display: flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
  width: 100%;
  max-width: 320px;
  margin-bottom: var(--space-4, 1rem);
  cursor: pointer;
  user-select: none;
}

.remember-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-accent, #4F46E5);
  cursor: pointer;
  flex-shrink: 0;
}

.remember-check input[type="checkbox"]:checked {
  animation: fadeInScale 200ms ease;
}

.remember-label {
  font-size: var(--font-size-sm, 0.8125rem);
  font-weight: 500;
  color: var(--color-text-primary);
}

.remember-hint {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

/* 进入按钮 */
.enter-btn {
  width: 100%;
  max-width: 320px;
  padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  background-size: 200% 200%;
  color: #fff;
  border: none;
  border-radius: var(--radius-lg, 12px);
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-bottom: var(--space-6, 1.5rem);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.enter-btn:hover:not(:disabled) {
  background-position: 100% 50%;
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
}

.enter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 波纹效果 */
.btn-ripple {
  position: relative;
  overflow: hidden;
}
.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease, opacity 0.4s ease;
  opacity: 0;
}
.btn-ripple:active::after {
  width: 300px;
  height: 300px;
  opacity: 1;
  transition: 0s;
}

/* 底部 */
.role-footer {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: 1fr;
  }
  .role-select-container {
    padding: var(--space-4);
  }
  .remember-hint {
    display: none;
  }
}
</style>
