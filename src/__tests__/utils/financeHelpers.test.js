/**
 * 财务辅助工具测试
 * 覆盖 generateOrderNo, computeAging, refreshOverdueStatus, getStatusLabel, getStatusClass, statusBadgeMap, methodLabels
 */
import { describe, it, expect } from 'vitest'
import {
  generateOrderNo, computeAging, refreshOverdueStatus,
  getStatusLabel, getStatusClass, statusBadgeMap, methodLabels
} from '@/utils/financeHelpers'

describe('financeHelpers.js - 财务辅助工具', () => {

  /* ===== generateOrderNo ===== */
  describe('generateOrderNo', () => {
    it('应生成正确格式的单号', () => {
      const list = []
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toMatch(/^YF\d{8}\d{3}$/)
    })

    it('应在已有单号基础上递增', () => {
      const today = new Date()
      const dateStr = today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0')
      const list = [{ payableNo: `YF${dateStr}005` }]
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toBe(`YF${dateStr}006`)
    })

    it('空列表应从001开始', () => {
      const no = generateOrderNo('YS', [], 'receivableNo')
      expect(no).toMatch(/YS\d{8}001$/)
    })

    it('不同前缀应独立编号', () => {
      const list = [{ payableNo: 'YF20240601001' }]
      const no = generateOrderNo('YS', list, 'receivableNo')
      expect(no).toMatch(/YS\d{8}001$/)
    })

    it('不同日期应独立编号', () => {
      const list = [{ payableNo: 'YF20230101099' }]
      const no = generateOrderNo('YF', list, 'payableNo')
      expect(no).toMatch(/YF\d{8}001$/)
    })
  })

  /* ===== computeAging ===== */
  describe('computeAging', () => {
    it('应正确计算账龄分布', () => {
      const now = new Date()
      const items = [
        { amount: 10000, paid: 0, dueDate: futureDate(10), status: 'pending' },   // current
        { amount: 20000, paid: 5000, dueDate: pastDate(15), status: 'partial' },   // days30
        { amount: 30000, paid: 0, dueDate: pastDate(45), status: 'pending' },      // days60
        { amount: 40000, paid: 0, dueDate: pastDate(75), status: 'pending' },      // days90
        { amount: 50000, paid: 0, dueDate: pastDate(120), status: 'pending' },     // days180
        { amount: 60000, paid: 0, dueDate: pastDate(200), status: 'pending' }      // over180
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.current).toBe(10000)
      expect(result.days30).toBe(15000) // 20000 - 5000
      expect(result.days60).toBe(30000)
      expect(result.days90).toBe(40000)
      expect(result.days180).toBe(50000)
      expect(result.over180).toBe(60000)
    })

    it('应跳过已完成的记录', () => {
      const items = [
        { amount: 10000, paid: 10000, dueDate: pastDate(30), status: 'completed' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBe(0)
    })

    it('应跳过余额为零的记录', () => {
      const items = [
        { amount: 10000, paid: 10000, dueDate: pastDate(30), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.days30).toBe(0)
    })

    it('无到期日期应归入current', () => {
      const items = [
        { amount: 5000, paid: 0, status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.current).toBe(5000)
    })

    it('空列表应返回全零', () => {
      const result = computeAging([], 'amount', 'paid')
      expect(result.current).toBe(0)
      expect(result.days30).toBe(0)
      expect(result.over180).toBe(0)
    })

    it('应正确计算Count', () => {
      const items = [
        { amount: 10000, paid: 0, dueDate: futureDate(10), status: 'pending' },
        { amount: 20000, paid: 0, dueDate: pastDate(15), status: 'pending' }
      ]
      const result = computeAging(items, 'amount', 'paid')
      expect(result.currentCount).toBe(1)
      expect(result.days30Count).toBe(1)
    })

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
  })

  /* ===== refreshOverdueStatus ===== */
  describe('refreshOverdueStatus', () => {
    it('应将过期未付款项标记为overdue', () => {
      const pastDate = (() => { const d = new Date(); d.setDate(d.getDate() - 10); return d.toISOString().slice(0, 10) })()
      const items = [
        { amount: 10000, paid: 0, dueDate: pastDate, status: 'pending' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('overdue')
    })

    it('不应修改已完成的记录', () => {
      const pastDate = (() => { const d = new Date(); d.setDate(d.getDate() - 10); return d.toISOString().slice(0, 10) })()
      const items = [
        { amount: 10000, paid: 10000, dueDate: pastDate, status: 'completed' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(false)
      expect(items[0].status).toBe('completed')
    })

    it('不再逾期时应恢复状态', () => {
      const futureDate = (() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().slice(0, 10) })()
      const items = [
        { amount: 10000, paid: 0, dueDate: futureDate, status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('pending')
    })

    it('不再逾期且有部分付款应恢复为partial', () => {
      const futureDate = (() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().slice(0, 10) })()
      const items = [
        { amount: 10000, paid: 5000, dueDate: futureDate, status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(true)
      expect(items[0].status).toBe('partial')
    })

    it('无变更时应返回false', () => {
      const pastDate = (() => { const d = new Date(); d.setDate(d.getDate() - 10); return d.toISOString().slice(0, 10) })()
      const items = [
        { amount: 10000, paid: 0, dueDate: pastDate, status: 'overdue' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(false)
    })

    it('无到期日期的记录不应被修改', () => {
      const items = [
        { amount: 10000, paid: 0, status: 'pending' }
      ]
      const changed = refreshOverdueStatus(items, 'paid')
      expect(changed).toBe(false)
      expect(items[0].status).toBe('pending')
    })
  })

  /* ===== getStatusLabel ===== */
  describe('getStatusLabel', () => {
    it('应付类型应返回正确的标签', () => {
      expect(getStatusLabel('pending', 'payable')).toBe('待付款')
      expect(getStatusLabel('partial', 'payable')).toBe('部分付款')
      expect(getStatusLabel('completed', 'payable')).toBe('已付完')
      expect(getStatusLabel('overdue', 'payable')).toBe('已逾期')
    })

    it('应收类型应返回正确的标签', () => {
      expect(getStatusLabel('pending', 'receivable')).toBe('待收款')
      expect(getStatusLabel('partial', 'receivable')).toBe('部分收款')
      expect(getStatusLabel('completed', 'receivable')).toBe('已收完')
      expect(getStatusLabel('overdue', 'receivable')).toBe('已逾期')
    })

    it('未知状态应返回原值', () => {
      expect(getStatusLabel('unknown', 'payable')).toBe('unknown')
    })

    it('默认类型为payable', () => {
      expect(getStatusLabel('pending')).toBe('待付款')
    })
  })

  /* ===== getStatusClass ===== */
  describe('getStatusClass', () => {
    it('应返回正确的CSS类名', () => {
      expect(getStatusClass('pending')).toBe('status-pending')
      expect(getStatusClass('partial')).toBe('status-partial')
      expect(getStatusClass('completed')).toBe('status-completed')
      expect(getStatusClass('overdue')).toBe('status-overdue')
    })

    it('未知状态应返回空字符串', () => {
      expect(getStatusClass('unknown')).toBe('')
    })
  })

  /* ===== 常量映射 ===== */
  describe('常量映射', () => {
    it('statusBadgeMap 应包含正确的徽章类型', () => {
      expect(statusBadgeMap.pending).toBe('warning')
      expect(statusBadgeMap.partial).toBe('info')
      expect(statusBadgeMap.completed).toBe('success')
      expect(statusBadgeMap.overdue).toBe('danger')
    })

    it('methodLabels 应包含正确的付款方式标签', () => {
      expect(methodLabels.bank).toBe('银行转账')
      expect(methodLabels.cash).toBe('现金')
      expect(methodLabels.check).toBe('支票')
      expect(methodLabels.other).toBe('其他')
    })
  })
})
