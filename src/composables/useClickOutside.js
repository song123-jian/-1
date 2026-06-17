import { onMounted, onBeforeUnmount } from 'vue'

/**
 * 点击外部区域时触发回调的 composable
 * 自动在 onMounted 注册、onBeforeUnmount 清理
 * @param {Function} callback - 点击外部时执行的回调
 * @param {import('vue').Ref} [activeRef] - 可选，仅在 activeRef.value 为 true 时响应
 */
export function useClickOutside(callback, activeRef) {
  function handler(e) {
    if (activeRef && !activeRef.value) return
    callback(e)
  }

  onMounted(() => document.addEventListener('click', handler))
  onBeforeUnmount(() => document.removeEventListener('click', handler))

  return { handler }
}
