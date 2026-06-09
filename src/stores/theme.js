import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // ============ State ============
  const currentTheme = ref(localStorage.getItem('gj_erp_theme') || 'ocean')
  const currentPreset = ref(localStorage.getItem('gj_erp_activePreset') || '')
  const currentMode = ref(localStorage.getItem('gj_erp_themeMode') || 'dark')

  // 高级主题设置
  const themeSettings = ref({
    brightness: 100,
    fontScale: 100,
    lineHeight: 1.6,
    spacingScale: 100,
    layoutPadding: 1.0,
    layoutGap: 1.0,
    componentRadius: 0.5,
    bgType: 'solid',
    bgColor: '#0f172a',
    gradientColor: '#1e293b',
    gradientColor2: '#0f172a',
    gradientDir: 'to bottom',
    cardBg: '#1e293b',
    surfaceElevated: '#1a2332',
    borderColor: '#475569',
    shadowEnabled: true,
    shadowIntensity: 50,
    splash: '星空粒子',
    splashBgPattern: 'auto',
    accentColor: '#3b82f6',
    accentHover: '#60a5fa',
    // 自动主题切换设置
    autoSwitch: {
      enabled: false,
      followSystem: true,
      schedule: {
        lightStart: '07:00',
        darkStart: '19:00'
      }
    },
    // 动画设置
    animation: {
      enabled: true,
      transitionDuration: 300,
      reduceMotion: false
    },
    // 无障碍设置
    accessibility: {
      highContrast: false,
      largeText: false,
      focusVisible: true
    }
  })

  // ============ Theme Data ============
  const themes = [
    { key: 'ocean', name: '海洋蓝', color: '#3b82f6', desc: '专业沉稳，适合企业办公' },
    { key: 'forest', name: '森林绿', color: '#22c55e', desc: '自然清新，适合环保行业' },
    { key: 'sunset', name: '日落橙', color: '#f59e0b', desc: '温暖活力，适合营销团队' },
    { key: 'royal', name: '皇家紫', color: '#a855f7', desc: '高贵典雅，适合设计团队' },
    { key: 'crimson', name: '赤焰红', color: '#ef4444', desc: '热情奔放，适合销售团队' },
    { key: 'emerald', name: '翡翠绿', color: '#10b981', desc: '清新明亮，适合数据看板' },
    { key: 'rose', name: '玫瑰粉', color: '#f43f5e', desc: '温柔浪漫，适合创意团队' },
    { key: 'indigo', name: '靛蓝', color: '#6366f1', desc: '深邃智慧，适合技术团队' },
    { key: 'amber', name: '琥珀', color: '#f59e0b', desc: '经典稳重，适合传统行业' },
    { key: 'teal', name: '青绿', color: '#14b8a6', desc: '现代简约，适合科技行业' },
    { key: 'pink', name: '粉色', color: '#ec4899', desc: '活泼可爱，适合年轻团队' },
    { key: 'slate', name: '石板灰', color: '#64748b', desc: '低调内敛，适合金融行业' },
    { key: 'sky', name: '天空蓝', color: '#0ea5e9', desc: '清爽明朗，适合教育行业' },
    { key: 'lime', name: '青柠', color: '#84cc16', desc: '活力四射，适合运动品牌' },
    { key: 'orange', name: '橙色', color: '#f97316', desc: '热情创新，适合创业团队' },
    { key: 'cyan', name: '青色', color: '#06b6d4', desc: '冷静理性，适合医疗行业' },
    { key: 'violet', name: '紫罗兰', color: '#8b5cf6', desc: '神秘优雅，适合艺术行业' },
    { key: 'yellow', name: '黄色', color: '#eab308', desc: '阳光积极，适合儿童产品' }
  ]

  const presets = [
    { key: 'aurora', name: '极光', desc: '梦幻极光色调' },
    { key: 'deepOcean', name: '深海', desc: '深邃海洋风格' },
    { key: 'minimal', name: '极简', desc: '纯净简洁风格' },
    { key: 'nature', name: '自然', desc: '绿色生态风格' }
  ]

  const modes = [
    { key: 'dark', name: '深色', icon: 'moon', desc: '深色背景，适合夜间使用' },
    { key: 'light', name: '浅色', icon: 'sun', desc: '浅色背景，适合日间使用' },
    { key: 'warm', name: '暖色', icon: 'zap', desc: '暖色调，舒适温馨' },
    { key: 'cold', name: '冷色', icon: 'circle', desc: '冷色调，清爽专注' },
    { key: 'highcontrast', name: '高对比', icon: 'circle', desc: '高对比度，提升可读性' },
    { key: 'soft', name: '柔和', icon: 'circle', desc: '柔和色调，减少视觉疲劳' },
    { key: 'vintage', name: '复古', icon: 'image', desc: '复古风格，经典怀旧' },
    { key: 'cyberpunk', name: '赛博', icon: 'building', desc: '赛博朋克，未来科技' },
    { key: 'grayscale', name: '灰度', icon: 'circle', desc: '灰度模式，专注工作' },
    { key: 'morandi', name: '莫兰迪', icon: 'palette', desc: '莫兰迪色系，高级质感' },
    { key: 'eyecare', name: '护眼绿', icon: 'sun', desc: '护眼模式，长时间使用' }
  ]

  // ============ Computed ============
  const currentThemeInfo = computed(() =>
    themes.find(t => t.key === currentTheme.value) || themes[0]
  )

  const currentModeInfo = computed(() =>
    modes.find(m => m.key === currentMode.value) || modes[0]
  )

  const isDark = computed(() =>
    currentMode.value === 'dark' || currentMode.value === 'cyberpunk' || currentMode.value === 'highcontrast'
  )

  const effectiveTransitionDuration = computed(() =>
    themeSettings.value.animation.reduceMotion ? 0 : themeSettings.value.animation.transitionDuration
  )

  // ============ Helpers ============
  function applyToDocument() {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.setAttribute('data-theme', currentTheme.value)
    html.setAttribute('data-preset', currentPreset.value)
    html.setAttribute('data-mode', currentMode.value)

    // 应用高级设置
    const s = themeSettings.value
    html.style.setProperty('--theme-brightness', s.brightness / 100)
    html.style.setProperty('--theme-font-scale', s.fontScale / 100)
    html.style.setProperty('--theme-line-height', s.lineHeight)
    html.style.setProperty('--theme-spacing-scale', s.spacingScale / 100)
    html.style.setProperty('--theme-layout-padding', `${s.layoutPadding}rem`)
    html.style.setProperty('--theme-layout-gap', `${s.layoutGap}rem`)
    html.style.setProperty('--theme-component-radius', `${s.componentRadius}rem`)
    html.style.setProperty('--theme-accent', s.accentColor)
    html.style.setProperty('--theme-accent-hover', s.accentHover)
    html.style.setProperty('--theme-transition-duration', `${effectiveTransitionDuration.value}ms`)

    // 应用无障碍设置
    if (s.accessibility.highContrast) {
      html.classList.add('high-contrast')
    } else {
      html.classList.remove('high-contrast')
    }
    if (s.accessibility.reduceMotion || s.animation.reduceMotion) {
      html.classList.add('reduce-motion')
    } else {
      html.classList.remove('reduce-motion')
    }

    // 应用亮度
    if (s.brightness !== 100) {
      html.style.filter = `brightness(${s.brightness / 100})`
    } else {
      html.style.filter = ''
    }
  }

  function persist() {
    localStorage.setItem('gj_erp_theme', currentTheme.value)
    localStorage.setItem('gj_erp_activePreset', currentPreset.value)
    localStorage.setItem('gj_erp_themeMode', currentMode.value)
    localStorage.setItem('gj_erp_themeSettings', JSON.stringify(themeSettings.value))
  }

  // ============ Actions ============
  function setTheme(themeKey) {
    currentTheme.value = themeKey
    const theme = themes.find(t => t.key === themeKey)
    if (theme) {
      themeSettings.value.accentColor = theme.color
      // 自动计算hover色
      themeSettings.value.accentHover = adjustBrightness(theme.color, 20)
    }
    applyToDocument()
    persist()
  }

  function setPreset(presetKey) {
    currentPreset.value = presetKey
    applyToDocument()
    persist()
  }

  function setMode(mode) {
    currentMode.value = mode
    applyToDocument()
    persist()
  }

  function toggleMode() {
    const newMode = currentMode.value === 'dark' ? 'light' : 'dark'
    setMode(newMode)
  }

  function updateSettings(partial) {
    Object.assign(themeSettings.value, partial)
    applyToDocument()
    persist()
  }

  function resetToDefault() {
    currentTheme.value = 'ocean'
    currentPreset.value = ''
    currentMode.value = 'dark'
    themeSettings.value = {
      brightness: 100,
      fontScale: 100,
      lineHeight: 1.6,
      spacingScale: 100,
      layoutPadding: 1.0,
      layoutGap: 1.0,
      componentRadius: 0.5,
      bgType: 'solid',
      bgColor: '#0f172a',
      gradientColor: '#1e293b',
      gradientColor2: '#0f172a',
      gradientDir: 'to bottom',
      cardBg: '#1e293b',
      surfaceElevated: '#1a2332',
      borderColor: '#475569',
      shadowEnabled: true,
      shadowIntensity: 50,
      splash: '星空粒子',
      splashBgPattern: 'auto',
      accentColor: '#3b82f6',
      accentHover: '#60a5fa',
      autoSwitch: {
        enabled: false,
        followSystem: true,
        schedule: { lightStart: '07:00', darkStart: '19:00' }
      },
      animation: { enabled: true, transitionDuration: 300, reduceMotion: false },
      accessibility: { highContrast: false, largeText: false, focusVisible: true }
    }
    applyToDocument()
    persist()
  }

  // ============ Import / Export ============
  function exportTheme() {
    return JSON.stringify({
      theme: currentTheme.value,
      preset: currentPreset.value,
      mode: currentMode.value,
      settings: themeSettings.value,
      exportAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2)
  }

  function importTheme(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      if (data.theme) currentTheme.value = data.theme
      if (data.preset !== undefined) currentPreset.value = data.preset
      if (data.mode) currentMode.value = data.mode
      if (data.settings) Object.assign(themeSettings.value, data.settings)
      applyToDocument()
      persist()
      return { success: true, message: '主题导入成功' }
    } catch (e) {
      return { success: false, message: '主题导入失败：' + e.message }
    }
  }

  // ============ Auto Switch ============
  let autoSwitchTimer = null
  let systemMediaQuery = null

  function checkAutoSwitch() {
    const s = themeSettings.value.autoSwitch
    if (!s.enabled) return

    if (s.followSystem && typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const targetMode = prefersDark ? 'dark' : 'light'
      if (currentMode.value !== targetMode) {
        setMode(targetMode)
      }
      return
    }

    // 按时间 schedule 切换
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const { lightStart, darkStart } = s.schedule

    let targetMode = currentMode.value
    if (lightStart <= darkStart) {
      // 正常时间段
      if (currentTime >= lightStart && currentTime < darkStart) {
        targetMode = 'light'
      } else {
        targetMode = 'dark'
      }
    } else {
      // 跨午夜
      if (currentTime >= lightStart || currentTime < darkStart) {
        targetMode = 'light'
      } else {
        targetMode = 'dark'
      }
    }

    if (currentMode.value !== targetMode) {
      setMode(targetMode)
    }
  }

  function startAutoSwitch() {
    stopAutoSwitch()
    checkAutoSwitch()
    // 每分钟检查一次
    autoSwitchTimer = setInterval(checkAutoSwitch, 60000)

    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => {
        if (themeSettings.value.autoSwitch.enabled && themeSettings.value.autoSwitch.followSystem) {
          checkAutoSwitch()
        }
      }
      if (systemMediaQuery.addEventListener) {
        systemMediaQuery.addEventListener('change', handler)
      } else if (systemMediaQuery.addListener) {
        systemMediaQuery.addListener(handler)
      }
    }
  }

  function stopAutoSwitch() {
    if (autoSwitchTimer) {
      clearInterval(autoSwitchTimer)
      autoSwitchTimer = null
    }
  }

  // ============ Utility ============
  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }

  // ============ Init ============
  function init() {
    // 恢复高级设置
    try {
      const saved = localStorage.getItem('gj_erp_themeSettings')
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.assign(themeSettings.value, parsed)
      }
    } catch (e) {
      console.warn('[theme] 恢复主题设置失败:', e)
    }

    applyToDocument()

    // 启动自动切换
    if (themeSettings.value.autoSwitch.enabled) {
      startAutoSwitch()
    }
  }

  // 监听设置变化自动启动/停止自动切换
  watch(() => themeSettings.value.autoSwitch.enabled, (enabled) => {
    if (enabled) {
      startAutoSwitch()
    } else {
      stopAutoSwitch()
    }
  })

  return {
    // state
    currentTheme,
    currentPreset,
    currentMode,
    themeSettings,
    // data
    themes,
    presets,
    modes,
    // computed
    currentThemeInfo,
    currentModeInfo,
    isDark,
    effectiveTransitionDuration,
    // actions
    setTheme,
    setPreset,
    setMode,
    toggleMode,
    updateSettings,
    resetToDefault,
    exportTheme,
    importTheme,
    applyToDocument,
    init,
    startAutoSwitch,
    stopAutoSwitch,
    adjustBrightness
  }
})
