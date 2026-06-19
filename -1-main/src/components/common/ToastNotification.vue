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

<script>
export default { name: 'ToastNotification' }
</script>
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

function success(msg, duration) {
  show(msg, 'success', duration)
}
function error(msg, duration) {
  show(msg, 'error', duration)
}
function warning(msg, duration) {
  show(msg, 'warning', duration)
}
function info(msg, duration) {
  show(msg, 'info', duration)
}

function remove(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

defineExpose({ show, success, error, warning, info, remove })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.toast-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: 8px;
  min-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.toast-item:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
.toast-success {
  background: var(--color-success-subtle, #ecfdf5);
  color: var(--color-success, #065f46);
  border: 1px solid var(--color-success, #a7f3d0);
  border-left: 3px solid var(--color-success);
}
.toast-error {
  background: var(--color-danger-subtle, #fef2f2);
  color: var(--color-danger, #991b1b);
  border: 1px solid var(--color-danger, #fecaca);
  border-left: 3px solid var(--color-danger);
}
.toast-warning {
  background: var(--color-warning-subtle, #fffbeb);
  color: var(--color-warning, #92400e);
  border: 1px solid var(--color-warning, #fde68a);
  border-left: 3px solid var(--color-warning);
}
.toast-info {
  background: var(--color-info-subtle, #eff6ff);
  color: var(--color-info, #1e40af);
  border: 1px solid var(--color-info, #bfdbfe);
  border-left: 3px solid var(--color-info);
}
.toast-icon {
  font-size: 16px;
}
.toast-message {
  flex: 1;
}
.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.6;
}
.toast-close:hover {
  opacity: 1;
}
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.95);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
