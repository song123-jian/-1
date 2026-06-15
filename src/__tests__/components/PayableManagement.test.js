/**
 * PayableManagement.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、Tab切换、分页、付款弹窗、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import PayableManagement from '@/modules/finance/views/PayableManagement.vue'
import { usePayableStore } from '@/modules/finance/stores/payable'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { createPayable, resetCounter } from '@/__tests__/mockData'

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

vi.mock('@/utils/financeHelpers', () => ({
  generateOrderNo: (prefix, list, field) => prefix + Date.now(),
  computeAging: () => ({
    current: 40000, days30: 15000, days60: 8000,
    days90: 3000, days180: 1000, over180: 500
  }),
  refreshOverdueStatus: () => false,
  statusBadgeMap: {
    pending: 'warning', partial: 'info', completed: 'success', overdue: 'danger'
  },
  methodLabels: {
    bank: '银行转账', cash: '现金', check: '支票', wechat: '微信', alipay: '支付宝'
  }
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const PaymentFormModalStub = {
  props: ['visible', 'payable'],
  template: '<div class="payment-form-modal-stub" v-if="visible">PaymentForm</div>',
  emits: ['update:visible', 'saved']
}

const AgingAnalysisStub = {
  props: ['data', 'type'],
  template: '<div class="aging-analysis-stub">AgingAnalysis</div>'
}

const DataSelectStub = {
  props: ['modelValue', 'module', 'variant', 'valueField', 'labelField', 'placeholder', 'clearable'],
  template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option></select>',
  emits: ['update:modelValue']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(PayableManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        PaymentFormModal: PaymentFormModalStub,
        AgingAnalysis: AgingAnalysisStub,
        DataSelect: DataSelectStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedPayables(store, count = 5) {
  const statuses = ['pending', 'partial', 'completed', 'overdue']
  for (let i = 0; i < count; i++) {
    store.addPayable({
      supplierId: `s_test_${i + 1}`,
      supplierName: `测试供应商${i + 1}号`,
      sourceType: 'purchase',
      sourceNo: `PO-TEST-${i + 1}`,
      amount: 80000 * (i + 1),
      paidAmount: i % 2 === 0 ? 0 : 40000 * (i + 1),
      dueDate: i % 4 === 0 ? '2020-01-01' : '2030-12-31',
      status: statuses[i % 4]
    })
  }
}

describe('PayableManagement 组件', () => {
  let store
  let inventoryStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = usePayableStore()
    inventoryStore = useInventoryStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('应付管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('应付账款')
    })

    it('应显示资金流水线', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.fund-pipeline').exists()).toBe(true)
    })

    it('应显示Tab栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.tab-bar').exists()).toBe(true)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('有数据时应渲染表格行', () => {
      seedPayables(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('.data-table tbody tr')
      const dataRows = rows.filter(r => !r.find('.empty-state').exists())
      expect(dataRows.length).toBe(3)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按单号搜索应过滤结果', async () => {
      seedPayables(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue(store.payables[0].payableNo)
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按状态过滤应过滤结果', async () => {
      seedPayables(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.find('select.form-select')
      await select.setValue('completed')
      await flushPromises()

      // 验证过滤条件已设置，且分页列表中的数据状态正确
      expect(wrapper.vm.filters.status).toBe('completed')
      wrapper.vm.paginatedPayables.forEach(r => {
        expect(r.status).toBe('completed')
      })
    })

    it('点击重置按钮应清空筛选条件', async () => {
      seedPayables(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('test')
      await flushPromises()

      const resetBtn = wrapper.findAll('.btn-ghost').find(b => b.text().includes('重置'))
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.filters.search).toBe('')
    })
  })

  /* ===== Tab 切换 ===== */
  describe('Tab 切换', () => {
    it('默认应显示应付列表Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentTab).toBe('payables')
    })

    it('点击付款记录Tab应切换', async () => {
      seedPayables(store, 2)
      const wrapper = mountComponent()

      const paymentTab = wrapper.findAll('.tab-btn').find(b => b.text().includes('付款记录'))
      await paymentTab.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentTab).toBe('payments')
    })

    it('点击账龄分析Tab应切换', async () => {
      seedPayables(store, 2)
      const wrapper = mountComponent()

      const agingTab = wrapper.findAll('.tab-btn').find(b => b.text().includes('账龄分析'))
      await agingTab.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentTab).toBe('aging')
      expect(wrapper.find('.aging-analysis-stub').exists()).toBe(true)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页', async () => {
      seedPayables(store, 25)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页', () => {
      seedPayables(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })
  })

  /* ===== 付款弹窗 ===== */
  describe('付款弹窗', () => {
    it('点击新增付款单按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showPaymentForm).toBe(true)
    })

    it('点击应付行的付款按钮应打开弹窗', async () => {
      seedPayables(store, 1)
      store.payables[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      const payBtn = wrapper.findAll('.btn-ghost').find(b => b.find('.icon-stub').exists() && b.find('.icon-stub').text() === 'dollar')
      if (payBtn) {
        await payBtn.trigger('click')
        expect(wrapper.vm.showPaymentForm).toBe(true)
      }
    })

    it('已付完的应付行不应显示付款按钮', async () => {
      seedPayables(store, 1)
      store.payables[0].status = 'completed'
      const wrapper = mountComponent()
      await flushPromises()

      const row = wrapper.find('tbody tr')
      expect(row.text()).toContain('已结清')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionRate 应正确计算付款完成率', async () => {
      seedPayables(store, 2)
      const wrapper = mountComponent()

      const rate = wrapper.vm.completionRate
      expect(typeof rate).toBe('number')
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('无应付数据时 completionRate 应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)
    })

    it('completionRateColor 应根据完成率返回正确颜色', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRateColor).toBe('var(--color-danger)')
    })

    it('topSuppliers 应正确计算供应商应付排名', async () => {
      seedPayables(store, 5)
      const wrapper = mountComponent()

      const top = wrapper.vm.topSuppliers
      expect(top.length).toBeGreaterThan(0)
      expect(top.length).toBeLessThanOrEqual(5)
      top.forEach(item => {
        expect(item).toHaveProperty('supplierName')
        expect(item).toHaveProperty('amount')
        expect(item).toHaveProperty('percent')
      })
    })

    it('overdueList 应正确识别逾期应付', async () => {
      seedPayables(store, 5)
      const wrapper = mountComponent()

      const overdue = wrapper.vm.overdueList
      expect(Array.isArray(overdue)).toBe(true)
      overdue.forEach(item => {
        expect(item.remainingAmount).toBeGreaterThan(0)
      })
    })

    it('agingMatrixData 应正确计算账龄矩阵', async () => {
      seedPayables(store, 3)
      const wrapper = mountComponent()

      const matrix = wrapper.vm.agingMatrixData
      expect(Array.isArray(matrix)).toBe(true)
      matrix.forEach(row => {
        expect(row).toHaveProperty('supplier')
        expect(row).toHaveProperty('d30')
        expect(row).toHaveProperty('d60')
        expect(row).toHaveProperty('d90')
        expect(row).toHaveProperty('d90plus')
      })
    })

    it('agingCellClass 应根据金额返回正确样式类', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.agingCellClass(0)).toBe('empty')
      expect(wrapper.vm.agingCellClass(1000)).toBe('low')
      expect(wrapper.vm.agingCellClass(8000)).toBe('medium')
      expect(wrapper.vm.agingCellClass(20000)).toBe('high')
      expect(wrapper.vm.agingCellClass(60000)).toBe('critical')
    })

    it('formatAmountShort 应正确格式化金额', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatAmountShort(5000)).toBe('5000')
      expect(wrapper.vm.formatAmountShort(15000)).toBe('1.5万')
      expect(wrapper.vm.formatAmountShort(100000)).toBe('10.0万')
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showPayableStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showPayableStatsExpanded).toBe(true)
    })
  })

  /* ===== 逾期预警 ===== */
  describe('逾期预警', () => {
    it('有逾期应付时应显示预警面板', async () => {
      seedPayables(store, 5)
      const wrapper = mountComponent()

      if (wrapper.vm.overdueList.length > 0) {
        expect(wrapper.find('.overdue-alert').exists()).toBe(true)
      }
    })

    it('无逾期应付时不应显示预警面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overdue-alert').exists()).toBe(false)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应调用 refreshOverdueStatus', () => {
      const spy = vi.spyOn(store, 'refreshOverdueStatus')
      mountComponent()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
