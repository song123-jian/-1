/**
 * 集中式Mock数据工厂
 * 为所有业务实体生成符合业务逻辑和数据规范的虚拟测试数据
 */

let _counter = 0
function nextId() { return ++_counter }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isoNow() {
  return new Date().toISOString()
}

/* ===== 客户 ===== */
export function createCustomer(overrides = {}) {
  const n = nextId()
  return {
    id: `c_test_${n}`,
    customerNo: `KH-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`,
    name: `测试客户${n}号`,
    fullName: `测试客户${n}号有限公司`,
    shortName: `测试${n}`,
    contact: `联系人${n}`,
    contactName: `联系人${n}`,
    phone: `021-${String(50000000 + n).slice(-8)}`,
    email: `contact${n}@test-customer.com`,
    region: ['华东', '华北', '华南', '西南', '华中'][n % 5],
    level: ['A', 'B', 'C'][n % 3],
    decisionAuthority: ['决策者', '影响者', '推荐者', '把关者'][n % 4],
    coreConcerns: ['交货速度', '产品质量', '价格优势', '售后服务', '技术支持'][n % 5],
    creditLimit: [500000, 300000, 100000, 200000, 800000][n % 5],
    balance: [125000, 85000, 45000, 0, 320000][n % 5],
    address: `测试地址${n}号`,
    department: ['采购部', '技术部', '生产部'][n % 3],
    position: ['经理', '总监', '工程师'][n % 3],
    status: 'active',
    tags: [],
    createdAt: today(),
    ...overrides
  }
}

export function createCustomers(count, overrides = {}) {
  return Array.from({ length: count }, () => createCustomer(overrides))
}

/* ===== 报价单 ===== */
export function createQuotationItem(overrides = {}) {
  const n = nextId()
  return {
    seq: n,
    grade: ['ABS树脂', '不锈钢板304', '铝合金型材6063', 'POM塑料', '尼龙66'][n % 5],
    standard: ['通用级', '2B面', 'T5', 'M90-44', '注塑级'][n % 5],
    qty: [100, 200, 500, 1000, 50][n % 5],
    price: [98, 155, 125, 78, 148][n % 5],
    remark: '',
    ...overrides
  }
}

export function createQuotation(overrides = {}) {
  const n = nextId()
  const items = overrides.items || [createQuotationItem(), createQuotationItem()]
  const subtotal = items.reduce((s, it) => s + (it.qty * it.price), 0)
  const taxRate = overrides.taxRate ?? 13
  const total = subtotal * (1 + taxRate / 100)
  const costBasis = subtotal * 0.75
  return {
    id: `q_test_${n}`,
    quoteNo: `QT${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    customerFullName: overrides.customerFullName || `测试客户${n}号有限公司`,
    custContact: `联系人${n}`,
    custPhone: `021-50000000`,
    custEmail: `contact${n}@test.com`,
    senderContact: '测试业务员',
    senderCompany: '苏州冠久新材料科技有限公司',
    senderPhone: '0512-66668888',
    senderEmail: 'sales@gj-newmat.com',
    date: today(),
    expiryDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })(),
    items: JSON.stringify(items),
    subtotal: Math.round(subtotal),
    taxRate,
    total: Math.round(total),
    costBasis: Math.round(costBasis),
    profitMargin: parseFloat(((subtotal - costBasis) / subtotal * 100).toFixed(1)),
    status: 'draft',
    currency: 'CNY',
    notes: '',
    termPrice: '含税出厂价',
    termPayment: '月结30天',
    termDelivery: '物流配送',
    termDeliveryAddr: '客户指定仓库',
    termQuality: '按国标执行',
    termPriceAdj: '原材料波动±5%以内不调整',
    termLegal: '双方签字盖章生效',
    followUps: [],
    createdAt: isoNow(),
    ...overrides
  }
}

export function createQuotations(count, overrides = {}) {
  return Array.from({ length: count }, () => createQuotation(overrides))
}

/* ===== 合同 ===== */
export function createContract(overrides = {}) {
  const n = nextId()
  return {
    id: `ct_test_${n}`,
    contractNo: `HT${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    quotationId: overrides.quotationId || '',
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    partyAId: overrides.partyAId || overrides.customerId || `c_test_${n}`,
    amount: [100000, 200000, 500000, 800000, 1000000][n % 5],
    status: 'pending',
    signDate: today(),
    deliveryDate: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().slice(0, 10) })(),
    terms: '按合同条款执行',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

export function createContracts(count, overrides = {}) {
  return Array.from({ length: count }, () => createContract(overrides))
}

/* ===== 库存物料 ===== */
export function createInventoryItem(overrides = {}) {
  const n = nextId()
  const qty = overrides.quantity ?? [500, 1200, 800, 350, 200, 45, 600, 12][n % 8]
  const safetyStock = overrides.safetyStock ?? [100, 200, 150, 80, 60, 50, 100, 50][n % 8]
  const unitCost = overrides.unitCost ?? [85.5, 120, 95, 65, 130, 280, 45, 520][n % 8]
  return {
    id: `i_test_${n}`,
    code: `MTL-TEST-${String(n).padStart(3, '0')}`,
    name: ['ABS树脂', '不锈钢板304', '铝合金型材6063', 'POM塑料', '尼龙66', '轴承钢GCr15', '碳钢Q235', '铜合金H59'][n % 8],
    category: ['raw', 'finished', 'semi', 'auxiliary', 'packaging'][n % 5],
    quantity: qty,
    safetyStock,
    maxStock: overrides.maxStock ?? 0,
    warehouse: ['main', 'A', 'B', 'C'][n % 4],
    location: `${String.fromCharCode(65 + n % 5)}-${String(n % 10).padStart(2, '0')}-${String(n % 5 + 1).padStart(2, '0')}`,
    unitCost,
    totalValue: qty * unitCost,
    status: qty <= safetyStock ? (qty <= 0 ? 'exhausted' : 'low') : 'normal',
    grade: ['通用级', '2B/BA', 'T5', 'M90-44', '', 'Φ50', '热轧板卷', ''][n % 8],
    color: n % 4 === 0 ? '自然色' : '',
    brand: '',
    lastInboundDate: '',
    createdAt: isoNow(),
    ...overrides
  }
}

export function createInventoryItems(count, overrides = {}) {
  return Array.from({ length: count }, () => createInventoryItem(overrides))
}

/* ===== 入库单 ===== */
export function createInboundOrder(overrides = {}) {
  const n = nextId()
  return {
    id: `w_test_${n}`,
    orderNo: `RK${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    type: ['purchase', 'production_return', 'customer_return', 'transfer', 'surplus'][n % 5],
    date: today(),
    counterpartyId: overrides.counterpartyId || `s_test_${n}`,
    counterpartyName: overrides.counterpartyName || `测试供应商${n}`,
    supplierCode: overrides.supplierCode || `SUP-TEST-${n}`,
    totalQuantity: [100, 200, 500, 320, 80][n % 5],
    status: 'pending',
    notes: '',
    items: '[]',
    warehouseId: 'main',
    qualityStatus: 'pending',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 出库单 ===== */
export function createOutboundOrder(overrides = {}) {
  const n = nextId()
  return {
    id: `wo_test_${n}`,
    orderNo: `CK${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    outboundNo: `CK${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    type: ['sales', 'production', 'transfer', 'scrap', 'sample'][n % 5],
    outType: ['sales', 'production', 'transfer', 'scrap', 'sample'][n % 5],
    date: today(),
    counterpartyId: overrides.counterpartyId || `c_test_${n}`,
    counterpartyName: overrides.counterpartyName || `测试客户${n}`,
    materialCode: overrides.materialCode || 'MTL-TEST-001',
    materialName: overrides.materialName || 'ABS树脂',
    grade: '',
    color: '',
    outQty: [50, 100, 200, 450, 30][n % 5],
    unitPrice: [98, 155, 125, 78, 148][n % 5],
    outAmount: [4900, 15500, 25000, 35100, 4440][n % 5],
    referenceId: '',
    status: 'pending_review',
    outStatus: 'pending_review',
    notes: '',
    warehouseId: 'main',
    items: '[]',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 送货单 ===== */
export function createDelivery(overrides = {}) {
  const n = nextId()
  return {
    id: `dl_test_${n}`,
    deliveryNo: `SH${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    items: JSON.stringify([
      { itemCode: 'MTL-TEST-001', itemName: 'ABS树脂', quantity: 100, unitPrice: 98 },
      { itemCode: 'MTL-TEST-002', itemName: '不锈钢板304', quantity: 50, unitPrice: 155 }
    ]),
    status: 'created',
    deliveredAt: '',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

export function createDeliveries(count, overrides = {}) {
  return Array.from({ length: count }, () => createDelivery(overrides))
}

/* ===== 回款记录 ===== */
export function createCollection(overrides = {}) {
  const n = nextId()
  return {
    id: `col_test_${n}`,
    collectionNo: `HK${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    amount: [50000, 100000, 200000, 80000, 150000][n % 5],
    collectedAt: today(),
    paymentMethod: ['bank_transfer', 'cash', 'check', 'wechat', 'alipay'][n % 5],
    status: 'pending',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 对账单 ===== */
export function createStatement(overrides = {}) {
  const n = nextId()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
  return {
    id: `stmt_test_${n}`,
    statementNo: `DZ${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    amount: [100000, 200000, 500000, 80000, 300000][n % 5],
    status: 'pending',
    periodStart,
    periodEnd,
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 供应商 ===== */
export function createSupplier(overrides = {}) {
  const n = nextId()
  return {
    id: `s_test_${n}`,
    name: `测试供应商${n}号有限公司`,
    shortName: `测试供应${n}`,
    contact: `周经理${n}`,
    phone: `0512-${String(50000000 + n).slice(-8)}`,
    email: `zhou${n}@test-supplier.com`,
    rating: ['A', 'B', 'C'][n % 3],
    totalPurchases: [850000, 320000, 620000, 95000, 450000][n % 5],
    status: 'active',
    tags: n % 3 === 0 ? ['核心供应商'] : [],
    supplierCode: `SUP-TEST-${String(n).padStart(3, '0')}`,
    createdAt: isoNow(),
    ...overrides
  }
}

export function createSuppliers(count, overrides = {}) {
  return Array.from({ length: count }, () => createSupplier(overrides))
}

/* ===== 采购单 ===== */
export function createPurchaseOrder(overrides = {}) {
  const n = nextId()
  const items = overrides.items || [
    { itemCode: 'MTL-TEST-001', itemName: 'ABS树脂', quantity: 500, unitPrice: 85, totalPrice: 42500 },
    { itemCode: 'MTL-TEST-002', itemName: '不锈钢板304', quantity: 200, unitPrice: 115, totalPrice: 23000 }
  ]
  return {
    id: `po_test_${n}`,
    purchaseNo: `PO${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    supplierId: overrides.supplierId || `s_test_${n}`,
    supplierName: overrides.supplierName || `测试供应商${n}号`,
    items,
    totalAmount: items.reduce((s, it) => s + (it.totalPrice || 0), 0),
    status: 'pending',
    orderDate: today(),
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 生产工单 ===== */
export function createProductionOrder(overrides = {}) {
  const n = nextId()
  return {
    id: `prod_test_${n}`,
    orderNo: `SC${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    productCode: `PROD-${String(n).padStart(3, '0')}`,
    productName: `测试产品${n}号`,
    quantity: [100, 500, 1000, 200, 50][n % 5],
    status: 'pending',
    bomId: overrides.bomId || '',
    startDate: today(),
    endDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })(),
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== BOM节点 ===== */
export function createBomNode(overrides = {}) {
  const n = nextId()
  return {
    id: `bom_test_${n}`,
    code: `BOM-${String(n).padStart(3, '0')}`,
    name: `测试BOM${n}号`,
    quantity: [1, 2, 5, 10, 3][n % 5],
    unit: ['个', 'kg', '米', '件', '套'][n % 5],
    children: overrides.children || [],
    ...overrides
  }
}

/* ===== 盘点单 ===== */
export function createStocktaking(overrides = {}) {
  const n = nextId()
  return {
    id: `sk_test_${n}`,
    stocktakingNo: `PD${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    warehouseId: 'main',
    warehouseName: '主仓库',
    status: 'pending',
    plannedDate: today(),
    executedDate: '',
    confirmedDate: '',
    items: [],
    notes: '',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 调拨单 ===== */
export function createTransfer(overrides = {}) {
  const n = nextId()
  return {
    id: `tf_test_${n}`,
    transferNo: `DB${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    fromWarehouse: 'main',
    fromWarehouseName: '主仓库',
    toWarehouse: 'A',
    toWarehouseName: 'A区(原料仓)',
    status: 'pending',
    items: [],
    notes: '',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 库位 ===== */
export function createWarehouseLocation(overrides = {}) {
  const n = nextId()
  return {
    id: `loc_test_${n}`,
    code: `LOC-${String.fromCharCode(65 + n % 5)}${String(n % 10).padStart(2, '0')}`,
    name: `测试库位${n}`,
    warehouseId: ['main', 'A', 'B', 'C'][n % 4],
    warehouseName: ['主仓库', 'A区(原料仓)', 'B区(成品仓)', 'C区(危化仓)'][n % 4],
    zone: `${String.fromCharCode(65 + n % 5)}区`,
    row: String(n % 10 + 1),
    shelf: String(n % 5 + 1),
    capacity: 1000,
    currentUsage: [0, 300, 500, 800, 950][n % 5],
    status: 'active',
    ...overrides
  }
}

/* ===== 应收/应付 ===== */
export function createReceivable(overrides = {}) {
  const n = nextId()
  return {
    id: `rcv_test_${n}`,
    receivableNo: `YS${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    customerId: overrides.customerId || `c_test_${n}`,
    customerName: overrides.customerName || `测试客户${n}号`,
    amount: [100000, 200000, 500000, 80000, 300000][n % 5],
    paidAmount: [0, 50000, 150000, 80000, 100000][n % 5],
    status: 'pending',
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })(),
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

export function createPayable(overrides = {}) {
  const n = nextId()
  return {
    id: `pay_test_${n}`,
    payableNo: `YF${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    supplierId: overrides.supplierId || `s_test_${n}`,
    supplierName: overrides.supplierName || `测试供应商${n}号`,
    amount: [50000, 100000, 200000, 80000, 150000][n % 5],
    paidAmount: [0, 30000, 100000, 80000, 50000][n % 5],
    status: 'pending',
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })(),
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides
  }
}

/* ===== 成本记录 ===== */
export function createCostRecord(overrides = {}) {
  const n = nextId()
  return {
    id: `cost_test_${n}`,
    costNo: `CB${today().replace(/-/g, '')}${String(n).padStart(3, '0')}`,
    category: ['material', 'labor', 'overhead', 'logistics', 'other'][n % 5],
    amount: [50000, 30000, 20000, 10000, 5000][n % 5],
    date: today(),
    description: `测试成本记录${n}`,
    createdAt: isoNow(),
    ...overrides
  }
}

/* ===== 标签 ===== */
export function createTag(overrides = {}) {
  const n = nextId()
  return {
    id: `tag_test_${n}`,
    name: `测试标签${n}`,
    color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'][n % 5],
    group: ['等级', '关系', '风险'][n % 3],
    ...overrides
  }
}

/* ===== 待办事项 ===== */
export function createTodo(overrides = {}) {
  const n = nextId()
  return {
    id: `todo_test_${n}`,
    title: `测试待办${n}`,
    description: `测试待办描述${n}`,
    priority: ['high', 'medium', 'low'][n % 3],
    status: 'pending',
    dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })(),
    module: ['customer', 'sales', 'warehouse', 'finance', 'purchase'][n % 5],
    relatedId: '',
    createdAt: isoNow(),
    ...overrides
  }
}

/* ===== 通知 ===== */
export function createNotification(overrides = {}) {
  const n = nextId()
  return {
    id: `notif_test_${n}`,
    type: ['info', 'warning', 'success', 'error'][n % 4],
    title: `测试通知${n}`,
    message: `测试通知内容${n}`,
    read: false,
    module: ['customer', 'sales', 'warehouse', 'finance'][n % 4],
    createdAt: isoNow(),
    ...overrides
  }
}

/* ===== 审批规则 ===== */
export function createApprovalRule(overrides = {}) {
  const n = nextId()
  return {
    id: `apr_test_${n}`,
    name: `测试审批规则${n}`,
    module: ['quotation', 'contract', 'outbound', 'purchase'][n % 4],
    conditions: { minAmount: 100000 },
    approvers: ['管理员', '总经理'],
    status: 'active',
    createdAt: isoNow(),
    ...overrides
  }
}

/* ===== 审计日志 ===== */
export function createAuditLog(overrides = {}) {
  const n = nextId()
  return {
    id: `log_test_${n}`,
    time: isoNow(),
    user: '测试用户',
    action: ['create', 'update', 'delete', 'approve', 'confirm'][n % 5],
    module: ['customer', 'quotation', 'contract', 'inventory', 'delivery'][n % 5],
    detail: `测试操作日志${n}`,
    ...overrides
  }
}

/* ===== 工作流节点 ===== */
export function createWorkflowNode(overrides = {}) {
  const n = nextId()
  return {
    id: `wf_test_${n}`,
    type: ['start', 'approval', 'condition', 'end'][n % 4],
    name: `测试节点${n}`,
    approvers: n % 4 === 1 ? ['管理员'] : [],
    nextNodes: [],
    ...overrides
  }
}

/* ===== 公司信息 ===== */
export function createCompanyInfo(overrides = {}) {
  return {
    id: 'company_1',
    name: '苏州冠久新材料科技有限公司',
    shortName: '冠久新材',
    address: '苏州市工业园区星湖街218号',
    phone: '0512-66668888',
    fax: '0512-66668889',
    email: 'info@gj-newmat.com',
    website: 'https://www.gj-newmat.com',
    taxNo: '91320500MA1XXXXXX',
    bankName: '中国银行苏州分行',
    bankAccount: '5555 8888 6666 9999',
    legalPerson: '张三',
    createdAt: isoNow(),
    ...overrides
  }
}

/* ===== 系统参数 ===== */
export function createSystemParams(overrides = {}) {
  return {
    id: 'params_1',
    orderPrefixes: {
      quotation: 'QT',
      contract: 'HT',
      inbound: 'RK',
      outbound: 'CK',
      delivery: 'SH',
      collection: 'HK',
      purchase: 'PO',
      production: 'SC'
    },
    defaultTaxRate: 13,
    currency: 'CNY',
    dateFormat: 'YYYY-MM-DD',
    autoApproveAmount: 50000,
    lowStockThreshold: 0.2,
    sessionTimeout: 30,
    ...overrides
  }
}

/* ===== 归档记录 ===== */
export function createArchive(overrides = {}) {
  const n = nextId()
  return {
    id: `arch_test_${n}`,
    module: ['quotation', 'contract', 'delivery'][n % 3],
    recordId: `rec_test_${n}`,
    recordNo: `TEST-${n}`,
    archivedBy: '测试用户',
    archivedAt: isoNow(),
    ...overrides
  }
}

/* ===== 文档设置 ===== */
export function createDocSettings(overrides = {}) {
  const n = nextId()
  return {
    id: `doc_test_${n}`,
    module: ['quotation', 'contract', 'delivery', 'statement'][n % 4],
    templateName: `测试模板${n}`,
    header: '冠久新材',
    footer: '苏州冠久新材料科技有限公司',
    showLogo: true,
    showStamp: true,
    fontSize: 12,
    paperSize: 'A4',
    ...overrides
  }
}

/* ===== 重置计数器 ===== */
export function resetCounter() {
  _counter = 0
}

/* ===== 批量生成完整数据集 ===== */
export function createFullDataSet(options = {}) {
  const customerCount = options.customerCount || 10
  const quotationCount = options.quotationCount || 8
  const contractCount = options.contractCount || 5
  const inventoryCount = options.inventoryCount || 8
  const supplierCount = options.supplierCount || 4
  const deliveryCount = options.deliveryCount || 5
  const collectionCount = options.collectionCount || 5

  const customers = createCustomers(customerCount)
  const suppliers = createSuppliers(supplierCount)
  const inventory = createInventoryItems(inventoryCount)

  const quotations = Array.from({ length: quotationCount }, (_, i) =>
    createQuotation({
      customerId: customers[i % customerCount].id,
      customerName: customers[i % customerCount].name,
      status: ['draft', 'pending', 'sent', 'approved', 'accepted', 'rejected', 'expired'][i % 7]
    })
  )

  const contracts = Array.from({ length: contractCount }, (_, i) =>
    createContract({
      customerId: customers[i % customerCount].id,
      customerName: customers[i % customerCount].name,
      status: ['pending', 'approved', 'signed', 'executing', 'completed', 'archived'][i % 6]
    })
  )

  const deliveries = Array.from({ length: deliveryCount }, (_, i) =>
    createDelivery({
      customerId: customers[i % customerCount].id,
      customerName: customers[i % customerCount].name,
      status: ['created', 'pending', 'shipped', 'delivered', 'signed', 'verified'][i % 6]
    })
  )

  const collections = Array.from({ length: collectionCount }, (_, i) =>
    createCollection({
      customerId: customers[i % customerCount].id,
      customerName: customers[i % customerCount].name,
      status: ['pending', 'confirmed', 'completed', 'voided'][i % 4]
    })
  )

  return {
    customers,
    quotations,
    contracts,
    inventory,
    suppliers,
    deliveries,
    collections,
    tags: [createTag(), createTag(), createTag()],
    receivables: Array.from({ length: 5 }, (_, i) =>
      createReceivable({
        customerId: customers[i % customerCount].id,
        customerName: customers[i % customerCount].name,
        status: ['pending', 'partial', 'completed', 'overdue'][i % 4]
      })
    ),
    payables: Array.from({ length: 5 }, (_, i) =>
      createPayable({
        supplierId: suppliers[i % supplierCount].id,
        supplierName: suppliers[i % supplierCount].name,
        status: ['pending', 'partial', 'completed', 'overdue'][i % 4]
      })
    ),
    statements: Array.from({ length: 3 }, () => createStatement()),
    costRecords: Array.from({ length: 5 }, () => createCostRecord()),
    purchaseOrders: Array.from({ length: 4 }, (_, i) =>
      createPurchaseOrder({
        supplierId: suppliers[i % supplierCount].id,
        supplierName: suppliers[i % supplierCount].name,
        status: ['pending', 'approved', 'ordered', 'received', 'cancelled'][i % 5]
      })
    ),
    productionOrders: Array.from({ length: 3 }, (_, i) =>
      createProductionOrder({ status: ['pending', 'producing', 'completed', 'cancelled'][i % 4] })
    ),
    bomNodes: Array.from({ length: 3 }, () => createBomNode()),
    stocktakings: Array.from({ length: 3 }, (_, i) =>
      createStocktaking({ status: ['pending', 'executing', 'completed'][i % 3] })
    ),
    transfers: Array.from({ length: 3 }, (_, i) =>
      createTransfer({ status: ['pending', 'approved', 'completed', 'cancelled'][i % 4] })
    ),
    warehouseLocations: Array.from({ length: 5 }, () => createWarehouseLocation()),
    todos: Array.from({ length: 5 }, (_, i) =>
      createTodo({ status: ['pending', 'in_progress', 'completed'][i % 3] })
    ),
    notifications: Array.from({ length: 5 }, () => createNotification()),
    auditLogs: Array.from({ length: 5 }, () => createAuditLog()),
    approvalRules: Array.from({ length: 3 }, () => createApprovalRule())
  }
}
