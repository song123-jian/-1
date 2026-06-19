<template>
  <div>
    <div class="page-header" style="margin-bottom: var(--space-3)">
      <div>
        <h2 class="page-header-title">数据管理</h2>
        <p class="page-header-subtitle">数据备份、恢复和批量导入导出</p>
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
          <span class="modal-title">导入数据</span>
          <button class="modal-close" @click="showImportDialog = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div
            style="
              background: var(--color-warning-subtle);
              color: var(--color-warning);
              padding: var(--space-3);
              border-radius: var(--radius-md);
              margin-bottom: var(--space-4);
              font-size: var(--font-size-sm);
            "
          >
            <Icon name="warning" :size="14" />
            导入将覆盖当前所有数据，请确保已备份！
          </div>
          <div class="form-group">
            <label class="form-label">选择JSON文件</label>
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
import { ref } from 'vue'
import DataBackup from './DataBackup.vue'
import DataClear from './DataClear.vue'
import BackupRecords from './BackupRecords.vue'
import AutoSavePanel from './AutoSavePanel.vue'
import OpHistory from './OpHistory.vue'
import SystemHealth from './SystemHealth.vue'
import dataTransfer from '@/utils/dataTransfer'

const showImportDialog = ref(false)

function handleExportBackup() {
  const modules = dataTransfer.getSupportedModules().map((m) => m.key)
  const json = dataTransfer.exportJSON(modules, { pretty: true })
  if (!json) {
    alert('导出失败：无数据或发生错误')
    return
  }
  const filename = '数据备份_' + new Date().toISOString().split('T')[0] + '.json'
  dataTransfer.downloadFile(json, filename, 'json')
}

async function handleImportDialogFile(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有数据，确认继续？')) {
    event.target.value = ''
    return
  }
  try {
    const text = await file.text()
    const result = await dataTransfer.importJSON(text, { validate: true })
    if (result.success) {
      const total = result.results.reduce((s, r) => s + r.imported, 0)
      alert(`导入成功：共导入 ${total} 条数据`)
    } else {
      const errors = result.results.flatMap((r) => r.errors || [])
      alert('导入失败：' + (errors[0] || '未知错误'))
    }
  } catch (e) {
    alert('导入失败：' + (e.message || '文件解析错误'))
  }
  event.target.value = ''
  showImportDialog.value = false
}
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
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
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
</style>
