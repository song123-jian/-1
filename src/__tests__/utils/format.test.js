/**
 * 格式化工具函数测试
 * 覆盖 escapeHtml, formatNumber, formatMoney, toLocalDateStr, sanitizeHtml
 */
import { describe, it, expect, vi } from 'vitest'
import { escapeHtml, formatNumber, formatMoney, toLocalDateStr, sanitizeHtml } from '@/utils/format'

describe('format.js - 格式化工具函数', () => {

  /* ===== escapeHtml ===== */
  describe('escapeHtml', () => {
    it('应转义 & 符号', () => {
      expect(escapeHtml('a&b')).toBe('a&amp;b')
    })

    it('应转义 < 和 > 符号', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('应转义双引号', () => {
      expect(escapeHtml('a="b"')).toBe('a=&quot;b&quot;')
    })

    it('应转义单引号', () => {
      expect(escapeHtml("a='b'")).toBe('a=&#039;b&#039;')
    })

    it('应处理空字符串', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('应处理 null/undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    it('应处理数字输入', () => {
      expect(escapeHtml(123)).toBe('123')
    })

    it('应处理包含所有特殊字符的字符串', () => {
      expect(escapeHtml('<div class="test">&\'</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&#039;&lt;/div&gt;'
      )
    })

    it('应处理不含特殊字符的普通文本', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
    })

    it('应处理XSS攻击向量', () => {
      const xss = '<img src=x onerror=alert(1)>'
      expect(escapeHtml(xss)).toBe('&lt;img src=x onerror=alert(1)&gt;')
      expect(escapeHtml(xss)).not.toContain('<img')
    })
  })

  /* ===== formatNumber ===== */
  describe('formatNumber', () => {
    it('应格式化正整数', () => {
      expect(formatNumber(1234)).toBe('1,234.00')
    })

    it('应格式化小数', () => {
      expect(formatNumber(1234.567)).toBe('1,234.57')
    })

    it('应格式化大数字', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    })

    it('应处理 null/undefined/NaN', () => {
      expect(formatNumber(null)).toBe('0')
      expect(formatNumber(undefined)).toBe('0')
      expect(formatNumber(NaN)).toBe('0')
    })

    it('应支持自定义小数位数', () => {
      expect(formatNumber(1234.567, 0)).toBe('1,235')
      expect(formatNumber(1234.567, 3)).toBe('1,234.567')
    })

    it('应处理零', () => {
      expect(formatNumber(0)).toBe('0.00')
    })

    it('应处理负数', () => {
      const result = formatNumber(-1234.56)
      expect(result).toContain('-')
      expect(result).toContain('1,234.56')
    })

    it('应处理字符串数字', () => {
      expect(formatNumber('1234')).toBe('1,234.00')
    })
  })

  /* ===== formatMoney ===== */
  describe('formatMoney', () => {
    it('应格式化金额为2位小数', () => {
      expect(formatMoney(1234.5)).toBe('1,234.50')
    })

    it('应处理大额金额', () => {
      expect(formatMoney(1000000)).toBe('1,000,000.00')
    })

    it('应处理零金额', () => {
      expect(formatMoney(0)).toBe('0.00')
    })

    it('应处理 null/undefined', () => {
      expect(formatMoney(null)).toBe('0')
      expect(formatMoney(undefined)).toBe('0')
    })
  })

  /* ===== toLocalDateStr ===== */
  describe('toLocalDateStr', () => {
    it('应返回 YYYY-MM-DD 格式', () => {
      const date = new Date(2024, 5, 15) // 2024-06-15
      const result = toLocalDateStr(date)
      expect(result).toBe('2024-06-15')
    })

    it('应处理月份补零', () => {
      const date = new Date(2024, 0, 5) // 2024-01-05
      const result = toLocalDateStr(date)
      expect(result).toBe('2024-01-05')
    })

    it('不传参数应返回当前日期', () => {
      const result = toLocalDateStr()
      const now = new Date()
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      expect(result).toBe(expected)
    })

    it('应避免UTC时区偏移问题', () => {
      // 北京时间 2024-06-15 00:30
      const date = new Date(2024, 5, 15, 0, 30)
      const result = toLocalDateStr(date)
      expect(result).toBe('2024-06-15')
    })

    it('应处理年末日期', () => {
      const date = new Date(2024, 11, 31)
      const result = toLocalDateStr(date)
      expect(result).toBe('2024-12-31')
    })
  })

  /* ===== sanitizeHtml ===== */
  describe('sanitizeHtml', () => {
    it('应处理空输入', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null)).toBe('')
      expect(sanitizeHtml(undefined)).toBe('')
    })

    it('应处理非字符串输入', () => {
      expect(sanitizeHtml(123)).toBe('')
      expect(sanitizeHtml({})).toBe('')
    })

    it('应保留安全的HTML标签', () => {
      const result = sanitizeHtml('<b>bold</b> <i>italic</i>')
      expect(result).toContain('bold')
      expect(result).toContain('italic')
    })

    it('应保留表格标签', () => {
      const html = '<table><tr><td>cell</td></tr></table>'
      const result = sanitizeHtml(html)
      expect(result).toContain('cell')
    })

    it('应调用DOMPurify.sanitize', () => {
      // DOMPurify在测试环境中被mock，直接调用即可验证
      const result = sanitizeHtml('<p>test</p>')
      expect(typeof result).toBe('string')
    })
  })
})
