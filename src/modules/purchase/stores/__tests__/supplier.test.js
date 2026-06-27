import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSupplierStore } from '../supplier.js'

describe('supplier store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('previews the next supplier code based on existing monthly sequence', () => {
    const store = useSupplierStore()
    const now = new Date()
    const prefix = `SUP${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

    store.replaceData([
      { id: 's1', code: `${prefix}001` },
      { id: 's2', code: `${prefix}009` },
      { id: 's3', code: 'SUP202401005' }
    ])

    expect(store.previewNextSupplierCode()).toBe(`${prefix}010`)
  })
})
