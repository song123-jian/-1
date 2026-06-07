/**
 * 格式化工具函数
 * 提供HTML转义、数字格式化等通用工具
 */

/**
 * HTML特殊字符转义，防止XSS注入
 * 在拼接HTML字符串时，必须对所有用户输入字段调用此函数
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 数字格式化
 * @param {number} num - 需要格式化的数字
 * @param {number} decimals - 小数位数，默认2位
 * @returns {string} 格式化后的数字字符串
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * 金额格式化（固定2位小数）
 * @param {number} num - 金额数字
 * @returns {string} 格式化后的金额字符串
 */
export function formatMoney(num) {
  return formatNumber(num, 2)
}
