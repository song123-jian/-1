/**
 * 状态映射工具函数
 * 提供报价、合同、送货、回款等业务单据的状态标签和样式映射
 */

export function quoteStatusLabel(status) {
  const map = { draft: '草稿', pending: '待审', sent: '已发送', accepted: '已接受', approved: '已批准', rejected: '已拒绝', expired: '已过期' }
  return map[status] || status || '-'
}

export function quoteStatusClass(status) {
  const map = { draft: 'status-draft', pending: 'status-pending', sent: 'status-sent', accepted: 'status-accepted', approved: 'status-approved', rejected: 'status-rejected', expired: 'status-expired' }
  return map[status] || ''
}

export function contractStatusLabel(status) {
  const map = { draft: '草稿', pending_approval: '待审批', approved: '已审批', signed: '已签订', active: '执行中', completed: '已完成', archived: '已归档', cancelled: '已作废', expired: '已过期', terminated: '已终止' }
  return map[status] || status || '-'
}

export function contractStatusClass(status) {
  const map = { draft: 'status-draft', pending_approval: 'status-pending', approved: 'status-approved', signed: 'status-accepted', active: 'status-accepted', completed: 'status-success', archived: 'status-expired', cancelled: 'status-rejected', expired: 'status-expired', terminated: 'status-rejected' }
  return map[status] || ''
}

export function deliveryStatusLabel(status) {
  const map = { created: '已创建', pending: '待发货', shipped: '已发货', transit: '运输中', received: '已签收', accepted: '已验收', partial: '部分签收', exception: '异常处理中', returned: '退回', cancelled: '已取消' }
  return map[status] || status || '-'
}

export function deliveryStatusClass(status) {
  const map = { created: 'status-draft', pending: 'status-pending', shipped: 'status-sent', transit: 'status-pending', received: 'status-accepted', accepted: 'status-approved', partial: 'status-pending', exception: 'status-rejected', returned: 'status-rejected', cancelled: 'status-expired' }
  return map[status] || ''
}

export function collectionStatusLabel(status) {
  const map = { pending: '待确认', confirmed: '已确认', completed: '已完成', voided: '已作废' }
  return map[status] || status || '-'
}

export function collectionStatusClass(status) {
  const map = { pending: 'status-pending', confirmed: 'status-accepted', completed: 'status-approved', voided: 'status-rejected' }
  return map[status] || ''
}

export function collectionMethodLabel(method) {
  const map = { bank_transfer: '银行转账', cash: '现金', check: '支票', wechat: '微信', alipay: '支付宝', other: '其他' }
  return map[method] || method || '-'
}
