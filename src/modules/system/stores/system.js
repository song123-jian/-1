import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const THEMES_KEY = 'gj_erp_themes'
const USERS_KEY = 'gj_erp_users'
const DICTS_KEY = 'gj_erp_dictionaries'
const DATA_KEY = 'gj_erp_dataManagement'
const INIT_KEY = 'gj_erp_system_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return fallback
}
function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[system] localStorage容量不足，数据可能丢失！')
    }
  }
}
function genId(prefix) {
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

export const useSystemStore = defineStore('system', () => {
  const themes = ref(load(THEMES_KEY, []))
  const activeThemeId = ref('default')
  const users = ref(load(USERS_KEY, []))
  const dictionaries = ref(load(DICTS_KEY, []))
  const dataBackups = ref(load(DATA_KEY, []))
  const operationHistory = ref(load('gj_erp_opHistory', []))

  const activeTheme = computed(() => themes.value.find((t) => t.id === activeThemeId.value) || themes.value[0] || null)
  const userCount = computed(() => users.value.length)
  const activeUserCount = computed(() => users.value.filter((u) => u.status === 'active').length)
  const dictCount = computed(() => dictionaries.value.length)
  const dictEntryCount = computed(() => dictionaries.value.reduce((sum, d) => sum + (d.entries || []).length, 0))

  function _persistThemes() {
    persist(THEMES_KEY, themes.value)
  }
  function _persistUsers() {
    persist(USERS_KEY, users.value)
  }
  function _persistDicts() {
    persist(DICTS_KEY, dictionaries.value)
  }
  function _persistData() {
    persist(DATA_KEY, dataBackups.value)
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
      createdAt: new Date().toISOString().slice(0, 10)
    }
    themes.value.push(item)
    _persistThemes()
    return item
  }

  function updateTheme(id, updates) {
    const idx = themes.value.findIndex((t) => t.id === id)
    if (idx === -1) return null
    themes.value[idx] = { ...themes.value[idx], ...updates }
    _persistThemes()
    return themes.value[idx]
  }

  function deleteTheme(id) {
    const idx = themes.value.findIndex((t) => t.id === id)
    if (idx === -1 || themes.value[idx].isBuiltIn) return false
    themes.value.splice(idx, 1)
    if (activeThemeId.value === id) activeThemeId.value = 'default'
    _persistThemes()
    return true
  }

  function activateTheme(id) {
    if (themes.value.find((t) => t.id === id)) {
      activeThemeId.value = id
      _persistThemes()
    }
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
      lastLogin: '',
      createdAt: new Date().toISOString().slice(0, 10)
    }
    users.value.push(item)
    _persistUsers()
    return item
  }

  function updateUser(id, updates) {
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx === -1) return null
    users.value[idx] = { ...users.value[idx], ...updates }
    _persistUsers()
    return users.value[idx]
  }

  function deleteUser(id) {
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx === -1) return false
    users.value.splice(idx, 1)
    _persistUsers()
    return true
  }

  function addDictionary(data) {
    const item = {
      id: genId('dict'),
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      entries: data.entries || [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    }
    dictionaries.value.push(item)
    _persistDicts()
    return item
  }

  function updateDictionary(id, updates) {
    const idx = dictionaries.value.findIndex((d) => d.id === id)
    if (idx === -1) return null
    dictionaries.value[idx] = {
      ...dictionaries.value[idx],
      ...updates,
      updatedAt: new Date().toISOString().slice(0, 10)
    }
    _persistDicts()
    return dictionaries.value[idx]
  }

  function deleteDictionary(id) {
    const idx = dictionaries.value.findIndex((d) => d.id === id)
    if (idx === -1) return false
    dictionaries.value.splice(idx, 1)
    _persistDicts()
    return true
  }

  function addDictEntry(dictId, entry) {
    const dict = dictionaries.value.find((d) => d.id === dictId)
    if (!dict) return null
    dict.entries.push({
      id: genId('de'),
      label: entry.label || '',
      value: entry.value || '',
      sort: entry.sort ?? dict.entries.length + 1,
      enabled: entry.enabled !== false
    })
    dict.updatedAt = new Date().toISOString().slice(0, 10)
    _persistDicts()
    return dict
  }

  function removeDictEntry(dictId, entryId) {
    const dict = dictionaries.value.find((d) => d.id === dictId)
    if (!dict) return false
    const idx = dict.entries.findIndex((e) => e.id === entryId)
    if (idx === -1) return false
    dict.entries.splice(idx, 1)
    dict.updatedAt = new Date().toISOString().slice(0, 10)
    _persistDicts()
    return true
  }

  function createBackup(description) {
    const item = {
      id: genId('bk'),
      description: description || '手动备份',
      size: (Math.random() * 50 + 10).toFixed(1) + 'MB',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: 'manual'
    }
    dataBackups.value.unshift(item)
    if (dataBackups.value.length > 20) dataBackups.value = dataBackups.value.slice(0, 20)
    _persistData()
    return item
  }

  function deleteBackup(id) {
    const idx = dataBackups.value.findIndex((b) => b.id === id)
    if (idx === -1) return false
    dataBackups.value.splice(idx, 1)
    _persistData()
    return true
  }

  function saveThemeSettings(settings) {
    localStorage.setItem('gj_erp_systemThemeSettings', JSON.stringify(settings))
  }

  function addOperationRecord(record) {
    operationHistory.value.unshift({
      id: genId('op'),
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ...record
    })
    if (operationHistory.value.length > 200) operationHistory.value = operationHistory.value.slice(0, 200)
    persist('gj_erp_opHistory', operationHistory.value)
  }

  function replaceData(newData) {
    if (newData.themes) {
      themes.value = newData.themes
      _persistThemes()
    }
    if (newData.users) {
      users.value = newData.users
      _persistUsers()
    }
    if (newData.dictionaries) {
      dictionaries.value = newData.dictionaries
      _persistDicts()
    }
    if (newData.dataBackups) {
      dataBackups.value = newData.dataBackups
      _persistData()
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    if (themes.value.length === 0) {
      themes.value = [
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
      activeThemeId.value = 'default'
      _persistThemes()
    }

    if (users.value.length === 0) {
      users.value = [
        {
          id: 'u1',
          username: 'admin',
          realName: '系统管理员',
          email: 'admin@gjtech.com',
          phone: '13800000001',
          role: '管理员',
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
          role: '总经理',
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
          role: '销售主管',
          department: '销售部',
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
          role: '技术主管',
          department: '技术部',
          status: 'active',
          lastLogin: '2024-06-30 10:00',
          createdAt: '2024-02-01'
        },
        {
          id: 'u5',
          username: 'zhaoyq',
          realName: '赵雅琴',
          email: 'zhaoyq@gjtech.com',
          phone: '13800000005',
          role: '财务',
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
          role: '仓库主管',
          department: '仓储部',
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
          department: '人事行政部',
          status: 'inactive',
          lastLogin: '2024-05-15 14:30',
          createdAt: '2024-03-15'
        }
      ]
      _persistUsers()
    }

    if (dictionaries.value.length === 0) {
      dictionaries.value = [
        {
          id: 'dict1',
          name: '产品分类',
          code: 'product_category',
          description: '产品分类字典',
          entries: [
            { id: 'de1', label: '电子元器件', value: 'electronic', sort: 1, enabled: true },
            { id: 'de2', label: '机械零件', value: 'mechanical', sort: 2, enabled: true },
            { id: 'de3', label: '化工材料', value: 'chemical', sort: 3, enabled: true },
            { id: 'de4', label: '包装材料', value: 'packaging', sort: 4, enabled: true }
          ],
          createdAt: '2024-01-01',
          updatedAt: '2024-06-15'
        },
        {
          id: 'dict2',
          name: '客户等级',
          code: 'customer_level',
          description: '客户等级字典',
          entries: [
            { id: 'de5', label: '大客户', value: 'A', sort: 1, enabled: true },
            { id: 'de6', label: 'B类客户', value: 'B', sort: 2, enabled: true },
            { id: 'de7', label: 'C类客户', value: 'C', sort: 3, enabled: true }
          ],
          createdAt: '2024-01-01',
          updatedAt: '2024-05-20'
        },
        {
          id: 'dict3',
          name: '付款方式',
          code: 'payment_method',
          description: '付款方式字典',
          entries: [
            { id: 'de9', label: '银行转账', value: 'bank_transfer', sort: 1, enabled: true },
            { id: 'de10', label: '承兑汇票', value: 'acceptance_bill', sort: 2, enabled: true },
            { id: 'de11', label: '现金', value: 'cash', sort: 3, enabled: true },
            { id: 'de12', label: '信用证', value: 'letter_of_credit', sort: 4, enabled: false }
          ],
          createdAt: '2024-01-01',
          updatedAt: '2024-06-01'
        },
        {
          id: 'dict4',
          name: '仓库类型',
          code: 'warehouse_type',
          description: '仓库类型字典',
          entries: [
            { id: 'de13', label: '原料仓', value: 'raw_material', sort: 1, enabled: true },
            { id: 'de14', label: '成品仓', value: 'finished_goods', sort: 2, enabled: true },
            { id: 'de15', label: '退货仓', value: 'returns', sort: 3, enabled: true }
          ],
          createdAt: '2024-02-01',
          updatedAt: '2024-04-10'
        }
      ]
      _persistDicts()
    }

    if (dataBackups.value.length === 0) {
      dataBackups.value = [
        { id: 'bk1', description: '自动每日备份', size: '25.3MB', createdAt: '2024-06-30 02:00', type: 'auto' },
        { id: 'bk2', description: '自动每日备份', size: '24.8MB', createdAt: '2024-06-29 02:00', type: 'auto' },
        { id: 'bk3', description: '版本升级前备份', size: '23.1MB', createdAt: '2024-06-28 15:30', type: 'manual' }
      ]
      _persistData()
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
