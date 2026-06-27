<template>
  <div class="content-grid content-grid-2" style="margin-bottom: var(--space-4)">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="download" :size="14" />
          完整备份导出
        </span>
      </div>
      <div class="panel-card-body">
        <p class="helper-text">导出当前本机的完整业务数据和系统配置快照，适合后续整机恢复。</p>
        <div class="action-row">
          <button class="btn btn-primary" :disabled="isExporting" @click="handleExportJSON">
            <Icon name="download" :size="14" />
            {{ isExporting ? '导出中...' : '导出完整备份 (JSON)' }}
          </button>
          <button class="btn btn-ghost" @click="emit('showImport')">
            <Icon name="upload" :size="14" />
            合并导入数据
          </button>
        </div>
        <div v-if="exportMessage" class="success-text">
          {{ exportMessage }}
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="upload" :size="14" />
          从备份恢复
        </span>
      </div>
      <div class="panel-card-body">
        <div class="warning-box">
          <Icon name="warning" :size="14" />
          恢复会替换当前本机数据，请先确认已经另行备份。
        </div>
        <input ref="fileInput" type="file" style="display: none" accept=".json" @change="handleFileChange" />
        <button class="btn btn-secondary" @click="fileInput?.click()">
          <Icon name="upload" :size="14" />
          选择完整备份文件
        </button>
        <div
          v-if="importResult"
          class="result-text"
          :style="{ color: importResult.success ? 'var(--color-success)' : 'var(--color-danger)' }"
        >
          {{ importResult.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DataBackup' }
</script>

<script setup>
import { ref } from 'vue'
import { runBackupWorkerTask } from '@/modules/system/utils/backupWorkerClient'

const emit = defineEmits(['showImport'])

const isExporting = ref(false)
const exportMessage = ref('')
const importResult = ref(null)
const fileInput = ref(null)

async function handleExportJSON() {
  isExporting.value = true
  exportMessage.value = ''

  try {
    const json = await runBackupWorkerTask('export', { description: '完整备份导出' })
    const filename = `完整备份_${new Date().toISOString().split('T')[0]}.json`
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    exportMessage.value = `备份已导出：${filename}`
  } catch (error) {
    exportMessage.value = `导出失败：${error.message || '未知错误'}`
  } finally {
    isExporting.value = false
  }
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!confirm('确认使用该完整备份恢复当前数据吗？此操作会替换本机现有数据。')) {
    event.target.value = ''
    return
  }

  importResult.value = { success: false, message: '正在恢复备份...' }

  try {
    const text = await file.text()
    const result = await runBackupWorkerTask('restore', {
      content: text,
      options: { preserveKeys: ['gj_erp_dataManagement'] }
    })
    importResult.value = {
      success: true,
      message: `恢复成功：共还原 ${result.keyCount || 0} 项存储数据`
    }
    setTimeout(() => location.reload(), 600)
  } catch (error) {
    importResult.value = { success: false, message: `恢复失败：${error.message || '文件解析错误'}` }
  }

  event.target.value = ''
}
</script>

<style scoped>
.helper-text {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-4);
}

.action-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.success-text {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-success);
}

.warning-box {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-sm);
}

.result-text {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
}
</style>
