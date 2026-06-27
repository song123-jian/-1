import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const THEMES_KEY = 'gj_erp_themes'
const USERS_KEY = 'gj_erp_users'
const DICTS_KEY = 'gj_erp_dictionaries'
const DATA_KEY = 'gj_erp_dataManagement'
const SNAPSHOTS_KEY = 'gj_erp_snapshots'
const OP_HISTORY_KEY = 'gj_erp_opHistory'
const INIT_KEY = 'gj_erp_system_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      console.error('[system] localStorage quota exceeded')
    }
    return false
  }
}

function genId(prefix) {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function cloneEntries(entries = []) {
  return entries.map((entry, index) => ({
    id: entry.id || genId('de'),
    label: entry.label || '',
    value: entry.value || '',
    sort: entry.sort ?? index + 1,
    enabled: entry.enabled !== false
  }))
}

function createSeedThemes() {
  return [
    {
      id: 'default',
      name: '默认主题',
      isBuiltIn: true,
      colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' },
      fontSize: 14,
      borderRadius: 8,
      darkMode: false,
      fontFamily: 'system',
      createdAt: '2024-01-01'
    },
    {
      id: 'dark',
      name: '深色主题',
      isBuiltIn: true,
      colors: { primary: '#818CF8', success: '#34D399', warning: '#FBBF24', danger: '#F87171', info: '#60A5FA' },
      fontSize: 14,
      borderRadius: 8,
      darkMode: true,
      fontFamily: 'system',
      createdAt: '2024-01-01'
    },
    {
      id: 'compact',
      name: '紧凑主题',
      isBuiltIn: false,
      colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' },
      fontSize: 12,
      borderRadius: 4,
      darkMode: false,
      fontFamily: 'system',
      createdAt: '2024-03-15'
    }
  ]
}

function createSeedUsers() {
  return [
    {
      id: 'u1',
      username: 'admin',
      realName: '系统管理员',
      email: 'admin@gjtech.com',
      phone: '13800000001',
      role: '系统管理员',
      department: '总经办',
      status: 'active',
      lastLogin: '2024-06-30 09:15',
      createdAt: '2024-01-01'
    },
    {
      id: 'u2',
      username: 'zhangmy',
      realName: '张明远',
      email: 'zhangmy@gjtech.com',
      phone: '13800000002',
      role: '业务经理',
      department: '总经办',
      status: 'active',
      lastLogin: '2024-06-30 08:30',
      createdAt: '2024-01-01'
    },
    {
      id: 'u3',
      username: 'liuxf',
      realName: '刘晓峰',
      email: 'liuxf@gjtech.com',
      phone: '13800000003',
      role: '采购主管',
      department: '采购部',
      status: 'active',
      lastLogin: '2024-06-29 17:45',
      createdAt: '2024-01-15'
    },
    {
      id: 'u4',
      username: 'chenw',
      realName: '陈伟',
      email: 'chenw@gjtech.com',
      phone: '13800000004',
      role: '仓库主管',
      department: '仓储部',
      status: 'active',
      lastLogin: '2024-06-30 10:00',
      createdAt: '2024-02-01'
    },
    {
      id: 'u5',
      username: 'zhaoyq',
      realName: '赵雨晴',
      email: 'zhaoyq@gjtech.com',
      phone: '13800000005',
      role: '财务专员',
      department: '财务部',
      status: 'active',
      lastLogin: '2024-06-28 16:20',
      createdAt: '2024-02-10'
    },
    {
      id: 'u6',
      username: 'sunl',
      realName: '孙磊',
      email: 'sunl@gjtech.com',
      phone: '13800000006',
      role: '生产主管',
      department: '生产部',
      status: 'active',
      lastLogin: '2024-06-30 07:50',
      createdAt: '2024-03-01'
    },
    {
      id: 'u7',
      username: 'zhoum',
      realName: '周敏',
      email: 'zhoum@gjtech.com',
      phone: '13800000007',
      role: '查看者',
      department: '数据中心',
      status: 'inactive',
      lastLogin: '2024-05-15 14:30',
      createdAt: '2024-03-15'
    }
  ]
}

function createSeedDictionaries() {
  return [
    {
      id: 'dict1',
      name: '产品分类',
      code: 'product_category',
      description: '产品分类标准',
      entries: cloneEntries([
        { id: 'de1', label: '电子元器件', value: 'electronic', sort: 1, enabled: true },
        { id: 'de2', label: '机械零件', value: 'mechanical', sort: 2, enabled: true },
        { id: 'de3', label: '化工材料', value: 'chemical', sort: 3, enabled: true },
        { id: 'de4', label: '包装材料', value: 'packaging', sort: 4, enabled: true }
      ]),
      createdAt: '2024-01-01',
      updatedAt: '2024-06-15'
    },
    {
      id: 'dict2',
      name: '客户等级',
      code: 'customer_level',
      description: '客户等级分类',
      entries: cloneEntries([
        { id: 'de5', label: 'A级客户', value: 'A', sort: 1, enabled: true },
        { id: 'de6', label: 'B级客户', value: 'B', sort: 2, enabled: true },
        { id: 'de7', label: 'C级客户', value: 'C', sort: 3, enabled: true }
      ]),
      createdAt: '2024-01-01',
      updatedAt: '2024-05-20'
    },
    {
      id: 'dict3',
      name: '付款方式',
      code: 'payment_method',
      description: '付款方式选项',
      entries: cloneEntries([
        { id: 'de9', label: '银行转账', value: 'bank_transfer', sort: 1, enabled: true },
        { id: 'de10', label: '承兑汇票', value: 'acceptance_bill', sort: 2, enabled: true },
        { id: 'de11', label: '现金', value: 'cash', sort: 3, enabled: true },
        { id: 'de12', label: '信用证', value: 'letter_of_credit', sort: 4, enabled: false }
      ]),
      createdAt: '2024-01-01',
      updatedAt: '2024-06-01'
    },
    {
      id: 'dict4',
      name: '仓库类型',
      code: 'warehouse_type',
      description: '仓库类型选项',
      entries: cloneEntries([
        { id: 'de13', label: '原料仓', value: 'raw_material', sort: 1, enabled: true },
        { id: 'de14', label: '成品仓', value: 'finished_goods', sort: 2, enabled: true },
        { id: 'de15', label: '退货仓', value: 'returns', sort: 3, enabled: true }
      ]),
      createdAt: '2024-02-01',
      updatedAt: '2024-04-10'
    }
  ]
}

function createSeedBackups() {
  return [
    { id: 'bk1', description: '自动备份', size: '25.3MB', createdAt: '2024-06-30 02:00', type: 'auto' },
    { id: 'bk2', description: '自动备份', size: '24.8MB', createdAt: '2024-06-29 02:00', type: 'auto' },
    { id: 'bk3', description: '版本升级前备份', size: '23.1MB', createdAt: '2024-06-28 15:30', type: 'manual' }
  ]
}

function createSeedSnapshots() {
  return [
    { id: 'snap1', name: '主题设置快照', time: '2024-06-30 09:00' },
    { id: 'snap2', name: '用户数据快照', time: '2024-06-30 08:40' },
    { id: 'snap3', name: '数据字典快照', time: '2024-06-30 08:10' }
  ]
}

export const useSystemStore = defineStore('system', () => {
  const themes = ref(load(THEMES_KEY, []))
  const activeThemeId = ref('default')
  const users = ref(load(USERS_KEY, []))
  const dictionaries = ref(load(DICTS_KEY, []))
  const dataBackups = ref(load(DATA_KEY, []))
  const snapshots = ref(load(SNAPSHOTS_KEY, []))
  const operationHistory = ref(load(OP_HISTORY_KEY, []))

  const activeTheme = computed(
    () => themes.value.find((item) => item.id === activeThemeId.value) || themes.value[0] || null
  )
  const userCount = computed(() => users.value.length)
  const activeUserCount = computed(() => users.value.filter((item) => item.status === 'active').length)
  const dictCount = computed(() => dictionaries.value.length)
  const dictEntryCount = computed(() => dictionaries.value.reduce((sum, dict) => sum + (dict.entries || []).length, 0))

  function persistThemes() {
    persist(THEMES_KEY, themes.value)
  }

  function persistUsers() {
    persist(USERS_KEY, users.value)
  }

  function persistDicts() {
    persist(DICTS_KEY, dictionaries.value)
  }

  function persistBackups() {
    persist(DATA_KEY, dataBackups.value)
  }

  function persistSnapshots() {
    persist(SNAPSHOTS_KEY, snapshots.value)
  }

  function persistHistory() {
    persist(OP_HISTORY_KEY, operationHistory.value)
  }

  function addTheme(data) {
    const item = {
      id: genId('th'),
      name: data.name || '未命名主题',
      isBuiltIn: false,
      colors: data.colors || {
        primary: '#4F46E5',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6'
      },
      fontSize: data.fontSize || 14,
      borderRadius: data.borderRadius || 8,
      darkMode: data.darkMode || false,
      fontFamily: data.fontFamily || 'system',
      createdAt: today()
    }
    themes.value.push(item)
    persistThemes()
    return item
  }

  function updateTheme(id, updates) {
    const index = themes.value.findIndex((item) => item.id === id)
    if (index === -1) return null
    themes.value[index] = { ...themes.value[index], ...updates }
    persistThemes()
    return themes.value[index]
  }

  function deleteTheme(id) {
    const index = themes.value.findIndex((item) => item.id === id)
    if (index === -1 || themes.value[index].isBuiltIn) return false
    themes.value.splice(index, 1)
    if (activeThemeId.value === id) {
      activeThemeId.value = 'default'
    }
    persistThemes()
    return true
  }

  function activateTheme(id) {
    if (!themes.value.some((item) => item.id === id)) return
    activeThemeId.value = id
  }

  function saveThemeSettings(settings) {
    localStorage.setItem('gj_erp_systemThemeSettings', JSON.stringify(settings))
  }

  function addUser(data) {
    const item = {
      id: genId('u'),
      username: data.username || '',
      realName: data.realName || '',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || '查看者',
      department: data.department || '',
      status: data.status || 'active',
      lastLogin: data.lastLogin || '',
      createdAt: today()
    }
    users.value.push(item)
    persistUsers()
    return item
  }

  function updateUser(id, updates) {
    const index = users.value.findIndex((item) => item.id === id)
    if (index === -1) return null
    users.value[index] = { ...users.value[index], ...updates }
    persistUsers()
    return users.value[index]
  }

  function deleteUser(id) {
    const index = users.value.findIndex((item) => item.id === id)
    if (index === -1) return false
    users.value.splice(index, 1)
    persistUsers()
    return true
  }

  function addDictionary(data) {
    const item = {
      id: genId('dict'),
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      entries: cloneEntries(data.entries || []),
      createdAt: today(),
      updatedAt: today()
    }
    dictionaries.value.push(item)
    persistDicts()
    return item
  }

  function updateDictionary(id, updates) {
    const index = dictionaries.value.findIndex((item) => item.id === id)
    if (index === -1) return null
    dictionaries.value[index] = {
      ...dictionaries.value[index],
      ...updates,
      entries: updates.entries ? cloneEntries(updates.entries) : dictionaries.value[index].entries,
      updatedAt: today()
    }
    persistDicts()
    return dictionaries.value[index]
  }

  function deleteDictionary(id) {
    const index = dictionaries.value.findIndex((item) => item.id === id)
    if (index === -1) return false
    dictionaries.value.splice(index, 1)
    persistDicts()
    return true
  }

  function addDictEntry(dictId, entry) {
    const dict = dictionaries.value.find((item) => item.id === dictId)
    if (!dict) return null
    dict.entries.push({
      id: genId('de'),
      label: entry.label || '',
      value: entry.value || '',
      sort: entry.sort ?? dict.entries.length + 1,
      enabled: entry.enabled !== false
    })
    dict.updatedAt = today()
    persistDicts()
    return dict
  }

  function removeDictEntry(dictId, entryId) {
    const dict = dictionaries.value.find((item) => item.id === dictId)
    if (!dict) return false
    const index = dict.entries.findIndex((item) => item.id === entryId)
    if (index === -1) return false
    dict.entries.splice(index, 1)
    dict.updatedAt = today()
    persistDicts()
    return true
  }

  function createBackup(description) {
    const item = {
      id: genId('bk'),
      description: description || '手动备份',
      size: `${(Math.random() * 50 + 10).toFixed(1)}MB`,
      createdAt: now(),
      type: 'manual'
    }
    dataBackups.value.unshift(item)
    if (dataBackups.value.length > 20) {
      dataBackups.value = dataBackups.value.slice(0, 20)
    }
    persistBackups()
    return item
  }

  function deleteBackup(id) {
    const index = dataBackups.value.findIndex((item) => item.id === id)
    if (index === -1) return false
    dataBackups.value.splice(index, 1)
    persistBackups()
    return true
  }

  function addOperationRecord(record) {
    operationHistory.value.unshift({
      id: genId('op'),
      time: now(),
      ...record
    })
    if (operationHistory.value.length > 200) {
      operationHistory.value = operationHistory.value.slice(0, 200)
    }
    persistHistory()
  }

  function replaceData(newData) {
    if (newData.themes) {
      themes.value = Array.isArray(newData.themes) ? newData.themes : []
      persistThemes()
    }
    if (newData.users) {
      users.value = Array.isArray(newData.users) ? newData.users : []
      persistUsers()
    }
    if (newData.dictionaries) {
      dictionaries.value = Array.isArray(newData.dictionaries) ? newData.dictionaries : []
      persistDicts()
    }
    if (newData.dataBackups) {
      dataBackups.value = Array.isArray(newData.dataBackups) ? newData.dataBackups : []
      persistBackups()
    }
    if (newData.snapshots) {
      snapshots.value = Array.isArray(newData.snapshots) ? newData.snapshots : []
      persistSnapshots()
    }
    if (newData.operationHistory) {
      operationHistory.value = Array.isArray(newData.operationHistory) ? newData.operationHistory : []
      persistHistory()
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    if (themes.value.length === 0) {
      themes.value = createSeedThemes()
      persistThemes()
    }

    if (users.value.length === 0) {
      users.value = createSeedUsers()
      persistUsers()
    }

    if (dictionaries.value.length === 0) {
      dictionaries.value = createSeedDictionaries()
      persistDicts()
    }

    if (dataBackups.value.length === 0) {
      dataBackups.value = createSeedBackups()
      persistBackups()
    }

    if (snapshots.value.length === 0) {
      snapshots.value = createSeedSnapshots()
      persistSnapshots()
    }

    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    themes,
    activeThemeId,
    activeTheme,
    users,
    dictionaries,
    dataBackups,
    snapshots,
    operationHistory,
    userCount,
    activeUserCount,
    dictCount,
    dictEntryCount,
    addTheme,
    updateTheme,
    deleteTheme,
    activateTheme,
    saveThemeSettings,
    addUser,
    updateUser,
    deleteUser,
    addDictionary,
    updateDictionary,
    deleteDictionary,
    addDictEntry,
    removeDictEntry,
    createBackup,
    deleteBackup,
    addOperationRecord,
    replaceData,
    initSeedData
  }
})
