import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_suppliers'
const INIT_KEY = 'gj_erp_supplier_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) return parsed
    }
  } catch (e) {
    console.warn('[supplierStore] load failed:', key, e)
  }
  return fallback
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[supplierStore] save failed:', key, e)
  }
}

function generateSupplierCode(existing) {
  const now = new Date()
  const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0')
  const prefix = 'SUP' + dateStr
  let maxSeq = 0
  for (const s of existing) {
    const code = s.code || ''
    if (code.startsWith(prefix)) {
      const tail = code.slice(prefix.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

export const useSupplierStore = defineStore('supplier', () => {
  const suppliers = ref(load(STORAGE_KEY, []))

  const activeSuppliers = computed(() => suppliers.value.filter((s) => s.status === 'active'))
  const pendingSuppliers = computed(() => suppliers.value.filter((s) => s.status === 'pending'))
  const blacklistSuppliers = computed(() => suppliers.value.filter((s) => s.status === 'blacklist'))
  const totalCount = computed(() => suppliers.value.length)

  function persist() {
    save(STORAGE_KEY, suppliers.value)
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    suppliers.value = [
      {
        id: generateId('sup'),
        code: 'SUP202601001',
        name: '江苏钢铁集团有限公司',
        shortName: '江苏钢铁',
        category: '原材料',
        contact: '周建国',
        phone: '0512-53331234',
        email: 'zhou@js-steel.com',
        address: '江苏省苏州市工业园区钢城路88号',
        bankName: '中国工商银行苏州分行',
        bankAccount: '1102 2456 0910 0088 123',
        qualification: 'ISO9001/ISO14001',
        qualificationExpiry: '2027-06-30',
        rating: 5,
        deliveryScore: 92,
        qualityScore: 95,
        priceScore: 85,
        serviceScore: 88,
        status: 'active',
        createDate: '2024-01-15',
        notes: '核心供应商，合作多年'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601002',
        name: '浙江化工原料有限公司',
        shortName: '浙江化工',
        category: '原材料',
        contact: '吴明辉',
        phone: '0571-86665678',
        email: 'wu@zj-chem.com',
        address: '浙江省杭州市萧山区化工园区3号',
        bankName: '中国建设银行杭州分行',
        bankAccount: '3300 1627 8350 5988 456',
        qualification: 'ISO9001',
        qualificationExpiry: '2026-12-31',
        rating: 4,
        deliveryScore: 85,
        qualityScore: 88,
        priceScore: 90,
        serviceScore: 82,
        status: 'active',
        createDate: '2024-03-20',
        notes: '化工原料主力供应商'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601003',
        name: '广东有色金属有限公司',
        shortName: '广东有色',
        category: '原材料',
        contact: '郑伟强',
        phone: '020-38887890',
        email: 'zheng@gd-nf.com',
        address: '广东省佛山市顺德区有色金属城A栋',
        bankName: '中国农业银行佛山分行',
        bankAccount: '4405 0120 0920 0012 789',
        qualification: 'ISO9001/IATF16949',
        qualificationExpiry: '2027-03-15',
        rating: 5,
        deliveryScore: 90,
        qualityScore: 93,
        priceScore: 88,
        serviceScore: 90,
        status: 'active',
        createDate: '2024-02-10',
        notes: '核心供应商，价格优势明显'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601004',
        name: '山东机械制造有限公司',
        shortName: '山东机械',
        category: '成品',
        contact: '孙志远',
        phone: '0531-85553456',
        email: 'sun@sd-mach.com',
        address: '山东省济南市历城区工业南路168号',
        bankName: '中国银行济南分行',
        bankAccount: '2302 1560 0910 0056 321',
        qualification: 'ISO9001',
        qualificationExpiry: '2026-09-30',
        rating: 3,
        deliveryScore: 72,
        qualityScore: 78,
        priceScore: 80,
        serviceScore: 70,
        status: 'pending',
        createDate: '2025-06-01',
        notes: '新供应商，需进一步考察'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601005',
        name: '上海物流配送有限公司',
        shortName: '上海物流',
        category: '物流',
        contact: '李晓峰',
        phone: '021-62345678',
        email: 'li@sh-logistics.com',
        address: '上海市浦东新区外高桥保税区物流大道99号',
        bankName: '交通银行上海分行',
        bankAccount: '3100 6620 0180 0120 567',
        qualification: '道路运输经营许可证',
        qualificationExpiry: '2027-01-31',
        rating: 4,
        deliveryScore: 88,
        qualityScore: 80,
        priceScore: 85,
        serviceScore: 92,
        status: 'active',
        createDate: '2024-05-18',
        notes: '物流配送服务商'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601006',
        name: '北京技术服务有限公司',
        shortName: '北京技术',
        category: '服务',
        contact: '王丽华',
        phone: '010-87654321',
        email: 'wang@bj-tech.com',
        address: '北京市海淀区中关村科技园创新大厦12层',
        bankName: '招商银行北京分行',
        bankAccount: '1109 0820 0130 5088 234',
        qualification: '高新技术企业认证',
        qualificationExpiry: '2026-12-15',
        rating: 4,
        deliveryScore: 80,
        qualityScore: 90,
        priceScore: 75,
        serviceScore: 95,
        status: 'active',
        createDate: '2024-08-22',
        notes: 'IT技术服务供应商'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601007',
        name: '天津塑料有限公司',
        shortName: '天津塑料',
        category: '原材料',
        contact: '赵鹏飞',
        phone: '022-23456789',
        email: 'zhao@tj-plastic.com',
        address: '天津市滨海新区化工园B区5号',
        bankName: '中国工商银行天津分行',
        bankAccount: '1202 0120 0920 0088 567',
        qualification: 'ISO9001/ISO14001',
        qualificationExpiry: '2025-08-20',
        rating: 2,
        deliveryScore: 60,
        qualityScore: 65,
        priceScore: 70,
        serviceScore: 55,
        status: 'blacklist',
        createDate: '2023-11-05',
        notes: '多次交货延迟，质量不稳定，已列入黑名单'
      },
      {
        id: generateId('sup'),
        code: 'SUP202601008',
        name: '深圳电子元器件有限公司',
        shortName: '深圳电子',
        category: '成品',
        contact: '陈思远',
        phone: '0755-87654321',
        email: 'chen@sz-elec.com',
        address: '广东省深圳市南山区科技园南区R2-B栋',
        bankName: '中国建设银行深圳分行',
        bankAccount: '4400 1627 8350 5300 123',
        qualification: 'ISO9001/IATF16949/ISO45001',
        qualificationExpiry: '2027-05-10',
        rating: 4,
        deliveryScore: 86,
        qualityScore: 92,
        priceScore: 78,
        serviceScore: 88,
        status: 'active',
        createDate: '2025-01-12',
        notes: '电子元器件供应商，品质优良'
      }
    ]
    persist()
    localStorage.setItem(INIT_KEY, '1')
  }

  function addSupplier(data) {
    const supplier = {
      id: generateId('sup'),
      code: generateSupplierCode(suppliers.value),
      name: '',
      shortName: '',
      category: '原材料',
      contact: '',
      phone: '',
      email: '',
      address: '',
      bankName: '',
      bankAccount: '',
      qualification: '',
      qualificationExpiry: '',
      rating: 3,
      deliveryScore: 70,
      qualityScore: 70,
      priceScore: 70,
      serviceScore: 70,
      status: 'active',
      createDate: toLocalDateStr(),
      notes: '',
      ...data
    }
    suppliers.value.push(supplier)
    persist()
    return supplier
  }

  function updateSupplier(id, data) {
    const idx = suppliers.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      suppliers.value[idx] = { ...suppliers.value[idx], ...data }
      persist()
    }
  }

  function deleteSupplier(id) {
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
    persist()
  }

  function toggleBlacklist(id) {
    const idx = suppliers.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      const current = suppliers.value[idx].status
      suppliers.value[idx].status = current === 'blacklist' ? 'active' : 'blacklist'
      persist()
    }
  }

  function getSupplierById(id) {
    return suppliers.value.find((s) => s.id === id) || null
  }

  return {
    suppliers,
    activeSuppliers,
    pendingSuppliers,
    blacklistSuppliers,
    totalCount,
    initSeedData,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleBlacklist,
    getSupplierById,
    persist
  }
})
