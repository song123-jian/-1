import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref(localStorage.getItem('gj_erp_theme') || 'ocean')
  const currentPreset = ref(localStorage.getItem('gj_erp_activePreset') || '')
  const currentMode = ref(localStorage.getItem('gj_erp_themeMode') || 'dark')

  const themes = [
    { key: 'ocean', name: '海洋蓝', color: '#3b82f6' },
    { key: 'forest', name: '森林绿', color: '#22c55e' },
    { key: 'sunset', name: '日落橙', color: '#f59e0b' },
    { key: 'royal', name: '皇家紫', color: '#a855f7' },
    { key: 'crimson', name: '赤焰红', color: '#ef4444' },
    { key: 'emerald', name: '翡翠绿', color: '#10b981' },
    { key: 'rose', name: '玫瑰粉', color: '#f43f5e' },
    { key: 'indigo', name: '靛蓝', color: '#6366f1' }
  ]

  const presets = [
    { key: 'aurora', name: '极光' },
    { key: 'deepOcean', name: '深海' }
  ]

  function setTheme(themeKey) {
    currentTheme.value = themeKey
    localStorage.setItem('gj_erp_theme', themeKey)
  }

  function setPreset(presetKey) {
    currentPreset.value = presetKey
    localStorage.setItem('gj_erp_activePreset', presetKey)
  }

  function setMode(mode) {
    currentMode.value = mode
    localStorage.setItem('gj_erp_themeMode', mode)
  }

  function toggleMode() {
    const newMode = currentMode.value === 'dark' ? 'light' : 'dark'
    setMode(newMode)
  }

  return { currentTheme, currentPreset, currentMode, themes, presets, setTheme, setPreset, setMode, toggleMode }
})
