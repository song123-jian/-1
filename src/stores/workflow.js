import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import workflowEngine, { WORKFLOW_TEMPLATES, InstanceStatus } from '@/utils/workflowEngine'
import { generateId } from '@/utils/uid'

const STORAGE_KEY = 'gj_erp_workflowInstances'
const INIT_KEY = 'gj_erp_workflow_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[workflow] localStorage容量不足，数据可能丢失！')
    }
  }
}

export const useWorkflowStore = defineStore('workflow', () => {
  /* 获取当前用户 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  /* 工作流模板列表 */
  const templates = ref(workflowEngine.getAllTemplates())

  /* 工作流实例列表 */
  const instances = ref(load(STORAGE_KEY, []))

  /* 当前角色的待办任务 */
  const pendingTasks = computed(() => {
    const user = getCurrentUser()
    return workflowEngine.getPendingTasks(instances.value, user)
  })

  /* 当前角色的已办任务 */
  const completedTasks = computed(() => {
    const user = getCurrentUser()
    return workflowEngine.getCompletedTasks(instances.value, user)
  })

  /* 运行中的实例 */
  const runningInstances = computed(() => {
    return instances.value.filter(i => i.status === InstanceStatus.RUNNING)
  })

  /* 已完成的实例 */
  const completedInstances = computed(() => {
    return instances.value.filter(i => i.status === InstanceStatus.COMPLETED)
  })

  /* 统计 */
  const stats = computed(() => ({
    total: instances.value.length,
    running: runningInstances.value.length,
    completed: completedInstances.value.length,
    rejected: instances.value.filter(i => i.status === InstanceStatus.REJECTED).length,
    pendingCount: pendingTasks.value.length
  }))

  /* 持久化 */
  function _persist() {
    persist(STORAGE_KEY, instances.value)
  }

  /**
   * 启动工作流
   */
  function startWorkflow(templateId, businessId, businessType, businessNo, variables = {}) {
    const instance = workflowEngine.startInstance(templateId, {
      businessId,
      businessType,
      variables: { ...variables, businessNo, applicant: getCurrentUser() }
    })
    if (!instance) return null

    instances.value.unshift(instance)
    _persist()
    return instance
  }

  /**
   * 审批任务
   */
  function approveTask(instanceId, result, comment) {
    const idx = instances.value.findIndex(i => i.id === instanceId)
    if (idx === -1) return { success: false, message: '实例不存在' }

    const instance = instances.value[idx]
    const res = workflowEngine.approve(instance, {
      approver: getCurrentUser(),
      comment,
      result
    })

    if (res.success) {
      instances.value[idx] = { ...res.instance }
      _persist()
    }
    return res
  }

  /**
   * 委托任务
   */
  function delegateTask(instanceId, to, reason) {
    const idx = instances.value.findIndex(i => i.id === instanceId)
    if (idx === -1) return { success: false, message: '实例不存在' }

    const instance = instances.value[idx]
    const res = workflowEngine.delegate(instance, {
      from: getCurrentUser(),
      to,
      reason
    })

    if (res.success) {
      instances.value[idx] = { ...res.instance }
      _persist()
    }
    return res
  }

  /**
   * 加签
   */
  function addApprover(instanceId, approver, reason) {
    const idx = instances.value.findIndex(i => i.id === instanceId)
    if (idx === -1) return { success: false, message: '实例不存在' }

    const instance = instances.value[idx]
    const res = workflowEngine.addApprover(instance, {
      approver,
      reason
    })

    if (res.success) {
      instances.value[idx] = { ...res.instance }
      _persist()
    }
    return res
  }

  /**
   * 取消流程
   */
  function cancelInstance(instanceId) {
    const idx = instances.value.findIndex(i => i.id === instanceId)
    if (idx === -1) return false

    instances.value[idx].status = InstanceStatus.CANCELLED
    instances.value[idx].endTime = new Date().toISOString()
    instances.value[idx].currentApprover = ''
    instances.value[idx].history.push({
      node: '取消',
      nodeId: 'cancel',
      approver: getCurrentUser(),
      action: 'cancel',
      comment: '流程已取消',
      time: new Date().toISOString()
    })
    _persist()
    return true
  }

  /**
   * 获取实例的节点状态
   */
  function getInstanceNodeStates(instanceId) {
    const instance = instances.value.find(i => i.id === instanceId)
    if (!instance) return []
    return workflowEngine.getInstanceNodeStates(instance)
  }

  /**
   * 超时检查
   */
  function checkTimeout() {
    return workflowEngine.checkTimeout(instances.value)
  }

  /**
   * 初始化模拟数据
   */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    const now = new Date()
    const hour = 3600000
    const seeds = [
      /* 采购审批 - 运行中，在部门主管审批阶段 */
      (() => {
        const inst = workflowEngine.startInstance('purchase', {
          businessId: 'PO-2024-001',
          businessType: 'purchase',
          variables: { amount: 68000, businessNo: 'PO-2024-001', applicant: '销售员' }
        })
        return inst
      })(),
      /* 报价审批 - 运行中，在销售经理审批阶段 */
      (() => {
        const inst = workflowEngine.startInstance('quotation', {
          businessId: 'QT-2024-015',
          businessType: 'quotation',
          variables: { amount: 25000, businessNo: 'QT-2024-015', applicant: '销售员' }
        })
        return inst
      })(),
      /* 合同审批 - 运行中，在法务审批阶段 */
      (() => {
        const inst = workflowEngine.startInstance('contract', {
          businessId: 'CT-2024-008',
          businessType: 'contract',
          variables: { amount: 150000, businessNo: 'CT-2024-008', applicant: '销售员' }
        })
        return inst
      })(),
      /* 入库确认 - 运行中，在质检确认阶段 */
      (() => {
        const inst = workflowEngine.startInstance('inbound', {
          businessId: 'IB-2024-003',
          businessType: 'inbound',
          variables: { amount: 0, businessNo: 'IB-2024-003', applicant: '仓管员' }
        })
        return inst
      })(),
      /* 付款审批 - 已完成 */
      (() => {
        const inst = workflowEngine.startInstance('payment', {
          businessId: 'PAY-2024-002',
          businessType: 'payment',
          variables: { amount: 15000, businessNo: 'PAY-2024-002', applicant: '销售员' }
        })
        if (inst) {
          /* 模拟审批通过 */
          workflowEngine.approve(inst, { approver: '财务', comment: '同意付款', result: 'approved' })
        }
        return inst
      })()
    ].filter(Boolean)

    instances.value = seeds
    _persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /**
   * 清除初始化标记（用于重置测试数据）
   */
  function resetSeedData() {
    localStorage.removeItem(INIT_KEY)
    localStorage.removeItem(STORAGE_KEY)
    instances.value = []
  }

  return {
    templates,
    instances,
    pendingTasks,
    completedTasks,
    runningInstances,
    completedInstances,
    stats,
    startWorkflow,
    approveTask,
    delegateTask,
    addApprover,
    cancelInstance,
    getInstanceNodeStates,
    checkTimeout,
    initSeedData,
    resetSeedData
  }
})
