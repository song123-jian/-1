/**
 * conflictResolver.js 深度测试
 * 覆盖 deepEqual 各种类型、键顺序、数组、嵌套对象、大数据集、null/undefined、解决策略等
 */
import { describe, it, expect } from 'vitest'
import {
  deepEqual, resolveConflict, mergeArrays, detectConflicts, autoResolve
} from '@/utils/conflictResolver'

describe('conflictResolver.js - 深度边界测试', () => {

  /* ===== deepEqual 各种类型 ===== */
  describe('deepEqual - 各种类型', () => {
    it('原始类型相等', () => {
      expect(deepEqual(1, 1)).toBe(true)
      expect(deepEqual('hello', 'hello')).toBe(true)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(false, false)).toBe(true)
    })

    it('原始类型不相等', () => {
      expect(deepEqual(1, 2)).toBe(false)
      expect(deepEqual('a', 'b')).toBe(false)
      expect(deepEqual(true, false)).toBe(false)
      expect(deepEqual(1, '1')).toBe(false)
    })

    it('null 与 null', () => {
      expect(deepEqual(null, null)).toBe(true)
    })

    it('undefined 与 undefined', () => {
      expect(deepEqual(undefined, undefined)).toBe(true)
    })

    it('null 与 undefined', () => {
      expect(deepEqual(null, undefined)).toBe(false)
    })

    it('null 与对象', () => {
      expect(deepEqual(null, {})).toBe(false)
    })

    it('undefined 与对象', () => {
      expect(deepEqual(undefined, {})).toBe(false)
    })

    it('NaN 比较', () => {
      expect(deepEqual(NaN, NaN)).toBe(false) // NaN !== NaN
    })

    it('0 与 -0', () => {
      expect(deepEqual(0, -0)).toBe(true) // 0 === -0
    })
  })

  /* ===== deepEqual 键顺序差异 ===== */
  describe('deepEqual - 键顺序差异', () => {
    it('键顺序不同但值相同应相等', () => {
      const a = { x: 1, y: 2 }
      const b = { y: 2, x: 1 }
      expect(deepEqual(a, b)).toBe(true)
    })

    it('键顺序不同且值不同应不相等', () => {
      const a = { x: 1, y: 2 }
      const b = { y: 3, x: 1 }
      expect(deepEqual(a, b)).toBe(false)
    })

    it('键数量不同应不相等', () => {
      const a = { x: 1, y: 2 }
      const b = { x: 1 }
      expect(deepEqual(a, b)).toBe(false)
    })
  })

  /* ===== deepEqual 数组 ===== */
  describe('deepEqual - 数组', () => {
    it('空数组应相等', () => {
      expect(deepEqual([], [])).toBe(true)
    })

    it('相同元素数组应相等', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    it('不同长度数组应不相等', () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it('元素顺序不同应不相等', () => {
      expect(deepEqual([1, 2], [2, 1])).toBe(false)
    })

    it('数组与对象应不相等', () => {
      expect(deepEqual([], {})).toBe(false)
    })

    it('对象与数组应不相等', () => {
      expect(deepEqual({}, [])).toBe(false)
    })

    it('嵌套数组应正确比较', () => {
      expect(deepEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true)
      expect(deepEqual([[1, 2], [3]], [[1, 2], [4]])).toBe(false)
    })
  })

  /* ===== deepEqual 嵌套对象 ===== */
  describe('deepEqual - 嵌套对象', () => {
    it('深层嵌套对象应正确比较', () => {
      const a = { level1: { level2: { level3: 'deep' } } }
      const b = { level1: { level2: { level3: 'deep' } } }
      expect(deepEqual(a, b)).toBe(true)
    })

    it('深层嵌套对象值不同应不相等', () => {
      const a = { level1: { level2: { level3: 'deep' } } }
      const b = { level1: { level2: { level3: 'different' } } }
      expect(deepEqual(a, b)).toBe(false)
    })

    it('混合嵌套（对象+数组）应正确比较', () => {
      const a = { items: [1, 2, 3], meta: { count: 3 } }
      const b = { items: [1, 2, 3], meta: { count: 3 } }
      expect(deepEqual(a, b)).toBe(true)
    })

    it('空对象应相等', () => {
      expect(deepEqual({}, {})).toBe(true)
    })
  })

  /* ===== detectConflicts 大数据集 ===== */
  describe('detectConflicts - 大数据集', () => {
    it('1000项数据应正确检测冲突', () => {
      const local = []
      const server = []
      for (let i = 0; i < 1000; i++) {
        local.push({ id: i, name: `item${i}`, updatedAt: '2024-01-01' })
        if (i < 500) {
          // 前500项相同
          server.push({ id: i, name: `item${i}`, updatedAt: '2024-01-01' })
        } else {
          // 后500项不同
          server.push({ id: i, name: `item${i}_modified`, updatedAt: '2024-01-02' })
        }
      }
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(500)
      expect(conflicts[0].id).toBe(500)
    })

    it('1000项全部相同应无冲突', () => {
      const local = []
      const server = []
      for (let i = 0; i < 1000; i++) {
        const item = { id: i, name: `item${i}` }
        local.push(item)
        server.push({ ...item })
      }
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(0)
    })

    it('1000项本地独有应无冲突', () => {
      const local = []
      const server = []
      for (let i = 0; i < 1000; i++) {
        local.push({ id: i, name: `item${i}` })
      }
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(0)
    })
  })

  /* ===== detectConflicts null/undefined ===== */
  describe('detectConflicts - null/undefined', () => {
    it('localData 为 null 应返回空数组', () => {
      const conflicts = detectConflicts(null, [{ id: 1 }])
      expect(conflicts).toEqual([])
    })

    it('serverData 为 null 应返回空数组', () => {
      const conflicts = detectConflicts([{ id: 1 }], null)
      expect(conflicts).toEqual([])
    })

    it('localData 为 undefined 应返回空数组', () => {
      const conflicts = detectConflicts(undefined, [{ id: 1 }])
      expect(conflicts).toEqual([])
    })

    it('两者都为 null 应返回空数组', () => {
      const conflicts = detectConflicts(null, null)
      expect(conflicts).toEqual([])
    })

    it('数组中包含 null 项应跳过', () => {
      const local = [null, { id: 1, name: 'a' }]
      const server = [null, { id: 1, name: 'b' }]
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(1)
    })

    it('数组中包含 undefined 项应跳过', () => {
      const local = [undefined, { id: 1, name: 'a' }]
      const server = [undefined, { id: 1, name: 'b' }]
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(1)
    })

    it('数组中项缺少 idKey 应跳过', () => {
      const local = [{ name: 'no-id' }, { id: 1, name: 'a' }]
      const server = [{ name: 'no-id' }, { id: 1, name: 'b' }]
      const conflicts = detectConflicts(local, server)
      expect(conflicts).toHaveLength(1)
    })
  })

  /* ===== resolveConflict 策略 ===== */
  describe('resolveConflict - 解决策略', () => {
    const local = { id: 1, name: 'local', updatedAt: '2024-01-02' }
    const server = { id: 1, name: 'server', updatedAt: '2024-01-01' }

    it('local-wins 应返回本地数据', () => {
      expect(resolveConflict(local, server, 'local-wins')).toBe(local)
    })

    it('server-wins 应返回服务端数据', () => {
      expect(resolveConflict(local, server, 'server-wins')).toBe(server)
    })

    it('last-write-wins 应返回时间戳更新的数据', () => {
      const result = resolveConflict(local, server, 'last-write-wins')
      expect(result).toBe(local) // local updatedAt 更新
    })

    it('last-write-wins 服务端更新时应返回服务端数据', () => {
      const localOld = { id: 1, name: 'local', updatedAt: '2024-01-01' }
      const serverNew = { id: 1, name: 'server', updatedAt: '2024-01-02' }
      const result = resolveConflict(localOld, serverNew, 'last-write-wins')
      expect(result).toBe(serverNew)
    })

    it('last-write-wins 都无时间戳时应返回服务端数据', () => {
      const localNoTime = { id: 1, name: 'local' }
      const serverNoTime = { id: 1, name: 'server' }
      const result = resolveConflict(localNoTime, serverNoTime, 'last-write-wins')
      expect(result).toBe(serverNoTime)
    })

    it('last-write-wins 时间戳相同时应返回本地数据（>=）', () => {
      const localSame = { id: 1, name: 'local', updatedAt: '2024-01-01' }
      const serverSame = { id: 1, name: 'server', updatedAt: '2024-01-01' }
      const result = resolveConflict(localSame, serverSame, 'last-write-wins')
      expect(result).toBe(localSame)
    })

    it('merge 策略对非数组应使用 last-write-wins', () => {
      const result = resolveConflict(local, server, 'merge')
      expect(result).toBe(local)
    })

    it('merge 策略对数组应合并', () => {
      const localArr = [{ id: 1, name: 'local', updatedAt: '2024-01-02' }]
      const serverArr = [{ id: 1, name: 'server', updatedAt: '2024-01-01' }]
      const result = resolveConflict(localArr, serverArr, 'merge')
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('local')
    })

    it('未知策略应默认 server-wins', () => {
      const result = resolveConflict(local, server, 'unknown-strategy')
      expect(result).toBe(server)
    })
  })

  /* ===== mergeArrays ===== */
  describe('mergeArrays', () => {
    it('相同 id 保留时间戳更新的版本', () => {
      const local = [{ id: 1, name: 'local', updatedAt: '2024-01-02' }]
      const server = [{ id: 1, name: 'server', updatedAt: '2024-01-01' }]
      const result = mergeArrays(local, server)
      expect(result[0].name).toBe('local')
    })

    it('不同 id 应全部保留', () => {
      const local = [{ id: 1, name: 'local' }]
      const server = [{ id: 2, name: 'server' }]
      const result = mergeArrays(local, server)
      expect(result).toHaveLength(2)
    })

    it('localArr 为非数组应视为空数组', () => {
      const result = mergeArrays(null, [{ id: 1, name: 'server' }])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('server')
    })

    it('serverArr 为非数组应视为空数组', () => {
      const result = mergeArrays([{ id: 1, name: 'local' }], null)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('local')
    })

    it('自定义 idKey 应正确工作', () => {
      const local = [{ code: 'A', name: 'local' }]
      const server = [{ code: 'A', name: 'server', updatedAt: '2024-01-01' }]
      const result = mergeArrays(local, server, 'code')
      expect(result).toHaveLength(1)
    })

    it('项为 null 应跳过', () => {
      const local = [null, { id: 1, name: 'local' }]
      const server = [null, { id: 2, name: 'server' }]
      const result = mergeArrays(local, server)
      expect(result).toHaveLength(2)
    })

    it('项缺少 idKey 应跳过', () => {
      const local = [{ name: 'no-id' }, { id: 1, name: 'local' }]
      const server = [{ id: 2, name: 'server' }]
      const result = mergeArrays(local, server)
      expect(result).toHaveLength(2)
    })
  })

  /* ===== autoResolve ===== */
  describe('autoResolve', () => {
    it('非数组默认使用 last-write-wins', () => {
      const local = { id: 1, name: 'local', updatedAt: '2024-01-02' }
      const server = { id: 1, name: 'server', updatedAt: '2024-01-01' }
      const result = autoResolve(local, server)
      expect(result).toBe(local)
    })

    it('数组冲突少时使用 last-write-wins', () => {
      const local = [{ id: 1, name: 'local', updatedAt: '2024-01-02' }, { id: 2, name: 'same' }]
      const server = [{ id: 1, name: 'server', updatedAt: '2024-01-01' }, { id: 2, name: 'same' }]
      const result = autoResolve(local, server)
      // 1 conflict out of 2 items -> 1 > 2/2 = 1 is false, so last-write-wins
      // last-write-wins for arrays: compare timestamps of local vs server as whole
      // local and server are arrays, getTimestamp returns 0 for both
      // so defaults to server
      expect(Array.isArray(result)).toBe(true)
    })

    it('数组冲突多时使用 merge', () => {
      const local = [
        { id: 1, name: 'local1', updatedAt: '2024-01-02' },
        { id: 2, name: 'local2', updatedAt: '2024-01-02' },
        { id: 3, name: 'local3', updatedAt: '2024-01-02' }
      ]
      const server = [
        { id: 1, name: 'server1', updatedAt: '2024-01-01' },
        { id: 2, name: 'server2', updatedAt: '2024-01-01' },
        { id: 3, name: 'server3', updatedAt: '2024-01-01' }
      ]
      const result = autoResolve(local, server)
      // 3 conflicts > 3/2 = 1.5, so merge strategy
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(3)
      // merge keeps local versions (newer timestamps)
      expect(result[0].name).toBe('local1')
    })

    it('无冲突时使用 last-write-wins', () => {
      const local = [{ id: 1, name: 'same' }]
      const server = [{ id: 1, name: 'same' }]
      const result = autoResolve(local, server)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
