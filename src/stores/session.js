import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const SESSION_KEY = 'gj_erp_session'

/* 会话超时时间：30分钟（毫秒） */
const SESSION_TIMEOUT = 30 * 60 * 1000

/* 可用角色列表（与 permission store 保持一致） */
const AVAILABLE_ROLES = ['管理员', '总经理', '销售主管', '销售员', '仓库主管', '仓管员', '财务', '查看者']

/**
 * 生成设备指纹（基于浏览器特征）
 * @returns {string} 设备指纹哈希
 */
function generateDeviceFingerprint() {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('fingerprint', 2, 2)
    const dataUrl = canvas.toDataURL()
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.language,
      dataUrl.slice(-32)
    ]
    /* 简单哈希函数 */
    let hash = 0
    const str = components.join('|')
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return 'dev_' + Math.abs(hash).toString(36)
  } catch (e) {
    return 'dev_' + Date.now().toString(36)
  }
}

/**
 * 生成会话ID
 * @param {string} role - 角色
 * @param {string} fingerprint - 设备指纹
 * @returns {string} 会话ID
 */
function generateSessionId(role, fingerprint) {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${role}_${fingerprint}_${ts}_${rand}`
}

export const useSessionStore = defineStore('session', () => {
  /* 当前选中的角色（中文，与权限矩阵一致） */
  const currentRole = ref(null)

  /* 会话ID */
  const sessionId = ref(null)

  /* 设备指纹 */
  const deviceFingerprint = ref(null)

  /* 在线成员列表 */
  const onlineMembers = ref([])

  /* 最后活跃时间 */
  const lastActiveTime = ref(null)

  /* 登录时间 */
  const loginTime = ref(null)

  /* Presence 频道引用 */
  let _presenceChannel = null

  /* 是否已有会话 */
  const isLoggedIn = computed(() => !!currentRole.value && !!sessionId.value)

  /* 当前用户信息 */
  const currentUser = computed(() => ({
    role: currentRole.value,
    sessionId: sessionId.value,
    deviceFingerprint: deviceFingerprint.value,
    loginTime: loginTime.value
  }))

  /* 当前角色名称 */
  const roleName = computed(() => currentRole.value || '未选择')

  /* 可用角色列表 */
  const availableRoles = AVAILABLE_ROLES

  /**
   * 从本地存储恢复会话
   * @returns {boolean} 是否恢复成功
   */
  function restoreSession() {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.role && AVAILABLE_ROLES.includes(data.role)) {
          /* 检查会话是否已超时 */
          if (data.lastActiveTime && Date.now() - data.lastActiveTime > SESSION_TIMEOUT) {
            clearSession()
            return false
          }
          currentRole.value = data.role
          sessionId.value = data.sessionId || null
          deviceFingerprint.value = data.deviceFingerprint || generateDeviceFingerprint()
          loginTime.value = data.loginTime || null
          lastActiveTime.value = data.lastActiveTime || Date.now()
          updateActivity()
          return true
        }
      }
    } catch (e) {
      /* 忽略解析错误 */
    }
    return false
  }

  /**
   * 选择角色并创建会话
   * @param {string} role - 角色名称（中文）
   */
  function selectRole(role) {
    if (!AVAILABLE_ROLES.includes(role)) {
      console.warn('[会话] 无效角色:', role)
      return
    }
    /* 生成设备指纹（仅首次） */
    if (!deviceFingerprint.value) {
      deviceFingerprint.value = generateDeviceFingerprint()
    }
    currentRole.value = role
    sessionId.value = generateSessionId(role, deviceFingerprint.value)
    loginTime.value = new Date().toISOString()
    lastActiveTime.value = Date.now()

    /* 持久化到 localStorage */
    const sessionData = {
      role: currentRole.value,
      sessionId: sessionId.value,
      deviceFingerprint: deviceFingerprint.value,
      loginTime: loginTime.value,
      lastActiveTime: lastActiveTime.value
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    } catch (e) {
      console.error('[会话] 保存失败:', e)
    }
  }

  /**
   * 清除会话（退出/切换角色）
   */
  function clearSession() {
    /* 取消 Presence 订阅 */
    unsubscribePresence()

    currentRole.value = null
    sessionId.value = null
    loginTime.value = null
    lastActiveTime.value = null
    /* 保留设备指纹，同一设备无需重新生成 */
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (e) {
      /* 忽略 */
    }
  }

  /**
   * 更新活跃时间（每次用户操作时调用）
   */
  function updateActivity() {
    lastActiveTime.value = Date.now()
    /* 同步更新 localStorage 中的 lastActiveTime，确保刷新后仍可校验超时 */
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        data.lastActiveTime = lastActiveTime.value
        localStorage.setItem(SESSION_KEY, JSON.stringify(data))
      }
    } catch (e) {
      /* 忽略存储错误 */
    }
  }

  /**
   * 检查会话是否已过期
   * @returns {boolean} true 表示已过期并已清除会话，false 表示未过期
   */
  function checkSessionExpiry() {
    if (currentRole.value && lastActiveTime.value && Date.now() - lastActiveTime.value > SESSION_TIMEOUT) {
      clearSession()
      return true // 已过期
    }
    return false
  }

  /**
   * 订阅 Supabase Presence 频道（实时在线状态）
   * @param {object} supabaseClient - Supabase 客户端实例
   */
  function subscribePresence(supabaseClient) {
    if (!supabaseClient || !sessionId.value) return
    try {
      _presenceChannel = supabaseClient
        .channel('team-presence', {
          config: { presence: { key: sessionId.value } }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = _presenceChannel.presenceState()
          const members = []
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              if (p.role) members.push(p.role)
            })
          })
          onlineMembers.value = [...new Set(members)]
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await _presenceChannel.track({
              role: currentRole.value,
              sessionId: sessionId.value,
              deviceFingerprint: deviceFingerprint.value,
              onlineAt: new Date().toISOString()
            })
          }
        })
    } catch (e) {
      console.warn('[会话] Presence 订阅失败:', e)
    }
  }

  /**
   * 取消 Presence 订阅
   */
  function unsubscribePresence() {
    if (_presenceChannel) {
      try {
        _presenceChannel.untrack()
        _presenceChannel.unsubscribe()
      } catch (e) {
        /* 忽略 */
      }
      _presenceChannel = null
    }
  }

  /**
   * 获取在线成员列表
   * @returns {string[]} 在线角色列表
   */
  function getOnlineMembers() {
    return onlineMembers.value
  }

  return {
    currentRole,
    sessionId,
    deviceFingerprint,
    onlineMembers,
    lastActiveTime,
    loginTime,
    isLoggedIn,
    currentUser,
    roleName,
    availableRoles,
    restoreSession,
    selectRole,
    clearSession,
    updateActivity,
    checkSessionExpiry,
    subscribePresence,
    unsubscribePresence,
    getOnlineMembers
  }
})
