<template>
  <div class="panel-card" style="margin-top:var(--space-4)">
    <div class="panel-card-header">
      <span class="panel-card-title"><Icon name="list" :size="14" /> 操作历史记录</span>
    </div>
    <div class="panel-card-body">
      <div class="filter-bar" style="margin-bottom:var(--space-4)">
        <input v-model="opHistorySearch" type="text" class="form-input" placeholder="搜索操作...">
        <select v-model="opHistoryModule" class="form-select">
          <option value="">全部模块</option>
          <option value="customers">客户管理</option>
          <option value="quotations">报价管理</option>
          <option value="inventory">库存管理</option>
          <option value="warehouseOrders">出入库记录</option>
          <option value="deliveries">送货管理</option>
          <option value="collections">回款管理</option>
          <option value="todos">待办事项</option>
          <option value="settings">系统设置</option>
        </select>
        <select v-model="opHistoryAction" class="form-select">
          <option value="">全部操作</option>
          <option value="update">更新</option>
          <option value="config">配置变更</option>
        </select>
        <input v-model="opHistoryStartDate" type="date" class="form-input">
        <input v-model="opHistoryEndDate" type="date" class="form-input">
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>模块</th>
              <th>操作</th>
              <th>摘要</th>
              <th>数据量</th>
              <th>页面</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredOpHistory.length === 0">
              <td colspan="6" class="empty-state">暂无操作记录</td>
            </tr>
            <tr v-for="op in filteredOpHistory.slice(0, 50)" :key="op.id">
              <td>{{ op.time }}</td>
              <td>{{ op.module }}</td>
              <td>{{ op.action }}</td>
              <td>{{ op.summary }}</td>
              <td>{{ op.dataCount || '-' }}</td>
              <td>{{ op.page || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '@/modules/system/stores/system'

const sysStore = useSystemStore()

const opHistorySearch = ref('')
const opHistoryModule = ref('')
const opHistoryAction = ref('')
const opHistoryStartDate = ref('')
const opHistoryEndDate = ref('')

const filteredOpHistory = computed(() => {
  let ops = sysStore.operationHistory || []
  if (opHistoryModule.value) ops = ops.filter(o => o.module === opHistoryModule.value)
  if (opHistoryAction.value) ops = ops.filter(o => o.action === opHistoryAction.value)
  if (opHistoryStartDate.value) ops = ops.filter(o => o.time >= opHistoryStartDate.value)
  if (opHistoryEndDate.value) ops = ops.filter(o => o.time <= opHistoryEndDate.value + ' 23:59:59')
  if (opHistorySearch.value) {
    const q = opHistorySearch.value.toLowerCase()
    ops = ops.filter(o => (o.action || '').toLowerCase().includes(q) || (o.summary || '').toLowerCase().includes(q))
  }
  return ops
})
</script>
