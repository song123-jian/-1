<template>
  <div class="panel-card" style="margin-bottom: var(--space-4)">
    <div class="panel-card-header">
      <span class="panel-card-title">
        <Icon name="delete" :size="14" />
        数据清除
      </span>
    </div>
    <div class="panel-card-body">
      <div
        style="
          background: var(--color-danger-subtle);
          color: var(--color-danger);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: var(--font-size-sm);
        "
      >
        <Icon name="warning" :size="14" />
        危险操作：清除后所有业务数据将永久删除且不可恢复！请务必先导出备份。
      </div>
      <div
        style="
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-2);
          margin-bottom: var(--space-3);
        "
      >
        清除范围：客户、报价、库存、出入库、送货、回款、对账、采购、供应商、物性表、项目、营业执照、开票资料、盘点、成本核算、审批规则、待办事项、通知、操作日志、客户交互记录、标签等全部业务数据。
      </div>
      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap">
        <button class="btn btn-primary" @click="emit('exportBackup')">
          <Icon name="download" :size="14" />
          先导出备份
        </button>
        <button
          class="btn btn-secondary"
          style="background: var(--color-danger); color: var(--color-text-inverse); border-color: var(--color-danger)"
          :disabled="isClearing"
          @click="handleClear"
        >
          <Icon name="delete" :size="14" />
          {{ isClearing ? '清除中...' : '清除全部数据' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DataClear' }
</script>
<script setup>
import { ref } from 'vue'

const emit = defineEmits(['exportBackup'])

const isClearing = ref(false)

async function handleClear() {
  if (!confirm('确认清除全部数据？此操作不可恢复！')) {
    console.debug('[DataClear] 用户取消第一次确认')
    return
  }
  if (!confirm('再次确认：真的要删除所有数据吗？')) {
    console.debug('[DataClear] 用户取消第二次确认')
    return
  }

  isClearing.value = true
  console.debug('[DataClear] ========== 开始清除全部数据 ==========')
  console.debug('[DataClear] 步骤1: 清除 localStorage')

  const localStorageBefore = localStorage.length
  localStorage.clear()
  console.debug(`[DataClear] localStorage 已清除，原键数量: ${localStorageBefore}`)

  console.debug('[DataClear] 步骤2: 清除 sessionStorage')
  const sessionStorageBefore = sessionStorage.length
  sessionStorage.clear()
  console.debug(`[DataClear] sessionStorage 已清除，原键数量: ${sessionStorageBefore}`)

  console.debug('[DataClear] 步骤3: 清除 IndexedDB')
  try {
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('dp-erp-storage')
      req.onsuccess = () => {
        console.debug('[DataClear] IndexedDB 删除成功')
        resolve()
      }
      req.onerror = () => {
        console.warn('[DataClear] IndexedDB 删除失败')
        resolve()
      }
      req.onblocked = () => {
        console.warn('[DataClear] IndexedDB 删除被阻塞')
        resolve()
      }
      setTimeout(() => {
        console.debug('[DataClear] IndexedDB 删除超时，继续执行')
        resolve()
      }, 1000)
    })
  } catch (e) {
    console.warn('[DataClear] 清除IndexedDB异常:', e)
  }

  console.debug('[DataClear] 步骤4: 重新设置所有 _initialized 标志')
  const allInitFlags = [
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
    'gj_erp_contract_templates_initialized',
    'gj_erp_inventory_initialized',
    'gj_erp_approval_initialized',
    'gj_erp_systemParams_initialized',
    'gj_erp_logs_initialized',
    'gj_erp_bom_initialized',
    'gj_erp_production_initialized',
    'gj_erp_transfer_initialized',
    'gj_erp_stocktaking_initialized',
    'gj_erp_purchase_initialized',
    'gj_erp_supplier_initialized',
    'gj_erp_payables_initialized',
    'gj_erp_receivables_initialized',
    'gj_erp_workflow_initialized',
    'gj_erp_notification_initialized',
    'gj_erp_company_initialized'
  ]

  allInitFlags.forEach((key) => {
    localStorage.setItem(key, '1')
    localStorage.setItem('gj_erp_' + key, '1')
  })
  console.debug(`[DataClear] 已设置 ${allInitFlags.length} 个 _initialized 标志（含双层前缀）`)

  console.debug('[DataClear] 步骤5: 验证 localStorage 状态')
  const localStorageAfter = localStorage.length
  console.debug(`[DataClear] localStorage 当前键数量: ${localStorageAfter}`)
  for (let i = 0; i < Math.min(localStorageAfter, 5); i++) {
    const k = localStorage.key(i)
    console.debug(`[DataClear] localStorage[${i}]: ${k}`)
  }
  if (localStorageAfter > 5) {
    console.debug(`[DataClear] ... 还有 ${localStorageAfter - 5} 个键`)
  }

  console.debug('[DataClear] ========== 清除完成，即将刷新页面 ==========')
  alert('全部数据已清除，页面即将刷新')
  location.reload()
}
</script>
