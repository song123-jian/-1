<template>
  <div class="workflow-nodes">
    <div
      v-for="(node, index) in nodes"
      :key="node.id"
      class="workflow-node-wrapper"
    >
      <!-- 节点 -->
      <div
        class="workflow-node"
        :class="[
          `node-${node.type}`,
          `node-status-${node.status || 'pending'}`
        ]"
        :title="getNodeTooltip(node)"
      >
        <div class="node-icon">
          <Icon :name="getNodeIcon(node)" :size="18" />
        </div>
        <div class="node-name">{{ node.name }}</div>
        <div v-if="node.approver && node.type !== 'start' && node.type !== 'end'" class="node-approver">
          {{ node.approver }}
        </div>
      </div>

      <!-- 连接线 -->
      <div v-if="index < nodes.length - 1" class="workflow-connector">
        <div class="connector-line" :class="{ completed: isConnectorCompleted(index) }">
          <div class="connector-arrow"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { NodeType } from '@/utils/workflowEngine'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  }
})

function getNodeIcon(node) {
  switch (node.type) {
    case NodeType.START: return 'play'
    case NodeType.APPROVE: return 'checkCircle'
    case NodeType.CONDITION: return 'filter'
    case NodeType.END: return 'flag'
    default: return 'circle'
  }
}

function getNodeTooltip(node) {
  const statusMap = {
    pending: '待处理',
    active: '处理中',
    completed: '已完成',
    rejected: '已拒绝'
  }
  return `${node.name} - ${statusMap[node.status] || '未知'}`
}

function isConnectorCompleted(index) {
  if (index < props.nodes.length - 1) {
    const currentNode = props.nodes[index]
    return currentNode.status === 'completed'
  }
  return false
}
</script>

<style scoped>
.workflow-nodes {
  display: flex;
  align-items: center;
  gap: 0;
  padding: var(--space-4) var(--space-2);
  overflow-x: auto;
  min-height: 120px;
}

.workflow-node-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.workflow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  min-width: 90px;
  transition: all var(--transition-fast);
  position: relative;
}

.node-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.node-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-approver {
  font-size: 10px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

/* 状态样式 */
.node-status-pending .node-icon {
  border-color: var(--color-border);
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
}

.node-status-active .node-icon {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-bg-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 59, 130, 246), 0.15);
  animation: pulse 2s ease-in-out infinite;
}

.node-status-active .node-name {
  color: var(--color-accent);
  font-weight: 600;
}

.node-status-completed .node-icon {
  border-color: #22c55e;
  background: #22c55e;
  color: #fff;
}

.node-status-completed .node-name {
  color: #22c55e;
}

.node-status-rejected .node-icon {
  border-color: #ef4444;
  background: #ef4444;
  color: #fff;
}

.node-status-rejected .node-name {
  color: #ef4444;
}

/* 节点类型特殊样式 */
.node-start .node-icon {
  border-style: dashed;
}

.node-end .node-icon {
  border-width: 3px;
}

/* 连接线 */
.workflow-connector {
  display: flex;
  align-items: center;
  padding: 0 var(--space-1);
}

.connector-line {
  width: 40px;
  height: 2px;
  background: var(--color-border);
  position: relative;
  transition: background var(--transition-fast);
}

.connector-line.completed {
  background: #22c55e;
}

.connector-arrow {
  position: absolute;
  right: -4px;
  top: -3px;
  width: 0;
  height: 0;
  border-left: 6px solid var(--color-border);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: border-color var(--transition-fast);
}

.connector-line.completed .connector-arrow {
  border-left-color: #22c55e;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
  50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.08); }
}

/* 响应式 */
@media (max-width: 767px) {
  .workflow-nodes {
    padding: var(--space-2);
  }
  .workflow-node {
    min-width: 70px;
    padding: var(--space-2);
  }
  .node-icon {
    width: 32px;
    height: 32px;
  }
  .connector-line {
    width: 24px;
  }
  .node-name {
    max-width: 60px;
    font-size: 10px;
  }
}
</style>
