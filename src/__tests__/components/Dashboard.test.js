/**
 * Dashboard.vue 组件级测试
 * 覆盖：渲染、交互、日期选择器、待办管理、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { useTodoStore } from '@/stores/todo'
import { useDataStore } from '@/stores/data'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import Dashboard from '@/views/Dashboard.vue'

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

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStub = { template: '<div class="child-stub"></div>' }

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Dashboard, {
    global: {
      stubs: {
        Icon: IconStub,
        DashStatsCards: ChildStub,
        DashWeekView: ChildStub,
        DashCharts: ChildStub,
        DashAlerts: ChildStub,
        DashQuickActions: ChildStub
      },
      mocks: {
        $router: { push: vi.fn() }
      }
    }
  })
}

describe('Dashboard 组件', () => {
  let todoStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    todoStore = useTodoStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('挂载后应显示加载骨架屏然后切换到内容', async () => {
      const wrapper = mountComponent()
      // 初始应为加载状态
      expect(wrapper.vm.isLoading).toBe(true)
      expect(wrapper.find('.skeleton-wrapper').exists()).toBe(true)

      await flushPromises()

      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.find('.page-header-title').exists()).toBe(true)
    })

    it('应渲染页面标题"仪表盘"', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.page-header-title').text()).toBe('仪表盘')
    })

    it('应渲染副标题', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.page-header-subtitle').text()).toContain('实时业务概览')
    })

    it('应渲染数据范围按钮组', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const buttons = wrapper.findAll('.btn-group .btn')
      expect(buttons.length).toBe(3)
    })

    it('应渲染紧凑指标条', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.compact-metrics').exists()).toBe(true)
    })

    it('应渲染日期选择器容器', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.date-picker-container').exists()).toBe(true)
    })

    it('应渲染待办面板', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.todo-panel-wrapper').exists()).toBe(true)
    })
  })

  /* ===== 数据范围切换 ===== */
  describe('数据范围切换', () => {
    it('点击"本月"按钮应设置 selectedRange 为 month', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.btn-group .btn')
      await buttons[0].trigger('click')
      expect(wrapper.vm.selectedRange).toBe('month')
    })

    it('点击"本季"按钮应设置 selectedRange 为 quarter', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.btn-group .btn')
      await buttons[1].trigger('click')
      expect(wrapper.vm.selectedRange).toBe('quarter')
    })

    it('点击"本年"按钮应设置 selectedRange 为 year', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.btn-group .btn')
      await buttons[2].trigger('click')
      expect(wrapper.vm.selectedRange).toBe('year')
    })
  })

  /* ===== 统计概览折叠 ===== */
  describe('统计概览折叠', () => {
    it('点击折叠标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.showDashStatsExpanded).toBe(false)
      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showDashStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showDashStatsExpanded).toBe(false)
    })
  })

  /* ===== 日期选择器 ===== */
  describe('日期选择器', () => {
    it('应渲染年份和月份选择器', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.dp-year-select').exists()).toBe(true)
      expect(wrapper.find('.dp-month-select').exists()).toBe(true)
    })

    it('应渲染日历天数', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const days = wrapper.findAll('.dp-day')
      expect(days.length).toBe(42) // 6行7列
    })

    it('点击日期应更新选中日期', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const days = wrapper.findAll('.dp-day')
      // 找到一个当月日期
      const currentMonthDay = days.find(d => d.classes().includes('currentMonth') || !d.classes().includes('other-month'))
      if (currentMonthDay) {
        await currentMonthDay.trigger('click')
        expect(wrapper.vm.dpSelectedDate).toBeTruthy()
      }
    })

    it('点击"今天"按钮应重置日期', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.dpGoToday()
      const today = new Date().toISOString().slice(0, 10)
      expect(wrapper.vm.dpSelectedDate).toBe(today)
    })

    it('手动输入日期并应用应更新日期选择器', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.dpManualDate = '2025-06-15'
      await wrapper.vm.dpApplyManual()
      await flushPromises()

      expect(wrapper.vm.dpSelectedDate).toBe('2025-06-15')
      expect(wrapper.vm.dpYear).toBe(2025)
      expect(wrapper.vm.dpMonth).toBe(6)
    })

    it('月份导航应正确切换', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const initialMonth = wrapper.vm.dpMonth
      await wrapper.vm.dpPrevMonth()
      expect(wrapper.vm.dpMonth).not.toBe(initialMonth)

      await wrapper.vm.dpNextMonth()
      expect(wrapper.vm.dpMonth).toBe(initialMonth)
    })

    it('年份导航应正确切换', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const initialYear = wrapper.vm.dpYear
      await wrapper.vm.dpPrevYear()
      expect(wrapper.vm.dpYear).toBe(initialYear - 1)

      await wrapper.vm.dpNextYear()
      expect(wrapper.vm.dpYear).toBe(initialYear)
    })
  })

  /* ===== 待办管理 ===== */
  describe('待办管理', () => {
    it('点击新建按钮应显示待办表单', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const addBtn = wrapper.findAll('button').find(b => b.text().includes('新建'))
      if (addBtn) {
        await addBtn.trigger('click')
        expect(wrapper.vm.showTodoForm).toBe(true)
        expect(wrapper.find('.todo-add-form').exists()).toBe(true)
      }
    })

    it('添加待办应调用 todoStore.addTodo', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const addSpy = vi.spyOn(todoStore, 'addTodo')
      wrapper.vm.newTodoTitle = '测试待办事项'
      wrapper.vm.newTodoPriority = 'high'
      wrapper.vm.newTodoDue = '2025-12-31'
      wrapper.vm.showTodoForm = true

      await wrapper.vm.addNewTodo()

      expect(addSpy).toHaveBeenCalledWith({
        title: '测试待办事项',
        priority: 'high',
        dueDate: '2025-12-31',
        status: 'pending'
      })
      expect(wrapper.vm.newTodoTitle).toBe('')
      expect(wrapper.vm.showTodoForm).toBe(false)

      addSpy.mockRestore()
    })

    it('空标题不应添加待办', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const addSpy = vi.spyOn(todoStore, 'addTodo')
      wrapper.vm.newTodoTitle = '   '
      await wrapper.vm.addNewTodo()

      expect(addSpy).not.toHaveBeenCalled()
      addSpy.mockRestore()
    })

    it('待办筛选应正确过滤', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      // 添加一些待办
      todoStore.addTodo({ title: '待办1', priority: 'high', dueDate: new Date().toISOString().slice(0, 10), status: 'pending' })
      todoStore.addTodo({ title: '待办2', priority: 'low', dueDate: new Date().toISOString().slice(0, 10), status: 'completed' })

      wrapper.vm.todoFilter = 'completed'
      await flushPromises()
      expect(wrapper.vm.filteredDpTodos.every(t => t.status === 'completed')).toBe(true)
    })

    it('优先级筛选应正确过滤', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      todoStore.addTodo({ title: '高优先级', priority: 'high', dueDate: new Date().toISOString().slice(0, 10), status: 'pending' })
      todoStore.addTodo({ title: '低优先级', priority: 'low', dueDate: new Date().toISOString().slice(0, 10), status: 'pending' })

      wrapper.vm.todoPriorityFilter = 'high'
      await flushPromises()
      expect(wrapper.vm.filteredDpTodos.every(t => t.priority === 'high')).toBe(true)
    })

    it('completeAllTodos 应完成所有待办', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      todoStore.addTodo({ title: '待办1', priority: 'medium', dueDate: new Date().toISOString().slice(0, 10), status: 'pending' })
      todoStore.addTodo({ title: '待办2', priority: 'low', dueDate: new Date().toISOString().slice(0, 10), status: 'pending' })

      const toggleSpy = vi.spyOn(todoStore, 'toggleTodo')
      await wrapper.vm.completeAllTodos()

      expect(toggleSpy).toHaveBeenCalled()
      toggleSpy.mockRestore()
    })

    it('clearCompletedTodos 应调用 todoStore.clearCompleted', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const clearSpy = vi.spyOn(todoStore, 'clearCompleted')
      await wrapper.vm.clearCompletedTodos()

      expect(clearSpy).toHaveBeenCalled()
      clearSpy.mockRestore()
    })
  })

  /* ===== 待办视图切换 ===== */
  describe('待办视图切换', () => {
    it('应支持列表视图', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.todoViewMode = 'list'
      await flushPromises()
      expect(wrapper.find('.todo-list').exists()).toBe(true)
    })

    it('应支持表格视图', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.todoViewMode = 'table'
      await flushPromises()
      expect(wrapper.find('.todo-table-view').exists()).toBe(true)
    })

    it('应支持卡片视图', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.todoViewMode = 'card'
      await flushPromises()
      expect(wrapper.find('.todo-card-view').exists()).toBe(true)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('collectionRate 无营收时应为 0', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.collectionRate).toBe(0)
    })

    it('todayTransactionAmount 初始应为 0', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.todayTransactionAmount).toBe(0)
    })

    it('statCards 应返回7个统计卡片', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.statCards.length).toBe(7)
    })

    it('aiSummary 应返回有效的摘要文本', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const summary = wrapper.vm.aiSummary
      // aiSummary returns either normal message or alert message
      expect(typeof summary).toBe('string')
      expect(summary.length).toBeGreaterThan(0)
      // It should contain either "正常" or "检测到"
      expect(summary.includes('正常') || summary.includes('检测到')).toBe(true)
    })

    it('smartInsights 应返回洞察列表', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const insights = wrapper.vm.smartInsights
      expect(insights.length).toBeGreaterThan(0)
      // Each insight should have level, text, icon, detail
      insights.forEach(i => {
        expect(i).toHaveProperty('level')
        expect(i).toHaveProperty('text')
      })
    })

    it('dpSelectedWeekday 应返回正确的星期', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const weekday = wrapper.vm.dpSelectedWeekday
      expect(weekday).toContain('星期')
    })

    it('dpSelectedTodoCount 应返回选中日期的待办数', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const today = new Date().toISOString().slice(0, 10)
      todoStore.addTodo({ title: '今日待办', priority: 'medium', dueDate: today, status: 'pending' })

      wrapper.vm.dpSelectedDate = today
      await flushPromises()
      expect(wrapper.vm.dpSelectedTodoCount).toBeGreaterThanOrEqual(1)
    })
  })

  /* ===== 刷新功能 ===== */
  describe('刷新功能', () => {
    it('refreshInsights 应设置 isRefreshingInsights 为 true', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.refreshInsights()
      expect(wrapper.vm.isRefreshingInsights).toBe(true)
    })

    it('refreshInsights 应在 800ms 后恢复 isRefreshingInsights', async () => {
      vi.useFakeTimers()
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.refreshInsights()
      expect(wrapper.vm.isRefreshingInsights).toBe(true)

      vi.advanceTimersByTime(800)
      expect(wrapper.vm.isRefreshingInsights).toBe(false)

      vi.useRealTimers()
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('卸载时应清除 insightsTimer', async () => {
      vi.useFakeTimers()
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.refreshInsights()
      wrapper.unmount()

      // 不应抛出错误
      vi.advanceTimersByTime(800)
      vi.useRealTimers()
    })
  })
})
