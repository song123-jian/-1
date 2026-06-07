/**
 * 财务页面组合式函数
 * 抽取 PayableManagement 和 ReceivableManagement 的公共逻辑
 */
import { ref, reactive, computed, watch } from 'vue'

/**
 * 创建财务页面通用逻辑
 * @param {Object} config - 配置项
 * @param {Object} config.financeStore - 应付/应收 store 实例
 * @param {Object} config.secondaryStore - 关联 store 实例（inventoryStore 或 customerStore）
 * @param {'payable'|'receivable'} config.type - 财务类型
 * @returns {Object} 财务页面通用状态和方法
 */
export function useFinancePage(config) {
  const { financeStore, secondaryStore, type } = config
  const isPayable = type === 'payable'

  /* 根据类型推导字段名 */
  const primaryListKey = isPayable ? 'payables' : 'receivables'
  const secondaryListKey = isPayable ? 'payments' : 'receipts'
  const primaryNoField = isPayable ? 'payableNo' : 'receivableNo'
  const secondaryNoField = isPayable ? 'paymentNo' : 'receiptNo'
  const entityNameField = isPayable ? 'supplierName' : 'customerName'
  const entityIdField = isPayable ? 'supplierId' : 'customerId'
  const secondaryDateField = isPayable ? 'paymentDate' : 'receiptDate'
  const secondaryStoreListKey = isPayable ? 'suppliers' : 'customers'

  /* 通用状态 */
  const currentTab = ref(isPayable ? 'payables' : 'receivables')
  const showForm = ref(false)
  const selectedItem = ref(null)
  const primaryPage = ref(1)
  const secondaryPage = ref(1)
  const pageSize = 10

  const tabs = [
    { key: primaryListKey, label: isPayable ? '应付列表' : '应收列表', icon: 'list' },
    { key: secondaryListKey, label: isPayable ? '付款记录' : '收款记录', icon: 'dollar' },
    { key: 'aging', label: '账龄分析', icon: 'chart' }
  ]

  const filters = reactive({
    search: '',
    status: '',
    [entityIdField]: ''
  })

  /* 关联实体列表（供应商/客户） */
  const entityList = computed(() => {
    const storeList = secondaryStore[secondaryStoreListKey] || []
    const seen = new Set()
    const result = []
    /* 从财务单据中提取关联实体 */
    for (const item of financeStore[primaryListKey]) {
      if (item[entityIdField] && !seen.has(item[entityIdField])) {
        seen.add(item[entityIdField])
        result.push({ id: item[entityIdField], name: item[entityNameField] })
      }
    }
    /* 补充关联 Store 中的数据 */
    for (const s of storeList) {
      const id = s.id
      if (!seen.has(id)) {
        seen.add(id)
        result.push({ id, name: s.name || s.shortName || s.fullName || s.companyName })
      }
    }
    return result
  })

  /* 筛选后的主列表（应付/应收） */
  const filteredPrimaryList = computed(() => {
    return financeStore[primaryListKey].filter(item => {
      if (filters.search) {
        const s = filters.search.toLowerCase()
        if (!(item[primaryNoField] || '').toLowerCase().includes(s) &&
            !(item[entityNameField] || '').toLowerCase().includes(s) &&
            !(item.sourceNo || '').toLowerCase().includes(s)) return false
      }
      if (filters.status && item.status !== filters.status) return false
      if (filters[entityIdField] && item[entityIdField] !== filters[entityIdField]) return false
      return true
    })
  })

  /* 筛选后的次列表（付款/收款） */
  const filteredSecondaryList = computed(() => {
    let list = [...financeStore[secondaryListKey]]
    if (filters.search) {
      const s = filters.search.toLowerCase()
      list = list.filter(item =>
        (item[secondaryNoField] || '').toLowerCase().includes(s) ||
        (item[entityNameField] || '').toLowerCase().includes(s)
      )
    }
    if (filters[entityIdField]) {
      list = list.filter(item => item[entityIdField] === filters[entityIdField])
    }
    return list.sort((a, b) => (b[secondaryDateField] || '').localeCompare(a[secondaryDateField] || ''))
  })

  /* 分页 */
  const totalPrimaryPages = computed(() => Math.max(1, Math.ceil(filteredPrimaryList.value.length / pageSize)))
  const paginatedPrimaryList = computed(() => {
    const start = (primaryPage.value - 1) * pageSize
    return filteredPrimaryList.value.slice(start, start + pageSize)
  })

  const totalSecondaryPages = computed(() => Math.max(1, Math.ceil(filteredSecondaryList.value.length / pageSize)))
  const paginatedSecondaryList = computed(() => {
    const start = (secondaryPage.value - 1) * pageSize
    return filteredSecondaryList.value.slice(start, start + pageSize)
  })

  /* 账龄分析数据 */
  const agingData = computed(() => financeStore.getAgingAnalysis())

  /* 通用方法 */
  function resetFilters() {
    filters.search = ''
    filters.status = ''
    filters[entityIdField] = ''
    primaryPage.value = 1
    secondaryPage.value = 1
  }

  function openForm(item) {
    selectedItem.value = item || null
    showForm.value = true
  }

  function onFormSaved() {
    selectedItem.value = null
  }

  function handleRevoke(record) {
    const label = isPayable ? '付款' : '收款'
    if (!confirm(`确定要撤销${label}记录「${record[secondaryNoField] || ''}」吗？撤销后${isPayable ? '应付' : '应收'}金额将回退。`)) return

    const parentIdField = isPayable ? 'payableId' : 'receivableId'
    const parentId = record[parentIdField]
    const deleteMethod = isPayable ? 'deletePayment' : 'deleteReceipt'

    if (!parentId) {
      /* 尝试从主单据中查找关联 */
      const found = financeStore[primaryListKey].find(item =>
        (item[secondaryListKey] || []).some(r => r.id === record.id)
      )
      if (!found) {
        alert(`无法找到关联的${isPayable ? '应付' : '应收'}单，撤销失败`)
        return
      }
      const result = financeStore[deleteMethod](found.id, record.id)
      if (!result.success) alert(result.error || '撤销失败')
    } else {
      const result = financeStore[deleteMethod](parentId, record.id)
      if (!result.success) alert(result.error || '撤销失败')
    }
  }

  function getRowStyle(item) {
    if (item.status === 'overdue') return { borderLeft: '3px solid var(--color-danger)' }
    if (item.status === 'partial') return { borderLeft: '3px solid var(--color-warning)' }
    if (item.status === 'completed') return { borderLeft: '3px solid var(--color-success)' }
    return {}
  }

  function onEntityChange({ value, data }) {
    if (data) {
      filters[entityIdField] = data.id
    }
  }

  /* 筛选条件变化时重置页码 */
  watch([() => filters.search, () => filters.status, () => filters[entityIdField]], () => {
    primaryPage.value = 1
    secondaryPage.value = 1
  })

  return {
    /* 状态 */
    currentTab, showForm, selectedItem,
    primaryPage, secondaryPage, pageSize, tabs, filters,

    /* 计算属性 */
    entityList,
    filteredPrimaryList, filteredSecondaryList,
    totalPrimaryPages, paginatedPrimaryList,
    totalSecondaryPages, paginatedSecondaryList,
    agingData,

    /* 方法 */
    resetFilters, openForm, onFormSaved, handleRevoke, getRowStyle, onEntityChange,

    /* 字段名常量（供模板使用） */
    primaryListKey, secondaryListKey,
    primaryNoField, secondaryNoField,
    entityNameField, entityIdField, secondaryDateField
  }
}
