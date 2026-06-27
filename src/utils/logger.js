/**
 * 统一日志与错误处理工具
 * 替代散落的 console.info/warn/error 调用，提供级别控制和结构化日志
 * 支持：
 * - 日志级别控制（开发/生产环境自动切换）
 * - 模块标签（便于定位来源）
 * - 错误分类与上报
 * - 日志缓冲（生产环境可按需上传）
 */

/* 日志级别 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
}

/* 当前日志级别：生产环境默认 WARN，开发环境默认 DEBUG */
const _currentLevel = import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG

/* 日志缓冲区（最多保留200条） */
const _logBuffer = []
const MAX_BUFFER_SIZE = 200

/* 错误处理器注册表 */
const _errorHandlers = []

/**
 * 判断是否应输出该级别的日志
 */
function shouldLog(level) {
  return level >= _currentLevel
}

/**
 * 添加日志到缓冲区
 */
function addToBuffer(level, module, args) {
  if (_logBuffer.length >= MAX_BUFFER_SIZE) {
    _logBuffer.shift()
  }
  _logBuffer.push({
    level,
    module,
    args: args.map((a) => {
      if (a instanceof Error) return { name: a.name, message: a.message, stack: a.stack }
      if (typeof a === 'object')
        try {
          return JSON.parse(JSON.stringify(a))
        } catch {
          return String(a)
        }
      return a
    }),
    time: new Date().toISOString()
  })
}

/**
 * 创建模块日志器
 * @param {string} module - 模块名称（如 'SyncEngine', 'DataCenter'）
 * @returns {Object} 日志器对象 { debug, info, warn, error }
 */
export function createLogger(module) {
  const prefix = `[${module}]`

  function debug(...args) {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(prefix, ...args)
    }
    addToBuffer(LogLevel.DEBUG, module, args)
  }

  function info(...args) {
    if (shouldLog(LogLevel.INFO)) {
      console.info(prefix, ...args)
    }
    addToBuffer(LogLevel.INFO, module, args)
  }

  function warn(...args) {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(prefix, ...args)
    }
    addToBuffer(LogLevel.WARN, module, args)
  }

  function error(...args) {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(prefix, ...args)
    }
    addToBuffer(LogLevel.ERROR, module, args)

    /* 触发已注册的错误处理器 */
    const err = args.find((a) => a instanceof Error) || new Error(args.join(' '))
    for (const handler of _errorHandlers) {
      try {
        handler(err, module)
      } catch (e) {
        /* 处理器自身不应抛出异常 */
      }
    }
  }

  return { debug, info, warn, error }
}

/**
 * 注册全局错误处理器
 * @param {Function} handler - (error: Error, module: string) => void
 * @returns {Function} 取消注册函数
 */
export function onError(handler) {
  _errorHandlers.push(handler)
  return () => {
    const idx = _errorHandlers.indexOf(handler)
    if (idx > -1) _errorHandlers.splice(idx, 1)
  }
}

/**
 * 获取日志缓冲区内容
 * @param {number} minLevel - 最低日志级别
 * @returns {Array} 日志记录数组
 */
export function getLogBuffer(minLevel = LogLevel.DEBUG) {
  return _logBuffer.filter((l) => l.level >= minLevel)
}

/**
 * 清空日志缓冲区
 */
export function clearLogBuffer() {
  _logBuffer.length = 0
}

/**
 * 安全执行：捕获异常并返回结果，避免 try/catch 散落各处
 * @param {Function} fn - 要执行的函数
 * @param {*} fallback - 异常时的返回值
 * @param {string} module - 模块名（用于日志）
 * @returns {*} fn 的返回值或 fallback
 */
export function safeExecute(fn, fallback = null, module = 'App') {
  try {
    return fn()
  } catch (e) {
    createLogger(module).error('安全执行捕获异常:', e)
    return fallback
  }
}

/**
 * 异步安全执行
 * @param {Function} fn - 要执行的异步函数
 * @param {*} fallback - 异常时的返回值
 * @param {string} module - 模块名
 * @returns {Promise<*>} fn 的返回值或 fallback
 */
export async function safeExecuteAsync(fn, fallback = null, module = 'App') {
  try {
    return await fn()
  } catch (e) {
    createLogger(module).error('异步安全执行捕获异常:', e)
    return fallback
  }
}

/* 全局未捕获异常处理 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    addToBuffer(LogLevel.ERROR, 'Global', [event.message])
  })
  window.addEventListener('unhandledrejection', (event) => {
    addToBuffer(LogLevel.ERROR, 'Global', ['Unhandled Promise:', event.reason])
  })
}

export default { createLogger, onError, getLogBuffer, clearLogBuffer, safeExecute, safeExecuteAsync, LogLevel }
