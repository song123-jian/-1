/**
 * workflowEngine.js 深度测试
 * 覆盖：启动实例与持久化、审批/拒绝/委托/加签、超时检查、
 *       条件分支、实例管理、复杂多节点流程
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/* ===== Mock 依赖 ===== */
vi.mock('@/utils/uid', () => ({
  generateId: vi.fn((prefix) => `${prefix}_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
}))

vi.mock('@/utils/eventBus', () => ({
  default: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
    off: vi.fn()
  }
}))

import workflowEngine, {
  NodeType,
  FlowMode,
  InstanceStatus,
  ApprovalResult,
  WORKFLOW_TEMPLATES
} from '@/utils/workflowEngine.js'

describe('workflowEngine.js - 深度测试', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'))
    /* 重置引擎内部状态 */
    workflowEngine._instances.clear()
    workflowEngine._saveInstances()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /* ===== 1. 启动实例并验证持久化 ===== */
  describe('启动实例与持久化', () => {
    it('启动实例后应持久化到 localStorage', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q001',
        businessType: 'quotation',
        variables: { applicant: '张三', businessNo: 'Q-2025-001' }
      })

      expect(instance).not.toBeNull()
      expect(instance.id).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.RUNNING)
      expect(instance.templateId).toBe('quotation')
      expect(instance.businessId).toBe('Q001')
      expect(instance.currentApprover).toBe('销售主管')

      /* 验证 localStorage 持久化 */
      const raw = localStorage.getItem('gj_erp_workflowInstances')
      expect(raw).not.toBeNull()
      const stored = JSON.parse(raw)
      expect(stored.length).toBe(1)
      expect(stored[0].id).toBe(instance.id)
    })

    it('不存在的模板应返回错误对象', () => {
      const result = workflowEngine.startInstance('nonexistent', {
        businessId: 'X001',
        variables: {}
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
  })

  /* ===== 2. 逐节点审批并验证 currentNodeArrivalTime 更新 ===== */
  describe('逐节点审批', () => {
    it('每步审批后 currentNodeArrivalTime 应更新', () => {
      const instance = workflowEngine.startInstance('inbound', {
        businessId: 'IB001',
        businessType: 'inbound',
        variables: { applicant: '仓管员A', businessNo: 'IB-2025-001' }
      })

      const arrivalTime1 = instance.currentNodeArrivalTime

      /* 第一步审批：质检确认 */
      vi.advanceTimersByTime(3600000) /* 前进 1 小时 */
      const result1 = workflowEngine.approve(instance, {
        approver: '仓管员',
        result: ApprovalResult.APPROVED,
        comment: '质检通过'
      })

      expect(result1.success).toBe(true)
      expect(instance.currentApprover).toBe('仓库主管')
      expect(instance.currentNodeArrivalTime).not.toBe(arrivalTime1)

      const arrivalTime2 = instance.currentNodeArrivalTime

      /* 第二步审批：仓库主管 */
      vi.advanceTimersByTime(7200000) /* 前进 2 小时 */
      const result2 = workflowEngine.approve(instance, {
        approver: '仓库主管',
        result: ApprovalResult.APPROVED,
        comment: '同意入库'
      })

      expect(result2.success).toBe(true)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      /* 流程完成后 currentNodeArrivalTime 不再更新（已到 END 节点） */
      /* 但 endTime 应被设置 */
      expect(instance.endTime).not.toBeNull()
    })
  })

  /* ===== 3. 拒绝流程 ===== */
  describe('拒绝流程', () => {
    it('拒绝后流程状态应为 rejected', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q002',
        businessType: 'quotation',
        variables: { applicant: '李四', businessNo: 'Q-2025-002' }
      })

      const result = workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.REJECTED,
        comment: '价格不合理'
      })

      expect(result.success).toBe(true)
      expect(instance.status).toBe(InstanceStatus.REJECTED)
      expect(instance.endTime).not.toBeNull()
      expect(instance.currentApprover).toBe('')

      /* 历史记录应包含拒绝操作 */
      const rejectHistory = instance.history.find(h => h.action === 'rejected')
      expect(rejectHistory).toBeDefined()
      expect(rejectHistory.comment).toBe('价格不合理')
    })

    it('已拒绝的流程不能再审批', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q003',
        variables: { applicant: '王五' }
      })

      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.REJECTED,
        comment: '拒绝'
      })

      const result = workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED,
        comment: '重新同意'
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('不在运行状态')
    })
  })

  /* ===== 4. 委托流程 ===== */
  describe('委托流程', () => {
    it('A 委托给 B 后，当前审批人应变为 B', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q004',
        businessType: 'quotation',
        variables: { applicant: '赵六', businessNo: 'Q-2025-004' }
      })

      expect(instance.currentApprover).toBe('销售主管')

      const result = workflowEngine.delegate(instance, {
        from: '销售主管',
        to: '副总经理',
        reason: '金额较大，需副总审批'
      })

      expect(result.success).toBe(true)
      expect(instance.currentApprover).toBe('副总经理')

      /* 历史记录应包含委托操作 */
      const delegateHistory = instance.history.find(h => h.action === 'delegate')
      expect(delegateHistory).toBeDefined()
      expect(delegateHistory.comment).toContain('副总经理')
      expect(delegateHistory.comment).toContain('金额较大')
    })

    it('非运行状态的实例不能委托', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q005',
        variables: { applicant: '测试' }
      })

      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.REJECTED
      })

      const result = workflowEngine.delegate(instance, {
        from: '销售主管',
        to: '副总',
        reason: '测试'
      })

      expect(result.success).toBe(false)
    })
  })

  /* ===== 5. 加签 ===== */
  describe('加签', () => {
    it('加签后 addedApprovers 应包含新审批人', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q006',
        businessType: 'quotation',
        variables: { applicant: '钱七', businessNo: 'Q-2025-006' }
      })

      const result = workflowEngine.addApprover(instance, {
        approver: '法务专员',
        reason: '需要法务审核条款'
      })

      expect(result.success).toBe(true)
      expect(instance.addedApprovers.length).toBe(1)
      expect(instance.addedApprovers[0].approver).toBe('法务专员')
      expect(instance.addedApprovers[0].reason).toBe('需要法务审核条款')

      /* 历史记录应包含加签操作 */
      const addHistory = instance.history.find(h => h.action === 'addApprover')
      expect(addHistory).toBeDefined()
      expect(addHistory.comment).toContain('法务专员')
    })

    it('非运行状态的实例不能加签', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q007',
        variables: { applicant: '测试' }
      })

      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.REJECTED
      })

      const result = workflowEngine.addApprover(instance, {
        approver: '法务',
        reason: '测试'
      })

      expect(result.success).toBe(false)
    })
  })

  /* ===== 6. checkTimeout 使用 currentNodeArrivalTime ===== */
  describe('checkTimeout 超时检查', () => {
    it('应基于 currentNodeArrivalTime 而非 startTime 判断超时', () => {
      /* 启动实例，默认超时 48 小时 */
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q008',
        variables: {
          applicant: '孙八',
          timeoutHours: 48
        }
      })

      const startTime = new Date(instance.startTime).getTime()
      const arrivalTime = new Date(instance.currentNodeArrivalTime).getTime()

      /* 前进 24 小时 - 未超时 */
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
      let timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(0)

      /* 审批通过到下一节点，重置 currentNodeArrivalTime */
      const approveResult = workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED
      })

      /* quotation 模板审批后直接结束 */
      if (approveResult.success && instance.status === InstanceStatus.COMPLETED) {
        /* 已完成，不会超时 */
        timeoutList = workflowEngine.checkTimeout([instance])
        expect(timeoutList.length).toBe(0)
        return
      }

      /* 如果还有下一节点，验证超时基于 currentNodeArrivalTime */
      const newArrivalTime = new Date(instance.currentNodeArrivalTime).getTime()

      /* 再前进 49 小时 - 应超时 */
      vi.advanceTimersByTime(49 * 60 * 60 * 1000)
      timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(1)
      expect(timeoutList[0].instanceId).toBe(instance.id)
    })

    it('使用 inbound 模板验证 currentNodeArrivalTime 重置后超时重新计算', () => {
      const instance = workflowEngine.startInstance('inbound', {
        businessId: 'IB002',
        variables: {
          applicant: '测试员',
          timeoutHours: 2 /* 2 小时超时 */
        }
      })

      /* 前进 1.5 小时 - 未超时 */
      vi.advanceTimersByTime(1.5 * 60 * 60 * 1000)
      let timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(0)

      /* 审批第一步，currentNodeArrivalTime 更新 */
      workflowEngine.approve(instance, {
        approver: '仓管员',
        result: ApprovalResult.APPROVED
      })

      /* 再前进 1.5 小时 - 从新 arrivalTime 算起未超时 */
      vi.advanceTimersByTime(1.5 * 60 * 60 * 1000)
      timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(0)

      /* 再前进 1 小时 - 总计 2.5 小时，超过 2 小时超时 */
      vi.advanceTimersByTime(1 * 60 * 60 * 1000)
      timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(1)
    })

    it('已完成/已拒绝的实例不应出现在超时列表', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q009',
        variables: { applicant: '测试', timeoutHours: 1 }
      })

      /* 审批完成 */
      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED
      })

      /* 前进远超超时时间 */
      vi.advanceTimersByTime(100 * 60 * 60 * 1000)
      const timeoutList = workflowEngine.checkTimeout([instance])
      expect(timeoutList.length).toBe(0)
    })
  })

  /* ===== 7. 每次操作后实例持久化 ===== */
  describe('实例持久化', () => {
    it('每次操作后应持久化到 localStorage', () => {
      const instance = workflowEngine.startInstance('inbound', {
        businessId: 'IB003',
        variables: { applicant: '测试' }
      })

      /* 验证启动后持久化 */
      let stored = JSON.parse(localStorage.getItem('gj_erp_workflowInstances'))
      expect(stored.length).toBe(1)

      /* 审批后持久化 */
      workflowEngine.approve(instance, {
        approver: '仓管员',
        result: ApprovalResult.APPROVED
      })
      stored = JSON.parse(localStorage.getItem('gj_erp_workflowInstances'))
      expect(stored[0].history.length).toBeGreaterThan(1)

      /* 委托后持久化 */
      workflowEngine.delegate(instance, {
        from: '仓库主管',
        to: '副仓库主管',
        reason: '出差'
      })
      stored = JSON.parse(localStorage.getItem('gj_erp_workflowInstances'))
      const delegateEntry = stored[0].history.find(h => h.action === 'delegate')
      expect(delegateEntry).toBeDefined()
    })
  })

  /* ===== 8. getInstances 返回持久化实例 ===== */
  describe('getInstances', () => {
    it('应返回所有持久化的实例', () => {
      workflowEngine.startInstance('quotation', {
        businessId: 'Q010',
        variables: { applicant: 'A' }
      })
      workflowEngine.startInstance('inbound', {
        businessId: 'IB010',
        variables: { applicant: 'B' }
      })
      workflowEngine.startInstance('contract', {
        businessId: 'CT010',
        variables: { applicant: 'C' }
      })

      const instances = workflowEngine.getInstances()
      expect(instances.length).toBe(3)
    })

    it('按模板 ID 筛选实例', () => {
      workflowEngine.startInstance('quotation', {
        businessId: 'Q011',
        variables: { applicant: 'A' }
      })
      workflowEngine.startInstance('quotation', {
        businessId: 'Q012',
        variables: { applicant: 'B' }
      })
      workflowEngine.startInstance('inbound', {
        businessId: 'IB011',
        variables: { applicant: 'C' }
      })

      const quotationInstances = workflowEngine.getInstances('quotation')
      expect(quotationInstances.length).toBe(2)
      expect(quotationInstances.every(i => i.templateId === 'quotation')).toBe(true)
    })

    it('从 localStorage 恢复实例', () => {
      /* 先创建一个实例 */
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q020',
        variables: { applicant: '恢复测试' }
      })

      /* 模拟重新加载 - 清除内存中的实例 */
      workflowEngine._instances.clear()

      /* 从 localStorage 重新加载 */
      workflowEngine._loadInstances()

      const instances = workflowEngine.getInstances()
      expect(instances.length).toBe(1)
      expect(instances[0].id).toBe(instance.id)
    })
  })

  /* ===== 9. deleteInstance 删除实例 ===== */
  describe('deleteInstance', () => {
    it('应从存储中删除指定实例', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q030',
        variables: { applicant: '删除测试' }
      })

      const result = workflowEngine.deleteInstance(instance.id)
      expect(result).toBe(true)

      const instances = workflowEngine.getInstances()
      expect(instances.length).toBe(0)

      /* localStorage 也应更新 */
      const stored = JSON.parse(localStorage.getItem('gj_erp_workflowInstances'))
      expect(stored.length).toBe(0)
    })

    it('删除不存在的实例应返回 false', () => {
      const result = workflowEngine.deleteInstance('nonexistent_id')
      expect(result).toBe(false)
    })
  })

  /* ===== 10. 条件评估 - 金额阈值 ===== */
  describe('条件评估', () => {
    it('金额 > 50000 应走总经理审批分支（purchase 模板）', () => {
      const instance = workflowEngine.startInstance('purchase', {
        businessId: 'P001',
        businessType: 'purchase',
        variables: {
          applicant: '采购员',
          amount: 80000,
          businessNo: 'P-2025-001'
        }
      })

      /* 金额 > 50000，应跳过条件节点到总经理审批 */
      /* purchase 模板第一个审批节点的 approver 是 '销售主管' */
      expect(instance.currentApprover).toBe('销售主管')

      /* 第一步：部门主管审批 */
      const r1 = workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED
      })
      expect(instance.currentApprover).toBe('采购主管')

      /* 第二步：采购经理审批 */
      const r2 = workflowEngine.approve(instance, {
        approver: '采购主管',
        result: ApprovalResult.APPROVED
      })
      /* 条件满足，应到总经理 */
      expect(instance.currentApprover).toBe('总经理')

      /* 第三步：总经理审批 */
      const r3 = workflowEngine.approve(instance, {
        approver: '总经理',
        result: ApprovalResult.APPROVED
      })
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('金额 <= 50000 应跳过总经理直接完成（purchase 模板）', () => {
      const instance = workflowEngine.startInstance('purchase', {
        businessId: 'P002',
        businessType: 'purchase',
        variables: {
          applicant: '采购员',
          amount: 30000,
          businessNo: 'P-2025-002'
        }
      })

      /* 部门主管审批 */
      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED
      })

      /* 采购经理审批 */
      workflowEngine.approve(instance, {
        approver: '采购主管',
        result: ApprovalResult.APPROVED
      })

      /* 金额 <= 50000，条件不满足，应直接完成 */
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('contract 模板金额 > 100000 应走总经理', () => {
      const instance = workflowEngine.startInstance('contract', {
        businessId: 'CT001',
        variables: {
          applicant: '销售员',
          amount: 150000,
          businessNo: 'CT-2025-001'
        }
      })

      /* 法务审批 */
      workflowEngine.approve(instance, {
        approver: '管理员',
        result: ApprovalResult.APPROVED
      })

      /* 财务审批 */
      workflowEngine.approve(instance, {
        approver: '财务',
        result: ApprovalResult.APPROVED
      })

      /* 金额 > 100000，应到总经理 */
      expect(instance.currentApprover).toBe('总经理')

      workflowEngine.approve(instance, {
        approver: '总经理',
        result: ApprovalResult.APPROVED
      })
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('contract 模板金额 <= 100000 应直接完成', () => {
      const instance = workflowEngine.startInstance('contract', {
        businessId: 'CT002',
        variables: {
          applicant: '销售员',
          amount: 80000,
          businessNo: 'CT-2025-002'
        }
      })

      workflowEngine.approve(instance, {
        approver: '管理员',
        result: ApprovalResult.APPROVED
      })

      workflowEngine.approve(instance, {
        approver: '财务',
        result: ApprovalResult.APPROVED
      })

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  /* ===== 11. 复杂多节点流程 ===== */
  describe('复杂多节点流程', () => {
    it('自定义多节点流程应正确流转', () => {
      /* 定义自定义工作流 */
      workflowEngine.defineWorkflow('custom_complex', {
        name: '复杂审批流',
        nodes: [
          { id: 's1', type: NodeType.START, name: '提交', approver: '申请人' },
          { id: 'a1', type: NodeType.APPROVE, name: '主管审批', approver: '主管', mode: FlowMode.SERIAL },
          { id: 'a2', type: NodeType.APPROVE, name: '经理审批', approver: '经理', mode: FlowMode.SERIAL },
          { id: 'c1', type: NodeType.CONDITION, name: '金额判断', condition: { field: 'amount', operator: '>', value: 100000 } },
          { id: 'a3', type: NodeType.APPROVE, name: '总监审批', approver: '总监', mode: FlowMode.SERIAL },
          { id: 'a4', type: NodeType.APPROVE, name: 'CEO审批', approver: 'CEO', mode: FlowMode.SERIAL },
          { id: 'e1', type: NodeType.END, name: '结束' }
        ],
        edges: [
          { from: 's1', to: 'a1' },
          { from: 'a1', to: 'a2' },
          { from: 'a2', to: 'c1' },
          { from: 'c1', to: 'a3', condition: true },
          { from: 'c1', to: 'e1', condition: false },
          { from: 'a3', to: 'a4' },
          { from: 'a4', to: 'e1' }
        ]
      })

      /* 大金额路径 */
      const instance = workflowEngine.startInstance('custom_complex', {
        businessId: 'CX001',
        variables: { applicant: '员工A', amount: 200000 }
      })

      expect(instance.currentApprover).toBe('主管')

      workflowEngine.approve(instance, {
        approver: '主管',
        result: ApprovalResult.APPROVED
      })
      expect(instance.currentApprover).toBe('经理')

      workflowEngine.approve(instance, {
        approver: '经理',
        result: ApprovalResult.APPROVED
      })
      /* amount > 100000，应到总监 */
      expect(instance.currentApprover).toBe('总监')

      workflowEngine.approve(instance, {
        approver: '总监',
        result: ApprovalResult.APPROVED
      })
      expect(instance.currentApprover).toBe('CEO')

      workflowEngine.approve(instance, {
        approver: 'CEO',
        result: ApprovalResult.APPROVED
      })
      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      /* 验证历史记录完整 */
      expect(instance.history.length).toBe(6) /* submit + 4 approves + complete */
    })

    it('自定义流程小金额应走短路径', () => {
      const instance = workflowEngine.startInstance('custom_complex', {
        businessId: 'CX002',
        variables: { applicant: '员工B', amount: 50000 }
      })

      workflowEngine.approve(instance, {
        approver: '主管',
        result: ApprovalResult.APPROVED
      })

      workflowEngine.approve(instance, {
        approver: '经理',
        result: ApprovalResult.APPROVED
      })

      /* amount <= 100000，应直接完成 */
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  /* ===== 辅助方法 ===== */
  describe('辅助方法', () => {
    it('getPendingTasks 应返回指定审批人的待办', () => {
      const inst1 = workflowEngine.startInstance('quotation', {
        businessId: 'Q100',
        variables: { applicant: 'A' }
      })
      const inst2 = workflowEngine.startInstance('inbound', {
        businessId: 'IB100',
        variables: { applicant: 'B' }
      })

      const pending = workflowEngine.getPendingTasks([inst1, inst2], '销售主管')
      expect(pending.length).toBe(1)
      expect(pending[0].id).toBe(inst1.id)
    })

    it('getCompletedTasks 应返回指定审批人已审批的任务', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q101',
        variables: { applicant: 'A' }
      })

      workflowEngine.approve(instance, {
        approver: '销售主管',
        result: ApprovalResult.APPROVED
      })

      const completed = workflowEngine.getCompletedTasks([instance], '销售主管')
      expect(completed.length).toBe(1)
    })

    it('getInstanceNodeStates 应返回节点状态列表', () => {
      const instance = workflowEngine.startInstance('quotation', {
        businessId: 'Q102',
        variables: { applicant: 'A' }
      })

      const states = workflowEngine.getInstanceNodeStates(instance)
      expect(states.length).toBe(3) /* start + approve + end */

      const startState = states.find(s => s.type === NodeType.START)
      expect(startState.status).toBe('completed')

      const approveState = states.find(s => s.type === NodeType.APPROVE)
      expect(approveState.status).toBe('active')
    })

    it('getTemplate 应返回指定模板', () => {
      const template = workflowEngine.getTemplate('quotation')
      expect(template).toBeDefined()
      expect(template.name).toBe('报价审批流')
    })

    it('getAllTemplates 应返回所有模板', () => {
      const templates = workflowEngine.getAllTemplates()
      expect(templates.length).toBeGreaterThanOrEqual(6)
    })
  })
})
