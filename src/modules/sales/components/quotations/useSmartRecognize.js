import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'

const TABLE_HEADERS = [
  { key: 'grade', label: '牌号/规格', type: 'string' },
  { key: 'standard', label: '材料标准', type: 'string' },
  { key: 'qty', label: '数量(KG)', type: 'number' },
  { key: 'price', label: '含税单价(元/KG)', type: 'number' },
  { key: 'remark', label: '备注', type: 'string' }
]

export function useSmartRecognize(form) {
  function parseQuotationInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('customerFullName', '客户公司全称', companyMatch[0], 85))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) { pushItem(makeItem('custContact', '联系人姓名', match[1], 75)); break }
    }

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) pushItem(makeItem('custPhone', '联系电话', phoneMatch[0], 95))

    const emailMatch = text.match(CommonPatterns.email)
    if (emailMatch) pushItem(makeItem('custEmail', '电子邮箱', emailMatch[0], 90))

    const deliveryAddrMatch = text.match(/(?:交货地点|收货地址|送货地址|交货地)[:\s：]*(.{5,50})/)
    if (deliveryAddrMatch) pushItem(makeItem('termDeliveryAddr', '交货地点', deliveryAddrMatch[1].trim(), 70))

    const paymentMatch = text.match(/(?:付款方式|结算方式|支付方式)[:\s：]*([\u4e00-\u9fa5]{2,20})/)
    if (paymentMatch) pushItem(makeItem('termPayment', '付款方式', paymentMatch[1], 70))

    const deliveryMatch = text.match(/(?:交货周期|交货期|发货周期|交付周期)[:\s：]*([\u4e00-\u9fa5\d]{2,20})/)
    if (deliveryMatch) pushItem(makeItem('termDelivery', '交货周期', deliveryMatch[1], 70))

    const taxMatch = text.match(/(?:税率|增值税)[:\s：]*(\d{1,2})\s*%/)
    if (taxMatch) pushItem(makeItem('taxRate', '税率(%)', parseInt(taxMatch[1]), 80))

    const notesMatch = text.match(/(?:备注|说明|备注信息)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

    // 解析表格数据（Tab/逗号分隔的多行明细）
    const tableRows = parseTableText(text, TABLE_HEADERS)

    const result = { items, identifiedCount, lowConfCount }
    if (tableRows.length > 0) {
      result.tableRows = tableRows
      result.tableHeaders = TABLE_HEADERS
    }
    return result
  }

  return useSmartRecognizeBase(form, parseQuotationInfo, '粘贴报价信息或表格数据（支持Excel复制），AI将自动识别并提取关键字段和明细行...')
}
