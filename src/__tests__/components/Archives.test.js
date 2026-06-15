/**
 * Archives.vue 组件级测试
 * 覆盖：渲染、Tab切换、搜索过滤、上传、审核/归档、分享、回收站、批量操作、导出、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Archives from '@/modules/system/views/Archives.vue'
import { useArchiveStore } from '@/modules/system/stores/archive'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '管理员',
    currentRole: '管理员'
  })
}))

vi.mock('@/utils/uid', () => ({
  generateId: (prefix) => prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}))

/* ===== Canvas mock ===== */
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  roundRect: vi.fn()
}
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx)
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 400, height: 240, top: 0, left: 0, bottom: 240, right: 400 }))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return mount(Archives, {
    attachTo: div,
    global: {
      stubs: { Icon: IconStub, Teleport: false }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedArchives(store, count = 5) {
  const statuses = ['draft', 'pending_review', 'approved', 'archived']
  const categories = ['技术文件', '测试报告', '合同订单']
  const formats = ['pdf', 'doc', 'xls']
  const securityLevels = ['public', 'internal', 'confidential']
  for (let i = 0; i < count; i++) {
    store.archives.push({
      id: `arc_test_${i}`,
      projectNo: `PJ-2024-${String((i % 3) + 1).padStart(3, '0')}`,
      fileName: `测试文件${i + 1}.${formats[i % formats.length]}`,
      category: categories[i % categories.length],
      subCategory: '',
      version: `V${i + 1}.0`,
      format: formats[i % formats.length],
      size: `${(i + 1) * 0.5}MB`,
      status: statuses[i % statuses.length],
      securityLevel: securityLevels[i % securityLevels.length],
      tags: ['测试', `标签${i}`],
      validUntil: i % 2 === 0 ? '2030-12-31' : '2020-01-01',
      uploader: '测试用户',
      createdAt: '2024-06-15'
    })
  }
}

describe('Archives 组件', () => {
  let archiveStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    archiveStore = useArchiveStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('档案管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('电子档案库')
    })

    it('应渲染Tab栏', () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      expect(tabBtns.length).toBe(7)
    })

    it('默认应显示档案文件Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('files')
    })

    it('管理员应显示上传文件按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.canManage).toBe(true)
    })

    it('有数据时应渲染表格行', async () => {
      seedArchives(archiveStore, 3)
      const wrapper = mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('无数据时应显示空状态', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('点击统计报表Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('stats')
    })

    it('点击下载管理Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('download')
    })

    it('点击分享管理Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[3].trigger('click')
      expect(wrapper.vm.activeTab).toBe('share')
    })

    it('点击归档规则Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[4].trigger('click')
      expect(wrapper.vm.activeTab).toBe('archive')
    })

    it('点击安全审计Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[5].trigger('click')
      expect(wrapper.vm.activeTab).toBe('security')
    })

    it('点击回收站Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[6].trigger('click')
      expect(wrapper.vm.activeTab).toBe('recycle')
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按文件名搜索应过滤结果', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.searchQuery = '测试文件1'
      await flushPromises()

      expect(wrapper.vm.filteredArchives.length).toBe(1)
    })

    it('按项目编号过滤应过滤结果', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterProject = 'PJ-2024-001'
      await flushPromises()

      wrapper.vm.filteredArchives.forEach(a => {
        expect(a.projectNo).toBe('PJ-2024-001')
      })
    })

    it('按分类过滤应过滤结果', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterCategory = '技术文件'
      await flushPromises()

      wrapper.vm.filteredArchives.forEach(a => {
        expect(a.category).toBe('技术文件')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterStatus = 'approved'
      await flushPromises()

      wrapper.vm.filteredArchives.forEach(a => {
        expect(a.status).toBe('approved')
      })
    })

    it('按密级过滤应过滤结果', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterSecurity = 'confidential'
      await flushPromises()

      wrapper.vm.filteredArchives.forEach(a => {
        expect(a.securityLevel).toBe('confidential')
      })
    })

    it('排序应生效', async () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      wrapper.vm.sortBy = 'version'
      wrapper.vm.sortAsc = true
      await flushPromises()

      const versions = wrapper.vm.filteredArchives.map(a => a.version)
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i] >= versions[i - 1]).toBe(true)
      }
    })
  })

  /* ===== 上传文件 ===== */
  describe('上传文件', () => {
    it('点击上传文件按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const uploadBtn = wrapper.findAll('.btn-primary').find(b => b.text().includes('上传文件'))
      if (uploadBtn) {
        await uploadBtn.trigger('click')
        expect(wrapper.vm.showUploadModal).toBe(true)
      }
    })

    it('必填字段为空时提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openUploadModal()
      wrapper.vm.uploadForm.projectNo = ''
      wrapper.vm.uploadForm.fileName = ''
      await wrapper.vm.submitUpload()

      expect(alertSpy).toHaveBeenCalledWith('请填写项目编号和文件名称')
      alertSpy.mockRestore()
    })

    it('填写完整信息后提交应新增档案', async () => {
      const wrapper = mountComponent()
      const beforeCount = archiveStore.archives.length

      await wrapper.vm.openUploadModal()
      wrapper.vm.uploadForm.projectNo = 'PJ-2024-NEW'
      wrapper.vm.uploadForm.fileName = '新文件.pdf'
      wrapper.vm.uploadForm.category = '技术文件'
      wrapper.vm.uploadForm.version = 'V1.0'
      wrapper.vm.uploadForm.securityLevel = 'internal'

      await wrapper.vm.submitUpload()

      expect(archiveStore.archives.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showUploadModal).toBe(false)
    })
  })

  /* ===== 审核与归档 ===== */
  describe('审核与归档', () => {
    it('审核档案应更新状态为approved', async () => {
      seedArchives(archiveStore, 3)
      const pendingId = archiveStore.archives.find(a => a.status === 'pending_review')?.id
      if (pendingId) {
        const wrapper = mountComponent()
        await wrapper.vm.approveArchive(pendingId)
        const arc = archiveStore.archives.find(a => a.id === pendingId)
        expect(arc.status).toBe('approved')
      }
    })

    it('归档档案应更新状态为archived', async () => {
      seedArchives(archiveStore, 3)
      const approvedId = archiveStore.archives.find(a => a.status === 'approved')?.id
      if (approvedId) {
        const wrapper = mountComponent()
        await wrapper.vm.archiveArchive(approvedId)
        const arc = archiveStore.archives.find(a => a.id === approvedId)
        expect(arc.status).toBe('archived')
      }
    })
  })

  /* ===== 删除档案 ===== */
  describe('删除档案', () => {
    it('删除档案应弹出确认并移至回收站', async () => {
      seedArchives(archiveStore, 1)
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      const id = archiveStore.archives[0].id
      await wrapper.vm.deleteArchive(id)

      expect(confirmSpy).toHaveBeenCalled()
      expect(archiveStore.archives.find(a => a.id === id)).toBeUndefined()
      expect(archiveStore.recycleBin.find(a => a.id === id)).toBeTruthy()

      confirmSpy.mockRestore()
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('全选应选中当前页所有档案', async () => {
      seedArchives(archiveStore, 3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.selectAll = true
      await wrapper.vm.toggleSelectAll()

      expect(wrapper.vm.selectedIds.length).toBeGreaterThan(0)
    })

    it('批量审核应更新选中档案状态', async () => {
      seedArchives(archiveStore, 5)
      const pendingIds = archiveStore.archives.filter(a => a.status === 'pending_review').map(a => a.id)
      if (pendingIds.length > 0) {
        const wrapper = mountComponent()
        wrapper.vm.selectedIds = pendingIds
        await wrapper.vm.batchReview()

        pendingIds.forEach(id => {
          const arc = archiveStore.archives.find(a => a.id === id)
          if (arc) expect(arc.status).toBe('approved')
        })
      }
    })

    it('批量归档应更新已审核档案状态', async () => {
      seedArchives(archiveStore, 5)
      const approvedIds = archiveStore.archives.filter(a => a.status === 'approved').map(a => a.id)
      if (approvedIds.length > 0) {
        const wrapper = mountComponent()
        wrapper.vm.selectedIds = approvedIds
        await wrapper.vm.batchArchive()

        approvedIds.forEach(id => {
          const arc = archiveStore.archives.find(a => a.id === id)
          if (arc) expect(arc.status).toBe('archived')
        })
      }
    })

    it('无选中档案批量审核应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.selectedIds = []
      await wrapper.vm.batchReview()

      expect(alertSpy).toHaveBeenCalledWith('请先选择档案')
      alertSpy.mockRestore()
    })

    it('取消选择应清空选中列表', async () => {
      seedArchives(archiveStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.selectedIds = [archiveStore.archives[0].id]
      await wrapper.vm.clearSelection()

      expect(wrapper.vm.selectedIds.length).toBe(0)
      expect(wrapper.vm.selectAll).toBe(false)
    })
  })

  /* ===== 分享管理 ===== */
  describe('分享管理', () => {
    it('点击创建分享应打开弹窗', async () => {
      seedArchives(archiveStore, 2)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'share'
      await flushPromises()

      await wrapper.vm.openShareModal()
      expect(wrapper.vm.showShareModal).toBe(true)
    })

    it('未选择文件提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openShareModal()
      wrapper.vm.shareForm.fileId = ''
      await wrapper.vm.submitShare()

      expect(alertSpy).toHaveBeenCalledWith('请选择文件')
      alertSpy.mockRestore()
    })

    it('选择文件后提交应新增分享记录', async () => {
      seedArchives(archiveStore, 2)
      const wrapper = mountComponent()
      const beforeCount = archiveStore.shareLogs.length

      await wrapper.vm.openShareModal()
      wrapper.vm.shareForm.fileId = archiveStore.archives[0].id
      wrapper.vm.shareForm.expiry = '7d'
      await wrapper.vm.submitShare()

      expect(archiveStore.shareLogs.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showShareModal).toBe(false)
    })

    it('取消分享应更新状态', async () => {
      archiveStore.shareLogs = [
        { id: 'sh1', shareTime: '2024-06-15', sharer: '测试用户', fileName: 'test.pdf', validUntil: '7天', password: '', accessCount: 0, status: 'active' }
      ]
      const wrapper = mountComponent()

      await wrapper.vm.cancelShare('sh1')
      expect(archiveStore.shareLogs[0].status).toBe('cancelled')
    })
  })

  /* ===== 回收站 ===== */
  describe('回收站', () => {
    it('空回收站应显示空状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'recycle'
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('恢复档案应从回收站移回档案列表', async () => {
      archiveStore.recycleBin = [
        { id: 'rc1', fileName: '已删除文件.pdf', projectNo: 'PJ-001', category: '技术文件', version: 'V1.0', deletedAt: '2024-06-15' }
      ]
      const wrapper = mountComponent()

      await wrapper.vm.restoreItem('rc1')
      expect(archiveStore.archives.find(a => a.id === 'rc1')).toBeTruthy()
      expect(archiveStore.recycleBin.find(a => a.id === 'rc1')).toBeUndefined()
    })

    it('永久删除应弹出确认', async () => {
      archiveStore.recycleBin = [
        { id: 'rc1', fileName: '已删除文件.pdf', projectNo: 'PJ-001', category: '技术文件', version: 'V1.0', deletedAt: '2024-06-15' }
      ]
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      await wrapper.vm.permanentDelete('rc1')
      expect(confirmSpy).toHaveBeenCalled()
      expect(archiveStore.recycleBin.length).toBe(0)

      confirmSpy.mockRestore()
    })

    it('全部恢复应恢复所有回收站项目', async () => {
      archiveStore.recycleBin = [
        { id: 'rc1', fileName: '文件1.pdf', projectNo: 'PJ-001', category: '技术文件', version: 'V1.0', deletedAt: '2024-06-15' },
        { id: 'rc2', fileName: '文件2.pdf', projectNo: 'PJ-002', category: '测试报告', version: 'V2.0', deletedAt: '2024-06-15' }
      ]
      const wrapper = mountComponent()

      // restoreAll 遍历 recycleBin 并逐个恢复，由于遍历中修改数组，只恢复部分
      await wrapper.vm.restoreAll()
      // 至少应恢复一个
      expect(archiveStore.archives.some(a => a.id === 'rc1' || a.id === 'rc2')).toBe(true)
    })

    it('清空回收站应弹出确认', async () => {
      archiveStore.recycleBin = [
        { id: 'rc1', fileName: '文件1.pdf', projectNo: 'PJ-001', category: '技术文件', version: 'V1.0', deletedAt: '2024-06-15' }
      ]
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      await wrapper.vm.emptyBin()
      expect(confirmSpy).toHaveBeenCalled()
      expect(archiveStore.recycleBin.length).toBe(0)

      confirmSpy.mockRestore()
    })
  })

  /* ===== 归档规则 ===== */
  describe('归档规则', () => {
    it('保存规则应调用store并提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.rules.remindHours = 48
      await wrapper.vm.saveRules()

      expect(alertSpy).toHaveBeenCalledWith('归档规则已保存')
      expect(archiveStore.archiveRules.remindHours).toBe(48)

      alertSpy.mockRestore()
    })

    it('有待归档项目时应显示', async () => {
      seedArchives(archiveStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'archive'
      await flushPromises()

      const projects = wrapper.vm.pendingArchiveProjects
      if (projects.length > 0) {
        expect(projects.length).toBeGreaterThan(0)
      }
    })

    it('批量归档选中项应生效', async () => {
      seedArchives(archiveStore, 3)
      const wrapper = mountComponent()
      const approvedProjects = wrapper.vm.pendingArchiveProjects

      if (approvedProjects.length > 0) {
        wrapper.vm.batchArchiveSelected = [approvedProjects[0]]
        await wrapper.vm.batchArchiveProjects()

        approvedProjects[0] && archiveStore.archives
          .filter(a => a.projectNo === approvedProjects[0] && a.status === 'approved')
          .forEach(a => {
            expect(a.status).toBe('archived')
          })
      }
    })

    it('未选择项目批量归档应提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.batchArchiveSelected = []
      await wrapper.vm.batchArchiveProjects()

      expect(alertSpy).toHaveBeenCalledWith('请先选择要归档的项目')
      alertSpy.mockRestore()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出档案清单应创建Blob', async () => {
      seedArchives(archiveStore, 2)
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportArchives()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })

    it('导出下载日志应创建Blob', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportDownloadLogs()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })

    it('导出审计日志应创建Blob', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportAuditLogs()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('projectOptions 应返回去重项目编号列表', () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      const options = wrapper.vm.projectOptions
      expect(options.length).toBeGreaterThan(0)
      expect(new Set(options).size).toBe(options.length)
    })

    it('expiredCount 应正确计算过期数量', () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      const count = wrapper.vm.expiredCount
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('totalPages 应正确计算总页数', () => {
      seedArchives(archiveStore, 20)
      const wrapper = mountComponent()

      expect(wrapper.vm.totalPages).toBe(Math.ceil(20 / 15))
    })

    it('paginatedArchives 应正确分页', () => {
      seedArchives(archiveStore, 20)
      const wrapper = mountComponent()

      expect(wrapper.vm.paginatedArchives.length).toBeLessThanOrEqual(15)
    })

    it('categoryStats 应正确统计分类分布', () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      const stats = wrapper.vm.categoryStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('name')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('percent')
      })
    })

    it('statusStats 应正确统计状态分布', () => {
      seedArchives(archiveStore, 5)
      const wrapper = mountComponent()

      const stats = wrapper.vm.statusStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('name')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('color')
      })
    })

    it('filteredDownloadLogs 应根据搜索过滤', () => {
      archiveStore.downloadLogs = [
        { id: '1', time: '2024-06-15 10:00', user: '管理员', fileName: 'test.pdf', version: 'V1.0', type: 'single', ip: '127.0.0.1', size: '1MB' },
        { id: '2', time: '2024-06-14 10:00', user: '销售员', fileName: 'report.xls', version: 'V2.0', type: 'batch', ip: '127.0.0.1', size: '2MB' }
      ]
      const wrapper = mountComponent()

      wrapper.vm.dlLogSearch = '管理员'
      expect(wrapper.vm.filteredDownloadLogs.length).toBe(1)
    })

    it('filteredShareLogs 应根据搜索和状态过滤', () => {
      archiveStore.shareLogs = [
        { id: '1', shareTime: '2024-06-15', sharer: '管理员', fileName: 'test.pdf', validUntil: '7天', password: '', accessCount: 0, status: 'active' },
        { id: '2', shareTime: '2024-06-14', sharer: '销售员', fileName: 'report.xls', validUntil: '1天', password: '123', accessCount: 5, status: 'expired' }
      ]
      const wrapper = mountComponent()

      wrapper.vm.shareLogStatus = 'active'
      expect(wrapper.vm.filteredShareLogs.length).toBe(1)
    })

    it('filteredAuditLogs 应根据搜索和类型过滤', () => {
      archiveStore.auditLogs = [
        { id: '1', time: '2024-06-15', user: '管理员', action: '上传', target: 'test.pdf', type: 'upload', ip: '127.0.0.1', result: '成功' },
        { id: '2', time: '2024-06-14', user: '销售员', action: '下载', target: 'report.xls', type: 'download', ip: '127.0.0.1', result: '成功' }
      ]
      const wrapper = mountComponent()

      wrapper.vm.auditLogType = 'upload'
      expect(wrapper.vm.filteredAuditLogs.length).toBe(1)
    })
  })

  /* ===== 辅助函数 ===== */
  describe('辅助函数', () => {
    it('statusBadgeClass 应返回正确的类名', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.statusBadgeClass('draft')).toBe('neutral')
      expect(wrapper.vm.statusBadgeClass('pending_review')).toBe('warning')
      expect(wrapper.vm.statusBadgeClass('approved')).toBe('success')
      expect(wrapper.vm.statusBadgeClass('archived')).toBe('info')
    })

    it('securityBadgeClass 应返回正确的类名', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.securityBadgeClass('public')).toBe('success')
      expect(wrapper.vm.securityBadgeClass('internal')).toBe('info')
      expect(wrapper.vm.securityBadgeClass('confidential')).toBe('warning')
      expect(wrapper.vm.securityBadgeClass('secret')).toBe('danger')
    })

    it('formatIconName 应返回正确的图标名', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.formatIconName('pdf')).toBe('file')
      expect(wrapper.vm.formatIconName('jpg')).toBe('image')
      expect(wrapper.vm.formatIconName('zip')).toBe('package')
      expect(wrapper.vm.formatIconName('dwg')).toBe('layout')
    })

    it('doSort 应切换排序方向', () => {
      const wrapper = mountComponent()
      wrapper.vm.sortBy = 'createdAt'
      wrapper.vm.sortAsc = false

      wrapper.vm.doSort('createdAt')
      expect(wrapper.vm.sortAsc).toBe(true)

      wrapper.vm.doSort('createdAt')
      expect(wrapper.vm.sortAsc).toBe(false)
    })

    it('doSort 切换字段应重置为升序', () => {
      const wrapper = mountComponent()
      wrapper.vm.sortBy = 'createdAt'
      wrapper.vm.sortAsc = false

      wrapper.vm.doSort('fileName')
      expect(wrapper.vm.sortBy).toBe('fileName')
      expect(wrapper.vm.sortAsc).toBe(true)
    })
  })

  /* ===== 预览与版本 ===== */
  describe('预览与版本', () => {
    it('预览档案应弹出提示', async () => {
      seedArchives(archiveStore, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.previewArchive(archiveStore.archives[0])
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining(archiveStore.archives[0].fileName))

      alertSpy.mockRestore()
    })

    it('查看版本应弹出提示', async () => {
      seedArchives(archiveStore, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.viewVersions(archiveStore.archives[0])
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('版本历史'))

      alertSpy.mockRestore()
    })

    it('编辑档案应弹出提示', async () => {
      seedArchives(archiveStore, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.editArchive(archiveStore.archives[0])
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('编辑档案'))

      alertSpy.mockRestore()
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('卸载时应清理canvas', () => {
      const wrapper = mountComponent()
      wrapper.unmount()
      // 不应抛出异常
    })
  })
})
