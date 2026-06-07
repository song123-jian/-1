import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'

export const useMonthlyStatsStore = defineStore('monthlyStats', () => {
  const selectedYear = ref(new Date().getFullYear())
  const selectedMonth = ref(new Date().getMonth() + 1)
  const selectedWarehouse = ref('')
  const selectedBizType = ref('')
  const quickRange = ref('curr')
  const collapsedSections = ref({})

  function toggleSection(key) {
    collapsedSections.value[key] = !collapsedSections.value[key]
  }

  const inventoryStore = useInventoryStore()

  const dateRange = computed(() => {
    const y = selectedYear.value
    const m = selectedMonth.value
    if (quickRange.value === 'curr') {
      return { from: y + '-' + String(m).padStart(2, '0') + '-01', to: y + '-' + String(m).padStart(2, '0') + '-31' }
    } else if (quickRange.value === 'prev') {
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      return { from: py + '-' + String(pm).padStart(2, '0') + '-01', to: py + '-' + String(pm).padStart(2, '0') + '-31' }
    } else if (quickRange.value === '3m') {
      const d = new Date(y, m - 3, 1)
      return { from: d.toISOString().split('T')[0], to: y + '-' + String(m).padStart(2, '0') + '-31' }
    } else if (quickRange.value === '6m') {
      const d = new Date(y, m - 6, 1)
      return { from: d.toISOString().split('T')[0], to: y + '-' + String(m).padStart(2, '0') + '-31' }
    } else {
      const d = new Date(y - 1, m - 1, 1)
      return { from: d.toISOString().split('T')[0], to: y + '-' + String(m).padStart(2, '0') + '-31' }
    }
  })

  const filteredInbound = computed(() => {
    let list = inventoryStore.inboundOrders
    const range = dateRange.value
    list = list.filter(o => o.date >= range.from && o.date <= range.to)
    if (selectedBizType.value) list = list.filter(o => o.type === selectedBizType.value)
    return list
  })

  const filteredOutbound = computed(() => {
    let list = inventoryStore.outboundOrders
    const range = dateRange.value
    list = list.filter(o => o.date >= range.from && o.date <= range.to)
    if (selectedBizType.value) list = list.filter(o => (o.outType || o.type) === selectedBizType.value)
    return list
  })

  const kpiData = computed(() => {
    const inOrders = filteredInbound.value
    const outOrders = filteredOutbound.value
    const inCount = inOrders.length
    const outCount = outOrders.length
    const inWeight = inOrders.reduce((s, o) => s + (o.totalQuantity || 0), 0)
    const outWeight = outOrders.reduce((s, o) => s + (o.outQty || 0), 0)
    const inAmount = inOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)
    const outAmount = outOrders.reduce((s, o) => s + (o.outAmount || 0), 0)
    const pending = inOrders.filter(o => o.status === 'pending' || o.status === 'pending_review').length + outOrders.filter(o => o.status === 'pending' || o.status === 'pending_review' || o.status === 'approved').length
    const confirmed = inOrders.filter(o => o.status === 'confirmed').length + outOrders.filter(o => o.status === 'confirmed').length
    return { inCount, outCount, inWeight, outWeight, inAmount, outAmount, pending, confirmed }
  })

  const bizSummary = computed(() => {
    const map = {}
    for (const o of filteredInbound.value) {
      const t = o.type || 'other'
      if (!map[t]) map[t] = { type: t, inCount: 0, inWeight: 0, inAmount: 0, outCount: 0, outWeight: 0, outAmount: 0 }
      map[t].inCount++
      map[t].inWeight += (o.totalQuantity || 0)
      map[t].inAmount += (o.totalAmount || 0)
    }
    for (const o of filteredOutbound.value) {
      const t = (o.outType || o.type) || 'other'
      if (!map[t]) map[t] = { type: t, inCount: 0, inWeight: 0, inAmount: 0, outCount: 0, outWeight: 0, outAmount: 0 }
      map[t].outCount++
      map[t].outWeight += (o.outQty || 0)
      map[t].outAmount += (o.outAmount || 0)
    }
    return Object.values(map)
  })

  const categorySummary = computed(() => {
    const map = {}
    for (const item of inventoryStore.enrichedInventory) {
      const cat = item.category || '其他'
      if (!map[cat]) map[cat] = { category: cat, count: 0, stock: 0, value: 0 }
      map[cat].count++
      map[cat].stock += item.stock || 0
      map[cat].value += item.totalValue || 0
    }
    return Object.values(map)
  })

  const dailySummary = computed(() => {
    const map = {}
    for (const o of filteredInbound.value) {
      const d = o.date || ''
      if (!map[d]) map[d] = { date: d, inCount: 0, inWeight: 0, inAmount: 0, outCount: 0, outWeight: 0, outAmount: 0 }
      map[d].inCount++
      map[d].inWeight += (o.totalQuantity || 0)
      map[d].inAmount += (o.totalAmount || 0)
    }
    for (const o of filteredOutbound.value) {
      const d = o.date || ''
      if (!map[d]) map[d] = { date: d, inCount: 0, inWeight: 0, inAmount: 0, outCount: 0, outWeight: 0, outAmount: 0 }
      map[d].outCount++
      map[d].outWeight += (o.outQty || 0)
      map[d].outAmount += (o.outAmount || 0)
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  })

  const topItems = computed(() => {
    const itemMap = {}
    for (const o of filteredInbound.value) {
      const items = JSON.parse(o.items || '[]')
      for (const it of items) {
        const code = it.code || it.name || ''
        if (!code) continue
        if (!itemMap[code]) itemMap[code] = { code, name: it.name || code, inWeight: 0, inAmount: 0, outWeight: 0, outAmount: 0 }
        itemMap[code].inWeight += (it.qty || 0)
        itemMap[code].inAmount += (it.qty || 0) * (it.cost || 0)
      }
    }
    for (const o of filteredOutbound.value) {
      const code = o.materialCode || ''
      if (!code) continue
      if (!itemMap[code]) itemMap[code] = { code, name: o.materialName || code, inWeight: 0, inAmount: 0, outWeight: 0, outAmount: 0 }
      itemMap[code].outWeight += (o.outQty || 0)
      itemMap[code].outAmount += (o.outAmount || 0)
    }
    return Object.values(itemMap).sort((a, b) => (b.inAmount + b.outAmount) - (a.inAmount + a.outAmount)).slice(0, 10)
  })

  const healthData = computed(() => {
    const total = inventoryStore.enrichedInventory.length
    const exhausted = inventoryStore.exhaustedCount
    const low = inventoryStore.lowStockCount
    const over = inventoryStore.overStockCount
    const normal = inventoryStore.normalStockCount
    const healthScore = total > 0 ? Math.round((normal / total) * 100) : 100
    return { total, exhausted, low, over, normal, healthScore }
  })

  function setQuickRange(range) {
    quickRange.value = range
  }

  function refresh() {
    try {
      const invRaw = localStorage.getItem('gj_erp_inventory')
      const ordRaw = localStorage.getItem('gj_erp_warehouseOrders')
      if (invRaw) inventoryStore.replaceData(JSON.parse(invRaw))
      if (ordRaw) {
        const orders = JSON.parse(ordRaw)
        const inboundTypes = ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift']
        const inboundOrders = orders.filter(o => inboundTypes.includes(o.type) && !o.outType && !o.outboundNo)
        const outboundOrders = orders.filter(o => !inboundTypes.includes(o.type) || o.outType || o.outboundNo)
        inventoryStore.replaceInbound(inboundOrders)
        inventoryStore.replaceOutbound(outboundOrders)
      }
    } catch (e) {
      console.warn('[monthlyStats] refresh failed:', e)
    }
  }

  return {
    selectedYear, selectedMonth, selectedWarehouse, selectedBizType, quickRange, collapsedSections,
    dateRange, filteredInbound, filteredOutbound, kpiData, bizSummary, categorySummary, dailySummary, topItems, healthData,
    toggleSection, setQuickRange, refresh
  }
})
