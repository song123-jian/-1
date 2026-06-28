import { ref } from 'vue'
import { extractSmartFileText } from './useSmartFileText'

export function useSmartRecognizeBase(
  form,
  parseFn,
  placeholder = '粘贴文本，AI将自动识别并提取关键字段...',
  template = null
) {
  const showSmartRec = ref(false)
  const smartRecInput = ref('')
  const smartRecResult = ref(null)
  const smartRecError = ref('')

  function runSmartRecognize() {
    const text = smartRecInput.value.trim()
    smartRecError.value = ''
    if (!text) {
      smartRecResult.value = null
      return
    }
    smartRecResult.value = parseFn(text)
  }

  function applySmartRecognize() {
    const result = smartRecResult.value
    if (!result) return
    if (Array.isArray(result.items) && result.items.length > 0) {
      result.items.forEach((item) => {
        if (!item || item.value === undefined || item.value === null || item.value === '') return
        if (Object.hasOwn(form, item.key)) {
          form[item.key] = item.value
          return
        }
        if (item.key.includes('.')) {
          const parts = item.key.split('.')
          let target = form
          for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {}
            target = target[parts[i]]
          }
          target[parts[parts.length - 1]] = item.value
        }
      })
    }
  }

  async function handleSmartFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      smartRecError.value = ''
      const text = await extractSmartFileText(file)
      if (typeof text === 'string' && text.trim()) {
        smartRecInput.value = text.trim()
        runSmartRecognize()
      } else {
        smartRecError.value = '无法从该文件中提取识别文本，请使用模板导出的标准文本格式。'
      }
    } catch (error) {
      console.error('[useSmartRecognizeBase] file parse failed:', error)
      smartRecError.value = '文件解析失败，请检查文件格式后重新上传。'
    } finally {
      event.target.value = ''
    }
  }

  function resetSmartRec() {
    showSmartRec.value = false
    smartRecInput.value = ''
    smartRecResult.value = null
    smartRecError.value = ''
  }

  function clearSmartRec() {
    smartRecInput.value = ''
    smartRecResult.value = null
    smartRecError.value = ''
  }

  return {
    showSmartRec,
    smartRecInput,
    smartRecResult,
    smartRecError,
    smartRecPlaceholder: placeholder,
    smartRecTemplateName: template?.name || '',
    smartRecTemplateContent: template?.content || '',
    runSmartRecognize,
    applySmartRecognize,
    handleSmartFileUpload,
    clearSmartRec,
    resetSmartRec
  }
}

export function makeItem(key, label, value, confidence) {
  const confLevel = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low'
  const confLabel = confidence >= 80 ? '高' : confidence >= 50 ? '中' : '低'
  return { key, label, value, confidence, confLevel, confLabel }
}

export function parseTableText(text, columnDefs) {
  if (!text || !columnDefs || columnDefs.length === 0) return []

  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

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
    const line = lines[i]
    let cells = separator instanceof RegExp ? line.split(separator) : line.split(separator)
    cells = cells.map((c) => c.trim())

    if (i === 0 && cells.length >= 2) {
      const headerMatch = columnDefs.some((def, idx) => {
        const cell = cells[idx] || ''
        return cell.includes(def.label) || def.label.includes(cell)
      })
      if (headerMatch && cells.length >= colCount - 1) continue
    }

    if (cells.length < Math.min(2, colCount - 2)) continue

    const row = {}
    columnDefs.forEach((def, idx) => {
      let val = cells[idx] || ''
      if (def.type === 'number') {
        const num = parseFloat(
          String(val)
            .replace(/,/g, '')
            .replace(/[^\d.-]/g, '')
        )
        val = Number.isNaN(num) ? null : num
      }
      row[def.key] = val
    })
    rows.push(row)
  }

  return rows
}

export const CommonPatterns = {
  phone: /1[3-9]\d{9}/,
  email: /[\w.-]+@[\w.-]+\.\w+/,
  company: /[\u4e00-\u9fa5]{2,20}(?:公司|集团|有限责任公司|股份|实业|科技|贸易|机械|制造|服务)/,
  contactName: [
    /(?:联系人|姓名|业务员)[:\s：]*([\u4e00-\u9fa5]{2,4})/,
    /([\u4e00-\u9fa5]{2,4})(?:先生|女士|经理|总监|老师)/
  ],
  position: /(?:职位|职务|岗位)[:\s：]*([\u4e00-\u9fa5]{2,8})/,
  address: /(?:地址|住址|Addr)[:\s：]*(.{5,50})/,
  bankName: /(?:银行名称|开户银行|银行)[:\s：]*([\u4e00-\u9fa5]{2,20}(?:支行|分行|银行))/,
  bankAccount: /(?:开户账号|账号|卡号)[:\s：]*(\d{10,25})/,
  date: /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
  amount: /(?:金额|合计|总计|总额|总价)[:\s：]*([0-9][\d,]*\.?\d*)/,
  money: /([0-9][\d,]*\.?\d*)/
}
