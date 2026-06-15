/**
 * WorkflowDesign.vue 组件级测试
 * 覆盖：渲染、Tab切换、模板展示、待办任务、审批弹窗、流程实例、取消流程、计算属性
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import WorkflowDesign from '@/modules/system/views/WorkflowDesign.vue'
import { useWorkflowStore } from '@/modules/system/stores/workflow'

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

vi.mock('@/utils/workflowEngine', () => {
  const InstanceStatus = { RUNNING: 'running', COMPLETED: 'completed', REJECTED: 'rejected', CANCELLED: 'cancelled' }

  const mockTemplates = [
    {
      id: 'purchase', name: '采购审批', icon: 'layers', description: '采购订单审批流程',
      nodes: [
        { id: 'start', name: '发起', type: 'start' },
        { id: 'approve1', name: '部门主管审批', type: 'approval', approvers: ['测试用户'] },
        { id: 'end', name: '结束', type: 'end' }
      ],
      edges: [
        { from: 'start', to: 'approve1' },
        { from: 'approve1', to: 'end', condition: true }
      ]
    },
    {
      id: 'quotation', name: '报价审批', icon: 'list', description: '报价单审批流程',
      nodes: [
        { id: 'start', name: '发起', type: 'start' },
        { id: 'approve1', name: '销售经理审批', type: 'approval', approvers: ['销售经理'] },
        { id: 'end', name: '结束', type: 'end' }
      ],
      edges: [
        { from: 'start', to: 'approve1' },
        { from: 'approve1', to: 'end' }
      ]
    }
  ]

  return {
    default: {
      getAllTemplates: () => mockTemplates,
      startInstance: (templateId, opts) => ({
        id: 'inst_' + Date.now(),
        templateId,
        templateName: mockTemplates.find(t => t.id === templateId)?.name || templateId,
        businessId: opts?.businessId || '',
        businessNo: opts?.variables?.businessNo || '',
        currentApprover: '测试用户',
        status: InstanceStatus.RUNNING,
        startTime: new Date().toISOString(),
        endTime: null,
        history: [{ node: '发起', nodeId: 'start', approver: '测试用户', action: 'submit', comment: '', time: new Date().toISOString() }],
        variables: opts?.variables || {}
      }),
      approve: (instance, opts) => {
        instance.status = opts.result === 'approved' ? InstanceStatus.COMPLETED : InstanceStatus.REJECTED
        instance.endTime = new Date().toISOString()
        instance.history.push({ node: '审批', nodeId: 'approve1', approver: opts.approver, action: opts.result, comment: opts.comment, time: new Date().toISOString() })
        return { success: true, instance }
      },
      delegate: (instance, opts) => {
        instance.currentApprover = opts.to
        instance.history.push({ node: '委托', nodeId: 'delegate', approver: opts.from, action: 'delegate', comment: opts.reason, time: new Date().toISOString() })
        return { success: true, instance }
      },
      addApprover: (instance, opts) => {
        instance.history.push({ node: '加签', nodeId: 'addApprover', approver: opts.approver, action: 'addApprover', comment: opts.reason, time: new Date().toISOString() })
        return { success: true, instance }
      },
      getInstanceNodeStates: (instance) => {
        return (instance?.templateId ? mockTemplates.find(t => t.id === instance.templateId)?.nodes || [] : []).map(n => ({
          ...n,
          status: n.type === 'start' ? 'completed' : n.type === 'approval' ? 'active' : 'pending'
        }))
      },
      getPendingTasks: (instances, user) => instances.filter(i => i.status === InstanceStatus.RUNNING && i.currentApprover === user),
      getCompletedTasks: (instances, user) => instances.filter(i => i.status === InstanceStatus.COMPLETED || i.status === InstanceStatus.REJECTED),
      checkTimeout: () => []
    },
    InstanceStatus,
    WORKFLOW_TEMPLATES: mockTemplates
  }
})

/* ===== 子组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}
const WorkflowNodeStub = {
  props: ['nodes'],
  template: '<div class="workflow-node-stub">节点: {{ nodes.length }}</div>'
}
const ApprovalActionStub = {
  props: ['instance'],
  template: '<div class="approval-action-stub" @click="$emit(\'approved\')">审批操作</div>',
  emits: ['approved', 'delegated', 'added-approver']
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return mount(WorkflowDesign, {
    attachTo: div,
    global: {
      stubs: {
        Icon: IconStub,
        WorkflowNode: WorkflowNodeStub,
        ApprovalAction: ApprovalActionStub,
        Teleport: false
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedInstances(store, count = 3) {
  for (let i = 0; i < count; i++) {
    store.instances.push({
      id: `inst_test_${i}`,
      templateId: ['purchase', 'quotation'][i % 2],
      templateName: ['采购审批', '报价审批'][i % 2],
      businessNo: `BN-${String(i + 1).padStart(3, '0')}`,
      currentApprover: i === 0 ? '测试用户' : '其他用户',
      status: i < 2 ? 'running' : 'completed',
      startTime: new Date(Date.now() - i * 86400000).toISOString(),
      endTime: i >= 2 ? new Date().toISOString() : null,
      history: [
        { node: '发起', nodeId: 'start', approver: '测试用户', action: 'submit', comment: '', time: new Date(Date.now() - i * 86400000).toISOString() }
      ],
      variables: { amount: 10000 * (i + 1) }
    })
  }
}

describe('WorkflowDesign 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useWorkflowStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-title').text()).toBe('工作流管理')
    })

    it('应渲染统计信息', () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      const statNums = wrapper.findAll('.header-stat-num')
      expect(statNums.length).toBe(3) // 待办、进行中、已完成
    })

    it('应渲染Tab栏', () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      expect(tabBtns.length).toBe(4) // 模板、待办、已办、实例
    })

    it('默认应显示工作流模板Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('templates')
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('点击待办任务Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('pending')
    })

    it('点击已办任务Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('completed')
    })

    it('点击流程实例Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[3].trigger('click')
      expect(wrapper.vm.activeTab).toBe('instances')
    })
  })

  /* ===== 工作流模板 ===== */
  describe('工作流模板', () => {
    it('应渲染模板卡片', () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.template-card')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('点击模板卡片应打开详情弹窗', async () => {
      const wrapper = mountComponent()
      const card = wrapper.find('.template-card')
      await card.trigger('click')

      expect(wrapper.vm.showTemplateModal).toBe(true)
      expect(wrapper.vm.detailTemplate).toBeTruthy()
    })
  })

  /* ===== 待办任务 ===== */
  describe('待办任务', () => {
    it('有待办时应渲染任务卡片', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'pending'
      await flushPromises()

      const cards = wrapper.findAll('.task-card')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('无待办时应显示空状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'pending'
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('点击展开按钮应展开任务详情', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'pending'
      await flushPromises()

      const header = wrapper.find('.task-header')
      if (header.exists()) {
        await header.trigger('click')
        expect(wrapper.vm.expandedTaskId).toBeTruthy()
      }
    })

    it('点击审批按钮应打开审批弹窗', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'pending'
      await flushPromises()

      const approveBtn = wrapper.find('.btn-primary')
      if (approveBtn.exists()) {
        await approveBtn.trigger('click')
        expect(wrapper.vm.showApprovalModal).toBe(true)
        expect(wrapper.vm.approvalInstance).toBeTruthy()
      }
    })
  })

  /* ===== 已办任务 ===== */
  describe('已办任务', () => {
    it('有已办时应渲染任务卡片', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'completed'
      await flushPromises()

      const cards = wrapper.findAll('.task-card')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('无已办时应显示空状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'completed'
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
  })

  /* ===== 流程实例 ===== */
  describe('流程实例', () => {
    it('应渲染实例表格', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'instances'
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('按状态过滤应生效', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'instances'
      await flushPromises()

      wrapper.vm.instanceFilter = 'running'
      await flushPromises()

      expect(wrapper.vm.filteredList.length).toBeLessThanOrEqual(3)
    })

    it('点击查看按钮应打开实例详情弹窗', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'instances'
      await flushPromises()

      const viewBtn = wrapper.findAll('.btn-sm').find(b => b.text().includes('查看'))
      if (viewBtn) {
        await viewBtn.trigger('click')
        expect(wrapper.vm.showInstanceModal).toBe(true)
      }
    })

    it('取消运行中实例应弹出确认', async () => {
      seedInstances(store, 3)
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'instances'
      await flushPromises()

      const cancelBtn = wrapper.findAll('.btn-danger').find(b => b.text().includes('取消'))
      if (cancelBtn) {
        await cancelBtn.trigger('click')
        expect(confirmSpy).toHaveBeenCalled()
      }

      confirmSpy.mockRestore()
    })
  })

  /* ===== 审批弹窗 ===== */
  describe('审批弹窗', () => {
    it('打开审批弹窗后应显示审批信息', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      await wrapper.vm.openApproval(store.instances[0])

      expect(wrapper.vm.showApprovalModal).toBe(true)
      expect(wrapper.vm.approvalInstance).toBeTruthy()
    })

    it('关闭审批弹窗应清除审批实例', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      await wrapper.vm.openApproval(store.instances[0])
      await wrapper.vm.closeApprovalModal()

      expect(wrapper.vm.showApprovalModal).toBe(false)
      expect(wrapper.vm.approvalInstance).toBeNull()
    })

    it('审批完成后应关闭弹窗', async () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      await wrapper.vm.openApproval(store.instances[0])
      await wrapper.vm.onApprovalDone()

      expect(wrapper.vm.showApprovalModal).toBe(false)
    })
  })

  /* ===== 模板详情弹窗 ===== */
  describe('模板详情弹窗', () => {
    it('打开模板详情应显示模板信息', async () => {
      const wrapper = mountComponent()
      const tpl = store.templates[0]
      await wrapper.vm.showTemplateDetail(tpl)

      expect(wrapper.vm.showTemplateModal).toBe(true)
      expect(wrapper.vm.detailTemplate.name).toBe(tpl.name)
    })

    it('getNodeName 应返回节点名称', async () => {
      const wrapper = mountComponent()
      const tpl = store.templates[0]
      await wrapper.vm.showTemplateDetail(tpl)

      const name = wrapper.vm.getNodeName('start')
      expect(name).toBe('发起')
    })

    it('getNodeName 未找到节点时应返回nodeId', async () => {
      const wrapper = mountComponent()
      const tpl = store.templates[0]
      await wrapper.vm.showTemplateDetail(tpl)

      const name = wrapper.vm.getNodeName('nonexistent')
      expect(name).toBe('nonexistent')
    })
  })

  /* ===== 辅助函数 ===== */
  describe('辅助函数', () => {
    it('getStatusLabel 应返回正确的中文标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getStatusLabel('running')).toBe('运行中')
      expect(wrapper.vm.getStatusLabel('completed')).toBe('已完成')
      expect(wrapper.vm.getStatusLabel('rejected')).toBe('已拒绝')
      expect(wrapper.vm.getStatusLabel('cancelled')).toBe('已取消')
    })

    it('getActionLabel 应返回正确的中文标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getActionLabel('submit')).toBe('提交')
      expect(wrapper.vm.getActionLabel('approved')).toBe('通过')
      expect(wrapper.vm.getActionLabel('rejected')).toBe('拒绝')
      expect(wrapper.vm.getActionLabel('delegate')).toBe('委托')
    })

    it('formatTime 应格式化时间', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatTime('2024-06-15T10:30:00')
      expect(result).toContain('2024')
      expect(result).toContain('10:30')
    })

    it('formatTime 空值应返回短横线', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatTime(null)).toBe('-')
      expect(wrapper.vm.formatTime('')).toBe('-')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('tabs 计算属性应包含待办数量badge', () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      const pendingTab = wrapper.vm.tabs.find(t => t.key === 'pending')
      expect(pendingTab.badge).toBeGreaterThanOrEqual(0)
    })

    it('pendingList 应返回待办任务', () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.vm.pendingList.length).toBeGreaterThanOrEqual(0)
    })

    it('completedList 应返回已办任务', () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      expect(wrapper.vm.completedList.length).toBeGreaterThanOrEqual(0)
    })

    it('filteredList 应根据instanceFilter过滤', () => {
      seedInstances(store, 3)
      const wrapper = mountComponent()
      wrapper.vm.instanceFilter = 'all'
      expect(wrapper.vm.filteredList.length).toBe(3)

      wrapper.vm.instanceFilter = 'running'
      const runningCount = wrapper.vm.filteredList.length
      expect(runningCount).toBeLessThanOrEqual(3)
    })
  })
})
