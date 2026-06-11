import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { useInventoryStore } from './inventory'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_transferOrders'
const INIT_KEY = 'gj_erp_transfer_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[transferStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[transferStore] save failed:', key, e)
  }
}

function generateOrderNo(existing) {
  const now = new Date()
  const dateStr =
    now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const fullPrefix = 'DB' + dateStr
  let maxSeq = 0
  for (const o of existing) {
    if (o.orderNo && o.orderNo.startsWith(fullPrefix)) {
      const tail = o.orderNo.slice(fullPrefix.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return fullPrefix + String(maxSeq + 1).padStart(3, '0')
}

const TYPE_LABELS = {
  same_price: '同价调拨',
  diff_price: '异价调拨'
}

const STATUS_LABELS = {
  draft: '草稿',
  pending: '待审批',
  approved: '已审批',
  in_transit: '在途',
  completed: '已完成',
  cancelled: '已取消'
}

const STATUS_COLORS = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'info',
  in_transit: 'info',
  completed: 'success',
  cancelled: 'danger'
}

export const useTransferStore = defineStore('transfer', () => {
  const transferOrders = ref(load(STORAGE_KEY, []))

  function persist() {
    save(STORAGE_KEY, transferOrders.value)
  }

  /* 统计 */
  const totalOrders = computed(() => transferOrders.value.length)
  const pendingCount = computed(() => transferOrders.value.filter((o) => o.status === 'pending').length)
  const inTransitCount = computed(() => transferOrders.value.filter((o) => o.status === 'in_transit').length)
  const completedCount = computed(() => transferOrders.value.filter((o) => o.status === 'completed').length)

  const monthlyAmount = computed(() => {
    const now = new Date()
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return transferOrders.value
      .filter((o) => o.status === 'completed' && o.completeDate && o.completeDate.startsWith(month))
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
  })

  /* 初始化种子数据 */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    transferOrders.value = [
      {
        id: generateId('db'),
        orderNo: 'DB20260520001',
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'branch',
        toWarehouseName: '分仓库',
        status: 'completed',
        items: [
          {
            id: generateId('dbi'),
            materialCode: 'MTL-001',
            materialName: 'ABS树脂',
            spec: '通用级',
            unit: 'kg',
            quantity: 100,
            unitPrice: 85.5,
            amount: 8550
          },
          {
            id: generateId('dbi'),
            materialCode: 'MTL-007',
            materialName: '碳钢Q235',
            spec: '热轧板卷',
            unit: 'kg',
            quantity: 200,
            unitPrice: 45,
            amount: 9000
          }
        ],
        totalAmount: 17550,
        requester: '仓管员',
        approver: '仓库主管',
        approveDate: '2026-05-20',
        expectedDate: '2026-05-22',
        actualDate: '2026-05-21',
        notes: '分仓补货',
        createDate: '2026-05-20T08:00:00Z'
      },
      {
        id: generateId('db'),
        orderNo: 'DB20260601001',
        type: 'diff_price',
        fromWarehouseId: 'branch',
        fromWarehouseName: '分仓库',
        toWarehouseId: 'main',
        toWarehouseName: '主仓库',
        status: 'in_transit',
        items: [
          {
            id: generateId('dbi'),
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            spec: '2B/BA',
            unit: 'kg',
            quantity: 300,
            unitPrice: 125,
            amount: 37500
          }
        ],
        totalAmount: 37500,
        requester: '仓管员',
        approver: '仓库主管',
        approveDate: '2026-06-01',
        expectedDate: '2026-06-03',
        actualDate: null,
        notes: '主仓调回',
        createDate: '2026-06-01T09:00:00Z'
      },
      {
        id: generateId('db'),
        orderNo: 'DB20260605001',
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'branch',
        toWarehouseName: '分仓库',
        status: 'pending',
        items: [
          {
            id: generateId('dbi'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            spec: 'T5',
            unit: 'kg',
            quantity: 150,
            unitPrice: 95,
            amount: 14250
          },
          {
            id: generateId('dbi'),
            materialCode: 'MTL-004',
            materialName: 'POM塑料',
            spec: 'M90-44',
            unit: 'kg',
            quantity: 80,
            unitPrice: 65,
            amount: 5200
          }
        ],
        totalAmount: 19450,
        requester: '仓管员',
        approver: '',
        approveDate: null,
        expectedDate: '2026-06-08',
        actualDate: null,
        notes: '项目需求调拨',
        createDate: '2026-06-05T10:00:00Z'
      }
    ]
    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /* 新增调拨单 */
  function addTransferOrder(order) {
    const items = (order.items || []).map((it) => ({
      id: generateId('dbi'),
      materialCode: it.materialCode || it.code || '',
      materialName: it.materialName || it.name || '',
      spec: it.spec || '',
      unit: it.unit || 'kg',
      quantity: parseFloat(it.quantity) || 0,
      unitPrice: parseFloat(it.unitPrice) || 0,
      amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)
    }))

    const totalAmount = items.reduce((s, i) => s + i.amount, 0)

    const newOrder = {
      id: generateId('db'),
      orderNo: generateOrderNo(transferOrders.value),
      type: order.type || 'same_price',
      fromWarehouseId: order.fromWarehouseId || '',
      fromWarehouseName: order.fromWarehouseName || '',
      toWarehouseId: order.toWarehouseId || '',
      toWarehouseName: order.toWarehouseName || '',
      status: 'draft',
      items,
      totalAmount,
      requester: order.requester || '',
      approver: '',
      approveDate: null,
      expectedDate: order.expectedDate || '',
      actualDate: null,
      notes: order.notes || '',
      createDate: new Date().toISOString()
    }

    transferOrders.value.unshift(newOrder)
    persist()
    return newOrder
  }

  /* 提交审批 */
  function submitTransferOrder(id) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return false
    if (transferOrders.value[idx].status !== 'draft') return false
    transferOrders.value[idx].status = 'pending'
    persist()
    return true
  }

  /* 审批通过 */
  function approveTransferOrder(id, approver) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return false
    if (transferOrders.value[idx].status !== 'pending') return false
    transferOrders.value[idx].status = 'approved'
    transferOrders.value[idx].approver = approver || ''
    transferOrders.value[idx].approveDate = toLocalDateStr()
    persist()
    return true
  }

  /* 审批拒绝 */
  function rejectTransferOrder(id) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return false
    if (transferOrders.value[idx].status !== 'pending') return false
    transferOrders.value[idx].status = 'cancelled'
    persist()
    return true
  }

  /* 发货 */
  function shipTransferOrder(id) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return false
    if (transferOrders.value[idx].status !== 'approved') return false
    transferOrders.value[idx].status = 'in_transit'
    persist()
    return true
  }

  /* 收货 - 更新两个仓库库存 */
  function receiveTransferOrder(id) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到调拨单' }
    const order = transferOrders.value[idx]
    if (order.status !== 'in_transit') return { success: false, error: '仅可在途单据可收货' }

    const invStore = useInventoryStore()
    let adjustedCount = 0

    for (const item of order.items) {
      /* 从调出仓库扣减库存 */
      const fromInvIdx = invStore.inventory.findIndex(
        (i) => i.code === item.materialCode && i.warehouse === order.fromWarehouseId
      )
      if (fromInvIdx !== -1) {
        const inv = invStore.inventory[fromInvIdx]
        const newQty = Math.max(0, (parseFloat(inv.quantity) || 0) - item.quantity)
        invStore.updateInventoryItem(inv.id, { quantity: newQty })
        adjustedCount++
      }

      /* 向调入仓库增加库存 */
      const toInvIdx = invStore.inventory.findIndex(
        (i) => i.code === item.materialCode && i.warehouse === order.toWarehouseId
      )
      if (toInvIdx !== -1) {
        /* 调入仓库已有该物料，增加数量 */
        const inv = invStore.inventory[toInvIdx]
        const newQty = (parseFloat(inv.quantity) || 0) + item.quantity
        invStore.updateInventoryItem(inv.id, { quantity: newQty })
      } else {
        /* 调入仓库没有该物料，新增库存记录 */
        const fromInv = invStore.inventory.find((i) => i.code === item.materialCode)
        invStore.addInventoryItem({
          code: item.materialCode,
          name: item.materialName,
          spec: item.spec || '',
          grade: item.spec || '',
          unit: item.unit || 'kg',
          quantity: item.quantity,
          unitCost: item.unitPrice || 0,
          warehouse: order.toWarehouseId,
          location: ''
        })
      }
      adjustedCount++
    }

    order.status = 'completed'
    order.actualDate = toLocalDateStr()
    persist()
    return { success: true, adjustedCount }
  }

  /* 取消 */
  function cancelTransferOrder(id) {
    const idx = transferOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return false
    const status = transferOrders.value[idx].status
    if (status === 'completed' || status === 'in_transit') return false
    transferOrders.value[idx].status = 'cancelled'
    persist()
    return true
  }

  return {
    transferOrders,
    totalOrders,
    pendingCount,
    inTransitCount,
    completedCount,
    monthlyAmount,
    TYPE_LABELS,
    STATUS_LABELS,
    STATUS_COLORS,
    initSeedData,
    addTransferOrder,
    submitTransferOrder,
    approveTransferOrder,
    rejectTransferOrder,
    shipTransferOrder,
    receiveTransferOrder,
    cancelTransferOrder,
    persist
  }
})
