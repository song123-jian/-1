import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'

const TABLE_HEADERS = [
  { key: 'materialCode', label: '编号', type: 'string' },
  { key: 'materialName', label: '物料名称', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'unitPrice', label: '单价', type: 'number' },
  { key: 'amount', label: '金额', type: 'number' }
]

export function useSmartRecognize(form) {
  function parsePurchaseInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('supplierName', '供应商名称', companyMatch[0], 85))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('contactName', '联系人', match[1], 70))
        break
      }
    }

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) pushItem(makeItem('phone', '电话', phoneMatch[0], 90))

    const dateMatch = text.match(
      /(?:到货日|交货日|预计到货|交货期|交付日)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/
    )
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('expectedDate', '预计到货日', dateStr, 70))
    }

    const typeMatch = text.match(/(?:退货|采购)/)
    if (typeMatch) {
      pushItem(makeItem('type', '类型', typeMatch[0] === '退货' ? 'return' : 'purchase', 80))
    }

    const titleMatch = text.match(/(?:标题|主题|采购内容|采购项目)[:\s：]*(.{2,50})/)
    if (titleMatch) pushItem(makeItem('title', '标题', titleMatch[1].trim(), 65))

    const notesMatch = text.match(/(?:备注|说明|要求)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

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
    parsePurchaseInfo,
    '粘贴采购信息或表格数据（支持Excel复制），AI将自动识别并提取关键字段和明细行...'
  )
}
