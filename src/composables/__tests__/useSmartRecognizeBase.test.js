import { describe, it, expect, vi } from 'vitest'
import { useSmartRecognizeBase, makeItem, parseTableText } from '../useSmartRecognizeBase'

describe('useSmartRecognizeBase', () => {
  it('applies recognized values to matching keys', async () => {
    const form = { name: '', nested: { code: '' } }
    const parseFn = vi.fn(() => ({
      items: [makeItem('name', '名称', 'Acme', 90), makeItem('nested.code', '编码', 'X1', 90)],
      identifiedCount: 2,
      lowConfCount: 0
    }))

    const api = useSmartRecognizeBase(form, parseFn)
    api.smartRecInput.value = 'demo'
    api.runSmartRecognize()
    api.applySmartRecognize()

    expect(form.name).toBe('Acme')
    expect(form.nested.code).toBe('X1')
  })

  it('parses table text', () => {
    const rows = parseTableText('编号,名称\n001,物料A', [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' }
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].code).toBe('001')
  })
})
