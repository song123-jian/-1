import { ref } from 'vue'

/**
 * 智能识别基础 composable - 提供通用的识别面板状态和操作逻辑
 * @param {Object} form - 响应式表单对象
 * @param {Function} parseFn - 解析函数，接收文本，返回 { items: Array, identifiedCount: Number, lowConfCount: Number, tableRows?: Array, tableHeaders?: Array }
 * @param {String} placeholder - 输入框占位文本
 */
export function useSmartRecognizeBase(form, parseFn, placeholder = '粘贴文本，AI将自动识别并提取关键字段...') {
  const showSmartRec = ref(false)
  const smartRecInput = ref('')
  const smartRecResult = ref(null)

  function runSmartRecognize() {
    const text = smartRecInput.value.trim()
    if (!text) {
      smartRecResult.value = null
      return
    }
    const result = parseFn(text)
    smartRecResult.value = result
  }

  function applySmartRecognize() {
    if (!smartRecResult.value) return
    // 填入表头字段
    if (smartRecResult.value.items && smartRecResult.value.items.length > 0) {
      smartRecResult.value.items.forEach(item => {
        if (item.value && Object.hasOwn(form, item.key)) {
          form[item.key] = item.value
        }
      })
    }
  }

  function handleSmartFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      if (typeof text === 'string' && text.trim()) {
        smartRecInput.value = text.trim()
        runSmartRecognize()
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function resetSmartRec() {
    showSmartRec.value = false
    smartRecInput.value = ''
    smartRecResult.value = null
  }

  return {
    showSmartRec,
    smartRecInput,
    smartRecResult,
    smartRecPlaceholder: placeholder,
    runSmartRecognize,
    applySmartRecognize,
    handleSmartFileUpload,
    resetSmartRec
  }
}

/**
 * 创建置信度项的辅助函数
 */
export function makeItem(key, label, value, confidence) {
  const confLevel = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low'
  const confLabel = confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信'
  return { key, label, value, confidence, confLevel, confLabel }
}

/**
 * 解析粘贴的表格文本（支持Tab分隔和常见分隔符）
 * @param {String} text - 粘贴的文本
 * @param {Array} columnDefs - 列定义 [{key, label, type:'string'|'number'}]
 * @returns {Array} 解析后的行数据数组
 */
export function parseTableText(text, columnDefs) {
  if (!text || !columnDefs || columnDefs.length === 0) return []

  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return []

  // 检测分隔符：Tab > 逗号 > 竖线 > 多空格
  let separator = '\t'
  const firstLine = lines[0]
  if (!firstLine.includes('\t')) {
    if (firstLine.includes(',')) separator = ','
    else if (firstLine.includes('|')) separator = '|'
    else if (/\s{2,}/.test(firstLine)) separator = /\s{2,}/
  }

  const rows = []
  const colCount = columnDefs.length

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    let cells
    if (separator instanceof RegExp) {
      cells = line.split(separator)
    } else {
      cells = line.split(separator)
    }
    cells = cells.map(c => c.trim())

    // 跳过表头行（如果第一行看起来像表头）
    if (i === 0 && cells.length >= 2) {
      const headerMatch = columnDefs.some((def, idx) => {
        const cell = cells[idx] || ''
        return cell.includes(def.label) || def.label.includes(cell)
      })
      if (headerMatch && cells.length >= colCount - 1) continue
    }

    // 跳过列数严重不足的行
    if (cells.length < Math.min(2, colCount - 2)) continue

    const row = {}
    columnDefs.forEach((def, idx) => {
      let val = cells[idx] || ''
      if (def.type === 'number') {
        const num = parseFloat(val.replace(/,/g, '').replace(/[¥￥]/g, ''))
        val = isNaN(num) ? null : num
      }
      row[def.key] = val
    })
    rows.push(row)
  }

  return rows
}

/**
 * 通用正则提取工具
 */
export const CommonPatterns = {
  phone: /1[3-9]\d{9}/,
  email: /[\w.-]+@[\w.-]+\.\w+/,
  company: /[\u4e00-\u9fa5]{2,20}(?:公司|集团|有限|股份|实业|科技|贸易|制造|机械|电子|智能|精密)/,
  contactName: [
    /(?:联系人|姓名|联系|负责人)[:\s：]*([\u4e00-\u9fa5]{2,4})/,
    /([\u4e00-\u9fa5]{2,4})(?:先生|女士|经理|总|总监|主管)/
  ],
  position: /(?:职位|职务|头衔)[:\s：]*([\u4e00-\u9fa5]{2,8})/,
  address: /(?:地址|住址|Addr)[:\s：]*(.{5,50})/,
  bankName: /(?:开户银行|开户行|银行)[:\s：]*([\u4e00-\u9fa5]{2,20}(?:银行|支行|分行))/,
  bankAccount: /(?:银行账号|账号|帐号)[:\s：]*(\d{10,25})/,
  date: /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
  amount: /(?:金额|合计|总计|总额|总价|款额)[:\s：]*[¥￥]?\s*(\d[\d,]*\.?\d*)/,
  money: /[¥￥]\s*(\d[\d,]*\.?\d*)/
}
