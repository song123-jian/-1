/**
 * 统一 Store 注册表
 * 基于 entityRegistry 的 storePath 配置，集中管理所有 Pinia Store 的动态加载与缓存。
 *
 * 设计目标：
 * - 消除 syncEngine.js（switch-case）与 dataCenter.js（STORE_IMPORTS）中重复的硬编码 Store 注册逻辑
 * - 以 entityRegistry 作为单一事实来源，新增模块只需在 entityRegistry 中配置 storePath
 * - 统一采用动态 import 懒加载策略，按需加载、内置缓存、防并发重复加载
 */

import { entityRegistry } from '@/entities'

/* ========== Store 实例缓存 ========== */
const _storeCache = new Map()
/* 进行中的加载请求（防止并发重复加载同一 Store） */
const _loadingPromises = new Map()

/* ========== 通过 import.meta.glob 发现所有 Store 模块（懒加载） ========== */
const _moduleLoaders = {
  ...import.meta.glob('../modules/*/stores/*.js'),
  ...import.meta.glob('../stores/*.js')
}

/**
 * 将 storePath（@/... 格式）转换为用于匹配 glob 键的后缀
 * @param {string} storePath - 如 '@/modules/customer/stores/customer'
 * @returns {string} 如 'modules/customer/stores/customer.js'
 */
function _toPathSuffix(storePath) {
  return storePath.replace(/^@\//, '') + '.js'
}

/**
 * 基于 entityRegistry 自动构建 storeName → loader 映射
 * 工厂函数名约定：use${StoreName 首字母大写}Store
 */
const STORE_LOADERS = {}

for (const [entityName, meta] of Object.entries(entityRegistry)) {
  if (!meta.storePath) {
    console.warn(`[StoreRegistry] 实体 "${entityName}" 缺少 storePath 配置，已跳过`)
    continue
  }

  const suffix = _toPathSuffix(meta.storePath)
  const matchingKey = Object.keys(_moduleLoaders).find((k) => k.endsWith(suffix))
  if (!matchingKey) {
    console.warn(`[StoreRegistry] 未找到 Store 模块: ${meta.storePath}（实体 ${entityName}）`)
    continue
  }

  const moduleLoader = _moduleLoaders[matchingKey]
  const factoryName = `use${meta.storeName.charAt(0).toUpperCase()}${meta.storeName.slice(1)}Store`

  STORE_LOADERS[meta.storeName] = async () => {
    const mod = await moduleLoader()
    const factory = mod[factoryName]
    if (typeof factory !== 'function') {
      throw new Error(`[StoreRegistry] 模块 ${meta.storePath} 未导出工厂函数 ${factoryName}`)
    }
    return factory()
  }
}

/* warehouse 别名指向 warehouseLocation（兼容 dataCenter 的 warehouses 计算属性） */
if (STORE_LOADERS.warehouseLocation) {
  STORE_LOADERS.warehouse = STORE_LOADERS.warehouseLocation
}

/* ========== 对外 API ========== */

/**
 * 异步获取 Store 实例（懒加载 + 缓存 + 防并发）
 * @param {string} storeName - Store 名称
 * @returns {Promise<Object|null>} Store 实例
 */
async function getStore(storeName) {
  if (_storeCache.has(storeName)) {
    return _storeCache.get(storeName)
  }
  if (_loadingPromises.has(storeName)) {
    return _loadingPromises.get(storeName)
  }

  const loader = STORE_LOADERS[storeName]
  if (!loader) {
    console.warn(`[StoreRegistry] 未注册的 Store: ${storeName}`)
    return null
  }

  const promise = loader()
    .then((store) => {
      _storeCache.set(storeName, store)
      _loadingPromises.delete(storeName)
      return store
    })
    .catch((err) => {
      _loadingPromises.delete(storeName)
      console.error(`[StoreRegistry] 加载 Store 失败: ${storeName}`, err)
      return null
    })

  _loadingPromises.set(storeName, promise)
  return promise
}

/**
 * 同步获取已缓存的 Store 实例（须在 preloadStores 之后调用）
 * @param {string} storeName - Store 名称
 * @returns {Object|null} Store 实例
 */
function getStoreSync(storeName) {
  return _storeCache.get(storeName) || null
}

/**
 * 预加载指定的 Store（单个或多个）
 * @param {string|string[]} storeNames - Store 名称或名称数组
 */
async function preloadStores(storeNames) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames]
  await Promise.all(names.map((n) => getStore(n)))
}

/**
 * 预加载所有已注册的 Store
 */
async function preloadAllStores() {
  await Promise.all(Object.keys(STORE_LOADERS).map((n) => getStore(n)))
}

/**
 * 清除 Store 缓存
 * @param {string} [storeName] - Store 名称，不传则清除全部
 */
function clearCache(storeName) {
  if (storeName) {
    _storeCache.delete(storeName)
  } else {
    _storeCache.clear()
  }
}

export { STORE_LOADERS, getStore, getStoreSync, preloadStores, preloadAllStores, clearCache }
export default { STORE_LOADERS, getStore, getStoreSync, preloadStores, preloadAllStores, clearCache }
