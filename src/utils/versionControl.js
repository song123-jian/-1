/**
 * 数据版本控制器
 * 记录数据修改历史，支持数据回溯功能
 * 支持：
 * - 自动记录数据变更快照
 * - 变更差异对比
 * - 版本回滚/恢复
 * - 版本标签与注释
 * - 历史清理策略
 * - 存储优化：仅存储 diff 而非完整快照
 */

import eventBus, { DataEvents } from './eventBus'

const VERSION_STORAGE_KEY = 'gj_erp_dataVersions'
const VERSION_CONFIG_KEY = 'gj_erp_versionConfig'

/* 默认配置 */
const DEFAULT_CONFIG = {
  /* 每个模块最大版本数 */
  maxVersionsPerModule: 50,
  /* 全局最大版本数 */
  maxTotalVersions: 500,
  /* 是否自动记录版本 */
  autoVersion: true,
  /* 需要版本控制的模块 */
  trackedModules: [
    'customer',
    'quotation',
    'contract',
    'inventory',
    'delivery',
    'collection',
    'statement',
    'supplier',
    'warehouseLocation',
    'cost'
  ]
}

class VersionControl {
  constructor() {
    /* 版本存储：moduleId → itemId → [version] */
    this._versions = new Map()
    /* 配置 */
    this._config = { ...DEFAULT_CONFIG }
    /* 统计 */
    this._stats = {
      totalVersions: 0,
      restores: 0
    }
    /* 加载持久化数据 */
    this._loadFromStorage()
  }

  /**
   * 初始化版本控制器，订阅数据变更事件
   */
  init() {
    /* 订阅数据更新事件，自动记录版本 */
    eventBus.on(DataEvents.UPDATED, (data) => {
      if (this._config.autoVersion && this._config.trackedModules.includes(data.module)) {
        this.recordVersion(data.module, data.id, data.oldData, data.data, {
          action: 'update',
          changes: data.changes,
          user: data.user
        })
      }
    })

    eventBus.on(DataEvents.CREATED, (data) => {
      if (this._config.autoVersion && this._config.trackedModules.includes(data.module)) {
        this.recordVersion(data.module, data.id, null, data.data, {
          action: 'create',
          user: data.user
        })
      }
    })

    eventBus.on(DataEvents.DELETED, (data) => {
      if (this._config.autoVersion && this._config.trackedModules.includes(data.module)) {
        this.recordVersion(data.module, data.id, data.data, null, {
          action: 'delete',
          user: data.user
        })
      }
    })
  }

  /**
   * 计算两个数据对象之间的 diff（仅返回变更字段）
   * @param {*} oldData - 旧数据
   * @param {*} newData - 新数据
   * @returns {Array} 变更列表 [{field, oldValue, newValue}]
   */
  _computeDiff(oldData, newData) {
    if (!oldData && !newData) return []
    if (!oldData) {
      return Object.keys(newData).map((key) => ({
        field: key,
        oldValue: undefined,
        newValue: newData[key]
      }))
    }
    if (!newData) {
      return Object.keys(oldData).map((key) => ({
        field: key,
        oldValue: oldData[key],
        newValue: undefined
      }))
    }
    const changes = []
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    for (const key of allKeys) {
      if (key.startsWith('_') || key === 'updatedAt' || key === 'updatedBy') continue
      const oldVal = oldData[key]
      const newVal = newData[key]

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal
        })
      }
    }

    return changes
  }

  /**
   * 记录一个版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {*} oldData - 变更前数据
   * @param {*} newData - 变更后数据
   * @param {Object} meta - 元数据 { action, changes, user, label }
   * @returns {Object} 版本记录
   */
  recordVersion(module, itemId, oldData, newData, meta = {}) {
    const moduleKey = module
    if (!this._versions.has(moduleKey)) {
      this._versions.set(moduleKey, new Map())
    }
    const itemVersions = this._versions.get(moduleKey)
    if (!itemVersions.has(itemId)) {
      itemVersions.set(itemId, [])
    }
    const versions = itemVersions.get(itemId)

    /* 计算版本号 */
    const versionNumber = versions.length + 1

    /* 计算 diff */
    const changes = meta.changes
      ? Array.isArray(meta.changes)
        ? meta.changes
        : this._computeDiff(oldData, newData)
      : this._computeDiff(oldData, newData)

    const version = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      module,
      itemId,
      version: versionNumber,
      action: meta.action || 'update',
      changes,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      user: meta.user || 'system',
      label: meta.label || '',
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    }

    /* 之前最新版本移除 newData，仅保留 diff */
    if (versions.length > 0) {
      const previousLatest = versions[versions.length - 1]
      delete previousLatest.newData
    }

    versions.push(version)
    this._stats.totalVersions++

    /* 限制版本数量 */
    if (versions.length > this._config.maxVersionsPerModule) {
      const removed = versions.splice(0, versions.length - this._config.maxVersionsPerModule)
      this._stats.totalVersions -= removed.length
    }

    /* 持久化 */
    this._saveToStorage()

    /* 发布版本事件 */
    eventBus.emit(DataEvents.VERSION_CREATED, { module, itemId, version })

    return version
  }

  /**
   * 获取数据项的版本历史
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {Object} options - 选项 { limit, action }
   * @returns {Array} 版本列表
   */
  getVersions(module, itemId, options = {}) {
    const itemVersions = this._versions.get(module)?.get(itemId)
    if (!itemVersions) return []

    let versions = [...itemVersions]

    if (options.action) {
      versions = versions.filter((v) => v.action === options.action)
    }

    if (options.limit) {
      versions = versions.slice(-options.limit)
    }

    return versions
  }

  /**
   * 获取特定版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} versionId - 版本ID
   * @returns {Object|null} 版本记录
   */
  getVersion(module, itemId, versionId) {
    const versions = this._versions.get(module)?.get(itemId)
    if (!versions) return null
    return versions.find((v) => v.id === versionId) || null
  }

  /**
   * 获取最新版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @returns {Object|null} 最新版本
   */
  getLatestVersion(module, itemId) {
    const versions = this._versions.get(module)?.get(itemId)
    if (!versions || versions.length === 0) return null
    return versions[versions.length - 1]
  }

  /**
   * 从第一个可用快照开始重放变更，重建目标版本的数据
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} targetVersionId - 目标版本ID
   * @returns {*|null} 重建后的数据
   */
  _reconstructData(module, itemId, targetVersionId) {
    const versions = this._versions.get(module)?.get(itemId)
    if (!versions || versions.length === 0) return null

    const targetIdx = versions.findIndex((v) => v.id === targetVersionId)
    if (targetIdx === -1) return null

    /* 找到目标版本之前（含）最近的包含 newData 的版本作为起点 */
    let startIdx = -1
    for (let i = targetIdx; i >= 0; i--) {
      if (versions[i].newData !== undefined && versions[i].newData !== null) {
        startIdx = i
        break
      }
    }

    /* 如果没有找到有 newData 的版本，从第一个版本开始构建 */
    if (startIdx === -1) {
      /* 第一个版本是 create，从空对象开始 */
      let data = {}
      for (let i = 0; i <= targetIdx; i++) {
        const v = versions[i]
        if (v.action === 'create' && v.changes) {
          for (const change of v.changes) {
            if (change.newValue !== undefined) {
              data[change.field] = change.newValue
            }
          }
        } else if (v.action === 'delete') {
          data = null
        } else if (v.changes) {
          for (const change of v.changes) {
            if (change.newValue === undefined) {
              delete data[change.field]
            } else {
              data[change.field] = change.newValue
            }
          }
        }
      }
      return data
    }

    /* 从 startIdx 的 newData 开始，重放后续变更到 targetIdx */
    let data = JSON.parse(JSON.stringify(versions[startIdx].newData))
    for (let i = startIdx + 1; i <= targetIdx; i++) {
      const v = versions[i]
      if (v.action === 'delete') {
        data = null
      } else if (v.action === 'create') {
        data = {}
        if (v.changes) {
          for (const change of v.changes) {
            if (change.newValue !== undefined) {
              data[change.field] = change.newValue
            }
          }
        }
      } else if (v.changes) {
        if (data === null) data = {}
        for (const change of v.changes) {
          if (change.newValue === undefined) {
            delete data[change.field]
          } else {
            data[change.field] = change.newValue
          }
        }
      }
    }

    return data
  }

  /**
   * 回滚到指定版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} versionId - 目标版本ID
   * @returns {Object|null} 回滚后的数据
   */
  restoreVersion(module, itemId, versionId) {
    const version = this.getVersion(module, itemId, versionId)
    if (!version) return null

    let restoredData
    if (version.newData !== undefined) {
      /* 最新版本或仍有 newData 的版本，直接使用 */
      restoredData = version.newData ? JSON.parse(JSON.stringify(version.newData)) : null
    } else {
      /* 旧版本，需要通过重放变更重建数据 */
      restoredData = this._reconstructData(module, itemId, versionId)
    }

    /* 记录回滚操作 */
    this.recordVersion(module, itemId, null, restoredData, {
      action: 'restore',
      label: `回滚到版本 ${version.version}`,
      user: version.user
    })

    this._stats.restores++

    /* 发布版本恢复事件 */
    eventBus.emit(DataEvents.VERSION_RESTORED, {
      module,
      itemId,
      versionId,
      restoredData
    })

    return restoredData
  }

  /**
   * 对比两个版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} versionId1 - 版本1 ID
   * @param {string} versionId2 - 版本2 ID
   * @returns {Object} 差异对比结果
   */
  compareVersions(module, itemId, versionId1, versionId2) {
    const v1 = this.getVersion(module, itemId, versionId1)
    const v2 = this.getVersion(module, itemId, versionId2)
    if (!v1 || !v2) return null

    /* 获取两个版本的数据用于对比 */
    const data1 = v1.newData !== undefined ? v1.newData : this._reconstructData(module, itemId, versionId1)
    const data2 = v2.newData !== undefined ? v2.newData : this._reconstructData(module, itemId, versionId2)

    return {
      version1: v1,
      version2: v2,
      diff: this._computeChanges(data1, data2)
    }
  }

  /**
   * 获取模块的所有版本记录
   * @param {string} module - 模块名
   * @param {Object} options - 选项 { limit }
   * @returns {Array} 版本列表
   */
  getModuleVersions(module, options = {}) {
    const moduleVersions = this._versions.get(module)
    if (!moduleVersions) return []

    const all = []
    for (const [, versions] of moduleVersions) {
      all.push(...versions)
    }

    /* 按时间倒序排列 */
    all.sort((a, b) => b.timestamp - a.timestamp)

    if (options.limit) {
      return all.slice(0, options.limit)
    }
    return all
  }

  /**
   * 为版本添加标签
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} versionId - 版本ID
   * @param {string} label - 标签
   */
  setVersionLabel(module, itemId, versionId, label) {
    const version = this.getVersion(module, itemId, versionId)
    if (version) {
      version.label = label
      this._saveToStorage()
    }
  }

  /**
   * 清理指定模块的历史版本
   * @param {string} module - 模块名
   * @param {number} keepCount - 保留的版本数
   */
  cleanupModule(module, keepCount = 20) {
    const moduleVersions = this._versions.get(module)
    if (!moduleVersions) return

    for (const [itemId, versions] of moduleVersions) {
      if (versions.length > keepCount) {
        const removed = versions.splice(0, versions.length - keepCount)
        this._stats.totalVersions -= removed.length
      }
    }

    this._saveToStorage()
  }

  /**
   * 清理所有过期版本
   */
  cleanupAll() {
    for (const module of this._config.trackedModules) {
      this.cleanupModule(module, this._config.maxVersionsPerModule)
    }
  }

  /**
   * 计算两个数据对象之间的差异
   * @param {*} oldData - 旧数据
   * @param {*} newData - 新数据
   * @returns {Array} 变更列表 [{field, oldValue, newValue}]
   */
  _computeChanges(oldData, newData) {
    if (!oldData || !newData) return []
    const changes = []
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    for (const key of allKeys) {
      if (key.startsWith('_') || key === 'updatedAt' || key === 'updatedBy') continue
      const oldVal = oldData[key]
      const newVal = newData[key]

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal
        })
      }
    }

    return changes
  }

  /**
   * 将旧格式版本数据迁移为新 diff 格式
   * 旧格式：{ oldData, newData } → 新格式：{ changes, newData (仅最新) }
   * @param {Array} versions - 版本列表
   * @returns {Array} 迁移后的版本列表
   */
  _migrateVersions(versions) {
    if (!versions || versions.length === 0) return versions

    for (let i = 0; i < versions.length; i++) {
      const v = versions[i]

      /* 检测旧格式：有 oldData 字段 */
      if (v.oldData !== undefined) {
        /* 计算 diff */
        if (v.oldData && v.newData) {
          v.changes = this._computeDiff(v.oldData, v.newData)
        } else if (v.oldData === null && v.newData) {
          /* create 操作 */
          v.changes = Object.keys(v.newData).map((key) => ({
            field: key,
            oldValue: undefined,
            newValue: v.newData[key]
          }))
        } else if (v.oldData && v.newData === null) {
          /* delete 操作 */
          v.changes = Object.keys(v.oldData).map((key) => ({
            field: key,
            oldValue: v.oldData[key],
            newValue: undefined
          }))
        } else {
          v.changes = v.changes || []
        }

        /* 删除 oldData */
        delete v.oldData
      }

      /* 仅最新版本保留 newData */
      if (i < versions.length - 1) {
        delete v.newData
      }
    }

    return versions
  }

  /**
   * 保存到localStorage
   */
  _saveToStorage() {
    try {
      const data = {}
      for (const [module, itemMap] of this._versions) {
        data[module] = {}
        for (const [itemId, versions] of itemMap) {
          data[module][itemId] = versions
        }
      }
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(VERSION_CONFIG_KEY, JSON.stringify(this._config))
    } catch (e) {
      console.warn('[VersionControl] 保存失败:', e)
    }
  }

  /**
   * 从localStorage加载
   */
  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(VERSION_STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        for (const [module, itemMap] of Object.entries(data)) {
          const m = new Map()
          for (const [itemId, versions] of Object.entries(itemMap)) {
            /* 迁移旧格式数据 */
            const migrated = this._migrateVersions(versions)
            m.set(itemId, migrated)
          }
          this._versions.set(module, m)
        }
      }

      const configRaw = localStorage.getItem(VERSION_CONFIG_KEY)
      if (configRaw) {
        Object.assign(this._config, JSON.parse(configRaw))
      }
    } catch (e) {
      console.warn('[VersionControl] 加载失败:', e)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    let totalItems = 0
    for (const [, itemMap] of this._versions) {
      totalItems += itemMap.size
    }
    return {
      totalVersions: this._stats.totalVersions,
      totalRestores: this._stats.restores,
      trackedModules: this._versions.size,
      trackedItems: totalItems,
      config: { ...this._config }
    }
  }

  /**
   * 更新配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    Object.assign(this._config, config)
    this._saveToStorage()
  }
}

/* 全局单例 */
const versionControl = new VersionControl()

export default versionControl
