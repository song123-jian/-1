import { useSmartRecognizeBase, makeItem, CommonPatterns, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const TABLE_HEADERS = [
  { key: 'materialCode', label: '物料编码', type: 'string' },
  { key: 'materialName', label: '物料名称', type: 'string' },
  { key: 'spec', label: '规格', type: 'string' },
  { key: 'unit', label: '单位', type: 'string' },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'unitPrice', label: '单价', type: 'number' },
  { key: 'amount', label: '金额', type: 'number' }
]

export function useSmartRecognize(form) {
  function parseDeliveryInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    const push = (item) => {
      if (!item) return
      items.push(item)
      identifiedCount += 1
      if (item.confidence < 80) lowConfCount += 1
    }

    const noMatch = text.match(/(?:送货单号|发货单号|单号)[:\s：]*([A-Z0-9-]+)/i)
    if (noMatch) push(makeItem('deliveryNo', '送货单号', noMatch[1].trim(), 84))

    const customerMatch = text.match(CommonPatterns.company)
    if (customerMatch) push(makeItem('customerName', '客户', customerMatch[0], 80))

    const contactMatch = text.match(/(?:联系人|收货联系人)[:\s：]*([^\n\r]{2,12})/)
    if (contactMatch) push(makeItem('contact', '联系人', contactMatch[1].trim(), 72))

    const orderMatch = text.match(/(?:关联采购单号|订单号|销售订单号)[:\s：]*([A-Z0-9-]+)/i)
    if (orderMatch) push(makeItem('orderId', '关联单号', orderMatch[1].trim(), 76))

    const dateMatch = text.match(/(?:发货日期|送货日期|日期)[:\s：]*(\d{4}(?:\/|年|-)\d{1,2}(?:\/|月|-)\d{1,2}[日]?)/)
    if (dateMatch) push(makeItem('date', '发货日期', dateMatch[1].replace(/[年月]/g, '-').replace(/日/g, ''), 80))

    const expectedMatch = text.match(
      /(?:预计送达|预计到货|预计送货)[:\s：]*(\d{4}(?:\/|年|-)\d{1,2}(?:\/|月|-)\d{1,2}[日]?)/
    )
    if (expectedMatch)
      push(makeItem('expectedArrivalDate', '预计送达', expectedMatch[1].replace(/[年月]/g, '-').replace(/日/g, ''), 78))

    const transportMatch = text.match(/(?:运输方式|物流方式)[:\s：]*([^\n\r]{2,20})/)
    if (transportMatch) {
      const raw = transportMatch[1].trim()
      const map = {
        自提: 'self',
        物流: 'logistics',
        快递: 'express',
        专车: 'dedicated'
      }
      const key = Object.keys(map).find((k) => raw.includes(k))
      push(makeItem('transportMethod', '运输方式', key ? map[key] : raw, 74))
    }

    const carrierMatch = text.match(/(?:承运单位|物流公司)[:\s：]*([^\n\r]{2,40})/)
    if (carrierMatch) push(makeItem('carrier', '承运单位', carrierMatch[1].trim(), 72))

    const driverMatch = text.match(/(?:司机|驾驶员)[:\s：]*([^\n\r]{2,12})/)
    if (driverMatch) push(makeItem('driver', '司机', driverMatch[1].trim(), 72))

    const phoneMatch = text.match(CommonPatterns.phone)
    if (phoneMatch) push(makeItem('phone', '联系电话', phoneMatch[0], 75))

    const driverPhoneMatch = text.match(/(?:司机电话|驾驶员电话|司机手机)[:\s：]*(1[3-9]\d{9})/)
    if (driverPhoneMatch) push(makeItem('driverPhone', '司机电话', driverPhoneMatch[1], 75))

    const plateMatch = text.match(/(?:车牌号|车牌)[:\s：]*([A-Z0-9-]{5,12})/i)
    if (plateMatch) push(makeItem('plateNo', '车牌号', plateMatch[1].trim(), 78))

    const trackingMatch = text.match(/(?:运单号|物流单号|追踪号)[:\s：]*([A-Z0-9-]{6,40})/i)
    if (trackingMatch) push(makeItem('trackingNo', '运单号', trackingMatch[1].trim(), 76))

    const signMatch = text.match(/(?:签收人|收货人)[:\s：]*([^\n\r]{2,12})/)
    if (signMatch) push(makeItem('deliverySigner', '签收人', signMatch[1].trim(), 72))

    const signDateMatch = text.match(
      /(?:签收日期|签收时间|确认日期)[:\s：]*(\d{4}(?:\/|年|-)\d{1,2}(?:\/|月|-)\d{1,2}[日]?)/
    )
    if (signDateMatch)
      push(makeItem('signDate', '签收日期', signDateMatch[1].replace(/[年月]/g, '-').replace(/日/g, ''), 76))

    const remarksMatch = text.match(/(?:备注|异常说明|说明)[:\s：]*([^\n\r]{5,200})/)
    if (remarksMatch) push(makeItem('remarks', '备注', remarksMatch[1].trim(), 58))

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
    parseDeliveryInfo,
    '粘贴送货信息或表格数据，AI将自动识别并提取关键字段和明细行...',
    SMART_TEMPLATE_SPECS.deliveries
  )
}

export const useDeliveriesSmartRecognize = useSmartRecognize
