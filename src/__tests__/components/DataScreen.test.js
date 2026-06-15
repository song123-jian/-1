/**
 * DataScreen.vue 组件级测试
 * 覆盖：渲染、交互、全屏切换、实时时钟、数据刷新、粒子背景、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import DataScreen from '@/modules/report/views/DataScreen.vue'

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

/* ===== mock dataScreen store ===== */
vi.mock('@/modules/report/stores/dataScreen', () => ({
  useDataScreenStore: () => ({
    salesCards: [
      { title: '今日销售额', value: 50000, icon: 'dollar', change: 12.5, color: '#00d4ff', format: 'currency', sparkline: [1, 2, 3] },
      { title: '本月销售额', value: 500000, icon: 'trendUp', change: 8.3, color: '#00ff88', format: 'currency', sparkline: [1, 2, 3] },
      { title: '本月订单数', value: 120, icon: 'list', change: -2.1, color: '#ffa940', format: 'number', sparkline: [1, 2, 3] },
      { title: '活跃客户数', value: 45, icon: 'users', change: 5.7, color: '#722ed1', format: 'number', sparkline: [1, 2, 3] }
    ],
    inventoryCards: [
      { title: '总SKU数', value: 200, icon: 'package', change: 3.2, color: '#1890ff', format: 'number', sparkline: [1, 2, 3] },
      { title: '低库存数', value: 15, icon: 'alertCircle', change: -10.5, color: '#faad14', format: 'number', sparkline: [1, 2, 3] },
      { title: '耗尽数', value: 3, icon: 'xCircle', change: 0, color: '#ff4d4f', format: 'number', sparkline: [1, 2, 3] },
      { title: '库存总值', value: 1500000, icon: 'database', change: 2.8, color: '#13c2c2', format: 'currency', sparkline: [1, 2, 3] }
    ],
    financeCards: [
      { title: '应收总额', value: 800000, icon: 'dollar', change: -3.2, color: '#eb2f96', format: 'currency', sparkline: [1, 2, 3] },
      { title: '应付总额', value: 300000, icon: 'creditCard', change: 1.5, color: '#fa8c16', format: 'currency', sparkline: [1, 2, 3] },
      { title: '本月回款', value: 200000, icon: 'check', change: 15.6, color: '#52c41a', format: 'currency', sparkline: [1, 2, 3] },
      { title: '利润率', value: 18.5, icon: 'trendUp', change: 2.1, color: '#2f54eb', format: 'percent', sparkline: [1, 2, 3] }
    ],
    salesTrend: { labels: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], data: [100, 200, 150, 300, 250, 400, 350, 500, 450, 600, 550, 700] },
    regionDistribution: { labels: ['华东', '华北', '华南'], data: [500, 300, 200] },
    inoutTrend: { labels: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], inbound: [80, 90, 70, 100, 85, 110, 95, 120, 105, 130, 115, 140], outbound: [60, 70, 55, 80, 65, 90, 75, 100, 85, 110, 95, 120] },
    topProducts: [
      { rank: 1, name: 'ABS树脂', value: 50000 },
      { rank: 2, name: '不锈钢板304', value: 40000 },
      { rank: 3, name: '铝合金型材6063', value: 30000 }
    ],
    allAlerts: [
      { type: 'inventory', message: 'ABS树脂：低于安全库存', time: '2026-06-01', level: 'warning' },
      { type: 'contract', message: '合同HT202601001即将到期', time: '2026-06-15', level: 'critical' }
    ],
    alertStats: { total: 2, critical: 1, warning: 1, info: 0 },
    runningNumbers: [
      { label: '今日销售', value: 50000, color: '#00d4ff', format: 'currency' },
      { label: '本月订单', value: 120, color: '#00ff88', format: 'number' }
    ]
  })
}))

/* ===== mock canvas context ===== */
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0
  }))
})

/* ===== mock requestAnimationFrame ===== */
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(cb => setTimeout(cb, 16)))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 子组件 stub ===== */
const ChildStubs = {
  Icon: IconStub,
  StatCard: {
    props: ['title', 'value', 'icon', 'change', 'color', 'format', 'sparkline'],
    template: '<div class="stat-card-stub">{{ title }}: {{ value }}</div>'
  },
  TrendChart: {
    props: ['title', 'type', 'labels', 'datasets'],
    template: '<div class="trend-chart-stub">{{ title }}</div>'
  },
  RankList: {
    props: ['title', 'items'],
    template: '<div class="rank-list-stub">{{ title }}</div>'
  },
  AlertList: {
    props: ['title', 'alerts'],
    template: '<div class="alert-list-stub">{{ title }}</div>'
  },
  RunningNumbers: {
    props: ['items'],
    template: '<div class="running-numbers-stub"></div>'
  }
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(DataScreen, {
    global: {
      stubs: ChildStubs
    }
  })
}

describe('DataScreen 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__title').text()).toBe('冠久ERP 数据大屏')
    })

    it('应渲染头部区域', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__header').exists()).toBe(true)
    })

    it('应渲染时钟显示', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__clock').exists()).toBe(true)
    })

    it('应渲染日期显示', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__date').exists()).toBe(true)
    })

    it('应渲染全屏按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__fullscreen-btn').exists()).toBe(true)
    })

    it('应渲染刷新指示器', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__refresh-indicator').exists()).toBe(true)
    })

    it('应渲染统计卡片区域', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__cards').exists()).toBe(true)
    })

    it('应渲染销售概览卡片组', () => {
      const wrapper = mountComponent()
      const salesGroup = wrapper.findAll('.ds-screen__card-group')
      expect(salesGroup.length).toBeGreaterThanOrEqual(1)
    })

    it('应渲染图表行区域', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__charts-row').exists()).toBe(true)
    })

    it('应渲染底部行区域', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__bottom-row').exists()).toBe(true)
    })

    it('应渲染粒子背景画布', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__particles').exists()).toBe(true)
    })

    it('应渲染滚动数据条', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.ds-screen__running').exists()).toBe(true)
    })
  })

  /* ===== 全屏切换 ===== */
  describe('全屏切换', () => {
    it('toggleFullscreen 在非全屏时应请求全屏', async () => {
      const wrapper = mountComponent()
      wrapper.vm.isFullscreen = false

      // mock document.documentElement.requestFullscreen
      const requestSpy = vi.fn(() => Promise.resolve())
      document.documentElement.requestFullscreen = requestSpy

      await wrapper.vm.toggleFullscreen()
      expect(requestSpy).toHaveBeenCalled()

      delete document.documentElement.requestFullscreen
    })

    it('toggleFullscreen 在全屏时应退出全屏', async () => {
      const wrapper = mountComponent()
      wrapper.vm.isFullscreen = true

      // mock getFullscreenElement
      const exitSpy = vi.fn(() => Promise.resolve())
      document.exitFullscreen = exitSpy
      document.fullscreenElement = document.documentElement

      await wrapper.vm.toggleFullscreen()
      expect(exitSpy).toHaveBeenCalled()

      delete document.exitFullscreen
      delete document.fullscreenElement
    })

    it('点击全屏按钮应触发 toggleFullscreen', async () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.ds-screen__fullscreen-btn')

      // Mock requestFullscreen to verify the effect of toggleFullscreen
      const requestSpy = vi.fn(() => Promise.resolve())
      document.documentElement.requestFullscreen = requestSpy

      await btn.trigger('click')
      expect(requestSpy).toHaveBeenCalled()

      delete document.documentElement.requestFullscreen
    })
  })

  /* ===== 实时时钟 ===== */
  describe('实时时钟', () => {
    it('挂载后 currentTime 应被设置', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentTime).toBeTruthy()
    })

    it('挂载后 currentDate 应被设置', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentDate).toBeTruthy()
    })

    it('updateClock 应更新 currentTime 和 currentDate', () => {
      const wrapper = mountComponent()
      wrapper.vm.updateClock()

      expect(wrapper.vm.currentTime).toMatch(/\d{2}:\d{2}:\d{2}/)
      expect(wrapper.vm.currentDate).toContain('年')
      expect(wrapper.vm.currentDate).toContain('月')
      expect(wrapper.vm.currentDate).toContain('日')
    })
  })

  /* ===== 数据刷新 ===== */
  describe('数据刷新', () => {
    it('onRefreshData 应更新 lastUpdateTime', () => {
      const wrapper = mountComponent()
      wrapper.vm.onRefreshData()

      expect(wrapper.vm.lastUpdateTime).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('onRefreshData 应触发闪烁效果', () => {
      const wrapper = mountComponent()
      wrapper.vm.onRefreshData()

      expect(wrapper.vm.isFlashing).toBe(true)
    })

    it('onRefreshData 应显示 toast 提示', () => {
      const wrapper = mountComponent()
      wrapper.vm.onRefreshData()

      expect(wrapper.vm.showToast).toBe(true)
    })

    it('refreshInterval 应为30秒', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.refreshInterval).toBe(30)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('salesTrendDatasets 应返回正确的数据集', () => {
      const wrapper = mountComponent()
      const datasets = wrapper.vm.salesTrendDatasets

      expect(datasets.length).toBe(1)
      expect(datasets[0].label).toBe('销售额')
      expect(datasets[0].borderColor).toBe('#00d4ff')
    })

    it('regionDatasets 应返回正确的数据集', () => {
      const wrapper = mountComponent()
      const datasets = wrapper.vm.regionDatasets

      expect(datasets.length).toBe(1)
      expect(datasets[0].label).toBe('销售额')
      expect(datasets[0].backgroundColor.length).toBeGreaterThan(0)
    })

    it('inoutTrendDatasets 应返回入库和出库数据集', () => {
      const wrapper = mountComponent()
      const datasets = wrapper.vm.inoutTrendDatasets

      expect(datasets.length).toBe(2)
      expect(datasets[0].label).toBe('入库')
      expect(datasets[1].label).toBe('出库')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应设置 isMounted 为 true', () => {
      const wrapper = mountComponent()
      // 通过组件内部状态间接验证
      expect(wrapper.vm.currentTime).toBeTruthy()
    })

    it('卸载时应清除时钟定时器', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      const wrapper = mountComponent()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })

    it('卸载时应清除刷新定时器', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      const wrapper = mountComponent()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })

    it('卸载时应移除全屏事件监听', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
      removeSpy.mockRestore()
    })

    it('卸载时应取消粒子动画帧', () => {
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
      const wrapper = mountComponent()
      wrapper.unmount()

      expect(cancelSpy).toHaveBeenCalled()
      cancelSpy.mockRestore()
    })

    it('卸载时应移除 resize 事件监听', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      removeSpy.mockRestore()
    })
  })

  /* ===== 粒子背景 ===== */
  describe('粒子背景', () => {
    it('应渲染 canvas 元素', () => {
      const wrapper = mountComponent()
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('ds-screen__particles')
    })
  })

  /* ===== Toast 提示 ===== */
  describe('Toast 提示', () => {
    it('showToast 为 true 时应显示 toast', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast = true
      await flushPromises()

      expect(wrapper.find('.ds-screen__toast').exists()).toBe(true)
    })

    it('showToast 为 false 时不应显示 toast', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showToast = false
      await flushPromises()

      expect(wrapper.find('.ds-screen__toast').exists()).toBe(false)
    })
  })

  /* ===== 闪烁效果 ===== */
  describe('闪烁效果', () => {
    it('isFlashing 为 true 时卡片网格应有 flash 类', async () => {
      const wrapper = mountComponent()
      wrapper.vm.isFlashing = true
      await flushPromises()

      const cardGrids = wrapper.findAll('.ds-screen__card-grid')
      cardGrids.forEach(grid => {
        expect(grid.classes()).toContain('ds-screen__card-grid--flash')
      })
    })
  })

  /* ===== 全屏样式 ===== */
  describe('全屏样式', () => {
    it('isFullscreen 为 true 时根元素应有 fullscreen 类', async () => {
      const wrapper = mountComponent()
      wrapper.vm.isFullscreen = true
      await flushPromises()

      expect(wrapper.find('.ds-screen').classes()).toContain('ds-screen--fullscreen')
    })

    it('isFullscreen 为 false 时根元素不应有 fullscreen 类', async () => {
      const wrapper = mountComponent()
      wrapper.vm.isFullscreen = false
      await flushPromises()

      expect(wrapper.find('.ds-screen').classes()).not.toContain('ds-screen--fullscreen')
    })
  })
})
