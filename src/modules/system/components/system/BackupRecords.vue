<template>
  <div class="page-header" style="margin-bottom:var(--space-3)">
    <div></div>
    <div class="page-header-actions">
      <button class="btn btn-primary" @click="handleCreateBackup">
        <Icon name="save" :size="14" /> 立即备份
      </button>
      <button class="btn btn-ghost" @click="handleClearCache">
        <Icon name="delete" :size="14" /> 清除缓存
      </button>
    </div>
  </div>

  <div class="panel-card">
    <div class="panel-card-header">
      <span class="panel-card-title"><Icon name="save" :size="14" /> 备份记录</span>
    </div>
    <div class="panel-card-body no-padding">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>描述</th>
              <th>大小</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sysStore.dataBackups.length === 0">
              <td colspan="5" class="empty-state">暂无备份记录</td>
            </tr>
            <tr v-for="bk in sysStore.dataBackups" :key="bk.id">
              <td>{{ bk.createdAt }}</td>
              <td>{{ bk.description }}</td>
              <td>{{ bk.size }}</td>
              <td>
                <span class="status-badge" :class="bk.type === 'auto' ? 'info' : 'neutral'">
                  {{ bk.type === 'auto' ? '自动' : '手动' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="handleRestoreBackup(bk)">恢复</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteBackup(bk.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSystemStore } from '@/modules/system/stores/system'

const sysStore = useSystemStore()

function handleCreateBackup() {
  sysStore.createBackup('手动备份')
  alert('备份已创建')
}

function handleRestoreBackup(bk) {
  alert('恢复备份: ' + bk.description)
}

function handleDeleteBackup(id) {
  if (confirm('确认删除该备份？')) {
    sysStore.deleteBackup(id)
  }
}

function handleClearCache() {
  if (confirm('确认清除所有缓存？')) {
    alert('缓存已清除')
  }
}
</script>
