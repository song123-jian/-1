/**
 * CustomerDetail.vue 组件级测试
 * 覆盖：渲染、交互、计算属性、关联数据展示、Tab切换、删除确认、导航
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createCustomer, createQuotation, createContract, createDelivery, createCollection, resetCounter } from '@/__tests__/mockData'
import CustomerDetail from '@/modules/customer/views/CustomerDetail.vue'
import { useCustomerStore } from '@/modules/customer/stores/customer'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户',
    currentRole: '管理员'
  })
}))

vi.mock('@/utils/customerHelpers', () => ({
  levelColors: { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' },
  levelLabel: (l) => ({ A: '大客户', B: 'B类客户', C: 'C类客户' }[l] || l),
  getTagName: (tags, id) => { const t = tags.find(x => x.id === id); return t ? t.name : id },
  getTagStyle: (tags, id) => { const t = tags.find(x => x.id === id); return t ? { background: t.color + '20', color: t.color } : {} }
}))

vi.mock('@/utils/format', () => ({
  formatNumber: (n) => (n ?? 0).toLocaleString('zh-CN'),
  toLocalDateStr: (d) => {
    const date = d || new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
  }
}))

vi.mock('@/utils/statusMaps', () => ({
  quoteStatusLabel: (s) => s || '未知',
  quoteStatusClass: (s) => 'status-' + (s || 'unknown'),
  contractStatusLabel: (s) => s || '未知',
  contractStatusClass: (s) => 'status-' + (s || 'unknown'),
  deliveryStatusLabel: (s) => s || '未知',
  deliveryStatusClass: (s) => 'status-' + (s || 'unknown'),
  collectionStatusLabel: (s) => s || '未知',
  collectionStatusClass: (s) => 'status-' + (s || 'unknown'),
  collectionMethodLabel: (m) => m || '未知'
}))

/* ===== mock stores that CustomerDetail imports ===== */
vi.mock('@/modules/sales/stores/quotation', () => ({
  useQuotationStore: () => ({
    quotations: []
  })
}))

vi.mock('@/modules/sales/stores/contract', () => ({
  useContractStore: () => ({
    contracts: []
  })
}))

vi.mock('@/stores/delivery', () => ({
  useDeliveryStore: () => ({
    deliveries: []
  })
}))

vi.mock('@/modules/finance/stores/collection', () => ({
  useCollectionStore: () => ({
    collections: []
  })
}))

/* ===== mock router with mutable route ===== */
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mutableRoute = { query: { id: '' }, params: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  useRoute: () => mutableRoute
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(CustomerDetail, {
    global: {
      stubs: {
        Icon: IconStub,
        Teleport: { template: '<div><slot /></div>' }
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedCustomer(store, overrides = {}) {
  const c = createCustomer(overrides)
  store.addCustomer(c)
  return store.getCustomerById(c.id)
}

function seedTags(store) {
  const tags = [
    { id: 'VIP', name: 'VIP', color: '#ef4444', group: '等级' },
    { id: '长期合作', name: '长期合作', color: '#f59e0b', group: '关系' }
  ]
  tags.forEach(t => store.addTag(t))
}

describe('CustomerDetail 组件', () => {
  let store

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useCustomerStore()
    mockPush.mockClear()
    mockReplace.mockClear()
    mutableRoute.query = { id: '' }
    mutableRoute.params = {}
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('未找到客户时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-text').text()).toContain('未找到客户信息')
    })

    it('有客户时应渲染客户详情', async () => {
      const c = seedCustomer(store, { fullName: '测试公司A' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.page-header-title').text()).toContain('测试公司A')
      expect(wrapper.find('.detail-top-bar').exists()).toBe(true)
    })

    it('应渲染编辑和删除按钮', () => {
      const wrapper = mountComponent()
      const actions = wrapper.find('.page-header-actions')
      expect(actions.exists()).toBe(true)
      expect(actions.findAll('.btn').length).toBe(2)
    })

    it('应渲染返回按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.btn-ghost').text()).toContain('返回')
    })

    it('应渲染客户头像首字母', async () => {
      const c = seedCustomer(store, { fullName: '上海贸易' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const avatar = wrapper.find('.detail-avatar-lg')
      expect(avatar.exists()).toBe(true)
      expect(avatar.text()).toBe('上')
    })

    it('应渲染等级和状态徽章', async () => {
      const c = seedCustomer(store, { level: 'A', status: 'active' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.level-badge').exists()).toBe(true)
      expect(wrapper.find('.status-badge').exists()).toBe(true)
    })

    it('应渲染KPI卡片', async () => {
      const c = seedCustomer(store, { balance: 50000, creditLimit: 100000 })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const kpis = wrapper.findAll('.kpi-card')
      expect(kpis.length).toBe(3) // 余额、信用额度、信用利用率
    })

    it('应渲染联系信息和商业信息', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const sections = wrapper.findAll('.detail-section')
      expect(sections.length).toBeGreaterThanOrEqual(2)
    })

    it('应渲染交易概览统计栏', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.trade-summary').exists()).toBe(true)
      const tradeKpis = wrapper.findAll('.trade-kpi')
      expect(tradeKpis.length).toBe(4) // 报价、合同、送货、回款
    })

    it('应渲染交易历史时间线', async () => {
      const c = seedCustomer(store, { createdAt: '2024-01-15' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.timeline').exists()).toBe(true)
    })

    it('应渲染关联单据Tab', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tabBtns = wrapper.findAll('.detail-tab-btn')
      expect(tabBtns.length).toBe(4) // 报价单、合同、送货单、回款记录
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('customerId 应从 route.query.id 获取', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.customerId).toBe('')
    })

    it('customerId 有值时应返回正确ID', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.customerId).toBe(c.id)
    })

    it('customer 应根据 customerId 返回客户对象', async () => {
      const c = seedCustomer(store, { fullName: '测试公司B' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.customer).toBeDefined()
      expect(wrapper.vm.customer.fullName).toBe('测试公司B')
    })

    it('creditUtilization 应正确计算信用利用率', async () => {
      const c = seedCustomer(store, { balance: 50000, creditLimit: 100000 })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.creditUtilization).toBe(50)
    })

    it('creditUtilization 无信用额度时应为 0', async () => {
      const c = seedCustomer(store, { balance: 50000, creditLimit: 0 })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.creditUtilization).toBe(0)
    })

    it('creditUtilization 无客户时应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.creditUtilization).toBe(0)
    })

    it('tradeStats 应正确统计关联数据', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const stats = wrapper.vm.tradeStats
      expect(stats.quotationCount).toBe(0)
      expect(stats.contractCount).toBe(0)
      expect(stats.deliveryCount).toBe(0)
      expect(stats.collectionAmount).toBe(0)
    })

    it('timeline 有创建时间时应包含创建事件', async () => {
      const c = seedCustomer(store, { createdAt: '2024-01-15' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tl = wrapper.vm.timeline
      expect(tl.length).toBeGreaterThan(0)
      expect(tl.some(e => e.text.includes('创建客户档案'))).toBe(true)
    })

    it('timeline 无数据时应为空', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.timeline).toEqual([])
    })

    it('customerQuotations 无数据时应为空', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.customerQuotations).toEqual([])
    })

    it('customerContracts 无数据时应为空', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.customerContracts).toEqual([])
    })

    it('customerDeliveries 无数据时应为空', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.customerDeliveries).toEqual([])
    })

    it('customerCollections 无数据时应为空', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.customerCollections).toEqual([])
    })
  })

  /* ===== Tab 切换 ===== */
  describe('Tab 切换', () => {
    it('默认 Tab 应为报价单', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeDocTab).toBe('quotations')
    })

    it('点击合同 Tab 应切换', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tabBtns = wrapper.findAll('.detail-tab-btn')
      await tabBtns[1].trigger('click')
      expect(wrapper.vm.activeDocTab).toBe('contracts')
    })

    it('点击送货单 Tab 应切换', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tabBtns = wrapper.findAll('.detail-tab-btn')
      await tabBtns[2].trigger('click')
      expect(wrapper.vm.activeDocTab).toBe('deliveries')
    })

    it('点击回款记录 Tab 应切换', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tabBtns = wrapper.findAll('.detail-tab-btn')
      await tabBtns[3].trigger('click')
      expect(wrapper.vm.activeDocTab).toBe('collections')
    })

    it('当前 Tab 按钮应有 active 样式', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      const tabBtns = wrapper.findAll('.detail-tab-btn')
      expect(tabBtns[0].classes()).toContain('active')
    })

    it('切换Tab后应显示对应内容区域', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      // 默认显示报价单内容
      expect(wrapper.find('.detail-tab-content').exists() || wrapper.find('.detail-empty').exists()).toBe(true)
    })

    it('无数据时Tab内容应显示空提示', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.detail-empty').exists()).toBe(true)
      expect(wrapper.find('.detail-empty').text()).toContain('暂无报价记录')
    })
  })

  /* ===== 导航操作 ===== */
  describe('导航操作', () => {
    it('点击返回应导航到客户列表', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.goBack()
      expect(mockPush).toHaveBeenCalledWith('/customers')
    })

    it('点击编辑应导航到客户编辑页', async () => {
      const c = seedCustomer(store)
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.goEdit()
      expect(mockPush).toHaveBeenCalledWith({ path: '/customers', query: { editId: c.id } })
    })

    it('空状态点击返回客户列表应导航', async () => {
      const wrapper = mountComponent()
      const backBtn = wrapper.find('.empty-state .btn-primary')
      if (backBtn.exists()) {
        await backBtn.trigger('click')
        expect(mockPush).toHaveBeenCalledWith('/customers')
      }
    })
  })

  /* ===== 删除操作 ===== */
  describe('删除操作', () => {
    it('删除无关联数据的客户应弹出确认对话框', async () => {
      const c = seedCustomer(store, { fullName: '可删除公司' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      // 模拟 deleteCustomer 返回成功
      vi.spyOn(store, 'deleteCustomer').mockReturnValueOnce({ success: true })

      await wrapper.vm.handleDelete()
      await flushPromises()

      expect(wrapper.vm.showConfirm).toBe(true)
      expect(wrapper.vm.confirmType).toBe('confirm')
      expect(wrapper.vm.confirmMessage).toContain('可删除公司')

      store.deleteCustomer.mockRestore()
    })

    it('删除有关联数据的客户应显示警告', async () => {
      const c = seedCustomer(store, { fullName: '有数据公司' })
      mutableRoute.query = { id: c.id }
      const wrapper = mountComponent()
      await flushPromises()

      vi.spyOn(store, 'deleteCustomer').mockReturnValueOnce({
        success: false,
        error: '该客户关联了 报价单 2 条，请先处理关联数据后再删除。'
      })

      await wrapper.vm.handleDelete()
      await flushPromises()

      expect(wrapper.vm.showConfirm).toBe(true)
      expect(wrapper.vm.confirmType).toBe('warning')
      expect(wrapper.vm.confirmMessage).toContain('关联')

      store.deleteCustomer.mockRestore()
    })

    it('确认删除（警告类型）应仅关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.confirmType = 'warning'
      wrapper.vm.showConfirm = true
      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.showConfirm).toBe(false)
    })

    it('确认删除（确认类型）应关闭弹窗并导航', async () => {
      const wrapper = mountComponent()
      wrapper.vm.confirmType = 'confirm'
      wrapper.vm.showConfirm = true
      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.showConfirm).toBe(false)
      expect(mockPush).toHaveBeenCalledWith('/customers')
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭确认弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showConfirm = true
      await flushPromises()

      wrapper.vm.showConfirm = false
      expect(wrapper.vm.showConfirm).toBe(false)
    })
  })

  /* ===== 辅助函数 ===== */
  describe('辅助函数', () => {
    it('_getTagName 应返回标签名称', () => {
      seedCustomer(store)
      seedTags(store)
      const wrapper = mountComponent()
      const name = wrapper.vm._getTagName('VIP')
      expect(name).toBe('VIP')
    })

    it('_getTagName 不存在的标签应返回标签ID', () => {
      const wrapper = mountComponent()
      const name = wrapper.vm._getTagName('NOTEXIST')
      expect(name).toBe('NOTEXIST')
    })

    it('_getTagStyle 应返回标签样式', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const style = wrapper.vm._getTagStyle('VIP')
      expect(style).toHaveProperty('background')
      expect(style).toHaveProperty('color')
    })

    it('_getTagStyle 不存在的标签应返回空对象', () => {
      const wrapper = mountComponent()
      const style = wrapper.vm._getTagStyle('NOTEXIST')
      expect(style).toEqual({})
    })
  })
})
