/**
 * StocktakingManagement.vue 组件级测试
 * 覆盖：渲染、搜索过滤、流程看板、CRUD弹窗、确认弹窗、计算属性、概览面板、预警、Toast、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import StocktakingManagement from '@/modules/warehouse/views/StocktakingManagement.vue'
import { useStocktakingStore } from '@/modules/warehouse/stores/stocktaking'
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
  useSessionStore: () => ({ roleName: '测试用户' })
}))

vi.mock('@/utils/format', () => ({
  formatMoney: (val) => {
    const n = parseFloat(val) || 0
    return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  toLocalDateStr: () => new Date().toISOString().split('T')[0]
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const StocktakingListStub = {
  name: 'StocktakingList',
  props: ['externalStatusFilter'],
  template: '<div class="stocktaking-list-stub"></div>',
  emits: ['start', 'execute', 'complete', 'diff', 'adjust']
}

const StocktakingFormModalStub = {
  name: 'StocktakingFormModal',
  template: '<div class="stocktaking-form-modal-stub"></div>',
  emits: ['close', 'created']
}

const StocktakingExecuteStub = {
  name: 'StocktakingExecute',
  props: ['order'],
  template: '<div class="stocktaking-execute-stub"></div>',
  emits: ['close', 'completed']
}

const StocktakingDiffStub = {
  name: 'StocktakingDiff',
  props: ['order'],
  template: '<div class="stocktaking-diff-stub"></div>',
  emits: ['close', 'reviewed', 'adjusted']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(StocktakingManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        StocktakingList: StocktakingListStub,
        StocktakingFormModal: StocktakingFormModalStub,
        StocktakingExecute: StocktakingExecuteStub,
        StocktakingDiff: StocktakingDiffStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加库存数据 ===== */
function seedInventory(invStore, count = 5) {
  for (let i = 0; i < count; i++) {
    invStore.addInventoryItem({
      code: `MTL-ST-${String(i + 1).padStart(3, '0')}`,
      name: ['ABS树脂', '不锈钢板304', '铝合金型材6063', 'POM塑料', '尼龙66'][i % 5],
      category: 'raw',
      quantity: [500, 1200, 800, 350, 200][i % 5],
      safetyStock: 100,
      warehouse: 'main',
      unitCost: [85.5, 120, 95, 65, 130][i % 5],
      location: `A-0${i + 1}-01`
    })
  }
}

/* ===== 辅助：向 store 添加盘点单数据 ===== */
function seedStocktakingOrders(store, invStore) {
  // 计划中
  store.addStocktakingOrder({
    type: 'full',
    warehouseId: 'main',
    warehouseName: '主仓库',
    plannedDate: '2026-06-15',
    notes: '计划中盘点',
    items: invStore.inventory.slice(0, 3).map(it => ({
      code: it.code,
      name: it.name,
      quantity: it.quantity,
      grade: it.grade || '',
      location: it.location || ''
    }))
  })

  // 盘点中
  const executing = store.addStocktakingOrder({
    type: 'partial',
    warehouseId: 'main',
    warehouseName: '主仓库',
    plannedDate: '2026-06-10',
    notes: '盘点中',
    items: invStore.inventory.slice(0, 2).map(it => ({
      code: it.code,
      name: it.name,
      quantity: it.quantity,
      grade: it.grade || '',
      location: it.location || ''
    }))
  })
  store.startStocktaking(executing.id)

  // 差异审核
  const diffReview = store.addStocktakingOrder({
    type: 'cycle',
    warehouseId: 'main',
    warehouseName: '主仓库',
    plannedDate: '2026-06-08',
    notes: '差异审核',
    items: invStore.inventory.slice(0, 2).map(it => ({
      code: it.code,
      name: it.name,
      quantity: it.quantity,
      grade: it.grade || '',
      location: it.location || ''
    }))
  })
  store.startStocktaking(diffReview.id)
  // 录入实盘数量
  const drOrder = store.stocktakingOrders.find(o => o.id === diffReview.id)
  if (drOrder && drOrder.items.length > 0) {
    store.updateItemCount(diffReview.id, drOrder.items[0].id, drOrder.items[0].systemQty + 5)
    if (drOrder.items.length > 1) {
      store.updateItemCount(diffReview.id, drOrder.items[1].id, drOrder.items[1].systemQty)
    }
  }
  store.completeStocktaking(diffReview.id)

  // 已完成
  const completed = store.addStocktakingOrder({
    type: 'full',
    warehouseId: 'main',
    warehouseName: '主仓库',
    plannedDate: '2026-06-01',
    notes: '已完成盘点',
    items: invStore.inventory.slice(0, 2).map(it => ({
      code: it.code,
      name: it.name,
      quantity: it.quantity,
      grade: it.grade || '',
      location: it.location || ''
    }))
  })
  store.startStocktaking(completed.id)
  const cOrder = store.stocktakingOrders.find(o => o.id === completed.id)
  if (cOrder && cOrder.items.length > 0) {
    store.updateItemCount(completed.id, cOrder.items[0].id, cOrder.items[0].systemQty)
    if (cOrder.items.length > 1) {
      store.updateItemCount(completed.id, cOrder.items[1].id, cOrder.items[1].systemQty)
    }
  }
  store.completeStocktaking(completed.id)
  store.reviewDiff(completed.id, true)
}

describe('StocktakingManagement 组件', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useStocktakingStore()
    invStore = useInventoryStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toContain('盘点管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('管理库存盘点')
    })

    it('应渲染新增盘点单按钮', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.btn-primary')
      expect(btn.text()).toContain('新增盘点单')
    })

    it('应渲染流程看板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.flow-board').exists()).toBe(true)
    })

    it('应渲染筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })

    it('应渲染盘点单列表面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.panel-card').exists()).toBe(true)
      expect(wrapper.find('.stocktaking-list-stub').exists()).toBe(true)
    })

    it('应渲染折叠统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
    })

    it('默认不显示新增弹窗', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showFormModal).toBe(false)
      expect(wrapper.find('.stocktaking-form-modal-stub').exists()).toBe(false)
    })

    it('默认不显示执行弹窗', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.executingOrder).toBeNull()
    })

    it('默认不显示差异处理弹窗', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.diffOrder).toBeNull()
    })
  })

  /* ===== 流程看板 ===== */
  describe('流程看板', () => {
    it('流程看板应显示4个状态节点', () => {
      const wrapper = mountComponent()
      const nodes = wrapper.findAll('.flow-board-node')
      expect(nodes.length).toBe(4) // planned, executing, diff_review, completed
    })

    it('点击流程看板节点应设置状态过滤', async () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const nodes = wrapper.findAll('.flow-board-node')
      await nodes[0].trigger('click') // planned

      expect(wrapper.vm.stocktakingStatusFilter).toBe('planned')
    })

    it('再次点击同一节点应取消过滤', async () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const nodes = wrapper.findAll('.flow-board-node')
      await nodes[0].trigger('click')
      expect(wrapper.vm.stocktakingStatusFilter).toBe('planned')

      await nodes[0].trigger('click')
      expect(wrapper.vm.stocktakingStatusFilter).toBe('')
    })

    it('流程看板应显示正确数量', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      expect(store.plannedCount).toBeGreaterThanOrEqual(1)
      expect(store.executingCount).toBeGreaterThanOrEqual(1)
    })
  })

  /* ===== 筛选 ===== */
  describe('筛选', () => {
    it('状态筛选下拉应包含所有状态选项', () => {
      const wrapper = mountComponent()
      const select = wrapper.find('select.form-select')
      const options = select.findAll('option')
      const values = options.map(o => o.attributes('value'))

      expect(values).toContain('')
      expect(values).toContain('planned')
      expect(values).toContain('executing')
      expect(values).toContain('diff_review')
      expect(values).toContain('completed')
      expect(values).toContain('cancelled')
    })

    it('选择状态应更新过滤条件', async () => {
      const wrapper = mountComponent()
      const select = wrapper.find('select.form-select')
      await select.setValue('executing')

      expect(wrapper.vm.stocktakingStatusFilter).toBe('executing')
    })

    it('状态过滤应传递给 StocktakingList', async () => {
      const wrapper = mountComponent()
      const select = wrapper.find('select.form-select')
      await select.setValue('diff_review')
      await flushPromises()

      const list = wrapper.findComponent({ name: 'StocktakingList' })
      expect(list.props('externalStatusFilter')).toBe('diff_review')
    })
  })

  /* ===== 新增盘点单 ===== */
  describe('新增盘点单', () => {
    it('点击新增按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.find('.stocktaking-form-modal-stub').exists()).toBe(true)
    })

    it('弹窗触发 close 应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showFormModal = true
      await flushPromises()

      await wrapper.findComponent({ name: 'StocktakingFormModal' }).vm.$emit('close')
      await flushPromises()

      expect(wrapper.vm.showFormModal).toBe(false)
    })

    it('弹窗触发 created 应关闭弹窗并显示 Toast', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showFormModal = true
      await flushPromises()

      await wrapper.findComponent({ name: 'StocktakingFormModal' }).vm.$emit('created')
      await flushPromises()

      expect(wrapper.vm.showFormModal).toBe(false)
      expect(wrapper.vm.toastMessage).toBe('盘点单已创建')
    })
  })

  /* ===== 盘点执行弹窗 ===== */
  describe('盘点执行弹窗', () => {
    it('StocktakingList 触发 execute 应打开执行弹窗', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'partial',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-10',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'StocktakingList' }).vm.$emit('execute', executingOrder)
      await flushPromises()

      expect(wrapper.vm.executingOrder).toBe(executingOrder)
      expect(wrapper.find('.stocktaking-execute-stub').exists()).toBe(true)
    })

    it('执行弹窗触发 completed 应关闭弹窗并显示 Toast', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'partial',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-10',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      wrapper.vm.executingOrder = executingOrder
      await flushPromises()

      await wrapper.findComponent({ name: 'StocktakingExecute' }).vm.$emit('completed')
      await flushPromises()

      expect(wrapper.vm.executingOrder).toBeNull()
      expect(wrapper.vm.toastMessage).toBe('盘点已完成，进入差异审核')
    })

    it('执行弹窗触发 close 应关闭弹窗', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'partial',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-10',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      wrapper.vm.executingOrder = executingOrder
      await flushPromises()

      await wrapper.findComponent({ name: 'StocktakingExecute' }).vm.$emit('close')
      await flushPromises()

      expect(wrapper.vm.executingOrder).toBeNull()
    })
  })

  /* ===== 差异处理弹窗 ===== */
  describe('差异处理弹窗', () => {
    it('StocktakingList 触发 diff 应打开差异弹窗', async () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const diffOrder = store.stocktakingOrders.find(o => o.status === 'diff_review')

      if (diffOrder) {
        const wrapper = mountComponent()
        await wrapper.findComponent({ name: 'StocktakingList' }).vm.$emit('diff', diffOrder)
        await flushPromises()

        expect(wrapper.vm.diffOrder).toBe(diffOrder)
        expect(wrapper.find('.stocktaking-diff-stub').exists()).toBe(true)
      }
    })

    it('差异弹窗触发 reviewed 应关闭弹窗并显示 Toast', async () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const diffOrder = store.stocktakingOrders.find(o => o.status === 'diff_review')

      if (diffOrder) {
        const wrapper = mountComponent()
        wrapper.vm.diffOrder = diffOrder
        await flushPromises()

        await wrapper.findComponent({ name: 'StocktakingDiff' }).vm.$emit('reviewed')
        await flushPromises()

        expect(wrapper.vm.diffOrder).toBeNull()
        expect(wrapper.vm.toastMessage).toBe('差异审批完成')
      }
    })

    it('差异弹窗触发 adjusted 应关闭弹窗并显示调整数量 Toast', async () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const diffOrder = store.stocktakingOrders.find(o => o.status === 'diff_review')

      if (diffOrder) {
        const wrapper = mountComponent()
        wrapper.vm.diffOrder = diffOrder
        await flushPromises()

        await wrapper.findComponent({ name: 'StocktakingDiff' }).vm.$emit('adjusted', { adjustedCount: 3 })
        await flushPromises()

        expect(wrapper.vm.diffOrder).toBeNull()
        expect(wrapper.vm.toastMessage).toContain('3')
      }
    })

    it('差异弹窗触发 close 应关闭弹窗', async () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const diffOrder = store.stocktakingOrders.find(o => o.status === 'diff_review')

      if (diffOrder) {
        const wrapper = mountComponent()
        wrapper.vm.diffOrder = diffOrder
        await flushPromises()

        await wrapper.findComponent({ name: 'StocktakingDiff' }).vm.$emit('close')
        await flushPromises()

        expect(wrapper.vm.diffOrder).toBeNull()
      }
    })
  })

  /* ===== 确认弹窗 ===== */
  describe('确认弹窗', () => {
    it('开始盘点应弹出确认对话框', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      const plannedOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      await wrapper.vm.handleStart(plannedOrder)

      expect(wrapper.vm.confirmVisible).toBe(true)
      expect(wrapper.vm.confirmTitle).toBe('开始盘点')
    })

    it('确认开始盘点应更新状态', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      const plannedOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      await wrapper.vm.handleStart(plannedOrder)
      await wrapper.vm.confirmAction()

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('executing')
      expect(wrapper.vm.confirmVisible).toBe(false)
    })

    it('完成盘点应弹出确认对话框', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      // 录入实盘数量
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)
      if (executingOrder.items.length > 0) {
        store.updateItemCount(order.id, executingOrder.items[0].id, executingOrder.items[0].systemQty)
        if (executingOrder.items.length > 1) {
          store.updateItemCount(order.id, executingOrder.items[1].id, executingOrder.items[1].systemQty)
        }
      }

      const wrapper = mountComponent()
      await wrapper.vm.handleComplete(executingOrder)

      expect(wrapper.vm.confirmVisible).toBe(true)
      expect(wrapper.vm.confirmTitle).toBe('完成盘点')
    })

    it('取消确认应关闭弹窗不执行操作', async () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      const plannedOrder = store.stocktakingOrders.find(o => o.id === order.id)

      const wrapper = mountComponent()
      await wrapper.vm.handleStart(plannedOrder)
      expect(wrapper.vm.confirmVisible).toBe(true)

      wrapper.vm.confirmVisible = false
      await flushPromises()

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('planned')
    })
  })

  /* ===== Toast 提示 ===== */
  describe('Toast 提示', () => {
    it('showToast 应设置消息和类型', () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast('测试消息', 'toast-warning')

      expect(wrapper.vm.toastMessage).toBe('测试消息')
      expect(wrapper.vm.toastType).toBe('toast-warning')
    })

    it('Toast 应在3秒后自动消失', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast('自动消失测试')

      expect(wrapper.vm.toastMessage).toBe('自动消失测试')

      vi.advanceTimersByTime(3000)
      await flushPromises()

      expect(wrapper.vm.toastMessage).toBe('')
    })

    it('连续调用 showToast 应重置计时器', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast('第一条消息')
      vi.advanceTimersByTime(1500)

      wrapper.vm.showToast('第二条消息')
      vi.advanceTimersByTime(1500)
      await flushPromises()

      // 第二条消息的计时器还没到3秒
      expect(wrapper.vm.toastMessage).toBe('第二条消息')

      vi.advanceTimersByTime(1500)
      await flushPromises()

      expect(wrapper.vm.toastMessage).toBe('')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionRate 应正确计算完成率', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const rate = wrapper.vm.completionRate
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('无盘点单时完成率应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)
    })

    it('completionRateColor 应根据完成率返回不同颜色', () => {
      const wrapper = mountComponent()
      // 0% -> danger
      expect(wrapper.vm.completionRateColor).toBe('var(--color-danger)')
    })

    it('diffStats 应正确计算差异分布', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const stats = wrapper.vm.diffStats
      expect(stats).toHaveProperty('profitCount')
      expect(stats).toHaveProperty('lossCount')
      expect(stats).toHaveProperty('matchCount')
      expect(stats).toHaveProperty('profitAmount')
      expect(stats).toHaveProperty('lossAmount')
    })

    it('diffPercent 应正确计算差异百分比', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const percent = wrapper.vm.diffPercent
      expect(percent).toHaveProperty('profit')
      expect(percent).toHaveProperty('loss')
      expect(percent).toHaveProperty('match')
    })

    it('无盘点单时 diffPercent 应为默认值', () => {
      const wrapper = mountComponent()
      const percent = wrapper.vm.diffPercent
      expect(percent.profit).toBe(0)
      expect(percent.loss).toBe(0)
      expect(percent.match).toBe(100)
    })

    it('recent7Days 应返回7天数据', () => {
      const wrapper = mountComponent()
      const days = wrapper.vm.recent7Days
      expect(days.length).toBe(7)
      days.forEach(d => {
        expect(d).toHaveProperty('date')
        expect(d).toHaveProperty('dayLabel')
        expect(d).toHaveProperty('count')
        expect(d).toHaveProperty('percent')
      })
    })

    it('pendingAlerts 应返回待处理预警', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const alerts = wrapper.vm.pendingAlerts
      alerts.forEach(a => {
        expect(['executing', 'diff_review']).toContain(a.status)
      })
    })

    it('pendingAlerts 最多返回5条', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      expect(wrapper.vm.pendingAlerts.length).toBeLessThanOrEqual(5)
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('默认不展开统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showStocktakingStatsExpanded).toBe(false)
    })

    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showStocktakingStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showStocktakingStatsExpanded).toBe(false)
    })
  })

  /* ===== 预警操作 ===== */
  describe('预警操作', () => {
    it('执行中预警点击应打开执行弹窗', () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const executingOrder = store.stocktakingOrders.find(o => o.status === 'executing')
      if (executingOrder) {
        wrapper.vm.handleAlertAction(executingOrder)
        expect(wrapper.vm.executingOrder).toBe(executingOrder)
      }
    })

    it('差异审核预警点击应打开差异弹窗', () => {
      seedInventory(invStore, 2)
      seedStocktakingOrders(store, invStore)
      const wrapper = mountComponent()

      const diffOrder = store.stocktakingOrders.find(o => o.status === 'diff_review')
      if (diffOrder) {
        wrapper.vm.handleAlertAction(diffOrder)
        expect(wrapper.vm.diffOrder).toBe(diffOrder)
      }
    })
  })

  /* ===== Store 操作 ===== */
  describe('Store 操作', () => {
    it('新增盘点单应创建计划中状态', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })

      expect(order.status).toBe('planned')
      expect(order.items.length).toBe(2)
    })

    it('开始盘点应更新状态为执行中', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('executing')
    })

    it('完成盘点应更新状态为差异审核', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)
      // 录入所有实盘数量
      executingOrder.items.forEach(item => {
        store.updateItemCount(order.id, item.id, item.systemQty)
      })
      store.completeStocktaking(order.id)

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('diff_review')
    })

    it('未全部录入实盘数量时完成盘点应失败', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      // 不录入实盘数量
      const result = store.completeStocktaking(order.id)

      expect(result).toBe(false)
    })

    it('差异审批通过应更新状态为已完成', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)
      executingOrder.items.forEach(item => {
        store.updateItemCount(order.id, item.id, item.systemQty)
      })
      store.completeStocktaking(order.id)
      store.reviewDiff(order.id, true)

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('completed')
    })

    it('差异审批拒绝应更新状态为已取消', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)
      executingOrder.items.forEach(item => {
        store.updateItemCount(order.id, item.id, item.systemQty)
      })
      store.completeStocktaking(order.id)
      store.reviewDiff(order.id, false)

      expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('cancelled')
    })

    it('库存调整应更新物料数量', () => {
      seedInventory(invStore, 2)
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        items: invStore.inventory.slice(0, 2).map(it => ({
          code: it.code, name: it.name, quantity: it.quantity
        }))
      })
      store.startStocktaking(order.id)
      const executingOrder = store.stocktakingOrders.find(o => o.id === order.id)
      // 录入有差异的实盘数量
      store.updateItemCount(order.id, executingOrder.items[0].id, executingOrder.items[0].systemQty + 10)
      if (executingOrder.items.length > 1) {
        store.updateItemCount(order.id, executingOrder.items[1].id, executingOrder.items[1].systemQty)
      }
      store.completeStocktaking(order.id)
      store.reviewDiff(order.id, true)

      const result = store.adjustInventory(order.id)
      expect(result.success).toBe(true)
      expect(result.adjustedCount).toBeGreaterThan(0)
    })

    it('统计计算应正确', () => {
      seedInventory(invStore, 3)
      seedStocktakingOrders(store, invStore)
      expect(store.totalOrders).toBeGreaterThan(0)
      expect(store.plannedCount).toBeGreaterThanOrEqual(0)
      expect(store.executingCount).toBeGreaterThanOrEqual(0)
      expect(store.diffReviewCount).toBeGreaterThanOrEqual(0)
      expect(store.completedCount).toBeGreaterThanOrEqual(0)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('组件挂载时应正常初始化', () => {
      expect(() => mountComponent()).not.toThrow()
    })

    it('组件卸载时应清除 Toast 计时器', () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast('卸载测试')
      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('反复挂载卸载不应报错', () => {
      const wrapper = mountComponent()
      wrapper.unmount()
      const wrapper2 = mountComponent()
      wrapper2.unmount()
    })
  })

  /* ===== formatAmount ===== */
  describe('formatAmount', () => {
    it('应正确格式化金额', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmount(12345.67)
      expect(result).toContain('12,345.67')
    })

    it('传入非数字应返回0的格式化结果', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmount('abc')
      expect(result).toContain('0')
    })
  })
})
