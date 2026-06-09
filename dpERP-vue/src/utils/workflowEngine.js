/**
 * 工作流引擎 - 审批流程定义与执行
 * 支持：串行/并行/会签/或签、条件分支、委托/转办、加签、超时检查
 */

import { generateId } from '@/utils/uid'
import eventBus from '@/utils/eventBus'

/* 节点类型常量 */
export const NodeType = {
  START: 'start',
  APPROVE: 'approve',
  CONDITION: 'condition',
  END: 'end'
}

/* 流转模式 */
export const FlowMode = {
  SERIAL: 'serial',       // 串行
  PARALLEL: 'parallel',   // 并行
  COUNTERSIGN: 'countersign', // 会签（全部通过）
  ORSIGN: 'orsign'        // 或签（任一通过）
}

/* 实例状态 */
export const InstanceStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
}

/* 审批结果 */
export const ApprovalResult = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/* 预定义工作流模板 */
export const WORKFLOW_TEMPLATES = {
  purchase: {
    id: 'purchase',
    name: '采购审批流',
    description: '采购申请审批流程，金额超过5万需总经理审批',
    icon: 'package',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '部门主管审批', approver: '销售主管', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.APPROVE, name: '采购经理审批', approver: '采购主管', mode: FlowMode.SERIAL },
      { id: 'n4', type: NodeType.CONDITION, name: '金额判断', condition: { field: 'amount', operator: '>', value: 50000 } },
      { id: 'n5', type: NodeType.APPROVE, name: '总经理审批', approver: '总经理', mode: FlowMode.SERIAL },
      { id: 'n6', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5', condition: true },
      { from: 'n4', to: 'n6', condition: false },
      { from: 'n5', to: 'n6' }
    ]
  },
  quotation: {
    id: 'quotation',
    name: '报价审批流',
    description: '报价申请审批流程',
    icon: 'dollar',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '销售经理审批', approver: '销售主管', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },
  contract: {
    id: 'contract',
    name: '合同审批流',
    description: '合同签署审批流程，金额超过10万需总经理审批',
    icon: 'file',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '法务审批', approver: '管理员', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.APPROVE, name: '财务审批', approver: '财务', mode: FlowMode.SERIAL },
      { id: 'n4', type: NodeType.CONDITION, name: '金额判断', condition: { field: 'amount', operator: '>', value: 100000 } },
      { id: 'n5', type: NodeType.APPROVE, name: '总经理审批', approver: '总经理', mode: FlowMode.SERIAL },
      { id: 'n6', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5', condition: true },
      { from: 'n4', to: 'n6', condition: false },
      { from: 'n5', to: 'n6' }
    ]
  },
  inbound: {
    id: 'inbound',
    name: '入库确认流',
    description: '入库质检确认流程',
    icon: 'upload',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '质检确认', approver: '仓管员', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.APPROVE, name: '仓库主管审批', approver: '仓库主管', mode: FlowMode.SERIAL },
      { id: 'n4', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }
    ]
  },
  outbound: {
    id: 'outbound',
    name: '出库审批流',
    description: '出库申请审批流程',
    icon: 'download',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '仓库主管审批', approver: '仓库主管', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },
  payment: {
    id: 'payment',
    name: '付款审批流',
    description: '付款申请审批流程，金额超过3万需总经理审批',
    icon: 'creditCard',
    nodes: [
      { id: 'n1', type: NodeType.START, name: '提交申请', approver: '申请人' },
      { id: 'n2', type: NodeType.APPROVE, name: '财务审批', approver: '财务', mode: FlowMode.SERIAL },
      { id: 'n3', type: NodeType.CONDITION, name: '金额判断', condition: { field: 'amount', operator: '>', value: 30000 } },
      { id: 'n4', type: NodeType.APPROVE, name: '总经理审批', approver: '总经理', mode: FlowMode.SERIAL },
      { id: 'n5', type: NodeType.END, name: '完成' }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4', condition: true },
      { from: 'n3', to: 'n5', condition: false },
      { from: 'n4', to: 'n5' }
    ]
  }
}

class WorkflowEngine {
  constructor() {
    this._templates = new Map()
    /* 注册预定义模板 */
    Object.values(WORKFLOW_TEMPLATES).forEach(t => {
      this._templates.set(t.id, t)
    })
  }

  /**
   * 定义工作流模板
   */
  defineWorkflow(templateId, { name, nodes, edges, conditions }) {
    const template = {
      id: templateId,
      name,
      nodes: nodes || [],
      edges: edges || [],
      conditions: conditions || {}
    }
    this._templates.set(templateId, template)
    return template
  }

  /**
   * 获取模板
   */
  getTemplate(templateId) {
    return this._templates.get(templateId)
  }

  /**
   * 获取所有模板
   */
  getAllTemplates() {
    return Array.from(this._templates.values())
  }

  /**
   * 启动工作流实例
   */
  startInstance(templateId, { businessId, businessType, variables = {} }) {
    const template = this._templates.get(templateId)
    if (!template) {
      console.error(`[WorkflowEngine] 模板不存在: ${templateId}`)
      return null
    }

    /* 找到起始节点的下一个节点（第一个审批节点） */
    const startNode = template.nodes.find(n => n.type === NodeType.START)
    if (!startNode) {
      console.error(`[WorkflowEngine] 模板缺少起始节点: ${templateId}`)
      return null
    }

    const nextEdges = template.edges.filter(e => e.from === startNode.id)
    let currentNode = null
    /* 跳过条件节点，找到第一个审批节点 */
    for (const edge of nextEdges) {
      const targetNode = template.nodes.find(n => n.id === edge.to)
      if (targetNode) {
        currentNode = this._resolveNextNode(template, targetNode, variables)
        break
      }
    }

    const instance = {
      id: generateId('wf'),
      templateId,
      templateName: template.name,
      businessId: businessId || '',
      businessType: businessType || '',
      businessNo: variables.businessNo || '',
      status: InstanceStatus.RUNNING,
      currentNode: currentNode ? currentNode.id : null,
      currentApprover: currentNode ? currentNode.approver : '',
      variables,
      startTime: new Date().toISOString(),
      endTime: null,
      history: [{
        node: startNode.name,
        nodeId: startNode.id,
        approver: variables.applicant || '申请人',
        action: 'submit',
        comment: '提交申请',
        time: new Date().toISOString()
      }],
      addedApprovers: [],
      timeoutHours: variables.timeoutHours || 48
    }

    /* 发布工作流启动事件 */
    eventBus.emit('workflow:started', {
      instanceId: instance.id,
      templateId,
      businessId,
      businessType,
      currentApprover: instance.currentApprover
    })

    /* 发布审批待办事件 */
    if (instance.currentApprover) {
      eventBus.emit('workflow:pending', {
        instanceId: instance.id,
        templateId,
        templateName: template.name,
        businessNo: instance.businessNo,
        approver: instance.currentApprover,
        businessType
      })
    }

    return instance
  }

  /**
   * 执行审批动作
   */
  approve(instance, { approver, comment, result, delegateTo }) {
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return { success: false, message: '流程实例不在运行状态' }
    }

    const template = this._templates.get(instance.templateId)
    if (!template) {
      return { success: false, message: '工作流模板不存在' }
    }

    const currentNode = template.nodes.find(n => n.id === instance.currentNode)
    if (!currentNode) {
      return { success: false, message: '当前节点不存在' }
    }

    /* 记录审批历史 */
    const historyEntry = {
      node: currentNode.name,
      nodeId: currentNode.id,
      approver: approver || instance.currentApprover,
      action: result,
      comment: comment || (result === ApprovalResult.APPROVED ? '同意' : '拒绝'),
      time: new Date().toISOString()
    }
    instance.history.push(historyEntry)

    /* 如果是拒绝，流程结束 */
    if (result === ApprovalResult.REJECTED) {
      instance.status = InstanceStatus.REJECTED
      instance.endTime = new Date().toISOString()
      instance.currentApprover = ''

      eventBus.emit('workflow:rejected', {
        instanceId: instance.id,
        templateId: instance.templateId,
        businessId: instance.businessId,
        businessType: instance.businessType,
        approver,
        comment
      })

      return { success: true, instance, message: '审批已拒绝，流程结束' }
    }

    /* 审批通过，流转到下一节点 */
    const nextNode = this._findNextNode(template, currentNode, instance.variables)
    if (!nextNode || nextNode.type === NodeType.END) {
      /* 流程结束 */
      instance.status = InstanceStatus.COMPLETED
      instance.endTime = new Date().toISOString()
      instance.currentNode = nextNode ? nextNode.id : null
      instance.currentApprover = ''

      /* 记录到达结束节点 */
      instance.history.push({
        node: nextNode ? nextNode.name : '结束',
        nodeId: nextNode ? nextNode.id : 'end',
        approver: '系统',
        action: 'complete',
        comment: '流程完成',
        time: new Date().toISOString()
      })

      eventBus.emit('workflow:completed', {
        instanceId: instance.id,
        templateId: instance.templateId,
        businessId: instance.businessId,
        businessType: instance.businessType
      })

      return { success: true, instance, message: '审批通过，流程已完成' }
    }

    /* 流转到下一审批节点 */
    instance.currentNode = nextNode.id
    instance.currentApprover = nextNode.approver

    /* 发布审批待办事件 */
    eventBus.emit('workflow:pending', {
      instanceId: instance.id,
      templateId: instance.templateId,
      templateName: template.name,
      businessNo: instance.businessNo,
      approver: nextNode.approver,
      businessType: instance.businessType
    })

    return { success: true, instance, message: `审批通过，已流转至: ${nextNode.name}` }
  }

  /**
   * 委托/转办
   */
  delegate(instance, { from, to, reason }) {
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return { success: false, message: '流程实例不在运行状态' }
    }

    const oldApprover = instance.currentApprover
    instance.currentApprover = to
    instance.history.push({
      node: '委托',
      nodeId: instance.currentNode,
      approver: from || oldApprover,
      action: 'delegate',
      comment: `委托给 ${to}，原因: ${reason || '无'}`,
      time: new Date().toISOString()
    })

    /* 发布委托事件 */
    eventBus.emit('workflow:delegated', {
      instanceId: instance.id,
      from: from || oldApprover,
      to,
      reason
    })

    /* 发布新的待办事件 */
    eventBus.emit('workflow:pending', {
      instanceId: instance.id,
      templateId: instance.templateId,
      templateName: instance.templateName,
      businessNo: instance.businessNo,
      approver: to,
      businessType: instance.businessType
    })

    return { success: true, instance, message: `已委托给 ${to}` }
  }

  /**
   * 加签
   */
  addApprover(instance, { approver, reason }) {
    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return { success: false, message: '流程实例不在运行状态' }
    }

    instance.addedApprovers = instance.addedApprovers || []
    instance.addedApprovers.push({
      approver,
      reason: reason || '加签',
      time: new Date().toISOString()
    })

    instance.history.push({
      node: '加签',
      nodeId: instance.currentNode,
      approver: instance.currentApprover,
      action: 'addApprover',
      comment: `加签 ${approver}，原因: ${reason || '无'}`,
      time: new Date().toISOString()
    })

    /* 发布加签待办事件 */
    eventBus.emit('workflow:pending', {
      instanceId: instance.id,
      templateId: instance.templateId,
      templateName: instance.templateName,
      businessNo: instance.businessNo,
      approver,
      businessType: instance.businessType
    })

    return { success: true, instance, message: `已加签 ${approver}` }
  }

  /**
   * 获取待办任务
   */
  getPendingTasks(instances, approver) {
    return instances.filter(inst => {
      if (inst.status !== InstanceStatus.RUNNING) return false
      /* 当前审批人匹配，或被加签人匹配 */
      if (inst.currentApprover === approver) return true
      if (inst.addedApprovers && inst.addedApprovers.some(a => a.approver === approver)) return true
      return false
    })
  }

  /**
   * 获取已办任务
   */
  getCompletedTasks(instances, approver) {
    return instances.filter(inst => {
      return inst.history.some(h => h.approver === approver && (h.action === 'approved' || h.action === 'rejected'))
    })
  }

  /**
   * 超时检查
   */
  checkTimeout(instances) {
    const now = new Date()
    const timeoutList = []

    instances.forEach(inst => {
      if (inst.status !== InstanceStatus.RUNNING) return
      const startTime = new Date(inst.startTime)
      const hoursDiff = (now - startTime) / (1000 * 60 * 60)
      if (hoursDiff > (inst.timeoutHours || 48)) {
        timeoutList.push({
          instanceId: inst.id,
          templateName: inst.templateName,
          currentApprover: inst.currentApprover,
          hoursOverdue: Math.round(hoursDiff - (inst.timeoutHours || 48)),
          instance: inst
        })
      }
    })

    return timeoutList
  }

  /**
   * 解析下一个有效节点（跳过条件节点）
   */
  _resolveNextNode(template, node, variables) {
    if (node.type === NodeType.CONDITION) {
      const conditionMet = this._evaluateCondition(node.condition, variables)
      const matchingEdge = template.edges.find(e => e.from === node.id && e.condition === conditionMet)
      if (matchingEdge) {
        const targetNode = template.nodes.find(n => n.id === matchingEdge.to)
        if (targetNode) {
          return this._resolveNextNode(template, targetNode, variables)
        }
      }
      /* 条件不匹配时走 false 分支 */
      const falseEdge = template.edges.find(e => e.from === node.id && e.condition === false)
      if (falseEdge) {
        const targetNode = template.nodes.find(n => n.id === falseEdge.to)
        if (targetNode) {
          return this._resolveNextNode(template, targetNode, variables)
        }
      }
      return null
    }
    return node
  }

  /**
   * 查找下一个节点
   */
  _findNextNode(template, currentNode, variables) {
    const edges = template.edges.filter(e => e.from === currentNode.id)
    if (edges.length === 0) return null

    for (const edge of edges) {
      /* 如果有条件，评估条件 */
      if (edge.condition !== undefined) {
        /* 检查当前节点是否为条件节点的上游 */
        const targetNode = template.nodes.find(n => n.id === edge.to)
        if (!targetNode) continue

        /* 如果目标是条件节点，评估条件 */
        const prevNode = template.nodes.find(n => n.id === edge.from)
        if (prevNode && prevNode.type === NodeType.CONDITION) {
          const conditionMet = this._evaluateCondition(prevNode.condition, variables)
          if (edge.condition === conditionMet) {
            return this._resolveNextNode(template, targetNode, variables)
          }
        }
      } else {
        const targetNode = template.nodes.find(n => n.id === edge.to)
        if (targetNode) {
          return this._resolveNextNode(template, targetNode, variables)
        }
      }
    }
    return null
  }

  /**
   * 评估条件
   */
  _evaluateCondition(condition, variables) {
    if (!condition) return true
    const { field, operator, value } = condition
    const fieldValue = variables[field]
    if (fieldValue === undefined || fieldValue === null) return false

    switch (operator) {
      case '>': return Number(fieldValue) > Number(value)
      case '>=': return Number(fieldValue) >= Number(value)
      case '<': return Number(fieldValue) < Number(value)
      case '<=': return Number(fieldValue) <= Number(value)
      case '==': return fieldValue == value
      case '!=': return fieldValue != value
      default: return true
    }
  }

  /**
   * 获取实例的流程节点列表（含状态）
   */
  getInstanceNodeStates(instance) {
    const template = this._templates.get(instance.templateId)
    if (!template) return []

    const completedNodeIds = instance.history.map(h => h.nodeId)
    const rejected = instance.history.find(h => h.action === 'rejected')

    return template.nodes.map(node => {
      let status = 'pending'
      if (node.type === NodeType.START || completedNodeIds.includes(node.id)) {
        status = 'completed'
      }
      if (node.id === instance.currentNode && instance.status === InstanceStatus.RUNNING) {
        status = 'active'
      }
      if (rejected && node.id === rejected.nodeId) {
        status = 'rejected'
      }
      /* 条件节点跟随上游状态 */
      if (node.type === NodeType.CONDITION) {
        const prevEdge = template.edges.find(e => e.to === node.id)
        if (prevEdge) {
          const prevNode = template.nodes.find(n => n.id === prevEdge.from)
          if (prevNode && completedNodeIds.includes(prevNode.id)) {
            status = 'completed'
          }
        }
      }

      return {
        ...node,
        status
      }
    })
  }
}

/* 全局单例 */
const workflowEngine = new WorkflowEngine()

export default workflowEngine
