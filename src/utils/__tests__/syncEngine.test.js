import { beforeEach, describe, expect, it, vi } from 'vitest'

const pullSinceMock = vi.fn()
const autoSubscribeTablesMock = vi.fn()
const isConnectedMock = vi.fn()

vi.mock('@/lib/supabase.js', () => ({
  SupabaseClient: {
    isConnected: isConnectedMock,
    autoSubscribeTables: autoSubscribeTablesMock,
    unsubscribeAllAuto: vi.fn(),
    getClient: vi.fn()
  }
}))

vi.mock('@/services/api.js', () => ({
  API: {
    pullSince: pullSinceMock,
    upsertToServer: vi.fn()
  }
}))

vi.mock('@/utils/conflictResolver.js', () => ({
  mergeArrays: (localData, remoteData) => [...localData, ...remoteData]
}))

vi.mock('@/utils/eventBus.js', () => ({
  default: {
    on: vi.fn(() => vi.fn()),
    clear: vi.fn()
  }
}))

const customerStore = { customers: [], replaceData: vi.fn(), persist: vi.fn() }
const quotationStore = { quotations: [], replaceData: vi.fn(), persist: vi.fn() }
const contractStore = { contracts: [], replaceData: vi.fn(), persist: vi.fn() }
const inventoryStore = {
  inventory: [],
  inboundOrders: [],
  outboundOrders: [],
  replaceData: vi.fn(),
  replaceInbound: vi.fn(),
  replaceOutbound: vi.fn(),
  persistOrders: vi.fn()
}
const deliveryStore = { deliveries: [], replaceData: vi.fn(), persist: vi.fn() }
const collectionStore = { collections: [], replaceData: vi.fn(), persist: vi.fn() }
const statementStore = { statements: [], replaceData: vi.fn(), persist: vi.fn() }
const todoStore = { todos: [], replaceData: vi.fn(), persist: vi.fn() }
const costStore = { records: [], replaceData: vi.fn(), persist: vi.fn() }
const warehouseLocationStore = { locations: [], replaceData: vi.fn(), persist: vi.fn() }
const supplierStore = { suppliers: [], replaceData: vi.fn(), persist: vi.fn() }

vi.mock('@/modules/customer/stores/customer', () => ({ useCustomerStore: () => customerStore }))
vi.mock('@/modules/sales/stores/quotation', () => ({ useQuotationStore: () => quotationStore }))
vi.mock('@/modules/sales/stores/contract', () => ({ useContractStore: () => contractStore }))
vi.mock('@/modules/warehouse/stores/inventory', () => ({ useInventoryStore: () => inventoryStore }))
vi.mock('@/stores/delivery', () => ({ useDeliveryStore: () => deliveryStore }))
vi.mock('@/modules/finance/stores/collection', () => ({ useCollectionStore: () => collectionStore }))
vi.mock('@/modules/finance/stores/statement', () => ({ useStatementStore: () => statementStore }))
vi.mock('@/stores/todo', () => ({ useTodoStore: () => todoStore }))
vi.mock('@/modules/finance/stores/cost', () => ({ useCostStore: () => costStore }))
vi.mock('@/modules/warehouse/stores/warehouseLocation', () => ({
  useWarehouseLocationStore: () => warehouseLocationStore
}))
vi.mock('@/modules/purchase/stores/supplier', () => ({ useSupplierStore: () => supplierStore }))

function resetStoreDoubles() {
  customerStore.customers = []
  quotationStore.quotations = []
  contractStore.contracts = []
  inventoryStore.inventory = []
  inventoryStore.inboundOrders = []
  inventoryStore.outboundOrders = []
  deliveryStore.deliveries = []
  collectionStore.collections = []
  statementStore.statements = []
  todoStore.todos = []
  costStore.records = []
  warehouseLocationStore.locations = []
  supplierStore.suppliers = []

  customerStore.replaceData.mockClear()
  quotationStore.replaceData.mockClear()
  contractStore.replaceData.mockClear()
  inventoryStore.replaceData.mockClear()
  inventoryStore.replaceInbound.mockClear()
  inventoryStore.replaceOutbound.mockClear()
  deliveryStore.replaceData.mockClear()
  collectionStore.replaceData.mockClear()
  statementStore.replaceData.mockClear()
  todoStore.replaceData.mockClear()
  costStore.replaceData.mockClear()
  warehouseLocationStore.replaceData.mockClear()
  supplierStore.replaceData.mockClear()
}

describe('syncEngine startup flow', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
    resetStoreDoubles()
  })

  it('returns false when supabase is disconnected', async () => {
    isConnectedMock.mockReturnValue(false)

    const { useSyncEngine } = await import('../syncEngine.js')
    const syncEngine = useSyncEngine()

    expect(syncEngine.initAutoSync()).toBe(false)
    expect(autoSubscribeTablesMock).not.toHaveBeenCalled()
    expect(pullSinceMock).not.toHaveBeenCalled()
  })

  it('starts pull and realtime subscriptions when supabase is connected', async () => {
    isConnectedMock.mockReturnValue(true)
    pullSinceMock.mockResolvedValue([])

    const { useSyncEngine } = await import('../syncEngine.js')
    const syncEngine = useSyncEngine()

    expect(syncEngine.initAutoSync()).toBe(true)

    await Promise.resolve()
    await Promise.resolve()

    expect(autoSubscribeTablesMock).toHaveBeenCalledTimes(1)
    expect(autoSubscribeTablesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onInsert: expect.any(Function),
        onUpdate: expect.any(Function),
        onDelete: expect.any(Function)
      })
    )
    expect(pullSinceMock).toHaveBeenCalledWith('customers', null)
    expect(pullSinceMock).toHaveBeenCalledWith('suppliers', null)
  })

  it('tracks and clears deleted tombstones', async () => {
    const { useSyncEngine } = await import('../syncEngine.js')
    const syncEngine = useSyncEngine()

    syncEngine.recordDeletedId('customers', 'c1')
    syncEngine.recordDeletedIds('customers', ['c2', 'c3'])

    expect(syncEngine.isDeletedId('customers', 'c1')).toBe(true)
    expect(syncEngine.isDeletedId('customers', 'c2')).toBe(true)
    expect(syncEngine.isDeletedId('customers', 'c3')).toBe(true)

    syncEngine.clearDeletedId('customers', 'c2')

    expect(syncEngine.isDeletedId('customers', 'c2')).toBe(false)
    expect(syncEngine.isDeletedId('customers', 'c1')).toBe(true)
  })
})
