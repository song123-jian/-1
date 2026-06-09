import { inject } from 'vue'
export function useConfirm() {
  const confirm = inject('confirm')
  if (!confirm) {
    return { show: () => Promise.resolve(true) }
  }
  return confirm
}
