<template>
  <div class="sync-log-table">
    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-4);">
      <select v-model="filterPlatform" class="form-select" style="width: auto; min-width: 120px;">
        <option value="">全部平台</option>
        <option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="filterType" class="form-select" style="width: auto; min-width: 120px;">
        <option value="">全部类型</option>
        <option value="order">订单</option>
        <option value="inventory">库存</option>
        <option value="product">商品</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="width: auto; min-width: 120px;">
        <option value="">全部状态</option>
        <option value="success">成功</option>
        <option value="failed">失败</option>
        <option value="running">运行中</option>
      </select>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>平台</th>
            <th>类型</th>
            <th>方向</th>
            <th>状态</th>
            <th>数量</th>
            <th>耗时</th>
            <th>时间</th>
            <th>消息</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedLogs.length === 0">
            <td colspan="8" class="empty-state">暂无同步记录</td>
          </tr>
          <tr v-for="log in paginatedLogs" :key="log.id">
            <td>
              <span class="log-platform-name">{{ log.platformName || getPlatformName(log.platform) }}</span>
            </td>
            <td>
              <span class="log-type-badge" :class="'type-' + log.type">{{ typeLabel(log.type) }}</span>
            </td>
            <td>
              <span class="log-direction">
                <Icon :name="log.direction === 'pull' ? 'download' : 'upload'" :size="12" />
                {{ log.direction === 'pull' ? '拉取' : '推送' }}
              </span>
            </td>
            <td>
              <span class="log-status-badge" :class="'status-' + log.status">
                <span v-if="log.status === 'running'" class="status-spinner"></span>
                {{ statusLabel(log.status) }}
              </span>
            </td>
            <td>{{ log.count || 0 }}</td>
            <td>{{ formatDuration(log.startTime, log.endTime) }}</td>
            <td>{{ formatTime(log.startTime) }}</td>
            <td class="log-message" :title="log.message">{{ log.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">
        <Icon name="chevronLeft" :size="12" /> 上一页
      </button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">
        下一页 <Icon name="chevronRight" :size="12" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  platforms: { type: Array, default: () => [] }
})

const filterPlatform = ref('')
const filterType = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = 10

const filteredLogs = computed(() => {
  let result = [...props.logs]
  if (filterPlatform.value) {
    result = result.filter(l => l.platform === filterPlatform.value)
  }
  if (filterType.value) {
    result = result.filter(l => l.type === filterType.value)
  }
  if (filterStatus.value) {
    result = result.filter(l => l.status === filterStatus.value)
  }
  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize)))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredLogs.value.slice(start, start + pageSize)
})

function getPlatformName(platformId) {
  const p = props.platforms.find(pl => pl.id === platformId)
  return p ? p.name : platformId
}

function typeLabel(type) {
  switch (type) {
    case 'order': return '订单'
    case 'inventory': return '库存'
    case 'product': return '商品'
    default: return type
  }
}

function statusLabel(status) {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'running': return '运行中'
    default: return status
  }
}

function formatTime(time) {
  if (!time) return '-'
  const date = new Date(time)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function formatDuration(start, end) {
  if (!start || !end) return '-'
  const diff = new Date(end) - new Date(start)
  if (diff < 1000) return `${diff}ms`
  if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`
  return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
}
</script>

<style scoped>
.sync-log-table {
  width: 100%;
}

.log-platform-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.log-type-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.type-order {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.type-inventory {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.type-product {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}

.log-direction {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.log-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.status-failed {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.status-running {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.status-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-info-subtle);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.log-message {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
