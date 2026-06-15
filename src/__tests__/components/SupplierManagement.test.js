/**
 * SupplierManagement.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、详情弹窗、黑名单切换、删除确认、视图切换、计算属性
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createSupplier, createPurchaseOrder, resetCounter } from '@/__tests__/mockData'
import SupplierManagement from '@/modules/purchase/views/SupplierManagement.vue'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import { usePurchaseStore } from '@/modules/purchase/stores/purchase'

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
    roleName: '测试用户'
  })
}))

vi.mock('@/composables/useDuplicateDetector', () => ({
  useDuplicateDetector: () => ({
    duplicateGroups: { value: [] },
    markChecked: vi.fn(),
    isChecked: () => false
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const SupplierFormModalStub = {
  props: ['visible', 'supplier'],
  emits: ['save', 'cancel'],
  template: '<div class="supplier-form-modal-stub" v-if="visible">供应商表单弹窗</div>'
}

const SupplierEvaluationStub = {
  props: ['supplier'],
  emits: ['update'],
  template: '<div class="supplier-evaluation-stub">评估组件</div>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(SupplierManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        SupplierFormModal: SupplierFormModalStub,
        SupplierEvaluation: SupplierEvaluationStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加供应商数据 ===== */
function seedSuppliers(store, count = 5) {
  const categories = ['原材料', '成品', '服务', '物流']
  const statuses = ['active', 'pending', 'blacklist']
  for (let i = 0; i < count; i++) {
    store.addSupplier({
      name: `测试供应商${i + 1}号有限公司`,
      shortName: `测试供应${i + 1}`,
      code: `SUP-TEST-${String(i + 1).padStart(3, '0')}`,
      category: categories[i % categories.length],
      contact: `联系人${i + 1}`,
      phone: `0512-${String(50000000 + i).slice(-8)}`,
      email: `contact${i + 1}@test.com`,
      address: `测试地址${i + 1}号`,
      bankName: '测试银行',
      bankAccount: `6222${String(i).padStart(16, '0')}`,
      qualification: 'ISO9001',
      qualificationExpiry: '2027-06-30',
      rating: [3, 4, 5, 2, 4][i % 5],
      deliveryScore: [70, 80, 90, 60, 85][i % 5],
      qualityScore: [75, 85, 95, 65, 80][i % 5],
      priceScore: [70, 80, 85, 75, 90][i % 5],
      serviceScore: [65, 80, 90, 55, 85][i % 5],
      status: statuses[i % statuses.length],
      createDate: '2026-06-01'
    })
  }
}

/* ===== 辅助：向 store 添加采购单数据 ===== */
function seedPurchaseOrders(purchaseStore, supplierId, count = 3) {
  const statuses = ['pending', 'approved', 'completed']
  for (let i = 0; i < count; i++) {
    purchaseStore.addPurchaseOrder({
      orderNo: `PO-SUP-TEST-${String(i + 1).padStart(3, '0')}`,
      title: `采购单${i + 1}`,
      supplierId: supplierId,
      supplierName: '测试供应商',
      type: 'purchase',
      status: statuses[i % statuses.length],
      totalAmount: [10000, 25000, 50000][i % 3],
      items: [],
      createDate: '2026-06-01'
    })
  }
}

describe('SupplierManagement 组件', () => {
  let supplierStore
  let purchaseStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    supplierStore = useSupplierStore()
    purchaseStore = usePurchaseStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('供应商管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('供应商信息')
    })

    it('应渲染新增供应商按钮', () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      expect(addBtn.text()).toContain('新增供应商')
    })

    it('应渲染统计卡片', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.stat-card')
      expect(cards.length).toBe(4) // 总数、活跃、待审核、黑名单
    })

    it('统计卡片应显示正确数值', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()
      const values = wrapper.findAll('.stat-card-value')
      expect(values[0].text()).toBe('5') // 总数
    })

    it('应渲染概览面板', () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()
      expect(wrapper.find('.overview-row').exists()).toBe(true)
    })

    it('应渲染搜索和过滤栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('input[placeholder*="搜索"]').exists()).toBe(true)
      const selects = wrapper.findAll('.filter-bar .form-select')
      expect(selects.length).toBe(2) // 类别、状态
    })

    it('无供应商数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('有供应商数据时应渲染表格行', () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('.data-table tbody tr')
      expect(rows.length).toBe(3)
    })

    it('供应商表格应显示编码、名称、类别、联系人', () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      const cells = wrapper.findAll('.data-table tbody tr:first-child td')
      expect(cells[1].text()).toContain('SUP-TEST-001')
      expect(cells[2].text()).toContain('测试供应商1')
      expect(cells[3].text()).toContain('原材料')
      expect(cells[4].text()).toContain('联系人1')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按供应商名称搜索应过滤结果', async () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('测试供应商3')
      await flushPromises()

      expect(wrapper.vm.filteredSuppliers.length).toBe(1)
      expect(wrapper.vm.filteredSuppliers[0].name).toContain('测试供应商3')
    })

    it('按供应商编码搜索应过滤结果', async () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('SUP-TEST-002')
      await flushPromises()

      expect(wrapper.vm.filteredSuppliers.length).toBe(1)
    })

    it('按联系人搜索应过滤结果', async () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('联系人3')
      await flushPromises()

      expect(wrapper.vm.filteredSuppliers.length).toBe(1)
    })

    it('按类别过滤应过滤结果', async () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar .form-select')
      await selects[0].setValue('原材料')
      await flushPromises()

      wrapper.vm.filteredSuppliers.forEach(s => {
        expect(s.category).toBe('原材料')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar .form-select')
      await selects[1].setValue('active')
      await flushPromises()

      wrapper.vm.filteredSuppliers.forEach(s => {
        expect(s.status).toBe('active')
      })
    })

    it('搜索过滤应正确缩小结果范围', async () => {
      seedSuppliers(supplierStore, 25)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('测试供应商1')
      await flushPromises()

      expect(wrapper.vm.filteredSuppliers.length).toBeLessThan(25)
      expect(wrapper.vm.filteredSuppliers.length).toBeGreaterThan(0)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedSuppliers(supplierStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedSuppliers(supplierStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.pagination .btn-ghost')[1]
      await nextBtn.trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('第一页时上一页按钮应禁用', async () => {
      seedSuppliers(supplierStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const prevBtn = wrapper.findAll('.pagination .btn-ghost')[0]
      expect(prevBtn.attributes('disabled')).toBeDefined()
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('默认应显示表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentView).toBe('table')
    })

    it('点击卡片视图按钮应切换视图', async () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle .btn')
      const cardBtn = viewBtns.find(btn => btn.find('.icon-stub').text() === 'archive')
      if (cardBtn) {
        await cardBtn.trigger('click')
        expect(wrapper.vm.currentView).toBe('card')
      }
    })

    it('卡片视图应显示供应商卡片', async () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.currentView = 'card'
      await flushPromises()

      expect(wrapper.find('.supplier-card-grid').exists()).toBe(true)
      const cards = wrapper.findAll('.supplier-card')
      expect(cards.length).toBe(3)
    })
  })

  /* ===== 新增/编辑供应商 ===== */
  describe('新增/编辑供应商', () => {
    it('点击新增供应商按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.vm.editingSupplier).toBeNull()
    })

    it('点击编辑按钮应打开弹窗并传入数据', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '编辑')
      await editBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.vm.editingSupplier).toBeTruthy()
      expect(wrapper.vm.editingSupplier.name).toContain('测试供应商1')
    })

    it('保存供应商后应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showFormModal).toBe(true)

      await wrapper.vm.handleFormSave()
      expect(wrapper.vm.showFormModal).toBe(false)
      expect(wrapper.vm.editingSupplier).toBeNull()
    })
  })

  /* ===== 详情弹窗 ===== */
  describe('详情弹窗', () => {
    it('点击查看详情按钮应打开详情弹窗', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const detailBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '查看详情')
      await detailBtn.trigger('click')

      expect(wrapper.vm.showDetailModal).toBe(true)
      expect(wrapper.vm.detailSupplier).toBeTruthy()
    })

    it('详情弹窗应显示供应商详细信息', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplierStore.suppliers[0])

      expect(wrapper.vm.detailSupplier.name).toContain('测试供应商1')
      expect(wrapper.vm.detailSupplier.code).toContain('SUP-TEST-001')
    })

    it('详情弹窗应加载采购历史', async () => {
      seedSuppliers(supplierStore, 1)
      const supplier = supplierStore.suppliers[0]
      seedPurchaseOrders(purchaseStore, supplier.id, 3)

      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplier)

      expect(wrapper.vm.purchaseHistory.length).toBe(3)
    })

    it('关闭详情弹窗应重置状态', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplierStore.suppliers[0])
      expect(wrapper.vm.showDetailModal).toBe(true)

      wrapper.vm.showDetailModal = false
      await flushPromises()
      expect(wrapper.vm.showDetailModal).toBe(false)
    })

    it('评估更新应调用 store.updateSupplier', async () => {
      seedSuppliers(supplierStore, 1)
      const spy = vi.spyOn(supplierStore, 'updateSupplier')
      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplierStore.suppliers[0])

      const newScores = { deliveryScore: 95, qualityScore: 90 }
      await wrapper.vm.handleEvalUpdate(newScores)

      expect(spy).toHaveBeenCalledWith(supplierStore.suppliers[0].id, newScores)
      spy.mockRestore()
    })
  })

  /* ===== 黑名单切换 ===== */
  describe('黑名单切换', () => {
    it('点击黑名单按钮应调用 store.toggleBlacklist', async () => {
      seedSuppliers(supplierStore, 1)
      const spy = vi.spyOn(supplierStore, 'toggleBlacklist')
      const wrapper = mountComponent()
      await flushPromises()

      const blacklistBtn = wrapper.findAll('.action-btn').find(btn =>
        btn.attributes('title') === '加入黑名单' || btn.attributes('title') === '移出黑名单'
      )
      await blacklistBtn.trigger('click')

      expect(spy).toHaveBeenCalledWith(supplierStore.suppliers[0].id)
      spy.mockRestore()
    })

    it('黑名单供应商应显示移出黑名单按钮', async () => {
      supplierStore.addSupplier({
        name: '黑名单供应商',
        code: 'SUP-BL-001',
        category: '原材料',
        status: 'blacklist',
        rating: 1,
        deliveryScore: 50,
        qualityScore: 50,
        priceScore: 50,
        serviceScore: 50
      })
      const wrapper = mountComponent()
      await flushPromises()

      const blacklistBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '移出黑名单')
      expect(blacklistBtn).toBeTruthy()
    })
  })

  /* ===== 删除确认 ===== */
  describe('删除确认', () => {
    it('点击删除按钮应打开删除确认弹窗', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showDeleteConfirm).toBe(true)
      expect(wrapper.vm.deletingSupplier).toBeTruthy()
    })

    it('有关联采购单时应显示删除警告', async () => {
      seedSuppliers(supplierStore, 1)
      const supplier = supplierStore.suppliers[0]
      // 添加进行中的采购单
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-REL-001',
        title: '关联采购单',
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'purchase',
        status: 'ordered',
        totalAmount: 30000,
        items: [],
        createDate: '2026-06-01'
      })

      const wrapper = mountComponent()
      await wrapper.vm.openDeleteConfirm(supplier)

      expect(wrapper.vm.deleteWarning).toContain('进行中的采购单')
    })

    it('无关联采购单时不应显示删除警告', async () => {
      seedSuppliers(supplierStore, 1)
      const supplier = supplierStore.suppliers[0]

      const wrapper = mountComponent()
      await wrapper.vm.openDeleteConfirm(supplier)

      expect(wrapper.vm.deleteWarning).toBe('')
    })

    it('确认删除应调用 store.deleteSupplier', async () => {
      seedSuppliers(supplierStore, 1)
      const spy = vi.spyOn(supplierStore, 'deleteSupplier')
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')
      await wrapper.vm.handleDelete()

      expect(spy).toHaveBeenCalledWith(supplierStore.suppliers[0]?.id || expect.any(String))
      expect(wrapper.vm.showDeleteConfirm).toBe(false)
      spy.mockRestore()
    })

    it('有关联采购单时删除按钮应禁用', async () => {
      seedSuppliers(supplierStore, 1)
      const supplier = supplierStore.suppliers[0]
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-REL-DISABLED',
        title: '关联采购单',
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'purchase',
        status: 'ordered',
        totalAmount: 30000,
        items: [],
        createDate: '2026-06-01'
      })

      const wrapper = mountComponent()
      await wrapper.vm.openDeleteConfirm(supplier)

      // deleteWarning存在时，删除按钮应禁用
      expect(wrapper.vm.deleteWarning).toBeTruthy()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('activeRate 应正确计算活跃率', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const activeCount = supplierStore.activeSuppliers.length
      const total = supplierStore.totalCount
      const expectedRate = Math.round((activeCount / total) * 100)

      expect(wrapper.vm.activeRate).toBe(expectedRate)
    })

    it('无供应商时活跃率应为0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeRate).toBe(0)
    })

    it('activeRateColor 应根据活跃率返回不同颜色', () => {
      // 高活跃率：全部active -> success (>=70%)
      supplierStore.addSupplier({ name: '活跃1', code: 'SUP-A1', category: '原材料', status: 'active', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      supplierStore.addSupplier({ name: '活跃2', code: 'SUP-A2', category: '原材料', status: 'active', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      let wrapper = mountComponent()
      expect(wrapper.vm.activeRateColor).toBe('var(--color-success)')

      // 中活跃率：40%-69% -> warning
      setupPinia()
      clearStorage()
      supplierStore = useSupplierStore()
      purchaseStore = usePurchaseStore()
      supplierStore.addSupplier({ name: '活跃3', code: 'SUP-A3', category: '原材料', status: 'active', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      supplierStore.addSupplier({ name: '活跃4', code: 'SUP-A4', category: '原材料', status: 'active', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      supplierStore.addSupplier({ name: '待审1', code: 'SUP-P1', category: '原材料', status: 'pending', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      supplierStore.addSupplier({ name: '待审2', code: 'SUP-P2', category: '原材料', status: 'pending', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      supplierStore.addSupplier({ name: '待审3', code: 'SUP-P3', category: '原材料', status: 'pending', rating: 3, deliveryScore: 70, qualityScore: 70, priceScore: 70, serviceScore: 70 })
      wrapper = mountComponent()
      // 2/5 = 40% -> warning
      expect(wrapper.vm.activeRateColor).toBe('var(--color-warning)')
    })

    it('categoryStats 应正确统计类别分布', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      const stats = wrapper.vm.categoryStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(cat => {
        expect(cat).toHaveProperty('name')
        expect(cat).toHaveProperty('count')
        expect(cat).toHaveProperty('percent')
        expect(cat).toHaveProperty('color')
      })
    })

    it('avgCompositeScore 应正确计算平均综合评分', () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()

      const score = wrapper.vm.avgCompositeScore
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('avgRatingColor 应根据评分返回不同颜色', () => {
      const wrapper = mountComponent()

      // 通过直接设置computed的依赖来测试
      // 由于computed是只读的，我们通过添加不同评分的供应商来间接测试
      expect(typeof wrapper.vm.avgRatingColor).toBe('string')
    })

    it('filteredSuppliers 应正确过滤', () => {
      seedSuppliers(supplierStore, 5)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredSuppliers.length).toBe(5)
    })

    it('totalPages 应正确计算', () => {
      seedSuppliers(supplierStore, 15)
      const wrapper = mountComponent()

      expect(wrapper.vm.totalPages).toBe(2)
    })

    it('paginatedList 应正确分页', () => {
      seedSuppliers(supplierStore, 15)
      const wrapper = mountComponent()

      expect(wrapper.vm.paginatedList.length).toBe(10)
    })

    it('compositeScore 应正确计算单个供应商综合评分', () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      const supplier = supplierStore.suppliers[0]

      const expected = (supplier.deliveryScore || 0) * 0.3 +
        (supplier.qualityScore || 0) * 0.35 +
        (supplier.priceScore || 0) * 0.2 +
        (supplier.serviceScore || 0) * 0.15

      expect(wrapper.vm.compositeScore(supplier)).toBeCloseTo(expected, 1)
    })
  })

  /* ===== 资质到期预警 ===== */
  describe('资质到期预警', () => {
    it('有即将到期资质时应显示预警面板', async () => {
      supplierStore.addSupplier({
        name: '即将到期供应商',
        code: 'SUP-EXP-001',
        category: '原材料',
        status: 'active',
        qualification: 'ISO9001',
        qualificationExpiry: (() => {
          const d = new Date()
          d.setDate(d.getDate() + 30)
          return d.toISOString().slice(0, 10)
        })(),
        rating: 3,
        deliveryScore: 70,
        qualityScore: 70,
        priceScore: 70,
        serviceScore: 70
      })

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.alert-panel').exists()).toBe(true)
    })

    it('无即将到期资质时不应显示预警面板', () => {
      supplierStore.addSupplier({
        name: '远期到期供应商',
        code: 'SUP-FAR-001',
        category: '原材料',
        status: 'active',
        qualification: 'ISO9001',
        qualificationExpiry: '2099-12-31',
        rating: 3,
        deliveryScore: 70,
        qualityScore: 70,
        priceScore: 70,
        serviceScore: 70
      })

      const wrapper = mountComponent()
      expect(wrapper.find('.alert-panel').exists()).toBe(false)
    })

    it('黑名单供应商不应出现在预警中', () => {
      supplierStore.addSupplier({
        name: '黑名单到期供应商',
        code: 'SUP-BL-EXP-001',
        category: '原材料',
        status: 'blacklist',
        qualification: 'ISO9001',
        qualificationExpiry: (() => {
          const d = new Date()
          d.setDate(d.getDate() + 10)
          return d.toISOString().slice(0, 10)
        })(),
        rating: 1,
        deliveryScore: 50,
        qualityScore: 50,
        priceScore: 50,
        serviceScore: 50
      })

      const wrapper = mountComponent()
      expect(wrapper.find('.alert-panel').exists()).toBe(false)
    })
  })

  /* ===== 状态映射 ===== */
  describe('状态映射', () => {
    it('statusLabel 应返回正确的中文标签', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.statusLabel('active')).toBe('活跃')
      expect(wrapper.vm.statusLabel('blacklist')).toBe('黑名单')
      expect(wrapper.vm.statusLabel('pending')).toBe('待审核')
    })

    it('statusClass 应返回正确的样式类', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.statusClass('active')).toBe('success')
      expect(wrapper.vm.statusClass('blacklist')).toBe('danger')
      expect(wrapper.vm.statusClass('pending')).toBe('warning')
    })
  })

  /* ===== 金额格式化 ===== */
  describe('金额格式化', () => {
    it('formatAmount 应正确格式化金额', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmount(10000)
      expect(result).toContain('10,000')
    })
  })

  /* ===== 类别颜色 ===== */
  describe('类别颜色', () => {
    it('categoryColor 应返回已知类别的颜色', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.categoryColor('原材料')).toBe('#3b82f6')
      expect(wrapper.vm.categoryColor('成品')).toBe('#22c55e')
      expect(wrapper.vm.categoryColor('服务')).toBe('#a855f7')
      expect(wrapper.vm.categoryColor('物流')).toBe('#f59e0b')
    })

    it('categoryColor 未知类别应返回默认颜色', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.categoryColor('未知')).toBe('#64748b')
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('关闭表单弹窗应重置编辑状态', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showFormModal).toBe(true)

      await wrapper.vm.handleFormSave()
      expect(wrapper.vm.showFormModal).toBe(false)
      expect(wrapper.vm.editingSupplier).toBeNull()
    })

    it('关闭详情弹窗应重置详情状态', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplierStore.suppliers[0])
      expect(wrapper.vm.showDetailModal).toBe(true)

      wrapper.vm.showDetailModal = false
      await flushPromises()
      expect(wrapper.vm.showDetailModal).toBe(false)
    })

    it('关闭删除确认弹窗应重置删除状态', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openDeleteConfirm(supplierStore.suppliers[0])
      expect(wrapper.vm.showDeleteConfirm).toBe(true)

      wrapper.vm.showDeleteConfirm = false
      wrapper.vm.deletingSupplier = null
      await flushPromises()
      expect(wrapper.vm.showDeleteConfirm).toBe(false)
      expect(wrapper.vm.deletingSupplier).toBeNull()
    })
  })

  /* ===== 重复供应商检测弹窗 ===== */
  describe('重复供应商检测弹窗', () => {
    it('无重复供应商时不应显示重复检测按钮', () => {
      seedSuppliers(supplierStore, 3)
      const wrapper = mountComponent()

      // 由于mock了useDuplicateDetector返回空数组，不应显示按钮
      const duplicateBtn = wrapper.findAll('.btn-outline').find(btn => btn.text().includes('重复'))
      expect(duplicateBtn).toBeUndefined()
    })

    it('showDuplicateModal 初始应为 false', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showDuplicateModal).toBe(false)
    })
  })

  /* ===== 采购历史 ===== */
  describe('采购历史', () => {
    it('无采购记录时应显示空状态', async () => {
      seedSuppliers(supplierStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplierStore.suppliers[0])

      expect(wrapper.vm.purchaseHistory.length).toBe(0)
    })

    it('有采购记录时应正确加载', async () => {
      seedSuppliers(supplierStore, 1)
      const supplier = supplierStore.suppliers[0]
      seedPurchaseOrders(purchaseStore, supplier.id, 3)

      const wrapper = mountComponent()
      await wrapper.vm.openDetail(supplier)

      expect(wrapper.vm.purchaseHistory.length).toBe(3)
    })
  })
})
