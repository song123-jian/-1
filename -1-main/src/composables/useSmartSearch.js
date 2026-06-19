import { ref, computed } from 'vue'

/**
 * 智能搜索解析 composable
 * 解析自然语言搜索条件，转换为结构化筛选对象
 * @param {Array} fields - 可搜索字段定义 [{key, label, type}]
 * @returns {Object} { smartSearchText, parsedFilters, clearSearch }
 */
export function useSmartSearch(fields = []) {
  const smartSearchText = ref('')

  const parsedFilters = computed(() => {
    const text = smartSearchText.value.trim()
    if (!text) return {}

    const filters = {}
    const lowerText = text.toLowerCase()

    // 等级筛选：A级客户、B级、C类
    const gradeMatch = text.match(/([ABCD])[级类]?(?:客户|供应商)?/)
    if (gradeMatch) filters.grade = gradeMatch[1]

    // 状态筛选：活跃、潜在、非活跃
    const statusMap = { 活跃: 'active', 潜在: 'potential', 非活跃: 'dormant', 休眠: 'dormant' }
    for (const [keyword, val] of Object.entries(statusMap)) {
      if (lowerText.includes(keyword)) {
        filters.status = val
        break
      }
    }

    // 地区筛选
    const regionKeywords = ['华东', '华北', '华南', '华中', '西南', '西北', '东北']
    for (const r of regionKeywords) {
      if (text.includes(r)) {
        filters.region = r
        break
      }
    }

    // 金额范围：大于1000、小于5000、1000-5000
    const amountRange = text.match(/(?:金额|价格)?\s*(?:大于|超过|>\s*)(\d+)/)
    if (amountRange) filters.minAmount = parseInt(amountRange[1])

    const amountMax = text.match(/(?:金额|价格)?\s*(?:小于|低于|<\s*)(\d+)/)
    if (amountMax) filters.maxAmount = parseInt(amountMax[1])

    const amountBetween = text.match(/(\d+)\s*[-~到]\s*(\d+)/)
    if (amountBetween) {
      filters.minAmount = parseInt(amountBetween[1])
      filters.maxAmount = parseInt(amountBetween[2])
    }

    // 时间范围：近30天、本月、上月、本季度、今年
    const now = new Date()
    if (/近?\s*30\s*天|最近一个月/.test(text)) {
      filters.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else if (/本月|这个月/.test(text)) {
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (/上月|上个月/.test(text)) {
      filters.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      filters.endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    } else if (/本季度|这个季度/.test(text)) {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      filters.startDate = quarterStart.toISOString().split('T')[0]
    } else if (/今年|本年度/.test(text)) {
      filters.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    }

    // 关键词搜索（去除已解析的特殊词后剩余文本）
    const keyword = text
      .replace(/[ABCD][级类]?(?:客户|供应商)?/g, '')
      .replace(/(?:活跃|潜在|非活跃|休眠)(?:客户|供应商)?/g, '')
      .replace(/(?:华东|华北|华南|华中|西南|西北|东北)/g, '')
      .replace(/(?:金额|价格)?\s*(?:大于|超过|小于|低于|[<>])\s*\d+/g, '')
      .replace(/\d+\s*[-~到]\s*\d+/g, '')
      .replace(/近?\s*30\s*天|最近一个月|本月|这个月|上月|上个月|本季度|这个季度|今年|本年度/g, '')
      .replace(/客户|供应商/g, '')
      .trim()

    if (keyword) filters.keyword = keyword

    return filters
  })

  function clearSearch() {
    smartSearchText.value = ''
  }

  return {
    smartSearchText,
    parsedFilters,
    clearSearch
  }
}
