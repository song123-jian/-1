<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="['toast-' + toast.type]">
          <span class="toast-icon">{{ iconMap[toast.type] || 'ℹ' }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="remove(toast.id)">&times;</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0
const iconMap = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }

function show(message, type = 'info', duration = 3000) {
  const id = nextId++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

function success(msg, duration) { show(msg, 'success', duration) }
function error(msg, duration) { show(msg, 'error', duration) }
function warning(msg, duration) { show(msg, 'warning', duration) }
function info(msg, duration) { show(msg, 'info', duration) }

function remove(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ show, success, error, warning, info, remove })
</script>

<style scoped>
.toast-container { position: fixed; top: 20px; right: 20px; z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--space-2); }
.toast-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-radius: 8px; min-width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px; }
.toast-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.toast-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.toast-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.toast-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.toast-icon { font-size: 16px; }
.toast-message { flex: 1; }
.toast-close { background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.6; }
.toast-close:hover { opacity: 1; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100px); }
.toast-leave-to { opacity: 0; transform: translateX(100px); }
</style>
