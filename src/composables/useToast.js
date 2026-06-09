import { inject } from 'vue'
export function useToast() {
  const toast = inject('toast')
  if (!toast) {
    return { show: console.log, success: console.log, error: console.log, warning: console.log, info: console.log }
  }
  return toast
}
