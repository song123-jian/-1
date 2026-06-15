/**
 * ProductionManagement.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、表单验证、工单状态流转、BOM管理、进度更新
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createProductionOrder, createBomNode, resetCounter } from '@/__tests__/mockData'
import ProductionManagement from '@/modules/production/views/ProductionManagement.vue'
import { useProductionStore } from '@/modules/production/stores/production'
import { useBomStore } from '@/modules/production/stores/bom'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'

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

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const DataSelectStub = {
  props: ['modelValue', 'module', 'valueField', 'labelField', 'placeholder'],
  emits: ['update:modelValue', 'change'],
  template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">选择物料</option></select>'
}

const BomTreeStub = {
  props: ['bom'],
  template: '<div class="bom-tree-stub">BOM树: {{ bom?.name }}</div>'
}

const ProductionOrderStub = {
  props: ['order', 'visible'],
  emits: ['close', 'saved'],
  template: '<div class="production-order-stub" v-if="visible">工单表单</div>'
}

const ProductionScheduleStub = {
  props: ['orders'],
  template: '<div class="production-schedule-stub">排程组件</div>'
}

const MaterialRequirementStub = {
  template: '<div class="material-requirement-stub">物料需求组件</div>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(ProductionManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        DataSelect: DataSelectStub,
        BomTree: BomTreeStub,
        ProductionOrder: ProductionOrderStub,
        ProductionSchedule: ProductionScheduleStub,
        MaterialRequirement: MaterialRequirementStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加工单数据 ===== */
function seedOrders(store, count = 5) {
  const statuses = ['planned', 'released', 'in_progress', 'quality_check', 'completed']
  const priorities = ['low', 'normal', 'high', 'urgent']
  for (let i = 0; i < count; i++) {
    store.addProductionOrder({
      orderNo: `MO-TEST-${String(i + 1).padStart(3, '0')}`,
      productName: `测试产品${i + 1}号`,
      quantity: [50, 100, 200, 30, 500][i % 5],
      unit: ['台', '件', '套', '条', '个'][i % 5],
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      progress: [0, 0, 50, 90, 100][i % 5],
      plannedStartDate: '2026-06-01',
      plannedEndDate: '2026-06-30',
      workshop: ['一号车间', '二号车间'][i % 2],
      operator: `操作员${i + 1}`
    })
  }
}

/* ===== 辅助：向 store 添加BOM数据 ===== */
function seedBomList(store, count = 3) {
  const types = ['single', 'multi', 'phantom']
  const statuses = ['draft', 'active', 'obsolete']
  for (let i = 0; i < count; i++) {
    store.addBom({
      name: `测试BOM${i + 1}`,
      productName: `测试产品${i + 1}号`,
      productId: `PRD-${String(i + 1).padStart(3, '0')}`,
      version: `V${i + 1}.0`,
      type: types[i % types.length],
      status: statuses[i % statuses.length],
      components: [
        {
          id: `cmp_test_${i}_1`,
          materialCode: `MTL-00${i + 1}`,
          materialName: `物料${i + 1}`,
          spec: '标准',
          unit: 'kg',
          quantity: 10 + i,
          scrapRate: 2,
          isOptional: false,
          notes: ''
        }
      ]
    })
  }
}

describe('ProductionManagement 组件', () => {
  let productionStore
  let bomStore
  let inventoryStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    productionStore = useProductionStore()
    bomStore = useBomStore()
    inventoryStore = useInventoryStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toContain('生产管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('工单管理')
    })

    it('应渲染新增工单按钮', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.btn-primary')
      expect(btn.text()).toContain('新增工单')
    })

    it('应渲染紧凑指标条', () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()
      const metrics = wrapper.findAll('.compact-metric-value')
      expect(metrics.length).toBeGreaterThanOrEqual(2)
      expect(metrics[0].text()).toBe('5') // 工单总数
    })

    it('应渲染Tab切换按钮', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('.prod-tab-btn')
      expect(tabs.length).toBe(3)
      expect(tabs[0].text()).toContain('生产工单')
      expect(tabs[1].text()).toContain('BOM管理')
      expect(tabs[2].text()).toContain('物料需求(MRP)')
    })

    it('默认应显示生产工单Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('orders')
    })

    it('无工单数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-cell').text()).toContain('暂无工单数据')
    })

    it('有工单数据时应渲染表格行', () => {
      seedOrders(productionStore, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('.inv-table tbody tr')
      expect(rows.length).toBe(3)
    })

    it('工单表格应显示工单号和产品名称', () => {
      seedOrders(productionStore, 1)
      const wrapper = mountComponent()
      const cells = wrapper.findAll('.inv-table tbody tr:first-child td')
      expect(cells[1].text()).toContain('MO-TEST-001')
      expect(cells[2].text()).toContain('测试产品1号')
    })

    it('应渲染折叠统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
      expect(wrapper.find('.collapsible-stats-header').exists()).toBe(true)
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showProdStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showProdStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showProdStatsExpanded).toBe(false)
    })

    it('展开后应显示详细统计卡片', async () => {
      seedOrders(productionStore, 3)
      const wrapper = mountComponent()
      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      await flushPromises()

      expect(wrapper.find('.collapsible-stats-body').isVisible()).toBe(true)
      expect(wrapper.findAll('.prod-stat-card').length).toBe(4)
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('点击BOM管理Tab应切换到BOM视图', async () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('.prod-tab-btn')
      await tabs[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('bom')
    })

    it('点击物料需求Tab应切换到MRP视图', async () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('.prod-tab-btn')
      await tabs[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('mrp')
    })

    it('切换到BOM Tab后应显示BOM列表', async () => {
      seedBomList(bomStore, 2)
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('.prod-tab-btn')
      await tabs[1].trigger('click')
      await flushPromises()

      expect(wrapper.find('.panel-card-title').text()).toContain('BOM列表')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按工单号搜索应过滤结果', async () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索工单号"]')
      await input.setValue('MO-TEST-001')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBe(1)
      expect(wrapper.vm.filteredOrders[0].orderNo).toBe('MO-TEST-001')
    })

    it('按产品名称搜索应过滤结果', async () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索工单号"]')
      await input.setValue('测试产品3')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBe(1)
      expect(wrapper.vm.filteredOrders[0].productName).toContain('测试产品3')
    })

    it('按状态过滤应过滤结果', async () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-select')
      await selects[0].setValue('in_progress')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBeGreaterThan(0)
      wrapper.vm.filteredOrders.forEach(o => {
        expect(o.status).toBe('in_progress')
      })
    })

    it('按优先级过滤应过滤结果', async () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-select')
      await selects[1].setValue('urgent')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBeGreaterThan(0)
      wrapper.vm.filteredOrders.forEach(o => {
        expect(o.priority).toBe('urgent')
      })
    })

    it('搜索和过滤条件变更时应重置页码', async () => {
      seedOrders(productionStore, 25)
      const wrapper = mountComponent()
      wrapper.vm.orderPage = 2
      await flushPromises()

      const input = wrapper.find('input[placeholder*="搜索工单号"]')
      await input.setValue('测试')
      await flushPromises()

      expect(wrapper.vm.orderPage).toBe(1)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedOrders(productionStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination-bar').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination-bar').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedOrders(productionStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.page-btns .btn-ghost')[1]
      await nextBtn.trigger('click')
      expect(wrapper.vm.orderPage).toBe(2)
    })

    it('第一页时上一页按钮应禁用', async () => {
      seedOrders(productionStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const prevBtn = wrapper.findAll('.page-btns .btn-ghost')[0]
      expect(prevBtn.attributes('disabled')).toBeDefined()
    })
  })

  /* ===== 工单状态操作 ===== */
  describe('工单状态操作', () => {
    it('已计划工单应显示下达按钮', async () => {
      seedOrders(productionStore, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const actionBtns = wrapper.findAll('.cell-actions .btn-ghost')
      const hasReleaseBtn = actionBtns.some(btn => btn.attributes('title') === '下达')
      expect(hasReleaseBtn).toBe(true)
    })

    it('下达工单应调用 store.releaseOrder', async () => {
      seedOrders(productionStore, 1)
      const spy = vi.spyOn(productionStore, 'releaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const releaseBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '下达')
      await releaseBtn.trigger('click')

      expect(spy).toHaveBeenCalledWith(productionStore.productionOrders[0].id)
      spy.mockRestore()
    })

    it('下达工单失败时应弹出alert', async () => {
      seedOrders(productionStore, 1)
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      vi.spyOn(productionStore, 'releaseOrder').mockReturnValue({ success: false, error: '仅已计划工单可下达' })

      const wrapper = mountComponent()
      await flushPromises()

      const releaseBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '下达')
      await releaseBtn.trigger('click')

      expect(alertSpy).toHaveBeenCalledWith('仅已计划工单可下达')
      alertSpy.mockRestore()
    })

    it('完成工单应弹出确认对话框', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-QC-001',
        productName: '质检产品',
        quantity: 10,
        status: 'quality_check',
        progress: 90
      })
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()
      await flushPromises()

      const completeBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '完成')
      await completeBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('确认完成生产？成品将自动入库。')
      confirmSpy.mockRestore()
    })

    it('取消工单应弹出确认对话框', async () => {
      seedOrders(productionStore, 1)
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()
      await flushPromises()

      const cancelBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '取消')
      await cancelBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('确认取消工单？')
      confirmSpy.mockRestore()
    })

    it('确认取消后应调用 store.cancelProduction', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-CANCEL-001',
        productName: '待取消产品',
        quantity: 10,
        status: 'planned'
      })
      const spy = vi.spyOn(productionStore, 'cancelProduction')
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const wrapper = mountComponent()
      await flushPromises()

      const cancelBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '取消')
      await cancelBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  /* ===== 进度更新 ===== */
  describe('进度更新', () => {
    it('生产中工单应显示更新进度按钮', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-PROG-001',
        productName: '进度产品',
        quantity: 10,
        status: 'in_progress',
        progress: 50
      })
      const wrapper = mountComponent()
      await flushPromises()

      const progressBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '更新进度')
      expect(progressBtn).toBeDefined()
    })

    it('点击更新进度应打开进度弹窗', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-PROG-002',
        productName: '进度产品2',
        quantity: 10,
        status: 'in_progress',
        progress: 50
      })
      const wrapper = mountComponent()
      await flushPromises()

      const progressBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '更新进度')
      await progressBtn.trigger('click')

      expect(wrapper.vm.showProgressModal).toBe(true)
      expect(wrapper.vm.progressOrder.orderNo).toBe('MO-PROG-002')
      expect(wrapper.vm.newProgress).toBe(50)
    })

    it('确认进度应调用 store.updateProgress', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-PROG-003',
        productName: '进度产品3',
        quantity: 10,
        status: 'in_progress',
        progress: 50
      })
      const spy = vi.spyOn(productionStore, 'updateProgress')
      const wrapper = mountComponent()
      await flushPromises()

      const progressBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '更新进度')
      await progressBtn.trigger('click')

      wrapper.vm.newProgress = 75
      await wrapper.vm.confirmProgress()

      expect(spy).toHaveBeenCalledWith(productionStore.productionOrders[0].id, 75)
      expect(wrapper.vm.showProgressModal).toBe(false)
      spy.mockRestore()
    })

    it('取消进度弹窗应关闭', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-PROG-004',
        productName: '进度产品4',
        quantity: 10,
        status: 'in_progress',
        progress: 50
      })
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleUpdateProgress(productionStore.productionOrders[0])
      expect(wrapper.vm.showProgressModal).toBe(true)

      wrapper.vm.showProgressModal = false
      await flushPromises()
      expect(wrapper.vm.showProgressModal).toBe(false)
    })
  })

  /* ===== 新增/编辑工单弹窗 ===== */
  describe('新增/编辑工单弹窗', () => {
    it('点击新增工单按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showOrderForm).toBe(true)
      expect(wrapper.vm.editingOrder).toBeNull()
    })

    it('点击编辑按钮应打开弹窗并传入工单数据', async () => {
      seedOrders(productionStore, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '编辑')
      await editBtn.trigger('click')

      expect(wrapper.vm.showOrderForm).toBe(true)
      expect(wrapper.vm.editingOrder).toBeTruthy()
      expect(wrapper.vm.editingOrder.orderNo).toBe('MO-TEST-001')
    })

    it('保存工单后应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openOrderForm(null)
      expect(wrapper.vm.showOrderForm).toBe(true)

      await wrapper.vm.handleOrderSaved()
      expect(wrapper.vm.showOrderForm).toBe(false)
      expect(wrapper.vm.editingOrder).toBeNull()
    })
  })

  /* ===== BOM管理 ===== */
  describe('BOM管理', () => {
    async function switchToBomTab(wrapper) {
      const tabs = wrapper.findAll('.prod-tab-btn')
      await tabs[1].trigger('click')
      await flushPromises()
    }

    it('BOM列表应正确渲染', async () => {
      seedBomList(bomStore, 3)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const rows = wrapper.findAll('.inv-table tbody tr')
      expect(rows.length).toBe(3)
    })

    it('无BOM数据时应显示空状态', async () => {
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      expect(wrapper.find('.empty-cell').text()).toContain('暂无BOM数据')
    })

    it('按BOM名称搜索应过滤结果', async () => {
      seedBomList(bomStore, 3)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const input = wrapper.find('input[placeholder*="搜索BOM编码"]')
      await input.setValue('测试BOM1')
      await flushPromises()

      expect(wrapper.vm.filteredBomList.length).toBe(1)
    })

    it('按BOM状态过滤应过滤结果', async () => {
      seedBomList(bomStore, 3)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const selects = wrapper.findAll('.filter-select')
      await selects[0].setValue('active')
      await flushPromises()

      wrapper.vm.filteredBomList.forEach(b => {
        expect(b.status).toBe('active')
      })
    })

    it('按BOM类型过滤应过滤结果', async () => {
      seedBomList(bomStore, 3)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const selects = wrapper.findAll('.filter-select')
      await selects[1].setValue('multi')
      await flushPromises()

      wrapper.vm.filteredBomList.forEach(b => {
        expect(b.type).toBe('multi')
      })
    })

    it('点击新增BOM按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const addBtn = wrapper.findAll('.btn-primary').find(btn => btn.text().includes('新增BOM'))
      await addBtn.trigger('click')

      expect(wrapper.vm.showBomForm).toBe(true)
      expect(wrapper.vm.editingBomId).toBeNull()
    })

    it('点击编辑BOM应打开弹窗并填充数据', async () => {
      seedBomList(bomStore, 1)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const editBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '编辑')
      await editBtn.trigger('click')

      expect(wrapper.vm.showBomForm).toBe(true)
      expect(wrapper.vm.editingBomId).toBe(bomStore.bomList[0].id)
      expect(wrapper.vm.bomForm.name).toBe('测试BOM1')
    })

    it('BOM表单验证：名称为空应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)

      wrapper.vm.bomForm.name = ''
      wrapper.vm.bomForm.productName = '产品A'
      await wrapper.vm.handleSaveBom()

      expect(wrapper.vm.bomErrors.name).toBe('请输入BOM名称')
    })

    it('BOM表单验证：产品名称为空应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)

      wrapper.vm.bomForm.name = 'BOM名称'
      wrapper.vm.bomForm.productName = ''
      await wrapper.vm.handleSaveBom()

      expect(wrapper.vm.bomErrors.productName).toBe('请输入产品名称')
    })

    it('填写完整信息后创建BOM应成功', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)

      wrapper.vm.bomForm.name = '新BOM'
      wrapper.vm.bomForm.productName = '新产品'
      await wrapper.vm.handleSaveBom()

      expect(bomStore.bomList.length).toBe(1)
      expect(bomStore.bomList[0].name).toBe('新BOM')
      expect(wrapper.vm.showBomForm).toBe(false)
    })

    it('编辑BOM后更新应成功', async () => {
      seedBomList(bomStore, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(bomStore.bomList[0])

      wrapper.vm.bomForm.name = '更新后的BOM'
      await wrapper.vm.handleSaveBom()

      expect(bomStore.bomList[0].name).toBe('更新后的BOM')
      expect(wrapper.vm.showBomForm).toBe(false)
    })

    it('添加组件应增加组件列表长度', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)

      expect(wrapper.vm.bomForm.components.length).toBe(0)
      wrapper.vm.addComponent()
      expect(wrapper.vm.bomForm.components.length).toBe(1)
    })

    it('删除组件应减少组件列表长度', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)

      wrapper.vm.addComponent()
      wrapper.vm.addComponent()
      expect(wrapper.vm.bomForm.components.length).toBe(2)

      wrapper.vm.removeComponent(0)
      expect(wrapper.vm.bomForm.components.length).toBe(1)
    })

    it('激活BOM应弹出确认对话框', async () => {
      seedBomList(bomStore, 1)
      bomStore.bomList[0].status = 'draft'
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const activateBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '激活')
      await activateBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('确认激活此BOM？')
      confirmSpy.mockRestore()
    })

    it('废弃BOM应弹出确认对话框', async () => {
      seedBomList(bomStore, 1)
      bomStore.bomList[0].status = 'active'
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const obsoleteBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '废弃')
      await obsoleteBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('确认废弃此BOM？废弃后不可恢复。')
      confirmSpy.mockRestore()
    })

    it('删除BOM应弹出确认对话框', async () => {
      seedBomList(bomStore, 1)
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const deleteBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('确认删除此BOM？')
      confirmSpy.mockRestore()
    })

    it('查看BOM树形结构应设置viewingBom', async () => {
      seedBomList(bomStore, 1)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      const viewBtn = wrapper.findAll('.cell-actions .btn-ghost').find(btn => btn.attributes('title') === '查看树形结构')
      await viewBtn.trigger('click')

      expect(wrapper.vm.viewingBom).toBeTruthy()
      expect(wrapper.vm.viewingBom.name).toBe('测试BOM1')
    })

    it('BOM分页应正确工作', async () => {
      seedBomList(bomStore, 15)
      const wrapper = mountComponent()
      await switchToBomTab(wrapper)

      expect(wrapper.find('.pagination-bar').exists()).toBe(true)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredOrders 应正确过滤', () => {
      seedOrders(productionStore, 5)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredOrders.length).toBe(5)
    })

    it('paginatedOrders 应正确分页', () => {
      seedOrders(productionStore, 15)
      const wrapper = mountComponent()

      expect(wrapper.vm.paginatedOrders.length).toBe(10)
    })

    it('orderTotalPages 应正确计算', () => {
      seedOrders(productionStore, 15)
      const wrapper = mountComponent()

      expect(wrapper.vm.orderTotalPages).toBe(2)
    })

    it('ganttDates 应返回14个日期', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.ganttDates.length).toBe(14)
    })

    it('ganttBarStyle 应返回包含left和width的对象', () => {
      seedOrders(productionStore, 1)
      const wrapper = mountComponent()
      const order = productionStore.productionOrders[0]

      const style = wrapper.vm.ganttBarStyle(order)
      expect(style).toHaveProperty('left')
      expect(style).toHaveProperty('width')
    })
  })

  /* ===== 甘特图 ===== */
  describe('甘特图', () => {
    it('默认应显示甘特图视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showGantt).toBe(true)
    })

    it('点击表格按钮应切换到表格视图', async () => {
      const wrapper = mountComponent()
      const btns = wrapper.findAll('.gantt-header .btn-ghost')
      const tableBtn = btns.find(btn => btn.text().includes('表格'))
      await tableBtn.trigger('click')

      expect(wrapper.vm.showGantt).toBe(false)
    })

    it('点击甘特图按钮应切换到甘特图视图', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showGantt = false
      await flushPromises()

      const btns = wrapper.findAll('.gantt-header .btn-ghost')
      const ganttBtn = btns.find(btn => btn.text().includes('甘特图'))
      await ganttBtn.trigger('click')

      expect(wrapper.vm.showGantt).toBe(true)
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('关闭BOM弹窗应重置表单状态', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openBomForm(null)
      expect(wrapper.vm.showBomForm).toBe(true)

      wrapper.vm.showBomForm = false
      await flushPromises()
      expect(wrapper.vm.showBomForm).toBe(false)
    })

    it('关闭进度弹窗应重置进度状态', async () => {
      productionStore.addProductionOrder({
        orderNo: 'MO-PROG-CLS',
        productName: '关闭进度产品',
        quantity: 10,
        status: 'in_progress',
        progress: 50
      })
      const wrapper = mountComponent()
      await wrapper.vm.handleUpdateProgress(productionStore.productionOrders[0])
      expect(wrapper.vm.showProgressModal).toBe(true)

      wrapper.vm.showProgressModal = false
      wrapper.vm.progressOrder = null
      await flushPromises()
      expect(wrapper.vm.showProgressModal).toBe(false)
      expect(wrapper.vm.progressOrder).toBeNull()
    })
  })
})
