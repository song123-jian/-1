import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { useInventoryStore } from './inventory'

const STORAGE_KEY = 'gj_erp_stocktakingOrders'
const INIT_KEY = 'gj_erp_stocktaking_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[stocktakingStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[stocktakingStore] save failed:', key, e)
  }
}

function generateOrderNo(existing) {
  const now = new Date()
  const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const fullPrefix = 'PD' + dateStr
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
  full: '全盘',
  partial: '抽盘',
  cycle: '循环盘点'
}

const STATUS_LABELS = {
  planned: '计划中',
  executing: '盘点中',
  diff_review: '差异审核',
  completed: '已完成',
  cancelled: '已取消'
}

const STATUS_COLORS = {
  planned: 'neutral',
  executing: 'info',
  diff_review: 'warning',
  completed: 'success',
  cancelled: 'danger'
}

const ITEM_STATUS_LABELS = {
  pending: '待盘',
  counted: '已盘',
  diff: '有差异'
}

export const useStocktakingStore = defineStore('stocktaking', () => {
  const stocktakingOrders = ref(load(STORAGE_KEY, []))

  function persist() {
    save(STORAGE_KEY, stocktakingOrders.value)
  }

  /* 统计计算 */
  const totalOrders = computed(() => stocktakingOrders.value.length)
  const executingCount = computed(() => stocktakingOrders.value.filter(o => o.status === 'executing').length)
  const diffReviewCount = computed(() => stocktakingOrders.value.filter(o => o.status === 'diff_review').length)
  const completedCount = computed(() => stocktakingOrders.value.filter(o => o.status === 'completed').length)

  /* 初始化种子数据 */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    const invStore = useInventoryStore()
    const items = invStore.inventory || []

    stocktakingOrders.value = [
      {
        id: generateId('pd'),
        orderNo: 'PD20260601001',
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        status: 'completed',
        plannedDate: '2026-06-01',
        executor: '仓管员',
        items: items.slice(0, 4).map((it, idx) => ({
          id: generateId('pdi'),
          materialCode: it.code,
          materialName: it.name,
          spec: it.grade || '',
          unit: 'kg',
          systemQty: it.quantity,
          actualQty: it.quantity + (idx % 2 === 0 ? 5 : -3),
          diffQty: idx % 2 === 0 ? 5 : -3,
          diffRate: it.quantity > 0 ? Math.abs((idx % 2 === 0 ? 5 : -3) / it.quantity * 100).toFixed(2) : '0.00',
          warehouseLocation: it.location || '',
          status: idx % 2 === 0 ? 'diff' : 'counted'
        })),
        summary: { totalItems: 4, countedItems: 4, diffItems: 2, profitAmount: 427.5, lossAmount: 360 },
        createDate: '2026-06-01T08:00:00Z',
        completeDate: '2026-06-01T17:00:00Z',
        notes: '月度全盘'
      },
      {
        id: generateId('pd'),
        orderNo: 'PD20260603001',
        type: 'partial',
        warehouseId: 'main',
        warehouseName: '主仓库',
        status: 'executing',
        plannedDate: '2026-06-03',
        executor: '仓管员',
        items: items.slice(2, 6).map(it => ({
          id: generateId('pdi'),
          materialCode: it.code,
          materialName: it.name,
          spec: it.grade || '',
          unit: 'kg',
          systemQty: it.quantity,
          actualQty: null,
          diffQty: null,
          diffRate: null,
          warehouseLocation: it.location || '',
          status: 'pending'
        })),
        summary: { totalItems: 4, countedItems: 0, diffItems: 0, profitAmount: 0, lossAmount: 0 },
        createDate: '2026-06-03T08:00:00Z',
        completeDate: null,
        notes: '抽盘原材料'
      },
      {
        id: generateId('pd'),
        orderNo: 'PD20260605001',
        type: 'cycle',
        warehouseId: 'main',
        warehouseName: '主仓库',
        status: 'diff_review',
        plannedDate: '2026-06-05',
        executor: '仓管员',
        items: items.slice(0, 3).map((it, idx) => ({
          id: generateId('pdi'),
          materialCode: it.code,
          materialName: it.name,
          spec: it.grade || '',
          unit: 'kg',
          systemQty: it.quantity,
          actualQty: it.quantity + (idx === 1 ? 10 : 0),
          diffQty: idx === 1 ? 10 : 0,
          diffRate: idx === 1 && it.quantity > 0 ? (10 / it.quantity * 100).toFixed(2) : '0.00',
          warehouseLocation: it.location || '',
          status: idx === 1 ? 'diff' : 'counted'
        })),
        summary: { totalItems: 3, countedItems: 3, diffItems: 1, profitAmount: 1200, lossAmount: 0 },
        createDate: '2026-06-05T08:00:00Z',
        completeDate: '2026-06-05T16:00:00Z',
        notes: '循环盘点-不锈钢'
      },
      {
        id: generateId('pd'),
        orderNo: 'PD20260607001',
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        status: 'planned',
        plannedDate: '2026-06-10',
        executor: '',
        items: items.slice(0, 5).map(it => ({
          id: generateId('pdi'),
          materialCode: it.code,
          materialName: it.name,
          spec: it.grade || '',
          unit: 'kg',
          systemQty: it.quantity,
          actualQty: null,
          diffQty: null,
          diffRate: null,
          warehouseLocation: it.location || '',
          status: 'pending'
        })),
        summary: { totalItems: 5, countedItems: 0, diffItems: 0, profitAmount: 0, lossAmount: 0 },
        createDate: '2026-06-07T08:00:00Z',
        completeDate: null,
        notes: '计划中全盘'
      }
    ]
    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /* 新增盘点单 */
  function addStocktakingOrder(order) {
    const invStore = useInventoryStore()
    const items = (order.items || []).map(it => ({
      id: generateId('pdi'),
      materialCode: it.code || it.materialCode || '',
      materialName: it.name || it.materialName || '',
      spec: it.spec || it.grade || '',
      unit: it.unit || 'kg',
      systemQty: parseFloat(it.quantity || it.systemQty) || 0,
      actualQty: null,
      diffQty: null,
      diffRate: null,
      warehouseLocation: it.location || '',
      status: 'pending'
    }))

    const newOrder = {
      id: generateId('pd'),
      orderNo: generateOrderNo(stocktakingOrders.value),
      type: order.type || 'full',
      warehouseId: order.warehouseId || 'main',
      warehouseName: order.warehouseName || '主仓库',
      status: 'planned',
      plannedDate: order.plannedDate || new Date().toISOString().split('T')[0],
      executor: order.executor || '',
      items,
      summary: {
        totalItems: items.length,
        countedItems: 0,
        diffItems: 0,
        profitAmount: 0,
        lossAmount: 0
      },
      createDate: new Date().toISOString(),
      completeDate: null,
      notes: order.notes || ''
    }

    stocktakingOrders.value.unshift(newOrder)
    persist()
    return newOrder
  }

  /* 开始盘点 */
  function startStocktaking(id) {
    const idx = stocktakingOrders.value.findIndex(o => o.id === id)
    if (idx === -1) return false
    if (stocktakingOrders.value[idx].status !== 'planned') return false
    stocktakingOrders.value[idx].status = 'executing'
    persist()
    return true
  }

  /* 更新实盘数量 */
  function updateItemCount(id, itemId, actualQty) {
    const orderIdx = stocktakingOrders.value.findIndex(o => o.id === id)
    if (orderIdx === -1) return false
    const order = stocktakingOrders.value[orderIdx]
    const itemIdx = order.items.findIndex(i => i.id === itemId)
    if (itemIdx === -1) return false

    const item = order.items[itemIdx]
    item.actualQty = parseFloat(actualQty)
    item.diffQty = item.actualQty - item.systemQty
    item.diffRate = item.systemQty > 0 ? Math.abs(item.diffQty / item.systemQty * 100).toFixed(2) : '0.00'
    item.status = item.diffQty === 0 ? 'counted' : 'diff'

    /* 重新计算汇总 */
    recalcSummary(order)
    persist()
    return true
  }

  /* 重新计算汇总信息 */
  function recalcSummary(order) {
    const items = order.items || []
    let countedItems = 0
    let diffItems = 0
    let profitAmount = 0
    let lossAmount = 0

    const invStore = useInventoryStore()

    for (const item of items) {
      if (item.actualQty !== null) countedItems++
      if (item.diffQty !== null && item.diffQty !== 0) {
        diffItems++
        const invItem = invStore.inventory.find(i => i.code === item.materialCode)
        const unitCost = invItem ? (parseFloat(invItem.unitCost) || 0) : 0
        if (item.diffQty > 0) {
          profitAmount += Math.abs(item.diffQty) * unitCost
        } else {
          lossAmount += Math.abs(item.diffQty) * unitCost
        }
      }
    }

    order.summary = {
      totalItems: items.length,
      countedItems,
      diffItems,
      profitAmount: Math.round(profitAmount * 100) / 100,
      lossAmount: Math.round(lossAmount * 100) / 100
    }
  }

  /* 完成盘点 */
  function completeStocktaking(id) {
    const idx = stocktakingOrders.value.findIndex(o => o.id === id)
    if (idx === -1) return false
    const order = stocktakingOrders.value[idx]
    if (order.status !== 'executing') return false

    /* 检查是否全部已盘 */
    const allCounted = order.items.every(i => i.actualQty !== null && i.actualQty !== undefined)
    if (!allCounted) return false

    order.status = 'diff_review'
    order.completeDate = new Date().toISOString()
    persist()
    return true
  }

  /* 差异审批 */
  function reviewDiff(id, approved) {
    const idx = stocktakingOrders.value.findIndex(o => o.id === id)
    if (idx === -1) return false
    const order = stocktakingOrders.value[idx]
    if (order.status !== 'diff_review') return false

    order.status = approved ? 'completed' : 'cancelled'
    persist()
    return true
  }

  /* 库存调整 */
  function adjustInventory(id) {
    const idx = stocktakingOrders.value.findIndex(o => o.id === id)
    if (idx === -1) return { success: false, error: '未找到盘点单' }
    const order = stocktakingOrders.value[idx]
    if (order.status !== 'completed') return { success: false, error: '仅已完成的盘点单可调整库存' }

    const invStore = useInventoryStore()
    let adjustedCount = 0

    for (const item of order.items) {
      if (item.diffQty === null || item.diffQty === 0) continue
      const invIdx = invStore.inventory.findIndex(i => i.code === item.materialCode)
      if (invIdx !== -1) {
        const inv = invStore.inventory[invIdx]
        const newQty = Math.max(0, (parseFloat(inv.quantity) || 0) + item.diffQty)
        invStore.updateInventoryItem(inv.id, { quantity: newQty })
        adjustedCount++
      }
    }

    persist()
    return { success: true, adjustedCount }
  }

  return {
    stocktakingOrders,
    totalOrders,
    executingCount,
    diffReviewCount,
    completedCount,
    TYPE_LABELS,
    STATUS_LABELS,
    STATUS_COLORS,
    ITEM_STATUS_LABELS,
    initSeedData,
    addStocktakingOrder,
    startStocktaking,
    updateItemCount,
    completeStocktaking,
    reviewDiff,
    adjustInventory,
    persist
  }
})
