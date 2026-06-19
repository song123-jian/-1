<template>
  <div class="panel-card" style="margin-top: var(--space-4)">
    <div class="panel-card-header">
      <span class="panel-card-title">
        <Icon name="save" :size="14" />
        自动保存状态
      </span>
      <button class="btn btn-primary btn-sm" @click="handleForceSave">
        <Icon name="save" :size="14" />
        立即保存
      </button>
    </div>
    <div class="panel-card-body">
      <div
        style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: var(--space-4)"
      >
        <div
          v-for="item in autoSaveItems"
          :key="item.name"
          style="background: var(--color-surface-elevated); padding: var(--space-3); border-radius: var(--radius-md)"
        >
          <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">{{ item.name }}</div>
          <div
            style="font-size: var(--font-size-sm); font-weight: 600; margin-top: 2px"
            :style="{ color: item.status === '已保存' ? 'var(--color-success)' : 'var(--color-warning)' }"
          >
            {{ item.status }}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px">
            {{ item.time }}
          </div>
        </div>
      </div>

      <div style="margin-top: var(--space-4)">
        <h4 style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--space-3)">
          <Icon name="image" :size="14" />
          快照记录
        </h4>
        <div v-if="sysStore.snapshots?.length" style="display: flex; flex-direction: column; gap: var(--space-2)">
          <div
            v-for="snap in sysStore.snapshots.slice(0, 5)"
            :key="snap.id"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: var(--space-2);
              background: var(--color-surface-elevated);
              border-radius: var(--radius-md);
            "
          >
            <div>
              <div style="font-size: var(--font-size-sm); font-weight: 600">{{ snap.name }}</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">{{ snap.time }}</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="handleRecoverSnapshot(snap)">恢复</button>
          </div>
        </div>
        <div
          v-else
          style="
            padding: var(--space-3);
            text-align: center;
            color: var(--color-text-tertiary);
            font-size: var(--font-size-sm);
          "
        >
          暂无快照记录
        </div>
      </div>

      <div style="margin-top: var(--space-4); display: flex; gap: var(--space-3)">
        <button class="btn btn-secondary btn-sm" @click="handleRecoverLatest">
          <Icon name="refresh" :size="14" />
          从最新快照恢复
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'AutoSavePanel' }
</script>
<script setup>
import { reactive } from 'vue'
import { useSystemStore } from '@/modules/system/stores/system'

const sysStore = useSystemStore()

const autoSaveItems = reactive([
  { name: '主题设置', status: '已保存', time: '2分钟前' },
  { name: '用户数据', status: '已保存', time: '5分钟前' },
  { name: '字典数据', status: '待保存', time: '10分钟前' }
])

function handleForceSave() {
  alert('已强制保存所有数据')
}

function handleRecoverSnapshot(snap) {
  alert(`已从快照 ${snap.name} 恢复`)
}

function handleRecoverLatest() {
  alert('已从最新快照恢复')
}
</script>
