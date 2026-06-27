<template>
  <div>
    <div class="page-header" style="margin-bottom: var(--space-3)">
      <div>
        <h2 class="page-header-title">数据管理</h2>
        <p class="page-header-subtitle">集中处理备份、恢复、清理与批量导入</p>
      </div>
    </div>

    <DataBackup @show-import="showImportDialog = true" />
    <DataClear @export-backup="handleExportBackup" />
    <BackupRecords />
    <AutoSavePanel />
    <OpHistory />
    <SystemHealth />

    <div v-if="showImportDialog" class="modal-overlay" @click.self="showImportDialog = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">合并导入数据</span>
          <button class="modal-close" @click="showImportDialog = false">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <div class="warning-box">
            <Icon name="warning" :size="14" />
            这里执行的是合并导入，不会自动清空现有数据；如果要完整覆盖，请使用上方“从备份恢复”。
          </div>
          <div class="form-group">
            <label class="form-label">选择 JSON 文件</label>
            <input
              type="file"
              style="width: 100%; color: var(--color-text-secondary)"
              @change="handleImportDialogFile"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DataManagement' }
</script>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import DataBackup from './DataBackup.vue'
import DataClear from './DataClear.vue'
import BackupRecords from './BackupRecords.vue'
import AutoSavePanel from './AutoSavePanel.vue'
import OpHistory from './OpHistory.vue'
import SystemHealth from './SystemHealth.vue'
import dataTransfer from '@/utils/dataTransfer'
import { destroyBackupWorker, runBackupWorkerTask } from '@/modules/system/utils/backupWorkerClient'

const showImportDialog = ref(false)

function downloadJson(json, filename) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleExportBackup() {
  runBackupWorkerTask('export', { description: '清理前完整备份' }).then((json) => {
    const filename = `清理前备份_${new Date().toISOString().split('T')[0]}.json`
    downloadJson(json, filename)
  })
}

async function handleImportDialogFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const parsed = await runBackupWorkerTask('validate', { content: text })

    if (parsed?.keyCount) {
      alert('这是完整备份文件。请使用“从备份恢复”入口，不要在“合并导入”中使用。')
      event.target.value = ''
      return
    }

    const result = await dataTransfer.importJSON(text, { validate: true })
    if (result.success) {
      const total = result.results.reduce((sum, item) => sum + item.imported, 0)
      alert(`导入成功：共导入 ${total} 条数据`)
      showImportDialog.value = false
    } else {
      const errors = result.results.flatMap((item) => item.errors || [])
      alert(`导入失败：${errors[0] || result.error || '未知错误'}`)
    }
  } catch (error) {
    alert(`导入失败：${error.message || '文件解析错误'}`)
  }

  event.target.value = ''
}

onBeforeUnmount(() => {
  destroyBackupWorker()
})
</script>

<style scoped>
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.btn:hover {
  background: var(--color-bg-secondary);
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.modal-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.modal-close:hover {
  background: var(--color-bg-tertiary);
}

.modal-body {
  padding: var(--space-5);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.warning-box {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-sm);
}
</style>
