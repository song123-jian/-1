import { useSmartRecognizeBase, makeItem, CommonPatterns } from '@/composables/useSmartRecognizeBase'

/**
 * 付款单智能识别 composable
 * @param {Object} form - 响应式表单对象
 */
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

    // 提取金额
    const amountMatch = text.match(CommonPatterns.amount)
    if (amountMatch) {
      const num = parseFloat(amountMatch[1].replace(/,/g, ''))
      if (!isNaN(num)) pushItem(makeItem('amount', '付款金额', num, 85))
    } else {
      const moneyMatch = text.match(CommonPatterns.money)
      if (moneyMatch) {
        const num = parseFloat(moneyMatch[1].replace(/,/g, ''))
        if (!isNaN(num)) pushItem(makeItem('amount', '付款金额', num, 70))
      }
    }

    // 提取付款方式
    const methodMatch = text.match(/(?:银行转账|现金|支票|承兑|汇票)/)
    if (methodMatch) {
      const methodMap = { 银行转账: 'bank', 现金: 'cash', 支票: 'check', 承兑: 'check', 汇票: 'check' }
      pushItem(makeItem('method', '付款方式', methodMap[methodMatch[0]] || 'other', 80))
    }

    // 提取银行名称
    const bankMatch = text.match(CommonPatterns.bankName)
    if (bankMatch) pushItem(makeItem('bankName', '银行名称', bankMatch[1], 80))

    // 提取参考号/流水号
    const refMatch = text.match(/(?:参考号|流水号|凭证号|交易号|回单号)[:\s：]*([\w\-]{4,30})/)
    if (refMatch) pushItem(makeItem('referenceNo', '参考号', refMatch[1], 75))

    // 提取日期
    const dateMatch = text.match(/(?:付款日期|出账日期|日期)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('paymentDate', '付款日期', dateStr, 80))
    }

    // 提取备注
    const notesMatch = text.match(/(?:备注|说明|摘要)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

    return { items, identifiedCount, lowConfCount }
  }

  return useSmartRecognizeBase(
    form,
    parsePaymentInfo,
    '粘贴付款信息文本（银行回单、付款通知等），AI将自动识别并提取关键字段...'
  )
}
