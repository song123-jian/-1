import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Roles } from '@/constants/roles'

const SESSION_KEY = 'gj_erp_session'
const REMEMBERED_LOGIN_KEY = 'gj_erp_remembered_login'
const LEGACY_REMEMBERED_ROLE_KEY = 'gj_erp_remembered_role'
const SKIP_AUTO_LOGIN_ONCE_KEY = 'gj_erp_skip_auto_login_once'

const SESSION_TIMEOUT = 30 * 60 * 1000
const SESSION_TIMEOUT_SOLO = 24 * 60 * 60 * 1000

const AVAILABLE_ROLES = [
  Roles.ADMIN,
  Roles.GM,
  Roles.SALES_MANAGER,
  Roles.SALES,
  Roles.WAREHOUSE_MANAGER,
  Roles.WAREHOUSE,
  Roles.FINANCE,
  Roles.VIEWER
]

const LOCAL_AUTH_CONFIG = {
  account: '宋建',
  password: 'song1230.',
  role: Roles.ADMIN
}

function getSessionStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

function normalizeAccount(account) {
  return String(account || '').trim()
}

function createRememberedLoginState(overrides = {}) {
  return {
    account: '',
    password: '',
    rememberAccount: false,
    rememberPassword: false,
    ...overrides
  }
}

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
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset(),
      navigator.language,
      dataUrl.slice(-32)
    ]

    let hash = 0
    const fingerprintSource = components.join('|')
    for (let i = 0; i < fingerprintSource.length; i++) {
      const char = fingerprintSource.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash &= hash
    }

    return `dev_${Math.abs(hash).toString(36)}`
  } catch {
    return `dev_${Date.now().toString(36)}`
  }
}

function generateSessionId(role, fingerprint) {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 6)
  return `${role}_${fingerprint}_${timestamp}_${random}`
}

export const useSessionStore = defineStore('session', () => {
  const currentRole = ref(null)
  const currentAccount = ref(null)
  const sessionId = ref(null)
  const deviceFingerprint = ref(null)
  const onlineMembers = ref([])
  const lastActiveTime = ref(null)
  const loginTime = ref(null)
  const rememberedRole = ref(null)
  const rememberedLogin = ref(createRememberedLoginState())
  const isSoloMode = ref(false)

  let _presenceChannel = null

  const isLoggedIn = computed(() => !!currentRole.value && !!sessionId.value)
  const currentUser = computed(() => ({
    account: currentAccount.value,
    role: currentRole.value,
    sessionId: sessionId.value,
    deviceFingerprint: deviceFingerprint.value,
    loginTime: loginTime.value
  }))
  const roleName = computed(() => currentRole.value || '未登录')
  const displayName = computed(() => currentAccount.value || '未登录')
  const availableRoles = AVAILABLE_ROLES

  function persistRememberedLogin(account, password, rememberAccount = false, rememberPassword = false) {
    const normalizedAccount = normalizeAccount(account)
    const nextState = createRememberedLoginState({
      account: rememberAccount || rememberPassword ? normalizedAccount : '',
      password: rememberPassword ? String(password || '') : '',
      rememberAccount: !!(rememberAccount || rememberPassword),
      rememberPassword: !!rememberPassword
    })

    rememberedLogin.value = nextState
    rememberedRole.value = nextState.rememberPassword ? LOCAL_AUTH_CONFIG.role : null
    isSoloMode.value = nextState.rememberPassword

    try {
      if (nextState.rememberAccount || nextState.rememberPassword) {
        localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(nextState))
      } else {
        localStorage.removeItem(REMEMBERED_LOGIN_KEY)
      }
      localStorage.removeItem(LEGACY_REMEMBERED_ROLE_KEY)
    } catch {
      /* ignore */
    }
  }

  function restoreRememberedLogin() {
    try {
      localStorage.removeItem(LEGACY_REMEMBERED_ROLE_KEY)

      const raw = localStorage.getItem(REMEMBERED_LOGIN_KEY)
      if (!raw) {
        rememberedLogin.value = createRememberedLoginState()
        rememberedRole.value = null
        isSoloMode.value = false
        return
      }

      const parsed = JSON.parse(raw)
      const rememberPassword = Boolean(parsed?.rememberPassword)
      const rememberAccount = Boolean(parsed?.rememberAccount) || rememberPassword
      const account = rememberAccount ? normalizeAccount(parsed?.account) : ''

      rememberedLogin.value = createRememberedLoginState({
        account,
        password: rememberPassword ? String(parsed?.password || '') : '',
        rememberAccount,
        rememberPassword
      })
      rememberedRole.value = rememberPassword ? LOCAL_AUTH_CONFIG.role : null
      isSoloMode.value = rememberPassword
    } catch {
      rememberedLogin.value = createRememberedLoginState()
      rememberedRole.value = null
      isSoloMode.value = false
    }
  }

  function persistSession() {
    const sessionData = {
      account: currentAccount.value,
      role: currentRole.value,
      sessionId: sessionId.value,
      deviceFingerprint: deviceFingerprint.value,
      loginTime: loginTime.value,
      lastActiveTime: lastActiveTime.value
    }

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('[会话] 保存失败:', error)
    }
  }

  function createSession(account, role) {
    const normalizedAccount = normalizeAccount(account) || LOCAL_AUTH_CONFIG.account

    if (!deviceFingerprint.value) {
      deviceFingerprint.value = generateDeviceFingerprint()
    }

    currentAccount.value = normalizedAccount
    currentRole.value = role
    sessionId.value = generateSessionId(role, deviceFingerprint.value)
    loginTime.value = new Date().toISOString()
    lastActiveTime.value = Date.now()

    persistSession()
  }

  function validateCredentials(account, password) {
    return (
      normalizeAccount(account) === LOCAL_AUTH_CONFIG.account && String(password || '') === LOCAL_AUTH_CONFIG.password
    )
  }

  function restoreSession() {
    restoreRememberedLogin()

    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (!saved) return false

      const data = JSON.parse(saved)
      if (!data?.role || !AVAILABLE_ROLES.includes(data.role)) {
        clearSession()
        return false
      }

      const timeout = isSoloMode.value ? SESSION_TIMEOUT_SOLO : SESSION_TIMEOUT
      if (data.lastActiveTime && Date.now() - data.lastActiveTime > timeout) {
        clearSession()
        return false
      }

      currentAccount.value = normalizeAccount(data.account) || LOCAL_AUTH_CONFIG.account
      currentRole.value = data.role
      sessionId.value = data.sessionId || null
      deviceFingerprint.value = data.deviceFingerprint || generateDeviceFingerprint()
      loginTime.value = data.loginTime || null
      lastActiveTime.value = data.lastActiveTime || Date.now()
      updateActivity()
      return true
    } catch {
      return false
    }
  }

  function login(account, password, options = {}) {
    const normalizedAccount = normalizeAccount(account)

    if (!validateCredentials(normalizedAccount, password)) {
      return {
        success: false,
        message: '账号或密码错误'
      }
    }

    createSession(normalizedAccount, LOCAL_AUTH_CONFIG.role)

    const rememberPassword = Boolean(options.rememberPassword)
    const rememberAccount = rememberPassword || Boolean(options.rememberAccount)
    persistRememberedLogin(normalizedAccount, password, rememberAccount, rememberPassword)

    return {
      success: true
    }
  }

  function selectRole(role, remember = false) {
    if (!AVAILABLE_ROLES.includes(role)) {
      console.warn('[会话] 无效角色:', role)
      return
    }

    createSession(currentAccount.value || LOCAL_AUTH_CONFIG.account, role)
    rememberedRole.value = remember ? role : null
    isSoloMode.value = remember
  }

  function clearSession() {
    unsubscribePresence()

    currentAccount.value = null
    currentRole.value = null
    sessionId.value = null
    loginTime.value = null
    lastActiveTime.value = null

    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }

  function logout() {
    const storage = getSessionStorage()
    if (storage) {
      try {
        storage.setItem(SKIP_AUTO_LOGIN_ONCE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    clearSession()
  }

  function switchRole(newRole) {
    if (!AVAILABLE_ROLES.includes(newRole)) {
      console.warn('[会话] 无效角色:', newRole)
      return false
    }

    createSession(currentAccount.value || LOCAL_AUTH_CONFIG.account, newRole)

    if (rememberedRole.value) {
      rememberedRole.value = newRole
    }

    return true
  }

  function autoLoginWithRememberedRole() {
    return autoLoginWithRememberedLogin()
  }

  function autoLoginWithRememberedLogin() {
    if (!rememberedLogin.value.rememberPassword) {
      return false
    }

    return login(rememberedLogin.value.account, rememberedLogin.value.password, {
      rememberAccount: true,
      rememberPassword: true
    }).success
  }

  function setRememberRole(remember) {
    rememberedRole.value = remember && currentRole.value ? currentRole.value : null
    isSoloMode.value = remember
  }

  function updateRememberedLogin(account, password, options = {}) {
    persistRememberedLogin(account, password, options.rememberAccount, options.rememberPassword)
  }

  function updateActivity() {
    lastActiveTime.value = Date.now()

    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (!saved) return

      const data = JSON.parse(saved)
      data.lastActiveTime = lastActiveTime.value
      localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }

  function checkSessionExpiry() {
    if (currentRole.value && lastActiveTime.value) {
      const timeout = isSoloMode.value ? SESSION_TIMEOUT_SOLO : SESSION_TIMEOUT
      if (Date.now() - lastActiveTime.value > timeout) {
        clearSession()
        return true
      }
    }
    return false
  }

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
            presences.forEach((presence) => {
              if (presence.role) members.push(presence.role)
            })
          })
          onlineMembers.value = [...new Set(members)]
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await _presenceChannel.track({
              account: currentAccount.value,
              role: currentRole.value,
              sessionId: sessionId.value,
              deviceFingerprint: deviceFingerprint.value,
              onlineAt: new Date().toISOString()
            })
          }
        })
    } catch (error) {
      console.warn('[会话] Presence 订阅失败:', error)
    }
  }

  function unsubscribePresence() {
    if (_presenceChannel) {
      try {
        _presenceChannel.untrack()
        _presenceChannel.unsubscribe()
      } catch {
        /* ignore */
      }
      _presenceChannel = null
    }
  }

  function getOnlineMembers() {
    return onlineMembers.value
  }

  function shouldSkipAutoLoginOnce() {
    const storage = getSessionStorage()
    if (!storage) return false

    try {
      return storage.getItem(SKIP_AUTO_LOGIN_ONCE_KEY) === '1'
    } catch {
      return false
    }
  }

  function consumeSkipAutoLoginOnce() {
    const storage = getSessionStorage()
    if (!storage) return false

    try {
      const shouldSkip = storage.getItem(SKIP_AUTO_LOGIN_ONCE_KEY) === '1'
      storage.removeItem(SKIP_AUTO_LOGIN_ONCE_KEY)
      return shouldSkip
    } catch {
      return false
    }
  }

  return {
    currentRole,
    currentAccount,
    sessionId,
    deviceFingerprint,
    onlineMembers,
    lastActiveTime,
    loginTime,
    rememberedRole,
    rememberedLogin,
    isSoloMode,
    isLoggedIn,
    currentUser,
    roleName,
    displayName,
    availableRoles,
    restoreSession,
    login,
    logout,
    selectRole,
    clearSession,
    switchRole,
    autoLoginWithRememberedRole,
    autoLoginWithRememberedLogin,
    setRememberRole,
    updateRememberedLogin,
    updateActivity,
    checkSessionExpiry,
    subscribePresence,
    unsubscribePresence,
    getOnlineMembers,
    shouldSkipAutoLoginOnce,
    consumeSkipAutoLoginOnce
  }
})
