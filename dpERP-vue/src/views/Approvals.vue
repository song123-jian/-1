<template>
  <div class="approval-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">审批配置</h2>
        <p class="page-header-subtitle">可视化审批工作流配置，支持金额路由与角色路由</p>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📋</div>
        <div class="stat-card-value">{{ approvalStore.totalCount }}</div>
        <div class="stat-card-label">审批规则总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div>
        <div class="stat-card-value">{{ approvalStore.enabledCount }}</div>
        <div class="stat-card-label">已启用规则</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⏳</div>
        <div class="stat-card-value">{{ approvalStore.pendingCount }}</div>
        <div class="stat-card-label">待审批单据</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">📊</div>
        <div class="stat-card-value">{{ approvalStore.todayCount }}</div>
        <div class="stat-card-label">今日审批数</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">🔄 审批流程图</span>
        </div>
        <div class="panel-card-body">
          <div class="flow-canvas">
            <div v-if="approvalStore.rules.length === 0" class="flow-empty">暂无审批规则，请添加规则后查看流程图</div>
            <template v-else>
              <div class="flow-node flow-start">发起申请</div>
              <div class="flow-arrow">↓</div>
              <div class="flow-nodes">
                <template v-for="(rule, idx) in approvalStore.rules" :key="rule.id">
                  <div class="flow-node flow-rule" :class="{ disabled: !rule.enabled }" :style="{ borderColor: flowColors[idx % flowColors.length] }">
                    <div class="flow-rule-module">{{ rule.module }}</div>
                    <div class="flow-rule-approver">{{ rule.approver }}</div>
                    <div class="flow-rule-status">{{ rule.enabled ? '✓ 启用' : '✗ 禁用' }}</div>
                  </div>
                  <div v-if="idx < approvalStore.rules.length - 1" class="flow-arrow-h">→</div>
                </template>
              </div>
              <div class="flow-arrow">↓</div>
              <div class="flow-node flow-end">审批完成</div>
            </template>
          </div>
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
              <label class="form-label">超时时间(小时)</label>
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
          <button class="btn btn-primary" style="width:100%" @click="addRule">添加审批规则</button>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">审批规则列表</span>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input type="text" class="form-input" v-model="searchQuery" placeholder="搜索规则..." style="width:160px;font-size:var(--font-size-xs)">
          <button class="btn btn-ghost btn-sm" @click="batchOp('enable')">✅ 批量启用</button>
          <button class="btn btn-ghost btn-sm" @click="batchOp('disable')">🚫 批量禁用</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="batchOp('delete')">🗑️ 批量删除</button>
        </div>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" v-model="selectAll" @change="toggleSelectAll"></th>
                <th @click="sortBy('module')" style="cursor:pointer">模块 ↕</th>
                <th @click="sortBy('condition')" style="cursor:pointer">触发条件 ↕</th>
                <th>审批人</th>
                <th>审批类型</th>
                <th>超时</th>
                <th @click="sortBy('enabled')" style="cursor:pointer">状态 ↕</th>
                <th>优先级</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRules.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-state-icon">📋</div>暂无审批规则
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
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteRule(rule.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useApprovalStore } from '@/stores/approval'

const approvalStore = useApprovalStore()

const searchQuery = ref('')
const selectedIds = ref([])
const selectAll = ref(false)
const sortField = ref('')
const sortAsc = ref(true)

const flowColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

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

function addRule() {
  if (!editorData.module) { alert('请选择模块'); return }
  if (!editorData.approver) { alert('请选择审批人'); return }
  approvalStore.addRule({
    module: editorData.module,
    condition: editorData.condition,
    threshold: editorData.threshold,
    approver: editorData.approver,
    approvalType: editorData.approvalType,
    timeout: editorData.timeout,
    nextApprover: editorData.nextApprover
  })
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

onMounted(() => {
  approvalStore.initSeedData()
})
</script>

<style scoped>
.flow-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  min-height: 300px;
  background: var(--color-bg-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
.flow-empty {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  align-self: center;
  margin-top: auto;
  margin-bottom: auto;
}
.flow-node {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
}
.flow-start {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
.flow-end {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
}
.flow-rule {
  background: var(--color-surface);
  border: 2px solid;
  min-width: 120px;
}
.flow-rule.disabled {
  opacity: 0.5;
}
.flow-rule-module {
  font-weight: 700;
  font-size: var(--font-size-xs);
}
.flow-rule-approver {
  font-size: 10px;
  color: var(--color-text-secondary);
}
.flow-rule-status {
  font-size: 9px;
  margin-top: 2px;
}
.flow-arrow {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-lg);
  line-height: 1;
}
.flow-nodes {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}
.flow-arrow-h {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-lg);
}
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
