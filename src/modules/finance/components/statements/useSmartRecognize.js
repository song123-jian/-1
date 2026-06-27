import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'

const TABLE_HEADERS = [
  { key: 'date', label: '日期', type: 'string' },
  { key: 'name', label: '货物名称', type: 'string' },
  { key: 'code', label: '料号', type: 'string' },
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

    const periodMatch = text.match(/(?:期间|账期|对账期间|月份)[:\s：]*(\d{4}[-/年]\d{1,2}[月]?)/)
    if (periodMatch) {
      const period = periodMatch[1].replace(/[年月]/g, '-').replace(/-$/, '')
      pushItem(makeItem('period', '账单期间', period, 80))
    }

    const dateMatch = text.match(/(?:对账日期|确认日期|核对日期)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('reconDate', '对账日期', dateStr, 75))
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

    const paymentMatch = text.match(/(?:付款方式|结算方式)[:\s：]*(银行转账|承兑汇票|现金|月结)/)
    if (paymentMatch) pushItem(makeItem('paymentMethod', '付款方式', paymentMatch[1], 75))

    const termMatch = text.match(/(?:付款期限|账期|结算期)[:\s：]*(月结\d+天|票到\d+天|货到付款)/)
    if (termMatch) pushItem(makeItem('paymentTerm', '付款期限', termMatch[1], 75))

    const bankMatch = text.match(CommonPatterns.bankName)
    if (bankMatch) pushItem(makeItem('bankName', '开户银行', bankMatch[1], 80))

    const bankAccMatch = text.match(CommonPatterns.bankAccount)
    if (bankAccMatch) pushItem(makeItem('bankAccount', '银行账号', bankAccMatch[1], 85))

    const holderMatch = text.match(/(?:账户名|户名|账户名称)[:\s：]*([\u4e00-\u9fa5]{2,20})/)
    if (holderMatch) pushItem(makeItem('bankHolder', '账户名称', holderMatch[1], 75))

    const taxMatch = text.match(/(?:税率|增值税)[:\s：]*(\d{1,2})\s*%/)
    if (taxMatch) pushItem(makeItem('taxRate', '税率(%)', parseInt(taxMatch[1]), 80))

    // 解析表格数据
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
    '粘贴对账信息或表格数据（支持Excel复制），系统将自动识别并提取关键字段和明细行...'
  )
}
