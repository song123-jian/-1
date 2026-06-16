<template>
  <Teleport to="body">
    <div v-if="visible" class="global-search-overlay" @click.self="close">
      <div class="global-search-dialog">
        <div class="global-search-input-wrap">
          <Icon name="search" :size="18" class="global-search-icon" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="global-search-input"
            placeholder="搜索客户、报价、合同、库存..."
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter.prevent="selectCurrent"
            @keydown.esc.prevent="close"
          />
          <kbd class="global-search-kbd">ESC</kbd>
        </div>

        <div v-if="query.trim()" class="global-search-results">
          <template v-if="groupedResults.length > 0">
            <div v-for="group in groupedResults" :key="group.key" class="global-search-group">
              <div class="global-search-group-header">{{ group.label }} ({{ group.items.length }})</div>
              <div
                v-for="(item, idx) in group.items"
                :key="item.id"
                class="global-search-item"
                :class="{ active: flatIndex(group.key, idx) === activeIndex }"
                @click="navigateTo(item)"
                @mouseenter="activeIndex = flatIndex(group.key, idx)"
              >
                <span class="global-search-item-label" v-html="highlight(item.label, query)" />
                <span class="global-search-item-sub">{{ item.sub }}</span>
              </div>
            </div>
          </template>
          <div v-else class="global-search-empty">
            <Icon name="search" :size="24" />
            <div>未找到匹配结果</div>
          </div>
        </div>

        <div v-else class="global-search-hint">
          <div class="global-search-hint-row">
            <kbd>↑</kbd><kbd>↓</kbd> 导航
            <kbd>Enter</kbd> 选择
            <kbd>Esc</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDataCenterStore } from '@/stores/dataCenter'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible'])

const router = useRouter()
const dataCenter = useDataCenterStore()

const query = ref('')
const inputRef = ref(null)
const activeIndex = ref(0)

/* 模块搜索配置 */
const SEARCH_MODULES = [
  {
    key: 'customer',
    label: '客户',
    data: () => dataCenter.customers,
    fields: ['name', 'contact', 'phone', 'region'],
    labelField: 'name',
    subField: 'contact',
    route: '/customers'
  },
  {
    key: 'quotation',
    label: '报价单',
    data: () => dataCenter.quotations,
    fields: ['quoteNo', 'customerName', 'status'],
    labelField: 'quoteNo',
    subField: 'customerName',
    route: '/quotations'
  },
  {
    key: 'contract',
    label: '合同',
    data: () => dataCenter.contracts,
    fields: ['contractNo', 'customerName', 'status'],
    labelField: 'contractNo',
    subField: 'customerName',
    route: '/contracts'
  },
  {
    key: 'inventory',
    label: '库存',
    data: () => dataCenter.inventory,
    fields: ['name', 'code', 'category', 'warehouse'],
    labelField: 'name',
    subField: 'code',
    route: '/inventory'
  },
  {
    key: 'delivery',
    label: '送货单',
    data: () => dataCenter.deliveries,
    fields: ['deliveryNo', 'customerName', 'status'],
    labelField: 'deliveryNo',
    subField: 'customerName',
    route: '/deliveries'
  },
  {
    key: 'collection',
    label: '回款',
    data: () => dataCenter.collections,
    fields: ['receiptNo', 'customerName'],
    labelField: 'receiptNo',
    subField: 'customerName',
    route: '/collections'
  },
  {
    key: 'supplier',
    label: '供应商',
    data: () => dataCenter.suppliers,
    fields: ['name', 'contact', 'phone'],
    labelField: 'name',
    subField: 'contact',
    route: '/suppliers'
  },
  {
    key: 'purchase',
    label: '采购单',
    data: () => dataCenter._stores?.purchase?.orders || [],
    fields: ['orderNo', 'supplierName', 'status'],
    labelField: 'orderNo',
    subField: 'supplierName',
    route: '/purchase'
  },
  {
    key: 'production',
    label: '生产工单',
    data: () => dataCenter._stores?.production?.orders || [],
    fields: ['orderNo', 'status'],
    labelField: 'orderNo',
    subField: 'status',
    route: '/production'
  }
]

/* 模糊匹配 */
function fuzzyMatch(item, keyword) {
  const q = keyword.toLowerCase()
  return SEARCH_MODULES.find(m => m.key === item._moduleKey)
    ?.fields.some(field => {
      const val = item[field]
      return val && String(val).toLowerCase().includes(q)
    })
}

/* 分组搜索结果 */
const groupedResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const results = []

  for (const mod of SEARCH_MODULES) {
    const data = mod.data()
    if (!data || !Array.isArray(data)) continue

    const matched = data
      .filter(item => {
        return mod.fields.some(field => {
          const val = item[field]
          return val && String(val).toLowerCase().includes(q)
        })
      })
      .slice(0, 5)
      .map(item => ({
        id: `${mod.key}-${item.id}`,
        label: item[mod.labelField] || item.id,
        sub: item[mod.subField] || '',
        route: mod.route,
        moduleKey: mod.key,
        ...item
      }))

    if (matched.length > 0) {
      results.push({
        key: mod.key,
        label: mod.label,
        items: matched
      })
    }
  }

  return results
})

/* 扁平化索引计算 */
const flatItems = computed(() => {
  const items = []
  for (const group of groupedResults.value) {
    for (const item of group.items) {
      items.push(item)
    }
  }
  return items
})

function flatIndex(groupKey, itemIdx) {
  let offset = 0
  for (const group of groupedResults.value) {
    if (group.key === groupKey) {
      return offset + itemIdx
    }
    offset += group.items.length
  }
  return 0
}

/* 键盘导航 */
function moveDown() {
  if (flatItems.value.length === 0) return
  activeIndex.value = (activeIndex.value + 1) % flatItems.value.length
}

function moveUp() {
  if (flatItems.value.length === 0) return
  activeIndex.value = (activeIndex.value - 1 + flatItems.value.length) % flatItems.value.length
}

function selectCurrent() {
  const item = flatItems.value[activeIndex.value]
  if (item) navigateTo(item)
}

/* 高亮匹配文本 */
function highlight(text, keyword) {
  if (!text || !keyword) return text || ''
  const q = keyword.trim()
  if (!q) return text
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return String(text).replace(regex, '<mark>$1</mark>')
}

/* 导航 */
function navigateTo(item) {
  router.push(item.route)
  close()
}

/* 关闭 */
function close() {
  query.value = ''
  activeIndex.value = 0
  emit('update:visible', false)
}

/* Ctrl+K 全局快捷键 */
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    emit('update:visible', !props.visible)
  }
}

/* 监听 visible 变化，自动聚焦 */
watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

/* 监听搜索结果变化，重置 activeIndex */
watch(groupedResults, () => {
  activeIndex.value = 0
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.global-search-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 1000);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 15vh;
  backdrop-filter: blur(2px);
}

.global-search-dialog {
  width: 560px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--color-bg-primary, #1e293b);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.global-search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  border-bottom: 1px solid var(--color-border, #334155);
}

.global-search-icon {
  color: var(--color-text-tertiary, #94a3b8);
  flex-shrink: 0;
}

.global-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-size-lg, 18px);
  color: var(--color-text-primary, #f1f5f9);
  font-family: inherit;
}

.global-search-input::placeholder {
  color: var(--color-text-tertiary, #64748b);
}

.global-search-kbd {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: var(--font-size-xs, 12px);
  font-family: var(--font-mono, monospace);
  color: var(--color-text-tertiary, #94a3b8);
  background: var(--color-bg-secondary, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-sm, 4px);
  line-height: 1.4;
}

.global-search-results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2, 8px) 0;
}

.global-search-group {
  margin-bottom: var(--space-2, 8px);
}

.global-search-group-header {
  padding: var(--space-2, 8px) var(--space-4, 16px);
  font-size: var(--font-size-xs, 12px);
  font-weight: 600;
  color: var(--color-text-tertiary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.global-search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  padding: var(--space-2, 8px) var(--space-4, 16px);
  cursor: pointer;
  transition: background 0.1s ease;
  border-radius: var(--radius-sm, 4px);
  margin: 0 var(--space-2, 8px);
}

.global-search-item:hover,
.global-search-item.active {
  background: var(--color-accent-subtle, rgba(59, 130, 246, 0.1));
}

.global-search-item-label {
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-primary, #f1f5f9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search-item-label :deep(mark) {
  background: transparent;
  color: var(--color-accent, #3b82f6);
  font-weight: 600;
  text-decoration: underline;
}

.global-search-item-sub {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-tertiary, #64748b);
  flex-shrink: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-8, 32px);
  color: var(--color-text-tertiary, #94a3b8);
  font-size: var(--font-size-sm, 14px);
}

.global-search-hint {
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-top: 1px solid var(--color-border, #334155);
}

.global-search-hint-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-tertiary, #64748b);
  flex-wrap: wrap;
}

.global-search-hint-row kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: var(--font-size-xs, 11px);
  font-family: var(--font-mono, monospace);
  color: var(--color-text-secondary, #cbd5e1);
  background: var(--color-bg-secondary, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-sm, 3px);
  line-height: 1.4;
}
</style>
