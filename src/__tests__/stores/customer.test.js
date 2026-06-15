/**
 * 客户 Store 单元测试
 * 覆盖正常流程、标签管理、计算属性、导入功能、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createCustomer, createCustomers, createTag, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== Mock 依赖 ===== */
/* 用于 deleteCustomer 关联数据测试的可变 mock 数据 */
const _mockQuotationData = { quotations: [] }
const _mockContractData = { contracts: [] }
const _mockDeliveryData = { deliveries: [] }
const _mockCollectionData = { collections: [] }

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
  useQuotationStore: () => _mockQuotationData
}))

vi.mock('@/modules/sales/stores/contract', () => ({
  useContractStore: () => _mockContractData
}))

vi.mock('@/stores/delivery', () => ({
  useDeliveryStore: () => _mockDeliveryData
}))

vi.mock('@/modules/finance/stores/collection', () => ({
  useCollectionStore: () => _mockCollectionData
}))

/* 存储键常量 */
const STORAGE_KEY = 'gj_erp_customers'
const TAGS_KEY = 'gj_erp_customerTags'
const INIT_KEY = 'gj_erp_customers_initialized'

describe('客户 Store', () => {
  let store

  beforeEach(() => {
    resetCounter()
    clearStorage()
    setupPinia()
    store = useCustomerStore()
  })

  /* ==================== 1. 正常流程 ==================== */
  describe('正常流程', () => {
    it('addCustomer 添加有效客户数据', () => {
      const customer = store.addCustomer({
        fullName: '苏州冠久新材料科技有限公司',
        phone: '0512-66668888',
        region: '华东',
        level: 'A'
      })

      expect(customer.id).toMatch(/^c/)
      expect(customer.customerNo).toMatch(/^KH-\d{4}-\d{4}$/)
      expect(customer.fullName).toBe('苏州冠久新材料科技有限公司')
      expect(customer.level).toBe('A')
      expect(customer.status).toBe('active')
      expect(store.customers).toHaveLength(1)
    })

    it('addCustomer 自动生成 customerNo 格式为 KH-YYYY-NNNN', () => {
      const year = new Date().getFullYear()
      const customer = store.addCustomer({ fullName: '测试公司' })
      expect(customer.customerNo).toBe(`KH-${year}-0001`)
    })

    it('addCustomer 默认 level 为 B，status 为 active', () => {
      const customer = store.addCustomer({ fullName: '默认客户' })
      expect(customer.level).toBe('B')
      expect(customer.status).toBe('active')
    })

    it('updateCustomer 更新客户信息', () => {
      const customer = store.addCustomer({ fullName: '原始名称', phone: '021-11111111' })
      store.updateCustomer(customer.id, { fullName: '更新名称', level: 'A' })

      const updated = store.getCustomerById(customer.id)
      expect(updated.fullName).toBe('更新名称')
      expect(updated.level).toBe('A')
      expect(updated.updatedBy).toBe('管理员')
    })

    it('deleteCustomer 无关联数据时正常删除', () => {
      const customer = store.addCustomer({ fullName: '待删除客户' })
      expect(store.customers).toHaveLength(1)

      const result = store.deleteCustomer(customer.id)
      expect(result.success).toBe(true)
      expect(store.customers).toHaveLength(0)
    })

    it('getCustomerById 根据ID获取客户', () => {
      const customer = store.addCustomer({ fullName: '查找客户' })
      const found = store.getCustomerById(customer.id)
      expect(found).toBeDefined()
      expect(found.fullName).toBe('查找客户')
    })

    it('batchDelete 批量删除客户', () => {
      const c1 = store.addCustomer({ fullName: '客户1' })
      const c2 = store.addCustomer({ fullName: '客户2' })
      const c3 = store.addCustomer({ fullName: '客户3' })

      store.batchDelete([c1.id, c3.id])
      expect(store.customers).toHaveLength(1)
      expect(store.customers[0].id).toBe(c2.id)
    })

    it('batchUpdateLevel 批量更新客户等级', () => {
      const c1 = store.addCustomer({ fullName: '客户1', level: 'B' })
      const c2 = store.addCustomer({ fullName: '客户2', level: 'C' })
      const c3 = store.addCustomer({ fullName: '客户3', level: 'B' })

      store.batchUpdateLevel([c1.id, c2.id], 'A')
      expect(store.getCustomerById(c1.id).level).toBe('A')
      expect(store.getCustomerById(c2.id).level).toBe('A')
      expect(store.getCustomerById(c3.id).level).toBe('B')
    })
  })

  /* ==================== 2. 标签管理 ==================== */
  describe('标签管理', () => {
    it('addTag 添加标签', () => {
      const tag = createTag({ id: 'VIP', name: 'VIP', color: '#ef4444', group: '等级' })
      store.addTag(tag)
      expect(store.tags).toHaveLength(1)
      expect(store.tags[0].id).toBe('VIP')
    })

    it('deleteTag 删除标签并从客户中移除', () => {
      const tag = createTag({ id: 'tag1', name: '重要客户' })
      store.addTag(tag)

      const customer = store.addCustomer({ fullName: '标签客户', tags: ['tag1'] })
      store.deleteTag('tag1')

      expect(store.tags).toHaveLength(0)
      expect(store.getCustomerById(customer.id).tags).not.toContain('tag1')
    })

    it('updateTag 更新标签信息', () => {
      const tag = createTag({ id: 'tag1', name: '旧名称', color: '#000000' })
      store.addTag(tag)

      store.updateTag('tag1', { name: '新名称', color: '#ff0000' })
      expect(store.tags[0].name).toBe('新名称')
      expect(store.tags[0].color).toBe('#ff0000')
    })

    it('addTagToCustomer 为客户添加标签', () => {
      const tag = createTag({ id: 'tag1', name: 'VIP' })
      store.addTag(tag)

      const customer = store.addCustomer({ fullName: '标签客户' })
      const result = store.addTagToCustomer(customer.id, 'tag1')

      expect(result).toBe(true)
      expect(store.getCustomerById(customer.id).tags).toContain('tag1')
    })

    it('addTagToCustomer 标签不存在时返回 false', () => {
      const customer = store.addCustomer({ fullName: '标签客户' })
      const result = store.addTagToCustomer(customer.id, 'nonexistent')
      expect(result).toBe(false)
    })

    it('addTagToCustomer 不重复添加标签', () => {
      const tag = createTag({ id: 'tag1', name: 'VIP' })
      store.addTag(tag)

      const customer = store.addCustomer({ fullName: '标签客户', tags: ['tag1'] })
      store.addTagToCustomer(customer.id, 'tag1')

      expect(store.getCustomerById(customer.id).tags.filter(t => t === 'tag1')).toHaveLength(1)
    })

    it('removeTagFromCustomer 从客户中移除标签', () => {
      const tag = createTag({ id: 'tag1', name: 'VIP' })
      store.addTag(tag)

      const customer = store.addCustomer({ fullName: '标签客户', tags: ['tag1'] })
      store.removeTagFromCustomer(customer.id, 'tag1')

      expect(store.getCustomerById(customer.id).tags).not.toContain('tag1')
    })
  })

  /* ==================== 3. 计算属性 ==================== */
  describe('计算属性', () => {
    it('activeCount 统计活跃客户数量', () => {
      store.addCustomer({ fullName: '活跃1', status: 'active' })
      store.addCustomer({ fullName: '活跃2', status: 'active' })
      store.addCustomer({ fullName: '休眠1', status: 'dormant' })

      expect(store.activeCount).toBe(2)
    })

    it('dormantCount 统计休眠客户数量', () => {
      store.addCustomer({ fullName: '活跃1', status: 'active' })
      store.addCustomer({ fullName: '休眠1', status: 'dormant' })
      store.addCustomer({ fullName: '休眠2', status: 'dormant' })

      expect(store.dormantCount).toBe(2)
    })

    it('allRegions 返回所有不重复区域（排序）', () => {
      store.addCustomer({ fullName: '客户1', region: '华南' })
      store.addCustomer({ fullName: '客户2', region: '华东' })
      store.addCustomer({ fullName: '客户3', region: '华南' })
      store.addCustomer({ fullName: '客户4', region: '华北' })

      expect(store.allRegions).toEqual(['华东', '华北', '华南'])
    })

    it('allDepartments 返回所有不重复部门（排序）', () => {
      store.addCustomer({ fullName: '客户1', department: '采购部' })
      store.addCustomer({ fullName: '客户2', department: '技术部' })
      store.addCustomer({ fullName: '客户3', department: '采购部' })

      expect(store.allDepartments).toEqual(['技术部', '采购部'])
    })

    it('levelStats 统计各等级客户数量', () => {
      store.addCustomer({ fullName: 'A1', level: 'A' })
      store.addCustomer({ fullName: 'A2', level: 'A' })
      store.addCustomer({ fullName: 'B1', level: 'B' })
      store.addCustomer({ fullName: 'C1', level: 'C' })
      store.addCustomer({ fullName: 'C2', level: 'C' })
      store.addCustomer({ fullName: 'C3', level: 'C' })

      expect(store.levelStats).toEqual({ A: 2, B: 1, C: 3 })
    })

    it('totalBalance 计算所有客户余额总和', () => {
      store.addCustomer({ fullName: '客户1', balance: 100000 })
      store.addCustomer({ fullName: '客户2', balance: 200000 })
      store.addCustomer({ fullName: '客户3', balance: 50000 })

      expect(store.totalBalance).toBe(350000)
    })

    it('totalCreditLimit 计算所有客户信用额度总和', () => {
      store.addCustomer({ fullName: '客户1', creditLimit: 500000 })
      store.addCustomer({ fullName: '客户2', creditLimit: 300000 })

      expect(store.totalCreditLimit).toBe(800000)
    })

    it('空客户列表时计算属性返回零值', () => {
      expect(store.activeCount).toBe(0)
      expect(store.dormantCount).toBe(0)
      expect(store.allRegions).toEqual([])
      expect(store.allDepartments).toEqual([])
      expect(store.levelStats).toEqual({ A: 0, B: 0, C: 0 })
      expect(store.totalBalance).toBe(0)
      expect(store.totalCreditLimit).toBe(0)
    })
  })

  /* ==================== 4. 导入功能 ==================== */
  describe('导入功能', () => {
    it('importCustomers 导入有效数据', () => {
      const data = [
        { fullName: '导入客户1', phone: '021-11111111', region: '华东', level: 'A' },
        { fullName: '导入客户2', phone: '021-22222222', region: '华北', level: 'B' }
      ]

      const result = store.importCustomers(data)
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)
      expect(store.customers).toHaveLength(2)
    })

    it('importCustomers 重复数据应跳过（按 fullName+phone 去重）', () => {
      store.addCustomer({ fullName: '已存在客户', phone: '021-11111111' })

      const data = [
        { fullName: '已存在客户', phone: '021-11111111' },
        { fullName: '新客户', phone: '021-22222222' }
      ]

      const result = store.importCustomers(data)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
      expect(store.customers).toHaveLength(2)
    })

    it('importCustomers 导入空数据返回零', () => {
      const result = store.importCustomers([])
      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('importCustomers 跳过无 fullName/phone/contactName 的空行', () => {
      const data = [
        { fullName: '有效客户', phone: '021-11111111' },
        { fullName: '', phone: '', contactName: '' },
        { fullName: '另一有效客户', phone: '021-33333333' }
      ]

      const result = store.importCustomers(data)
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(1)
    })

    it('importCustomersBatch 批量导入数据', async () => {
      const data = createCustomers(10).map(c => ({
        fullName: c.fullName,
        phone: c.phone,
        region: c.region,
        level: c.level
      }))

      const result = await store.importCustomersBatch(data)
      expect(result.imported).toBe(10)
      expect(result.skipped).toBe(0)
      expect(store.customers).toHaveLength(10)
    })

    it('importCustomersBatch 支持进度回调', async () => {
      const data = createCustomers(3).map(c => ({
        fullName: c.fullName,
        phone: c.phone
      }))

      const onProgress = vi.fn()
      await store.importCustomersBatch(data, onProgress)

      expect(onProgress).toHaveBeenCalled()
    })

    it('importCustomersBatch 重复数据应跳过', async () => {
      store.addCustomer({ fullName: '已存在客户', phone: '021-11111111' })

      const data = [
        { fullName: '已存在客户', phone: '021-11111111' },
        { fullName: '新客户', phone: '021-22222222' }
      ]

      const result = await store.importCustomersBatch(data)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
    })
  })

  /* ==================== 5. 边界条件 ==================== */
  describe('边界条件', () => {
    it('deleteCustomer 有关联报价单时应删除失败', () => {
      const customer = store.addCustomer({ fullName: '关联客户' })
      /* 向 mock 数据中添加关联报价单 */
      _mockQuotationData.quotations = [{ customerId: customer.id, quoteNo: 'QT001' }]

      const result = store.deleteCustomer(customer.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain('报价单')

      /* 清理 mock 数据 */
      _mockQuotationData.quotations = []
    })

    it('deleteCustomer 有关联合同时应删除失败', () => {
      const customer = store.addCustomer({ fullName: '关联客户' })
      _mockContractData.contracts = [{ partyAId: customer.id, contractNo: 'HT001' }]

      const result = store.deleteCustomer(customer.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain('合同')

      _mockContractData.contracts = []
    })

    it('deleteCustomer 有关联送货单时应删除失败', () => {
      const customer = store.addCustomer({ fullName: '关联客户' })
      _mockDeliveryData.deliveries = [{ customerId: customer.id, deliveryNo: 'SH001' }]

      const result = store.deleteCustomer(customer.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain('送货单')

      _mockDeliveryData.deliveries = []
    })

    it('deleteCustomer 有关联回款记录时应删除失败', () => {
      const customer = store.addCustomer({ fullName: '关联客户' })
      _mockCollectionData.collections = [{ customerId: customer.id, collectionNo: 'HK001' }]

      const result = store.deleteCustomer(customer.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain('回款记录')

      _mockCollectionData.collections = []
    })

    it('addCustomer 最小数据添加', () => {
      const customer = store.addCustomer({})
      expect(customer.id).toMatch(/^c/)
      expect(customer.level).toBe('B')
      expect(customer.status).toBe('active')
      expect(customer.creditLimit).toBe(0)
      expect(customer.balance).toBe(0)
      expect(customer.tags).toEqual([])
    })

    it('addCustomer fullName 自动填充到 name', () => {
      const customer = store.addCustomer({ fullName: '全称公司' })
      expect(customer.name).toBe('全称公司')
    })

    it('addCustomer name 自动填充到 fullName', () => {
      const customer = store.addCustomer({ name: '简称公司' })
      expect(customer.fullName).toBe('简称公司')
    })

    it('空客户列表时操作不报错', () => {
      expect(() => store.batchDelete([])).not.toThrow()
      expect(() => store.batchUpdateLevel([], 'A')).not.toThrow()
    })

    it('generateCustomerNo 递增编号', () => {
      const no1 = store.generateCustomerNo()
      const no2 = store.generateCustomerNo()
      /* 编号应不同（因为 addCustomer 会消耗编号） */
      store.addCustomer({ fullName: '客户1' })
      const no3 = store.generateCustomerNo()
      expect(no1).not.toBe(no3)
    })
  })

  /* ==================== 6. 异常情况 ==================== */
  describe('异常情况', () => {
    it('updateCustomer 不存在的 id 不报错', () => {
      expect(() => store.updateCustomer('nonexistent-id', { fullName: '更新' })).not.toThrow()
      expect(store.customers).toHaveLength(0)
    })

    it('deleteCustomer 不存在的 id 返回成功', () => {
      const result = store.deleteCustomer('nonexistent-id')
      expect(result.success).toBe(true)
    })

    it('getCustomerById 不存在的 id 返回 undefined', () => {
      const result = store.getCustomerById('nonexistent-id')
      expect(result).toBeUndefined()
    })

    it('addTagToCustomer 不存在的客户 id 返回 false', () => {
      const tag = createTag({ id: 'tag1', name: 'VIP' })
      store.addTag(tag)
      const result = store.addTagToCustomer('nonexistent-id', 'tag1')
      expect(result).toBe(false)
    })

    it('removeTagFromCustomer 不存在的客户不报错', () => {
      expect(() => store.removeTagFromCustomer('nonexistent-id', 'tag1')).not.toThrow()
    })

    it('updateTag 不存在的 tagId 不报错', () => {
      expect(() => store.updateTag('nonexistent-tag', { name: '新名称' })).not.toThrow()
    })
  })

  /* ==================== 7. 数据持久化 ==================== */
  describe('数据持久化', () => {
    it('addCustomer 后 localStorage 已更新', () => {
      store.addCustomer({ fullName: '持久化客户', phone: '021-11111111' })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored).toHaveLength(1)
      expect(stored[0].fullName).toBe('持久化客户')
    })

    it('updateCustomer 后 localStorage 已更新', () => {
      const customer = store.addCustomer({ fullName: '原始名称' })
      store.updateCustomer(customer.id, { fullName: '更新名称' })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored[0].fullName).toBe('更新名称')
    })

    it('deleteCustomer 后 localStorage 已更新', () => {
      const customer = store.addCustomer({ fullName: '待删除' })
      store.deleteCustomer(customer.id)

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored).toHaveLength(0)
    })

    it('addTag 后 localStorage 已更新', () => {
      store.addTag(createTag({ id: 'tag1', name: 'VIP' }))

      const stored = JSON.parse(localStorage.getItem(TAGS_KEY))
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('tag1')
    })

    it('deleteTag 后 localStorage 已更新', () => {
      store.addTag(createTag({ id: 'tag1', name: 'VIP' }))
      store.deleteTag('tag1')

      const stored = JSON.parse(localStorage.getItem(TAGS_KEY))
      expect(stored).toHaveLength(0)
    })

    it('batchDelete 后 localStorage 已更新', () => {
      const c1 = store.addCustomer({ fullName: '客户1' })
      const c2 = store.addCustomer({ fullName: '客户2' })
      store.batchDelete([c1.id])

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored).toHaveLength(1)
    })

    it('batchUpdateLevel 后 localStorage 已更新', () => {
      const c1 = store.addCustomer({ fullName: '客户1', level: 'B' })
      store.batchUpdateLevel([c1.id], 'A')

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stored[0].level).toBe('A')
    })
  })

  /* ==================== 8. 种子数据 ==================== */
  describe('种子数据', () => {
    it('initSeedData 创建示例数据', () => {
      store.initSeedData()

      expect(store.customers.length).toBeGreaterThan(0)
      expect(store.tags.length).toBeGreaterThan(0)
    })

    it('initSeedData 只运行一次（有初始化标记后不再创建）', () => {
      store.initSeedData()
      const firstCount = store.customers.length
      const firstTags = store.tags.length

      /* 再次调用不应重复创建 */
      store.initSeedData()
      expect(store.customers.length).toBe(firstCount)
      expect(store.tags.length).toBe(firstTags)
    })

    it('initSeedData 设置初始化标记到 localStorage', () => {
      store.initSeedData()
      /* safeSetItem 会添加 gj_erp_ 前缀 */
      expect(localStorage.getItem('gj_erp_' + INIT_KEY)).toBe('1')
    })

    it('initSeedData 创建的客户包含必要字段', () => {
      store.initSeedData()

      store.customers.forEach(c => {
        expect(c.id).toBeTruthy()
        expect(c.customerNo).toBeTruthy()
        expect(c.fullName).toBeTruthy()
        expect(c.level).toMatch(/^[ABC]$/)
        expect(c.status).toBeTruthy()
      })
    })

    it('initSeedData 创建的标签包含必要字段', () => {
      store.initSeedData()

      store.tags.forEach(t => {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.color).toBeTruthy()
      })
    })
  })

  /* ==================== 9. 其他功能 ==================== */
  describe('其他功能', () => {
    it('replaceData 替换所有客户数据', () => {
      store.addCustomer({ fullName: '旧客户1' })
      store.addCustomer({ fullName: '旧客户2' })

      const newData = [createCustomer({ fullName: '新客户1' }), createCustomer({ fullName: '新客户2' })]
      store.replaceData(newData)

      expect(store.customers).toHaveLength(2)
      expect(store.customers[0].fullName).toBe('新客户1')
    })

    it('mergeRemoteItems 合并远程数据', () => {
      store.addCustomer({ fullName: '本地客户' })

      const remoteItems = [createCustomer({ fullName: '远程客户' })]
      store.mergeRemoteItems(remoteItems)

      /* 合并后应包含本地和远程数据 */
      expect(store.customers.length).toBeGreaterThanOrEqual(2)
    })

    it('mergeRemoteItems 传入非数组不报错', () => {
      expect(() => store.mergeRemoteItems(null)).not.toThrow()
      expect(() => store.mergeRemoteItems(undefined)).not.toThrow()
      expect(() => store.mergeRemoteItems('invalid')).not.toThrow()
    })
  })
})
