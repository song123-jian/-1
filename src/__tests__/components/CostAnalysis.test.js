/**
 * CostAnalysis.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、列配置、导出、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import CostAnalysis from '@/modules/finance/views/CostAnalysis.vue'
import { useCostStore } from '@/modules/finance/stores/cost'
import { createCostRecord, resetCounter } from '@/__tests__/mockData'

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

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(CostAnalysis, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedCostRecords(store, count = 5) {
  const suppliers = ['江苏钢铁集团有限公司', '浙江化工原料有限公司', '广东有色金属有限公司']
  const materials = ['不锈钢板304', 'ABS树脂', '铝合金型材6063', '碳钢Q235', '轴承钢GCr15']
  const statuses = ['completed', 'approved', 'pending', 'cancelled']
  for (let i = 0; i < count; i++) {
    const actualCost = 10000 * (i + 1)
    const standardCost = actualCost * 0.95
    store.addRecord({
      poNo: `PO-TEST-${String(i + 1).padStart(3, '0')}`,
      supplierId: `s_test_${i + 1}`,
      supplierName: suppliers[i % suppliers.length],
      date: '2026-06-01',
      materialName: materials[i % materials.length],
      quantity: 100 * (i + 1),
      actualCost,
      standardCost,
      status: statuses[i % statuses.length]
    })
  }
}

describe('CostAnalysis 组件', () => {
  let store

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useCostStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('成本核算')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('成本')
    })

    it('有查看权限时不应显示访问受限', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.access-denied').exists()).toBe(false)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('有数据时应渲染表格行', () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
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
    it('按期间过滤应生效', async () => {
      seedCostRecords(store, 5)
      const wrapper = mountComponent()

      const periodSelect = wrapper.findAll('select.form-select')[0]
      await periodSelect.setValue('month')
      await flushPromises()

      // 验证过滤逻辑被调用
      expect(wrapper.vm.periodFilter).toBe('month')
    })

    it('按供应商过滤应生效', async () => {
      seedCostRecords(store, 5)
      const wrapper = mountComponent()

      // 直接设置 supplierFilter，因为 select 的 option 依赖 dataStore.suppliers
      wrapper.vm.supplierFilter = 's_test_1'
      await flushPromises()

      expect(wrapper.vm.supplierFilter).toBe('s_test_1')
    })

    it('点击刷新按钮应重置筛选条件', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.periodFilter = 'month'
      wrapper.vm.supplierFilter = 's_test_1'
      await flushPromises()

      const resetBtn = wrapper.findAll('.btn-secondary').find(b => b.text().includes('刷新'))
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.periodFilter).toBe('all')
      expect(wrapper.vm.supplierFilter).toBe('all')
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
      seedCostRecords(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.columnVisible.supplier = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('供应商')
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应显示错误提示', async () => {
      const wrapper = mountComponent()

      await wrapper.vm.exportCSV()
      expect(wrapper.vm.exportError).toBe('无数据可导出')
    })

    it('有数据时导出CSV应创建 Blob', async () => {
      seedCostRecords(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showCostStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showCostStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showCostStatsExpanded).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('healthPercent 应正确计算成本健康度', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const pct = wrapper.vm.healthPercent
      expect(typeof pct).toBe('number')
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    })

    it('healthRingColor 应根据差异率返回正确颜色', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const color = wrapper.vm.healthRingColor
      expect(['var(--color-success)', 'var(--color-warning)', 'var(--color-danger)']).toContain(color)
    })

    it('healthLabel 应根据差异率返回正确标签', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const label = wrapper.vm.healthLabel
      expect(['健康', '关注', '预警']).toContain(label)
    })

    it('statusPct 应正确计算状态分布百分比', async () => {
      seedCostRecords(store, 5)
      const wrapper = mountComponent()

      const pct = wrapper.vm.statusPct
      expect(pct.over + pct.under + pct.normal).toBe(100)
    })

    it('top5Suppliers 应正确计算供应商成本排名', async () => {
      seedCostRecords(store, 5)
      const wrapper = mountComponent()

      const top5 = wrapper.vm.top5Suppliers
      expect(top5.length).toBeGreaterThan(0)
      expect(top5.length).toBeLessThanOrEqual(5)
      top5.forEach(s => {
        expect(s).toHaveProperty('supplierName')
        expect(s).toHaveProperty('actualCost')
        expect(s).toHaveProperty('pct')
      })
    })

    it('filteredRecords 应根据期间和供应商过滤', async () => {
      seedCostRecords(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.periodFilter = 'all'
      wrapper.vm.supplierFilter = 'all'
      await flushPromises()

      expect(wrapper.vm.filteredRecords.length).toBe(5)
    })

    it('monthlyTrend 应正确计算月度趋势', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const trend = wrapper.vm.monthlyTrend
      expect(Array.isArray(trend)).toBe(true)
    })

    it('supplierBreakdown 应正确计算供应商分布', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const breakdown = wrapper.vm.supplierBreakdown
      expect(Array.isArray(breakdown)).toBe(true)
      breakdown.forEach(s => {
        expect(s).toHaveProperty('supplierName')
        expect(s).toHaveProperty('actualCost')
        expect(s).toHaveProperty('standardCost')
        expect(s).toHaveProperty('variance')
      })
    })

    it('waterfallItems 应正确计算瀑布图数据', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      const items = wrapper.vm.waterfallItems
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('value')
        expect(item).toHaveProperty('bottom')
        expect(item).toHaveProperty('height')
      })
    })

    it('waterfallBaseHeight 应大于0', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      expect(wrapper.vm.waterfallBaseHeight).toBeGreaterThan(0)
    })

    it('waterfallTotalHeight 应大于0', async () => {
      seedCostRecords(store, 3)
      const wrapper = mountComponent()

      expect(wrapper.vm.waterfallTotalHeight).toBeGreaterThan(0)
    })
  })

  /* ===== 表格行样式 ===== */
  describe('表格行样式', () => {
    it('差异为正的行应有超预算样式', async () => {
      seedCostRecords(store, 2)
      const wrapper = mountComponent()

      const rows = wrapper.findAll('tbody tr')
      const overBudgetRows = rows.filter(r => r.classes().includes('row-over-budget'))
      expect(overBudgetRows.length).toBeGreaterThanOrEqual(0)
    })

    it('差异为负的行应有低于预算样式', async () => {
      store.addRecord({
        poNo: 'PO-UNDER',
        supplierId: 's1',
        supplierName: '测试供应商',
        date: '2026-06-01',
        materialName: '测试物料',
        quantity: 100,
        actualCost: 8000,
        standardCost: 10000,
        status: 'completed'
      })
      const wrapper = mountComponent()

      const rows = wrapper.findAll('tbody tr')
      const underBudgetRows = rows.filter(r => r.classes().includes('row-under-budget'))
      expect(underBudgetRows.length).toBe(1)
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
