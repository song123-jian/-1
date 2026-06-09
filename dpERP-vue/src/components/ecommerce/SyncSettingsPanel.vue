<template>
  <div class="sync-settings-panel">
    <div class="settings-section">
      <div class="settings-section-header">
        <h4 class="settings-section-title">自动同步</h4>
        <span class="settings-section-desc">开启后系统将按设定间隔自动同步数据</span>
      </div>
      <div class="settings-section-body">
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">启用自动同步</span>
            <span class="settings-row-desc">自动定时从已连接平台拉取/推送数据</span>
          </div>
          <div class="toggle-switch" :class="{ active: localSettings.autoSync }" @click="localSettings.autoSync = !localSettings.autoSync">
            <span class="toggle-knob"></span>
          </div>
        </div>

        <div v-if="localSettings.autoSync" class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">同步间隔</span>
            <span class="settings-row-desc">每次自动同步的时间间隔</span>
          </div>
          <select v-model="localSettings.syncInterval" class="form-select" style="width: auto; min-width: 140px;">
            <option :value="15">15 分钟</option>
            <option :value="30">30 分钟</option>
            <option :value="60">60 分钟</option>
          </select>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <h4 class="settings-section-title">同步内容</h4>
        <span class="settings-section-desc">选择需要自动同步的数据类型</span>
      </div>
      <div class="settings-section-body">
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">订单数据</span>
            <span class="settings-row-desc">同步各平台的订单信息到本地系统</span>
          </div>
          <div class="toggle-switch" :class="{ active: localSettings.syncOrders }" @click="localSettings.syncOrders = !localSettings.syncOrders">
            <span class="toggle-knob"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">库存数据</span>
            <span class="settings-row-desc">将本地库存数量推送到各平台</span>
          </div>
          <div class="toggle-switch" :class="{ active: localSettings.syncInventory }" @click="localSettings.syncInventory = !localSettings.syncInventory">
            <span class="toggle-knob"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">商品数据</span>
            <span class="settings-row-desc">将本地商品信息推送到各平台</span>
          </div>
          <div class="toggle-switch" :class="{ active: localSettings.syncProducts }" @click="localSettings.syncProducts = !localSettings.syncProducts">
            <span class="toggle-knob"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-actions">
      <button class="btn btn-primary" @click="handleSave">
        <Icon name="save" :size="14" /> 保存设置
      </button>
    </div>

    <!-- 保存成功提示 -->
    <Teleport to="body">
      <div v-if="showSaveToast" class="toast-container" style="z-index: 10001;">
        <div class="toast toast-success">同步设置已保存</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  settings: { type: Object, required: true }
})

const emit = defineEmits(['save'])

const localSettings = reactive({
  autoSync: props.settings.autoSync ?? true,
  syncInterval: props.settings.syncInterval ?? 30,
  syncOrders: props.settings.syncOrders ?? true,
  syncInventory: props.settings.syncInventory ?? true,
  syncProducts: props.settings.syncProducts ?? false
})

const showSaveToast = ref(false)

/* 监听外部设置变化，同步到本地 */
watch(() => props.settings, (newVal) => {
  if (newVal) {
    localSettings.autoSync = newVal.autoSync ?? true
    localSettings.syncInterval = newVal.syncInterval ?? 30
    localSettings.syncOrders = newVal.syncOrders ?? true
    localSettings.syncInventory = newVal.syncInventory ?? true
    localSettings.syncProducts = newVal.syncProducts ?? false
  }
}, { deep: true })

function handleSave() {
  emit('save', { ...localSettings })
  showSaveToast.value = true
  setTimeout(() => {
    showSaveToast.value = false
  }, 2000)
}
</script>

<style scoped>
.sync-settings-panel {
  max-width: 640px;
}

.settings-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.settings-section-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.settings-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.settings-section-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
  display: block;
}

.settings-section-body {
  padding: var(--space-4) var(--space-5);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.settings-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.settings-row:first-child {
  padding-top: 0;
}

.settings-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.settings-row-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.settings-row-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.toggle-switch {
  width: 40px;
  height: 22px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toggle-switch.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(18px);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-2);
}
</style>
