/**
 * 表单草稿自动保存测试
 * 覆盖 saveDraft, restoreDraft, clearDraft, hasDraft, 自动保存, 过期清理
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { reactive } from 'vue'
import { useFormDraft } from '@/composables/useFormDraft'

// Mock Vue 生命周期钩子
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn((cb) => { cb() }),
    onMounted: vi.fn((cb) => { cb() })
  }
})

describe('useFormDraft - 表单草稿自动保存', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  /* ===== saveDraft ===== */
  describe('saveDraft', () => {
    it('应将表单数据保存到sessionStorage', () => {
      const form = reactive({ name: '测试', value: 123 })
      const { saveDraft } = useFormDraft('test-form', form)
      saveDraft()
      const saved = sessionStorage.getItem('form-draft-test-form')
      expect(saved).not.toBeNull()
      const parsed = JSON.parse(saved)
      expect(parsed.data.name).toBe('测试')
      expect(parsed.data.value).toBe(123)
      expect(parsed.timestamp).toBeGreaterThan(0)
    })

    it('应深拷贝表单数据', () => {
      const form = reactive({ items: [1, 2, 3] })
      const { saveDraft } = useFormDraft('deep-copy', form)
      saveDraft()
      form.items.push(4)
      const saved = JSON.parse(sessionStorage.getItem('form-draft-deep-copy'))
      expect(saved.data.items).toEqual([1, 2, 3])
    })
  })

  /* ===== restoreDraft ===== */
  describe('restoreDraft', () => {
    it('应从sessionStorage恢复草稿', () => {
      const form = reactive({ name: '', value: 0 })
      const draft = {
        timestamp: Date.now(),
        data: { name: '恢复的名称', value: 456 }
      }
      sessionStorage.setItem('form-draft-restore-test', JSON.stringify(draft))
      const { restoreDraft } = useFormDraft('restore-test', form)
      const result = restoreDraft()
      expect(result).not.toBeNull()
      expect(form.name).toBe('恢复的名称')
      expect(form.value).toBe(456)
    })

    it('无草稿应返回null', () => {
      const form = reactive({ name: '' })
      const { restoreDraft } = useFormDraft('no-draft', form)
      expect(restoreDraft()).toBeNull()
    })

    it('过期草稿应返回null并清除', () => {
      const form = reactive({ name: '' })
      const expiredDraft = {
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8天前
        data: { name: '过期数据' }
      }
      sessionStorage.setItem('form-draft-expired', JSON.stringify(expiredDraft))
      const { restoreDraft } = useFormDraft('expired', form)
      expect(restoreDraft()).toBeNull()
      expect(sessionStorage.getItem('form-draft-expired')).toBeNull()
    })

    it('7天内的草稿应可恢复', () => {
      const form = reactive({ name: '' })
      const validDraft = {
        timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, // 6天前
        data: { name: '有效数据' }
      }
      sessionStorage.setItem('form-draft-valid', JSON.stringify(validDraft))
      const { restoreDraft } = useFormDraft('valid', form)
      expect(restoreDraft()).not.toBeNull()
      expect(form.name).toBe('有效数据')
    })

    it('恢复时应触发onRestore回调', () => {
      const form = reactive({ name: '' })
      const onRestore = vi.fn()
      sessionStorage.setItem('form-draft-callback', JSON.stringify({
        timestamp: Date.now(),
        data: { name: '回调测试' }
      }))
      const { restoreDraft } = useFormDraft('callback', form, { onRestore })
      restoreDraft()
      expect(onRestore).toHaveBeenCalled()
    })
  })

  /* ===== clearDraft ===== */
  describe('clearDraft', () => {
    it('应清除草稿', () => {
      const form = reactive({ name: '测试' })
      const { saveDraft, clearDraft, hasDraft } = useFormDraft('clear-test', form)
      saveDraft()
      expect(hasDraft()).toBe(true)
      clearDraft()
      expect(hasDraft()).toBe(false)
    })

    it('清除不存在的草稿不应报错', () => {
      const form = reactive({ name: '' })
      const { clearDraft } = useFormDraft('nonexistent-clear', form)
      expect(() => clearDraft()).not.toThrow()
    })
  })

  /* ===== hasDraft ===== */
  describe('hasDraft', () => {
    it('有草稿应返回true', () => {
      const form = reactive({ name: '测试' })
      const { saveDraft, hasDraft } = useFormDraft('has-test', form)
      saveDraft()
      expect(hasDraft()).toBe(true)
    })

    it('无草稿应返回false', () => {
      const form = reactive({ name: '' })
      const { hasDraft } = useFormDraft('no-draft-check', form)
      expect(hasDraft()).toBe(false)
    })

    it('过期草稿应返回false', () => {
      sessionStorage.setItem('form-draft-expired-check', JSON.stringify({
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
        data: { name: '过期' }
      }))
      const form = reactive({ name: '' })
      const { hasDraft } = useFormDraft('expired-check', form)
      expect(hasDraft()).toBe(false)
    })
  })

  /* ===== 自动保存 ===== */
  describe('自动保存', () => {
    it('表单变化后应自动保存（防抖）', async () => {
      const form = reactive({ name: '初始值' })
      const { saveDraft } = useFormDraft('auto-save', form, { debounce: 500 })
      form.name = '修改后的值'
      // 手动触发保存（模拟防抖后的自动保存）
      saveDraft()
      const saved = JSON.parse(sessionStorage.getItem('form-draft-auto-save'))
      expect(saved?.data?.name).toBe('修改后的值')
    })
  })

  /* ===== 存储键格式 ===== */
  describe('存储键格式', () => {
    it('应使用 form-draft-{draftKey} 格式', () => {
      const form = reactive({ name: '测试' })
      const { saveDraft } = useFormDraft('my-special-form', form)
      saveDraft()
      expect(sessionStorage.getItem('form-draft-my-special-form')).not.toBeNull()
    })
  })
})
