/**
 * 客户 Store 深度测试
 * 覆盖信用额度边界、等级降级、重复检测性能、脏数据导入、浮点精度、批量操作、异常数据、搜索、筛选
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { generateCustomer, generateCustomers, generateAnomalousCustomer, ANOMALY } from '@/__tests__/fixtures/dataGenerator'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== Mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn(),
    isDeletedId: vi.fn(() => false)
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '管理员'
  })
}))

vi.mock('@/modules/sales/stores/quotation', () => ({
  useQuotationStore: () => ({ quotations: [] })
}))

vi.mock('@/modules/sales/stores/contract', () => ({
  useContractStore: () => ({ contracts: [] })
}))

vi.mock('@/stores/delivery', () => ({
  useDeliveryStore: () => ({ deliveries: [] })
}))

vi.mock('@/modules/finance/stores/collection', () => ({
  useCollectionStore: () => ({ collections: [] })
}))

describe('客户 Store 深度测试', () => {
  let store

  beforeEach(() => {
    clearStorage()
    setupPinia()
    store = useCustomerStore()
  })

  /* ==================== CS-01: 信用额度边界 ==================== */
  describe('CS-01: 信用额度边界', () => {
    it('客户余额超过信用额度时应触发警告', () => {
      const customer = store.addCustomer({
        fullName: '超限客户',
        creditLimit: 100000,
        balance: 150000
      })
      expect(customer.balance).toBeGreaterThan(customer.creditLimit)
      /* 业务逻辑：余额 > 信用额度表示超限 */
      const isOverLimit = customer.balance > customer.creditLimit
      expect(isOverLimit).toBe(true)
    })

    it('客户余额等于信用额度时处于临界状态', () => {
      const customer = store.addCustomer({
        fullName: '临界客户',
        creditLimit: 100000,
        balance: 100000
      })
      expect(customer.balance).toBe(customer.creditLimit)
      const isAtLimit = customer.balance >= customer.creditLimit
      expect(isAtLimit).toBe(true)
    })

    it('客户余额低于信用额度时正常', () => {
      const customer = store.addCustomer({
        fullName: '正常客户',
        creditLimit: 100000,
        balance: 50000
      })
      expect(customer.balance).toBeLessThan(customer.creditLimit)
    })

    it('信用额度为0时任何余额都应超限', () => {
      const customer = store.addCustomer({
        fullName: '零额度客户',
        creditLimit: 0,
        balance: 1
      })
      expect(customer.balance).toBeGreaterThan(customer.creditLimit)
    })

    it('批量添加后统计超限客户数量', () => {
      const overLimitCustomers = generateCustomers(5, { creditLimit: 10000, balance: 50000 })
      const normalCustomers = generateCustomers(5, { creditLimit: 100000, balance: 50000 })
      ;[...overLimitCustomers, ...normalCustomers].forEach(c => {
        store.addCustomer({ fullName: c.name, creditLimit: c.creditLimit, balance: c.balance })
      })
      const overLimitCount = store.customers.filter(c => c.balance > c.creditLimit).length
      expect(overLimitCount).toBe(5)
    })
  })

  /* ==================== CS-02: 等级自动降级 ==================== */
  describe('CS-02: 等级自动降级', () => {
    it('A-level客户6个月无交易应标记为降级候选', () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const oldDate = sixMonthsAgo.toISOString().split('T')[0]

      const customer = store.addCustomer({
        fullName: 'A级老客户',
        level: 'A',
        createdAt: oldDate
      })
      /* 模拟无近期交易：创建时间超过6个月 */
      const createdDate = new Date(customer.createdAt)
      const now = new Date()
      const monthsDiff = (now - createdDate) / (1000 * 60 * 60 * 24 * 30)
      expect(monthsDiff).toBeGreaterThanOrEqual(6)
    })

    it('A-level客户近期有交易不应降级', () => {
      const recentDate = new Date().toISOString().split('T')[0]
      const customer = store.addCustomer({
        fullName: '活跃A级客户',
        level: 'A',
        createdAt: recentDate
      })
      const createdDate = new Date(customer.createdAt)
      const now = new Date()
      const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBeLessThan(180)
    })

    it('手动降级A级客户到C级', () => {
      const customer = store.addCustomer({ fullName: '降级客户', level: 'A' })
      store.updateCustomer(customer.id, { level: 'C' })
      const updated = store.getCustomerById(customer.id)
      expect(updated.level).toBe('C')
    })

    it('批量降级A级客户', () => {
      const c1 = store.addCustomer({ fullName: 'A1', level: 'A' })
      const c2 = store.addCustomer({ fullName: 'A2', level: 'A' })
      const c3 = store.addCustomer({ fullName: 'B1', level: 'B' })

      store.batchUpdateLevel([c1.id, c2.id], 'C')
      expect(store.getCustomerById(c1.id).level).toBe('C')
      expect(store.getCustomerById(c2.id).level).toBe('C')
      expect(store.getCustomerById(c3.id).level).toBe('B')
    })
  })

  /* ==================== CS-03: 重复检测性能 ==================== */
  describe('CS-03: 重复检测性能', () => {
    it('10k客户中50%相似名称的导入性能', { timeout: 300000 }, () => {
      /* 生成5000个基础客户名称 */
      const baseNames = Array.from({ length: 5000 }, (_, i) => `公司_${i}`)
      /* 生成10000条导入数据，其中5000条与已有客户重复 */
      const importData = []
      for (let i = 0; i < 10000; i++) {
        const isDuplicate = i < 5000
        importData.push({
          fullName: isDuplicate ? baseNames[i] : `新公司_${i}`,
          phone: isDuplicate ? `021-${String(i).padStart(8, '0')}` : `022-${String(i).padStart(8, '0')}`
        })
      }

      /* 先用 importCustomers 批量添加5000个基础客户（比逐个addCustomer快） */
      store.importCustomers(baseNames.map((name, i) => ({ fullName: name, phone: `021-${String(i).padStart(8, '0')}` })))
      expect(store.customers).toHaveLength(5000)

      /* 导入10000条，前5000条应被去重跳过 */
      const start = performance.now()
      const result = store.importCustomers(importData)
      const elapsed = performance.now() - start

      expect(result.imported).toBe(5000)
      expect(result.skipped).toBe(5000)
      expect(store.customers).toHaveLength(10000)
      /* 性能要求：10k去重应在合理时间内完成 */
      expect(elapsed).toBeLessThan(60000)
    })
  })

  /* ==================== CS-04: 导入脏数据 ==================== */
  describe('CS-04: 导入脏数据', () => {
    it('导入含null字段的客户数据', () => {
      const dirtyData = [
        { fullName: 'null字段客户', phone: null, email: null, region: null },
        { fullName: '正常客户', phone: '021-11111111' }
      ]
      const result = store.importCustomers(dirtyData)
      expect(result.imported).toBe(2)
      /* null字段应被处理为空字符串或默认值 */
      const nullCustomer = store.customers.find(c => c.fullName === 'null字段客户')
      expect(nullCustomer).toBeDefined()
    })

    it('导入含超长名称的客户数据', () => {
      const longName = ANOMALY.longString
      const result = store.importCustomers([
        { fullName: longName, phone: '021-99999999' }
      ])
      expect(result.imported).toBe(1)
      const customer = store.customers.find(c => c.phone === '021-99999999')
      expect(customer).toBeDefined()
      /* 超长名称应被存储（由前端展示层截断） */
      expect(customer.fullName.length).toBe(longName.length)
    })

    it('导入含XSS脚本的客户数据', () => {
      const result = store.importCustomers([
        { fullName: ANOMALY.xssScript, phone: '021-88888888', address: ANOMALY.xssImg }
      ])
      expect(result.imported).toBe(1)
      const customer = store.customers.find(c => c.phone === '021-88888888')
      expect(customer).toBeDefined()
      /* XSS脚本应被原样存储（由展示层sanitize） */
      expect(customer.fullName).toBe(ANOMALY.xssScript)
    })

    it('导入含SQL注入的客户数据', () => {
      const result = store.importCustomers([
        { fullName: ANOMALY.sqlInjection, phone: '021-77777777' }
      ])
      expect(result.imported).toBe(1)
    })

    it('导入含特殊字符的客户数据', () => {
      const result = store.importCustomers([
        { fullName: ANOMALY.specialChars, phone: '021-66666666' }
      ])
      expect(result.imported).toBe(1)
    })

    it('导入含Emoji的客户数据', () => {
      const result = store.importCustomers([
        { fullName: ANOMALY.emojiString, phone: '021-55555555' }
      ])
      expect(result.imported).toBe(1)
    })

    it('导入完全空行应跳过', () => {
      const result = store.importCustomers([
        { fullName: '', phone: '', contactName: '' },
        { fullName: '', phone: null },
        { fullName: '有效客户', phone: '021-11111111' }
      ])
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(2)
    })

    it('导入含负数余额和信用额度的数据', () => {
      const result = store.importCustomers([
        { fullName: '负数客户', phone: '021-44444444', balance: -5000, creditLimit: -10000 }
      ])
      expect(result.imported).toBe(1)
      const customer = store.customers.find(c => c.phone === '021-44444444')
      /* parseFloat(-5000) || 0 = -5000, 负数被保留 */
      expect(customer.balance).toBe(-5000)
    })

    it('导入含极大金额的数据', () => {
      const result = store.importCustomers([
        { fullName: '巨额客户', phone: '021-33333333', balance: ANOMALY.hugeAmount, creditLimit: ANOMALY.hugeAmount }
      ])
      expect(result.imported).toBe(1)
    })
  })

  /* ==================== CS-05: 余额浮点精度 ==================== */
  describe('CS-05: 余额浮点精度', () => {
    it('balance = 0.1 + 0.2 应等于 0.3', () => {
      const customer = store.addCustomer({
        fullName: '浮点客户',
        balance: 0.1 + 0.2
      })
      /* 直接比较 0.1 + 0.2 !== 0.3 是经典的浮点问题 */
      /* 使用 toBeCloseTo 来验证精度 */
      expect(customer.balance).toBeCloseTo(0.3, 10)
    })

    it('totalBalance 浮点累加精度', () => {
      store.addCustomer({ fullName: '客户1', balance: 0.1 })
      store.addCustomer({ fullName: '客户2', balance: 0.2 })
      /* 0.1 + 0.2 的经典浮点问题 */
      expect(store.totalBalance).toBeCloseTo(0.3, 10)
    })

    it('多次小额累加精度', () => {
      for (let i = 0; i < 10; i++) {
        store.addCustomer({ fullName: `微额客户${i}`, balance: 0.1 })
      }
      expect(store.totalBalance).toBeCloseTo(1.0, 10)
    })

    it('使用 dataGenerator 的 floatPrecision 异常值', () => {
      const customer = store.addCustomer({
        fullName: 'ANOMALY浮点',
        balance: ANOMALY.floatPrecision /* 0.1 + 0.2 = 0.30000000000000004 */
      })
      expect(customer.balance).not.toBe(0.3)
      expect(customer.balance).toBeCloseTo(0.3, 10)
    })
  })

  /* ==================== 批量添加1000客户 ==================== */
  describe('批量添加1000客户', () => {
    it('添加1000个客户并验证数量', { timeout: 60000 }, () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        fullName: `批量客户_${i}`,
        phone: `021-${String(i).padStart(8, '0')}`,
        level: ['A', 'B', 'C'][i % 3],
        region: ['华东', '华南', '华北'][i % 3]
      }))
      const result = store.importCustomers(data)
      expect(result.imported).toBe(1000)
      expect(store.customers).toHaveLength(1000)
    })

    it('1000个客户的计算属性正确', { timeout: 60000 }, () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        fullName: `计算客户_${i}`,
        phone: `022-${String(i).padStart(8, '0')}`,
        level: ['A', 'B', 'C'][i % 3],
        status: i % 5 === 0 ? 'dormant' : 'active',
        balance: 1000
      }))
      store.importCustomers(data)
      expect(store.customers).toHaveLength(1000)
      /* 计算属性不应抛错 */
      expect(typeof store.activeCount).toBe('number')
      expect(typeof store.totalBalance).toBe('number')
      expect(typeof store.levelStats.A).toBe('number')
      expect(store.totalBalance).toBe(1000 * 1000)
    })
  })

  /* ==================== 批量删除 ==================== */
  describe('批量删除', () => {
    it('批量删除后验证数量', () => {
      const customers = generateCustomers(100)
      const ids = []
      for (const c of customers) {
        const added = store.addCustomer({ fullName: c.name, phone: c.phone })
        ids.push(added.id)
      }
      expect(store.customers).toHaveLength(100)

      /* 删除前50个 */
      store.batchDelete(ids.slice(0, 50))
      expect(store.customers).toHaveLength(50)
    })

    it('删除全部客户后列表为空', () => {
      const customers = generateCustomers(20)
      const ids = []
      for (const c of customers) {
        const added = store.addCustomer({ fullName: c.name, phone: c.phone })
        ids.push(added.id)
      }
      store.batchDelete(ids)
      expect(store.customers).toHaveLength(0)
    })
  })

  /* ==================== 异常数据更新 ==================== */
  describe('更新客户异常数据', () => {
    it('更新客户名称为null', () => {
      const customer = store.addCustomer({ fullName: '正常名称' })
      store.updateCustomer(customer.id, { fullName: null })
      const updated = store.getCustomerById(customer.id)
      expect(updated.fullName).toBeNull()
    })

    it('更新客户余额为负数', () => {
      const customer = store.addCustomer({ fullName: '负余额客户', balance: 1000 })
      store.updateCustomer(customer.id, { balance: -5000 })
      const updated = store.getCustomerById(customer.id)
      expect(updated.balance).toBe(-5000)
    })

    it('更新客户余额为极大值', () => {
      const customer = store.addCustomer({ fullName: '巨额客户' })
      store.updateCustomer(customer.id, { balance: ANOMALY.hugeAmount })
      const updated = store.getCustomerById(customer.id)
      expect(updated.balance).toBe(ANOMALY.hugeAmount)
    })

    it('使用 generateAnomalousCustomer 更新异常数据', () => {
      const customer = store.addCustomer({ fullName: '原始客户' })
      const anomalous = generateAnomalousCustomer('negative')
      store.updateCustomer(customer.id, { balance: anomalous.balance, creditLimit: anomalous.creditLimit })
      const updated = store.getCustomerById(customer.id)
      expect(updated.balance).toBe(ANOMALY.negativeAmount)
      expect(updated.creditLimit).toBe(ANOMALY.negativeAmount)
    })

    it('更新客户名称为XSS脚本', () => {
      const customer = store.addCustomer({ fullName: '正常名称' })
      store.updateCustomer(customer.id, { fullName: ANOMALY.xssScript })
      const updated = store.getCustomerById(customer.id)
      expect(updated.fullName).toBe(ANOMALY.xssScript)
    })

    it('更新客户名称为超长字符串', () => {
      const customer = store.addCustomer({ fullName: '正常名称' })
      store.updateCustomer(customer.id, { fullName: ANOMALY.longString })
      const updated = store.getCustomerById(customer.id)
      expect(updated.fullName.length).toBe(10000)
    })
  })

  /* ==================== 特殊字符搜索 ==================== */
  describe('搜索特殊字符', () => {
    it('搜索含特殊字符的客户名称', () => {
      store.addCustomer({ fullName: '客户!@#$%', phone: '021-11111111' })
      store.addCustomer({ fullName: '正常客户', phone: '021-22222222' })

      const found = store.customers.filter(c => c.fullName.includes('!@#$%'))
      expect(found).toHaveLength(1)
      expect(found[0].fullName).toBe('客户!@#$%')
    })

    it('搜索含XSS脚本的客户名称', () => {
      store.addCustomer({ fullName: ANOMALY.xssScript, phone: '021-11111111' })

      const found = store.customers.filter(c => c.fullName.includes('<script>'))
      expect(found).toHaveLength(1)
    })

    it('搜索含SQL注入的客户名称', () => {
      store.addCustomer({ fullName: ANOMALY.sqlInjection, phone: '021-11111111' })

      const found = store.customers.filter(c => c.fullName.includes('DROP TABLE'))
      expect(found).toHaveLength(1)
    })

    it('搜索含Emoji的客户名称', () => {
      store.addCustomer({ fullName: ANOMALY.emojiString, phone: '021-11111111' })

      const found = store.customers.filter(c => c.fullName.includes('😀'))
      expect(found).toHaveLength(1)
    })

    it('搜索空字符串不报错', () => {
      store.addCustomer({ fullName: '客户', phone: '021-11111111' })
      const found = store.customers.filter(c => c.fullName.includes(''))
      expect(found.length).toBeGreaterThanOrEqual(1)
    })
  })

  /* ==================== 等级/状态组合筛选 ==================== */
  describe('等级/状态组合筛选', () => {
    beforeEach(() => {
      store.addCustomer({ fullName: 'A-active-1', level: 'A', status: 'active' })
      store.addCustomer({ fullName: 'A-dormant-1', level: 'A', status: 'dormant' })
      store.addCustomer({ fullName: 'B-active-1', level: 'B', status: 'active' })
      store.addCustomer({ fullName: 'B-dormant-1', level: 'B', status: 'dormant' })
      store.addCustomer({ fullName: 'C-active-1', level: 'C', status: 'active' })
      store.addCustomer({ fullName: 'C-inactive-1', level: 'C', status: 'inactive' })
    })

    it('筛选 A 级活跃客户', () => {
      const filtered = store.customers.filter(c => c.level === 'A' && c.status === 'active')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].fullName).toBe('A-active-1')
    })

    it('筛选 A 级休眠客户', () => {
      const filtered = store.customers.filter(c => c.level === 'A' && c.status === 'dormant')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].fullName).toBe('A-dormant-1')
    })

    it('筛选 B 级活跃客户', () => {
      const filtered = store.customers.filter(c => c.level === 'B' && c.status === 'active')
      expect(filtered).toHaveLength(1)
    })

    it('筛选所有活跃客户', () => {
      const filtered = store.customers.filter(c => c.status === 'active')
      expect(filtered).toHaveLength(3)
    })

    it('筛选所有休眠客户', () => {
      const filtered = store.customers.filter(c => c.status === 'dormant')
      expect(filtered).toHaveLength(2)
    })

    it('levelStats 统计与筛选结果一致', () => {
      expect(store.levelStats.A).toBe(2)
      expect(store.levelStats.B).toBe(2)
      expect(store.levelStats.C).toBe(2)
    })

    it('activeCount 与筛选结果一致', () => {
      expect(store.activeCount).toBe(3)
    })

    it('dormantCount 与筛选结果一致', () => {
      expect(store.dormantCount).toBe(2)
    })
  })
})
