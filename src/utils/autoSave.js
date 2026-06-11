/**
 * 自动保存与状态恢复模块
 * 实时保存用户的编辑内容和操作状态，重新打开时精确恢复
 * 支持：
 * - 视图状态自动保存（当前路由、滚动位置、筛选条件、排序状态）
 * - 表单草稿自动保存（未提交的编辑内容）
 * - 界面布局状态保存（侧边栏折叠、面板展开/收起、分栏宽度）
 * - 定时自动保存（防抖策略，避免频繁写入）
 * - 页面关闭前紧急保存（beforeunload）
 * - 状态恢复（打开时自动恢复到上次关闭时的精确状态）
 * - 保存历史与清理
 */

import { watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import githubSync from './githubSync'

const AUTO_SAVE_KEY = 'gj_erp_autoSave'
const DRAFT_KEY_PREFIX = 'gj_erp_draft_'
const LAYOUT_STATE_KEY = 'gj_erp_layoutState'
const VIEW_STATE_KEY = 'gj_erp_viewState'
const SAVE_LOG_KEY = 'gj_erp_saveLog'

/* 自动保存配置 */
const CONFIG = {
  /* 自动保存间隔（毫秒） */
  autoSaveInterval: 10000,
  /* 防抖延迟（毫秒） */
  debounceDelay: 2000,
  /* 最大草稿数 */
  maxDrafts: 50,
  /* 最大保存日志条数 */
  maxSaveLog: 200,
  /* 是否启用自动保存 */
  enabled: true
}

class AutoSaveManager {
  constructor() {
    /* 防抖定时器 */
    this._debounceTimers = new Map()
    /* 自动保存定时器 */
    this._autoSaveTimer = null
    /* 是否已初始化 */
    this._initialized = false
    /* 脏标记（是否有未保存的变更） */
    this._dirty = false
    /* 保存统计 */
    this._stats = {
      totalSaves: 0,
      lastSaveTime: null,
      totalRestores: 0
    }
    /* Vue Router 引用 */
    this._router = null
    /* 事件处理函数引用 */
    this._beforeUnloadHandler = null
    this._visibilityChangeHandler = null
    /* Store引用 */
    this._stores = {}
  }

  /**
   * 初始化自动保存管理器
   * @param {Object} options - 配置选项 { router }
   */
  init(options = {}) {
    if (this._initialized) return

    this._router = options.router || null

    /* 监听页面关闭/刷新事件，紧急保存 */
    this._beforeUnloadHandler = () => this._emergencySave()
    this._visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        /* visibilitychange 中提前同步，比 beforeunload 更可靠 */
        this.saveSessionState()
        if (githubSync.getAuthStatus().isAuthenticated && githubSync.getConfig().autoUpload) {
          this._syncToGitHub()
        }
      }
    }
    window.addEventListener('beforeunload', this._beforeUnloadHandler)
    window.addEventListener('visibilitychange', this._visibilityChangeHandler)

    /* 启动定时自动保存 */
    this._startAutoSaveTimer()

    this._initialized = true
    console.info('[AutoSave] 自动保存管理器已初始化')
  }

  /**
   * 注册需要自动保存的Store
   * @param {string} name - Store名称
   * @param {Object} store - Store实例
   */
  registerStore(name, store) {
    this._stores[name] = store
  }

  /* ========== 视图状态保存 ========== */

  /**
   * 保存视图状态
   * @param {string} routePath - 当前路由路径
   * @param {Object} state - 视图状态 { scrollTop, filters, sortField, sortDir, currentView, selectedIds, expandedRows, ... }
   */
  saveViewState(routePath, state) {
    this._debounce('viewState', () => {
      try {
        const allStates = this._loadFromStorage(VIEW_STATE_KEY, {})
        allStates[routePath] = {
          ...state,
          savedAt: Date.now(),
          savedAtISO: new Date().toISOString()
        }
        this._saveToStorage(VIEW_STATE_KEY, allStates)
        this._logSave('viewState', routePath)
      } catch (e) {
        console.warn('[AutoSave] 保存视图状态失败:', e)
      }
    })
  }

  /**
   * 恢复视图状态
   * @param {string} routePath - 路由路径
   * @returns {Object|null} 视图状态
   */
  restoreViewState(routePath) {
    try {
      const allStates = this._loadFromStorage(VIEW_STATE_KEY, {})
      const state = allStates[routePath]
      if (state) {
        this._stats.totalRestores++
        return state
      }
    } catch (e) {
      console.warn('[AutoSave] 恢复视图状态失败:', e)
    }
    return null
  }

  /**
   * 清除指定路由的视图状态
   * @param {string} routePath - 路由路径
   */
  clearViewState(routePath) {
    try {
      const allStates = this._loadFromStorage(VIEW_STATE_KEY, {})
      delete allStates[routePath]
      this._saveToStorage(VIEW_STATE_KEY, allStates)
    } catch (e) { /* ignore */ }
  }

  /* ========== 表单草稿保存 ========== */

  /**
   * 保存表单草稿
   * @param {string} formId - 表单标识（如 'quotation_edit_123'）
   * @param {Object} data - 表单数据
   * @param {Object} meta - 元数据 { module, itemId, action }
   */
  saveDraft(formId, data, meta = {}) {
    this._debounce(`draft_${formId}`, () => {
      try {
        const draft = {
          id: formId,
          data: JSON.parse(JSON.stringify(data)),
          meta,
          savedAt: Date.now(),
          savedAtISO: new Date().toISOString()
        }
        localStorage.setItem(DRAFT_KEY_PREFIX + formId, JSON.stringify(draft))
        this._dirty = false
        this._logSave('draft', formId)
      } catch (e) {
        console.warn('[AutoSave] 保存草稿失败:', e)
      }
    })
  }

  /**
   * 恢复表单草稿
   * @param {string} formId - 表单标识
   * @returns {Object|null} { data, meta, savedAt }
   */
  restoreDraft(formId) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + formId)
      if (raw) {
        const draft = JSON.parse(raw)
        this._stats.totalRestores++
        return draft
      }
    } catch (e) {
      console.warn('[AutoSave] 恢复草稿失败:', e)
    }
    return null
  }

  /**
   * 获取所有草稿
   * @returns {Array} 草稿列表
   */
  getAllDrafts() {
    const drafts = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        try {
          const draft = JSON.parse(localStorage.getItem(key))
          drafts.push(draft)
        } catch (e) { /* ignore */ }
      }
    }
    return drafts.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
  }

  /**
   * 删除草稿
   * @param {string} formId - 表单标识
   */
  deleteDraft(formId) {
    localStorage.removeItem(DRAFT_KEY_PREFIX + formId)
  }

  /**
   * 清理过期草稿
   * @param {number} maxAge - 最大保留时间（毫秒），默认7天
   */
  cleanupDrafts(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now()
    const drafts = this.getAllDrafts()
    for (const draft of drafts) {
      if (draft.savedAt && now - draft.savedAt > maxAge) {
        localStorage.removeItem(DRAFT_KEY_PREFIX + draft.id)
      }
    }
    /* 限制草稿数量 */
    const remaining = this.getAllDrafts()
    if (remaining.length > CONFIG.maxDrafts) {
      const toRemove = remaining.slice(CONFIG.maxDrafts)
      for (const draft of toRemove) {
        localStorage.removeItem(DRAFT_KEY_PREFIX + draft.id)
      }
    }
  }

  /* ========== 布局状态保存 ========== */

  /**
   * 保存布局状态
   * @param {Object} layoutState - 布局状态 { sidebarCollapsed, sidebarWidth, panelSizes, ... }
   */
  saveLayoutState(layoutState) {
    try {
      const current = this._loadFromStorage(LAYOUT_STATE_KEY, {})
      const merged = { ...current, ...layoutState, savedAt: Date.now() }
      this._saveToStorage(LAYOUT_STATE_KEY, merged)
      this._logSave('layout', 'global')
    } catch (e) {
      console.warn('[AutoSave] 保存布局状态失败:', e)
    }
  }

  /**
   * 恢复布局状态
   * @returns {Object} 布局状态
   */
  restoreLayoutState() {
    return this._loadFromStorage(LAYOUT_STATE_KEY, {})
  }

  /* ========== 全局会话状态 ========== */

  /**
   * 保存完整会话状态（页面关闭时调用）
   */
  saveSessionState() {
    try {
      const sessionState = {
        /* 当前路由 */
        currentRoute: this._router?.currentRoute?.value?.fullPath || null,
        /* 时间戳 */
        savedAt: Date.now(),
        savedAtISO: new Date().toISOString(),
        /* 屏幕信息 */
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      }
      this._saveToStorage(AUTO_SAVE_KEY, sessionState)
      this._stats.totalSaves++
      this._stats.lastSaveTime = Date.now()
    } catch (e) {
      console.warn('[AutoSave] 保存会话状态失败:', e)
    }
  }

  /**
   * 恢复会话状态
   * @returns {Object|null} 会话状态
   */
  restoreSessionState() {
    try {
      const state = this._loadFromStorage(AUTO_SAVE_KEY, null)
      if (state) {
        this._stats.totalRestores++
        return state
      }
    } catch (e) {
      console.warn('[AutoSave] 恢复会话状态失败:', e)
    }
    return null
  }

  /**
   * 恢复上次的路由
   * @returns {string|null} 上次的路由路径
   */
  restoreLastRoute() {
    const state = this.restoreSessionState()
    return state?.currentRoute || null
  }

  /* ========== 标记脏状态 ========== */

  /**
   * 标记有未保存的变更
   */
  markDirty() {
    this._dirty = true
  }

  /**
   * 检查是否有未保存的变更
   * @returns {boolean}
   */
  isDirty() {
    return this._dirty
  }

  /* ========== 内部方法 ========== */

  /**
   * 防抖执行
   */
  _debounce(key, fn) {
    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key))
    }
    const timer = setTimeout(() => {
      this._debounceTimers.delete(key)
      fn()
    }, CONFIG.debounceDelay)
    this._debounceTimers.set(key, timer)
  }

  /**
   * 紧急保存（页面关闭前）
   */
  _emergencySave() {
    /* 清除所有防抖定时器，立即执行 */
    for (const [key, timer] of this._debounceTimers) {
      clearTimeout(timer)
    }
    this._debounceTimers.clear()

    /* 保存会话状态 */
    this.saveSessionState()

    /* 如果 GitHub 自动上传已启用，使用 sendBeacon 尝试同步 */
    if (githubSync.getAuthStatus().isAuthenticated && githubSync.getConfig().autoUpload) {
      this._syncToGitHubBeacon()
    }
  }

  /**
   * 启动定时自动保存
   */
  _startAutoSaveTimer() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer)
    this._autoSaveTimer = setInterval(() => {
      if (this._dirty) {
        this.saveSessionState()
        this._dirty = false
      }
      /* 定期清理过期草稿 */
      this.cleanupDrafts()
    }, CONFIG.autoSaveInterval)
  }

  /**
   * 停止定时自动保存
   */
  stopAutoSave() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer)
      this._autoSaveTimer = null
    }
  }

  /**
   * 记录保存日志
   */
  _logSave(type, key) {
    try {
      const log = this._loadFromStorage(SAVE_LOG_KEY, [])
      log.push({ type, key, time: Date.now() })
      if (log.length > CONFIG.maxSaveLog) {
        log.splice(0, log.length - CONFIG.maxSaveLog)
      }
      this._saveToStorage(SAVE_LOG_KEY, log)
    } catch (e) { /* ignore */ }
  }

  /**
   * 从localStorage加载
   */
  _loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch (e) { /* ignore */ }
    return fallback
  }

  /**
   * 保存到localStorage
   */
  _saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[AutoSave] 存储空间不足，清理旧数据...')
        this.cleanupDrafts(24 * 60 * 60 * 1000) /* 清理1天前的草稿 */
        try {
          localStorage.setItem(key, JSON.stringify(data))
        } catch (e2) {
          console.error('[AutoSave] 清理后仍无法保存:', e2)
        }
      }
    }
  }

  /**
   * 获取保存统计
   */
  getStats() {
    return {
      ...this._stats,
      draftsCount: this.getAllDrafts().length,
      isDirty: this._dirty,
      isInitialized: this._initialized,
      githubSync: githubSync.getStats(),
      githubAuth: githubSync.getAuthStatus()
    }
  }

  /* ========== GitHub 云端同步 ========== */

  /**
   * 手动上传到 GitHub
   * @returns {Object} 上传结果 { gistId, htmlUrl, version }
   */
  async uploadToGitHub() {
    return githubSync.uploadAllData()
  }

  /**
   * 从 GitHub 下载恢复数据
   * @param {string} gistId - Gist ID
   * @param {string} versionId - 版本ID
   * @returns {Object} 下载数据
   */
  async downloadFromGitHub(gistId, versionId) {
    return githubSync.downloadSnapshot(gistId, versionId)
  }

  /**
   * 获取 GitHub 同步管理器（用于直接配置）
   * @returns {Object} githubSync 实例
   */
  getGitHubSync() {
    return githubSync
  }

  /**
   * 同步到 GitHub（内部方法，紧急保存时使用）
   */
  _syncToGitHub() {
    try {
      githubSync.uploadAllData().catch(e => {
        console.warn('[AutoSave] GitHub紧急同步失败:', e)
      })
    } catch (e) { /* ignore */ }
  }

  /**
   * 使用 sendBeacon 同步到 GitHub（beforeunload 安全方式）
   */
  _syncToGitHubBeacon() {
    try {
      const authStatus = githubSync.getAuthStatus()
      if (!authStatus.isAuthenticated) return
      /* 将本地关键数据序列化，通过 sendBeacon 发送 */
      const payload = JSON.stringify({
        type: 'emergency_sync',
        timestamp: Date.now(),
        token: authStatus.token || ''
      })
      const gistUrl = githubSync.getConfig()?.gistUrl || ''
      if (gistUrl && navigator.sendBeacon) {
        navigator.sendBeacon(gistUrl, payload)
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopAutoSave()
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }
    if (this._visibilityChangeHandler) {
      window.removeEventListener('visibilitychange', this._visibilityChangeHandler)
      this._visibilityChangeHandler = null
    }
    for (const [, timer] of this._debounceTimers) {
      clearTimeout(timer)
    }
    this._debounceTimers.clear()
    this._initialized = false
  }
}

/* 全局单例 */
const autoSave = new AutoSaveManager()

export default autoSave
