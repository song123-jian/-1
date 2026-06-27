import { watch, onUnmounted } from 'vue'

function getDraftStorage() {
  return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null
}

function cloneDraftData(form) {
  return JSON.parse(JSON.stringify(form))
}

export function useFormDraft(draftKey, form, options = {}) {
  const { debounce = 1000, onRestore } = options
  const storageKey = `form-draft-${draftKey}`
  const maxAge = 7 * 24 * 60 * 60 * 1000
  let saveTimer = null
  let isRestoring = false

  function saveDraft() {
    if (isRestoring) return

    try {
      const storage = getDraftStorage()
      if (!storage) return

      const draft = {
        timestamp: Date.now(),
        data: cloneDraftData(form)
      }

      storage.setItem(storageKey, JSON.stringify(draft))
    } catch (e) {
      console.warn('[FormDraft] 保存草稿失败:', e.message)
    }
  }

  function restoreDraft() {
    try {
      const storage = getDraftStorage()
      if (!storage) return null

      const saved = storage.getItem(storageKey)
      if (!saved) return null

      const draft = JSON.parse(saved)
      if (Date.now() - draft.timestamp > maxAge) {
        storage.removeItem(storageKey)
        return null
      }

      isRestoring = true
      Object.assign(form, draft.data)
      isRestoring = false

      if (onRestore) onRestore(draft)
      return draft
    } catch (e) {
      isRestoring = false
      console.warn('[FormDraft] 恢复草稿失败:', e.message)
      return null
    }
  }

  function clearDraft() {
    try {
      const storage = getDraftStorage()
      if (!storage) return
      storage.removeItem(storageKey)
    } catch (e) {
      console.warn('[FormDraft] 清除草稿失败:', e.message)
    }
  }

  function hasDraft() {
    try {
      const storage = getDraftStorage()
      if (!storage) return false

      const saved = storage.getItem(storageKey)
      if (!saved) return false

      const draft = JSON.parse(saved)
      return Date.now() - draft.timestamp <= maxAge
    } catch {
      return false
    }
  }

  const stopWatch = watch(
    () => cloneDraftData(form),
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
