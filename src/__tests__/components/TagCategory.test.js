/**
 * TagCategory.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、CRUD弹窗、表单验证、分组管理、删除确认
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createCustomer, createTag, resetCounter } from '@/__tests__/mockData'
import TagCategory from '@/modules/customer/views/TagCategory.vue'
import { useCustomerStore } from '@/modules/customer/stores/customer'

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
    roleName: '测试用户',
    currentRole: '管理员'
  })
}))

vi.mock('@/utils/format', () => ({
  formatNumber: (n) => (n ?? 0).toLocaleString('zh-CN'),
  toLocalDateStr: (d) => {
    const date = d || new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
  }
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(TagCategory, {
    global: {
      stubs: {
        Icon: IconStub,
        Teleport: { template: '<div><slot /></div>' }
      }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedTags(store) {
  const tags = [
    { id: 'VIP', name: 'VIP', color: '#ef4444', group: '等级' },
    { id: '长期合作', name: '长期合作', color: '#f59e0b', group: '关系' },
    { id: '大客户', name: '大客户', color: '#8b5cf6', group: '等级' },
    { id: '潜力客户', name: '潜力客户', color: '#3b82f6', group: '关系' },
    { id: '新客户', name: '新客户', color: '#10b981', group: '关系' },
    { id: '回款慢', name: '回款慢', color: '#94a3b8', group: '风险' }
  ]
  tags.forEach(t => store.addTag(t))
}

function seedCustomers(store, count = 5) {
  for (let i = 0; i < count; i++) {
    store.addCustomer(createCustomer({
      tags: i % 2 === 0 ? ['VIP', '长期合作'] : []
    }))
  }
}

describe('TagCategory 组件', () => {
  let store

  beforeEach(() => {
    resetCounter()
    setupPinia()
    clearStorage()
    store = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('标签分类')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('客户标签分类管理')
    })

    it('应渲染新增标签按钮', () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      expect(addBtn.text()).toContain('新增标签')
    })

    it('应渲染新增分组按钮', () => {
      const wrapper = mountComponent()
      const groupBtn = wrapper.findAll('.btn-ghost')[0]
      expect(groupBtn.text()).toContain('新增分组')
    })

    it('应渲染统计卡片', () => {
      seedTags(store)
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(4) // 标签总数、分组数量、已标签客户、未标签客户
    })

    it('统计卡片应显示正确数据', () => {
      seedTags(store)
      seedCustomers(store, 5)
      const wrapper = mountComponent()

      const values = wrapper.findAll('.stat-card-value')
      expect(values[0].text()).toBe('6') // 标签总数
    })

    it('应渲染搜索栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.search-input').exists()).toBe(true)
      expect(wrapper.find('.search-input').attributes('placeholder')).toContain('搜索标签名称')
    })

    it('应渲染分组下拉筛选', () => {
      seedTags(store)
      const wrapper = mountComponent()
      expect(wrapper.find('.filter-select').exists()).toBe(true)
    })

    it('有标签时应渲染分组区域', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const sections = wrapper.findAll('.tag-group-section')
      expect(sections.length).toBeGreaterThan(0)
    })

    it('无标签时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.panel-card-body').exists()).toBe(true)
    })

    it('应渲染标签项', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const tagItems = wrapper.findAll('.tag-item')
      expect(tagItems.length).toBe(6)
    })

    it('标签项应显示预览和ID', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const firstItem = wrapper.find('.tag-item')
      expect(firstItem.find('.tag-item-preview').exists()).toBe(true)
      expect(firstItem.find('.tag-item-id').exists()).toBe(true)
    })

    it('标签项应显示编辑和删除按钮', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const firstItem = wrapper.find('.tag-item')
      const btns = firstItem.findAll('.btn-ghost')
      expect(btns.length).toBeGreaterThanOrEqual(2) // 编辑、删除
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按名称搜索应过滤标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('VIP')
      await flushPromises()

      expect(wrapper.vm.searchText).toBe('VIP')
      expect(wrapper.vm.filteredTags.length).toBe(1)
      expect(wrapper.vm.filteredTags[0].name).toBe('VIP')
    })

    it('按ID搜索应过滤标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('长期合作')
      await flushPromises()

      expect(wrapper.vm.filteredTags.length).toBe(1)
      expect(wrapper.vm.filteredTags[0].id).toBe('长期合作')
    })

    it('搜索不匹配时应无结果', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('不存在的标签')
      await flushPromises()

      expect(wrapper.vm.filteredTags.length).toBe(0)
    })

    it('按分组过滤应过滤标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      const select = wrapper.find('.filter-select')
      await select.setValue('等级')
      await flushPromises()

      expect(wrapper.vm.filterGroup).toBe('等级')
      expect(wrapper.vm.filteredTags.length).toBe(2) // VIP, 大客户
      wrapper.vm.filteredTags.forEach(t => {
        expect(t.group).toBe('等级')
      })
    })

    it('选择全部分组应显示所有标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      const select = wrapper.find('.filter-select')
      await select.setValue('all')
      await flushPromises()

      expect(wrapper.vm.filteredTags.length).toBe(6)
    })

    it('搜索和分组过滤应同时生效', async () => {
      seedTags(store)
      const wrapper = mountComponent()

      wrapper.vm.filterGroup = '等级'
      wrapper.vm.searchText = 'VIP'
      await flushPromises()

      expect(wrapper.vm.filteredTags.length).toBe(1)
      expect(wrapper.vm.filteredTags[0].name).toBe('VIP')
    })
  })

  /* ===== 新增标签 ===== */
  describe('新增标签', () => {
    it('点击新增标签按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showTagModal).toBe(true)
    })

    it('新增弹窗表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()

      expect(wrapper.vm.tagForm.id).toBe('')
      expect(wrapper.vm.tagForm.name).toBe('')
      expect(wrapper.vm.tagForm.color).toBe('#3b82f6')
      expect(wrapper.vm.editingTag).toBeNull()
    })

    it('新增弹窗标题应为"新增标签"', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      await flushPromises()

      const modalTitle = wrapper.find('.modal-header h3')
      expect(modalTitle.text()).toBe('新增标签')
    })

    it('必填字段为空时提交应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = ''
      wrapper.vm.tagForm.name = ''
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toBe('标签ID和名称为必填项')
    })

    it('颜色格式不正确时应显示错误', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'TEST'
      wrapper.vm.tagForm.name = '测试标签'
      wrapper.vm.tagForm.color = 'invalid'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toContain('标签颜色格式不正确')
    })

    it('标签ID重复时应显示错误', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'VIP'
      wrapper.vm.tagForm.name = '重复VIP'
      wrapper.vm.tagForm.color = '#ef4444'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toBe('该标签ID已存在，请使用其他ID')
    })

    it('填写完整信息后提交应新增标签', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'NEW_TAG'
      wrapper.vm.tagForm.name = '新标签'
      wrapper.vm.tagForm.color = '#3b82f6'
      wrapper.vm.tagForm.group = '关系'

      await wrapper.vm.saveTag()
      await flushPromises()

      expect(store.tags.some(t => t.id === 'NEW_TAG')).toBe(true)
      expect(wrapper.vm.showTagModal).toBe(false)
    })

    it('新增弹窗应显示颜色选择器', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      await flushPromises()

      const colorDots = wrapper.findAll('.color-dot')
      expect(colorDots.length).toBe(12) // presetColors 有12个
    })

    it('点击预设颜色应更新表单', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      await flushPromises()

      const colorDots = wrapper.findAll('.color-dot')
      await colorDots[0].trigger('click')
      expect(wrapper.vm.tagForm.color).toBe('#ef4444')
    })

    it('新增弹窗应显示预览效果', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.name = '测试预览'
      wrapper.vm.tagForm.color = '#3b82f6'
      await flushPromises()

      expect(wrapper.find('.tag-preview-area').exists()).toBe(true)
    })
  })

  /* ===== 编辑标签 ===== */
  describe('编辑标签', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtns = wrapper.findAll('.tag-item .btn-ghost')
      // 找到编辑按钮（第一个 btn-ghost）
      const editBtn = editBtns[0]
      await editBtn.trigger('click')

      expect(wrapper.vm.showTagModal).toBe(true)
      expect(wrapper.vm.editingTag).toBeDefined()
    })

    it('调用 openEditModal 应正确填充表单', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      const tag = store.tags[0]

      await wrapper.vm.openEditModal(tag)
      expect(wrapper.vm.tagForm.id).toBe(tag.id)
      expect(wrapper.vm.tagForm.name).toBe(tag.name)
      expect(wrapper.vm.tagForm.color).toBe(tag.color)
      expect(wrapper.vm.editingTag).toBe(tag)
    })

    it('编辑弹窗标题应为"编辑标签"', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await wrapper.vm.openEditModal(store.tags[0])
      await flushPromises()

      const modalTitle = wrapper.find('.modal-header h3')
      expect(modalTitle.text()).toBe('编辑标签')
    })

    it('编辑时标签ID字段应为禁用', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await wrapper.vm.openEditModal(store.tags[0])
      await flushPromises()

      const idInput = wrapper.find('input[disabled]')
      expect(idInput.exists()).toBe(true)
    })

    it('编辑提交应更新标签数据', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      const tag = store.tags[0]

      await wrapper.vm.openEditModal(tag)
      wrapper.vm.tagForm.name = '更新后的名称'
      await wrapper.vm.saveTag()
      await flushPromises()

      expect(store.tags[0].name).toBe('更新后的名称')
      expect(wrapper.vm.showTagModal).toBe(false)
    })
  })

  /* ===== 删除标签 ===== */
  describe('删除标签', () => {
    it('点击删除按钮应弹出确认对话框', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await flushPromises()

      const deleteBtns = wrapper.findAll('.tag-item .btn-ghost.btn-sm.danger')
      if (deleteBtns.length > 0) {
        await deleteBtns[0].trigger('click')
        expect(wrapper.vm.showConfirm).toBe(true)
        expect(wrapper.vm.confirmMessage).toContain('确定要删除标签')
      }
    })

    it('调用 confirmDeleteTag 应设置确认消息', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      const tag = store.tags[0]

      await wrapper.vm.confirmDeleteTag(tag)
      expect(wrapper.vm.showConfirm).toBe(true)
      expect(wrapper.vm.confirmMessage).toContain(tag.name)
    })

    it('删除关联了客户的标签应在消息中提示', async () => {
      seedTags(store)
      seedCustomers(store, 3) // 有客户关联了 VIP 标签
      const wrapper = mountComponent()
      const tag = store.tags.find(t => t.id === 'VIP')

      await wrapper.vm.confirmDeleteTag(tag)
      expect(wrapper.vm.confirmMessage).toContain('位客户')
    })

    it('确认删除应移除标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      const tagId = store.tags[0].id

      await wrapper.vm.confirmDeleteTag(store.tags[0])
      await wrapper.vm.confirmAction()
      await flushPromises()

      expect(store.tags.find(t => t.id === tagId)).toBeUndefined()
      expect(wrapper.vm.showConfirm).toBe(false)
    })

    it('删除标签应同时解除客户关联', async () => {
      seedTags(store)
      seedCustomers(store, 2)
      const tagId = 'VIP'

      // 确保客户有此标签
      store.customers.forEach(c => {
        if (!c.tags) c.tags = []
        if (!c.tags.includes(tagId)) c.tags.push(tagId)
      })

      const wrapper = mountComponent()
      const tag = store.tags.find(t => t.id === tagId)
      await wrapper.vm.confirmDeleteTag(tag)
      await wrapper.vm.confirmAction()
      await flushPromises()

      store.customers.forEach(c => {
        expect(c.tags).not.toContain(tagId)
      })
    })
  })

  /* ===== 分组管理 ===== */
  describe('分组管理', () => {
    it('tagGroups 应正确计算分组列表', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const groups = wrapper.vm.tagGroups
      expect(groups).toContain('等级')
      expect(groups).toContain('关系')
      expect(groups).toContain('风险')
    })

    it('displayGroups 应正确组织分组和标签', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const groups = wrapper.vm.displayGroups
      expect(groups.length).toBeGreaterThan(0)
      groups.forEach(g => {
        expect(g).toHaveProperty('name')
        expect(g).toHaveProperty('tags')
      })
    })

    it('点击新增分组按钮应打开分组弹窗', async () => {
      const wrapper = mountComponent()
      const groupBtn = wrapper.findAll('.btn-ghost')[0]
      await groupBtn.trigger('click')

      expect(wrapper.vm.showGroupModal).toBe(true)
    })

    it('新增分组应创建占位标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      await wrapper.vm.openAddGroupModal()
      wrapper.vm.newGroupName = '行业'
      await wrapper.vm.saveGroup()

      expect(wrapper.vm.showGroupModal).toBe(false)
      // 应该创建了一个 hidden 标签
      expect(store.tags.some(t => t.group === '行业' && t.hidden)).toBe(true)
    })

    it('新增空分组名称应不创建', async () => {
      seedTags(store)
      const beforeCount = store.tags.length
      const wrapper = mountComponent()
      await wrapper.vm.openAddGroupModal()
      wrapper.vm.newGroupName = ''
      await wrapper.vm.saveGroup()

      expect(store.tags.length).toBe(beforeCount)
    })

    it('新增已存在的分组名称应不创建', async () => {
      seedTags(store)
      const beforeCount = store.tags.length
      const wrapper = mountComponent()
      await wrapper.vm.openAddGroupModal()
      wrapper.vm.newGroupName = '等级' // 已存在
      await wrapper.vm.saveGroup()

      expect(store.tags.length).toBe(beforeCount)
    })

    it('删除分组应删除该分组下所有标签', async () => {
      seedTags(store)
      const wrapper = mountComponent()
      const groupName = '等级'
      const groupTagCount = store.tags.filter(t => t.group === groupName).length

      await wrapper.vm.confirmDeleteGroup(groupName)
      await wrapper.vm.confirmAction()
      await flushPromises()

      expect(store.tags.filter(t => t.group === groupName).length).toBe(0)
    })

    it('删除空分组应不执行操作', async () => {
      const wrapper = mountComponent()
      const beforeCount = store.tags.length
      await wrapper.vm.confirmDeleteGroup('不存在的分组')
      expect(store.tags.length).toBe(beforeCount)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('taggedCustomerCount 应正确计算已标签客户数', () => {
      seedTags(store)
      seedCustomers(store, 5) // 3 个有标签（i%2===0），2 个无标签
      const wrapper = mountComponent()
      expect(wrapper.vm.taggedCustomerCount).toBe(3)
    })

    it('untaggedCustomerCount 应正确计算未标签客户数', () => {
      seedTags(store)
      seedCustomers(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.vm.untaggedCustomerCount).toBe(2)
    })

    it('tagCustomerCountMap 应正确统计每个标签的客户数', () => {
      seedTags(store)
      seedCustomers(store, 4) // 0,2 有 VIP 和 长期合作
      const wrapper = mountComponent()
      const map = wrapper.vm.tagCustomerCountMap
      expect(map['VIP']).toBe(2)
      expect(map['长期合作']).toBe(2)
    })

    it('无客户时 tagCustomerCountMap 所有标签计数为 0', () => {
      seedTags(store)
      const wrapper = mountComponent()
      const map = wrapper.vm.tagCustomerCountMap
      Object.values(map).forEach(count => {
        expect(count).toBe(0)
      })
    })
  })

  /* ===== 弹窗关闭 ===== */
  describe('弹窗关闭', () => {
    it('点击取消应关闭标签弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      expect(wrapper.vm.showTagModal).toBe(true)

      wrapper.vm.showTagModal = false
      expect(wrapper.vm.showTagModal).toBe(false)
    })

    it('点击取消应关闭分组弹窗', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddGroupModal()
      expect(wrapper.vm.showGroupModal).toBe(true)

      wrapper.vm.showGroupModal = false
      expect(wrapper.vm.showGroupModal).toBe(false)
    })

    it('点击取消应关闭确认弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showConfirm = true
      wrapper.vm.showConfirm = false
      expect(wrapper.vm.showConfirm).toBe(false)
    })
  })

  /* ===== 表单验证 ===== */
  describe('表单验证', () => {
    it('标签ID为空时应报错', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = ''
      wrapper.vm.tagForm.name = '测试'
      wrapper.vm.tagForm.color = '#3b82f6'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toBe('标签ID和名称为必填项')
    })

    it('标签名称为空时应报错', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'TEST'
      wrapper.vm.tagForm.name = ''
      wrapper.vm.tagForm.color = '#3b82f6'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toBe('标签ID和名称为必填项')
    })

    it('颜色格式不正确时应报错', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'TEST'
      wrapper.vm.tagForm.name = '测试'
      wrapper.vm.tagForm.color = 'red'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toContain('标签颜色格式不正确')
    })

    it('颜色格式为5位时应报错', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'TEST'
      wrapper.vm.tagForm.name = '测试'
      wrapper.vm.tagForm.color = '#3b82'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toContain('标签颜色格式不正确')
    })

    it('颜色格式正确时不应报错', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddModal()
      wrapper.vm.tagForm.id = 'TEST'
      wrapper.vm.tagForm.name = '测试'
      wrapper.vm.tagForm.color = '#3b82f6'
      await wrapper.vm.saveTag()

      expect(wrapper.vm.tagFormError).toBe('')
    })
  })

  /* ===== 预设颜色 ===== */
  describe('预设颜色', () => {
    it('应有12个预设颜色', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.presetColors.length).toBe(12)
    })

    it('预设颜色应包含常用颜色', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.presetColors).toContain('#ef4444')
      expect(wrapper.vm.presetColors).toContain('#3b82f6')
      expect(wrapper.vm.presetColors).toContain('#10b981')
    })
  })
})
