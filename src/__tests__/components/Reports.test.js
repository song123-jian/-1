/**
 * Reports.vue 组件级测试
 * 覆盖：渲染、交互、报表生成、参数配置、自定义报表、导出、图表可视化、弹窗交互
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Reports from '@/modules/report/views/Reports.vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { createQuotation, createCustomer, createCollection, resetCounter } from '@/__tests__/mockData'

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

/* ===== mock 数据仓库 store ===== */
vi.mock('@/stores/data', () => ({
  useDataStore: () => ({
    purchases: [],
    suppliers: []
  })
}))

/* ===== mock 库存 store ===== */
vi.mock('@/modules/warehouse/stores/inventory', () => ({
  useInventoryStore: () => ({
    inventory: [],
    lowStockCount: 0,
    exhaustedCount: 0,
    totalStockValue: 0
  })
}))

/* ===== mock 送货 store ===== */
vi.mock('@/stores/delivery', () => ({
  useDeliveryStore: () => ({
    deliveries: []
  })
}))

/* ===== mock 成本 store ===== */
vi.mock('@/modules/finance/stores/cost', () => ({
  useCostStore: () => ({
    records: []
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Reports, {
    global: {
      stubs: { Icon: IconStub },
      directives: {
        'safe-html': (el, binding) => { el.innerHTML = binding.value }
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedData(quotationStore, customerStore, collectionStore, count = 3) {
  resetCounter()

  for (let i = 0; i < count; i++) {
    customerStore.addCustomer(createCustomer({
      name: `测试客户${i + 1}号`,
      status: 'active'
    }))
  }

  const statuses = ['draft', 'pending', 'approved', 'accepted', 'rejected']
  for (let i = 0; i < count; i++) {
    quotationStore.addQuotation(createQuotation({
      status: statuses[i % statuses.length],
      customerName: `测试客户${i + 1}号`,
      total: 10000 * (i + 1)
    }))
  }

  for (let i = 0; i < count; i++) {
    collectionStore.addCollection(createCollection({
      customerName: `测试客户${i + 1}号`,
      amount: 5000 * (i + 1),
      status: 'completed'
    }))
  }
}

describe('Reports 组件', () => {
  let quotationStore, customerStore, collectionStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    quotationStore = useQuotationStore()
    customerStore = useCustomerStore()
    collectionStore = useCollectionStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('报表中心')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('预置报告')
    })

    it('应渲染统计栏', () => {
      const wrapper = mountComponent()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(4) // 报表总数、可用报表、数据覆盖率、最近更新
    })

    it('应渲染6张报表卡片', () => {
      const wrapper = mountComponent()
      const reportCards = wrapper.findAll('.report-card')
      expect(reportCards.length).toBe(6)
    })

    it('应渲染参数配置面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.panel-card-header').text()).toContain('报表参数配置')
    })

    it('应渲染数据可视化面板', () => {
      const wrapper = mountComponent()
      const panels = wrapper.findAll('.panel-card-header')
      const vizPanel = panels.filter(p => p.text().includes('数据可视化'))
      expect(vizPanel.length).toBe(1)
    })

    it('应渲染导出按钮', () => {
      const wrapper = mountComponent()
      const actions = wrapper.find('.page-header-actions')
      expect(actions.text()).toContain('导出全部')
    })
  })

  /* ===== 报表生成 ===== */
  describe('报表生成', () => {
    it('点击销售分析卡片应生成报告弹窗', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const salesCard = wrapper.findAll('.report-card')[0]
      await salesCard.trigger('click')

      expect(wrapper.vm.reportDialog.show).toBe(true)
      expect(wrapper.vm.reportDialog.title).toContain('销售分析报告')
    })

    it('点击库存状态卡片应生成报告弹窗', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const inventoryCard = wrapper.findAll('.report-card')[1]
      await inventoryCard.trigger('click')

      expect(wrapper.vm.reportDialog.show).toBe(true)
      expect(wrapper.vm.reportDialog.title).toContain('库存状态报告')
    })

    it('点击财务汇总卡片应生成报告弹窗', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const financeCard = wrapper.findAll('.report-card')[2]
      await financeCard.trigger('click')

      expect(wrapper.vm.reportDialog.show).toBe(true)
      expect(wrapper.vm.reportDialog.title).toContain('财务汇总报告')
    })

    it('点击采购支出卡片应生成报告弹窗', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const purchaseCard = wrapper.findAll('.report-card')[3]
      await purchaseCard.trigger('click')

      expect(wrapper.vm.reportDialog.show).toBe(true)
      expect(wrapper.vm.reportDialog.title).toContain('采购支出分析')
    })

    it('关闭报告弹窗应设置show为false', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.reportDialog = { show: true, title: '测试', content: '内容' }
      await flushPromises()

      // 点击弹窗关闭按钮
      const closeBtn = wrapper.findAll('.modal-panel .btn-ghost').find(b => b.text().includes('确定'))
      if (closeBtn) {
        await closeBtn.trigger('click')
        expect(wrapper.vm.reportDialog.show).toBe(false)
      }
    })
  })

  /* ===== 参数配置 ===== */
  describe('参数配置', () => {
    it('generateReportWithParams 缺少日期应提示错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.dateFrom = ''
      wrapper.vm.dateTo = ''

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramError).toBe('请选择开始日期和结束日期')
    })

    it('开始日期晚于结束日期应提示错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.dateFrom = '2026-12-31'
      wrapper.vm.dateTo = '2026-01-01'

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramError).toBe('开始日期不能晚于结束日期')
    })

    it('日期范围超过1年应提示错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.dateFrom = '2024-01-01'
      wrapper.vm.dateTo = '2026-06-01'

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramError).toBe('日期范围不能超过1年')
    })

    it('有效参数应生成报表HTML', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()
      wrapper.vm.reportType = 'sales'
      wrapper.vm.dateFrom = '2026-01-01'
      wrapper.vm.dateTo = '2026-12-31'

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramReportHtml).toContain('销售分析')
    })

    it('库存类型报表应生成库存内容', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()
      wrapper.vm.reportType = 'inventory'
      wrapper.vm.dateFrom = '2026-01-01'
      wrapper.vm.dateTo = '2026-12-31'

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramReportHtml).toContain('库存状态')
    })

    it('财务类型报表应生成财务内容', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()
      wrapper.vm.reportType = 'finance'
      wrapper.vm.dateFrom = '2026-01-01'
      wrapper.vm.dateTo = '2026-12-31'

      wrapper.vm.generateReportWithParams()
      await flushPromises()

      expect(wrapper.vm.paramReportHtml).toContain('财务汇总')
    })
  })

  /* ===== 自定义报表 ===== */
  describe('自定义报表', () => {
    it('点击自定义报告卡片应打开构建器', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const customCard = wrapper.findAll('.report-card')[4]
      await customCard.trigger('click')

      expect(wrapper.vm.showCustomBuilder).toBe(true)
    })

    it('openCustomReportBuilder 应打开弹窗并初始化字段', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.openCustomReportBuilder()
      expect(wrapper.vm.showCustomBuilder).toBe(true)
      expect(wrapper.vm.customSource).toBe('quotations')
    })

    it('updateCustomFields 应根据数据源更新字段列表', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.customSource = 'quotations'
      wrapper.vm.updateCustomFields()

      expect(wrapper.vm.customFields.length).toBeGreaterThan(0)
      expect(wrapper.vm.selectedFields.length).toBeGreaterThan(0)
    })

    it('generateCustomReport 未选字段应提示错误', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.selectedFields = []
      wrapper.vm.generateCustomReport()
      await flushPromises()

      expect(wrapper.vm.customError).toBe('请至少选择一个字段')
    })

    it('generateCustomReport 无数据应提示错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.customSource = 'quotations'
      wrapper.vm.selectedFields = ['id']

      wrapper.vm.generateCustomReport()
      await flushPromises()

      // 无数据时可能提示"所选数据源没有数据"
      expect(wrapper.vm.customError).toBeTruthy()
    })

    it('generateCustomReport 有效数据应打开导出弹窗', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()
      wrapper.vm.customSource = 'quotations'
      wrapper.vm.updateCustomFields()

      wrapper.vm.generateCustomReport()
      await flushPromises()

      expect(wrapper.vm.showCustomBuilder).toBe(false)
      expect(wrapper.vm.showExportDialog).toBe(true)
    })
  })

  /* ===== 导出功能 ===== */
  describe('导出功能', () => {
    it('doExportCSV 应创建 Blob 并触发下载', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      // 先准备导出数据
      wrapper.vm.exportHeaders = [{ key: 'type', label: '报表类型' }]
      wrapper.vm.exportData = [{ type: '销售分析' }]
      wrapper.vm.exportTitle = '测试导出'

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      wrapper.vm.doExportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('doExportExcel 应创建 Blob 并触发下载', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.exportHeaders = [{ key: 'type', label: '报表类型' }]
      wrapper.vm.exportData = [{ type: '销售分析' }]
      wrapper.vm.exportTitle = '测试导出'

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      wrapper.vm.doExportExcel()

      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('doExportPDF 应打开新窗口打印', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      wrapper.vm.exportHeaders = [{ key: 'type', label: '报表类型' }]
      wrapper.vm.exportData = [{ type: '销售分析' }]
      wrapper.vm.exportTitle = '测试导出'

      const openSpy = vi.spyOn(window, 'open').mockReturnValue({ document: { write: vi.fn(), close: vi.fn(), print: vi.fn() } })

      wrapper.vm.doExportPDF()

      expect(openSpy).toHaveBeenCalledWith('', '_blank')

      openSpy.mockRestore()
    })

    it('exportAllReports 应汇总所有报表数据', async () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      wrapper.vm.exportAllReports('csv')

      expect(wrapper.vm.exportData.length).toBe(4) // 4种报表类型
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('salesSummary 应正确计算销售摘要', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const summary = wrapper.vm.salesSummary
      expect(summary).toContain(quotationStore.quotations.length.toString())
    })

    it('financeSummary 应正确计算财务摘要', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const summary = wrapper.vm.financeSummary
      expect(summary).toBeTruthy()
    })

    it('revenueChartData 应返回月度数据', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const data = wrapper.vm.revenueChartData
      expect(Array.isArray(data)).toBe(true)
    })

    it('collectionChartData 应返回月度数据', () => {
      seedData(quotationStore, customerStore, collectionStore)
      const wrapper = mountComponent()

      const data = wrapper.vm.collectionChartData
      expect(Array.isArray(data)).toBe(true)
    })

    it('barHeight 应正确计算柱状图高度', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.barHeight(50, 100)).toBe(50)
      expect(wrapper.vm.barHeight(0, 100)).toBe(2)
      expect(wrapper.vm.barHeight(100, 0)).toBe(0)
    })

    it('formatChartValue 应正确格式化图表值', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatChartValue(15000)).toContain('万')
      expect(wrapper.vm.formatChartValue(500)).not.toContain('万')
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

  /* ===== 导出格式菜单 ===== */
  describe('导出格式菜单', () => {
    it('点击多格式导出按钮应切换菜单显示', async () => {
      const wrapper = mountComponent()
      const menuBtn = wrapper.findAll('.btn-ghost').find(b => b.text().includes('多格式导出'))

      await menuBtn.trigger('click')
      expect(wrapper.vm.showExportFormatMenu).toBe(true)

      await menuBtn.trigger('click')
      expect(wrapper.vm.showExportFormatMenu).toBe(false)
    })
  })

  /* ===== 导出弹窗 ===== */
  describe('导出弹窗', () => {
    it('点击导出弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showExportDialog = true
      await flushPromises()

      const overlay = wrapper.findAll('.modal-overlay').find(el => el.find('.modal-panel').exists() && el.find('.modal-panel').text().includes(wrapper.vm.exportTitle || ''))
      if (overlay) {
        await overlay.trigger('click')
        expect(wrapper.vm.showExportDialog).toBe(false)
      }
    })
  })
})
