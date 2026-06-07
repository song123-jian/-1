import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const currentLocale = ref(localStorage.getItem('gj_erp_locale') || 'zh-CN')

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
