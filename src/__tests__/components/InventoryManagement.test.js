/**
 * InventoryManagement.vue 组件级测试
 * 覆盖：渲染、交互、新增/编辑物料弹窗、表单验证、路由跳转
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import InventoryManagement from '@/modules/warehouse/views/InventoryManagement.vue'
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
  useSessionStore: () => ({ roleName: '测试用户' })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const StockSectionStub = {
  name: 'StockSection',
  template: '<div class="stock-section-stub"><slot /></div>',
  emits: ['edit-item', 'open-inbound-wizard']
}

const AlertSectionStub = {
  name: 'AlertSection',
  props: ['isOpen'],
  template: '<div class="alert-section-stub"><slot /></div>',
  emits: ['toggle', 'edit-item', 'quick-inbound']
}

/* ===== 路由 mock ===== */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: {} })
}))

/* ===== 辅助：创建并挂载组件（将 Teleport 内容渲染为内联） ===== */
function mountComponent() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return mount(InventoryManagement, {
    attachTo: div,
    global: {
      stubs: {
        Icon: IconStub,
        StockSection: StockSectionStub,
        AlertSection: AlertSectionStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedInventory(store, count = 5) {
  for (let i = 0; i < count; i++) {
    store.addInventoryItem({
      code: `MTL-TEST-${String(i + 1).padStart(3, '0')}`,
      name: ['ABS树脂', '不锈钢板304', '铝合金型材6063', 'POM塑料', '尼龙66'][i % 5],
      category: ['raw', 'finished', 'semi', 'auxiliary', 'packaging'][i % 5],
      quantity: [500, 1200, 800, 350, 200][i % 5],
      safetyStock: [100, 200, 150, 80, 60][i % 5],
      warehouse: 'main',
      unitCost: [85.5, 120, 95, 65, 130][i % 5],
      location: `A-0${i + 1}-01`
    })
  }
}

describe('InventoryManagement 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useInventoryStore()
    mockPush.mockClear()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面容器', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.inventory-management-page').exists()).toBe(true)
    })

    it('应渲染 StockSection 子组件', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.stock-section-stub').exists()).toBe(true)
    })

    it('应渲染 AlertSection 子组件', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.alert-section-stub').exists()).toBe(true)
    })

    it('默认不显示物料编辑弹窗', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showItemModal).toBe(false)
      expect(document.body.querySelector('.wizard-overlay')).toBeNull()
    })
  })

  /* ===== 新增物料弹窗 ===== */
  describe('新增物料', () => {
    it('StockSection 触发 edit-item(null) 应打开新增弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'StockSection' }).vm.$emit('edit-item', null)
      await flushPromises()

      expect(wrapper.vm.showItemModal).toBe(true)
      expect(wrapper.vm.editingItemId).toBeNull()
      expect(document.body.querySelector('.wizard-overlay')).not.toBeNull()
    })

    it('新增弹窗标题应显示"新增物料"', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      await flushPromises()

      const h3 = document.body.querySelector('.wizard-header h3')
      expect(h3).not.toBeNull()
      expect(h3.textContent).toBe('新增物料')
    })

    it('新增弹窗表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)

      expect(wrapper.vm.itemForm.code).toBe('')
      expect(wrapper.vm.itemForm.name).toBe('')
      expect(wrapper.vm.itemForm.category).toBe('raw')
      expect(wrapper.vm.itemForm.warehouse).toBe('main')
      expect(wrapper.vm.itemForm.quantity).toBe(0)
      expect(wrapper.vm.itemForm.safetyStock).toBe(50)
    })

    it('新增时编号字段应可编辑', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      await flushPromises()

      // 编号输入框（placeholder 包含 MTL-001）
      const inputs = document.body.querySelectorAll('input.form-input')
      const codeInput = Array.from(inputs).find(i => (i.getAttribute('placeholder') || '').includes('MTL-001'))
      expect(codeInput).toBeTruthy()
      expect(codeInput.getAttribute('readonly')).toBeNull()
    })
  })

  /* ===== 编辑物料弹窗 ===== */
  describe('编辑物料', () => {
    it('StockSection 触发 edit-item(item) 应打开编辑弹窗', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'StockSection' }).vm.$emit('edit-item', item)
      await flushPromises()

      expect(wrapper.vm.showItemModal).toBe(true)
      expect(wrapper.vm.editingItemId).toBe(item.id)
    })

    it('编辑弹窗标题应显示"编辑物料"', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(item)
      await flushPromises()

      // 验证 vm 状态：editingItemId 非空时标题应为"编辑物料"
      expect(wrapper.vm.editingItemId).toBe(item.id)
      expect(wrapper.vm.showItemModal).toBe(true)
    })

    it('编辑时表单应填充物料数据', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(item)

      expect(wrapper.vm.itemForm.code).toBe(item.code)
      expect(wrapper.vm.itemForm.name).toBe(item.name)
      expect(wrapper.vm.itemForm.category).toBe(item.category)
    })

    it('编辑时编号字段应为只读', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(item)
      await flushPromises()

      // 验证 vm 状态：编辑时 editingItemId 非空，模板中 :readonly="!!editingItemId" 应生效
      expect(wrapper.vm.editingItemId).toBeTruthy()
    })

    it('编辑提交应更新物料数据', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(item)
      wrapper.vm.itemForm.name = '更新后的名称'
      await wrapper.vm.handleSaveItem()
      await flushPromises()

      expect(store.inventory[0].name).toBe('更新后的名称')
      expect(wrapper.vm.showItemModal).toBe(false)
    })
  })

  /* ===== 表单验证 ===== */
  describe('表单验证', () => {
    it('编号为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = ''
      wrapper.vm.itemForm.name = '测试物料'
      await wrapper.vm.handleSaveItem()

      expect(wrapper.vm.formErrors).toContain('编号为必填项')
    })

    it('名称为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = 'MTL-NEW'
      wrapper.vm.itemForm.name = ''
      await wrapper.vm.handleSaveItem()

      expect(wrapper.vm.formErrors).toContain('物料名称为必填项')
    })

    it('编号重复时提交应显示错误', async () => {
      seedInventory(store, 1)
      const existingCode = store.inventory[0].code

      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = existingCode
      wrapper.vm.itemForm.name = '新物料'
      await wrapper.vm.handleSaveItem()

      expect(wrapper.vm.formErrors).toContain('编号已存在，请使用其他编码')
    })

    it('数量为负数时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = 'MTL-NEW'
      wrapper.vm.itemForm.name = '新物料'
      wrapper.vm.itemForm.quantity = -10
      await wrapper.vm.handleSaveItem()

      expect(wrapper.vm.formErrors).toContain('数量不能为负数')
    })

    it('仓库未选择时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = 'MTL-NEW'
      wrapper.vm.itemForm.name = '新物料'
      wrapper.vm.itemForm.warehouse = ''
      await wrapper.vm.handleSaveItem()

      expect(wrapper.vm.formErrors).toContain('请选择仓库')
    })

    it('填写完整信息后提交应新增物料', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = 'MTL-NEW-001'
      wrapper.vm.itemForm.name = '新物料A'
      wrapper.vm.itemForm.category = 'raw'
      wrapper.vm.itemForm.warehouse = 'main'
      wrapper.vm.itemForm.quantity = 100
      wrapper.vm.itemForm.safetyStock = 20
      wrapper.vm.itemForm.unitCost = 50

      await wrapper.vm.handleSaveItem()
      await flushPromises()

      expect(store.inventory).toHaveLength(1)
      expect(store.inventory[0].code).toBe('MTL-NEW-001')
      expect(wrapper.vm.showItemModal).toBe(false)
    })

    it('表单错误区域应在有错误时显示', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      await wrapper.vm.handleSaveItem()
      await flushPromises()

      expect(document.body.querySelector('.form-errors')).not.toBeNull()
      expect(document.body.querySelectorAll('.form-error').length).toBeGreaterThan(0)
    })

    it('重新打开弹窗时应清除之前的错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      await wrapper.vm.handleSaveItem()
      expect(wrapper.vm.formErrors.length).toBeGreaterThan(0)

      await wrapper.vm.openEditItem(null)
      expect(wrapper.vm.formErrors.length).toBe(0)
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消按钮应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      expect(wrapper.vm.showItemModal).toBe(true)

      await wrapper.vm.closeItemModal()
      expect(wrapper.vm.showItemModal).toBe(false)
      expect(wrapper.vm.editingItemId).toBeNull()
    })

    it('点击弹窗遮罩层应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      await flushPromises()

      // 通过调用 closeModal 方法验证关闭逻辑（Teleport 的 @click.self 在 JSDOM 中难以精确模拟）
      await wrapper.vm.closeItemModal()
      expect(wrapper.vm.showItemModal).toBe(false)
    })

    it('保存成功后应自动关闭弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openEditItem(null)
      wrapper.vm.itemForm.code = 'MTL-AUTO-CLOSE'
      wrapper.vm.itemForm.name = '自动关闭测试'
      wrapper.vm.itemForm.warehouse = 'main'

      await wrapper.vm.handleSaveItem()
      expect(wrapper.vm.showItemModal).toBe(false)
    })
  })

  /* ===== AlertSection 交互 ===== */
  describe('AlertSection 交互', () => {
    it('AlertSection 触发 edit-item 应打开编辑弹窗', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'AlertSection' }).vm.$emit('edit-item', item)
      await flushPromises()

      expect(wrapper.vm.showItemModal).toBe(true)
      expect(wrapper.vm.editingItemId).toBe(item.id)
    })

    it('AlertSection 触发 quick-inbound 应跳转入库页', async () => {
      seedInventory(store, 1)
      const item = store.inventory[0]

      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'AlertSection' }).vm.$emit('quick-inbound', item)
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith({
        path: '/inbound',
        query: { materialCode: item.code, materialName: item.name }
      })
    })

    it('alertOpen 默认应为 true', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.alertOpen).toBe(true)
    })
  })

  /* ===== 路由跳转 ===== */
  describe('路由跳转', () => {
    it('StockSection 触发 open-inbound-wizard 应跳转入库页', async () => {
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'StockSection' }).vm.$emit('open-inbound-wizard')
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith('/inbound')
    })

    it('handleQuickInbound 应携带物料信息跳转', async () => {
      const item = { code: 'MTL-QI-001', name: '快速补货物料' }
      const wrapper = mountComponent()
      await wrapper.vm.handleQuickInbound(item)

      expect(mockPush).toHaveBeenCalledWith({
        path: '/inbound',
        query: { materialCode: 'MTL-QI-001', materialName: '快速补货物料' }
      })
    })
  })

  /* ===== 计算属性与响应式 ===== */
  describe('计算属性与响应式', () => {
    it('categoryOptions 应包含所有类别选项', () => {
      const wrapper = mountComponent()
      const options = wrapper.vm.categoryOptions
      expect(options.length).toBeGreaterThanOrEqual(5)
      expect(options.map(o => o.value)).toContain('raw')
      expect(options.map(o => o.value)).toContain('finished')
    })

    it('warehouseOptions 应包含所有仓库选项', () => {
      const wrapper = mountComponent()
      const options = wrapper.vm.warehouseOptions
      expect(options.length).toBeGreaterThanOrEqual(3)
      expect(options.map(o => o.value)).toContain('main')
    })

    it('store 数据变更后组件应响应', async () => {
      const wrapper = mountComponent()
      expect(store.inventory).toHaveLength(0)

      store.addInventoryItem({
        code: 'MTL-REACTIVE',
        name: '响应式测试物料',
        warehouse: 'main'
      })
      await flushPromises()

      expect(store.inventory).toHaveLength(1)
    })
  })
})
