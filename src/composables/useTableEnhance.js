import { computed, unref } from 'vue'

/**
 * 表格数据增强 composable
 * 提供趋势标注（涨跌箭头）和异常值高亮
 * @param {Array|Ref} data - 表格数据数组或响应式引用
 * @param {Object} options - 配置
 */
export function useTableEnhance(data, options = {}) {
  const { trendField, compareFn, highlightField, highlightThreshold = 3 } = options

  const resolvedData = computed(() => {
    const raw = unref(data)
    return Array.isArray(raw) ? raw : []
  })

  // 趋势标注：计算每行相对于前一行或平均值的涨跌
  const trendData = computed(() => {
    const rows = resolvedData.value
    if (!trendField || rows.length < 2) return []
    const values = rows.map(row => parseFloat(row[trendField])).filter(v => !isNaN(v))
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    return rows.map((row, idx) => {
      const val = parseFloat(row[trendField])
      if (isNaN(val)) return { trend: 'neutral', diff: 0 }

      let prev = null
      if (compareFn) {
        prev = compareFn(row, idx, rows)
      } else if (idx > 0) {
        prev = parseFloat(rows[idx - 1][trendField])
      }

      if (prev === null || isNaN(prev)) {
        return { trend: val > avg ? 'up' : val < avg ? 'down' : 'neutral', diff: avg ? ((val - avg) / avg) : 0 }
      }

      const diff = prev ? ((val - prev) / Math.abs(prev)) : 0
      return {
        trend: val > prev ? 'up' : val < prev ? 'down' : 'neutral',
        diff
      }
    })
  })

  // 异常值高亮：标记超出平均值±N倍标准差的数据
  const anomalyData = computed(() => {
    const rows = resolvedData.value
    if (!highlightField || rows.length < 3) return []
    const values = rows.map(row => parseFloat(row[highlightField])).filter(v => !isNaN(v))
    if (values.length < 3) return []

    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    const threshold = stdDev * highlightThreshold

    return rows.map(row => {
      const val = parseFloat(row[highlightField])
      if (isNaN(val)) return { isAnomaly: false }
      return {
        isAnomaly: Math.abs(val - avg) > threshold,
        avg,
        stdDev
      }
    })
  })

  return {
    trendData,
    anomalyData
  }
}
