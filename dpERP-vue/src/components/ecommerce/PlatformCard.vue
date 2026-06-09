<template>
  <div class="platform-card" :class="{ 'is-connected': platform.status === 'connected', 'is-connecting': isConnecting }">
    <div class="platform-card-header">
      <div class="platform-icon" :style="{ background: platform.color }">
        {{ platform.icon }}
      </div>
      <div class="platform-info">
        <div class="platform-name">{{ platform.name }}</div>
        <span class="platform-status-badge" :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <div class="platform-card-stats">
      <div class="platform-stat">
        <span class="platform-stat-label">最后同步</span>
        <span class="platform-stat-value">{{ formatTime(platform.lastSyncTime) }}</span>
      </div>
      <div class="platform-stat">
        <span class="platform-stat-label">同步次数</span>
        <span class="platform-stat-value">{{ platform.syncCount }}</span>
      </div>
    </div>

    <div class="platform-card-actions">
      <template v-if="isConnecting">
        <button class="btn btn-sm btn-ghost platform-btn" disabled>
          <span class="spinner"></span>
          连接中...
        </button>
      </template>
      <template v-else-if="isSyncing">
        <button class="btn btn-sm btn-ghost platform-btn" disabled>
          <span class="spinner"></span>
          同步中...
        </button>
      </template>
      <template v-else-if="platform.status === 'connected'">
        <button class="btn btn-sm btn-primary platform-btn" @click="$emit('sync', platform.id)">
          <Icon name="refresh" :size="12" /> 立即同步
        </button>
        <button class="btn btn-sm btn-danger platform-btn" @click="$emit('disconnect', platform.id)">
          断开
        </button>
      </template>
      <template v-else>
        <button class="btn btn-sm btn-primary platform-btn" @click="$emit('connect', platform.id)">
          <Icon name="link" :size="12" /> 连接
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  platform: { type: Object, required: true },
  isConnecting: { type: Boolean, default: false },
  isSyncing: { type: Boolean, default: false }
})

defineEmits(['connect', 'disconnect', 'sync'])

const statusClass = computed(() => {
  switch (props.platform.status) {
    case 'connected': return 'badge-success'
    case 'expired': return 'badge-warning'
    default: return 'badge-neutral'
  }
})

const statusLabel = computed(() => {
  switch (props.platform.status) {
    case 'connected': return '已连接'
    case 'expired': return '已过期'
    default: return '未连接'
  }
})

function formatTime(time) {
  if (!time) return '暂无'
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.platform-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.platform-card:hover {
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.platform-card.is-connected {
  border-left: 3px solid var(--color-success);
}

.platform-card.is-connecting {
  opacity: 0.85;
}

.platform-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.platform-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.platform-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.platform-name {
  font-weight: 600;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.platform-status-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  width: fit-content;
}

.badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.badge-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.badge-neutral {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.platform-card-stats {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.platform-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.platform-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.platform-stat-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 500;
}

.platform-card-actions {
  display: flex;
  gap: var(--space-2);
}

.platform-btn {
  flex: 1;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-text-tertiary);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
