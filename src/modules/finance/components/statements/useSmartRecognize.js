import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const TABLE_HEADERS = [
  { key: 'date', label: '日期', type: 'string' },
  { key: 'name', label: '名称', type: 'string' },
  { key: 'code', label: '编号', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'qty', label: '数量', type: 'number' },
  { key: 'price', label: '单价', type: 'number' },
  { key: 'remark', label: '备注', type: 'string' }
]

export function useSmartRecognize(form) {
  function parseStatementInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const periodMatch = text.match(/(?:期间|月份|对账期间|结算期)[:\s：]*(\d{4}(?:\/|-)\d{1,2})/)
    if (periodMatch) {
      pushItem(makeItem('period', '对账期间', periodMatch[1], 80))
    }

    const dateMatch = text.match(/(?:对账日期|确认日期|日期)[:\s：]*(\d{4}(?:\/|-)\d{1,2}(?:\/|-)\d{1,2})/)
    if (dateMatch) {
      pushItem(makeItem('reconDate', '对账日期', dateMatch[1], 75))
    }

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('buyerName', '采购方', companyMatch[0], 70))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('buyerContact', '采购方联系人', match[1], 65))
        break
      }
    }

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) pushItem(makeItem('contactPhone', '联系方式', phoneMatch[0], 85))

    const paymentMatch = text.match(/(?:收款方式|付款方式)[:\s：]*(银行转账|现金|支票|票据)/)
    if (paymentMatch) pushItem(makeItem('paymentMethod', '收款方式', paymentMatch[1], 75))

    const termMatch = text.match(/(?:账期|付款周期|结算周期)[:\s：]*(月结\d+天|票到\d+天|现结)/)
    if (termMatch) pushItem(makeItem('paymentTerm', '结算周期', termMatch[1], 75))

    const bankMatch = text.match(CommonPatterns.bankName)
    if (bankMatch) pushItem(makeItem('bankName', '银行名称', bankMatch[1], 80))

    const bankAccMatch = text.match(CommonPatterns.bankAccount)
    if (bankAccMatch) pushItem(makeItem('bankAccount', '银行账号', bankAccMatch[1], 85))

    const holderMatch = text.match(/(?:户名|开户名|账户名)[:\s：]*([\u4e00-\u9fa5]{2,20})/)
    if (holderMatch) pushItem(makeItem('bankHolder', '户名', holderMatch[1], 75))

    const taxMatch = text.match(/(?:税率|增值税)[:\s：]*(\d{1,2})\s*%/)
    if (taxMatch) pushItem(makeItem('taxRate', '税率(%)', parseInt(taxMatch[1], 10), 80))

    const tableRows = parseTableText(text, TABLE_HEADERS)

    const result = { items, identifiedCount, lowConfCount }
    if (tableRows.length > 0) {
      result.tableRows = tableRows
      result.tableHeaders = TABLE_HEADERS
    }
    return result
  }

  return useSmartRecognizeBase(
    form,
    parseStatementInfo,
    '粘贴对账或结算信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.statement
  )
}
