<template>
  <div class="role-select-page">
    <!-- 动态渐变背景 -->
    <div class="animated-bg"></div>

    <div class="role-select-container">
      <!-- 头部标题 -->
      <header class="role-header">
        <div class="role-logo">冠</div>
        <h1 class="role-title">冠久ERP</h1>
        <p class="role-subtitle">选择您的身份以进入系统</p>
      </header>

      <!-- 角色卡片网格 -->
      <div class="role-grid">
        <div
          v-for="role in roles"
          :key="role.name"
          class="role-card"
          :class="{ selected: selectedRole === role.name }"
          @click="selectedRole = role.name"
        >
          <div class="role-card-icon"><Icon :name="role.icon" :size="28" /></div>
          <div class="role-card-name">{{ role.name }}</div>
          <div class="role-card-desc">{{ role.desc }}</div>
        </div>
      </div>

      <!-- 在线成员 -->
      <div class="online-section">
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

      <!-- 进入按钮 -->
      <button
        class="enter-btn"
        :disabled="!selectedRole"
        @click="handleEnter"
      >
        进入系统
      </button>

      <!-- 底部 -->
      <footer class="role-footer">团队共享模式 · 无需个人账号密码</footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const sessionStore = useSessionStore()

/* 选中的角色 */
const selectedRole = ref(null)

/* 角色定义（name 与 permission store 的角色名完全一致） */
const roles = [
  { name: '管理员', icon: 'users', desc: '系统配置与全部权限' },
  { name: '总经理', icon: 'building', desc: '全局数据查看与审批' },
  { name: '销售主管', icon: 'table', desc: '销售团队管理与审批' },
  { name: '销售员', icon: 'dollar', desc: '客户与报价订单管理' },
  { name: '仓库主管', icon: 'package', desc: '仓库管理与库存审批' },
  { name: '仓管员', icon: 'tool', desc: '出入库与库存操作' },
  { name: '财务', icon: 'calculator', desc: '回款对账与财务报表' },
  { name: '查看者', icon: 'eye', desc: '只读查看所有数据' }
]

/* 进入系统 */
function handleEnter() {
  if (!selectedRole.value) return
  sessionStore.selectRole(selectedRole.value)
  router.push('/dashboard')
}

/* 页面加载时检查已有会话 */
onMounted(() => {
  if (sessionStore.restoreSession()) {
    router.replace('/dashboard')
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
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-4, 1rem);
  background: linear-gradient(135deg, var(--color-accent, #4F46E5), var(--color-purple, #8B5CF6));
  border-radius: var(--radius-lg, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.5rem;
}

.role-title {
  font-size: var(--font-size-2xl, 1.5rem);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2, 0.5rem);
}

.role-subtitle {
  font-size: var(--font-size-base, 0.875rem);
  color: var(--color-text-secondary);
}

/* 角色网格 */
.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4, 1rem);
  width: 100%;
  margin-bottom: var(--space-6, 1.5rem);
}

/* 角色卡片 */
.role-card {
  background: var(--color-surface, var(--color-bg-secondary));
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 1.25rem) var(--space-3, 0.75rem);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.role-card:hover {
  border-color: var(--color-accent, #4F46E5);
  background: var(--color-surface-hover, var(--color-bg-tertiary));
  transform: translateY(-2px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1));
}

.role-card.selected {
  border-color: var(--color-accent, #4F46E5);
  background: var(--color-accent-subtle, rgba(79,70,229,0.1));
  box-shadow: 0 0 0 1px var(--color-accent, #4F46E5);
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

/* 进入按钮 */
.enter-btn {
  width: 100%;
  max-width: 320px;
  padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
  background: var(--color-accent, #4F46E5);
  color: #fff;
  border: none;
  border-radius: var(--radius-lg, 12px);
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: var(--space-6, 1.5rem);
}

.enter-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
}

.enter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 底部 */
.role-footer {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-tertiary);
  text-align: center;
}

/* 响应式：移动端2列 */
@media (max-width: 1024px) {
  .role-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .role-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .role-select-container {
    padding: var(--space-4);
  }
}
@media (max-width: 640px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
  .role-select-container {
    padding: var(--space-6, 1.5rem) var(--space-4, 1rem);
  }
}
</style>
