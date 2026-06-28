import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildSmartCsvTemplate,
  buildSmartKeyValueTemplate,
  buildSmartTemplate,
  downloadSmartTemplateFile
} from '../useSmartRecognizeTemplate'

describe('useSmartRecognizeTemplate', () => {
  it('builds key-value template lines', () => {
    expect(buildSmartKeyValueTemplate(['客户', { label: '合同编号' }])).toBe('客户: \n合同编号: ')
  })

  it('builds csv template headers', () => {
    expect(buildSmartCsvTemplate([{ label: '编号' }, '名称'])).toBe('编号,名称')
  })

  it('builds combined template sections', () => {
    expect(buildSmartTemplate({ tableHeaders: ['编号'], fields: ['客户'] })).toBe('编号\n\n客户: ')
  })
})

describe('downloadSmartTemplateFile', () => {
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()
  const appendChild = vi.fn()
  const remove = vi.fn()
  const click = vi.fn()

  beforeEach(() => {
    globalThis.Blob = class Blob {
      constructor(parts, options) {
        this.parts = parts
        this.type = options?.type
      }
    }
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL
    document.body.appendChild = appendChild
    document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      rel: '',
      click,
      remove
    }))
  })

  it('downloads a csv template with bom', () => {
    downloadSmartTemplateFile('demo.csv', 'a,b')
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
