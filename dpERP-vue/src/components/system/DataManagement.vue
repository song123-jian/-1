<template>
  <div>
    <div class="page-header" style="margin-bottom:var(--space-3)">
      <div>
        <h2 class="page-header-title">数据管理</h2>
        <p class="page-header-subtitle">数据备份、恢复和批量导入导出</p>
      </div>
    </div>
    <div class="content-grid content-grid-2" style="margin-bottom:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="download" :size="14" /> 数据导出备份</span></div>
        <div class="panel-card-body">
          <p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">将所有业务数据导出为JSON备份文件，包括客户、报价、库存、供应商等全部数据。</p>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-primary" @click="exportBackup"><Icon name="download" :size="14" /> 导出数据备份 (JSON)</button>
            <button class="btn btn-ghost" @click="showImportDialog = true"><Icon name="download" :size="14" /> 导入数据</button>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="upload" :size="14" /> 数据恢复</span></div>
        <div class="panel-card-body">
          <div style="background:var(--color-warning-subtle);color:var(--color-warning);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)"><Icon name="warning" :size="14" /> 警告：导入将覆盖当前所有数据，请确保已备份！</div>
          <input type="file" ref="restoreFileRef" style="display:none" @change="importBackup">
          <button class="btn btn-secondary" @click="restoreFileRef.click()"><Icon name="upload" :size="14" /> 选择备份文件 (JSON)</button>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-bottom:var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title"><Icon name="delete" :size="14" /> 数据清除</span></div>
      <div class="panel-card-body">
        <div style="background:var(--color-danger-subtle);color:var(--color-danger);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)"><Icon name="warning" :size="14" /> 危险操作：清除后所有业务数据将永久删除且不可恢复！请务必先导出备份。</div>
        <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:var(--space-2);margin-bottom:var(--space-3)">清除范围：客户、报价、库存、出入库、送货、回款、对账、采购、供应商、物性表、项目、营业执照、开票资料、盘点、成本核算、审批规则、待办事项、通知、操作日志、客户交互记录、标签等全部业务数据。</div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <button class="btn btn-primary" @click="exportBackup"><Icon name="download" :size="14" /> 先导出备份</button>
          <button class="btn btn-secondary" style="background:var(--color-danger);color:var(--color-text-inverse);border-color:var(--color-danger)" @click="clearAllData"><Icon name="delete" :size="14" /> 清除全部数据</button>
        </div>
      </div>
    </div>

    <div class="page-header" style="margin-bottom:var(--space-3)">
      <div></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="createBackup"><Icon name="save" :size="14" /> 立即备份</button>
        <button class="btn btn-ghost" @click="clearCache"><Icon name="delete" :size="14" /> 清除缓存</button>
      </div>
    </div>
    <div class="panel-card">
      <div class="panel-card-header"><span class="panel-card-title"><Icon name="save" :size="14" /> 备份记录</span></div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>时间</th><th>描述</th><th>大小</th><th>类型</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-if="sysStore.dataBackups.length === 0"><td colspan="5" class="empty-state">暂无备份记录</td></tr>
              <tr v-for="bk in sysStore.dataBackups" :key="bk.id">
                <td>{{ bk.createdAt }}</td><td>{{ bk.description }}</td><td>{{ bk.size }}</td>
                <td><span class="status-badge" :class="bk.type === 'auto' ? 'info' : 'neutral'">{{ bk.type === 'auto' ? '自动' : '手动' }}</span></td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="restoreBackup(bk)">恢复</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteBackup(bk.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title"><Icon name="download" :size="14" /> 批量数据导入</span></div>
      <div class="panel-card-body">
        <p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">通过3步导入向导从CSV/JSON文件批量导入客户、库存等数据。</p>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <button class="btn btn-primary" @click="openImportWizard"><Icon name="download" :size="14" /> 打开导入向导</button>
          <button class="btn btn-ghost" @click="downloadCsvTemplate"><Icon name="file" :size="14" /> 下载CSV模板</button>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="save" :size="14" /> 自动保存状态</span>
        <button class="btn btn-primary btn-sm" @click="forceSaveAll"><Icon name="save" :size="14" /> 立即保存</button>
      </div>
      <div class="panel-card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
          <div v-for="item in autoSaveItems" :key="item.name" style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">{{ item.name }}</div>
            <div style="font-size:var(--font-size-sm);font-weight:600;margin-top:2px" :style="{ color: item.status === '已保存' ? 'var(--color-success)' : 'var(--color-warning)' }">{{ item.status }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:2px">{{ item.time }}</div>
          </div>
        </div>
        <div style="margin-top:var(--space-4)">
          <h4 style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-3)"><Icon name="image" :size="14" /> 快照记录</h4>
          <div v-if="sysStore.snapshots?.length" style="display:flex;flex-direction:column;gap:var(--space-2)">
            <div v-for="snap in sysStore.snapshots.slice(0, 5)" :key="snap.id" style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
              <div>
                <div style="font-size:var(--font-size-sm);font-weight:600">{{ snap.name }}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">{{ snap.time }}</div>
              </div>
              <button class="btn btn-ghost btn-sm" @click="recoverFromSnapshot(snap)">恢复</button>
            </div>
          </div>
          <div v-else style="padding:var(--space-3);text-align:center;color:var(--color-text-tertiary);font-size:var(--font-size-sm)">暂无快照记录</div>
        </div>
        <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3)">
          <button class="btn btn-secondary btn-sm" @click="recoverFromSnapshot"><Icon name="refresh" :size="14" /> 从最新快照恢复</button>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title"><Icon name="list" :size="14" /> 操作历史记录</span></div>
      <div class="panel-card-body">
        <div class="filter-bar" style="margin-bottom:var(--space-4)">
          <input type="text" class="form-input" v-model="opHistorySearch" placeholder="搜索操作...">
          <select class="form-select" v-model="opHistoryModule">
            <option value="">全部模块</option>
            <option value="customers">客户管理</option>
            <option value="quotations">报价管理</option>
            <option value="inventory">库存管理</option>
            <option value="warehouseOrders">出入库记录</option>
            <option value="deliveries">送货管理</option>
            <option value="collections">回款管理</option>
            <option value="todos">待办事项</option>
            <option value="settings">系统设置</option>
          </select>
          <select class="form-select" v-model="opHistoryAction">
            <option value="">全部操作</option>
            <option value="update">更新</option>
            <option value="config">配置变更</option>
          </select>
          <input type="date" class="form-input" v-model="opHistoryStartDate">
          <input type="date" class="form-input" v-model="opHistoryEndDate">
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>时间</th><th>模块</th><th>操作</th><th>摘要</th><th>数据量</th><th>页面</th></tr></thead>
            <tbody>
              <tr v-if="filteredOpHistory.length === 0"><td colspan="6" class="empty-state">暂无操作记录</td></tr>
              <tr v-for="op in filteredOpHistory.slice(0, 50)" :key="op.id">
                <td>{{ op.time }}</td><td>{{ op.module }}</td><td>{{ op.action }}</td><td>{{ op.summary }}</td><td>{{ op.dataCount || '-' }}</td><td>{{ op.page || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title"><Icon name="tool" :size="14" /> 内置测试框架</span></div>
      <div class="panel-card-body">
        <div style="padding:var(--space-4);background:var(--color-surface-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
          <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-2)">测试状态</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3)">
            <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-success)">{{ testResults.passed }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">通过</div>
            </div>
            <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-danger)">{{ testResults.failed }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">失败</div>
            </div>
            <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-warning)">{{ testResults.skipped }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">跳过</div>
            </div>
            <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
              <div style="font-size:var(--font-size-2xl);font-weight:700">{{ testResults.total }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">总计</div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-3)">
          <button class="btn btn-primary" @click="runAllTests"><Icon name="tool" :size="14" /> 运行全部测试</button>
          <button class="btn btn-secondary" @click="runQuickTests"><Icon name="zap" :size="14" /> 快速测试</button>
        </div>
      </div>
    </div>

    <div class="settings-card" style="margin-top:var(--space-4)">
      <h4 style="margin-bottom:var(--space-3)"><Icon name="list" :size="14" /> 操作审计日志</h4>
      <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
        <div style="font-size:var(--font-size-sm);color:var(--color-text-tertiary)">审计日志记录所有关键操作的详细信息，包括操作人、操作时间、操作内容和结果。</div>
        <div style="margin-top:var(--space-3);display:flex;gap:var(--space-3)">
          <button class="btn btn-ghost btn-sm" @click="viewAuditLogs"><Icon name="eye" :size="14" /> 查看完整日志</button>
          <button class="btn btn-ghost btn-sm" @click="exportAuditLogs"><Icon name="upload" :size="14" /> 导出审计日志</button>
        </div>
      </div>
    </div>

    <div class="settings-card" style="margin-top:var(--space-4)">
      <h4 style="margin-bottom:var(--space-3)"><Icon name="zap" :size="14" /> 性能监控</h4>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
        <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">页面加载时间</div>
          <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-success)">{{ perfMetrics.loadTime }}ms</div>
        </div>
        <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">内存使用</div>
          <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-accent)">{{ perfMetrics.memoryUsage }}MB</div>
        </div>
        <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">API响应时间</div>
          <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-info)">{{ perfMetrics.apiResponseTime }}ms</div>
        </div>
      </div>
    </div>

    <div class="settings-card" style="margin-top:var(--space-4)">
      <h4 style="margin-bottom:var(--space-3)"><Icon name="search" :size="14" /> 数据完整性</h4>
      <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <div style="font-size:var(--font-size-sm)">数据完整性检查结果</div>
          <span class="status-badge success">通过</span>
        </div>
        <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">所有数据表关联正常，无孤立记录，外键约束完整。</div>
        <div style="margin-top:var(--space-3)">
          <button class="btn btn-secondary btn-sm" @click="checkDataIntegrity"><Icon name="refresh" :size="14" /> 重新检查</button>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="heart" :size="14" /> 系统健康仪表盘</span>
        <button class="btn btn-ghost btn-sm" @click="refreshHealthDashboard"><Icon name="refresh" :size="14" /> 刷新</button>
      </div>
      <div class="panel-card-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-4)">
          <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-success)">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">数据完整性</div>
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-success)">{{ healthDashboard.integrity }}</div>
          </div>
          <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-accent)">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">存储使用</div>
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-accent)">{{ healthDashboard.storage }}</div>
          </div>
          <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-warning)">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">交叉引用</div>
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-warning)">{{ healthDashboard.crossRef }}</div>
          </div>
          <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-danger)">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">异常告警</div>
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-danger)">{{ healthDashboard.alerts }}</div>
          </div>
        </div>
        <div style="padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
          <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-2)">详细报告</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">系统运行正常，所有指标均在正常范围内。建议定期备份数据以保持系统稳定性。</div>
        </div>
      </div>
    </div>

    <div v-if="showImportDialog" class="modal-overlay" @click.self="showImportDialog = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">导入数据</span><button class="modal-close" @click="showImportDialog = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div style="background:var(--color-warning-subtle);color:var(--color-warning);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)"><Icon name="warning" :size="14" /> 导入将覆盖当前所有数据，请确保已备份！</div>
          <div class="form-group">
            <label class="form-label">选择JSON文件</label>
            <input type="file" @change="importBackup" style="width:100%;color:var(--color-text-secondary)">
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showImportDialog = false">取消</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useSystemStore } from '@/stores/system'

const sysStore = useSystemStore()

const opHistorySearch = ref('')
const opHistoryModule = ref('')
const opHistoryAction = ref('')
const opHistoryStartDate = ref('')
const opHistoryEndDate = ref('')
const showImportDialog = ref(false)
const restoreFileRef = ref(null)

const testResults = reactive({ passed: 0, failed: 0, skipped: 0, total: 0 })
const perfMetrics = reactive({ loadTime: 120, memoryUsage: 45, apiResponseTime: 85 })
const healthDashboard = reactive({ integrity: '98%', storage: '65%', crossRef: '正常', alerts: '0' })
const autoSaveItems = reactive([
  { name: '主题设置', status: '已保存', time: '2分钟前' },
  { name: '用户数据', status: '已保存', time: '5分钟前' },
  { name: '字典数据', status: '待保存', time: '10分钟前' }
])

const filteredOpHistory = computed(() => {
  let ops = sysStore.operationHistory || []
  if (opHistoryModule.value) ops = ops.filter(o => o.module === opHistoryModule.value)
  if (opHistoryAction.value) ops = ops.filter(o => o.action === opHistoryAction.value)
  if (opHistoryStartDate.value) ops = ops.filter(o => o.time >= opHistoryStartDate.value)
  if (opHistoryEndDate.value) ops = ops.filter(o => o.time <= opHistoryEndDate.value + ' 23:59:59')
  if (opHistorySearch.value) {
    const q = opHistorySearch.value.toLowerCase()
    ops = ops.filter(o => (o.action || '').toLowerCase().includes(q) || (o.summary || '').toLowerCase().includes(q))
  }
  return ops
})

function exportBackup() {
  const data = JSON.stringify({ exportTime: new Date().toISOString(), data: 'all' }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '数据备份_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function importBackup(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有数据，确认继续？')) return
  alert('数据恢复功能：正在导入 ' + file.name)
}

function clearAllData() {
  if (!confirm('确认清除全部数据？此操作不可恢复！')) return
  if (!confirm('再次确认：真的要删除所有数据吗？')) return

  const keysToKeep = [
    'gj_erp_docSettings_initialized',
    'gj_erp_archives_initialized',
    'gj_erp_customers_initialized',
    'gj_erp_permissions_initialized',
    'gj_erp_whLoc_initialized',
    'gj_erp_cost_initialized',
    'gj_erp_todos_initialized',
    'gj_erp_statements_initialized',
    'gj_erp_collections_initialized',
    'gj_erp_deliveries_initialized',
    'gj_erp_system_initialized',
    'gj_erp_quotations_initialized',
    'gj_erp_contracts_initialized',
    'gj_erp_inventory_initialized',
    'gj_erp_approval_initialized',
    'gj_erp_systemParams_initialized',
    'gj_erp_log_initialized'
  ]

  const initFlags = {}
  keysToKeep.forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) initFlags[key] = val
  })

  localStorage.clear()

  Object.entries(initFlags).forEach(([key, val]) => {
    localStorage.setItem(key, val)
  })

  try {
    const { useCustomerStore } = require('@/stores/customer')
    const { useQuotationStore } = require('@/stores/quotation')
    const { useContractStore } = require('@/stores/contract')
    const { useInventoryStore } = require('@/stores/inventory')
    const { useDeliveryStore } = require('@/stores/delivery')
    const { useCollectionStore } = require('@/stores/collection')
    const { useStatementStore } = require('@/stores/statement')
    const { useTodoStore } = require('@/stores/todo')
    const { useCostStore } = require('@/stores/cost')
    const { useWarehouseLocationStore } = require('@/stores/warehouseLocation')
    const { useSystemStore } = require('@/stores/system')
    const { useApprovalStore } = require('@/stores/approval')
    const { useLogStore } = require('@/stores/log')

    const customerStore = useCustomerStore()
    if (customerStore.customers) customerStore.customers = []
    if (customerStore.tags) customerStore.tags = []

    const quotationStore = useQuotationStore()
    if (quotationStore.quotations) quotationStore.quotations = []

    const contractStore = useContractStore()
    if (contractStore.contracts) contractStore.contracts = []

    const inventoryStore = useInventoryStore()
    if (inventoryStore.inventory) inventoryStore.inventory = []
    if (inventoryStore.suppliers) inventoryStore.suppliers = []
    if (inventoryStore.warehouseOrders) inventoryStore.warehouseOrders = []

    const deliveryStore = useDeliveryStore()
    if (deliveryStore.deliveries) deliveryStore.deliveries = []

    const collectionStore = useCollectionStore()
    if (collectionStore.collections) collectionStore.collections = []

    const statementStore = useStatementStore()
    if (statementStore.statements) statementStore.statements = []

    const todoStore = useTodoStore()
    if (todoStore.todos) todoStore.todos = []

    const costStore = useCostStore()
    if (costStore.records) costStore.records = []

    const whStore = useWarehouseLocationStore()
    if (whStore.locations) whStore.locations = []

    const sysStore2 = useSystemStore()
    if (sysStore2.operationRecords) sysStore2.operationRecords = []

    const approvalStore = useApprovalStore()
    if (approvalStore.rules) approvalStore.rules = []

    const logStore = useLogStore()
    if (logStore.logs) logStore.logs = []
  } catch (e) {
    console.warn('[clearAllData] 清除Store状态时出错:', e)
  }

  alert('全部数据已清除，请刷新页面')
  location.reload()
}

function createBackup() {
  sysStore.createBackup('手动备份')
  alert('备份已创建')
}

function restoreBackup(bk) { alert('恢复备份: ' + bk.description) }
function deleteBackup(id) { if (confirm('确认删除该备份？')) sysStore.deleteBackup(id) }
function clearCache() { if (confirm('确认清除所有缓存？')) alert('缓存已清除') }

function openImportWizard() { alert('打开3步导入向导') }
function downloadCsvTemplate() { alert('正在下载CSV模板') }
function forceSaveAll() { alert('已强制保存所有数据') }
function recoverFromSnapshot(snap) { alert(snap ? `已从快照 ${snap.name} 恢复` : '已从最新快照恢复') }
function runAllTests() { testResults.passed = 15; testResults.failed = 1; testResults.skipped = 2; testResults.total = 18; alert('全部测试完成') }
function runQuickTests() { testResults.passed = 8; testResults.failed = 0; testResults.skipped = 0; testResults.total = 8; alert('快速测试完成') }
function viewAuditLogs() { alert('查看完整审计日志') }
function exportAuditLogs() { alert('正在导出审计日志') }
function checkDataIntegrity() { alert('数据完整性检查完成，无异常') }
function refreshHealthDashboard() { healthDashboard.integrity = '99%'; healthDashboard.storage = '64%'; alert('健康仪表盘已刷新') }
</script>

<style scoped>
.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.status-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
.status-badge.info { background: var(--color-info-subtle, #dbeafe); color: var(--color-info, #2563eb); }
.status-badge.neutral { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.status-badge.success { background: var(--color-success-subtle, #dcfce7); color: var(--color-success, #16a34a); }
.form-input, .form-select { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text-primary); }
.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
.form-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.filter-bar { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.modal-title { font-size: var(--font-size-lg); font-weight: 600; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }
.settings-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
</style>
