<template>
  <div>
    <div class="page-header" style="margin-bottom: var(--space-3)">
      <div></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="handleCreateBackup">
          <Icon name="save" :size="14" />
          立即备份
        </button>
        <button class="btn btn-ghost" @click="handleClearCache">
          <Icon name="delete" :size="14" />
          清除缓存
        </button>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="save" :size="14" />
          备份记录
        </span>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>说明</th>
                <th>大小</th>
                <th>类型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="backups.length === 0">
                <td colspan="5" class="empty-state">暂无备份记录</td>
              </tr>
              <tr v-for="backup in backups" :key="backup.id">
                <td>{{ backup.createdAt }}</td>
                <td>{{ backup.description }}</td>
                <td>{{ backup.size }}</td>
                <td>
                  <span class="status-badge neutral">
                    {{ backup.type === 'auto' ? '自动' : '手动' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="handleRestoreBackup(backup)">恢复</button>
                  <button class="btn btn-ghost btn-sm danger-text" @click="handleDeleteBackup(backup.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'BackupRecords' }
</script>

<script setup>
import { computed } from 'vue'
import { useSystemStore } from '@/modules/system/stores/system'
import { clearRuntimeCache, createBackupRecord, restoreAppBackup } from '@/modules/system/utils/appBackup'

const sysStore = useSystemStore()

const backups = computed(() => sysStore.dataBackups || [])

function persistBackups() {
  localStorage.setItem('gj_erp_dataManagement', JSON.stringify(backups.value))
}

function handleCreateBackup() {
  const record = createBackupRecord('手动备份')
  sysStore.dataBackups.unshift(record)
  if (sysStore.dataBackups.length > 20) {
    sysStore.dataBackups.splice(20)
  }
  persistBackups()
  alert('备份已创建')
}

function handleRestoreBackup(backup) {
  if (!backup?.payload) {
    alert('该备份记录不包含可恢复数据，请重新创建备份')
    return
  }
  if (!confirm(`确认恢复备份“${backup.description}”吗？当前数据会被替换。`)) return
  restoreAppBackup(backup.payload, { preserveKeys: ['gj_erp_dataManagement'] })
  alert('备份已恢复，页面即将刷新')
  location.reload()
}

function handleDeleteBackup(id) {
  if (!confirm('确认删除该备份记录吗？')) return
  const next = backups.value.filter((item) => item.id !== id)
  sysStore.dataBackups.splice(0, sysStore.dataBackups.length, ...next)
  persistBackups()
}

function handleClearCache() {
  if (!confirm('确认清除页面缓存和临时草稿吗？')) return
  const count = clearRuntimeCache()
  alert(`缓存已清除，共处理 ${count} 项`)
}
</script>

<style scoped>
.danger-text {
  color: var(--color-danger);
}
</style>
