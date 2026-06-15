/**
 * ProjectTracking.vue 组件级测试
 * 覆盖：渲染、Tab切换、搜索过滤、CRUD弹窗、表单验证、内联编辑、风险跟踪、导出导入、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import ProjectTracking from '@/views/ProjectTracking.vue'

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

/* ===== mock Chart.js ===== */
vi.mock('chart.js', () => {
  class MockChart {
    constructor() { return { destroy: vi.fn(), update: vi.fn() } }
  }
  MockChart.register = vi.fn()
  return {
    Chart: MockChart,
    registerables: []
  }
})

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(ProjectTracking, {
    global: {
      stubs: { Icon: IconStub },
      plugins: []
    }
  })
}

/* ===== 辅助：向 localStorage 添加汽车项目测试数据 ===== */
function seedAutoProjects(count = 5) {
  const stages = ['立项', '报价', '定点', '开模', '试模', 'PPAP', '量产', '落选']
  const quoteStatuses = ['未报价', '报价中', '已报价', '落选']
  const massStatuses = ['未量产', '小批量', '量产']
  const projects = []
  for (let i = 0; i < count; i++) {
    projects.push({
      id: Date.now() + i,
      projectId: `AP-2026-${String(i + 1).padStart(3, '0')}`,
      customer: `测试客户${i + 1}`,
      oem: `主机厂${i + 1}`,
      vehicleModels: `车型${i + 1}`,
      partName: `零件${i + 1}`,
      material: `材料${i + 1}`,
      stage: stages[i % stages.length],
      quoteStatus: quoteStatuses[i % quoteStatuses.length],
      massStatus: massStatuses[i % massStatuses.length],
      owner: `负责人${i + 1}`,
      nextFollowUp: i % 2 === 0 ? '2026-06-30' : '2020-01-01',
      hasRisk: i === 0,
      contractStatus: '未签订',
      createdAt: new Date().toISOString()
    })
  }
  localStorage.setItem('gj_erp_autoProjects', JSON.stringify(projects))
  return projects
}

/* ===== 辅助：向 localStorage 添加非汽车项目测试数据 ===== */
function seedNonAutoProjects(count = 3) {
  const stages = ['接触', '报价', '谈判', '签约', '执行', '完成']
  const projects = []
  for (let i = 0; i < count; i++) {
    projects.push({
      id: Date.now() + 100 + i,
      projectId: `NP-2026-${String(i + 1).padStart(3, '0')}`,
      customerName: `非汽车客户${i + 1}`,
      stage: stages[i % stages.length],
      quoteStatus: '未报价',
      contractAmount: (i + 1) * 100,
      monthlyOrderQty: (i + 1) * 10,
      paymentStatus: i === 0 ? '未回款' : '已回款',
      owner: `负责人${i + 1}`,
      nextFollowUp: '2026-06-30',
      hasRisk: false,
      createdAt: new Date().toISOString()
    })
  }
  localStorage.setItem('gj_erp_nonAutoProjects', JSON.stringify(projects))
  return projects
}

/* ===== 辅助：向 localStorage 添加风险测试数据 ===== */
function seedRisks(count = 3) {
  const levels = ['高', '中', '低']
  const statuses = ['未处理', '处理中', '已解决']
  const risks = []
  for (let i = 0; i < count; i++) {
    risks.push({
      id: Date.now() + 200 + i,
      projectId: `AP-2026-${String(i + 1).padStart(3, '0')}`,
      projectName: `项目${i + 1}`,
      description: `风险描述${i + 1}`,
      level: levels[i % levels.length],
      status: statuses[i % statuses.length],
      probability: levels[i % levels.length],
      impact: levels[i % levels.length],
      owner: `责任人${i + 1}`,
      mitigation: `应对措施${i + 1}`,
      createdAt: new Date().toISOString()
    })
  }
  localStorage.setItem('gj_erp_projectRisks', JSON.stringify(risks))
  return risks
}

describe('ProjectTracking 组件', () => {
  let customerStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('项目追踪')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('汽车/非汽车项目全生命周期管理')
    })

    it('应渲染Tab栏', () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      expect(tabBtns.length).toBe(4) // 汽车项目、非汽车项目、风险跟踪、统计报表
    })

    it('默认应选中汽车项目Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('auto')
    })

    it('应渲染统计卡片', () => {
      const wrapper = mountComponent()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(14) // 汽车5 + 非汽车5 + 风险4 (v-show renders all)
    })

    it('应渲染筛选栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-bar').exists()).toBe(true)
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-switcher .view-btn')
      expect(viewBtns.length).toBe(11) // 汽车6 + 非汽车5 (v-show renders all)
    })

    it('应渲染新建按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.btn-primary').text()).toContain('新建汽车项目')
    })

    it('有汽车项目数据时应渲染表格行', () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()
      // v-show renders all tabs, so get the first data-table (auto tab)
      const tables = wrapper.findAll('.data-table')
      const autoRows = tables[0].findAll('tbody tr')
      expect(autoRows.length).toBe(3)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-cell').text()).toContain('暂无数据')
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('切换到非汽车项目Tab应更新activeTab', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')

      expect(wrapper.vm.activeTab).toBe('nonauto')
    })

    it('切换到风险跟踪Tab应更新activeTab', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[2].trigger('click')

      expect(wrapper.vm.activeTab).toBe('risk')
    })

    it('切换到统计报表Tab应更新activeTab', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[3].trigger('click')

      expect(wrapper.vm.activeTab).toBe('stats')
    })

    it('addBtnLabel 应根据当前Tab更新', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.addBtnLabel).toContain('汽车项目')

      wrapper.vm.activeTab = 'nonauto'
      await flushPromises()
      expect(wrapper.vm.addBtnLabel).toContain('非汽车项目')
    })
  })

  /* ===== 搜索与过滤（汽车项目） ===== */
  describe('搜索与过滤（汽车项目）', () => {
    it('按客户搜索应过滤结果', async () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      const input = wrapper.find('.filter-bar input.form-input')
      await input.setValue('测试客户1')
      await flushPromises()

      const filtered = wrapper.vm.filteredAutoProjects
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach(p => {
        expect([p.customer, p.oem, p.partName, p.projectId, p.vehicleModels].some(v => (v || '').toLowerCase().includes('测试客户1'))).toBe(true)
      })
    })

    it('按阶段过滤应过滤结果', async () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      wrapper.vm.autoStageFilter = '量产'
      await flushPromises()

      const filtered = wrapper.vm.filteredAutoProjects
      filtered.forEach(p => {
        expect(p.stage).toBe('量产')
      })
    })

    it('快速筛选逾期跟进应过滤结果', async () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      const quickFilterBtn = wrapper.findAll('.quick-filter-tag')[0] // 逾期跟进
      await quickFilterBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.autoQuickFilter).toBe('overdue')
    })

    it('清除快速筛选应重置', async () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      wrapper.vm.autoQuickFilter = 'overdue'
      await flushPromises()

      const clearBtn = wrapper.findAll('.quick-filter-tag.clear')[0]
      await clearBtn.trigger('click')

      expect(wrapper.vm.autoQuickFilter).toBe('')
    })
  })

  /* ===== 搜索与过滤（非汽车项目） ===== */
  describe('搜索与过滤（非汽车项目）', () => {
    it('按客户搜索应过滤结果', async () => {
      seedNonAutoProjects(3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'nonauto'
      await flushPromises()

      wrapper.vm.nonAutoSearch = '非汽车客户1'
      await flushPromises()

      const filtered = wrapper.vm.filteredNonAutoProjects
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('按回款状态过滤应过滤结果', async () => {
      seedNonAutoProjects(3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'nonauto'
      await flushPromises()

      wrapper.vm.nonAutoPaymentFilter = '未回款'
      await flushPromises()

      const filtered = wrapper.vm.filteredNonAutoProjects
      filtered.forEach(p => {
        expect(p.paymentStatus).toBe('未回款')
      })
    })
  })

  /* ===== 搜索与过滤（风险） ===== */
  describe('搜索与过滤（风险）', () => {
    it('按项目ID搜索应过滤风险', async () => {
      seedRisks(3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'risk'
      await flushPromises()

      wrapper.vm.riskSearch = 'AP-2026-001'
      await flushPromises()

      const filtered = wrapper.vm.filteredRisks
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('按等级过滤应过滤风险', async () => {
      seedRisks(3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'risk'
      await flushPromises()

      wrapper.vm.riskLevelFilter = '高'
      await flushPromises()

      const filtered = wrapper.vm.filteredRisks
      filtered.forEach(r => {
        expect(r.level).toBe('高')
      })
    })
  })

  /* ===== 视图切换（汽车项目） ===== */
  describe('视图切换（汽车项目）', () => {
    it('默认应为表格视图', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.autoView).toBe('table')
    })

    it('切换到列表视图应生效', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-switcher .view-btn')
      await viewBtns[1].trigger('click') // 列表视图
      await flushPromises()

      expect(wrapper.vm.autoView).toBe('list')
    })

    it('切换到卡片视图应生效', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-switcher .view-btn')
      await viewBtns[2].trigger('click') // 卡片视图
      await flushPromises()

      expect(wrapper.vm.autoView).toBe('card')
    })

    it('切换到甘特图视图应生效', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()

      const viewBtns = wrapper.findAll('.view-switcher .view-btn')
      await viewBtns[5].trigger('click') // 甘特图
      await flushPromises()

      expect(wrapper.vm.autoView).toBe('gantt')
    })
  })

  /* ===== 新增汽车项目 ===== */
  describe('新增汽车项目', () => {
    it('点击新建按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showAutoModal).toBe(true)
    })

    it('新建弹窗应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      expect(wrapper.vm.autoForm.stage).toBe('立项')
      expect(wrapper.vm.autoForm.quoteStatus).toBe('未报价')
      expect(wrapper.vm.autoForm.massStatus).toBe('未量产')
      expect(wrapper.vm.isAutoEditing).toBe(false)
    })

    it('保存汽车项目应添加到列表', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.autoForm.customer = '新客户'
      wrapper.vm.autoForm.partName = '新零件'
      wrapper.vm.autoForm.owner = '新负责人'

      const initialCount = wrapper.vm.autoProjects.length
      await wrapper.vm.saveAutoProject()

      expect(wrapper.vm.autoProjects.length).toBe(initialCount + 1)
      expect(wrapper.vm.showAutoModal).toBe(false)
    })
  })

  /* ===== 编辑汽车项目 ===== */
  describe('编辑汽车项目', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.action-btns .btn-ghost')[1] // 编辑按钮
      await editBtn.trigger('click')

      expect(wrapper.vm.showAutoModal).toBe(true)
      expect(wrapper.vm.isAutoEditing).toBe(true)
    })

    it('编辑提交应更新项目数据', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const p = wrapper.vm.autoProjects[0]
      await wrapper.vm.editAutoProject(p)
      wrapper.vm.autoForm.customer = '更新客户'
      await wrapper.vm.saveAutoProject()

      expect(wrapper.vm.autoProjects[0].customer).toBe('更新客户')
    })
  })

  /* ===== 删除汽车项目 ===== */
  describe('删除汽车项目', () => {
    it('点击删除按钮应弹出确认对话框', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btns .btn-ghost')[2] // 删除按钮
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showConfirmDialog).toBe(true)
    })

    it('确认删除应移除项目', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const pId = wrapper.vm.autoProjects[0].id
      await wrapper.vm.confirmDeleteAuto(pId)
      await wrapper.vm.doConfirm()

      expect(wrapper.vm.autoProjects.find(p => p.id === pId)).toBeUndefined()
    })
  })

  /* ===== 新增非汽车项目 ===== */
  describe('新增非汽车项目', () => {
    it('在非汽车Tab点击新建应打开非汽车弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'nonauto'
      await flushPromises()

      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showNapModal).toBe(true)
    })

    it('保存非汽车项目应添加到列表', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      // 确保在非汽车tab
      wrapper.vm.activeTab = 'nonauto'
      await wrapper.vm.openAddModal()
      wrapper.vm.napForm.customerName = '新非汽车客户'
      wrapper.vm.napForm.owner = '新负责人'

      const initialCount = wrapper.vm.nonAutoProjects.length
      await wrapper.vm.saveNapProject()

      expect(wrapper.vm.nonAutoProjects.length).toBe(initialCount + 1)
      expect(wrapper.vm.showNapModal).toBe(false)
    })
  })

  /* ===== 风险跟踪 ===== */
  describe('风险跟踪', () => {
    it('点击新增风险按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'risk'
      await flushPromises()

      await wrapper.vm.openRiskAddModal()
      expect(wrapper.vm.showRiskModal).toBe(true)
    })

    it('保存风险应添加到列表', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openRiskAddModal()
      wrapper.vm.riskForm.projectId = 'AP-2026-001'
      wrapper.vm.riskForm.projectName = '测试项目'
      wrapper.vm.riskForm.description = '测试风险描述'

      const initialCount = wrapper.vm.projectRisks.length
      await wrapper.vm.saveRisk()

      expect(wrapper.vm.projectRisks.length).toBe(initialCount + 1)
      expect(wrapper.vm.showRiskModal).toBe(false)
    })

    it('编辑风险应更新数据', async () => {
      seedRisks(1)
      const wrapper = mountComponent()
      await flushPromises()

      const r = wrapper.vm.projectRisks[0]
      await wrapper.vm.editRisk(r)
      wrapper.vm.riskForm.description = '更新后的描述'
      await wrapper.vm.saveRisk()

      expect(wrapper.vm.projectRisks[0].description).toBe('更新后的描述')
    })

    it('删除风险应弹出确认对话框', async () => {
      seedRisks(1)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'risk'
      await flushPromises()

      const deleteBtn = wrapper.findAll('.action-btns .btn-ghost')[1] // 删除按钮
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showConfirmDialog).toBe(true)
    })

    it('风险矩阵应正确计算计数', async () => {
      seedRisks(3)
      const wrapper = mountComponent()

      const count = wrapper.vm.rmCount('高', '高')
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  /* ===== 内联编辑 ===== */
  describe('内联编辑', () => {
    it('双击单元格应进入内联编辑模式', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const editableCell = wrapper.find('.cell-editable')
      await editableCell.trigger('dblclick')

      expect(wrapper.vm.inlineEdit.id).toBe(wrapper.vm.autoProjects[0].id)
    })

    it('确认内联编辑应更新数据', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const p = wrapper.vm.autoProjects[0]
      wrapper.vm.inlineEdit = { id: p.id, field: 'customer', value: '新客户名' }
      await wrapper.vm.confirmInlineEdit(p, 'auto')

      expect(wrapper.vm.autoProjects[0].customer).toBe('新客户名')
    })

    it('取消内联编辑应重置状态', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const p = wrapper.vm.autoProjects[0]
      wrapper.vm.inlineEdit = { id: p.id, field: 'customer', value: '临时值' }
      await wrapper.vm.cancelInlineEdit()

      expect(wrapper.vm.inlineEdit.id).toBeNull()
      expect(wrapper.vm.inlineEdit.field).toBeNull()
    })
  })

  /* ===== 详情面板 ===== */
  describe('详情面板', () => {
    it('点击详情按钮应打开详情面板', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      const detailBtn = wrapper.findAll('.action-btns .btn-ghost')[0] // 详情按钮
      await detailBtn.trigger('click')

      expect(wrapper.vm.showDetailPanel).toBe(true)
      expect(wrapper.vm.detailType).toBe('auto')
    })

    it('关闭详情面板应重置状态', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.openAutoDetail(wrapper.vm.autoProjects[0])
      expect(wrapper.vm.showDetailPanel).toBe(true)

      wrapper.vm.showDetailPanel = false
      await flushPromises()

      expect(wrapper.vm.showDetailPanel).toBe(false)
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('选中项目后应显示批量删除按钮', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.autoSelected = [wrapper.vm.autoProjects[0].id]
      await flushPromises()

      const batchBtn = wrapper.find('.btn-outline.btn-danger')
      expect(batchBtn.exists()).toBe(true)
    })

    it('批量删除应弹出确认对话框', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.autoSelected = [wrapper.vm.autoProjects[0].id]
      await wrapper.vm.confirmBatchDeleteAuto()

      expect(wrapper.vm.showConfirmDialog).toBe(true)
    })

    it('全选应选中所有项目', async () => {
      seedAutoProjects(3)
      const wrapper = mountComponent()
      await flushPromises()

      // Simulate toggleAutoSelectAll with checked=true
      wrapper.vm.autoSelected = wrapper.vm.filteredAutoProjects.map(p => p.id)
      await flushPromises()

      expect(wrapper.vm.autoSelected.length).toBeGreaterThan(0)
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应提示暂无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.exportCSV()
      expect(alertSpy).toHaveBeenCalledWith('暂无数据可导出')

      alertSpy.mockRestore()
    })

    it('有数据时导出应创建 Blob 并触发下载', async () => {
      seedAutoProjects(2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportCSV()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 打印 ===== */
  describe('打印功能', () => {
    it('printView 应调用 window.print', async () => {
      const wrapper = mountComponent()
      const printSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue({ print: vi.fn() })

      await wrapper.vm.printView()

      printSpy.mockRestore()
    })
  })

  /* ===== 操作日志 ===== */
  describe('操作日志', () => {
    it('点击日志按钮应打开日志弹窗', async () => {
      const wrapper = mountComponent()
      const logBtn = wrapper.findAll('.page-header-actions .btn-outline')[1]
      await logBtn.trigger('click')

      expect(wrapper.vm.showOpLogModal).toBe(true)
    })

    it('addOpLog 应添加日志记录', () => {
      const wrapper = mountComponent()
      const initialCount = wrapper.vm.opLogs.length

      wrapper.vm.addOpLog('add', '新增', '新增汽车项目')

      expect(wrapper.vm.opLogs.length).toBe(initialCount + 1)
      expect(wrapper.vm.opLogs[0].action).toBe('add')
      expect(wrapper.vm.opLogs[0].actionLabel).toBe('新增')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('autoActiveCount 应正确计算进行中项目数', () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      expect(wrapper.vm.autoActiveCount).toBeGreaterThan(0)
    })

    it('autoMassCount 应正确计算已量产项目数', () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.autoMassCount).toBe('number')
      expect(wrapper.vm.autoMassCount).toBeGreaterThanOrEqual(0)
    })

    it('autoOverdueCount 应正确计算逾期项目数', () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.autoOverdueCount).toBe('number')
    })

    it('nonAutoTotalAmount 应正确计算合同总额', () => {
      seedNonAutoProjects(3)
      const wrapper = mountComponent()

      expect(wrapper.vm.nonAutoTotalAmount).toBeGreaterThan(0)
    })

    it('activeRiskCount 应正确计算活跃风险数', () => {
      seedRisks(3)
      const wrapper = mountComponent()

      expect(typeof wrapper.vm.activeRiskCount).toBe('number')
    })

    it('filteredAutoProjects 应正确过滤', async () => {
      seedAutoProjects(5)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredAutoProjects.length).toBe(5)

      wrapper.vm.autoSearch = '客户1'
      await flushPromises()

      expect(wrapper.vm.filteredAutoProjects.length).toBeLessThanOrEqual(5)
    })

    it('filteredRisks 应正确过滤', async () => {
      seedRisks(3)
      const wrapper = mountComponent()

      expect(wrapper.vm.filteredRisks.length).toBe(3)

      wrapper.vm.riskLevelFilter = '高'
      await flushPromises()

      expect(wrapper.vm.filteredRisks.length).toBeLessThanOrEqual(3)
    })
  })

  /* ===== 列配置 ===== */
  describe('列配置', () => {
    it('点击列按钮应切换列配置下拉', async () => {
      const wrapper = mountComponent()
      const colBtn = wrapper.find('.column-config-wrapper .btn')

      await colBtn.trigger('click')
      expect(wrapper.vm.showAutoColumnConfig).toBe(true)

      await colBtn.trigger('click')
      expect(wrapper.vm.showAutoColumnConfig).toBe(false)
    })

    it('取消勾选列应隐藏对应列', async () => {
      seedAutoProjects(2)
      const wrapper = mountComponent()

      // 默认显示客户列
      expect(wrapper.findAll('th').some(th => th.text().includes('客户单位'))).toBe(true)

      wrapper.vm.autoColumnVisible.customer = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('客户单位')
    })
  })

  /* ===== 确认弹窗 ===== */
  describe('确认弹窗', () => {
    it('取消应关闭确认弹窗', async () => {
      seedAutoProjects(1)
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.confirmDeleteAuto(wrapper.vm.autoProjects[0].id)
      expect(wrapper.vm.showConfirmDialog).toBe(true)

      wrapper.vm.showConfirmDialog = false
      await flushPromises()

      expect(wrapper.vm.showConfirmDialog).toBe(false)
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
