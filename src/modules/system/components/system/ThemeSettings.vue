<template>
  <div>
    <!-- Page header -->
    <div class="page-header" style="margin-bottom: var(--space-3)">
      <div>
        <h2 class="page-header-title">主题管理</h2>
        <p class="page-header-subtitle">统一控制主题色、排版、模式和界面一致性</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" @click="showImportModal = true">
          <Icon name="upload" :size="14" />
          导入配置
        </button>
        <button class="btn btn-ghost" @click="exportCurrentTheme">
          <Icon name="download" :size="14" />
          导出配置
        </button>
        <button class="btn btn-primary" @click="saveThemeSettings">
          <Icon name="save" :size="14" />
          保存设置
        </button>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar" style="margin-bottom: var(--space-4)">
      <button
        v-for="s in themeSchema"
        :key="s.key"
        class="tab-btn"
        :class="{ active: activeTab === s.key }"
        @click="activeTab = s.key"
      >
        <Icon :name="s.icon" :size="14" />
        {{ s.label }}
      </button>
    </div>

    <!-- Schema-driven renderer -->
    <ThemeRenderer
      v-for="s in themeSchema"
      v-show="activeTab === s.key"
      :key="s.key"
      :section="s"
      :settings="themeStore.themeSettings"
      :store="themeStore"
      @action="handleAction"
    />

    <!-- Import modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">导入主题</span>
          <button class="modal-close" @click="showImportModal = false"><Icon name="x" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">粘贴主题配置 JSON</label>
            <textarea
              v-model="importJson"
              class="form-textarea"
              rows="10"
              placeholder='{"theme":"ocean","mode":"dark",...}'
            ></textarea>
          </div>
          <div v-if="importResult" class="import-result" :class="{ error: !importResult.success }">
            {{ importResult.message }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="doImportTheme">导入</button>
        </div>
      </div>
    </div>

    <!-- Export modal -->
    <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">导出主题</span>
          <button class="modal-close" @click="showExportModal = false"><Icon name="x" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">主题配置 JSON</label>
            <textarea class="form-textarea" :value="exportJson" rows="10" readonly></textarea>
          </div>
          <button class="btn btn-primary" style="width: 100%" @click="copyExportJson">
            <Icon name="copy" :size="14" />
            {{ copied ? '已复制' : '复制到剪贴板' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ThemeSettings' }
</script>
<script setup>
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { themeSchema } from '../../config/themeSchema'
import ThemeRenderer from './ThemeRenderer.vue'

const themeStore = useThemeStore()
const activeTab = ref('switching')

const showImportModal = ref(false)
const showExportModal = ref(false)
const importJson = ref('')
const exportJson = ref('')
const importResult = ref(null)
const copied = ref(false)

function saveThemeSettings() {
  themeStore.applyToDocument()
  themeStore.persist()
  alert('主题设置已保存')
}

function exportCurrentTheme() {
  exportJson.value = themeStore.exportTheme()
  showExportModal.value = true
  copied.value = false
}

function doImportTheme() {
  importResult.value = themeStore.importTheme(importJson.value)
  if (importResult.value.success) {
    setTimeout(() => {
      showImportModal.value = false
      importJson.value = ''
    }, 800)
  }
}

function copyExportJson() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(exportJson.value).then(() => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    })
  }
}

function handleAction(action) {
  const map = {
    toggleMode: () => themeStore.toggleMode(),
    resetDefault: () => {
      themeStore.resetToDefault()
      alert('已恢复默认主题')
    },
    resetBackground: () =>
      themeStore.updateSettings({
        bgType: 'solid',
        bgColor: '#0f172a',
        gradientColor: '#1e293b',
        gradientColor2: '#0f172a',
        gradientDir: 'to bottom'
      }),
    resetSurface: () =>
      themeStore.updateSettings({
        cardBg: '#1e293b',
        surfaceElevated: '#1a2332',
        borderColor: '#475569',
        shadowEnabled: true,
        shadowIntensity: 50
      }),
    applyAutoSplash: () => alert('已应用推荐的启动动画方案'),
    refreshSplash: () => alert('已重新分析并更新推荐方案'),
    applyDynamicSplash: () => alert('已根据当前主题色自动调整启动动画配色'),
    previewSplash: () => alert('预览当前启动动画方案'),
    refreshColorSystem: () => alert('色彩系统参考已刷新'),
    resetAllCustom: () => {
      themeStore.resetToDefault()
      alert('已重置所有自定义')
    },
    applyAccentPreset: () => themeStore.setTheme(themeStore.themeSettings.accentPreset || 'ocean')
  }
  const fn = map[action]
  if (fn) fn()
  else console.warn('[ThemeSettings] 未知 action:', action)
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: var(--space-1);
  border-bottom: 2px solid var(--color-border);
  flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 2000);
}
.modal-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 520px;
  box-shadow: var(--shadow-lg);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.modal-close:hover {
  background: var(--color-surface-hover);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.import-result {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
  background: var(--color-success-subtle, rgba(34, 197, 94, 0.1));
  color: var(--color-success, #22c55e);
}
.import-result.error {
  background: var(--color-error-subtle, rgba(239, 68, 68, 0.1));
  color: var(--color-error, #ef4444);
}
</style>
