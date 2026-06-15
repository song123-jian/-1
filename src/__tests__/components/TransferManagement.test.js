/**
 * TransferManagement.vue 组件级测试
 * 覆盖：渲染、搜索过滤、分页、流程看板、CRUD弹窗、确认弹窗、计算属性、概览面板、预警
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import TransferManagement from '@/modules/warehouse/views/TransferManagement.vue'
import { useTransferStore } from '@/modules/warehouse/stores/transfer'
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
const TransferFormModalStub = {
  name: 'TransferFormModal',
  template: '<div class="transfer-form-modal-stub"></div>',
  emits: ['close', 'created']
}

const TransferPreviewStub = {
  name: 'TransferPreview',
  props: ['order'],
  template: '<div class="transfer-preview-stub"></div>',
  emits: ['close']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(TransferManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        TransferFormModal: TransferFormModalStub,
        TransferPreview: TransferPreviewStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加调拨单数据 ===== */
function seedTransfers(store, count = 5) {
  const statuses = ['draft', 'pending', 'approved', 'in_transit', 'completed']
  const types = ['same_price', 'diff_price']
  for (let i = 0; i < count; i++) {
    store.addTransferOrder({
      type: types[i % 2],
      fromWarehouseId: 'main',
      fromWarehouseName: '主仓库',
      toWarehouseId: ['A', 'B', 'C'][i % 3],
      toWarehouseName: ['A区(原料仓)', 'B区(成品仓)', 'C区(危化仓)'][i % 3],
      items: [
        {
          materialCode: `MTL-TF-${String(i + 1).padStart(3, '0')}`,
          materialName: `调拨物料${i + 1}`,
          quantity: 50 + i * 10,
          unitPrice: 80 + i * 5
        }
      ],
      requester: `申请人${i + 1}`,
      expectedDate: `2026-06-${String(10 + i).padStart(2, '0')}`,
      notes: `调拨备注${i + 1}`
    })
    // 推进状态
    if (i >= 1) store.submitTransferOrder(store.transferOrders[0].id)
    if (i >= 2) store.approveTransferOrder(store.transferOrders[0].id, '仓库主管')
    if (i >= 3) store.shipTransferOrder(store.transferOrders[0].id)
  }
}

/* ===== 辅助：添加不同状态的调拨单 ===== */
function seedMixedStatusTransfers(store) {
  // 草稿
  store.addTransferOrder({
    type: 'same_price',
    fromWarehouseId: 'main',
    fromWarehouseName: '主仓库',
    toWarehouseId: 'A',
    toWarehouseName: 'A区(原料仓)',
    items: [{ materialCode: 'MTL-D1', materialName: '草稿物料', quantity: 100, unitPrice: 50 }],
    requester: '张三',
    expectedDate: '2026-06-15',
    notes: '草稿单'
  })

  // 待审批
  const pending = store.addTransferOrder({
    type: 'diff_price',
    fromWarehouseId: 'A',
    fromWarehouseName: 'A区(原料仓)',
    toWarehouseId: 'main',
    toWarehouseName: '主仓库',
    items: [{ materialCode: 'MTL-P1', materialName: '待审批物料', quantity: 200, unitPrice: 80 }],
    requester: '李四',
    expectedDate: '2026-06-16',
    notes: '待审批单'
  })
  store.submitTransferOrder(pending.id)

  // 已审批
  const approved = store.addTransferOrder({
    type: 'same_price',
    fromWarehouseId: 'main',
    fromWarehouseName: '主仓库',
    toWarehouseId: 'B',
    toWarehouseName: 'B区(成品仓)',
    items: [{ materialCode: 'MTL-A1', materialName: '已审批物料', quantity: 150, unitPrice: 60 }],
    requester: '王五',
    expectedDate: '2026-06-17',
    notes: '已审批单'
  })
  store.submitTransferOrder(approved.id)
  store.approveTransferOrder(approved.id, '仓库主管')

  // 在途
  const inTransit = store.addTransferOrder({
    type: 'same_price',
    fromWarehouseId: 'B',
    fromWarehouseName: 'B区(成品仓)',
    toWarehouseId: 'main',
    toWarehouseName: '主仓库',
    items: [{ materialCode: 'MTL-T1', materialName: '在途物料', quantity: 80, unitPrice: 90 }],
    requester: '赵六',
    expectedDate: '2026-06-18',
    notes: '在途单'
  })
  store.submitTransferOrder(inTransit.id)
  store.approveTransferOrder(inTransit.id, '仓库主管')
  store.shipTransferOrder(inTransit.id)

  // 已完成
  const completed = store.addTransferOrder({
    type: 'diff_price',
    fromWarehouseId: 'main',
    fromWarehouseName: '主仓库',
    toWarehouseId: 'C',
    toWarehouseName: 'C区(危化仓)',
    items: [{ materialCode: 'MTL-C1', materialName: '已完成物料', quantity: 300, unitPrice: 120 }],
    requester: '钱七',
    expectedDate: '2026-06-19',
    notes: '已完成单'
  })
  store.submitTransferOrder(completed.id)
  store.approveTransferOrder(completed.id, '仓库主管')
  store.shipTransferOrder(completed.id)
  // 收货需要库存数据，直接修改状态
  const idx = store.transferOrders.findIndex(o => o.id === completed.id)
  if (idx !== -1) {
    store.transferOrders[idx].status = 'completed'
    store.transferOrders[idx].actualDate = '2026-06-19'
    store.persist()
  }
}

describe('TransferManagement 组件', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useTransferStore()
    invStore = useInventoryStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toContain('调拨管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('管理仓库间物料调拨')
    })

    it('应渲染新增调拨单按钮', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.btn-primary')
      expect(btn.text()).toContain('新增调拨单')
    })

    it('应渲染流程看板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.flow-board').exists()).toBe(true)
    })

    it('应渲染筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state').text()).toContain('暂无调拨单')
    })

    it('有数据时应渲染表格行', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('应渲染折叠统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按单号搜索应过滤结果', async () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('DB')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        if (!row.find('.empty-state').exists()) {
          expect(row.text()).toContain('DB')
        }
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('select.form-select')
      const statusSelect = selects[0]
      await statusSelect.setValue('pending')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        if (!row.find('.empty-state').exists()) {
          expect(row.text()).toContain('待审批')
        }
      })
    })

    it('按类型过滤应过滤结果', async () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('select.form-select')
      const typeSelect = selects[1]
      await typeSelect.setValue('same_price')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        if (!row.find('.empty-state').exists()) {
          expect(row.text()).toContain('同价调拨')
        }
      })
    })

    it('搜索和过滤条件变更时应重置到第一页', async () => {
      // 添加足够多的数据以产生分页
      for (let i = 0; i < 20; i++) {
        store.addTransferOrder({
          type: i % 2 === 0 ? 'same_price' : 'diff_price',
          fromWarehouseId: 'main',
          fromWarehouseName: '主仓库',
          toWarehouseId: 'A',
          toWarehouseName: 'A区(原料仓)',
          items: [{ materialCode: `MTL-P-${i}`, materialName: `物料${i}`, quantity: 10, unitPrice: 50 }],
          notes: `备注${i}`
        })
      }
      const wrapper = mountComponent()
      wrapper.vm.currentPage = 2
      await flushPromises()

      const input = wrapper.find('input.form-input')
      await input.setValue('测试')
      await flushPromises()

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      for (let i = 0; i < 20; i++) {
        store.addTransferOrder({
          type: 'same_price',
          fromWarehouseId: 'main',
          fromWarehouseName: '主仓库',
          toWarehouseId: 'A',
          toWarehouseName: 'A区(原料仓)',
          items: [{ materialCode: `MTL-PG-${i}`, materialName: `分页物料${i}`, quantity: 10, unitPrice: 50 }]
        })
      }
      const wrapper = mountComponent()
      await flushPromises()

      // 检查分页区域
      expect(wrapper.findAll('button').some(b => b.text().includes('上一页'))).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-FEW', materialName: '少量物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      // totalPages <= 1 时不显示分页
      expect(wrapper.vm.totalPages).toBe(1)
    })

    it('点击下一页应更新当前页', async () => {
      for (let i = 0; i < 20; i++) {
        store.addTransferOrder({
          type: 'same_price',
          fromWarehouseId: 'main',
          fromWarehouseName: '主仓库',
          toWarehouseId: 'A',
          toWarehouseName: 'A区(原料仓)',
          items: [{ materialCode: `MTL-NP-${i}`, materialName: `翻页物料${i}`, quantity: 10, unitPrice: 50 }]
        })
      }
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('button').find(b => b.text().includes('下一页'))
      if (nextBtn) {
        await nextBtn.trigger('click')
        expect(wrapper.vm.currentPage).toBe(2)
      }
    })
  })

  /* ===== 流程看板 ===== */
  describe('流程看板', () => {
    it('流程看板应显示各状态节点', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const nodes = wrapper.findAll('.flow-board-node')
      expect(nodes.length).toBe(5) // draft, pending, approved, in_transit, completed
    })

    it('点击流程看板节点应设置状态过滤', async () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const nodes = wrapper.findAll('.flow-board-node')
      await nodes[1].trigger('click') // pending

      expect(wrapper.vm.statusFilter).toBe('pending')
    })

    it('再次点击同一节点应取消过滤', async () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const nodes = wrapper.findAll('.flow-board-node')
      await nodes[1].trigger('click')
      expect(wrapper.vm.statusFilter).toBe('pending')

      await nodes[1].trigger('click')
      expect(wrapper.vm.statusFilter).toBe('')
    })

    it('流程看板节点应显示正确数量', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const steps = wrapper.vm.flowBoardSteps
      expect(steps.length).toBe(5)
      // 至少有一个 pending 状态
      const pendingStep = steps.find(s => s.status === 'pending')
      expect(pendingStep.count).toBeGreaterThanOrEqual(1)
    })
  })

  /* ===== 新增调拨单 ===== */
  describe('新增调拨单', () => {
    it('点击新增按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.find('.transfer-form-modal-stub').exists()).toBe(true)
    })

    it('弹窗触发 close 应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showFormModal = true
      await flushPromises()

      await wrapper.findComponent({ name: 'TransferFormModal' }).vm.$emit('close')
      await flushPromises()

      expect(wrapper.vm.showFormModal).toBe(false)
    })

    it('弹窗触发 created 应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showFormModal = true
      await flushPromises()

      await wrapper.findComponent({ name: 'TransferFormModal' }).vm.$emit('created')
      await flushPromises()

      expect(wrapper.vm.showFormModal).toBe(false)
    })
  })

  /* ===== 操作按钮 ===== */
  describe('操作按钮', () => {
    it('草稿状态应显示提交按钮', async () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-D', materialName: '草稿物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await flushPromises()

      const actionBtns = wrapper.findAll('.action-btn')
      const submitBtn = actionBtns.find(b => b.text().includes('提交'))
      expect(submitBtn).toBeDefined()
    })

    it('待审批状态应显示审批和拒绝按钮', async () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-P', materialName: '待审批物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)

      const wrapper = mountComponent()
      await flushPromises()

      const actionBtns = wrapper.findAll('.action-btn')
      expect(actionBtns.some(b => b.text().includes('审批'))).toBe(true)
      expect(actionBtns.some(b => b.text().includes('拒绝'))).toBe(true)
    })

    it('已审批状态应显示发货按钮', async () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-A', materialName: '已审批物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.approveTransferOrder(order.id, '仓库主管')

      const wrapper = mountComponent()
      await flushPromises()

      const actionBtns = wrapper.findAll('.action-btn')
      expect(actionBtns.some(b => b.text().includes('发货'))).toBe(true)
    })

    it('在途状态应显示收货按钮', async () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-IT', materialName: '在途物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.approveTransferOrder(order.id, '仓库主管')
      store.shipTransferOrder(order.id)

      const wrapper = mountComponent()
      await flushPromises()

      const actionBtns = wrapper.findAll('.action-btn')
      expect(actionBtns.some(b => b.text().includes('收货'))).toBe(true)
    })

    it('预览按钮应始终显示', () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-PV', materialName: '预览物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()

      const actionBtns = wrapper.findAll('.action-btn')
      expect(actionBtns.some(b => b.text().includes('预览'))).toBe(true)
    })
  })

  /* ===== 确认弹窗 ===== */
  describe('确认弹窗', () => {
    it('提交操作应弹出确认对话框', async () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-SUB', materialName: '提交物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await flushPromises()

      const submitBtn = wrapper.findAll('.action-btn').find(b => b.text().includes('提交'))
      if (submitBtn) {
        await submitBtn.trigger('click')
        expect(wrapper.vm.confirmVisible).toBe(true)
        expect(wrapper.vm.confirmTitle).toBe('提交确认')
      }
    })

    it('确认操作应执行回调', async () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-CF', materialName: '确认物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleSubmit(store.transferOrders[0])
      expect(wrapper.vm.confirmVisible).toBe(true)

      await wrapper.vm.confirmAction()
      expect(wrapper.vm.confirmVisible).toBe(false)
      expect(store.transferOrders[0].status).toBe('pending')
    })

    it('取消确认应关闭弹窗不执行操作', async () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-CC', materialName: '取消确认物料', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleSubmit(store.transferOrders[0])
      expect(wrapper.vm.confirmVisible).toBe(true)

      wrapper.vm.confirmVisible = false
      await flushPromises()

      expect(store.transferOrders[0].status).toBe('draft')
    })
  })

  /* ===== 预览弹窗 ===== */
  describe('预览弹窗', () => {
    it('点击预览应设置 previewOrder', async () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-PV2', materialName: '预览物料2', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handlePreview(store.transferOrders[0])
      expect(wrapper.vm.previewOrder).toBe(store.transferOrders[0])
      expect(wrapper.find('.transfer-preview-stub').exists()).toBe(true)
    })

    it('关闭预览应清空 previewOrder', async () => {
      store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-PV3', materialName: '预览物料3', quantity: 10, unitPrice: 50 }]
      })
      const wrapper = mountComponent()
      await wrapper.vm.handlePreview(store.transferOrders[0])
      expect(wrapper.vm.previewOrder).not.toBeNull()

      await wrapper.findComponent({ name: 'TransferPreview' }).vm.$emit('close')
      await flushPromises()

      expect(wrapper.vm.previewOrder).toBeNull()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionRate 应正确计算完成率', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const rate = wrapper.vm.completionRate
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('无调拨单时完成率应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)
    })

    it('completionRateColor 应根据完成率返回不同颜色', () => {
      const wrapper = mountComponent()
      // 0% -> danger
      expect(wrapper.vm.completionRateColor).toBe('var(--color-danger)')
    })

    it('transferTypeStats 应正确统计类型分布', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const stats = wrapper.vm.transferTypeStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('label')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('percent')
        expect(s).toHaveProperty('color')
      })
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

    it('filteredOrders 应根据搜索和过滤条件筛选', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      // 无过滤
      expect(wrapper.vm.filteredOrders.length).toBe(store.transferOrders.length)

      // 状态过滤
      wrapper.vm.statusFilter = 'pending'
      const filtered = wrapper.vm.filteredOrders
      filtered.forEach(o => {
        expect(o.status).toBe('pending')
      })
    })

    it('pagedOrders 应根据分页返回数据', () => {
      for (let i = 0; i < 20; i++) {
        store.addTransferOrder({
          type: 'same_price',
          fromWarehouseId: 'main',
          fromWarehouseName: '主仓库',
          toWarehouseId: 'A',
          toWarehouseName: 'A区(原料仓)',
          items: [{ materialCode: `MTL-PG2-${i}`, materialName: `分页物料${i}`, quantity: 10, unitPrice: 50 }]
        })
      }
      const wrapper = mountComponent()

      expect(wrapper.vm.pagedOrders.length).toBeLessThanOrEqual(15)
    })

    it('pendingAlerts 应返回待处理预警', () => {
      seedMixedStatusTransfers(store)
      const wrapper = mountComponent()

      const alerts = wrapper.vm.pendingAlerts
      alerts.forEach(a => {
        expect(['pending', 'in_transit']).toContain(a.status)
      })
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('默认不展开统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showTransferStatsExpanded).toBe(false)
    })

    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showTransferStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showTransferStatsExpanded).toBe(false)
    })
  })

  /* ===== Store 操作 ===== */
  describe('Store 操作', () => {
    it('审批调拨单应更新状态', () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-AP', materialName: '审批物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.approveTransferOrder(order.id, '仓库主管')

      expect(store.transferOrders.find(o => o.id === order.id).status).toBe('approved')
    })

    it('拒绝调拨单应取消', () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-RJ', materialName: '拒绝物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.rejectTransferOrder(order.id)

      expect(store.transferOrders.find(o => o.id === order.id).status).toBe('cancelled')
    })

    it('取消调拨单应更新状态', () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-CL', materialName: '取消物料', quantity: 10, unitPrice: 50 }]
      })
      store.cancelTransferOrder(order.id)

      expect(store.transferOrders.find(o => o.id === order.id).status).toBe('cancelled')
    })

    it('发货调拨单应更新状态', () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'A',
        toWarehouseName: 'A区(原料仓)',
        items: [{ materialCode: 'MTL-SH', materialName: '发货物料', quantity: 10, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.approveTransferOrder(order.id, '仓库主管')
      store.shipTransferOrder(order.id)

      expect(store.transferOrders.find(o => o.id === order.id).status).toBe('in_transit')
    })

    it('统计计算应正确', () => {
      seedMixedStatusTransfers(store)
      expect(store.totalOrders).toBeGreaterThan(0)
      expect(store.pendingCount).toBeGreaterThanOrEqual(0)
      expect(store.inTransitCount).toBeGreaterThanOrEqual(0)
      expect(store.completedCount).toBeGreaterThanOrEqual(0)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('组件挂载时应正常初始化', () => {
      expect(() => mountComponent()).not.toThrow()
    })

    it('组件卸载时应正常销毁', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
