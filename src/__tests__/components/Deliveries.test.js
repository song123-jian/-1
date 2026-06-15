/**
 * Deliveries.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、表单验证、状态流转、导出、删除确认
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { useDeliveryStore } from '@/stores/delivery'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import Deliveries from '@/views/Deliveries.vue'

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

vi.mock('@/utils/permissionGuard', () => ({
  usePermission: () => ({
    isAllowed: () => true
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== DataSelect 组件 stub ===== */
const DataSelectStub = {
  props: ['module', 'variant', 'modelValue', 'valueField', 'labelField', 'placeholder', 'clearable'],
  template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option><option value="测试客户">测试客户</option></select>',
  emits: ['update:modelValue', 'change']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Deliveries, {
    global: {
      stubs: { Icon: IconStub, DataSelect: DataSelectStub },
      plugins: []
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedDeliveries(store, count = 5) {
  const statuses = ['created', 'pending', 'shipped', 'transit', 'received', 'exception']
  const urgencies = ['normal', 'low', 'high', 'urgent']
  const transports = ['logistics', 'express', 'self', 'dedicated']
  for (let i = 0; i < count; i++) {
    store.addDelivery({
      deliveryNo: `SH2026061${String(i + 1).padStart(3, '0')}`,
      date: '2026-06-01',
      orderId: i % 2 === 0 ? `PO-00${i + 1}` : '',
      urgency: urgencies[i % urgencies.length],
      status: statuses[i % statuses.length],
      customerName: `测试客户${i + 1}号`,
      address: `测试地址${i + 1}`,
      contact: `联系人${i + 1}`,
      phone: `021-5000000${i + 1}`,
      expectedDate: '2026-06-10',
      expectedArrivalDate: '2026-06-15',
      transportMethod: transports[i % transports.length],
      carrier: `承运商${i + 1}`,
      driver: `司机${i + 1}`,
      driverPhone: `1380000${1001 + i}`,
      items: [
        { seq: 1, productName: `产品${i + 1}A`, partNo: `PN-${i + 1}`, inventoryCode: `IC-${i + 1}`, spec: '规格1', unit: 'kg', quantity: 100, unitPrice: 50, amount: 5000, taxRate: 13, taxAmount: 650 }
      ],
      totalAmount: 5000,
      totalTax: 650,
      grandTotal: 5650,
      totalQuantity: 100,
      hasException: statuses[i % statuses.length] === 'exception' ? '1' : '0'
    })
  }
}

describe('Deliveries 组件', () => {
  let store
  let customerStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    customerStore = useCustomerStore()
    store = useDeliveryStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('送货管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('送货单生命周期管理')
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-toggle .btn')
      expect(viewBtns.length).toBe(4) // 表格、列表、卡片、看板
    })

    it('应渲染统计卡片区域', () => {
      const wrapper = mountComponent()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(6) // 全部、待发货、已发货、运输中、已签收、异常
    })

    it('应渲染概览面板（完成率、运输方式、趋势）', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overview-ring-card').exists()).toBe(true)
      expect(wrapper.find('.overview-transport-card').exists()).toBe(true)
      expect(wrapper.find('.overview-trend-card').exists()).toBe(true)
    })

    it('无数据时表格应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无送货记录')
    })

    it('有数据时应渲染表格行', () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应渲染筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
      expect(wrapper.find('input.form-input[placeholder*="搜索"]').exists()).toBe(true)
    })

    it('应渲染新建送货单按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.btn-primary').text()).toContain('新建送货单')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按送货单号搜索应过滤结果', async () => {
      seedDeliveries(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input[placeholder*="搜索"]')
      await input.setValue('SH2026061')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThan(0)
      rows.forEach(row => {
        expect(row.text()).toContain('SH2026061')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedDeliveries(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar select.form-select')
      const statusSelect = selects[0] // 第一个是状态筛选
      await statusSelect.setValue('pending')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('待发货')
      })
    })

    it('按紧急程度过滤应过滤结果', async () => {
      seedDeliveries(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-bar select.form-select')
      const urgencySelect = selects[1] // 紧急程度
      await urgencySelect.setValue('urgent')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('紧急')
      })
    })

    it('点击重置按钮应清空所有筛选条件', async () => {
      seedDeliveries(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input[placeholder*="搜索"]')
      await input.setValue('SH')
      await flushPromises()

      const resetBtn = wrapper.find('.filter-bar .btn-ghost')
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.filters.search).toBe('')
      expect(wrapper.vm.filters.status).toBe('')
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedDeliveries(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.panel-card-footer').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedDeliveries(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination-bar').exists()).toBe(false)
    })

    it('切换每页条数应生效', async () => {
      seedDeliveries(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.pageSize = 10
      await flushPromises()
      expect(wrapper.vm.pagedDeliveries.length).toBeLessThanOrEqual(10)
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('默认应为表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentView).toBe('table')
    })

    it('切换到列表视图应显示列表内容', async () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle .btn')
      await viewBtns[1].trigger('click') // 列表视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('list')
      expect(wrapper.find('.list-item').exists()).toBe(true)
    })

    it('切换到卡片视图应显示卡片内容', async () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle .btn')
      await viewBtns[2].trigger('click') // 卡片视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('card')
      expect(wrapper.find('.card-item').exists()).toBe(true)
    })

    it('切换到看板视图应显示看板列', async () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-toggle .btn')
      await viewBtns[3].trigger('click') // 看板视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('kanban')
      expect(wrapper.find('.kanban-board').exists()).toBe(true)
      expect(wrapper.findAll('.kanban-column').length).toBeGreaterThan(0)
    })
  })

  /* ===== 新增送货单 ===== */
  describe('新增送货单', () => {
    it('点击新建按钮应打开编辑弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showEditor).toBe(true)
      expect(wrapper.find('.modal-panel').exists()).toBe(true)
    })

    it('新建弹窗应自动生成单据编号', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()

      expect(wrapper.vm.editorData.deliveryNo).toBeTruthy()
    })

    it('新建弹窗默认值应正确', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()

      expect(wrapper.vm.editorData.urgency).toBe('normal')
      expect(wrapper.vm.editorData.transportMethod).toBe('logistics')
      expect(wrapper.vm.editorData.hasException).toBe('0')
      expect(wrapper.vm.editingId).toBeNull()
    })

    it('必填字段为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      await wrapper.vm.saveDelivery()

      expect(wrapper.vm.editorErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.editorErrors).toContain('购货单位名称为必填项')
    })

    it('预计送达日期早于发货日期应提示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      wrapper.vm.editorData.customerName = '测试客户'
      wrapper.vm.editorData.date = '2026-06-15'
      wrapper.vm.editorData.expectedArrivalDate = '2026-06-10'
      wrapper.vm.editorItems = [{ productName: '产品A', quantity: 10, unitPrice: 100, amount: 1000, taxRate: 13, taxAmount: 130 }]

      await wrapper.vm.saveDelivery()

      expect(wrapper.vm.editorErrors).toContain('预计送达日期不能早于发货日期')
    })

    it('无有效产品明细时应提示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      wrapper.vm.editorData.customerName = '测试客户'
      wrapper.vm.editorData.date = '2026-06-01'
      wrapper.vm.editorItems = [{ productName: '', quantity: 0, unitPrice: 0, amount: 0, taxRate: 13, taxAmount: 0 }]

      await wrapper.vm.saveDelivery()

      expect(wrapper.vm.editorErrors).toContain('至少需要一条有效的产品明细（名称非空且数量大于0）')
    })

    it('填写完整信息后提交应新增送货单', async () => {
      seedDeliveries(store, 0)
      const wrapper = mountComponent()

      await wrapper.vm.openEditor()
      wrapper.vm.editorData.customerName = '测试客户'
      wrapper.vm.editorData.date = '2026-06-01'
      wrapper.vm.editorData.expectedArrivalDate = '2026-06-10'
      wrapper.vm.editorItems = [{ productName: '产品A', partNo: 'PN-001', spec: '规格1', unit: 'kg', quantity: 10, unitPrice: 100, amount: 1000, taxRate: 13, taxAmount: 130 }]

      await wrapper.vm.saveDelivery()
      await flushPromises()

      expect(store.deliveries.length).toBeGreaterThan(0)
      expect(wrapper.vm.showEditor).toBe(false)
    })
  })

  /* ===== 编辑送货单 ===== */
  describe('编辑送货单', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.cell-actions .btn-ghost').find(b => b.attributes('title') === '编辑')
      await editBtn.trigger('click')

      expect(wrapper.vm.showEditor).toBe(true)
      expect(wrapper.vm.editingId).toBe(d.id)
    })

    it('编辑提交应更新送货单数据', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.openEditor(d)
      wrapper.vm.editorData.carrier = '新承运商'
      await wrapper.vm.saveDelivery()
      await flushPromises()

      expect(store.deliveries[0].carrier).toBe('新承运商')
    })
  })

  /* ===== 删除送货单 ===== */
  describe('删除送货单', () => {
    it('点击删除按钮应弹出确认对话框', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.cell-actions .btn-ghost').find(b => b.attributes('title') === '删除')
      await deleteBtn.trigger('click')

      expect(wrapper.vm.deleteConfirmVisible).toBe(true)
    })

    it('确认删除应移除送货单', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      const dId = d.id
      await wrapper.vm.handleDelete(dId)
      await wrapper.vm.confirmDelete()
      await flushPromises()

      expect(store.deliveries.find(x => x.id === dId)).toBeUndefined()
    })

    it('取消删除应关闭确认对话框', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleDelete(d.id)
      await wrapper.vm.cancelDelete()

      expect(wrapper.vm.deleteConfirmVisible).toBe(false)
    })
  })

  /* ===== 状态流转 ===== */
  describe('状态流转', () => {
    it('点击状态流转按钮应弹出确认对话框', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      const statusBtn = wrapper.findAll('.cell-actions .btn-ghost').find(b => b.attributes('title') === '状态流转')
      await statusBtn.trigger('click')

      expect(wrapper.vm.statusConfirmId).toBe(d.id)
    })

    it('确认状态流转应更新状态', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleChangeStatus(d.id)
      await wrapper.vm.confirmStatusChange()
      await flushPromises()

      expect(store.deliveries[0].status).not.toBe('created')
    })

    it('取消状态流转应关闭确认对话框', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      d.status = 'created'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleChangeStatus(d.id)
      await wrapper.vm.cancelStatusChange()

      expect(wrapper.vm.statusConfirmId).toBeNull()
    })
  })

  /* ===== 查看详情 ===== */
  describe('查看详情', () => {
    it('点击查看按钮应打开详情弹窗', async () => {
      seedDeliveries(store, 1)
      const d = store.deliveries[0]
      const wrapper = mountComponent()
      await flushPromises()

      const viewBtn = wrapper.findAll('.cell-actions .btn-ghost').find(b => b.attributes('title') === '查看')
      await viewBtn.trigger('click')

      expect(wrapper.vm.showDetail).toBe(true)
      expect(wrapper.vm.detailData.deliveryNo).toBe(d.deliveryNo)
    })

    it('关闭详情弹窗应重置状态', async () => {
      seedDeliveries(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.viewDetail(store.deliveries[0].id)
      await wrapper.vm.closeDetail()

      expect(wrapper.vm.showDetail).toBe(false)
    })
  })

  /* ===== 编辑器产品明细 ===== */
  describe('编辑器产品明细', () => {
    it('点击添加产品行应增加一行', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      const initialCount = wrapper.vm.editorItems.length

      await wrapper.vm.addItemRow()

      expect(wrapper.vm.editorItems.length).toBe(initialCount + 1)
    })

    it('删除产品行应减少一行', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      wrapper.vm.editorItems = [
        { productName: 'A', quantity: 10, unitPrice: 100, amount: 1000, taxRate: 13, taxAmount: 130 },
        { productName: 'B', quantity: 20, unitPrice: 200, amount: 4000, taxRate: 13, taxAmount: 520 }
      ]
      const initialCount = wrapper.vm.editorItems.length

      await wrapper.vm.removeItemRow(0)

      expect(wrapper.vm.editorItems.length).toBe(initialCount - 1)
    })

    it('计算产品行金额应正确', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      wrapper.vm.editorItems = [{ productName: 'A', quantity: 10, unitPrice: 100, amount: 0, taxRate: 13, taxAmount: 0 }]

      await wrapper.vm.calcItemAmount(0)

      expect(wrapper.vm.editorItems[0].amount).toBe(1000)
      expect(wrapper.vm.editorItems[0].taxAmount).toBe(130)
    })

    it('calcTotalAmount 应正确计算合计金额', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      wrapper.vm.editorItems = [
        { amount: 1000, taxAmount: 130 },
        { amount: 2000, taxAmount: 260 }
      ]

      expect(wrapper.vm.calcTotalAmount).toBe(3000)
      expect(wrapper.vm.calcTotalTax).toBe(390)
      expect(wrapper.vm.calcGrandTotal).toBe(3390)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionRate 应正确计算完成率', async () => {
      seedDeliveries(store, 4)
      // 设置2个为已签收
      store.deliveries[0].status = 'received'
      store.deliveries[1].status = 'received'
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.completionRate).toBe(50)
    })

    it('无送货单时完成率应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)
    })

    it('completionRateColor 应根据完成率返回正确颜色', async () => {
      seedDeliveries(store, 4)
      store.deliveries[0].status = 'received'
      store.deliveries[1].status = 'received'
      store.deliveries[2].status = 'received'
      const wrapper = mountComponent()
      await flushPromises()

      // 75% >= 70 应为 success
      expect(wrapper.vm.completionRateColor).toBe('var(--color-success)')
    })

    it('transportStats 应正确统计运输方式分布', () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()

      const stats = wrapper.vm.transportStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('label')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('percent')
        expect(s).toHaveProperty('color')
      })
    })

    it('deliveryAlerts 应识别异常和逾期预警', async () => {
      seedDeliveries(store, 3)
      store.deliveries[0].status = 'exception'
      store.deliveries[1].expectedArrivalDate = '2020-01-01' // 过去日期
      store.deliveries[1].status = 'shipped'
      const wrapper = mountComponent()
      await flushPromises()

      const alerts = wrapper.vm.deliveryAlerts
      expect(alerts.length).toBeGreaterThan(0)
    })

    it('assessment 应返回评估数据', () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()

      const a = wrapper.vm.assessment
      expect(a).toHaveProperty('grade')
      expect(a).toHaveProperty('score')
      expect(a).toHaveProperty('completionRate')
      expect(a).toHaveProperty('onTimeRate')
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应提示无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.exportCSV()
      expect(alertSpy).toHaveBeenCalledWith('无数据可导出')

      alertSpy.mockRestore()
    })

    it('有数据时导出应创建 Blob 并触发下载', async () => {
      seedDeliveries(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 打印 ===== */
  describe('打印功能', () => {
    it('handlePrint 应调用 window.open', async () => {
      seedDeliveries(store, 1)
      const wrapper = mountComponent()
      const openSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue({ open: vi.fn(() => ({ document: { write: vi.fn(), close: vi.fn() } })) })

      await wrapper.vm.handlePrint(store.deliveries[0].id)

      openSpy.mockRestore()
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭编辑弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      expect(wrapper.vm.showEditor).toBe(true)

      await wrapper.vm.closeEditor()
      expect(wrapper.vm.showEditor).toBe(false)
      expect(wrapper.vm.editingId).toBeNull()
    })

    it('点击遮罩层应关闭编辑弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()

      const overlay = wrapper.findAll('.modal-overlay')[0]
      await overlay.trigger('click.self')
      expect(wrapper.vm.showEditor).toBe(false)
    })
  })

  /* ===== 列配置 ===== */
  describe('列配置', () => {
    it('点击列按钮应切换列配置下拉', async () => {
      const wrapper = mountComponent()
      const colBtn = wrapper.find('.column-config-wrapper .btn')

      await colBtn.trigger('click')
      expect(wrapper.vm.showColumnConfig).toBe(true)

      await colBtn.trigger('click')
      expect(wrapper.vm.showColumnConfig).toBe(false)
    })

    it('取消勾选列应隐藏对应列', async () => {
      seedDeliveries(store, 2)
      const wrapper = mountComponent()

      // 默认显示送货单号列
      expect(wrapper.findAll('th').some(th => th.text().includes('送货单号'))).toBe(true)

      // 取消勾选
      wrapper.vm.columnVisible.deliveryNo = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('送货单号')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应注册全局点击事件监听', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      mountComponent()
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
      addSpy.mockRestore()
    })

    it('卸载时应移除全局点击事件监听', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
      removeSpy.mockRestore()
    })
  })

  /* ===== 自主评估 ===== */
  describe('自主评估', () => {
    it('点击自主评估按钮应打开评估弹窗', async () => {
      const wrapper = mountComponent()
      const assessBtn = wrapper.findAll('.page-header-actions .btn-secondary')[0]
      await assessBtn.trigger('click')

      expect(wrapper.vm.showAssessment).toBe(true)
    })

    it('评估弹窗应显示评级和评分', async () => {
      seedDeliveries(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.showAssessment = true
      await flushPromises()

      expect(wrapper.vm.assessment).toHaveProperty('grade')
      expect(wrapper.vm.assessment).toHaveProperty('score')
    })
  })
})
