import { useSmartRecognizeBase, makeItem, CommonPatterns } from '@/composables/useSmartRecognizeBase'

/**
 * 交易记录智能识别 composable
 * @param {Object} form - 响应式表单对象
 */
export function useSmartRecognize(form) {
  function parseTransactionInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    // 提取公司名称（可能对应客户）
    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('customerName', '客户名称', companyMatch[0], 75))

    // 提取金额
    const amountMatch = text.match(CommonPatterns.amount)
    if (amountMatch) {
      const num = parseFloat(amountMatch[1].replace(/,/g, ''))
      if (!isNaN(num)) pushItem(makeItem('amount', '金额', num, 80))
    } else {
      const moneyMatch = text.match(CommonPatterns.money)
      if (moneyMatch) {
        const num = parseFloat(moneyMatch[1].replace(/,/g, ''))
        if (!isNaN(num)) pushItem(makeItem('amount', '金额', num, 70))
      }
    }

    // 提取日期
    const dateMatch = text.match(CommonPatterns.date)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('date', '日期', dateStr, 75))
    }

    // 提取交易类型
    const typeMatch = text.match(/(?:报价|合同|回款|送货|手动)/)
    if (typeMatch) {
      const typeMap = { 报价: 'quotation', 合同: 'contract', 回款: 'collection', 送货: 'delivery', 手动: 'manual' }
      pushItem(makeItem('type', '交易类型', typeMap[typeMatch[0]] || 'manual', 70))
    }

    // 提取备注
    const notesMatch = text.match(/(?:备注|说明|描述|摘要)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

    return { items, identifiedCount, lowConfCount }
  }

  return useSmartRecognizeBase(form, parseTransactionInfo, '粘贴交易信息文本，AI将自动识别并提取关键字段...')
}
