<template>
  <div class="approval-action">
    <!-- 审批操作区 -->
    <div class="action-section">
      <div class="action-title">
        <span class="action-title-dot"></span>
        审批操作
      </div>
      <div class="action-form">
        <textarea
          v-model="comment"
          class="action-textarea"
          placeholder="请输入审批意见..."
          rows="3"
        ></textarea>
        <div class="action-buttons">
          <button class="btn btn-approve" @click="handleApprove('approved')">
            <Icon name="check" :size="14" />
            <span>通过</span>
          </button>
          <button class="btn btn-reject" @click="handleApprove('rejected')">
            <Icon name="close" :size="14" />
            <span>拒绝</span>
          </button>
          <button class="btn btn-delegate" @click="showDelegateModal = true">
            <Icon name="share" :size="14" />
            <span>委托</span>
          </button>
          <button class="btn btn-add-approver" @click="showAddApproverModal = true">
            <Icon name="add" :size="14" />
            <span>加签</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 审批历史时间线 -->
    <div class="history-section">
      <div class="history-title">
        <span class="history-title-dot"></span>
        审批历史
      </div>
      <div class="history-timeline">
        <div
          v-for="(record, index) in historyList"
          :key="index"
          class="timeline-item"
          :class="`timeline-${record.action}`"
          :style="{ animationDelay: index * 100 + 'ms' }"
        >
          <div class="timeline-dot-wrapper">
            <div class="timeline-dot" :class="`dot-${record.action}`"></div>
            <div v-if="index < historyList.length - 1" class="timeline-line"></div>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-approver">{{ record.approver }}</span>
              <span class="timeline-action" :class="`action-${record.action}`">
                {{ getActionLabel(record.action) }}
              </span>
            </div>
            <div class="timeline-node">{{ record.node }}</div>
            <div v-if="record.comment" class="timeline-comment">{{ record.comment }}</div>
            <div class="timeline-time">{{ formatTime(record.time) }}</div>
          </div>
        </div>
        <div v-if="!historyList.length" class="timeline-empty">
          <Icon name="clock" :size="16" />
          <span>暂无审批记录</span>
        </div>
      </div>
    </div>

    <!-- 委托弹窗 -->
    <Teleport to="body">
      <div v-if="showDelegateModal" class="modal-overlay" @click.self="showDelegateModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>委托审批</h3>
            <button class="modal-close" @click="showDelegateModal = false">
              <Icon name="close" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>委托给</label>
              <select v-model="delegateTo" class="form-select">
                <option value="">请选择委托人</option>
                <option v-for="role in approverOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>委托原因</label>
              <textarea
                v-model="delegateReason"
                class="action-textarea"
                placeholder="请输入委托原因..."
                rows="2"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="showDelegateModal = false">取消</button>
            <button class="btn btn-confirm" :disabled="!delegateTo" @click="handleDelegate">确认委托</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 加签弹窗 -->
    <Teleport to="body">
      <div v-if="showAddApproverModal" class="modal-overlay" @click.self="showAddApproverModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>加签</h3>
            <button class="modal-close" @click="showAddApproverModal = false">
              <Icon name="close" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>加签审批人</label>
              <select v-model="addApproverTo" class="form-select">
                <option value="">请选择审批人</option>
                <option v-for="role in approverOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>加签原因</label>
              <textarea
                v-model="addApproverReason"
                class="action-textarea"
                placeholder="请输入加签原因..."
                rows="2"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="showAddApproverModal = false">取消</button>
            <button class="btn btn-confirm" :disabled="!addApproverTo" @click="handleAddApprover">确认加签</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWorkflowStore } from '@/modules/system/stores/workflow'

const props = defineProps({
  instance: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['approved', 'delegated', 'added-approver'])

const workflowStore = useWorkflowStore()

const comment = ref('')
const showDelegateModal = ref(false)
const showAddApproverModal = ref(false)
const delegateTo = ref('')
const delegateReason = ref('')
const addApproverTo = ref('')
const addApproverReason = ref('')

const approverOptions = ['管理员', '总经理', '销售主管', '销售员', '仓库主管', '仓管员', '财务']

const historyList = computed(() => {
  if (!props.instance?.history) return []
  return [...props.instance.history].reverse()
})

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
  if (!time) return ''
  const d = new Date(time)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleApprove(result) {
  const res = workflowStore.approveTask(props.instance.id, result, comment.value)
  if (res.success) {
    comment.value = ''
    emit('approved', { result, instance: props.instance })
  }
}

function handleDelegate() {
  const res = workflowStore.delegateTask(props.instance.id, delegateTo.value, delegateReason.value)
  if (res.success) {
    showDelegateModal.value = false
    delegateTo.value = ''
    delegateReason.value = ''
    emit('delegated', { to: delegateTo.value, instance: props.instance })
  }
}

function handleAddApprover() {
  const res = workflowStore.addApprover(props.instance.id, addApproverTo.value, addApproverReason.value)
  if (res.success) {
    showAddApproverModal.value = false
    addApproverTo.value = ''
    addApproverReason.value = ''
    emit('added-approver', { approver: addApproverTo.value, instance: props.instance })
  }
}
</script>

<style scoped>
.approval-action {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.action-section,
.history-section {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.action-title,
.history-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.action-title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}

.history-title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  box-shadow: 0 0 6px rgba(139, 92, 246, 0.4);
}

.action-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  font-family: inherit;
}

.action-textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.action-buttons {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.25s ease;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  position: relative;
  overflow: hidden;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-color: #22c55e;
  color: #fff;
}
.btn-approve:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.btn-reject {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-color: #ef4444;
  color: #fff;
}
.btn-reject:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
}

.btn-delegate {
  background: var(--color-bg-primary);
  border-color: var(--color-border);
}
.btn-delegate:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: #f59e0b;
  color: #f59e0b;
  transform: translateY(-1px);
}

.btn-add-approver {
  background: var(--color-bg-primary);
  border-color: var(--color-border);
}
.btn-add-approver:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: #8b5cf6;
  color: #8b5cf6;
  transform: translateY(-1px);
}

/* 时间线 */
.history-timeline {
  position: relative;
}

@keyframes timelineSlideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.timeline-item {
  display: flex;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  position: relative;
  animation: timelineSlideIn 0.4s ease-out both;
  transition: background 0.2s;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-2);
  margin-left: calc(-1 * var(--space-2));
  margin-right: calc(-1 * var(--space-2));
}

.timeline-item:hover {
  background: var(--color-surface-hover);
}

.timeline-dot-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: var(--space-1);
}

.timeline-dot {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-border);
  background: var(--color-bg-primary);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.dot-approved {
  border-color: #22c55e;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.3);
}

.dot-rejected {
  border-color: #ef4444;
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.3);
}

.dot-submit {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.3);
}

.dot-complete {
  border-color: #22c55e;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.3);
}

.dot-delegate,
.dot-addApprover {
  border-color: #f59e0b;
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.3);
}

.dot-cancel {
  border-color: var(--color-text-tertiary);
  background: var(--color-text-tertiary);
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: var(--color-border);
  margin-top: var(--space-1);
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.timeline-approver {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.timeline-action {
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 500;
}

.action-approved { background: #dcfce7; color: #16a34a; }
.action-rejected { background: #fef2f2; color: #dc2626; }
.action-submit { background: #dbeafe; color: #2563eb; }
.action-complete { background: #dcfce7; color: #16a34a; }
.action-delegate, .action-addApprover { background: #fef3c7; color: #d97706; }
.action-cancel { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }

.timeline-node {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.timeline-comment {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-border);
}

.timeline-approved .timeline-comment { border-left-color: #22c55e; }
.timeline-rejected .timeline-comment { border-left-color: #ef4444; }
.timeline-submit .timeline-comment { border-left-color: var(--color-accent); }

.timeline-time {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.timeline-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-4);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
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
  max-width: 440px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
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

.form-group {
  margin-bottom: var(--space-3);
}

.form-group label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.form-select:focus {
  border-color: var(--color-accent);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.btn-cancel {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.btn-cancel:hover {
  background: var(--color-surface-hover);
}

.btn-confirm {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  opacity: 0.9;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  .btn {
    justify-content: center;
  }
}
</style>
