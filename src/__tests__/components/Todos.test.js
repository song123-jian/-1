/**
 * Todos.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、CRUD弹窗、表单验证、批量操作、内联编辑、导出、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { useTodoStore } from '@/stores/todo'
import { useSessionStore } from '@/stores/session'
import Todos from '@/views/Todos.vue'

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
    roleName: '管理员',
    currentRole: '管理员'
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Todos, {
    global: {
      stubs: { Icon: IconStub },
      plugins: [],
      // Teleport 需要 attachTo 才能在 body 上渲染
      attachTo: document.body
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedTodos(store, count = 5) {
  const priorities = ['high', 'medium', 'low']
  const tags = ['工作', '学习', '生活', '']
  for (let i = 0; i < count; i++) {
    store.addTodo({
      title: `测试待办${i + 1}`,
      notes: `测试描述${i + 1}`,
      priority: priorities[i % priorities.length],
      status: i < count - 1 ? 'pending' : 'completed',
      dueDate: i % 2 === 0 ? '2026-06-30' : '2026-07-15',
      startDate: '2026-06-01',
      tag: tags[i % tags.length],
      reminder: '不提醒',
      repeat: 'none',
      progress: i < count - 1 ? 0 : 100,
      remark: '',
      subtasks: []
    })
  }
}

describe('Todos 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useTodoStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('待办事项管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('全面的任务管理系统')
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      expect(viewBtns.length).toBe(5) // 表格、列表、卡片、日历、周视图
    })

    it('应渲染搜索框', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })

    it('应渲染筛选下拉框', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('.filter-select')
      expect(selects.length).toBe(4) // 状态、优先级、标签、排序
    })

    it('应渲染统计栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.todo-stats-bar').exists()).toBe(true)
    })

    it('应渲染新建任务按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.btn-primary').text()).toContain('新建任务')
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无匹配的待办事项')
    })

    it('有数据时应渲染表格行', () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('.todo-table tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应渲染完成率进度环', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.stats-ring-svg').exists()).toBe(true)
    })

    it('应渲染统计数字', () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.stat-num').text()).toBeTruthy()
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按标题搜索应过滤结果', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('测试待办1')
      await flushPromises()

      const rows = wrapper.findAll('.todo-table tbody tr')
      expect(rows.length).toBeGreaterThan(0)
      rows.forEach(row => {
        expect(row.text()).toContain('测试待办1')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-select')
      await selects[0].setValue('completed') // 状态筛选
      await flushPromises()

      const rows = wrapper.findAll('.todo-table tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('已完成')
      })
    })

    it('按优先级过滤应过滤结果', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-select')
      await selects[1].setValue('high') // 优先级筛选
      await flushPromises()

      const rows = wrapper.findAll('.todo-table tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('高')
      })
    })

    it('按标签过滤应过滤结果', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('.filter-select')
      await selects[2].setValue('工作') // 标签筛选
      await flushPromises()

      const rows = wrapper.findAll('.todo-table tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('工作')
      })
    })

    it('切换排序方向应生效', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      expect(wrapper.vm.sortDir).toBe('asc')
      const sortBtn = wrapper.findAll('.todo-filters .btn-ghost')
      await sortBtn[sortBtn.length - 1].trigger('click')
      expect(wrapper.vm.sortDir).toBe('desc')
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('默认应为表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentView).toBe('table')
    })

    it('切换到列表视图应显示列表内容', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[1].trigger('click') // 列表视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('list')
      expect(wrapper.find('.list-row').exists()).toBe(true)
    })

    it('切换到卡片视图应显示卡片内容', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[2].trigger('click') // 卡片视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('card')
      expect(wrapper.find('.todo-card').exists()).toBe(true)
    })

    it('切换到日历视图应显示日历', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[3].trigger('click') // 日历视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('calendar')
      expect(wrapper.find('.todo-calendar-view').exists()).toBe(true)
    })

    it('切换到周视图应显示周视图', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-btn')
      await viewBtns[4].trigger('click') // 周视图
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('week')
      expect(wrapper.find('.todo-week-view').exists()).toBe(true)
    })
  })

  /* ===== 新增待办 ===== */
  describe('新增待办', () => {
    it('点击新建任务按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showModal).toBe(true)
    })

    it('新建弹窗应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      expect(wrapper.vm.form.priority).toBe('medium')
      expect(wrapper.vm.form.status).toBe('pending')
      expect(wrapper.vm.form.reminder).toBe('不提醒')
      expect(wrapper.vm.form.repeat).toBe('none')
      expect(wrapper.vm.form.progress).toBe(0)
      expect(wrapper.vm.editingTodo).toBeNull()
    })

    it('标题为空时提交不应创建待办', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.title = ''

      const initialCount = store.allTodos.length
      await wrapper.vm.saveTodo()

      expect(store.allTodos.length).toBe(initialCount)
    })

    it('填写完整信息后提交应新增待办', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.form.title = '新测试待办'
      wrapper.vm.form.priority = 'high'
      wrapper.vm.form.dueDate = '2026-06-30'

      const initialCount = store.allTodos.length
      await wrapper.vm.saveTodo()

      expect(store.allTodos.length).toBe(initialCount + 1)
      expect(wrapper.vm.showModal).toBe(false)
    })
  })

  /* ===== 编辑待办 ===== */
  describe('编辑待办', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedTodos(store, 1)
      const t = store.allTodos[0]
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.action-btn-sm')[0] // 编辑按钮
      await editBtn.trigger('click')

      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.editingTodo).toBeTruthy()
    })

    it('编辑提交应更新待办数据', async () => {
      seedTodos(store, 1)
      const t = store.allTodos[0]
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.openEditModal(t)
      wrapper.vm.form.title = '更新后的标题'
      await wrapper.vm.saveTodo()

      expect(store.allTodos[0].title).toBe('更新后的标题')
    })

    it('自动生成的待办不应打开编辑弹窗', async () => {
      seedTodos(store, 1)
      const autoTodo = store.allTodos[0]
      autoTodo.auto = true
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.openEditModal(autoTodo)

      expect(wrapper.vm.showModal).toBe(false)
    })
  })

  /* ===== 完成与恢复 ===== */
  describe('完成与恢复', () => {
    it('点击完成按钮应切换待办状态', async () => {
      seedTodos(store, 2)
      const wrapper = mountComponent()
      await flushPromises()

      const toggleBtn = wrapper.findAll('.action-btn-sm')[1] // 完成/恢复按钮
      await toggleBtn.trigger('click')

      expect(store.allTodos[0].status).toBe('completed')
    })

    it('点击全部完成应完成所有待办', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const completeAllSpy = vi.spyOn(store, 'completeAll')
      await wrapper.find('.stat-actions .btn-ghost').trigger('click')

      expect(completeAllSpy).toHaveBeenCalled()
      completeAllSpy.mockRestore()
    })
  })

  /* ===== 删除待办 ===== */
  describe('删除待办', () => {
    it('点击删除按钮应弹出确认对话框', async () => {
      seedTodos(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btn-sm')[2] // 删除按钮
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showConfirm).toBe(true)
    })

    it('确认删除应移除待办', async () => {
      seedTodos(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const todoId = store.allTodos[0].id
      await wrapper.vm.handleDelete(store.allTodos[0])
      await wrapper.vm.confirmAction()

      expect(store.allTodos.find(t => t.id === todoId)).toBeUndefined()
    })

    it('清除已完成应弹出确认对话框', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const clearBtn = wrapper.findAll('.stat-actions .btn-ghost')[1]
      await clearBtn.trigger('click')

      expect(wrapper.vm.showConfirm).toBe(true)
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('选中待办后应显示批量操作栏', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.selectedIds = [store.allTodos[0].id]
      await flushPromises()

      expect(wrapper.find('.batch-bar').exists()).toBe(true)
    })

    it('批量完成应完成选中待办', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      const ids = [store.allTodos[0].id, store.allTodos[1].id]
      wrapper.vm.selectedIds = ids
      const batchCompleteSpy = vi.spyOn(store, 'batchComplete')

      await wrapper.vm.handleBatchComplete()

      expect(batchCompleteSpy).toHaveBeenCalledWith(ids)
      batchCompleteSpy.mockRestore()
    })

    it('批量删除应弹出确认对话框', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.selectedIds = [store.allTodos[0].id]
      await wrapper.vm.handleBatchDelete()

      expect(wrapper.vm.showConfirm).toBe(true)
    })

    it('全选应选中所有待办', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      await wrapper.vm.toggleSelectAll()

      expect(wrapper.vm.selectedIds.length).toBe(wrapper.vm.filteredTodos.length)
    })

    it('取消全选应清空选中', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.selectedIds = store.allTodos.map(t => t.id)
      await wrapper.vm.toggleSelectAll()

      expect(wrapper.vm.selectedIds.length).toBe(0)
    })
  })

  /* ===== 内联编辑 ===== */
  describe('内联编辑', () => {
    it('双击标题应进入内联编辑模式', async () => {
      seedTodos(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const titleCell = wrapper.find('td.col-title')
      await titleCell.trigger('dblclick')

      expect(wrapper.vm.inlineEdit.id).toBe(store.allTodos[0].id)
      expect(wrapper.vm.inlineEdit.field).toBe('title')
    })

    it('确认内联编辑应更新数据', async () => {
      seedTodos(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const t = store.allTodos[0]
      wrapper.vm.inlineEdit = { id: t.id, field: 'title', value: '新标题' }
      await wrapper.vm.confirmInlineEdit(t)

      expect(store.allTodos[0].title).toBe('新标题')
    })

    it('标题为空时确认内联编辑应取消', async () => {
      seedTodos(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const t = store.allTodos[0]
      const originalTitle = t.title
      wrapper.vm.inlineEdit = { id: t.id, field: 'title', value: '' }
      await wrapper.vm.confirmInlineEdit(t)

      expect(store.allTodos[0].title).toBe(originalTitle)
    })
  })

  /* ===== 子任务 ===== */
  describe('子任务', () => {
    it('添加子任务应增加一行', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.newSubtaskTitle = '新子任务'

      await wrapper.vm.addSubtask()

      expect(wrapper.vm.form.subtasks.length).toBe(1)
      expect(wrapper.vm.form.subtasks[0].title).toBe('新子任务')
    })

    it('空标题不应添加子任务', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.newSubtaskTitle = '  '

      await wrapper.vm.addSubtask()

      expect(wrapper.vm.form.subtasks.length).toBe(0)
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showModal).toBe(true)

      await wrapper.vm.closeModal()
      expect(wrapper.vm.showModal).toBe(false)
      expect(wrapper.vm.editingTodo).toBeNull()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应创建空数组JSON', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.handleExport()

      expect(createObjectURLSpy).toHaveBeenCalled()
      createObjectURLSpy.mockRestore()
    })

    it('有数据时导出应创建 Blob 并触发下载', async () => {
      seedTodos(store, 2)
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

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('completionPercent 应正确计算完成率', async () => {
      seedTodos(store, 4)
      // 1个已完成 (seedTodos 最后一个为 completed)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.completionPercent).toBe(25)
    })

    it('无待办时完成率应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.completionPercent).toBe(0)
    })

    it('completionColor 应根据完成率返回正确颜色', async () => {
      seedTodos(store, 5)
      // 1个已完成 = 20%
      const wrapper = mountComponent()
      await flushPromises()

      // 20% < 50 应为 danger
      expect(wrapper.vm.completionColor).toBe('var(--color-danger)')
    })

    it('isAllSelected 应正确判断全选状态', async () => {
      seedTodos(store, 3)
      const wrapper = mountComponent()

      expect(wrapper.vm.isAllSelected).toBe(false)

      wrapper.vm.selectedIds = store.allTodos.map(t => t.id)
      await flushPromises()

      expect(wrapper.vm.isAllSelected).toBe(true)
    })

    it('filteredTodos 应正确过滤和排序', async () => {
      seedTodos(store, 5)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredTodos.length).toBe(5)

      wrapper.vm.searchText = '测试待办1'
      await flushPromises()

      expect(wrapper.vm.filteredTodos.length).toBe(1)
    })
  })

  /* ===== 日历导航 ===== */
  describe('日历导航', () => {
    it('calPrev 应减少月份', async () => {
      const wrapper = mountComponent()
      const initialMonth = wrapper.vm.calMonth

      await wrapper.vm.calPrev()

      expect(wrapper.vm.calMonth).toBe(initialMonth === 0 ? 11 : initialMonth - 1)
    })

    it('calNext 应增加月份', async () => {
      const wrapper = mountComponent()
      const initialMonth = wrapper.vm.calMonth

      await wrapper.vm.calNext()

      expect(wrapper.vm.calMonth).toBe(initialMonth === 11 ? 0 : initialMonth + 1)
    })

    it('calToday 应回到当前月', async () => {
      const wrapper = mountComponent()
      wrapper.vm.calYear = 2020
      wrapper.vm.calMonth = 0

      await wrapper.vm.calToday()

      const now = new Date()
      expect(wrapper.vm.calYear).toBe(now.getFullYear())
      expect(wrapper.vm.calMonth).toBe(now.getMonth())
    })
  })

  /* ===== 周视图导航 ===== */
  describe('周视图导航', () => {
    it('weekPrev 应回退一周', async () => {
      const wrapper = mountComponent()
      const initialStart = new Date(wrapper.vm.weekStart)

      await wrapper.vm.weekPrev()

      const newStart = new Date(wrapper.vm.weekStart)
      expect(newStart.getDate()).toBeLessThanOrEqual(initialStart.getDate())
    })

    it('weekNext 应前进一周', async () => {
      const wrapper = mountComponent()
      const initialStart = new Date(wrapper.vm.weekStart)

      await wrapper.vm.weekNext()

      const newStart = new Date(wrapper.vm.weekStart)
      expect(newStart.getDate()).toBeGreaterThanOrEqual(initialStart.getDate())
    })

    it('weekToday 应回到本周', async () => {
      const wrapper = mountComponent()

      await wrapper.vm.weekToday()

      const now = new Date()
      const day = now.getDay()
      const diff = (day + 6) % 7
      const expected = new Date(now)
      expected.setDate(now.getDate() - diff)
      expected.setHours(0, 0, 0, 0)

      expect(new Date(wrapper.vm.weekStart).toDateString()).toBe(expected.toDateString())
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
      seedTodos(store, 2)
      const wrapper = mountComponent()

      // 默认显示描述列
      expect(wrapper.findAll('th').some(th => th.text().includes('描述'))).toBe(true)

      wrapper.vm.columnVisible.desc = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('描述')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应注册全局事件监听', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      const winAddSpy = vi.spyOn(window, 'addEventListener')
      mountComponent()
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(winAddSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      addSpy.mockRestore()
      winAddSpy.mockRestore()
    })

    it('卸载时应移除全局事件监听', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const winRemoveSpy = vi.spyOn(window, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(winRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      removeSpy.mockRestore()
      winRemoveSpy.mockRestore()
    })
  })
})
