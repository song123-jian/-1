import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'

const QUAL_KEY = 'gj_erp_qualifications'
const INVOICE_KEY = 'gj_erp_invoiceProfiles'
const DS_SETTINGS_KEY = 'gj_erp_docSettings'
const DS_LOGS_KEY = 'gj_erp_docSettingsLogs'
const INIT_KEY = 'gj_erp_docSettings_initialized'

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
      console.error('[docSettings] localStorage容量不足，数据可能丢失！')
    }
  }
}
function genId(prefix) {
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

const qualTypeLabels = {
  business_license: '营业执照',
  tax_cert: '税务登记证',
  iso_cert: 'ISO认证',
  import_export: '进出口许可',
  special_permit: '特种经营许可',
  other: '其他'
}
const qualStatusLabels = {
  active: '有效',
  expiring_soon: '即将到期',
  expired: '已过期',
  revoked: '已作废',
  pending_review: '待审核'
}

export const useDocSettingsStore = defineStore('docSettings', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const qualifications = ref(load(QUAL_KEY, []))
  const invoiceProfiles = ref(load(INVOICE_KEY, []))
  const settings = ref(
    load(DS_SETTINGS_KEY, {
      licenseDays: 30,
      completeness: 80,
      autoFreeze: true,
      notifySys: true,
      notifyEmail: false,
      notifyWecom: false,
      remindFreq: 'weekly'
    })
  )
  const logs = ref(load(DS_LOGS_KEY, []))

  const qualTotal = computed(() => qualifications.value.length)
  const qualActive = computed(() => qualifications.value.filter((q) => q.status === 'active').length)
  const qualExpiring = computed(() => qualifications.value.filter((q) => q.status === 'expiring_soon').length)
  const qualExpired = computed(() => qualifications.value.filter((q) => q.status === 'expired').length)

  const complianceScore = computed(() => {
    if (qualifications.value.length === 0) return 0
    const active = qualifications.value.filter((q) => q.status === 'active').length
    return Math.round((active / qualifications.value.length) * 100)
  })
  const complianceRate = computed(() => complianceScore.value + '%')
  const riskCount = computed(
    () => qualifications.value.filter((q) => q.status === 'expired' || q.status === 'expiring_soon').length
  )

  function _persistQuals() {
    persist(QUAL_KEY, qualifications.value)
  }
  function _persistInvoices() {
    persist(INVOICE_KEY, invoiceProfiles.value)
  }
  function _persistSettings() {
    persist(DS_SETTINGS_KEY, settings.value)
  }
  function _persistLogs() {
    persist(DS_LOGS_KEY, logs.value)
  }

  function _addLog(action, detail) {
    logs.value.unshift({
      id: genId('dsl'),
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: getCurrentUser(),
      action,
      detail,
      ip: '127.0.0.1'
    })
    if (logs.value.length > 200) logs.value = logs.value.slice(0, 200)
    _persistLogs()
  }

  function addQualification(data) {
    const item = {
      id: genId('q'),
      name: data.name || '',
      type: data.type || 'other',
      certNo: data.certNo || '',
      issuer: data.issuer || '',
      issueDate: data.issueDate || '',
      expiryDate: data.expiryDate || '',
      status: data.status || 'active',
      warning: ''
    }
    if (item.expiryDate) {
      const days = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000)
      if (days < 0) item.status = 'expired'
      else if (days <= (settings.value.licenseDays || 30)) item.status = 'expiring_soon'
      item.warning = days < 0 ? '已过期' + Math.abs(days) + '天' : days <= 30 ? '剩余' + days + '天' : ''
    }
    qualifications.value.push(item)
    _addLog('新增资质', item.name)
    _persistQuals()
    return item
  }

  function updateQualification(id, updates) {
    const idx = qualifications.value.findIndex((q) => q.id === id)
    if (idx === -1) return null
    qualifications.value[idx] = { ...qualifications.value[idx], ...updates }
    _addLog('修改资质', qualifications.value[idx].name)
    _persistQuals()
    return qualifications.value[idx]
  }

  function deleteQualification(id) {
    const idx = qualifications.value.findIndex((q) => q.id === id)
    if (idx === -1) return false
    const name = qualifications.value[idx].name
    qualifications.value.splice(idx, 1)
    _addLog('删除资质', name)
    _persistQuals()
    return true
  }

  function addInvoiceProfile(data) {
    const item = {
      id: genId('inv'),
      companyName: data.companyName || '',
      taxNo: data.taxNo || '',
      bank: data.bank || '',
      bankAccount: data.bankAccount || '',
      address: data.address || '',
      phone: data.phone || '',
      invoiceType: data.invoiceType || '增值税专用发票',
      isDefault: data.isDefault || false
    }
    if (item.isDefault) invoiceProfiles.value.forEach((i) => (i.isDefault = false))
    invoiceProfiles.value.push(item)
    _addLog('新增开票资料', item.companyName)
    _persistInvoices()
    return item
  }

  function updateInvoiceProfile(id, updates) {
    const idx = invoiceProfiles.value.findIndex((i) => i.id === id)
    if (idx === -1) return null
    if (updates.isDefault) invoiceProfiles.value.forEach((i) => (i.isDefault = false))
    invoiceProfiles.value[idx] = { ...invoiceProfiles.value[idx], ...updates }
    _addLog('修改开票资料', invoiceProfiles.value[idx].companyName)
    _persistInvoices()
    return invoiceProfiles.value[idx]
  }

  function deleteInvoiceProfile(id) {
    const idx = invoiceProfiles.value.findIndex((i) => i.id === id)
    if (idx === -1) return false
    invoiceProfiles.value.splice(idx, 1)
    _persistInvoices()
    return true
  }

  function saveSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
    _addLog('保存配置', JSON.stringify(newSettings))
    _persistSettings()
  }

  function applyPreset(preset) {
    if (preset === 'strict') {
      Object.assign(settings.value, { licenseDays: 60, completeness: 95, autoFreeze: true, remindFreq: 'daily' })
    } else if (preset === 'standard') {
      Object.assign(settings.value, { licenseDays: 30, completeness: 80, autoFreeze: true, remindFreq: 'weekly' })
    } else if (preset === 'loose') {
      Object.assign(settings.value, { licenseDays: 14, completeness: 60, autoFreeze: false, remindFreq: 'onExpiry' })
    }
    _addLog('应用预设', preset)
    _persistSettings()
  }

  function replaceData(newData) {
    if (newData.qualifications) {
      qualifications.value = newData.qualifications
      _persistQuals()
    }
    if (newData.invoiceProfiles) {
      invoiceProfiles.value = newData.invoiceProfiles
      _persistInvoices()
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    const seeds = [
      {
        id: 'q1',
        name: '营业执照',
        type: 'business_license',
        certNo: '91310000MA1FL8XX3K',
        issuer: '上海市市场监督管理局',
        issueDate: '2020-06-15',
        expiryDate: '2030-06-14',
        status: 'active',
        warning: ''
      },
      {
        id: 'q2',
        name: 'ISO 9001质量管理体系认证',
        type: 'iso_cert',
        certNo: 'CNCA-2023-Q-12345',
        issuer: '中国质量认证中心',
        issueDate: '2023-01-10',
        expiryDate: '2026-01-09',
        status: 'active',
        warning: ''
      },
      {
        id: 'q3',
        name: '进出口经营权',
        type: 'import_export',
        certNo: 'SH-IMP-2021-0088',
        issuer: '上海市商务委员会',
        issueDate: '2021-03-20',
        expiryDate: '2025-03-19',
        status: 'expiring_soon',
        warning: '即将到期'
      },
      {
        id: 'q4',
        name: '税务登记证',
        type: 'tax_cert',
        certNo: 'SH-TAX-2020-12345',
        issuer: '国家税务总局上海市税务局',
        issueDate: '2020-06-15',
        expiryDate: '2024-06-14',
        status: 'expired',
        warning: '已过期'
      },
      {
        id: 'q5',
        name: '特种经营许可证',
        type: 'special_permit',
        certNo: 'SP-2022-0056',
        issuer: '上海市应急管理局',
        issueDate: '2022-08-01',
        expiryDate: '2027-07-31',
        status: 'active',
        warning: ''
      }
    ]
    qualifications.value = seeds
    _persistQuals()

    if (invoiceProfiles.value.length === 0) {
      invoiceProfiles.value = [
        {
          id: 'inv1',
          companyName: '冠久科技有限公司',
          taxNo: '91310000MA1FL8XX3K',
          bank: '中国工商银行浦东支行',
          bankAccount: '1001 2088 0920 0123 456',
          address: '上海市浦东新区XXX路XXX号',
          phone: '021-6888XXXX',
          invoiceType: '增值税专用发票',
          isDefault: true
        },
        {
          id: 'inv2',
          companyName: '冠久科技（苏州）有限公司',
          taxNo: '91320500MA1WXXX9XN',
          bank: '中国建设银行苏州分行',
          bankAccount: '3220 1988 0360 5123 789',
          address: '苏州市工业园区XXX路XXX号',
          phone: '0512-6888XXXX',
          invoiceType: '增值税普通发票',
          isDefault: false
        }
      ]
      _persistInvoices()
    }

    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    qualifications,
    invoiceProfiles,
    settings,
    logs,
    qualTypeLabels,
    qualStatusLabels,
    qualTotal,
    qualActive,
    qualExpiring,
    qualExpired,
    complianceScore,
    complianceRate,
    riskCount,
    addQualification,
    updateQualification,
    deleteQualification,
    addInvoiceProfile,
    updateInvoiceProfile,
    deleteInvoiceProfile,
    saveSettings,
    applyPreset,
    replaceData,
    initSeedData
  }
})
