/**
 * 自适应布局响应式工具
 * 提供响应式断点检测、设备类型判断、布局状态管理
 * 支持：
 * - 断点检测（mobile/tablet/desktop/widescreen）
 * - 设备类型判断（触摸屏/移动设备/桌面）
 * - 布局模式自动切换
 * - 屏幕方向变化检测
 * - 响应式CSS变量注入
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

/* 断点定义 */
const BREAKPOINTS = {
  mobile: 768,       /* 手机 */
  tablet: 1024,      /* 平板 */
  desktop: 1440,     /* 桌面 */
  widescreen: 1920   /* 宽屏 */
}

/* 设备类型枚举 */
export const DeviceType = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  WIDESCREEN: 'widescreen'
}

/* 布局模式 */
export const LayoutMode = {
  COMPACT: 'compact',     /* 紧凑模式：侧边栏收起，内容区最大化 */
  STANDARD: 'standard',   /* 标准模式：侧边栏展开，正常间距 */
  COMFORTABLE: 'comfortable' /* 舒适模式：宽屏，更大间距 */
}

class ResponsiveManager {
  constructor() {
    /* 当前屏幕宽度 */
    this._width = ref(window.innerWidth)
    /* 当前屏幕高度 */
    this._height = ref(window.innerHeight)
    /* 屏幕方向 */
    this._orientation = ref(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
    /* 是否触摸设备 */
    this._isTouchDevice = ref(false)
    /* 是否移动设备 */
    this._isMobile = ref(false)
    /* resize监听器引用 */
    this._resizeHandler = null
    /* orientation监听器引用 */
    this._orientationHandler = null
    /* 是否已初始化 */
    this._initialized = false
    /* 布局状态回调 */
    this._layoutChangeCallbacks = []

    /* 检测触摸设备 */
    this._detectTouchDevice()
  }

  /**
   * 初始化响应式管理器
   */
  init() {
    if (this._initialized) return

    /* 监听窗口大小变化 */
    this._resizeHandler = this._debounce(() => {
      this._width.value = window.innerWidth
      this._height.value = window.innerHeight
      this._orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      this._isMobile.value = window.innerWidth < BREAKPOINTS.tablet

      /* 更新CSS变量 */
      this._updateCSSVariables()

      /* 通知布局变更 */
      this._notifyLayoutChange()
    }, 100)

    window.addEventListener('resize', this._resizeHandler)

    /* 监听屏幕方向变化 */
    this._orientationHandler = () => {
      this._orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      this._notifyLayoutChange()
    }
    window.addEventListener('orientationchange', this._orientationHandler)

    /* 初始设置 */
    this._isMobile.value = window.innerWidth < BREAKPOINTS.tablet
    this._updateCSSVariables()

    this._initialized = true
    console.info('[Responsive] 响应式管理器已初始化')
  }

  /**
   * 当前设备类型
   */
  get deviceType() {
    const w = this._width.value
    if (w < BREAKPOINTS.mobile) return DeviceType.MOBILE
    if (w < BREAKPOINTS.tablet) return DeviceType.TABLET
    if (w < BREAKPOINTS.desktop) return DeviceType.DESKTOP
    return DeviceType.WIDESCREEN
  }

  /**
   * 当前布局模式
   */
  get layoutMode() {
    const w = this._width.value
    if (w < BREAKPOINTS.mobile) return LayoutMode.COMPACT
    if (w < BREAKPOINTS.desktop) return LayoutMode.STANDARD
    return LayoutMode.COMFORTABLE
  }

  /**
   * 是否手机
   */
  get isMobile() {
    return this._width.value < BREAKPOINTS.mobile
  }

  /**
   * 是否平板
   */
  get isTablet() {
    return this._width.value >= BREAKPOINTS.mobile && this._width.value < BREAKPOINTS.tablet
  }

  /**
   * 是否桌面
   */
  get isDesktop() {
    return this._width.value >= BREAKPOINTS.tablet
  }

  /**
   * 是否宽屏
   */
  get isWidescreen() {
    return this._width.value >= BREAKPOINTS.widescreen
  }

  /**
   * 是否触摸设备
   */
  get isTouchDevice() {
    return this._isTouchDevice.value
  }

  /**
   * 屏幕宽度
   */
  get screenWidth() {
    return this._width.value
  }

  /**
   * 屏幕高度
   */
  get screenHeight() {
    return this._height.value
  }

  /**
   * 屏幕方向
   */
  get orientation() {
    return this._orientation.value
  }

  /**
   * 获取推荐的侧边栏宽度
   */
  get recommendedSidebarWidth() {
    if (this.isMobile) return '100%'
    if (this.isTablet) return '220px'
    if (this.isWidescreen) return '280px'
    return '260px'
  }

  /**
   * 获取推荐的内容区最大宽度
   */
  get recommendedContentMaxWidth() {
    if (this.isMobile) return '100%'
    if (this.isTablet) return '100%'
    if (this.isWidescreen) return '1600px'
    return '1440px'
  }

  /**
   * 获取推荐的间距
   */
  get recommendedSpacing() {
    if (this.isMobile) return 'var(--space-3)'
    if (this.isTablet) return 'var(--space-4)'
    return 'var(--space-6)'
  }

  /**
   * 是否应显示侧边栏
   */
  get shouldShowSidebar() {
    return this.isDesktop
  }

  /**
   * 是否应使用汉堡菜单
   */
  get shouldUseHamburger() {
    return !this.isDesktop
  }

  /**
   * 是否应使用紧凑表格
   */
  get shouldUseCompactTable() {
    return this.isMobile || this.isTablet
  }

  /**
   * 注册布局变更回调
   * @param {Function} callback - 回调函数 (deviceType, layoutMode) => void
   */
  onLayoutChange(callback) {
    this._layoutChangeCallbacks.push(callback)
  }

  /**
   * 移除布局变更回调
   * @param {Function} callback
   */
  offLayoutChange(callback) {
    this._layoutChangeCallbacks = this._layoutChangeCallbacks.filter(cb => cb !== callback)
  }

  /**
   * 更新CSS变量
   */
  _updateCSSVariables() {
    const root = document.documentElement
    root.setAttribute('data-device', this.deviceType)
    root.setAttribute('data-layout', this.layoutMode)

    /* 注入响应式CSS变量 */
    root.style.setProperty('--viewport-width', this._width.value + 'px')
    root.style.setProperty('--viewport-height', this._height.value + 'px')
    root.style.setProperty('--content-padding', this.recommendedSpacing)
    root.style.setProperty('--content-max-width', this.recommendedContentMaxWidth)

    /* 移动端特殊变量 */
    if (this.isMobile) {
      root.style.setProperty('--sidebar-width', '0px')
      root.style.setProperty('--topbar-height', '48px')
      root.style.setProperty('--table-row-height', '44px')
      root.style.setProperty('--card-padding', 'var(--space-3)')
      root.style.setProperty('--grid-gap', 'var(--space-3)')
    } else if (this.isTablet) {
      root.style.setProperty('--topbar-height', '52px')
      root.style.setProperty('--table-row-height', '40px')
      root.style.setProperty('--card-padding', 'var(--space-4)')
      root.style.setProperty('--grid-gap', 'var(--space-4)')
    } else {
      root.style.setProperty('--topbar-height', '56px')
      root.style.setProperty('--table-row-height', '36px')
      root.style.setProperty('--card-padding', 'var(--space-5)')
      root.style.setProperty('--grid-gap', 'var(--space-6)')
    }
  }

  /**
   * 通知布局变更
   */
  _notifyLayoutChange() {
    const deviceType = this.deviceType
    const layoutMode = this.layoutMode
    for (const cb of this._layoutChangeCallbacks) {
      try {
        cb(deviceType, layoutMode)
      } catch (e) {
        console.warn('[Responsive] 布局变更回调错误:', e)
      }
    }
  }

  /**
   * 检测触摸设备
   */
  _detectTouchDevice() {
    this._isTouchDevice.value = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  /**
   * 防抖函数
   */
  _debounce(fn, delay = 100) {
    let timer = null
    return (...args) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), delay)
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
    }
    if (this._orientationHandler) {
      window.removeEventListener('orientationchange', this._orientationHandler)
    }
    this._layoutChangeCallbacks = []
    this._initialized = false
  }
}

/* 全局单例 */
const responsive = new ResponsiveManager()

/**
 * Vue组合式函数：使用响应式布局
 * @returns {Object} 响应式布局状态
 */
export function useResponsive() {
  const deviceType = computed(() => responsive.deviceType)
  const layoutMode = computed(() => responsive.layoutMode)
  const isMobile = computed(() => responsive.isMobile)
  const isTablet = computed(() => responsive.isTablet)
  const isDesktop = computed(() => responsive.isDesktop)
  const isWidescreen = computed(() => responsive.isWidescreen)
  const isTouchDevice = computed(() => responsive.isTouchDevice)
  const screenWidth = computed(() => responsive.screenWidth)
  const screenHeight = computed(() => responsive.screenHeight)
  const orientation = computed(() => responsive.orientation)
  const shouldUseHamburger = computed(() => responsive.shouldUseHamburger)
  const shouldUseCompactTable = computed(() => responsive.shouldUseCompactTable)

  return {
    deviceType, layoutMode,
    isMobile, isTablet, isDesktop, isWidescreen,
    isTouchDevice, screenWidth, screenHeight, orientation,
    shouldUseHamburger, shouldUseCompactTable,
    responsive
  }
}

export default responsive
