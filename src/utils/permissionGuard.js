/**
 * 操作级权限守卫工具
 * 提供权限检查、权限指令、权限组合式函数等功能
 */
import { ref, watch } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import { useSessionStore } from '@/stores/session'
import eventBus from '@/utils/eventBus'

/**
 * 检查当前角色是否拥有指定模块的指定权限
 * @param {string} moduleKey - 模块键名
 * @param {string} perm - 权限键名
 * @returns {boolean} 是否拥有权限
 */
export function checkPermission(moduleKey, perm) {
  const sessionStore = useSessionStore()
  const permissionStore = usePermissionStore()

  // 未登录时拒绝所有权限
  if (!sessionStore.isLoggedIn) return false

  const role = sessionStore.currentRole
  if (!role) return false

  return permissionStore.getPerm(role, moduleKey, perm)
}

/**
 * 要求权限：检查权限，若拒绝则显示警告消息
 * @param {string} moduleKey - 模块键名
 * @param {string} perm - 权限键名
 * @returns {boolean} 是否拥有权限
 */
export function requirePermission(moduleKey, perm) {
  const sessionStore = useSessionStore()
  const permissionStore = usePermissionStore()

  if (!sessionStore.currentRole) {
    eventBus.emit('notification:show', { type: 'warning', message: '请先登录' })
    return false
  }

  const allowed = checkPermission(moduleKey, perm)
  if (!allowed) {
    console.warn(`[权限守卫] 您没有执行此操作的权限（模块: ${moduleKey}, 权限: ${perm}）`)
    eventBus.emit('notification:show', { type: 'warning', message: '权限不足，无法执行此操作' })
  }
  return allowed
}

/**
 * 获取当前角色在指定模块中被拒绝的权限列表
 * @param {string} moduleKey - 模块键名
 * @returns {string[]} 被拒绝的权限键名数组
 */
export function getDeniedPermissions(moduleKey) {
  const sessionStore = useSessionStore()
  const permissionStore = usePermissionStore()

  const role = sessionStore.currentRole
  if (!role) {
    // 无角色时，返回该模块所有权限作为被拒绝项
    const mod = permissionStore.defaultModules.find(m => m.key === moduleKey)
    return mod ? [...mod.perms] : []
  }

  const mod = permissionStore.defaultModules.find(m => m.key === moduleKey)
  if (!mod) return []

  return mod.perms.filter(perm => !permissionStore.getPerm(role, moduleKey, perm))
}

/**
 * 获取当前角色在指定模块中被允许的权限列表
 * @param {string} moduleKey - 模块键名
 * @returns {string[]} 被允许的权限键名数组
 */
export function getAllowedPermissions(moduleKey) {
  const sessionStore = useSessionStore()
  const permissionStore = usePermissionStore()

  const role = sessionStore.currentRole
  if (!role) return []

  const mod = permissionStore.defaultModules.find(m => m.key === moduleKey)
  if (!mod) return []

  return mod.perms.filter(perm => permissionStore.getPerm(role, moduleKey, perm))
}

/**
 * v-permission 自定义指令
 * 用法：v-permission="{ module: 'quote_contract', perm: 'canDeleteQuote' }"
 * 当权限被拒绝时隐藏元素
 */
export const vPermission = {
  mounted(el, binding) {
    const { module, perm } = binding.value || {}
    if (!module || !perm) return

    if (!checkPermission(module, perm)) {
      el.hidden = true
      el.setAttribute('aria-hidden', 'true')
    }
  },
  updated(el, binding) {
    const { module, perm } = binding.value || {}
    if (!module || !perm) return

    if (!checkPermission(module, perm)) {
      el.hidden = true
      el.setAttribute('aria-hidden', 'true')
    } else {
      el.hidden = false
      el.removeAttribute('aria-hidden')
    }
  }
}

/**
 * 权限组合式函数
 * 提供响应式的权限检查方法
 * @returns {Object} 权限操作对象
 */
export function usePermission() {
  const sessionStore = useSessionStore()
  const permissionStore = usePermissionStore()

  // 当前角色的响应式引用
  const currentRole = ref(sessionStore.currentRole)

  // 监听角色变化，同步更新
  watch(
    () => sessionStore.currentRole,
    (newRole) => {
      currentRole.value = newRole
    }
  )

  /**
   * 检查权限（纯判断，无副作用）
   */
  function check(moduleKey, perm) {
    return checkPermission(moduleKey, perm)
  }

  /**
   * 要求权限（拒绝时显示警告）
   */
  function require(moduleKey, perm) {
    return requirePermission(moduleKey, perm)
  }

  /**
   * 判断是否拥有权限（别名，语义更清晰）
   */
  function isAllowed(moduleKey, perm) {
    return checkPermission(moduleKey, perm)
  }

  /**
   * 判断是否拥有任一权限
   */
  function hasAnyPermission(moduleKey, actions) {
    return actions.some(action => checkPermission(moduleKey, action))
  }

  return {
    check,
    require,
    isAllowed,
    hasAnyPermission,
    currentRole
  }
}
