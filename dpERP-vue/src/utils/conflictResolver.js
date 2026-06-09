/**
 * 数据冲突解决工具
 * 用于多用户实时协作场景下的数据冲突检测与解决
 */

/**
 * 默认应用密钥，用于派生默认key
 */
const DEFAULT_APP_KEY = 'gj_erp';

/**
 * 解析数据的时间戳
 * @param {Object} data - 数据对象
 * @returns {number} 时间戳（毫秒）
 */
function getTimestamp(data) {
  if (!data) return 0
  if (data.updatedAt) return new Date(data.updatedAt).getTime()
  if (data.createdAt) return new Date(data.createdAt).getTime()
  return 0
}

/**
 * 解决数据冲突
 * @param {*} localData - 本地数据
 * @param {*} serverData - 服务端数据
 * @param {string} strategy - 冲突解决策略：'server-wins' | 'local-wins' | 'last-write-wins' | 'merge'
 * @returns {*} 解决冲突后的数据
 */
export function resolveConflict(localData, serverData, strategy) {
  switch (strategy) {
    case 'server-wins':
      // 服务端优先，直接返回服务端数据
      return serverData

    case 'local-wins':
      // 本地优先，直接返回本地数据
      return localData

    case 'last-write-wins': {
      // 最后写入优先，比较时间戳，使用更新的数据
      const localTime = getTimestamp(localData)
      const serverTime = getTimestamp(serverData)

      // 如果都没有时间戳，默认服务端优先
      if (localTime === 0 && serverTime === 0) {
        return serverData
      }

      return localTime >= serverTime ? localData : serverData
    }

    case 'merge': {
      // 合并策略，针对数组类型数据进行按id合并
      if (Array.isArray(localData) && Array.isArray(serverData)) {
        return mergeArrays(localData, serverData)
      }
      // 非数组类型，按最后写入优先处理
      const localTime = getTimestamp(localData)
      const serverTime = getTimestamp(serverData)
      if (localTime === 0 && serverTime === 0) {
        return serverData
      }
      return localTime >= serverTime ? localData : serverData
    }

    default:
      // 未知策略，默认服务端优先
      return serverData
  }
}

/**
 * 合并两个对象数组
 * 根据idKey标识相同项，相同id保留时间戳更新的版本，不同id则全部保留
 * @param {Array} localArr - 本地数组
 * @param {Array} serverArr - 服务端数组
 * @param {string} idKey - 标识唯一性的键名，默认为 'id'
 * @returns {Array} 合并后的数组
 */
export function mergeArrays(localArr, serverArr, idKey = 'id') {
  if (!Array.isArray(localArr)) localArr = []
  if (!Array.isArray(serverArr)) serverArr = []

  const mergedMap = new Map()

  // 先放入服务端数据
  for (const item of serverArr) {
    if (item && item[idKey] !== undefined) {
      mergedMap.set(item[idKey], item)
    }
  }

  // 再处理本地数据，相同id比较时间戳
  for (const item of localArr) {
    if (!item || item[idKey] === undefined) continue

    const existing = mergedMap.get(item[idKey])
    if (existing) {
      // 相同id，保留时间戳更新的版本
      const existingTime = getTimestamp(existing)
      const itemTime = getTimestamp(item)
      if (itemTime >= existingTime) {
        mergedMap.set(item[idKey], item)
      }
    } else {
      // 本地独有的项，直接加入
      mergedMap.set(item[idKey], item)
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * 检测本地与服务端数据之间的冲突
 * 比较两个数组中相同id但数据不同的项
 * @param {Array} localData - 本地数据数组
 * @param {Array} serverData - 服务端数据数组
 * @param {string} idKey - 标识唯一性的键名，默认为 'id'
 * @returns {Array} 冲突对象数组，每项包含 {id, localVersion, serverVersion, localTime, serverTime}
 */
export function detectConflicts(localData, serverData, idKey = 'id') {
  if (!Array.isArray(localData) || !Array.isArray(serverData)) {
    return []
  }

  const conflicts = []
  const serverMap = new Map()

  // 构建服务端数据映射
  for (const item of serverData) {
    if (item && item[idKey] !== undefined) {
      serverMap.set(item[idKey], item)
    }
  }

  // 遍历本地数据，查找冲突
  for (const localItem of localData) {
    if (!localItem || localItem[idKey] === undefined) continue

    const serverItem = serverMap.get(localItem[idKey])
    if (!serverItem) continue

    // 比较两个对象是否相同（简单深比较）
    const isSame = JSON.stringify(localItem) === JSON.stringify(serverItem)
    if (!isSame) {
      conflicts.push({
        id: localItem[idKey],
        localVersion: localItem,
        serverVersion: serverItem,
        localTime: getTimestamp(localItem),
        serverTime: getTimestamp(serverItem)
      })
    }
  }

  return conflicts
}

/**
 * 自动选择最佳策略解决冲突
 * 根据数据特征自动判断使用哪种策略
 * 默认使用 'last-write-wins' 策略
 * @param {*} localData - 本地数据
 * @param {*} serverData - 服务端数据
 * @returns {*} 解决冲突后的数据
 */
export function autoResolve(localData, serverData) {
  // 默认策略：最后写入优先
  let strategy = 'last-write-wins'

  // 如果都是数组，检测冲突数量
  if (Array.isArray(localData) && Array.isArray(serverData)) {
    const conflicts = detectConflicts(localData, serverData)
    // 如果冲突数量较多（超过数组长度的一半），使用合并策略
    if (conflicts.length > 0 && conflicts.length > localData.length / 2) {
      strategy = 'merge'
    }
  }

  return resolveConflict(localData, serverData, strategy)
}
