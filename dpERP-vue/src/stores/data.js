import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_PREFIX = 'gj_erp_'
const INIT_KEY = 'gj_erp_data_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[loadData] 解析失败:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch (e) {
    console.error('[saveData] 保存失败:', key, e)
  }
}

export const useDataStore = defineStore('data', () => {
  const quotations = ref(load('quotations', []))
  const contracts = ref(load('contracts', []))
  const transactions = ref(load('transactions', []))
  const inventory = ref(load('inventory', []))
  const collections = ref(load('collections', []))
  const deliveries = ref(load('deliveries', []))
  const suppliers = ref(load('suppliers', []))
  const warehouseOrders = ref(load('warehouseOrders', []))

  const pendingQuotationCount = computed(() =>
    quotations.value.filter(q => q.status === 'pending' || q.status === 'sent').length
  )
  const pendingContractCount = computed(() =>
    contracts.value.filter(c => c.status === 'pending' || c.status === 'review').length
  )
  const lowStockCount = computed(() =>
    inventory.value.filter(i => i.quantity <= (i.safetyStock || i.minStock || 10)).length
  )

  function addQuotation(quotation) {
    quotations.value.push(quotation)
    save('quotations', quotations.value)
  }

  function updateQuotation(id, updates) {
    const idx = quotations.value.findIndex(q => q.id === id)
    if (idx !== -1) {
      quotations.value[idx] = { ...quotations.value[idx], ...updates }
      save('quotations', quotations.value)
    }
  }

  function deleteQuotation(id) {
    quotations.value = quotations.value.filter(q => q.id !== id)
    save('quotations', quotations.value)
  }

  function addContract(contract) {
    contracts.value.push(contract)
    save('contracts', contracts.value)
  }

  function addCollection(collection) {
    collections.value.push(collection)
    save('collections', collections.value)
  }

  function addInventoryItem(item) {
    inventory.value.push(item)
    save('inventory', inventory.value)
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    quotations.value = [
      { id: 'q1', quoteNo: 'QT20241215001', customerId: 'c1', customerName: '上海贸易有限公司', date: '2024-12-15', expiryDate: '2025-01-15', subtotal: 120000, taxRate: 13, total: 135600, costBasis: 98000, profitMargin: 18.5, status: 'approved', currency: 'CNY', notes: '客户要求15天内交货' },
      { id: 'q2', quoteNo: 'QT20241210001', customerId: 'c3', customerName: '广州进出口有限公司', date: '2024-12-10', expiryDate: '2025-01-10', subtotal: 250000, taxRate: 13, total: 282500, costBasis: 210000, profitMargin: 16.0, status: 'sent', currency: 'CNY', notes: '' },
      { id: 'q3', quoteNo: 'QT20241201001', customerId: 'c2', customerName: '北京科技发展集团', date: '2024-12-01', expiryDate: '2024-12-31', subtotal: 85000, taxRate: 13, total: 96050, costBasis: 72000, profitMargin: 15.3, status: 'accepted', currency: 'CNY', notes: '已转送货单' },
      { id: 'q4', quoteNo: 'QT20241120001', customerId: 'c5', customerName: '成都精密机械有限公司', date: '2024-11-20', expiryDate: '2024-12-20', subtotal: 45000, taxRate: 13, total: 50850, costBasis: 38000, profitMargin: 15.6, status: 'pending', currency: 'CNY', notes: '待总经理审批' },
      { id: 'q5', quoteNo: 'QT20241101001', customerId: 'c6', customerName: '武汉钢铁贸易有限公司', date: '2024-11-01', expiryDate: '2024-12-01', subtotal: 32000, taxRate: 13, total: 36160, costBasis: 26000, profitMargin: 18.8, status: 'expired', currency: 'CNY', notes: '客户未回复' },
      { id: 'q6', quoteNo: 'QT20241218001', customerId: 'c4', customerName: '深圳智能制造有限公司', date: '2024-12-18', expiryDate: '2025-01-18', subtotal: 68000, taxRate: 13, total: 76840, costBasis: 55000, profitMargin: 19.1, status: 'draft', currency: 'CNY', notes: '草稿待完善' }
    ]
    save('quotations', quotations.value)

    inventory.value = [
      { id: 'i1', code: 'MTL-001', name: 'ABS树脂', category: 'raw', quantity: 500, safetyStock: 100, warehouse: 'main', location: 'A-01-03', unitCost: 85.5, totalValue: 42750, status: 'normal' },
      { id: 'i2', code: 'MTL-002', name: '不锈钢板304', category: 'raw', quantity: 1200, safetyStock: 200, warehouse: 'main', location: 'B-02-01', unitCost: 120, totalValue: 144000, status: 'normal' },
      { id: 'i3', code: 'MTL-003', name: '铝合金型材6063', category: 'raw', quantity: 800, safetyStock: 150, warehouse: 'main', location: 'C-01-02', unitCost: 95, totalValue: 76000, status: 'normal' },
      { id: 'i4', code: 'MTL-004', name: 'POM塑料', category: 'raw', quantity: 350, safetyStock: 80, warehouse: 'main', location: 'A-03-01', unitCost: 65, totalValue: 22750, status: 'normal' },
      { id: 'i5', code: 'MTL-005', name: '尼龙66', category: 'raw', quantity: 200, safetyStock: 60, warehouse: 'main', location: 'A-04-02', unitCost: 130, totalValue: 26000, status: 'normal' },
      { id: 'i6', code: 'MTL-006', name: '轴承钢GCr15', category: 'raw', quantity: 45, safetyStock: 50, warehouse: 'main', location: 'D-01-01', unitCost: 280, totalValue: 12600, status: 'low' },
      { id: 'i7', code: 'MTL-007', name: '碳钢Q235', category: 'raw', quantity: 600, safetyStock: 100, warehouse: 'main', location: 'D-02-01', unitCost: 45, totalValue: 27000, status: 'normal' },
      { id: 'i8', code: 'MTL-008', name: '铜合金H59', category: 'raw', quantity: 12, safetyStock: 50, warehouse: 'main', location: 'E-01-01', unitCost: 520, totalValue: 6240, status: 'low' }
    ]
    save('inventory', inventory.value)

    suppliers.value = [
      { id: 's1', name: '江苏钢铁集团有限公司', shortName: '江苏钢铁', contact: '周经理', phone: '0512-5333XXXX', email: 'zhou@js-steel.com', rating: 'A', totalPurchases: 850000, status: 'active', tags: ['核心供应商'] },
      { id: 's2', name: '浙江化工原料有限公司', shortName: '浙江化工', contact: '吴经理', phone: '0571-8666XXXX', email: 'wu@zj-chem.com', rating: 'B', totalPurchases: 320000, status: 'active', tags: [] },
      { id: 's3', name: '广东有色金属有限公司', shortName: '广东有色', contact: '郑经理', phone: '020-3888XXXX', email: 'zheng@gd-nf.com', rating: 'A', totalPurchases: 620000, status: 'active', tags: ['核心供应商', '价格优势'] },
      { id: 's4', name: '山东机械制造有限公司', shortName: '山东机械', contact: '孙经理', phone: '0531-8555XXXX', email: 'sun@sd-mach.com', rating: 'C', totalPurchases: 95000, status: 'active', tags: ['新供应商'] }
    ]
    save('suppliers', suppliers.value)

    warehouseOrders.value = [
      { id: 'w1', orderNo: 'RK20260519001', type: 'purchase', referenceId: 'PO-2024-0078', counterpartyId: 's1', counterpartyName: '江苏钢铁集团', warehouseId: 'main', date: '2026-05-19', totalQuantity: 320, status: 'confirmed' },
      { id: 'w2', orderNo: 'CK20241212001', type: 'sales', referenceId: 'QT20241201001', counterpartyId: 'c2', counterpartyName: '北京科技发展集团', warehouseId: 'main', date: '2024-12-12', totalQuantity: 450, status: 'confirmed' },
      { id: 'w3', orderNo: 'RK20260519002', type: 'customer_return', counterpartyId: 'c4', counterpartyName: '深圳智能制造有限公司', warehouseId: 'main', date: '2026-05-18', totalQuantity: 80, status: 'inspecting' },
      { id: 'w4', orderNo: 'RK20260519003', type: 'purchase', referenceId: 'PO-2026-0032', counterpartyId: 's3', counterpartyName: '广东有色金属有限公司', warehouseId: 'main', date: '2026-05-19', totalQuantity: 500, status: 'draft' }
    ]
    save('warehouseOrders', warehouseOrders.value)

    contracts.value = [
      { id: 'ct1', contractNo: 'CT-2026-001', customerId: 'c1', customerName: '上海贸易有限公司', amount: 168000, status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' },
      { id: 'ct2', contractNo: 'CT-2026-002', customerId: 'c3', customerName: '广州进出口有限公司', amount: 320000, status: 'pending', startDate: '2026-03-01', endDate: '2027-02-28' }
    ]
    save('contracts', contracts.value)

    collections.value = [
      { id: 'col1', collectionNo: 'COL-2026-001', customerId: 'c2', customerName: '北京科技发展集团', amount: 50000, date: '2026-05-15', method: 'bank_transfer' },
      { id: 'col2', collectionNo: 'COL-2026-002', customerId: 'c1', customerName: '上海贸易有限公司', amount: 85000, date: '2026-05-20', method: 'bank_transfer' }
    ]
    save('collections', collections.value)
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    quotations, contracts, transactions, inventory,
    collections, deliveries, suppliers, warehouseOrders,
    pendingQuotationCount, pendingContractCount, lowStockCount,
    addQuotation, updateQuotation, deleteQuotation,
    addContract, addCollection, addInventoryItem, initSeedData
  }
})
