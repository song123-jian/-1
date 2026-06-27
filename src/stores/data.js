import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useDeliveryStore } from './delivery'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'

export const useDataStore = defineStore('data', () => {
  const quotationStore = useQuotationStore()
  const contractStore = useContractStore()
  const collectionStore = useCollectionStore()
  const inventoryStore = useInventoryStore()
  const deliveryStore = useDeliveryStore()
  const supplierStore = useSupplierStore()

  /* 从专业 store 派生的只读数据 */
  const quotations = computed(() => quotationStore.quotations)
  const contracts = computed(() => contractStore.contracts)
  const collections = computed(() => collectionStore.collections)
  const inventory = computed(() => inventoryStore.inventory)
  const deliveries = computed(() => deliveryStore.deliveries)
  const suppliers = computed(() => supplierStore.suppliers)
  const warehouseOrders = computed(() => inventoryStore.warehouseOrders)

  /* transactions 无专属 store，保留为空数组 */
  const transactions = computed(() => [])

  /* 聚合计算属性 */
  const pendingQuotationCount = computed(
    () => quotations.value.filter((q) => q.status === 'pending' || q.status === 'sent').length
  )
  const pendingContractCount = computed(
    () => contracts.value.filter((c) => c.status === 'pending' || c.status === 'review').length
  )
  const lowStockCount = computed(
    () => inventory.value.filter((i) => i.quantity <= (i.safetyStock || i.minStock || 10)).length
  )

  /* 委托各专业 store 初始化种子数据 */
  function initSeedData() {
    quotationStore.initSeedData()
    contractStore.initSeedData()
    collectionStore.initSeedData()
    inventoryStore.initSeedData()
    deliveryStore.initSeedData()
    supplierStore.initSeedData()
  }

  return {
    quotations,
    contracts,
    transactions,
    inventory,
    collections,
    deliveries,
    suppliers,
    warehouseOrders,
    pendingQuotationCount,
    pendingContractCount,
    lowStockCount,
    initSeedData
  }
})
