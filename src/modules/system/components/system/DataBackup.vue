<template>
  <div class="content-grid content-grid-2" style="margin-bottom:var(--space-4)">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="download" :size="14" /> 数据导出备份</span>
      </div>
      <div class="panel-card-body">
        <p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">
          将所有业务数据导出为JSON备份文件，包括客户、报价、库存、供应商等全部数据。
        </p>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          <button class="btn btn-primary" :disabled="isExporting" @click="handleExportJSON">
            <Icon name="download" :size="14" />
            {{ isExporting ? '导出中...' : '导出数据备份 (JSON)' }}
          </button>
          <button class="btn btn-ghost" @click="emit('showImport')">
            <Icon name="download" :size="14" /> 导入数据
          </button>
        </div>
        <div v-if="exportMessage" style="margin-top:var(--space-3);font-size:var(--font-size-sm);color:var(--color-success)">
          {{ exportMessage }}
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="upload" :size="14" /> 数据恢复</span>
      </div>
      <div class="panel-card-body">
        <div style="background:var(--color-warning-subtle);color:var(--color-warning);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)">
          <Icon name="warning" :size="14" /> 警告：导入将覆盖当前所有数据，请确保已备份！
        </div>
        <input ref="fileInput" type="file" style="display:none" accept=".json" @change="handleFileChange">
        <button class="btn btn-secondary" @click="fileInput?.click()">
          <Icon name="upload" :size="14" /> 选择备份文件 (JSON)
        </button>
        <div v-if="importResult" style="margin-top:var(--space-3);font-size:var(--font-size-sm)" :style="{ color: importResult.success ? 'var(--color-success)' : 'var(--color-danger)' }">
          {{ importResult.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import dataTransfer from '@/utils/dataTransfer'

const emit = defineEmits(['showImport'])

const isExporting = ref(false)
const exportMessage = ref('')
const importResult = ref(null)
const fileInput = ref(null)

async function handleExportJSON() {
  isExporting.value = true
  exportMessage.value = ''
  try {
    const modules = dataTransfer.getSupportedModules().map(m => m.key)
    const json = dataTransfer.exportJSON(modules, { pretty: true })
    if (!json) {
      exportMessage.value = '导出失败：无数据或发生错误'
      return
    }
    const filename = '数据备份_' + new Date().toISOString().split('T')[0] + '.json'
    dataTransfer.downloadFile(json, filename, 'json')
    exportMessage.value = '备份已导出：' + filename
  } catch (e) {
    exportMessage.value = '导出失败：' + (e.message || '未知错误')
  } finally {
    isExporting.value = false
  }
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有数据，确认继续？')) {
    event.target.value = ''
    return
  }
  importResult.value = { success: false, message: '正在导入...' }
  try {
    const text = await file.text()
    const result = await dataTransfer.importJSON(text, { validate: true })
    if (result.success) {
      const total = result.results.reduce((s, r) => s + r.imported, 0)
      importResult.value = { success: true, message: `导入成功：共导入 ${total} 条数据` }
    } else {
      const errors = result.results.flatMap(r => r.errors || [])
      importResult.value = { success: false, message: '导入失败：' + (errors[0] || '未知错误') }
    }
  } catch (e) {
    importResult.value = { success: false, message: '导入失败：' + (e.message || '文件解析错误') }
  }
  event.target.value = ''
}
</script>
