/**
 * WarehouseLocations.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、表单验证、导出、删除确认
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import WarehouseLocations from '@/modules/warehouse/views/WarehouseLocations.vue'
import { useWarehouseLocationStore } from '@/modules/warehouse/stores/warehouseLocation'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'

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
    roleName: '测试用户'
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(WarehouseLocations, {
    global: {
      stubs: { Icon: IconStub },
      plugins: []
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedLocations(store, count = 5) {
  const areas = ['合格品区', '待检区', '不合格品区', '隔离区', '回料区', '危险品区']
  for (let i = 0; i < count; i++) {
    store.addLocation({
      locationCode: `CK0${(i % 3) + 1}-YL-A-${String(i + 1).padStart(2, '0')}`,
      warehouseName: ['原料一库', '成品库', '危化品库'][i % 3],
      areaName: areas[i % areas.length],
      manager: `管理员${i + 1}`,
      managerPhone: `1380000${String(1001 + i)}`,
      notes: `测试备注${i + 1}`
    })
  }
}

describe('WarehouseLocations 组件', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    invStore = useInventoryStore()
    store = useWarehouseLocationStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('仓库库位档案')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('精细化管理')
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无库位数据')
    })

    it('有数据时应渲染表格行', () => {
      seedLocations(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示紧凑指标条数据', () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()
      const metrics = wrapper.findAll('.compact-metric-value')
      expect(metrics[0].text()).toBe('5') // 总库位数
    })

    it('应渲染库区分布统计卡片', () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.area-stats-grid').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按库位编码搜索应过滤结果', async () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('CK01')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('CK01')
      })
    })

    it('按仓库名称搜索应过滤结果', async () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('成品库')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThan(0)
      rows.forEach(row => {
        expect(row.text()).toContain('成品库')
      })
    })

    it('按库区过滤应过滤结果', async () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.findAll('select.form-select')[0]
      await select.setValue('待检区')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('待检区')
      })
    })

    it('搜索和过滤条件变更时应重置到第一页', async () => {
      seedLocations(store, 25)
      const wrapper = mountComponent()

      // 模拟翻到第二页
      wrapper.vm.currentPage = 2
      await flushPromises()
      expect(wrapper.vm.currentPage).toBe(2)

      // 搜索触发重置
      const input = wrapper.find('input.form-input')
      await input.setValue('CK')
      await flushPromises()
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedLocations(store, 25)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination-bar').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination-bar').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedLocations(store, 25)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.pagination-btn')[3] // > 按钮
      await nextBtn.trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('切换每页条数应生效', async () => {
      seedLocations(store, 25)
      const wrapper = mountComponent()
      await flushPromises()

      // 直接修改 pageSize ref 验证分页逻辑
      wrapper.vm.pageSize = 10
      await flushPromises()
      expect(wrapper.vm.paginatedLocations.length).toBeLessThanOrEqual(10)
    })
  })

  /* ===== 新增库位 ===== */
  describe('新增库位', () => {
    it('点击新增库位按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.find('.modal-panel').exists()).toBe(true)
    })

    it('新增弹窗表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      expect(wrapper.vm.formData.areaName).toBe('合格品区')
      expect(wrapper.vm.formData.locationCode).toBe('')
      expect(wrapper.vm.editingId).toBeNull()
    })

    it('必填字段为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      await wrapper.vm.handleSave()

      expect(wrapper.vm.formErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.formErrors).toContain('请输入库位编码')
    })

    it('填写完整信息后提交应新增库位', async () => {
      seedLocations(store, 0)
      const wrapper = mountComponent()

      await wrapper.vm.openAddModal()
      wrapper.vm.formData.locationCode = 'CK01-NEW-01'
      wrapper.vm.formData.warehouseName = '新仓库'
      wrapper.vm.formData.areaName = '合格品区'
      wrapper.vm.formData.manager = '张三'
      wrapper.vm.formData.managerPhone = '13800001111'

      await wrapper.vm.handleSave()
      await flushPromises()

      expect(store.locations).toHaveLength(1)
      expect(store.locations[0].locationCode).toBe('CK01-NEW-01')
      expect(wrapper.vm.showModal).toBe(false)
    })

    it('库位编码重复时应提示错误', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()

      await wrapper.vm.openAddModal()
      wrapper.vm.formData.locationCode = store.locations[0].locationCode
      wrapper.vm.formData.warehouseName = '仓库'
      wrapper.vm.formData.areaName = '合格品区'
      wrapper.vm.formData.manager = '管理员'
      wrapper.vm.formData.managerPhone = '13800001111'

      await wrapper.vm.handleSave()

      expect(wrapper.vm.formErrors).toContain(`库位编码 ${store.locations[0].locationCode} 已存在`)
    })
  })

  /* ===== 编辑库位 ===== */
  describe('编辑库位', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.btn-ghost')[0]
      await editBtn.trigger('click')

      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.editingId).toBe(store.locations[0].id)
      expect(wrapper.vm.formData.locationCode).toBe(store.locations[0].locationCode)
    })

    it('编辑时库位编码字段应为只读', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.btn-ghost')[0]
      await editBtn.trigger('click')

      const codeInput = wrapper.find('input[placeholder*="仓库-库区"]')
      expect(codeInput.attributes('readonly')).toBeDefined()
    })

    it('编辑提交应更新库位数据', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.openEditModal(store.locations[0])
      wrapper.vm.formData.manager = '新管理员'
      await wrapper.vm.handleSave()
      await flushPromises()

      expect(store.locations[0].manager).toBe('新管理员')
    })
  })

  /* ===== 删除库位 ===== */
  describe('删除库位', () => {
    it('删除空库位应弹出确认对话框', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtn = wrapper.findAll('.btn-ghost')[1]
      await deleteBtn.trigger('click')

      expect(wrapper.vm.showDeleteConfirm).toBe(true)
      expect(wrapper.vm.deleteConfirmData.type).toBe('confirm')
    })

    it('确认删除应移除库位', async () => {
      seedLocations(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const locId = store.locations[0].id
      await wrapper.vm.handleDelete(locId)
      await wrapper.vm.confirmDeleteLocation()
      await flushPromises()

      expect(store.locations.find(l => l.id === locId)).toBeUndefined()
    })

    it('删除有关联物料的库位应提示无法删除', async () => {
      seedLocations(store, 1)
      const loc = store.locations[0]
      invStore.addInventoryItem({
        code: 'MTL-001',
        name: '物料A',
        quantity: 100,
        locationId: loc.id
      })

      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleDelete(loc.id)
      expect(wrapper.vm.deleteConfirmData.type).toBe('hasStock')
      expect(wrapper.vm.deleteConfirmData.message).toContain('种物料')
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showModal).toBe(true)

      await wrapper.vm.closeModal()
      expect(wrapper.vm.showModal).toBe(false)
      expect(wrapper.vm.editingId).toBeNull()
    })

    it('点击弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click.self')
      expect(wrapper.vm.showModal).toBe(false)
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出应提示暂无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.handleExport()
      expect(alertSpy).toHaveBeenCalledWith('暂无数据可导出')

      alertSpy.mockRestore()
    })

    it('有数据时导出应创建 Blob 并触发下载', async () => {
      seedLocations(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.handleExport()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 列配置 ===== */
  describe('列配置', () => {
    it('点击列按钮应切换列配置下拉', async () => {
      const wrapper = mountComponent()
      const colBtn = wrapper.find('.column-config-wrapper .btn')

      await colBtn.trigger('click')
      expect(wrapper.vm.showColumnConfig).toBe(true)

      await colBtn.trigger('click')
      expect(wrapper.vm.showColumnConfig).toBe(false)
    })

    it('列配置下拉应包含可隐藏的列', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.toggleColumnConfig({ currentTarget: { getBoundingClientRect: () => ({ bottom: 100, left: 100 }) } })

      const items = wrapper.findAll('.column-config-item')
      expect(items.length).toBeGreaterThan(0)
    })

    it('取消勾选列应隐藏对应列', async () => {
      seedLocations(store, 2)
      const wrapper = mountComponent()

      // 默认显示库位编码列
      expect(wrapper.findAll('th').some(th => th.text().includes('库位编码'))).toBe(true)

      // 取消勾选
      wrapper.vm.columnVisible.locationCode = false
      await flushPromises()

      // 表头中不应再包含库位编码
      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('库位编码')
    })
  })

  /* ===== 概览面板折叠 ===== */
  describe('概览面板折叠', () => {
    it('点击概览面板标题应切换展开状态', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showLocationStatsExpanded).toBe(false)

      const header = wrapper.find('.collapsible-stats-header')
      await header.trigger('click')
      expect(wrapper.vm.showLocationStatsExpanded).toBe(true)

      await header.trigger('click')
      expect(wrapper.vm.showLocationStatsExpanded).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('occupiedCount 应正确计算已占用库位数', async () => {
      seedLocations(store, 3)
      // 给第一个库位添加物料
      invStore.addInventoryItem({
        code: 'MTL-001',
        name: '物料A',
        quantity: 100,
        locationId: store.locations[0].id
      })

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.occupiedCount).toBe(1)
    })

    it('emptyCount 应正确计算空库位数', async () => {
      seedLocations(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.emptyCount).toBe(3)
    })

    it('occupancyRate 应正确计算利用率', async () => {
      seedLocations(store, 4)
      invStore.addInventoryItem({
        code: 'MTL-001',
        name: '物料A',
        quantity: 100,
        locationId: store.locations[0].id
      })

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.occupancyRate).toBe(25) // 1/4 = 25%
    })

    it('无库位时利用率应为 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.occupancyRate).toBe(0)
    })

    it('warehouseStats 应正确统计仓库分布', () => {
      seedLocations(store, 5)
      const wrapper = mountComponent()

      const stats = wrapper.vm.warehouseStats
      expect(stats.length).toBeGreaterThan(0)
      stats.forEach(s => {
        expect(s).toHaveProperty('name')
        expect(s).toHaveProperty('count')
        expect(s).toHaveProperty('percent')
        expect(s).toHaveProperty('color')
      })
    })

    it('locationAlerts 应识别空库位和高占用预警', async () => {
      seedLocations(store, 3)
      // 给第一个库位添加5种物料（高占用）
      for (let i = 0; i < 5; i++) {
        invStore.addInventoryItem({
          code: `MTL-HIGH-${i}`,
          name: `物料${i}`,
          quantity: 100,
          locationId: store.locations[0].id
        })
      }

      const wrapper = mountComponent()
      await flushPromises()

      const alerts = wrapper.vm.locationAlerts
      const highAlerts = alerts.filter(a => a.alertType === 'high')
      const emptyAlerts = alerts.filter(a => a.alertType === 'empty')
      expect(highAlerts.length).toBeGreaterThan(0)
      expect(emptyAlerts.length).toBeGreaterThan(0)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应注册全局点击事件监听', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      mountComponent()
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
      addSpy.mockRestore()
    })

    it('卸载时应移除全局点击事件监听', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
      removeSpy.mockRestore()
    })

    it('点击列配置外部区域应关闭下拉', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.toggleColumnConfig({ currentTarget: { getBoundingClientRect: () => ({ bottom: 100, left: 100 }) } })
      expect(wrapper.vm.showColumnConfig).toBe(true)

      // 模拟点击外部
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: document.body })
      document.dispatchEvent(clickEvent)

      expect(wrapper.vm.showColumnConfig).toBe(false)
    })
  })
})
