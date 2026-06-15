import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'

const TABLE_HEADERS = [
  { key: 'productName', label: '产品名称', type: 'string' },
  { key: 'spec', label: '规格型号', type: 'string' },
  { key: 'quantity', label: '数量(KG)', type: 'number' },
  { key: 'unitPrice', label: '含税单价(元/KG)', type: 'number' },
  { key: 'deliveryPlace', label: '交货地点', type: 'string' },
  { key: 'remark', label: '备注', type: 'string' }
]

export function useSmartRecognize(form) {
  function parseContractInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount++
      if (item.confidence < 80) lowConfCount++
    }

    const typeMatch = text.match(/(?:销售合同|采购合同|框架合同|补充协议|合作协议)/)
    if (typeMatch) pushItem(makeItem('contractType', '合同类型', typeMatch[0], 85))

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('partyA', '甲方', companyMatch[0], 80))

    const dateMatch = text.match(CommonPatterns.date)
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('signDate', '签约日期', dateStr, 75))
    }

    const settlementMatch = text.match(/(?:结算方式|付款方式|支付方式)[:\s：]*(款到发货|月结\d+天|票到\d+天|货到付款|先货后款)/)
    if (settlementMatch) pushItem(makeItem('settlement', '结算方式', settlementMatch[1], 75))

    const placeMatch = text.match(/(?:签约地|签订地|签署地)[:\s：]*([\u4e00-\u9fa5]{2,10})/)
    if (placeMatch) pushItem(makeItem('signPlace', '签约地点', placeMatch[1], 70))

    const endDateMatch = text.match(/(?:有效期至|到期日|截止日|终止日)[:\s：]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
    if (endDateMatch) {
      const dateStr = endDateMatch[1].replace(/[年月]/g, '-').replace(/日/g, '')
      pushItem(makeItem('endDate', '合同有效期', dateStr, 70))
    }

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) { pushItem(makeItem('partyAInfo.representative', '签约代表', match[1], 65)); break }
    }

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) pushItem(makeItem('partyAInfo.contact', '联系方式', phoneMatch[0], 75))

    // 解析表格数据
    const tableRows = parseTableText(text, TABLE_HEADERS)

    const result = { items, identifiedCount, lowConfCount }
    if (tableRows.length > 0) {
      result.tableRows = tableRows
      result.tableHeaders = TABLE_HEADERS
    }
    return result
  }

  return useSmartRecognizeBase(form, parseContractInfo, '粘贴合同信息或表格数据（支持Excel复制），AI将自动识别并提取关键字段和明细行...')
}
