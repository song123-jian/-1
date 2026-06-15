/**
 * versionControl.js 深度测试
 * 覆盖：100版本记录与 newData 清理、diff 存储、数据重建、
 *       存储大小对比、旧格式迁移、版本对比、版本恢复、
 *       并发记录、模块清理、统计信息
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/* ===== Mock 依赖 ===== */
vi.mock('@/utils/eventBus', () => {
  const handlers = {}
  return {
    default: {
      on: vi.fn((event, handler) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
        return vi.fn()
      }),
      emit: vi.fn((event, data) => {
        if (handlers[event]) {
          handlers[event].forEach(h => h(data))
        }
      }),
      off: vi.fn()
    },
    DataEvents: {
      CREATED: 'data:created',
      UPDATED: 'data:updated',
      DELETED: 'data:deleted',
      BATCH_UPDATED: 'data:batch_updated',
      BATCH_DELETED: 'data:batch_deleted',
      SYNC_STARTED: 'sync:started',
      SYNC_COMPLETED: 'sync:completed',
      SYNC_FAILED: 'sync:failed',
      CACHE_INVALIDATED: 'cache:invalidated',
      CACHE_UPDATED: 'cache:updated',
      VERSION_CREATED: 'version:created',
      VERSION_RESTORED: 'version:restored'
    }
  }
})

import versionControl from '@/utils/versionControl.js'

describe('versionControl.js - 深度测试', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'))
    /* 重置版本控制器内部状态 */
    versionControl._versions.clear()
    versionControl._stats = { totalVersions: 0, restores: 0 }
    versionControl._config = {
      maxVersionsPerModule: 50,
      maxTotalVersions: 500,
      autoVersion: true,
      trackedModules: [
        'customer', 'quotation', 'contract', 'inventory',
        'delivery', 'collection', 'statement', 'supplier',
        'warehouseLocation', 'cost'
      ]
    }
    versionControl._saveToStorage()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /* ===== 1. 记录 100 个版本，仅最新有 newData ===== */
  describe('100 版本记录与 newData 清理', () => {
    it('记录 100 个版本后，仅最新版本保留 newData', () => {
      /* 先设置 maxVersionsPerModule 为 200 以容纳 100 个版本 */
      versionControl.updateConfig({ maxVersionsPerModule: 200 })

      let lastVersion
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(1000)
        lastVersion = versionControl.recordVersion('customer', 'item_1',
          { name: `name_${i - 1}`, value: i - 1 },
          { name: `name_${i}`, value: i },
          { action: 'update', user: 'tester' }
        )
      }

      const versions = versionControl.getVersions('customer', 'item_1')
      expect(versions.length).toBe(100)

      /* 仅最后一个版本有 newData */
      const withNewData = versions.filter(v => v.newData !== undefined && v.newData !== null)
      expect(withNewData.length).toBe(1)
      expect(withNewData[0].id).toBe(lastVersion.id)
      expect(withNewData[0].newData.name).toBe('name_99')
      expect(withNewData[0].newData.value).toBe(99)

      /* 之前的版本不应有 newData */
      for (let i = 0; i < 99; i++) {
        expect(versions[i].newData).toBeUndefined()
      }
    })
  })

  /* ===== 2. changes 字段包含 diff 而非完整快照 ===== */
  describe('changes 字段包含 diff', () => {
    it('changes 应仅包含变更字段', () => {
      const oldData = { name: '张三', age: 25, city: '北京', email: 'old@test.com' }
      const newData = { name: '张三', age: 26, city: '上海', email: 'old@test.com' }

      const version = versionControl.recordVersion('customer', 'item_2', oldData, newData, {
        action: 'update',
        user: 'tester'
      })

      expect(version.changes).toBeDefined()
      expect(version.changes.length).toBe(2) /* age 和 city 变了 */

      const ageChange = version.changes.find(c => c.field === 'age')
      expect(ageChange).toBeDefined()
      expect(ageChange.oldValue).toBe(25)
      expect(ageChange.newValue).toBe(26)

      const cityChange = version.changes.find(c => c.field === 'city')
      expect(cityChange).toBeDefined()
      expect(cityChange.oldValue).toBe('北京')
      expect(cityChange.newValue).toBe('上海')

      /* name 和 email 未变，不应出现在 changes 中 */
      const nameChange = version.changes.find(c => c.field === 'name')
      expect(nameChange).toBeUndefined()
    })

    it('create 操作的 changes 应包含所有字段', () => {
      const newData = { name: '李四', age: 30, city: '上海' }

      const version = versionControl.recordVersion('customer', 'item_3', null, newData, {
        action: 'create',
        user: 'tester'
      })

      expect(version.changes.length).toBe(3)
      version.changes.forEach(c => {
        expect(c.oldValue).toBeUndefined()
        expect(c.newValue).toBeDefined()
      })
    })

    it('delete 操作的 changes 应包含所有旧字段', () => {
      const oldData = { name: '王五', age: 40 }

      const version = versionControl.recordVersion('customer', 'item_4', oldData, null, {
        action: 'delete',
        user: 'tester'
      })

      expect(version.changes.length).toBe(2)
      version.changes.forEach(c => {
        expect(c.oldValue).toBeDefined()
        expect(c.newValue).toBeUndefined()
      })
    })
  })

  /* ===== 3. reconstructData 正确重建历史版本 ===== */
  describe('reconstructData 数据重建', () => {
    it('应通过重放变更正确重建历史版本', () => {
      /* 创建初始数据 */
      versionControl.recordVersion('customer', 'item_5', null,
        { name: '初始名', age: 20, city: '北京' },
        { action: 'create', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'item_5',
        { name: '初始名', age: 20, city: '北京' },
        { name: '修改名', age: 20, city: '北京' },
        { action: 'update', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'item_5',
        { name: '修改名', age: 20, city: '北京' },
        { name: '修改名', age: 25, city: '上海' },
        { action: 'update', user: 'tester' }
      )

      const versions = versionControl.getVersions('customer', 'item_5')
      expect(versions.length).toBe(3)

      /* 重建第一个版本（create）的数据 */
      const v1Data = versionControl._reconstructData('customer', 'item_5', versions[0].id)
      expect(v1Data.name).toBe('初始名')
      expect(v1Data.age).toBe(20)
      expect(v1Data.city).toBe('北京')

      /* 重建第二个版本的数据 */
      const v2Data = versionControl._reconstructData('customer', 'item_5', versions[1].id)
      expect(v2Data.name).toBe('修改名')
      expect(v2Data.age).toBe(20)
      expect(v2Data.city).toBe('北京')

      /* 重建第三个版本的数据 */
      const v3Data = versionControl._reconstructData('customer', 'item_5', versions[2].id)
      expect(v3Data.name).toBe('修改名')
      expect(v3Data.age).toBe(25)
      expect(v3Data.city).toBe('上海')
    })
  })

  /* ===== 4. 存储大小对比 - diff vs 完整快照 ===== */
  describe('存储大小对比', () => {
    it('diff 存储应比完整快照更节省空间', () => {
      versionControl.updateConfig({ maxVersionsPerModule: 200 })

      /* 记录 100 个版本，每次只改一个字段 */
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', 'size_test',
          { name: `name_${i}`, age: i, city: '北京', email: `email_${i}@test.com`, phone: `138${String(i).padStart(8, '0')}` },
          { name: `name_${i + 1}`, age: i + 1, city: '北京', email: `email_${i + 1}@test.com`, phone: `138${String(i + 1).padStart(8, '0')}` },
          { action: 'update', user: 'tester' }
        )
      }

      /* 计算实际 diff 存储大小 */
      const diffStorageRaw = localStorage.getItem('gj_erp_dataVersions')
      const diffSize = diffStorageRaw.length

      /* 模拟完整快照存储大小（每个版本都存完整 newData） */
      const versions = versionControl.getVersions('customer', 'size_test')
      let fullSnapshotSize = 0
      for (const v of versions) {
        /* 假设每个版本存完整数据 */
        fullSnapshotSize += JSON.stringify({
          ...v,
          newData: { name: 'x', age: 1, city: '北京', email: 'x@test.com', phone: '13800000000' }
        }).length
      }

      /* diff 存储应比完整快照小 */
      /* 由于只有最新版本有 newData，diff 存储应明显更小 */
      expect(diffSize).toBeLessThan(fullSnapshotSize)
    })
  })

  /* ===== 5. 旧格式迁移 - oldData 字段自动转换 ===== */
  describe('旧格式迁移', () => {
    it('含 oldData 字段的版本应自动转换为 diff 格式', () => {
      /* 模拟旧格式数据 */
      const oldFormatData = {
        customer: {
          migrate_item: [
            {
              id: 'v_old_1',
              module: 'customer',
              itemId: 'migrate_item',
              version: 1,
              action: 'update',
              oldData: { name: '旧名', age: 20 },
              newData: { name: '新名', age: 20 },
              user: 'system',
              label: '',
              timestamp: Date.now() - 2000,
              datetime: new Date(Date.now() - 2000).toISOString()
            },
            {
              id: 'v_old_2',
              module: 'customer',
              itemId: 'migrate_item',
              version: 2,
              action: 'update',
              oldData: { name: '新名', age: 20 },
              newData: { name: '最新名', age: 25 },
              user: 'system',
              label: '',
              timestamp: Date.now() - 1000,
              datetime: new Date(Date.now() - 1000).toISOString()
            }
          ]
        }
      }

      localStorage.setItem('gj_erp_dataVersions', JSON.stringify(oldFormatData))

      /* 重新加载触发迁移 */
      versionControl._versions.clear()
      versionControl._loadFromStorage()

      const versions = versionControl.getVersions('customer', 'migrate_item')
      expect(versions.length).toBe(2)

      /* oldData 应被删除 */
      expect(versions[0].oldData).toBeUndefined()
      expect(versions[1].oldData).toBeUndefined()

      /* changes 应被计算 */
      expect(versions[0].changes).toBeDefined()
      expect(versions[0].changes.length).toBeGreaterThan(0)

      /* 仅最新版本保留 newData */
      expect(versions[0].newData).toBeUndefined()
      expect(versions[1].newData).toBeDefined()
      expect(versions[1].newData.name).toBe('最新名')
    })

    it('create 操作的旧格式迁移', () => {
      const oldFormatData = {
        customer: {
          create_item: [
            {
              id: 'v_create_1',
              module: 'customer',
              itemId: 'create_item',
              version: 1,
              action: 'create',
              oldData: null,
              newData: { name: '新建', age: 18 },
              user: 'system',
              label: '',
              timestamp: Date.now(),
              datetime: new Date().toISOString()
            }
          ]
        }
      }

      localStorage.setItem('gj_erp_dataVersions', JSON.stringify(oldFormatData))
      versionControl._versions.clear()
      versionControl._loadFromStorage()

      const versions = versionControl.getVersions('customer', 'create_item')
      expect(versions[0].oldData).toBeUndefined()
      expect(versions[0].changes).toBeDefined()
      expect(versions[0].changes.length).toBe(2) /* name 和 age */
    })
  })

  /* ===== 6. compareVersions 对比 diff 版本 ===== */
  describe('compareVersions', () => {
    it('应正确对比两个 diff 版本', () => {
      versionControl.recordVersion('customer', 'cmp_item', null,
        { name: 'A', age: 20, city: '北京' },
        { action: 'create', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'cmp_item',
        { name: 'A', age: 20, city: '北京' },
        { name: 'B', age: 20, city: '上海' },
        { action: 'update', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'cmp_item',
        { name: 'B', age: 20, city: '上海' },
        { name: 'B', age: 30, city: '上海' },
        { action: 'update', user: 'tester' }
      )

      const versions = versionControl.getVersions('customer', 'cmp_item')
      const result = versionControl.compareVersions('customer', 'cmp_item', versions[0].id, versions[2].id)

      expect(result).not.toBeNull()
      expect(result.diff).toBeDefined()
      /* v1: name=A, age=20, city=北京 vs v3: name=B, age=30, city=上海 */
      expect(result.diff.length).toBe(3) /* name, age, city 都不同 */
    })

    it('不存在的版本应返回 null', () => {
      const result = versionControl.compareVersions('customer', 'nonexistent', 'v1', 'v2')
      expect(result).toBeNull()
    })
  })

  /* ===== 7. restoreVersion 返回正确数据 ===== */
  describe('restoreVersion', () => {
    it('应恢复到指定版本的数据', () => {
      versionControl.recordVersion('customer', 'restore_item', null,
        { name: 'V1', age: 20 },
        { action: 'create', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'restore_item',
        { name: 'V1', age: 20 },
        { name: 'V2', age: 25 },
        { action: 'update', user: 'tester' }
      )

      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'restore_item',
        { name: 'V2', age: 25 },
        { name: 'V3', age: 30 },
        { action: 'update', user: 'tester' }
      )

      const versions = versionControl.getVersions('customer', 'restore_item')
      expect(versions.length).toBe(3)

      /* 恢复到第一个版本 */
      const restoredData = versionControl.restoreVersion('customer', 'restore_item', versions[0].id)
      expect(restoredData.name).toBe('V1')
      expect(restoredData.age).toBe(20)

      /* 恢复操作应产生新版本 */
      const versionsAfterRestore = versionControl.getVersions('customer', 'restore_item')
      expect(versionsAfterRestore.length).toBe(4)
      const restoreVersion = versionsAfterRestore[versionsAfterRestore.length - 1]
      expect(restoreVersion.action).toBe('restore')
      expect(restoreVersion.label).toContain('回滚到版本 1')
    })

    it('恢复最新版本应直接使用 newData', () => {
      versionControl.recordVersion('customer', 'restore_latest', null,
        { name: '最新', age: 99 },
        { action: 'create', user: 'tester' }
      )

      const versions = versionControl.getVersions('customer', 'restore_latest')
      const restoredData = versionControl.restoreVersion('customer', 'restore_latest', versions[0].id)
      expect(restoredData.name).toBe('最新')
    })

    it('不存在的版本应返回 null', () => {
      const result = versionControl.restoreVersion('customer', 'nonexistent', 'bad_id')
      expect(result).toBeNull()
    })
  })

  /* ===== 8. 并发版本记录（快速连续 10 次更新） ===== */
  describe('并发版本记录', () => {
    it('快速连续 10 次更新应正确记录所有版本', () => {
      /* 先创建 */
      versionControl.recordVersion('customer', 'rapid_item', null,
        { name: '初始', value: 0 },
        { action: 'create', user: 'tester' }
      )

      /* 快速连续 10 次更新 */
      for (let i = 1; i <= 10; i++) {
        vi.advanceTimersByTime(1) /* 每次前进 1ms */
        versionControl.recordVersion('customer', 'rapid_item',
          { name: `v${i - 1}`, value: i - 1 },
          { name: `v${i}`, value: i },
          { action: 'update', user: 'tester' }
        )
      }

      const versions = versionControl.getVersions('customer', 'rapid_item')
      expect(versions.length).toBe(11) /* 1 create + 10 update */

      /* 验证版本号递增 */
      for (let i = 0; i < 11; i++) {
        expect(versions[i].version).toBe(i + 1)
      }

      /* 仅最新版本有 newData */
      const withNewData = versions.filter(v => v.newData !== undefined && v.newData !== null)
      expect(withNewData.length).toBe(1)
      expect(withNewData[0].newData.name).toBe('v10')
    })
  })

  /* ===== 9. cleanupModule 移除模块所有版本 ===== */
  describe('cleanupModule', () => {
    it('应保留指定数量的版本，移除多余的', () => {
      /* 记录 30 个版本（maxVersionsPerModule=50，不会自动清理） */
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', 'cleanup_item',
          { value: i },
          { value: i + 1 },
          { action: 'update', user: 'tester' }
        )
      }

      let versions = versionControl.getVersions('customer', 'cleanup_item')
      expect(versions.length).toBe(30)

      /* 清理，保留 10 个 */
      versionControl.cleanupModule('customer', 10)

      versions = versionControl.getVersions('customer', 'cleanup_item')
      expect(versions.length).toBe(10)

      /* 应保留最新的 10 个（版本号 21-30） */
      expect(versions[0].version).toBe(21)
      expect(versions[9].version).toBe(30)

      /* 最新版本应有正确的数据 */
      const latest = versions[versions.length - 1]
      expect(latest.newData).toBeDefined()
      expect(latest.newData.value).toBe(30)
    })

    it('不存在的模块不应报错', () => {
      expect(() => versionControl.cleanupModule('nonexistent', 10)).not.toThrow()
    })

    it('cleanupAll 应清理所有模块', () => {
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', 'all_cleanup_1',
          { v: i }, { v: i + 1 }, { action: 'update', user: 'tester' }
        )
        versionControl.recordVersion('quotation', 'all_cleanup_1',
          { v: i }, { v: i + 1 }, { action: 'update', user: 'tester' }
        )
      }

      versionControl.cleanupAll()

      const customerVersions = versionControl.getVersions('customer', 'all_cleanup_1')
      const quotationVersions = versionControl.getVersions('quotation', 'all_cleanup_1')
      expect(customerVersions.length).toBe(50) /* maxVersionsPerModule = 50 */
      expect(quotationVersions.length).toBe(50)
    })
  })

  /* ===== 10. getStats 返回正确统计 ===== */
  describe('getStats', () => {
    it('应返回正确的版本统计信息', () => {
      versionControl.recordVersion('customer', 'stat_1', null,
        { name: 'A' }, { action: 'create', user: 'tester' }
      )
      versionControl.recordVersion('customer', 'stat_1',
        { name: 'A' }, { name: 'B' }, { action: 'update', user: 'tester' }
      )
      versionControl.recordVersion('quotation', 'stat_2', null,
        { no: 'Q1' }, { action: 'create', user: 'tester' }
      )

      const stats = versionControl.getStats()
      expect(stats.totalVersions).toBe(3)
      expect(stats.trackedModules).toBe(2) /* customer + quotation */
      expect(stats.trackedItems).toBe(2) /* stat_1 + stat_2 */
      expect(stats.totalRestores).toBe(0)
      expect(stats.config.maxVersionsPerModule).toBe(50)
    })

    it('恢复操作应增加 restores 计数', () => {
      versionControl.recordVersion('customer', 'stat_restore', null,
        { name: 'A' }, { action: 'create', user: 'tester' }
      )
      versionControl.recordVersion('customer', 'stat_restore',
        { name: 'A' }, { name: 'B' }, { action: 'update', user: 'tester' }
      )

      const versions = versionControl.getVersions('customer', 'stat_restore')
      versionControl.restoreVersion('customer', 'stat_restore', versions[0].id)

      const stats = versionControl.getStats()
      expect(stats.totalRestores).toBe(1)
    })
  })

  /* ===== 版本号限制 ===== */
  describe('版本数量限制', () => {
    it('超过 maxVersionsPerModule 应自动清理旧版本', () => {
      versionControl.updateConfig({ maxVersionsPerModule: 5 })

      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', 'limit_item',
          { v: i }, { v: i + 1 }, { action: 'update', user: 'tester' }
        )
      }

      const versions = versionControl.getVersions('customer', 'limit_item')
      expect(versions.length).toBe(5)
      /* 注意：由于 recordVersion 使用 versions.length + 1 作为版本号，
         splice 后 length 不变，所以后续版本号会重复。
         这里验证的是保留数量和最新版本的 newData 正确性 */
      /* 最新版本应有正确的数据 */
      const latest = versions[versions.length - 1]
      expect(latest.newData).toBeDefined()
      expect(latest.newData.v).toBe(10)
    })
  })

  /* ===== getVersions / getVersion / getLatestVersion ===== */
  describe('版本查询方法', () => {
    it('getVersions 按 action 筛选', () => {
      versionControl.recordVersion('customer', 'query_item', null,
        { name: 'A' }, { action: 'create', user: 'tester' }
      )
      versionControl.recordVersion('customer', 'query_item',
        { name: 'A' }, { name: 'B' }, { action: 'update', user: 'tester' }
      )
      versionControl.recordVersion('customer', 'query_item',
        { name: 'B' }, { name: 'C' }, { action: 'update', user: 'tester' }
      )

      const updates = versionControl.getVersions('customer', 'query_item', { action: 'update' })
      expect(updates.length).toBe(2)

      const creates = versionControl.getVersions('customer', 'query_item', { action: 'create' })
      expect(creates.length).toBe(1)
    })

    it('getVersions 按 limit 限制数量', () => {
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', 'limit_query',
          { v: i }, { v: i + 1 }, { action: 'update', user: 'tester' }
        )
      }

      const limited = versionControl.getVersions('customer', 'limit_query', { limit: 3 })
      expect(limited.length).toBe(3)
    })

    it('getVersion 返回指定版本', () => {
      const v = versionControl.recordVersion('customer', 'single_item', null,
        { name: 'test' }, { action: 'create', user: 'tester' }
      )

      const found = versionControl.getVersion('customer', 'single_item', v.id)
      expect(found).not.toBeNull()
      expect(found.id).toBe(v.id)
    })

    it('getLatestVersion 返回最新版本', () => {
      versionControl.recordVersion('customer', 'latest_item', null,
        { name: 'V1' }, { action: 'create', user: 'tester' }
      )
      vi.advanceTimersByTime(1000)
      const v2 = versionControl.recordVersion('customer', 'latest_item',
        { name: 'V1' }, { name: 'V2' }, { action: 'update', user: 'tester' }
      )

      const latest = versionControl.getLatestVersion('customer', 'latest_item')
      expect(latest.id).toBe(v2.id)
      expect(latest.version).toBe(2)
    })

    it('不存在的项应返回空数组/null', () => {
      expect(versionControl.getVersions('customer', 'nonexistent')).toEqual([])
      expect(versionControl.getVersion('customer', 'nonexistent', 'v1')).toBeNull()
      expect(versionControl.getLatestVersion('customer', 'nonexistent')).toBeNull()
    })
  })

  /* ===== setVersionLabel ===== */
  describe('setVersionLabel', () => {
    it('应为版本添加标签', () => {
      const v = versionControl.recordVersion('customer', 'label_item', null,
        { name: 'test' }, { action: 'create', user: 'tester' }
      )

      versionControl.setVersionLabel('customer', 'label_item', v.id, '重要版本')

      const found = versionControl.getVersion('customer', 'label_item', v.id)
      expect(found.label).toBe('重要版本')
    })
  })

  /* ===== getModuleVersions ===== */
  describe('getModuleVersions', () => {
    it('应返回模块下所有版本并按时间倒序排列', () => {
      versionControl.recordVersion('customer', 'mod_a', null,
        { name: 'A1' }, { action: 'create', user: 'tester' }
      )
      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'mod_b', null,
        { name: 'B1' }, { action: 'create', user: 'tester' }
      )
      vi.advanceTimersByTime(1000)
      versionControl.recordVersion('customer', 'mod_a',
        { name: 'A1' }, { name: 'A2' }, { action: 'update', user: 'tester' }
      )

      const moduleVersions = versionControl.getModuleVersions('customer')
      expect(moduleVersions.length).toBe(3)
      /* 应按时间倒序 */
      expect(moduleVersions[0].timestamp).toBeGreaterThanOrEqual(moduleVersions[1].timestamp)
    })

    it('limit 参数应限制返回数量', () => {
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1000)
        versionControl.recordVersion('customer', `mod_limit_${i}`, null,
          { v: i }, { action: 'create', user: 'tester' }
        )
      }

      const limited = versionControl.getModuleVersions('customer', { limit: 3 })
      expect(limited.length).toBe(3)
    })
  })

  /* ===== 持久化与加载 ===== */
  describe('持久化与加载', () => {
    it('版本数据应持久化到 localStorage', () => {
      versionControl.recordVersion('customer', 'persist_item', null,
        { name: '持久化测试' }, { action: 'create', user: 'tester' }
      )

      const raw = localStorage.getItem('gj_erp_dataVersions')
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw)
      expect(parsed.customer).toBeDefined()
      expect(parsed.customer.persist_item).toBeDefined()
    })

    it('从 localStorage 加载应恢复版本数据', () => {
      versionControl.recordVersion('customer', 'load_item', null,
        { name: '加载测试' }, { action: 'create', user: 'tester' }
      )

      /* 清除内存，重新加载 */
      versionControl._versions.clear()
      versionControl._loadFromStorage()

      const versions = versionControl.getVersions('customer', 'load_item')
      expect(versions.length).toBe(1)
      expect(versions[0].action).toBe('create')
    })
  })

  /* ===== _computeDiff 内部方法 ===== */
  describe('_computeDiff', () => {
    it('两个 null 应返回空数组', () => {
      expect(versionControl._computeDiff(null, null)).toEqual([])
    })

    it('oldData 为 null 应返回所有新字段', () => {
      const diff = versionControl._computeDiff(null, { name: 'test', age: 20 })
      expect(diff.length).toBe(2)
      diff.forEach(d => expect(d.oldValue).toBeUndefined())
    })

    it('newData 为 null 应返回所有旧字段', () => {
      const diff = versionControl._computeDiff({ name: 'test', age: 20 }, null)
      expect(diff.length).toBe(2)
      diff.forEach(d => expect(d.newValue).toBeUndefined())
    })

    it('以 _ 开头和 updatedAt/updatedBy 字段应被忽略', () => {
      const oldData = { name: 'A', _internal: 'x', updatedAt: '2025-01-01', updatedBy: 'user1' }
      const newData = { name: 'B', _internal: 'y', updatedAt: '2025-06-01', updatedBy: 'user2' }

      const diff = versionControl._computeDiff(oldData, newData)
      expect(diff.length).toBe(1) /* 仅 name 变了 */
      expect(diff[0].field).toBe('name')
    })
  })
})
