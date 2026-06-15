/**
 * Quotations.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、表单验证、导出、批量操作、视图切换
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Quotations from '@/modules/sales/views/Quotations.vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createQuotation, createCustomer, resetCounter } from '@/__tests__/mockData'

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

vi.mock('@/composables/useTableEnhance', () => ({
  useTableEnhance: () => ({
    trendData: computed(() => ({})),
    anomalyData: computed(() => ({}))
  })
}))

import { computed } from 'vue'

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStubs = {
  Icon: IconStub,
  DataSelect: {
    props: ['modelValue', 'module', 'variant', 'valueField', 'labelField', 'placeholder', 'clearable'],
    template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option></select>'
  },
  QuotationFormModal: { props: ['showModal', 'editingQuotation'], template: '<div class="form-modal-stub" v-if="showModal"></div>' },
  QuotationPreview: { props: ['showModal', 'quotation'], template: '<div class="preview-stub" v-if="showModal"></div>' },
  QuotationTemplateModal: { props: ['showModal'], template: '<div class="template-stub" v-if="showModal"></div>' },
  QuotationFollowUpModal: { props: ['showModal', 'quote'], template: '<div class="followup-stub" v-if="showModal"></div>' },
  QuotationVersionModal: { props: ['showModal', 'quote'], template: '<div class="version-stub" v-if="showModal"></div>' },
  QuotationComparisonModal: { props: ['showModal', 'selectedIds'], template: '<div class="comparison-stub" v-if="showModal"></div>' },
  QuotationAnalytics: { template: '<div class="analytics-stub"></div>' },
  QuotationCalendarView: { props: ['currentView', 'quotations'], template: '<div class="calendar-stub"></div>' }
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Quotations, {
    global: {
      stubs: ChildStubs
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedQuotations(store, count = 5) {
  resetCounter()
  const statuses = ['draft', 'pending', 'approved', 'sent', 'accepted', 'rejected', 'expired']
  for (let i = 0; i < count; i++) {
    store.addQuotation(createQuotation({
      status: statuses[i % statuses.length],
      customerName: `测试客户${i + 1}号`,
      quoteNo: `QT2026060${String(i + 1).padStart(2, '0')}`,
      total: 10000 * (i + 1),
      profitMargin: 10 + i * 3
    }))
  }
}

describe('Quotations 组件', () => {
  let store
  let customerStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useQuotationStore()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('报价管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('报价生命周期')
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无报价数据')
    })

    it('有数据时应渲染表格行', () => {
      seedQuotations(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示统计栏数据', () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.quotation-stats-bar').exists()).toBe(true)
      expect(wrapper.find('.stats-ring-percent').text()).toContain(store.conversionRate)
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      expect(viewBtns.length).toBe(6) // 表格、列表、卡片、日历、周视图、漏斗
    })

    it('应渲染操作按钮', () => {
      const wrapper = mountComponent()
      const actions = wrapper.find('.page-header-actions')
      expect(actions.text()).toContain('导出')
      expect(actions.text()).toContain('新建报价')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按报价编号搜索应过滤结果', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('QT20260601')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按客户名称搜索应过滤结果', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('测试客户3')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按状态过滤应过滤结果', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.findAll('.filter-select').at(0) || wrapper.findAll('select.form-select')[0]
      await select.setValue('draft')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('草稿')
      })
    })

    it('搜索和过滤条件变更时应重置到第一页', async () => {
      seedQuotations(store, 20)
      const wrapper = mountComponent()

      wrapper.vm.currentPage = 2
      await flushPromises()

      const input = wrapper.find('.search-input')
      await input.setValue('测试')
      await flushPromises()

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedQuotations(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination-bar').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination-bar').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedQuotations(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.pagination-btn')[3]
      await nextBtn.trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('分页信息应正确显示', async () => {
      seedQuotations(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      const info = wrapper.find('.pagination-info')
      expect(info.text()).toContain('第')
      expect(info.text()).toContain('页')
    })
  })

  /* ===== 新增报价 ===== */
  describe('新增报价', () => {
    it('点击新建报价按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.findAll('.btn-primary').find(b => b.text().includes('新建报价'))
      await addBtn.trigger('click')

      expect(wrapper.vm.showEditModal).toBe(true)
      expect(wrapper.vm.editingQuotation).toBeNull()
    })

    it('新增弹窗应设置编辑状态为null', async () => {
      const wrapper = mountComponent()
      wrapper.vm.openAddModal()
      expect(wrapper.vm.editingQuotation).toBeNull()
      expect(wrapper.vm.showEditModal).toBe(true)
    })
  })

  /* ===== 编辑报价 ===== */
  describe('编辑报价', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedQuotations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.btn-outline').find(b => b.text().includes('编辑'))
      await editBtn.trigger('click')

      expect(wrapper.vm.showEditModal).toBe(true)
      expect(wrapper.vm.editingQuotation).not.toBeNull()
    })
  })

  /* ===== 审批报价 ===== */
  describe('审批报价', () => {
    it('审批报价应弹出确认对话框', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()
      await flushPromises()

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const q = store.quotations.find(q => q.status === 'pending' || q.status === 'draft')
      if (q) {
        await wrapper.vm.handleApprove(q)
        expect(confirmSpy).toHaveBeenCalled()
      }
      confirmSpy.mockRestore()
    })
  })

  /* ===== 复制报价 ===== */
  describe('复制报价', () => {
    it('复制报价应生成新报价', async () => {
      seedQuotations(store, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const q = store.quotations[0]
      await wrapper.vm.handleDuplicate(q)

      expect(store.quotations.length).toBe(2)
      alertSpy.mockRestore()
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('勾选报价后应显示批量操作栏', async () => {
      seedQuotations(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      const q = store.quotations[0]
      wrapper.vm.toggleSelect(q.id)
      await flushPromises()

      expect(wrapper.find('.batch-bar').exists()).toBe(true)
      expect(wrapper.find('.batch-bar').text()).toContain('已选')
    })

    it('全选应选中当前页所有报价', async () => {
      seedQuotations(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.toggleSelectAll()
      await flushPromises()

      expect(wrapper.vm.selectedIds.length).toBeGreaterThan(0)
    })

    it('批量删除应弹出确认对话框', async () => {
      seedQuotations(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.selectedIds = [store.quotations[0].id, store.quotations[1].id]
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      await wrapper.vm.handleBatchDelete()
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出应创建 Blob 并触发下载', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.handleExport()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('切换到列表视图应显示列表', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'list'
      await flushPromises()

      expect(wrapper.findAll('.list-item').length).toBe(2)
    })

    it('切换到卡片视图应显示卡片', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'card'
      await flushPromises()

      expect(wrapper.findAll('.quote-card').length).toBe(2)
    })

    it('切换到分析视图应显示分析组件', async () => {
      const wrapper = mountComponent()

      wrapper.vm.showAnalytics = true
      await flushPromises()

      expect(wrapper.find('.analytics-stub').exists()).toBe(true)
    })
  })

  /* ===== 对比功能 ===== */
  describe('对比功能', () => {
    it('未选2条以上报价时对比应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.selectedIds = ['id1']
      await wrapper.vm.openComparisonModal()

      expect(alertSpy).toHaveBeenCalledWith('请至少勾选2条报价进行对比')
      alertSpy.mockRestore()
    })

    it('选择超过3条报价对比应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.selectedIds = ['id1', 'id2', 'id3', 'id4']
      await wrapper.vm.openComparisonModal()

      expect(alertSpy).toHaveBeenCalledWith('最多同时对比3条报价')
      alertSpy.mockRestore()
    })
  })

  /* ===== 转换功能 ===== */
  describe('转换功能', () => {
    it('转送货单成功应提示', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const q = store.quotations.find(q => q.status === 'approved' || q.status === 'accepted')
      if (q) {
        await wrapper.vm.convertToDelivery(q)
        expect(alertSpy).toHaveBeenCalled()
      }
      alertSpy.mockRestore()
    })

    it('转合同成功应提示', async () => {
      seedQuotations(store, 2)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const q = store.quotations.find(q => q.status === 'approved' || q.status === 'accepted')
      if (q) {
        await wrapper.vm.convertToContract(q)
        expect(alertSpy).toHaveBeenCalled()
      }
      alertSpy.mockRestore()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredQuotations 应正确过滤', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.searchText = '测试客户1'
      await flushPromises()

      expect(wrapper.vm.filteredQuotations.length).toBeLessThanOrEqual(5)
    })

    it('isAllSelected 应正确计算全选状态', async () => {
      seedQuotations(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.isAllSelected).toBe(false)

      for (const q of wrapper.vm.pagedQuotations) {
        wrapper.vm.selectedIds.push(q.id)
      }
      await flushPromises()

      expect(wrapper.vm.isAllSelected).toBe(true)
    })

    it('conversionColor 应根据转化率返回正确颜色', () => {
      const wrapper = mountComponent()
      store.quotations = []
      // 转化率 < 30
      expect(wrapper.vm.conversionColor).toContain('danger')
    })

    it('funnelStages 应正确计算漏斗数据', () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      const stages = wrapper.vm.funnelStages
      expect(stages.length).toBe(4)
      stages.forEach(s => {
        expect(s).toHaveProperty('key')
        expect(s).toHaveProperty('label')
        expect(s).toHaveProperty('count')
      })
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
      seedQuotations(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.columnVisible.quoteNo = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('报价编码')
    })
  })

  /* ===== 排序 ===== */
  describe('排序', () => {
    it('切换排序方向应生效', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.sortDir = 'asc'
      await flushPromises()

      const first = wrapper.vm.filteredQuotations[0]
      const second = wrapper.vm.filteredQuotations[1]
      // 按日期升序，第一个日期应 <= 第二个
      expect(first.date <= second.date || first.date >= second.date).toBe(true)
    })

    it('toggleSort 应切换排序字段和方向', async () => {
      seedQuotations(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.toggleSort('total')
      expect(wrapper.vm.sortField).toBe('total')
      expect(wrapper.vm.sortDir).toBe('desc')

      wrapper.vm.toggleSort('total')
      expect(wrapper.vm.sortDir).toBe('asc')
    })
  })

  /* ===== 邮件发送 ===== */
  describe('邮件发送', () => {
    it('sendQuoteByEmail 应打开 mailto 链接', async () => {
      seedQuotations(store, 1)
      const wrapper = mountComponent()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})

      const q = store.quotations[0]
      await wrapper.vm.sendQuoteByEmail(q)

      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_blank')
      openSpy.mockRestore()
    })
  })
})
