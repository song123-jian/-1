import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { useBomStore } from './bom'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_productionOrders'
const INIT_KEY = 'gj_erp_production_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[productionStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[productionStore] save failed:', key, e)
  }
}

/* 工单状态标签 */
export const ORDER_STATUS_LABELS = {
  planned: '已计划',
  released: '已下达',
  in_progress: '生产中',
  quality_check: '质检中',
  completed: '已完成',
  cancelled: '已取消'
}

/* 工单状态颜色 */
export const ORDER_STATUS_COLORS = {
  planned: 'var(--color-text-tertiary)',
  released: 'var(--color-info)',
  in_progress: 'var(--color-accent)',
  quality_check: 'var(--color-warning)',
  completed: 'var(--color-success)',
  cancelled: 'var(--color-danger)'
}

/* 优先级标签 */
export const PRIORITY_LABELS = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急'
}

/* 优先级颜色 */
export const PRIORITY_COLORS = {
  low: 'var(--color-text-tertiary)',
  normal: 'var(--color-info)',
  high: 'var(--color-warning)',
  urgent: 'var(--color-danger)'
}

export const useProductionStore = defineStore('production', () => {
  const productionOrders = ref(load(STORAGE_KEY, []))

  function persist() {
    save(STORAGE_KEY, productionOrders.value)
  }

  /* 生成工单号: MO+年月日+序号 */
  function generateOrderNo() {
    const now = new Date()
    const dateStr =
      now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const prefix = 'MO' + dateStr
    let maxSeq = 0
    for (const order of productionOrders.value) {
      if (order.orderNo && order.orderNo.startsWith(prefix)) {
        const tail = order.orderNo.slice(prefix.length)
        const n = parseInt(tail, 10)
        if (!isNaN(n) && n > maxSeq) maxSeq = n
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0')
  }

  /* 计算属性 */
  const activeOrders = computed(() => productionOrders.value.filter((o) => o.status !== 'cancelled'))

  const inProgressOrders = computed(() => productionOrders.value.filter((o) => o.status === 'in_progress'))

  /* 本月完成的工单 */
  const monthlyCompletedOrders = computed(() => {
    const now = new Date()
    const yearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return productionOrders.value.filter(
      (o) => o.status === 'completed' && o.actualEndDate && o.actualEndDate.startsWith(yearMonth)
    )
  })

  /* 本月产值 */
  const monthlyOutputValue = computed(() => {
    return monthlyCompletedOrders.value.reduce((sum, o) => {
      return sum + (parseFloat(o.quantity) || 0) * (parseFloat(o.unitPrice) || 0)
    }, 0)
  })

  /* 统计数据 */
  const orderStats = computed(() => {
    const total = productionOrders.value.length
    const planned = productionOrders.value.filter((o) => o.status === 'planned').length
    const released = productionOrders.value.filter((o) => o.status === 'released').length
    const inProgress = productionOrders.value.filter((o) => o.status === 'in_progress').length
    const qualityCheck = productionOrders.value.filter((o) => o.status === 'quality_check').length
    const completed = productionOrders.value.filter((o) => o.status === 'completed').length
    const cancelled = productionOrders.value.filter((o) => o.status === 'cancelled').length
    return { total, planned, released, inProgress, qualityCheck, completed, cancelled }
  })

  /* 初始化种子数据 */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    productionOrders.value = [
      {
        id: generateId('mo'),
        orderNo: 'MO20260601001',
        bomId: 'bom1',
        bomName: '精密减速器总成BOM',
        productName: '精密减速器RV-40E',
        quantity: 50,
        unit: '台',
        unitPrice: 8500,
        status: 'in_progress',
        plannedStartDate: '2026-06-01',
        plannedEndDate: '2026-06-15',
        actualStartDate: '2026-06-02',
        actualEndDate: '',
        priority: 'high',
        workshop: '一号车间',
        operator: '张师傅',
        materialRequisitions: [
          {
            id: generateId('mr'),
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            requiredQty: 750,
            issuedQty: 750,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            requiredQty: 400,
            issuedQty: 400,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-006',
            materialName: '轴承钢GCr15',
            requiredQty: 250,
            issuedQty: 200,
            unit: 'kg'
          }
        ],
        progress: 65,
        notes: '重点订单，优先排产',
        createDate: '2026-05-28'
      },
      {
        id: generateId('mo'),
        orderNo: 'MO20260602001',
        bomId: 'bom2',
        bomName: '液压缸总成BOM',
        productName: '液压缸HOB-63/35',
        quantity: 100,
        unit: '台',
        unitPrice: 3200,
        status: 'released',
        plannedStartDate: '2026-06-05',
        plannedEndDate: '2026-06-20',
        actualStartDate: '',
        actualEndDate: '',
        priority: 'normal',
        workshop: '二号车间',
        operator: '李师傅',
        materialRequisitions: [
          {
            id: generateId('mr'),
            materialCode: 'MTL-007',
            materialName: '碳钢Q235',
            requiredQty: 2500,
            issuedQty: 0,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-008',
            materialName: '铜合金H59',
            requiredQty: 300,
            issuedQty: 0,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-004',
            materialName: 'POM塑料',
            requiredQty: 150,
            issuedQty: 0,
            unit: 'kg'
          }
        ],
        progress: 0,
        notes: '',
        createDate: '2026-06-01'
      },
      {
        id: generateId('mo'),
        orderNo: 'MO20260603001',
        bomId: 'bom4',
        bomName: '自动化输送线BOM',
        productName: '自动化输送线CV-1000',
        quantity: 10,
        unit: '条',
        unitPrice: 45000,
        status: 'planned',
        plannedStartDate: '2026-06-10',
        plannedEndDate: '2026-07-10',
        actualStartDate: '',
        actualEndDate: '',
        priority: 'urgent',
        workshop: '一号车间',
        operator: '王师傅',
        materialRequisitions: [
          {
            id: generateId('mr'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            requiredQty: 500,
            issuedQty: 0,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-007',
            materialName: '碳钢Q235',
            requiredQty: 200,
            issuedQty: 0,
            unit: 'kg'
          }
        ],
        progress: 0,
        notes: '客户加急订单',
        createDate: '2026-06-03'
      },
      {
        id: generateId('mo'),
        orderNo: 'MO20260515001',
        bomId: 'bom1',
        bomName: '精密减速器总成BOM',
        productName: '精密减速器RV-40E',
        quantity: 30,
        unit: '台',
        unitPrice: 8500,
        status: 'completed',
        plannedStartDate: '2026-05-15',
        plannedEndDate: '2026-05-30',
        actualStartDate: '2026-05-16',
        actualEndDate: '2026-05-28',
        priority: 'normal',
        workshop: '一号车间',
        operator: '张师傅',
        materialRequisitions: [
          {
            id: generateId('mr'),
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            requiredQty: 450,
            issuedQty: 450,
            unit: 'kg'
          },
          {
            id: generateId('mr'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            requiredQty: 240,
            issuedQty: 240,
            unit: 'kg'
          }
        ],
        progress: 100,
        notes: '按时完成',
        createDate: '2026-05-10'
      }
    ]
    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /* 新增生产工单 */
  function addProductionOrder(data) {
    const order = {
      id: generateId('mo'),
      orderNo: data.orderNo || generateOrderNo(),
      bomId: '',
      bomName: '',
      productName: '',
      quantity: 0,
      unit: '台',
      unitPrice: 0,
      status: 'planned',
      plannedStartDate: '',
      plannedEndDate: '',
      actualStartDate: '',
      actualEndDate: '',
      priority: 'normal',
      workshop: '',
      operator: '',
      materialRequisitions: [],
      progress: 0,
      notes: '',
      createDate: toLocalDateStr(),
      ...data
    }

    /* 自动从BOM生成物料需求清单 */
    if (order.bomId) {
      try {
        const bomStore = useBomStore()
        const bom = bomStore.getBomById(order.bomId)
        if (bom) {
          order.bomName = bom.name
          order.productName = bom.productName
          order.materialRequisitions = bom.components.map((comp) => ({
            id: generateId('mr'),
            materialCode: comp.materialCode,
            materialName: comp.materialName,
            requiredQty:
              (parseFloat(comp.quantity) || 0) *
              (parseFloat(order.quantity) || 0) *
              (1 + (parseFloat(comp.scrapRate) || 0) / 100),
            issuedQty: 0,
            unit: comp.unit
          }))
        }
      } catch (e) {
        /* bom store未初始化时跳过 */
      }
    }

    productionOrders.value.push(order)
    persist()
    return order
  }

  /* 更新生产工单 */
  function updateProductionOrder(id, data) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx !== -1) {
      productionOrders.value[idx] = { ...productionOrders.value[idx], ...data }
      persist()
      return true
    }
    return false
  }

  /* 下达工单 (planned -> released)，检查物料是否充足 */
  function releaseOrder(id) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }
    if (productionOrders.value[idx].status !== 'planned') return { success: false, error: '仅已计划工单可下达' }

    /* 检查物料是否充足 */
    const shortages = []
    try {
      const inventoryStore = useInventoryStore()
      const order = productionOrders.value[idx]
      for (const req of order.materialRequisitions) {
        const invItem = inventoryStore.inventory.find((i) => i.code === req.materialCode)
        const stockQty = invItem ? parseFloat(invItem.quantity) || 0 : 0
        const requiredQty = parseFloat(req.requiredQty) || 0
        if (stockQty < requiredQty) {
          shortages.push({
            materialCode: req.materialCode,
            materialName: req.materialName,
            required: requiredQty,
            available: stockQty,
            shortage: requiredQty - stockQty
          })
        }
      }
    } catch (e) {
      /* inventory store未初始化时跳过检查 */
    }

    productionOrders.value[idx].status = 'released'
    persist()
    return { success: true, shortages }
  }

  /* 开始生产 (released -> in_progress) */
  function startProduction(id) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }
    if (productionOrders.value[idx].status !== 'released') return { success: false, error: '仅已下达工单可开始生产' }

    productionOrders.value[idx].status = 'in_progress'
    productionOrders.value[idx].actualStartDate = toLocalDateStr()
    productionOrders.value[idx].progress = 10
    persist()
    return { success: true }
  }

  /* 质检 (in_progress -> quality_check) */
  function qualityCheck(id) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }
    if (productionOrders.value[idx].status !== 'in_progress') return { success: false, error: '仅生产中工单可质检' }

    productionOrders.value[idx].status = 'quality_check'
    productionOrders.value[idx].progress = 90
    persist()
    return { success: true }
  }

  /* 完成生产 (quality_check -> completed)，成品入库 */
  function completeProduction(id) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }
    if (productionOrders.value[idx].status !== 'quality_check') return { success: false, error: '仅质检中工单可完成' }

    productionOrders.value[idx].status = 'completed'
    productionOrders.value[idx].actualEndDate = toLocalDateStr()
    productionOrders.value[idx].progress = 100

    /* 成品入库 */
    try {
      const inventoryStore = useInventoryStore()
      const order = productionOrders.value[idx]
      const existingProduct = inventoryStore.inventory.find(
        (i) => i.code === order.productName || i.name === order.productName
      )
      if (existingProduct) {
        inventoryStore.updateInventoryItem(existingProduct.id, {
          quantity: (parseFloat(existingProduct.quantity) || 0) + (parseFloat(order.quantity) || 0)
        })
      } else {
        inventoryStore.addInventoryItem({
          code: 'PRD-' + Date.now(),
          name: order.productName,
          category: 'finished',
          quantity: parseFloat(order.quantity) || 0,
          safetyStock: 10,
          maxStock: 0,
          warehouse: 'main',
          location: 'B-01-01',
          unitCost: parseFloat(order.unitPrice) || 0
        })
      }
    } catch (e) {
      /* inventory store未初始化时跳过入库 */
    }

    persist()
    return { success: true }
  }

  /* 取消工单 */
  function cancelProduction(id) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }
    const status = productionOrders.value[idx].status
    if (status === 'completed' || status === 'cancelled') {
      return { success: false, error: '已完成或已取消工单不可操作' }
    }
    productionOrders.value[idx].status = 'cancelled'
    persist()
    return { success: true }
  }

  /* 更新进度 */
  function updateProgress(id, percent) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx !== -1) {
      productionOrders.value[idx].progress = Math.min(100, Math.max(0, percent))
      persist()
      return true
    }
    return false
  }

  /* 领料（扣减库存） */
  function issueMaterials(id, materials) {
    const idx = productionOrders.value.findIndex((o) => o.id === id)
    if (idx === -1) return { success: false, error: '未找到工单' }

    const order = productionOrders.value[idx]
    const results = []

    try {
      const inventoryStore = useInventoryStore()

      for (const mat of materials) {
        const invItem = inventoryStore.inventory.find((i) => i.code === mat.materialCode)
        if (!invItem) {
          results.push({ materialCode: mat.materialCode, success: false, error: '库存中未找到该物料' })
          continue
        }
        const stockQty = parseFloat(invItem.quantity) || 0
        const issueQty = parseFloat(mat.issueQty) || 0
        if (issueQty > stockQty) {
          results.push({ materialCode: mat.materialCode, success: false, error: `库存不足，当前库存${stockQty}` })
          continue
        }

        /* 扣减库存 */
        inventoryStore.adjustStock(mat.materialCode, -issueQty)

        /* 更新领料记录 */
        const reqIdx = order.materialRequisitions.findIndex((r) => r.materialCode === mat.materialCode)
        if (reqIdx !== -1) {
          order.materialRequisitions[reqIdx].issuedQty =
            (parseFloat(order.materialRequisitions[reqIdx].issuedQty) || 0) + issueQty
        }

        results.push({ materialCode: mat.materialCode, success: true, issued: issueQty })
      }
    } catch (e) {
      return { success: false, error: '库存模块未初始化', results }
    }

    persist()
    return { success: true, results }
  }

  /* 根据ID获取工单 */
  function getOrderById(id) {
    return productionOrders.value.find((o) => o.id === id) || null
  }

  return {
    productionOrders,
    activeOrders,
    inProgressOrders,
    monthlyCompletedOrders,
    monthlyOutputValue,
    orderStats,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
    PRIORITY_LABELS,
    PRIORITY_COLORS,
    generateOrderNo,
    initSeedData,
    addProductionOrder,
    updateProductionOrder,
    releaseOrder,
    startProduction,
    qualityCheck,
    completeProduction,
    cancelProduction,
    updateProgress,
    issueMaterials,
    getOrderById,
    persist
  }
})
