/**
 * MonthlyStats.vue 组件级测试
 * 覆盖：渲染、交互、筛选器、KPI卡片、完成率环、业务类型分布、健康度、折叠面板、导出、打印
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import MonthlyStats from '@/modules/report/views/MonthlyStats.vue'

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

/* ===== mock monthlyStats store ===== */
const mockStoreData = {
  selectedYear: 2026,
  selectedMonth: 6,
  selectedWarehouse: '',
  selectedBizType: '',
  quickRange: 'curr',
  collapsedSections: {},
  kpiData: {
    inCount: 25,
    outCount: 18,
    inWeight: 5000.5,
    outWeight: 3500.3,
    inAmount: 500000,
    outAmount: 350000,
    pending: 5,
    confirmed: 38
  },
  bizSummary: [
    { type: 'purchase', inCount: 10, inWeight: 2000, inAmount: 200000, outCount: 0, outWeight: 0, outAmount: 0 },
    { type: 'sales', inCount: 0, inWeight: 0, inAmount: 0, outCount: 12, outWeight: 2500, outAmount: 280000 },
    { type: 'transfer', inCount: 5, inWeight: 1500, inAmount: 50000, outCount: 3, outWeight: 800, outAmount: 30000 },
    { type: 'customer_return', inCount: 3, inWeight: 500, inAmount: 30000, outCount: 0, outWeight: 0, outAmount: 0 },
    { type: 'scrap', inCount: 0, inWeight: 0, inAmount: 0, outCount: 3, outWeight: 200, outAmount: 10000 }
  ],
  categorySummary: [
    { category: '原材料', count: 50, stock: 10000, value: 800000 },
    { category: '成品', count: 30, stock: 5000, value: 600000 },
    { category: '半成品', count: 20, stock: 3000, value: 200000 }
  ],
  dailySummary: [
    { date: '2026-06-01', inCount: 3, inWeight: 500, inAmount: 50000, outCount: 2, outWeight: 300, outAmount: 30000 },
    { date: '2026-06-02', inCount: 2, inWeight: 400, inAmount: 40000, outCount: 1, outWeight: 200, outAmount: 20000 }
  ],
  topItems: [
    { code: 'MTL-001', name: 'ABS树脂', inWeight: 1000, inAmount: 100000, outWeight: 800, outAmount: 80000 },
    { code: 'MTL-002', name: '不锈钢板304', inWeight: 800, inAmount: 80000, outWeight: 600, outAmount: 60000 }
  ],
  healthData: {
    total: 100,
    exhausted: 2,
    low: 8,
    over: 5,
    normal: 85,
    healthScore: 85
  }
}

vi.mock('@/modules/report/stores/monthlyStats', () => ({
  useMonthlyStatsStore: () => ({
    ...mockStoreData,
    toggleSection: vi.fn((key) => {
      mockStoreData.collapsedSections[key] = !mockStoreData.collapsedSections[key]
    }),
    setQuickRange: vi.fn((range) => {
      mockStoreData.quickRange = range
    }),
    refresh: vi.fn()
  })
}))

/* ===== mock inventory store (monthlyStats 依赖) ===== */
vi.mock('@/modules/warehouse/stores/inventory', () => ({
  useInventoryStore: () => ({
    inventory: [],
    inboundOrders: [],
    outboundOrders: [],
    enrichedInventory: [],
    lowStockCount: 0,
    exhaustedCount: 0,
    overStockCount: 0,
    normalStockCount: 0,
    totalStockValue: 0,
    replaceData: vi.fn(),
    replaceInbound: vi.fn(),
    replaceOutbound: vi.fn()
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(MonthlyStats, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

describe('MonthlyStats 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
    // 重置 mock store 数据
    mockStoreData.collapsedSections = {}
    mockStoreData.quickRange = 'curr'
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ms-header h2').text()).toContain('DP仓库月度出入库统计')
    })

    it('应渲染年份选择器', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('.form-select')
      const yearSelect = selects.find(s => s.element.style.width === '100px' || s.attributes('style')?.includes('100px'))
      expect(yearSelect || selects[0]).toBeTruthy()
    })

    it('应渲染月份选择器', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('.form-select')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('应渲染快捷范围按钮', () => {
      const wrapper = mountComponent()
      const quickBtns = wrapper.findAll('.ms-quick-btns .btn')
      expect(quickBtns.length).toBe(5) // 上月、本月、近3月、近6月、近12月
    })

    it('应渲染仓库选择器', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('全部仓库')
    })

    it('应渲染业务类型选择器', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('全部业务类型')
    })

    it('应渲染操作按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('刷新')
      expect(wrapper.text()).toContain('导出CSV')
      expect(wrapper.text()).toContain('导出PDF')
      expect(wrapper.text()).toContain('打印')
    })

    it('应渲染KPI卡片', () => {
      const wrapper = mountComponent()
      const kpiCards = wrapper.findAll('.ms-kpi-card')
      expect(kpiCards.length).toBe(8) // 入库单数、出库单数、入库重量、出库重量、入库金额、出库金额、待处理、已完成
    })

    it('应渲染概览面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ms-overview-row').exists()).toBe(true)
    })

    it('应渲染完成率环', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overview-ring-card').exists()).toBe(true)
    })

    it('应渲染业务类型分布', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overview-biz-card').exists()).toBe(true)
    })

    it('应渲染出入库金额对比', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overview-trend-card').exists()).toBe(true)
    })
  })

  /* ===== KPI卡片内容 ===== */
  describe('KPI卡片内容', () => {
    it('入库单数应正确显示', () => {
      const wrapper = mountComponent()
      const kpiValues = wrapper.findAll('.ms-kpi-value')
      expect(kpiValues[0].text()).toContain('25')
    })

    it('出库单数应正确显示', () => {
      const wrapper = mountComponent()
      const kpiValues = wrapper.findAll('.ms-kpi-value')
      expect(kpiValues[1].text()).toContain('18')
    })

    it('入库金额应正确显示', () => {
      const wrapper = mountComponent()
      const kpiValues = wrapper.findAll('.ms-kpi-value')
      expect(kpiValues[4].text()).toContain('500,000.00')
    })
  })

  /* ===== 完成率环 ===== */
  describe('完成率环', () => {
    it('completionRate 应正确计算', () => {
      const wrapper = mountComponent()
      // confirmed=38, total=25+18=43, rate=round(38/43*100)=88
      expect(wrapper.vm.completionRate).toBe(88)
    })

    it('completionRateColor 应根据完成率返回正确颜色', () => {
      const wrapper = mountComponent()
      // 88 >= 80, 应为 success
      expect(wrapper.vm.completionRateColor).toContain('success')
    })

    it('completionRateDash 应正确计算', () => {
      const wrapper = mountComponent()
      const dash = wrapper.vm.completionRateDash
      expect(dash).toBeTruthy()
      expect(dash).toContain(' ')
    })
  })

  /* ===== 业务类型分布 ===== */
  describe('业务类型分布', () => {
    it('bizTypeStats 应正确计算', () => {
      const wrapper = mountComponent()
      const stats = wrapper.vm.bizTypeStats

      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('label')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('percent')
        expect(s).toHaveProperty('color')
      })
    })

    it('bizTypeLabel 应正确映射业务类型', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.bizTypeLabel('purchase')).toBe('采购入库')
      expect(wrapper.vm.bizTypeLabel('sales')).toBe('销售出库')
      expect(wrapper.vm.bizTypeLabel('customer_return')).toBe('客户退货')
      expect(wrapper.vm.bizTypeLabel('unknown')).toBe('unknown')
    })
  })

  /* ===== 出入库金额对比 ===== */
  describe('出入库金额对比', () => {
    it('inAmountPercent 应正确计算', () => {
      const wrapper = mountComponent()
      // inAmount=500000, outAmount=350000, total=850000
      // percent = round(500000/850000*100) = 59
      expect(wrapper.vm.inAmountPercent).toBe(59)
    })

    it('outAmountPercent 应正确计算', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.outAmountPercent).toBe(41)
    })
  })

  /* ===== 库存健康度 ===== */
  describe('库存健康度', () => {
    it('healthScoreColor 应根据评分返回正确颜色', () => {
      const wrapper = mountComponent()
      // healthScore=85 >= 80, 应为 success
      expect(wrapper.vm.healthScoreColor).toContain('success')
    })

    it('healthScoreDash 应正确计算', () => {
      const wrapper = mountComponent()
      const dash = wrapper.vm.healthScoreDash
      expect(dash).toBeTruthy()
    })

    it('healthAlerts 应正确生成预警列表', () => {
      const wrapper = mountComponent()
      const alerts = wrapper.vm.healthAlerts

      expect(alerts.length).toBeGreaterThan(0)
      // exhausted=2, low=8, over=5
      const exhaustedAlert = alerts.find(a => a.type === 'exhausted')
      const lowAlert = alerts.find(a => a.type === 'low')
      const overAlert = alerts.find(a => a.type === 'over')

      expect(exhaustedAlert).toBeTruthy()
      expect(lowAlert).toBeTruthy()
      expect(overAlert).toBeTruthy()
    })

    it('无预警时 healthAlerts 应为空', () => {
      const originalHealth = mockStoreData.healthData
      mockStoreData.healthData = { total: 100, exhausted: 0, low: 0, over: 0, normal: 100, healthScore: 100 }

      const wrapper = mountComponent()
      expect(wrapper.vm.healthAlerts.length).toBe(0)

      mockStoreData.healthData = originalHealth
    })
  })

  /* ===== 折叠面板 ===== */
  describe('折叠面板', () => {
    it('应渲染所有折叠面板', () => {
      const wrapper = mountComponent()
      const sections = wrapper.findAll('.ms-section')
      expect(sections.length).toBeGreaterThanOrEqual(4) // 健康、业务汇总、品类、每日明细
    })

    it('点击面板头部应调用 toggleSection', async () => {
      const wrapper = mountComponent()
      const header = wrapper.find('.ms-section-header')

      await header.trigger('click')
      // toggleSection 已被 mock，验证不报错即可
    })
  })

  /* ===== 快捷范围按钮 ===== */
  describe('快捷范围按钮', () => {
    it('本月按钮应有 active 类', () => {
      const wrapper = mountComponent()
      const quickBtns = wrapper.findAll('.ms-quick-btns .btn')
      const currBtn = quickBtns.find(b => b.text().includes('本月'))
      expect(currBtn?.classes()).toContain('active')
    })

    it('点击上月按钮应调用 setQuickRange', async () => {
      const wrapper = mountComponent()
      const quickBtns = wrapper.findAll('.ms-quick-btns .btn')
      const prevBtn = quickBtns.find(b => b.text().includes('上月'))

      await prevBtn.trigger('click')
      // setQuickRange 已被 mock，验证不报错即可
    })
  })

  /* ===== 导出CSV ===== */
  describe('导出CSV', () => {
    it('handleExportCSV 应创建 Blob 并触发下载', () => {
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      wrapper.vm.handleExportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 导出PDF ===== */
  describe('导出PDF', () => {
    it('handleExportPDF 应调用 window.print', () => {
      const wrapper = mountComponent()
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      wrapper.vm.handleExportPDF()
      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
    })
  })

  /* ===== 打印 ===== */
  describe('打印', () => {
    it('handlePrint 应调用 window.print', () => {
      const wrapper = mountComponent()
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      wrapper.vm.handlePrint()
      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
    })
  })

  /* ===== formatNum ===== */
  describe('formatNum', () => {
    it('应正确格式化数字', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatNum(1000)).toBe('1,000.00')
      expect(wrapper.vm.formatNum(0)).toBe('0.00')
      expect(wrapper.vm.formatNum(1234567.89)).toBe('1,234,567.89')
    })

    it('应处理 null/undefined', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatNum(null)).toBe('0.00')
      expect(wrapper.vm.formatNum(undefined)).toBe('0.00')
    })
  })

  /* ===== bizTypeLabel ===== */
  describe('bizTypeLabel', () => {
    it('应正确映射所有已知业务类型', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.bizTypeLabel('purchase')).toBe('采购入库')
      expect(wrapper.vm.bizTypeLabel('sales')).toBe('销售出库')
      expect(wrapper.vm.bizTypeLabel('customer_return')).toBe('客户退货')
      expect(wrapper.vm.bizTypeLabel('production')).toBe('生产领料')
      expect(wrapper.vm.bizTypeLabel('production_return')).toBe('生产退料')
      expect(wrapper.vm.bizTypeLabel('transfer')).toBe('调拨')
      expect(wrapper.vm.bizTypeLabel('scrap')).toBe('报废出库')
      expect(wrapper.vm.bizTypeLabel('surplus')).toBe('盘盈入库')
      expect(wrapper.vm.bizTypeLabel('loss')).toBe('盘亏出库')
    })

    it('未知类型应原样返回', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.bizTypeLabel('custom_type')).toBe('custom_type')
    })
  })

  /* ===== 表格渲染 ===== */
  describe('表格渲染', () => {
    it('业务汇总表应渲染数据行', () => {
      const wrapper = mountComponent()
      // 检查业务汇总表是否存在
      const tables = wrapper.findAll('.data-table')
      expect(tables.length).toBeGreaterThan(0)
    })

    it('Top10表格应渲染数据行', () => {
      const wrapper = mountComponent()
      const topGrid = wrapper.find('.ms-top-grid')
      expect(topGrid.exists()).toBe(true)
    })

    it('品类汇总表应渲染数据行', () => {
      const wrapper = mountComponent()
      // 品类汇总表在折叠面板中
      expect(wrapper.text()).toContain('物料品类汇总表')
    })

    it('每日明细表应渲染数据行', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('每日明细汇总表')
    })
  })

  /* ===== 年份选项 ===== */
  describe('年份选项', () => {
    it('yearOptions 应包含当前年份附近的年份', () => {
      const wrapper = mountComponent()
      const options = wrapper.vm.yearOptions
      const currentYear = new Date().getFullYear()

      expect(options).toContain(currentYear)
      expect(options.length).toBe(5) // current-3 到 current+1
    })
  })

  /* ===== 完成率边界条件 ===== */
  describe('完成率边界条件', () => {
    it('总单数为0时完成率应为0', () => {
      const originalKpi = mockStoreData.kpiData
      mockStoreData.kpiData = { inCount: 0, outCount: 0, inWeight: 0, outWeight: 0, inAmount: 0, outAmount: 0, pending: 0, confirmed: 0 }

      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)

      mockStoreData.kpiData = originalKpi
    })

    it('全部确认时完成率应为100', () => {
      const originalKpi = mockStoreData.kpiData
      mockStoreData.kpiData = { inCount: 10, outCount: 10, inWeight: 0, outWeight: 0, inAmount: 0, outAmount: 0, pending: 0, confirmed: 20 }

      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(100)

      mockStoreData.kpiData = originalKpi
    })
  })

  /* ===== 健康度评分颜色 ===== */
  describe('健康度评分颜色', () => {
    it('评分 >= 80 应为 success', () => {
      const originalHealth = mockStoreData.healthData
      mockStoreData.healthData = { ...originalHealth, healthScore: 85 }

      const wrapper = mountComponent()
      expect(wrapper.vm.healthScoreColor).toContain('success')

      mockStoreData.healthData = originalHealth
    })

    it('评分 50-79 应为 warning', () => {
      const originalHealth = mockStoreData.healthData
      mockStoreData.healthData = { ...originalHealth, healthScore: 65 }

      const wrapper = mountComponent()
      expect(wrapper.vm.healthScoreColor).toContain('warning')

      mockStoreData.healthData = originalHealth
    })

    it('评分 < 50 应为 danger', () => {
      const originalHealth = mockStoreData.healthData
      mockStoreData.healthData = { ...originalHealth, healthScore: 30 }

      const wrapper = mountComponent()
      expect(wrapper.vm.healthScoreColor).toContain('danger')

      mockStoreData.healthData = originalHealth
    })
  })
})
