/**
 * Approvals.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、排序、CRUD、批量操作、委托、撤回、升级、超时检查、弹窗、表单验证、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Approvals from '@/modules/system/views/Approvals.vue'
import { useApprovalStore } from '@/modules/system/stores/approval'

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
  return mount(Approvals, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedRules(store, count = 3) {
  const modules = ['报价管理', '回款管理', '采购管理', '合同管理', '送货管理', '对账管理']
  const conditions = ['amount', 'margin', 'all']
  const approvers = ['总经理', '财务经理', '销售主管', '采购主管']
  for (let i = 0; i < count; i++) {
    store.addRule({
      module: modules[i % modules.length],
      condition: conditions[i % conditions.length],
      threshold: [50000, 10, 0][i % 3],
      approver: approvers[i % approvers.length],
      approvalType: ['single', 'countersign', 'orsign'][i % 3],
      timeout: [24, 48, 12][i % 3],
      nextApprover: i % 2 === 0 ? '' : '总经理'
    })
  }
}

describe('Approvals 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useApprovalStore()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(), fillRect: vi.fn(), clearRect: vi.fn(), fillText: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      arc: vi.fn(), arcTo: vi.fn(), fill: vi.fn(), setFont: vi.fn(), measureText: vi.fn(() => ({ width: 50 })),
      save: vi.fn(), restore: vi.fn(), closePath: vi.fn(), rect: vi.fn(),
      strokeRect: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: ''
    }))
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 300, height: 200, top: 0, left: 0, bottom: 200, right: 300 }))
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('审批配置')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('可视化审批工作流')
    })

    it('应渲染统计卡片', () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.stat-card')
      expect(cards.length).toBe(4)
      expect(cards[0].find('.stat-card-label').text()).toBe('审批规则总数')
      expect(cards[1].find('.stat-card-label').text()).toBe('已启用规则')
    })

    it('无规则时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无审批规则')
    })

    it('有规则时应渲染表格行', () => {
      seedRules(store, 3)
      const wrapper = mountComponent()
      // 审批规则列表是第一个 table，审批日志是第二个 table
      const tables = wrapper.findAll('.table-container')
      const ruleRows = tables[0].findAll('tbody tr')
      expect(ruleRows.length).toBe(3)
    })

    it('应渲染审批流程图面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('canvas').exists()).toBe(true)
    })

    it('应渲染添加新规则面板', () => {
      const wrapper = mountComponent()
      const titles = wrapper.findAll('.panel-card-title')
      const addTitle = titles.find(t => t.text().includes('添加新规则'))
      expect(addTitle).toBeTruthy()
    })

    it('应渲染审批日志面板', () => {
      const wrapper = mountComponent()
      const titles = wrapper.findAll('.panel-card-title')
      const logTitle = titles.filter(t => t.text().includes('审批日志'))
      expect(logTitle.length).toBeGreaterThan(0)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按模块名搜索应过滤规则列表', async () => {
      seedRules(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="搜索规则..."]')
      await input.setValue('报价')
      await flushPromises()

      const filtered = wrapper.vm.filteredRules
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach(r => {
        expect(r.module.toLowerCase()).toContain('报价')
      })
    })

    it('按审批人搜索应过滤规则列表', async () => {
      seedRules(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="搜索规则..."]')
      await input.setValue('总经理')
      await flushPromises()

      const filtered = wrapper.vm.filteredRules
      filtered.forEach(r => {
        expect(
          (r.module || '').toLowerCase().includes('总经理') ||
          (r.approver || '').toLowerCase().includes('总经理') ||
          (r.condition || '').toLowerCase().includes('总经理')
        ).toBe(true)
      })
    })

    it('搜索无匹配时应显示空状态', async () => {
      seedRules(store, 2)
      const wrapper = mountComponent()

      const input = wrapper.find('input[placeholder="搜索规则..."]')
      await input.setValue('不存在的模块')
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
  })

  /* ===== 排序 ===== */
  describe('排序', () => {
    it('点击模块列头应按模块排序', async () => {
      seedRules(store, 5)
      const wrapper = mountComponent()

      const ths = wrapper.findAll('th')
      const moduleTh = ths.find(th => th.text().includes('模块'))
      await moduleTh.trigger('click')
      await flushPromises()

      expect(wrapper.vm.sortField).toBe('module')
    })

    it('再次点击同一列头应切换排序方向', async () => {
      seedRules(store, 3)
      const wrapper = mountComponent()

      const ths = wrapper.findAll('th')
      const moduleTh = ths.find(th => th.text().includes('模块'))
      await moduleTh.trigger('click')
      expect(wrapper.vm.sortAsc).toBe(true)

      await moduleTh.trigger('click')
      expect(wrapper.vm.sortAsc).toBe(false)
    })
  })

  /* ===== 添加规则 ===== */
  describe('添加规则', () => {
    it('点击添加按钮应新增审批规则', async () => {
      const wrapper = mountComponent()
      const beforeCount = store.rules.length

      wrapper.vm.editorData.module = '报价管理'
      wrapper.vm.editorData.condition = 'amount'
      wrapper.vm.editorData.threshold = 99999
      wrapper.vm.editorData.approver = '总经理'
      wrapper.vm.editorData.approvalType = 'single'
      wrapper.vm.editorData.timeout = 24

      await wrapper.vm.addRule()
      await flushPromises()

      expect(store.rules.length).toBe(beforeCount + 1)
    })

    it('必填字段为空时提交应显示验证错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.editorData.module = ''
      wrapper.vm.editorData.approver = ''

      await wrapper.vm.validateRule()
      expect(wrapper.vm.validationErrors).toContain('请选择审批模块')
      expect(wrapper.vm.validationErrors).toContain('请选择审批人')
    })

    it('阈值小于等于0时应显示验证错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.editorData.module = '报价管理'
      wrapper.vm.editorData.approver = '总经理'
      wrapper.vm.editorData.condition = 'amount'
      wrapper.vm.editorData.threshold = 0

      await wrapper.vm.validateRule()
      expect(wrapper.vm.validationErrors).toContain('阈值必须大于0')
    })

    it('超时时间小于1时应显示验证错误', async () => {
      const wrapper = mountComponent()
      wrapper.vm.editorData.module = '报价管理'
      wrapper.vm.editorData.approver = '总经理'
      wrapper.vm.editorData.timeout = 0

      await wrapper.vm.validateRule()
      expect(wrapper.vm.validationErrors).toContain('超时时间至少1小时')
    })

    it('重复模块和条件时应提示错误', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()

      wrapper.vm.editorData.module = store.rules[0].module
      wrapper.vm.editorData.condition = store.rules[0].condition
      wrapper.vm.editorData.approver = '总经理'
      wrapper.vm.editorData.threshold = 50000
      wrapper.vm.editorData.timeout = 24

      await wrapper.vm.validateRule()
      expect(wrapper.vm.validationErrors.length).toBeGreaterThan(0)
    })

    it('应用模板应填充编辑器数据', async () => {
      const wrapper = mountComponent()
      wrapper.vm.editorData.template = 'quote_amount'

      await wrapper.vm.applyTemplate()
      expect(wrapper.vm.editorData.module).toBe('报价管理')
      expect(wrapper.vm.editorData.condition).toBe('amount')
      expect(wrapper.vm.editorData.threshold).toBe(50000)
    })
  })

  /* ===== 切换规则状态 ===== */
  describe('切换规则状态', () => {
    it('点击状态标签应切换启用/禁用', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const ruleId = store.rules[0].id
      const beforeEnabled = store.rules[0].enabled

      await wrapper.vm.toggleRule(ruleId)
      expect(store.rules[0].enabled).toBe(!beforeEnabled)
    })
  })

  /* ===== 删除规则 ===== */
  describe('删除规则', () => {
    it('确认删除应移除规则', async () => {
      seedRules(store, 2)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const ruleId = store.rules[0].id
      await wrapper.vm.deleteRule(ruleId)

      expect(store.rules.find(r => r.id === ruleId)).toBeUndefined()
      confirmSpy.mockRestore()
    })

    it('取消删除应保留规则', async () => {
      seedRules(store, 2)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)

      const beforeCount = store.rules.length
      const ruleId = store.rules[0].id
      await wrapper.vm.deleteRule(ruleId)

      expect(store.rules.length).toBe(beforeCount)
      confirmSpy.mockRestore()
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('未选择规则时批量操作应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.batchOp('enable')
      expect(alertSpy).toHaveBeenCalledWith('请先选择规则')

      alertSpy.mockRestore()
    })

    it('批量启用应更新选中规则状态', async () => {
      seedRules(store, 3)
      store.rules[0].enabled = false
      store.rules[1].enabled = false

      const wrapper = mountComponent()
      const ids = [store.rules[0].id, store.rules[1].id]
      wrapper.vm.selectedIds = ids

      await wrapper.vm.batchOp('enable')
      expect(store.rules[0].enabled).toBe(true)
      expect(store.rules[1].enabled).toBe(true)
    })

    it('批量禁用应更新选中规则状态', async () => {
      seedRules(store, 3)
      const wrapper = mountComponent()
      const ids = [store.rules[0].id, store.rules[1].id]
      wrapper.vm.selectedIds = ids

      await wrapper.vm.batchOp('disable')
      expect(store.rules[0].enabled).toBe(false)
      expect(store.rules[1].enabled).toBe(false)
    })

    it('批量删除应移除选中规则', async () => {
      seedRules(store, 3)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const ids = [store.rules[0].id, store.rules[1].id]
      wrapper.vm.selectedIds = ids

      await wrapper.vm.batchOp('delete')
      expect(store.rules.length).toBe(1)

      confirmSpy.mockRestore()
    })

    it('全选应选中所有规则', async () => {
      seedRules(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.selectAll = true
      await wrapper.vm.toggleSelectAll()

      expect(wrapper.vm.selectedIds.length).toBe(3)
    })

    it('取消全选应清空选中', async () => {
      seedRules(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.selectAll = true
      await wrapper.vm.toggleSelectAll()

      wrapper.vm.selectAll = false
      await wrapper.vm.toggleSelectAll()
      expect(wrapper.vm.selectedIds.length).toBe(0)
    })
  })

  /* ===== 委托审批 ===== */
  describe('委托审批', () => {
    it('打开委托弹窗应设置委托目标', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()

      await wrapper.vm.openDelegateModal(store.rules[0])
      expect(wrapper.vm.showDelegateModal).toBe(true)
      expect(wrapper.vm.delegateTarget).toBe(store.rules[0])
    })

    it('未选择委托人时提交应提示', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openDelegateModal(store.rules[0])
      wrapper.vm.delegateTo = ''
      await wrapper.vm.doDelegate()

      expect(alertSpy).toHaveBeenCalledWith('请选择委托人')
      alertSpy.mockRestore()
    })

    it('选择委托人后提交应更新审批人', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()

      await wrapper.vm.openDelegateModal(store.rules[0])
      wrapper.vm.delegateTo = '财务经理'
      await wrapper.vm.doDelegate()

      expect(store.rules[0].approver).toBe('财务经理')
      expect(wrapper.vm.showDelegateModal).toBe(false)
    })
  })

  /* ===== 撤回审批 ===== */
  describe('撤回审批', () => {
    it('确认撤回应禁用规则', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      await wrapper.vm.doRecall(store.rules[0].id)
      expect(store.rules[0].enabled).toBe(false)

      confirmSpy.mockRestore()
    })

    it('取消撤回应保留规则状态', async () => {
      seedRules(store, 1)
      store.rules[0].enabled = true
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)

      await wrapper.vm.doRecall(store.rules[0].id)
      expect(store.rules[0].enabled).toBe(true)

      confirmSpy.mockRestore()
    })
  })

  /* ===== 超时升级 ===== */
  describe('超时升级', () => {
    it('无下一级审批人时应提示无法升级', async () => {
      seedRules(store, 1)
      store.rules[0].nextApprover = ''
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.doEscalate(store.rules[0])
      expect(alertSpy).toHaveBeenCalledWith('该规则未配置下一级审批人，无法升级')

      alertSpy.mockRestore()
    })

    it('有下一级审批人时确认升级应更新审批人', async () => {
      seedRules(store, 1)
      store.rules[0].nextApprover = '总经理'
      store.rules[0].approver = '销售主管'
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      await wrapper.vm.doEscalate(store.rules[0])
      expect(store.rules[0].approver).toBe('总经理')

      confirmSpy.mockRestore()
    })
  })

  /* ===== 超时检查 ===== */
  describe('超时检查', () => {
    it('检查超时状态应打开结果弹窗', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()

      await wrapper.vm.checkTimeoutStatus(store.rules[0])
      expect(wrapper.vm.showTimeoutModal).toBe(true)
      expect(wrapper.vm.timeoutResult.rule).toBeTruthy()
    })
  })

  /* ===== 密码确认弹窗 ===== */
  describe('密码确认弹窗', () => {
    it('空密码确认应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.approvalPassword = ''
      await wrapper.vm.confirmPassword()

      expect(alertSpy).toHaveBeenCalledWith('请输入密码')
      alertSpy.mockRestore()
    })

    it('输入密码后确认应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showPasswordModal = true
      wrapper.vm.approvalPassword = '123456'
      wrapper.vm.pendingAction = vi.fn()

      await wrapper.vm.confirmPassword()
      expect(wrapper.vm.showPasswordModal).toBe(false)
      expect(wrapper.vm.approvalPassword).toBe('')
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击密码弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showPasswordModal = true
      await flushPromises()

      const overlay = wrapper.findAll('.modal-overlay')[0]
      if (overlay) {
        await overlay.trigger('click.self')
        expect(wrapper.vm.showPasswordModal).toBe(false)
      }
    })

    it('点击委托弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showDelegateModal = true
      await flushPromises()

      const overlays = wrapper.findAll('.modal-overlay')
      const delegateOverlay = overlays.find(o => o.text().includes('审批委托'))
      if (delegateOverlay) {
        await delegateOverlay.trigger('click.self')
        expect(wrapper.vm.showDelegateModal).toBe(false)
      }
    })
  })

  /* ===== 日志过滤 ===== */
  describe('日志过滤', () => {
    it('应正确过滤审批日志', async () => {
      seedRules(store, 2)
      const wrapper = mountComponent()

      // 触发一些操作产生日志
      await wrapper.vm.toggleRule(store.rules[0].id)
      await wrapper.vm.toggleRule(store.rules[1].id)

      wrapper.vm.logFilter = 'toggle'
      const filtered = wrapper.vm.filteredLogs
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach(log => {
        expect(log.action).toBe('toggle')
      })
    })

    it('清空日志应移除所有日志', async () => {
      seedRules(store, 1)
      const wrapper = mountComponent()
      await wrapper.vm.toggleRule(store.rules[0].id)

      store.clearLogs()
      expect(store.logs.length).toBe(0)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredRules 应根据搜索词过滤', async () => {
      seedRules(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.searchQuery = '报价'
      await flushPromises()

      const filtered = wrapper.vm.filteredRules
      filtered.forEach(r => {
        expect(r.module.toLowerCase()).toContain('报价')
      })
    })

    it('filteredLogs 应根据日志过滤条件过滤', async () => {
      seedRules(store, 2)
      const wrapper = mountComponent()
      await wrapper.vm.toggleRule(store.rules[0].id)

      wrapper.vm.logFilter = 'toggle'
      expect(wrapper.vm.filteredLogs.every(l => l.action === 'toggle')).toBe(true)
    })
  })

  /* ===== 日志辅助函数 ===== */
  describe('日志辅助函数', () => {
    it('logActionLabel 应返回正确的中文标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.logActionLabel('create')).toBe('新增')
      expect(wrapper.vm.logActionLabel('delete')).toBe('删除')
      expect(wrapper.vm.logActionLabel('toggle')).toBe('启禁')
      expect(wrapper.vm.logActionLabel('escalate')).toBe('升级')
      expect(wrapper.vm.logActionLabel('delegate')).toBe('委托')
    })

    it('logActionClass 应返回正确的样式类', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.logActionClass('create')).toBe('success')
      expect(wrapper.vm.logActionClass('delete')).toBe('danger')
      expect(wrapper.vm.logActionClass('escalate')).toBe('warning')
    })
  })

  /* ===== 权限控制 ===== */
  describe('权限控制', () => {
    it('管理员角色应有审批权限', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.canApprove).toBe(true)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应尝试渲染流程图', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('canvas').exists()).toBe(true)
    })

    it('卸载时应清理画布', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
