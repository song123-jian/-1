import { useSmartRecognizeBase, makeItem, CommonPatterns } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

export function useSmartRecognize(form) {
  function parseSupplierInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      if (!item) return
      items.push(item)
      identifiedCount += 1
      if (item.confidence < 80) lowConfCount += 1
    }

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('name', '供应商名称', companyMatch[0], 85))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('contact', '联系人', match[1], 75))
        break
      }
    }

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) pushItem(makeItem('phone', '电话', phoneMatch[0], 95))

    const emailMatch = text.match(CommonPatterns.email)
    if (emailMatch) pushItem(makeItem('email', '邮箱', emailMatch[0], 90))

    const addrMatch = text.match(CommonPatterns.address)
    if (addrMatch) pushItem(makeItem('address', '地址', addrMatch[1].trim(), 60))

    const bankMatch = text.match(CommonPatterns.bankName)
    if (bankMatch) pushItem(makeItem('bankName', '开户银行', bankMatch[1], 80))

    const bankAccMatch = text.match(CommonPatterns.bankAccount)
    if (bankAccMatch) pushItem(makeItem('bankAccount', '银行账号', bankAccMatch[1], 85))

    const qualMatch = text.match(/(?:资质|认证|证书|ISO)[:\s：]*([\w\-/\u4e00-\u9fa5]{2,30})/i)
    if (qualMatch) pushItem(makeItem('qualification', '资质认证', qualMatch[1], 65))

    const catMatch = text.match(/(?:类别|类型|分类)[:\s：]*(原材料|成品|服务|物流)/)
    if (catMatch) pushItem(makeItem('category', '类别', catMatch[1], 80))

    return { items, identifiedCount, lowConfCount }
  }

  return useSmartRecognizeBase(
    form,
    parseSupplierInfo,
    '粘贴供应商信息文本或表格数据，AI将自动识别并提取关键字段...',
    SMART_TEMPLATE_SPECS.supplier
  )
}
