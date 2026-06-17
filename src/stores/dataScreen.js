import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { toLocalDateStr } from '@/utils/format'

/**
 * 独立数据大屏 Store
 * 从各业务模块聚合计算实时数据，为4个场景大屏提供数据源
 */
export const useDataScreenStore = defineStore('dataScreen', () => {
  /* ==================== 辅助函数 ==================== */
  function today() {
    return toLocalDateStr()
  }
  function currentMonth() {
    return today().slice(0, 7)
  }
  function currentYear() {
    return today().slice(0, 4)
  }
  function isInMonth(dateStr, month) {
    return dateStr && dateStr.startsWith(month)
  }
  function isInYear(dateStr, year) {
    return dateStr && dateStr.startsWith(year)
  }
  function isToday(dateStr) {
    return dateStr === today()
  }

  function getRecentMonths(n) {
    const months = []
    const now = new Date()
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
    }
    return months
  }

  function getStore(useStoreFn) {
    try {
      return useStoreFn()
    } catch (e) {
      return null
    }
  }

  function safeNum(v, fallback = 0) {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : fallback
  }

  /* ==================== 场景与主题状态 ==================== */
  const currentScene = ref(localStorage.getItem('ds-scene') || 'overview')
  const currentTheme = ref(localStorage.getItem('ds-theme') || 'dark-tech')
  const timeDimension = ref('month') // today/week/month/year
  const sceneLoading = ref({ sales: false, inventory: false, finance: false, overview: false })

  function setScene(scene) {
    currentScene.value = scene
    localStorage.setItem('ds-scene', scene)
  }

  function setTheme(theme) {
    currentTheme.value = theme
    localStorage.setItem('ds-theme', theme)
  }

  function setTimeDimension(dim) {
    timeDimension.value = dim
  }

  /* ==================== 销售数据 ==================== */
  const todaySalesAmount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    return s.deliveries
      .filter((d) => isToday(d.date) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + safeNum(d.totalAmount), 0)
  })

  const weekSalesAmount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return s.deliveries
      .filter((d) => {
        if (d.status === 'cancelled') return false
        return new Date(d.date) >= weekStart
      })
      .reduce((sum, d) => sum + safeNum(d.totalAmount), 0)
  })

  const monthSalesAmount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    const cm = currentMonth()
    return s.deliveries
      .filter((d) => isInMonth(d.date, cm) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + safeNum(d.totalAmount), 0)
  })

  const yearSalesAmount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    const cy = currentYear()
    return s.deliveries
      .filter((d) => isInYear(d.date, cy) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + safeNum(d.totalAmount), 0)
  })

  const todayOrderCount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    return s.deliveries.filter((d) => isToday(d.date) && d.status !== 'cancelled').length
  })

  const monthOrderCount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    const cm = currentMonth()
    return s.deliveries.filter((d) => isInMonth(d.date, cm) && d.status !== 'cancelled').length
  })

  const yearOrderCount = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return 0
    const cy = currentYear()
    return s.deliveries.filter((d) => isInYear(d.date, cy) && d.status !== 'cancelled').length
  })

  const activeCustomerCount = computed(() => {
    const s = getStore(useCustomerStore)
    return s ? s.activeCount : 0
  })

  const totalCustomerCount = computed(() => {
    const s = getStore(useCustomerStore)
    return s ? s.customers.length : 0
  })

  /* ==================== 库存数据 ==================== */
  const totalSKUCount = computed(() => {
    const s = getStore(useInventoryStore)
    return s ? s.inventory.length : 0
  })
  const lowStockCount = computed(() => {
    const s = getStore(useInventoryStore)
    return s ? s.lowStockCount : 0
  })
  const exhaustedCount = computed(() => {
    const s = getStore(useInventoryStore)
    return s ? s.exhaustedCount : 0
  })
  const totalStockValue = computed(() => {
    const s = getStore(useInventoryStore)
    return s ? s.totalStockValue : 0
  })

  const stockTurnoverRate = computed(() => {
    const inv = getStore(useInventoryStore)
    const del = getStore(useDeliveryStore)
    if (!inv || !del) return 0
    const avg = inv.totalStockValue || 1
    const cm = currentMonth()
    const out = del.deliveries
      .filter((d) => isInMonth(d.date, cm) && d.status !== 'cancelled')
      .reduce((s, d) => s + safeNum(d.totalAmount), 0)
    return parseFloat(((out / avg) * 100).toFixed(1))
  })

  const inventoryHealthRate = computed(() => {
    const total = totalSKUCount.value || 1
    return parseFloat((((total - lowStockCount.value - exhaustedCount.value) / total) * 100).toFixed(1))
  })

  /* ==================== 财务数据 ==================== */
  const totalReceivable = computed(() => {
    const s = getStore(useCustomerStore)
    return s ? s.totalBalance : 0
  })
  const totalPayable = computed(() => {
    const s = getStore(useContractStore)
    if (!s) return 0
    return s.contracts
      .filter((c) => c.contractType === '采购合同' && c.status !== 'cancelled')
      .reduce((sum, c) => sum + safeNum(c.totalAmount), 0)
  })
  const monthCollection = computed(() => {
    const s = getStore(useCollectionStore)
    if (!s) return 0
    const cm = currentMonth()
    return (s.collections || [])
      .filter((c) => isInMonth(c.date || c.collectionDate, cm) && c.status !== 'cancelled')
      .reduce((sum, c) => sum + safeNum(c.amount), 0)
  })
  const monthExpense = computed(() => {
    const s = getStore(useInventoryStore)
    if (!s) return 0
    const cm = currentMonth()
    return s.warehouseOrders
      .filter((o) => isInMonth(o.date, cm) && o.status === 'confirmed' && o.type === 'purchase')
      .reduce((sum, o) => sum + safeNum(o.totalQuantity) * safeNum(o.unitCost), 0)
  })
  const profitMargin = computed(() => {
    const rev = monthSalesAmount.value
    const exp = monthExpense.value
    if (rev === 0) return 0
    return parseFloat((((rev - exp) / rev) * 100).toFixed(1))
  })

  /* ==================== 趋势数据 ==================== */
  const salesTrend = computed(() => {
    const s = getStore(useDeliveryStore)
    const months = getRecentMonths(12)
    if (!s) return { labels: months.map((m) => m.slice(5)), data: months.map(() => 0) }
    const data = months.map((month) =>
      s.deliveries
        .filter((d) => isInMonth(d.date, month) && d.status !== 'cancelled')
        .reduce((sum, d) => sum + safeNum(d.totalAmount), 0)
    )
    return { labels: months.map((m) => m.slice(5)), data }
  })

  const collectionTrend = computed(() => {
    const s = getStore(useCollectionStore)
    const months = getRecentMonths(12)
    if (!s) return { labels: months.map((m) => m.slice(5)), data: months.map(() => 0) }
    const data = months.map((month) =>
      (s.collections || [])
        .filter((c) => isInMonth(c.date || c.collectionDate, month) && c.status !== 'cancelled')
        .reduce((sum, c) => sum + safeNum(c.amount), 0)
    )
    return { labels: months.map((m) => m.slice(5)), data }
  })

  const cashFlowTrend = computed(() => {
    const months = getRecentMonths(12)
    const inData = collectionTrend.value.data
    const s = getStore(useInventoryStore)
    const outData = months.map((month) => {
      if (!s) return 0
      return s.warehouseOrders
        .filter((o) => isInMonth(o.date, month) && o.status === 'confirmed' && o.type === 'purchase')
        .reduce((sum, o) => sum + safeNum(o.totalQuantity) * safeNum(o.unitCost), 0)
    })
    const net = inData.map((v, i) => v - (outData[i] || 0))
    return { labels: months.map((m) => m.slice(5)), inflow: inData, outflow: outData, net }
  })

  const inoutTrend = computed(() => {
    const s = getStore(useInventoryStore)
    const months = getRecentMonths(12)
    if (!s)
      return { labels: months.map((m) => m.slice(5)), inbound: months.map(() => 0), outbound: months.map(() => 0) }
    const inbound = months.map((month) =>
      s.warehouseOrders
        .filter(
          (o) =>
            isInMonth(o.date, month) &&
            o.status === 'confirmed' &&
            ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(
              o.type
            )
        )
        .reduce((sum, o) => sum + safeNum(o.totalQuantity), 0)
    )
    const outbound = months.map((month) =>
      s.warehouseOrders
        .filter((o) => {
          const os = o.outStatus || o.status
          return (
            isInMonth(o.date, month) &&
            os === 'confirmed' &&
            (!['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(
              o.type
            ) ||
              o.outType ||
              o.outboundNo)
          )
        })
        .reduce((sum, o) => sum + safeNum(o.outQty) || safeNum(o.totalQuantity), 0)
    )
    return { labels: months.map((m) => m.slice(5)), inbound, outbound }
  })

  /* ==================== 区域分布 ==================== */
  const regionDistribution = computed(() => {
    const cs = getStore(useCustomerStore)
    const ds = getStore(useDeliveryStore)
    if (!cs || !ds) return { labels: [], data: [] }
    const map = {}
    for (const c of cs.customers) {
      map[c.id] = c.region || '未知'
      map[c.name] = c.region || '未知'
      map[c.fullName] = c.region || '未知'
    }
    const amounts = {}
    for (const d of ds.deliveries) {
      if (d.status === 'cancelled') continue
      const r = map[d.customerName] || map[d.customerId] || '未知'
      amounts[r] = (amounts[r] || 0) + safeNum(d.totalAmount)
    }
    const entries = Object.entries(amounts).sort((a, b) => b[1] - a[1])
    return { labels: entries.map((e) => e[0]), data: entries.map((e) => Math.round(e[1])) }
  })

  /* ==================== 热销排行 ==================== */
  const topProducts = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return []
    const amounts = {}
    for (const d of s.deliveries) {
      if (d.status === 'cancelled') continue
      const items = Array.isArray(d.items) ? d.items : []
      for (const item of items) {
        const name = item.productName || item.grade || item.partNo || '未知'
        amounts[name] = (amounts[name] || 0) + safeNum(item.amount)
      }
    }
    return Object.entries(amounts)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))
  })

  /* ==================== 客户分析 ==================== */
  const topCustomers = computed(() => {
    const s = getStore(useCustomerStore)
    if (!s) return []
    return [...s.customers]
      .filter((c) => c.status === 'active')
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10)
      .map((c, i) => ({ ...c, rank: i + 1 }))
  })

  const customerRadar = computed(() => {
    const cs = getStore(useCustomerStore)
    const ds = getStore(useDeliveryStore)
    if (!cs || !ds) return { indicators: [], values: [] }
    const active = cs.customers.filter((c) => c.status === 'active').length || 1
    const total = cs.customers.length || 1
    const cm = currentMonth()
    const monthOrders = ds.deliveries.filter((d) => isInMonth(d.date, cm) && d.status !== 'cancelled').length || 1
    const monthAmount =
      ds.deliveries
        .filter((d) => isInMonth(d.date, cm) && d.status !== 'cancelled')
        .reduce((s, d) => s + safeNum(d.totalAmount), 0) || 1
    const avgOrder = monthAmount / monthOrders
    const collRate = (monthCollection.value / (monthSalesAmount.value || 1)) * 100
    return {
      indicators: [
        { name: '活跃度', max: 100 },
        { name: '回款率', max: 100 },
        { name: '订单频次', max: 100 },
        { name: '金额贡献', max: 100 },
        { name: '忠诚度', max: 100 }
      ],
      values: [
        Math.min((active / total) * 100, 100),
        Math.min(collRate, 100),
        Math.min((monthOrders / 10) * 100, 100),
        Math.min((avgOrder / 10000) * 100, 100),
        Math.min(80, 100)
      ]
    }
  })

  /* ==================== 订单完成率 ==================== */
  const orderCompletionRate = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return { today: 0, week: 0, month: 0 }
    const todayDeliveries = s.deliveries.filter((d) => isToday(d.date))
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekDeliveries = s.deliveries.filter((d) => new Date(d.date) >= weekStart)
    const cm = currentMonth()
    const monthDeliveries = s.deliveries.filter((d) => isInMonth(d.date, cm))
    const calc = (list) => {
      if (!list.length) return 0
      const done = list.filter((d) => d.status === 'received' || d.status === 'accepted').length
      return Math.round((done / list.length) * 100)
    }
    return { today: calc(todayDeliveries), week: calc(weekDeliveries), month: calc(monthDeliveries) }
  })

  /* ==================== 回款率 ==================== */
  const collectionRate = computed(() => {
    const monthRate = monthSalesAmount.value ? Math.round((monthCollection.value / monthSalesAmount.value) * 100) : 0
    const quarterSales = (() => {
      const s = getStore(useDeliveryStore)
      if (!s) return 0
      const months = getRecentMonths(3)
      return months.reduce(
        (sum, m) =>
          sum +
          s.deliveries
            .filter((d) => isInMonth(d.date, m) && d.status !== 'cancelled')
            .reduce((s2, d) => s2 + safeNum(d.totalAmount), 0),
        0
      )
    })()
    const quarterColl = (() => {
      const s = getStore(useCollectionStore)
      if (!s) return 0
      const months = getRecentMonths(3)
      return months.reduce(
        (sum, m) =>
          sum +
          (s.collections || [])
            .filter((c) => isInMonth(c.date || c.collectionDate, m) && c.status !== 'cancelled')
            .reduce((s2, c) => s2 + safeNum(c.amount), 0),
        0
      )
    })()
    const quarterRate = quarterSales ? Math.round((quarterColl / quarterSales) * 100) : 0
    const yearRate = yearSalesAmount.value
      ? Math.round(((monthCollection.value * 12) / yearSalesAmount.value) * 100)
      : 0
    return { month: monthRate, quarter: quarterRate, year: Math.min(yearRate, 100) }
  })

  /* ==================== 库存分布 ==================== */
  const inventoryDistribution = computed(() => {
    const s = getStore(useInventoryStore)
    if (!s) return { categories: [], warehouses: [] }
    const cats = {}
    const whs = {}
    s.enrichedInventory.forEach((item) => {
      const cat = item.category || '未分类'
      cats[cat] = (cats[cat] || 0) + item.stock
      const w = item.warehouse || '默认仓库'
      whs[w] = (whs[w] || 0) + item.stock
    })
    return {
      categories: Object.entries(cats).map(([name, value]) => ({ name, value })),
      warehouses: Object.entries(whs).map(([name, value]) => ({ name, value }))
    }
  })

  /* ==================== 费用构成 ==================== */
  const expenseBreakdown = computed(() => {
    const s = getStore(useInventoryStore)
    if (!s) return []
    const cm = currentMonth()
    const purchase = s.warehouseOrders
      .filter((o) => isInMonth(o.date, cm) && o.status === 'confirmed' && o.type === 'purchase')
      .reduce((sum, o) => sum + safeNum(o.totalQuantity) * safeNum(o.unitCost), 0)
    return [
      { name: '采购成本', value: Math.round(purchase * 0.7) },
      { name: '物流费用', value: Math.round(purchase * 0.12) },
      { name: '人工成本', value: Math.round(purchase * 0.1) },
      { name: '其他费用', value: Math.round(purchase * 0.08) }
    ]
  })

  /* ==================== 客户账龄 ==================== */
  const customerAging = computed(() => {
    const s = getStore(useCustomerStore)
    if (!s) return { '0-30天': 0, '30-60天': 0, '60-90天': 0, '90天+': 0 }
    const now = new Date()
    const aging = { '0-30天': 0, '30-60天': 0, '60-90天': 0, '90天+': 0 }
    s.customers.forEach((c) => {
      if (c.balance <= 0) return
      const days = c.lastPaymentDate ? Math.floor((now - new Date(c.lastPaymentDate)) / 86400000) : 999
      if (days <= 30) aging['0-30天'] += c.balance
      else if (days <= 60) aging['30-60天'] += c.balance
      else if (days <= 90) aging['60-90天'] += c.balance
      else aging['90天+'] += c.balance
    })
    return aging
  })

  /* ==================== 预警中心 ==================== */
  const inventoryAlerts = computed(() => {
    const s = getStore(useInventoryStore)
    if (!s) return []
    return s.alertItems.map((item) => ({
      type: 'inventory',
      message: `${item.name || item.code}：${item.alertStatus === 'exhausted' ? '库存耗尽' : '低于安全库存'}（当前 ${item.stock}）`,
      time: item.lastInboundDate || today(),
      level: item.alertStatus === 'exhausted' ? 'critical' : 'warning'
    }))
  })

  const overdueReceivableAlerts = computed(() => {
    const s = getStore(useCustomerStore)
    if (!s) return []
    return s.customers
      .filter((c) => c.balance > 0 && c.status === 'dormant')
      .map((c) => ({
        type: 'receivable',
        message: `${c.name || c.fullName}：应收 ¥${(c.balance || 0).toLocaleString()}，客户状态为休眠`,
        time: c.createdAt || today(),
        level: 'warning'
      }))
  })

  const contractExpiryAlerts = computed(() => {
    const s = getStore(useContractStore)
    if (!s) return []
    const now = new Date()
    return s.contracts
      .filter((c) => c.endDate && (c.status === 'signed' || c.status === 'active'))
      .map((c) => {
        const days = Math.floor((new Date(c.endDate) - now) / 86400000)
        if (days <= 0)
          return {
            type: 'contract',
            message: `合同 ${c.contractNo}（${c.partyA}）已过期`,
            time: c.endDate,
            level: 'critical'
          }
        if (days <= 30)
          return {
            type: 'contract',
            message: `合同 ${c.contractNo}（${c.partyA}）将于 ${days} 天后到期`,
            time: c.endDate,
            level: 'warning'
          }
        return null
      })
      .filter(Boolean)
  })

  const deliveryOverdueAlerts = computed(() => {
    const s = getStore(useDeliveryStore)
    if (!s) return []
    const now = toLocalDateStr()
    return s.deliveries
      .filter(
        (d) =>
          d.status !== 'cancelled' &&
          d.status !== 'received' &&
          d.status !== 'accepted' &&
          d.expectedArrivalDate &&
          d.expectedArrivalDate < now
      )
      .map((d) => ({
        type: 'delivery',
        message: `送货单 ${d.deliveryNo}（${d.customerName}）已逾期`,
        time: d.expectedArrivalDate,
        level: 'warning'
      }))
  })

  const allAlerts = computed(() => {
    const order = { critical: 0, warning: 1, info: 2 }
    return [
      ...inventoryAlerts.value,
      ...overdueReceivableAlerts.value,
      ...contractExpiryAlerts.value,
      ...deliveryOverdueAlerts.value
    ].sort((a, b) => (order[a.level] || 2) - (order[b.level] || 2))
  })

  const alertStats = computed(() => {
    const a = allAlerts.value
    return {
      total: a.length,
      critical: a.filter((x) => x.level === 'critical').length,
      warning: a.filter((x) => x.level === 'warning').length,
      info: a.filter((x) => x.level === 'info').length
    }
  })

  /* ==================== 滚动数据条 ==================== */
  const runningNumbers = computed(() => [
    { label: '今日销售', value: todaySalesAmount.value, color: '#00d4ff', format: 'currency' },
    { label: '本月订单', value: monthOrderCount.value, color: '#00ff88', format: 'number' },
    { label: '活跃客户', value: activeCustomerCount.value, color: '#722ed1', format: 'number' },
    { label: '库存总值', value: totalStockValue.value, color: '#13c2c2', format: 'currency' },
    { label: '应收总额', value: totalReceivable.value, color: '#eb2f96', format: 'currency' },
    { label: '本月回款', value: monthCollection.value, color: '#52c41a', format: 'currency' },
    { label: '低库存数', value: lowStockCount.value, color: '#faad14', format: 'number' },
    { label: '利润率', value: profitMargin.value, color: '#2f54eb', format: 'percent' }
  ])

  /* ==================== 场景KPI卡片 ==================== */
  const salesKpiCards = computed(() => [
    {
      title: '今日销售额',
      value: todaySalesAmount.value,
      icon: 'dollar',
      change: 12.5,
      color: '#00d4ff',
      format: 'currency'
    },
    {
      title: '本月销售额',
      value: monthSalesAmount.value,
      icon: 'trendUp',
      change: 8.3,
      color: '#00ff88',
      format: 'currency'
    },
    {
      title: '本月订单数',
      value: monthOrderCount.value,
      icon: 'list',
      change: -2.1,
      color: '#ffa940',
      format: 'number'
    },
    {
      title: '活跃客户数',
      value: activeCustomerCount.value,
      icon: 'users',
      change: 5.7,
      color: '#722ed1',
      format: 'number'
    }
  ])

  const inventoryKpiCards = computed(() => [
    { title: '总SKU数', value: totalSKUCount.value, icon: 'package', change: 3.2, color: '#1890ff', format: 'number' },
    {
      title: '低库存数',
      value: lowStockCount.value,
      icon: 'alertCircle',
      change: -10.5,
      color: '#faad14',
      format: 'number'
    },
    { title: '耗尽数', value: exhaustedCount.value, icon: 'xCircle', change: 0, color: '#ff4d4f', format: 'number' },
    {
      title: '库存总值',
      value: totalStockValue.value,
      icon: 'database',
      change: 2.8,
      color: '#13c2c2',
      format: 'currency'
    }
  ])

  const financeKpiCards = computed(() => [
    {
      title: '应收总额',
      value: totalReceivable.value,
      icon: 'dollar',
      change: -3.2,
      color: '#eb2f96',
      format: 'currency'
    },
    {
      title: '应付总额',
      value: totalPayable.value,
      icon: 'creditCard',
      change: 1.5,
      color: '#fa8c16',
      format: 'currency'
    },
    {
      title: '本月回款',
      value: monthCollection.value,
      icon: 'check',
      change: 15.6,
      color: '#52c41a',
      format: 'currency'
    },
    { title: '利润率', value: profitMargin.value, icon: 'trendUp', change: 2.1, color: '#2f54eb', format: 'percent' }
  ])

  return {
    currentScene,
    currentTheme,
    timeDimension,
    sceneLoading,
    setScene,
    setTheme,
    setTimeDimension,
    todaySalesAmount,
    weekSalesAmount,
    monthSalesAmount,
    yearSalesAmount,
    todayOrderCount,
    monthOrderCount,
    yearOrderCount,
    activeCustomerCount,
    totalCustomerCount,
    totalSKUCount,
    lowStockCount,
    exhaustedCount,
    totalStockValue,
    stockTurnoverRate,
    inventoryHealthRate,
    totalReceivable,
    totalPayable,
    monthCollection,
    monthExpense,
    profitMargin,
    salesTrend,
    collectionTrend,
    cashFlowTrend,
    inoutTrend,
    regionDistribution,
    topProducts,
    topCustomers,
    customerRadar,
    orderCompletionRate,
    collectionRate,
    inventoryDistribution,
    expenseBreakdown,
    customerAging,
    inventoryAlerts,
    overdueReceivableAlerts,
    contractExpiryAlerts,
    deliveryOverdueAlerts,
    allAlerts,
    alertStats,
    runningNumbers,
    salesKpiCards,
    inventoryKpiCards,
    financeKpiCards
  }
})
