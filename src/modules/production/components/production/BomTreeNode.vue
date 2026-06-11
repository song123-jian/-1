<template>
  <div class="bom-tree-node" :style="{ paddingLeft: depth * var_space_4 + 'px' }">
    <div class="bom-node-row" @click="toggleExpand">
      <span class="bom-node-toggle">
        <Icon v-if="node.children && node.children.length > 0" :name="expanded ? 'chevronDown' : 'chevronRight'" :size="12" />
        <span v-else class="bom-node-dot"></span>
      </span>
      <span class="bom-node-icon" :class="nodeCategory">
        <Icon :name="nodeCategoryIcon" :size="14" />
      </span>
      <span class="bom-node-info">
        <span class="bom-node-name">{{ node.materialName }}</span>
        <span class="bom-node-detail">
          <span class="bom-node-code">{{ node.materialCode }}</span>
          <span v-if="node.spec" class="bom-node-spec">{{ node.spec }}</span>
          <span class="bom-node-qty">{{ node.quantity }} {{ node.unit }}</span>
          <span v-if="node.scrapRate" class="bom-node-scrap">损耗{{ node.scrapRate }}%</span>
        </span>
      </span>
      <span v-if="node.isOptional" class="bom-node-optional">选配</span>
    </div>
    <div v-if="expanded && depth >= maxDepth" class="bom-node-depth-limit">
      ...
    </div>
    <div v-else-if="expanded && node.children && node.children.length > 0" class="bom-node-children">
      <BomTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :max-depth="maxDepth"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const var_space_4 = 16

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  maxDepth: { type: Number, default: 10 }
})

const expanded = ref(false)

const nodeCategory = computed(() => {
  if (props.node.children && props.node.children.length > 0) return 'semi'
  return 'raw'
})

const nodeCategoryIcon = computed(() => {
  if (nodeCategory.value === 'semi') return 'package'
  return 'circle'
})

function toggleExpand() {
  if (props.node.children && props.node.children.length > 0) {
    expanded.value = !expanded.value
  }
}
</script>

<style scoped>
.bom-tree-node {
  font-size: var(--font-size-sm);
}

.bom-node-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.bom-node-row:hover {
  background: var(--color-surface-hover);
}

.bom-node-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.bom-node-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  margin: 0 auto;
}

.bom-node-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bom-node-icon.raw {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.bom-node-icon.semi {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.bom-node-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.bom-node-name {
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bom-node-detail {
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-wrap: wrap;
}

.bom-node-code {
  font-family: var(--font-mono);
}

.bom-node-qty {
  color: var(--color-accent);
  font-weight: 600;
}

.bom-node-scrap {
  color: var(--color-warning);
}

.bom-node-optional {
  font-size: var(--font-size-xs);
  background: var(--color-info-subtle);
  color: var(--color-info);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.bom-node-children {
  border-left: 1px dashed var(--color-border);
  margin-left: var(--space-2);
}

.bom-node-depth-limit {
  padding: var(--space-1) var(--space-2);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-style: italic;
  margin-left: var(--space-2);
  border-left: 1px dashed var(--color-border);
}
</style>
