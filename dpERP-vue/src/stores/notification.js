import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'

const STORAGE_KEY = 'gj_erp_notifications'
const INIT_KEY = 'gj_erp_notification_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[notification] localStorage容量不足，数据可能丢失！')
    }
  }
}

/* 通知类型 */
export const NotificationType = {
  TODO: 'todo',
  ALERT: 'alert',
  MESSAGE: 'message',
  ANNOUNCEMENT: 'announcement'
}

/* 通知分类 */
export const NotificationCategory = {
  APPROVAL: 'approval',
  INVENTORY: 'inventory',
  FINANCE: 'finance',
  CONTRACT: 'contract',
  SYSTEM: 'system'
}

/* 通知级别 */
export const NotificationLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
}

/* 分类标签映射 */
export const categoryLabels = {
  approval: '审批',
  inventory: '库存',
  finance: '财务',
  contract: '合同',
  system: '系统'
}

/* 类型标签映射 */
export const typeLabels = {
  todo: '待办',
  alert: '预警',
  message: '消息',
  announcement: '公告'
}

/* 级别标签映射 */
export const levelLabels = {
  info: '信息',
  warning: '警告',
  error: '错误',
  success: '成功'
}

export const useNotificationStore = defineStore('notification', () => {
  /* 通知列表 */
  const notifications = ref(load(STORAGE_KEY, []))

  /* 未读数量 */
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  /* 按分类分组 */
  const byCategory = computed(() => {
    const groups = {}
    notifications.value.forEach(n => {
      const cat = n.category || 'system'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(n)
    })
    return groups
  })

  /* 按类型分组 */
  const byType = computed(() => {
    const groups = {}
    notifications.value.forEach(n => {
      const type = n.type || 'message'
      if (!groups[type]) groups[type] = []
      groups[type].push(n)
    })
    return groups
  })

  /* 持久化 */
  function _persist() {
    persist(STORAGE_KEY, notifications.value)
  }

  /**
   * 新增通知
   */
  function addNotification(data) {
    const notification = {
      id: generateId('ntf'),
      type: data.type || NotificationType.MESSAGE,
      category: data.category || NotificationCategory.SYSTEM,
      title: data.title || '新通知',
      content: data.content || '',
      sourceId: data.sourceId || '',
      sourceType: data.sourceType || '',
      level: data.level || NotificationLevel.INFO,
      read: false,
      actionUrl: data.actionUrl || '',
      createTime: new Date().toISOString(),
      expireTime: data.expireTime || null
    }
    notifications.value.unshift(notification)

    /* 限制最大数量 */
    if (notifications.value.length > 200) {
      notifications.value = notifications.value.slice(0, 200)
    }

    _persist()
    return notification
  }

  /**
   * 标记已读
   */
  function markAsRead(id) {
    const n = notifications.value.find(item => item.id === id)
    if (n) {
      n.read = true
      _persist()
    }
  }

  /**
   * 全部已读
   */
  function markAllAsRead() {
    notifications.value.forEach(n => { n.read = true })
    _persist()
  }

  /**
   * 删除通知
   */
  function removeNotification(id) {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      notifications.value.splice(idx, 1)
      _persist()
    }
  }

  /**
   * 清空所有通知
   */
  function clearAll() {
    notifications.value = []
    _persist()
  }

  /**
   * 清理过期通知
   */
  function clearExpired() {
    const now = new Date().toISOString()
    const before = notifications.value.length
    notifications.value = notifications.value.filter(n => {
      if (!n.expireTime) return true
      return n.expireTime > now
    })
    if (notifications.value.length !== before) {
      _persist()
    }
  }

  /**
   * 获取指定类型的通知
   */
  function getByType(type) {
    return notifications.value.filter(n => n.type === type)
  }

  /**
   * 获取指定分类的通知
   */
  function getByCategory(category) {
    return notifications.value.filter(n => n.category === category)
  }

  /**
   * 初始化模拟数据
   */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    const now = new Date()
    const hour = 3600000

    const seeds = [
      {
        id: 'ntf_seed_1',
        type: NotificationType.TODO,
        category: NotificationCategory.APPROVAL,
        title: '采购审批待办',
        content: '您有一条采购审批待处理：PO-2024-001，金额 ¥68,000',
        sourceId: 'PO-2024-001',
        sourceType: 'purchase',
        level: NotificationLevel.WARNING,
        read: false,
        actionUrl: '/workflow',
        createTime: new Date(now.getTime() - 0.5 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 48 * hour).toISOString()
      },
      {
        id: 'ntf_seed_2',
        type: NotificationType.ALERT,
        category: NotificationCategory.INVENTORY,
        title: '库存预警',
        content: '物料「铝合金型材6063」库存低于安全库存，当前库存 15，安全库存 50',
        sourceId: 'INV-001',
        sourceType: 'inventory',
        level: NotificationLevel.ERROR,
        read: false,
        actionUrl: '/inventory',
        createTime: new Date(now.getTime() - 1 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 72 * hour).toISOString()
      },
      {
        id: 'ntf_seed_3',
        type: NotificationType.TODO,
        category: NotificationCategory.APPROVAL,
        title: '报价审批待办',
        content: '您有一条报价审批待处理：QT-2024-015，金额 ¥25,000',
        sourceId: 'QT-2024-015',
        sourceType: 'quotation',
        level: NotificationLevel.INFO,
        read: false,
        actionUrl: '/workflow',
        createTime: new Date(now.getTime() - 2 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 24 * hour).toISOString()
      },
      {
        id: 'ntf_seed_4',
        type: NotificationType.ALERT,
        category: NotificationCategory.CONTRACT,
        title: '合同即将到期',
        content: '合同「CT-2024-008」将于7天后到期，请及时续签',
        sourceId: 'CT-2024-008',
        sourceType: 'contract',
        level: NotificationLevel.WARNING,
        read: false,
        actionUrl: '/contracts',
        createTime: new Date(now.getTime() - 3 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 168 * hour).toISOString()
      },
      {
        id: 'ntf_seed_5',
        type: NotificationType.MESSAGE,
        category: NotificationCategory.FINANCE,
        title: '回款到账通知',
        content: '客户「上海XX公司」回款 ¥50,000 已到账',
        sourceId: 'PAY-2024-002',
        sourceType: 'payment',
        level: NotificationLevel.SUCCESS,
        read: true,
        actionUrl: '/collections',
        createTime: new Date(now.getTime() - 5 * hour).toISOString(),
        expireTime: null
      },
      {
        id: 'ntf_seed_6',
        type: NotificationType.ALERT,
        category: NotificationCategory.INVENTORY,
        title: '库存耗尽预警',
        content: '物料「不锈钢螺栓M8」库存已耗尽，请立即补货',
        sourceId: 'INV-002',
        sourceType: 'inventory',
        level: NotificationLevel.ERROR,
        read: false,
        actionUrl: '/inventory',
        createTime: new Date(now.getTime() - 6 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 24 * hour).toISOString()
      },
      {
        id: 'ntf_seed_7',
        type: NotificationType.ANNOUNCEMENT,
        category: NotificationCategory.SYSTEM,
        title: '系统维护通知',
        content: '系统将于本周六 22:00-23:00 进行例行维护，届时系统将暂停服务',
        sourceId: '',
        sourceType: 'system',
        level: NotificationLevel.INFO,
        read: true,
        actionUrl: '',
        createTime: new Date(now.getTime() - 24 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 48 * hour).toISOString()
      },
      {
        id: 'ntf_seed_8',
        type: NotificationType.TODO,
        category: NotificationCategory.APPROVAL,
        title: '合同审批待办',
        content: '您有一条合同审批待处理：CT-2024-008，金额 ¥150,000',
        sourceId: 'CT-2024-008',
        sourceType: 'contract',
        level: NotificationLevel.WARNING,
        read: false,
        actionUrl: '/workflow',
        createTime: new Date(now.getTime() - 8 * hour).toISOString(),
        expireTime: new Date(now.getTime() + 72 * hour).toISOString()
      }
    ]

    notifications.value = seeds
    _persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /**
   * 重置通知数据
   */
  function resetSeedData() {
    localStorage.removeItem(INIT_KEY)
    localStorage.removeItem(STORAGE_KEY)
    notifications.value = []
  }

  return {
    notifications,
    unreadCount,
    byCategory,
    byType,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    clearExpired,
    getByType,
    getByCategory,
    initSeedData,
    resetSeedData
  }
})
