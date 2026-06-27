import { ref, computed, watch, onMounted } from 'vue'
import { usePurchaseStore, STATUS_LABELS, STATUS_COLORS } from '@/modules/purchase/stores/purchase'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import { toLocalDateStr } from '@/utils/format'

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLastMonthKey(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return getMonthKey(d)
}

function getWeekStartStr(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return toLocalDateStr(d)
}

export function usePurchaseManagement() {
  const purchaseStore = usePurchaseStore()
  const supplierStore = useSupplierStore()

  onMounted(() => {
    supplierStore.initSeedData()
    purchaseStore.initSeedData()
  })

  /* 筛选 */
  const searchText = ref('')
  const filterType = ref('')
  const filterStatus = ref('')
  const filterSupplier = ref('')
  const quickDateFilter = ref('')
  const activeTab = ref('list')
  const viewMode = ref('table')
  const showStatsExpanded = ref(false)

  function toggleInProgressFilter() {
    const inProgressStatuses = ['approved', 'ordered', 'receiving', 'inspecting']
    const currentIdx = inProgressStatuses.indexOf(filterStatus.value)
    if (currentIdx === -1) {
      filterStatus.value = 'approved'
    } else if (currentIdx < inProgressStatuses.length - 1) {
      filterStatus.value = inProgressStatuses[currentIdx + 1]
    } else {
      filterStatus.value = ''
    }
  }

  /* 流程看板金额计算 */
  const pendingAmount = computed(() => {
    return purchaseStore.purchaseOrders
      .filter((o) => o.type === 'purchase' && o.status === 'pending')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
  })

  const inProgressAmount = computed(() => {
    return purchaseStore.purchaseOrders
      .filter((o) => o.type === 'purchase' && ['approved', 'ordered', 'receiving', 'inspecting'].includes(o.status))
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
  })

  const completedCount = computed(() => {
    return purchaseStore.purchaseOrders.filter((o) => o.type === 'purchase' && o.status === 'completed').length
  })

  const completedAmount = computed(() => {
    return purchaseStore.purchaseOrders
      .filter((o) => o.type === 'purchase' && o.status === 'completed')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
  })

  /* 趋势指标计算 */
  const totalCountTrend = computed(() => {
    const thisMonthKey = getMonthKey()
    const lastMonthKey = getLastMonthKey()
    const thisMonth = purchaseStore.purchaseOrders.filter((o) => (o.createDate || '').startsWith(thisMonthKey)).length
    const lastMonth = purchaseStore.purchaseOrders.filter((o) => (o.createDate || '').startsWith(lastMonthKey)).length
    if (lastMonth === 0) return thisMonth > 0 ? 100 : 0
    return Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  })

  const pendingTrend = computed(() => {
    const today = toLocalDateStr()
    const yesterday = toLocalDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const todayPending = purchaseStore.purchaseOrders.filter(
      (o) => o.status === 'pending' && o.createDate === today
    ).length
    const yesterdayPending = purchaseStore.purchaseOrders.filter(
      (o) => o.status === 'pending' && o.createDate === yesterday
    ).length
    return todayPending - yesterdayPending
  })

  const amountTrend = computed(() => {
    const thisMonthKey = getMonthKey()
    const lastMonthKey = getLastMonthKey()
    const thisMonthAmount = purchaseStore.purchaseOrders
      .filter((o) => (o.createDate || '').startsWith(thisMonthKey))
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
    const lastMonthAmount = purchaseStore.purchaseOrders
      .filter((o) => (o.createDate || '').startsWith(lastMonthKey))
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0)
    if (lastMonthAmount === 0) return thisMonthAmount > 0 ? 100 : 0
    return Math.round(((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100)
  })

  /* 快速日期筛选 */
  function toggleQuickDate(period) {
    quickDateFilter.value = quickDateFilter.value === period ? '' : period
  }

  /* 筛选条件标签 */
  const activeFilterTags = computed(() => {
    const tags = []
    if (quickDateFilter.value) {
      const labels = { today: '今日', week: '本周', month: '本月' }
      tags.push({ key: 'quickDate', label: labels[quickDateFilter.value] })
    }
    if (searchText.value) {
      tags.push({ key: 'search', label: '搜索: ' + searchText.value })
    }
    if (filterType.value) {
      tags.push({ key: 'type', label: '类型: ' + (filterType.value === 'purchase' ? '采购' : '退货') })
    }
    if (filterStatus.value) {
      tags.push({ key: 'status', label: '状态: ' + STATUS_LABELS[filterStatus.value] })
    }
    if (filterSupplier.value) {
      const supplier = supplierStore.activeSuppliers.find((s) => s.id === filterSupplier.value)
      tags.push({ key: 'supplier', label: '供应商: ' + (supplier?.shortName || supplier?.name || filterSupplier.value) })
    }
    return tags
  })

  function removeFilterTag(key) {
    if (key === 'quickDate') quickDateFilter.value = ''
    if (key === 'search') searchText.value = ''
    if (key === 'type') filterType.value = ''
    if (key === 'status') filterStatus.value = ''
    if (key === 'supplier') filterSupplier.value = ''
  }

  function clearAllFilters() {
    quickDateFilter.value = ''
    searchText.value = ''
    filterType.value = ''
    filterStatus.value = ''
    filterSupplier.value = ''
  }

  const filteredOrders = computed(() => {
    let list = purchaseStore.purchaseOrders.filter((o) =>
      filterType.value === 'return' ? o.type === 'return' : o.type !== 'return'
    )

    if (quickDateFilter.value) {
      const today = toLocalDateStr()
      if (quickDateFilter.value === 'today') {
        list = list.filter((o) => o.createDate === today)
      } else if (quickDateFilter.value === 'week') {
        const weekStartStr = getWeekStartStr()
        list = list.filter((o) => (o.createDate || '') >= weekStartStr)
      } else if (quickDateFilter.value === 'month') {
        const monthStr = today.substring(0, 7)
        list = list.filter((o) => (o.createDate || '').startsWith(monthStr))
      }
    }

    if (searchText.value) {
      const kw = searchText.value.toLowerCase()
      list = list.filter(
        (o) =>
          (o.orderNo || '').toLowerCase().includes(kw) ||
          (o.title || '').toLowerCase().includes(kw) ||
          (o.supplierName || '').toLowerCase().includes(kw)
      )
    }

    if (filterStatus.value) {
      list = list.filter((o) => o.status === filterStatus.value)
    }

    if (filterSupplier.value) {
      list = list.filter((o) => o.supplierId === filterSupplier.value)
    }

    return list
  })

  /* 采购明细 */
  const allItemDetails = computed(() => {
    const details = []
    for (const order of purchaseStore.purchaseOrders) {
      if (order.type === 'return') continue
      for (const item of order.items || []) {
        details.push({
          orderNo: order.orderNo,
          ...item
        })
      }
    }
    return details
  })

  /* 分页 */
  const pageSize = 10
  const currentPage = ref(1)
  const detailPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))
  const detailTotalPages = computed(() => Math.max(1, Math.ceil(allItemDetails.value.length / pageSize)))

  const paginatedOrders = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredOrders.value.slice(start, start + pageSize)
  })

  const paginatedDetails = computed(() => {
    const start = (detailPage.value - 1) * pageSize
    return allItemDetails.value.slice(start, start + pageSize)
  })

  watch([searchText, filterType, filterStatus, filterSupplier, quickDateFilter], () => {
    currentPage.value = 1
  })

  watch(
    () => filteredOrders.value.length,
    () => {
      if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
    }
  )

  watch(
    () => allItemDetails.value.length,
    () => {
      if (detailPage.value > detailTotalPages.value) detailPage.value = detailTotalPages.value
    }
  )

  /* 概览面板 */
  const completionRate = computed(() => {
    const total = purchaseStore.purchaseOrders.filter((o) => o.type === 'purchase').length
    if (total === 0) return 0
    const completed = purchaseStore.purchaseOrders.filter(
      (o) => o.type === 'purchase' && o.status === 'completed'
    ).length
    return Math.round((completed / total) * 100)
  })

  const RING_C = 2 * Math.PI * 26
  const completionRateColor = computed(() => {
    const r = completionRate.value
    if (r >= 70) return 'var(--color-success)'
    if (r >= 40) return 'var(--color-warning)'
    return 'var(--color-danger)'
  })

  const completionRateDash = computed(() => {
    const p = completionRate.value / 100
    return `${p * RING_C} ${RING_C}`
  })

  const SUPPLIER_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#64748b']
  const topSuppliers = computed(() => {
    const map = {}
    for (const o of purchaseStore.purchaseOrders) {
      if (o.type !== 'purchase') continue
      const name = o.supplierName || '未知'
      if (!map[name]) map[name] = 0
      map[name] += parseFloat(o.totalAmount) || 0
    }
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const max = entries.length > 0 ? entries[0][1] : 1
    return entries.map((entry, index) => ({
      name: entry[0],
      amount: entry[1],
      percent: Math.round((entry[1] / max) * 100),
      color: SUPPLIER_COLORS[index] || SUPPLIER_COLORS[4]
    }))
  })

  const recent7Days = computed(() => {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = toLocalDateStr(d)
      const count = purchaseStore.purchaseOrders.filter(
        (o) => o.type === 'purchase' && o.createDate === ds
      ).length
      days.push({
        date: ds,
        dayLabel: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        count,
        percent: 0
      })
    }
    const max = Math.max(...days.map((d) => d.count), 1)
    days.forEach((d) => {
      d.percent = Math.round((d.count / max) * 100)
    })
    return days
  })

  const pendingAlerts = computed(() => {
    return purchaseStore.purchaseOrders
      .filter((o) => o.type === 'purchase' && (o.status === 'pending' || o.status === 'inspecting'))
      .slice()
      .sort((a, b) => (a.expectedDate || '9999-12-31').localeCompare(b.expectedDate || '9999-12-31'))
      .slice(0, 5)
  })

  function statusBarColor(status) {
    const map = {
      draft: 'var(--color-text-tertiary)',
      pending: 'var(--color-warning)',
      approved: 'var(--color-info)',
      ordered: 'var(--color-info)',
      receiving: 'var(--color-accent)',
      inspecting: 'var(--color-warning)',
      completed: 'var(--color-success)',
      cancelled: 'var(--color-danger)',
      returned: 'var(--color-danger)'
    }
    return map[status] || 'var(--color-text-tertiary)'
  }

  /* 弹窗状态 */
  const showFormModal = ref(false)
  const editingOrder = ref(null)
  const showPreviewModal = ref(false)
  const previewOrder = ref(null)
  const showApproveModal = ref(false)
  const approvingOrder = ref(null)
  const rejectReason = ref('')
  const showCancelConfirm = ref(false)
  const cancellingOrderId = ref('')
  const cancellingOrderNo = ref('')
  const showDeleteConfirm = ref(false)
  const deletingOrder = ref(null)

  function openAddModal() {
    editingOrder.value = null
    showFormModal.value = true
  }

  function openEditModal(order) {
    editingOrder.value = { ...order }
    showFormModal.value = true
  }

  function handleFormSave() {
    showFormModal.value = false
    editingOrder.value = null
  }

  function openPreview(order) {
    previewOrder.value = { ...order }
    showPreviewModal.value = true
  }

  function openApproveModal(order) {
    approvingOrder.value = { ...order }
    rejectReason.value = ''
    showApproveModal.value = true
  }

  function handleApprove() {
    if (approvingOrder.value) {
      purchaseStore.approvePurchaseOrder(approvingOrder.value.id, '')
      showApproveModal.value = false
    }
  }

  function handleReject() {
    if (approvingOrder.value) {
      purchaseStore.rejectPurchaseOrder(approvingOrder.value.id, rejectReason.value)
      showApproveModal.value = false
    }
  }

  function handleSubmit(id) {
    purchaseStore.submitPurchaseOrder(id)
  }

  function handleOrder(id) {
    purchaseStore.orderPurchaseOrder(id)
  }

  function handleReceive(id) {
    purchaseStore.receivePurchaseOrder(id)
  }

  function handleInspect(id) {
    purchaseStore.inspectPurchaseOrder(id)
  }

  function handleComplete(id) {
    purchaseStore.completePurchaseOrder(id)
  }

  function handleReturn(order) {
    purchaseStore.returnPurchaseOrder(order.id)
  }

  function handleCancel(id) {
    cancellingOrderId.value = id
    const order = purchaseStore.purchaseOrders.find((o) => o.id === id)
    cancellingOrderNo.value = order?.orderNo || ''
    showCancelConfirm.value = true
  }

  function confirmCancel() {
    purchaseStore.cancelPurchaseOrder(cancellingOrderId.value)
    showCancelConfirm.value = false
  }

  function handleDelete(order) {
    deletingOrder.value = order
    showDeleteConfirm.value = true
  }

  function confirmDelete() {
    if (deletingOrder.value) {
      purchaseStore.deletePurchaseOrder(deletingOrder.value.id)
    }
    showDeleteConfirm.value = false
    deletingOrder.value = null
  }

  function formatAmount(val) {
    const n = parseFloat(val) || 0
    return n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
  }

  function formatAmountShort(val) {
    const n = parseFloat(val) || 0
    if (n >= 10000 || n <= -10000) return (n / 10000).toFixed(1) + '万'
    return n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
  }

  return {
    purchaseStore,
    supplierStore,
    STATUS_LABELS,
    STATUS_COLORS,

    searchText,
    filterType,
    filterStatus,
    filterSupplier,
    quickDateFilter,
    activeTab,
    viewMode,
    showStatsExpanded,
    toggleInProgressFilter,

    pendingAmount,
    inProgressAmount,
    completedCount,
    completedAmount,
    totalCountTrend,
    pendingTrend,
    amountTrend,
    toggleQuickDate,
    activeFilterTags,
    removeFilterTag,
    clearAllFilters,
    filteredOrders,
    allItemDetails,
    pageSize,
    currentPage,
    detailPage,
    totalPages,
    detailTotalPages,
    paginatedOrders,
    paginatedDetails,
    completionRate,
    RING_C,
    completionRateColor,
    completionRateDash,
    topSuppliers,
    recent7Days,
    pendingAlerts,
    statusBarColor,

    showFormModal,
    editingOrder,
    openAddModal,
    openEditModal,
    handleFormSave,
    showPreviewModal,
    previewOrder,
    openPreview,
    showApproveModal,
    approvingOrder,
    rejectReason,
    openApproveModal,
    handleApprove,
    handleReject,
    handleSubmit,
    handleOrder,
    handleReceive,
    handleInspect,
    handleComplete,
    handleReturn,
    showCancelConfirm,
    cancellingOrderId,
    cancellingOrderNo,
    handleCancel,
    confirmCancel,
    showDeleteConfirm,
    deletingOrder,
    handleDelete,
    confirmDelete,
    formatAmount,
    formatAmountShort
  }
}
