/**
 * 统一错误处理器
 * 当数据操作失败时提供明确的错误提示并支持数据回滚
 * 支持：
 * - 错误分类与编码
 * - 用户友好的错误提示
 * - 操作回滚（事务机制）
 * - 错误日志记录
 * - 错误恢复建议
 */

import eventBus from './eventBus'

/* 错误类型枚举 */
export const ErrorTypes = {
  NETWORK: 'network',        /* 网络错误 */
  VALIDATION: 'validation',  /* 数据验证错误 */
  PERMISSION: 'permission',  /* 权限错误 */
  NOT_FOUND: 'not_found',   /* 数据不存在 */
  CONFLICT: 'conflict',      /* 数据冲突 */
  STORAGE: 'storage',        /* 存储错误 */
  BUSINESS: 'business',      /* 业务逻辑错误 */
  UNKNOWN: 'unknown'         /* 未知错误 */
}

/* 错误码枚举：提供可靠的错误分类标识，避免依赖消息字符串匹配 */
export const ErrorCodes = {
  /* 网络错误 */
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
  NETWORK_FETCH_FAILED: 'NETWORK_FETCH_FAILED',

  /* 验证错误 */
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  VALIDATION_RANGE: 'VALIDATION_RANGE',
  VALIDATION_DUPLICATE: 'VALIDATION_DUPLICATE',

  /* 权限错误 */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_ROLE_REQUIRED: 'PERMISSION_ROLE_REQUIRED',
  PERMISSION_EXPIRED: 'PERMISSION_EXPIRED',

  /* 数据不存在 */
  NOT_FOUND_RECORD: 'NOT_FOUND_RECORD',
  NOT_FOUND_MODULE: 'NOT_FOUND_MODULE',

  /* 数据冲突 */
  CONFLICT_CONCURRENT: 'CONFLICT_CONCURRENT',
  CONFLICT_VERSION: 'CONFLICT_VERSION',

  /* 存储错误 */
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_CORRUPTED: 'STORAGE_CORRUPTED',

  /* 业务逻辑错误 */
  BUSINESS_STOCK_INSUFFICIENT: 'BUSINESS_STOCK_INSUFFICIENT',
  BUSINESS_STATUS_INVALID: 'BUSINESS_STATUS_INVALID',
  BUSINESS_AMOUNT_MISMATCH: 'BUSINESS_AMOUNT_MISMATCH',
  BUSINESS_ORDER_EXISTS: 'BUSINESS_ORDER_EXISTS',

  /* 未知错误 */
  UNKNOWN: 'UNKNOWN'
}

/* 错误码映射 */
const ERROR_MESSAGES = {
  /* 网络错误 */
  'network.timeout': '请求超时，请检查网络连接后重试',
  'network.offline': '网络已断开，请检查网络连接',
  'network.server_error': '服务器错误，请稍后重试',

  /* 验证错误 */
  'validation.required': '必填字段不能为空',
  'validation.format': '数据格式不正确',
  'validation.range': '数据超出允许范围',
  'validation.duplicate': '数据已存在，请检查是否重复',

  /* 权限错误 */
  'permission.denied': '您没有权限执行此操作',
  'permission.role_required': '此操作需要特定角色权限',
  'permission.expired': '会话已过期，请重新登录',

  /* 数据不存在 */
  'not_found.record': '未找到指定数据',
  'not_found.module': '未找到指定模块',

  /* 数据冲突 */
  'conflict.concurrent': '数据已被其他用户修改，请刷新后重试',
  'conflict.version': '数据版本冲突，请先同步最新数据',

  /* 存储错误 */
  'storage.full': '本地存储空间不足，请清理数据或导出备份',
  'storage.corrupted': '本地数据损坏，请尝试重新同步',

  /* 业务逻辑错误 */
  'business.stock_insufficient': '库存不足，无法完成操作',
  'business.status_invalid': '当前状态不允许此操作',
  'business.amount_mismatch': '金额不匹配，请检查数据',
  'business.order_exists': '单据已存在，请勿重复提交',

  /* 未知错误 */
  'unknown': '操作失败，请稍后重试'
}

/* 操作快照（用于回滚） */
class OperationSnapshot {
  constructor(module, action, data, oldData) {
    this.id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    this.module = module
    this.action = action
    this.data = data ? JSON.parse(JSON.stringify(data)) : null
    this.oldData = oldData ? JSON.parse(JSON.stringify(oldData)) : null
    this.timestamp = Date.now()
  }
}

class ErrorHandler {
  constructor() {
    /* 操作快照栈 */
    this._snapshots = []
    /* 最大快照数 */
    this._maxSnapshots = 50
    /* 错误日志 */
    this._errorLog = []
    this._maxLogSize = 200
    /* 错误回调 */
    this._errorCallbacks = new Map()
  }

  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或消息
   * @param {Object} context - 上下文 { module, action, data }
   * @returns {Object} 处理结果 { type, code, message, suggestion, recoverable }
   */
  handleError(error, context = {}) {
    const errorInfo = this._classifyError(error, context)

    /* 记录错误日志 */
    this._errorLog.push({
      ...errorInfo,
      context,
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    })
    if (this._errorLog.length > this._maxLogSize) {
      this._errorLog = this._errorLog.slice(-this._maxLogSize)
    }

    /* 发布错误事件 */
    eventBus.emit('error:occurred', errorInfo)

    /* 触发错误回调 */
    const callback = this._errorCallbacks.get(errorInfo.type)
    if (callback) {
      try {
        callback(errorInfo)
      } catch (e) {
        console.error('[ErrorHandler] 错误回调执行失败:', e)
      }
    }

    /* 控制台输出 */
    console.error(`[ErrorHandler] ${errorInfo.type}/${errorInfo.code}: ${errorInfo.message}`, context)

    return errorInfo
  }

  /**
   * 创建操作快照（用于回滚）
   * @param {string} module - 模块名
   * @param {string} action - 操作类型
   * @param {*} data - 操作后数据
   * @param {*} oldData - 操作前数据
   * @returns {string} 快照ID
   */
  createSnapshot(module, action, data, oldData) {
    const snapshot = new OperationSnapshot(module, action, data, oldData)
    this._snapshots.push(snapshot)

    if (this._snapshots.length > this._maxSnapshots) {
      this._snapshots = this._snapshots.slice(-this._maxSnapshots)
    }

    return snapshot.id
  }

  /**
   * 回滚到指定快照
   * @param {string} snapshotId - 快照ID
   * @param {Object} store - 目标Store实例
   * @returns {boolean} 是否回滚成功
   */
  rollback(snapshotId, store) {
    const snapshot = this._snapshots.find(s => s.id === snapshotId)
    if (!snapshot) {
      console.warn('[ErrorHandler] 未找到快照:', snapshotId)
      return false
    }

    try {
      switch (snapshot.action) {
        case 'create': {
          /* 新增操作回滚：删除新增的数据 */
          if (snapshot.data?.id && store.deleteItem) {
            store.deleteItem(snapshot.data.id)
          }
          break
        }
        case 'update': {
          /* 更新操作回滚：恢复旧数据 */
          if (snapshot.oldData?.id && store.updateItem) {
            store.updateItem(snapshot.oldData.id, snapshot.oldData)
          }
          break
        }
        case 'delete': {
          /* 删除操作回滚：重新添加数据 */
          if (snapshot.oldData && store.addItem) {
            store.addItem(snapshot.oldData)
          }
          break
        }
        default:
          console.warn('[ErrorHandler] 不支持回滚的操作类型:', snapshot.action)
          return false
      }

      /* 移除已回滚的快照 */
      this._snapshots = this._snapshots.filter(s => s.id !== snapshotId)

      /* 发布回滚事件 */
      eventBus.emit('error:rollback', {
        snapshotId,
        module: snapshot.module,
        action: snapshot.action
      })

      return true
    } catch (e) {
      console.error('[ErrorHandler] 回滚失败:', e)
      return false
    }
  }

  /**
   * 获取最近的快照
   * @param {number} limit - 返回数量
   * @returns {Array} 快照列表
   */
  getRecentSnapshots(limit = 10) {
    return this._snapshots.slice(-limit)
  }

  /**
   * 注册错误回调
   * @param {string} errorType - 错误类型
   * @param {Function} callback - 回调函数
   */
  onError(errorType, callback) {
    this._errorCallbacks.set(errorType, callback)
  }

  /**
   * 获取错误日志
   * @param {Object} options - 过滤选项 { type, module, limit }
   * @returns {Array} 错误日志
   */
  getErrorLog(options = {}) {
    let log = [...this._errorLog]

    if (options.type) {
      log = log.filter(e => e.type === options.type)
    }
    if (options.module) {
      log = log.filter(e => e.context?.module === options.module)
    }

    if (options.limit) {
      log = log.slice(-options.limit)
    }

    return log
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this._errorLog = []
  }

  /**
   * 分类错误
   * 优先使用错误码（error.code）进行分类，降级使用消息字符串匹配
   */
  _classifyError(error, context) {
    const message = error?.message || String(error)
    const errorCode = error?.code || error?.errorCode || ''

    /* 错误码到类型/消息码的映射 */
    const CODE_MAP = {
      [ErrorCodes.NETWORK_TIMEOUT]: { type: ErrorTypes.NETWORK, msgCode: 'network.timeout', suggestion: '请检查网络连接后重试', recoverable: true },
      [ErrorCodes.NETWORK_OFFLINE]: { type: ErrorTypes.NETWORK, msgCode: 'network.offline', suggestion: '请检查网络连接', recoverable: true },
      [ErrorCodes.NETWORK_SERVER_ERROR]: { type: ErrorTypes.NETWORK, msgCode: 'network.server_error', suggestion: '服务器错误，请稍后重试', recoverable: true },
      [ErrorCodes.NETWORK_FETCH_FAILED]: { type: ErrorTypes.NETWORK, msgCode: 'network.server_error', suggestion: '请检查网络连接后重试', recoverable: true },
      [ErrorCodes.VALIDATION_REQUIRED]: { type: ErrorTypes.VALIDATION, msgCode: 'validation.required', suggestion: '请检查输入数据是否符合要求', recoverable: true },
      [ErrorCodes.VALIDATION_FORMAT]: { type: ErrorTypes.VALIDATION, msgCode: 'validation.format', suggestion: '请检查数据格式是否正确', recoverable: true },
      [ErrorCodes.VALIDATION_RANGE]: { type: ErrorTypes.VALIDATION, msgCode: 'validation.range', suggestion: '请检查数据是否在允许范围内', recoverable: true },
      [ErrorCodes.VALIDATION_DUPLICATE]: { type: ErrorTypes.VALIDATION, msgCode: 'validation.duplicate', suggestion: '数据已存在，请检查是否重复', recoverable: true },
      [ErrorCodes.PERMISSION_DENIED]: { type: ErrorTypes.PERMISSION, msgCode: 'permission.denied', suggestion: '请联系管理员获取相应权限', recoverable: false },
      [ErrorCodes.PERMISSION_ROLE_REQUIRED]: { type: ErrorTypes.PERMISSION, msgCode: 'permission.role_required', suggestion: '此操作需要特定角色权限', recoverable: false },
      [ErrorCodes.PERMISSION_EXPIRED]: { type: ErrorTypes.PERMISSION, msgCode: 'permission.expired', suggestion: '会话已过期，请重新登录', recoverable: false },
      [ErrorCodes.NOT_FOUND_RECORD]: { type: ErrorTypes.NOT_FOUND, msgCode: 'not_found.record', suggestion: '数据可能已被删除，请刷新页面', recoverable: false },
      [ErrorCodes.NOT_FOUND_MODULE]: { type: ErrorTypes.NOT_FOUND, msgCode: 'not_found.module', suggestion: '未找到指定模块', recoverable: false },
      [ErrorCodes.CONFLICT_CONCURRENT]: { type: ErrorTypes.CONFLICT, msgCode: 'conflict.concurrent', suggestion: '数据已被其他用户修改，请刷新后重试', recoverable: true },
      [ErrorCodes.CONFLICT_VERSION]: { type: ErrorTypes.CONFLICT, msgCode: 'conflict.version', suggestion: '数据版本冲突，请先同步最新数据', recoverable: true },
      [ErrorCodes.STORAGE_FULL]: { type: ErrorTypes.STORAGE, msgCode: 'storage.full', suggestion: '本地存储空间不足，请导出备份并清理数据', recoverable: false },
      [ErrorCodes.STORAGE_CORRUPTED]: { type: ErrorTypes.STORAGE, msgCode: 'storage.corrupted', suggestion: '本地数据损坏，请尝试重新同步', recoverable: false },
      [ErrorCodes.BUSINESS_STOCK_INSUFFICIENT]: { type: ErrorTypes.BUSINESS, msgCode: 'business.stock_insufficient', suggestion: '请检查业务数据是否满足操作条件', recoverable: true },
      [ErrorCodes.BUSINESS_STATUS_INVALID]: { type: ErrorTypes.BUSINESS, msgCode: 'business.status_invalid', suggestion: '当前状态不允许此操作', recoverable: true },
      [ErrorCodes.BUSINESS_AMOUNT_MISMATCH]: { type: ErrorTypes.BUSINESS, msgCode: 'business.amount_mismatch', suggestion: '金额不匹配，请检查数据', recoverable: true },
      [ErrorCodes.BUSINESS_ORDER_EXISTS]: { type: ErrorTypes.BUSINESS, msgCode: 'business.order_exists', suggestion: '单据已存在，请勿重复提交', recoverable: true }
    }

    /* 优先使用错误码分类 */
    if (errorCode && CODE_MAP[errorCode]) {
      const mapping = CODE_MAP[errorCode]
      return {
        type: mapping.type,
        code: mapping.msgCode,
        message: ERROR_MESSAGES[mapping.msgCode] || message,
        originalMessage: message,
        errorCode,
        suggestion: mapping.suggestion,
        recoverable: mapping.recoverable
      }
    }

    /* 降级：根据错误消息判断类型 */
    let type = ErrorTypes.UNKNOWN
    let code = 'unknown'
    let recoverable = true
    let suggestion = ''

    if (message.includes('网络') || message.includes('timeout') || message.includes('fetch')) {
      type = ErrorTypes.NETWORK
      code = 'network.server_error'
      suggestion = '请检查网络连接后重试'
    } else if (message.includes('验证失败') || message.includes('不能为空') || message.includes('格式不正确')) {
      type = ErrorTypes.VALIDATION
      code = 'validation.required'
      suggestion = '请检查输入数据是否符合要求'
      recoverable = true
    } else if (message.includes('权限') || message.includes('无权')) {
      type = ErrorTypes.PERMISSION
      code = 'permission.denied'
      suggestion = '请联系管理员获取相应权限'
      recoverable = false
    } else if (message.includes('未找到') || message.includes('不存在')) {
      type = ErrorTypes.NOT_FOUND
      code = 'not_found.record'
      suggestion = '数据可能已被删除，请刷新页面'
      recoverable = false
    } else if (message.includes('冲突') || message.includes('已被修改')) {
      type = ErrorTypes.CONFLICT
      code = 'conflict.concurrent'
      suggestion = '数据已被其他用户修改，请刷新后重试'
      recoverable = true
    } else if (message.includes('QuotaExceeded') || message.includes('容量不足')) {
      type = ErrorTypes.STORAGE
      code = 'storage.full'
      suggestion = '本地存储空间不足，请导出备份并清理数据'
      recoverable = false
    } else if (message.includes('库存不足') || message.includes('状态不允许')) {
      type = ErrorTypes.BUSINESS
      code = 'business.stock_insufficient'
      suggestion = '请检查业务数据是否满足操作条件'
      recoverable = true
    }

    return {
      type,
      code,
      message: ERROR_MESSAGES[code] || message,
      originalMessage: message,
      errorCode: errorCode || null,
      suggestion,
      recoverable
    }
  }
}

/* 全局单例 */
const errorHandler = new ErrorHandler()

export default errorHandler
