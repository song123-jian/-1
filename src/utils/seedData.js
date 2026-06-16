/**
 * 种子数据生成器
 * 为系统灌入虚假演示数据，用于测试和演示
 */

import { generateId } from './uid'

const FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗']
const LAST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '鹏', '飞', '婷']
const COMPANIES = ['科技有限公司', '贸易有限责任公司', '实业集团', '进出口有限公司', '电子商务有限公司', '制造有限公司', '供应链管理有限公司', '智能科技有限公司', '环保科技有限公司', '新材料有限公司']
const PRODUCTS = ['智能控制器', '工业传感器', 'PLC模块', '变频器', '伺服电机', '触摸屏', '继电器', '断路器', '接触器', '编码器', '减速机', '轴承', '密封件', '液压泵', '气动元件']
const ADDRESSES = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '苏州市工业园区', '成都市高新区', '武汉市东湖高新区', '西安市高新区', '南京市江宁区']

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

/* ========== 客户种子数据 ========== */
export function generateCustomers(count = 30) {
  const customers = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const name = randomItem(FIRST_NAMES) + randomItem(LAST_NAMES)
    const company = name.substring(0, 1) + randomItem(COMPANIES)
    const createdAt = randomDate(new Date(2023, 0, 1), now)
    customers.push({
      id: generateId(),
      customerNo: `KH${String(20240001 + i)}`,
      name: company,
      fullName: company,
      shortName: company.substring(0, 4),
      contact: name,
      phone: `1${randomInt(3, 9)}${String(randomInt(100000000, 999999999))}`,
      email: `contact${i + 1}@${company.replace(/有限公司|集团|公司/g, '').toLowerCase()}.com`,
      address: randomItem(ADDRESSES) + randomInt(1, 999) + '号',
      industry: randomItem(['制造业', '电子', '机械', '化工', '食品', '纺织', '建材', '医药']),
      scale: randomItem(['小型', '中型', '大型']),
      source: randomItem(['展会', '网络', '转介绍', '电话', '老客户']),
      status: randomItem(['active', 'active', 'active', 'potential', 'inactive']),
      grade: randomItem(['A', 'A', 'B', 'B', 'C']),
      concern: randomItem(['价格', '质量', '交期', '服务', '品牌']),
      salesRep: randomItem(['销售一部', '销售二部', '销售三部']),
      remark: '',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      lastContactDate: formatDate(randomDate(createdAt, now))
    })
  }
  return customers
}

/* ========== 报价单种子数据 ========== */
export function generateQuotations(customers, count = 50) {
  const quotations = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const customer = randomItem(customers)
    const product = randomItem(PRODUCTS)
    const qty = randomInt(10, 1000)
    const unitPrice = randomInt(100, 5000)
    const totalAmount = qty * unitPrice
    const cost = totalAmount * (0.6 + Math.random() * 0.25)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    quotations.push({
      id: generateId(),
      quotationNo: `QT${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      productName: product,
      quantity: qty,
      unitPrice,
      totalAmount,
      cost,
      profitRate: ((totalAmount - cost) / totalAmount * 100).toFixed(1),
      status: randomItem(['draft', 'draft', 'sent', 'sent', 'approved', 'rejected']),
      validityDays: randomInt(15, 90),
      deliveryDays: randomInt(7, 60),
      paymentTerms: randomItem(['款到发货', '月结30天', '月结60天', '预付30%']),
      remark: '',
      createdBy: randomItem(['销售一部', '销售二部']),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      expiryDate: formatDate(new Date(createdAt.getTime() + 30 * 86400000))
    })
  }
  return quotations
}

/* ========== 合同种子数据 ========== */
export function generateContracts(customers, count = 30) {
  const contracts = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const customer = randomItem(customers)
    const amount = randomInt(50000, 500000)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    contracts.push({
      id: generateId(),
      contractNo: `HT${now.getFullYear()}${String(i + 1).padStart(4, '0')}`,
      partyA: '本公司',
      partyB: customer.name,
      amount,
      signedAmount: Math.random() > 0.3 ? amount : Math.floor(amount * 0.5),
      status: randomItem(['draft', 'draft', 'pending', 'signed', 'signed', 'archived']),
      signDate: formatDate(createdAt),
      startDate: formatDate(createdAt),
      endDate: formatDate(new Date(createdAt.getTime() + 365 * 86400000)),
      paymentTerms: randomItem(['款到发货', '月结30天', '月结60天']),
      deliveryTerms: randomItem(['送货上门', '自提', '快递']),
      warrantyMonths: randomInt(12, 36),
      remark: '',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }
  return contracts
}

/* ========== 交易种子数据 ========== */
export function generateTransactions(customers, count = 60) {
  const transactions = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const customer = randomItem(customers)
    const amount = randomInt(1000, 50000)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    transactions.push({
      id: generateId(),
      transactionNo: `JY${now.getFullYear()}${String(i + 1).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      type: randomItem(['sale', 'sale', 'sale', 'return', 'adjustment']),
      amount,
      status: randomItem(['completed', 'completed', 'completed', 'pending', 'cancelled']),
      paymentStatus: randomItem(['paid', 'paid', 'paid', 'unpaid', 'partial']),
      deliveryStatus: randomItem(['delivered', 'delivered', 'shipped', 'pending']),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }
  return transactions
}

/* ========== 采购订单种子数据 ========== */
export function generatePurchaseOrders(count = 25) {
  const orders = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const amount = randomInt(10000, 200000)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    orders.push({
      id: generateId(),
      orderNo: `CG${now.getFullYear()}${String(i + 1).padStart(4, '0')}`,
      supplierName: randomItem(['华东供应商', '华南供应商', '华北供应商', '华中供应商']) + randomInt(1, 10),
      productName: randomItem(PRODUCTS),
      quantity: randomInt(50, 500),
      unitPrice: randomInt(50, 2000),
      totalAmount: amount,
      status: randomItem(['pending', 'pending', 'approved', 'ordered', 'received', 'completed']),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      deliveryDate: formatDate(new Date(createdAt.getTime() + randomInt(7, 60) * 86400000))
    })
  }
  return orders
}

/* ========== 库存种子数据 ========== */
export function generateInventoryItems(count = 40) {
  const items = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const stock = randomInt(0, 500)
    const safetyStock = randomInt(20, 100)
    items.push({
      id: generateId(),
      itemNo: `WL${String(20240001 + i)}`,
      name: randomItem(PRODUCTS) + '-' + randomInt(100, 999),
      category: randomItem(['电子元件', '机械零件', '液压元件', '气动元件', '标准件']),
      specification: `${randomInt(10, 100)}mm×${randomInt(10, 100)}mm`,
      unit: randomItem(['个', '套', '件', '米', '公斤']),
      warehouse: randomItem(['A1仓库', 'A2仓库', 'B1仓库', 'B2仓库']),
      stock,
      safetyStock,
      costPrice: randomInt(10, 1000),
      salePrice: randomInt(50, 2000),
      status: stock < safetyStock ? 'low' : stock === 0 ? 'exhausted' : 'normal',
      lastInboundDate: formatDate(randomDate(new Date(2024, 0, 1), now)),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    })
  }
  return items
}

/* ========== 回款种子数据 ========== */
export function generateCollections(customers, count = 40) {
  const collections = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const customer = randomItem(customers)
    const amount = randomInt(5000, 100000)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    collections.push({
      id: generateId(),
      collectionNo: `HK${now.getFullYear()}${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      amount,
      collectedAmount: Math.random() > 0.3 ? amount : Math.floor(amount * randomInt(3, 8) / 10),
      status: randomItem(['pending', 'pending', 'partial', 'collected', 'collected', 'overdue']),
      paymentMethod: randomItem(['银行转账', '支付宝', '微信', '现金', '承兑汇票']),
      dueDate: formatDate(new Date(createdAt.getTime() + 30 * 86400000)),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }
  return collections
}

/* ========== 送货单种子数据 ========== */
export function generateDeliveries(customers, count = 35) {
  const deliveries = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const customer = randomItem(customers)
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    deliveries.push({
      id: generateId(),
      deliveryNo: `GJXC-${now.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      address: customer.address,
      contact: customer.contact,
      phone: customer.phone,
      items: randomInt(1, 10),
      transportMethod: randomItem(['自有车辆', '第三方物流', '快递', '客户自提']),
      status: randomItem(['pending', 'shipped', 'shipped', 'transit', 'received', 'accepted', 'exception']),
      plannedDate: formatDate(createdAt),
      actualDate: formatDate(new Date(createdAt.getTime() + randomInt(1, 5) * 86400000)),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }
  return deliveries
}

/* ========== 待办种子数据 ========== */
export function generateTodos(count = 15) {
  const todos = []
  const now = new Date()
  const titles = [
    '跟进客户报价反馈', '确认采购订单交期', '处理客户投诉', '更新库存盘点',
    '准备月度销售报告', '审核合同条款', '安排产品发货', '回访老客户',
    '参加行业展会', '培训新员工', '优化供应商评估', '处理退货申请',
    '更新价格表', '确认对账单', '跟进应收账款'
  ]
  for (let i = 0; i < count; i++) {
    const createdAt = randomDate(new Date(2024, 0, 1), now)
    todos.push({
      id: generateId(),
      title: randomItem(titles),
      priority: randomItem(['high', 'medium', 'low']),
      status: randomItem(['pending', 'pending', 'pending', 'in_progress', 'completed']),
      category: randomItem(['sales', 'purchase', 'finance', 'warehouse']),
      dueDate: formatDate(new Date(createdAt.getTime() + randomInt(1, 14) * 86400000)),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }
  return todos
}

/* ========== 一键灌入所有种子数据 ========== */
export function seedAllStores(dataCenter) {
  console.info('[SeedData] 开始灌入种子数据...')

  const customers = generateCustomers(30)
  dataCenter.update('customer', null, customers, { batch: true, skipSync: true })

  const quotations = generateQuotations(customers, 50)
  dataCenter.update('quotation', null, quotations, { batch: true, skipSync: true })

  const contracts = generateContracts(customers, 30)
  dataCenter.update('contract', null, contracts, { batch: true, skipSync: true })

  const transactions = generateTransactions(customers, 60)
  dataCenter.update('transaction', null, transactions, { batch: true, skipSync: true })

  const purchases = generatePurchaseOrders(25)
  dataCenter.update('purchase', null, purchases, { batch: true, skipSync: true })

  const inventory = generateInventoryItems(40)
  dataCenter.update('inventory', null, inventory, { batch: true, skipSync: true })

  const collections = generateCollections(customers, 40)
  dataCenter.update('collection', null, collections, { batch: true, skipSync: true })

  const deliveries = generateDeliveries(customers, 35)
  dataCenter.update('delivery', null, deliveries, { batch: true, skipSync: true })

  const todos = generateTodos(15)
  dataCenter.update('todo', null, todos, { batch: true, skipSync: true })

  console.info('[SeedData] 种子数据灌入完成')
  return {
    customers: customers.length,
    quotations: quotations.length,
    contracts: contracts.length,
    transactions: transactions.length,
    purchases: purchases.length,
    inventory: inventory.length,
    collections: collections.length,
    deliveries: deliveries.length,
    todos: todos.length
  }
}
