import { useSmartRecognizeBase, makeItem, CommonPatterns } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

export function useSmartRecognize(form) {
  function parsePaymentInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const amountMatch = text.match(CommonPatterns.amount)
    if (amountMatch) {
      const num = parseFloat(amountMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(num)) pushItem(makeItem('amount', '付款金额', num, 85))
    } else {
      const moneyMatch = text.match(CommonPatterns.money)
      if (moneyMatch) {
        const num = parseFloat(moneyMatch[1].replace(/,/g, ''))
        if (!Number.isNaN(num)) pushItem(makeItem('amount', '付款金额', num, 70))
      }
    }

    const methodMatch = text.match(/(?:银行转账|现金|支票|汇票)/)
    if (methodMatch) {
      const methodMap = { 银行转账: 'bank', 现金: 'cash', 支票: 'check', 汇票: 'check' }
      pushItem(makeItem('method', '付款方式', methodMap[methodMatch[0]] || 'other', 80))
    }

    const bankMatch = text.match(CommonPatterns.bankName)
    if (bankMatch) pushItem(makeItem('bankName', '银行名称', bankMatch[1], 80))

    const refMatch = text.match(/(?:流水号|回单号|凭证号|交易编号|参考号)[:\s：]*([\w-]{4,30})/)
    if (refMatch) pushItem(makeItem('referenceNo', '参考编号', refMatch[1], 75))

    const dateMatch = text.match(/(?:付款日期|制单日期|日期)[:\s：]*(\d{4}(?:\/|\.|-)\d{1,2}(?:\/|\.|-)\d{1,2})/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[/.]/g, '-')
      pushItem(makeItem('paymentDate', '付款日期', dateStr, 80))
    }

    const notesMatch = text.match(/(?:备注|说明|摘要)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

    return { items, identifiedCount, lowConfCount }
  }

  return useSmartRecognizeBase(
    form,
    parsePaymentInfo,
    '粘贴付款信息文本或表格数据，AI将自动识别并提取关键字段...',
    SMART_TEMPLATE_SPECS.payment
  )
}
