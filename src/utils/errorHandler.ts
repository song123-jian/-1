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
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  STORAGE: 'storage',
  BUSINESS: 'business',
  UNKNOWN: 'unknown'
} as const

type ErrorTypeValue = (typeof ErrorTypes)[keyof typeof ErrorTypes]

/* 错误码枚举：提供可靠的错误分类标识，避免依赖消息字符串匹配 */
export const ErrorCodes = {
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
  NETWORK_FETCH_FAILED: 'NETWORK_FETCH_FAILED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  VALIDATION_RANGE: 'VALIDATION_RANGE',
  VALIDATION_DUPLICATE: 'VALIDATION_DUPLICATE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_ROLE_REQUIRED: 'PERMISSION_ROLE_REQUIRED',
  PERMISSION_EXPIRED: 'PERMISSION_EXPIRED',
  NOT_FOUND_RECORD: 'NOT_FOUND_RECORD',
  NOT_FOUND_MODULE: 'NOT_FOUND_MODULE',
  CONFLICT_CONCURRENT: 'CONFLICT_CONCURRENT',
  CONFLICT_VERSION: 'CONFLICT_VERSION',
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_CORRUPTED: 'STORAGE_CORRUPTED',
  BUSINESS_STOCK_INSUFFICIENT: 'BUSINESS_STOCK_INSUFFICIENT',
  BUSINESS_STATUS_INVALID: 'BUSINESS_STATUS_INVALID',
  BUSINESS_AMOUNT_MISMATCH: 'BUSINESS_AMOUNT_MISMATCH',
  BUSINESS_ORDER_EXISTS: 'BUSINESS_ORDER_EXISTS',
  UNKNOWN: 'UNKNOWN'
} as const

type ErrorCodeValue = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/* 错误码映射 */
const ERROR_MESSAGES: Record<string, string> = {
  'network.timeout': '请求超时，请检查网络连接后重试',
  'network.offline': '网络已断开，请检查网络连接',
  'network.server_error': '服务器错误，请稍后重试',
  'validation.required': '必填字段不能为空',
  'validation.format': '数据格式不正确',
  'validation.range': '数据超出允许范围',
  'validation.duplicate': '数据已存在，请检查是否重复',
  'permission.denied': '您没有权限执行此操作',
  'permission.role_required': '此操作需要特定角色权限',
  'permission.expired': '会话已过期，请重新登录',
  'not_found.record': '未找到指定数据',
  'not_found.module': '未找到指定模块',
  'conflict.concurrent': '数据已被其他用户修改，请刷新后重试',
  'conflict.version': '数据版本冲突，请先同步最新数据',
  'storage.full': '本地存储空间不足，请清理数据或导出备份',
  'storage.corrupted': '本地数据损坏，请尝试重新同步',
  'business.stock_insufficient': '库存不足，无法完成操作',
  'business.status_invalid': '当前状态不允许此操作',
  'business.amount_mismatch': '金额不匹配，请检查数据',
  'business.order_exists': '单据已存在，请勿重复提交',
  'unknown': '操作失败，请稍后重试'
}

interface ErrorInfo {
  type: ErrorTypeValue
  code: string
  message: string
  originalMessage: string
  errorCode: string | null
  suggestion: string
  recoverable: boolean
}

interface ErrorLogEntry extends ErrorInfo {
  context: Record<string, unknown>
  timestamp: number
  datetime: string
}

interface ErrorContext {
  module?: string
  action?: string
  data?: unknown
  [key: string]: unknown
}

/* 操作快照（用于回滚） */
class OperationSnapshot {
  id: string
  module: string
  action: string
  data: unknown
  oldData: unknown
  timestamp: number

  constructor(module: string, action: string, data: unknown, oldData: unknown) {
    this.id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    this.module = module
    this.action = action
    this.data = data ? JSON.parse(JSON.stringify(data)) : null
    this.oldData = oldData ? JSON.parse(JSON.stringify(oldData)) : null
    this.timestamp = Date.now()
  }
}

interface StoreLike {
  deleteItem?: (id: string) => void
  updateItem?: (id: string, data: unknown) => void
  addItem?: (data: unknown) => void
}

class ErrorHandler {
  private _snapshots: OperationSnapshot[] = []
  private _maxSnapshots = 50
  private _errorLog: ErrorLogEntry[] = []
  private _maxLogSize = 200
  private _errorCallbacks: Map<ErrorTypeValue, (info: ErrorInfo) => void> = new Map()

  handleError(error: Error | string, context: ErrorContext = {}): ErrorInfo {
    const errorInfo = this._classifyError(error, context)

    this._errorLog.push({
      ...errorInfo,
      context,
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    })
    if (this._errorLog.length > this._maxLogSize) {
      this._errorLog = this._errorLog.slice(-this._maxLogSize)
    }

    eventBus.emit('error:occurred', errorInfo)

    const callback = this._errorCallbacks.get(errorInfo.type)
    if (callback) {
      try {
        callback(errorInfo)
      } catch (e) {
        console.error('[ErrorHandler] 错误回调执行失败:', e)
      }
    }

    console.error(`[ErrorHandler] ${errorInfo.type}/${errorInfo.code}: ${errorInfo.message}`, context)

    return errorInfo
  }

  createSnapshot(module: string, action: string, data: unknown, oldData: unknown): string {
    const snapshot = new OperationSnapshot(module, action, data, oldData)
    this._snapshots.push(snapshot)

    if (this._snapshots.length > this._maxSnapshots) {
      this._snapshots = this._snapshots.slice(-this._maxSnapshots)
    }

    return snapshot.id
  }

  rollback(snapshotId: string, store: StoreLike): boolean {
    const snapshot = this._snapshots.find(s => s.id === snapshotId)
    if (!snapshot) {
      console.warn('[ErrorHandler] 未找到快照:', snapshotId)
      return false
    }

    try {
      switch (snapshot.action) {
        case 'create': {
          if ((snapshot.data as { id?: string })?.id && store.deleteItem) {
            store.deleteItem((snapshot.data as { id: string }).id)
          }
          break
        }
        case 'update': {
          if ((snapshot.oldData as { id?: string })?.id && store.updateItem) {
            store.updateItem((snapshot.oldData as { id: string }).id, snapshot.oldData)
          }
          break
        }
        case 'delete': {
          if (snapshot.oldData && store.addItem) {
            store.addItem(snapshot.oldData)
          }
          break
        }
        default:
          console.warn('[ErrorHandler] 不支持回滚的操作类型:', snapshot.action)
          return false
      }

      this._snapshots = this._snapshots.filter(s => s.id !== snapshotId)

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

  getRecentSnapshots(limit = 10): OperationSnapshot[] {
    return this._snapshots.slice(-limit)
  }

  onError(errorType: ErrorTypeValue, callback: (info: ErrorInfo) => void): void {
    this._errorCallbacks.set(errorType, callback)
  }

  getErrorLog(options: { type?: ErrorTypeValue; module?: string; limit?: number } = {}): ErrorLogEntry[] {
    let log: ErrorLogEntry[] = [...this._errorLog]

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

  clearErrorLog(): void {
    this._errorLog = []
  }

  private _classifyError(error: Error | string, _context: ErrorContext): ErrorInfo {
    const message = (error as Error)?.message || String(error)
    const errorObj = error as Error
    const errorCode = (errorObj?.code || (errorObj as any)?.errorCode || '') as string

    const CODE_MAP: Record<string, { type: ErrorTypeValue; msgCode: string; suggestion: string; recoverable: boolean }> = {
      [ErrorCodes.NETWORK_TIMEOUT]: { type: 'network', msgCode: 'network.timeout', suggestion: '请检查网络连接后重试', recoverable: true },
      [ErrorCodes.NETWORK_OFFLINE]: { type: 'network', msgCode: 'network.offline', suggestion: '请检查网络连接', recoverable: true },
      [ErrorCodes.NETWORK_SERVER_ERROR]: { type: 'network', msgCode: 'network.server_error', suggestion: '服务器错误，请稍后重试', recoverable: true },
      [ErrorCodes.NETWORK_FETCH_FAILED]: { type: 'network', msgCode: 'network.server_error', suggestion: '请检查网络连接后重试', recoverable: true },
      [ErrorCodes.VALIDATION_REQUIRED]: { type: 'validation', msgCode: 'validation.required', suggestion: '请检查输入数据是否符合要求', recoverable: true },
      [ErrorCodes.VALIDATION_FORMAT]: { type: 'validation', msgCode: 'validation.format', suggestion: '请检查数据格式是否正确', recoverable: true },
      [ErrorCodes.VALIDATION_RANGE]: { type: 'validation', msgCode: 'validation.range', suggestion: '请检查数据是否在允许范围内', recoverable: true },
      [ErrorCodes.VALIDATION_DUPLICATE]: { type: 'validation', msgCode: 'validation.duplicate', suggestion: '数据已存在，请检查是否重复', recoverable: true },
      [ErrorCodes.PERMISSION_DENIED]: { type: 'permission', msgCode: 'permission.denied', suggestion: '请联系管理员获取相应权限', recoverable: false },
      [ErrorCodes.PERMISSION_ROLE_REQUIRED]: { type: 'permission', msgCode: 'permission.role_required', suggestion: '此操作需要特定角色权限', recoverable: false },
      [ErrorCodes.PERMISSION_EXPIRED]: { type: 'permission', msgCode: 'permission.expired', suggestion: '会话已过期，请重新登录', recoverable: false },
      [ErrorCodes.NOT_FOUND_RECORD]: { type: 'not_found', msgCode: 'not_found.record', suggestion: '数据可能已被删除，请刷新页面', recoverable: false },
      [ErrorCodes.NOT_FOUND_MODULE]: { type: 'not_found', msgCode: 'not_found.module', suggestion: '未找到指定模块', recoverable: false },
      [ErrorCodes.CONFLICT_CONCURRENT]: { type: 'conflict', msgCode: 'conflict.concurrent', suggestion: '数据已被其他用户修改，请刷新后重试', recoverable: true },
      [ErrorCodes.CONFLICT_VERSION]: { type: 'conflict', msgCode: 'conflict.version', suggestion: '数据版本冲突，请先同步最新数据', recoverable: true },
      [ErrorCodes.STORAGE_FULL]: { type: 'storage', msgCode: 'storage.full', suggestion: '本地存储空间不足，请导出备份并清理数据', recoverable: false },
      [ErrorCodes.STORAGE_CORRUPTED]: { type: 'storage', msgCode: 'storage.corrupted', suggestion: '本地数据损坏，请尝试重新同步', recoverable: false },
      [ErrorCodes.BUSINESS_STOCK_INSUFFICIENT]: { type: 'business', msgCode: 'business.stock_insufficient', suggestion: '请检查业务数据是否满足操作条件', recoverable: true },
      [ErrorCodes.BUSINESS_STATUS_INVALID]: { type: 'business', msgCode: 'business.status_invalid', suggestion: '当前状态不允许此操作', recoverable: true },
      [ErrorCodes.BUSINESS_AMOUNT_MISMATCH]: { type: 'business', msgCode: 'business.amount_mismatch', suggestion: '金额不匹配，请检查数据', recoverable: true },
      [ErrorCodes.BUSINESS_ORDER_EXISTS]: { type: 'business', msgCode: 'business.order_exists', suggestion: '单据已存在，请勿重复提交', recoverable: true }
    }

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

    let type: ErrorTypeValue = 'unknown'
    let code = 'unknown'
    let recoverable = true
    let suggestion = ''

    if (message.includes('网络') || message.includes('timeout') || message.includes('fetch')) {
      type = 'network'
      code = 'network.server_error'
      suggestion = '请检查网络连接后重试'
    } else if (message.includes('验证失败') || message.includes('不能为空') || message.includes('格式不正确')) {
      type = 'validation'
      code = 'validation.required'
      suggestion = '请检查输入数据是否符合要求'
    } else if (message.includes('权限') || message.includes('无权')) {
      type = 'permission'
      code = 'permission.denied'
      suggestion = '请联系管理员获取相应权限'
      recoverable = false
    } else if (message.includes('未找到') || message.includes('不存在')) {
      type = 'not_found'
      code = 'not_found.record'
      suggestion = '数据可能已被删除，请刷新页面'
      recoverable = false
    } else if (message.includes('冲突') || message.includes('已被修改')) {
      type = 'conflict'
      code = 'conflict.concurrent'
      suggestion = '数据已被其他用户修改，请刷新后重试'
    } else if (message.includes('QuotaExceeded') || message.includes('容量不足')) {
      type = 'storage'
      code = 'storage.full'
      suggestion = '本地存储空间不足，请导出备份并清理数据'
      recoverable = false
    } else if (message.includes('库存不足') || message.includes('状态不允许')) {
      type = 'business'
      code = 'business.stock_insufficient'
      suggestion = '请检查业务数据是否满足操作条件'
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