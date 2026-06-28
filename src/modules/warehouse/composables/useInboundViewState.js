import { ref, reactive, computed, watch } from 'vue'
import { escapeHtml } from '@/utils/format'

export function useInboundViewState({ inventoryStore, onQuickOutbound }) {
  const inboundColumnDefs = [
    { key: 'check', label: '', hideable: false },
    { key: 'orderNo', label: '入库单号' },
    { key: 'date', label: '入库日期' },
    { key: 'type', label: '入库类型' },
    { key: 'supplierCode', label: '供应商编码' },
    { key: 'supplierName', label: '供应商名称' },
    { key: 'totalWeight', label: '总重量(kg)' },
    { key: 'totalAmount', label: '总金额(元)' },
    { key: 'status', label: '状态' },
    { key: 'actions', label: '操作', hideable: false }
  ]

  const inboundColumnVisible = ref(
    Object.fromEntries(inboundColumnDefs.filter((c) => c.hideable !== false).map((c) => [c.key, true]))
  )

  const inboundSearch = ref('')
  const inboundTypeFilter = ref('')
  const inboundStatusFilter = ref('')
  const inboundSupplierFilter = ref('')
  const inboundPage = ref(1)
  const inboundPageSize = ref(15)
  const inboundTab = ref('main')
  const inboundSelectAll = ref(false)
  const inboundSelectedIds = ref([])
  const inboundView = ref('table')
  const showViewMenu = ref(false)
  const inboundDetailPage = ref(1)
  const inboundDetailPageSize = ref(15)
  const showInboundWizard = ref(false)
  const editingInboundId = ref(null)
  const inboundFormItems = ref([])
  const inboundErrors = ref([])
  const continuousScanMode = ref(false)
  const showInboundDetail = ref(false)
  const detailOrder = ref(null)
  const showRecycleBin = ref(false)
  const inboundCalYear = ref(new Date().getFullYear())
  const inboundCalMonth = ref(new Date().getMonth())
  const confirmDialog = ref({ show: false, title: '', message: '', onConfirm: null })
  const copySuccessMsg = ref('')
  const showInboundStatsExpanded = ref(false)
  const inboundForm = reactive({
    date: new Date().toISOString().split('T')[0],
    type: '',
    counterpartyId: '',
    counterpartyName: '',
    supplierCode: '',
    warehouseId: 'main',
    locationId: '',
    notes: '',
    orderNo: ''
  })

  function handleClickOutside(e) {
    if (showViewMenu.value && !e.target.closest('.view-toggle-dropdown')) {
      showViewMenu.value = false
    }
  }

  function showConfirmDialog(title, message, onConfirm) {
    confirmDialog.value = { show: true, title, message, onConfirm }
  }

  function handleConfirmDialogOk() {
    if (confirmDialog.value.onConfirm) confirmDialog.value.onConfirm()
    confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
  }

  function handleConfirmDialogCancel() {
    confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
  }

  function inboundTypeLabel(type) {
    const found = inventoryStore.INBOUND_TYPES.find((t) => t.value === type)
    return found ? found.label : type || '-'
  }

  function getParsedItems(order) {
    if (!order) return []
    try {
      return typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
    } catch (e) {
      return []
    }
  }

  function calcInboundWeight(order) {
    const items = getParsedItems(order)
    return items.reduce((s, it) => s + (it.qty || 0), 0)
  }

  function calcInboundAmount(order) {
    const items = getParsedItems(order)
    return items.reduce((s, it) => s + (it.qty || 0) * (it.cost || 0), 0)
  }

  const filteredInboundOrders = computed(() => {
    let list = inventoryStore.inboundOrders
    const search = inboundSearch.value.toLowerCase()
    if (search) {
      list = list.filter(
        (o) =>
          (o.orderNo || '').toLowerCase().includes(search) || (o.counterpartyName || '').toLowerCase().includes(search)
      )
    }
    if (inboundTypeFilter.value) {
      list = list.filter((o) => o.type === inboundTypeFilter.value)
    }
    if (inboundStatusFilter.value) {
      list = list.filter((o) => o.status === inboundStatusFilter.value)
    }
    if (inboundSupplierFilter.value) {
      list = list.filter((o) => o.counterpartyId === inboundSupplierFilter.value)
    }
    return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  })

  const inboundTotalPages = computed(() =>
    Math.max(1, Math.ceil(filteredInboundOrders.value.length / inboundPageSize.value))
  )
  const paginatedInbound = computed(() => {
    const start = (inboundPage.value - 1) * inboundPageSize.value
    return filteredInboundOrders.value.slice(start, start + inboundPageSize.value)
  })

  watch([inboundSearch, inboundTypeFilter, inboundStatusFilter, inboundSupplierFilter], () => {
    inboundPage.value = 1
    inboundDetailPage.value = 1
  })

  const inboundVisiblePages = computed(() => {
    const total = inboundTotalPages.value
    const current = inboundPage.value
    const pages = []
    let start = Math.max(1, current - 2)
    const end = Math.min(total, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  })

  const inboundMonthAmount = computed(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return inventoryStore.inboundOrders
      .filter((o) => o.status === 'confirmed' && o.date)
      .filter((o) => {
        const d = new Date(o.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .reduce((s, o) => s + calcInboundAmount(o), 0)
  })

  const inboundAllDetails = computed(() => {
    const details = []
    let detailId = 1
    for (const o of inventoryStore.inboundOrders) {
      const items = getParsedItems(o)
      for (const item of items) {
        const inv = inventoryStore.lookupByBarcode(item.code || item.name || '')
        details.push({
          id: o.id + '_' + detailId,
          detailId: detailId++,
          orderNo: o.orderNo,
          barcode: item.barcode || item.code || '',
          code: item.code || (inv ? inv.code : ''),
          name: item.name || (inv ? inv.name : ''),
          grade: item.grade || (inv ? inv.grade : ''),
          color: item.color || (inv ? inv.color : ''),
          qty: item.qty || 0,
          cost: item.cost || 0,
          amount: Math.round((item.qty || 0) * (item.cost || 0) * 100) / 100,
          batch: item.batch || '',
          orderId: o.id,
          status: o.status
        })
      }
    }
    return details
  })

  const filteredInboundDetails = computed(() => {
    let list = inboundAllDetails.value
    const search = inboundSearch.value.toLowerCase()
    if (search) {
      list = list.filter(
        (d) =>
          (d.orderNo || '').toLowerCase().includes(search) ||
          (d.code || '').toLowerCase().includes(search) ||
          (d.name || '').toLowerCase().includes(search)
      )
    }
    if (inboundTypeFilter.value) {
      list = list.filter((d) => {
        const order = inventoryStore.inboundOrders.find((o) => o.id === d.orderId)
        return order && order.type === inboundTypeFilter.value
      })
    }
    if (inboundStatusFilter.value) {
      list = list.filter((d) => d.status === inboundStatusFilter.value)
    }
    if (inboundSupplierFilter.value) {
      list = list.filter((d) => {
        const order = inventoryStore.inboundOrders.find((o) => o.id === d.orderId)
        return order && order.counterpartyId === inboundSupplierFilter.value
      })
    }
    return list
  })

  const inboundDetailTotalPages = computed(() =>
    Math.max(1, Math.ceil(filteredInboundDetails.value.length / inboundDetailPageSize.value))
  )
  const paginatedInboundDetails = computed(() => {
    const start = (inboundDetailPage.value - 1) * inboundDetailPageSize.value
    return filteredInboundDetails.value.slice(start, start + inboundDetailPageSize.value)
  })

  const inboundDetailVisiblePages = computed(() => {
    const total = inboundDetailTotalPages.value
    const current = inboundDetailPage.value
    const pages = []
    let start = Math.max(1, current - 2)
    const end = Math.min(total, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  })

  const inboundItemsTotalWeight = computed(() => inboundFormItems.value.reduce((s, it) => s + (it.qty || 0), 0))
  const inboundItemsTotalAmount = computed(() =>
    inboundFormItems.value.reduce((s, it) => s + (it.qty || 0) * (it.cost || 0), 0)
  )

  const confirmRate = computed(() => {
    const total = inventoryStore.inboundOrders.length
    if (total === 0) return 0
    const confirmed = inventoryStore.inboundOrders.filter((o) => o.status === 'confirmed').length
    return Math.round((confirmed / total) * 100)
  })
  const RING_C = 2 * Math.PI * 26
  const confirmRateColor = computed(() => {
    const r = confirmRate.value
    if (r >= 70) return 'var(--color-success)'
    if (r >= 40) return 'var(--color-warning)'
    return 'var(--color-danger)'
  })
  const confirmRateDash = computed(() => {
    const p = confirmRate.value / 100
    return `${p * RING_C} ${RING_C}`
  })

  const TYPE_COLORS = { purchase: '#3b82f6', return: '#f59e0b', transfer: '#a855f7', other: '#64748b' }
  const inboundTypeStats = computed(() => {
    const map = {}
    inventoryStore.inboundOrders.forEach((o) => {
      map[o.type] = (map[o.type] || 0) + 1
    })
    const total = inventoryStore.inboundOrders.length || 1
    return Object.entries(map).map(([type, count]) => {
      const found = inventoryStore.INBOUND_TYPES.find((t) => t.value === type)
      return {
        type,
        label: found ? found.label : type,
        count,
        percent: Math.round((count / total) * 100),
        color: TYPE_COLORS[type] || '#64748b'
      }
    })
  })

  const recent7Days = computed(() => {
    const today = new Date()
    const days = []
    let maxCount = 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = inventoryStore.inboundOrders.filter((o) => o.date === dateStr).length
      if (count > maxCount) maxCount = count
      days.push({ dateStr, count, dayLabel: d.getMonth() + 1 + '/' + d.getDate() })
    }
    return days.map((d) => ({ ...d, percent: maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0 }))
  })

  const pendingAlerts = computed(() => {
    return inventoryStore.inboundOrders
      .filter((o) => o.status === 'pending' || o.status === 'inspecting')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .slice(0, 5)
  })

  const locationParentFilters = computed(() => {
    if (!inboundForm.warehouseId) return []
    return [{ field: 'warehouseId', operator: 'eq', value: inboundForm.warehouseId }]
  })

  const inboundSelectedPendingCount = computed(() => {
    return inboundSelectedIds.value.filter((id) => {
      const o = inventoryStore.inboundOrders.find((ord) => ord.id === id)
      return o && o.status === 'pending'
    }).length
  })
  const inboundSelectedInspectingCount = computed(() => {
    return inboundSelectedIds.value.filter((id) => {
      const o = inventoryStore.inboundOrders.find((ord) => ord.id === id)
      return o && o.status === 'inspecting'
    }).length
  })

  const inboundCalHtml = computed(() => {
    const year = inboundCalYear.value
    const month = inboundCalMonth.value
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    const todayStr =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    const itemsByDate = {}
    for (const o of inventoryStore.inboundOrders) {
      const d = o.date || ''
      if (d) {
        if (!itemsByDate[d]) itemsByDate[d] = []
        itemsByDate[d].push(o)
      }
    }
    let html =
      '<table class="cal-table"><thead><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr></thead><tbody>'
    let day = 1
    for (let i = 0; i < 6; i++) {
      if (day > daysInMonth) break
      html += '<tr>'
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          html += '<td></td>'
          continue
        }
        if (day > daysInMonth) {
          html += '<td></td>'
          continue
        }
        const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
        const isToday = dateStr === todayStr
        const dayItems = itemsByDate[dateStr] || []
        html +=
          '<td' +
          (isToday ? ' style="background:var(--color-accent-subtle)"' : '') +
          '><div style="font-weight:' +
          (isToday ? '700' : '400') +
          '">' +
          day +
          '</div>'
        for (const di of dayItems.slice(0, 2)) {
          html +=
            '<div style="font-size:10px;color:var(--color-text-tertiary);;overflow-wrap:break-word;word-wrap:break-word">' +
            escapeHtml(di.orderNo) +
            '</div>'
        }
        if (dayItems.length > 2)
          html += '<div style="font-size:10px;color:var(--color-accent)">+' + (dayItems.length - 2) + '</div>'
        html += '</td>'
        day++
      }
      html += '</tr>'
    }
    html += '</tbody></table>'
    return html
  })

  function openInboundWizard() {
    editingInboundId.value = null
    Object.assign(inboundForm, {
      date: new Date().toISOString().split('T')[0],
      type: '',
      counterpartyId: '',
      counterpartyName: '',
      supplierCode: '',
      warehouseId: 'main',
      locationId: '',
      notes: '',
      orderNo: inventoryStore.generateInboundNo()
    })
    inboundFormItems.value = [{ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' }]
    inboundErrors.value = []
    showInboundWizard.value = true
  }

  function openEditInbound(order) {
    editingInboundId.value = order.id
    Object.assign(inboundForm, {
      date: order.date || '',
      type: order.type || '',
      counterpartyId: order.counterpartyId || '',
      counterpartyName: order.counterpartyName || '',
      supplierCode: order.supplierCode || '',
      warehouseId: order.warehouseId || 'main',
      locationId: order.locationId || '',
      notes: order.notes || '',
      orderNo: order.orderNo || ''
    })
    inboundFormItems.value =
      getParsedItems(order).length > 0
        ? getParsedItems(order).map((it) => ({ barcode: it.barcode || it.code || '', ...it }))
        : [{ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' }]
    inboundErrors.value = []
    showInboundWizard.value = true
  }

  function closeInboundWizard() {
    showInboundWizard.value = false
    editingInboundId.value = null
    inboundErrors.value = []
  }

  function addInboundItem() {
    inboundFormItems.value.push({ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' })
  }

  function removeInboundItem(idx) {
    inboundFormItems.value.splice(idx, 1)
  }

  function onInboundItemCodeChange(idx) {
    const code = inboundFormItems.value[idx].code
    if (!code) return
    const found = inventoryStore.lookupByBarcode(code)
    if (found) {
      inboundFormItems.value[idx].name = found.name
      inboundFormItems.value[idx].grade = found.grade || ''
      inboundFormItems.value[idx].color = found.color || ''
      inboundFormItems.value[idx].cost = found.unitCost || 0
    }
  }

  function onInboundItemBarcodeChange(idx) {
    const barcode = inboundFormItems.value[idx].barcode || inboundFormItems.value[idx].code
    if (!barcode) return
    const found = inventoryStore.lookupByBarcode(barcode)
    if (found) {
      inboundFormItems.value[idx].code = found.code || ''
      inboundFormItems.value[idx].name = found.name || ''
      inboundFormItems.value[idx].grade = found.grade || ''
      inboundFormItems.value[idx].color = found.color || ''
      inboundFormItems.value[idx].cost = found.unitCost || 0
    }
  }

  function onInboundSupplierChange() {
    const sup = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
    if (sup) {
      inboundForm.counterpartyName = sup.shortName || sup.name
      inboundForm.supplierCode = sup.supplierCode || ''
    } else {
      inboundForm.supplierCode = ''
    }
  }

  function onSupplierChange({ value, data }) {
    if (data) {
      inboundForm.counterpartyName = data.shortName || data.name
      inboundForm.supplierCode = data.supplierCode || ''
    } else {
      inboundForm.counterpartyName = ''
      inboundForm.supplierCode = ''
    }
  }

  function onWarehouseChange({ value, data }) {
    inboundForm.locationId = ''
  }

  function onMaterialChange(idx, { value, data }) {
    if (data) {
      inboundFormItems.value[idx].code = data.code || ''
      inboundFormItems.value[idx].name = data.name || ''
      inboundFormItems.value[idx].grade = data.grade || ''
      inboundFormItems.value[idx].color = data.color || ''
      inboundFormItems.value[idx].cost = data.unitCost || 0
    }
  }

  function onInboundSupplierCodeChange() {
    if (!inboundForm.supplierCode) return
    const sup = inventoryStore.suppliers.find(
      (s) => s.supplierCode === inboundForm.supplierCode || s.id === inboundForm.supplierCode
    )
    if (sup) {
      inboundForm.counterpartyId = sup.id
      inboundForm.counterpartyName = sup.shortName || sup.name
    }
  }

  function toggleContinuousScan() {
    continuousScanMode.value = !continuousScanMode.value
  }

  function focusBarcodeInput() {
    const inputs = document.querySelectorAll('.inbound-barcode-input')
    if (inputs.length > 0) inputs[inputs.length - 1].focus()
  }

  function inboundCalPrev() {
    inboundCalMonth.value--
    if (inboundCalMonth.value < 0) {
      inboundCalMonth.value = 11
      inboundCalYear.value--
    }
  }

  function inboundCalNext() {
    inboundCalMonth.value++
    if (inboundCalMonth.value > 11) {
      inboundCalMonth.value = 0
      inboundCalYear.value++
    }
  }

  function inboundCalToday() {
    inboundCalYear.value = new Date().getFullYear()
    inboundCalMonth.value = new Date().getMonth()
  }

  function viewInboundDetail(order) {
    detailOrder.value = order
    showInboundDetail.value = true
  }

  function toggleInboundSelectAll(checked) {
    inboundSelectAll.value = checked
    inboundSelectedIds.value = checked ? paginatedInbound.value.map((o) => o.id) : []
  }

  function openRecycleBinModal() {
    showRecycleBin.value = true
  }

  function handleDoubleClickInbound(order) {
    if (order.status !== 'confirmed') return
    if (typeof onQuickOutbound === 'function') onQuickOutbound(order)
  }

  function quickInboundForItem(item) {
    openInboundWizard()
    inboundForm.type = 'purchase'
    inboundFormItems.value = [
      {
        barcode: item.code,
        code: item.code,
        name: item.name,
        grade: item.grade || '',
        color: item.color || '',
        qty: Math.max(0, item.safetyStockVal - item.stock),
        cost: item.unitCost || 0,
        batch: ''
      }
    ]
  }

  function handleDownloadImportTemplate() {
    const headers = [
      '入库类型',
      '入库日期',
      '供应商编码',
      '编号',
      '物料名称',
      '牌号',
      '颜色',
      '数量(kg)',
      '单价(元/kg)',
      '批次号',
      '备注'
    ]
    const csv = '\uFEFF' + headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '入库导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    inboundColumnVisible,
    inboundSearch,
    inboundTypeFilter,
    inboundStatusFilter,
    inboundSupplierFilter,
    inboundPage,
    inboundPageSize,
    inboundTab,
    inboundSelectAll,
    inboundSelectedIds,
    inboundView,
    showViewMenu,
    inboundDetailPage,
    inboundDetailPageSize,
    showInboundWizard,
    editingInboundId,
    inboundFormItems,
    inboundErrors,
    continuousScanMode,
    showInboundDetail,
    detailOrder,
    showRecycleBin,
    inboundCalYear,
    inboundCalMonth,
    confirmDialog,
    copySuccessMsg,
    showInboundStatsExpanded,
    inboundForm,
    filteredInboundOrders,
    inboundTotalPages,
    paginatedInbound,
    inboundVisiblePages,
    inboundMonthAmount,
    inboundAllDetails,
    filteredInboundDetails,
    inboundDetailTotalPages,
    paginatedInboundDetails,
    inboundDetailVisiblePages,
    inboundItemsTotalWeight,
    inboundItemsTotalAmount,
    confirmRate,
    confirmRateColor,
    confirmRateDash,
    inboundTypeStats,
    recent7Days,
    pendingAlerts,
    locationParentFilters,
    inboundSelectedPendingCount,
    inboundSelectedInspectingCount,
    inboundCalHtml,
    showConfirmDialog,
    handleConfirmDialogOk,
    handleConfirmDialogCancel,
    inboundTypeLabel,
    getParsedItems,
    calcInboundWeight,
    calcInboundAmount,
    openInboundWizard,
    openEditInbound,
    closeInboundWizard,
    addInboundItem,
    removeInboundItem,
    onInboundItemCodeChange,
    onInboundItemBarcodeChange,
    onInboundSupplierChange,
    onSupplierChange,
    onWarehouseChange,
    onMaterialChange,
    onInboundSupplierCodeChange,
    toggleContinuousScan,
    focusBarcodeInput,
    inboundCalPrev,
    inboundCalNext,
    inboundCalToday,
    viewInboundDetail,
    toggleInboundSelectAll,
    openRecycleBinModal,
    handleClickOutside,
    handleDoubleClickInbound,
    quickInboundForItem,
    handleDownloadImportTemplate
  }
}
