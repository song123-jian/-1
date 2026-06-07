<template>
  <div class="approval-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">审批配置</h2>
        <p class="page-header-subtitle">可视化审批工作流配置，支持金额路由与角色路由</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" style="border-radius:50%;width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center" @click="showHelp = !showHelp">?</button>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="list" :size="14" /></div>
        <div class="stat-card-value">{{ approvalStore.totalCount }}</div>
        <div class="stat-card-label">审批规则总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="checkCircle" :size="14" /></div>
        <div class="stat-card-value">{{ approvalStore.enabledCount }}</div>
        <div class="stat-card-label">已启用规则</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="clock" :size="14" /></div>
        <div class="stat-card-value">{{ approvalStore.pendingCount }}</div>
        <div class="stat-card-label">待审批单据</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)"><Icon name="table" :size="14" /></div>
        <div class="stat-card-value">{{ approvalStore.todayCount }}</div>
        <div class="stat-card-label">今日审批数</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="refresh" :size="14" /> 审批流程图</span>
          <button class="btn btn-ghost btn-sm" @click="refreshFlowChart"><Icon name="refresh" :size="14" /> 刷新</button>
        </div>
        <div class="panel-card-body">
          <canvas ref="flowCanvas" style="width:100%;height:300px;border:1px dashed var(--color-border);border-radius:var(--radius-md)"></canvas>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">添加新规则</span></div>
        <div class="panel-card-body">
          <div class="form-group">
            <label class="form-label">规则模板</label>
            <select class="form-select" v-model="editorData.template" @change="applyTemplate">
              <option value="">自定义规则</option>
              <option v-for="t in approvalStore.templates" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">模块选择</label>
              <select class="form-select" v-model="editorData.module">
                <option v-for="m in approvalStore.moduleOptions" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">条件类型</label>
              <select class="form-select" v-model="editorData.condition">
                <option value="amount">金额阈值</option>
                <option value="margin">利润率阈值</option>
                <option value="all">全部需要</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">阈值金额(%)</label>
              <input type="number" class="form-input" v-model.number="editorData.threshold" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">审批人角色</label>
              <select class="form-select" v-model="editorData.approver">
                <option v-for="a in approvalStore.approverOptions" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">审批类型</label>
              <select class="form-select" v-model="editorData.approvalType">
                <option value="single">单人审批</option>
                <option value="countersign">会签</option>
                <option value="orsign">或签</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">超时时间(h)</label>
              <input type="number" class="form-input" v-model.number="editorData.timeout" min="1" max="720">
            </div>
            <div class="form-group">
              <label class="form-label">下一级审批人</label>
              <select class="form-select" v-model="editorData.nextApprover">
                <option value="">无(终审)</option>
                <option v-for="a in approvalStore.approverOptions" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          <div v-if="validationErrors.length > 0" style="margin-bottom:var(--space-2);padding:var(--space-2);border-radius:var(--radius-sm);font-size:var(--font-size-xs);background:rgba(239,68,68,0.1);color:var(--color-danger)">
            <div v-for="err in validationErrors" :key="err">{{ err }}</div>
          </div>
          <button v-if="canApprove" class="btn btn-primary" style="width:100%" @click="addRule">添加审批规则</button>
        </div>
      </div>
    </div>

    <!-- 审批规则列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">审批规则列表</span>
        <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
          <input type="text" class="form-input" v-model="searchQuery" placeholder="搜索规则..." style="width:160px;font-size:var(--font-size-xs)">
          <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="batchOp('enable')"><Icon name="checkCircle" :size="14" /> 批量启用</button>
          <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="batchOp('disable')">[禁止] 批量禁用</button>
          <button v-if="canApprove" class="btn btn-danger btn-sm" @click="batchOp('delete')"><Icon name="delete" :size="14" /> 批量删除</button>
        </div>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" v-model="selectAll" @change="toggleSelectAll"></th>
                <th @click="sortBy('module')" style="cursor:pointer">模块 <Icon name="filter" :size="14" /></th>
                <th @click="sortBy('condition')" style="cursor:pointer">触发条件 <Icon name="filter" :size="14" /></th>
                <th>审批人</th>
                <th>审批类型</th>
                <th>超时</th>
                <th @click="sortBy('enabled')" style="cursor:pointer">状态 <Icon name="filter" :size="14" /></th>
                <th>优先级</th>
                <th style="min-width:200px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRules.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-state-icon"><Icon name="list" :size="14" /></div>暂无审批规则
                </td>
              </tr>
              <tr v-for="(rule, idx) in filteredRules" :key="rule.id">
                <td><input type="checkbox" :value="rule.id" v-model="selectedIds"></td>
                <td>{{ rule.module }}</td>
                <td>
                  {{ approvalStore.condLabels[rule.condition] || rule.condition }}
                  <template v-if="rule.condition !== 'all'">
                    (>¥{{ (rule.threshold || 0).toLocaleString('zh-CN') }}{{ rule.condition === 'margin' ? '%' : '' }})
                  </template>
                </td>
                <td>{{ rule.approver }}</td>
                <td>{{ approvalStore.typeLabels[rule.approvalType] || '单人审批' }}</td>
                <td>{{ rule.timeout || 24 }}h</td>
                <td>
                  <span class="status-badge" :class="rule.enabled ? 'success' : 'neutral'"
                    style="cursor:pointer" @click="toggleRule(rule.id)">
                    {{ rule.enabled ? '已启用' : '已禁用' }}
                  </span>
                </td>
                <td>{{ idx + 1 }}</td>
                <td>
                  <div style="display:flex;gap:2px;flex-wrap:wrap">
                    <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="openDelegateModal(rule)" title="委托审批">[委托]</button>
                    <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="doRecall(rule.id)" title="撤回审批">[撤回]</button>
                    <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="doEscalate(rule)" title="超时升级" :disabled="!rule.nextApprover">[升级]</button>
                    <button v-if="canApprove" class="btn btn-ghost btn-sm" @click="checkTimeoutStatus(rule)" title="超时检查">[检查]</button>
                    <button v-if="canApprove" class="btn btn-danger btn-sm" @click="deleteRule(rule.id)"><Icon name="delete" :size="14" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 审批日志 -->
    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="log" :size="14" /> 审批日志</span>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <select class="form-select" v-model="logFilter" style="font-size:var(--font-size-xs);width:auto">
            <option value="">全部操作</option>
            <option value="create">新增</option>
            <option value="update">修改</option>
            <option value="delete">删除</option>
            <option value="toggle">启用/禁用</option>
            <option value="escalate">超时升级</option>
            <option value="delegate">委托</option>
            <option value="recall">撤回</option>
            <option value="batch">批量操作</option>
          </select>
          <button class="btn btn-ghost btn-sm" @click="approvalStore.clearLogs()" title="清空日志">[清空]</button>
        </div>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container" style="max-height:300px;overflow-y:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作类型</th>
                <th>描述</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredLogs.length === 0">
                <td colspan="4" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4)">暂无审批日志</td>
              </tr>
              <tr v-for="log in filteredLogs" :key="log.id">
                <td style="white-space:nowrap;font-size:var(--font-size-xs)">{{ formatTime(log.createdAt) }}</td>
                <td><span class="status-badge" :class="logActionClass(log.action)">{{ logActionLabel(log.action) }}</span></td>
                <td style="font-size:var(--font-size-xs)">{{ log.description }}</td>
                <td style="font-size:var(--font-size-xs)">{{ log.operator }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 密码确认弹窗 -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">审批确认</span><button class="modal-close" @click="showPasswordModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">请输入密码</label><input type="password" class="form-input" v-model="approvalPassword" placeholder="请输入密码" @keyup.enter="confirmPassword"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showPasswordModal = false">取消</button><button class="btn btn-primary" @click="confirmPassword">确认</button></div>
      </div>
    </div>

    <!-- 委托审批弹窗 -->
    <div v-if="showDelegateModal" class="modal-overlay" @click.self="showDelegateModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">审批委托</span><button class="modal-close" @click="showDelegateModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div style="margin-bottom:var(--space-3);padding:var(--space-3);background:var(--color-accent-subtle);border-radius:var(--radius-md);font-size:var(--font-size-sm)">
            当前审批人: <strong>{{ delegateTarget?.approver }}</strong> | 模块: <strong>{{ delegateTarget?.module }}</strong>
          </div>
          <div class="form-group">
            <label class="form-label">委托给 <span class="required">*</span></label>
            <select class="form-select" v-model="delegateTo">
              <option value="">请选择委托人</option>
              <option v-for="a in approvalStore.approverOptions.filter(x => x !== delegateTarget?.approver)" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">委托原因</label>
            <textarea class="form-input" v-model="delegateReason" rows="3" placeholder="请输入委托原因（可选）"></textarea>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showDelegateModal = false">取消</button><button class="btn btn-primary" @click="doDelegate">确认委托</button></div>
      </div>
    </div>

    <!-- 超时检查结果弹窗 -->
    <div v-if="showTimeoutModal" class="modal-overlay" @click.self="showTimeoutModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">超时检查结果</span><button class="modal-close" @click="showTimeoutModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div v-if="timeoutResult.timedOut" style="padding:var(--space-3);background:var(--color-danger-subtle);border-radius:var(--radius-md)">
            <div style="font-weight:600;color:var(--color-danger);margin-bottom:var(--space-2)">审批已超时</div>
            <div style="font-size:var(--font-size-sm)">模块: {{ timeoutResult.rule?.module }}</div>
            <div style="font-size:var(--font-size-sm)">审批人: {{ timeoutResult.rule?.approver }}</div>
            <div style="font-size:var(--font-size-sm);color:var(--color-danger)">超时: {{ timeoutResult.hoursOverdue }} 小时</div>
            <div v-if="timeoutResult.rule?.nextApprover" style="margin-top:var(--space-2)">
              <button class="btn btn-danger btn-sm" @click="doEscalate(timeoutResult.rule); showTimeoutModal = false">立即升级到 {{ timeoutResult.rule.nextApprover }}</button>
            </div>
          </div>
          <div v-else style="padding:var(--space-3);background:var(--color-success-subtle);border-radius:var(--radius-md)">
            <div style="font-weight:600;color:var(--color-success);margin-bottom:var(--space-2)">审批未超时</div>
            <div style="font-size:var(--font-size-sm)">模块: {{ timeoutResult.rule?.module }}</div>
            <div style="font-size:var(--font-size-sm)">审批人: {{ timeoutResult.rule?.approver }}</div>
            <div style="font-size:var(--font-size-sm);color:var(--color-success)">剩余: {{ timeoutResult.hoursRemaining }} 小时</div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showTimeoutModal = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useApprovalStore } from '@/stores/approval'
import { useSessionStore } from '@/stores/session'

const approvalStore = useApprovalStore()
const sessionStore = useSessionStore()

const canApprove = ['管理员', '总经理'].includes(sessionStore.currentRole)

const showHelp = ref(false)
const searchQuery = ref('')
const selectedIds = ref([])
const selectAll = ref(false)
const sortField = ref('')
const sortAsc = ref(true)
const logFilter = ref('')

const flowCanvas = ref(null)
const validationErrors = ref([])
const showPasswordModal = ref(false)
const approvalPassword = ref('')
const pendingAction = ref(null)

// 委托审批
const showDelegateModal = ref(false)
const delegateTarget = ref(null)
const delegateTo = ref('')
const delegateReason = ref('')

// 超时检查
const showTimeoutModal = ref(false)
const timeoutResult = ref({ timedOut: false, rule: null })

const editorData = reactive({
  template: '',
  module: '报价管理',
  condition: 'amount',
  threshold: 50000,
  approver: '总经理',
  approvalType: 'single',
  timeout: 24,
  nextApprover: ''
})

const filteredRules = computed(() => {
  let list = [...approvalStore.rules]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      (r.module || '').toLowerCase().includes(q) ||
      (r.approver || '').toLowerCase().includes(q) ||
      (r.condition || '').toLowerCase().includes(q)
    )
  }
  if (sortField.value) {
    list.sort((a, b) => {
      let va = a[sortField.value] || ''
      let vb = b[sortField.value] || ''
      if (typeof va === 'boolean') { va = va ? 1 : 0; vb = vb ? 1 : 0 }
      if (va < vb) return sortAsc.value ? -1 : 1
      if (va > vb) return sortAsc.value ? 1 : -1
      return 0
    })
  }
  return list
})

const filteredLogs = computed(() => {
  if (!logFilter.value) return approvalStore.logs
  return approvalStore.logs.filter(l => l.action === logFilter.value)
})

function applyTemplate() {
  const t = approvalStore.templates.find(t => t.value === editorData.template)
  if (t) {
    editorData.module = t.module
    editorData.condition = t.condition
    editorData.threshold = t.threshold
    editorData.approver = t.approver
    editorData.approvalType = t.approvalType
    editorData.timeout = t.timeout
  }
}

function validateRule() {
  const errors = []
  if (!editorData.module) errors.push('请选择审批模块')
  if (!editorData.approver) errors.push('请选择审批人')
  if (editorData.condition !== 'all' && editorData.threshold <= 0) errors.push('阈值必须大于0')
  if (editorData.timeout < 1) errors.push('超时时间至少1小时')
  const isDuplicate = approvalStore.rules.some(r => r.module === editorData.module && r.condition === editorData.condition)
  if (isDuplicate) errors.push(editorData.module + ' 模块已存在相同条件的审批规则')
  validationErrors.value = errors
  return errors.length === 0
}

function addRule() {
  if (!validateRule()) return
  approvalStore.addRule({
    module: editorData.module,
    condition: editorData.condition,
    threshold: editorData.threshold,
    approver: editorData.approver,
    approvalType: editorData.approvalType,
    timeout: editorData.timeout,
    nextApprover: editorData.nextApprover
  })
  validationErrors.value = []
  editorData.template = ''
  editorData.threshold = 50000
  editorData.timeout = 24
  editorData.nextApprover = ''
}

function toggleRule(id) {
  approvalStore.toggleRule(id)
}

function deleteRule(id) {
  if (confirm('确认删除该审批规则？')) {
    approvalStore.deleteRule(id)
  }
}

function sortBy(field) {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortField.value = field
    sortAsc.value = true
  }
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = filteredRules.value.map(r => r.id)
  } else {
    selectedIds.value = []
  }
}

function batchOp(action) {
  if (selectedIds.value.length === 0) { alert('请先选择规则'); return }
  if (action === 'delete' && !confirm('确认批量删除选中的规则？')) return
  approvalStore.batchOperation(action, [...selectedIds.value])
  selectedIds.value = []
  selectAll.value = false
}

// 委托审批
function openDelegateModal(rule) {
  delegateTarget.value = rule
  delegateTo.value = ''
  delegateReason.value = ''
  showDelegateModal.value = true
}

function doDelegate() {
  if (!delegateTo.value) { alert('请选择委托人'); return }
  approvalStore.delegateApproval(delegateTarget.value.id, delegateTarget.value.approver, delegateTo.value)
  showDelegateModal.value = false
}

// 撤回审批
function doRecall(ruleId) {
  if (confirm('确认撤回该审批规则？撤回后规则将被禁用。')) {
    approvalStore.recallApproval(ruleId)
  }
}

// 超时升级
function doEscalate(rule) {
  if (!rule.nextApprover) { alert('该规则未配置下一级审批人，无法升级'); return }
  if (confirm('确认将审批升级到 ' + rule.nextApprover + '？')) {
    approvalStore.escalateTimeout(rule.id)
  }
}

// 超时检查
function checkTimeoutStatus(rule) {
  timeoutResult.value = approvalStore.checkTimeout(rule.id)
  showTimeoutModal.value = true
}

// 日志相关
function formatTime(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function logActionLabel(action) {
  const map = { create: '新增', update: '修改', delete: '删除', toggle: '启禁', escalate: '升级', delegate: '委托', recall: '撤回', batch: '批量' }
  return map[action] || action
}

function logActionClass(action) {
  const map = { create: 'success', update: 'info', delete: 'danger', toggle: 'neutral', escalate: 'warning', delegate: 'accent', recall: 'purple', batch: 'info' }
  return map[action] || 'neutral'
}

// 密码确认
function confirmPassword() {
  if (!approvalPassword.value) { alert('请输入密码'); return }
  showPasswordModal.value = false
  approvalPassword.value = ''
  if (pendingAction.value) { pendingAction.value(); pendingAction.value = null }
}

function refreshFlowChart() {
  nextTick(() => renderFlowCanvas())
}

onMounted(() => {
  approvalStore.initSeedData()
  nextTick(() => renderFlowCanvas())
})

watch(() => approvalStore.rules, () => nextTick(() => renderFlowCanvas()), { deep: true })

onBeforeUnmount(() => {
  try {
    if (flowCanvas.value) {
      const ctx = flowCanvas.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, flowCanvas.value.width, flowCanvas.value.height)
    }
  } catch (e) { /* ignore */ }
})

function renderFlowCanvas() {
  const canvas = flowCanvas.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const w = rect.width, h = rect.height
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-secondary').trim() || '#1e293b'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, w, h)
  const rules = approvalStore.rules
  if (rules.length === 0) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('暂无审批规则，请添加规则后查看流程图', w / 2, h / 2)
    return
  }
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899']
  const nodeW = 120, nodeH = 50, gapX = 160, gapY = 80
  const cols = Math.max(1, Math.floor((w - 40) / gapX))
  const startX = (w - (Math.min(rules.length, cols) * gapX - (gapX - nodeW))) / 2
  const startY = 40
  ctx.fillStyle = '#f1f5f9'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('发起申请', w / 2, 20)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(w / 2, 24)
  ctx.lineTo(w / 2, startY - 2)
  ctx.stroke()
  for (let i = 0; i < rules.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * gapX
    const y = startY + row * gapY
    const color = colors[i % colors.length]
    ctx.fillStyle = color
    ctx.beginPath()
    if (ctx.roundRect) { ctx.roundRect(x, y, nodeW, nodeH, 8) } else { ctx.moveTo(x + 8, y); ctx.arcTo(x + nodeW, y, x + nodeW, y + nodeH, 8); ctx.arcTo(x + nodeW, y + nodeH, x, y + nodeH, 8); ctx.arcTo(x, y + nodeH, x, y, 8); ctx.arcTo(x, y, x + nodeW, y, 8); ctx.closePath() }
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(rules[i].module || '', x + nodeW / 2, y + 18)
    ctx.font = '9px sans-serif'
    ctx.fillText(rules[i].approver || '', x + nodeW / 2, y + 33)
    ctx.fillText(rules[i].enabled ? '✓ 启用' : '✗ 禁用', x + nodeW / 2, y + 44)
    if (i === 0) {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(w / 2, startY - 2); ctx.lineTo(x + nodeW / 2, y); ctx.stroke()
    }
    if (i > 0) {
      const prevCol = (i - 1) % cols
      const prevRow = Math.floor((i - 1) / cols)
      const px = startX + prevCol * gapX + nodeW / 2
      const py = startY + prevRow * gapY + nodeH
      const nx = x + nodeW / 2
      const ny = y
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke()
      ctx.fillStyle = '#94a3b8'; ctx.beginPath()
      ctx.moveTo(nx, ny); ctx.lineTo(nx - 4, ny - 6); ctx.lineTo(nx + 4, ny - 6); ctx.closePath(); ctx.fill()
    }
  }
  const lastRow = Math.floor((rules.length - 1) / cols)
  const lastCol = (rules.length - 1) % cols
  const lastX = startX + lastCol * gapX + nodeW / 2
  const lastY = startY + lastRow * gapY + nodeH
  const endY = Math.min(lastY + 40, h - 10)
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(lastX, endY); ctx.stroke()
  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('审批完成', lastX, endY + 14)
}
</script>

<style scoped>
@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
