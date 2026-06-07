/**
 * 唯一ID生成工具
 * 解决 Date.now() 在快速连续操作中的碰撞问题
 */

let _counter = 0
const _lastTimestamp = { value: 0 }

/**
 * 生成唯一ID
 * @param {string} prefix - 前缀，如 'c', 'q', 'ct' 等
 * @returns {string} 唯一ID
 */
export function generateId(prefix = '') {
  const now = Date.now()
  /* 同一毫秒内递增计数器 */
  if (now === _lastTimestamp.value) {
    _counter++
  } else {
    _counter = 0
    _lastTimestamp.value = now
  }
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}${now}_${_counter}_${random}`
}
