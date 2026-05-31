import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_costAnalysis'
const INIT_KEY = 'gj_erp_cost_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

export const useCostStore = defineStore('cost', () => {
  const records = ref(load(STORAGE_KEY, []))

  const statusLabels = { completed: '已完成', approved: '已审批', pending: '待处理', cancelled: '已取消' }
  const statusBadgeMap = { completed: 'success', approved: 'info', pending: 'warning', cancelled: 'neutral' }

  const totalActual = computed(() => records.value.reduce((s, r) => s + (parseFloat(r.actualCost) || 0), 0))
  const totalStandard = computed(() => records.value.reduce((s, r) => s + (parseFloat(r.standardCost) || 0), 0))
  const totalVariance = computed(() => records.value.reduce((s, r) => s + (parseFloat(r.variance) || 0), 0))
  const varianceRate = computed(() => {
    const std = totalStandard.value
    return std > 0 ? (totalVariance.value / std * 100) : 0
  })

  const completedCount = computed(() => records.value.filter(r => r.status === 'completed').length)
  const approvedCount = computed(() => records.value.filter(r => r.status === 'approved').length)
  const pendingCount = computed(() => records.value.filter(r => r.status === 'pending').length)

  function getById(id) {
    return records.value.find(r => r.id === id)
  }

  function addRecord(data) {
    const item = {
      id: data.id || 'ca_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      poNo: data.poNo || '',
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      date: data.date || new Date().toISOString().split('T')[0],
      materialName: data.materialName || '',
      quantity: parseFloat(data.quantity) || 0,
      actualCost: parseFloat(data.actualCost) || 0,
      standardCost: parseFloat(data.standardCost) || 0,
      variance: (parseFloat(data.actualCost) || 0) - (parseFloat(data.standardCost) || 0),
      varianceRate: (parseFloat(data.standardCost) || 0) > 0
        ? Math.round(((parseFloat(data.actualCost) || 0) - (parseFloat(data.standardCost) || 0)) / (parseFloat(data.standardCost) || 1) * 1000) / 10
        : 0,
      status: data.status || 'pending',
      createdAt: data.createdAt || new Date().toISOString()
    }
    records.value.push(item)
    persist(STORAGE_KEY, records.value)
    return item
  }

  function updateRecord(id, updates) {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx === -1) return null
    const item = { ...records.value[idx], ...updates }
    item.variance = (parseFloat(item.actualCost) || 0) - (parseFloat(item.standardCost) || 0)
    item.varianceRate = (parseFloat(item.standardCost) || 0) > 0
      ? Math.round(item.variance / parseFloat(item.standardCost) * 1000) / 10
      : 0
    records.value[idx] = item
    persist(STORAGE_KEY, records.value)
    return item
  }

  function deleteRecord(id) {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    records.value.splice(idx, 1)
    persist(STORAGE_KEY, records.value)
    return true
  }

  function getFilteredRecords(period, supplierId) {
    let data = [...records.value]
    if (supplierId && supplierId !== 'all') {
      data = data.filter(r => r.supplierId === supplierId)
    }
    if (period && period !== 'all') {
      const now = new Date()
      let cutoff
      if (period === 'month') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (period === 'quarter') {
        const qs = Math.floor(now.getMonth() / 3) * 3
        cutoff = new Date(now.getFullYear(), qs, 1)
      } else if (period === 'year') {
        cutoff = new Date(now.getFullYear(), 0, 1)
      }
      if (cutoff) {
        data = data.filter(r => new Date(r.date) >= cutoff)
      }
    }
    return data
  }

  function getMonthlyTrend() {
    const monthly = {}
    for (const r of records.value) {
      if (!r.date) continue
      const ym = r.date.substring(0, 7)
      if (!monthly[ym]) monthly[ym] = { period: ym, actualCost: 0, standardCost: 0, variance: 0, count: 0 }
      monthly[ym].actualCost += parseFloat(r.actualCost) || 0
      monthly[ym].standardCost += parseFloat(r.standardCost) || 0
      monthly[ym].variance += parseFloat(r.variance) || 0
      monthly[ym].count++
    }
    return Object.keys(monthly).sort().map(ym => monthly[ym])
  }

  function getSupplierBreakdown() {
    const bySupplier = {}
    for (const r of records.value) {
      const name = r.supplierName || '未分配'
      if (!bySupplier[name]) bySupplier[name] = { supplierName: name, actualCost: 0, standardCost: 0, variance: 0, count: 0 }
      bySupplier[name].actualCost += parseFloat(r.actualCost) || 0
      bySupplier[name].standardCost += parseFloat(r.standardCost) || 0
      bySupplier[name].variance += parseFloat(r.variance) || 0
      bySupplier[name].count++
    }
    return Object.keys(bySupplier).map(k => bySupplier[k])
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastM = now.getMonth() === 0 ? 12 : now.getMonth()
    const lastMY = now.getMonth() === 0 ? y - 1 : y
    const lm = String(lastM).padStart(2, '0')

    const seeds = [
      { id: 'ca1', poNo: 'PO-2024-0078', supplierId: 's1', supplierName: '江苏钢铁集团有限公司', date: `${y}-${m}-16`, materialName: '不锈钢板304', quantity: 320, actualCost: 38400, standardCost: 36480, variance: 1920, varianceRate: 5.0, status: 'completed' },
      { id: 'ca2', poNo: 'PO-2024-0079', supplierId: 's2', supplierName: '浙江化工原料有限公司', date: `${y}-${m}-14`, materialName: 'ABS树脂', quantity: 500, actualCost: 56000, standardCost: 53200, variance: 2800, varianceRate: 5.0, status: 'approved' },
      { id: 'ca3', poNo: 'PO-2024-0080', supplierId: 's3', supplierName: '广东有色金属有限公司', date: `${y}-${m}-17`, materialName: '铝合金型材6063', quantity: 800, actualCost: 92000, standardCost: 87400, variance: 4600, varianceRate: 5.0, status: 'pending' },
      { id: 'ca4', poNo: 'PO-2024-0081', supplierId: 's1', supplierName: '江苏钢铁集团有限公司', date: `${lastMY}-${lm}-10`, materialName: '碳钢Q235', quantity: 600, actualCost: 27000, standardCost: 25650, variance: 1350, varianceRate: 5.0, status: 'completed' },
      { id: 'ca5', poNo: 'PO-2024-0082', supplierId: 's4', supplierName: '山东机械制造有限公司', date: `${lastMY}-${lm}-25`, materialName: '轴承钢GCr15', quantity: 100, actualCost: 28000, standardCost: 26600, variance: 1400, varianceRate: 5.0, status: 'completed' },
      { id: 'ca6', poNo: 'PO-2024-0083', supplierId: 's3', supplierName: '广东有色金属有限公司', date: `${y}-${m}-02`, materialName: '铜合金H59', quantity: 80, actualCost: 41600, standardCost: 41600, variance: 0, varianceRate: 0, status: 'completed' }
    ]
    records.value = seeds
    persist(STORAGE_KEY, records.value)
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    records, statusLabels, statusBadgeMap,
    totalActual, totalStandard, totalVariance, varianceRate,
    completedCount, approvedCount, pendingCount,
    getById, addRecord, updateRecord, deleteRecord,
    getFilteredRecords, getMonthlyTrend, getSupplierBreakdown,
    initSeedData
  }
})
