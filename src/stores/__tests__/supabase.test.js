import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const autoInitMock = vi.fn()
const initMock = vi.fn()
const isConnectedMock = vi.fn()
const subscribeMock = vi.fn()
const disconnectMock = vi.fn()
const syncToServerMock = vi.fn()
const syncFromServerMock = vi.fn()

vi.mock('@/lib/supabase.js', () => ({
  SupabaseClient: {
    autoInit: autoInitMock,
    init: initMock,
    isConnected: isConnectedMock,
    subscribe: subscribeMock,
    disconnect: disconnectMock
  }
}))

const getTableNameMock = vi.fn((resource) => `table_${resource}`)

vi.mock('@/services/api.js', () => ({
  API: {
    TABLE_MAP: {
      customers: 'customers',
      suppliers: 'suppliers',
      approvals: 'approvals',
      notifications: 'notifications'
    },
    getTableName: getTableNameMock,
    testConnection: vi.fn(),
    syncToServer: syncToServerMock,
    syncFromServer: syncFromServerMock
  }
}))

describe('supabase store sync wiring', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    localStorage.clear()
    isConnectedMock.mockReturnValue(true)
    initMock.mockResolvedValue({ ok: true })
    syncToServerMock.mockResolvedValue(true)
    syncFromServerMock.mockResolvedValue([])
  })

  it('restores saved config on successful auto connect', async () => {
    const rawKey = 'sb-secret'
    const cipherText = btoa(String.fromCharCode(...new Uint8Array(12), ...new TextEncoder().encode(rawKey)))

    localStorage.setItem('gj_erp_sb_url', 'https://demo.supabase.co')
    localStorage.setItem('gj_erp_sb_key', cipherText)
    autoInitMock.mockResolvedValue({ ok: true })

    const decryptSpy = vi.spyOn(globalThis.crypto.subtle, 'decrypt').mockResolvedValue(new TextEncoder().encode(rawKey))

    const { useSupabaseStore } = await import('../supabase.js')
    const store = useSupabaseStore()

    await expect(store.autoConnect()).resolves.toBe(true)
    expect(autoInitMock).toHaveBeenCalledTimes(1)
    expect(store.connected).toBe(true)
    expect(store.url).toBe('https://demo.supabase.co')
    expect(store.anonKey).toBe(rawKey)

    decryptSpy.mockRestore()
  })

  it('maps resource name before subscribing realtime', async () => {
    const { useSupabaseStore } = await import('../supabase.js')
    const store = useSupabaseStore()
    const callbacks = { onInsert: vi.fn() }

    store.subscribeRealtime('customers', callbacks)

    expect(getTableNameMock).toHaveBeenCalledWith('customers')
    expect(subscribeMock).toHaveBeenCalledWith('table_customers', callbacks)
  })

  it('uses managed sync resources for connection summary', async () => {
    const { useSupabaseStore } = await import('../supabase.js')
    const store = useSupabaseStore()

    await store.connect()
    await store.pushToServer('customers', [{ id: 1 }])
    await store.pushToServer('suppliers', [{ id: 2 }])

    expect(store.syncResources).toHaveLength(13)
    expect(store.connectionSummary).toBe('已连接 · 2/13 表已同步')
  })

  it('restores persisted sync status after reconnect', async () => {
    const { useSupabaseStore } = await import('../supabase.js')
    const firstStore = useSupabaseStore()

    await firstStore.connect()
    await firstStore.pushToServer('suppliers', [{ id: 1 }])
    expect(firstStore.syncStatus.suppliers).toBe('synced')

    setActivePinia(createPinia())
    const secondStore = useSupabaseStore()

    await secondStore.connect()

    expect(secondStore.syncStatus.suppliers).toBe('synced')
    expect(secondStore.connectionSummary).toBe('已连接 · 1/13 表已同步')
  })

  it('clears persisted sync status on disconnect', async () => {
    const { useSupabaseStore } = await import('../supabase.js')
    const store = useSupabaseStore()

    await store.connect()
    await store.pushToServer('suppliers', [{ id: 1 }])

    store.disconnect()

    expect(localStorage.getItem('gj_erp_sb_sync_status')).toBeNull()
    expect(store.syncStatus).toEqual({})
  })
})
