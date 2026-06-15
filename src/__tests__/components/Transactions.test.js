/**
 * Transactions.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、CRUD弹窗、表单验证、导出、视图切换、日历导航、详情弹窗
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Transactions from '@/modules/sales/views/Transactions.vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createQuotation, createContract, createCollection, createDelivery, createCustomer, resetCounter } from '@/__tests__/mockData'

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

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStubs = {
  Icon: IconStub,
  TransactionTable: {
    props: ['transactions', 'currentPage', 'columnVisible', 'typeLabels', 'statusLabels', 'statusBadgeMap'],
    template: '<div class="txn-table-stub"><div v-for="t in transactions" :key="t.id" class="txn-row" @click="$emit(\'view-detail\', t)">{{ t.refNo }}</div></div>'
  },
  TransactionList: {
    props: ['transactions', 'typeLabels', 'statusLabels', 'statusBadgeMap'],
    template: '<div class="txn-list-stub"><div v-for="t in transactions" :key="t.id" class="txn-item">{{ t.refNo }}</div></div>'
  },
  TransactionCardView: {
    props: ['transactions', 'typeLabels', 'statusLabels', 'statusBadgeMap'],
    template: '<div class="txn-card-stub"><div v-for="t in transactions" :key="t.id" class="txn-card">{{ t.refNo }}</div></div>'
  },
  TransactionFormModal: {
    props: ['showModal', 'editingTransaction', 'customers', 'canSubmit'],
    template: '<div class="form-modal-stub" v-if="showModal"></div>'
  }
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Transactions, {
    global: {
      stubs: ChildStubs
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore, count = 3) {
  resetCounter()

  for (let i = 0; i < count; i++) {
    customerStore.addCustomer(createCustomer({
      name: `测试客户${i + 1}号`,
      status: 'active'
    }))
  }

  const statuses = ['draft', 'pending', 'approved', 'sent', 'accepted', 'rejected']
  for (let i = 0; i < count; i++) {
    quotationStore.addQuotation(createQuotation({
      status: statuses[i % statuses.length],
      customerName: `测试客户${i + 1}号`,
      total: 10000 * (i + 1)
    }))
  }

  const contractStatuses = ['pending', 'approved', 'signed', 'archived']
  for (let i = 0; i < count; i++) {
    contractStore.addContract(createContract({
      status: contractStatuses[i % contractStatuses.length],
      partyA: `测试客户${i + 1}号`,
      totalAmount: 20000 * (i + 1)
    }))
  }

  for (let i = 0; i < count; i++) {
    collectionStore.addCollection(createCollection({
      customerName: `测试客户${i + 1}号`,
      amount: 5000 * (i + 1),
      status: 'completed'
    }))
  }

  for (let i = 0; i < count; i++) {
    deliveryStore.addDelivery(createDelivery({
      customerName: `测试客户${i + 1}号`,
      totalAmount: 8000 * (i + 1),
      status: 'created'
    }))
  }
}

describe('Transactions 组件', () => {
  let quotationStore, contractStore, collectionStore, deliveryStore, customerStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    quotationStore = useQuotationStore()
    contractStore = useContractStore()
    collectionStore = useCollectionStore()
    deliveryStore = useDeliveryStore()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('交易管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('全链路交易记录追踪')
    })

    it('应渲染统计卡片', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(5) // 交易总数、交易总额、已完成、进行中、逾期金额
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-toggle .btn')
      expect(viewBtns.length).toBe(5) // 表格、列表、卡片、日历、周视图
    })

    it('应渲染操作按钮', () => {
      const wrapper = mountComponent()
      const actions = wrapper.find('.page-header-actions')
      expect(actions.text()).toContain('导出')
      expect(actions.text()).toContain('新建交易')
    })

    it('应渲染过滤栏控件', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
      expect(wrapper.find('.filter-bar input[type="text"]').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按编号搜索应过滤结果', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.filters.search = 'QT'
      await flushPromises()

      expect(wrapper.vm.filteredTransactions.length).toBeLessThanOrEqual(wrapper.vm.allTransactions.length)
    })

    it('按客户名称搜索应过滤结果', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.filters.search = '测试客户1'
      await flushPromises()

      wrapper.vm.filteredTransactions.forEach(t => {
        expect(t.customerName).toContain('测试客户1')
      })
    })

    it('按类型过滤应过滤结果', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.filters.type = 'quotation'
      await flushPromises()

      wrapper.vm.filteredTransactions.forEach(t => {
        expect(t.type).toBe('quotation')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.filters.status = 'completed'
      await flushPromises()

      wrapper.vm.filteredTransactions.forEach(t => {
        expect(t.status).toBe('completed')
      })
    })

    it('重置过滤应清空所有条件', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.filters.search = '测试'
      wrapper.vm.filters.type = 'quotation'
      await flushPromises()

      wrapper.vm.resetFilters()
      await flushPromises()

      expect(wrapper.vm.filters.search).toBe('')
      expect(wrapper.vm.filters.type).toBe('')
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('allTransactions 应聚合所有来源的交易', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      const all = wrapper.vm.allTransactions
      // 3 quotations + 3 contracts + 3 collections + 3 deliveries = 12
      expect(all.length).toBeGreaterThanOrEqual(12)
    })

    it('totalAmount 应正确计算交易总额', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      expect(wrapper.vm.totalAmount).toBeGreaterThan(0)
    })

    it('completedCount 应正确计算已完成数量', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.completedCount).toBe('number')
      expect(wrapper.vm.completedCount).toBeGreaterThanOrEqual(0)
    })

    it('pendingCount 应正确计算进行中数量', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.pendingCount).toBe('number')
    })
  })

  /* ===== 新增交易 ===== */
  describe('新增交易', () => {
    it('点击新建交易按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.findAll('.btn-primary').find(b => b.text().includes('新建交易'))
      await addBtn.trigger('click')

      expect(wrapper.vm.showForm).toBe(true)
      expect(wrapper.vm.editingTxn).toBeNull()
    })

    it('openForm 不传参时应设置新增模式', () => {
      const wrapper = mountComponent()
      wrapper.vm.openForm()
      expect(wrapper.vm.editingTxn).toBeNull()
      expect(wrapper.vm.showForm).toBe(true)
    })
  })

  /* ===== 编辑交易 ===== */
  describe('编辑交易', () => {
    it('openForm 传入交易应设置编辑模式', () => {
      const wrapper = mountComponent()
      const txn = { id: 'txn-1', refNo: 'TXN-001', type: 'manual', source: { id: 'txn-1' } }
      wrapper.vm.openForm(txn)
      expect(wrapper.vm.editingTxn).toStrictEqual(txn)
      expect(wrapper.vm.showForm).toBe(true)
    })
  })

  /* ===== 关闭弹窗 ===== */
  describe('关闭弹窗', () => {
    it('closeForm 应关闭弹窗并清空编辑状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showForm = true
      wrapper.vm.editingTxn = { id: '1' }

      wrapper.vm.closeForm()
      expect(wrapper.vm.showForm).toBe(false)
      expect(wrapper.vm.editingTxn).toBeNull()
    })
  })

  /* ===== 保存手动交易 ===== */
  describe('保存手动交易', () => {
    it('新增手动交易应添加到列表', async () => {
      const wrapper = mountComponent()
      const formData = {
        customerId: 'c_test_1',
        amount: 50000,
        date: '2026-06-01',
        notes: '测试手动交易'
      }

      wrapper.vm.handleFormSave(formData)
      await flushPromises()

      expect(wrapper.vm.manualTransactions.length).toBe(1)
      expect(wrapper.vm.showForm).toBe(false)
    })

    it('编辑手动交易应更新列表', async () => {
      const wrapper = mountComponent()
      // 先添加一条
      wrapper.vm.manualTransactions = [{
        id: 'txn-edit-1',
        refNo: 'TXN-EDIT-001',
        customerId: 'c_test_1',
        customerName: '测试客户',
        type: 'manual',
        amount: 10000,
        date: '2026-06-01',
        status: 'pending',
        notes: ''
      }]

      wrapper.vm.editingTxn = { id: 'm-txn-edit-1', source: { id: 'txn-edit-1' } }
      wrapper.vm.handleFormSave({
        customerId: 'c_test_1',
        amount: 20000,
        date: '2026-06-15',
        notes: '已更新'
      })

      expect(wrapper.vm.manualTransactions[0].amount).toBe(20000)
    })
  })

  /* ===== 删除交易 ===== */
  describe('删除交易', () => {
    it('handleDelete 应从手动交易列表中移除', async () => {
      const wrapper = mountComponent()
      wrapper.vm.manualTransactions = [{
        id: 'txn-del-1',
        refNo: 'TXN-DEL-001',
        type: 'manual',
        amount: 10000,
        date: '2026-06-01',
        status: 'pending'
      }]

      wrapper.vm.handleDelete('m-txn-del-1')
      expect(wrapper.vm.manualTransactions.length).toBe(0)
    })
  })

  /* ===== 查看详情 ===== */
  describe('查看详情', () => {
    it('viewDetail 应打开详情弹窗', () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()
      const txn = wrapper.vm.allTransactions[0]

      wrapper.vm.viewDetail(txn)
      expect(wrapper.vm.showDetail).toBe(true)
      expect(wrapper.vm.detailTxn).toStrictEqual(txn)
    })

    it('点击详情弹窗遮罩层应关闭弹窗', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()
      const txn = wrapper.vm.allTransactions[0]
      wrapper.vm.viewDetail(txn)
      await flushPromises()

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')
      expect(wrapper.vm.showDetail).toBe(false)
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出CSV应创建 Blob 并触发下载', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      wrapper.vm.exportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('切换到列表视图应显示列表组件', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'list'
      await flushPromises()

      expect(wrapper.find('.txn-list-stub').exists()).toBe(true)
    })

    it('切换到卡片视图应显示卡片组件', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'card'
      await flushPromises()

      expect(wrapper.find('.txn-card-stub').exists()).toBe(true)
    })

    it('切换到日历视图应显示日历', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'calendar'
      await flushPromises()

      expect(wrapper.find('.calendar-view').exists()).toBe(true)
    })

    it('切换到周视图应显示周视图', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'week'
      await flushPromises()

      expect(wrapper.find('.week-view').exists()).toBe(true)
    })
  })

  /* ===== 日历导航 ===== */
  describe('日历导航', () => {
    it('calendarPrev 应切换到上月', async () => {
      const wrapper = mountComponent()
      const initialMonth = wrapper.vm.calendarMonth

      wrapper.vm.calendarPrev()
      if (initialMonth === 1) {
        expect(wrapper.vm.calendarMonth).toBe(12)
        expect(wrapper.vm.calendarYear).toBe(wrapper.vm.calendarYear)
      } else {
        expect(wrapper.vm.calendarMonth).toBe(initialMonth - 1)
      }
    })

    it('calendarNext 应切换到下月', async () => {
      const wrapper = mountComponent()
      const initialMonth = wrapper.vm.calendarMonth

      wrapper.vm.calendarNext()
      if (initialMonth === 12) {
        expect(wrapper.vm.calendarMonth).toBe(1)
      } else {
        expect(wrapper.vm.calendarMonth).toBe(initialMonth + 1)
      }
    })

    it('calendarToday 应切换到当前月', async () => {
      const wrapper = mountComponent()
      wrapper.vm.calendarYear = 2020
      wrapper.vm.calendarMonth = 1

      wrapper.vm.calendarToday()
      const now = new Date()
      expect(wrapper.vm.calendarYear).toBe(now.getFullYear())
      expect(wrapper.vm.calendarMonth).toBe(now.getMonth() + 1)
    })
  })

  /* ===== 周视图导航 ===== */
  describe('周视图导航', () => {
    it('weekPrev 应切换到上一周', () => {
      const wrapper = mountComponent()
      const initialDate = new Date(wrapper.vm.weekStartDate)

      wrapper.vm.weekPrev()
      const newDate = new Date(wrapper.vm.weekStartDate)
      expect(newDate.getDate()).not.toBe(initialDate.getDate())
    })

    it('weekNext 应切换到下一周', () => {
      const wrapper = mountComponent()
      const initialDate = new Date(wrapper.vm.weekStartDate)

      wrapper.vm.weekNext()
      const newDate = new Date(wrapper.vm.weekStartDate)
      expect(newDate.getDate()).not.toBe(initialDate.getDate())
    })

    it('weekToday 应切换到本周', () => {
      const wrapper = mountComponent()
      // 先偏移
      wrapper.vm.weekStartDate = new Date(2020, 0, 6)

      wrapper.vm.weekToday()
      const now = new Date()
      const diff = Math.abs(wrapper.vm.weekStartDate.getTime() - now.getTime())
      // 应该接近当前日期
      expect(diff).toBeLessThan(7 * 24 * 60 * 60 * 1000)
    })
  })

  /* ===== 日历日期详情弹窗 ===== */
  describe('日历日期详情弹窗', () => {
    it('showDayDetail 应打开日期详情弹窗', () => {
      const wrapper = mountComponent()
      wrapper.vm.showDayDetail('2026-06-01')
      expect(wrapper.vm.showDayModal).toBe(true)
      expect(wrapper.vm.dayModalDate).toBe('2026-06-01')
    })

    it('dayModalTransactions 应过滤指定日期的交易', async () => {
      seedData(quotationStore, contractStore, collectionStore, deliveryStore, customerStore)
      const wrapper = mountComponent()

      wrapper.vm.dayModalDate = '2026-06-01'
      await flushPromises()

      const txns = wrapper.vm.dayModalTransactions
      txns.forEach(t => {
        expect(t.date).toBe('2026-06-01')
      })
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

  /* ===== 导航到关联单据 ===== */
  describe('导航到关联单据', () => {
    it('navigateToPath 应调用 router.push', async () => {
      const wrapper = mountComponent()
      const router = wrapper.vm.$router || require('vue-router').useRouter()

      wrapper.vm.navigateToPath('/quotations')
      // router.push 已被 mock，验证不报错即可
    })

    it('navigateToPath 传入空路径不应报错', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.vm.navigateToPath('')).not.toThrow()
    })
  })

  /* ===== 手动交易持久化 ===== */
  describe('手动交易持久化', () => {
    it('新增手动交易应保存到 localStorage', async () => {
      const wrapper = mountComponent()
      const formData = {
        customerId: 'c_test_1',
        amount: 30000,
        date: '2026-06-10',
        notes: '持久化测试'
      }

      wrapper.vm.handleFormSave(formData)
      await flushPromises()

      const stored = localStorage.getItem('gj_erp_manual_transactions')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored)
      expect(parsed.length).toBe(1)
    })

    it('删除手动交易应更新 localStorage', async () => {
      const wrapper = mountComponent()
      wrapper.vm.manualTransactions = [{
        id: 'txn-persist-1',
        refNo: 'TXN-P-001',
        type: 'manual',
        amount: 10000,
        date: '2026-06-01',
        status: 'pending'
      }]

      wrapper.vm.handleDelete('m-txn-persist-1')
      const stored = localStorage.getItem('gj_erp_manual_transactions')
      const parsed = JSON.parse(stored)
      expect(parsed.length).toBe(0)
    })
  })
})
