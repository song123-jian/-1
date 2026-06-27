<template>
  <div class="smart-recognize-panel" :class="{ expanded: showSmartRec }">
    <div class="smart-recognize-header" @click="emit('update:showSmartRec', !showSmartRec)">
      <div class="sr-header-left">
        <Icon name="zap" :size="14" />
        本地智能识别
        <span class="sr-badge sr-badge-success">免费</span>
      </div>
      <span class="sr-toggle">
        {{ showSmartRec ? '收起' : '展开' }}
        <Icon :name="showSmartRec ? 'chevronUp' : 'chevronDown'" :size="14" />
      </span>
    </div>
    <div v-if="showSmartRec" class="smart-recognize-body">
      <textarea
        :value="smartRecInput"
        class="form-textarea smart-recognize-textarea"
        rows="3"
        :placeholder="placeholder"
        @input="emit('update:smartRecInput', $event.target.value)"
      ></textarea>
      <div class="sr-actions">
        <label class="btn btn-ghost btn-sm">
          <Icon name="file" :size="14" />
          上传文件
          <input type="file" style="display: none" @change="emit('handleSmartFileUpload', $event)" />
        </label>
        <button class="btn btn-ghost btn-sm" @click="emit('clear')">清空</button>
        <button class="btn btn-primary btn-sm" @click="emit('runSmartRecognize')">
          <Icon name="search" :size="14" />
          开始识别
        </button>
      </div>
      <div v-if="smartRecResult" class="sr-result-panel">
        <div v-if="smartRecResult.insights && smartRecResult.insights.length > 0" class="sr-insights">
          <div v-for="insight in smartRecResult.insights" :key="insight" class="sr-insight-item">
            <Icon name="checkCircle" :size="12" />
            {{ insight }}
          </div>
        </div>
        <!-- 表头字段识别结果 -->
        <div v-if="smartRecResult.items && smartRecResult.items.length > 0">
          <div class="sr-result-header" :class="{ 'has-warnings': smartRecResult.lowConfCount > 0 }">
            <Icon name="checkCircle" :size="14" />
            已识别
            <strong>{{ smartRecResult.identifiedCount }}</strong>
            个字段
            <span v-if="smartRecResult.lowConfCount > 0" class="sr-badge sr-badge-warning">
              {{ smartRecResult.lowConfCount }}项需确认
            </span>
            <span v-else class="sr-badge sr-badge-success">全部可信</span>
          </div>
          <div class="sr-result-body">
            <div v-for="item in smartRecResult.items" :key="item.key" class="sr-result-item">
              <span class="sr-result-label">{{ item.label }}</span>
              <input class="sr-result-input" :value="item.value" @input="item.value = $event.target.value" />
              <span class="sr-result-confidence" :class="item.confLevel">
                {{ item.confLabel }} {{ item.confidence }}%
              </span>
            </div>
          </div>
        </div>
        <!-- 表格行识别结果 -->
        <div v-if="smartRecResult.tableRows && smartRecResult.tableRows.length > 0" class="sr-table-section">
          <div class="sr-table-header">
            <Icon name="table" :size="14" />
            识别到
            <strong>{{ smartRecResult.tableRows.length }}</strong>
            行明细数据
            <span class="sr-badge sr-badge-success">表格</span>
          </div>
          <div class="sr-table-scroll">
            <table class="sr-table">
              <thead>
                <tr>
                  <th class="sr-table-rownum">#</th>
                  <th v-for="h in smartRecResult.tableHeaders" :key="h.key">{{ h.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ridx) in smartRecResult.tableRows" :key="ridx">
                  <td class="sr-table-rownum">{{ ridx + 1 }}</td>
                  <td v-for="h in smartRecResult.tableHeaders" :key="h.key">
                    <input
                      v-if="h.type === 'number'"
                      class="sr-table-input"
                      type="number"
                      step="any"
                      :value="row[h.key]"
                      @input="row[h.key] = parseFloat($event.target.value) || 0"
                    />
                    <input
                      v-else
                      class="sr-table-input"
                      :value="row[h.key]"
                      @input="row[h.key] = $event.target.value"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 无结果提示 -->
        <div
          v-if="
            (!smartRecResult.items || smartRecResult.items.length === 0) &&
            (!smartRecResult.tableRows || smartRecResult.tableRows.length === 0)
          "
          class="sr-empty-tip"
        >
          未能识别出有效信息，请检查输入内容格式
        </div>
        <!-- 操作按钮 -->
        <div
          v-if="
            (smartRecResult.items && smartRecResult.items.length > 0) ||
            (smartRecResult.tableRows && smartRecResult.tableRows.length > 0)
          "
          class="sr-result-actions"
        >
          <button class="btn btn-ghost btn-sm" @click="emit('runSmartRecognize')">重新识别</button>
          <button class="btn btn-primary btn-sm" @click="emit('applySmartRecognize')">
            <Icon name="checkCircle" :size="14" />
            确认填入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'SmartRecognizePanel' }
</script>
<script setup>
import Icon from '@/components/Icon.vue'

defineProps({
  showSmartRec: { type: Boolean, default: false },
  smartRecInput: { type: String, default: '' },
  smartRecResult: { type: Object, default: null },
  placeholder: { type: String, default: '粘贴文本，系统将自动识别并提取关键字段...' }
})

const emit = defineEmits([
  'update:showSmartRec',
  'update:smartRecInput',
  'runSmartRecognize',
  'applySmartRecognize',
  'handleSmartFileUpload',
  'clear'
])
</script>

<style scoped>
.smart-recognize-panel {
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.smart-recognize-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-elevated);
  cursor: pointer;
  user-select: none;
}
.smart-recognize-header:hover {
  background: var(--color-surface-hover);
}
.sr-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.sr-icon {
  font-size: 16px;
}
.sr-badge {
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 700;
}
.sr-badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.sr-badge-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.sr-toggle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.smart-recognize-body {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.smart-recognize-textarea {
  width: 100%;
  min-height: 112px;
  resize: vertical;
  box-sizing: border-box;
}
.sr-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.sr-result-panel {
  margin-top: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: 100%;
}

.sr-insights {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sr-insight-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.sr-result-header {
  padding: var(--space-2) var(--space-3);
  background: var(--color-success-subtle);
  font-size: var(--font-size-sm);
}
.sr-result-header.has-warnings {
  background: rgba(245, 158, 11, 0.08);
}
.sr-result-body {
  padding: var(--space-2) var(--space-3);
}
.sr-result-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  width: 100%;
  flex-wrap: wrap;
}
.sr-result-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 70px;
}
.sr-result-input {
  flex: 1 1 320px;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}
.sr-result-confidence {
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}
.sr-result-confidence.high {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.sr-result-confidence.medium {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.sr-result-confidence.low {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.sr-empty-tip {
  padding: var(--space-3);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.sr-result-actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
  flex-wrap: wrap;
}
/* 表格区域 */
.sr-table-section {
  border-top: 1px solid var(--color-border);
}
.sr-table-header {
  padding: var(--space-2) var(--space-3);
  background: rgba(59, 130, 246, 0.06);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.sr-table-scroll {
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
}
.sr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-xs);
}
.sr-table th {
  background: var(--color-surface-elevated);
  padding: var(--space-1) var(--space-2);
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-base);
}
.sr-table td {
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.sr-table-rownum {
  width: 28px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 10px;
}
.sr-table-input {
  width: 100%;
  min-width: 50px;
  padding: 2px var(--space-1);
  font-size: var(--font-size-xs);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
}
.sr-table-input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg-primary);
  outline: none;
}
</style>
