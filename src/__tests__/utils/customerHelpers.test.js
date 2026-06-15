/**
 * 客户辅助工具测试
 * 覆盖 levelColors, levelLabelMap, levelLabel, getTagName, getTagStyle
 */
import { describe, it, expect } from 'vitest'
import { levelColors, levelLabelMap, levelLabel, getTagName, getTagStyle } from '@/utils/customerHelpers'

describe('customerHelpers.js - 客户辅助工具', () => {

  /* ===== 常量映射 ===== */
  describe('常量映射', () => {
    it('levelColors 应包含正确的颜色值', () => {
      expect(levelColors.A).toBe('#ef4444')
      expect(levelColors.B).toBe('#f59e0b')
      expect(levelColors.C).toBe('#3b82f6')
    })

    it('levelLabelMap 应包含正确的标签', () => {
      expect(levelLabelMap.A).toBe('大客户')
      expect(levelLabelMap.B).toBe('B类客户')
      expect(levelLabelMap.C).toBe('C类客户')
    })
  })

  /* ===== levelLabel ===== */
  describe('levelLabel', () => {
    it('应返回正确的等级标签', () => {
      expect(levelLabel('A')).toBe('大客户')
      expect(levelLabel('B')).toBe('B类客户')
      expect(levelLabel('C')).toBe('C类客户')
    })

    it('未知等级应返回原值', () => {
      expect(levelLabel('D')).toBe('D')
    })

    it('空值应返回"-"', () => {
      expect(levelLabel('')).toBe('-')
      expect(levelLabel(null)).toBe('-')
      expect(levelLabel(undefined)).toBe('-')
    })
  })

  /* ===== getTagName ===== */
  describe('getTagName', () => {
    const tags = [
      { id: 'VIP', name: 'VIP客户', color: '#ef4444' },
      { id: 'new', name: '新客户', color: '#10b981' }
    ]

    it('应返回标签名称', () => {
      expect(getTagName(tags, 'VIP')).toBe('VIP客户')
      expect(getTagName(tags, 'new')).toBe('新客户')
    })

    it('标签不存在应返回tagId', () => {
      expect(getTagName(tags, 'unknown')).toBe('unknown')
    })

    it('tags为null/undefined应返回tagId', () => {
      expect(getTagName(null, 'VIP')).toBe('VIP')
      expect(getTagName(undefined, 'VIP')).toBe('VIP')
    })

    it('空标签数组应返回tagId', () => {
      expect(getTagName([], 'VIP')).toBe('VIP')
    })
  })

  /* ===== getTagStyle ===== */
  describe('getTagStyle', () => {
    const tags = [
      { id: 'VIP', name: 'VIP客户', color: '#ef4444' },
      { id: 'new', name: '新客户', color: '#10b981' }
    ]

    it('应返回正确的样式对象', () => {
      const style = getTagStyle(tags, 'VIP')
      expect(style.background).toBe('#ef444420')
      expect(style.color).toBe('#ef4444')
    })

    it('标签不存在应返回空对象', () => {
      expect(getTagStyle(tags, 'unknown')).toEqual({})
    })

    it('tags为null/undefined应返回空对象', () => {
      expect(getTagStyle(null, 'VIP')).toEqual({})
      expect(getTagStyle(undefined, 'VIP')).toEqual({})
    })

    it('颜色值应添加20透明度后缀', () => {
      const style = getTagStyle(tags, 'new')
      expect(style.background).toContain('20')
      expect(style.color).toBe('#10b981')
    })
  })
})
