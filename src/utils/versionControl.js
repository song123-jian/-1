/**
 * 数据版本控制器
 * 记录数据修改历史，支持数据回溯功能
 * 支持：
 * - 自动记录数据变更快照
 * - 变更差异对比
 * - 版本回滚/恢复
 * - 版本标签与注释
 * - 历史清理策略
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
    'customer', 'quotation', 'contract', 'inventory',
    'delivery', 'collection', 'statement', 'supplier',
    'warehouseLocation', 'cost'
  ]
}

class VersionControl {
  constructor() {
    /* 版本存储：moduleId [右] itemId [右] [version] */
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

    const version = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      module,
      itemId,
      version: versionNumber,
      action: meta.action || 'update',
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      changes: meta.changes || this._computeChanges(oldData, newData),
      user: meta.user || 'system',
      label: meta.label || '',
      timestamp: Date.now(),
      datetime: new Date().toISOString()
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
      versions = versions.filter(v => v.action === options.action)
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
    return versions.find(v => v.id === versionId) || null
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
   * 回滚到指定版本
   * @param {string} module - 模块名
   * @param {string} itemId - 数据项ID
   * @param {string} versionId - 目标版本ID
   * @returns {Object|null} 回滚后的数据
   */
  restoreVersion(module, itemId, versionId) {
    const version = this.getVersion(module, itemId, versionId)
    if (!version) return null

    const restoredData = version.newData ? JSON.parse(JSON.stringify(version.newData)) : null

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

    return {
      version1: v1,
      version2: v2,
      diff: this._computeChanges(v1.newData, v2.newData)
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
            m.set(itemId, versions)
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
