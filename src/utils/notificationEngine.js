/**
 * 通知引擎 - 监听事件总线自动生成通知
 * 支持事件监听、通知规则配置、通知模板管理
 */

import eventBus from '@/utils/eventBus'
import { useNotificationStore } from '@/stores/notification'
import {
  NotificationType,
  NotificationCategory,
  NotificationLevel
} from '@/stores/notification'

/* 通知模板 */
const NOTIFICATION_TEMPLATES = {
  /* 库存预警 */
  'inventory:lowStock': {
    type: NotificationType.ALERT,
    category: NotificationCategory.INVENTORY,
    level: NotificationLevel.WARNING,
    titleTemplate: '库存预警',
    contentTemplate: (data) => `物料「${data.materialName || data.name || '未知'}」库存低于安全库存，当前库存 ${data.currentStock || 0}，安全库存 ${data.safeStock || 0}`,
    actionUrl: '/inventory'
  },
  /* 库存耗尽 */
  'inventory:exhausted': {
    type: NotificationType.ALERT,
    category: NotificationCategory.INVENTORY,
    level: NotificationLevel.ERROR,
    titleTemplate: '库存耗尽预警',
    contentTemplate: (data) => `物料「${data.materialName || data.name || '未知'}」库存已耗尽，请立即补货`,
    actionUrl: '/inventory'
  },
  /* 合同到期 */
  'contract:expiring': {
    type: NotificationType.ALERT,
    category: NotificationCategory.CONTRACT,
    level: NotificationLevel.WARNING,
    titleTemplate: '合同即将到期',
    contentTemplate: (data) => `合同「${data.contractName || data.name || data.contractNo || '未知'}」将于${data.daysRemaining || 0}天后到期，请及时续签`,
    actionUrl: '/contracts'
  },
  /* 合同待审批 */
  'contract:pendingApproval': {
    type: NotificationType.TODO,
    category: NotificationCategory.APPROVAL,
    level: NotificationLevel.INFO,
    titleTemplate: '合同审批待办',
    contentTemplate: (data) => `您有一条合同审批待处理：${data.contractNo || data.businessNo || '未知'}`,
    actionUrl: '/workflow'
  },
  /* 审批待办 */
  'workflow:pending': {
    type: NotificationType.TODO,
    category: NotificationCategory.APPROVAL,
    level: NotificationLevel.WARNING,
    titleTemplate: '审批待办',
    contentTemplate: (data) => `您有一条${data.templateName || '审批'}待处理：${data.businessNo || data.businessId || '未知'}`,
    actionUrl: '/workflow'
  },
  /* 逾期通知 */
  'finance:overdue': {
    type: NotificationType.ALERT,
    category: NotificationCategory.FINANCE,
    level: NotificationLevel.ERROR,
    titleTemplate: '逾期提醒',
    contentTemplate: (data) => `客户「${data.customerName || '未知'}」有 ${data.overdueAmount || 0} 元已逾期${data.overdueDays || 0}天，请及时催收`,
    actionUrl: '/collections'
  }
}

/* 通知规则配置 */
const NOTIFICATION_RULES = {
  /* 按事件类型过滤 */
  enabledEvents: new Set(Object.keys(NOTIFICATION_TEMPLATES)),
  /* 按角色过滤（空表示所有角色都接收） */
  roleFilters: {},
  /* 去重时间窗口（毫秒），同一事件在窗口内不重复通知 */
  dedupWindow: 5000,
  /* 最大通知数量 */
  maxNotifications: 200
}

/* 去重缓存 */
const _recentNotifications = new Map()

/**
 * 通知引擎类
 */
class NotificationEngine {
  constructor() {
    this._initialized = false
    this._unsubscribers = []
  }

  /**
   * 初始化通知引擎，注册事件监听
   */
  init() {
    if (this._initialized) return

    /* 注册所有事件监听 */
    Object.keys(NOTIFICATION_TEMPLATES).forEach(event => {
      const unsub = eventBus.on(event, (data) => {
        this._handleEvent(event, data)
      })
      this._unsubscribers.push(unsub)
    })

    this._initialized = true
    console.info('[NotificationEngine] 通知引擎已初始化')
  }

  /**
   * 销毁通知引擎
   */
  destroy() {
    this._unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub()
    })
    this._unsubscribers = []
    this._initialized = false
  }

  /**
   * 处理事件，生成通知
   */
  _handleEvent(event, data) {
    if (!NOTIFICATION_RULES.enabledEvents.has(event)) return

    /* 去重检查 */
    const dedupKey = `${event}:${data?.sourceId || data?.instanceId || data?.businessId || ''}`
    const lastTime = _recentNotifications.get(dedupKey)
    if (lastTime && Date.now() - lastTime < NOTIFICATION_RULES.dedupWindow) {
      return
    }
    _recentNotifications.set(dedupKey, Date.now())

    /* 清理过期的去重记录 */
    if (_recentNotifications.size > 100) {
      const cutoff = Date.now() - NOTIFICATION_RULES.dedupWindow * 2
      for (const [key, time] of _recentNotifications) {
        if (time < cutoff) _recentNotifications.delete(key)
      }
    }

    /* 获取模板 */
    const template = NOTIFICATION_TEMPLATES[event]
    if (!template) return

    /* 生成通知 */
    try {
      const notificationStore = useNotificationStore()
      notificationStore.addNotification({
        type: template.type,
        category: template.category,
        title: template.titleTemplate,
        content: template.contentTemplate(data || {}),
        sourceId: data?.sourceId || data?.instanceId || data?.businessId || '',
        sourceType: data?.sourceType || data?.businessType || event.split(':')[0],
        level: template.level,
        actionUrl: template.actionUrl,
        expireTime: this._calculateExpireTime(template.category)
      })
    } catch (e) {
      console.error('[NotificationEngine] 生成通知失败:', e)
    }
  }

  /**
   * 计算过期时间
   */
  _calculateExpireTime(category) {
    const now = new Date()
    const hours = category === NotificationCategory.SYSTEM ? 168 : 72
    return new Date(now.getTime() + hours * 3600000).toISOString()
  }

  /**
   * 添加自定义通知模板
   */
  registerTemplate(event, template) {
    NOTIFICATION_TEMPLATES[event] = template
    NOTIFICATION_RULES.enabledEvents.add(event)

    if (this._initialized) {
      const unsub = eventBus.on(event, (data) => {
        this._handleEvent(event, data)
      })
      this._unsubscribers.push(unsub)
    }
  }

  /**
   * 移除通知模板
   */
  unregisterTemplate(event) {
    delete NOTIFICATION_TEMPLATES[event]
    NOTIFICATION_RULES.enabledEvents.delete(event)
  }

  /**
   * 获取所有模板
   */
  getTemplates() {
    return { ...NOTIFICATION_TEMPLATES }
  }

  /**
   * 设置去重时间窗口
   */
  setDedupWindow(ms) {
    NOTIFICATION_RULES.dedupWindow = ms
  }
}

/* 全局单例 */
const notificationEngine = new NotificationEngine()

export default notificationEngine
