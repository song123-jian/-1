import { describe, it, expect } from 'vitest'
import { SMART_TEMPLATE_SPECS } from '../smartRecognizeSpecs'

describe('SMART_TEMPLATE_SPECS', () => {
  it('exposes shared template metadata for high-frequency entries', () => {
    const expectedNames = {
      projectTracking: 'project-tracking-recognition-template.txt',
      deliveries: 'deliveries-recognition-template.txt',
      contract: 'contract-recognition-template.txt',
      quotation: 'quotation-recognition-template.txt',
      transaction: 'transaction-recognition-template.txt',
      inbound: 'inbound-recognition-template.txt',
      outbound: 'outbound-recognition-template.txt',
      productionOrder: 'production-order-recognition-template.txt',
      bom: 'bom-recognition-template.txt',
      customer: 'customer-recognition-template.csv',
      purchase: 'purchase-recognition-template.txt',
      supplier: 'supplier-recognition-template.txt',
      statement: 'statement-recognition-template.txt',
      payment: 'payment-recognition-template.txt',
      receipt: 'receipt-recognition-template.txt',
      stocktaking: 'stocktaking-recognition-template.txt',
      transfer: 'transfer-recognition-template.txt'
    }

    for (const [key, expectedName] of Object.entries(expectedNames)) {
      expect(SMART_TEMPLATE_SPECS[key].name).toBe(expectedName)
      expect(SMART_TEMPLATE_SPECS[key].content).toEqual(expect.any(String))
      expect(SMART_TEMPLATE_SPECS[key].content.length).toBeGreaterThan(0)
    }

    expect(SMART_TEMPLATE_SPECS.projectTracking.content).toContain('项目名称')
    expect(SMART_TEMPLATE_SPECS.deliveries.content).toContain('送货单号')
    expect(SMART_TEMPLATE_SPECS.contract.content).toContain('合同编号')
    expect(SMART_TEMPLATE_SPECS.quotation.content).toContain('交货地点')
    expect(SMART_TEMPLATE_SPECS.transaction.content).toContain('交易类型')
  })
})
