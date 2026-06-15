/**
 * Logs.vue 组件级测试
 * 覆盖：渲染、搜索过滤、分页、导出、快捷筛选、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Logs from '@/modules/system/views/Logs.vue'
import { useLogStore } from '@/modules/system/stores/log'

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

vi.mock('@/utils/format', () => ({
  escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  toLocalDateStr: (d) => (d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
}))

/* ===== Canvas mock ===== */
const mockCtx = {
  clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(),
  closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
  strokeText: vi.fn(), scale: vi.fn(), save: vi.fn(), restore: vi.fn(), roundRect: vi.fn()
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
  return mount(Logs, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedLogs(store, count = 5) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() - i * 3600000)
    const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    store.logs.push({
      time: timeStr,
      user: ['管理员', '销售员', '仓管员'][i % 3],
      action: ['创建报价', '修改客户', '删除库存', '审批合同', '导出报表'][i % 5],
      module: ['quotations', 'customers', 'inventory', 'contracts', 'report'][i % 5],
      detail: `测试操作日志${i + 1}`
    })
  }
}

describe('Logs 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useLogStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('操作日志')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('审计追踪')
    })

    it('无数据时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.empty-state').text()).toContain('暂无操作日志')
    })

    it('有数据时应渲染表格行', () => {
      seedLogs(store, 3)
      const wrapper = mountComponent()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('应显示统计卡片数据', () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()
      const values = wrapper.findAll('.stat-card-value')
      expect(values.length).toBe(4)
      expect(values[0].text()).toBe('5') // 今日操作
    })
  })

  /* ===== 搜索与过滤 ===== */
  describe('搜索与过滤', () => {
    it('按操作内容搜索应过滤结果', async () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()

      const input = wrapper.find('input.form-input')
      await input.setValue('报价')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('报价')
      })
    })

    it('按模块过滤应过滤结果', async () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('select.form-select')
      const moduleSelect = selects[0]
      await moduleSelect.setValue('quotations')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('报价管理')
      })
    })

    it('按用户过滤应过滤结果', async () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()

      const selects = wrapper.findAll('select.form-select')
      const userSelect = selects[selects.length - 1]
      await userSelect.setValue('管理员')
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      rows.forEach(row => {
        expect(row.text()).toContain('管理员')
      })
    })
  })

  /* ===== 快捷筛选 ===== */
  describe('快捷筛选', () => {
    it('点击今天按钮应设置日期范围', async () => {
      const wrapper = mountComponent()
      const today = new Date().toISOString().split('T')[0]

      const btns = wrapper.findAll('.btn-ghost.btn-sm')
      const todayBtn = btns.find(b => b.text() === '今天')
      await todayBtn.trigger('click')

      expect(wrapper.vm.filters.dateFrom).toBe(today)
      expect(wrapper.vm.filters.dateTo).toBe(today)
    })

    it('点击本周按钮应设置7天范围', async () => {
      const wrapper = mountComponent()

      const btns = wrapper.findAll('.btn-ghost.btn-sm')
      const weekBtn = btns.find(b => b.text() === '本周')
      await weekBtn.trigger('click')

      expect(wrapper.vm.filters.dateTo).toBeTruthy()
      expect(wrapper.vm.filters.dateFrom).toBeTruthy()
    })

    it('点击本月按钮应设置当月范围', async () => {
      const wrapper = mountComponent()

      const btns = wrapper.findAll('.btn-ghost.btn-sm')
      const monthBtn = btns.find(b => b.text() === '本月')
      await monthBtn.trigger('click')

      const now = new Date()
      expect(wrapper.vm.filters.dateFrom).toBe(
        now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'
      )
    })
  })

  /* ===== 分页 ===== */
  describe('分页', () => {
    it('数据超过每页条数时应显示分页按钮', async () => {
      seedLogs(store, 25)
      const wrapper = mountComponent()
      wrapper.vm.perPage = 20
      await flushPromises()

      const pageBtns = wrapper.findAll('button').filter(b => b.classes().includes('btn-primary') || b.classes().includes('btn-ghost'))
      expect(pageBtns.length).toBeGreaterThan(0)
    })

    it('切换每页条数应生效', async () => {
      seedLogs(store, 25)
      const wrapper = mountComponent()
      wrapper.vm.perPage = 20
      await flushPromises()

      expect(wrapper.vm.pagedLogs.length).toBeLessThanOrEqual(20)
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('无数据时导出CSV应提示无数据', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.exportLogs('csv')
      expect(alertSpy).toHaveBeenCalledWith('无数据可导出')

      alertSpy.mockRestore()
    })

    it('有数据时导出CSV应创建Blob并触发下载', async () => {
      seedLogs(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportLogs('csv')

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('有数据时导出Excel应创建Blob', async () => {
      seedLogs(store, 2)
      const wrapper = mountComponent()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportLogs('excel')
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })

    it('导出PDF应调用window.open', async () => {
      seedLogs(store, 2)
      const wrapper = mountComponent()

      const openSpy = vi.spyOn(window, 'open').mockReturnValue({ document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() })

      await wrapper.vm.exportLogs('pdf')
      expect(openSpy).toHaveBeenCalledWith('', '_blank')

      openSpy.mockRestore()
    })
  })

  /* ===== 导出菜单 ===== */
  describe('导出菜单', () => {
    it('点击导出按钮应切换菜单显示', async () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.showExportMenu).toBe(false)

      const btn = wrapper.find('.btn-secondary')
      await btn.trigger('click')
      expect(wrapper.vm.showExportMenu).toBe(true)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('userOptions 应返回去重用户列表', () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()

      const users = wrapper.vm.userOptions
      expect(users.length).toBeGreaterThan(0)
      expect(new Set(users).size).toBe(users.length)
    })

    it('filteredLogs 应根据搜索条件过滤', () => {
      seedLogs(store, 5)
      const wrapper = mountComponent()
      wrapper.vm.filters.search = '报价'
      expect(wrapper.vm.filteredLogs.length).toBeGreaterThan(0)
      wrapper.vm.filteredLogs.forEach(l => {
        expect((l.action + l.detail + l.user).toLowerCase()).toContain('报价')
      })
    })

    it('isSensitiveAction 应正确识别敏感操作', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.isSensitiveAction('删除客户')).toBe(true)
      expect(wrapper.vm.isSensitiveAction('修改库存')).toBe(true)
      expect(wrapper.vm.isSensitiveAction('审批报价')).toBe(true)
      expect(wrapper.vm.isSensitiveAction('导出报表')).toBe(true)
      expect(wrapper.vm.isSensitiveAction('创建报价')).toBe(false)
    })

    it('actionBadge 应返回正确的badge类名', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.actionBadge('删除客户')).toBe('danger')
      expect(wrapper.vm.actionBadge('创建报价')).toBe('success')
      expect(wrapper.vm.actionBadge('修改库存')).toBe('warning')
      expect(wrapper.vm.actionBadge('审批合同')).toBe('info')
      expect(wrapper.vm.actionBadge('查看详情')).toBe('neutral')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应尝试渲染图表', () => {
      const wrapper = mountComponent()
      // 组件挂载后 nextTick 中调用 renderTrendChart/renderModuleChart
      expect(wrapper.vm.trendCanvas).toBeDefined()
      expect(wrapper.vm.moduleCanvas).toBeDefined()
    })

    it('卸载时应清理canvas', () => {
      const wrapper = mountComponent()
      wrapper.unmount()
      // 不应抛出异常
    })
  })
})
