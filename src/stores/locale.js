import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  /* 从 i18n 实例获取当前语言，避免双重 localStorage 读取 */
  const currentLocale = ref(i18n.global.locale.value || 'zh-CN')

  function setLocale(locale) {
    currentLocale.value = locale
    i18n.global.locale.value = locale
    localStorage.setItem('gj_erp_locale', locale)
    document.documentElement.setAttribute('lang', locale === 'zh-CN' ? 'zh' : 'en')
  }

  function t(key, params) {
    return i18n.global.t(key, params)
  }

  // 初始化时设置html lang属性
  document.documentElement.setAttribute('lang', currentLocale.value === 'zh-CN' ? 'zh' : 'en')

  return { currentLocale, setLocale, t }
})