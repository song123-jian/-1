/**
 * 性能基准测试
 * PERF-01: 客户列表渲染 - 10k 客户初始化
 * PERF-02: 全文搜索 - 10k 客户搜索
 * PERF-03: 账龄分析 - 5k 应收账款
 * PERF-05: 版本重建 - 100 次修改
 * PERF-07: 同步引擎合并 - 10k + 10k
 * PERF-08: 工作流实例加载 - 5k 实例
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { benchmark } from '@/__tests__/utils/perfTracker'
import {
  generateCustomers,
  generateReceivables,
  generateWorkflowInstance,
  resetIdCounter
} from '@/__tests__/fixtures/dataGenerator'
import { mergeArrays } from '@/utils/conflictResolver'
import versionControl from '@/utils/versionControl'

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
    roleName: '管理员',
    currentRole: '管理员',
    isLoggedIn: true
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

/* 注意：不 mock collection store，PERF-03 需要真实的 collectionStore */
/* customerStore.deleteCustomer 内部引用的 collectionStore 也需要真实实例 */

vi.mock('@/lib/supabase.js', () => ({
  SupabaseClient: { from: vi.fn() }
}))

vi.mock('@/services/api.js', () => ({
  API: { get: vi.fn(), post: vi.fn() }
}))

/* mock eventBus 以避免版本控制器副作用 */
vi.mock('@/utils/eventBus', () => ({
  default: {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn()
  },
  DataEvents: {
    UPDATED: 'data:updated',
    CREATED: 'data:created',
    DELETED: 'data:deleted',
    VERSION_CREATED: 'version:created',
    VERSION_RESTORED: 'version:restored'
  }
}))

describe('性能基准测试', () => {
  let customerStore, collectionStore

  beforeEach(() => {
    resetIdCounter()
    clearStorage()
    setupPinia()
    customerStore = useCustomerStore()
    collectionStore = useCollectionStore()
  })

  describe('PERF-01: 客户列表初始化 - 10k 客户', () => {
    it('10k 客户 store 初始化应在 3s 内完成', () => {
      const customers = generateCustomers(10000)

      const result = benchmark(
        'PERF-01: 10k客户初始化',
        () => {
          customerStore.replaceData([...customers])
          // 触发计算属性
          const _ = customerStore.activeCount
          const __ = customerStore.totalBalance
          const ___ = customerStore.levelStats
        },
        3000,
        3
      )

      expect(result.passed).toBe(true)
      expect(customerStore.customers.length).toBe(10000)
    })
  })

  describe('PERF-02: 全文搜索 - 10k 客户', () => {
    it('10k 客户中搜索应在 500ms 内完成', () => {
      const customers = generateCustomers(10000)
      customerStore.replaceData(customers)

      // 预定义搜索关键词
      const searchTerms = ['测试', '华东', 'A', '客户_5', 'nonexistent_xyz']

      const result = benchmark(
        'PERF-02: 10k客户全文搜索',
        () => {
          for (const term of searchTerms) {
            customerStore.customers.filter(c =>
              (c.name && c.name.includes(term)) ||
              (c.phone && c.phone.includes(term)) ||
              (c.email && c.email.includes(term)) ||
              (c.region && c.region.includes(term))
            )
          }
        },
        500,
        3
      )

      expect(result.passed).toBe(true)
    })
  })

  describe('PERF-03: 账龄分析 - 5k 应收账款', () => {
    it('5k 应收账款的账龄分析应在 200ms 内完成', () => {
      // 生成5k客户
      const customers = generateCustomers(500)
      // 生成5k应收账款
      const receivables = generateReceivables(5000)

      // 添加一些回款记录
      for (let i = 0; i < 200; i++) {
        collectionStore.addCollection({
          customerId: customers[i % customers.length].id,
          customerName: customers[i % customers.length].name,
          amount: 5000 + Math.random() * 10000,
          method: 'bank_transfer'
        })
      }

      const result = benchmark(
        'PERF-03: 5k应收账款账龄分析',
        () => {
          collectionStore.computeAgingData(customers, receivables)
        },
        200,
        3
      )

      expect(result.passed).toBe(true)
    })
  })

  describe('PERF-05: 版本重建 - 100 次修改', () => {
    it('100 次修改后版本重建应在 100ms 内完成', () => {
      const vc = versionControl

      const moduleId = 'perf_test'
      const itemId = 'perf_item_001'

      // 记录初始版本
      const initialData = { id: itemId, name: '初始客户', balance: 0, status: 'active' }
      vc.recordVersion(moduleId, itemId, null, initialData, { action: 'create', user: 'test' })

      // 模拟100次修改
      for (let i = 0; i < 100; i++) {
        const oldData = { id: itemId, name: `客户_v${i}`, balance: i * 100, status: 'active' }
        const newData = { id: itemId, name: `客户_v${i + 1}`, balance: (i + 1) * 100, status: i % 3 === 0 ? 'dormant' : 'active' }
        vc.recordVersion(moduleId, itemId, oldData, newData, { action: 'update', user: 'test' })
      }

      // 获取所有版本
      const versions = vc.getVersions(moduleId, itemId)
      expect(versions.length).toBeGreaterThan(0)

      // 测量重建性能 - 选择中间版本
      const targetVersionId = versions[Math.floor(versions.length / 2)].id

      const result = benchmark(
        'PERF-05: 100次修改版本重建',
        () => {
          vc._reconstructData(moduleId, itemId, targetVersionId)
        },
        100,
        3
      )

      expect(result.passed).toBe(true)
    })
  })

  describe('PERF-07: 同步引擎合并 - 10k + 10k', () => {
    it('10k 本地 + 10k 远程数据合并应在 2s 内完成', () => {
      const localItems = generateCustomers(10000)
      const remoteItems = generateCustomers(10000)

      // 让部分 id 重叠以测试冲突解决
      for (let i = 0; i < 2000; i++) {
        remoteItems[i].id = localItems[i].id
        remoteItems[i].updatedAt = new Date(Date.now() + 1000).toISOString() // 远端更新
      }

      const result = benchmark(
        'PERF-07: 10k+10k同步合并',
        () => {
          mergeArrays([...localItems], [...remoteItems], 'id')
        },
        2000,
        3
      )

      expect(result.passed).toBe(true)

      // 验证合并结果正确性
      const merged = mergeArrays(localItems, remoteItems, 'id')
      // 8000 unique remote + 2000 overlapping (resolved) + 8000 unique local = 18000
      expect(merged.length).toBe(18000)
    })
  })

  describe('PERF-08: 工作流实例加载 - 5k 实例', () => {
    it('5k 工作流实例从 localStorage 加载应在 500ms 内完成', () => {
      // 生成5k工作流实例并存入 localStorage
      const instances = Array.from({ length: 5000 }, () => generateWorkflowInstance())
      const storageKey = 'gj_erp_workflowInstances'
      localStorage.setItem(storageKey, JSON.stringify(instances))

      const result = benchmark(
        'PERF-08: 5k工作流实例加载',
        () => {
          const raw = localStorage.getItem(storageKey)
          const arr = JSON.parse(raw)
          const map = new Map()
          arr.forEach(inst => map.set(inst.id, inst))
        },
        500,
        3
      )

      expect(result.passed).toBe(true)

      // 验证数据完整性
      const raw = localStorage.getItem(storageKey)
      const arr = JSON.parse(raw)
      expect(arr.length).toBe(5000)
    })
  })
})
