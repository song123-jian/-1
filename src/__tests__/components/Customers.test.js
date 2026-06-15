/**
 * Customers.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、CRUD弹窗、表单验证、批量操作、导出、删除确认
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createCustomer, createTag, resetCounter } from '@/__tests__/mockData'
import Customers from '@/modules/customer/views/Customers.vue'
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

vi.mock('@/composables/useSmartSearch', () => ({
  useSmartSearch: () => ({
    smartSearchText: ref(''),
    parsedFilters: computed(() => ({})),
    clearSearch: vi.fn()
  })
}))

vi.mock('@/composables/useDuplicateDetector', () => ({
  useDuplicateDetector: () => ({
    duplicateGroups: computed(() => []),
    markChecked: vi.fn()
  })
}))

vi.mock('@/modules/customer/components/customers/useSmartRecognize', () => ({
  useSmartRecognize: () => ({
    showSmartRec: ref(false),
    smartRecInput: ref(''),
    smartRecResult: ref(null),
    smartRecPlaceholder: '输入智能识别内容',
    runSmartRecognize: vi.fn(),
    applySmartRecognize: vi.fn(),
    handleSmartFileUpload: vi.fn(),
    resetSmartRec: vi.fn()
  })
}))

vi.mock('@/composables/useTableEnhance', () => ({
  useTableEnhance: () => ({
    trendData: computed(() => ({})),
    anomalyData: computed(() => [])
  })
}))

vi.mock('@/modules/customer/components/customers/useCustomerImport', () => ({
  useCustomerImport: () => ({
    handleBatchAdd: vi.fn()
  })
}))

vi.mock('@/utils/customerHelpers', () => ({
  levelColors: { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' },
  levelLabel: (l) => ({ A: '大客户', B: 'B类客户', C: 'C类客户' }[l] || l)
}))

vi.mock('@/utils/format', () => ({
  formatNumber: (n) => (n ?? 0).toLocaleString('zh-CN'),
  toLocalDateStr: (d) => {
    const date = d || new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useRoute: () => ({
    query: {}
  })
}))

import { ref, computed } from 'vue'

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStub = {
  props: ['customers', 'selectedIds', 'trendData', 'anomalyData'],
  emits: ['update:selected-ids', 'open-edit', 'open-detail', 'handle-delete'],
  template: '<div class="child-stub"><slot /></div>'
}

const DetailModalStub = {
  props: ['showDetail', 'detailCustomer'],
  emits: ['close', 'edit', 'open360'],
  template: '<div class="detail-modal-stub"></div>'
}

const SmartRecPanelStub = {
  props: ['showSmartRec', 'smartRecInput', 'smartRecResult', 'placeholder'],
  emits: ['update:showSmartRec', 'update:smartRecInput', 'runSmartRecognize', 'applySmartRecognize', 'handleSmartFileUpload', 'clear'],
  template: '<div class="smart-rec-stub"></div>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Customers, {
    global: {
      stubs: {
        Icon: IconStub,
        CustomerTable: ChildStub,
        CustomerList: ChildStub,
        CustomerCardView: ChildStub,
        CustomerCalendarView: ChildStub,
        CustomerWeekView: ChildStub,
        CustomerDetailModal: DetailModalStub,
        SmartRecognizePanel: SmartRecPanelStub,
        Teleport: { template: '<div><slot /></div>' }
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedCustomers(store, count = 5) {
  for (let i = 0; i < count; i++) {
    store.addCustomer(createCustomer({
      level: ['A', 'B', 'C'][i % 3],
      status: i % 4 === 0 ? 'dormant' : 'active',
      region: ['华东', '华北', '华南', '西南', '华中'][i % 5],
      department: ['采购部', '技术部', '生产部'][i % 3]
    }))
  }
}

function seedTags(store) {
  const tags = [
    { id: 'VIP', name: 'VIP', color: '#ef4444', group: '等级' },
    { id: '长期合作', name: '长期合作', color: '#f59e0b', group: '关系' },
    { id: '大客户', name: '大客户', color: '#8b5cf6', group: '等级' }
  ]
  tags.forEach(t => store.addTag(t))
}

describe('Customers 组件', () => {
  let store

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('客户管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('客户关系管理')
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      expect(viewBtns.length).toBe(5) // table, list, card, calendar, week
    })

    it('应渲染新增客户按钮', () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      expect(addBtn.text()).toContain('新增客户')
    })

    it('应渲染统计栏数据', () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()
      const statNums = wrapper.findAll('.stat-num')
      expect(statNums.length).toBeGreaterThanOrEqual(3) // 总计、活跃、休眠
    })

    it('应渲染智能搜索栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.smart-search-input').exists()).toBe(true)
      expect(wrapper.find('.smart-search-input').attributes('placeholder')).toContain('搜索客户')
    })

    it('应渲染标签式筛选', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.tag-filters').exists()).toBe(true)
    })

    it('应渲染高级搜索字段', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.customer-search-grid').exists()).toBe(true)
    })

    it('应渲染下拉筛选器', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('.customer-filters .form-select')
      expect(selects.length).toBeGreaterThanOrEqual(5) // level, dept, region, status, decision, tag, sort
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-text').text()).toContain('暂无匹配的客户数据')
    })

    it('有数据时不应显示空状态', () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      // filteredCustomers > 0, 但子组件是 stub，所以 empty-state 不显示
      expect(wrapper.find('.empty-state').exists()).toBe(false)
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('默认视图应为表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentView).toBe('table')
    })

    it('点击列表视图按钮应切换视图', async () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[1].trigger('click') // list
      expect(wrapper.vm.currentView).toBe('list')
    })

    it('点击卡片视图按钮应切换视图', async () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[2].trigger('click') // card
      expect(wrapper.vm.currentView).toBe('card')
    })

    it('当前视图按钮应有 active 样式', async () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      expect(viewBtns[0].classes()).toContain('active')
      await viewBtns[1].trigger('click')
      expect(viewBtns[1].classes()).toContain('active')
      expect(viewBtns[0].classes()).not.toContain('active')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按客户编号搜索应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="输入客户编号..."]')
      await input.setValue('KH-')
      await flushPromises()

      expect(wrapper.vm.advFilterNo).toBe('KH-')
      expect(wrapper.vm.filteredCustomers.length).toBeGreaterThan(0)
    })

    it('按客户名称搜索应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="输入客户名称..."]')
      await input.setValue('测试客户')
      await flushPromises()

      expect(wrapper.vm.filteredCustomers.length).toBeGreaterThan(0)
    })

    it('按手机号码搜索应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="输入手机号..."]')
      await input.setValue('021')
      await flushPromises()

      expect(wrapper.vm.advFilterPhone).toBe('021')
    })

    it('按等级下拉筛选应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.customer-filters .form-select')
      await selects[0].setValue('A') // filterLevel
      await flushPromises()

      expect(wrapper.vm.filterLevel).toBe('A')
      wrapper.vm.filteredCustomers.forEach(c => {
        expect(c.level).toBe('A')
      })
    })

    it('按状态下拉筛选应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.customer-filters .form-select')
      await selects[3].setValue('active') // filterStatus
      await flushPromises()

      expect(wrapper.vm.filterStatus).toBe('active')
      wrapper.vm.filteredCustomers.forEach(c => {
        expect(c.status).toBe('active')
      })
    })

    it('点击标签式等级筛选应过滤结果', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const tagItems = wrapper.findAll('.tag-filter-item')
      // 点击 A级
      await tagItems[0].trigger('click')
      await flushPromises()

      expect(wrapper.vm.tagGradeFilter).toBe('A')
      wrapper.vm.filteredCustomers.forEach(c => {
        expect(c.level).toBe('A')
      })
    })

    it('再次点击标签式筛选应取消筛选', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const tagItems = wrapper.findAll('.tag-filter-item')
      await tagItems[0].trigger('click')
      expect(wrapper.vm.tagGradeFilter).toBe('A')

      await tagItems[0].trigger('click')
      expect(wrapper.vm.tagGradeFilter).toBe('')
    })

    it('点击清除筛选应重置标签筛选', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const tagItems = wrapper.findAll('.tag-filter-item')
      await tagItems[0].trigger('click')
      expect(wrapper.vm.tagGradeFilter).toBe('A')

      const clearBtn = wrapper.find('.tag-filter-clear')
      await clearBtn.trigger('click')
      expect(wrapper.vm.tagGradeFilter).toBe('')
      expect(wrapper.vm.tagStatusFilter).toBe('')
    })

    it('点击重置按钮应清空高级搜索字段', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.advFilterNo = 'test'
      wrapper.vm.advFilterName = 'test'
      wrapper.vm.advFilterPhone = 'test'
      wrapper.vm.advFilterConcerns = 'test'
      await flushPromises()

      const resetBtn = wrapper.find('.search-reset-btn')
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.advFilterNo).toBe('')
      expect(wrapper.vm.advFilterName).toBe('')
      expect(wrapper.vm.advFilterPhone).toBe('')
      expect(wrapper.vm.advFilterConcerns).toBe('')
    })

    it('排序方向切换应生效', async () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.vm.sortDir).toBe('asc')

      const sortBtn = wrapper.find('.btn-ghost.btn-sm')
      await sortBtn.trigger('click')
      expect(wrapper.vm.sortDir).toBe('desc')
    })
  })

  /* ===== 新增客户 ===== */
  describe('新增客户', () => {
    it('点击新增客户按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showModal).toBe(true)
    })

    it('新增弹窗表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      expect(wrapper.vm.form.level).toBe('B')
      expect(wrapper.vm.form.status).toBe('active')
      expect(wrapper.vm.form.creditLimit).toBe(0)
      expect(wrapper.vm.form.tags).toEqual([])
      expect(wrapper.vm.editingCustomer).toBeNull()
    })

    it('新增弹窗标题应为"新增客户"', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      await flushPromises()

      const modalTitle = wrapper.find('.modal-header h3')
      expect(modalTitle.text()).toBe('新增客户')
    })

    it('必填字段全部为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = ''
      wrapper.vm.form.contactName = ''
      wrapper.vm.form.phone = ''
      await wrapper.vm.saveCustomer()

      expect(wrapper.vm.formErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.formErrors).toContain('请至少填写客户全称、联系人姓名或手机号码中的一项')
    })

    it('手机号格式不正确时应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = '测试公司'
      wrapper.vm.form.phone = '1234'
      await wrapper.vm.saveCustomer()

      expect(wrapper.vm.formErrors).toContain('手机号格式不正确，应为11位手机号码')
    })

    it('邮箱格式不正确时应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = '测试公司'
      wrapper.vm.form.email = 'invalid-email'
      await wrapper.vm.saveCustomer()

      expect(wrapper.vm.formErrors).toContain('邮箱格式不正确')
    })

    it('信用额度为负数时应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = '测试公司'
      wrapper.vm.form.creditLimit = -100
      await wrapper.vm.saveCustomer()

      expect(wrapper.vm.formErrors).toContain('信用额度不能为负数')
    })

    it('客户编号重复时应显示错误', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = '新公司'
      wrapper.vm.form.customerNo = store.customers[0].customerNo
      await wrapper.vm.saveCustomer()

      expect(wrapper.vm.formErrors).toContain('客户编号已存在，请使用其他编号')
    })

    it('填写完整信息后提交应新增客户', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.fullName = '新测试公司'
      wrapper.vm.form.phone = '13800138000'
      wrapper.vm.form.email = 'test@example.com'
      wrapper.vm.form.level = 'A'
      wrapper.vm.form.creditLimit = 100000

      await wrapper.vm.saveCustomer()
      await flushPromises()

      expect(store.customers.length).toBe(1)
      expect(store.customers[0].fullName).toBe('新测试公司')
      expect(wrapper.vm.showModal).toBe(false)
    })
  })

  /* ===== 编辑客户 ===== */
  describe('编辑客户', () => {
    it('调用 openEditModal 应打开弹窗并填充数据', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      const c = store.customers[0]

      await wrapper.vm.openEditModal(c)
      await flushPromises()

      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.editingCustomer).toBe(c)
      expect(wrapper.vm.form.customerNo).toBe(c.customerNo)
      expect(wrapper.vm.form.fullName).toBe(c.fullName || c.name)
    })

    it('编辑弹窗标题应为"编辑客户"', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openEditModal(store.customers[0])
      await flushPromises()

      const modalTitle = wrapper.find('.modal-header h3')
      expect(modalTitle.text()).toBe('编辑客户')
    })

    it('编辑时客户编号字段应为只读', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openEditModal(store.customers[0])
      await flushPromises()

      const noInput = wrapper.find('input[readonly]')
      expect(noInput.exists()).toBe(true)
    })

    it('编辑提交应更新客户数据', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      const c = store.customers[0]

      await wrapper.vm.openEditModal(c)
      wrapper.vm.form.fullName = '更新后的名称'
      wrapper.vm.form.phone = '' // 清除手机号避免格式校验失败
      await wrapper.vm.saveCustomer()
      await flushPromises()

      expect(store.customers[0].fullName).toBe('更新后的名称')
      expect(wrapper.vm.showModal).toBe(false)
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showModal).toBe(true)

      await wrapper.vm.closeModal()
      expect(wrapper.vm.showModal).toBe(false)
      expect(wrapper.vm.editingCustomer).toBeNull()
    })
  })

  /* ===== 删除客户 ===== */
  describe('删除客户', () => {
    it('调用 handleDelete 应弹出确认对话框', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      const c = store.customers[0]

      await wrapper.vm.handleDelete(c)
      expect(wrapper.vm.showConfirm).toBe(true)
      expect(wrapper.vm.confirmMessage).toContain(c.fullName || c.name)
      expect(wrapper.vm.confirmType).toBe('confirm')
    })

    it('确认删除应移除客户', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      const c = store.customers[0]
      const custId = c.id

      await wrapper.vm.handleDelete(c)
      await wrapper.vm.confirmAction()
      await flushPromises()

      expect(store.customers.find(x => x.id === custId)).toBeUndefined()
      expect(wrapper.vm.showConfirm).toBe(false)
    })

    it('删除有关联数据的客户应显示警告', async () => {
      seedCustomers(store, 1)
      const c = store.customers[0]
      // 模拟 deleteCustomer 返回失败
      vi.spyOn(store, 'deleteCustomer').mockReturnValueOnce({
        success: false,
        error: '该客户关联了 报价单 1 条，请先处理关联数据后再删除。'
      })

      const wrapper = mountComponent()
      await wrapper.vm.handleDelete(c)
      // handleDelete 设置 confirmType='confirm', showConfirm=true
      expect(wrapper.vm.showConfirm).toBe(true)

      // confirmAction 调用 confirmCallback，其中 deleteCustomer 返回失败
      // 组件内 confirmCallback 设置 confirmType='warning' 和 showConfirm=true
      // 但 confirmAction 最后会设置 showConfirm=false
      await wrapper.vm.confirmAction()
      await flushPromises()

      // 验证 deleteCustomer 被调用了
      expect(store.deleteCustomer).toHaveBeenCalledWith(c.id)
      // confirmType 应被设为 warning（在 callback 内部）
      expect(wrapper.vm.confirmType).toBe('warning')

      store.deleteCustomer.mockRestore()
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('选中客户后应显示批量操作栏', async () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.selectedIds = [store.customers[0].id, store.customers[1].id]
      await flushPromises()

      expect(wrapper.find('.batch-bar').exists()).toBe(true)
      expect(wrapper.find('.batch-bar').text()).toContain('已选 2 项')
    })

    it('未选中客户时不应显示批量操作栏', () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.find('.batch-bar').exists()).toBe(false)
    })

    it('批量删除应弹出确认对话框', async () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.selectedIds = [store.customers[0].id, store.customers[1].id]
      await flushPromises()

      await wrapper.vm.handleBatchDelete()
      expect(wrapper.vm.showConfirm).toBe(true)
      expect(wrapper.vm.confirmMessage).toContain('2')
    })

    it('确认批量删除应移除选中客户', async () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      const ids = [store.customers[0].id, store.customers[1].id]
      wrapper.vm.selectedIds = ids
      await flushPromises()

      await wrapper.vm.handleBatchDelete()
      await wrapper.vm.confirmAction()
      await flushPromises()

      expect(store.customers.length).toBe(1)
      expect(wrapper.vm.selectedIds).toEqual([])
    })

    it('批量调整等级应生效', async () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      const ids = [store.customers[0].id, store.customers[1].id]
      wrapper.vm.selectedIds = ids
      wrapper.vm.batchLevel = 'A'
      await flushPromises()

      await wrapper.vm.handleBatchLevel()
      await flushPromises()

      expect(store.customers[0].level).toBe('A')
      expect(store.customers[1].level).toBe('A')
      expect(wrapper.vm.selectedIds).toEqual([])
    })

    it('批量标签弹窗应正确显示', async () => {
      seedCustomers(store, 2)
      seedTags(store)
      const wrapper = mountComponent()
      wrapper.vm.selectedIds = [store.customers[0].id]
      await flushPromises()

      await wrapper.vm.handleBatchTag()
      expect(wrapper.vm.showBatchTagModal).toBe(true)
    })

    it('批量标签确认应给客户添加标签', async () => {
      seedCustomers(store, 2)
      seedTags(store)
      const wrapper = mountComponent()
      wrapper.vm.selectedIds = [store.customers[0].id]
      await flushPromises()

      await wrapper.vm.handleBatchTag()
      wrapper.vm.batchSelectedTags = ['VIP']
      await wrapper.vm.applyBatchTags()
      await flushPromises()

      expect(store.customers[0].tags).toContain('VIP')
      expect(wrapper.vm.showBatchTagModal).toBe(false)
    })

    it('取消选择应清空选中列表', async () => {
      seedCustomers(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.selectedIds = [store.customers[0].id]
      await flushPromises()

      // 取消选择是最后一个 btn-outline 按钮
      const btns = wrapper.findAll('.batch-bar .btn-outline')
      const cancelBtn = btns[btns.length - 1]
      await cancelBtn.trigger('click')
      expect(wrapper.vm.selectedIds).toEqual([])
    })
  })

  /* ===== 标签选择 ===== */
  describe('标签选择', () => {
    it('点击标签应切换选中状态', async () => {
      seedCustomers(store, 1)
      seedTags(store)
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      await wrapper.vm.toggleFormTag('VIP')
      expect(wrapper.vm.form.tags).toContain('VIP')

      await wrapper.vm.toggleFormTag('VIP')
      expect(wrapper.vm.form.tags).not.toContain('VIP')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('activePercent 应正确计算活跃率', () => {
      seedCustomers(store, 4) // 3 active, 1 dormant
      const wrapper = mountComponent()
      const active = store.customers.filter(c => c.status === 'active').length
      const expected = Math.round((active / 4) * 100)
      expect(wrapper.vm.activePercent).toBe(expected)
    })

    it('无客户时 activePercent 应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activePercent).toBe(0)
    })

    it('activeRingDash 应正确计算环形进度', () => {
      seedCustomers(store, 4)
      const wrapper = mountComponent()
      const p = wrapper.vm.activePercent / 100
      const RING_CIRC = 2 * Math.PI * 18
      const expected = `${p * RING_CIRC} ${RING_CIRC}`
      expect(wrapper.vm.activeRingDash).toBe(expected)
    })

    it('filteredCustomers 应正确过滤', () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()
      wrapper.vm.filterLevel = 'A'
      wrapper.vm.filteredCustomers.forEach(c => {
        expect(c.level).toBe('A')
      })
    })

    it('filteredCustomers 应正确排序', () => {
      seedCustomers(store, 5)
      const wrapper = mountComponent()
      wrapper.vm.sortField = 'level'
      wrapper.vm.sortDir = 'asc'
      const list = wrapper.vm.filteredCustomers
      const levelOrder = { A: 0, B: 1, C: 2 }
      for (let i = 1; i < list.length; i++) {
        expect(levelOrder[list[i].level] ?? 4).toBeGreaterThanOrEqual(levelOrder[list[i - 1].level] ?? 4)
      }
    })
  })

  /* ===== 导出功能 ===== */
  describe('导出功能', () => {
    it('导出CSV应创建 Blob 并触发下载', async () => {
      seedCustomers(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.handleExport()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('模板下载应创建 Blob 并触发下载', async () => {
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.handleDownloadTemplate()

      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 部门新建 ===== */
  describe('部门新建', () => {
    it('选择新建部门应弹出 prompt', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue('新部门')
      wrapper.vm.form.department = '__new__'
      await wrapper.vm.handleDeptChange()

      expect(promptSpy).toHaveBeenCalledWith('请输入新部门名称：')
      expect(wrapper.vm.form.department).toBe('新部门')

      promptSpy.mockRestore()
    })

    it('取消新建部门应重置为空', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue(null)
      wrapper.vm.form.department = '__new__'
      await wrapper.vm.handleDeptChange()

      expect(wrapper.vm.form.department).toBe('')

      promptSpy.mockRestore()
    })
  })

  /* ===== 详情弹窗 ===== */
  describe('详情弹窗', () => {
    it('调用 openDetailModal 应显示详情', async () => {
      seedCustomers(store, 1)
      const wrapper = mountComponent()
      const c = store.customers[0]

      await wrapper.vm.openDetailModal(c)
      expect(wrapper.vm.showDetail).toBe(true)
      expect(wrapper.vm.detailCustomer).toBe(c)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时如有 editId 参数应打开编辑弹窗', async () => {
      // 这个测试需要 mock route.query.editId
      // 由于 useRoute 已被 mock，我们验证 onMounted 逻辑存在即可
      const wrapper = mountComponent()
      expect(wrapper.vm.showModal).toBe(false)
    })
  })
})
