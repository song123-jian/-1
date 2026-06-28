import { useSmartRecognizeBase, makeItem, CommonPatterns } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

function parseProjectAutoInfo(text) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  const push = (item) => {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const companyMatch = text.match(CommonPatterns.company)
  if (companyMatch) push(makeItem('customer', '客户', companyMatch[0], 80))

  const oemMatch = text.match(/(?:OEM|品牌|主机厂)[:\s：]*([^\n\r]{2,30})/i)
  if (oemMatch) push(makeItem('oem', 'OEM/品牌', oemMatch[1].trim(), 74))

  const modelMatch = text.match(/(?:型号|平台|车型)[:\s：]*([^\n\r]{2,40})/)
  if (modelMatch) push(makeItem('vehicleModels', '产品型号', modelMatch[1].trim(), 72))

  const partMatch = text.match(/(?:零件名称|产品名称|部件)[:\s：]*([^\n\r]{2,40})/)
  if (partMatch) push(makeItem('partName', '项目名称', partMatch[1].trim(), 74))

  const materialMatch = text.match(/(?:材料|材质)[:\s：]*([^\n\r]{2,40})/)
  if (materialMatch) push(makeItem('material', '材料', materialMatch[1].trim(), 72))

  const gradeMatch = text.match(/(?:材料等级|等级|等级要求)[:\s：]*([^\n\r]{2,40})/)
  if (gradeMatch) push(makeItem('materialGrade', '材料等级', gradeMatch[1].trim(), 74))

  const supplierMatch = text.match(/(?:供应商|供方)[:\s：]*([^\n\r]{2,40})/)
  if (supplierMatch) push(makeItem('supplier', '供应商', supplierMatch[1].trim(), 72))

  const competitorMatch = text.match(/(?:竞品|竞争对手|对标)[:\s：]*([^\n\r]{2,40})/)
  if (competitorMatch) push(makeItem('competitor', '竞品', competitorMatch[1].trim(), 68))

  const colorMatch = text.match(/(?:颜色|颜色要求)[:\s：]*([^\n\r]{1,20})/)
  if (colorMatch) push(makeItem('color', '颜色', colorMatch[1].trim(), 70))

  const stageMatch = text.match(/(?:阶段|项目阶段)[:\s：]*([^\n\r]{2,20})/)
  if (stageMatch) push(makeItem('stage', '阶段', stageMatch[1].trim(), 70))

  const quoteMatch = text.match(/(?:报价状态|报价进度)[:\s：]*([^\n\r]{2,20})/)
  if (quoteMatch) push(makeItem('quoteStatus', '报价状态', quoteMatch[1].trim(), 70))

  const contractMatch = text.match(/(?:合同状态|签约状态)[:\s：]*([^\n\r]{2,20})/)
  if (contractMatch) push(makeItem('contractStatus', '合同状态', contractMatch[1].trim(), 70))

  const massMatch = text.match(/(?:质保状态|质量状态)[:\s：]*([^\n\r]{2,20})/)
  if (massMatch) push(makeItem('massStatus', '质保状态', massMatch[1].trim(), 70))

  const sopMatch = text.match(/(?:SOP|投产时间|计划投产)[:\s：]*([^\n\r]{4,20})/i)
  if (sopMatch) push(makeItem('sop', 'SOP', sopMatch[1].trim(), 78))

  const ownerMatch = text.match(/(?:负责人|项目负责人|跟进人)[:\s：]*([^\n\r]{2,12})/)
  if (ownerMatch) push(makeItem('owner', '负责人', ownerMatch[1].trim(), 74))

  const nextMatch = text.match(/(?:下次跟进|下次联系|跟进时间)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (nextMatch) push(makeItem('nextFollowUp', '下次跟进', nextMatch[1].replace(/[年月]/g, '-').replace(/日/g, ''), 76))

  const notesMatch = text.match(/(?:备注|说明|摘要)[:\s：]*([^\n\r]{5,200})/)
  if (notesMatch) push(makeItem('notes', '备注', notesMatch[1].trim(), 58))

  return { items, identifiedCount, lowConfCount }
}

function parseProjectNapInfo(text) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  const push = (item) => {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const companyMatch = text.match(CommonPatterns.company)
  if (companyMatch) push(makeItem('customerName', '客户名称', companyMatch[0], 80))

  const stageMatch = text.match(/(?:阶段|项目阶段|当前阶段)[:\s：]*([^\n\r]{2,20})/)
  if (stageMatch) push(makeItem('stage', '阶段', stageMatch[1].trim(), 70))

  const quoteMatch = text.match(/(?:报价状态|报价进度)[:\s：]*([^\n\r]{2,20})/)
  if (quoteMatch) push(makeItem('quoteStatus', '报价状态', quoteMatch[1].trim(), 70))

  const contractMatch = text.match(/(?:合同状态|签约状态)[:\s：]*([^\n\r]{2,20})/)
  if (contractMatch) push(makeItem('contractStatus', '合同状态', contractMatch[1].trim(), 70))

  const amountMatch = text.match(/(?:合同金额|签约金额|合同总额)[:\s：]*([0-9]+(?:\.[0-9]+)?)/)
  if (amountMatch) push(makeItem('contractAmount', '合同金额', parseFloat(amountMatch[1]) || 0, 80))

  const monthlyMatch = text.match(/(?:月度数量|月产量|月需求量)[:\s：]*([0-9]+(?:\.[0-9]+)?)/)
  if (monthlyMatch) push(makeItem('monthlyOrderQty', '月度数量', parseFloat(monthlyMatch[1]) || 0, 76))

  const paymentMatch = text.match(/(?:付款状态|回款状态)[:\s：]*([^\n\r]{2,20})/)
  if (paymentMatch) push(makeItem('paymentStatus', '付款状态', paymentMatch[1].trim(), 72))

  const competitorMatch = text.match(/(?:竞品|竞争对手|对标)[:\s：]*([^\n\r]{2,40})/)
  if (competitorMatch) push(makeItem('competitor', '竞品', competitorMatch[1].trim(), 68))

  const ownerMatch = text.match(/(?:负责人|项目负责人|跟进人)[:\s：]*([^\n\r]{2,12})/)
  if (ownerMatch) push(makeItem('owner', '负责人', ownerMatch[1].trim(), 74))

  const techMatch = text.match(/(?:技术要求|技术需求)[:\s：]*([^\n\r]{5,200})/)
  if (techMatch) push(makeItem('techRequirements', '技术要求', techMatch[1].trim(), 60))

  const bizMatch = text.match(/(?:商务要求|业务要求)[:\s：]*([^\n\r]{5,200})/)
  if (bizMatch) push(makeItem('bizRequirements', '业务要求', bizMatch[1].trim(), 60))

  const nextMatch = text.match(/(?:下次跟进|下次联系|跟进时间)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (nextMatch) push(makeItem('nextFollowUp', '下次跟进', nextMatch[1].replace(/[年月]/g, '-').replace(/日/g, ''), 76))

  const notesMatch = text.match(/(?:备注|说明|摘要)[:\s：]*([^\n\r]{5,200})/)
  if (notesMatch) push(makeItem('notes', '备注', notesMatch[1].trim(), 58))

  return { items, identifiedCount, lowConfCount }
}

export function useProjectTrackingSmartRecognize(form, mode = 'auto') {
  const parseFn = mode === 'nap' ? parseProjectNapInfo : parseProjectAutoInfo
  return useSmartRecognizeBase(
    form,
    parseFn,
    '粘贴项目跟踪信息文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.projectTracking
  )
}
