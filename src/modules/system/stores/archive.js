import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { generateId } from '@/utils/uid'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_archives'
const DOWNLOAD_LOG_KEY = 'gj_erp_archiveDownloadLogs'
const SHARE_LOG_KEY = 'gj_erp_archiveShareLogs'
const INIT_KEY = 'gj_erp_archives_initialized'
const AUDIT_LOG_KEY = 'gj_erp_archiveAuditLogs'
const RECYCLE_KEY = 'gj_erp_archiveRecycleBin'
const RULES_KEY = 'gj_erp_archiveRules'

const categoryOptions = ['技术文件', '测试报告', '报价单', '合同订单', '客户沟通记录', '竞品资料', '其他资料']
const subCategoryMap = {
  技术文件: ['技术标准', '配方文件', '物性表', '工艺文件', '图纸文件'],
  测试报告: ['内部测试报告', '第三方检测报告', '客户测试报告', '不合格品处理报告'],
  报价单: ['初始报价单', '最终报价单', '变更报价单'],
  合同订单: ['框架合同', '采购订单', '补充协议', '发票扫描件'],
  客户沟通记录: ['邮件往来', '会议纪要', '电话记录', '聊天记录截图'],
  竞品资料: ['竞品样品分析报告', '竞品物性表', '竞品价格信息'],
  其他资料: ['客户资质文件', '供应商资质文件', '行业报告', '项目立项书']
}
const statusLabels = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '审核通过',
  archived: '已归档',
  deleted: '已删除'
}
const securityLabels = {
  public: '公开',
  internal: '内部',
  confidential: '机密',
  secret: '绝密'
}
const formatIcons = {
  pdf: '[文档]',
  doc: '[待办]',
  xls: '[数据]',
  ppt: '[演示]',
  jpg: '[图片]',
  png: '[图片]',
  zip: '[库存]',
  rar: '[库存]',
  dwg: '[布局]',
  other: '[附件]'
}

export const useArchiveStore = defineStore('archive', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const archives = ref(safeGetJSON(STORAGE_KEY) || [])
  const downloadLogs = ref(safeGetJSON(DOWNLOAD_LOG_KEY) || [])
  const shareLogs = ref(safeGetJSON(SHARE_LOG_KEY) || [])
  const auditLogs = ref(safeGetJSON(AUDIT_LOG_KEY) || [])
  const recycleBin = ref(safeGetJSON(RECYCLE_KEY) || [])
  const archiveRules = ref(
    safeGetJSON(RULES_KEY) || {
      remindHours: 72,
      autoArchiveOnProduction: true,
      autoReadonly: true,
      autoDirectory: true,
      pdfExport: true
    }
  )

  const totalCount = computed(() => archives.value.length)
  const approvedCount = computed(() => archives.value.filter((a) => a.status === 'approved').length)
  const pendingCount = computed(() => archives.value.filter((a) => a.status === 'pending_review').length)
  const archivedCount = computed(() => archives.value.filter((a) => a.status === 'archived').length)
  const deletedCount = computed(() => recycleBin.value.length)

  const todayDownloadCount = computed(() => {
    const today = toLocalDateStr()
    return downloadLogs.value.filter((l) => l.time && l.time.startsWith(today)).length
  })
  const totalDownloadCount = computed(() => downloadLogs.value.length)
  const downloadUserCount = computed(() => {
    const users = new Set(downloadLogs.value.map((l) => l.user))
    return users.size
  })

  function _persistArchives() {
    safeSetJSON(STORAGE_KEY, archives.value)
  }
  function _persistDownloadLogs() {
    safeSetJSON(DOWNLOAD_LOG_KEY, downloadLogs.value)
  }
  function _persistShareLogs() {
    safeSetJSON(SHARE_LOG_KEY, shareLogs.value)
  }
  function _persistAuditLogs() {
    safeSetJSON(AUDIT_LOG_KEY, auditLogs.value)
  }
  function _persistRecycleBin() {
    safeSetJSON(RECYCLE_KEY, recycleBin.value)
  }
  function _persistRules() {
    safeSetJSON(RULES_KEY, archiveRules.value)
  }

  function addArchive(data) {
    const item = {
      id: generateId('ar'),
      projectNo: data.projectNo || '',
      fileName: data.fileName || '',
      category: data.category || '其他资料',
      subCategory: data.subCategory || '',
      version: data.version || '1.0',
      format: data.format || 'other',
      size: data.size || '0KB',
      status: data.status || 'draft',
      securityLevel: data.securityLevel || 'internal',
      tags: data.tags || [],
      validUntil: data.validUntil || '',
      uploader: data.uploader || getCurrentUser(),
      createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
      selected: false
    }
    archives.value.push(item)
    _addAuditLog('upload', item.fileName, '上传')
    _persistArchives()
    return item
  }

  function updateArchive(id, updates) {
    const idx = archives.value.findIndex((a) => a.id === id)
    if (idx === -1) return null
    archives.value[idx] = { ...archives.value[idx], ...updates }
    _addAuditLog('edit', archives.value[idx].fileName, '修改')
    _persistArchives()
    return archives.value[idx]
  }

  function deleteArchive(id) {
    const idx = archives.value.findIndex((a) => a.id === id)
    if (idx === -1) return false
    const item = { ...archives.value[idx], deletedAt: new Date().toISOString().slice(0, 10) }
    recycleBin.value.push(item)
    archives.value.splice(idx, 1)
    _addAuditLog('delete', item.fileName, '删除')
    _persistArchives()
    _persistRecycleBin()
    return true
  }

  function restoreArchive(id) {
    const idx = recycleBin.value.findIndex((a) => a.id === id)
    if (idx === -1) return false
    const item = { ...recycleBin.value[idx] }
    delete item.deletedAt
    archives.value.push(item)
    recycleBin.value.splice(idx, 1)
    _persistArchives()
    _persistRecycleBin()
    return true
  }

  function permanentDelete(id) {
    const idx = recycleBin.value.findIndex((a) => a.id === id)
    if (idx === -1) return false
    recycleBin.value.splice(idx, 1)
    _persistRecycleBin()
    return true
  }

  function emptyRecycleBin() {
    recycleBin.value = []
    _persistRecycleBin()
  }

  function batchReview(ids, action) {
    for (const a of archives.value) {
      if (ids.includes(a.id)) {
        if (action === 'approve') a.status = 'approved'
        else if (action === 'reject') a.status = 'draft'
        else if (action === 'archive') a.status = 'archived'
      }
    }
    _addAuditLog('permission', ids.length + '个文件', '批量' + action)
    _persistArchives()
  }

  function addDownloadLog(data) {
    downloadLogs.value.unshift({
      id: generateId('ardl'),
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: data.user || getCurrentUser(),
      fileName: data.fileName || '',
      version: data.version || '',
      type: data.type || 'single',
      ip: data.ip || '127.0.0.1',
      size: data.size || ''
    })
    _persistDownloadLogs()
  }

  function addShareLog(data) {
    shareLogs.value.unshift({
      id: generateId('arsh'),
      shareTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      sharer: data.sharer || getCurrentUser(),
      fileName: data.fileName || '',
      validUntil: data.validUntil || '',
      password: data.password || '',
      accessCount: 0,
      status: 'active'
    })
    _persistShareLogs()
  }

  function cancelShare(id) {
    const s = shareLogs.value.find((s) => s.id === id)
    if (s) {
      s.status = 'cancelled'
      _persistShareLogs()
    }
  }

  function _addAuditLog(type, target, action) {
    auditLogs.value.unshift({
      id: generateId('arau'),
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: getCurrentUser(),
      action: action,
      target: target,
      type: type,
      ip: '127.0.0.1',
      result: '成功'
    })
    if (auditLogs.value.length > 200) auditLogs.value = auditLogs.value.slice(0, 200)
    _persistAuditLogs()
  }

  function saveRules(rules) {
    archiveRules.value = { ...archiveRules.value, ...rules }
    _persistRules()
  }

  function replaceData(newData) {
    archives.value = newData
    _persistArchives()
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    const seeds = [
      {
        id: 'arc1',
        projectNo: 'PJ-2024-001',
        fileName: '产品规格书V2.0.pdf',
        category: '技术文件',
        subCategory: '物性表',
        version: '2.0',
        format: 'pdf',
        size: '2.3MB',
        status: 'approved',
        securityLevel: 'internal',
        tags: ['产品', '规格'],
        validUntil: '2026-12-31',
        uploader: '张工',
        createdAt: '2024-06-15'
      },
      {
        id: 'arc2',
        projectNo: 'PJ-2024-001',
        fileName: '购销合同-华达.pdf',
        category: '合同订单',
        subCategory: '框架合同',
        version: '1.0',
        format: 'pdf',
        size: '1.1MB',
        status: 'archived',
        securityLevel: 'confidential',
        tags: ['合同', '华达'],
        validUntil: '2025-06-30',
        uploader: '李经理',
        createdAt: '2024-05-20'
      },
      {
        id: 'arc3',
        projectNo: 'PJ-2024-002',
        fileName: '来料检验报告-0301.pdf',
        category: '测试报告',
        subCategory: '内部测试报告',
        version: '1.0',
        format: 'pdf',
        size: '0.8MB',
        status: 'pending_review',
        securityLevel: 'internal',
        tags: ['检验', '来料'],
        validUntil: '2025-03-31',
        uploader: '王质检',
        createdAt: '2024-07-01'
      },
      {
        id: 'arc4',
        projectNo: 'PJ-2024-003',
        fileName: '生产作业指导书.pdf',
        category: '技术文件',
        subCategory: '工艺文件',
        version: '3.1',
        format: 'pdf',
        size: '4.5MB',
        status: 'approved',
        securityLevel: 'internal',
        tags: ['生产', '作业'],
        validUntil: '2026-01-31',
        uploader: '赵工',
        createdAt: '2024-04-10'
      },
      {
        id: 'arc5',
        projectNo: 'PJ-2024-002',
        fileName: '报价单-华达2024Q3.xlsx',
        category: '报价单',
        subCategory: '初始报价单',
        version: '1.2',
        format: 'xls',
        size: '0.3MB',
        status: 'draft',
        securityLevel: 'public',
        tags: ['报价', '华达'],
        validUntil: '2024-12-31',
        uploader: '陈销售',
        createdAt: '2024-08-05'
      },
      {
        id: 'arc6',
        projectNo: 'PJ-2024-004',
        fileName: '质量手册2024版.pdf',
        category: '技术文件',
        subCategory: '技术标准',
        version: '4.0',
        format: 'pdf',
        size: '8.2MB',
        status: 'approved',
        securityLevel: 'confidential',
        tags: ['质量', '手册'],
        validUntil: '2026-12-31',
        uploader: '刘经理',
        createdAt: '2024-01-15'
      },
      {
        id: 'arc7',
        projectNo: 'PJ-2024-003',
        fileName: '产品图纸-装配图.dwg',
        category: '技术文件',
        subCategory: '图纸文件',
        version: '2.1',
        format: 'dwg',
        size: '12.5MB',
        status: 'approved',
        securityLevel: 'secret',
        tags: ['图纸', '装配'],
        validUntil: '2026-06-30',
        uploader: '张工',
        createdAt: '2024-03-22'
      },
      {
        id: 'arc8',
        projectNo: 'PJ-2024-001',
        fileName: '出货检验报告-0801.pdf',
        category: '测试报告',
        subCategory: '第三方检测报告',
        version: '1.0',
        format: 'pdf',
        size: '0.6MB',
        status: 'pending_review',
        securityLevel: 'internal',
        tags: ['检验', '出货'],
        validUntil: '2025-08-31',
        uploader: '王质检',
        createdAt: '2024-08-01'
      }
    ]
    archives.value = seeds
    _persistArchives()
    safeSetItem(INIT_KEY, '1')
  }

  return {
    archives,
    downloadLogs,
    shareLogs,
    auditLogs,
    recycleBin,
    archiveRules,
    categoryOptions,
    subCategoryMap,
    statusLabels,
    securityLabels,
    formatIcons,
    totalCount,
    approvedCount,
    pendingCount,
    archivedCount,
    deletedCount,
    todayDownloadCount,
    totalDownloadCount,
    downloadUserCount,
    addArchive,
    updateArchive,
    deleteArchive,
    restoreArchive,
    permanentDelete,
    emptyRecycleBin,
    batchReview,
    addDownloadLog,
    addShareLog,
    cancelShare,
    saveRules,
    replaceData,
    initSeedData
  }
})
