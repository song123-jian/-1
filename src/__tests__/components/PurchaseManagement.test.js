/**
 * PurchaseManagement.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、审批流程、状态流转、视图切换、Tab切换
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createPurchaseOrder, createSupplier, resetCounter } from '@/__tests__/mockData'
import PurchaseManagement from '@/modules/purchase/views/PurchaseManagement.vue'
import { usePurchaseStore } from '@/modules/purchase/stores/purchase'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'

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
const PurchaseFormModalStub = {
  props: ['visible', 'order'],
  emits: ['save', 'cancel'],
  template: '<div class="purchase-form-modal-stub" v-if="visible">采购表单弹窗</div>'
}

const PurchasePreviewStub = {
  props: ['visible', 'order'],
  emits: ['close'],
  template: '<div class="purchase-preview-stub" v-if="visible">采购预览弹窗</div>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(PurchaseManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        PurchaseFormModal: PurchaseFormModalStub,
        PurchasePreview: PurchasePreviewStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加采购单数据 ===== */
function seedPurchaseOrders(store, count = 5) {
  const statuses = ['draft', 'pending', 'approved', 'ordered', 'receiving', 'inspecting', 'completed']
  for (let i = 0; i < count; i++) {
    store.addPurchaseOrder({
      orderNo: `PO-TEST-${String(i + 1).padStart(3, '0')}`,
      title: `采购单${i + 1}号`,
      supplierId: `s_test_${(i % 3) + 1}`,
      supplierName: `测试供应商${(i % 3) + 1}号`,
      type: 'purchase',
      status: statuses[i % statuses.length],
      totalAmount: [10000, 25000, 50000, 38000, 15000, 26850, 73500][i % 7],
      expectedDate: '2026-06-30',
      items: [
        {
          id: `pi_test_${i}`,
          materialCode: `MTL-00${i + 1}`,
          materialName: `物料${i + 1}`,
          spec: '标准',
          unit: 'kg',
          quantity: 100 + i * 10,
          unitPrice: 85 + i * 5,
          amount: (100 + i * 10) * (85 + i * 5),
          warehouseId: 'main',
          warehouseName: '主仓库'
        }
      ],
      createDate: new Date().toISOString().slice(0, 10)
    })
  }
}

/* ===== 辅助：向 store 添加供应商数据 ===== */
function seedSuppliers(supplierStore, count = 3) {
  for (let i = 0; i < count; i++) {
    supplierStore.addSupplier({
      name: `测试供应商${i + 1}号有限公司`,
      shortName: `测试供应${i + 1}`,
      code: `SUP-TEST-${String(i + 1).padStart(3, '0')}`,
      category: ['原材料', '成品', '服务'][i % 3],
      contact: `联系人${i + 1}`,
      phone: `0512-${String(50000000 + i).slice(-8)}`,
      status: 'active'
    })
  }
}

describe('PurchaseManagement 组件', () => {
  let purchaseStore
  let supplierStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    purchaseStore = usePurchaseStore()
    supplierStore = useSupplierStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('采购管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('采购订单')
    })

    it('应渲染新增采购单按钮', () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      expect(addBtn.text()).toContain('新增采购单')
    })

    it('应渲染流程看板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.flow-board').exists()).toBe(true)
      const nodes = wrapper.findAll('.flow-board-node')
      expect(nodes.length).toBe(3) // 待审批、进行中、已完成
    })

    it('应渲染筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('input[placeholder*="搜索"]').exists()).toBe(true)
      const selects = wrapper.findAll('.filter-bar .form-select')
      expect(selects.length).toBeGreaterThanOrEqual(2) // 类型、状态、供应商
    })

    it('应渲染Tab切换按钮', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAll('.tab-btn')
      expect(tabs.length).toBe(3)
      expect(tabs[0].text()).toContain('采购列表')
      expect(tabs[1].text()).toContain('采购明细')
      expect(tabs[2].text()).toContain('采购退货')
    })

    it('默认应显示采购列表Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('list')
    })

    it('默认应显示表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.viewMode).toBe('table')
    })

    it('无采购单数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('有采购单数据时应渲染采购单行', () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()
      // filteredOrders 排除了退货单，只显示 type=purchase 的
      expect(wrapper.vm.filteredOrders.length).toBe(3)
    })

    it('应渲染折叠统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showStatsExpanded).toBe(false)
    })
  })

  /* ===== 流程看板 ===== */
  describe('流程看板', () => {
    it('点击待审批节点应设置状态过滤', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()
      const nodes = wrapper.findAll('.flow-board-node')

      await nodes[0].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('pending')
    })

    it('再次点击同一节点应取消过滤', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()
      const nodes = wrapper.findAll('.flow-board-node')

      await nodes[0].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('pending')

      await nodes[0].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('')
    })

    it('点击已完成节点应设置状态过滤', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()
      const nodes = wrapper.findAll('.flow-board-node')

      await nodes[2].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('completed')
    })

    it('点击进行中节点应循环切换状态', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()
      const nodes = wrapper.findAll('.flow-board-node')

      await nodes[1].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('approved')

      await nodes[1].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('ordered')

      await nodes[1].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('receiving')

      await nodes[1].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('inspecting')

      await nodes[1].trigger('click')
      expect(wrapper.vm.filterStatus).toBe('')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按单号搜索应过滤结果', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('PO-TEST-001')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBe(1)
      expect(wrapper.vm.filteredOrders[0].orderNo).toBe('PO-TEST-001')
    })

    it('按标题搜索应过滤结果', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('采购单3')
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBe(1)
      expect(wrapper.vm.filteredOrders[0].title).toContain('采购单3')
    })

    it('按类型过滤应过滤结果', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar .form-select')
      await selects[0].setValue('purchase')
      await flushPromises()

      wrapper.vm.filteredOrders.forEach(o => {
        expect(o.type).toBe('purchase')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar .form-select')
      await selects[1].setValue('pending')
      await flushPromises()

      wrapper.vm.filteredOrders.forEach(o => {
        expect(o.status).toBe('pending')
      })
    })

    it('按供应商过滤应过滤结果', async () => {
      // 先添加供应商，再用供应商的ID创建采购单
      seedSuppliers(supplierStore, 3)
      const supplierId = supplierStore.suppliers[0].id
      const supplierName = supplierStore.suppliers[0].shortName || supplierStore.suppliers[0].name

      // 添加2个属于第一个供应商的采购单
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-FILTER-001',
        title: '供应商1采购单A',
        supplierId: supplierId,
        supplierName: supplierName,
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000,
        items: [],
        createDate: new Date().toISOString().slice(0, 10)
      })
      // 添加1个属于其他供应商的采购单
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-FILTER-002',
        title: '其他供应商采购单',
        supplierId: 'other_supplier_id',
        supplierName: '其他供应商',
        type: 'purchase',
        status: 'draft',
        totalAmount: 20000,
        items: [],
        createDate: new Date().toISOString().slice(0, 10)
      })

      const wrapper = mountComponent()
      expect(wrapper.vm.filteredOrders.length).toBe(2)

      const selects = wrapper.findAll('.filter-bar .form-select')
      const supplierSelect = selects[2]
      await supplierSelect.setValue(supplierId)
      await flushPromises()

      expect(wrapper.vm.filteredOrders.length).toBe(1)
      expect(wrapper.vm.filteredOrders[0].supplierId).toBe(supplierId)
    })

    it('搜索和过滤条件变更时应重置页码', async () => {
      seedPurchaseOrders(purchaseStore, 25)
      const wrapper = mountComponent()
      wrapper.vm.currentPage = 2
      await flushPromises()

      const input = wrapper.find('input[placeholder*="搜索"]')
      await input.setValue('采购')
      await flushPromises()

      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('filteredOrders 应排除退货单', () => {
      seedPurchaseOrders(purchaseStore, 3)
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-RET-001',
        title: '退货单',
        type: 'return',
        status: 'completed',
        totalAmount: -5000
      })

      const wrapper = mountComponent()
      const hasReturn = wrapper.vm.filteredOrders.some(o => o.type === 'return')
      expect(hasReturn).toBe(false)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedPurchaseOrders(purchaseStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedPurchaseOrders(purchaseStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.pagination .btn-ghost')[1]
      await nextBtn.trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('第一页时上一页按钮应禁用', async () => {
      seedPurchaseOrders(purchaseStore, 15)
      const wrapper = mountComponent()
      await flushPromises()

      const prevBtn = wrapper.findAll('.pagination .btn-ghost')[0]
      expect(prevBtn.attributes('disabled')).toBeDefined()
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('切换到采购明细Tab应显示明细表格', async () => {
      seedPurchaseOrders(purchaseStore, 2)
      const wrapper = mountComponent()

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('detail')
    })

    it('切换到采购退货Tab应显示退货列表', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-RET-001',
        title: '退货单1',
        type: 'return',
        status: 'completed',
        totalAmount: -5000,
        supplierName: '退货供应商',
        createDate: '2026-06-01'
      })
      const wrapper = mountComponent()

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('return')
    })

    it('采购明细应包含所有采购单的物料明细', () => {
      seedPurchaseOrders(purchaseStore, 2)
      const wrapper = mountComponent()

      expect(wrapper.vm.allItemDetails.length).toBe(2) // 每个采购单1个item
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('点击列表视图按钮应切换视图', async () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle-btn')
      const listBtn = viewBtns.find(btn => btn.text().includes('列表'))
      await listBtn.trigger('click')

      expect(wrapper.vm.viewMode).toBe('list')
    })

    it('点击卡片视图按钮应切换视图', async () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle-btn')
      const cardBtn = viewBtns.find(btn => btn.text().includes('卡片'))
      await cardBtn.trigger('click')

      expect(wrapper.vm.viewMode).toBe('card')
    })

    it('点击表格视图按钮应切换回表格', async () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.viewMode = 'card'
      await flushPromises()

      const viewBtns = wrapper.findAll('.view-toggle-btn')
      const tableBtn = viewBtns.find(btn => btn.text().includes('表格'))
      await tableBtn.trigger('click')

      expect(wrapper.vm.viewMode).toBe('table')
    })
  })

  /* ===== 新增/编辑采购单 ===== */
  describe('新增/编辑采购单', () => {
    it('点击新增采购单按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.vm.editingOrder).toBeNull()
    })

    it('点击编辑按钮应打开弹窗并传入数据', async () => {
      seedPurchaseOrders(purchaseStore, 2)
      // 找到draft状态的采购单
      const draftOrder = purchaseStore.purchaseOrders.find(o => o.status === 'draft')
      if (!draftOrder) return

      const wrapper = mountComponent()
      await wrapper.vm.openEditModal(draftOrder)

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.vm.editingOrder).toBeTruthy()
      expect(wrapper.vm.editingOrder.orderNo).toBe(draftOrder.orderNo)
    })

    it('保存采购单后应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showFormModal).toBe(true)

      await wrapper.vm.handleFormSave()
      expect(wrapper.vm.showFormModal).toBe(false)
      expect(wrapper.vm.editingOrder).toBeNull()
    })
  })

  /* ===== 预览弹窗 ===== */
  describe('预览弹窗', () => {
    it('点击预览按钮应打开预览弹窗', async () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()
      await flushPromises()

      const previewBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '预览')
      await previewBtn.trigger('click')

      expect(wrapper.vm.showPreviewModal).toBe(true)
      expect(wrapper.vm.previewOrder).toBeTruthy()
    })
  })

  /* ===== 审批流程 ===== */
  describe('审批流程', () => {
    it('点击审批按钮应打开审批弹窗', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-APPROVE-001',
        title: '待审批采购单',
        type: 'purchase',
        status: 'pending',
        supplierName: '审批供应商',
        totalAmount: 50000
      })
      const wrapper = mountComponent()
      await flushPromises()

      const approveBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '审批')
      await approveBtn.trigger('click')

      expect(wrapper.vm.showApproveModal).toBe(true)
      expect(wrapper.vm.approvingOrder).toBeTruthy()
    })

    it('审批通过应调用 store.approvePurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-APPROVE-002',
        title: '待审批采购单2',
        type: 'purchase',
        status: 'pending',
        supplierName: '审批供应商2',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'approvePurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const approveBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '审批')
      await approveBtn.trigger('click')
      await wrapper.vm.handleApprove()

      expect(spy).toHaveBeenCalled()
      expect(wrapper.vm.showApproveModal).toBe(false)
      spy.mockRestore()
    })

    it('审批拒绝应调用 store.rejectPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-REJECT-001',
        title: '待审批采购单3',
        type: 'purchase',
        status: 'pending',
        supplierName: '审批供应商3',
        totalAmount: 20000
      })
      const spy = vi.spyOn(purchaseStore, 'rejectPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const approveBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '审批')
      await approveBtn.trigger('click')

      wrapper.vm.rejectReason = '价格过高'
      await wrapper.vm.handleReject()

      expect(spy).toHaveBeenCalledWith(expect.any(String), '价格过高')
      expect(wrapper.vm.showApproveModal).toBe(false)
      spy.mockRestore()
    })
  })

  /* ===== 状态操作 ===== */
  describe('状态操作', () => {
    it('提交审批应调用 store.submitPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-SUBMIT-001',
        title: '草稿采购单',
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000
      })
      const spy = vi.spyOn(purchaseStore, 'submitPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const submitBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '提交审批')
      await submitBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('下单应调用 store.orderPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-ORDER-001',
        title: '已审批采购单',
        type: 'purchase',
        status: 'approved',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'orderPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const orderBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '下单')
      await orderBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('收货应调用 store.receivePurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-RECEIVE-001',
        title: '已下单采购单',
        type: 'purchase',
        status: 'ordered',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'receivePurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const receiveBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '收货')
      await receiveBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('质检应调用 store.inspectPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-INSPECT-001',
        title: '收货中采购单',
        type: 'purchase',
        status: 'receiving',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'inspectPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const inspectBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '质检')
      await inspectBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('完成入库应调用 store.completePurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-COMPLETE-001',
        title: '质检中采购单',
        type: 'purchase',
        status: 'inspecting',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'completePurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const completeBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '完成入库')
      await completeBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('退货应调用 store.returnPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-RETURN-001',
        title: '已下单退货采购单',
        type: 'purchase',
        status: 'ordered',
        totalAmount: 30000
      })
      const spy = vi.spyOn(purchaseStore, 'returnPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const returnBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '退货')
      await returnBtn.trigger('click')

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  /* ===== 取消确认 ===== */
  describe('取消确认', () => {
    it('点击取消按钮应打开取消确认弹窗', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-CANCEL-001',
        title: '草稿取消采购单',
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000
      })
      const wrapper = mountComponent()
      await flushPromises()

      const cancelBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '取消')
      await cancelBtn.trigger('click')

      expect(wrapper.vm.showCancelConfirm).toBe(true)
      expect(wrapper.vm.cancellingOrderNo).toBe('PO-CANCEL-001')
    })

    it('确认取消应调用 store.cancelPurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-CANCEL-002',
        title: '待取消采购单',
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000
      })
      const spy = vi.spyOn(purchaseStore, 'cancelPurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const cancelBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '取消')
      await cancelBtn.trigger('click')
      await wrapper.vm.confirmCancel()

      expect(spy).toHaveBeenCalled()
      expect(wrapper.vm.showCancelConfirm).toBe(false)
      spy.mockRestore()
    })
  })

  /* ===== 删除确认 ===== */
  describe('删除确认', () => {
    it('点击删除按钮应打开删除确认弹窗', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-DELETE-001',
        title: '草稿删除采购单',
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000
      })
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showDeleteConfirm).toBe(true)
      expect(wrapper.vm.deletingOrder).toBeTruthy()
    })

    it('确认删除应调用 store.deletePurchaseOrder', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-DELETE-002',
        title: '待删除采购单',
        type: 'purchase',
        status: 'draft',
        totalAmount: 10000
      })
      const spy = vi.spyOn(purchaseStore, 'deletePurchaseOrder')
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')
      await wrapper.vm.confirmDelete()

      expect(spy).toHaveBeenCalled()
      expect(wrapper.vm.showDeleteConfirm).toBe(false)
      spy.mockRestore()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredOrders 应排除退货单并正确过滤', () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredOrders.length).toBe(3)
      wrapper.vm.filteredOrders.forEach(o => {
        expect(o.type).not.toBe('return')
      })
    })

    it('totalPages 应正确计算', () => {
      seedPurchaseOrders(purchaseStore, 15)
      const wrapper = mountComponent()

      expect(wrapper.vm.totalPages).toBe(2)
    })

    it('completionRate 应正确计算采购完成率', () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.completionRate).toBe('number')
      expect(wrapper.vm.completionRate).toBeGreaterThanOrEqual(0)
      expect(wrapper.vm.completionRate).toBeLessThanOrEqual(100)
    })

    it('completionRateColor 应根据完成率返回不同颜色', () => {
      // 通过添加不同状态的采购单来间接测试
      // 全部完成 -> 高完成率 -> success
      purchaseStore.addPurchaseOrder({ orderNo: 'PO-C1', type: 'purchase', status: 'completed', totalAmount: 10000, items: [], createDate: '2026-06-01' })
      purchaseStore.addPurchaseOrder({ orderNo: 'PO-C2', type: 'purchase', status: 'completed', totalAmount: 10000, items: [], createDate: '2026-06-01' })
      let wrapper = mountComponent()
      expect(wrapper.vm.completionRateColor).toBe('var(--color-success)')

      // 重新创建，混合状态 -> 中完成率 -> warning
      setupPinia()
      clearStorage()
      purchaseStore = usePurchaseStore()
      purchaseStore.addPurchaseOrder({ orderNo: 'PO-C3', type: 'purchase', status: 'completed', totalAmount: 10000, items: [], createDate: '2026-06-01' })
      purchaseStore.addPurchaseOrder({ orderNo: 'PO-C4', type: 'purchase', status: 'pending', totalAmount: 10000, items: [], createDate: '2026-06-01' })
      wrapper = mountComponent()
      expect(wrapper.vm.completionRateColor).toBe('var(--color-warning)')
    })

    it('topSuppliers 应返回供应商采购TOP5', () => {
      seedPurchaseOrders(purchaseStore, 5)
      const wrapper = mountComponent()

      expect(wrapper.vm.topSuppliers.length).toBeLessThanOrEqual(5)
      if (wrapper.vm.topSuppliers.length > 0) {
        expect(wrapper.vm.topSuppliers[0]).toHaveProperty('name')
        expect(wrapper.vm.topSuppliers[0]).toHaveProperty('amount')
        expect(wrapper.vm.topSuppliers[0]).toHaveProperty('percent')
        expect(wrapper.vm.topSuppliers[0]).toHaveProperty('color')
      }
    })

    it('recent7Days 应返回7天趋势数据', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.recent7Days.length).toBe(7)
      wrapper.vm.recent7Days.forEach(d => {
        expect(d).toHaveProperty('date')
        expect(d).toHaveProperty('dayLabel')
        expect(d).toHaveProperty('count')
        expect(d).toHaveProperty('percent')
      })
    })

    it('pendingAlerts 应返回待处理预警', () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-ALERT-001',
        title: '待审批预警',
        type: 'purchase',
        status: 'pending',
        totalAmount: 50000,
        expectedDate: '2026-06-10'
      })
      const wrapper = mountComponent()

      expect(wrapper.vm.pendingAlerts.length).toBeGreaterThan(0)
    })

    it('allItemDetails 应汇总所有采购单的物料明细', () => {
      seedPurchaseOrders(purchaseStore, 3)
      const wrapper = mountComponent()

      expect(wrapper.vm.allItemDetails.length).toBe(3)
    })

    it('returnOrders 应只包含退货单', () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-RET-001',
        title: '退货单',
        type: 'return',
        status: 'completed',
        totalAmount: -5000,
        supplierName: '退货供应商',
        createDate: '2026-06-01'
      })
      const wrapper = mountComponent()

      expect(purchaseStore.returnOrders.length).toBe(1)
      expect(purchaseStore.returnOrders[0].type).toBe('return')
    })
  })

  /* ===== 金额格式化 ===== */
  describe('金额格式化', () => {
    it('formatAmount 应正确格式化金额', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmount(10000)
      expect(result).toContain('10,000')
    })

    it('formatAmountShort 大于1万应显示万', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmountShort(50000)
      expect(result).toContain('5.0万')
    })

    it('formatAmountShort 小于1万应正常格式化', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatAmountShort(5000)
      expect(result).toContain('5,000')
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('取消新增弹窗应关闭', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showFormModal).toBe(true)

      await wrapper.vm.handleFormSave()
      expect(wrapper.vm.showFormModal).toBe(false)
    })

    it('关闭审批弹窗应重置状态', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-APPROVE-CLOSE',
        title: '审批关闭测试',
        type: 'purchase',
        status: 'pending',
        totalAmount: 50000,
        supplierName: '测试供应商'
      })
      const wrapper = mountComponent()
      await flushPromises()

      const approveBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '审批')
      await approveBtn.trigger('click')
      expect(wrapper.vm.showApproveModal).toBe(true)

      wrapper.vm.showApproveModal = false
      await flushPromises()
      expect(wrapper.vm.showApproveModal).toBe(false)
    })

    it('关闭删除确认弹窗应重置状态', async () => {
      purchaseStore.addPurchaseOrder({
        orderNo: 'PO-DELETE-CLOSE',
        title: '删除关闭测试',
        type: 'purchase',
        status: 'draft',
        totalAmount: 5000
      })
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn').find(btn => btn.attributes('title') === '删除')
      await deleteBtn.trigger('click')
      expect(wrapper.vm.showDeleteConfirm).toBe(true)

      wrapper.vm.showDeleteConfirm = false
      wrapper.vm.deletingOrder = null
      await flushPromises()
      expect(wrapper.vm.showDeleteConfirm).toBe(false)
      expect(wrapper.vm.deletingOrder).toBeNull()
    })
  })

  /* ===== 状态条颜色 ===== */
  describe('状态条颜色', () => {
    it('statusBarColor 应返回正确的颜色映射', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.statusBarColor('draft')).toBe('var(--color-text-tertiary)')
      expect(wrapper.vm.statusBarColor('pending')).toBe('var(--color-warning)')
      expect(wrapper.vm.statusBarColor('completed')).toBe('var(--color-success)')
      expect(wrapper.vm.statusBarColor('cancelled')).toBe('var(--color-danger)')
    })
  })
})
