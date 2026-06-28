import { useSmartRecognizeBase, makeItem, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

function parseBomInfo(text) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  const push = (item) => {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const codeMatch = text.match(/(?:BOM编号|BOM编码|编号)[:\s：]*([A-Z0-9-]+)/i)
  if (codeMatch) push(makeItem('productId', 'BOM编号', codeMatch[1].trim(), 82))

  const nameMatch = text.match(/(?:BOM名称|名称)[:\s：]*([^\n\r]{2,40})/)
  if (nameMatch) push(makeItem('name', 'BOM名称', nameMatch[1].trim(), 80))

  const productMatch = text.match(/(?:产品名称|物料名称|产品)[:\s：]*([^\n\r]{2,40})/)
  if (productMatch) push(makeItem('productName', '产品名称', productMatch[1].trim(), 78))

  const versionMatch = text.match(/(?:版本|BOM版本)[:\s：]*([^\n\r]{1,20})/)
  if (versionMatch) push(makeItem('version', '版本', versionMatch[1].trim(), 72))

  const typeMatch = text.match(/(?:类型|BOM类型)[:\s：]*([^\n\r]{1,20})/)
  if (typeMatch) push(makeItem('type', '类型', typeMatch[1].trim(), 72))

  const notesMatch = text.match(/(?:备注|说明)[:\s：]*([^\n\r]{5,200})/)
  if (notesMatch) push(makeItem('notes', '备注', notesMatch[1].trim(), 58))

  const headers = [
    { key: 'materialCode', label: '物料编码', type: 'string' },
    { key: 'materialName', label: '物料名称', type: 'string' },
    { key: 'spec', label: '规格', type: 'string' },
    { key: 'unit', label: '单位', type: 'string' },
    { key: 'quantity', label: '数量', type: 'number' },
    { key: 'scrapRate', label: '损耗率', type: 'number' },
    { key: 'notes', label: '备注', type: 'string' }
  ]
  const tableRows = parseTableText(text, headers)
  const result = { items, identifiedCount, lowConfCount }
  if (tableRows.length > 0) {
    result.tableRows = tableRows
    result.tableHeaders = headers
  }
  return result
}

export function useBomSmartRecognize(form) {
  return useSmartRecognizeBase(
    form,
    parseBomInfo,
    '粘贴BOM信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.bom
  )
}
