import { useSmartRecognizeBase, makeItem, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const TABLE_HEADERS = [
  { key: 'materialCode', label: '物料编码', type: 'string' },
  { key: 'materialName', label: '物料名称', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'unitPrice', label: '单价', type: 'number' }
]

function normalizeDate(v) {
  return String(v || '')
    .replace(/[年月]/g, '-')
    .replace(/日/g, '')
    .trim()
}

function findWarehouseId(text, inventoryStore) {
  const warehouses = Array.isArray(inventoryStore?.warehouses) ? inventoryStore.warehouses : []
  const matched = warehouses.find((w) => [w.id, w.name, w.warehouseName].some((field) => String(text).includes(field)))
  return matched ? matched.id : ''
}

function parseOutboundInfo(text, inventoryStore) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  const push = (item) => {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const noMatch = text.match(/(?:出库单号|领料单号|单号)[:\s：]*([A-Z0-9-]+)/i)
  if (noMatch) push(makeItem('outboundNo', '出库单号', noMatch[1].trim(), 84))

  const typeMatch = text.match(/(?:出库类型|用途)[:\s：]*([^\n\r]{2,20})/)
  if (typeMatch) push(makeItem('outType', '出库类型', typeMatch[1].trim(), 72))

  const dateMatch = text.match(/(?:出库日期|领料日期|日期)[:\s：]*(\d{4}(?:\/|年|-)\d{1,2}(?:\/|月|-)\d{1,2}[日]?)/)
  if (dateMatch) push(makeItem('date', '出库日期', normalizeDate(dateMatch[1]), 80))

  const codeMatch = text.match(/(?:物料编码|编码|料号)[:\s：]*([A-Z0-9-]{2,40})/i)
  if (codeMatch) push(makeItem('materialCode', '物料编码', codeMatch[1].trim(), 82))

  const nameMatch = text.match(/(?:物料名称|名称)[:\s：]*([^\n\r]{2,40})/)
  if (nameMatch) push(makeItem('materialName', '物料名称', nameMatch[1].trim(), 78))

  const gradeMatch = text.match(/(?:等级|牌号)[:\s：]*([^\n\r]{1,40})/)
  if (gradeMatch) push(makeItem('grade', '等级', gradeMatch[1].trim(), 76))

  const colorMatch = text.match(/(?:颜色|色号)[:\s：]*([^\n\r]{1,20})/)
  if (colorMatch) push(makeItem('color', '颜色', colorMatch[1].trim(), 72))

  const qtyMatch = text.match(/(?:数量|出库数量|领料数量)[:\s：]*([0-9]+(?:\.[0-9]+)?)/)
  if (qtyMatch) push(makeItem('outQty', '数量', parseFloat(qtyMatch[1]) || 0, 82))

  const priceMatch = text.match(/(?:单价)[:\s：]*([0-9]+(?:\.[0-9]+)?)/)
  if (priceMatch) push(makeItem('unitPrice', '单价', parseFloat(priceMatch[1]) || 0, 80))

  const refMatch = text.match(/(?:关联单号|来源单号|参考号)[:\s：]*([A-Z0-9-]+)/i)
  if (refMatch) push(makeItem('referenceId', '关联单号', refMatch[1].trim(), 76))

  const warehouseMatch = text.match(/(?:仓库|出库仓库)[:\s：]*([^\n\r]{2,30})/)
  if (warehouseMatch) {
    const warehouseId = findWarehouseId(warehouseMatch[1].trim(), inventoryStore)
    push(makeItem('warehouseId', '仓库', warehouseId || warehouseMatch[1].trim(), warehouseId ? 82 : 62))
  }

  const locationMatch = text.match(/(?:库位|货位)[:\s：]*([^\n\r]{1,30})/)
  if (locationMatch) push(makeItem('locationId', '库位', locationMatch[1].trim(), 70))

  const batchMatch = text.match(/(?:批号|批次)[:\s：]*([^\n\r]{2,40})/)
  if (batchMatch) push(makeItem('batchNo', '批号', batchMatch[1].trim(), 78))

  const notesMatch = text.match(/(?:备注|说明|用途说明)[:\s：]*([^\n\r]{5,200})/)
  if (notesMatch) push(makeItem('notes', '备注', notesMatch[1].trim(), 58))

  const tableRows = parseTableText(text, TABLE_HEADERS)
  const result = { items, identifiedCount, lowConfCount }
  if (tableRows.length > 0) {
    result.tableRows = tableRows
    result.tableHeaders = TABLE_HEADERS
  }
  return result
}

export function useOutboundSmartRecognize(form, inventoryStore) {
  return useSmartRecognizeBase(
    form,
    (text) => parseOutboundInfo(text, inventoryStore),
    '粘贴出库信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.outbound
  )
}
