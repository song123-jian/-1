import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { useProductionStore } from './production'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_bomList'
const INIT_KEY = 'gj_erp_bom_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[bomStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[bomStore] save failed:', key, e)
  }
}

/* BOM类型标签 */
export const BOM_TYPE_LABELS = {
  single: '单层BOM',
  multi: '多层BOM',
  phantom: '虚拟BOM'
}

/* BOM状态标签 */
export const BOM_STATUS_LABELS = {
  draft: '草稿',
  active: '已激活',
  obsolete: '已废弃'
}

/* BOM状态颜色 */
export const BOM_STATUS_COLORS = {
  draft: 'var(--color-text-tertiary)',
  active: 'var(--color-success)',
  obsolete: 'var(--color-danger)'
}

export const useBomStore = defineStore('bom', () => {
  const bomList = ref(load(STORAGE_KEY, []))

  function persist() {
    save(STORAGE_KEY, bomList.value)
  }

  /* 生成BOM编码: BOM+年月+序号 */
  function generateBomCode() {
    const now = new Date()
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0')
    const prefix = 'BOM' + dateStr
    let maxSeq = 0
    for (const bom of bomList.value) {
      if (bom.code && bom.code.startsWith(prefix)) {
        const tail = bom.code.slice(prefix.length)
        const n = parseInt(tail, 10)
        if (!isNaN(n) && n > maxSeq) maxSeq = n
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0')
  }

  /* 计算属性：激活的BOM */
  const activeBomList = computed(() => bomList.value.filter((b) => b.status === 'active'))

  /* 计算属性：BOM总数统计 */
  const bomStats = computed(() => {
    const total = bomList.value.length
    const draft = bomList.value.filter((b) => b.status === 'draft').length
    const active = bomList.value.filter((b) => b.status === 'active').length
    const obsolete = bomList.value.filter((b) => b.status === 'obsolete').length
    return { total, draft, active, obsolete }
  })

  /* 初始化种子数据 */
  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return

    bomList.value = [
      {
        id: generateId('bom'),
        code: 'BOM2026060001',
        name: '精密减速器总成BOM',
        productId: 'PRD-001',
        productName: '精密减速器RV-40E',
        version: 'V1.0',
        type: 'multi',
        components: [
          {
            id: generateId('cmp'),
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            spec: '2B/BA',
            unit: 'kg',
            quantity: 15,
            scrapRate: 3,
            isOptional: false,
            notes: '壳体材料'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            spec: 'T5',
            unit: 'kg',
            quantity: 8,
            scrapRate: 2,
            isOptional: false,
            notes: '端盖材料'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-006',
            materialName: '轴承钢GCr15',
            spec: 'Φ50',
            unit: 'kg',
            quantity: 5,
            scrapRate: 1,
            isOptional: false,
            notes: '轴承套圈'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-001',
            materialName: 'ABS树脂',
            spec: '通用级',
            unit: 'kg',
            quantity: 2,
            scrapRate: 5,
            isOptional: true,
            notes: '防护罩'
          }
        ],
        totalCost: 0,
        status: 'active',
        createDate: '2026-06-01',
        updateDate: '2026-06-03',
        notes: '精密减速器标准BOM'
      },
      {
        id: generateId('bom'),
        code: 'BOM2026060002',
        name: '液压缸总成BOM',
        productId: 'PRD-002',
        productName: '液压缸HOB-63/35',
        version: 'V2.1',
        type: 'single',
        components: [
          {
            id: generateId('cmp'),
            materialCode: 'MTL-007',
            materialName: '碳钢Q235',
            spec: '热轧板卷',
            unit: 'kg',
            quantity: 25,
            scrapRate: 4,
            isOptional: false,
            notes: '缸筒'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-008',
            materialName: '铜合金H59',
            spec: 'Φ30',
            unit: 'kg',
            quantity: 3,
            scrapRate: 2,
            isOptional: false,
            notes: '导向套'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-004',
            materialName: 'POM塑料',
            spec: 'M90-44',
            unit: 'kg',
            quantity: 1.5,
            scrapRate: 3,
            isOptional: false,
            notes: '密封件支撑环'
          }
        ],
        totalCost: 0,
        status: 'active',
        createDate: '2026-06-02',
        updateDate: '2026-06-02',
        notes: '液压缸标准BOM'
      },
      {
        id: generateId('bom'),
        code: 'BOM2026060003',
        name: '电气控制柜BOM',
        productId: 'PRD-003',
        productName: '电气控制柜PLC-200',
        version: 'V1.0',
        type: 'multi',
        components: [
          {
            id: generateId('cmp'),
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            spec: '2B/BA',
            unit: 'kg',
            quantity: 30,
            scrapRate: 5,
            isOptional: false,
            notes: '柜体'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-005',
            materialName: '尼龙66',
            spec: '自然色',
            unit: 'kg',
            quantity: 0.8,
            scrapRate: 2,
            isOptional: false,
            notes: '线槽'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-001',
            materialName: 'ABS树脂',
            spec: '通用级',
            unit: 'kg',
            quantity: 3,
            scrapRate: 5,
            isOptional: false,
            notes: '面板'
          }
        ],
        totalCost: 0,
        status: 'draft',
        createDate: '2026-06-04',
        updateDate: '2026-06-04',
        notes: '电气控制柜BOM，待审核'
      },
      {
        id: generateId('bom'),
        code: 'BOM2026060004',
        name: '自动化输送线BOM',
        productId: 'PRD-004',
        productName: '自动化输送线CV-1000',
        version: 'V1.2',
        type: 'phantom',
        components: [
          {
            id: generateId('cmp'),
            materialCode: 'MTL-003',
            materialName: '铝合金型材6063',
            spec: 'T5',
            unit: 'kg',
            quantity: 50,
            scrapRate: 3,
            isOptional: false,
            notes: '框架'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-007',
            materialName: '碳钢Q235',
            spec: '热轧板卷',
            unit: 'kg',
            quantity: 20,
            scrapRate: 4,
            isOptional: false,
            notes: '支撑结构'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-006',
            materialName: '轴承钢GCr15',
            spec: 'Φ50',
            unit: 'kg',
            quantity: 8,
            scrapRate: 1,
            isOptional: false,
            notes: '传动轴承'
          },
          {
            id: generateId('cmp'),
            materialCode: 'MTL-004',
            materialName: 'POM塑料',
            spec: 'M90-44',
            unit: 'kg',
            quantity: 5,
            scrapRate: 3,
            isOptional: false,
            notes: '导轨滑块'
          }
        ],
        totalCost: 0,
        status: 'active',
        createDate: '2026-05-20',
        updateDate: '2026-06-01',
        notes: '自动化输送线虚拟BOM'
      }
    ]

    /* 计算初始成本 */
    for (const bom of bomList.value) {
      calculateCost(bom.id)
    }

    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  /* 新增BOM */
  function addBom(data) {
    const bom = {
      id: generateId('bom'),
      code: data.code || generateBomCode(),
      name: '',
      productId: '',
      productName: '',
      version: 'V1.0',
      type: 'single',
      components: [],
      totalCost: 0,
      status: 'draft',
      createDate: toLocalDateStr(),
      updateDate: toLocalDateStr(),
      notes: '',
      ...data
    }
    bomList.value.push(bom)
    calculateCost(bom.id)
    persist()
    return bom
  }

  /* 更新BOM */
  function updateBom(id, data) {
    const idx = bomList.value.findIndex((b) => b.id === id)
    if (idx !== -1) {
      bomList.value[idx] = { ...bomList.value[idx], ...data, updateDate: toLocalDateStr() }
      calculateCost(id)
      persist()
      return true
    }
    return false
  }

  /* 删除BOM（检查是否有关联生产工单） */
  function deleteBom(id) {
    const idx = bomList.value.findIndex((b) => b.id === id)
    if (idx === -1) return { success: false, error: '未找到BOM' }

    /* 检查是否有关联生产工单 - 使用延迟调用避免循环依赖 */
    try {
      const productionStore = useProductionStore()
      const relatedOrders = productionStore.productionOrders.filter((o) => o.bomId === id && o.status !== 'cancelled')
      if (relatedOrders.length > 0) {
        return { success: false, error: `该BOM存在 ${relatedOrders.length} 个关联工单，无法删除` }
      }
    } catch (e) {
      /* production store未初始化时跳过检查 */
    }

    bomList.value.splice(idx, 1)
    persist()
    return { success: true }
  }

  /* 激活BOM (draft -> active) */
  function activateBom(id) {
    const idx = bomList.value.findIndex((b) => b.id === id)
    if (idx === -1) return false
    if (bomList.value[idx].status !== 'draft') return false
    bomList.value[idx].status = 'active'
    bomList.value[idx].updateDate = toLocalDateStr()
    persist()
    return true
  }

  /* 废弃BOM (active -> obsolete) */
  function obsoleteBom(id) {
    const idx = bomList.value.findIndex((b) => b.id === id)
    if (idx === -1) return false
    if (bomList.value[idx].status !== 'active') return false
    bomList.value[idx].status = 'obsolete'
    bomList.value[idx].updateDate = toLocalDateStr()
    persist()
    return true
  }

  /* 按产品查询BOM */
  function getBomByProduct(productId) {
    return bomList.value.filter((b) => b.productId === productId && b.status === 'active')
  }

  /* 计算BOM成本（汇总所有组件成本） */
  function calculateCost(id) {
    const idx = bomList.value.findIndex((b) => b.id === id)
    if (idx === -1) return 0

    let totalCost = 0
    const bom = bomList.value[idx]

    /* 尝试从库存Store获取单价 */
    let inventoryItems = []
    try {
      const inventoryStore = useInventoryStore()
      inventoryItems = inventoryStore.inventory || []
    } catch (e) {
      /* inventory store未初始化时使用空数组 */
    }

    for (const comp of bom.components) {
      const invItem = inventoryItems.find((i) => i.code === comp.materialCode)
      const unitCost = invItem ? parseFloat(invItem.unitCost) || 0 : 0
      const qty = parseFloat(comp.quantity) || 0
      const scrapRate = parseFloat(comp.scrapRate) || 0
      const effectiveQty = qty * (1 + scrapRate / 100)
      totalCost += effectiveQty * unitCost
    }

    bomList.value[idx].totalCost = Math.round(totalCost * 100) / 100
    persist()
    return bomList.value[idx].totalCost
  }

  /* 根据ID获取BOM */
  function getBomById(id) {
    return bomList.value.find((b) => b.id === id) || null
  }

  return {
    bomList,
    activeBomList,
    bomStats,
    BOM_TYPE_LABELS,
    BOM_STATUS_LABELS,
    BOM_STATUS_COLORS,
    generateBomCode,
    initSeedData,
    addBom,
    updateBom,
    deleteBom,
    activateBom,
    obsoleteBom,
    getBomByProduct,
    calculateCost,
    getBomById,
    persist
  }
})
