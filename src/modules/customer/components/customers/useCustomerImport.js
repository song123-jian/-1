/**
 * 客户批量导入 composable - 支持 JSON/XLSX/CSV/XML 格式
 * @param {Object} customerStore - Pinia customer store 实例
 */
export function useCustomerImport(customerStore) {
  // 表头别名映射（中文→英文字段名）
  const HEADER_ALIASES = {
    客户编号: 'customerNo',
    编号: 'customerNo',
    客户全称: 'fullName',
    全称: 'fullName',
    公司名称: 'fullName',
    名称: 'fullName',
    客户名称: 'fullName',
    联系人: 'contactName',
    姓名: 'contactName',
    联系姓名: 'contactName',
    部门: 'department',
    职位: 'position',
    职务: 'position',
    手机号码: 'phone',
    手机: 'phone',
    电话: 'phone',
    邮箱: 'email',
    电子邮件: 'email',
    等级: 'level',
    客户等级: 'level',
    决策权限: 'decisionAuthority',
    决策权: 'decisionAuthority',
    核心关注点: 'coreConcerns',
    关注点: 'coreConcerns',
    地区: 'region',
    区域: 'region',
    信用额度: 'creditLimit',
    授信额度: 'creditLimit',
    地址: 'address',
    详细地址: 'address',
    余额: 'balance',
    状态: 'status'
  }

  /**
   * 自动映射行数据到客户对象
   */
  function autoMapRow(row) {
    const mapped = {}
    for (const [header, value] of Object.entries(row)) {
      const normalizedHeader = header.trim()
      const field = HEADER_ALIASES[normalizedHeader]
      if (field) {
        mapped[field] = value
      }
    }
    return mapped
  }

  /**
   * 读取文件为文本
   */
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file, 'utf-8')
    })
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 分割CSV行（支持引号内逗号）
   */
  function splitLine(line, delimiter = ',') {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  /**
   * 解析分隔符文本（CSV/TSV）
   */
  function parseDelimitedText(text, delimiter = ',') {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const headers = splitLine(lines[0], delimiter)
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i], delimiter)
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      data.push(autoMapRow(row))
    }
    return data
  }

  /**
   * 解析XML文本
   */
  function parseXmlText(text) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const rows = doc.querySelectorAll('row, item, record, customer')
    const data = []
    rows.forEach((row) => {
      const obj = {}
      row.querySelectorAll('*').forEach((child) => {
        obj[child.tagName] = child.textContent || ''
      })
      data.push(autoMapRow(obj))
    })
    return data
  }

  /**
   * 解析导入文件
   */
  async function parseImportFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'json') {
      const text = await readFileAsText(file)
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((row) => autoMapRow(row))
      }
      return []
    }

    if (ext === 'csv') {
      const text = await readFileAsText(file)
      return parseDelimitedText(text, ',')
    }

    if (ext === 'tsv') {
      const text = await readFileAsText(file)
      return parseDelimitedText(text, '\t')
    }

    if (ext === 'xml') {
      const text = await readFileAsText(file)
      return parseXmlText(text)
    }

    if (ext === 'xlsx' || ext === 'xls') {
      // 尝试使用动态导入 xlsx 库
      try {
        const XLSX = await import('xlsx')
        const buffer = await readFileAsArrayBuffer(file)
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        return jsonData.map((row) => autoMapRow(row))
      } catch (e) {
        console.warn('[useCustomerImport] xlsx库加载失败，尝试CSV解析:', e)
        // 降级为CSV解析
        const text = await readFileAsText(file)
        return parseDelimitedText(text, ',')
      }
    }

    // 默认按CSV解析
    const text = await readFileAsText(file)
    return parseDelimitedText(text, ',')
  }

  /**
   * 批量添加客户（弹窗选择文件后导入）
   */
  function handleBatchAdd() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.tsv,.xlsx,.xls,.xml'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const data = await parseImportFile(file)
        if (data.length === 0) {
          alert('未能从文件中解析出有效的客户数据')
          return
        }
        const result = customerStore.importCustomers(data)
        alert(`导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条（重复或无效）`)
      } catch (err) {
        console.error('[useCustomerImport] 导入失败:', err)
        alert('导入失败：' + (err.message || '文件格式错误'))
      }
    }
    input.click()
  }

  return {
    handleBatchAdd
  }
}
