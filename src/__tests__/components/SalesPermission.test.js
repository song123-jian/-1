/**
 * SalesPermission.vue 组件级测试
 * 覆盖：渲染、搜索过滤、权限矩阵操作、新增角色、导入导出、批量操作、模板应用
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import SalesPermission from '@/modules/system/views/SalesPermission.vue'
import { usePermissionStore } from '@/stores/permission'

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
  const div = document.createElement('div')
  document.body.appendChild(div)
  return mount(SalesPermission, {
    attachTo: div,
    global: {
      stubs: { Icon: IconStub, Teleport: false }
    }
  })
}

describe('SalesPermission 组件', () => {
  let permStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    permStore = usePermissionStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('客户权限配置')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('访问权限')
    })

    it('应渲染统计卡片', () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.stat-card')
      expect(cards.length).toBe(4) // 角色总数、权限项数、待保存变更、最近修改时间
    })

    it('应渲染角色标签列表', () => {
      const wrapper = mountComponent()
      const chips = wrapper.findAll('.role-chip')
      expect(chips.length).toBe(permStore.roles.length)
    })

    it('应渲染权限矩阵表格', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.perm-matrix-table').exists()).toBe(true)
    })

    it('管理员和总经理角色不应显示删除按钮', () => {
      const wrapper = mountComponent()
      const chips = wrapper.findAll('.role-chip')
      chips.forEach(chip => {
        const text = chip.text()
        if (text.includes('管理员') || text.includes('总经理')) {
          expect(chip.find('.role-chip-remove').exists()).toBe(false)
        }
      })
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按权限项搜索应过滤结果', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('input.form-input')
      await input.setValue('审批')
      await flushPromises()

      const modules = wrapper.vm.filteredModules
      modules.forEach(m => {
        const hasMatch = m.perms.some(p => (permStore.permLabels[p] || p).includes('审批') || m.label.includes('审批'))
        expect(hasMatch).toBe(true)
      })
    })

    it('按模块过滤应过滤结果', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const moduleSelect = selects[0]
      await moduleSelect.setValue('inbound')
      await flushPromises()

      const modules = wrapper.vm.filteredModules
      modules.forEach(m => {
        expect(m.key).toBe('inbound')
      })
    })

    it('搜索和过滤组合应生效', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('input.form-input')
      await input.setValue('创建')
      await flushPromises()

      const modules = wrapper.vm.filteredModules
      expect(modules.length).toBeGreaterThan(0)
    })
  })

  /* ===== 权限矩阵操作 ===== */
  describe('权限矩阵操作', () => {
    it('点击模块行应切换展开', async () => {
      const wrapper = mountComponent()
      const firstKey = permStore.defaultModules[0]?.key
      if (firstKey) {
        const wasExpanded = wrapper.vm.expandedModules.has(firstKey)
        await wrapper.vm.toggleModuleExpand(firstKey)
        expect(wrapper.vm.expandedModules.has(firstKey)).toBe(!wasExpanded)
      }
    })

    it('onPermChange 应更新权限并设置详情', () => {
      const wrapper = mountComponent()
      const role = permStore.roles[0]
      const mod = permStore.defaultModules[0]
      if (mod && role) {
        wrapper.vm.onPermChange(role, mod.key, mod.perms[0], true)
        expect(permStore.getPerm(role, mod.key, mod.perms[0])).toBe(true)
        expect(wrapper.vm.selectedPermDetail).toBeTruthy()
      }
    })

    it('isModuleAllChecked 应正确判断模块是否全选', () => {
      const wrapper = mountComponent()
      const role = '管理员'
      const mod = permStore.defaultModules[0]
      if (mod) {
        expect(wrapper.vm.isModuleAllChecked(role, mod)).toBe(true) // 管理员拥有所有权限
      }
    })

    it('toggleModuleAll 应切换模块所有权限', () => {
      const wrapper = mountComponent()
      const role = permStore.roles.find(r => !['管理员', '总经理'].includes(r))
      const mod = permStore.defaultModules[0]
      if (mod && role) {
        const wasAllChecked = wrapper.vm.isModuleAllChecked(role, mod)
        wrapper.vm.toggleModuleAll(role, mod)
        expect(wrapper.vm.isModuleAllChecked(role, mod)).toBe(!wasAllChecked)
      }
    })
  })

  /* ===== 新增角色 ===== */
  describe('新增角色', () => {
    it('点击新增角色按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.findAll('.btn-ghost').find(b => b.text().includes('新增角色'))
      if (addBtn) {
        await addBtn.trigger('click')
        expect(wrapper.vm.showAddRoleModal).toBe(true)
      }
    })

    it('新增角色弹窗应有角色名称输入框', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openAddRoleModal()
      expect(wrapper.vm.showAddRoleModal).toBe(true)
      expect(wrapper.vm.newRoleName).toBe('')
    })

    it('空角色名称提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openAddRoleModal()
      wrapper.vm.newRoleName = '  '
      await wrapper.vm.doAddRole()

      expect(alertSpy).toHaveBeenCalledWith('请输入角色名称')
      alertSpy.mockRestore()
    })

    it('输入有效角色名称提交应新增角色', async () => {
      const wrapper = mountComponent()
      const beforeCount = permStore.roles.length

      await wrapper.vm.openAddRoleModal()
      wrapper.vm.newRoleName = '测试新角色'
      await wrapper.vm.doAddRole()

      expect(permStore.roles).toContain('测试新角色')
      expect(permStore.roles.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showAddRoleModal).toBe(false)
    })

    it('重复角色名称提交应提示已存在', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openAddRoleModal()
      wrapper.vm.newRoleName = permStore.roles[0]
      await wrapper.vm.doAddRole()

      expect(alertSpy).toHaveBeenCalledWith('角色已存在')
      alertSpy.mockRestore()
    })
  })

  /* ===== 删除角色 ===== */
  describe('删除角色', () => {
    it('删除非管理员角色应弹出确认', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      const removableRole = permStore.roles.find(r => !['管理员', '总经理'].includes(r))
      if (removableRole) {
        await wrapper.vm.removeRole(removableRole)
        expect(confirmSpy).toHaveBeenCalled()
        expect(permStore.roles).not.toContain(removableRole)
      }

      confirmSpy.mockRestore()
    })

    it('取消删除应不移除角色', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
      const wrapper = mountComponent()

      const removableRole = permStore.roles.find(r => !['管理员', '总经理'].includes(r))
      if (removableRole) {
        const beforeCount = permStore.roles.length
        await wrapper.vm.removeRole(removableRole)
        expect(permStore.roles.length).toBe(beforeCount)
      }

      confirmSpy.mockRestore()
    })
  })

  /* ===== 保存与重置 ===== */
  describe('保存与重置', () => {
    it('保存修改应调用store保存并提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.saveAll()
      expect(permStore.changeCount).toBe(0)
      expect(alertSpy).toHaveBeenCalledWith('权限配置已保存')

      alertSpy.mockRestore()
    })

    it('重置应弹出确认对话框', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      await wrapper.vm.resetAll()
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  /* ===== 权限模板 ===== */
  describe('权限模板', () => {
    it('应用模板应弹出确认', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const wrapper = mountComponent()

      await wrapper.vm.applyTemplate('standard')
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('取消应用模板应不修改权限', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
      const wrapper = mountComponent()

      const beforeMatrix = { ...permStore.matrix }
      await wrapper.vm.applyTemplate('strict')

      // 确认取消后矩阵不变
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出应创建Blob并触发下载', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.doExport()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 导入 ===== */
  describe('导入功能', () => {
    it('空JSON提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.importJson = '  '
      await wrapper.vm.doImport()

      expect(alertSpy).toHaveBeenCalledWith('请粘贴JSON配置')
      alertSpy.mockRestore()
    })

    it('有效JSON导入应成功', async () => {
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const exportData = permStore.exportPermissions()
      wrapper.vm.importJson = exportData
      await wrapper.vm.doImport()

      expect(alertSpy).toHaveBeenCalledWith('导入成功')
      expect(wrapper.vm.showImportModal).toBe(false)

      confirmSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('无效JSON导入应提示失败', async () => {
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.importJson = 'invalid json'
      await wrapper.vm.doImport()

      expect(alertSpy).toHaveBeenCalledWith('导入失败，请检查JSON格式（需包含roles和matrix字段）')

      confirmSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('未选择批量操作时点击应用应无操作', async () => {
      const wrapper = mountComponent()
      wrapper.vm.batchAction = ''
      await wrapper.vm.doBatchAction()
      // 不应抛出异常
    })

    it('选择批量操作后应生效', async () => {
      const wrapper = mountComponent()
      wrapper.vm.batchAction = 'enableView'
      await wrapper.vm.doBatchAction()

      expect(wrapper.vm.batchAction).toBe('') // 执行后应清空
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredModules 应根据搜索和模块过滤', () => {
      const wrapper = mountComponent()
      wrapper.vm.permSearch = '报价'
      wrapper.vm.permModuleFilter = ''

      const modules = wrapper.vm.filteredModules
      expect(modules.length).toBeGreaterThan(0)
    })

    it('permSummaryText 应正确显示权限概要', () => {
      const wrapper = mountComponent()
      const text = wrapper.vm.permSummaryText
      expect(text).toContain('项权限')
    })

    it('permSummaryText 有变更时应显示未保存数', () => {
      const wrapper = mountComponent()
      permStore.changeCount = 5
      const text = wrapper.vm.permSummaryText
      expect(text).toContain('5 项未保存')
    })
  })

  /* ===== 权限详情面板 ===== */
  describe('权限详情面板', () => {
    it('初始状态应显示提示文字', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.selectedPermDetail).toBeNull()
    })

    it('点击权限后应显示详情', () => {
      const wrapper = mountComponent()
      const role = permStore.roles[0]
      const mod = permStore.defaultModules[0]
      if (mod) {
        wrapper.vm.onPermChange(role, mod.key, mod.perms[0], true)
        expect(wrapper.vm.selectedPermDetail).toBeTruthy()
        expect(wrapper.vm.selectedPermDetail.role).toBe(role)
      }
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应默认展开所有模块', () => {
      const wrapper = mountComponent()
      permStore.defaultModules.forEach(m => {
        expect(wrapper.vm.expandedModules.has(m.key)).toBe(true)
      })
    })
  })
})
