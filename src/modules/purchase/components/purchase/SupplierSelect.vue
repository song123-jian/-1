<template>
  <div class="supplier-select" ref="selectRef">
    <div class="supplier-select-input" @click="toggleDropdown">
      <input
        type="text"
        class="form-input"
        :value="displayValue"
        :placeholder="placeholder"
        @input="onSearch"
        @focus="openDropdown"
        readonly
      />
      <span class="select-arrow">
        <Icon :name="isOpen ? 'chevronUp' : 'chevronDown'" :size="14" />
      </span>
    </div>
    <div v-if="isOpen" class="select-dropdown">
      <div class="select-search">
        <input
          ref="searchRef"
          v-model="searchKeyword"
          type="text"
          class="form-input"
          placeholder="搜索供应商..."
          @click.stop
        />
      </div>
      <div class="select-options">
        <div
          v-for="item in filteredOptions"
          :key="item.id"
          class="select-option"
          :class="{ active: item.id === modelValue }"
          @click="selectItem(item)"
        >
          <span class="option-code">{{ item.code }}</span>
          <span class="option-name">{{ item.name }}</span>
          <span v-if="item.status === 'blacklist'" class="option-badge danger">黑名单</span>
          <span v-else-if="item.status === 'pending'" class="option-badge warning">待审核</span>
        </div>
        <div v-if="filteredOptions.length === 0" class="select-empty">无匹配供应商</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择供应商' }
})
const emit = defineEmits(['update:modelValue', 'change'])

const supplierStore = useSupplierStore()
const isOpen = ref(false)
const searchKeyword = ref('')
const selectRef = ref(null)
const searchRef = ref(null)

const selectedSupplier = computed(() =>
  props.modelValue ? supplierStore.getSupplierById(props.modelValue) : null
)

const displayValue = computed(() => {
  if (selectedSupplier.value) {
    return selectedSupplier.value.code + ' - ' + selectedSupplier.value.name
  }
  return ''
})

const filteredOptions = computed(() => {
  let list = supplierStore.suppliers.filter(s => s.status !== 'blacklist')
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(s =>
      (s.code || '').toLowerCase().includes(kw) ||
      (s.name || '').toLowerCase().includes(kw) ||
      (s.shortName || '').toLowerCase().includes(kw)
    )
  }
  return list
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      searchRef.value?.focus()
    })
  }
}

function openDropdown() {
  if (!isOpen.value) {
    isOpen.value = true
  }
}

function selectItem(item) {
  emit('update:modelValue', item.id)
  emit('change', item)
  isOpen.value = false
  searchKeyword.value = ''
}

function onSearch() {
  /* readonly input, no-op */
}

function handleClickOutside(e) {
  if (selectRef.value && !selectRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.supplier-select {
  position: relative;
}
.supplier-select-input {
  position: relative;
}
.supplier-select-input .form-input {
  cursor: pointer;
  padding-right: var(--space-8);
}
.select-arrow {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}
.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  margin-top: var(--space-1);
  max-height: 280px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.select-search {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.select-search .form-input {
  font-size: var(--font-size-xs);
}
.select-options {
  overflow-y: auto;
  flex: 1;
}
.select-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: background var(--transition-fast);
  font-size: var(--font-size-sm);
}
.select-option:hover {
  background: var(--color-surface-hover);
}
.select-option.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.option-code {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.option-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option-badge {
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.option-badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.option-badge.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.select-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}
</style>
