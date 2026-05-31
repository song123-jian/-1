import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_customerPermissions'
const ROLES_KEY = 'gj_erp_customRoles'
const INIT_KEY = 'gj_erp_permissions_initialized'

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) } catch (e) { /* ignore */ }
  return fallback
}
function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch (e) { /* ignore */ }
}

const defaultRoles = ['管理员', '总经理', '销售主管', '销售员', '仓库主管', '仓管员', '财务', '查看者']

const defaultModules = [
  { key: 'quote_contract', label: '报价/合同', perms: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
  { key: 'inbound', label: '入库', perms: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'outbound', label: '出库', perms: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'statement', label: '对账', perms: ['view', 'create', 'edit', 'delete', 'export', 'approve'] },
  { key: 'delivery', label: '送货', perms: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'cost', label: '成本核算', perms: ['view', 'create', 'edit', 'export'] }
]

const permLabels = {
  view: '查看', create: '创建', edit: '编辑', delete: '删除', export: '导出', approve: '审批'
}

export const usePermissionStore = defineStore('permission', () => {
  const roles = ref(load(ROLES_KEY, [...defaultRoles]))
  const matrix = ref(load(STORAGE_KEY, {}))
  const lastSaved = ref('')
  const changeCount = ref(0)

  const totalPerms = computed(() => {
    let count = 0
    defaultModules.forEach(m => { count += m.perms.length })
    return count * roles.value.length
  })

  const roleCount = computed(() => roles.value.length)

  function getPerm(role, moduleKey, perm) {
    const key = `${role}.${moduleKey}.${perm}`
    return matrix.value[key] || false
  }

  function setPerm(role, moduleKey, perm, value) {
    const key = `${role}.${moduleKey}.${perm}`
    matrix.value[key] = value
    changeCount.value++
  }

  function savePermissions() {
    persist(STORAGE_KEY, matrix.value)
    persist(ROLES_KEY, roles.value)
    lastSaved.value = new Date().toISOString().slice(0, 19).replace('T', ' ')
    changeCount.value = 0
  }

  function resetPermissions() {
    matrix.value = {}
    changeCount.value = 0
  }

  function addRole(roleName) {
    if (roles.value.includes(roleName)) return false
    roles.value.push(roleName)
    persist(ROLES_KEY, roles.value)
    return true
  }

  function removeRole(roleName) {
    if (['管理员', '总经理'].includes(roleName)) return false
    const idx = roles.value.indexOf(roleName)
    if (idx === -1) return false
    roles.value.splice(idx, 1)
    Object.keys(matrix.value).forEach(key => {
      if (key.startsWith(roleName + '.')) delete matrix.value[key]
    })
    persist(ROLES_KEY, roles.value)
    persist(STORAGE_KEY, matrix.value)
    return true
  }

  function applyTemplate(template) {
    matrix.value = {}
    if (template === 'strict') {
      roles.value.forEach(role => {
        defaultModules.forEach(mod => {
          mod.perms.forEach(perm => {
            if (role === '管理员') matrix.value[`${role}.${mod.key}.${perm}`] = true
            else if (role === '总经理') matrix.value[`${role}.${mod.key}.${perm}`] = ['view', 'approve'].includes(perm)
            else matrix.value[`${role}.${mod.key}.${perm}`] = perm === 'view'
          })
        })
      })
    } else if (template === 'standard') {
      roles.value.forEach(role => {
        defaultModules.forEach(mod => {
          mod.perms.forEach(perm => {
            if (['管理员', '总经理'].includes(role)) matrix.value[`${role}.${mod.key}.${perm}`] = true
            else if (['销售主管', '仓库主管', '财务'].includes(role)) matrix.value[`${role}.${mod.key}.${perm}`] = !['delete', 'approve'].includes(perm)
            else matrix.value[`${role}.${mod.key}.${perm}`] = ['view', 'create'].includes(perm)
          })
        })
      })
    } else if (template === 'loose') {
      roles.value.forEach(role => {
        defaultModules.forEach(mod => {
          mod.perms.forEach(perm => {
            matrix.value[`${role}.${mod.key}.${perm}`] = true
          })
        })
      })
    }
    changeCount.value++
  }

  function exportPermissions() {
    return JSON.stringify({ roles: roles.value, matrix: matrix.value }, null, 2)
  }

  function importPermissions(jsonStr) {
    try {
      const data = JSON.parse(jsonStr)
      if (data.roles) roles.value = data.roles
      if (data.matrix) matrix.value = data.matrix
      persist(ROLES_KEY, roles.value)
      persist(STORAGE_KEY, matrix.value)
      return true
    } catch (e) { return false }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    applyTemplate('standard')
    savePermissions()
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    roles, matrix, lastSaved, changeCount,
    defaultModules, permLabels,
    totalPerms, roleCount,
    getPerm, setPerm, savePermissions, resetPermissions,
    addRole, removeRole, applyTemplate,
    exportPermissions, importPermissions, initSeedData
  }
})
