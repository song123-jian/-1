import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useThemeStore } from '../theme'
import { themeColorMap } from '@/theme/catalog'

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-mode')
    document.documentElement.style.cssText = ''
  })

  it('disables transition duration when animation is disabled', () => {
    const store = useThemeStore()

    store.patchSetting('animation.enabled', false)

    expect(store.effectiveTransitionDuration).toBe(0)
    expect(document.documentElement.style.getPropertyValue('--theme-transition-duration')).toBe('0ms')
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
  })

  it('recomputes accent hover when custom accent color changes', () => {
    const store = useThemeStore()

    store.patchSetting('accentColor', '#000000')

    expect(store.themeSettings.accentColor).toBe('#000000')
    expect(store.themeSettings.accentHover).toBe('#333333')
  })

  it('keeps accent preset, accent color, and theme aligned when selecting preset', () => {
    const store = useThemeStore()

    store.patchSetting('accentPreset', 'forest')

    expect(store.currentTheme).toBe('forest')
    expect(store.themeSettings.accentPreset).toBe('forest')
    expect(store.themeSettings.accentColor).toBe(themeColorMap.forest)
  })

  it('normalizes invalid imported theme values', () => {
    const store = useThemeStore()

    const result = store.importTheme(
      JSON.stringify({
        theme: 'unknown-theme',
        mode: 'invalid-mode',
        settings: {
          accentPreset: 'missing-preset',
          accentColor: '',
          accentHover: ''
        }
      })
    )

    expect(result.success).toBe(true)
    expect(store.currentTheme).toBe('ocean')
    expect(store.currentMode).toBe('dark')
    expect(store.themeSettings.accentPreset).toBe('ocean')
    expect(store.themeSettings.accentColor).toBe(themeColorMap.ocean)
    expect(store.themeSettings.accentHover).toBeTruthy()
  })

  it('re-evaluates auto switch when schedule settings change while enabled', async () => {
    const store = useThemeStore()

    store.patchSetting('autoSwitch.enabled', true)
    store.patchSetting('autoSwitch.followSystem', false)
    store.patchSetting('autoSwitch.schedule.lightStart', '00:00')
    store.patchSetting('autoSwitch.schedule.darkStart', '23:59')
    await nextTick()

    expect(store.currentMode).toBe('light')
  })
})
