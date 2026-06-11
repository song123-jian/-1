import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_logs'
const INIT_KEY = 'gj_erp_logs_initialized'

export const useLogStore = defineStore('log', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const logs = ref(safeGetJSON(STORAGE_KEY) || [])

  const moduleLabels = {
    customers: '客户管理',
    quotations: '报价管理',
    inventory: '库存管理',
    warehouse: '出入库',
    inbound: '入库',
    outbound: '出库',
    delivery: '送货管理',
    collections: '回款管理',
    statements: '对账管理',
    suppliers: '供应商',
    settings: '系统设置',
    approvals: '审批配置',
    sales_auth: '销售权限',
    archives: '档案管理',
    costanalysis: '成本核算',
    contracts: '合同管理',
    report: '报表'
  }

  const todayCount = computed(() => {
    const today = toLocalDateStr()
    return logs.value.filter((l) => l.time && l.time.startsWith(today)).length
  })

  const weekCount = computed(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    return logs.value.filter((l) => new Date(l.time) >= weekAgo).length
  })

  const sensitiveCount = computed(() => {
    const sensitiveActions = ['删除', '修改', '审批', '导出', '禁用']
    return logs.value.filter((l) => sensitiveActions.some((a) => (l.action || '').includes(a))).length
  })

  const activeUsers = computed(() => {
    const users = new Set(logs.value.map((l) => l.user))
    return users.size
  })

  function addLog(module, action, detail) {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    logs.value.unshift({
      time: timeStr,
      user: getCurrentUser(),
      action: action || '',
      module: module || '',
      detail: detail || action + ' ' + (moduleLabels[module] || module) + '记录'
    })
    if (logs.value.length > 1000) logs.value.pop()
    safeSetJSON(STORAGE_KEY, logs.value)
  }

  function getFilteredLogs(filters) {
    let data = [...logs.value]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(
        (l) =>
          (l.action || '').toLowerCase().includes(q) ||
          (l.detail || '').toLowerCase().includes(q) ||
          (l.user || '').toLowerCase().includes(q)
      )
    }
    if (filters.module) {
      data = data.filter((l) => l.module === filters.module)
    }
    if (filters.dateFrom) {
      data = data.filter((l) => l.time >= filters.dateFrom)
    }
    if (filters.dateTo) {
      data = data.filter((l) => l.time <= filters.dateTo + ' 23:59:59')
    }
    if (filters.user) {
      data = data.filter((l) => l.user === filters.user)
    }
    return data
  }

  function getModuleDistribution() {
    const dist = {}
    for (const l of logs.value) {
      const m = l.module || 'other'
      dist[m] = (dist[m] || 0) + 1
    }
    return Object.entries(dist)
      .map(([key, count]) => ({
        module: key,
        label: moduleLabels[key] || key,
        count
      }))
      .sort((a, b) => b.count - a.count)
  }

  function getDailyTrend(days = 7) {
    const result = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const dateStr = toLocalDateStr(d)
      const count = logs.value.filter((l) => l.time && l.time.startsWith(dateStr)).length
      result.push({ date: dateStr, label: dateStr.substring(5), count })
    }
    return result
  }

  function clearLogs() {
    logs.value = []
    safeSetJSON(STORAGE_KEY, logs.value)
  }

  function replaceData(newData) {
    logs.value = newData
    safeSetJSON(STORAGE_KEY, logs.value)
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const seeds = [
      {
        time: dateStr + ' 09:15:22',
        user: getCurrentUser(),
        action: '登录系统',
        module: 'settings',
        detail: '管理员登录系统'
      },
      {
        time: dateStr + ' 09:30:45',
        user: getCurrentUser(),
        action: '创建报价',
        module: 'quotations',
        detail: '创建报价单QT20241218001'
      },
      {
        time: dateStr + ' 10:12:33',
        user: getCurrentUser(),
        action: '修改客户',
        module: 'customers',
        detail: '修改客户上海贸易有限公司信息'
      },
      {
        time: dateStr + ' 11:05:18',
        user: getCurrentUser(),
        action: '审批报价',
        module: 'approvals',
        detail: '审批通过报价单QT20241210001'
      },
      {
        time: dateStr + ' 13:22:07',
        user: getCurrentUser(),
        action: '创建送货单',
        module: 'delivery',
        detail: '创建送货单DLV-2024-0055'
      },
      {
        time: dateStr + ' 14:45:30',
        user: getCurrentUser(),
        action: '确认回款',
        module: 'collections',
        detail: '确认回款¥32,000'
      },
      {
        time: dateStr + ' 15:10:55',
        user: getCurrentUser(),
        action: '导出报表',
        module: 'report',
        detail: '导出销售分析报告'
      },
      {
        time: dateStr + ' 16:30:12',
        user: getCurrentUser(),
        action: '修改库存',
        module: 'inventory',
        detail: '修改ABS树脂库存数量'
      }
    ]
    logs.value = seeds
    safeSetJSON(STORAGE_KEY, logs.value)
    safeSetItem(INIT_KEY, '1')
  }

  return {
    logs,
    moduleLabels,
    todayCount,
    weekCount,
    sensitiveCount,
    activeUsers,
    addLog,
    getFilteredLogs,
    getModuleDistribution,
    getDailyTrend,
    clearLogs,
    replaceData,
    initSeedData
  }
})
