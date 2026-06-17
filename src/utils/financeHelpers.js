/**
 * 财务模块公共工具函数
 * 提供应付/应收模块共用的单号生成、账龄分析、逾期刷新、状态映射等功能
 */

/**
 * 生成业务单号
 * @param {string} prefix - 单号前缀（如 YF/PY/YS/RC）
 * @param {Array} list - 现有单据列表
 * @param {string} noField - 单号字段名
 * @returns {string} 新单号
 */
export function generateOrderNo(prefix, list, noField) {
  const now = new Date()
  const dateStr =
    now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const p = prefix + dateStr
  let maxSeq = 0
  for (const item of list) {
    if ((item[noField] || '').startsWith(p)) {
      const tail = item[noField].slice(p.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return p + String(maxSeq + 1).padStart(3, '0')
}

/**
 * 计算账龄分析
 * @param {Array} items - 单据列表
 * @param {string} amountField - 总金额字段名
 * @param {string} paidField - 已付/已收金额字段名
 * @returns {Object} 账龄分析结果
 */
export function computeAging(items, amountField, paidField) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const result = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days180: 0,
    over180: 0,
    currentCount: 0,
    days30Count: 0,
    days60Count: 0,
    days90Count: 0,
    days180Count: 0,
    over180Count: 0
  }

  for (const item of items) {
    if (item.status === 'completed') continue
    const remaining = (parseFloat(item[amountField]) || 0) - (parseFloat(item[paidField]) || 0)
    if (remaining <= 0) continue

    const dueDate = item.dueDate ? new Date(item.dueDate) : null
    if (!dueDate) {
      result.current += remaining
      result.currentCount++
      continue
    }
    dueDate.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((now - dueDate) / 86400000)

    if (diffDays <= 0) {
      result.current += remaining
      result.currentCount++
    } else if (diffDays <= 30) {
      result.days30 += remaining
      result.days30Count++
    } else if (diffDays <= 60) {
      result.days60 += remaining
      result.days60Count++
    } else if (diffDays <= 90) {
      result.days90 += remaining
      result.days90Count++
    } else if (diffDays <= 180) {
      result.days180 += remaining
      result.days180Count++
    } else {
      result.over180 += remaining
      result.over180Count++
    }
  }
  return result
}

/**
 * 刷新逾期状态
 * @param {Array} items - 单据列表（会被就地修改）
 * @param {string} paidField - 已付/已收金额字段名
 * @returns {boolean} 是否有状态变更
 */
export function refreshOverdueStatus(items, paidField) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let changed = false
  for (const item of items) {
    if (item.status === 'completed') continue
    const dueDate = item.dueDate ? new Date(item.dueDate) : null
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0)
      const isOverdue = dueDate < now && item.status !== 'completed'
      if (isOverdue && item.status !== 'overdue') {
        item.status = 'overdue'
        changed = true
      } else if (!isOverdue && item.status === 'overdue') {
        item.status = (parseFloat(item[paidField]) || 0) > 0 ? 'partial' : 'pending'
        changed = true
      }
    }
  }
  return changed
}

/**
 * 获取财务状态标签
 * @param {string} status - 状态值
 * @param {'payable'|'receivable'} type - 类型
 * @returns {string} 状态标签文本
 */
export function getStatusLabel(status, type = 'payable') {
  const labels = {
    payable: { pending: '待付款', partial: '部分付款', completed: '已付完', overdue: '已逾期' },
    receivable: { pending: '待收款', partial: '部分收款', completed: '已收完', overdue: '已逾期' }
  }
  return labels[type]?.[status] || status || '-'
}

/**
 * 获取财务状态CSS类名
 * @param {string} status - 状态值
 * @returns {string} CSS类名
 */
export function getStatusClass(status) {
  const map = {
    pending: 'status-pending',
    partial: 'status-partial',
    completed: 'status-completed',
    overdue: 'status-overdue'
  }
  return map[status] || ''
}

/**
 * 公共状态徽章映射
 */
export const statusBadgeMap = {
  pending: 'warning',
  partial: 'info',
  completed: 'success',
  overdue: 'danger'
}

/**
 * 公共付款方式标签映射
 */
export const methodLabels = {
  bank: '银行转账',
  cash: '现金',
  check: '支票',
  other: '其他'
}
