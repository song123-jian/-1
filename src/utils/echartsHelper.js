/**
 * ECharts 统一管理工具
 * 封装 init/dispose/resize，防止内存泄漏
 */
let echartsPromise = null
let echartsModule = null

async function loadEcharts() {
  if (echartsModule) return echartsModule

  if (!echartsPromise) {
    echartsPromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/features'),
      import('echarts/renderers')
    ]).then(([core, charts, components, features, renderers]) => {
      const echarts = core

      echarts.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        charts.GaugeChart,
        charts.RadarChart,
        components.TooltipComponent,
        components.LegendComponent,
        components.GridComponent,
        components.DataZoomComponent,
        features.LabelLayout,
        renderers.CanvasRenderer
      ])

      echartsModule = echarts
      return echarts
    })
  }

  return echartsPromise
}

/** 实例管理 Map */
const instanceMap = new Map()

/**
 * 初始化ECharts实例
 * @param {HTMLElement} el - 挂载元素
 * @param {string} theme - 主题名
 * @param {object} opts - 额外选项
 * @returns {echarts.ECharts}
 */
export async function initChart(el, theme = 'dark-tech', opts = {}) {
  const echarts = await loadEcharts()
  if (instanceMap.has(el)) {
    instanceMap.get(el).dispose()
  }
  const instance = echarts.init(el, theme, { renderer: 'canvas', ...opts })
  instanceMap.set(el, instance)
  return instance
}

/**
 * 获取已有实例
 */
export function getChartInstance(el) {
  return instanceMap.get(el) || null
}

/**
 * 销毁实例
 */
export function disposeChart(el) {
  const instance = instanceMap.get(el)
  if (instance) {
    instance.dispose()
    instanceMap.delete(el)
  }
}

/**
 * 设置option（增量更新）
 */
export function setChartOption(el, option, opts = {}) {
  const instance = instanceMap.get(el)
  if (instance) {
    instance.setOption(option, { notMerge: false, lazyUpdate: false, ...opts })
  }
}

/**
 * 显示loading
 */
export function showChartLoading(el, text = '加载中...') {
  const instance = instanceMap.get(el)
  if (instance) {
    instance.showLoading({
      text,
      color: '#00d4ff',
      maskColor: 'rgba(10, 14, 39, 0.8)',
      fontSize: 14
    })
  }
}

/**
 * 隐藏loading
 */
export function hideChartLoading(el) {
  const instance = instanceMap.get(el)
  if (instance) {
    instance.hideLoading()
  }
}

/**
 * resize所有实例
 */
let resizeTimer = null
export function resizeAllCharts() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    instanceMap.forEach((instance) => {
      if (instance && !instance.isDisposed()) {
        instance.resize()
      }
    })
  }, 300)
}

/** 监听window resize */
if (typeof window !== 'undefined') {
  window.addEventListener('resize', resizeAllCharts)
}

/**
 * 销毁所有实例（页面卸载时调用）
 */
export function disposeAllCharts() {
  instanceMap.forEach((instance) => {
    if (instance && !instance.isDisposed()) {
      instance.dispose()
    }
  })
  instanceMap.clear()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeAllCharts)
  }
}

export async function ensureEcharts() {
  return loadEcharts()
}
