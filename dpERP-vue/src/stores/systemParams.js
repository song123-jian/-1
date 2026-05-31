import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const PARAMS_KEY = 'gj_erp_systemParams'
const LOGS_KEY = 'gj_erp_paramLogs'
const INIT_KEY = 'gj_erp_systemParams_initialized'

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) } catch (e) { /* ignore */ }
  return fallback
}
function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch (e) { /* ignore */ }
}

const defaultParams = {
  systemName: 'dpERP 智能管理系统', systemVersion: '2.0.0', logo: '',
  language: 'zh-CN', timezone: 'Asia/Shanghai', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm:ss',
  sessionTimeout: 30, maxLoginAttempts: 5, passwordMinLength: 8, passwordComplexity: true,
  backupEnabled: true, backupInterval: 'daily', backupRetention: 30,
  logLevel: 'info', logRetention: 90,
  emailEnabled: false, smtpHost: '', smtpPort: 465, smtpUser: '', smtpPass: '', emailFrom: '',
  smsEnabled: false, smsProvider: '', smsApiKey: '',
  apiRateLimit: 100, apiTimeout: 30, cacheEnabled: true, cacheTTL: 3600,
  maintenanceMode: false, maintenanceMessage: '系统维护中，请稍后再试...'
}

export const useSystemParamsStore = defineStore('systemParams', () => {
  const params = ref(load(PARAMS_KEY, { ...defaultParams }))
  const logs = ref(load(LOGS_KEY, []))

  const paramGroups = computed(() => [
    { key: 'general', label: '通用设置', icon: '⚙️' },
    { key: 'security', label: '安全设置', icon: '🔒' },
    { key: 'backup', label: '备份设置', icon: '💾' },
    { key: 'notification', label: '通知设置', icon: '📧' },
    { key: 'performance', label: '性能设置', icon: '🚀' }
  ])

  function _persistParams() { persist(PARAMS_KEY, params.value) }
  function _persistLogs() { persist(LOGS_KEY, logs.value) }

  function _addLog(action, detail) {
    logs.value.unshift({
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: '系统管理员', action, detail
    })
    if (logs.value.length > 200) logs.value = logs.value.slice(0, 200)
    _persistLogs()
  }

  function saveParams(updates) {
    params.value = { ...params.value, ...updates }
    _persistParams()
    _addLog('保存参数', Object.keys(updates).join(', '))
  }

  function resetParams() {
    params.value = { ...defaultParams }
    _persistParams()
    _addLog('重置参数', '恢复默认值')
  }

  function resetGroup(group) {
    const groupKeys = {
      general: ['systemName', 'systemVersion', 'logo', 'language', 'timezone', 'dateFormat', 'timeFormat'],
      security: ['sessionTimeout', 'maxLoginAttempts', 'passwordMinLength', 'passwordComplexity'],
      backup: ['backupEnabled', 'backupInterval', 'backupRetention'],
      notification: ['emailEnabled', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'emailFrom', 'smsEnabled', 'smsProvider', 'smsApiKey'],
      performance: ['apiRateLimit', 'apiTimeout', 'cacheEnabled', 'cacheTTL', 'maintenanceMode', 'maintenanceMessage']
    }
    const keys = groupKeys[group] || []
    keys.forEach(k => { params.value[k] = defaultParams[k] })
    _persistParams()
    _addLog('重置分组', group)
  }

  function testEmail() {
    _addLog('测试邮件', '发送测试邮件到 ' + params.value.emailFrom)
    return true
  }

  function testSms() {
    _addLog('测试短信', '通过 ' + params.value.smsProvider + ' 发送测试短信')
    return true
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    params.value = { ...defaultParams }
    _persistParams()
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    params, logs, paramGroups, defaultParams,
    saveParams, resetParams, resetGroup, testEmail, testSms, initSeedData
  }
})
