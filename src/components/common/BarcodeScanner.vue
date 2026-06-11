<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-dialog" style="max-width: 500px">
      <div class="modal-header">
        <span class="modal-title">
          <Icon name="scan" :size="14" /> 扫码输入
        </span>
        <button class="modal-close" @click="handleClose">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 扫码类型 -->
        <div class="form-group">
          <label class="form-label">扫码类型</label>
          <select v-model="scanType" class="form-select">
            <option value="material">编号</option>
            <option value="location">仓位编码</option>
            <option value="order">单据编号</option>
          </select>
        </div>

        <!-- 输入框 -->
        <div class="form-group">
          <label class="form-label">{{ isManual ? '手动输入' : '扫码输入' }}</label>
          <div style="display: flex; gap: var(--space-2)">
            <input
              ref="inputRef"
              v-model="scanInput"
              type="text"
              class="form-input"
              :placeholder="isManual ? '请输入编码...' : '请扫描条码...'"
              @keydown.enter="handleScan"
              autofocus
            />
            <button class="btn btn-outline" @click="isManual = !isManual">
              <Icon :name="isManual ? 'scan' : 'keyboard'" :size="14" />
            </button>
          </div>
        </div>

        <!-- 扫码结果 -->
        <div v-if="lastResult" class="scan-result" style="margin-bottom: var(--space-4)">
          <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--space-2)">最近扫码结果</div>
          <div class="scan-result-card">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span class="status-badge" :class="getResultBadgeClass(lastResult.type)">{{ getTypeLabel(lastResult.type) }}</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">{{ lastResult.time }}</span>
            </div>
            <div style="margin-top: var(--space-2); font-family: var(--font-mono); font-size: var(--font-size-md)">{{ lastResult.value }}</div>
          </div>
        </div>

        <!-- 最近扫码记录 -->
        <div v-if="scanHistory.length > 0">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2)">
            <span style="font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary)">扫码记录</span>
            <button class="action-btn" @click="scanHistory = []">清空</button>
          </div>
          <div class="scan-history-list">
            <div v-for="(record, idx) in scanHistory" :key="idx" class="scan-history-item" @click="selectRecord(record)">
              <span class="status-badge" :class="getResultBadgeClass(record.type)" style="font-size: 10px">{{ getTypeLabel(record.type) }}</span>
              <span class="cell-mono" style="flex: 1">{{ record.value }}</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">{{ record.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="handleClose">关闭</button>
        <button class="btn btn-primary" :disabled="!scanInput" @click="handleScan">
          <Icon name="check" :size="14" /> 确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { parseBarcode } from '@/utils/barcode'

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'material' }
})

const emit = defineEmits(['close', 'scanned'])

const scanType = ref('material')
const scanInput = ref('')
const isManual = ref(false)
const lastResult = ref(null)
const scanHistory = ref([])
const inputRef = ref(null)

watch(() => props.visible, (val) => {
  if (val) {
    scanType.value = props.type
    scanInput.value = ''
    nextTick(() => {
      if (inputRef.value) inputRef.value.focus()
    })
  }
})

watch(() => props.type, (val) => {
  scanType.value = val
})

function handleScan() {
  if (!scanInput.value.trim()) return

  const result = parseBarcode(scanInput.value.trim())
  const now = new Date()
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0')

  const record = {
    type: result.type,
    value: result.value,
    rawInput: scanInput.value.trim(),
    time: timeStr
  }

  lastResult.value = record
  scanHistory.value.unshift(record)
  if (scanHistory.value.length > 20) scanHistory.value = scanHistory.value.slice(0, 20)

  emit('scanned', record)
  scanInput.value = ''

  nextTick(() => {
    if (inputRef.value) inputRef.value.focus()
  })
}

function selectRecord(record) {
  emit('scanned', record)
}

function handleClose() {
  emit('close')
}

function getTypeLabel(type) {
  const map = {
    material: '物料',
    location: '仓位',
    order: '单据',
    supplier: '供应商',
    unknown: '未知'
  }
  return map[type] || type
}

function getResultBadgeClass(type) {
  const map = {
    material: 'info',
    location: 'warning',
    order: 'success',
    supplier: 'neutral',
    unknown: 'danger'
  }
  return map[type] || 'neutral'
}
</script>

<style scoped>
.scan-result-card {
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.scan-history-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.scan-history-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
}
.scan-history-item:last-child { border-bottom: none; }
.scan-history-item:hover { background: var(--color-surface-hover); }
</style>
