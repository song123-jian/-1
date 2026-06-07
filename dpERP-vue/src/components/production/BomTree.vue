<template>
  <div class="bom-tree">
    <div class="bom-tree-root" @click="toggleExpand">
      <span class="bom-tree-toggle">
        <Icon v-if="hasChildren" :name="expanded ? 'chevronDown' : 'chevronRight'" :size="14" />
        <span v-else class="bom-tree-toggle-placeholder"></span>
      </span>
      <span class="bom-tree-icon" :class="nodeType">
        <Icon :name="nodeIcon" :size="16" />
      </span>
      <span class="bom-tree-info">
        <span class="bom-tree-name">{{ bom.productName || bom.name }}</span>
        <span class="bom-tree-meta">
          <span class="bom-tree-code">{{ bom.code }}</span>
          <span v-if="bom.version" class="bom-tree-version">{{ bom.version }}</span>
        </span>
      </span>
    </div>

    <div v-if="expanded && bom.components && bom.components.length > 0" class="bom-tree-children">
      <BomTreeNode
        v-for="comp in bom.components"
        :key="comp.id"
        :node="comp"
        :depth="1"
        :max-depth="10"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BomTreeNode from './BomTreeNode.vue'

const props = defineProps({
  bom: { type: Object, required: true }
})

const expanded = ref(true)

const hasChildren = computed(() => props.bom.components && props.bom.components.length > 0)

const nodeType = computed(() => {
  if (props.bom.type === 'phantom') return 'phantom'
  if (props.bom.type === 'multi') return 'assembly'
  return 'product'
})

const nodeIcon = computed(() => {
  if (nodeType.value === 'phantom') return 'layers'
  if (nodeType.value === 'assembly') return 'package'
  return 'star'
})

function toggleExpand() {
  if (hasChildren.value) {
    expanded.value = !expanded.value
  }
}
</script>

<style scoped>
.bom-tree {
  font-size: var(--font-size-sm);
}

.bom-tree-root {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
}

.bom-tree-root:hover {
  background: var(--color-surface-hover);
}

.bom-tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.bom-tree-toggle-placeholder {
  display: inline-block;
  width: 16px;
  height: 16px;
}

.bom-tree-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bom-tree-icon.product {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.bom-tree-icon.assembly {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.bom-tree-icon.phantom {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}

.bom-tree-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bom-tree-name {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bom-tree-meta {
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.bom-tree-code {
  font-family: var(--font-mono);
}

.bom-tree-version {
  background: var(--color-info-subtle);
  color: var(--color-info);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.bom-tree-children {
  margin-left: var(--space-6);
  border-left: 2px solid var(--color-border);
  padding-left: var(--space-2);
  margin-top: var(--space-1);
}
</style>
