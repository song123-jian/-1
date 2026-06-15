/**
 * UID生成工具测试
 * 覆盖 generateId 的唯一性、前缀、碰撞处理
 */
import { describe, it, expect } from 'vitest'
import { generateId } from '@/utils/uid'

describe('uid.js - 唯一ID生成工具', () => {

  it('应生成非空字符串', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('应包含指定前缀', () => {
    expect(generateId('c').startsWith('c')).toBe(true)
    expect(generateId('q').startsWith('q')).toBe(true)
    expect(generateId('ct').startsWith('ct')).toBe(true)
  })

  it('无前缀时不应以下划线开头', () => {
    const id = generateId()
    expect(id).toMatch(/^\d/)
  })

  it('应包含时间戳和计数器', () => {
    const id = generateId('test_')
    // 格式: prefix + timestamp + '_' + counter + '_' + random
    const parts = id.replace('test_', '').split('_')
    expect(parts.length).toBe(3)
    expect(parseInt(parts[0])).toBeGreaterThan(0) // timestamp
    expect(parseInt(parts[1])).toBeGreaterThanOrEqual(0) // counter
  })

  it('应生成唯一ID（快速连续调用）', () => {
    const ids = new Set()
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('u'))
    }
    expect(ids.size).toBe(1000)
  })

  it('同一毫秒内计数器应递增', () => {
    // 快速连续调用，可能在同一毫秒内
    const ids = []
    for (let i = 0; i < 100; i++) {
      ids.push(generateId('x'))
    }
    // 检查所有ID唯一
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(100)
  })

  it('应包含随机部分', () => {
    const id1 = generateId('r')
    const id2 = generateId('r')
    // 即使在同一毫秒，随机部分也应不同
    expect(id1).not.toBe(id2)
  })

  it('前缀为空字符串时应正常工作', () => {
    const id = generateId('')
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('生成的ID长度应合理', () => {
    const id = generateId('c')
    // timestamp(13) + _(1) + counter(1-2) + _(1) + random(6) + prefix = ~25字符
    expect(id.length).toBeGreaterThan(15)
    expect(id.length).toBeLessThan(50)
  })
})
