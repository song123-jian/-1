import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import dataService from '../dataService'
import { useSessionStore } from '@/stores/session'
import { usePermissionStore } from '@/stores/permission'

function createStoreDouble() {
  return {
    suppliers: [{ id: 's1', name: 'Supplier 1' }],
    updateSupplier: vi.fn(),
    addSupplier: vi.fn(),
    deleteSupplier: vi.fn()
  }
}

describe('dataService permission guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('blocks supplier update when role only has inbound permission', async () => {
    const sessionStore = useSessionStore()
    const permissionStore = usePermissionStore()
    const storeDouble = createStoreDouble()

    sessionStore.selectRole('仓管员')
    permissionStore.setPerm('仓管员', 'inbound', 'inboundEdit', true)
    permissionStore.setPerm('仓管员', 'supplier', 'supplierEdit', false)

    dataService.registerStore('supplier', storeDouble)

    const result = await dataService.update('supplier', 's1', { name: 'Blocked' })

    expect(result.success).toBe(false)
    expect(storeDouble.updateSupplier).not.toHaveBeenCalled()
  })

  it('allows supplier update when exact supplier permission exists', async () => {
    const sessionStore = useSessionStore()
    const permissionStore = usePermissionStore()
    const storeDouble = createStoreDouble()

    sessionStore.selectRole('仓管员')
    permissionStore.setPerm('仓管员', 'supplier', 'supplierEdit', true)

    dataService.registerStore('supplier', storeDouble)

    const result = await dataService.update('supplier', 's1', { name: 'Allowed' })

    expect(result.success).toBe(true)
    expect(storeDouble.updateSupplier).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'Allowed' }))
  })

  it('blocks batch update without exact module permission', async () => {
    const sessionStore = useSessionStore()
    const permissionStore = usePermissionStore()
    const storeDouble = createStoreDouble()

    sessionStore.selectRole('仓管员')
    permissionStore.setPerm('仓管员', 'supplier', 'supplierEdit', false)

    dataService.registerStore('supplier', storeDouble)

    const result = await dataService.batchUpdate('supplier', [{ id: 's1', updates: { name: 'Blocked' } }])

    expect(result.success).toBe(false)
    expect(storeDouble.updateSupplier).not.toHaveBeenCalled()
  })
})
