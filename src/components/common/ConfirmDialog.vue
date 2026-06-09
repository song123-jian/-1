<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <h3>{{ title || '确认操作' }}</h3>
          <button class="confirm-close" @click="handleCancel">&times;</button>
        </div>
        <div class="confirm-body">
          <p>{{ message }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn btn-cancel" @click="handleCancel">{{ cancelText || '取消' }}</button>
          <button class="btn btn-confirm" :class="confirmClass" @click="handleConfirm">{{ confirmText || '确认' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref('确认')
const cancelText = ref('取消')
const confirmClass = ref('')
let resolvePromise = null

function show(options = {}) {
  title.value = options.title || '确认操作'
  message.value = options.message || ''
  confirmText.value = options.confirmText || '确认'
  cancelText.value = options.cancelText || '取消'
  confirmClass.value = options.danger ? 'btn-danger' : ''
  visible.value = true
  return new Promise((resolve) => { resolvePromise = resolve })
}

function handleConfirm() {
  visible.value = false
  resolvePromise?.(true)
}

function handleCancel() {
  visible.value = false
  resolvePromise?.(false)
}

defineExpose({ show })
</script>

<style scoped>
.confirm-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
.confirm-dialog { background: var(--color-bg-primary, #fff); border-radius: 12px; min-width: 400px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.confirm-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e5e7eb); }
.confirm-header h3 { margin: 0; font-size: 16px; color: var(--color-text-primary); }
.confirm-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-text-secondary, #6b7280); }
.confirm-body { padding: 20px; }
.confirm-body p { margin: 0; line-height: 1.6; color: var(--color-text-primary); }
.confirm-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--color-border, #e5e7eb); }
.btn { padding: 8px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; }
.btn-cancel { background: var(--color-bg-secondary, #f3f4f6); color: var(--color-text-primary, #374151); }
.btn-confirm { background: var(--color-accent, #3b82f6); color: #fff; }
.btn-danger { background: var(--color-danger, #ef4444); color: #fff; }
</style>
