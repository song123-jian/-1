/**
 * 虚假数据生成器
 * 为深度测试提供各模块的模拟数据
 */

/* 唯一ID计数器 */
let _idCounter = 0
function uid(prefix = 'test') {
  return `${prefix}_${++_idCounter}_${Date.now().toString(36)}`
}

/* 随机工具 */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min, max, decimals = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)) }
function randItem(arr) { return arr[randInt(0, arr.length - 1)] }
function randDate(startYear = 2024, endYear = 2026) {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date(endYear, 11, 31).getTime()
  return new Date(start + Math.random() * (end - start)).toISOString()
}

/* 常量池 */
const REGIONS = ['华东', '华南', '华北', '西南', '东北', '华中', '西北']
const LEVELS = ['A', 'B', 'C']
const CUSTOMER_STATUSES = ['active', 'dormant', 'inactive']
const QUOTATION_STATUSES = ['draft', 'sent', 'approved', 'accepted', 'rejected', 'expired']
const CONTRACT_STATUSES = ['draft', 'pending', 'approved', 'signed', 'completed', 'cancelled']
const INVENTORY_STATUSES = ['normal', 'low', 'exhausted']
const INVENTORY_CATEGORIES = ['原材料', '半成品', '成品', '包装材料', '辅料']
const UNITS = ['个', '件', '箱', '吨', '千克', '米', '套']
const PAYMENT_METHODS = ['bank', 'cash', 'check', 'other']
const FINANCE_STATUSES = ['pending', 'partial', 'completed', 'overdue']
const WAREHOUSE_NAMES = ['主仓', '副仓', '临时仓', '退货仓']
const SUPPLIER_STATUSES = ['active', 'inactive']
const PRODUCTION_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled']
const PURCHASE_STATUSES = ['draft', 'pending', 'approved', 'partial', 'completed', 'cancelled']

/* ========== 客户数据生成 ========== */

export function generateCustomer(overrides = {}) {
  const id = uid('cust')
  const level = randItem(LEVELS)
  const creditLimit = level === 'A' ? randFloat(100000, 500000) : level === 'B' ? randFloat(50000, 200000) : randFloat(10000, 50000)
  return {
    id,
    name: `测试客户_${id}`,
    shortName: `客户${_idCounter}`,
    phone: `1${randInt(30, 99)}${String(randInt(10000000, 99999999))}`,
    email: `test${_idCounter}@example.com`,
    region: randItem(REGIONS),
    level,
    status: randItem(CUSTOMER_STATUSES),
    creditLimit,
    balance: randFloat(0, creditLimit),
    address: `测试地址_${id}`,
    contact: `联系人_${_idCounter}`,
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateCustomers(count = 100, overrides = {}) {
  return Array.from({ length: count }, () => generateCustomer(overrides))
}

/* ========== 报价单数据生成 ========== */

export function generateQuotationItem() {
  const qty = randInt(1, 100)
  const price = randFloat(10, 1000)
  return {
    id: uid('qi'),
    materialCode: `MAT-${randInt(1000, 9999)}`,
    materialName: `物料_${randInt(1, 200)}`,
    specification: `规格_${randInt(1, 50)}`,
    unit: randItem(UNITS),
    quantity: qty,
    unitPrice: price,
    amount: parseFloat((qty * price).toFixed(2)),
    remark: ''
  }
}

export function generateQuotation(overrides = {}) {
  const id = uid('quote')
  const items = Array.from({ length: randInt(1, 10) }, () => generateQuotationItem())
  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const taxRate = 0.13
  const tax = parseFloat((subtotal * taxRate).toFixed(2))
  return {
    id,
    quoteNo: `QT${new Date().getFullYear()}${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(1, 999)).padStart(3, '0')}`,
    customerId: uid('cust'),
    customerName: `客户_${randInt(1, 100)}`,
    status: randItem(QUOTATION_STATUSES),
    items,
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxRate,
    tax,
    total: parseFloat((subtotal + tax).toFixed(2)),
    validUntil: randDate(2025, 2026),
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateQuotations(count = 200, overrides = {}) {
  return Array.from({ length: count }, () => generateQuotation(overrides))
}

/* ========== 合同数据生成 ========== */

export function generateContract(overrides = {}) {
  const id = uid('cont')
  return {
    id,
    contractNo: `CT${new Date().getFullYear()}${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(1, 999)).padStart(3, '0')}`,
    customerId: uid('cust'),
    customerName: `客户_${randInt(1, 100)}`,
    quotationId: uid('quote'),
    status: randItem(CONTRACT_STATUSES),
    amount: randFloat(10000, 500000),
    signedDate: randDate(2024, 2025),
    startDate: randDate(2025, 2025),
    endDate: randDate(2025, 2026),
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateContracts(count = 100, overrides = {}) {
  return Array.from({ length: count }, () => generateContract(overrides))
}

/* ========== 库存数据生成 ========== */

export function generateInventoryItem(overrides = {}) {
  const id = uid('inv')
  const safeStock = randInt(10, 200)
  const quantity = randInt(0, safeStock * 3)
  const status = quantity === 0 ? 'exhausted' : quantity < safeStock ? 'low' : 'normal'
  return {
    id,
    code: `MAT-${randInt(1000, 9999)}`,
    name: `物料_${id}`,
    category: randItem(INVENTORY_CATEGORIES),
    specification: `规格_${randInt(1, 50)}`,
    unit: randItem(UNITS),
    quantity,
    safeStock,
    unitCost: randFloat(5, 500),
    warehouse: randItem(WAREHOUSE_NAMES),
    status,
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateInventoryItems(count = 500, overrides = {}) {
  return Array.from({ length: count }, () => generateInventoryItem(overrides))
}

/* ========== 出入库单据生成 ========== */

export function generateWarehouseOrder(type = 'inbound', overrides = {}) {
  const isInbound = type === 'inbound'
  const orderTypes = isInbound
    ? ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift']
    : ['sale', 'transfer', 'production', 'sample', 'scrap']
  return {
    id: uid(isInbound ? 'inb' : 'outb'),
    orderNo: `${isInbound ? 'INB' : 'OUTB'}${String(randInt(1, 9999)).padStart(4, '0')}`,
    type: randItem(orderTypes),
    materialCode: `MAT-${randInt(1000, 9999)}`,
    materialName: `物料_${randInt(1, 200)}`,
    quantity: randInt(1, 500),
    warehouse: randItem(WAREHOUSE_NAMES),
    date: randDate(2024, 2026),
    operator: `操作员_${randInt(1, 10)}`,
    remark: '',
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateWarehouseOrders(count = 1000, type = 'inbound', overrides = {}) {
  return Array.from({ length: count }, () => generateWarehouseOrder(type, overrides))
}

/* ========== 财务数据生成 ========== */

export function generateReceivable(overrides = {}) {
  const id = uid('recv')
  const amount = randFloat(5000, 200000)
  const paid = randFloat(0, amount)
  return {
    id,
    receivableNo: `YS${String(randInt(1, 9999)).padStart(4, '0')}`,
    customerId: uid('cust'),
    customerName: `客户_${randInt(1, 100)}`,
    amount: parseFloat(amount.toFixed(2)),
    paidAmount: parseFloat(paid.toFixed(2)),
    status: paid === 0 ? 'pending' : paid >= amount ? 'completed' : 'partial',
    dueDate: randDate(2024, 2026),
    sourceNo: `CT-${randInt(1000, 9999)}`,
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateReceivables(count = 200, overrides = {}) {
  return Array.from({ length: count }, () => generateReceivable(overrides))
}

export function generatePayable(overrides = {}) {
  const id = uid('pay')
  const amount = randFloat(5000, 200000)
  const paid = randFloat(0, amount)
  return {
    id,
    payableNo: `YF${String(randInt(1, 9999)).padStart(4, '0')}`,
    supplierId: uid('sup'),
    supplierName: `供应商_${randInt(1, 50)}`,
    amount: parseFloat(amount.toFixed(2)),
    paidAmount: parseFloat(paid.toFixed(2)),
    status: paid === 0 ? 'pending' : paid >= amount ? 'completed' : 'partial',
    dueDate: randDate(2024, 2026),
    sourceNo: `PO-${randInt(1000, 9999)}`,
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generatePayables(count = 200, overrides = {}) {
  return Array.from({ length: count }, () => generatePayable(overrides))
}

/* ========== 供应商数据生成 ========== */

export function generateSupplier(overrides = {}) {
  const id = uid('sup')
  return {
    id,
    name: `供应商_${id}`,
    shortName: `供应${_idCounter}`,
    phone: `0${randInt(10, 29)}-${randInt(10000000, 99999999)}`,
    email: `supplier${_idCounter}@example.com`,
    contact: `联系人_${_idCounter}`,
    address: `地址_${id}`,
    rating: randItem(LEVELS),
    status: randItem(SUPPLIER_STATUSES),
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

export function generateSuppliers(count = 50, overrides = {}) {
  return Array.from({ length: count }, () => generateSupplier(overrides))
}

/* ========== 采购单数据生成 ========== */

export function generatePurchaseOrder(overrides = {}) {
  const id = uid('po')
  return {
    id,
    orderNo: `PO${String(randInt(1, 9999)).padStart(4, '0')}`,
    supplierId: uid('sup'),
    supplierName: `供应商_${randInt(1, 50)}`,
    status: randItem(PURCHASE_STATUSES),
    amount: randFloat(5000, 200000),
    items: Array.from({ length: randInt(1, 5) }, () => ({
      materialCode: `MAT-${randInt(1000, 9999)}`,
      materialName: `物料_${randInt(1, 200)}`,
      quantity: randInt(10, 500),
      unitPrice: randFloat(10, 500)
    })),
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

/* ========== 生产工单数据生成 ========== */

export function generateProductionOrder(overrides = {}) {
  const id = uid('prod')
  return {
    id,
    orderNo: `MO${String(randInt(1, 9999)).padStart(4, '0')}`,
    productName: `产品_${randInt(1, 50)}`,
    quantity: randInt(10, 1000),
    status: randItem(PRODUCTION_STATUSES),
    plannedStart: randDate(2025, 2025),
    plannedEnd: randDate(2025, 2026),
    actualStart: null,
    actualEnd: null,
    createdAt: randDate(2024, 2025),
    updatedAt: randDate(2025, 2026),
    ...overrides
  }
}

/* ========== 工作流实例数据生成 ========== */

export function generateWorkflowInstance(overrides = {}) {
  const id = uid('wf')
  const templateId = randItem(['purchase', 'quotation', 'contract', 'inbound', 'outbound', 'payment'])
  return {
    id,
    templateId,
    templateName: `${templateId}审批流`,
    businessId: uid('biz'),
    businessType: templateId,
    businessNo: `BN-${randInt(1000, 9999)}`,
    status: randItem(['running', 'completed', 'rejected', 'cancelled']),
    currentNode: 'n2',
    currentApprover: randItem(['管理员', '总经理', '销售主管', '仓库主管', '财务']),
    variables: { amount: randFloat(1000, 200000), applicant: '测试用户' },
    startTime: randDate(2025, 2026),
    currentNodeArrivalTime: randDate(2025, 2026),
    endTime: null,
    history: [{
      node: '提交申请',
      nodeId: 'n1',
      approver: '测试用户',
      action: 'submit',
      comment: '提交申请',
      time: randDate(2025, 2026)
    }],
    addedApprovers: [],
    timeoutHours: 48,
    ...overrides
  }
}

/* ========== 异常数据注入 ========== */

export const ANOMALY = {
  /* XSS 载荷 */
  xssScript: '<script>alert("xss")</script>',
  xssImg: '<img src=x onerror=alert(1)>',
  xssSvg: '<svg onload=alert(1)>',

  /* SQL 注入 */
  sqlInjection: "'; DROP TABLE customers; --",

  /* 原型污染 */
  protoPollution: { __proto__: { admin: true }, constructor: { prototype: { admin: true } } },

  /* 超长字符串 */
  longString: 'A'.repeat(10000),

  /* 特殊字符 */
  specialChars: '!@#$%^&*(){}[]|\\:;"\'<>?,./~`\n\r\t',

  /* Emoji */
  emojiString: '😀🎉💻🔒💰📊',

  /* 负数金额 */
  negativeAmount: -999.99,

  /* 零值 */
  zeroAmount: 0,

  /* 极大值 */
  hugeAmount: 999999999999.99,

  /* NaN / Infinity */
  nanValue: NaN,
  infinityValue: Infinity,

  /* 未来日期 */
  futureDate: '2099-12-31T23:59:59.999Z',

  /* 空值 */
  nullValue: null,
  undefinedValue: undefined,

  /* 空字符串 */
  emptyString: '',

  /* 浮点精度问题值 */
  floatPrecision: 0.1 + 0.2 // 0.30000000000000004
}

/* 生成带异常字段的客户 */
export function generateAnomalousCustomer(anomalyType) {
  const base = generateCustomer()
  switch (anomalyType) {
    case 'xss': return { ...base, name: ANOMALY.xssScript, address: ANOMALY.xssImg }
    case 'sql': return { ...base, name: ANOMALY.sqlInjection }
    case 'long': return { ...base, name: ANOMALY.longString, address: ANOMALY.longString }
    case 'null': return { ...base, name: null, phone: null, email: null }
    case 'negative': return { ...base, balance: ANOMALY.negativeAmount, creditLimit: ANOMALY.negativeAmount }
    case 'zero': return { ...base, balance: 0, creditLimit: 0 }
    case 'huge': return { ...base, balance: ANOMALY.hugeAmount, creditLimit: ANOMALY.hugeAmount }
    case 'float': return { ...base, balance: ANOMALY.floatPrecision }
    case 'future': return { ...base, createdAt: ANOMALY.futureDate }
    case 'empty': return { ...base, name: '', phone: '', email: '' }
    case 'special': return { ...base, name: ANOMALY.specialChars }
    case 'emoji': return { ...base, name: ANOMALY.emojiString }
    case 'proto': return { ...base, ...ANOMALY.protoPollution }
    default: return base
  }
}

/* 重置ID计数器 */
export function resetIdCounter() { _idCounter = 0 }
