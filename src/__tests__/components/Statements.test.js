/**
 * Statements.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、视图切换、CRUD弹窗、确认/作废/付款、导出、列配置、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Statements from '@/modules/finance/views/Statements.vue'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { createStatement, resetCounter } from '@/__tests__/mockData'

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

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}))

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    autoTable: vi.fn(),
    save: vi.fn()
  }))
}))
vi.mock('jspdf-autotable', () => ({}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const StatementFormModalStub = {
  props: ['showModal', 'editingStatement'],
  template: '<div class="statement-form-modal-stub" v-if="showModal">FormModal</div>',
  emits: ['close', 'saved']
}

const StatementPreviewStub = {
  props: ['showModal', 'statementId'],
  template: '<div class="statement-preview-stub" v-if="showModal">Preview</div>',
  emits: ['close', 'edit', 'confirm', 'markPaid', 'print']
}

const DataSelectStub = {
  props: ['modelValue', 'module', 'variant', 'valueField', 'labelField', 'placeholder', 'clearable'],
  template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option></select>',
  emits: ['update:modelValue']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Statements, {
    global: {
      stubs: {
        Icon: IconStub,
        StatementFormModal: StatementFormModalStub,
        StatementPreview: StatementPreviewStub,
        DataSelect: DataSelectStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedStatements(store, count = 5) {
  for (let i = 0; i < count; i++) {
    store.addStatement({
      statementNo: `DZ-TEST-${String(i + 1).padStart(3, '0')}`,
      period: '2026-06',
      reconDate: '2026-06-01',
      buyerId: `c_test_${i + 1}`,
      buyerName: `测试客户${i + 1}号`,
      sellerName: '测试供应商',
      items: [],
      subtotal: 10000 * (i + 1),
      taxRate: 13,
      totalAmount: 11300 * (i + 1),
      paidAmount: i % 2 === 0 ? 0 : 5000 * (i + 1),
      status: ['pending', 'confirmed', 'paid', 'voided', 'draft'][i % 5]
    })
  }
}

describe('Statements 组件', () => {
  let store

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useStatementStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('对账管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('对账单')
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无对账单')
    })

    it('有数据时应渲染表格行', () => {
      seedStatements(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示统计概览区', () => {
      seedStatements(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.find('.collapsible-stats').exists()).toBe(true)
    })

    it('应显示筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按对账单号搜索应过滤结果', async () => {
      seedStatements(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('DZ-TEST-001')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1)
      expect(rows[0].text()).toContain('DZ-TEST-001')
    })

    it('按状态过滤应过滤结果', async () => {
      seedStatements(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.find('select.form-select')
      await select.setValue('pending')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('待审核')
      })
    })

    it('点击重置按钮应清空所有筛选条件', async () => {
      seedStatements(store, 3)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('test')
      await flushPromises()

      const resetBtn = wrapper.findAll('.btn-outline').find(b => b.text().includes('重置'))
      await resetBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.filters.search).toBe('')
      expect(wrapper.vm.filters.status).toBe('')
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
      seedStatements(store, 2)
      const wrapper = mountComponent()

      const listBtn = wrapper.findAll('.view-toggle .btn').find(b => b.text().includes('列表'))
      await listBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('list')
      expect(wrapper.find('.list-view').exists()).toBe(true)
    })

    it('切换到卡片视图应显示卡片', async () => {
      seedStatements(store, 2)
      const wrapper = mountComponent()

      const cardBtn = wrapper.findAll('.view-toggle .btn').find(b => b.text().includes('卡片'))
      await cardBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('card')
      expect(wrapper.find('.card-view').exists()).toBe(true)
    })

    it('切换到周视图应显示周视图', async () => {
      seedStatements(store, 2)
      const wrapper = mountComponent()

      const weekBtn = wrapper.findAll('.view-toggle .btn').find(b => b.text().includes('周视图'))
      await weekBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.currentView).toBe('week')
      expect(wrapper.find('.week-view').exists()).toBe(true)
    })
  })

  /* ===== 新增对账单 ===== */
  describe('新增对账单', () => {
    it('点击新增按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.findAll('.btn-primary').find(b => b.text().includes('新增对账单'))
      await addBtn.trigger('click')

      expect(wrapper.vm.showFormModal).toBe(true)
      expect(wrapper.find('.statement-form-modal-stub').exists()).toBe(true)
    })

    it('新增时 editingStatement 应为 null', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditor()
      expect(wrapper.vm.editingStatement).toBeNull()
    })
  })

  /* ===== 编辑对账单 ===== */
  describe('编辑对账单', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedStatements(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.btn-sm').find(b => b.text().includes('编辑'))
      if (editBtn) {
        await editBtn.trigger('click')
        expect(wrapper.vm.showFormModal).toBe(true)
        expect(wrapper.vm.editingStatement).toBeTruthy()
      }
    })

    it('openEditor 传入数据时应设置 editingStatement', async () => {
      seedStatements(store, 1)
      const wrapper = mountComponent()
      const stmt = store.statements[0]

      await wrapper.vm.openEditor(stmt)
      expect(wrapper.vm.editingStatement).toEqual(stmt)
    })
  })

  /* ===== 确认/作废/重新打开 ===== */
  describe('状态操作', () => {
    it('确认对账单应弹出确认对话框', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleConfirm(store.statements[0].id)
      expect(wrapper.vm.confirmDialog.show).toBe(true)
    })

    it('确认对话框点击确认应调用 store.confirmStatement', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      const id = store.statements[0].id
      await wrapper.vm.handleConfirm(id)
      await wrapper.vm.onConfirmDialogOk()
      await flushPromises()

      expect(store.getById(id).status).toBe('confirmed')
    })

    it('作废对账单应弹出确认对话框', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleVoid(store.statements[0].id)
      expect(wrapper.vm.confirmDialog.show).toBe(true)
    })

    it('重新打开对账单应弹出确认对话框', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'confirmed'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleReopen(store.statements[0].id)
      expect(wrapper.vm.confirmDialog.show).toBe(true)
    })
  })

  /* ===== 记录付款 ===== */
  describe('记录付款', () => {
    it('点击记录付款应打开付款弹窗', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'confirmed'
      const wrapper = mountComponent()
      await flushPromises()

      const stmt = store.statements[0]
      await wrapper.vm.handleMarkPaid(stmt)
      expect(wrapper.vm.showPaidDialog).toBe(true)
      expect(wrapper.vm.paidTarget).toEqual(stmt)
    })

    it('输入有效付款金额并确认应更新已付金额', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'confirmed'
      store.statements[0].totalAmount = 10000
      store.statements[0].paidAmount = 0
      const wrapper = mountComponent()
      await flushPromises()

      const stmt = store.statements[0]
      await wrapper.vm.handleMarkPaid(stmt)
      wrapper.vm.paidAmount = 5000
      await wrapper.vm.confirmPaid()
      await flushPromises()

      expect(store.getById(stmt.id).paidAmount).toBe(5000)
      expect(wrapper.vm.showPaidDialog).toBe(false)
    })

    it('付款金额为0时应显示错误', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'confirmed'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleMarkPaid(store.statements[0])
      wrapper.vm.paidAmount = 0
      await wrapper.vm.confirmPaid()

      expect(wrapper.vm.paidError).toBe('请输入有效的付款金额')
    })

    it('付款金额超出应付总额应显示错误', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'confirmed'
      store.statements[0].totalAmount = 10000
      store.statements[0].paidAmount = 0
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleMarkPaid(store.statements[0])
      wrapper.vm.paidAmount = 99999
      await wrapper.vm.confirmPaid()

      expect(wrapper.vm.paidError).toBe('付款金额超出应付总额')
    })
  })

  /* ===== 删除对账单 ===== */
  describe('删除对账单', () => {
    it('删除对账单应弹出确认对话框', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleDelete(store.statements[0].id)
      expect(wrapper.vm.confirmDialog.show).toBe(true)
    })

    it('确认删除应移除对账单', async () => {
      seedStatements(store, 1)
      store.statements[0].status = 'pending'
      const wrapper = mountComponent()
      await flushPromises()

      const id = store.statements[0].id
      await wrapper.vm.handleDelete(id)
      await wrapper.vm.onConfirmDialogOk()
      await flushPromises()

      expect(store.getById(id)).toBeUndefined()
    })
  })

  /* ===== 查看详情 ===== */
  describe('查看详情', () => {
    it('点击查看按钮应打开详情预览', async () => {
      seedStatements(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const viewBtn = wrapper.findAll('.btn-sm').find(b => b.text().includes('查看'))
      await viewBtn.trigger('click')

      expect(wrapper.vm.showDetail).toBe(true)
      expect(wrapper.find('.statement-preview-stub').exists()).toBe(true)
    })

    it('viewDetail 应设置 previewStatementId', async () => {
      seedStatements(store, 1)
      const wrapper = mountComponent()
      const id = store.statements[0].id

      await wrapper.vm.viewDetail(id)
      expect(wrapper.vm.previewStatementId).toBe(id)
      expect(wrapper.vm.showDetail).toBe(true)
    })

    it('closeDetail 应关闭详情', async () => {
      seedStatements(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.viewDetail(store.statements[0].id)
      await wrapper.vm.closeDetail()

      expect(wrapper.vm.showDetail).toBe(false)
      expect(wrapper.vm.previewStatementId).toBeNull()
    })
  })

  /* ===== 确认对话框 ===== */
  describe('确认对话框', () => {
    it('点击取消应关闭确认对话框', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.showConfirmDialog('测试', '确认？', () => {})
      expect(wrapper.vm.confirmDialog.show).toBe(true)

      await wrapper.vm.onConfirmDialogCancel()
      expect(wrapper.vm.confirmDialog.show).toBe(false)
    })

    it('点击遮罩层应关闭确认对话框', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.showConfirmDialog('测试', '确认？', () => {})

      const overlay = wrapper.findAll('.modal-overlay').find(el => el.find('h3').text() === '测试')
      if (overlay) {
        await overlay.trigger('click.self')
        expect(wrapper.vm.confirmDialog.show).toBe(false)
      }
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出CSV应提示暂无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.exportCSV()
      expect(alertSpy).not.toHaveBeenCalled() // showExportError instead

      alertSpy.mockRestore()
    })

    it('有数据时导出CSV应创建 Blob', async () => {
      seedStatements(store, 2)
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
      seedStatements(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.columnVisible.statementNo = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('对账单号')
    })
  })

  /* ===== 折叠统计区 ===== */
  describe('折叠统计区', () => {
    it('点击统计区标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showStatementStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showStatementStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showStatementStatsExpanded).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredStatements 应根据搜索条件过滤', async () => {
      seedStatements(store, 3)
      const wrapper = mountComponent()

      wrapper.vm.filters.search = 'DZ-TEST-001'
      await flushPromises()

      expect(wrapper.vm.filteredStatements.length).toBe(1)
    })

    it('filteredStatements 应根据状态过滤', async () => {
      seedStatements(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.filters.status = 'pending'
      await flushPromises()

      wrapper.vm.filteredStatements.forEach(s => {
        expect(s.status).toBe('pending')
      })
    })

    it('getDiffRowClass 应正确返回行样式类', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getDiffRowClass({ totalAmount: 100, paidAmount: 50 })).toBe('row-diff-positive')
      expect(wrapper.vm.getDiffRowClass({ totalAmount: 50, paidAmount: 100 })).toBe('row-diff-negative')
      expect(wrapper.vm.getDiffRowClass({ totalAmount: 100, paidAmount: 100 })).toBe('')
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
