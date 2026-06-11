<template>
  <div class="aging-analysis">
    <div class="aging-chart">
      <div class="aging-bar-group">
        <div
          v-for="segment in segments"
          :key="segment.key"
          class="aging-bar-item"
        >
          <div class="aging-bar-track">
            <div
              class="aging-bar-fill"
              :style="{
                width: barWidth(segment.key) + '%',
                background: segment.color,
                transition: 'width 0.5s ease'
              }"
            ></div>
          </div>
          <div class="aging-bar-label">
            <span class="aging-bar-title">{{ segment.label }}</span>
            <span class="aging-bar-value cell-mono">¥{{ formatMoney(data[segment.key] || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <table class="data-table aging-table">
      <thead>
        <tr>
          <th>账龄段</th>
          <th>金额</th>
          <th>占比</th>
          <th>笔数</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="segment in segments" :key="segment.key">
          <td>
            <span class="aging-dot" :style="{ background: segment.color }"></span>
            {{ segment.label }}
          </td>
          <td class="cell-mono">¥{{ formatMoney(data[segment.key] || 0) }}</td>
          <td class="cell-mono">{{ getPercent(segment.key) }}%</td>
          <td>{{ data[segment.key + 'Count'] || 0 }}</td>
        </tr>
        <tr class="aging-total-row">
          <td><strong>合计</strong></td>
          <td class="cell-mono"><strong>¥{{ formatMoney(totalAmount) }}</strong></td>
          <td class="cell-mono"><strong>100%</strong></td>
          <td><strong>{{ totalCount }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      current: 0, days30: 0, days60: 0, days90: 0, days180: 0, over180: 0,
      currentCount: 0, days30Count: 0, days60Count: 0, days90Count: 0, days180Count: 0, over180Count: 0
    })
  },
  type: {
    type: String,
    default: 'receivable',
    validator: (v) => ['receivable', 'payable'].includes(v)
  }
})

const segments = [
  { key: 'current', label: '未到期', color: 'var(--color-success)' },
  { key: 'days30', label: '逾期1-30天', color: '#84cc16' },
  { key: 'days60', label: '逾期31-60天', color: 'var(--color-warning)' },
  { key: 'days90', label: '逾期61-90天', color: '#f97316' },
  { key: 'days180', label: '逾期91-180天', color: 'var(--color-danger)' },
  { key: 'over180', label: '逾期180天以上', color: '#991b1b' }
]

const totalAmount = computed(() => {
  return segments.reduce((s, seg) => s + (parseFloat(props.data[seg.key]) || 0), 0)
})

const totalCount = computed(() => {
  return segments.reduce((s, seg) => s + (parseInt(props.data[seg.key + 'Count']) || 0), 0)
})

function barWidth(key) {
  if (totalAmount.value <= 0) return 0
  const val = parseFloat(props.data[key]) || 0
  return Math.max(0, Math.min(100, (val / totalAmount.value) * 100))
}

function getPercent(key) {
  if (totalAmount.value <= 0) return '0.0'
  const val = parseFloat(props.data[key]) || 0
  return (val / totalAmount.value * 100).toFixed(1)
}

// 保留本地版本：minimumFractionDigits 为 0（整数不显示小数位），与全局 formatMoney 固定2位小数不同
function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.aging-analysis {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.aging-chart {
  padding: var(--space-3) 0;
}
.aging-bar-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.aging-bar-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.aging-bar-track {
  height: 20px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.aging-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  min-width: 2px;
}
.aging-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
}
.aging-bar-title {
  color: var(--color-text-secondary);
}
.aging-bar-value {
  color: var(--color-text-primary);
  font-weight: 600;
}
.aging-table {
  font-size: var(--font-size-sm);
}
.aging-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  margin-right: var(--space-2);
  vertical-align: middle;
}
.aging-total-row {
  border-top: 2px solid var(--color-border);
  background: var(--color-bg-primary);
}
</style>
