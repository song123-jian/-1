<template>
  <div class="notification-bell" ref="bellRef">
    <!-- 铃铛按钮 -->
    <button class="bell-btn" @click="togglePanel" title="通知中心">
      <Icon name="bell" :size="18" />
      <span v-if="notificationStore.unreadCount > 0" class="bell-badge">
        {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
      </span>
    </button>

    <!-- 通知面板 -->
    <Transition name="panel">
      <div v-if="showPanel" class="notification-panel">
        <div class="panel-header">
          <h3 class="panel-title">通知中心</h3>
          <div class="panel-actions">
            <button
              v-if="notificationStore.unreadCount > 0"
              class="panel-action-btn"
              @click="handleMarkAllRead"
            >全部已读</button>
            <button class="panel-action-btn" @click="handleClearAll">清空</button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="panel-tabs">
          <button
            v-for="tab in panelTabs"
            :key="tab.key"
            class="panel-tab"
            :class="{ active: activePanelTab === tab.key }"
            @click="activePanelTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- 通知列表 -->
        <div class="panel-list">
          <div
            v-for="item in filteredNotifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read, [`level-${item.level}`]: true }"
            @click="handleClickItem(item)"
          >
            <div class="item-icon">
              <Icon :name="getItemIcon(item)" :size="16" />
            </div>
            <div class="item-content">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-desc">{{ item.content }}</div>
              <div class="item-time">{{ formatTime(item.createTime) }}</div>
            </div>
            <div class="item-actions">
              <button
                v-if="!item.read"
                class="item-read-btn"
                @click.stop="handleMarkRead(item.id)"
                title="标记已读"
              >
                <Icon name="check" :size="12" />
              </button>
              <button
                class="item-delete-btn"
                @click.stop="handleDelete(item.id)"
                title="删除"
              >
                <Icon name="close" :size="12" />
              </button>
            </div>
          </div>
          <div v-if="filteredNotifications.length === 0" class="panel-empty">
            <Icon name="bell" :size="32" />
            <p>暂无通知</p>
          </div>
          <div v-if="hasMoreNotifications" class="panel-load-more">
            <button class="load-more-btn" @click="loadMore">加载更多</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { NotificationType, NotificationLevel } from '@/stores/notification'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const notificationStore = useNotificationStore()
const confirm = useConfirm()

const showPanel = ref(false)
const activePanelTab = ref('all')
const bellRef = ref(null)
const displayLimit = ref(20)

watch(activePanelTab, () => {
  displayLimit.value = 20
})

const panelTabs = computed(() => [
  { key: 'all', label: '全部', count: notificationStore.notifications.length },
  { key: 'todo', label: '待办', count: notificationStore.getByType(NotificationType.TODO).filter(n => !n.read).length },
  { key: 'alert', label: '预警', count: notificationStore.getByType(NotificationType.ALERT).filter(n => !n.read).length },
  { key: 'message', label: '消息', count: notificationStore.getByType(NotificationType.MESSAGE).filter(n => !n.read).length }
])

const filteredNotifications = computed(() => {
  let list = notificationStore.notifications
  if (activePanelTab.value !== 'all') {
    list = list.filter(n => n.type === activePanelTab.value)
  }
  return list.slice(0, displayLimit.value)
})

const hasMoreNotifications = computed(() => {
  let list = notificationStore.notifications
  if (activePanelTab.value !== 'all') {
    list = list.filter(n => n.type === activePanelTab.value)
  }
  return list.length > displayLimit.value
})

function loadMore() {
  displayLimit.value += 20
}

function togglePanel() {
  showPanel.value = !showPanel.value
}

function getItemIcon(item) {
  if (item.type === NotificationType.TODO) return 'clock'
  if (item.type === NotificationType.ALERT) {
    return item.level === NotificationLevel.ERROR ? 'warning' : 'info'
  }
  if (item.type === NotificationType.ANNOUNCEMENT) return 'flag'
  return 'message'
}

function formatTime(time) {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleClickItem(item) {
  if (!item.read) {
    notificationStore.markAsRead(item.id)
  }
  if (item.actionUrl) {
    showPanel.value = false
    router.push(item.actionUrl)
  }
}

function handleMarkRead(id) {
  notificationStore.markAsRead(id)
}

function handleMarkAllRead() {
  notificationStore.markAllAsRead()
}

function handleDelete(id) {
  notificationStore.removeNotification(id)
}

async function handleClearAll() {
  if (notificationStore.notifications.length === 0) return
  const ok = await confirm.show({ title: '清空通知', message: '确定要清空所有通知吗？', danger: true })
  if (ok) {
    notificationStore.clearAll()
  }
}

/* 点击外部关闭面板 */
function handleClickOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) {
    showPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  notificationStore.clearExpired()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.bell-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--space-1);
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  animation: badgePop 0.3s ease;
}

/* 通知面板 */
.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: var(--space-2);
}

.panel-action-btn {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.panel-action-btn:hover {
  background: var(--color-surface-hover);
}

/* Tab */
.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  padding: var(--space-2);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.panel-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.panel-tab.active {
  color: var(--color-accent);
  font-weight: 600;
}

.panel-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
}

.tab-count {
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  min-width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 通知列表 */
.panel-list {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.notification-item {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

.notification-item:hover {
  background: var(--color-surface-hover);
}

.notification-item.unread {
  background: rgba(var(--color-accent-rgb, 59, 130, 246), 0.04);
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.item-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: var(--space-1);
}

.level-info .item-icon {
  background: #dbeafe;
  color: #2563eb;
}

.level-warning .item-icon {
  background: #fef3c7;
  color: #d97706;
}

.level-error .item-icon {
  background: #fef2f2;
  color: #dc2626;
}

.level-success .item-icon {
  background: #dcfce7;
  color: #16a34a;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.notification-item:hover .item-actions {
  opacity: 1;
}

.item-read-btn,
.item-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.item-read-btn:hover {
  background: #dcfce7;
  color: #16a34a;
}

.item-delete-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--color-text-tertiary);
}

.panel-empty p {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}

.panel-load-more {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.load-more-btn {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--color-surface-hover);
}

/* 面板动画 */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

@keyframes badgePop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 响应式 */
@media (max-width: 768px) {
  .notification-panel {
    position: fixed;
    top: var(--topbar-height, 56px);
    right: 0;
    left: 0;
    width: 100%;
    max-height: calc(100vh - var(--topbar-height, 56px));
    border-radius: 0;
    border-right: none;
    border-left: none;
  }
}
</style>
