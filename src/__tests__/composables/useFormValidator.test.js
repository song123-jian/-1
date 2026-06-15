/**
 * 表单校验组合式函数测试
 * 覆盖必填项检测、价格异常检测、日期逻辑校验、金额校验
 */
import { describe, it, expect } from 'vitest'
import { ref, reactive } from 'vue'
import { useFormValidator } from '@/composables/useFormValidator'

describe('useFormValidator - 表单校验', () => {

  /* ===== 必填项检测 ===== */
  describe('必填项检测', () => {
    it('应检测空字符串必填项', () => {
      const form = reactive({ name: '', phone: '123' })
      const { validate, errors } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }]
      })
      const result = validate()
      expect(result).toBe(false)
      expect(errors.value).toHaveLength(1)
      expect(errors.value[0].field).toBe('name')
      expect(errors.value[0].message).toContain('必填项')
    })

    it('应检测null/undefined必填项', () => {
      const form = reactive({ name: null, value: undefined })
      const { validate, errors } = useFormValidator(form, {
        required: [
          { key: 'name', label: '姓名' },
          { key: 'value', label: '数值' }
        ]
      })
      validate()
      expect(errors.value).toHaveLength(2)
    })

    it('应检测空数组必填项', () => {
      const form = reactive({ items: [] })
      const { validate, errors } = useFormValidator(form, {
        required: [{ key: 'items', label: '明细' }]
      })
      validate()
      expect(errors.value).toHaveLength(1)
    })

    it('有值的必填项不应报错', () => {
      const form = reactive({ name: '测试', phone: '123' })
      const { validate, errors } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }]
      })
      const result = validate()
      expect(result).toBe(true)
      expect(errors.value).toHaveLength(0)
    })

    it('数字0不应被视为空', () => {
      const form = reactive({ quantity: 0 })
      const { validate, errors } = useFormValidator(form, {
        required: [{ key: 'quantity', label: '数量' }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
    })
  })

  /* ===== 价格异常检测 ===== */
  describe('价格异常检测', () => {
    it('价格超出历史均价阈值应产生警告', () => {
      const form = reactive({ unitPrice: 200 })
      const { validate, warnings } = useFormValidator(form, {
        priceCheck: {
          priceField: 'unitPrice',
          historyPrices: [100, 105, 95, 100],
          threshold: 0.2
        }
      })
      validate()
      expect(warnings.value.length).toBeGreaterThan(0)
      expect(warnings.value[0].type).toBe('price')
      expect(warnings.value[0].message).toContain('超出历史均价')
    })

    it('价格在正常范围内不应产生警告', () => {
      const form = reactive({ unitPrice: 105 })
      const { validate, warnings } = useFormValidator(form, {
        priceCheck: {
          priceField: 'unitPrice',
          historyPrices: [100, 105, 95, 100],
          threshold: 0.2
        }
      })
      validate()
      const priceWarnings = warnings.value.filter(w => w.type === 'price')
      expect(priceWarnings).toHaveLength(0)
    })

    it('无历史价格不应产生警告', () => {
      const form = reactive({ unitPrice: 200 })
      const { validate, warnings } = useFormValidator(form, {
        priceCheck: {
          priceField: 'unitPrice',
          historyPrices: [],
          threshold: 0.2
        }
      })
      validate()
      const priceWarnings = warnings.value.filter(w => w.type === 'price')
      expect(priceWarnings).toHaveLength(0)
    })

    it('价格字段为空不应检测', () => {
      const form = reactive({ unitPrice: null })
      const { validate, warnings } = useFormValidator(form, {
        priceCheck: {
          priceField: 'unitPrice',
          historyPrices: [100, 105],
          threshold: 0.2
        }
      })
      validate()
      const priceWarnings = warnings.value.filter(w => w.type === 'price')
      expect(priceWarnings).toHaveLength(0)
    })

    it('应支持自定义阈值', () => {
      const form = reactive({ unitPrice: 150 })
      const { validate, warnings } = useFormValidator(form, {
        priceCheck: {
          priceField: 'unitPrice',
          historyPrices: [100],
          threshold: 0.1 // 10%阈值
        }
      })
      validate()
      expect(warnings.value.some(w => w.type === 'price')).toBe(true)
    })
  })

  /* ===== 日期逻辑校验 ===== */
  describe('日期逻辑校验', () => {
    it('结束日期早于开始日期应报错', () => {
      const form = reactive({ startDate: '2024-12-31', endDate: '2024-01-01' })
      const { validate, errors } = useFormValidator(form, {
        dateCheck: [{ startField: 'startDate', endField: 'endDate', message: '结束日期不能早于开始日期' }]
      })
      validate()
      expect(errors.value).toHaveLength(1)
      expect(errors.value[0].message).toContain('结束日期不能早于开始日期')
    })

    it('结束日期等于开始日期不应报错', () => {
      const form = reactive({ startDate: '2024-06-15', endDate: '2024-06-15' })
      const { validate, errors } = useFormValidator(form, {
        dateCheck: [{ startField: 'startDate', endField: 'endDate' }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
    })

    it('结束日期晚于开始日期不应报错', () => {
      const form = reactive({ startDate: '2024-01-01', endDate: '2024-12-31' })
      const { validate, errors } = useFormValidator(form, {
        dateCheck: [{ startField: 'startDate', endField: 'endDate' }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
    })

    it('日期字段为空不应检测', () => {
      const form = reactive({ startDate: '', endDate: '' })
      const { validate, errors } = useFormValidator(form, {
        dateCheck: [{ startField: 'startDate', endField: 'endDate' }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
    })

    it('应支持自定义错误消息', () => {
      const form = reactive({ startDate: '2024-12-01', endDate: '2024-01-01' })
      const { validate, errors } = useFormValidator(form, {
        dateCheck: [{ startField: 'startDate', endField: 'endDate', message: '交货日期无效' }]
      })
      validate()
      expect(errors.value[0].message).toBe('交货日期无效')
    })
  })

  /* ===== 金额校验 ===== */
  describe('金额校验', () => {
    it('负数金额应报错', () => {
      const form = reactive({ amount: -100 })
      const { validate, errors } = useFormValidator(form, {
        amountCheck: [{ field: 'amount', label: '金额' }]
      })
      validate()
      expect(errors.value).toHaveLength(1)
      expect(errors.value[0].message).toContain('不能为负数')
    })

    it('超出最大值应产生警告', () => {
      const form = reactive({ amount: 200000 })
      const { validate, warnings } = useFormValidator(form, {
        amountCheck: [{ field: 'amount', label: '金额', max: 100000 }]
      })
      validate()
      expect(warnings.value.some(w => w.type === 'amount')).toBe(true)
    })

    it('正常金额不应报错或警告', () => {
      const form = reactive({ amount: 50000 })
      const { validate, errors, warnings } = useFormValidator(form, {
        amountCheck: [{ field: 'amount', label: '金额', max: 100000 }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
      expect(warnings.value.filter(w => w.type === 'amount')).toHaveLength(0)
    })

    it('零金额不应报错', () => {
      const form = reactive({ amount: 0 })
      const { validate, errors } = useFormValidator(form, {
        amountCheck: [{ field: 'amount', label: '金额' }]
      })
      validate()
      expect(errors.value).toHaveLength(0)
    })
  })

  /* ===== 组合校验 ===== */
  describe('组合校验', () => {
    it('应同时检测多种规则', () => {
      const form = reactive({ name: '', unitPrice: 500, startDate: '2024-12-01', endDate: '2024-01-01' })
      const { validate, errors, warnings } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }],
        priceCheck: { priceField: 'unitPrice', historyPrices: [100], threshold: 0.2 },
        dateCheck: [{ startField: 'startDate', endField: 'endDate' }]
      })
      validate()
      expect(errors.value.length).toBeGreaterThanOrEqual(2) // 必填 + 日期
      expect(warnings.value.length).toBeGreaterThanOrEqual(1) // 价格
    })
  })

  /* ===== clearWarnings / hasErrors / hasWarnings ===== */
  describe('clearWarnings / hasErrors / hasWarnings', () => {
    it('clearWarnings 应清空所有警告和错误', () => {
      const form = reactive({ name: '' })
      const { validate, errors, warnings, clearWarnings } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }]
      })
      validate()
      expect(errors.value.length).toBeGreaterThan(0)
      clearWarnings()
      expect(errors.value).toHaveLength(0)
      expect(warnings.value).toHaveLength(0)
    })

    it('hasErrors 应正确反映错误状态', () => {
      const form = reactive({ name: '' })
      const { validate, hasErrors } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }]
      })
      validate()
      expect(hasErrors.value).toBe(true)
    })

    it('hasWarnings 应正确反映警告状态', () => {
      const form = reactive({ unitPrice: 500 })
      const { validate, hasWarnings } = useFormValidator(form, {
        priceCheck: { priceField: 'unitPrice', historyPrices: [100], threshold: 0.2 }
      })
      validate()
      expect(hasWarnings.value).toBe(true)
    })
  })

  /* ===== ref 表单支持 ===== */
  describe('ref表单支持', () => {
    it('应支持ref包裹的表单对象', () => {
      const form = ref({ name: '' })
      const { validate, errors } = useFormValidator(form, {
        required: [{ key: 'name', label: '姓名' }]
      })
      validate()
      expect(errors.value).toHaveLength(1)
    })
  })
})
