<template>
  <div class="workflow-design">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">工作流管理</h2>
        <span class="page-desc">审批流程配置与任务管理</span>
      </div>
      <div class="header-right">
        <span class="stat-badge pending">{{ workflowStore.stats.pendingCount }} 待办</span>
        <span class="stat-badge running">{{ workflowStore.stats.running }} 进行中</span>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- 工作流模板 Tab -->
    <div v-if="activeTab === 'templates'" class="tab-content">
      <div class="template-grid">
        <div
          v-for="tpl in workflowStore.templates"
          :key="tpl.id"
          class="template-card"
          @click="showTemplateDetail(tpl)"
        >
          <div class="tpl-icon">
            <Icon :name="tpl.icon || 'layers'" :size="24" />
          </div>
          <div class="tpl-info">
            <div class="tpl-name">{{ tpl.name }}</div>
            <div class="tpl-desc">{{ tpl.description }}</div>
          </div>
          <div class="tpl-nodes-count">{{ tpl.nodes.length }} 个节点</div>
        </div>
      </div>
    </div>

    <!-- 待办任务 Tab -->
    <div v-if="activeTab === 'pending'" class="tab-content">
      <div v-if="pendingList.length" class="task-list">
        <div
          v-for="task in pendingList"
          :key="task.id"
          class="task-card"
          :class="{ 'task-expanded': expandedTaskId === task.id }"
        >
          <div class="task-header" @click="toggleTaskExpand(task.id)">
            <div class="task-main">
              <div class="task-badge pending">待审批</div>
              <div class="task-info">
                <div class="task-title">{{ task.templateName }}</div>
                <div class="task-meta">
                  <span>{{ task.businessNo }}</span>
                  <span class="meta-divider">|</span>
                  <span>当前: {{ task.currentApprover }}</span>
                  <span v-if="task.variables?.amount" class="meta-divider">|</span>
                  <span v-if="task.variables?.amount">金额: ¥{{ Number(task.variables.amount).toLocaleString() }}</span>
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button class="btn btn-sm btn-primary" @click.stop="openApproval(task)">审批</button>
              <Icon :name="expandedTaskId === task.id ? 'chevronUp' : 'chevronDown'" :size="16" class="expand-icon" />
            </div>
          </div>
          <div v-if="expandedTaskId === task.id" class="task-detail">
            <WorkflowNode :nodes="getNodeStates(task.id)" />
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <Icon name="checkCircle" :size="48" />
        <p>暂无待办任务</p>
      </div>
    </div>

    <!-- 已办任务 Tab -->
    <div v-if="activeTab === 'completed'" class="tab-content">
      <div v-if="completedList.length" class="task-list">
        <div
          v-for="task in completedList"
          :key="task.id"
          class="task-card"
        >
          <div class="task-header">
            <div class="task-main">
              <div class="task-badge" :class="task.status === 'completed' ? 'completed' : 'rejected'">
                {{ task.status === 'completed' ? '已通过' : '已拒绝' }}
              </div>
              <div class="task-info">
                <div class="task-title">{{ task.templateName }}</div>
                <div class="task-meta">
                  <span>{{ task.businessNo }}</span>
                  <span class="meta-divider">|</span>
                  <span>{{ formatTime(task.endTime) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <Icon name="clock" :size="48" />
        <p>暂无已办任务</p>
      </div>
    </div>

    <!-- 流程实例 Tab -->
    <div v-if="activeTab === 'instances'" class="tab-content">
      <div class="instance-toolbar">
        <select v-model="instanceFilter" class="filter-select">
          <option value="all">全部状态</option>
          <option value="running">运行中</option>
          <option value="completed">已完成</option>
          <option value="rejected">已拒绝</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div v-if="filteredList.length" class="instance-table-wrap">
        <table class="instance-table">
          <thead>
            <tr>
              <th>流程名称</th>
              <th>业务单号</th>
              <th>当前节点</th>
              <th>状态</th>
              <th>启动时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inst in filteredList" :key="inst.id">
              <td>{{ inst.templateName }}</td>
              <td>{{ inst.businessNo }}</td>
              <td>{{ inst.currentApprover || '-' }}</td>
              <td>
                <span class="status-tag" :class="`status-${inst.status}`">
                  {{ getStatusLabel(inst.status) }}
                </span>
              </td>
              <td>{{ formatTime(inst.startTime) }}</td>
              <td>
                <button class="btn btn-sm" @click="viewInstance(inst)">查看</button>
                <button
                  v-if="inst.status === 'running'"
                  class="btn btn-sm btn-danger"
                  @click="handleCancel(inst.id)"
                >取消</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <Icon name="layers" :size="48" />
        <p>暂无流程实例</p>
      </div>
    </div>

    <!-- 审批弹窗 -->
    <Teleport to="body">
      <div v-if="showApprovalModal" class="modal-overlay" @click.self="closeApprovalModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3>审批处理 - {{ approvalInstance?.templateName }}</h3>
            <button class="modal-close" @click="closeApprovalModal">
              <Icon name="close" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <div class="approval-info">
              <div class="info-row">
                <span class="info-label">业务单号</span>
                <span class="info-value">{{ approvalInstance?.businessNo }}</span>
              </div>
              <div v-if="approvalInstance?.variables?.amount" class="info-row">
                <span class="info-label">金额</span>
                <span class="info-value">¥{{ Number(approvalInstance.variables.amount).toLocaleString() }}</span>
              </div>
            </div>
            <div class="approval-flow">
              <div class="flow-title">流程进度</div>
              <WorkflowNode :nodes="getNodeStates(approvalInstance?.id)" />
            </div>
            <ApprovalAction
              :instance="approvalInstance"
              @approved="onApprovalDone"
              @delegated="onApprovalDone"
              @added-approver="onApprovalDone"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 模板详情弹窗 -->
    <Teleport to="body">
      <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3>{{ detailTemplate?.name }}</h3>
            <button class="modal-close" @click="showTemplateModal = false">
              <Icon name="close" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <div class="tpl-detail-desc">{{ detailTemplate?.description }}</div>
            <div class="flow-title">流程节点</div>
            <WorkflowNode :nodes="detailTemplate?.nodes || []" />
            <div class="tpl-detail-edges">
              <div class="flow-title">流转规则</div>
              <div v-for="edge in detailTemplate?.edges" :key="`${edge.from}-${edge.to}`" class="edge-item">
                <span class="edge-from">{{ getNodeName(edge.from) }}</span>
                <Icon name="arrowRight" :size="14" />
                <span class="edge-to">{{ getNodeName(edge.to) }}</span>
                <span v-if="edge.condition === true" class="edge-condition">条件满足</span>
                <span v-if="edge.condition === false" class="edge-condition condition-false">条件不满足</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 实例详情弹窗 -->
    <Teleport to="body">
      <div v-if="showInstanceModal" class="modal-overlay" @click.self="showInstanceModal = false">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3>流程实例详情</h3>
            <button class="modal-close" @click="showInstanceModal = false">
              <Icon name="close" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <div v-if="viewingInstance" class="instance-detail">
              <div class="approval-info">
                <div class="info-row">
                  <span class="info-label">流程名称</span>
                  <span class="info-value">{{ viewingInstance.templateName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">业务单号</span>
                  <span class="info-value">{{ viewingInstance.businessNo }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">状态</span>
                  <span class="status-tag" :class="`status-${viewingInstance.status}`">
                    {{ getStatusLabel(viewingInstance.status) }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">启动时间</span>
                  <span class="info-value">{{ formatTime(viewingInstance.startTime) }}</span>
                </div>
                <div v-if="viewingInstance.endTime" class="info-row">
                  <span class="info-label">结束时间</span>
                  <span class="info-value">{{ formatTime(viewingInstance.endTime) }}</span>
                </div>
              </div>
              <div class="flow-title">流程进度</div>
              <WorkflowNode :nodes="getNodeStates(viewingInstance.id)" />
              <ApprovalAction
                v-if="viewingInstance.status === 'running'"
                :instance="viewingInstance"
                @approved="onApprovalDone"
                @delegated="onApprovalDone"
                @added-approver="onApprovalDone"
              />
              <div v-else class="history-section">
                <div class="flow-title">审批历史</div>
                <div class="simple-history">
                  <div v-for="(h, i) in [...(viewingInstance.history || [])].reverse()" :key="i" class="history-item">
                    <span class="history-approver">{{ h.approver }}</span>
                    <span class="history-action">{{ getActionLabel(h.action) }}</span>
                    <span class="history-comment">{{ h.comment }}</span>
                    <span class="history-time">{{ formatTime(h.time) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWorkflowStore } from '@/stores/workflow'
import { InstanceStatus } from '@/utils/workflowEngine'
import WorkflowNode from '@/components/workflow/WorkflowNode.vue'
import ApprovalAction from '@/components/workflow/ApprovalAction.vue'

const workflowStore = useWorkflowStore()

const activeTab = ref('templates')
const expandedTaskId = ref(null)
const showApprovalModal = ref(false)
const approvalInstance = ref(null)
const showTemplateModal = ref(false)
const detailTemplate = ref(null)
const showInstanceModal = ref(false)
const viewingInstance = ref(null)
const instanceFilter = ref('all')

const tabs = computed(() => [
  { key: 'templates', label: '工作流模板', icon: 'layers', badge: 0 },
  { key: 'pending', label: '待办任务', icon: 'clock', badge: workflowStore.pendingTasks.length || 0 },
  { key: 'completed', label: '已办任务', icon: 'checkCircle', badge: 0 },
  { key: 'instances', label: '流程实例', icon: 'list', badge: 0 }
])

const pendingList = computed(() => workflowStore.pendingTasks)
const completedList = computed(() => workflowStore.completedTasks)

const filteredList = computed(() => {
  let list = workflowStore.instances
  if (instanceFilter.value !== 'all') {
    list = list.filter(i => i.status === instanceFilter.value)
  }
  return list
})

function getNodeStates(instanceId) {
  return workflowStore.getInstanceNodeStates(instanceId)
}

function toggleTaskExpand(id) {
  expandedTaskId.value = expandedTaskId.value === id ? null : id
}

function openApproval(task) {
  approvalInstance.value = task
  showApprovalModal.value = true
}

function closeApprovalModal() {
  showApprovalModal.value = false
  approvalInstance.value = null
}

function onApprovalDone() {
  closeApprovalModal()
}

function showTemplateDetail(tpl) {
  detailTemplate.value = tpl
  showTemplateModal.value = true
}

function getNodeName(nodeId) {
  if (!detailTemplate.value) return nodeId
  const node = detailTemplate.value.nodes.find(n => n.id === nodeId)
  return node ? node.name : nodeId
}

function viewInstance(inst) {
  viewingInstance.value = inst
  showInstanceModal.value = true
}

function handleCancel(instanceId) {
  if (confirm('确定要取消该流程吗？')) {
    workflowStore.cancelInstance(instanceId)
  }
}

function getStatusLabel(status) {
  const map = {
    running: '运行中',
    completed: '已完成',
    rejected: '已拒绝',
    cancelled: '已取消'
  }
  return map[status] || status
}

function getActionLabel(action) {
  const map = {
    submit: '提交',
    approved: '通过',
    rejected: '拒绝',
    delegate: '委托',
    addApprover: '加签',
    complete: '完成',
    cancel: '取消'
  }
  return map[action] || action
}

function formatTime(time) {
  if (!time) return '-'
  const d = new Date(time)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  workflowStore.initSeedData()
})
</script>

<style scoped>
.workflow-design {
  padding: var(--space-4);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: var(--space-2);
}

.header-right {
  display: flex;
  gap: var(--space-2);
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.stat-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.stat-badge.running {
  background: #dbeafe;
  color: #2563eb;
}

/* Tab */
.tab-bar {
  display: flex;
  gap: var(--space-1);
  border-bottom: 2px solid var(--color-border);
  margin-bottom: var(--space-4);
  overflow-x: auto;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.tab-badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 模板卡片 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}

.template-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.template-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.tpl-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
  flex-shrink: 0;
}

.tpl-info {
  flex: 1;
  min-width: 0;
}

.tpl-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.tpl-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-nodes-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

/* 任务卡片 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.task-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.task-card:hover {
  border-color: var(--color-accent);
}

.task-card.task-expanded {
  border-color: var(--color-accent);
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}

.task-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

.task-badge {
  display: inline-flex;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  flex-shrink: 0;
}

.task-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.task-badge.completed {
  background: #dcfce7;
  color: #16a34a;
}

.task-badge.rejected {
  background: #fef2f2;
  color: #dc2626;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.meta-divider {
  margin: 0 var(--space-1);
  color: var(--color-border);
}

.task-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.expand-icon {
  color: var(--color-text-tertiary);
}

.task-detail {
  padding: 0 var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.btn:hover {
  background: var(--color-surface-hover);
}

.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}

.btn-primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.9;
  background: var(--color-accent);
}

.btn-danger {
  color: #ef4444;
  border-color: #fecaca;
}

.btn-danger:hover {
  background: #fef2f2;
}

/* 实例表格 */
.instance-toolbar {
  margin-bottom: var(--space-3);
}

.filter-select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  outline: none;
}

.instance-table-wrap {
  overflow-x: auto;
}

.instance-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.instance-table th,
.instance-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.instance-table th {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-weight: 600;
  white-space: nowrap;
}

.instance-table td {
  color: var(--color-text-primary);
}

.status-tag {
  display: inline-flex;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status-running {
  background: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background: #dcfce7;
  color: #16a34a;
}

.status-rejected {
  background: #fef2f2;
  color: #dc2626;
}

.status-cancelled {
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}

.empty-state p {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

.modal-lg {
  max-width: 720px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg-primary);
  z-index: 1;
}

.modal-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--space-4);
}

/* 审批信息 */
.approval-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.info-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.info-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 流程进度 */
.flow-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.approval-flow {
  margin-bottom: var(--space-4);
}

/* 模板详情 */
.tpl-detail-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.tpl-detail-edges {
  margin-top: var(--space-4);
}

.edge-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.edge-from,
.edge-to {
  color: var(--color-text-primary);
  font-weight: 500;
}

.edge-condition {
  font-size: var(--font-size-xs);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  background: #dcfce7;
  color: #16a34a;
}

.edge-condition.condition-false {
  background: #fef2f2;
  color: #dc2626;
}

/* 实例详情 */
.instance-detail .approval-info {
  flex-direction: column;
}

.history-section {
  margin-top: var(--space-4);
}

.simple-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  flex-wrap: wrap;
}

.history-approver {
  font-weight: 600;
  color: var(--color-text-primary);
}

.history-action {
  color: var(--color-accent);
}

.history-comment {
  color: var(--color-text-secondary);
  flex: 1;
  min-width: 0;
}

.history-time {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 响应式 */
@media (max-width: 767px) {
  .workflow-design {
    padding: var(--space-2);
  }
  .template-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .task-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .instance-table {
    font-size: var(--font-size-xs);
  }
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
