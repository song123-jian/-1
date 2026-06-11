import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from '@/stores/session'
import { generateId } from '@/utils/uid'
import { useSyncEngine } from '@/utils/syncEngine'
import { useInventoryStore } from './inventory'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON, safeRemoveItem } from '@/utils/storage'

const STORAGE_KEY = 'gj_erp_warehouseLocations'
const INIT_KEY = 'gj_erp_whLoc_initialized'

function load(key, fallback) {
  const data = safeGetJSON(key)
  return data !== null ? data : fallback
}

function persist(key, data) {
  safeSetJSON(key, data)
}

export const useWarehouseLocationStore = defineStore('warehouseLocation', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const locations = ref(load(STORAGE_KEY, []))

  const AREA_OPTIONS = ['待检区', '合格品区', '不合格品区', '隔离区', '回料区', '危险品区']

  const AREA_COLORS = {
    待检区: '#e65100',
    合格品区: 'var(--color-success)',
    不合格品区: 'var(--color-danger)',
    隔离区: '#6a1b9a',
    回料区: '#1565c0',
    危险品区: '#c62828'
  }

  /* 从库位数据中提取去重后的仓库列表，供 DataSelect 使用 */
  const warehouses = computed(() => {
    const names = new Set()
    const result = []
    for (const loc of locations.value) {
      if (loc.warehouseName && !names.has(loc.warehouseName)) {
        names.add(loc.warehouseName)
        result.push({ id: loc.warehouseName, name: loc.warehouseName })
      }
    }
    return result
  })

  const areaStats = computed(() => {
    const stats = {}
    for (const loc of locations.value) {
      const area = loc.areaName || '未分类'
      stats[area] = (stats[area] || 0) + 1
    }
    return stats
  })

  /* 库位关联物料统计：每个库位的物料种类数和总数量 */
  const getLocationStockInfo = computed(() => {
    const inventoryStore = useInventoryStore()
    const locationMap = {}
    locations.value.forEach((loc) => {
      locationMap[loc.id] = { count: 0, totalQty: 0 }
    })
    inventoryStore.inventory.forEach((item) => {
      if (item.locationId && locationMap[item.locationId]) {
        locationMap[item.locationId].count++
        locationMap[item.locationId].totalQty += item.quantity || 0
      }
    })
    return locationMap
  })

  function addLocation(data) {
    const item = {
      id: generateId('wl'),
      locationCode: data.locationCode || '',
      warehouseName: data.warehouseName || '',
      warehouseId: data.warehouseId || '',
      areaName: data.areaName || '合格品区',
      manager: data.manager || '',
      managerPhone: data.managerPhone || '',
      notes: data.notes || '',
      createdBy: getCurrentUser(),
      createdAt: new Date().toISOString()
    }
    locations.value.push(item)
    persist(STORAGE_KEY, locations.value)
    try {
      useInventoryStore().addAuditLog('create', 'warehouse', '新增库位: ' + item.locationCode)
    } catch (e) {}
    return item
  }

  function updateLocation(id, data) {
    const idx = locations.value.findIndex((l) => l.id === id)
    if (idx === -1) return false
    Object.assign(locations.value[idx], data, { updatedAt: new Date().toISOString() })
    persist(STORAGE_KEY, locations.value)
    try {
      useInventoryStore().addAuditLog('update', 'warehouse', '更新库位: ' + locations.value[idx].locationCode)
    } catch (e) {}
    return true
  }

  function deleteLocation(id) {
    const loc = locations.value.find((l) => l.id === id)
    const locCode = loc ? loc.locationCode : id
    locations.value = locations.value.filter((l) => l.id !== id)
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedId('warehouse_locations', id)
    persist(STORAGE_KEY, locations.value)
    try {
      useInventoryStore().addAuditLog('delete', 'warehouse', '删除库位: ' + locCode)
    } catch (e) {}
  }

  function initSeedData() {
    if (load(INIT_KEY, false)) return
    const seed = [
      {
        locationCode: 'CK01-YL-A-01',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '合格品区',
        manager: '张明',
        managerPhone: '13800001001',
        notes: 'A区货架1层'
      },
      {
        locationCode: 'CK01-YL-A-02',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '合格品区',
        manager: '张明',
        managerPhone: '13800001001',
        notes: 'A区货架2层'
      },
      {
        locationCode: 'CK01-YL-B-01',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '待检区',
        manager: '李红',
        managerPhone: '13800001002',
        notes: 'B区待检区域'
      },
      {
        locationCode: 'CK02-CP-A-01',
        warehouseName: '成品库',
        warehouseId: 'B',
        areaName: '合格品区',
        manager: '王刚',
        managerPhone: '13800001003',
        notes: '成品A区'
      },
      {
        locationCode: 'CK02-CP-B-01',
        warehouseName: '成品库',
        warehouseId: 'B',
        areaName: '不合格品区',
        manager: '王刚',
        managerPhone: '13800001003',
        notes: '不合格品隔离'
      },
      {
        locationCode: 'CK03-WX-A-01',
        warehouseName: '危化品库',
        warehouseId: 'C',
        areaName: '危险品区',
        manager: '赵安全',
        managerPhone: '13800001004',
        notes: '危化品专用'
      },
      {
        locationCode: 'CK01-YL-C-01',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '回料区',
        manager: '李红',
        managerPhone: '13800001002',
        notes: '回料存放区'
      },
      {
        locationCode: 'CK01-YL-D-01',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '隔离区',
        manager: '张明',
        managerPhone: '13800001001',
        notes: '问题物料隔离'
      }
    ]
    for (const s of seed) {
      addLocation(s)
    }
    safeSetItem(INIT_KEY, 'true')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(locations.value, items, 'id')
    locations.value = merged
    persist(STORAGE_KEY, locations.value)
  }

  function replaceData(newData) {
    locations.value = newData
    persist(STORAGE_KEY, locations.value)
  }

  return {
    locations,
    warehouses,
    AREA_OPTIONS,
    AREA_COLORS,
    areaStats,
    getLocationStockInfo,
    addLocation,
    updateLocation,
    deleteLocation,
    initSeedData,
    replaceData,
    mergeRemoteItems,
    persist
  }
})
