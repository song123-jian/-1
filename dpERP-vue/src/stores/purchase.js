import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { useSessionStore } from '@/stores/session'
import { useInventoryStore } from '@/stores/inventory'

const STORAGE_KEY = 'gj_erp_purchaseOrders'
const INIT_KEY = 'gj_erp_purchase_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[purchaseStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[purchaseStore] save failed:', key, e)
  }
}

function generateOrderNo(existing) {
  const now = new Date()
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const prefix = 'PO' + dateStr
  let maxSeq = 0
  for (const o of existing) {
    const no = o.orderNo || ''
    if (no.startsWith(prefix)) {
      const tail = no.slice(prefix.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

export const STATUS_LABELS = {
  draft: '草稿',
  pending: '待审批',
  approved: '已审批',
  ordered: '已下单',
  receiving: '收货中',
  inspecting: '质检中',
  completed: '已完成',
  cancelled: '已取消',
  returned: '已退货'
}

export const STATUS_COLORS = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'info',
  ordered: 'info',
  receiving: 'info',
  inspecting: 'warning',
  completed: 'success',
  cancelled: 'danger',
  returned: 'danger'
}

export const usePurchaseStore = defineStore('purchase', () => {
  const purchaseOrders = ref(load(STORAGE_KEY, []))

  const pendingCount = computed(() =>
    purchaseOrders.value.filter(o => o.status === 'pending').length
  )
  const inProgressCount = computed(() =>
    purchaseOrders.value.filter(o => ['approved', 'ordered', 'receiving', 'inspecting'].includes(o.status)).length
  )
  const thisMonthAmount = computed(() => {
    const now = new Date()
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return purchaseOrders.value
      .filter(o => o.createDate && o.createDate.startsWith(ym) && o.type === 'purchase')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
  })
  const totalCount = computed(() => purchaseOrders.value.length)

  /* 采购退货单 */
  const returnOrders = computed(() =>
    purchaseOrders.value.filter(o => o.type === 'return')
  )

  function persist() {
    save(STORAGE_KEY, purchaseOrders.value)
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    const supStore = load('gj_erp_suppliers', [])
    const s1 = supStore[0] || { id: 's1', name: '江苏钢铁集团有限公司', shortName: '江苏钢铁' }
    const s2 = supStore[1] || { id: 's2', name: '浙江化工原料有限公司', shortName: '浙江化工' }
    const s3 = supStore[2] || { id: 's3', name: '广东有色金属有限公司', shortName: '广东有色' }

    purchaseOrders.value = [
      {
        id: generateId('po'),
        orderNo: 'PO20260601001',
        title: '不锈钢板304采购',
        supplierId: s1.id,
        supplierName: s1.shortName || s1.name,
        type: 'purchase',
        status: 'completed',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-002', materialName: '不锈钢板304', spec: '2B/BA 2mm', unit: 'kg', quantity: 500, unitPrice: 120, amount: 60000, warehouseId: 'main', warehouseName: '主仓库' },
          { id: generateId('pi'), materialCode: 'MTL-007', materialName: '碳钢Q235', spec: '热轧板卷 3mm', unit: 'kg', quantity: 300, unitPrice: 45, amount: 13500, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 73500,
        expectedDate: '2026-06-10',
        actualDate: '2026-06-08',
        requester: '张经理',
        approver: '李总',
        approveDate: '2026-06-02',
        notes: '常规采购',
        createDate: '2026-06-01',
        attachments: []
      },
      {
        id: generateId('po'),
        orderNo: 'PO20260602001',
        title: '化工原料采购',
        supplierId: s2.id,
        supplierName: s2.shortName || s2.name,
        type: 'purchase',
        status: 'inspecting',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-001', materialName: 'ABS树脂', spec: '通用级', unit: 'kg', quantity: 200, unitPrice: 85.5, amount: 17100, warehouseId: 'main', warehouseName: '主仓库' },
          { id: generateId('pi'), materialCode: 'MTL-004', materialName: 'POM塑料', spec: 'M90-44', unit: 'kg', quantity: 150, unitPrice: 65, amount: 9750, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 26850,
        expectedDate: '2026-06-12',
        actualDate: '',
        requester: '王主管',
        approver: '李总',
        approveDate: '2026-06-03',
        notes: '质检中，需确认POM批次',
        createDate: '2026-06-02',
        attachments: []
      },
      {
        id: generateId('po'),
        orderNo: 'PO20260603001',
        title: '铝合金型材采购',
        supplierId: s3.id,
        supplierName: s3.shortName || s3.name,
        type: 'purchase',
        status: 'ordered',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-003', materialName: '铝合金型材6063', spec: 'T5 40x40', unit: 'kg', quantity: 400, unitPrice: 95, amount: 38000, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 38000,
        expectedDate: '2026-06-15',
        actualDate: '',
        requester: '张经理',
        approver: '李总',
        approveDate: '2026-06-04',
        notes: '已下单，等待发货',
        createDate: '2026-06-03',
        attachments: []
      },
      {
        id: generateId('po'),
        orderNo: 'PO20260604001',
        title: '轴承钢采购',
        supplierId: s1.id,
        supplierName: s1.shortName || s1.name,
        type: 'purchase',
        status: 'pending',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-006', materialName: '轴承钢GCr15', spec: 'Phi50', unit: 'kg', quantity: 100, unitPrice: 280, amount: 28000, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 28000,
        expectedDate: '2026-06-20',
        actualDate: '',
        requester: '王主管',
        approver: '',
        approveDate: '',
        notes: '紧急采购，库存告急',
        createDate: '2026-06-04',
        attachments: []
      },
      {
        id: generateId('po'),
        orderNo: 'PO20260605001',
        title: '尼龙66采购',
        supplierId: s2.id,
        supplierName: s2.shortName || s2.name,
        type: 'purchase',
        status: 'draft',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-005', materialName: '尼龙66', spec: '自然色', unit: 'kg', quantity: 80, unitPrice: 130, amount: 10400, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 10400,
        expectedDate: '2026-06-25',
        actualDate: '',
        requester: '',
        approver: '',
        approveDate: '',
        notes: '草稿，待确认数量',
        createDate: '2026-06-05',
        attachments: []
      },
      {
        id: generateId('po'),
        orderNo: 'PO20260606001',
        title: '铜合金退货',
        supplierId: s3.id,
        supplierName: s3.shortName || s3.name,
        type: 'return',
        status: 'completed',
        items: [
          { id: generateId('pi'), materialCode: 'MTL-008', materialName: '铜合金H59', spec: '标准', unit: 'kg', quantity: 10, unitPrice: 520, amount: 5200, warehouseId: 'main', warehouseName: '主仓库' }
        ],
        totalAmount: 5200,
        expectedDate: '',
        actualDate: '2026-06-06',
        requester: '王主管',
        approver: '李总',
        approveDate: '2026-06-05',
        notes: '质量不合格退货',
        createDate: '2026-06-05',
        attachments: []
      }
    ]
    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  function addPurchaseOrder(data) {
    const order = {
      id: generateId('po'),
      orderNo: generateOrderNo(purchaseOrders.value),
      title: '',
      supplierId: '',
      supplierName: '',
      type: 'purchase',
      status: 'draft',
      items: [],
      totalAmount: 0,
      expectedDate: '',
      actualDate: '',
      requester: '',
      approver: '',
      approveDate: '',
      notes: '',
      createDate: new Date().toISOString().split('T')[0],
      attachments: [],
      ...data
    }
    /* 计算总金额 */
    order.totalAmount = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    purchaseOrders.value.push(order)
    persist()
    return order
  }

  function updatePurchaseOrder(id, data) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1) {
      purchaseOrders.value[idx] = { ...purchaseOrders.value[idx], ...data }
      /* 重新计算总金额 */
      if (data.items) {
        purchaseOrders.value[idx].totalAmount = (data.items || []).reduce(
          (sum, item) => sum + (parseFloat(item.amount) || 0), 0
        )
      }
      persist()
    }
  }

  function deletePurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'draft') {
      purchaseOrders.value.splice(idx, 1)
      persist()
      return true
    }
    return false
  }

  function submitPurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'draft') {
      purchaseOrders.value[idx].status = 'pending'
      purchaseOrders.value[idx].requester = getCurrentUser()
      persist()
      return true
    }
    return false
  }

  function approvePurchaseOrder(id, approver) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'pending') {
      purchaseOrders.value[idx].status = 'approved'
      purchaseOrders.value[idx].approver = approver || getCurrentUser()
      purchaseOrders.value[idx].approveDate = new Date().toISOString().split('T')[0]
      persist()
      return true
    }
    return false
  }

  function rejectPurchaseOrder(id, reason) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'pending') {
      purchaseOrders.value[idx].status = 'draft'
      purchaseOrders.value[idx].notes = (purchaseOrders.value[idx].notes || '') + '\n[审批拒绝] ' + (reason || '')
      persist()
      return true
    }
    return false
  }

  function orderPurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'approved') {
      purchaseOrders.value[idx].status = 'ordered'
      persist()
      return true
    }
    return false
  }

  function receivePurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'ordered') {
      purchaseOrders.value[idx].status = 'receiving'
      persist()
      return true
    }
    return false
  }

  function inspectPurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'receiving') {
      purchaseOrders.value[idx].status = 'inspecting'
      persist()
      return true
    }
    return false
  }

  function completePurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && purchaseOrders.value[idx].status === 'inspecting') {
      purchaseOrders.value[idx].status = 'completed'
      purchaseOrders.value[idx].actualDate = new Date().toISOString().split('T')[0]
      persist()
      /* 调用inventoryStore入库 */
      try {
        const inventoryStore = useInventoryStore()
        const order = purchaseOrders.value[idx]
        const items = (order.items || []).map(item => ({
          code: item.materialCode,
          name: item.materialName,
          qty: item.quantity,
          cost: item.unitPrice,
          grade: item.spec || '',
          qualityStatus: 'passed'
        }))
        if (items.length > 0) {
          inventoryStore.submitInboundOrder({
            type: 'purchase',
            date: order.actualDate,
            counterpartyId: order.supplierId,
            counterpartyName: order.supplierName,
            warehouseId: 'main',
            _items: items,
            referenceId: order.orderNo,
            notes: '采购单 ' + order.orderNo + ' 完成入库'
          })
        }
      } catch (e) {
        console.warn('[purchaseStore] completePurchaseOrder: inventory sync skipped', e)
      }
      return true
    }
    return false
  }

  function cancelPurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && ['draft', 'pending', 'approved'].includes(purchaseOrders.value[idx].status)) {
      purchaseOrders.value[idx].status = 'cancelled'
      persist()
      return true
    }
    return false
  }

  function returnPurchaseOrder(id) {
    const idx = purchaseOrders.value.findIndex(o => o.id === id)
    if (idx !== -1 && ['ordered', 'receiving', 'inspecting', 'completed'].includes(purchaseOrders.value[idx].status)) {
      const original = purchaseOrders.value[idx]
      const returnOrder = {
        id: generateId('po'),
        orderNo: generateOrderNo(purchaseOrders.value),
        title: '退货: ' + (original.title || original.orderNo),
        supplierId: original.supplierId,
        supplierName: original.supplierName,
        type: 'return',
        status: 'completed',
        items: (original.items || []).map(item => ({
          ...item,
          id: generateId('pi'),
          amount: -(parseFloat(item.amount) || 0)
        })),
        totalAmount: -(parseFloat(original.totalAmount) || 0),
        expectedDate: '',
        actualDate: new Date().toISOString().split('T')[0],
        requester: getCurrentUser(),
        approver: '',
        approveDate: '',
        notes: '退货自采购单: ' + original.orderNo,
        createDate: new Date().toISOString().split('T')[0],
        attachments: []
      }
      purchaseOrders.value.push(returnOrder)
      persist()
      return returnOrder
    }
    return null
  }

  function getPurchaseOrdersBySupplier(supplierId) {
    return purchaseOrders.value.filter(o => o.supplierId === supplierId)
  }

  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  return {
    purchaseOrders,
    returnOrders,
    pendingCount,
    inProgressCount,
    thisMonthAmount,
    totalCount,
    STATUS_LABELS,
    STATUS_COLORS,
    initSeedData,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    submitPurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    orderPurchaseOrder,
    receivePurchaseOrder,
    inspectPurchaseOrder,
    completePurchaseOrder,
    cancelPurchaseOrder,
    returnPurchaseOrder,
    getPurchaseOrdersBySupplier,
    persist
  }
})
