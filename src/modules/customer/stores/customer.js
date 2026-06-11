import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from '@/stores/session'
import { generateId } from '@/utils/uid'
import { useSyncEngine } from '@/utils/syncEngine'
import { safeGetItem, safeSetItem, safeGetJSON } from '@/utils/storage'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_customers'
const TAGS_KEY = 'gj_erp_customerTags'
const INIT_KEY = 'gj_erp_customers_initialized'

function loadAsync(key) {
  return new Promise((resolve) => {
    const data = safeGetJSON(key)
    if (data) {
      resolve(data)
      return
    }
    try {
      const dbRequest = indexedDB.open('dp-erp-storage', 1)
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('keyValue')) {
          db.createObjectStore('keyValue', { keyPath: 'key' })
        }
      }
      dbRequest.onsuccess = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('keyValue')) {
          resolve([])
          return
        }
        const tx = db.transaction('keyValue', 'readonly')
        const store = tx.objectStore('keyValue')
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result?.value || [])
        req.onerror = () => resolve([])
      }
      dbRequest.onerror = () => resolve([])
    } catch (e) {
      resolve([])
    }
  })
}

function persist(key, data) {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(key, json)
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('[CustomerStore] localStorage容量不足，尝试降级存储...')
      try {
        const dbRequest = indexedDB.open('dp-erp-storage', 1)
        dbRequest.onupgradeneeded = (event) => {
          const db = event.target.result
          if (!db.objectStoreNames.contains('keyValue')) {
            db.createObjectStore('keyValue', { keyPath: 'key' })
          }
        }
        dbRequest.onsuccess = (event) => {
          const db = event.target.result
          const tx = db.transaction('keyValue', 'readwrite')
          const store = tx.objectStore('keyValue')
          store.put({ key, value: data })
          tx.oncomplete = () => console.info('[CustomerStore] 已降级至IndexedDB存储')
        }
      } catch (idbErr) {
        console.error('[CustomerStore] IndexedDB降级也失败:', idbErr)
      }
    } else {
      console.error('[CustomerStore] 保存失败:', e)
    }
  }
}

export const useCustomerStore = defineStore('customer', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const customers = ref(safeGetJSON(STORAGE_KEY) || [])
  const tags = ref(safeGetJSON(TAGS_KEY) || [])

  const activeCount = computed(() => customers.value.filter((c) => c.status === 'active').length)
  const dormantCount = computed(() => customers.value.filter((c) => c.status === 'dormant').length)

  const allRegions = computed(() => {
    const regions = new Set()
    customers.value.forEach((c) => {
      if (c.region) regions.add(c.region)
    })
    return [...regions].sort()
  })

  const allDepartments = computed(() => {
    const depts = new Set()
    customers.value.forEach((c) => {
      if (c.department) depts.add(c.department)
    })
    return [...depts].sort()
  })

  const levelStats = computed(() => {
    const stats = { A: 0, B: 0, C: 0 }
    customers.value.forEach((c) => {
      if (stats[c.level] !== undefined) stats[c.level]++
    })
    return stats
  })

  const totalBalance = computed(() => customers.value.reduce((sum, c) => sum + (c.balance || 0), 0))

  const totalCreditLimit = computed(() => customers.value.reduce((sum, c) => sum + (c.creditLimit || 0), 0))

  function generateCustomerNo() {
    const year = new Date().getFullYear()
    const existing = customers.value.map((c) => c.customerNo || '')
    let seq = 1
    while (existing.includes(`KH-${year}-${String(seq).padStart(4, '0')}`)) seq++
    return `KH-${year}-${String(seq).padStart(4, '0')}`
  }

  function addCustomer(data) {
    const customer = {
      id: generateId('c'),
      customerNo: generateCustomerNo(),
      fullName: '',
      name: '',
      shortName: '',
      contactName: '',
      contact: '',
      department: '',
      position: '',
      phone: '',
      email: '',
      region: '',
      level: 'B',
      decisionAuthority: '',
      coreConcerns: '',
      creditLimit: 0,
      balance: 0,
      address: '',
      status: 'active',
      tags: [],
      createdBy: getCurrentUser(),
      createdAt: toLocalDateStr(),
      ...data
    }
    if (!customer.name && customer.fullName) customer.name = customer.fullName
    if (!customer.fullName && customer.name) customer.fullName = customer.name
    customers.value.push(customer)
    persist(STORAGE_KEY, customers.value)
    return customer
  }

  function updateCustomer(id, updates) {
    const idx = customers.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      customers.value[idx] = { ...customers.value[idx], ...updates, updatedBy: getCurrentUser() }
      persist(STORAGE_KEY, customers.value)
    }
  }

  function deleteCustomer(id) {
    // 检查关联数据：报价、合同、送货、回款
    const relatedData = []
    try {
      const quotationStore = useQuotationStore()
      const quoteCount = quotationStore.quotations.filter((q) => q.customerId === id).length
      if (quoteCount > 0) relatedData.push({ type: '报价单', count: quoteCount })
    } catch (e) {
      /* quotation store may not be initialized */
    }

    try {
      const contractStore = useContractStore()
      const contractCount = contractStore.contracts.filter((ct) => ct.partyAId === id).length
      if (contractCount > 0) relatedData.push({ type: '合同', count: contractCount })
    } catch (e) {
      /* contract store may not be initialized */
    }

    try {
      const deliveryStore = useDeliveryStore()
      const deliveryCount = deliveryStore.deliveries.filter((d) => d.customerId === id).length
      if (deliveryCount > 0) relatedData.push({ type: '送货单', count: deliveryCount })
    } catch (e) {
      /* delivery store may not be initialized */
    }

    try {
      const collectionStore = useCollectionStore()
      const collectionCount = collectionStore.collections.filter((col) => col.customerId === id).length
      if (collectionCount > 0) relatedData.push({ type: '回款记录', count: collectionCount })
    } catch (e) {
      /* collection store may not be initialized */
    }

    if (relatedData.length > 0) {
      const details = relatedData.map((r) => `${r.type} ${r.count} 条`).join('、')
      return { success: false, error: `该客户关联了 ${details}，请先处理关联数据后再删除。` }
    }

    customers.value = customers.value.filter((c) => c.id !== id)
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedId('customers', id)
    persist(STORAGE_KEY, customers.value)
    return { success: true }
  }

  function batchDelete(ids) {
    customers.value = customers.value.filter((c) => !ids.includes(c.id))
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedIds('customers', ids)
    persist(STORAGE_KEY, customers.value)
  }

  function batchUpdateLevel(ids, level) {
    customers.value.forEach((c) => {
      if (ids.includes(c.id)) c.level = level
    })
    persist(STORAGE_KEY, customers.value)
  }

  function addTag(tag) {
    tags.value.push(tag)
    persist(TAGS_KEY, tags.value)
  }

  function deleteTag(tagId) {
    tags.value = tags.value.filter((t) => t.id !== tagId)
    customers.value.forEach((c) => {
      if (c.tags) c.tags = c.tags.filter((t) => t !== tagId)
    })
    persist(TAGS_KEY, tags.value)
    persist(STORAGE_KEY, customers.value)
  }

  function updateTag(tagId, updates) {
    const idx = tags.value.findIndex((t) => t.id === tagId)
    if (idx !== -1) {
      tags.value[idx] = { ...tags.value[idx], ...updates }
      persist(TAGS_KEY, tags.value)
    }
  }

  function addTagToCustomer(custId, tagId) {
    const tagExists = tags.value.some((t) => t.id === tagId)
    if (!tagExists) return false
    const cust = customers.value.find((c) => c.id === custId)
    if (cust) {
      if (!cust.tags) cust.tags = []
      if (!cust.tags.includes(tagId)) cust.tags.push(tagId)
      persist(STORAGE_KEY, customers.value)
      return true
    }
    return false
  }

  function removeTagFromCustomer(custId, tagId) {
    const cust = customers.value.find((c) => c.id === custId)
    if (cust && cust.tags) {
      cust.tags = cust.tags.filter((t) => t !== tagId)
      persist(STORAGE_KEY, customers.value)
    }
  }

  function getCustomerById(id) {
    return customers.value.find((c) => c.id === id)
  }

  function importCustomers(data, options = {}) {
    let imported = 0,
      skipped = 0
    const now = toLocalDateStr()
    const existingKeys = new Set()
    customers.value.forEach((c) => {
      const key = (c.fullName || c.name || '') + '|' + (c.phone || '')
      if (key !== '|') existingKeys.add(key)
    })
    let maxNo = 0
    customers.value.forEach((c) => {
      const m = (c.customerNo || '').match(/(\d+)$/)
      if (m) maxNo = Math.max(maxNo, parseInt(m[1]))
    })
    const newCustomers = []
    data.forEach((item, idx) => {
      const fullName = item.fullName || item.name || ''
      const phone = item.phone || ''
      const contactName = item.contactName || item.contact || ''
      if (!fullName && !phone && !contactName) {
        skipped++
        return
      }
      const dedupeKey = (fullName || '') + '|' + (phone || '')
      if (dedupeKey !== '|' && existingKeys.has(dedupeKey)) {
        skipped++
        return
      }
      if (dedupeKey !== '|') existingKeys.add(dedupeKey)
      maxNo++
      newCustomers.push({
        id: generateId('c'),
        customerNo: item.customerNo || `KH-${new Date().getFullYear()}-${String(maxNo).padStart(4, '0')}`,
        fullName,
        name: fullName,
        shortName: item.shortName || '',
        contactName: contactName,
        contact: contactName,
        department: item.department || '',
        position: item.position || '',
        phone,
        email: item.email || '',
        region: item.region || '',
        level: ['A', 'B', 'C'].includes((item.level || 'B').toUpperCase()) ? (item.level || 'B').toUpperCase() : 'B',
        decisionAuthority: item.decisionAuthority || '',
        coreConcerns: item.coreConcerns || '',
        creditLimit: parseFloat(item.creditLimit) || 0,
        balance: parseFloat(item.balance) || 0,
        address: item.address || '',
        status: item.status || 'active',
        tags: item.tags || [],
        createdAt: item.createdAt || now
      })
      imported++
    })
    customers.value.push(...newCustomers)
    persist(STORAGE_KEY, customers.value)
    return { imported, skipped }
  }

  async function importCustomersBatch(data, onProgress) {
    let imported = 0,
      skipped = 0
    const now = toLocalDateStr()
    const existingKeys = new Set()
    customers.value.forEach((c) => {
      const key = (c.fullName || c.name || '') + '|' + (c.phone || '')
      if (key !== '|') existingKeys.add(key)
    })
    let maxNo = 0
    customers.value.forEach((c) => {
      const m = (c.customerNo || '').match(/(\d+)$/)
      if (m) maxNo = Math.max(maxNo, parseInt(m[1]))
    })
    const batchSize = 500
    const total = data.length
    for (let start = 0; start < total; start += batchSize) {
      const batch = data.slice(start, Math.min(start + batchSize, total))
      const newBatch = []
      batch.forEach((item, idx) => {
        const globalIdx = start + idx
        const fullName = item.fullName || item.name || ''
        const phone = item.phone || ''
        const contactName = item.contactName || item.contact || ''
        if (!fullName && !phone && !contactName) {
          skipped++
          return
        }
        const dedupeKey = (fullName || '') + '|' + (phone || '')
        if (dedupeKey !== '|' && existingKeys.has(dedupeKey)) {
          skipped++
          return
        }
        if (dedupeKey !== '|') existingKeys.add(dedupeKey)
        maxNo++
        newBatch.push({
          id: generateId('c'),
          customerNo: item.customerNo || `KH-${new Date().getFullYear()}-${String(maxNo).padStart(4, '0')}`,
          fullName,
          name: fullName,
          shortName: item.shortName || '',
          contactName: contactName,
          contact: contactName,
          department: item.department || '',
          position: item.position || '',
          phone,
          email: item.email || '',
          region: item.region || '',
          level: ['A', 'B', 'C'].includes((item.level || 'B').toUpperCase()) ? (item.level || 'B').toUpperCase() : 'B',
          decisionAuthority: item.decisionAuthority || '',
          coreConcerns: item.coreConcerns || '',
          creditLimit: parseFloat(item.creditLimit) || 0,
          balance: parseFloat(item.balance) || 0,
          address: item.address || '',
          status: item.status || 'active',
          tags: item.tags || [],
          createdAt: item.createdAt || now
        })
        imported++
      })
      customers.value.push(...newBatch)
      if (onProgress) onProgress(Math.min(start + batchSize, total), total, imported, skipped)
      await new Promise((r) => setTimeout(r, 0))
    }
    persist(STORAGE_KEY, customers.value)
    return { imported, skipped }
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    customers.value = [
      {
        id: 'c1',
        customerNo: 'KH-2024-0001',
        name: '上海贸易有限公司',
        fullName: '上海贸易有限公司',
        shortName: '上海贸易',
        contact: '张经理',
        contactName: '张经理',
        phone: '021-5888XXXX',
        email: 'zhang@shanghai-trade.com',
        region: '华东',
        level: 'A',
        decisionAuthority: '决策者',
        coreConcerns: '交货速度',
        creditLimit: 500000,
        balance: 125000,
        address: '上海市浦东新区陆家嘴环路1000号',
        status: 'active',
        tags: ['VIP', '长期合作'],
        createdAt: '2024-01-15'
      },
      {
        id: 'c2',
        customerNo: 'KH-2024-0002',
        name: '北京科技发展集团',
        fullName: '北京科技发展集团',
        shortName: '北京科技',
        contact: '李总',
        contactName: '李总',
        phone: '010-6222XXXX',
        email: 'li@beijing-tech.com',
        region: '华北',
        level: 'B',
        decisionAuthority: '影响者',
        coreConcerns: '产品质量',
        creditLimit: 300000,
        balance: 85000,
        address: '北京市海淀区中关村科技园',
        status: 'active',
        tags: ['潜力客户'],
        createdAt: '2024-03-20'
      },
      {
        id: 'c3',
        customerNo: 'KH-2023-0001',
        name: '广州进出口有限公司',
        fullName: '广州进出口有限公司',
        shortName: '广州进出口',
        contact: '王经理',
        contactName: '王经理',
        phone: '020-3888XXXX',
        email: 'wang@gz-ie.com',
        region: '华南',
        level: 'A',
        decisionAuthority: '决策者',
        coreConcerns: '价格优势',
        creditLimit: 800000,
        balance: 320000,
        address: '广州市天河区珠江新城',
        status: 'active',
        tags: ['VIP', '大客户'],
        createdAt: '2023-11-01'
      },
      {
        id: 'c4',
        customerNo: 'KH-2024-0003',
        name: '深圳智能制造有限公司',
        fullName: '深圳智能制造有限公司',
        shortName: '深圳智造',
        contact: '陈总',
        contactName: '陈总',
        phone: '0755-2666XXXX',
        email: 'chen@sz-smart.com',
        region: '华南',
        level: 'C',
        decisionAuthority: '推荐者',
        coreConcerns: '技术支持',
        creditLimit: 100000,
        balance: 45000,
        address: '深圳市南山区科技园',
        status: 'active',
        tags: ['新客户'],
        createdAt: '2024-06-10'
      },
      {
        id: 'c5',
        customerNo: 'KH-2024-0004',
        name: '成都精密机械有限公司',
        fullName: '成都精密机械有限公司',
        shortName: '成都精密',
        contact: '赵经理',
        contactName: '赵经理',
        phone: '028-8555XXXX',
        email: 'zhao@cd-jm.com',
        region: '西南',
        level: 'B',
        decisionAuthority: '影响者',
        coreConcerns: '售后服务',
        creditLimit: 200000,
        balance: 0,
        address: '成都市高新区天府大道',
        status: 'active',
        tags: [],
        createdAt: '2024-04-05'
      },
      {
        id: 'c6',
        customerNo: 'KH-2023-0002',
        name: '武汉钢铁贸易有限公司',
        fullName: '武汉钢铁贸易有限公司',
        shortName: '武汉钢贸',
        contact: '刘经理',
        contactName: '刘经理',
        phone: '027-8777XXXX',
        email: 'liu@wh-steel.com',
        region: '华中',
        level: 'C',
        decisionAuthority: '把关者',
        coreConcerns: '付款条件',
        creditLimit: 50000,
        balance: 32000,
        address: '武汉市江汉区建设大道',
        status: 'dormant',
        tags: ['回款慢'],
        createdAt: '2023-08-12'
      }
    ]
    persist(STORAGE_KEY, customers.value)

    tags.value = [
      { id: 'VIP', name: 'VIP', color: '#ef4444', group: '等级' },
      { id: '长期合作', name: '长期合作', color: '#f59e0b', group: '关系' },
      { id: '大客户', name: '大客户', color: '#8b5cf6', group: '等级' },
      { id: '潜力客户', name: '潜力客户', color: '#3b82f6', group: '关系' },
      { id: '新客户', name: '新客户', color: '#10b981', group: '关系' },
      { id: '回款慢', name: '回款慢', color: '#94a3b8', group: '风险' }
    ]
    persist(TAGS_KEY, tags.value)
    safeSetItem(INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(customers.value, items, 'id')
    customers.value = merged
    persist(STORAGE_KEY, customers.value)
  }

  function replaceData(newData) {
    customers.value = newData
    persist(STORAGE_KEY, customers.value)
  }

  return {
    customers,
    tags,
    activeCount,
    dormantCount,
    allRegions,
    allDepartments,
    levelStats,
    totalBalance,
    totalCreditLimit,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    batchDelete,
    batchUpdateLevel,
    addTag,
    deleteTag,
    updateTag,
    addTagToCustomer,
    removeTagFromCustomer,
    getCustomerById,
    importCustomers,
    importCustomersBatch,
    generateCustomerNo,
    initSeedData,
    replaceData,
    mergeRemoteItems,
    persist
  }
})
