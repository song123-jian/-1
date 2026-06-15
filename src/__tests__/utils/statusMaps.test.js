/**
 * 状态映射工具测试
 * 覆盖报价、合同、送货、回款的状态标签和样式映射
 */
import { describe, it, expect } from 'vitest'
import {
  quoteStatusLabel, quoteStatusClass,
  contractStatusLabel, contractStatusClass,
  deliveryStatusLabel, deliveryStatusClass,
  collectionStatusLabel, collectionStatusClass,
  collectionMethodLabel
} from '@/utils/statusMaps'

describe('statusMaps.js - 状态映射工具', () => {

  /* ===== 报价状态 ===== */
  describe('报价状态映射', () => {
    it('quoteStatusLabel 应返回正确的中文标签', () => {
      expect(quoteStatusLabel('draft')).toBe('草稿')
      expect(quoteStatusLabel('pending')).toBe('待审')
      expect(quoteStatusLabel('sent')).toBe('已发送')
      expect(quoteStatusLabel('accepted')).toBe('已接受')
      expect(quoteStatusLabel('approved')).toBe('已批准')
      expect(quoteStatusLabel('rejected')).toBe('已拒绝')
      expect(quoteStatusLabel('expired')).toBe('已过期')
    })

    it('quoteStatusLabel 未知状态应返回原值', () => {
      expect(quoteStatusLabel('unknown')).toBe('unknown')
    })

    it('quoteStatusLabel 空值应返回"-"', () => {
      expect(quoteStatusLabel('')).toBe('-')
      expect(quoteStatusLabel(null)).toBe('-')
      expect(quoteStatusLabel(undefined)).toBe('-')
    })

    it('quoteStatusClass 应返回正确的CSS类名', () => {
      expect(quoteStatusClass('draft')).toBe('status-draft')
      expect(quoteStatusClass('pending')).toBe('status-pending')
      expect(quoteStatusClass('approved')).toBe('status-approved')
    })

    it('quoteStatusClass 未知状态应返回空字符串', () => {
      expect(quoteStatusClass('unknown')).toBe('')
    })
  })

  /* ===== 合同状态 ===== */
  describe('合同状态映射', () => {
    it('contractStatusLabel 应返回正确的中文标签', () => {
      expect(contractStatusLabel('draft')).toBe('草稿')
      expect(contractStatusLabel('pending_approval')).toBe('待审批')
      expect(contractStatusLabel('approved')).toBe('已审批')
      expect(contractStatusLabel('signed')).toBe('已签订')
      expect(contractStatusLabel('active')).toBe('执行中')
      expect(contractStatusLabel('completed')).toBe('已完成')
      expect(contractStatusLabel('archived')).toBe('已归档')
      expect(contractStatusLabel('cancelled')).toBe('已作废')
      expect(contractStatusLabel('expired')).toBe('已过期')
      expect(contractStatusLabel('terminated')).toBe('已终止')
    })

    it('contractStatusLabel 未知状态应返回原值', () => {
      expect(contractStatusLabel('unknown')).toBe('unknown')
    })

    it('contractStatusClass 应返回正确的CSS类名', () => {
      expect(contractStatusClass('draft')).toBe('status-draft')
      expect(contractStatusClass('signed')).toBe('status-accepted')
      expect(contractStatusClass('completed')).toBe('status-success')
      expect(contractStatusClass('cancelled')).toBe('status-rejected')
    })
  })

  /* ===== 送货状态 ===== */
  describe('送货状态映射', () => {
    it('deliveryStatusLabel 应返回正确的中文标签', () => {
      expect(deliveryStatusLabel('created')).toBe('已创建')
      expect(deliveryStatusLabel('pending')).toBe('待发货')
      expect(deliveryStatusLabel('shipped')).toBe('已发货')
      expect(deliveryStatusLabel('transit')).toBe('运输中')
      expect(deliveryStatusLabel('received')).toBe('已签收')
      expect(deliveryStatusLabel('accepted')).toBe('已验收')
      expect(deliveryStatusLabel('partial')).toBe('部分签收')
      expect(deliveryStatusLabel('exception')).toBe('异常处理中')
      expect(deliveryStatusLabel('returned')).toBe('退回')
      expect(deliveryStatusLabel('cancelled')).toBe('已取消')
    })

    it('deliveryStatusClass 应返回正确的CSS类名', () => {
      expect(deliveryStatusClass('created')).toBe('status-draft')
      expect(deliveryStatusClass('shipped')).toBe('status-sent')
      expect(deliveryStatusClass('accepted')).toBe('status-approved')
    })
  })

  /* ===== 回款状态 ===== */
  describe('回款状态映射', () => {
    it('collectionStatusLabel 应返回正确的中文标签', () => {
      expect(collectionStatusLabel('pending')).toBe('待确认')
      expect(collectionStatusLabel('confirmed')).toBe('已确认')
      expect(collectionStatusLabel('completed')).toBe('已完成')
      expect(collectionStatusLabel('voided')).toBe('已作废')
    })

    it('collectionStatusClass 应返回正确的CSS类名', () => {
      expect(collectionStatusClass('pending')).toBe('status-pending')
      expect(collectionStatusClass('confirmed')).toBe('status-accepted')
      expect(collectionStatusClass('completed')).toBe('status-approved')
      expect(collectionStatusClass('voided')).toBe('status-rejected')
    })
  })

  /* ===== 回款方式 ===== */
  describe('回款方式映射', () => {
    it('collectionMethodLabel 应返回正确的中文标签', () => {
      expect(collectionMethodLabel('bank_transfer')).toBe('银行转账')
      expect(collectionMethodLabel('cash')).toBe('现金')
      expect(collectionMethodLabel('check')).toBe('支票')
      expect(collectionMethodLabel('wechat')).toBe('微信')
      expect(collectionMethodLabel('alipay')).toBe('支付宝')
      expect(collectionMethodLabel('other')).toBe('其他')
    })

    it('collectionMethodLabel 未知方式应返回原值', () => {
      expect(collectionMethodLabel('crypto')).toBe('crypto')
    })

    it('collectionMethodLabel 空值应返回"-"', () => {
      expect(collectionMethodLabel('')).toBe('-')
      expect(collectionMethodLabel(null)).toBe('-')
    })
  })
})
