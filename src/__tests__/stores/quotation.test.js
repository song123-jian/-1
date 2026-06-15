/**
 * 报价单 Store 综合测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { createQuotation, createQuotations, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== mock 外部依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ roleName: '测试用户' })
}))

/* ===== 常量 ===== */
const STORAGE_KEY = 'gj_erp_quotations'
const TEMPLATE_KEY = 'gj_erp_quoteTemplates'
const VERSION_PREFIX = 'gj_erp_quoteVersions_'
const INIT_KEY = 'gj_erp_quotations_initialized'

/* ===== 辅助：从 localStorage 读取 JSON（需加 gj_erp_ 前缀，与 StorageManager 一致） ===== */
import { safeGetJSON, safeGetItem } from '@/utils/storage'
function getStorageJSON(key) {
  return safeGetJSON(key)
}

describe('报价单 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useQuotationStore()
  })

  /* ================================================================
   * 一、正常流程：CRUD 操作
   * ================================================================ */
  describe('正常流程 - CRUD 操作', () => {
    it('addQuotation 应正确创建报价单并自动生成字段', () => {
      const q = store.addQuotation({ customerName: '测试客户A' })

      // 验证自动生成的字段
      expect(q.id).toBeTruthy()
      expect(q.id.startsWith('q')).toBe(true)
      expect(q.quoteNo).toMatch(/^QT\d{8}\d{3}$/) // QTYYYYMMDDNNN
      expect(q.status).toBe('draft')
      expect(q.taxRate).toBe(13)
      expect(q.customerName).toBe('测试客户A')
      expect(q.followUps).toEqual([])
      expect(q.createdAt).toBeTruthy()
      expect(q.date).toBeTruthy()
    })

    it('addQuotation 应允许覆盖默认值', () => {
      const q = store.addQuotation({
        customerName: '覆盖客户',
        taxRate: 6,
        total: 50000,
        status: 'pending'
      })
      expect(q.customerName).toBe('覆盖客户')
      expect(q.taxRate).toBe(6)
      expect(q.total).toBe(50000)
      // 注意：status 默认为 draft，但 data 展开在默认值之后，所以可覆盖
      expect(q.status).toBe('pending')
    })

    it('addQuotation 报价编号应自增', () => {
      const q1 = store.addQuotation()
      const q2 = store.addQuotation()
      // 两个报价单编号不同
      expect(q1.quoteNo).not.toBe(q2.quoteNo)
    })

    it('updateQuotation 应正确更新指定报价单', () => {
      const q = store.addQuotation({ customerName: '原始客户' })
      store.updateQuotation(q.id, { customerName: '更新客户', total: 99999 })

      const updated = store.getQuotationById(q.id)
      expect(updated.customerName).toBe('更新客户')
      expect(updated.total).toBe(99999)
    })

    it('updateQuotation 对不存在的 id 不应报错', () => {
      expect(() => {
        store.updateQuotation('non_existent_id', { customerName: '无影响' })
      }).not.toThrow()
    })

    it('deleteQuotation 应正确删除指定报价单', () => {
      const q = store.addQuotation()
      const q2 = store.addQuotation()
      store.deleteQuotation(q.id)

      expect(store.getQuotationById(q.id)).toBeNull()
      expect(store.getQuotationById(q2.id)).toBeTruthy()
      expect(store.quotations).toHaveLength(1)
    })

    it('batchDelete 应批量删除多个报价单', () => {
      const q1 = store.addQuotation()
      const q2 = store.addQuotation()
      const q3 = store.addQuotation()
      store.batchDelete([q1.id, q3.id])

      expect(store.quotations).toHaveLength(1)
      expect(store.getQuotationById(q2.id)).toBeTruthy()
    })

    it('getQuotationById 应返回对应报价单', () => {
      const q = store.addQuotation({ customerName: '查找客户' })
      const found = store.getQuotationById(q.id)
      expect(found).toBeTruthy()
      expect(found.customerName).toBe('查找客户')
    })

    it('getQuotationById 对不存在的 id 应返回 null', () => {
      expect(store.getQuotationById('non_existent')).toBeNull()
    })
  })

  /* ================================================================
   * 二、正常流程：状态转换与计算属性
   * ================================================================ */
  describe('正常流程 - 状态转换与计算属性', () => {
    it('changeStatus 应正确变更状态', () => {
      const q = store.addQuotation({ status: 'draft' })
      store.changeStatus(q.id, 'pending')

      expect(store.getQuotationById(q.id).status).toBe('pending')
    })

    it('changeStatus 应保存版本记录', () => {
      const q = store.addQuotation({ status: 'draft' })
      store.changeStatus(q.id, 'approved')

      const versions = store.getVersions(q.id)
      expect(versions.length).toBeGreaterThanOrEqual(1)
      expect(versions[versions.length - 1].changeNote).toContain('approved')
    })

    it('batchApprove 应批量审批 draft 和 pending 状态的报价单', () => {
      const q1 = store.addQuotation({ status: 'draft' })
      const q2 = store.addQuotation({ status: 'pending' })
      const q3 = store.addQuotation({ status: 'sent' })
      const q4 = store.addQuotation({ status: 'approved' })

      store.batchApprove([q1.id, q2.id, q3.id, q4.id])

      expect(store.getQuotationById(q1.id).status).toBe('approved')
      expect(store.getQuotationById(q2.id).status).toBe('approved')
      // sent 状态不被 batchApprove 审批（源码只审批 draft 和 pending）
      expect(store.getQuotationById(q3.id).status).toBe('sent')
      // 已审批的不受影响
      expect(store.getQuotationById(q4.id).status).toBe('approved')
    })

    it('batchApprove 不应审批 rejected 和 expired 状态的报价单', () => {
      const q1 = store.addQuotation({ status: 'rejected' })
      const q2 = store.addQuotation({ status: 'expired' })

      store.batchApprove([q1.id, q2.id])

      expect(store.getQuotationById(q1.id).status).toBe('rejected')
      expect(store.getQuotationById(q2.id).status).toBe('expired')
    })

    it('draftCount 应正确统计草稿数量', () => {
      store.addQuotation({ status: 'draft' })
      store.addQuotation({ status: 'draft' })
      store.addQuotation({ status: 'pending' })
      expect(store.draftCount).toBe(2)
    })

    it('pendingCount 应统计 pending 和 sent 状态', () => {
      store.addQuotation({ status: 'pending' })
      store.addQuotation({ status: 'sent' })
      store.addQuotation({ status: 'draft' })
      expect(store.pendingCount).toBe(2)
    })

    it('approvedCount 应正确统计已审批数量', () => {
      store.addQuotation({ status: 'approved' })
      store.addQuotation({ status: 'approved' })
      store.addQuotation({ status: 'draft' })
      expect(store.approvedCount).toBe(2)
    })

    it('acceptedCount 应正确统计已接受数量', () => {
      store.addQuotation({ status: 'accepted' })
      store.addQuotation({ status: 'accepted' })
      store.addQuotation({ status: 'accepted' })
      expect(store.acceptedCount).toBe(3)
    })

    it('rejectedCount 应正确统计已拒绝数量', () => {
      store.addQuotation({ status: 'rejected' })
      expect(store.rejectedCount).toBe(1)
    })

    it('expiredCount 应正确统计已过期数量', () => {
      store.addQuotation({ status: 'expired' })
      store.addQuotation({ status: 'expired' })
      expect(store.expiredCount).toBe(2)
    })

    it('totalAmount 应正确计算总金额', () => {
      store.addQuotation({ total: 10000 })
      store.addQuotation({ total: 20000 })
      store.addQuotation({ total: 30000 })
      expect(store.totalAmount).toBe(60000)
    })

    it('acceptedAmount 应只统计已接受报价的金额', () => {
      store.addQuotation({ status: 'accepted', total: 50000 })
      store.addQuotation({ status: 'draft', total: 30000 })
      store.addQuotation({ status: 'accepted', total: 20000 })
      expect(store.acceptedAmount).toBe(70000)
    })

    it('conversionRate 应正确计算转化率', () => {
      store.addQuotation({ status: 'accepted' })
      store.addQuotation({ status: 'accepted' })
      store.addQuotation({ status: 'draft' })
      store.addQuotation({ status: 'pending' })
      // 2/4 = 50%
      expect(store.conversionRate).toBe(50)
    })

    it('conversionRate 在无数据时应返回 0', () => {
      expect(store.conversionRate).toBe(0)
    })

    it('avgProfitMargin 应正确计算平均利润率', () => {
      store.addQuotation({ profitMargin: 20 })
      store.addQuotation({ profitMargin: 30 })
      expect(store.avgProfitMargin).toBe(25)
    })

    it('avgProfitMargin 无利润率数据时应返回 0', () => {
      store.addQuotation({ profitMargin: 0 })
      expect(store.avgProfitMargin).toBe(0)
    })

    it('avgQuoteAmount 应正确计算平均报价金额', () => {
      store.addQuotation({ total: 10000 })
      store.addQuotation({ total: 30000 })
      expect(store.avgQuoteAmount).toBe(20000)
    })

    it('avgQuoteAmount 无数据时应返回 0', () => {
      expect(store.avgQuoteAmount).toBe(0)
    })

    it('statusCounts 应返回各状态计数', () => {
      store.addQuotation({ status: 'draft' })
      store.addQuotation({ status: 'draft' })
      store.addQuotation({ status: 'pending' })
      store.addQuotation({ status: 'approved' })
      store.addQuotation({ status: 'accepted' })
      store.addQuotation({ status: 'rejected' })
      store.addQuotation({ status: 'expired' })
      store.addQuotation({ status: 'sent' })

      const counts = store.statusCounts
      expect(counts.draft).toBe(2)
      expect(counts.pending).toBe(1)
      expect(counts.approved).toBe(1)
      expect(counts.accepted).toBe(1)
      expect(counts.rejected).toBe(1)
      expect(counts.expired).toBe(1)
      expect(counts.sent).toBe(1)
    })

    it('customerTopList 应按客户汇总金额并降序排列', () => {
      store.addQuotation({ customerName: '客户A', total: 30000 })
      store.addQuotation({ customerName: '客户B', total: 60000 })
      store.addQuotation({ customerName: '客户A', total: 20000 })

      const top = store.customerTopList
      expect(top[0].name).toBe('客户B')
      expect(top[0].amount).toBe(60000)
      expect(top[1].name).toBe('客户A')
      expect(top[1].amount).toBe(50000)
    })

    it('customerTopList 最多返回 10 条', () => {
      for (let i = 0; i < 15; i++) {
        store.addQuotation({ customerName: `客户${i}`, total: 1000 * (15 - i) })
      }
      expect(store.customerTopList.length).toBe(10)
    })
  })

  /* ================================================================
   * 三、业务逻辑：转换、复制、版本、跟进、模板
   * ================================================================ */
  describe('业务逻辑 - 转换操作', () => {
    it('convertToContract 对 approved 状态应成功', () => {
      const q = store.addQuotation({ status: 'approved' })
      const result = store.convertToContract(q.id)

      expect(result.success).toBe(true)
      expect(result.quotation.convertedToContract).toBe(true)
      expect(result.quotation.convertedAt).toBeTruthy()
    })

    it('convertToContract 对 accepted 状态应成功', () => {
      const q = store.addQuotation({ status: 'accepted' })
      const result = store.convertToContract(q.id)

      expect(result.success).toBe(true)
      expect(result.quotation.convertedToContract).toBe(true)
    })

    it('convertToContract 对非 eligible 状态应失败', () => {
      const q = store.addQuotation({ status: 'draft' })
      const result = store.convertToContract(q.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已审批或已接受')
    })

    it('convertToContract 应防止重复转换', () => {
      const q = store.addQuotation({ status: 'approved' })
      const r1 = store.convertToContract(q.id)
      expect(r1.success).toBe(true)

      const r2 = store.convertToContract(q.id)
      expect(r2.success).toBe(false)
      expect(r2.error).toContain('已转换')
    })

    it('convertToContract 对不存在的 id 应返回错误', () => {
      const result = store.convertToContract('non_existent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })

    it('convertToContract 应保存版本记录', () => {
      const q = store.addQuotation({ status: 'approved' })
      store.convertToContract(q.id)

      const versions = store.getVersions(q.id)
      expect(versions.length).toBeGreaterThanOrEqual(1)
      expect(versions[versions.length - 1].changeNote).toContain('转为合同')
    })

    it('convertToDelivery 对 approved 状态应成功', () => {
      const q = store.addQuotation({ status: 'approved' })
      const result = store.convertToDelivery(q.id)

      expect(result.success).toBe(true)
      expect(result.quotation.convertedToDelivery).toBe(true)
      expect(result.quotation.convertedAt).toBeTruthy()
    })

    it('convertToDelivery 对 accepted 状态应成功', () => {
      const q = store.addQuotation({ status: 'accepted' })
      const result = store.convertToDelivery(q.id)

      expect(result.success).toBe(true)
    })

    it('convertToDelivery 对非 eligible 状态应失败', () => {
      const q = store.addQuotation({ status: 'pending' })
      const result = store.convertToDelivery(q.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已审批或已接受')
    })

    it('convertToDelivery 应防止重复转换', () => {
      const q = store.addQuotation({ status: 'approved' })
      store.convertToDelivery(q.id)
      const result = store.convertToDelivery(q.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已转换')
    })

    it('convertToDelivery 对不存在的 id 应返回错误', () => {
      const result = store.convertToDelivery('non_existent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })

    it('convertToContract 和 convertToDelivery 互不影响', () => {
      const q = store.addQuotation({ status: 'approved' })
      const r1 = store.convertToContract(q.id)
      expect(r1.success).toBe(true)

      const r2 = store.convertToDelivery(q.id)
      expect(r2.success).toBe(true)
      expect(r2.quotation.convertedToDelivery).toBe(true)
      expect(r2.quotation.convertedToContract).toBe(true)
    })
  })

  describe('业务逻辑 - 复制报价单', () => {
    it('duplicateQuotation 应创建副本并重置关键字段', () => {
      const src = store.addQuotation({
        customerName: '原始客户',
        total: 50000,
        status: 'approved',
        followUps: [{ date: '2024-01-01', note: '跟进记录' }]
      })

      const dup = store.duplicateQuotation(src.id)

      expect(dup).toBeTruthy()
      expect(dup.id).not.toBe(src.id)
      expect(dup.quoteNo).not.toBe(src.quoteNo)
      expect(dup.status).toBe('draft')
      expect(dup.customerName).toBe('原始客户')
      expect(dup.total).toBe(50000)
      expect(dup.followUps).toEqual([])
    })

    it('duplicateQuotation 对不存在的 id 应返回 null', () => {
      const result = store.duplicateQuotation('non_existent')
      expect(result).toBeNull()
    })

    it('duplicateQuotation 应添加到列表中', () => {
      const src = store.addQuotation()
      store.duplicateQuotation(src.id)
      expect(store.quotations).toHaveLength(2)
    })
  })

  describe('业务逻辑 - 版本管理', () => {
    it('saveVersion 应保存当前报价单快照', () => {
      const q = store.addQuotation({ customerName: '版本测试' })
      store.saveVersion(q.id, '初始版本')

      const versions = store.getVersions(q.id)
      expect(versions).toHaveLength(1)
      expect(versions[0].version).toBe(1)
      expect(versions[0].changeNote).toBe('初始版本')
      expect(versions[0].data.customerName).toBe('版本测试')
      expect(versions[0].changedBy).toBeTruthy()
      expect(versions[0].changedAt).toBeTruthy()
    })

    it('saveVersion 多次调用应递增版本号', () => {
      const q = store.addQuotation()
      store.saveVersion(q.id, 'v1')
      store.saveVersion(q.id, 'v2')
      store.saveVersion(q.id, 'v3')

      const versions = store.getVersions(q.id)
      expect(versions).toHaveLength(3)
      expect(versions[0].version).toBe(1)
      expect(versions[1].version).toBe(2)
      expect(versions[2].version).toBe(3)
    })

    it('getVersions 对无版本记录应返回空数组', () => {
      const q = store.addQuotation()
      expect(store.getVersions(q.id)).toEqual([])
    })

    it('rollbackVersion 应回滚到指定版本', () => {
      const q = store.addQuotation({ customerName: '原始', total: 10000 })
      store.saveVersion(q.id, 'v1')

      store.updateQuotation(q.id, { customerName: '修改后', total: 20000 })
      store.saveVersion(q.id, 'v2')

      // 回滚到 v1
      const result = store.rollbackVersion(q.id, 1)
      expect(result).toBe(true)

      const restored = store.getQuotationById(q.id)
      expect(restored.customerName).toBe('原始')
      expect(restored.total).toBe(10000)
    })

    it('rollbackVersion 应在回滚前保存一条回滚记录', () => {
      const q = store.addQuotation({ customerName: '测试' })
      store.saveVersion(q.id, 'v1')
      store.rollbackVersion(q.id, 1)

      const versions = store.getVersions(q.id)
      // v1 + 回滚记录
      expect(versions.length).toBeGreaterThanOrEqual(2)
      expect(versions[versions.length - 1].changeNote).toContain('回滚')
    })

    it('rollbackVersion 对不存在的版本号应返回 false', () => {
      const q = store.addQuotation()
      store.saveVersion(q.id, 'v1')

      expect(store.rollbackVersion(q.id, 999)).toBe(false)
    })

    it('rollbackVersion 对不存在的报价 id 应返回 false', () => {
      expect(store.rollbackVersion('non_existent', 1)).toBe(false)
    })
  })

  describe('业务逻辑 - 跟进管理', () => {
    it('addFollowUp 应添加跟进记录', () => {
      const q = store.addQuotation()
      store.addFollowUp(q.id, '2024-12-20', '客户反馈良好')

      const updated = store.getQuotationById(q.id)
      expect(updated.followUps).toHaveLength(1)
      expect(updated.followUps[0].date).toBe('2024-12-20')
      expect(updated.followUps[0].note).toBe('客户反馈良好')
      expect(updated.followUps[0].createdAt).toBeTruthy()
      expect(updated.followUps[0].createdBy).toBeTruthy()
    })

    it('addFollowUp 多次调用应追加记录', () => {
      const q = store.addQuotation()
      store.addFollowUp(q.id, '2024-12-20', '第一次跟进')
      store.addFollowUp(q.id, '2024-12-25', '第二次跟进')

      const updated = store.getQuotationById(q.id)
      expect(updated.followUps).toHaveLength(2)
    })

    it('addFollowUp 对不存在的 id 不应报错', () => {
      expect(() => {
        store.addFollowUp('non_existent', '2024-12-20', '无影响')
      }).not.toThrow()
    })

    it('addFollowUp 应初始化 followUps 数组（如果不存在）', () => {
      const q = store.addQuotation()
      // 手动删除 followUps
      delete q.followUps
      store.addFollowUp(q.id, '2024-12-20', '初始化测试')

      const updated = store.getQuotationById(q.id)
      expect(updated.followUps).toHaveLength(1)
    })
  })

  describe('业务逻辑 - 模板管理', () => {
    it('addTemplate 应创建模板并自动生成字段', () => {
      const tpl = store.addTemplate({ name: '标准报价模板' })

      expect(tpl.id).toBeTruthy()
      expect(tpl.id.startsWith('tpl')).toBe(true)
      expect(tpl.name).toBe('标准报价模板')
      expect(tpl.taxRate).toBe(13)
      expect(tpl.createdAt).toBeTruthy()
    })

    it('addTemplate 应添加到模板列表', () => {
      store.addTemplate({ name: '模板1' })
      store.addTemplate({ name: '模板2' })
      expect(store.templates).toHaveLength(2)
    })

    it('deleteTemplate 应删除指定模板', () => {
      const tpl = store.addTemplate({ name: '待删除模板' })
      store.deleteTemplate(tpl.id)
      expect(store.templates).toHaveLength(0)
    })

    it('deleteTemplate 删除不存在的 id 不应报错', () => {
      expect(() => {
        store.deleteTemplate('non_existent')
      }).not.toThrow()
    })
  })

  /* ================================================================
   * 四、边界条件
   * ================================================================ */
  describe('边界条件', () => {
    it('空数据时所有计算属性应返回安全默认值', () => {
      expect(store.draftCount).toBe(0)
      expect(store.pendingCount).toBe(0)
      expect(store.approvedCount).toBe(0)
      expect(store.acceptedCount).toBe(0)
      expect(store.rejectedCount).toBe(0)
      expect(store.expiredCount).toBe(0)
      expect(store.totalAmount).toBe(0)
      expect(store.acceptedAmount).toBe(0)
      expect(store.conversionRate).toBe(0)
      expect(store.avgProfitMargin).toBe(0)
      expect(store.avgQuoteAmount).toBe(0)
      expect(store.customerTopList).toEqual([])
      expect(store.statusCounts).toEqual({
        draft: 0, pending: 0, approved: 0, sent: 0, accepted: 0, rejected: 0, expired: 0
      })
    })

    it('对不存在的 id 执行 updateQuotation 不应影响其他数据', () => {
      const q = store.addQuotation({ customerName: '保留客户' })
      store.updateQuotation('non_existent', { customerName: '不应出现' })

      expect(store.getQuotationById(q.id).customerName).toBe('保留客户')
      expect(store.quotations).toHaveLength(1)
    })

    it('对不存在的 id 执行 deleteQuotation 不应报错', () => {
      expect(() => {
        store.deleteQuotation('non_existent')
      }).not.toThrow()
    })

    it('batchDelete 传入空数组不应影响数据', () => {
      store.addQuotation()
      store.batchDelete([])
      expect(store.quotations).toHaveLength(1)
    })

    it('changeStatus 对不存在的 id 不应报错', () => {
      expect(() => {
        store.changeStatus('non_existent', 'approved')
      }).not.toThrow()
    })

    it('total 为 0 或 undefined 的报价单应正确处理', () => {
      store.addQuotation({ total: 0 })
      store.addQuotation({ total: undefined })
      store.addQuotation({ total: 50000 })

      // undefined 被当作 0 处理
      expect(store.totalAmount).toBe(50000)
    })

    it('profitMargin 为 0 和 undefined 的报价单应正确处理 avgProfitMargin', () => {
      store.addQuotation({ profitMargin: 0 })
      // profitMargin 为 0 的不参与 avgProfitMargin 计算（filter 条件为 q.profitMargin）
      expect(store.avgProfitMargin).toBe(0)
    })

    it('customerName 为空的报价单应归入"未知"', () => {
      store.addQuotation({ customerName: '', total: 10000 })
      const top = store.customerTopList
      expect(top[0].name).toBe('未知')
    })
  })

  /* ================================================================
   * 五、异常情况
   * ================================================================ */
  describe('异常情况', () => {
    it('convertToContract 对 rejected 状态应失败', () => {
      const q = store.addQuotation({ status: 'rejected' })
      const result = store.convertToContract(q.id)
      expect(result.success).toBe(false)
    })

    it('convertToContract 对 expired 状态应失败', () => {
      const q = store.addQuotation({ status: 'expired' })
      const result = store.convertToContract(q.id)
      expect(result.success).toBe(false)
    })

    it('convertToContract 对 sent 状态应失败', () => {
      const q = store.addQuotation({ status: 'sent' })
      const result = store.convertToContract(q.id)
      expect(result.success).toBe(false)
    })

    it('convertToDelivery 对 rejected 状态应失败', () => {
      const q = store.addQuotation({ status: 'rejected' })
      const result = store.convertToDelivery(q.id)
      expect(result.success).toBe(false)
    })

    it('convertToDelivery 对 expired 状态应失败', () => {
      const q = store.addQuotation({ status: 'expired' })
      const result = store.convertToDelivery(q.id)
      expect(result.success).toBe(false)
    })

    it('对已转换合同的报价单再转送货单应仍可成功', () => {
      const q = store.addQuotation({ status: 'approved' })
      store.convertToContract(q.id)
      const result = store.convertToDelivery(q.id)
      expect(result.success).toBe(true)
    })

    it('对已转换送货单的报价单再转合同应仍可成功', () => {
      const q = store.addQuotation({ status: 'approved' })
      store.convertToDelivery(q.id)
      const result = store.convertToContract(q.id)
      expect(result.success).toBe(true)
    })
  })

  /* ================================================================
   * 六、数据持久化
   * ================================================================ */
  describe('数据持久化', () => {
    it('addQuotation 应写入 localStorage', () => {
      store.addQuotation({ customerName: '持久化测试' })
      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toBeTruthy()
      expect(stored.length).toBe(1)
      expect(stored[0].customerName).toBe('持久化测试')
    })

    it('updateQuotation 应更新 localStorage', () => {
      const q = store.addQuotation({ customerName: '原始' })
      store.updateQuotation(q.id, { customerName: '更新后' })

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].customerName).toBe('更新后')
    })

    it('deleteQuotation 应更新 localStorage', () => {
      const q = store.addQuotation()
      store.deleteQuotation(q.id)

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toHaveLength(0)
    })

    it('batchDelete 应更新 localStorage', () => {
      const q1 = store.addQuotation()
      const q2 = store.addQuotation()
      store.batchDelete([q1.id, q2.id])

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toHaveLength(0)
    })

    it('changeStatus 应更新 localStorage', () => {
      const q = store.addQuotation({ status: 'draft' })
      store.changeStatus(q.id, 'approved')

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].status).toBe('approved')
    })

    it('convertToContract 应更新 localStorage', () => {
      const q = store.addQuotation({ status: 'approved' })
      store.convertToContract(q.id)

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].convertedToContract).toBe(true)
    })

    it('模板操作应写入 localStorage', () => {
      const tpl = store.addTemplate({ name: '持久化模板' })
      const stored = getStorageJSON(TEMPLATE_KEY)
      expect(stored).toBeTruthy()
      expect(stored[0].name).toBe('持久化模板')

      store.deleteTemplate(tpl.id)
      const afterDelete = getStorageJSON(TEMPLATE_KEY)
      expect(afterDelete).toHaveLength(0)
    })

    it('版本记录应写入 localStorage', () => {
      const q = store.addQuotation()
      store.saveVersion(q.id, '测试版本')

      const versions = getStorageJSON(VERSION_PREFIX + q.id)
      expect(versions).toHaveLength(1)
      expect(versions[0].changeNote).toBe('测试版本')
    })

    it('addFollowUp 应更新 localStorage', () => {
      const q = store.addQuotation()
      store.addFollowUp(q.id, '2024-12-20', '跟进记录')

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].followUps).toHaveLength(1)
    })
  })

  /* ================================================================
   * 七、种子数据
   * ================================================================ */
  describe('种子数据', () => {
    it('initSeedData 应初始化种子报价单', () => {
      store.initSeedData()

      expect(store.quotations.length).toBeGreaterThan(0)
      // 种子数据包含 q1 ~ q9
      expect(store.quotations.length).toBe(9)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(safeGetItem(INIT_KEY)).toBeTruthy()
    })

    it('initSeedData 不应重复初始化', () => {
      store.initSeedData()
      const firstCount = store.quotations.length

      // 再次调用不应增加数据
      store.initSeedData()
      expect(store.quotations.length).toBe(firstCount)
    })

    it('种子数据应包含各状态的报价单', () => {
      store.initSeedData()
      const counts = store.statusCounts
      expect(counts.draft).toBeGreaterThanOrEqual(1)
      expect(counts.approved).toBeGreaterThanOrEqual(1)
      expect(counts.accepted).toBeGreaterThanOrEqual(1)
      expect(counts.sent).toBeGreaterThanOrEqual(1)
      expect(counts.pending).toBeGreaterThanOrEqual(1)
      expect(counts.expired).toBeGreaterThanOrEqual(1)
    })

    it('种子数据应持久化到 localStorage', () => {
      store.initSeedData()
      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored.length).toBe(9)
    })
  })

  /* ================================================================
   * 八、replaceData 与 mergeRemoteItems
   * ================================================================ */
  describe('replaceData 与 mergeRemoteItems', () => {
    it('replaceData 应替换全部报价单数据', () => {
      store.addQuotation({ customerName: '旧数据' })
      const newData = createQuotations(3)
      store.replaceData(newData)

      expect(store.quotations).toHaveLength(3)
      expect(store.quotations[0].customerName).toBe(newData[0].customerName)
    })

    it('replaceData 应更新 localStorage', () => {
      const newData = createQuotations(2)
      store.replaceData(newData)

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored.length).toBe(2)
    })

    it('mergeRemoteItems 应合并远程数据', () => {
      const local = store.addQuotation({ customerName: '本地数据' })
      const remote = createQuotations(2)
      store.mergeRemoteItems(remote)

      // 本地 + 远程合并
      expect(store.quotations.length).toBeGreaterThanOrEqual(3)
    })

    it('mergeRemoteItems 传入非数组不应报错', () => {
      store.addQuotation()
      expect(() => {
        store.mergeRemoteItems(null)
        store.mergeRemoteItems(undefined)
        store.mergeRemoteItems('invalid')
      }).not.toThrow()
      expect(store.quotations).toHaveLength(1)
    })
  })
})
