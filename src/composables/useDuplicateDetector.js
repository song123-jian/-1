import { ref, computed } from 'vue'

/**
 * 计算两个字符串的相似度（Levenshtein距离归一化）
 */
function similarity(s1, s2) {
  s1 = String(s1 || '').toLowerCase().trim()
  s2 = String(s2 || '').toLowerCase().trim()
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0

  const len = Math.max(s1.length, s2.length)
  const matrix = []
  for (let i = 0; i <= s2.length; i++) matrix[i] = [i]
  for (let j = 0; j <= s1.length; j++) matrix[0][j] = j

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      matrix[i][j] = s2[i - 1] === s1[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }

  return 1 - matrix[s2.length][s1.length] / len
}

/**
 * 重复数据检测 composable
 * @param {Array} data - 数据列表
 * @param {Object} options - 配置 { fields: ['name', 'phone'], threshold: 0.8 }
 */
export function useDuplicateDetector(data, options = {}) {
  const { fields = ['name'], threshold = 0.8 } = options
  const checkedIds = ref(new Set())

  const duplicates = computed(() => {
    if (!data || data.length < 2) return []
    const results = []
    const seen = []

    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      for (const s of seen) {
        let matchScore = 0
        let matchCount = 0
        for (const field of fields) {
          const score = similarity(item[field], s.item[field])
          matchScore += score
          matchCount++
        }
        const avgScore = matchScore / matchCount
        if (avgScore >= threshold) {
          results.push({
            item,
            duplicateOf: s.item,
            score: avgScore,
            fields: fields.filter(f => similarity(item[f], s.item[f]) >= threshold)
          })
        }
      }
      seen.push({ item, index: i })
    }
    return results
  })

  const duplicateGroups = computed(() => {
    const groups = []
    const used = new Set()
    for (const d of duplicates.value) {
      if (used.has(d.item.id)) continue
      const group = [d.item, d.duplicateOf]
      used.add(d.item.id)
      used.add(d.duplicateOf.id)
      // 查找更多重复
      for (const other of data) {
        if (used.has(other.id)) continue
        let matchScore = 0
        for (const field of fields) {
          matchScore += similarity(other[field], d.item[field])
        }
        if (matchScore / fields.length >= threshold) {
          group.push(other)
          used.add(other.id)
        }
      }
      groups.push(group)
    }
    return groups
  })

  function markChecked(id) {
    checkedIds.value.add(id)
  }

  function isChecked(id) {
    return checkedIds.value.has(id)
  }

  return {
    duplicates,
    duplicateGroups,
    markChecked,
    isChecked
  }
}
