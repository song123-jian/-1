<template>
  <div class="login-page">
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
    <div class="animated-bg"></div>

    <div class="login-card">
      <header class="login-header">
        <div class="login-logo">冠</div>
        <h1 class="login-title">冠久 ERP</h1>
        <p class="login-subtitle">请输入账号密码登录系统</p>
      </header>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="field-item">
          <span class="field-label">账号</span>
          <input
            v-model="form.account"
            class="field-input"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
          />
        </label>

        <label class="field-item">
          <span class="field-label">密码</span>
          <div class="password-wrapper">
            <input
              v-model="form.password"
              class="field-input password-input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <div class="remember-row">
          <label class="remember-item">
            <input v-model="rememberAccount" type="checkbox" @change="handleRememberAccountChange" />
            <span>记住账号</span>
          </label>
          <label class="remember-item">
            <input v-model="rememberPassword" type="checkbox" @change="handleRememberPasswordChange" />
            <span>记住密码</span>
          </label>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button class="login-btn btn-ripple" :disabled="submitting || !canSubmit" type="submit">
          {{ submitting ? '登录中...' : '登录系统' }}
        </button>
      </form>

      <footer class="login-footer">登录后默认进入管理员权限，已保留原有业务权限控制链路</footer>
    </div>
  </div>
</template>

<script>
export default { name: 'RoleSelect' }
</script>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()

const form = reactive({
  account: '',
  password: ''
})
const rememberAccount = ref(false)
const rememberPassword = ref(false)
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

const canSubmit = computed(() => form.account.trim() && form.password)

function getRedirectTarget() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
}

async function goNextPage() {
  await router.replace(getRedirectTarget()).catch(() => {})
}

function handleRememberAccountChange() {
  if (!rememberAccount.value) {
    rememberPassword.value = false
  }
}

function handleRememberPasswordChange() {
  if (rememberPassword.value) {
    rememberAccount.value = true
  }
}

async function handleLogin() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  errorMessage.value = ''

  const result = sessionStore.login(form.account, form.password, {
    rememberAccount: rememberAccount.value,
    rememberPassword: rememberPassword.value
  })

  if (!result.success) {
    errorMessage.value = result.message
    submitting.value = false
    return
  }

  await goNextPage()
  submitting.value = false
}

const particleCanvas = ref(null)
let animationId = null
let handleResize = () => {}

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let width = (canvas.width = window.innerWidth)
  let height = (canvas.height = window.innerHeight)
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

    particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x < 0) particle.x = width
      if (particle.x > width) particle.x = 0
      if (particle.y < 0) particle.y = height
      if (particle.y > height) particle.y = 0

      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(59, 130, 246, ${particle.alpha})`
      ctx.fill()
    })

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 120) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - distance / 120)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    animationId = requestAnimationFrame(draw)
  }

  draw()

  handleResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }

  window.addEventListener('resize', handleResize)
}

onMounted(async () => {
  initParticles()

  if (sessionStore.restoreSession()) {
    await router.replace('/dashboard').catch(() => {})
    return
  }

  const remembered = sessionStore.rememberedLogin
  form.account = remembered.account || ''
  form.password = remembered.password || ''
  rememberAccount.value = remembered.rememberAccount
  rememberPassword.value = remembered.rememberPassword

  const skipAutoLoginOnce = sessionStore.consumeSkipAutoLoginOnce()
  if (!skipAutoLoginOnce && rememberPassword.value && form.account && form.password) {
    const loggedIn = sessionStore.autoLoginWithRememberedLogin()
    if (loggedIn) {
      await goNextPage()
    }
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-bg-primary);
  overflow: auto;
  z-index: var(--z-popover, 9999);
}

.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

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

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  padding: 32px 28px;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: color-mix(in srgb, var(--color-surface, var(--color-bg-secondary)) 88%, transparent);
  backdrop-filter: blur(18px);
  box-shadow:
    var(--shadow-xl, 0 24px 48px rgba(15, 23, 42, 0.18)),
    0 0 40px rgba(59, 130, 246, 0.12);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-accent, #3b82f6), var(--color-purple, #8b5cf6), #ec4899);
  background-size: 200% 200%;
  animation:
    gradientShift 4s ease infinite,
    fadeInScale 600ms ease;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.login-title {
  margin: 0 0 8px;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.login-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.field-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-accent, #3b82f6);
  box-shadow:
    0 0 0 3px var(--color-accent-subtle, rgba(59, 130, 246, 0.15)),
    0 10px 24px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.password-wrapper {
  position: relative;
}

.password-input {
  padding-right: 72px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--color-accent, #3b82f6);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.remember-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
}

.remember-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent, #3b82f6);
}

.error-message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  font-size: 0.875rem;
}

.login-btn {
  width: 100%;
  padding: 13px 18px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  background-size: 200% 200%;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    background-position 0.25s ease;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.28);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background-position: 100% 50%;
  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.36);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

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
  background: rgba(255, 255, 255, 0.28);
  transform: translate(-50%, -50%);
  transition:
    width 0.4s ease,
    height 0.4s ease,
    opacity 0.4s ease;
  opacity: 0;
}

.btn-ripple:active::after {
  width: 280px;
  height: 280px;
  opacity: 1;
  transition: 0s;
}

.login-footer {
  margin-top: 18px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.8125rem;
  line-height: 1.6;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes fadeInScale {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 16px;
  }

  .login-card {
    padding: 26px 20px;
    border-radius: 20px;
  }

  .remember-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
