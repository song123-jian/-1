import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  DEFAULT_MODE_KEY,
  DEFAULT_PRESET_KEY,
  DEFAULT_THEME_KEY,
  createDefaultThemeSettings,
  modeOptions,
  presetOptions,
  themeColorMap,
  themeHoverMap,
  themeOptions
} from '@/theme/catalog'

function cloneDefaultSettings() {
  return createDefaultThemeSettings()
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref(localStorage.getItem('gj_erp_theme') || DEFAULT_THEME_KEY)
  const currentPreset = ref(localStorage.getItem('gj_erp_activePreset') || DEFAULT_PRESET_KEY)
  const currentMode = ref(localStorage.getItem('gj_erp_themeMode') || DEFAULT_MODE_KEY)
  const themeSettings = ref(cloneDefaultSettings())

  let transitionCleanupTimer = null
  let autoSwitchTimer = null
  let systemMediaQuery = null
  let systemMediaHandler = null

  const themes = themeOptions
  const presets = presetOptions
  const modes = modeOptions

  const currentThemeInfo = computed(() => themes.find((theme) => theme.key === currentTheme.value) || themes[0])
  const currentModeInfo = computed(() => modes.find((mode) => mode.key === currentMode.value) || modes[0])

  const isDark = computed(() => ['dark', 'cyberpunk', 'highcontrast'].includes(currentMode.value))

  const effectiveTransitionDuration = computed(() => {
    const { animation } = themeSettings.value
    return animation.enabled && !animation.reduceMotion ? animation.transitionDuration : 0
  })

  function isValidThemeKey(themeKey) {
    return Boolean(themeColorMap[themeKey])
  }

  function isValidModeKey(modeKey) {
    return modes.some((mode) => mode.key === modeKey)
  }

  function persist() {
    localStorage.setItem('gj_erp_theme', currentTheme.value)
    localStorage.setItem('gj_erp_activePreset', currentPreset.value)
    localStorage.setItem('gj_erp_themeMode', currentMode.value)
    localStorage.setItem('gj_erp_themeSettings', JSON.stringify(themeSettings.value))
  }

  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const r = Math.max(0, Math.min(255, (num >> 16) + amt))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`
  }

  function syncAccentHover(accentColor) {
    themeSettings.value.accentHover = adjustBrightness(accentColor, 20)
  }

  function syncAccentPreset(themeKey) {
    themeSettings.value.accentPreset = themeKey
    themeSettings.value.accentColor = themeColorMap[themeKey] || themeColorMap[DEFAULT_THEME_KEY]
    themeSettings.value.accentHover = themeHoverMap[themeKey] || adjustBrightness(themeSettings.value.accentColor, 20)
  }

  function normalizeThemeState() {
    if (!isValidThemeKey(currentTheme.value)) {
      currentTheme.value = DEFAULT_THEME_KEY
    }

    if (!isValidModeKey(currentMode.value)) {
      currentMode.value = DEFAULT_MODE_KEY
    }

    if (!isValidThemeKey(themeSettings.value.accentPreset)) {
      themeSettings.value.accentPreset = currentTheme.value
    }

    const presetAccent = themeColorMap[themeSettings.value.accentPreset]

    if (!themeSettings.value.accentColor) {
      themeSettings.value.accentColor = presetAccent || themeColorMap[currentTheme.value]
    }

    if (!themeSettings.value.accentHover) {
      const usePresetHover = presetAccent && themeSettings.value.accentColor === presetAccent
      themeSettings.value.accentHover = usePresetHover
        ? themeHoverMap[themeSettings.value.accentPreset] || adjustBrightness(themeSettings.value.accentColor, 20)
        : adjustBrightness(themeSettings.value.accentColor, 20)
    }
  }

  function applyToDocument() {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    if (transitionCleanupTimer) {
      clearTimeout(transitionCleanupTimer)
      transitionCleanupTimer = null
    }

    if (effectiveTransitionDuration.value > 0) {
      html.classList.add('theme-transitioning')
      transitionCleanupTimer = setTimeout(() => {
        html.classList.remove('theme-transitioning')
        transitionCleanupTimer = null
      }, effectiveTransitionDuration.value + 50)
    } else {
      html.classList.remove('theme-transitioning')
    }

    html.setAttribute('data-theme', currentTheme.value)
    html.setAttribute('data-preset', currentPreset.value)
    html.setAttribute('data-mode', currentMode.value)

    const settings = themeSettings.value
    html.style.setProperty('--theme-brightness', settings.brightness / 100)
    html.style.setProperty('--theme-font-scale', settings.fontScale / 100)
    html.style.setProperty('--theme-line-height', settings.lineHeight)
    html.style.setProperty('--theme-spacing-scale', settings.spacingScale / 100)
    html.style.setProperty('--theme-layout-padding', `${settings.layoutPadding}rem`)
    html.style.setProperty('--theme-layout-gap', `${settings.layoutGap}rem`)
    html.style.setProperty('--theme-component-radius', `${settings.componentRadius}rem`)
    html.style.setProperty('--theme-accent', settings.accentColor)
    html.style.setProperty('--theme-accent-hover', settings.accentHover)
    html.style.setProperty('--theme-transition-duration', `${effectiveTransitionDuration.value}ms`)

    html.classList.toggle('high-contrast', settings.accessibility.highContrast)
    html.classList.toggle('reduce-motion', settings.animation.reduceMotion || !settings.animation.enabled)
    html.setAttribute('data-accessibility-large-text', settings.accessibility.largeText ? 'true' : 'false')
    html.style.filter = settings.brightness !== 100 ? `brightness(${settings.brightness / 100})` : ''
  }

  function setTheme(themeKey) {
    currentTheme.value = isValidThemeKey(themeKey) ? themeKey : DEFAULT_THEME_KEY
    syncAccentPreset(currentTheme.value)
    applyToDocument()
    persist()
  }

  function setPreset(presetKey) {
    currentPreset.value = presetKey
    applyToDocument()
    persist()
  }

  function setMode(modeKey) {
    currentMode.value = isValidModeKey(modeKey) ? modeKey : DEFAULT_MODE_KEY
    applyToDocument()
    persist()
  }

  function toggleMode() {
    setMode(currentMode.value === 'dark' ? 'light' : 'dark')
  }

  function updateSettings(partial) {
    Object.assign(themeSettings.value, partial)

    if ('accentPreset' in partial && !('accentColor' in partial) && !('accentHover' in partial)) {
      currentTheme.value = isValidThemeKey(themeSettings.value.accentPreset)
        ? themeSettings.value.accentPreset
        : DEFAULT_THEME_KEY
      syncAccentPreset(themeSettings.value.accentPreset)
    } else if ('accentColor' in partial && !('accentHover' in partial)) {
      syncAccentHover(themeSettings.value.accentColor)
    }

    normalizeThemeState()
    applyToDocument()
    persist()
  }

  function patchSetting(path, value) {
    const keys = path.split('.')
    const lastKey = keys.pop()

    if (path === 'accentPreset') {
      currentTheme.value = isValidThemeKey(value) ? value : DEFAULT_THEME_KEY
      syncAccentPreset(currentTheme.value)
    } else {
      const target = keys.reduce((current, key) => current[key], themeSettings.value)
      target[lastKey] = value

      if (path === 'accentColor') {
        syncAccentHover(value)
      }
    }

    normalizeThemeState()
    applyToDocument()
    persist()
  }

  function resetToDefault() {
    currentTheme.value = DEFAULT_THEME_KEY
    currentPreset.value = DEFAULT_PRESET_KEY
    currentMode.value = DEFAULT_MODE_KEY
    themeSettings.value = cloneDefaultSettings()
    applyToDocument()
    persist()
  }

  function exportTheme() {
    return JSON.stringify(
      {
        theme: currentTheme.value,
        preset: currentPreset.value,
        mode: currentMode.value,
        settings: themeSettings.value,
        exportAt: new Date().toISOString(),
        version: '1.0'
      },
      null,
      2
    )
  }

  function importTheme(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      if (data.theme) {
        currentTheme.value = data.theme
      }
      if (data.preset !== undefined) {
        currentPreset.value = data.preset
      }
      if (data.mode) {
        currentMode.value = data.mode
      }
      if (data.settings) {
        Object.assign(themeSettings.value, data.settings)
      }

      normalizeThemeState()
      applyToDocument()
      persist()
      return { success: true, message: '主题导入成功' }
    } catch (error) {
      return { success: false, message: `主题导入失败：${error.message}` }
    }
  }

  function checkAutoSwitch() {
    const settings = themeSettings.value.autoSwitch
    if (!settings.enabled) return

    if (settings.followSystem && typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const targetMode = prefersDark ? 'dark' : 'light'
      if (currentMode.value !== targetMode) {
        setMode(targetMode)
      }
      return
    }

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const { lightStart, darkStart } = settings.schedule

    const targetMode =
      lightStart <= darkStart
        ? currentTime >= lightStart && currentTime < darkStart
          ? 'light'
          : 'dark'
        : currentTime >= lightStart || currentTime < darkStart
          ? 'light'
          : 'dark'

    if (currentMode.value !== targetMode) {
      setMode(targetMode)
    }
  }

  function startAutoSwitch() {
    stopAutoSwitch()
    checkAutoSwitch()
    autoSwitchTimer = setInterval(checkAutoSwitch, 60000)

    if (typeof window !== 'undefined' && window.matchMedia) {
      systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemMediaHandler = () => {
        if (themeSettings.value.autoSwitch.enabled && themeSettings.value.autoSwitch.followSystem) {
          checkAutoSwitch()
        }
      }

      if (systemMediaQuery.addEventListener) {
        systemMediaQuery.addEventListener('change', systemMediaHandler)
      } else if (systemMediaQuery.addListener) {
        systemMediaQuery.addListener(systemMediaHandler)
      }
    }
  }

  function stopAutoSwitch() {
    if (autoSwitchTimer) {
      clearInterval(autoSwitchTimer)
      autoSwitchTimer = null
    }

    if (systemMediaQuery && systemMediaHandler) {
      if (systemMediaQuery.removeEventListener) {
        systemMediaQuery.removeEventListener('change', systemMediaHandler)
      } else if (systemMediaQuery.removeListener) {
        systemMediaQuery.removeListener(systemMediaHandler)
      }
      systemMediaHandler = null
      systemMediaQuery = null
    }
  }

  function init() {
    try {
      const saved = localStorage.getItem('gj_erp_themeSettings')
      if (saved) {
        Object.assign(themeSettings.value, JSON.parse(saved))
      }
    } catch (error) {
      console.warn('[theme] 恢复主题设置失败:', error)
    }

    normalizeThemeState()
    applyToDocument()

    if (themeSettings.value.autoSwitch.enabled) {
      startAutoSwitch()
    }
  }

  watch(
    () => [
      themeSettings.value.autoSwitch.enabled,
      themeSettings.value.autoSwitch.followSystem,
      themeSettings.value.autoSwitch.schedule.lightStart,
      themeSettings.value.autoSwitch.schedule.darkStart
    ],
    ([enabled]) => {
      if (enabled) {
        startAutoSwitch()
      } else {
        stopAutoSwitch()
      }
    }
  )

  return {
    currentTheme,
    currentPreset,
    currentMode,
    themeSettings,
    themes,
    presets,
    modes,
    currentThemeInfo,
    currentModeInfo,
    isDark,
    effectiveTransitionDuration,
    setTheme,
    setPreset,
    setMode,
    toggleMode,
    updateSettings,
    patchSetting,
    resetToDefault,
    exportTheme,
    importTheme,
    applyToDocument,
    init,
    startAutoSwitch,
    stopAutoSwitch,
    adjustBrightness,
    persist
  }
})
