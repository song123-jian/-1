import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'

const TABLE_HEADERS = [
  { key: 'materialCode', label: '编号', type: 'string' },
  { key: 'materialName', label: '物料名称', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'actualQty', label: '实盘数量', type: 'number' },
  { key: 'warehouseLocation', label: '仓位', type: 'string' }
]

export function useSmartRecognize(form) {
  function parseStocktakingInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const typeMatch = text.match(/(?:全盘|抽盘|循环盘点)/)
    if (typeMatch) {
      const typeMap = { 全盘: 'full', 抽盘: 'partial', 循环盘点: 'cycle' }
      pushItem(makeItem('type', '盘点类型', typeMap[typeMatch[0]] || 'full', 85))
    }

    const warehouseMatch = text.match(/(?:仓库|库房|仓)[:\s：]*([\u4e00-\u9fa5]{2,10}仓库?)/)
    if (warehouseMatch) pushItem(makeItem('warehouseId', '仓库', warehouseMatch[1], 70))

    const dateMatch = text.match(/(?:计划日期|盘点日期|计划时间)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('plannedDate', '计划日期', dateStr, 75))
    }

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('executor', '盘点人', match[1], 70))
        break
      }
    }

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
    parseStocktakingInfo,
    '粘贴盘点信息或表格数据（支持Excel复制），AI将自动识别并提取关键字段和明细行...'
  )
}
