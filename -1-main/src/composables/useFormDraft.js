import { watch, onMounted, onUnmounted } from 'vue'

/**
 * 表单草稿自动保存 composable
 * @param {String} draftKey - 草稿的唯一标识（如 'quotation-form', 'purchase-form'）
 * @param {Object} form - 响应式表单对象
 * @param {Object} options - 配置选项
 * @param {Number} options.debounce - 防抖延迟（默认 1000ms）
 * @param {Function} options.onRestore - 恢复草稿后的回调
 */
export function useFormDraft(draftKey, form, options = {}) {
  const { debounce = 1000, onRestore } = options
  const storageKey = `form-draft-${draftKey}`
  let saveTimer = null
  let isRestoring = false

  function saveDraft() {
    if (isRestoring) return
    try {
      const draft = {
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(form))
      }
      sessionStorage.setItem(storageKey, JSON.stringify(draft))
    } catch (e) {
      console.warn('[FormDraft] 保存草稿失败:', e.message)
    }
  }

  function restoreDraft() {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (!saved) return null
      const draft = JSON.parse(saved)
      // 检查草稿是否过期（7天）
      const maxAge = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - draft.timestamp > maxAge) {
        sessionStorage.removeItem(storageKey)
        return null
      }
      isRestoring = true
      Object.assign(form, draft.data)
      isRestoring = false
      if (onRestore) onRestore(draft)
      return draft
    } catch (e) {
      console.warn('[FormDraft] 恢复草稿失败:', e.message)
      return null
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(storageKey)
    } catch (e) {
      // ignore
    }
  }

  function hasDraft() {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (!saved) return false
      const draft = JSON.parse(saved)
      const maxAge = 7 * 24 * 60 * 60 * 1000
      return Date.now() - draft.timestamp <= maxAge
    } catch (e) {
      return false
    }
  }

  // 自动保存（防抖）
  const stopWatch = watch(
    () => JSON.parse(JSON.stringify(form)),
    () => {
      if (isRestoring) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(saveDraft, debounce)
    },
    { deep: true }
  )

  onUnmounted(() => {
    clearTimeout(saveTimer)
    stopWatch()
  })

  return {
    saveDraft,
    restoreDraft,
    clearDraft,
    hasDraft
  }
}
