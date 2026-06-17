<template>
  <div class="workflow-nodes">
    <div
      v-for="(node, index) in nodes"
      :key="node.id"
      class="workflow-node-wrapper"
      :style="{ animationDelay: index * 120 + 'ms' }"
    >
      <!-- 节点 -->
      <div
        class="workflow-node"
        :class="[`node-${node.type}`, `node-status-${node.status || 'pending'}`]"
        :title="getNodeTooltip(node)"
      >
        <div class="node-icon">
          <Icon :name="getNodeIcon(node)" :size="18" />
          <!-- 活跃节点脉冲环 -->
          <div v-if="node.status === 'active'" class="node-pulse-ring"></div>
        </div>
        <div class="node-name">{{ node.name }}</div>
        <div v-if="node.approver && node.type !== 'start' && node.type !== 'end'" class="node-approver">
          {{ node.approver }}
        </div>
      </div>

      <!-- 连接线 -->
      <div v-if="index < nodes.length - 1" class="workflow-connector">
        <div
          class="connector-line"
          :class="{ completed: isConnectorCompleted(index), active: isConnectorActive(index) }"
        >
          <div v-if="isConnectorActive(index)" class="connector-flow"></div>
          <div
            class="connector-arrow"
            :class="{ completed: isConnectorCompleted(index), active: isConnectorActive(index) }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'WorkflowNode' }
</script>
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
    case NodeType.START:
      return 'play'
    case NodeType.APPROVE:
      return 'checkCircle'
    case NodeType.CONDITION:
      return 'filter'
    case NodeType.END:
      return 'flag'
    default:
      return 'circle'
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

function isConnectorActive(index) {
  if (index < props.nodes.length - 1) {
    const currentNode = props.nodes[index]
    return currentNode.status === 'active'
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

/* 节点入场动画 */
@keyframes nodeAppear {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.workflow-node-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  animation: nodeAppear 0.5s ease-out both;
}

.workflow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  min-width: 90px;
  transition: all 0.3s ease;
  position: relative;
}

.workflow-node:hover {
  transform: translateY(-2px);
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
  transition: all 0.3s ease;
  position: relative;
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
  padding: var(--space-1) var(--space-2);
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
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  animation: activePulse 2s ease-in-out infinite;
}

.node-status-active .node-name {
  color: var(--color-accent);
  font-weight: 600;
}

/* 活跃节点脉冲环 */
.node-pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-accent);
  animation: pulseRing 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulseRing {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
}

@keyframes activePulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.08);
  }
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
  transition: background 0.3s ease;
  overflow: hidden;
}

.connector-line.completed {
  background: #22c55e;
}

.connector-line.active {
  background: rgba(59, 130, 246, 0.3);
}

/* 连接线流动动画 */
@keyframes flowMove {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.connector-flow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  animation: flowMove 1.5s ease-in-out infinite;
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
  transition: border-color 0.3s ease;
}

.connector-arrow.completed {
  border-left-color: #22c55e;
}

.connector-arrow.active {
  border-left-color: var(--color-accent);
}

/* 响应式 */
@media (max-width: 768px) {
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
