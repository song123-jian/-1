import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_deliveries'
const INIT_KEY = 'gj_erp_deliveries_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

function generateDeliveryNo() {
  const now = new Date()
  const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const deliveries = load(STORAGE_KEY, [])
  const todayCount = deliveries.filter(d => d.deliveryNo && d.deliveryNo.indexOf(dateStr) !== -1).length
  return 'GJXC-' + dateStr + '-' + String(todayCount + 1).padStart(4, '0')
}

export const useDeliveryStore = defineStore('delivery', () => {
  const deliveries = ref(load(STORAGE_KEY, []))

  const STATUS_FLOW = {
    created: { next: ['pending'], label: '已创建' },
    pending: { next: ['shipped', 'cancelled'], label: '待发货' },
    shipped: { next: ['transit'], label: '已发货' },
    transit: { next: ['received', 'exception'], label: '运输中' },
    received: { next: ['accepted', 'partial', 'exception'], label: '已签收' },
    accepted: { next: [], label: '已验收' },
    partial: { next: ['received', 'exception'], label: '部分签收' },
    exception: { next: ['pending', 'shipped', 'transit'], label: '异常处理中' },
    returned: { next: [], label: '退回' },
    cancelled: { next: [], label: '已取消' }
  }

  const statusLabels = {
    created: '已创建', pending: '待发货', shipped: '已发货', transit: '运输中',
    received: '已签收', accepted: '已验收', partial: '部分签收',
    exception: '异常处理中', returned: '退回', cancelled: '已取消'
  }

  const statusBadgeMap = {
    created: 'neutral', pending: 'warning', shipped: 'info', transit: 'accent',
    received: 'success', accepted: 'success', partial: 'warning',
    exception: 'danger', returned: 'danger', cancelled: 'neutral'
  }

  const urgencyLabels = { urgent: '紧急', high: '高', normal: '普通', low: '低' }
  const urgencyBadgeMap = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' }
  const transportLabels = { self: '自提', logistics: '物流', express: '快递', dedicated: '专车' }
  const exceptionTypeLabels = { delay: '延迟送达', damage: '货物破损', shortage: '数量短缺', address_error: '地址错误', other: '其他' }
  const acceptanceLabels = { passed: '验收通过', partial: '部分通过', failed: '不通过' }

  const totalDeliveries = computed(() => deliveries.value.length)
  const pendingCount = computed(() => deliveries.value.filter(d => d.status === 'created' || d.status === 'pending').length)
  const shippedCount = computed(() => deliveries.value.filter(d => d.status === 'shipped').length)
  const transitCount = computed(() => deliveries.value.filter(d => d.status === 'transit').length)
  const receivedCount = computed(() => deliveries.value.filter(d => d.status === 'received' || d.status === 'accepted').length)
  const exceptionCount = computed(() => deliveries.value.filter(d => d.status === 'exception').length)
  const overdueCount = computed(() => {
    const now = new Date().toISOString().split('T')[0]
    return deliveries.value.filter(d =>
      d.expectedArrivalDate && d.expectedArrivalDate < now &&
      d.status !== 'received' && d.status !== 'accepted'
    ).length
  })
  const totalAmount = computed(() =>
    deliveries.value.reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
  )

  function getById(id) {
    return deliveries.value.find(d => d.id === id)
  }

  function canTransition(currentStatus, targetStatus) {
    const flow = STATUS_FLOW[currentStatus]
    if (!flow) return false
    return flow.next.includes(targetStatus)
  }

  function addDelivery(data) {
    const item = {
      id: data.id || 'dlv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      deliveryNo: data.deliveryNo || generateDeliveryNo(),
      date: data.date || new Date().toISOString().split('T')[0],
      orderId: data.orderId || '',
      urgency: data.urgency || 'normal',
      status: data.status || 'created',
      customerName: data.customerName || '',
      address: data.address || '',
      contact: data.contact || '',
      phone: data.phone || '',
      expectedDate: data.expectedDate || '',
      expectedArrivalDate: data.expectedArrivalDate || '',
      transportMethod: data.transportMethod || 'logistics',
      carrier: data.carrier || '',
      driver: data.driver || '',
      driverPhone: data.driverPhone || '',
      plateNo: data.plateNo || '',
      driverMobile: data.driverMobile || '',
      trackingNo: data.trackingNo || '',
      items: data.items || [],
      totalQuantity: data.totalQuantity || 0,
      totalAmount: data.totalAmount || 0,
      totalTax: data.totalTax || 0,
      grandTotal: data.grandTotal || 0,
      actualDate: data.actualDate || '',
      acceptanceResult: data.acceptanceResult || '',
      acceptNote: data.acceptNote || '',
      acceptPerson: data.acceptPerson || '',
      acceptDate: data.acceptDate || '',
      hasException: data.hasException || '0',
      exceptionType: data.exceptionType || '',
      exceptionReason: data.exceptionReason || '',
      exceptionSolution: data.exceptionSolution || '',
      exceptionResponsible: data.exceptionResponsible || '',
      reviewer: data.reviewer || '',
      financePerson: data.financePerson || '',
      creator: data.creator || '',
      deliverySigner: data.deliverySigner || '',
      receiverSeal: data.receiverSeal || '',
      signDate: data.signDate || '',
      remarks: data.remarks || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if (item.hasException === '1' && item.status !== 'exception') {
      item._prevStatus = item.status
      item.status = 'exception'
    }
    deliveries.value.push(item)
    persist(STORAGE_KEY, deliveries.value)
    return item
  }

  function updateDelivery(id, updates) {
    const idx = deliveries.value.findIndex(d => d.id === id)
    if (idx === -1) return null
    const item = { ...deliveries.value[idx], ...updates, updatedAt: new Date().toISOString() }
    if (item.hasException === '1' && item.status !== 'exception') {
      item._prevStatus = item.status
      item.status = 'exception'
    }
    deliveries.value[idx] = item
    persist(STORAGE_KEY, deliveries.value)
    return item
  }

  function deleteDelivery(id) {
    const idx = deliveries.value.findIndex(d => d.id === id)
    if (idx === -1) return false
    deliveries.value.splice(idx, 1)
    persist(STORAGE_KEY, deliveries.value)
    return true
  }

  function changeStatus(id, newStatus) {
    const delivery = deliveries.value.find(d => d.id === id)
    if (!delivery) return false
    if (delivery.hasException === '1' && delivery.status !== 'exception') {
      delivery._prevStatus = delivery.status
      delivery.status = 'exception'
    } else if (delivery.status === 'exception') {
      const prevStatus = delivery._prevStatus || 'pending'
      if (canTransition(delivery.status, newStatus)) {
        delivery.status = newStatus
      } else if (canTransition('exception', prevStatus)) {
        delivery.status = prevStatus
      } else if (STATUS_FLOW[delivery.status] && STATUS_FLOW[delivery.status].next.length > 0) {
        delivery.status = STATUS_FLOW[delivery.status].next[0]
      }
      delete delivery._prevStatus
    } else {
      if (!canTransition(delivery.status, newStatus)) return false
      delivery.status = newStatus
    }
    delivery.updatedAt = new Date().toISOString()
    persist(STORAGE_KEY, deliveries.value)
    return true
  }

  function runAssessment() {
    const all = deliveries.value
    const total = all.length
    if (total === 0) {
      return { total: 0, grade: 'N/A', score: 0, completionRate: 0, onTimeRate: 100, exceptionRate: 0, overdueCount: 0, exceptionCount: 0, totalAmount: 0, suggestions: [] }
    }
    const statusCounts = {}
    let exceptionC = 0
    let overdueC = 0
    let amt = 0
    const now = new Date().toISOString().split('T')[0]
    for (const d of all) {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
      amt += parseFloat(d.totalAmount) || 0
      if (d.expectedArrivalDate && d.expectedArrivalDate < now && d.status !== 'received' && d.status !== 'accepted') overdueC++
      if (d.hasException === '1') exceptionC++
    }
    const completionRate = Math.round(((statusCounts.accepted || 0) + (statusCounts.received || 0)) / total * 100)
    const exceptionRate = Math.round(exceptionC / total * 100)
    const onTimeRate = Math.round((total - overdueC) / total * 100)
    const score = Math.round(completionRate * 0.4 + onTimeRate * 0.3 + (100 - exceptionRate) * 0.3)
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D'
    const suggestions = []
    if (completionRate < 60) suggestions.push('完成率偏低，建议加快签收和验收流程')
    if (overdueC > total * 0.2) suggestions.push('逾期比例较高，建议优化物流配送时效')
    if (exceptionRate > 15) suggestions.push('异常率偏高，建议分析异常原因并制定预防措施')
    if ((statusCounts.pending || 0) > total * 0.3) suggestions.push('待发货积压较多，建议优化发货调度')
    return { total, grade, score, completionRate, onTimeRate, exceptionRate, overdueCount: overdueC, exceptionCount: exceptionC, totalAmount: amt, statusCounts, suggestions }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(now.getTime() - 86400000 * 2).toISOString().split('T')[0]
    const threeDaysAgo = new Date(now.getTime() - 86400000 * 3).toISOString().split('T')[0]
    const nextWeek = new Date(now.getTime() + 86400000 * 7).toISOString().split('T')[0]
    const nextThreeDays = new Date(now.getTime() + 86400000 * 3).toISOString().split('T')[0]

    const seeds = [
      {
        id: 'dlv_seed_1', deliveryNo: 'GJXC-' + today.replace(/-/g, '') + '-0001',
        date: today, orderId: 'PO-2024-001', urgency: 'urgent', status: 'pending',
        customerName: '上海精密仪器有限公司', address: '上海市浦东新区张江高科技园区',
        contact: '王经理', phone: '021-55551234',
        expectedDate: nextThreeDays, expectedArrivalDate: nextWeek,
        transportMethod: 'logistics', carrier: '顺丰物流', driver: '张师傅', driverPhone: '13800001111',
        items: [
          { seq: 1, productName: '304不锈钢板', partNo: 'SUS304-2B', inventoryCode: 'INV-001', spec: '2mm×1220×2440', unit: '张', quantity: 50, unitPrice: 280, amount: 14000, taxRate: 13, taxAmount: 1820 },
          { seq: 2, productName: '316L不锈钢管', partNo: 'SUS316L-PT', inventoryCode: 'INV-005', spec: 'Φ25×2', unit: '米', quantity: 200, unitPrice: 45, amount: 9000, taxRate: 13, taxAmount: 1170 }
        ],
        totalQuantity: 250, totalAmount: 23000, totalTax: 2990, grandTotal: 25990,
        hasException: '0', createdAt: today + 'T09:00:00.000Z'
      },
      {
        id: 'dlv_seed_2', deliveryNo: 'GJXC-' + yesterday.replace(/-/g, '') + '-0001',
        date: yesterday, orderId: 'PO-2024-003', urgency: 'high', status: 'shipped',
        customerName: '北京航天科技集团', address: '北京市海淀区中关村科技园',
        contact: '李总', phone: '010-88889999',
        expectedDate: today, expectedArrivalDate: nextThreeDays,
        transportMethod: 'dedicated', carrier: '冠久专车', driver: '赵师傅', driverPhone: '13900002222',
        plateNo: '沪A12345', trackingNo: 'SF1234567890',
        items: [
          { seq: 1, productName: '钛合金棒材', partNo: 'TC4-BAR', inventoryCode: 'INV-010', spec: 'Φ30×1000', unit: '根', quantity: 30, unitPrice: 850, amount: 25500, taxRate: 13, taxAmount: 3315 }
        ],
        totalQuantity: 30, totalAmount: 25500, totalTax: 3315, grandTotal: 28815,
        hasException: '0', createdAt: yesterday + 'T10:30:00.000Z'
      },
      {
        id: 'dlv_seed_3', deliveryNo: 'GJXC-' + twoDaysAgo.replace(/-/g, '') + '-0001',
        date: twoDaysAgo, orderId: 'PO-2024-005', urgency: 'normal', status: 'transit',
        customerName: '深圳电子科技有限公司', address: '深圳市南山区科技园',
        contact: '陈工', phone: '0755-66667777',
        expectedDate: yesterday, expectedArrivalDate: today,
        transportMethod: 'express', carrier: '德邦快递', trackingNo: 'DB9876543210',
        items: [
          { seq: 1, productName: '铜排', partNo: 'CU-BAR', inventoryCode: 'INV-008', spec: 'T2×10×100', unit: '米', quantity: 100, unitPrice: 65, amount: 6500, taxRate: 13, taxAmount: 845 },
          { seq: 2, productName: '铝型材', partNo: 'AL-6063', inventoryCode: 'INV-012', spec: '40×40', unit: '米', quantity: 150, unitPrice: 28, amount: 4200, taxRate: 13, taxAmount: 546 }
        ],
        totalQuantity: 250, totalAmount: 10700, totalTax: 1391, grandTotal: 12091,
        hasException: '0', createdAt: twoDaysAgo + 'T14:00:00.000Z'
      },
      {
        id: 'dlv_seed_4', deliveryNo: 'GJXC-' + threeDaysAgo.replace(/-/g, '') + '-0001',
        date: threeDaysAgo, orderId: 'PO-2024-002', urgency: 'normal', status: 'received',
        customerName: '广州汽车零部件公司', address: '广州市黄埔区开发区',
        contact: '黄经理', phone: '020-33334444',
        expectedDate: twoDaysAgo, expectedArrivalDate: yesterday,
        transportMethod: 'logistics', carrier: '安能物流',
        actualDate: yesterday, acceptanceResult: 'passed', acceptPerson: '刘工', acceptDate: yesterday,
        items: [
          { seq: 1, productName: '碳钢板Q235', partNo: 'Q235-PLATE', inventoryCode: 'INV-003', spec: '5mm×1500×6000', unit: '张', quantity: 20, unitPrice: 320, amount: 6400, taxRate: 13, taxAmount: 832 }
        ],
        totalQuantity: 20, totalAmount: 6400, totalTax: 832, grandTotal: 7232,
        hasException: '0', createdAt: threeDaysAgo + 'T08:00:00.000Z'
      },
      {
        id: 'dlv_seed_5', deliveryNo: 'GJXC-' + threeDaysAgo.replace(/-/g, '') + '-0002',
        date: threeDaysAgo, orderId: '', urgency: 'urgent', status: 'exception',
        customerName: '杭州机械制造公司', address: '杭州市余杭区未来科技城',
        contact: '周工', phone: '0571-22223333',
        expectedDate: twoDaysAgo, expectedArrivalDate: yesterday,
        transportMethod: 'logistics', carrier: '中通物流',
        hasException: '1', exceptionType: 'damage', exceptionReason: '运输途中货物发生碰撞导致部分产品变形',
        exceptionSolution: '已联系承运方理赔，安排补发', exceptionResponsible: '赵经理',
        _prevStatus: 'transit',
        items: [
          { seq: 1, productName: '精密无缝管', partNo: 'SS-TUBE', inventoryCode: 'INV-015', spec: 'Φ20×2×6000', unit: '根', quantity: 80, unitPrice: 120, amount: 9600, taxRate: 13, taxAmount: 1248 }
        ],
        totalQuantity: 80, totalAmount: 9600, totalTax: 1248, grandTotal: 10848,
        createdAt: threeDaysAgo + 'T11:00:00.000Z'
      }
    ]
    deliveries.value = seeds
    persist(STORAGE_KEY, deliveries.value)
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    deliveries,
    STATUS_FLOW, statusLabels, statusBadgeMap,
    urgencyLabels, urgencyBadgeMap, transportLabels,
    exceptionTypeLabels, acceptanceLabels,
    totalDeliveries, pendingCount, shippedCount, transitCount,
    receivedCount, exceptionCount, overdueCount, totalAmount,
    getById, canTransition,
    addDelivery, updateDelivery, deleteDelivery,
    changeStatus, runAssessment, generateDeliveryNo,
    initSeedData
  }
})
