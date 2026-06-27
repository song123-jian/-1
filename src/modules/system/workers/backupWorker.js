import { serializeBackupPayload, parseAppBackup, restoreAppBackup } from '../utils/appBackup'

self.onmessage = (event) => {
  const { id, type, payload } = event.data || {}

  try {
    if (type === 'export') {
      const json = serializeBackupPayload(payload?.description || '完整备份导出')
      self.postMessage({ id, success: true, json })
      return
    }

    if (type === 'restore') {
      const restored = restoreAppBackup(payload?.content, payload?.options || {})
      self.postMessage({
        id,
        success: true,
        result: {
          keyCount: restored.keyCount || Object.keys(restored?.storage?.localStorage || {}).length
        }
      })
      return
    }

    if (type === 'validate') {
      const parsed = parseAppBackup(payload?.content)
      self.postMessage({ id, success: true, result: { keyCount: parsed.keyCount || 0 } })
      return
    }

    self.postMessage({ id, success: false, error: '未知任务类型' })
  } catch (error) {
    self.postMessage({ id, success: false, error: error?.message || 'worker 执行失败' })
  }
}
