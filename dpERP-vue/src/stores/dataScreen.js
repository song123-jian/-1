import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { useQuotationStore } from './quotation'
import { useContractStore } from './contract'
import { useCustomerStore } from './customer'
import { useDeliveryStore } from './delivery'
import { useCollectionStore } from './collection'

/**
 * 数据大屏 Store
 * 从各业务模块 Store 聚合计算实时数据，为数据大屏/BI看板提供数据源
 */
export const useDataScreenStore = defineStore('dataScreen', () => {
  /* ==================== 辅助函数 ==================== */

  /** 获取当前日期字符串 YYYY-MM-DD */
  function today() {
    return new Date().toISOString().split('T')[0]
  }

  /** 获取当前年月 YYYY-MM */
  function currentMonth() {
    return today().slice(0, 7)
  }

  /** 获取当前年份 YYYY */
  function currentYear() {
    return today().slice(0, 4)
  }

  /** 判断日期是否在指定月份内 */
  function isInMonth(dateStr, month) {
    return dateStr && dateStr.startsWith(month)
  }

  /** 判断日期是否在指定年份内 */
  function isInYear(dateStr, year) {
    return dateStr && dateStr.startsWith(year)
  }

  /** 判断日期是否为今天 */
  function isToday(dateStr) {
    return dateStr === today()
  }

  /** 获取近N个月的月份标签列表 */
  function getRecentMonths(n) {
    const months = []
    const now = new Date()
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      months.push(label)
    }
    return months
  }

  /** 安全获取Store实例（避免循环依赖） */
  function getStore(useStoreFn) {
    try {
      return useStoreFn()
    } catch (e) {
      return null
    }
  }

  /* ==================== 销售数据 ==================== */

  /** 今日销售额 */
  const todaySalesAmount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    return deliveryStore.deliveries
      .filter(d => isToday(d.date) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
  })

  /** 今日订单数 */
  const todayOrderCount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    return deliveryStore.deliveries.filter(d => isToday(d.date) && d.status !== 'cancelled').length
  })

  /** 本周销售额 */
  const weekSalesAmount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return deliveryStore.deliveries
      .filter(d => {
        if (d.status === 'cancelled') return false
        const dd = new Date(d.date)
        return dd >= weekStart
      })
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
  })

  /** 本月销售额 */
  const monthSalesAmount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    const cm = currentMonth()
    return deliveryStore.deliveries
      .filter(d => isInMonth(d.date, cm) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
  })

  /** 本月订单数 */
  const monthOrderCount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    const cm = currentMonth()
    return deliveryStore.deliveries.filter(d => isInMonth(d.date, cm) && d.status !== 'cancelled').length
  })

  /** 本年销售额 */
  const yearSalesAmount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    const cy = currentYear()
    return deliveryStore.deliveries
      .filter(d => isInYear(d.date, cy) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
  })

  /** 本年订单数 */
  const yearOrderCount = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return 0
    const cy = currentYear()
    return deliveryStore.deliveries.filter(d => isInYear(d.date, cy) && d.status !== 'cancelled').length
  })

  /** 客户总数 */
  const totalCustomerCount = computed(() => {
    const customerStore = getStore(useCustomerStore)
    if (!customerStore) return 0
    return customerStore.customers.length
  })

  /** 活跃客户数 */
  const activeCustomerCount = computed(() => {
    const customerStore = getStore(useCustomerStore)
    if (!customerStore) return 0
    return customerStore.activeCount
  })

  /* ==================== 库存概览 ==================== */

  /** 总SKU数 */
  const totalSKUCount = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return 0
    return inventoryStore.inventory.length
  })

  /** 低库存数 */
  const lowStockCount = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return 0
    return inventoryStore.lowStockCount
  })

  /** 耗尽数 */
  const exhaustedCount = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return 0
    return inventoryStore.exhaustedCount
  })

  /** 库存总值 */
  const totalStockValue = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return 0
    return inventoryStore.totalStockValue
  })

  /** 库存周转率（简化计算：月出库金额/平均库存价值） */
  const stockTurnoverRate = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    const deliveryStore = getStore(useDeliveryStore)
    if (!inventoryStore || !deliveryStore) return 0
    const avgStockValue = inventoryStore.totalStockValue || 1
    const cm = currentMonth()
    const monthOutboundAmount = deliveryStore.deliveries
      .filter(d => isInMonth(d.date, cm) && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
    return parseFloat((monthOutboundAmount / avgStockValue * 100).toFixed(1))
  })

  /* ==================== 财务概览 ==================== */

  /** 应收总额 */
  const totalReceivable = computed(() => {
    const customerStore = getStore(useCustomerStore)
    if (!customerStore) return 0
    return customerStore.totalBalance
  })

  /** 应付总额 */
  const totalPayable = computed(() => {
    const contractStore = getStore(useContractStore)
    if (!contractStore) return 0
    // 采购合同的金额视为应付
    return contractStore.contracts
      .filter(c => c.contractType === '采购合同' && c.status !== 'cancelled')
      .reduce((sum, c) => sum + (c.totalAmount || 0), 0)
  })

  /** 本月回款 */
  const monthCollection = computed(() => {
    const collectionStore = getStore(useCollectionStore)
    if (!collectionStore) return 0
    const cm = currentMonth()
    return (collectionStore.collections || [])
      .filter(c => isInMonth(c.date || c.collectionDate, cm) && c.status !== 'cancelled')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
  })

  /** 本月支出 */
  const monthExpense = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return 0
    const cm = currentMonth()
    // 已确认的采购入库单金额视为支出
    return inventoryStore.warehouseOrders
      .filter(o => isInMonth(o.date, cm) && o.status === 'confirmed' && o.type === 'purchase')
      .reduce((sum, o) => sum + (parseFloat(o.totalQuantity || 0) * parseFloat(o.unitCost || 0) || 0), 0)
  })

  /** 利润率 */
  const profitMargin = computed(() => {
    const revenue = monthSalesAmount.value
    const expense = monthExpense.value
    if (revenue === 0) return 0
    return parseFloat(((revenue - expense) / revenue * 100).toFixed(1))
  })

  /* ==================== 趋势数据 ==================== */

  /** 近12个月销售趋势 */
  const salesTrend = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    const months = getRecentMonths(12)
    if (!deliveryStore) {
      return { labels: months.map(m => m.slice(5)), data: months.map(() => 0) }
    }
    const data = months.map(month => {
      return deliveryStore.deliveries
        .filter(d => isInMonth(d.date, month) && d.status !== 'cancelled')
        .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0)
    })
    return { labels: months.map(m => m.slice(5)), data }
  })

  /** 近12个月入库出库趋势 */
  const inoutTrend = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    const months = getRecentMonths(12)
    if (!inventoryStore) {
      return {
        labels: months.map(m => m.slice(5)),
        inbound: months.map(() => 0),
        outbound: months.map(() => 0)
      }
    }
    const inbound = months.map(month => {
      return inventoryStore.warehouseOrders
        .filter(o => isInMonth(o.date, month) && o.status === 'confirmed' &&
          ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(o.type))
        .reduce((sum, o) => sum + (parseFloat(o.totalQuantity) || 0), 0)
    })
    const outbound = months.map(month => {
      return inventoryStore.warehouseOrders
        .filter(o => {
          const oStatus = o.outStatus || o.status
          return isInMonth(o.date, month) && oStatus === 'confirmed' &&
            (!['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(o.type) || o.outType || o.outboundNo)
        })
        .reduce((sum, o) => sum + (parseFloat(o.outQty) || parseFloat(o.totalQuantity) || 0), 0)
    })
    return { labels: months.map(m => m.slice(5)), inbound, outbound }
  })

  /* ==================== 区域分布 ==================== */

  /** 按客户区域统计销售额 */
  const regionDistribution = computed(() => {
    const customerStore = getStore(useCustomerStore)
    const deliveryStore = getStore(useDeliveryStore)
    if (!customerStore || !deliveryStore) {
      return { labels: [], data: [] }
    }
    // 建立客户ID -> 区域的映射
    const customerRegionMap = {}
    for (const c of customerStore.customers) {
      customerRegionMap[c.id] = c.region || '未知'
      customerRegionMap[c.name] = c.region || '未知'
      customerRegionMap[c.fullName] = c.region || '未知'
    }
    // 按区域汇总销售额
    const regionAmounts = {}
    for (const d of deliveryStore.deliveries) {
      if (d.status === 'cancelled') continue
      const region = customerRegionMap[d.customerName] || customerRegionMap[d.customerId] || '未知'
      regionAmounts[region] = (regionAmounts[region] || 0) + (parseFloat(d.totalAmount) || 0)
    }
    const entries = Object.entries(regionAmounts).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map(e => e[0]),
      data: entries.map(e => Math.round(e[1]))
    }
  })

  /* ==================== 热销排行 ==================== */

  /** Top10物料/产品排行 */
  const topProducts = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return []
    const productAmounts = {}
    for (const d of deliveryStore.deliveries) {
      if (d.status === 'cancelled') continue
      const items = Array.isArray(d.items) ? d.items : []
      for (const item of items) {
        const name = item.productName || item.grade || item.partNo || '未知'
        productAmounts[name] = (productAmounts[name] || 0) + (parseFloat(item.amount) || 0)
      }
    }
    return Object.entries(productAmounts)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))
  })

  /* ==================== 预警中心 ==================== */

  /** 库存预警列表 */
  const inventoryAlerts = computed(() => {
    const inventoryStore = getStore(useInventoryStore)
    if (!inventoryStore) return []
    return inventoryStore.alertItems.map(item => ({
      type: 'inventory',
      message: `${item.name || item.code}：${item.alertStatus === 'exhausted' ? '库存耗尽' : '低于安全库存'}（当前 ${item.stock}）`,
      time: item.lastInboundDate || today(),
      level: item.alertStatus === 'exhausted' ? 'critical' : 'warning'
    }))
  })

  /** 逾期应收预警 */
  const overdueReceivableAlerts = computed(() => {
    const customerStore = getStore(useCustomerStore)
    if (!customerStore) return []
    const alerts = []
    for (const c of customerStore.customers) {
      if (c.balance > 0 && c.status === 'dormant') {
        alerts.push({
          type: 'receivable',
          message: `${c.name || c.fullName}：应收 ¥${(c.balance || 0).toLocaleString()}，客户状态为休眠`,
          time: c.createdAt || today(),
          level: 'warning'
        })
      }
    }
    return alerts
  })

  /** 合同到期预警 */
  const contractExpiryAlerts = computed(() => {
    const contractStore = getStore(useContractStore)
    if (!contractStore) return []
    const now = new Date()
    const alerts = []
    for (const c of contractStore.contracts) {
      if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) continue
      const days = Math.floor((new Date(c.endDate) - now) / 86400000)
      if (days <= 0) {
        alerts.push({
          type: 'contract',
          message: `合同 ${c.contractNo}（${c.partyA}）已过期`,
          time: c.endDate,
          level: 'critical'
        })
      } else if (days <= 30) {
        alerts.push({
          type: 'contract',
          message: `合同 ${c.contractNo}（${c.partyA}）将于 ${days} 天后到期`,
          time: c.endDate,
          level: 'warning'
        })
      }
    }
    return alerts
  })

  /** 报价过期预警 */
  const quotationExpiryAlerts = computed(() => {
    const quotationStore = getStore(useQuotationStore)
    if (!quotationStore) return []
    const now = new Date()
    const alerts = []
    for (const q of quotationStore.quotations) {
      if (!q.expiryDate || q.status === 'expired' || q.status === 'rejected' || q.status === 'cancelled') continue
      const days = Math.floor((new Date(q.expiryDate) - now) / 86400000)
      if (days <= 0) {
        alerts.push({
          type: 'quotation',
          message: `报价 ${q.quoteNo}（${q.customerName}）已过期`,
          time: q.expiryDate,
          level: 'critical'
        })
      } else if (days <= 7) {
        alerts.push({
          type: 'quotation',
          message: `报价 ${q.quoteNo}（${q.customerName}）将于 ${days} 天后过期`,
          time: q.expiryDate,
          level: 'info'
        })
      }
    }
    return alerts
  })

  /** 送货逾期预警 */
  const deliveryOverdueAlerts = computed(() => {
    const deliveryStore = getStore(useDeliveryStore)
    if (!deliveryStore) return []
    const now = new Date().toISOString().split('T')[0]
    const alerts = []
    for (const d of deliveryStore.deliveries) {
      if (d.status === 'cancelled' || d.status === 'received' || d.status === 'accepted') continue
      if (d.expectedArrivalDate && d.expectedArrivalDate < now) {
        alerts.push({
          type: 'delivery',
          message: `送货单 ${d.deliveryNo}（${d.customerName}）已逾期`,
          time: d.expectedArrivalDate,
          level: 'warning'
        })
      }
    }
    return alerts
  })

  /** 所有预警汇总（按级别排序：critical > warning > info） */
  const allAlerts = computed(() => {
    const levelOrder = { critical: 0, warning: 1, info: 2 }
    return [
      ...inventoryAlerts.value,
      ...overdueReceivableAlerts.value,
      ...contractExpiryAlerts.value,
      ...quotationExpiryAlerts.value,
      ...deliveryOverdueAlerts.value
    ].sort((a, b) => (levelOrder[a.level] || 2) - (levelOrder[b.level] || 2))
  })

  /** 预警统计 */
  const alertStats = computed(() => {
    const alerts = allAlerts.value
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length
    }
  })

  /* ==================== 汇总统计卡片数据 ==================== */

  /** 销售概览卡片 */
  const salesCards = computed(() => [
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

  /** 库存概览卡片 */
  const inventoryCards = computed(() => [
    {
      title: '总SKU数',
      value: totalSKUCount.value,
      icon: 'package',
      change: 3.2,
      color: '#1890ff',
      format: 'number'
    },
    {
      title: '低库存数',
      value: lowStockCount.value,
      icon: 'alertCircle',
      change: -10.5,
      color: '#faad14',
      format: 'number'
    },
    {
      title: '耗尽数',
      value: exhaustedCount.value,
      icon: 'xCircle',
      change: 0,
      color: '#ff4d4f',
      format: 'number'
    },
    {
      title: '库存总值',
      value: totalStockValue.value,
      icon: 'database',
      change: 2.8,
      color: '#13c2c2',
      format: 'currency'
    }
  ])

  /** 财务概览卡片 */
  const financeCards = computed(() => [
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
    {
      title: '利润率',
      value: profitMargin.value,
      icon: 'trendUp',
      change: 2.1,
      color: '#2f54eb',
      format: 'percent'
    }
  ])

  return {
    // 销售数据
    todaySalesAmount,
    todayOrderCount,
    weekSalesAmount,
    monthSalesAmount,
    monthOrderCount,
    yearSalesAmount,
    yearOrderCount,
    totalCustomerCount,
    activeCustomerCount,
    // 库存概览
    totalSKUCount,
    lowStockCount,
    exhaustedCount,
    totalStockValue,
    stockTurnoverRate,
    // 财务概览
    totalReceivable,
    totalPayable,
    monthCollection,
    monthExpense,
    profitMargin,
    // 趋势数据
    salesTrend,
    inoutTrend,
    // 区域分布
    regionDistribution,
    // 热销排行
    topProducts,
    // 预警中心
    inventoryAlerts,
    overdueReceivableAlerts,
    contractExpiryAlerts,
    quotationExpiryAlerts,
    deliveryOverdueAlerts,
    allAlerts,
    alertStats,
    // 卡片数据
    salesCards,
    inventoryCards,
    financeCards
  }
})
