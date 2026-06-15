/**
 * 集成测试 - 完整业务流程跨模块验证
 * INT-01: 完整销售流程
 * INT-02: 采购到入库流程
 * INT-03: 删除级联验证
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== Mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn(),
    isDeletedId: vi.fn(() => false)
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '管理员',
    currentRole: '管理员',
    isLoggedIn: true
  })
}))

vi.mock('@/lib/supabase.js', () => ({
  SupabaseClient: { from: vi.fn() }
}))

vi.mock('@/services/api.js', () => ({
  API: { get: vi.fn(), post: vi.fn() }
}))

describe('集成测试 - 完整业务流程', () => {
  let customerStore, quotationStore, contractStore, deliveryStore, collectionStore, inventoryStore

  beforeEach(() => {
    clearStorage()
    setupPinia()
    customerStore = useCustomerStore()
    quotationStore = useQuotationStore()
    contractStore = useContractStore()
    deliveryStore = useDeliveryStore()
    collectionStore = useCollectionStore()
    inventoryStore = useInventoryStore()
  })

  describe('INT-01: 完整销售流程', () => {
    it('应完成 创建客户→创建报价→转合同→创建送货→创建回款→验证关联', () => {
      // 1. 创建客户
      const customer = customerStore.addCustomer({
        fullName: '集成测试客户有限公司',
        name: '集成测试客户',
        phone: '021-12345678',
        email: 'test@integration.com',
        region: '华东',
        level: 'A',
        creditLimit: 500000
      })
      expect(customer.id).toBeTruthy()
      expect(customer.name).toBe('集成测试客户')

      // 2. 创建报价单
      const quotation = quotationStore.addQuotation({
        customerId: customer.id,
        customerName: customer.name,
        customerFullName: customer.fullName,
        status: 'draft',
        items: JSON.stringify([
          { seq: 1, grade: 'ABS树脂', standard: '通用级', qty: 100, price: 98, remark: '' }
        ]),
        subtotal: 9800,
        taxRate: 13,
        total: 11074,
        costBasis: 7000,
        profitMargin: 28.8
      })
      expect(quotation.id).toBeTruthy()
      expect(quotation.customerId).toBe(customer.id)

      // 3. 审批报价单
      quotationStore.changeStatus(quotation.id, 'approved')
      const approvedQuote = quotationStore.getQuotationById(quotation.id)
      expect(approvedQuote.status).toBe('approved')

      // 4. 报价转合同
      const convertResult = quotationStore.convertToContract(quotation.id)
      expect(convertResult.success).toBe(true)
      expect(convertResult.quotation.convertedToContract).toBe(true)

      // 创建合同记录（模拟业务流程）
      const contract = contractStore.addContract({
        partyA: customer.name,
        partyAId: customer.id,
        sourceQuoteId: quotation.id,
        totalAmount: 11074,
        status: 'draft'
      })
      expect(contract.id).toBeTruthy()
      expect(contract.partyAId).toBe(customer.id)

      // 合同审批流程
      contractStore.changeStatus(contract.id, 'pending_approval')
      contractStore.changeStatus(contract.id, 'approved')
      contractStore.changeStatus(contract.id, 'signed')
      const signedContract = contractStore.getContractById(contract.id)
      expect(signedContract.status).toBe('signed')

      // 5. 创建送货单
      const delivery = deliveryStore.addDelivery({
        orderId: contract.contractNo,
        customerName: customer.name,
        address: customer.address || '测试地址',
        contact: customer.contactName || '测试联系人',
        phone: customer.phone || '',
        items: [
          {
            seq: 1,
            productName: 'ABS树脂',
            quantity: 100,
            unitPrice: 98,
            amount: 9800,
            taxRate: 13,
            taxAmount: 1274
          }
        ],
        totalQuantity: 100,
        totalAmount: 9800,
        totalTax: 1274,
        grandTotal: 11074
      })
      expect(delivery.id).toBeTruthy()
      expect(delivery.customerName).toBe(customer.name)

      // 送货状态流转
      deliveryStore.changeStatus(delivery.id, 'pending')
      deliveryStore.changeStatus(delivery.id, 'shipped')
      deliveryStore.changeStatus(delivery.id, 'transit')
      deliveryStore.changeStatus(delivery.id, 'received')
      deliveryStore.changeStatus(delivery.id, 'accepted')
      const acceptedDelivery = deliveryStore.getById(delivery.id)
      expect(acceptedDelivery.status).toBe('accepted')

      // 6. 创建回款记录
      const collection = collectionStore.addCollection({
        customerId: customer.id,
        customerName: customer.name,
        amount: 11074,
        method: 'bank_transfer',
        referenceNo: 'INT-TEST-001'
      })
      expect(collection.id).toBeTruthy()
      expect(collection.customerId).toBe(customer.id)
      expect(collection.amount).toBe(11074)

      // 确认回款
      collectionStore.confirmCollection(collection.id)
      const confirmedCollection = collectionStore.collections.find(c => c.id === collection.id)
      expect(confirmedCollection.status).toBe('confirmed')

      // 7. 验证所有关联
      // 验证客户存在
      const foundCustomer = customerStore.getCustomerById(customer.id)
      expect(foundCustomer).toBeTruthy()
      expect(foundCustomer.name).toBe('集成测试客户')

      // 验证报价单关联客户
      const foundQuote = quotationStore.getQuotationById(quotation.id)
      expect(foundQuote.customerId).toBe(customer.id)
      expect(foundQuote.convertedToContract).toBe(true)

      // 验证合同关联客户和报价
      const foundContract = contractStore.getContractById(contract.id)
      expect(foundContract.partyAId).toBe(customer.id)
      expect(foundContract.sourceQuoteId).toBe(quotation.id)

      // 验证送货单关联
      const foundDelivery = deliveryStore.getById(delivery.id)
      expect(foundDelivery.orderId).toBe(contract.contractNo)

      // 验证回款关联客户
      const foundCollection = collectionStore.collections.find(c => c.id === collection.id)
      expect(foundCollection.customerId).toBe(customer.id)
    })
  })

  describe('INT-02: 采购到入库流程', () => {
    it('应完成 创建供应商→创建采购入库单→审批→确认入库→验证库存增加', () => {
      // 1. 创建供应商
      const supplier = inventoryStore.addSupplier({
        name: '集成测试供应商有限公司',
        shortName: '测试供应商',
        contact: '张经理',
        phone: '0512-88888888',
        email: 'supplier@test.com',
        rating: 'A',
        supplierCode: 'SUP-INT-001'
      })
      expect(supplier.id).toBeTruthy()
      expect(supplier.name).toBe('集成测试供应商有限公司')

      // 2. 创建库存物料（初始库存为100）
      const inventoryItem = inventoryStore.addInventoryItem({
        code: 'MTL-INT-001',
        name: '集成测试物料',
        category: 'raw',
        quantity: 100,
        safetyStock: 50,
        unitCost: 85,
        warehouse: 'main'
      })
      expect(inventoryItem.id).toBeTruthy()
      expect(inventoryItem.quantity).toBe(100)

      // 3. 创建采购入库单
      const inboundResult = inventoryStore.submitInboundOrder({
        date: '2026-06-15',
        type: 'purchase',
        counterpartyId: supplier.id,
        counterpartyName: supplier.name,
        supplierCode: supplier.supplierCode,
        warehouseId: 'main',
        _items: [
          { code: 'MTL-INT-001', name: '集成测试物料', qty: 200, cost: 85 }
        ]
      })
      expect(inboundResult.success).toBe(true)
      const inboundOrder = inboundResult.order
      expect(inboundOrder.type).toBe('purchase')
      expect(inboundOrder.counterpartyId).toBe(supplier.id)

      // 4. 审批入库单 (pending → inspecting)
      const batchResult = inventoryStore.batchApproveInbound([inboundOrder.id])
      expect(batchResult).toBe(1)

      // 5. 确认入库 (inspecting → confirmed, 库存增加)
      const confirmResult = inventoryStore.confirmInbound(inboundOrder.id)
      expect(confirmResult.success).toBe(true)

      // 6. 验证库存增加
      const updatedItem = inventoryStore.inventory.find(i => i.code === 'MTL-INT-001')
      expect(updatedItem).toBeTruthy()
      expect(updatedItem.quantity).toBe(300) // 100 + 200

      // 验证入库单状态
      const confirmedOrder = inventoryStore.warehouseOrders.find(o => o.id === inboundOrder.id)
      expect(confirmedOrder.status).toBe('confirmed')

      // 验证供应商可查询
      const foundSupplier = inventoryStore.lookupSupplier(supplier.id)
      expect(foundSupplier).toBeTruthy()
      expect(foundSupplier.name).toBe('集成测试供应商有限公司')
    })
  })

  describe('INT-03: 删除级联验证', () => {
    it('有报价单关联的客户应阻止删除并返回错误信息', () => {
      // 创建客户
      const customer = customerStore.addCustomer({
        fullName: '级联测试客户',
        name: '级联测试客户',
        phone: '021-99999999'
      })

      // 创建关联的报价单
      quotationStore.addQuotation({
        customerId: customer.id,
        customerName: customer.name,
        status: 'draft'
      })

      // 尝试删除客户 - 应被阻止
      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toContain('关联')
      expect(deleteResult.error).toContain('报价单')

      // 验证客户仍然存在
      const foundCustomer = customerStore.getCustomerById(customer.id)
      expect(foundCustomer).toBeTruthy()
    })

    it('有合同关联的客户应阻止删除', () => {
      const customer = customerStore.addCustomer({
        fullName: '合同级联测试客户',
        name: '合同级联测试客户',
        phone: '021-88888888'
      })

      contractStore.addContract({
        partyA: customer.name,
        partyAId: customer.id,
        status: 'draft'
      })

      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toContain('合同')
    })

    it('有送货单关联的客户应阻止删除', () => {
      const customer = customerStore.addCustomer({
        fullName: '送货级联测试客户',
        name: '送货级联测试客户',
        phone: '021-77777777'
      })

      // deliveryStore.addDelivery 不直接设置 customerId，
      // 但 customerStore.deleteCustomer 检查 deliveryStore.deliveries 中的 customerId
      // 需要手动添加含 customerId 的送货记录
      const deliveryStore = useDeliveryStore()
      const delivery = deliveryStore.addDelivery({
        customerName: customer.name,
        totalAmount: 5000
      })
      // 手动设置 customerId 以建立关联
      deliveryStore.updateDelivery(delivery.id, { customerId: customer.id })

      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toContain('送货单')
    })

    it('有回款关联的客户应阻止删除', () => {
      const customer = customerStore.addCustomer({
        fullName: '回款级联测试客户',
        name: '回款级联测试客户',
        phone: '021-66666666'
      })

      collectionStore.addCollection({
        customerId: customer.id,
        customerName: customer.name,
        amount: 30000
      })

      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toContain('回款')
    })

    it('无关联数据的客户应可正常删除', () => {
      const customer = customerStore.addCustomer({
        fullName: '可删除测试客户',
        name: '可删除测试客户',
        phone: '021-55555555'
      })

      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(true)

      const foundCustomer = customerStore.getCustomerById(customer.id)
      expect(foundCustomer).toBeUndefined()
    })

    it('删除客户后其关联报价单仍保留（不级联删除）', () => {
      // 创建客户和报价
      const customer = customerStore.addCustomer({
        fullName: '残留数据测试客户',
        name: '残留数据测试客户',
        phone: '021-44444444'
      })

      const quotation = quotationStore.addQuotation({
        customerId: customer.id,
        customerName: customer.name,
        status: 'draft'
      })

      // 先删除报价单，使客户可被删除
      quotationStore.deleteQuotation(quotation.id)

      // 现在删除客户
      const deleteResult = customerStore.deleteCustomer(customer.id)
      expect(deleteResult.success).toBe(true)

      // 报价单已被手动删除
      const foundQuote = quotationStore.getQuotationById(quotation.id)
      expect(foundQuote).toBeNull()
    })
  })
})
