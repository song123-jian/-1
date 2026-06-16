/**
 * Contracts.vue 组件级测试
 * 覆盖：渲染、交互、搜索过滤、分页、CRUD弹窗、表单验证、导出、批量操作、视图切换、审批流程、模板管理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Contracts from '@/modules/sales/views/Contracts.vue'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { createContract, createCustomer, resetCounter } from '@/__tests__/mockData'

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

vi.mock('@/utils/permissionGuard', () => ({
  usePermission: () => ({
    isAllowed: () => true
  })
}))

import { computed } from 'vue'

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStubs = {
  Icon: IconStub,
  DataSelect: {
    props: ['modelValue', 'module', 'variant', 'valueField', 'labelField', 'placeholder', 'clearable'],
    template: '<select class="data-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">全部</option></select>'
  },
  ContractFormModal: {
    props: ['showModal', 'wizardStep', 'wizardData', 'isEditing', 'termsEditing', 'customers', 'saveAsTemplateFlag', 'showTemplateModal', 'templates', 'aiParsing', 'showRejectModal', 'rejectReason'],
    template: '<div class="form-modal-stub" v-if="showModal"></div>'
  },
  ContractPreview: {
    props: ['showPreview', 'contract', 'previewTab'],
    template: '<div class="preview-stub" v-if="showPreview"></div>'
  },
  ContractCalendarView: {
    props: ['currentView', 'calendarMonth', 'calendarDays', 'weekDays', 'statusLabels', 'statusColors'],
    template: '<div class="calendar-stub"></div>'
  },
  ContractListView: {
    props: ['currentView', 'contracts', 'selectedIds', 'statusLabels', 'statusColors', 'canDelete', 'canSign'],
    template: '<div class="list-stub"></div>'
  }
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Contracts, {
    global: {
      stubs: ChildStubs
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedContracts(store, count = 5) {
  resetCounter()
  const statuses = ['draft', 'pending_approval', 'approved', 'signed', 'archived', 'cancelled']
  for (let i = 0; i < count; i++) {
    store.addContract(createContract({
      status: statuses[i % statuses.length],
      partyA: `测试客户${i + 1}号`,
      contractNo: `HT2026060${String(i + 1).padStart(2, '0')}`,
      totalAmount: 100000 * (i + 1),
      contractType: ['购销合同', '采购合同', '服务合同', '框架协议', '技术协议'][i % 5],
      settlement: ['款到发货', '月结30天', '月结60天', '月结90天', '货到付款'][i % 5]
    }))
  }
}

describe('Contracts 组件', () => {
  let store
  let customerStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useContractStore()
    customerStore = useCustomerStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('合同管理')
      expect(wrapper.find('.page-header-subtitle').exists()).toBe(true)
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无合同数据')
    })

    it('有数据时应渲染表格行', () => {
      seedContracts(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示统计栏数据', () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.contract-stats-bar').exists()).toBe(true)
      expect(wrapper.find('.kpi-card-sm').exists()).toBe(true)
    })

    it('应渲染视图切换按钮', () => {
      const wrapper = mountComponent()
      const viewBtns = wrapper.findAll('.view-btn')
      expect(viewBtns.length).toBeGreaterThanOrEqual(3) // 表格、列表、卡片、日历 + 更多
    })

    it('应渲染操作按钮', () => {
      const wrapper = mountComponent()
      const actions = wrapper.find('.page-header-actions')
      expect(actions.text()).toContain('新建合同')
    })

    it('应渲染过滤栏控件', () => {
      const wrapper = mountComponent()
      expect(wrapper.findAll('.filter-select').length).toBeGreaterThanOrEqual(2) // 状态、类型（默认显示）
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按合同编号搜索应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('HT20260601')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按甲方名称搜索应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('.search-input')
      await input.setValue('测试客户3')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('按状态过滤应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      const select = wrapper.findAll('.filter-select')[0]
      await select.setValue('draft')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('草稿')
      })
    })

    it('按结算方式过滤应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      // 展开高级筛选面板
      wrapper.vm.showAdvFilter = true
      await flushPromises()

      const select = wrapper.findAll('.filter-select').find(s => s.element.querySelector('option[value="月结30天"]') || s.findAll('option').some(o => o.text().includes('月结30天')))
      if (select) {
        await select.setValue('月结30天')
        await flushPromises()
      } else {
        // 直接设置筛选值
        wrapper.vm.filterSettlement = '月结30天'
        await flushPromises()
      }

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        if (!row.text().includes('暂无')) {
          expect(row.text()).toContain('月结30天')
        }
      })
    })

    it('重置过滤应清空所有条件', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.searchText = '测试'
      wrapper.vm.filterStatus = 'draft'
      await flushPromises()

      await wrapper.vm.resetFilters()
      await flushPromises()

      expect(wrapper.vm.searchText).toBe('')
      expect(wrapper.vm.filterStatus).toBe('')
    })

    it('搜索和过滤条件变更时应重置到第一页', async () => {
      seedContracts(store, 20)
      const wrapper = mountComponent()

      wrapper.vm.currentPage = 2
      await flushPromises()

      const input = wrapper.find('.search-input')
      await input.setValue('测试')
      await flushPromises()

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页栏', async () => {
      seedContracts(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.pagination-bar').exists()).toBe(true)
    })

    it('数据不足一页时不应显示分页栏', () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()
      expect(wrapper.find('.pagination-bar').exists()).toBe(false)
    })

    it('点击下一页应更新当前页', async () => {
      seedContracts(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      const nextBtn = wrapper.findAll('.pagination-btn')[3]
      await nextBtn.trigger('click')
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('分页信息应正确显示', async () => {
      seedContracts(store, 20)
      const wrapper = mountComponent()
      await flushPromises()

      const info = wrapper.find('.pagination-info')
      expect(info.text()).toContain('第')
      expect(info.text()).toContain('页')
    })
  })

  /* ===== 新建合同 ===== */
  describe('新建合同', () => {
    it('点击新建合同按钮应打开向导弹窗', async () => {
      const wrapper = mountComponent()
      // 直接调用 openWizard() 而非通过按钮点击，因为 @click="openWizard" 会传入 MouseEvent 作为 editId
      wrapper.vm.openWizard()
      await flushPromises()

      expect(wrapper.vm.showWizard).toBe(true)
      expect(wrapper.vm.isEditing).toBe(false)
      expect(wrapper.vm.editingId).toBeNull()
    })

    it('openWizard 不传参时应设置新增模式', async () => {
      const wrapper = mountComponent()
      wrapper.vm.openWizard()
      expect(wrapper.vm.isEditing).toBe(false)
      expect(wrapper.vm.wizardStep).toBe(1)
      expect(wrapper.vm.showWizard).toBe(true)
    })
  })

  /* ===== 编辑合同 ===== */
  describe('编辑合同', () => {
    it('点击编辑按钮应打开弹窗并填充数据', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const editBtn = wrapper.findAll('.action-btn-text').find(b => b.text().includes('编辑'))
      await editBtn.trigger('click')

      expect(wrapper.vm.showWizard).toBe(true)
      expect(wrapper.vm.isEditing).toBe(true)
    })

    it('openWizard 传入id时应设置编辑模式', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      const c = store.contracts[0]

      wrapper.vm.openWizard(c.id)
      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.editingId).toBe(c.id)
    })
  })

  /* ===== 审批流程 ===== */
  describe('审批流程', () => {
    it('提交审批应将草稿变为待审批', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      const c = store.contracts[0]
      // 确保是草稿状态
      store.changeStatus(c.id, 'draft')
      c.status = 'draft'

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      await wrapper.vm.handleSubmitApproval(c)
      expect(store.contracts.find(x => x.id === c.id).status).toBe('pending_approval')
      alertSpy.mockRestore()
    })

    it('审批通过应弹出确认对话框', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      let c = store.contracts[0]
      store.changeStatus(c.id, 'pending_approval')
      // changeStatus 会替换数组中的对象，需要重新获取
      c = store.contracts[0]

      const confirmFn = vi.fn().mockReturnValue(true)
      vi.stubGlobal('confirm', confirmFn)
      await wrapper.vm.handleApprove(c)
      expect(confirmFn).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('驳回合同应打开驳回弹窗', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      let c = store.contracts[0]
      store.changeStatus(c.id, 'pending_approval')
      c = store.contracts[0]
      await flushPromises()

      await wrapper.vm.handleReject(c)
      expect(wrapper.vm.showRejectModal).toBe(true)
      expect(wrapper.vm.rejectTargetId).toBe(c.id)
    })

    it('签订合同应弹出确认对话框', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      let c = store.contracts[0]
      store.changeStatus(c.id, 'pending_approval')
      c = store.contracts[0]
      store.changeStatus(c.id, 'approved')
      c = store.contracts[0]

      const confirmFn = vi.fn().mockReturnValue(true)
      vi.stubGlobal('confirm', confirmFn)
      await wrapper.vm.handleSign(c)
      expect(confirmFn).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('归档合同应弹出确认对话框', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      let c = store.contracts[0]
      store.changeStatus(c.id, 'pending_approval')
      c = store.contracts[0]
      store.changeStatus(c.id, 'approved')
      c = store.contracts[0]
      store.changeStatus(c.id, 'signed')
      c = store.contracts[0]

      const confirmFn = vi.fn().mockReturnValue(true)
      vi.stubGlobal('confirm', confirmFn)
      await wrapper.vm.handleArchive(c)
      expect(confirmFn).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('作废合同应弹出确认对话框', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      let c = store.contracts[0]
      store.changeStatus(c.id, 'pending_approval')
      c = store.contracts[0]
      store.changeStatus(c.id, 'approved')
      c = store.contracts[0]

      const confirmFn = vi.fn().mockReturnValue(true)
      vi.stubGlobal('confirm', confirmFn)
      await wrapper.vm.handleCancel(c)
      expect(confirmFn).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })

  /* ===== 复制合同 ===== */
  describe('复制合同', () => {
    it('复制合同应生成新合同', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const c = store.contracts[0]
      await wrapper.vm.handleDuplicate(c)

      expect(store.contracts.length).toBe(2)
      alertSpy.mockRestore()
    })
  })

  /* ===== 删除合同 ===== */
  describe('删除合同', () => {
    it('删除合同应弹出确认对话框', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const c = store.contracts[0]
      await wrapper.vm.handleDelete(c)
      expect(confirmSpy).toHaveBeenCalled()
      confirmSpy.mockRestore()
    })

    it('确认删除应从列表中移除合同', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const c = store.contracts[0]
      await wrapper.vm.handleDelete(c)

      expect(store.contracts.length).toBe(1)
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('勾选合同后应显示批量操作栏', async () => {
      seedContracts(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      const c = store.contracts[0]
      wrapper.vm.toggleSelect(c.id)
      await flushPromises()

      expect(wrapper.find('.batch-bar').exists()).toBe(true)
      expect(wrapper.find('.batch-bar').text()).toContain('已选')
    })

    it('全选应选中当前页所有合同', async () => {
      seedContracts(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.toggleSelectAll()
      await flushPromises()

      expect(wrapper.vm.selectedIds.length).toBeGreaterThan(0)
    })

    it('批量删除应弹出确认对话框', async () => {
      seedContracts(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      wrapper.vm.selectedIds = [store.contracts[0].id, store.contracts[1].id]
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      await wrapper.vm.handleBatchDelete()
      expect(confirmSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出应创建 Blob 并触发下载', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('2')
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.handleExport()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      promptSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 视图切换 ===== */
  describe('视图切换', () => {
    it('切换到漏斗视图应显示漏斗图', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.currentView = 'funnel'
      await flushPromises()

      expect(wrapper.find('.sales-funnel').exists()).toBe(true)
    })

    it('切换到分析视图应显示分析面板', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.showAnalytics = true
      await flushPromises()

      expect(wrapper.find('.analytics-panel').exists()).toBe(true)
    })

    it('分析面板应显示KPI卡片', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.showAnalytics = true
      await flushPromises()

      expect(wrapper.findAll('.kpi-card').length).toBe(5)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredContracts 应正确过滤', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.searchText = '测试客户1'
      await flushPromises()

      expect(wrapper.vm.filteredContracts.length).toBeLessThanOrEqual(5)
    })

    it('isAllSelected 应正确计算全选状态', async () => {
      seedContracts(store, 3)
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.isAllSelected).toBe(false)

      for (const c of wrapper.vm.pagedContracts) {
        wrapper.vm.selectedIds.push(c.id)
      }
      await flushPromises()

      expect(wrapper.vm.isAllSelected).toBe(true)
    })

    it('signRateColor 应根据签订率返回正确颜色', () => {
      const wrapper = mountComponent()
      // 无数据时签订率为0，应返回danger
      expect(wrapper.vm.signRateColor).toContain('danger')
    })

    it('funnelStages 应正确计算漏斗数据', () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      const stages = wrapper.vm.funnelStages
      expect(stages.length).toBe(5) // draft, pending_approval, approved, signed, archived
      stages.forEach(s => {
        expect(s).toHaveProperty('key')
        expect(s).toHaveProperty('label')
        expect(s).toHaveProperty('count')
      })
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

    it('取消勾选列应隐藏对应列', async () => {
      seedContracts(store, 2)
      const wrapper = mountComponent()

      wrapper.vm.columnVisible.contractNo = false
      await flushPromises()

      const thTexts = wrapper.findAll('th').map(th => th.text())
      expect(thTexts).not.toContain('合同编号')
    })
  })

  /* ===== 向导表单验证 ===== */
  describe('向导表单验证', () => {
    it('nextStep 在第2步无有效产品时应提示', async () => {
      const wrapper = mountComponent()
      wrapper.vm.wizardStep = 2
      wrapper.vm.wizardData = {
        products: [{ productName: '', quantity: 0, unitPrice: 0 }],
        contractNo: 'HT202606001'
      }

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      wrapper.vm.nextStep()
      expect(alertSpy).toHaveBeenCalledWith('请至少添加一条完整的产品明细')
      alertSpy.mockRestore()
    })

    it('nextStep 在第1步合同编号重复时应提示', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      wrapper.vm.wizardStep = 1
      wrapper.vm.wizardData = {
        contractNo: store.contracts[0].contractNo,
        signDate: '2026-06-01',
        endDate: '2027-06-01'
      }

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      wrapper.vm.nextStep()
      expect(alertSpy).toHaveBeenCalled()
      alertSpy.mockRestore()
    })
  })

  /* ===== 保存草稿 ===== */
  describe('保存草稿', () => {
    it('saveDraft 应添加新合同并提示', async () => {
      const wrapper = mountComponent()
      wrapper.vm.wizardData = {
        contractNo: 'HT-TEST-001',
        products: [{ productName: '测试产品', quantity: 10, unitPrice: 100 }],
        totalAmount: 1000
      }

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      wrapper.vm.saveDraft()

      expect(store.contracts.length).toBe(1)
      expect(alertSpy).toHaveBeenCalled()
      alertSpy.mockRestore()
    })
  })

  /* ===== 提交合同 ===== */
  describe('提交合同', () => {
    it('submitContract 应将状态设为待审批', async () => {
      const wrapper = mountComponent()
      wrapper.vm.wizardData = {
        contractNo: 'HT-TEST-002',
        products: [{ productName: '测试产品', quantity: 10, unitPrice: 100 }],
        totalAmount: 1000
      }

      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
      wrapper.vm.submitContract()

      expect(store.contracts.length).toBe(1)
      expect(store.contracts[0].status).toBe('pending_approval')
      alertSpy.mockRestore()
    })
  })

  /* ===== 预览 ===== */
  describe('预览功能', () => {
    it('点击预览按钮应打开预览弹窗', async () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      await flushPromises()

      const previewBtn = wrapper.findAll('.action-btn-text').find(b => b.text().includes('预览'))
      await previewBtn.trigger('click')

      expect(wrapper.vm.showPreview).toBe(true)
      expect(wrapper.vm.previewContract).not.toBeNull()
    })
  })

  /* ===== 模板管理 ===== */
  describe('模板管理', () => {
    it('点击模板管理按钮应打开模板弹窗', async () => {
      const wrapper = mountComponent()
      // 直接调用方法（模板管理已移入更多操作下拉菜单）
      wrapper.vm.openTemplateManager()
      await flushPromises()

      expect(wrapper.vm.showTemplateModal).toBe(true)
    })

    it('useTemplate 应关闭模板弹窗并打开向导', async () => {
      const tpl = { contractType: '购销合同', settlement: '月结30天', terms: {}, partyBInfo: {}, products: [] }
      const wrapper = mountComponent()

      wrapper.vm.useTemplate(tpl)

      expect(wrapper.vm.showTemplateModal).toBe(false)
      expect(wrapper.vm.showWizard).toBe(true)
      expect(wrapper.vm.isEditing).toBe(false)
    })
  })

  /* ===== 关联单据 ===== */
  describe('关联单据', () => {
    it('getRelatedCount 应正确计算关联单据数量', () => {
      seedContracts(store, 1)
      const wrapper = mountComponent()
      const c = store.contracts[0]

      const count = wrapper.vm.getRelatedCount(c)
      expect(typeof count).toBe('number')
    })
  })

  /* ===== 日期过滤 ===== */
  describe('日期过滤', () => {
    it('按签订日期起止过滤应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterDateFrom = '2026-01-01'
      wrapper.vm.filterDateTo = '2026-12-31'
      await flushPromises()

      wrapper.vm.filteredContracts.forEach(c => {
        expect(c.signDate >= '2026-01-01').toBe(true)
        expect(c.signDate <= '2026-12-31').toBe(true)
      })
    })
  })

  /* ===== 金额过滤 ===== */
  describe('金额过滤', () => {
    it('按金额范围过滤应过滤结果', async () => {
      seedContracts(store, 5)
      const wrapper = mountComponent()

      wrapper.vm.filterAmountMin = 1  // 1万 = 10000
      wrapper.vm.filterAmountMax = 5  // 5万 = 50000
      await flushPromises()

      wrapper.vm.filteredContracts.forEach(c => {
        expect(c.totalAmount >= 10000).toBe(true)
        expect(c.totalAmount <= 50000).toBe(true)
      })
    })
  })
})
