import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const TABLE_HEADERS = [
  { key: 'fullName', label: '客户全称', type: 'string' },
  { key: 'contactName', label: '联系人', type: 'string' },
  { key: 'phone', label: '电话', type: 'string' },
  { key: 'email', label: '邮箱', type: 'string' },
  { key: 'region', label: '地区', type: 'string' },
  { key: 'address', label: '地址', type: 'string' }
]

const SR_REGION_MAP = {
  上海: '华东',
  江苏: '华东',
  浙江: '华东',
  安徽: '华东',
  福建: '华东',
  江西: '华东',
  山东: '华东',
  北京: '华北',
  天津: '华北',
  河北: '华北',
  山西: '华北',
  内蒙古: '华北',
  广东: '华南',
  广西: '华南',
  海南: '华南',
  湖北: '华中',
  湖南: '华中',
  河南: '华中',
  四川: '西南',
  重庆: '西南',
  贵州: '西南',
  云南: '西南',
  西藏: '西南',
  陕西: '西北',
  甘肃: '西北',
  青海: '西北',
  宁夏: '西北',
  新疆: '西北',
  辽宁: '东北',
  吉林: '东北',
  黑龙江: '东北'
}

export function useSmartRecognize(form) {
  function parseCustomerInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    function pushItem(item) {
      items.push(item)
      identifiedCount += 1
      if (item.confidence < 80) lowConfCount += 1
    }

    const phoneMatch = text.match(/1[3-9]\d{9}/)
    if (phoneMatch) pushItem(makeItem('phone', '手机号码', phoneMatch[0], 95))

    const emailMatch = text.match(CommonPatterns.email)
    if (emailMatch) pushItem(makeItem('email', '邮箱', emailMatch[0], 90))

    const companyMatch = text.match(CommonPatterns.company)
    if (companyMatch) pushItem(makeItem('fullName', '客户全称', companyMatch[0], 85))

    for (const pattern of CommonPatterns.contactName) {
      const match = text.match(pattern)
      if (match) {
        pushItem(makeItem('contactName', '联系人', match[1], 75))
        break
      }
    }

    const positionMatch = text.match(/(?:职位|职务|头衔)[:\s：]*([\u4e00-\u9fa5]{2,8})/)
    if (positionMatch) pushItem(makeItem('position', '职位', positionMatch[1], 70))

    const deptMatch = text.match(/(?:部门|Dept|Department)[:\s：]*([\u4e00-\u9fa5]{2,8})/i)
    if (deptMatch) pushItem(makeItem('department', '部门', deptMatch[1], 65))

    for (const [province, region] of Object.entries(SR_REGION_MAP)) {
      if (text.includes(province)) {
        pushItem(makeItem('region', '地区', region, 70))
        break
      }
    }

    const addrMatch = text.match(CommonPatterns.address)
    if (addrMatch) pushItem(makeItem('address', '地址', addrMatch[1].trim(), 60))

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
    parseCustomerInfo,
    '粘贴客户信息或表格数据，AI将自动识别并提取关键字段...',
    SMART_TEMPLATE_SPECS.customer
  )
}
