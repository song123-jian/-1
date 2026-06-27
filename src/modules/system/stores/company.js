import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const COMPANY_KEY = 'gj_erp_companyInfo'
const BRANCHES_KEY = 'gj_erp_branches'
const DEPTS_KEY = 'gj_erp_departments'
const INIT_KEY = 'gj_erp_company_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return fallback
}
function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    /* ignore */
  }
}
function genId(prefix) {
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

export const useCompanyStore = defineStore('company', () => {
  const companyInfo = ref(
    load(COMPANY_KEY, {
      name: '',
      shortName: '',
      code: '',
      legalPerson: '',
      regCapital: '',
      established: '',
      businessScope: '',
      address: '',
      phone: '',
      fax: '',
      email: '',
      website: '',
      taxNo: '',
      bank: '',
      bankAccount: '',
      logo: '',
      stamp: '',
      seal: ''
    })
  )

  const branches = ref(load(BRANCHES_KEY, []))
  const departments = ref(load(DEPTS_KEY, []))

  const branchCount = computed(() => branches.value.length)
  const deptCount = computed(() => departments.value.length)
  const staffCount = computed(() => departments.value.reduce((sum, d) => sum + (d.staffCount || 0), 0))

  function _persistCompany() {
    persist(COMPANY_KEY, companyInfo.value)
  }
  function _persistBranches() {
    persist(BRANCHES_KEY, branches.value)
  }
  function _persistDepts() {
    persist(DEPTS_KEY, departments.value)
  }

  function saveCompanyInfo(data) {
    companyInfo.value = { ...companyInfo.value, ...data }
    _persistCompany()
  }

  function addBranch(data) {
    const item = {
      id: genId('br'),
      name: data.name || '',
      code: data.code || '',
      manager: data.manager || '',
      address: data.address || '',
      phone: data.phone || '',
      status: data.status || 'active'
    }
    branches.value.push(item)
    _persistBranches()
    return item
  }

  function updateBranch(id, updates) {
    const idx = branches.value.findIndex((b) => b.id === id)
    if (idx === -1) return null
    branches.value[idx] = { ...branches.value[idx], ...updates }
    _persistBranches()
    return branches.value[idx]
  }

  function deleteBranch(id) {
    const idx = branches.value.findIndex((b) => b.id === id)
    if (idx === -1) return false
    branches.value.splice(idx, 1)
    _persistBranches()
    return true
  }

  function addDepartment(data) {
    const item = {
      id: genId('dept'),
      name: data.name || '',
      code: data.code || '',
      parent: data.parent || '',
      manager: data.manager || '',
      staffCount: data.staffCount || 0,
      branch: data.branch || '',
      status: data.status || 'active'
    }
    departments.value.push(item)
    _persistDepts()
    return item
  }

  function updateDepartment(id, updates) {
    const idx = departments.value.findIndex((d) => d.id === id)
    if (idx === -1) return null
    departments.value[idx] = { ...departments.value[idx], ...updates }
    _persistDepts()
    return departments.value[idx]
  }

  function deleteDepartment(id) {
    const idx = departments.value.findIndex((d) => d.id === id)
    if (idx === -1) return false
    departments.value.splice(idx, 1)
    _persistDepts()
    return true
  }

  function replaceData(newData) {
    if (newData.branches) {
      branches.value = newData.branches
      _persistBranches()
    }
    if (newData.departments) {
      departments.value = newData.departments
      _persistDepts()
    }
    if (newData.companyInfo) {
      companyInfo.value = newData.companyInfo
      _persistCompany()
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    companyInfo.value = {
      name: '冠久科技有限公司',
      shortName: '冠久科技',
      code: 'GJ-TECH',
      legalPerson: '张明远',
      regCapital: '1000万元',
      established: '2020-06-15',
      businessScope: '计算机软硬件开发、销售；信息系统集成服务；信息技术咨询服务；数据处理和存储服务',
      address: '上海市浦东新区张江高科技园区XXX路XXX号',
      phone: '021-6888XXXX',
      fax: '021-6888XXXX',
      email: 'info@gjtech.com',
      website: 'https://www.gjtech.com',
      taxNo: '91310000MA1FL8XX3K',
      bank: '中国工商银行浦东支行',
      bankAccount: '1001 2088 0920 0123 456',
      logo: '',
      stamp: '',
      seal: ''
    }
    _persistCompany()

    if (branches.value.length === 0) {
      branches.value = [
        {
          id: 'br1',
          name: '上海总部',
          code: 'SH-HQ',
          manager: '张明远',
          address: '上海市浦东新区',
          phone: '021-6888XXXX',
          status: 'active'
        },
        {
          id: 'br2',
          name: '苏州分公司',
          code: 'SZ-BR',
          manager: '李建华',
          address: '苏州市工业园区',
          phone: '0512-6888XXXX',
          status: 'active'
        },
        {
          id: 'br3',
          name: '深圳分公司',
          code: 'SZ-BR2',
          manager: '王志强',
          address: '深圳市南山区',
          phone: '0755-8888XXXX',
          status: 'active'
        }
      ]
      _persistBranches()
    }

    if (departments.value.length === 0) {
      departments.value = [
        {
          id: 'dept1',
          name: '总经办',
          code: 'GM',
          parent: '',
          manager: '张明远',
          staffCount: 5,
          branch: 'SH-HQ',
          status: 'active'
        },
        {
          id: 'dept2',
          name: '销售部',
          code: 'SALES',
          parent: '',
          manager: '刘晓峰',
          staffCount: 28,
          branch: 'SH-HQ',
          status: 'active'
        },
        {
          id: 'dept3',
          name: '技术部',
          code: 'TECH',
          parent: '',
          manager: '陈伟',
          staffCount: 35,
          branch: 'SH-HQ',
          status: 'active'
        },
        {
          id: 'dept4',
          name: '财务部',
          code: 'FIN',
          parent: '',
          manager: '赵雅琴',
          staffCount: 8,
          branch: 'SH-HQ',
          status: 'active'
        },
        {
          id: 'dept5',
          name: '仓储部',
          code: 'WH',
          parent: '',
          manager: '孙磊',
          staffCount: 15,
          branch: 'SH-HQ',
          status: 'active'
        },
        {
          id: 'dept6',
          name: '人事行政部',
          code: 'HR',
          parent: '',
          manager: '周敏',
          staffCount: 6,
          branch: 'SH-HQ',
          status: 'active'
        }
      ]
      _persistDepts()
    }

    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    companyInfo,
    branches,
    departments,
    branchCount,
    deptCount,
    staffCount,
    saveCompanyInfo,
    addBranch,
    updateBranch,
    deleteBranch,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    replaceData,
    initSeedData
  }
})
