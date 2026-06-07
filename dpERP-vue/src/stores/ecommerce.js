import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { generateId } from '@/utils/uid'

const STORAGE_PREFIX = 'gj_erp_'
const ECOMMERCE_KEY = STORAGE_PREFIX + 'ecommerce'
const SYNC_LOG_KEY = STORAGE_PREFIX + 'ecommerceSyncLogs'
const SYNC_SETTINGS_KEY = STORAGE_PREFIX + 'ecommerceSyncSettings'
const PRODUCT_MAPPING_KEY = STORAGE_PREFIX + 'ecommerceProductMappings'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[ecommerceStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[ecommerceStore] save failed:', key, e)
  }
}

/* 默认平台配置 */
const DEFAULT_PLATFORMS = [
  { id: 'taobao', name: '淘宝', icon: '淘', color: '#FF5000', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.taobao.com/authorize' },
  { id: 'jd', name: '京东', icon: '京', color: '#E4393C', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.jd.com/authorize' },
  { id: 'pdd', name: '拼多多', icon: '拼', color: '#E02E24', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.pinduoduo.com/authorize' },
  { id: 'douyin', name: '抖音', icon: '抖', color: '#000000', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.douyin.com/authorize' },
  { id: 'kuaishou', name: '快手', icon: '快', color: '#FF4906', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.kuaishou.com/authorize' },
  { id: 'amazon', name: '亚马逊', icon: '亚', color: '#FF9900', status: 'disconnected', lastSyncTime: null, syncCount: 0, authUrl: 'https://oauth.amazon.com/authorize' }
]

const DEFAULT_SYNC_SETTINGS = {
  autoSync: true,
  syncInterval: 30,
  syncOrders: true,
  syncInventory: true,
  syncProducts: false
}

/* 模拟商品名称数据 */
const MOCK_PRODUCT_NAMES = [
  'ABS树脂通用级', '不锈钢板304 2B', '铝合金型材6063-T5', 'POM塑料M90-44',
  '尼龙66自然色', '轴承钢GCr15', '碳钢Q235热轧板', '铜合金H59',
  'PE塑料5000S', 'PP塑料T30S', '硅胶密封圈', '不锈钢法兰DN50'
]

export const useEcommerceStore = defineStore('ecommerce', () => {
  const platforms = ref(load(ECOMMERCE_KEY, DEFAULT_PLATFORMS))
  const syncLogs = ref(load(SYNC_LOG_KEY, []))
  const syncSettings = ref(load(SYNC_SETTINGS_KEY, DEFAULT_SYNC_SETTINGS))
  const productMappings = ref(load(PRODUCT_MAPPING_KEY, []))

  /* 连接中的平台ID集合 */
  const connectingPlatforms = ref(new Set())
  /* 同步中的平台ID集合 */
  const syncingPlatforms = ref(new Set())

  const connectedPlatforms = computed(() =>
    platforms.value.filter(p => p.status === 'connected')
  )

  const connectedCount = computed(() =>
    platforms.value.filter(p => p.status === 'connected').length
  )

  const todaySyncCount = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return syncLogs.value.filter(log => {
      const logDate = log.startTime ? log.startTime.split('T')[0] : ''
      return logDate === today && log.status === 'success'
    }).length
  })

  const failedSyncCount = computed(() =>
    syncLogs.value.filter(log => log.status === 'failed').length
  )

  const totalMappingCount = computed(() => productMappings.value.length)

  function persistPlatforms() {
    save(ECOMMERCE_KEY, platforms.value)
  }

  function persistSyncLogs() {
    save(SYNC_LOG_KEY, syncLogs.value)
  }

  function persistSyncSettings() {
    save(SYNC_SETTINGS_KEY, syncSettings.value)
  }

  function persistProductMappings() {
    save(PRODUCT_MAPPING_KEY, productMappings.value)
  }

  /** 清理30天前的同步日志 */
  function cleanupExpiredLogs() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    syncLogs.value = syncLogs.value.filter(l => {
      const ts = l.createdAt || l.startTime
      return ts && new Date(ts).getTime() > thirtyDaysAgo
    })
  }

  /**
   * 模拟连接平台
   * 生成授权URL，3秒后模拟连接成功
   */
  function connectPlatform(platformId) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform) return
    if (platform.status === 'connected') return

    connectingPlatforms.value.add(platformId)
    platform.status = 'disconnected' // 保持断开状态直到连接完成

    /* 模拟授权跳转（实际项目中会打开授权页面） */
    console.log(`[ecommerceStore] 正在跳转到授权页面: ${platform.authUrl}`)

    setTimeout(() => {
      const idx = platforms.value.findIndex(p => p.id === platformId)
      if (idx !== -1) {
        platforms.value[idx].status = 'connected'
        platforms.value[idx].lastSyncTime = null
        platforms.value[idx].syncCount = 0
        persistPlatforms()
      }
      connectingPlatforms.value.delete(platformId)
    }, 3000)
  }

  /**
   * 断开平台连接
   */
  function disconnectPlatform(platformId) {
    const idx = platforms.value.findIndex(p => p.id === platformId)
    if (idx === -1) return

    platforms.value[idx].status = 'disconnected'
    platforms.value[idx].lastSyncTime = null
    platforms.value[idx].syncCount = 0
    connectingPlatforms.value.delete(platformId)
    syncingPlatforms.value.delete(platformId)
    persistPlatforms()
  }

  /**
   * 立即同步
   * 模拟2秒后完成，生成同步日志
   */
  function syncNow(platformId, type = 'order') {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform || platform.status !== 'connected') return

    if (syncingPlatforms.value.has(platformId)) return

    syncingPlatforms.value.add(platformId)

    /* 生成运行中的日志 */
    const logId = generateId('sync')
    const startTime = new Date().toISOString()
    const runningLog = {
      id: logId,
      platform: platformId,
      platformName: platform.name,
      type,
      direction: 'pull',
      status: 'running',
      count: 0,
      startTime,
      endTime: null,
      message: '同步进行中...',
      createdAt: new Date().toISOString()
    }
    syncLogs.value.unshift(runningLog)
    /* 清理30天前的日志 */
    cleanupExpiredLogs()
    persistSyncLogs()

    setTimeout(() => {
      const logIdx = syncLogs.value.findIndex(l => l.id === logId)
      if (logIdx === -1) return

      /* 模拟同步结果（90%成功率） */
      const isSuccess = Math.random() > 0.1
      const syncCount = isSuccess ? Math.floor(Math.random() * 50) + 5 : 0
      const endTime = new Date().toISOString()

      syncLogs.value[logIdx] = {
        ...syncLogs.value[logIdx],
        status: isSuccess ? 'success' : 'failed',
        count: syncCount,
        endTime,
        message: isSuccess
          ? `成功同步${syncCount}条${type === 'order' ? '订单' : type === 'inventory' ? '库存' : '商品'}数据`
          : '同步失败：网络连接超时，请稍后重试'
      }
      persistSyncLogs()

      /* 更新平台同步信息 */
      if (isSuccess) {
        const pIdx = platforms.value.findIndex(p => p.id === platformId)
        if (pIdx !== -1) {
          platforms.value[pIdx].lastSyncTime = endTime
          platforms.value[pIdx].syncCount += syncCount
          persistPlatforms()
        }
      }

      syncingPlatforms.value.delete(platformId)
    }, 2000)
  }

  /**
   * 全量同步所有已连接平台
   */
  function syncAll() {
    const connected = platforms.value.filter(p => p.status === 'connected')
    for (const platform of connected) {
      const types = []
      if (syncSettings.value.syncOrders) types.push('order')
      if (syncSettings.value.syncInventory) types.push('inventory')
      if (syncSettings.value.syncProducts) types.push('product')
      for (const type of types) {
        syncNow(platform.id, type)
      }
    }
  }

  /**
   * 更新同步设置
   */
  function updateSyncSettings(settings) {
    syncSettings.value = { ...syncSettings.value, ...settings }
    persistSyncSettings()
  }

  /**
   * 添加商品映射
   */
  function addProductMapping(mapping) {
    const newMapping = {
      id: generateId('pm'),
      platformSku: '',
      platformName: '',
      localSku: '',
      localName: '',
      syncPrice: true,
      syncStock: true,
      lastSyncTime: null,
      ...mapping
    }
    productMappings.value.push(newMapping)
    persistProductMappings()
    return newMapping
  }

  /**
   * 删除商品映射
   */
  function removeProductMapping(id) {
    productMappings.value = productMappings.value.filter(m => m.id !== id)
    persistProductMappings()
  }

  /**
   * 获取平台订单（模拟数据）
   */
  function getPlatformOrders(platformId) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform || platform.status !== 'connected') return []

    const orders = []
    const count = Math.floor(Math.random() * 10) + 1
    for (let i = 0; i < count; i++) {
      orders.push({
        id: generateId('ord'),
        platformOrderId: `${platform.id.toUpperCase()}-${Date.now()}-${i}`,
        platformName: platform.name,
        customerName: `客户${String.fromCharCode(65 + i)}`,
        productName: MOCK_PRODUCT_NAMES[Math.floor(Math.random() * MOCK_PRODUCT_NAMES.length)],
        quantity: Math.floor(Math.random() * 100) + 1,
        amount: (Math.random() * 10000 + 100).toFixed(2),
        status: ['pending', 'shipped', 'completed'][Math.floor(Math.random() * 3)],
        orderTime: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString()
      })
    }
    return orders
  }

  /**
   * 初始化种子数据
   */
  function initSeedData() {
    /* 如果已有数据则跳过 */
    if (syncLogs.value.length > 0 || productMappings.value.length > 0) return

    /* 模拟一些初始同步日志 */
    const now = new Date()
    const mockLogs = [
      { id: generateId('sync'), platform: 'taobao', platformName: '淘宝', type: 'order', direction: 'pull', status: 'success', count: 32, startTime: new Date(now.getTime() - 3600000).toISOString(), endTime: new Date(now.getTime() - 3580000).toISOString(), message: '成功同步32条订单数据' },
      { id: generateId('sync'), platform: 'jd', platformName: '京东', type: 'inventory', direction: 'push', status: 'success', count: 15, startTime: new Date(now.getTime() - 7200000).toISOString(), endTime: new Date(now.getTime() - 7180000).toISOString(), message: '成功同步15条库存数据' },
      { id: generateId('sync'), platform: 'pdd', platformName: '拼多多', type: 'order', direction: 'pull', status: 'failed', count: 0, startTime: new Date(now.getTime() - 10800000).toISOString(), endTime: new Date(now.getTime() - 10790000).toISOString(), message: '同步失败：API调用频率超限，请稍后重试' },
      { id: generateId('sync'), platform: 'taobao', platformName: '淘宝', type: 'product', direction: 'push', status: 'success', count: 8, startTime: new Date(now.getTime() - 14400000).toISOString(), endTime: new Date(now.getTime() - 14380000).toISOString(), message: '成功同步8条商品数据' },
      { id: generateId('sync'), platform: 'douyin', platformName: '抖音', type: 'order', direction: 'pull', status: 'success', count: 21, startTime: new Date(now.getTime() - 18000000).toISOString(), endTime: new Date(now.getTime() - 17980000).toISOString(), message: '成功同步21条订单数据' },
    ]
    syncLogs.value = mockLogs
    persistSyncLogs()

    /* 模拟一些商品映射 */
    const inventoryStore = useInventoryStore()
    const inventoryItems = inventoryStore.inventory || []
    const mockMappings = [
      { id: generateId('pm'), platformSku: 'TB-SKU-001', platformName: 'ABS树脂通用级(淘宝版)', localSku: inventoryItems[0]?.code || 'MTL-001', localName: inventoryItems[0]?.name || 'ABS树脂', syncPrice: true, syncStock: true, lastSyncTime: new Date(now.getTime() - 3600000).toISOString() },
      { id: generateId('pm'), platformSku: 'JD-SKU-002', platformName: '不锈钢板304(京东版)', localSku: inventoryItems[1]?.code || 'MTL-002', localName: inventoryItems[1]?.name || '不锈钢板304', syncPrice: true, syncStock: false, lastSyncTime: new Date(now.getTime() - 7200000).toISOString() },
      { id: generateId('pm'), platformSku: 'PDD-SKU-003', platformName: '铝合金型材(拼多多版)', localSku: inventoryItems[2]?.code || 'MTL-003', localName: inventoryItems[2]?.name || '铝合金型材6063', syncPrice: false, syncStock: true, lastSyncTime: new Date(now.getTime() - 10800000).toISOString() },
    ]
    productMappings.value = mockMappings
    persistProductMappings()

    /* 模拟淘宝和京东已连接 */
    const taobaoIdx = platforms.value.findIndex(p => p.id === 'taobao')
    if (taobaoIdx !== -1) {
      platforms.value[taobaoIdx].status = 'connected'
      platforms.value[taobaoIdx].lastSyncTime = new Date(now.getTime() - 3600000).toISOString()
      platforms.value[taobaoIdx].syncCount = 40
    }
    const jdIdx = platforms.value.findIndex(p => p.id === 'jd')
    if (jdIdx !== -1) {
      platforms.value[jdIdx].status = 'connected'
      platforms.value[jdIdx].lastSyncTime = new Date(now.getTime() - 7200000).toISOString()
      platforms.value[jdIdx].syncCount = 15
    }
    persistPlatforms()
  }

  return {
    platforms,
    syncLogs,
    syncSettings,
    productMappings,
    connectingPlatforms,
    syncingPlatforms,
    connectedPlatforms,
    connectedCount,
    todaySyncCount,
    failedSyncCount,
    totalMappingCount,
    connectPlatform,
    disconnectPlatform,
    syncNow,
    syncAll,
    updateSyncSettings,
    addProductMapping,
    removeProductMapping,
    getPlatformOrders,
    initSeedData
  }
})
