<template>
  <div ref="selectRef" class="data-select" :class="{ 'is-disabled': disabled, 'is-open': isOpen }">
    <div
      class="data-select-trigger"
      :tabindex="disabled ? -1 : 0"
      @click="toggleDropdown"
      @keydown.enter="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <div class="data-select-input">
        <div v-if="multiple && selectedItems.length > 0" class="data-select-tags">
          <span v-for="item in selectedItems" :key="item.value" class="data-select-tag">
            {{ item.label }}
            <span class="tag-close" @click.stop="removeItem(item)">×</span>
          </span>
        </div>
        <span v-else-if="!multiple && selectedLabel" class="data-select-value">
          {{ selectedLabel }}
        </span>
        <span v-else class="data-select-placeholder">{{ placeholder }}</span>
      </div>
      <span v-if="clearable && modelValue && !disabled" class="data-select-clear" @click.stop="handleClear">×</span>
      <span class="data-select-arrow" :class="{ 'is-open': isOpen }">▾</span>
    </div>

    <div v-if="isOpen" class="data-select-dropdown">
      <div v-if="searchable" class="data-select-search">
        <input
          ref="searchInput"
          v-model="searchText"
          type="text"
          class="data-select-search-input"
          :placeholder="searchPlaceholder"
          @keydown.down.prevent="highlightNext"
          @keydown.up.prevent="highlightPrev"
          @keydown.enter.prevent="selectHighlighted"
          @keydown.esc.prevent="closeDropdown"
        />
      </div>

      <div class="data-select-options" @keydown.esc.prevent="closeDropdown">
        <template v-if="hasGroups">
          <div v-for="group in filteredGroups" :key="group.group" class="data-select-group">
            <div class="data-select-group-label">{{ group.group }}</div>
            <div
              v-for="option in group.items"
              :key="option.value"
              class="data-select-option"
              :class="{
                'is-selected': isSelected(option),
                'is-highlighted': highlightedIndex === getOptionIndex(option),
                'is-disabled': option.disabled
              }"
              @click="selectOption(option)"
              @mouseenter="highlightedIndex = getOptionIndex(option)"
            >
              <span v-if="multiple" class="checkbox-icon">{{ isSelected(option) ? '已选' : '未选' }}</span>
              <span class="option-label">{{ option.label }}</span>
              <span v-if="option.extra" class="option-extra">{{ option.extra }}</span>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            v-for="(option, idx) in filteredOptions"
            :key="option.value"
            class="data-select-option"
            :class="{
              'is-selected': isSelected(option),
              'is-highlighted': highlightedIndex === idx,
              'is-disabled': option.disabled
            }"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = idx"
          >
            <span v-if="multiple" class="checkbox-icon">{{ isSelected(option) ? '已选' : '未选' }}</span>
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.extra" class="option-extra">{{ option.extra }}</span>
          </div>
        </template>

        <div v-if="isEmpty" class="data-select-empty">
          {{ emptyText }}
        </div>
      </div>

      <div v-if="allowCreate || showRefresh" class="data-select-footer">
        <button v-if="allowCreate" class="data-select-create-btn" @click="handleCreate">+ 新建{{ moduleName }}</button>
        <button v-if="showRefresh" class="data-select-refresh-btn" @click="handleRefresh">刷新</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useDataCenterStore } from '@/stores/dataCenter'

export default {
  name: 'DataSelect',
  props: {
    module: { type: String, required: true },
    variant: { type: String, default: 'default' },
    modelValue: { type: [String, Number, Array], default: '' },
    valueField: { type: String, default: 'id' },
    labelField: { type: String, default: 'name' },
    labelFormatter: { type: Function, default: null },
    extraField: { type: String, default: '' },
    placeholder: { type: String, default: '请选择...' },
    multiple: { type: Boolean, default: false },
    searchable: { type: Boolean, default: true },
    searchPlaceholder: { type: String, default: '搜索...' },
    disabled: { type: Boolean, default: false },
    allowCreate: { type: Boolean, default: false },
    showRefresh: { type: Boolean, default: false },
    emptyText: { type: String, default: '暂无数据' },
    filters: { type: Array, default: () => [] },
    parentFilters: { type: Array, default: () => [] },
    moduleName: { type: String, default: '' },
    clearable: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change', 'create', 'refresh'],
  setup(props, { emit }) {
    const dataCenter = useDataCenterStore()
    const selectRef = ref(null)
    const searchInput = ref(null)
    const isOpen = ref(false)
    const searchText = ref('')
    const highlightedIndex = ref(-1)

    const freqKey = computed(() => `ds-freq-${props.module}-${props.variant}`)

    function getFreqMap() {
      try {
        const raw = localStorage.getItem(freqKey.value)
        return raw ? JSON.parse(raw) : {}
      } catch (e) {
        return {}
      }
    }

    function saveFreqMap(map) {
      try {
        localStorage.setItem(freqKey.value, JSON.stringify(map))
      } catch (e) {
        console.warn('[DataSelect] saveFreqMap失败:', e.message)
      }
    }

    function recordUsage(value) {
      const map = getFreqMap()
      map[String(value)] = (map[String(value)] || 0) + 1
      saveFreqMap(map)
    }

    function sortByFreq(options) {
      const map = getFreqMap()
      return [...options].sort((a, b) => {
        const fa = map[String(a.value)] || 0
        const fb = map[String(b.value)] || 0
        if (fb !== fa) return fb - fa
        return String(a.label).localeCompare(String(b.label))
      })
    }

    const rawOptions = computed(() => {
      const allFilters = [
        ...props.filters,
        ...props.parentFilters.filter((pf) => pf.value !== undefined && pf.value !== null && pf.value !== '')
      ]
      const opts = dataCenter.getSelectOptions(props.module, props.variant, {
        valueField: props.valueField,
        labelField: props.labelField,
        filters: allFilters
      })
      if (opts.length > 0 && opts[0]?.group !== undefined) {
        return opts.map((g) => ({ ...g, items: sortByFreq(g.items || []) }))
      }
      return sortByFreq(opts)
    })

    const hasGroups = computed(() => {
      return rawOptions.value.length > 0 && rawOptions.value[0]?.group !== undefined
    })

    const flatOptions = computed(() => {
      if (hasGroups.value) {
        return rawOptions.value.flatMap((g) => g.items || [])
      }
      return rawOptions.value
    })

    const filteredOptions = computed(() => {
      if (!searchText.value) return flatOptions.value
      const keyword = searchText.value.toLowerCase()
      return flatOptions.value.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(keyword) ||
          String(opt.value).toLowerCase().includes(keyword) ||
          (opt.extra && String(opt.extra).toLowerCase().includes(keyword))
      )
    })

    const filteredGroups = computed(() => {
      if (!searchText.value) return rawOptions.value
      const keyword = searchText.value.toLowerCase()
      return rawOptions.value
        .map((group) => ({
          ...group,
          items: (group.items || []).filter(
            (opt) =>
              String(opt.label).toLowerCase().includes(keyword) ||
              String(opt.value).toLowerCase().includes(keyword) ||
              (opt.extra && String(opt.extra).toLowerCase().includes(keyword))
          )
        }))
        .filter((group) => group.items && group.items.length > 0)
    })

    const navigableOptions = computed(() => {
      if (hasGroups.value) {
        return filteredGroups.value.flatMap((group) => group.items || [])
      }
      return filteredOptions.value
    })

    const isEmpty = computed(() => {
      if (hasGroups.value) return filteredGroups.value.length === 0
      return filteredOptions.value.length === 0
    })

    const selectedItems = computed(() => {
      if (props.multiple) {
        const values = Array.isArray(props.modelValue) ? props.modelValue : []
        return flatOptions.value.filter((opt) => values.includes(opt.value))
      }
      return []
    })

    const selectedLabel = computed(() => {
      if (props.multiple) return ''
      const opt = flatOptions.value.find((o) => o.value === props.modelValue)
      if (!opt) {
        if (props.modelValue === undefined || props.modelValue === null || props.modelValue === '') {
          return ''
        }
        return String(props.modelValue)
      }
      if (props.labelFormatter && opt.data) {
        return props.labelFormatter(opt.data)
      }
      return opt.label
    })

    function isSelected(option) {
      if (props.multiple) {
        return Array.isArray(props.modelValue) && props.modelValue.includes(option.value)
      }
      return props.modelValue === option.value
    }

    function getOptionIndex(option) {
      return navigableOptions.value.findIndex((o) => o.value === option.value)
    }

    function toggleDropdown() {
      if (props.disabled) return
      isOpen.value = !isOpen.value
      if (isOpen.value) {
        nextTick(() => {
          if (searchInput.value) searchInput.value.focus()
        })
      }
    }

    function closeDropdown() {
      isOpen.value = false
      searchText.value = ''
      highlightedIndex.value = -1
    }

    function selectOption(option) {
      if (option.disabled) return

      recordUsage(option.value)

      if (props.multiple) {
        const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
        const idx = current.indexOf(option.value)
        if (idx > -1) {
          current.splice(idx, 1)
        } else {
          current.push(option.value)
        }
        emit('update:modelValue', current)
        emit('change', { value: current, data: option.data, option })
      } else {
        emit('update:modelValue', option.value)
        emit('change', { value: option.value, data: option.data, option })
        closeDropdown()
      }
    }

    function removeItem(item) {
      const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
      const idx = current.indexOf(item.value)
      if (idx > -1) {
        current.splice(idx, 1)
        emit('update:modelValue', current)
        emit('change', { value: current, data: item.data, option: item })
      }
    }

    function highlightNext() {
      const max = navigableOptions.value.length - 1
      if (max < 0) {
        highlightedIndex.value = -1
        return
      }
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, max)
    }

    function highlightPrev() {
      if (navigableOptions.value.length === 0) {
        highlightedIndex.value = -1
        return
      }
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
    }

    function selectHighlighted() {
      if (highlightedIndex.value >= 0 && highlightedIndex.value < navigableOptions.value.length) {
        selectOption(navigableOptions.value[highlightedIndex.value])
      }
    }

    function handleCreate() {
      emit('create', props.module)
      closeDropdown()
    }

    function handleRefresh() {
      dataCenter.refreshSelectOptions(props.module)
      emit('refresh', props.module)
    }

    function handleClear() {
      const emptyValue = props.multiple ? [] : ''
      emit('update:modelValue', emptyValue)
      emit('change', { value: emptyValue, data: null, option: null })
      closeDropdown()
    }

    function handleClickOutside(e) {
      if (selectRef.value && !selectRef.value.contains(e.target)) {
        closeDropdown()
      }
    }

    watch(
      () => props.parentFilters,
      () => {
        if (props.modelValue) {
          const validValues = flatOptions.value.map((o) => o.value)
          if (props.multiple) {
            const current = Array.isArray(props.modelValue) ? props.modelValue : []
            const filtered = current.filter((v) => validValues.includes(v))
            if (filtered.length !== current.length) {
              emit('update:modelValue', filtered)
            }
          } else if (!validValues.includes(props.modelValue)) {
            emit('update:modelValue', '')
          }
        }
      },
      { deep: true }
    )

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      selectRef,
      searchInput,
      isOpen,
      searchText,
      highlightedIndex,
      rawOptions,
      hasGroups,
      flatOptions,
      filteredOptions,
      filteredGroups,
      navigableOptions,
      isEmpty,
      selectedItems,
      selectedLabel,
      isSelected,
      getOptionIndex,
      toggleDropdown,
      closeDropdown,
      selectOption,
      removeItem,
      highlightNext,
      highlightPrev,
      selectHighlighted,
      handleCreate,
      handleRefresh,
      handleClear
    }
  }
}
</script>

<style scoped>
.data-select {
  position: relative;
  display: inline-block;
  width: 100%;
  min-width: 180px;
  font-size: var(--font-size-sm, 14px);
}
.data-select-trigger {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: var(--space-1) var(--space-8) var(--space-1) var(--space-2);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 6px);
  background: var(--color-bg, #fff);
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s;
}
.data-select-trigger:hover {
  border-color: var(--color-primary, #3b82f6);
}
.data-select.is-disabled .data-select-trigger {
  background: var(--color-bg-disabled, #f3f4f6);
  cursor: not-allowed;
  opacity: 0.6;
}
.data-select-input {
  flex: 1;
  overflow: hidden;
}
.data-select-value {
  color: var(--color-text, #1f2937);
}
.data-select-placeholder {
  color: var(--color-text-muted, #9ca3af);
}
.data-select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.data-select-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-primary-light, #dbeafe);
  color: var(--color-primary, #3b82f6);
  border-radius: 3px;
  font-size: 12px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-close {
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  margin-left: var(--space-1);
}
.tag-close:hover {
  color: var(--color-danger, #ef4444);
}
.data-select-clear {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted, #9ca3af);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  padding: 0 var(--space-1);
  transition: color 0.2s;
}
.data-select-clear:hover {
  color: var(--color-danger, #ef4444);
}
.data-select-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted, #9ca3af);
  font-size: 12px;
  transition: transform 0.2s;
}
.data-select-arrow.is-open {
  transform: translateY(-50%) rotate(180deg);
}

.data-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: var(--z-overlay);
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  max-height: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.data-select-search {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.data-select-search-input {
  width: 100%;
  padding: var(--space-2) var(--space-2);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}
.data-select-search-input:focus {
  border-color: var(--color-primary, #3b82f6);
}

.data-select-options {
  overflow-y: auto;
  flex: 1;
}
.data-select-group-label {
  padding: var(--space-2) var(--space-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted, #6b7280);
  background: var(--color-bg-secondary, #f9fafb);
}
.data-select-option {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-2);
  cursor: pointer;
  transition: background 0.15s;
  gap: var(--space-2);
}
.data-select-option:hover,
.data-select-option.is-highlighted {
  background: var(--color-primary-light, #eff6ff);
}
.data-select-option.is-selected {
  color: var(--color-primary, #3b82f6);
  font-weight: 500;
}
.data-select-option.is-disabled {
  color: var(--color-text-muted, #9ca3af);
  cursor: not-allowed;
}
.checkbox-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option-extra {
  font-size: 12px;
  color: var(--color-text-muted, #9ca3af);
  flex-shrink: 0;
}
.data-select-empty {
  padding: var(--space-5);
  text-align: center;
  color: var(--color-text-muted, #9ca3af);
}
.data-select-footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.data-select-create-btn,
.data-select-refresh-btn {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  background: var(--color-bg, #fff);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text, #374151);
}
.data-select-create-btn:hover {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.data-select-refresh-btn:hover {
  border-color: var(--color-success, #10b981);
  color: var(--color-success, #10b981);
}
</style>
