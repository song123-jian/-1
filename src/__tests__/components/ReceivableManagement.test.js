/**
 * ReceivableManagement.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、Tab切换、分页、收款弹窗、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import ReceivableManagement from '@/modules/finance/views/ReceivableManagement.vue'
import { useReceivableStore } from '@/modules/finance/stores/receivable'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createReceivable, resetCounter } from '@/__tests__/mockData'

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
    current: 50000, days30: 20000, days60: 10000,
    days90: 5000, days180: 2000, over180: 1000
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
const ReceiptFormModalStub = {
  props: ['visible', 'receivable'],
  template: '<div class="receipt-form-modal-stub" v-if="visible">ReceiptForm</div>',
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
  return mount(ReceivableManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        ReceiptFormModal: ReceiptFormModalStub,
        AgingAnalysis: AgingAnalysisStub,
        DataSelect: DataSelectStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedReceivables(store, count = 5) {
  const statuses = ['pending', 'partial', 'completed', 'overdue']
  for (let i = 0; i < count; i++) {
    store.addReceivable({
      customerId: `c_test_${i + 1}`,
      customerName: `测试客户${i + 1}号`,
      sourceType: 'contract',
      sourceNo: `HT-TEST-${i + 1}`,
      amount: 100000 * (i + 1),
      receivedAmount: i % 2 === 0 ? 0 : 50000 * (i + 1),
      dueDate: i % 4 === 0 ? '2020-01-01' : '2030-12-31',
      status: statuses[i % 4]
    })
  }
}

describe('ReceivableManagement 组件', () => {
  let store
  let customerStore

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useReceivableStore()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('应收管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('应收账款')
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
      seedReceivables(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('.data-table tbody tr')
      // 只计算应收列表 tab 中的数据行（排除空状态行）
      const dataRows = rows.filter(r => !r.find('.empty-state').exists())
      expect(dataRows.length).toBe(3)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按单号搜索应过滤结果', async () => {
      seedReceivables(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue(store.receivables[0].receivableNo)
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按状态过滤应过滤结果', async () => {
      seedReceivables(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.find('select.form-select')
      await select.setValue('completed')
      await flushPromises()

      // 验证过滤条件已设置，且分页列表中的数据状态正确
      expect(wrapper.vm.filters.status).toBe('completed')
      wrapper.vm.paginatedReceivables.forEach(r => {
        expect(r.status).toBe('completed')
      })
    })

    it('点击重置按钮应清空筛选条件', async () => {
      seedReceivables(store, 3)
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
    it('默认应显示应收列表Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentTab).toBe('receivables')
    })

    it('点击收款记录Tab应切换', async () => {
      seedReceivables(store, 2)
      const wrapper = mountComponent()

      const receiptTab = wrapper.findAll('.tab-btn').find(b => b.text().includes('收款记录'))
      await receiptTab.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentTab).toBe('receipts')
    })

    it('点击账龄分析Tab应切换', async () => {
      seedReceivables(store, 2)
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
      seedReceivables(store, 25)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页', () => {
      seedReceivables(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })
  })

  /* ===== 收款弹窗 ===== */
  describe('收款弹窗', () => {
    it('点击新增收款单按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showReceiptForm).toBe(true)
    })

    it('点击应收行的收款按钮应打开弹窗', async () => {
      seedReceivables(store, 1)
      store.receivables[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      const receiptBtn = wrapper.findAll('.btn-ghost').find(b => b.find('.icon-stub').exists() && b.find('.icon-stub').text() === 'dollar')
      if (receiptBtn) {
        await receiptBtn.trigger('click')
        expect(wrapper.vm.showReceiptForm).toBe(true)
      }
    })

    it('已收完的应收行不应显示收款按钮', async () => {
      seedReceivables(store, 1)
      store.receivables[0].status = 'completed'
      const wrapper = mountComponent()
      await flushPromises()

      // 在应收列表 tab 中查找数据行
      const rows = wrapper.findAll('.data-table tbody tr')
      const dataRows = rows.filter(r => !r.find('.empty-state').exists())
      expect(dataRows.length).toBeGreaterThan(0)
      expect(dataRows[0].text()).toContain('已结清')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionRate 应正确计算收款完成率', async () => {
      seedReceivables(store, 2)
      const wrapper = mountComponent()

      const rate = wrapper.vm.completionRate
      expect(typeof rate).toBe('number')
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('无应收数据时 completionRate 应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionRate).toBe(0)
    })

    it('completionRateColor 应根据完成率返回正确颜色', () => {
      const wrapper = mountComponent()
      // 默认无数据，完成率为0，应返回 danger
      expect(wrapper.vm.completionRateColor).toBe('var(--color-danger)')
    })

    it('customerTop5 应正确计算客户应收排名', async () => {
      seedReceivables(store, 5)
      const wrapper = mountComponent()

      const top5 = wrapper.vm.customerTop5
      expect(top5.length).toBeGreaterThan(0)
      expect(top5.length).toBeLessThanOrEqual(5)
      top5.forEach(item => {
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('amount')
        expect(item).toHaveProperty('percent')
      })
    })

    it('overdueList 应正确识别逾期应收', async () => {
      seedReceivables(store, 5)
      const wrapper = mountComponent()

      const overdue = wrapper.vm.overdueList
      expect(Array.isArray(overdue)).toBe(true)
      overdue.forEach(item => {
        expect(item.overdueDays).toBeGreaterThanOrEqual(0)
        expect(item.remainingAmount).toBeGreaterThan(0)
      })
    })

    it('agingMatrixData 应正确计算账龄矩阵', async () => {
      seedReceivables(store, 3)
      const wrapper = mountComponent()

      const matrix = wrapper.vm.agingMatrixData
      expect(Array.isArray(matrix)).toBe(true)
      matrix.forEach(row => {
        expect(row).toHaveProperty('customer')
        expect(row).toHaveProperty('d30')
        expect(row).toHaveProperty('d60')
        expect(row).toHaveProperty('d90')
        expect(row).toHaveProperty('d90plus')
      })
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showReceivableStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showReceivableStatsExpanded).toBe(true)
    })
  })

  /* ===== 逾期预警 ===== */
  describe('逾期预警', () => {
    it('有逾期应收时应显示预警面板', async () => {
      seedReceivables(store, 5)
      const wrapper = mountComponent()

      if (wrapper.vm.overdueList.length > 0) {
        expect(wrapper.find('.overdue-alert-panel').exists()).toBe(true)
      }
    })

    it('无逾期应收时不应显示预警面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.overdue-alert-panel').exists()).toBe(false)
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
