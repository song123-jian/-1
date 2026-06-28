import { useSmartRecognizeBase, makeItem } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

function findBom(text, bomStore) {
  const list = Array.isArray(bomStore?.activeBomList) ? bomStore.activeBomList : []
  return (
    list.find((bom) =>
      [bom.id, bom.code, bom.name, bom.productName].some((field) => field && String(text).includes(String(field)))
    ) || null
  )
}

function normalizeDate(v) {
  return String(v || '')
    .replace(/[年月]/g, '-')
    .replace(/日/g, '')
    .trim()
}

function parseProductionOrderInfo(text, bomStore) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  const push = (item) => {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const bomMatch = findBom(text, bomStore)
  if (bomMatch) {
    push(makeItem('bomId', 'BOM', bomMatch.id, 84))
    push(makeItem('bomName', 'BOM名称', bomMatch.name || bomMatch.code, 84))
    if (bomMatch.productName) push(makeItem('productName', '产品名称', bomMatch.productName, 82))
  }

  const productMatch = text.match(/(?:产品名称|产品信息|产品)[:\s：]*([^\n\r]{2,40})/)
  if (productMatch) push(makeItem('productName', '产品名称', productMatch[1].trim(), 78))

  const qtyMatch = text.match(/(?:数量|生产数量|计划数量)[:\s：]*([0-9]+(?:\.[0-9]+)?)/)
  if (qtyMatch) push(makeItem('quantity', '生产数量', parseFloat(qtyMatch[1]) || 0, 82))

  const unitMatch = text.match(/(?:单位)[:\s：]*([^\n\r]{1,10})/)
  if (unitMatch) push(makeItem('unit', '单位', unitMatch[1].trim(), 68))

  const priorityMatch = text.match(/(?:优先级|紧急程度)[:\s：]*([^\n\r]{1,10})/)
  if (priorityMatch) push(makeItem('priority', '优先级', priorityMatch[1].trim(), 72))

  const startMatch = text.match(/(?:计划开始日期|开始日期)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (startMatch) push(makeItem('plannedStartDate', '计划开始日期', normalizeDate(startMatch[1]), 80))

  const endMatch = text.match(/(?:计划完成日期|完成日期)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (endMatch) push(makeItem('plannedEndDate', '计划完成日期', normalizeDate(endMatch[1]), 80))

  const workshopMatch = text.match(/(?:车间|生产车间)[:\s：]*([^\n\r]{2,20})/)
  if (workshopMatch) push(makeItem('workshop', '车间', workshopMatch[1].trim(), 72))

  const operatorMatch = text.match(/(?:负责人|操作员|生产员)[:\s：]*([^\n\r]{2,12})/)
  if (operatorMatch) push(makeItem('operator', '负责人', operatorMatch[1].trim(), 72))

  const notesMatch = text.match(/(?:备注|说明)[:\s：]*([^\n\r]{5,200})/)
  if (notesMatch) push(makeItem('notes', '备注', notesMatch[1].trim(), 58))

  return { items, identifiedCount, lowConfCount }
}

export function useProductionOrderSmartRecognize(form, bomStore) {
  return useSmartRecognizeBase(
    form,
    (text) => parseProductionOrderInfo(text, bomStore),
    '粘贴生产订单信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.productionOrder
  )
}
