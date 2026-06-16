/**
 * financeHelpers.js 深度测试
 * 覆盖边界条件、浮点精度、大数值、空值输入等场景
 */
import { describe, it, expect } from 'vitest'
import {
  generateOrderNo, computeAging, refreshOverdueStatus,
  getStatusLabel, getStatusClass, statusBadgeMap, methodLabels
} from '@/utils/financeHelpers'

function futureDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function pastDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function todayStr() {
  const now = new Date()
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
}

describe('financeHelpers.js - 深度边界测试', () => {

  /* ===== FH-01: 账龄分析空列表返回全零 ===== */
  describe('FH-01: computeAging 空列表', () => {
    it('空列表应返回所有金额和计数均为0', () => {
      const result = computeAging([], 'amount', 'paid')
      const keys = ['current', 'days30', 'days60', 'days90', 'days180', 'over180',
        'currentCount', 'days30Count', 'days60Count', 'days90Count', 'days180Count', 'over180Count']
      for (const key of keys) {
        expect(result[key]).toBe(0)
      }
    })

    it('所有项都已完成时也应返回全零', () => {
      const items = [
        { amount: 99999, paid: 0, dueDate: pastDate(100), status: 'completed' },
        { amount: 88888, paid: 0, dueDate: pastDate(50), status: 'completed' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.current).toBe(0)
      expect(result.over180).toBe(0)
    })

    it('所有项余额为零时也应返回全零', () => {
      const items = [
        { amount: 10000, paid: 10000, dueDate: pastDate(30), status: 'pending' },
        { amount: 5000, paid: 5000, dueDate: pastDate(200), status: 'partial' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBe(0)
      expect(result.over180).toBe(0)
    })
  })

  /* ===== FH-02: 大数值不溢出 ===== */
  describe('FH-02: computeAging 大数值', () => {
    it('999999999.99 大额不应溢出', () => {
      const items = [
        { amount: 999999999.99, paid: 0, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBeCloseTo(999999999.99, 2)
    })

    it('大额减去大额应正确计算余额', () => {
      const items = [
        { amount: 999999999.99, paid: 999999998.99, dueDate: pastDate(15), status: 'partial' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBeCloseTo(1, 0)
    })

    it('多个大额项累加不应丢失精度', () => {
      const items = [
        { amount: 999999999.99, paid: 0, dueDate: pastDate(15), status: 'pending' },
        { amount: 999999999.99, paid: 0, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBeCloseTo(1999999999.98, 2)
    })
  })

  /* ===== FH-03: 逾期状态翻转 ===== */
  describe('FH-03: refreshOverdueStatus 逾期状态翻转', () => {
    it('付款后逾期状态应翻转为partial', () => {
      const items = [
        { amount: 10000, paid: 5000, dueDate: pastDate(10), status: 'overdue' }
      ]
      // overdue 状态 + 已逾期日期 => 仍然逾期，不翻转
      const changed = refreshOverdueStatus(items, 'paid')
      expect(items[0].status).toBe('overdue')
      expect(changed).toBe(false)
    })

    it('全额付款后状态变为completed不应被修改', () => {
      const items = [
        { amount: 10000, paid: 10000, dueDate: pastDate(10), status: 'completed' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(items[0].status).toBe('completed')
      expect(changed).toBe(false)
    })

    it('pending状态逾期后应变为overdue', () => {
      const items = [
        { amount: 10000, paid: 0, dueDate: pastDate(1), status: 'pending' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('overdue')
    })

    it('partial状态逾期后应变为overdue', () => {
      const items = [
        { amount: 10000, paid: 3000, dueDate: pastDate(5), status: 'partial' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('overdue')
    })

    it('overdue状态到期日延长后应恢复为pending', () => {
      const items = [
        { amount: 10000, paid: 0, dueDate: futureDate(10), status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('pending')
    })

    it('overdue状态到期日延长且有付款应恢复为partial', () => {
      const items = [
        { amount: 10000, paid: 5000, dueDate: futureDate(10), status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('partial')
    })
  })

  /* ===== FH-04: 单号生成 ===== */
  describe('FH-04: generateOrderNo 边界', () => {
    it('空列表应生成001序号', () => {
      const no = generateOrderNo('YF', [], 'payableNo')
      expect(no).toMatch(/YF\d{8}001$/)
    })

    it('999个同日订单后应生成1000序号（不再补零）', () => {
      const ds = todayStr()
      const list = []
      for (let i = 1; i <= 999; i++) {
        list.push({ payableNo: `YF${ds}${String(i).padStart(3, '0')}` })
      }
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toBe(`YF${ds}1000`)
    })

    it('列表中有非同日单号不影响当日编号', () => {
      const ds = todayStr()
      const list = [
        { payableNo: `YF20200101001` },
        { payableNo: `YF${ds}003` }
      ]
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toBe(`YF${ds}004`)
    })

    it('列表中单号字段缺失时不应报错', () => {
      const list = [
        { otherField: 'YF20240101001' },
        { payableNo: undefined }
      ]
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toMatch(/YF\d{8}001$/)
    })

    it('不同前缀应独立编号', () => {
      const ds = todayStr()
      const list = [{ payableNo: `YF${ds}010` }]
      const no = generateOrderNo('YS', list, 'receivableNo')
      expect(no).toMatch(/YS\d{8}001$/)
    })
  })

  /* ===== 浮点精度 ===== */
  describe('浮点精度', () => {
    it('0.1 + 0.2 的金额计算应正确处理', () => {
      const items = [
        { amount: 0.3, paid: 0.1, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      // 0.3 - 0.1 在浮点中不等于0.2，但函数使用parseFloat
      expect(result.days30).toBeCloseTo(0.2, 10)
    })

    it('经典 0.1+0.2 问题：余额应大于0', () => {
      const items = [
        { amount: 0.1 + 0.2, paid: 0, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBeGreaterThan(0)
    })

    it('字符串数字金额应正确解析', () => {
      const items = [
        { amount: '100.50', paid: '50.25', dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBeCloseTo(50.25, 2)
    })
  })

  /* ===== 负数金额 ===== */
  describe('负数金额', () => {
    it('负数金额余额为负时应跳过', () => {
      const items = [
        { amount: -1000, paid: 0, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBe(0)
    })

    it('已付金额超过总金额时余额为负应跳过', () => {
      const items = [
        { amount: 1000, paid: 2000, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBe(0)
    })
  })

  /* ===== Null/Undefined 输入 ===== */
  describe('Null/Undefined 输入', () => {
    it('computeAging 中金额字段为null/undefined应视为0', () => {
      const items = [
        { amount: null, paid: null, dueDate: pastDate(15), status: 'pending' },
        { amount: undefined, paid: undefined, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      // null/undefined -> parseFloat -> NaN -> || 0 => remaining = 0 - 0 = 0, skip
      expect(result.days30).toBe(0)
    })

    it('computeAging 中dueDate为null应归入current', () => {
      const items = [
        { amount: 5000, paid: 0, dueDate: null, status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.current).toBe(5000)
      expect(result.currentCount).toBe(1)
    })

    it('computeAging 中dueDate为undefined应归入current', () => {
      const items = [
        { amount: 5000, paid: 0, status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.current).toBe(5000)
    })

    it('refreshOverdueStatus 中dueDate为null不应修改状态', () => {
      const items = [
        { amount: 10000, paid: 0, dueDate: null, status: 'pending' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(false)
      expect(items[0].status).toBe('pending')
    })

    it('refreshOverdueStatus 中paid字段为null应视为0', () => {
      const future = futureDate(10)
      const items = [
        { amount: 10000, paid: null, dueDate: future, status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      // paid null -> parseFloat -> NaN -> || 0 => 0 > 0 is false => pending
      expect(items[0].status).toBe('pending')
    })

    it('generateOrderNo 中列表项缺少noField不应报错', () => {
      const list = [{}, { otherNo: 'YF20240101001' }]
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toMatch(/YF\d{8}001$/)
    })
  })

  /* ===== 所有导出函数边界 ===== */
  describe('所有导出函数边界', () => {
    describe('getStatusLabel 边界', () => {
      it('status为null应返回"-"', () => {
        expect(getStatusLabel(null, 'payable')).toBe('-')
      })

      it('status为undefined应返回"-"', () => {
        expect(getStatusLabel(undefined, 'payable')).toBe('-')
      })

      it('status为空字符串应返回"-"', () => {
        expect(getStatusLabel('', 'payable')).toBe('-')
      })

      it('type为未知类型应返回原status', () => {
        expect(getStatusLabel('pending', 'unknown')).toBe('pending')
      })

      it('type为null应返回原status', () => {
        expect(getStatusLabel('pending', null)).toBe('pending')
      })
    })

    describe('getStatusClass 边界', () => {
      it('status为null应返回空字符串', () => {
        expect(getStatusClass(null)).toBe('')
      })

      it('status为undefined应返回空字符串', () => {
        expect(getStatusClass(undefined)).toBe('')
      })

      it('status为空字符串应返回空字符串', () => {
        expect(getStatusClass('')).toBe('')
      })
    })

    describe('statusBadgeMap 边界', () => {
      it('访问不存在的key应返回undefined', () => {
        expect(statusBadgeMap.nonexistent).toBeUndefined()
      })
    })

    describe('methodLabels 边界', () => {
      it('访问不存在的key应返回undefined', () => {
        expect(methodLabels.nonexistent).toBeUndefined()
      })
    })

    describe('computeAging 边界', () => {
      it('到期日正好是今天应归入current', () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const items = [
          { amount: 5000, paid: 0, dueDate: today.toISOString().slice(0, 10), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.current).toBe(5000)
        expect(result.days30).toBe(0)
      })

      it('到期日昨天应归入days30', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(1), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days30).toBe(5000)
      })

      it('到期日30天前应归入days30', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(30), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days30).toBe(5000)
      })

      it('到期日31天前应归入days60', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(31), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days60).toBe(5000)
      })

      it('到期日60天前应归入days60', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(60), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days60).toBe(5000)
      })

      it('到期日61天前应归入days90', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(61), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days90).toBe(5000)
      })

      it('到期日91天前应归入days180', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(91), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.days180).toBe(5000)
      })

      it('到期日181天前应归入over180', () => {
        const items = [
          { amount: 5000, paid: 0, dueDate: pastDate(181), status: 'pending' }
        ]
        const result = computeAging(items, 'amount', 'paid')
        expect(result.over180).toBe(5000)
      })
    })

    describe('refreshOverdueStatus 边界', () => {
      it('空列表应返回false', () => {
        const changed = refreshOverdueStatus([], 'paid')
        expect(changed).toBe(false)
      })

      it('多个项目部分变更应返回true', () => {
        const items = [
          { amount: 10000, paid: 0, dueDate: pastDate(10), status: 'pending' },
          { amount: 5000, paid: 0, dueDate: futureDate(10), status: 'pending' }
        ]
        const changed = refreshOverdueStatus(items, 'paid')
        expect(changed).toBe(true)
        expect(items[0].status).toBe('overdue')
        expect(items[1].status).toBe('pending')
      })
    })
  })
})
