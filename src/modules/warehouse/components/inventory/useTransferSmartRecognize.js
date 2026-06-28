import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const TABLE_HEADERS = [
  { key: 'materialCode', label: '物料编码', type: 'string' },
  { key: 'materialName', label: '物料名称', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'unitPrice', label: '单价', type: 'number' }
]

export function useSmartRecognize(form) {
  function parseTransferInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      if (!item) return
      items.push(item)
      identifiedCount += 1
      if (item.confidence < 80) lowConfCount += 1
    }

    const typeMatch = text.match(/(?:同价调拨|异价调拨)/)
    if (typeMatch) {
      pushItem(makeItem('type', '调拨类型', typeMatch[0] === '同价调拨' ? 'same_price' : 'diff_price', 85))
    }

    const fromMatch = text.match(/(?:调出仓库|来源仓库|从)[:\s：]*([\u4e00-\u9fa5]{2,10}库?)/)
    if (fromMatch) pushItem(makeItem('fromWarehouseId', '调出仓库', fromMatch[1], 70))

    const toMatch = text.match(/(?:调入仓库|到|目标仓库)[:\s：]*([\u4e00-\u9fa5]{2,10}库?)/)
    if (toMatch) pushItem(makeItem('toWarehouseId', '调入仓库', toMatch[1], 70))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('requester', '申请人', match[1], 70))
        break
      }
    }

    const dateMatch = text.match(/(?:调拨日期|申请日期|日期)[:\s：]*(\d{4}(?:\/|年|-)\d{1,2}(?:\/|月|-)\d{1,2}[日]?)/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('expectedDate', '调拨日期', dateStr, 70))
    }

    const notesMatch = text.match(/(?:备注|说明|原因|调拨原因)[:\s：]*(.{5,100})/)
    if (notesMatch) pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))

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
    parseTransferInfo,
    '粘贴调拨信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.transfer
  )
}
