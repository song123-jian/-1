<template>
  <div v-if="visible" class="data-editor">
    <div class="data-editor-overlay" @click="handleOverlayClick"></div>

    <div class="data-editor-panel" :class="{ 'is-fullscreen': fullscreen }">
      <div class="data-editor-header">
        <h3 class="data-editor-title">{{ title || (isEdit ? '编辑' : '新增') + moduleName }}</h3>
        <div class="data-editor-header-actions">
          <button
            v-if="isEdit && showHistory"
            class="btn btn-ghost btn-sm"
            @click="showVersionHistory = !showVersionHistory"
          >
            历史版本
          </button>
          <button class="btn btn-ghost btn-sm" @click="handleClose"><Icon name="close" :size="14" /></button>
        </div>
      </div>

      <div v-if="showVersionHistory" class="data-editor-sidebar">
        <div class="sidebar-header">版本历史</div>
        <div class="sidebar-body">
          <div
            v-for="ver in versionHistory"
            :key="ver.id"
            class="version-item"
            :class="{ 'is-current': ver.version === currentVersion }"
            @click="handleRestoreVersion(ver)"
          >
            <div class="version-header">
              <span class="version-number">v{{ ver.version }}</span>
              <span class="version-action">{{ actionLabels[ver.action] || ver.action }}</span>
            </div>
            <div class="version-meta">
              <span class="version-user">{{ ver.user }}</span>
              <span class="version-time">{{ formatTime(ver.datetime) }}</span>
            </div>
            <div v-if="ver.label" class="version-label">{{ ver.label }}</div>
            <div v-if="ver.changes && ver.changes.length > 0" class="version-changes">
              <span v-for="change in ver.changes.slice(0, 3)" :key="change.field" class="change-tag">
                {{ change.field }}
              </span>
              <span v-if="ver.changes.length > 3" class="change-more">+{{ ver.changes.length - 3 }}</span>
            </div>
          </div>
          <div v-if="versionHistory.length === 0" class="empty-versions">暂无版本记录</div>
        </div>
      </div>

      <div class="data-editor-body">
        <div v-if="loading" class="data-editor-loading">加载中...</div>
        <div v-else-if="error" class="data-editor-error">
          <span class="error-icon"><Icon name="warning" :size="14" /></span>
          <span class="error-message">{{ error }}</span>
          <button class="btn btn-ghost btn-sm" @click="error = ''">关闭</button>
        </div>

        <form class="data-editor-form" @submit.prevent="handleSubmit">
          <div
            v-for="field in visibleFields"
            :key="field.key"
            class="form-field"
            :class="{ 'is-required': field.required, 'has-error': fieldErrors[field.key] }"
          >
            <label class="form-field-label">
              {{ field.label }}
              <span v-if="field.required" class="required-mark">*</span>
            </label>

            <DataSelect
              v-if="field.type === 'select'"
              v-model="formData[field.key]"
              :module="field.source"
              :variant="field.variant || 'default'"
              :value-field="field.valueField || 'id'"
              :label-field="field.labelField || 'name'"
              :placeholder="field.placeholder || '请选择...'"
              :disabled="field.disabled || readonly"
              :filters="field.filters"
              :module-name="field.label"
              :allow-create="field.allowCreate"
              @change="handleFieldChange(field.key, $event)"
            />

            <DataSelect
              v-else-if="field.type === 'multiselect'"
              v-model="formData[field.key]"
              :module="field.source"
              :variant="field.variant || 'default'"
              :value-field="field.valueField || 'id'"
              :label-field="field.labelField || 'name'"
              :placeholder="field.placeholder || '请选择...'"
              :disabled="field.disabled || readonly"
              multiple
              @change="handleFieldChange(field.key, $event)"
            />

            <textarea
              v-else-if="field.type === 'textarea'"
              v-model="formData[field.key]"
              class="form-textarea"
              :placeholder="field.placeholder || ''"
              :rows="field.rows || 3"
              :disabled="field.disabled || readonly"
              @input="handleFieldChange(field.key, formData[field.key])"
            ></textarea>

            <input
              v-else-if="field.type === 'number'"
              v-model.number="formData[field.key]"
              type="number"
              class="form-input"
              :placeholder="field.placeholder || ''"
              :min="field.min"
              :max="field.max"
              :step="field.step || 'any'"
              :disabled="field.disabled || readonly"
              @input="handleFieldChange(field.key, formData[field.key])"
            />

            <input
              v-else-if="field.type === 'date'"
              v-model="formData[field.key]"
              type="date"
              class="form-input"
              :disabled="field.disabled || readonly"
              @change="handleFieldChange(field.key, formData[field.key])"
            />

            <select
              v-else-if="field.type === 'enum'"
              v-model="formData[field.key]"
              class="form-select"
              :disabled="field.disabled || readonly"
              @change="handleFieldChange(field.key, formData[field.key])"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <input
              v-else
              v-model="formData[field.key]"
              type="text"
              class="form-input"
              :placeholder="field.placeholder || ''"
              :disabled="field.disabled || readonly"
              :maxlength="field.maxLength"
              @input="handleFieldChange(field.key, formData[field.key])"
            />

            <div v-if="fieldErrors[field.key]" class="field-error">{{ fieldErrors[field.key] }}</div>
          </div>
        </form>
      </div>

      <div class="data-editor-footer">
        <div class="footer-left">
          <span v-if="isEdit && formData.updatedAt" class="last-updated">最后更新: {{ formData.updatedAt }}</span>
        </div>
        <div class="footer-right">
          <button class="btn btn-ghost" :disabled="submitting" @click="handleClose">取消</button>
          <button v-if="isEdit && !readonly" class="btn btn-outline" :disabled="submitting" @click="handleReset">
            恢复初始
          </button>
          <button v-if="!readonly" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useDataCenterStore } from '@/stores/dataCenter'
import DataSelect from './DataSelect.vue'
import errorHandler from '@/utils/errorHandler'

export default {
  name: 'DataEditor',
  components: { DataSelect },
  props: {
    visible: { type: Boolean, default: false },
    module: { type: String, required: true },
    itemId: { type: String, default: null },
    moduleName: { type: String, default: '' },
    title: { type: String, default: '' },
    fields: { type: Array, default: () => [] },
    initialData: { type: Object, default: () => ({}) },
    readonly: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
    showHistory: { type: Boolean, default: true }
  },
  emits: ['update:visible', 'saved', 'cancel'],
  setup(props, { emit }) {
    const dataCenter = useDataCenterStore()
    const formData = ref({})
    const originalData = ref({})
    const loading = ref(false)
    const submitting = ref(false)
    const error = ref('')
    const fieldErrors = ref({})
    const showVersionHistory = ref(false)
    const versionHistory = ref([])
    const currentVersion = ref(0)

    const isEdit = computed(() => !!props.itemId)
    const hasUnsavedChanges = computed(() => JSON.stringify(formData.value) !== JSON.stringify(originalData.value))

    const visibleFields = computed(() => {
      return props.fields.filter((f) => f.visible !== false)
    })

    const actionLabels = {
      create: '创建',
      update: '更新',
      delete: '删除',
      restore: '恢复'
    }

    async function loadData() {
      error.value = ''
      fieldErrors.value = {}
      showVersionHistory.value = false
      versionHistory.value = []
      currentVersion.value = 0

      if (!props.itemId) {
        const data = { ...props.initialData }
        for (const field of props.fields) {
          if (data[field.key] === undefined && field.defaultValue !== undefined) {
            data[field.key] = field.defaultValue
          }
        }
        formData.value = data
        originalData.value = JSON.parse(JSON.stringify(data))
        return
      }

      loading.value = true
      try {
        const result = dataCenter.query(props.module, { id: props.itemId })
        if (result.success && result.data) {
          formData.value = { ...result.data }
          originalData.value = JSON.parse(JSON.stringify(result.data))
          versionHistory.value = dataCenter.getVersionHistory(props.module, props.itemId, { limit: 20 })
          if (versionHistory.value.length > 0) {
            currentVersion.value = versionHistory.value[versionHistory.value.length - 1].version
          }
        } else {
          error.value = '未找到指定数据'
        }
      } catch (e) {
        error.value = '加载数据失败: ' + e.message
      } finally {
        loading.value = false
      }
    }

    function handleFieldChange(fieldKey, value) {
      if (fieldErrors.value[fieldKey]) {
        delete fieldErrors.value[fieldKey]
      }

      const field = props.fields.find((f) => f.key === fieldKey)
      if (field?.onChange) {
        field.onChange(value, formData.value, (updates) => {
          Object.assign(formData.value, updates)
        })
      }
    }

    function validateForm() {
      const errors = {}
      for (const field of props.fields) {
        if (field.required) {
          const val = formData.value[field.key]
          if (val === undefined || val === null || val === '') {
            errors[field.key] = `${field.label}不能为空`
          }
        }
        if (field.validate) {
          const err = field.validate(formData.value[field.key], formData.value)
          if (err) errors[field.key] = err
        }
      }
      fieldErrors.value = errors
      return Object.keys(errors).length === 0
    }

    async function handleSubmit() {
      if (!validateForm()) return

      submitting.value = true
      error.value = ''

      try {
        let result
        if (isEdit.value) {
          const updates = {}
          for (const field of props.fields) {
            const key = field.key
            if (JSON.stringify(formData.value[key]) !== JSON.stringify(originalData.value[key])) {
              updates[key] = formData.value[key]
            }
          }

          if (Object.keys(updates).length === 0) {
            error.value = '数据未修改'
            submitting.value = false
            return
          }

          result = await dataCenter.update(props.module, props.itemId, updates)
        } else {
          result = await dataCenter.create(props.module, { ...formData.value })
        }

        if (result.success) {
          emit('saved', result.data)
          closeEditor({ emitCancel: false })
        } else {
          error.value = result.error || '保存失败'
          if (isEdit.value) {
            errorHandler.createSnapshot(props.module, 'update', formData.value, originalData.value)
          }
        }
      } catch (e) {
        error.value = '保存失败: ' + e.message
        errorHandler.handleError(e, { module: props.module, action: isEdit.value ? 'update' : 'create' })
      } finally {
        submitting.value = false
      }
    }

    function handleReset() {
      formData.value = JSON.parse(JSON.stringify(originalData.value))
      fieldErrors.value = {}
    }

    function closeEditor({ emitCancel = true } = {}) {
      showVersionHistory.value = false
      error.value = ''
      fieldErrors.value = {}
      emit('update:visible', false)
      if (emitCancel) {
        emit('cancel')
      }
    }

    function handleClose() {
      if (submitting.value) return

      if (hasUnsavedChanges.value) {
        const confirmed = window.confirm('当前有未保存的更改，确定要关闭吗？')
        if (!confirmed) return
      }

      closeEditor()
    }

    function handleOverlayClick() {
      handleClose()
    }

    function handleRestoreVersion(ver) {
      if (!ver.newData) return
      formData.value = JSON.parse(JSON.stringify(ver.newData))
      currentVersion.value = ver.version
    }

    function formatTime(datetime) {
      if (!datetime) return ''
      const d = new Date(datetime)
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    watch(
      () => [props.visible, props.itemId, props.module],
      ([visible]) => {
        if (visible) {
          loadData()
        }
      },
      { immediate: true }
    )

    return {
      formData,
      loading,
      submitting,
      error,
      fieldErrors,
      isEdit,
      visibleFields,
      showVersionHistory,
      versionHistory,
      currentVersion,
      actionLabels,
      handleFieldChange,
      handleSubmit,
      handleReset,
      handleClose,
      handleOverlayClick,
      handleRestoreVersion,
      formatTime
    }
  }
}
</script>

<style scoped>
.data-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
}
.data-editor-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
}
.data-editor-panel {
  position: relative;
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  background: var(--color-bg, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.data-editor-panel.is-fullscreen {
  width: 95vw;
  max-height: 95vh;
}
.data-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.data-editor-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.data-editor-header-actions {
  display: flex;
  gap: var(--space-2);
}
.data-editor-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  position: relative;
}
.data-editor-sidebar {
  width: 220px;
  border-right: 1px solid var(--color-border, #e5e7eb);
  flex-shrink: 0;
  overflow-y: auto;
}
.sidebar-header {
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-secondary, #f9fafb);
}
.sidebar-body {
  padding: var(--space-2);
}
.version-item {
  padding: var(--space-2);
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: var(--space-1);
  border: 1px solid transparent;
}
.version-item:hover {
  background: var(--color-bg-secondary, #f9fafb);
}
.version-item.is-current {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary-light, #eff6ff);
}
.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.version-number {
  font-weight: 600;
  font-size: 12px;
}
.version-action {
  font-size: 11px;
  color: var(--color-text-muted, #6b7280);
}
.version-meta {
  font-size: 11px;
  color: var(--color-text-muted, #9ca3af);
  margin-top: var(--space-1);
  display: flex;
  gap: var(--space-2);
}
.version-label {
  font-size: 11px;
  color: var(--color-primary, #3b82f6);
  margin-top: var(--space-1);
}
.version-changes {
  margin-top: var(--space-1);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.change-tag {
  font-size: 10px;
  padding: var(--space-1) var(--space-1);
  background: var(--color-bg-secondary, #f3f4f6);
  border-radius: 2px;
}
.change-more {
  font-size: 10px;
  color: var(--color-text-muted, #9ca3af);
}
.empty-versions {
  text-align: center;
  color: var(--color-text-muted, #9ca3af);
  padding: var(--space-5);
  font-size: 13px;
}

.data-editor-form {
  flex: 1;
  padding: var(--space-5);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
  align-content: start;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-field.is-full-width {
  grid-column: 1 / -1;
}
.form-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #374151);
}
.required-mark {
  color: var(--color-danger, #ef4444);
  margin-left: var(--space-1);
}
.form-input,
.form-select,
.form-textarea {
  padding: var(--space-2) var(--space-2);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}
.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.has-error .form-input,
.has-error .form-select,
.has-error .form-textarea {
  border-color: var(--color-danger, #ef4444);
}
.field-error {
  font-size: 12px;
  color: var(--color-danger, #ef4444);
}
.data-editor-loading,
.data-editor-error {
  padding: var(--space-10);
  text-align: center;
  flex: 1;
}
.data-editor-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--color-danger, #ef4444);
}
.data-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.footer-left {
  font-size: 12px;
  color: var(--color-text-muted, #9ca3af);
}
.footer-right {
  display: flex;
  gap: var(--space-2);
}

.btn {
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border-color: var(--color-primary, #3b82f6);
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #2563eb);
}
.btn-outline {
  background: transparent;
  border-color: var(--color-border, #d1d5db);
  color: var(--color-text, #374151);
}
.btn-outline:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.btn-ghost {
  background: transparent;
  border: none;
  color: var(--color-text-muted, #6b7280);
}
.btn-ghost:hover:not(:disabled) {
  color: var(--color-text, #374151);
  background: var(--color-bg-secondary, #f3f4f6);
}
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
}
</style>
