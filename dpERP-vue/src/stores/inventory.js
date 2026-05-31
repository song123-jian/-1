import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_PREFIX = 'gj_erp_'
const INVENTORY_KEY = STORAGE_PREFIX + 'inventory'
const WAREHOUSE_ORDER_KEY = STORAGE_PREFIX + 'warehouseOrders'
const SUPPLIER_KEY = STORAGE_PREFIX + 'suppliers'
const ATTACHMENT_KEY = STORAGE_PREFIX + 'inventoryAttachments_'
const INIT_KEY = 'gj_erp_inventory_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[inventoryStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[inventoryStore] save failed:', key, e)
  }
}

function generateOrderNo(existing, prefix) {
  const now = new Date()
  const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const fullPrefix = prefix + dateStr
  let maxSeq = 0
  for (const o of existing) {
    const no = o.orderNo || o.outboundNo || ''
    if (no.startsWith(fullPrefix)) {
      const tail = no.slice(fullPrefix.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return fullPrefix + String(maxSeq + 1).padStart(3, '0')
}

function computeAlertStatus(item) {
  const stock = parseFloat(item.quantity) || 0
  const safetyStock = parseFloat(item.safetyStock) || 0
  const maxStock = parseFloat(item.maxStock) || 0
  if (stock <= 0) return 'exhausted'
  if (safetyStock > 0 && stock <= safetyStock) return 'low'
  if (maxStock > 0 && stock >= maxStock) return 'over'
  return 'ok'
}

const INBOUND_TYPES = [
  { value: 'purchase', label: '采购入库' },
  { value: 'production_return', label: '生产回料' },
  { value: 'customer_return', label: '客户退货' },
  { value: 'transfer', label: '调拨入库' },
  { value: 'surplus', label: '盘盈入库' },
  { value: 'gift', label: '赠品入库' },
  { value: 'return', label: '退货入库' }
]

const OUTBOUND_TYPES = [
  { value: 'production', label: '生产领用' },
  { value: 'sales', label: '销售出库' },
  { value: 'transfer', label: '调拨出库' },
  { value: 'scrap', label: '报废出库' },
  { value: 'sample', label: '样品出库' },
  { value: 'return', label: '退货出库' }
]

const INBOUND_STATUS_LABELS = {
  draft: '草稿', pending: '待审核', inspecting: '质检中',
  confirmed: '已入库', cancelled: '已取消'
}

const OUTBOUND_STATUS_LABELS = {
  draft: '草稿', pending_review: '待审核', pending: '待审核',
  approved: '已审核', confirmed: '已出库', cancelled: '已取消',
  reversed: '已冲销'
}

const ALERT_STATUS_MAP = {
  exhausted: '耗尽', low: '低库存', ok: '正常', over: '超量'
}

const ALERT_STATUS_COLORS = {
  exhausted: 'var(--color-danger)',
  low: 'var(--color-warning)',
  ok: 'var(--color-success)',
  over: 'var(--color-info)'
}

export const useInventoryStore = defineStore('inventory', () => {
  const inventory = ref(load(INVENTORY_KEY, []))
  const warehouseOrders = ref(load(WAREHOUSE_ORDER_KEY, []))
  const suppliers = ref(load(SUPPLIER_KEY, []))

  const enrichedInventory = computed(() => {
    return inventory.value.map(item => {
      const alertStatus = computeAlertStatus(item)
      let lastInboundDate = ''
      for (const o of warehouseOrders.value) {
        if (o.status === 'confirmed' && (o.materialCode === item.code || o.materialCode === item.name)) {
          if (o.date && (!lastInboundDate || o.date > lastInboundDate)) lastInboundDate = o.date
        }
      }
      return {
        ...item,
        stock: parseFloat(item.quantity) || 0,
        safetyStockVal: parseFloat(item.safetyStock) || 0,
        maxStockVal: parseFloat(item.maxStock) || 0,
        totalValue: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0),
        alertStatus,
        lastInboundDate: lastInboundDate || '无入库记录'
      }
    })
  })

  const lowStockCount = computed(() =>
    enrichedInventory.value.filter(i => i.alertStatus === 'low').length
  )
  const exhaustedCount = computed(() =>
    enrichedInventory.value.filter(i => i.alertStatus === 'exhausted').length
  )
  const overStockCount = computed(() =>
    enrichedInventory.value.filter(i => i.alertStatus === 'over').length
  )
  const normalStockCount = computed(() =>
    enrichedInventory.value.filter(i => i.alertStatus === 'ok').length
  )
  const totalStockWeight = computed(() =>
    enrichedInventory.value.reduce((s, i) => s + i.stock, 0)
  )
  const totalStockValue = computed(() =>
    enrichedInventory.value.reduce((s, i) => s + i.totalValue, 0)
  )
  const alertItems = computed(() =>
    enrichedInventory.value.filter(i => i.alertStatus === 'exhausted' || i.alertStatus === 'low')
  )

  const inboundOrders = computed(() =>
    warehouseOrders.value.filter(o => {
      const inboundTypes = ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift']
      return inboundTypes.includes(o.type)
    })
  )

  const outboundOrders = computed(() =>
    warehouseOrders.value.filter(o => {
      const inboundTypes = ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift']
      return !inboundTypes.includes(o.type) || o.outType || o.outboundNo
    })
  )

  const pendingInboundCount = computed(() =>
    inboundOrders.value.filter(o => o.status === 'pending' || o.status === 'inspecting').length
  )
  const pendingOutboundCount = computed(() =>
    outboundOrders.value.filter(o => {
      const s = o.outStatus || o.status
      return s === 'pending_review' || s === 'pending'
    }).length
  )

  const categoryCounts = computed(() => {
    const counts = {}
    for (const item of inventory.value) {
      const cat = item.category || '未分类'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  })

  const warehouseCounts = computed(() => {
    const counts = {}
    for (const item of inventory.value) {
      const wh = item.warehouse || '未分配'
      counts[wh] = (counts[wh] || 0) + 1
    }
    return counts
  })

  function persist() {
    save(INVENTORY_KEY, inventory.value)
  }

  function persistOrders() {
    save(WAREHOUSE_ORDER_KEY, warehouseOrders.value)
  }

  function persistSuppliers() {
    save(SUPPLIER_KEY, suppliers.value)
  }

  function lookupByBarcode(barcode) {
    if (!barcode) return null
    return inventory.value.find(i => i.code === barcode || i.name === barcode) || null
  }

  function lookupSupplier(idOrCode) {
    if (!idOrCode) return null
    return suppliers.value.find(s => s.id === idOrCode || s.supplierCode === idOrCode || s.shortName === idOrCode) || null
  }

  function addInventoryItem(data) {
    const item = {
      id: 'i' + Date.now(),
      code: '',
      name: '',
      category: 'raw',
      quantity: 0,
      safetyStock: 50,
      maxStock: 0,
      warehouse: 'main',
      location: '',
      unitCost: 0,
      totalValue: 0,
      status: 'normal',
      grade: '',
      color: '',
      brand: '',
      lastInboundDate: '',
      createdAt: new Date().toISOString(),
      ...data
    }
    item.totalValue = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
    item.status = computeAlertStatus(item) === 'ok' ? 'normal' : computeAlertStatus(item)
    inventory.value.push(item)
    persist()
    return item
  }

  function updateInventoryItem(id, updates) {
    const idx = inventory.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      inventory.value[idx] = { ...inventory.value[idx], ...updates }
      inventory.value[idx].totalValue = (parseFloat(inventory.value[idx].quantity) || 0) * (parseFloat(inventory.value[idx].unitCost) || 0)
      inventory.value[idx].status = computeAlertStatus(inventory.value[idx]) === 'ok' ? 'normal' : computeAlertStatus(inventory.value[idx])
      persist()
    }
  }

  function deleteInventoryItem(id) {
    inventory.value = inventory.value.filter(i => i.id !== id)
    persist()
  }

  function batchDeleteInventory(ids) {
    inventory.value = inventory.value.filter(i => !ids.includes(i.id))
    persist()
  }

  function adjustStock(itemCode, delta) {
    const idx = inventory.value.findIndex(i => i.code === itemCode)
    if (idx !== -1) {
      inventory.value[idx].quantity = Math.max(0, (parseFloat(inventory.value[idx].quantity) || 0) + delta)
      inventory.value[idx].totalValue = inventory.value[idx].quantity * (parseFloat(inventory.value[idx].unitCost) || 0)
      inventory.value[idx].status = computeAlertStatus(inventory.value[idx]) === 'ok' ? 'normal' : computeAlertStatus(inventory.value[idx])
      persist()
      return true
    }
    return false
  }

  function submitInboundOrder(data) {
    const items = data._items || []
    const errors = []
    if (!data.date) errors.push('请选择入库日期')
    if (!data.type) errors.push('请选择入库类型')
    if (!data.counterpartyId && data.type === 'purchase') errors.push('采购入库请选择供应商')
    if (!data.counterpartyId && data.type === 'transfer') errors.push('调拨入库请选择来源')
    let validCount = 0
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.code && !it.name && !it.barcode) continue
      if (it.qty <= 0) { errors.push(`第${i + 1}行：数量必须大于0`); continue }
      if (it.qty > 999999) errors.push(`第${i + 1}行：数量超出上限`)
      if (it.cost < 0) errors.push(`第${i + 1}行：单价不能为负数`)
      validCount++
    }
    if (validCount === 0) errors.push('请至少添加一条有效的入库明细')
    if (errors.length > 0) return { success: false, errors }

    const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0)
    const order = {
      id: data.id || ('w' + Date.now()),
      orderNo: data.orderNo || generateOrderNo(warehouseOrders.value, 'RK'),
      type: data.type,
      date: data.date,
      counterpartyId: data.counterpartyId || '',
      counterpartyName: data.counterpartyName || '',
      supplierCode: data.supplierCode || '',
      totalQuantity: totalQty,
      status: 'pending',
      notes: data.notes || '',
      items: JSON.stringify(items),
      referenceId: data.referenceId || '',
      warehouseId: data.warehouseId || 'main',
      qualityStatus: items.length > 0
        ? (items.every(it => it.qualityStatus === 'passed') ? 'passed'
          : items.some(it => it.qualityStatus === 'failed') ? 'failed' : 'pending')
        : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const existingIdx = warehouseOrders.value.findIndex(o => o.id === order.id)
    if (existingIdx !== -1) {
      order.updatedAt = new Date().toISOString()
      warehouseOrders.value[existingIdx] = order
    } else {
      warehouseOrders.value.push(order)
    }
    persistOrders()
    return { success: true, order }
  }

  function saveInboundDraft(data) {
    data.status = 'draft'
    const result = submitInboundOrder(data)
    return result
  }

  function confirmInbound(orderId) {
    const idx = warehouseOrders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return { success: false, error: '未找到入库单' }

    const order = warehouseOrders.value[idx]
    let items = []
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
    } catch (e) { /* ignore */ }

    const newItems = []
    for (const item of items) {
      if (!item.code) continue
      const invIdx = inventory.value.findIndex(i => i.code === item.code)
      if (invIdx !== -1) {
        inventory.value[invIdx].quantity = (parseFloat(inventory.value[invIdx].quantity) || 0) + (item.qty || 0)
        inventory.value[invIdx].totalValue = inventory.value[invIdx].quantity * (parseFloat(inventory.value[invIdx].unitCost) || 0)
        inventory.value[invIdx].lastInboundDate = order.date || new Date().toISOString().split('T')[0]
        inventory.value[invIdx].status = computeAlertStatus(inventory.value[invIdx]) === 'ok' ? 'normal' : computeAlertStatus(inventory.value[invIdx])
      } else {
        newItems.push(item)
      }
    }

    if (newItems.length > 0) {
      for (const ni of newItems) {
        inventory.value.push({
          id: 'i' + Date.now() + Math.random().toString(36).substr(2, 5),
          code: ni.code,
          name: ni.name || ni.code,
          category: 'raw',
          quantity: ni.qty || 0,
          safetyStock: 50,
          maxStock: 0,
          warehouse: 'main',
          location: '',
          unitCost: ni.cost || 0,
          totalValue: (ni.qty || 0) * (ni.cost || 0),
          status: 'normal',
          grade: ni.grade || '',
          color: ni.color || '',
          brand: '',
          lastInboundDate: order.date || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        })
      }
    }

    warehouseOrders.value[idx].status = 'confirmed'
    warehouseOrders.value[idx].updatedAt = new Date().toISOString()
    persist()
    persistOrders()
    return { success: true, newItemsCount: newItems.length }
  }

  function changeInboundStatus(orderId, newStatus) {
    const idx = warehouseOrders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return false
    if (newStatus === 'confirmed') {
      const result = confirmInbound(orderId)
      return result.success
    }
    warehouseOrders.value[idx].status = newStatus
    warehouseOrders.value[idx].updatedAt = new Date().toISOString()
    persistOrders()
    return true
  }

  function deleteInboundOrder(id) {
    warehouseOrders.value = warehouseOrders.value.filter(o => o.id !== id)
    persistOrders()
  }

  function submitOutboundOrder(data) {
    const errors = []
    if (!data.date) errors.push('请选择出库日期')
    if (!data.outType) errors.push('请选择出库类型')
    if (!data.materialCode && !data.materialName) errors.push('请选择出库物料')
    if ((data.outQty || 0) <= 0) errors.push('出库数量必须大于0')

    const invItem = inventory.value.find(i => i.code === data.materialCode)
    if (invItem && data.outQty > (parseFloat(invItem.quantity) || 0)) {
      errors.push(`库存不足：当前库存 ${invItem.quantity}kg，出库数量 ${data.outQty}kg`)
    }

    if (errors.length > 0) return { success: false, errors }

    const order = {
      id: data.id || ('wo' + Date.now()),
      orderNo: data.orderNo || '',
      outboundNo: data.outboundNo || generateOrderNo(warehouseOrders.value, 'CK'),
      type: data.outType || data.type || 'sales',
      outType: data.outType || 'sales',
      date: data.date,
      counterpartyId: data.counterpartyId || '',
      counterpartyName: data.counterpartyName || '',
      materialCode: data.materialCode || '',
      materialName: data.materialName || '',
      grade: data.grade || '',
      color: data.color || '',
      outQty: data.outQty || 0,
      unitPrice: data.unitPrice || 0,
      outAmount: data.outAmount || (data.outQty || 0) * (data.unitPrice || 0),
      referenceId: data.referenceId || '',
      status: 'pending_review',
      outStatus: 'pending_review',
      notes: data.notes || '',
      warehouseId: data.warehouseId || 'main',
      items: data.items ? JSON.stringify(data.items) : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    warehouseOrders.value.push(order)
    persistOrders()
    return { success: true, order }
  }

  function approveOutbound(orderId) {
    const idx = warehouseOrders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return { success: false, error: '未找到出库单' }
    const order = warehouseOrders.value[idx]
    const oStatus = order.outStatus || order.status
    if (oStatus !== 'pending_review' && oStatus !== 'pending') {
      return { success: false, error: '仅待审核单据可审批' }
    }
    const invItem = inventory.value.find(i => i.code === order.materialCode)
    if (invItem && order.outQty > (parseFloat(invItem.quantity) || 0)) {
      return { success: false, error: `库存不足：当前库存 ${invItem.quantity}kg，出库数量 ${order.outQty}kg` }
    }
    warehouseOrders.value[idx].outStatus = 'approved'
    warehouseOrders.value[idx].status = 'approved'
    warehouseOrders.value[idx].approvedBy = '当前用户'
    warehouseOrders.value[idx].approvedAt = new Date().toISOString()
    warehouseOrders.value[idx].updatedAt = new Date().toISOString()
    persistOrders()
    return { success: true }
  }

  function confirmOutbound(orderId) {
    const idx = warehouseOrders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return { success: false, error: '未找到出库单' }
    const order = warehouseOrders.value[idx]
    const oStatus = order.outStatus || order.status
    if (oStatus !== 'approved') {
      return { success: false, error: '仅已审核单据可确认出库' }
    }
    const invIdx = inventory.value.findIndex(i => i.code === order.materialCode)
    if (invIdx !== -1) {
      const invItem = inventory.value[invIdx]
      if (order.outQty > (parseFloat(invItem.quantity) || 0)) {
        return { success: false, error: `库存不足：当前库存 ${invItem.quantity}kg，出库数量 ${order.outQty}kg` }
      }
      inventory.value[invIdx].quantity = Math.max(0, (parseFloat(invItem.quantity) || 0) - order.outQty)
      inventory.value[invIdx].totalValue = inventory.value[invIdx].quantity * (parseFloat(inventory.value[invIdx].unitCost) || 0)
      inventory.value[invIdx].status = computeAlertStatus(inventory.value[invIdx]) === 'ok' ? 'normal' : computeAlertStatus(inventory.value[invIdx])
      persist()
    }
    warehouseOrders.value[idx].outStatus = 'confirmed'
    warehouseOrders.value[idx].status = 'confirmed'
    warehouseOrders.value[idx].confirmedBy = '当前用户'
    warehouseOrders.value[idx].confirmedAt = new Date().toISOString()
    warehouseOrders.value[idx].updatedAt = new Date().toISOString()
    persistOrders()
    return { success: true }
  }

  function cancelOutbound(orderId) {
    const idx = warehouseOrders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return false
    const oStatus = warehouseOrders.value[idx].outStatus || warehouseOrders.value[idx].status
    if (oStatus === 'confirmed') return false
    warehouseOrders.value[idx].outStatus = 'cancelled'
    warehouseOrders.value[idx].status = 'cancelled'
    warehouseOrders.value[idx].updatedAt = new Date().toISOString()
    persistOrders()
    return true
  }

  function deleteOutboundOrder(id) {
    warehouseOrders.value = warehouseOrders.value.filter(o => o.id !== id)
    persistOrders()
  }

  function getAttachments(orderId) {
    return load(ATTACHMENT_KEY + orderId, [])
  }

  function addAttachment(orderId, file) {
    const attachments = getAttachments(orderId)
    attachments.push({
      id: 'att' + Date.now(),
      name: file.name,
      size: file.size,
      type: file.type,
      data: file.data || '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: '当前用户'
    })
    save(ATTACHMENT_KEY + orderId, attachments)
  }

  function deleteAttachment(orderId, attId) {
    const attachments = getAttachments(orderId).filter(a => a.id !== attId)
    save(ATTACHMENT_KEY + orderId, attachments)
  }

  function addSupplier(data) {
    const sup = {
      id: 's' + Date.now(),
      name: '',
      shortName: '',
      contact: '',
      phone: '',
      email: '',
      rating: 'B',
      totalPurchases: 0,
      status: 'active',
      tags: [],
      supplierCode: '',
      ...data
    }
    suppliers.value.push(sup)
    persistSuppliers()
    return sup
  }

  function updateSupplier(id, updates) {
    const idx = suppliers.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      suppliers.value[idx] = { ...suppliers.value[idx], ...updates }
      persistSuppliers()
    }
  }

  function deleteSupplier(id) {
    suppliers.value = suppliers.value.filter(s => s.id !== id)
    persistSuppliers()
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    inventory.value = [
      { id: 'i1', code: 'MTL-001', name: 'ABS树脂', category: 'raw', quantity: 500, safetyStock: 100, maxStock: 0, warehouse: 'main', location: 'A-01-03', unitCost: 85.5, totalValue: 42750, status: 'normal', grade: '通用级', color: '', brand: '', lastInboundDate: '' },
      { id: 'i2', code: 'MTL-002', name: '不锈钢板304', category: 'raw', quantity: 1200, safetyStock: 200, maxStock: 0, warehouse: 'main', location: 'B-02-01', unitCost: 120, totalValue: 144000, status: 'normal', grade: '2B/BA', color: '', brand: '', lastInboundDate: '' },
      { id: 'i3', code: 'MTL-003', name: '铝合金型材6063', category: 'raw', quantity: 800, safetyStock: 150, maxStock: 0, warehouse: 'main', location: 'C-01-02', unitCost: 95, totalValue: 76000, status: 'normal', grade: 'T5', color: '', brand: '', lastInboundDate: '' },
      { id: 'i4', code: 'MTL-004', name: 'POM塑料', category: 'raw', quantity: 350, safetyStock: 80, maxStock: 0, warehouse: 'main', location: 'A-03-01', unitCost: 65, totalValue: 22750, status: 'normal', grade: 'M90-44', color: '', brand: '', lastInboundDate: '' },
      { id: 'i5', code: 'MTL-005', name: '尼龙66', category: 'raw', quantity: 200, safetyStock: 60, maxStock: 0, warehouse: 'main', location: 'A-04-02', unitCost: 130, totalValue: 26000, status: 'normal', grade: '', color: '自然色', brand: '', lastInboundDate: '' },
      { id: 'i6', code: 'MTL-006', name: '轴承钢GCr15', category: 'raw', quantity: 45, safetyStock: 50, maxStock: 0, warehouse: 'main', location: 'D-01-01', unitCost: 280, totalValue: 12600, status: 'low', grade: 'Φ50', color: '', brand: '', lastInboundDate: '' },
      { id: 'i7', code: 'MTL-007', name: '碳钢Q235', category: 'raw', quantity: 600, safetyStock: 100, maxStock: 0, warehouse: 'main', location: 'D-02-01', unitCost: 45, totalValue: 27000, status: 'normal', grade: '热轧板卷', color: '', brand: '', lastInboundDate: '' },
      { id: 'i8', code: 'MTL-008', name: '铜合金H59', category: 'raw', quantity: 12, safetyStock: 50, maxStock: 0, warehouse: 'main', location: 'E-01-01', unitCost: 520, totalValue: 6240, status: 'low', grade: '', color: '', brand: '', lastInboundDate: '' }
    ]
    persist()

    suppliers.value = [
      { id: 's1', name: '江苏钢铁集团有限公司', shortName: '江苏钢铁', contact: '周经理', phone: '0512-5333XXXX', email: 'zhou@js-steel.com', rating: 'A', totalPurchases: 850000, status: 'active', tags: ['核心供应商'], supplierCode: 'SUP-001' },
      { id: 's2', name: '浙江化工原料有限公司', shortName: '浙江化工', contact: '吴经理', phone: '0571-8666XXXX', email: 'wu@zj-chem.com', rating: 'B', totalPurchases: 320000, status: 'active', tags: [], supplierCode: 'SUP-002' },
      { id: 's3', name: '广东有色金属有限公司', shortName: '广东有色', contact: '郑经理', phone: '020-3888XXXX', email: 'zheng@gd-nf.com', rating: 'A', totalPurchases: 620000, status: 'active', tags: ['核心供应商', '价格优势'], supplierCode: 'SUP-003' },
      { id: 's4', name: '山东机械制造有限公司', shortName: '山东机械', contact: '孙经理', phone: '0531-8555XXXX', email: 'sun@sd-mach.com', rating: 'C', totalPurchases: 95000, status: 'active', tags: ['新供应商'], supplierCode: 'SUP-004' }
    ]
    persistSuppliers()

    warehouseOrders.value = [
      { id: 'w1', orderNo: 'RK20260519001', type: 'purchase', referenceId: 'PO-2024-0078', counterpartyId: 's1', counterpartyName: '江苏钢铁集团', supplierCode: 'SUP-001', warehouseId: 'main', date: '2026-05-19', totalQuantity: 320, status: 'confirmed', items: '[]', qualityStatus: 'passed', createdAt: '2026-05-19T08:00:00Z', updatedAt: '2026-05-19T10:00:00Z' },
      { id: 'w2', orderNo: 'CK20241212001', type: 'sales', outType: 'sales', outboundNo: 'CK20241212001', referenceId: 'QT20241201001', counterpartyId: 'c2', counterpartyName: '北京科技发展集团', materialCode: 'MTL-002', materialName: '不锈钢板304', outQty: 450, unitPrice: 120, outAmount: 54000, warehouseId: 'main', date: '2024-12-12', totalQuantity: 450, status: 'confirmed', outStatus: 'confirmed', items: '[]', createdAt: '2024-12-12T08:00:00Z', updatedAt: '2024-12-12T10:00:00Z' },
      { id: 'w3', orderNo: 'RK20260518001', type: 'customer_return', counterpartyId: 'c4', counterpartyName: '深圳智能制造有限公司', warehouseId: 'main', date: '2026-05-18', totalQuantity: 80, status: 'inspecting', items: '[]', qualityStatus: 'pending', createdAt: '2026-05-18T08:00:00Z', updatedAt: '2026-05-18T10:00:00Z' },
      { id: 'w4', orderNo: 'RK20260519002', type: 'purchase', referenceId: 'PO-2026-0032', counterpartyId: 's3', counterpartyName: '广东有色金属有限公司', supplierCode: 'SUP-003', warehouseId: 'main', date: '2026-05-19', totalQuantity: 500, status: 'draft', items: '[]', qualityStatus: 'pending', createdAt: '2026-05-19T08:00:00Z', updatedAt: '2026-05-19T08:00:00Z' }
    ]
    persistOrders()
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    inventory, warehouseOrders, suppliers,
    enrichedInventory, lowStockCount, exhaustedCount, overStockCount, normalStockCount,
    totalStockWeight, totalStockValue, alertItems,
    inboundOrders, outboundOrders,
    pendingInboundCount, pendingOutboundCount,
    categoryCounts, warehouseCounts,
    INBOUND_TYPES, OUTBOUND_TYPES, INBOUND_STATUS_LABELS, OUTBOUND_STATUS_LABELS,
    ALERT_STATUS_MAP, ALERT_STATUS_COLORS,
    lookupByBarcode, lookupSupplier,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, batchDeleteInventory, adjustStock,
    submitInboundOrder, saveInboundDraft, confirmInbound, changeInboundStatus, deleteInboundOrder,
    submitOutboundOrder, approveOutbound, confirmOutbound, cancelOutbound, deleteOutboundOrder,
    getAttachments, addAttachment, deleteAttachment,
    addSupplier, updateSupplier, deleteSupplier,
    initSeedData
  }
})
