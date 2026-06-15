/**
 * Collections.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、视图切换、CRUD弹窗、表单验证、分期管理、确认/删除、导出、列配置、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Collections from '@/modules/finance/views/Collections.vue'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createCollection, resetCounter } from '@/__tests__/mockData'

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

/* ===== DataSelect stub ===== */
const DataSelectStub = {
  props: ['modelValue', 'module', 'variant', 'valueField', 'labelField', 'placeholder', 'clearable'],
  template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option></select>',
  emits: ['update:modelValue', 'change']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Collections, {
    global: {
      stubs: {
        Icon: IconStub,
        DataSelect: DataSelectStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedCollections(store, count = 5) {
  const methods = ['bank_transfer', 'cash', 'check', 'wechat', 'alipay']
  const statuses = ['pending', 'confirmed', 'completed', 'voided']
  for (let i = 0; i < count; i++) {
    store.addCollection({
      customerId: `c_test_${i + 1}`,
      customerName: `测试客户${i + 1}号`,
      amount: 50000 * (i + 1),
      date: '2026-06-01',
      dueDate: i % 3 === 0 ? '2020-01-01' : '2030-12-31',
      method: methods[i % methods.length],
      referenceNo: `REF-${i + 1}`,
      bankAccount: `6222${String(i).padStart(12, '0')}`,
      notes: `测试备注${i + 1}`
    })
    // 手动设置不同状态
    if (statuses[i % statuses.length] !== 'pending') {
      store.collections[store.collections.length - 1].status = statuses[i % statuses.length]
    }
  }
}

describe('Collections 组件', () => {
  let store
  let customerStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useCollectionStore()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('回款管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('回款')
    })

    it('应显示资金流水线', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.fund-pipeline').exists()).toBe(true)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('有数据时应渲染表格行', () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()
      // 使用 find 获取第一个 .table-container（主表格），避免匹配到账龄明细表格
      const rows = wrapper.find('.table-container').findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })

    it('应显示折叠统计区', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按回款编号搜索应过滤结果', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      const firstNo = store.collections[0].collectionNo
      await input.setValue(firstNo)
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按状态过滤应过滤结果', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      const statusSelect = wrapper.findAll('select.form-select')[0]
      await statusSelect.setValue('completed')
      await flushPromises()

      wrapper.vm.filteredCollections.forEach(c => {
        expect(c.status).toBe('completed')
      })
    })

    it('按付款方式过滤应过滤结果', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      const methodSelect = wrapper.findAll('select.form-select')[1]
      await methodSelect.setValue('bank_transfer')
      await flushPromises()

      wrapper.vm.filteredCollections.forEach(c => {
        expect(c.method).toBe('bank_transfer')
      })
    })

    it('按逾期状态过滤应过滤结果', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      const overdueSelect = wrapper.findAll('select.form-select')[2]
      await overdueSelect.setValue('normal')
      await flushPromises()

      wrapper.vm.filteredCollections.forEach(c => {
        expect(store.getOverdueDays(c)).toBe(0)
      })
    })

    it('点击重置按钮应清空所有筛选条件', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('test')
      await flushPromises()

      const resetBtn = wrapper.findAll('.btn-ghost').find(b => b.text().includes('重置'))
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.filters.search).toBe('')
      expect(wrapper.vm.filters.status).toBe('')
      expect(wrapper.vm.filters.method).toBe('')
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('默认应为表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentView).toBe('table')
      expect(wrapper.find('.table-container').exists()).toBe(true)
    })

    it('切换到列表视图应显示列表', async () => {
      seedCollections(store, 2)
      const wrapper = mountComponent()

      const listBtn = wrapper.findAll('.view-toggle .btn').find(b => b.text().includes('列表'))
      await listBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('list')
      expect(wrapper.find('.list-view').exists()).toBe(true)
    })

    it('切换到卡片视图应显示卡片', async () => {
      seedCollections(store, 2)
      const wrapper = mountComponent()

      const cardBtn = wrapper.findAll('.view-toggle .btn').find(b => b.text().includes('卡片'))
      await cardBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('card')
      expect(wrapper.find('.card-view').exists()).toBe(true)
    })
  })

  /* ===== 新增回款 ===== */
  describe('新增回款', () => {
    it('点击记录回款按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.findAll('.btn-primary').find(b => b.text().includes('记录回款'))
      await addBtn.trigger('click')

      expect(wrapper.vm.showForm).toBe(true)
      expect(wrapper.vm.editingCollection).toBeNull()
    })

    it('新增时表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()

      expect(wrapper.vm.formData.method).toBe('bank_transfer')
      expect(wrapper.vm.formData.amount).toBe(0)
      expect(wrapper.vm.formData.customerId).toBe('')
    })
  })

  /* ===== 编辑回款 ===== */
  describe('编辑回款', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.btn-ghost').find(b => {
        const icon = b.find('.icon-stub')
        return icon.exists() && icon.text() === 'edit'
      })
      if (editBtn) {
        await editBtn.trigger('click')
        expect(wrapper.vm.showForm).toBe(true)
        expect(wrapper.vm.editingCollection).toBeTruthy()
      }
    })

    it('openForm 传入数据时应设置 editingCollection', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      const col = store.collections[0]

      await wrapper.vm.openForm(col)
      expect(wrapper.vm.editingCollection).toBeTruthy()
      expect(wrapper.vm.formData.amount).toBe(col.amount)
    })
  })

  /* ===== 表单验证 ===== */
  describe('表单验证', () => {
    it('未选择客户时保存应提示', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      await wrapper.vm.saveForm()
      expect(alertSpy).toHaveBeenCalledWith('请选择客户')

      alertSpy.mockRestore()
    })

    it('金额为0时保存应提示', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()
      wrapper.vm.formData.customerId = 'c_test_1'
      wrapper.vm.formData.customerName = '测试客户'

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      await wrapper.vm.saveForm()
      expect(alertSpy).toHaveBeenCalledWith('回款金额必须大于0')

      alertSpy.mockRestore()
    })

    it('填写完整信息后保存应新增回款记录', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()
      wrapper.vm.formData.customerId = 'c_test_1'
      wrapper.vm.formData.customerName = '测试客户1号'
      wrapper.vm.formData.amount = 50000
      wrapper.vm.formData.method = 'bank_transfer'

      const beforeCount = store.collections.length
      await wrapper.vm.saveForm()

      expect(store.collections.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showForm).toBe(false)
    })

    it('编辑保存应更新回款记录', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      const col = store.collections[0]

      await wrapper.vm.openForm(col)
      wrapper.vm.formData.amount = 99999
      await wrapper.vm.saveForm()

      expect(store.collections[0].amount).toBe(99999)
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()
      expect(wrapper.vm.showForm).toBe(true)

      await wrapper.vm.closeForm()
      expect(wrapper.vm.showForm).toBe(false)
      expect(wrapper.vm.editingCollection).toBeNull()
    })

    it('点击弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openForm()

      const overlay = wrapper.findAll('.modal-overlay').find(el => el.find('h3').text().includes('记录回款'))
      if (overlay) {
        await overlay.trigger('click.self')
        expect(wrapper.vm.showForm).toBe(false)
      }
    })
  })

  /* ===== 查看详情 ===== */
  describe('查看详情', () => {
    it('点击查看按钮应打开详情弹窗', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const viewBtn = wrapper.findAll('.btn-ghost').find(b => {
        const icon = b.find('.icon-stub')
        return icon.exists() && icon.text() === 'eye'
      })
      if (viewBtn) {
        await viewBtn.trigger('click')
        expect(wrapper.vm.showDetail).toBe(true)
      }
    })

    it('viewDetail 应设置 detailData', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      const col = store.collections[0]

      await wrapper.vm.viewDetail(col)
      expect(wrapper.vm.showDetail).toBe(true)
      expect(wrapper.vm.detailData.collectionNo).toBe(col.collectionNo)
    })

    it('closeDetail 应关闭详情', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.viewDetail(store.collections[0])
      await wrapper.vm.closeDetail()

      expect(wrapper.vm.showDetail).toBe(false)
    })
  })

  /* ===== 确认回款 ===== */
  describe('确认回款', () => {
    it('确认回款应弹出确认对话框', async () => {
      seedCollections(store, 1)
      store.collections[0].status = 'pending'
      const wrapper = mountComponent()

      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      await wrapper.vm.handleConfirm(store.collections[0].id)
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('确认后应更新状态为 confirmed', async () => {
      seedCollections(store, 1)
      store.collections[0].status = 'pending'
      const wrapper = mountComponent()

      vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      await wrapper.vm.handleConfirm(store.collections[0].id)

      expect(store.collections[0].status).toBe('confirmed')
      vi.restoreAllMocks()
    })
  })

  /* ===== 删除回款 ===== */
  describe('删除回款', () => {
    it('点击删除按钮应弹出确认弹窗', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.btn-ghost').find(b => {
        const icon = b.find('.icon-stub')
        return icon.exists() && icon.text() === 'delete'
      })
      if (deleteBtn) {
        await deleteBtn.trigger('click')
        expect(wrapper.vm.showDeleteConfirm).toBe(true)
      }
    })

    it('确认删除应移除回款记录', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      const id = store.collections[0].id

      await wrapper.vm.handleDelete(id)
      expect(wrapper.vm.showDeleteConfirm).toBe(true)

      await wrapper.vm.confirmDelete()
      expect(store.collections.find(c => c.id === id)).toBeUndefined()
      expect(wrapper.vm.showDeleteConfirm).toBe(false)
    })

    it('取消删除应关闭确认弹窗', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()

      await wrapper.vm.handleDelete(store.collections[0].id)
      await wrapper.vm.cancelDelete()

      expect(wrapper.vm.showDeleteConfirm).toBe(false)
      expect(wrapper.vm.deleteTargetId).toBeNull()
    })
  })

  /* ===== 分期管理 ===== */
  describe('分期管理', () => {
    it('点击分期管理按钮应打开分期弹窗', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const instBtn = wrapper.findAll('.btn-ghost').find(b => {
        const icon = b.find('.icon-stub')
        return icon.exists() && icon.text() === 'calendar'
      })
      if (instBtn) {
        await instBtn.trigger('click')
        expect(wrapper.vm.showInstallmentManager).toBe(true)
      }
    })

    it('openInstallmentManager 应设置 installmentTarget', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      const col = store.collections[0]

      await wrapper.vm.openInstallmentManager(col)
      expect(wrapper.vm.showInstallmentManager).toBe(true)
      expect(wrapper.vm.installmentTarget.collectionNo).toBe(col.collectionNo)
    })

    it('添加分期金额为0时应提示', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openInstallmentManager(store.collections[0])

      wrapper.vm.newInstallment.amount = 0
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      await wrapper.vm.addNewInstallment()
      expect(alertSpy).toHaveBeenCalledWith('分期金额必须大于0')

      alertSpy.mockRestore()
    })

    it('添加有效分期应增加分期记录', async () => {
      seedCollections(store, 1)
      store.collections[0].amount = 100000
      const wrapper = mountComponent()
      await wrapper.vm.openInstallmentManager(store.collections[0])

      wrapper.vm.newInstallment.amount = 30000
      wrapper.vm.newInstallment.date = '2026-06-15'
      await wrapper.vm.addNewInstallment()

      const fresh = store.collections[0]
      expect(fresh.installments.length).toBe(1)
      expect(fresh.installments[0].amount).toBe(30000)
    })

    it('确认分期到账应更新分期状态', async () => {
      seedCollections(store, 1)
      store.collections[0].amount = 100000
      store.addInstallment(store.collections[0].id, { amount: 50000, date: '2026-06-01' })
      const wrapper = mountComponent()

      const col = store.collections[0]
      const instId = col.installments[0].id
      await wrapper.vm.markInstallmentPaid(col.id, instId)

      expect(store.collections[0].installments[0].status).toBe('paid')
    })

    it('删除分期应弹出确认对话框', async () => {
      seedCollections(store, 1)
      store.collections[0].amount = 100000
      store.addInstallment(store.collections[0].id, { amount: 50000, date: '2026-06-01' })
      const wrapper = mountComponent()

      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const col = store.collections[0]
      const instId = col.installments[0].id
      await wrapper.vm.handleDeleteInstallment(col.id, instId)
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('关闭分期管理应关闭弹窗', async () => {
      seedCollections(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.openInstallmentManager(store.collections[0])

      await wrapper.vm.closeInstallmentManager()
      expect(wrapper.vm.showInstallmentManager).toBe(false)
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应提示暂无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.exportCSV()
      expect(alertSpy).toHaveBeenCalledWith('暂无数据可导出')

      alertSpy.mockRestore()
    })

    it('有数据时导出应创建 Blob', async () => {
      seedCollections(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportCSV()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 列配置 ===== */
  describe('列配置', () => {
    it('点击列按钮应切换列配置下拉', async () => {
      const wrapper = mountComponent()
      const colBtn = wrapper.find('.column-config-wrapper .btn')

      await colBtn.trigger('click')
      expect(wrapper.vm.showColumnConfig).toBe(true)
    })

    it('取消勾选列应隐藏对应列', async () => {
      seedCollections(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.columnVisible.collectionNo = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('回款编号')
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showCollectionStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showCollectionStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showCollectionStatsExpanded).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredCollections 应根据搜索条件过滤', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.filters.search = store.collections[0].collectionNo
      await flushPromises()

      expect(wrapper.vm.filteredCollections.length).toBeGreaterThanOrEqual(1)
    })

    it('filteredCollections 应根据状态过滤', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.filters.status = 'completed'
      await flushPromises()

      wrapper.vm.filteredCollections.forEach(c => {
        expect(c.status).toBe('completed')
      })
    })

    it('agingSummary 应正确计算账龄汇总', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      const summary = wrapper.vm.agingSummary
      expect(summary).toHaveProperty('current')
      expect(summary).toHaveProperty('days30')
      expect(summary).toHaveProperty('days60')
      expect(summary).toHaveProperty('daysOver')
    })

    it('agingDetailList 应正确计算账龄明细', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      const list = wrapper.vm.agingDetailList
      expect(Array.isArray(list)).toBe(true)
      list.forEach(row => {
        expect(row).toHaveProperty('customer')
        expect(row).toHaveProperty('balance')
        expect(row).toHaveProperty('risk')
      })
    })

    it('alertCollections 应正确识别逾期和异常', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      const alerts = wrapper.vm.alertCollections
      expect(Array.isArray(alerts)).toBe(true)
      alerts.forEach(c => {
        expect(c.overdueDays).toBeGreaterThanOrEqual(0)
      })
    })

    it('methodDistribution 应正确计算付款方式分布', async () => {
      seedCollections(store, 5)
      const wrapper = mountComponent()

      const dist = wrapper.vm.methodDistribution
      expect(dist.length).toBe(5)
      dist.forEach(m => {
        expect(m).toHaveProperty('key')
        expect(m).toHaveProperty('label')
        expect(m).toHaveProperty('count')
        expect(m).toHaveProperty('percent')
      })
    })

    it('last7DaysTrend 应返回7天趋势数据', async () => {
      seedCollections(store, 3)
      const wrapper = mountComponent()

      const trend = wrapper.vm.last7DaysTrend
      expect(trend.length).toBe(7)
      trend.forEach(d => {
        expect(d).toHaveProperty('label')
        expect(d).toHaveProperty('amount')
        expect(d).toHaveProperty('percent')
        expect(d).toHaveProperty('color')
      })
    })
  })

  /* ===== 辅助函数 ===== */
  describe('辅助函数', () => {
    it('getOverdueBadgeClass 应根据逾期天数返回正确样式', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getOverdueBadgeClass({ dueDate: '2030-12-31' })).toBe('badge-success')
    })

    it('getOverdueBadgeText 正常时应返回正常', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getOverdueBadgeText({ dueDate: '2030-12-31' })).toBe('正常')
    })

    it('getProgressColorClass 应根据进度返回正确样式', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getProgressColorClass(100)).toBe('success')
      expect(wrapper.vm.getProgressColorClass(60)).toBe('info')
      expect(wrapper.vm.getProgressColorClass(30)).toBe('warning')
      expect(wrapper.vm.getProgressColorClass(10)).toBe('danger')
    })

    it('getCollectionRateColor 应根据回款率返回正确颜色', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getCollectionRateColor(80)).toBe('var(--color-success)')
      expect(wrapper.vm.getCollectionRateColor(50)).toBe('var(--color-warning)')
      expect(wrapper.vm.getCollectionRateColor(20)).toBe('var(--color-danger)')
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
})
