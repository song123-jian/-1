/******
 * 格式化工具函数
 * 提供HTML转义、数字格式化等通用工具
 */

import DOMPurify from 'dompurify'

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

/**
 * 获取本地日期字符串（YYYY-MM-DD）
 * 避免使用 toISOString().split('T')[0] 导致的UTC时区偏移问题
 * 例如：北京时间 2026-06-11 00:30，toISOString() 返回 2026-06-10T16:30:00Z，日期会少一天
 * @param {Date} [d] - 日期对象，不传则使用当前时间
 * @returns {string} 本地日期字符串，格式 YYYY-MM-DD
 */
export function toLocalDateStr(d) {
  const date = d || new Date()
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

/**
 * HTML消毒 - 使用DOMPurify移除危险标签和属性，防止XSS注入
 * @param {string} html - 需要消毒的HTML字符串
 * @param {object} options - 可选配置 { allowedTags, allowedAttr }
 * @returns {string} 消毒后的安全HTML字符串
 */
export function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') return ''
  const defaultTags = ['b','i','em','strong','a','p','br','ul','ol','li','span','div','table','thead','tbody','tr','th','td','h1','h2','h3','h4','h5','h6','hr','img','sub','sup','small','mark','del','ins','blockquote','pre','code','style','section','article','header','footer','main','figure','figcaption','dl','dt','dd','svg','path','line','circle','rect','polyline','polygon','ellipse','g','text','tspan']
  const defaultAttr = ['href','target','rel','class','src','alt','title','colspan','rowspan','width','height','style','id','d','x1','y1','x2','y2','cx','cy','r','rx','ry','x','y','points','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','viewBox','xmlns','font-size','text-anchor','transform']
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: options.allowedTags || defaultTags,
    ALLOWED_ATTR: options.allowedAttr || defaultAttr,
    ADD_ATTR: ['target']
  })
}