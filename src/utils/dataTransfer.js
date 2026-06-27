/**
 * 数据导入导出工具
 * 提供统一的数据导入导出功能，支持批量数据操作
 * 支持：
 * - JSON/CSV格式导入导出
 * - 多模块批量导出
 * - 数据模板生成
 * - 导入预览与验证
 * - 导入进度回调
 * - 增量导出（仅导出变更数据）
 */

import eventBus from './eventBus'
import errorHandler from './errorHandler'
import { useDataCenterStore } from '@/stores/dataCenter'

/* 模块字段定义（用于CSV模板和导入验证） */
const MODULE_FIELDS = {
  customer: {
    required: ['name'],
    optional: [
      'customerNo',
      'shortName',
      'contactName',
      'phone',
      'email',
      'region',
      'level',
      'creditLimit',
      'balance',
      'address',
      'department',
      'position',
      'decisionAuthority',
      'coreConcerns'
    ],
    labels: {
      name: '客户名称',
      customerNo: '客户编号',
      shortName: '简称',
      contactName: '联系人',
      phone: '电话',
      email: '邮箱',
      region: '区域',
      level: '等级',
      creditLimit: '信用额度',
      balance: '余额',
      address: '地址',
      department: '部门',
      position: '职位',
      decisionAuthority: '决策权',
      coreConcerns: '核心关注'
    }
  },
  supplier: {
    required: ['name'],
    optional: ['supplierCode', 'shortName', 'contact', 'phone', 'email', 'rating', 'status'],
    labels: {
      name: '供应商名称',
      supplierCode: '供应商编码',
      shortName: '简称',
      contact: '联系人',
      phone: '电话',
      email: '邮箱',
      rating: '评级',
      status: '状态'
    }
  },
  inventory: {
    required: ['code', 'name'],
    optional: [
      'category',
      'quantity',
      'safetyStock',
      'maxStock',
      'warehouse',
      'location',
      'unitCost',
      'grade',
      'color',
      'brand'
    ],
    labels: {
      code: '编号',
      name: '物料名称',
      category: '分类',
      quantity: '数量',
      safetyStock: '安全库存',
      maxStock: '最大库存',
      warehouse: '仓库',
      location: '库位',
      unitCost: '单价',
      grade: '规格',
      color: '颜色',
      brand: '品牌'
    }
  },
  quotation: {
    required: ['quoteNo', 'customerName'],
    optional: ['total', 'status', 'profitMargin', 'validUntil'],
    labels: {
      quoteNo: '报价编号',
      customerName: '客户名称',
      total: '总金额',
      status: '状态',
      profitMargin: '利润率',
      validUntil: '有效期至'
    }
  },
  contract: {
    required: ['contractNo', 'customerName'],
    optional: ['amount', 'status', 'signDate', 'deliveryDate'],
    labels: {
      contractNo: '合同编号',
      customerName: '客户名称',
      amount: '合同金额',
      status: '状态',
      signDate: '签订日期',
      deliveryDate: '交货日期'
    }
  }
}

class DataTransfer {
  /**
   * 导出数据为JSON
   * @param {string|Array} modules - 模块名或模块名数组
   * @param {Object} options - 选项 { filters, fields, pretty }
   * @returns {string} JSON字符串
   */
  exportJSON(modules, options = {}) {
    console.debug('[DataTransfer] 开始导出JSON, 模块:', modules)
    try {
      const moduleList = Array.isArray(modules) ? modules : [modules]
      const result = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        modules: {}
      }

      for (const module of moduleList) {
        console.debug(`[DataTransfer] 获取模块数据: ${module}`)
        const data = this._getModuleData(module, options)
        if (data) {
          result.modules[module] = {
            count: data.length,
            fields: options.fields || null,
            data
          }
          console.debug(`[DataTransfer] 模块 ${module} 导出 ${data.length} 条数据`)
        } else {
          console.debug(`[DataTransfer] 模块 ${module} 无数据`)
        }
      }

      const json = options.pretty !== false ? JSON.stringify(result, null, 2) : JSON.stringify(result)
      console.debug(`[DataTransfer] JSON导出完成, 大小: ${json.length} 字符`)
      return json
    } catch (e) {
      console.error('[DataTransfer] 导出JSON失败:', e)
      errorHandler.handleError(e, { module: modules, action: 'export' })
      return ''
    }
  }

  /**
   * 导出数据为CSV
   * @param {string} module - 模块名
   * @param {Object} options - 选项 { filters, fields }
   * @returns {string} CSV字符串
   */
  exportCSV(module, options = {}) {
    try {
      const data = this._getModuleData(module, options)
      if (!data || data.length === 0) return ''

      const fieldDef = MODULE_FIELDS[module]
      const fields =
        options.fields || (fieldDef ? [...fieldDef.required, ...(fieldDef.optional || [])] : Object.keys(data[0]))
      const labels = fieldDef?.labels || {}

      /* 表头 */
      const headers = fields.map((f) => labels[f] || f)
      const lines = [headers.join(',')]

      /* 数据行 */
      for (const item of data) {
        const row = fields.map((f) => {
          const val = item[f]
          if (val === null || val === undefined) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
        })
        lines.push(row.join(','))
      }

      /* 添加BOM头确保UTF-8编码 */
      return '\uFEFF' + lines.join('\n')
    } catch (e) {
      errorHandler.handleError(e, { module, action: 'exportCSV' })
      return ''
    }
  }

  /**
   * 导入JSON数据
   * @param {string} content - JSON字符串
   * @param {Object} options - 选项 { merge, onProgress, validate }
   * @returns {Object} 导入结果 { success, results: [{module, imported, skipped, errors}] }
   */
  async importJSON(content, options = {}) {
    console.debug('[DataTransfer] 开始导入JSON')
    try {
      const parsed = JSON.parse(content)
      const modules =
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        parsed.modules &&
        typeof parsed.modules === 'object'
          ? parsed.modules
          : { [parsed?.module || 'unknown']: parsed }
      console.debug(`[DataTransfer] JSON解析成功, 包含模块: ${Object.keys(modules).join(', ')}`)
      const results = []

      for (const [module, moduleData] of Object.entries(modules)) {
        const data = moduleData.data || moduleData
        if (!Array.isArray(data)) {
          console.debug(`[DataTransfer] 模块 ${module} 数据格式无效, 跳过`)
          continue
        }
        console.debug(`[DataTransfer] 导入模块 ${module}, 数据量: ${data.length}`)

        const result = await this._importModuleData(module, data, options)
        results.push({ module, ...result })
        console.debug(
          `[DataTransfer] 模块 ${module} 导入结果: 成功${result.imported}, 跳过${result.skipped}, 错误${result.errors.length}`
        )
      }

      eventBus.emit('data:imported', { results })
      const totalImported = results.reduce((s, r) => s + r.imported, 0)
      console.debug(`[DataTransfer] 导入完成, 总计导入: ${totalImported}`)
      return {
        success: totalImported > 0,
        results
      }
    } catch (e) {
      console.error('[DataTransfer] 导入JSON失败:', e)
      const errorInfo = errorHandler.handleError(e, { action: 'importJSON' })
      return { success: false, results: [], error: errorInfo.message }
    }
  }

  /**
   * 导入CSV数据
   * @param {string} content - CSV字符串
   * @param {string} module - 目标模块
   * @param {Object} options - 选项
   * @returns {Object} 导入结果
   */
  async importCSV(content, module, options = {}) {
    try {
      const data = this._parseCSV(content)
      if (data.length === 0) {
        return { success: false, imported: 0, skipped: 0, errors: ['CSV文件为空'] }
      }

      /* 字段名映射（中文[右]英文） */
      const fieldDef = MODULE_FIELDS[module]
      if (fieldDef?.labels) {
        const reverseLabels = {}
        for (const [en, cn] of Object.entries(fieldDef.labels)) {
          reverseLabels[cn] = en
        }
        data.forEach((item) => {
          const mapped = {}
          for (const [key, value] of Object.entries(item)) {
            mapped[reverseLabels[key] || key] = value
          }
          Object.assign(item, mapped)
        })
      }

      const result = await this._importModuleData(module, data, options)
      return { success: result.imported > 0, ...result }
    } catch (e) {
      const errorInfo = errorHandler.handleError(e, { module, action: 'importCSV' })
      return { success: false, imported: 0, skipped: 0, errors: [errorInfo.message] }
    }
  }

  /**
   * 生成CSV模板
   * @param {string} module - 模块名
   * @returns {string} CSV模板内容
   */
  generateTemplate(module) {
    const fieldDef = MODULE_FIELDS[module]
    if (!fieldDef) return ''

    const fields = [...fieldDef.required, ...(fieldDef.optional || [])]
    const labels = fieldDef.labels || {}
    const headers = fields.map((f) => labels[f] || f)

    /* 添加示例行 */
    const exampleRow = fields.map((f) => {
      if (f.includes('No') || f.includes('Code')) return '示例编号'
      if (f.includes('name') || f.includes('Name')) return '示例名称'
      if (f.includes('phone')) return '13800138000'
      if (f.includes('email')) return 'example@email.com'
      if (f === 'level' || f === 'rating') return 'B'
      if (f.includes('amount') || f.includes('Limit') || f.includes('Cost')) return '0'
      if (f === 'quantity') return '0'
      return ''
    })

    return '\uFEFF' + [headers.join(','), exampleRow.join(',')].join('\n')
  }

  /**
   * 预览导入数据
   * @param {string} content - 导入内容
   * @param {string} format - 格式 'json' | 'csv'
   * @param {string} [module] - 目标模块（CSV时必需）
   * @returns {Object} 预览结果 { fields, count, sample, warnings }
   */
  previewImport(content, format, module) {
    try {
      let data
      if (format === 'csv') {
        data = this._parseCSV(content)
        /* 字段名映射 */
        const fieldDef = MODULE_FIELDS[module]
        if (fieldDef?.labels) {
          const reverseLabels = {}
          for (const [en, cn] of Object.entries(fieldDef.labels)) {
            reverseLabels[cn] = en
          }
          data.forEach((item) => {
            const mapped = {}
            for (const [key, value] of Object.entries(item)) {
              mapped[reverseLabels[key] || key] = value
            }
            Object.assign(item, mapped)
          })
        }
      } else {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          data = parsed
        } else if (parsed && typeof parsed === 'object' && parsed.modules && typeof parsed.modules === 'object') {
          data = Object.values(parsed.modules).flatMap((m) => (Array.isArray(m?.data) ? m.data : []))
        } else if (Array.isArray(parsed?.data)) {
          data = parsed.data
        } else {
          data = parsed
        }
      }

      if (!Array.isArray(data) || data.length === 0) {
        return { fields: [], count: 0, sample: [], warnings: ['无有效数据'] }
      }

      const fields = Object.keys(data[0])
      const warnings = []

      /* 检查必填字段 */
      const fieldDef = MODULE_FIELDS[module]
      if (fieldDef) {
        for (const req of fieldDef.required) {
          if (!fields.includes(req)) {
            warnings.push(`缺少必填字段: ${fieldDef.labels?.[req] || req}`)
          }
        }
      }

      return {
        fields,
        count: data.length,
        sample: data.slice(0, 5),
        warnings
      }
    } catch (e) {
      return { fields: [], count: 0, sample: [], warnings: ['数据格式错误: ' + e.message] }
    }
  }

  /**
   * 下载导出文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} format - 格式 'json' | 'csv'
   */
  downloadFile(content, filename, format) {
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* ========== 内部方法 ========== */

  /**
   * 获取模块数据
   */
  _getModuleData(module, options = {}) {
    console.debug(`[DataTransfer] _getModuleData 开始: module=${module}`)
    try {
      const dataKeyMap = {
        customer: 'customers',
        quotation: 'quotations',
        contract: 'contracts',
        inventory: 'inventory',
        delivery: 'deliveries',
        collection: 'collections',
        statement: 'statements',
        supplier: 'suppliers'
      }

      const dataCenter = useDataCenterStore()
      const dataRef = dataCenter[dataKeyMap[module] || module]
      console.debug(
        `[DataTransfer] dataCenter.${dataKeyMap[module] || module} = ${dataRef ? '存在' : 'undefined'}, 类型: ${Array.isArray(dataRef) ? 'array(' + dataRef.length + ')' : typeof dataRef}`
      )

      if (dataRef && Array.isArray(dataRef)) {
        let data = [...dataRef]

        if (options.filters) {
          for (const filter of options.filters) {
            data = data.filter((d) => d[filter.field] === filter.value)
          }
        }

        if (options.fields) {
          data = data.map((item) => {
            const filtered = {}
            for (const field of options.fields) {
              filtered[field] = item[field]
            }
            return filtered
          })
        }

        console.debug(`[DataTransfer] _getModuleData 完成: module=${module}, 返回 ${data.length} 条`)
        return data
      }

      console.debug(`[DataTransfer] _getModuleData 完成: module=${module}, 无数据`)
      return []
    } catch (e) {
      console.warn('[DataTransfer] 获取模块数据失败:', module, e)
      return []
    }
  }

  /**
   * 导入模块数据
   */
  async _importModuleData(module, data, options = {}) {
    let imported = 0
    let skipped = 0
    const errors = []

    try {
      const dataCenter = useDataCenterStore()

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i]

          /* 验证 */
          if (options.validate !== false) {
            const fieldDef = MODULE_FIELDS[module]
            if (fieldDef) {
              const missing = fieldDef.required.filter((f) => !item[f] && item[f] !== 0)
              if (missing.length > 0) {
                skipped++
                errors.push(`第${i + 1}行: 缺少必填字段 ${missing.join(',')}`)
                continue
              }
            }
          }

          /* 调用dataCenter的create */
          const result = await dataCenter.create(module, item, {
            checkPermission: false,
            validate: false
          })

          if (result.success) {
            imported++
          } else {
            skipped++
            errors.push(`第${i + 1}行: ${result.error}`)
          }
        } catch (e) {
          skipped++
          errors.push(`第${i + 1}行: ${e.message}`)
        }

        /* 进度回调 */
        if (options.onProgress) {
          options.onProgress(i + 1, data.length, imported, skipped)
        }

        /* 每100条让出主线程 */
        if (i % 100 === 0) {
          await new Promise((r) => setTimeout(r, 0))
        }
      }
    } catch (e) {
      errors.push(`导入异常: ${e.message}`)
    }

    return { imported, skipped, errors }
  }

  /**
   * 解析CSV
   */
  _parseCSV(content) {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []

    const headers = this._parseCSVLine(lines[0])
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = this._parseCSVLine(line)
      const item = {}
      headers.forEach((h, idx) => {
        item[h.trim()] = (values[idx] || '').trim()
      })
      data.push(item)
    }

    return data
  }

  /**
   * 解析CSV行（处理引号内的逗号）
   */
  _parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          result.push(current)
          current = ''
        } else {
          current += char
        }
      }
    }
    result.push(current)
    return result
  }

  /**
   * 获取模块字段定义
   */
  getModuleFields(module) {
    return MODULE_FIELDS[module] || null
  }

  /**
   * 获取所有支持导入导出的模块
   */
  getSupportedModules() {
    return Object.keys(MODULE_FIELDS).map((module) => ({
      key: module,
      ...MODULE_FIELDS[module]
    }))
  }
}

/* 全局单例 */
const dataTransfer = new DataTransfer()

export default dataTransfer
