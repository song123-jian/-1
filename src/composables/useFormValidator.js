import { computed, ref, isRef, unref } from 'vue'

/**
 * 表单智能校验 composable
 * 提供价格异常提醒、必填项检测、日期逻辑校验
 * @param {Object|Ref} form - 响应式表单对象或ref
 * @param {Object} rules - 校验规则
 * @returns {Object} { warnings, errors, validate, clearWarnings }
 */
export function useFormValidator(form, rules = {}) {
  const warnings = ref([])
  const errors = ref([])

  function getForm() {
    return unref(form)
  }

  function validate() {
    warnings.value = []
    errors.value = []
    const f = getForm()

    // 必填项检测
    if (rules.required) {
      for (const field of rules.required) {
        const val = f[field.key]
        const isEmpty = val === '' || val === null || val === undefined || (Array.isArray(val) && val.length === 0)
        if (isEmpty) {
          errors.value.push({ field: field.key, message: field.label + '为必填项' })
        }
      }
    }

    // 价格异常检测
    if (rules.priceCheck && f[rules.priceCheck.priceField]) {
      const currentPrice = parseFloat(f[rules.priceCheck.priceField])
      const history = rules.priceCheck.historyPrices || []
      if (history.length > 0) {
        const avg = history.reduce((a, b) => a + b, 0) / history.length
        const diff = Math.abs(currentPrice - avg) / avg
        if (diff > (rules.priceCheck.threshold || 0.2)) {
          warnings.value.push({
            field: rules.priceCheck.priceField,
            message: `当前单价 ${currentPrice} 超出历史均价 ${avg.toFixed(2)} 的 ${(diff * 100).toFixed(0)}%，请确认`,
            type: 'price'
          })
        }
      }
    }

    // 日期逻辑校验
    if (rules.dateCheck) {
      for (const check of rules.dateCheck) {
        const start = f[check.startField]
        const end = f[check.endField]
        if (start && end && new Date(start) > new Date(end)) {
          errors.value.push({
            field: check.endField,
            message: check.message || '结束日期不能早于开始日期'
          })
        }
      }
    }

    // 金额校验
    if (rules.amountCheck) {
      for (const check of rules.amountCheck) {
        const val = parseFloat(f[check.field])
        if (!isNaN(val) && val < 0) {
          errors.value.push({ field: check.field, message: check.label + '不能为负数' })
        }
        if (!isNaN(val) && check.max && val > check.max) {
          warnings.value.push({
            field: check.field,
            message: `${check.label} ${val} 超出常见范围（>${check.max}），请确认`,
            type: 'amount'
          })
        }
      }
    }

    return errors.value.length === 0
  }

  function clearWarnings() {
    warnings.value = []
    errors.value = []
  }

  const hasErrors = computed(() => errors.value.length > 0)
  const hasWarnings = computed(() => warnings.value.length > 0)

  return {
    warnings,
    errors,
    hasErrors,
    hasWarnings,
    validate,
    clearWarnings
  }
}
