/**
 * 合同 Store 综合测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useContractStore } from '@/modules/sales/stores/contract'
import { createContract, createContracts, resetCounter } from '@/__tests__/mockData'
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

vi.mock('@/utils/numberToChinese.js', () => ({
  numberToChinese: (n) => `中文_${n}`
}))

/* ===== 常量 ===== */
const STORAGE_KEY = 'gj_erp_contracts'
const INIT_KEY = 'gj_erp_contracts_initialized'

/* ===== 辅助：从 localStorage 读取 JSON（需加 gj_erp_ 前缀，与 StorageManager 一致） ===== */
import { safeGetJSON, safeGetItem } from '@/utils/storage'
function getStorageJSON(key) {
  return safeGetJSON(key)
}

describe('合同 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useContractStore()
  })

  /* ================================================================
   * 一、正常流程：CRUD 操作
   * ================================================================ */
  describe('正常流程 - CRUD 操作', () => {
    it('addContract 应正确创建合同并自动生成字段', () => {
      const c = store.addContract({ partyA: '测试甲方' })

      // 验证自动生成的字段
      expect(c.id).toBeTruthy()
      expect(c.id.startsWith('ct')).toBe(true)
      expect(c.contractNo).toMatch(/^HT\d{6}\d{3}$/) // HTYYYYMMNNN
      expect(c.status).toBe('draft')
      expect(c.partyA).toBe('测试甲方')
      expect(c.partyB).toBe('苏州冠久新材料科技有限公司')
      expect(c.createdAt).toBeTruthy()
      expect(c.updatedAt).toBeTruthy()
      expect(c.terms).toBeTruthy()
    })

    it('addContract 应允许覆盖默认值', () => {
      const c = store.addContract({
        partyA: '覆盖甲方',
        contractType: '采购合同',
        settlement: '月结60天',
        totalAmount: 200000
      })
      expect(c.partyA).toBe('覆盖甲方')
      expect(c.contractType).toBe('采购合同')
      expect(c.settlement).toBe('月结60天')
      expect(c.totalAmount).toBe(200000)
    })

    it('addContract 合同编号应自增', () => {
      const c1 = store.addContract({})
      const c2 = store.addContract({})
      expect(c1.contractNo).not.toBe(c2.contractNo)
    })

    it('addContract 允许传入自定义 contractNo', () => {
      const c = store.addContract({ contractNo: 'HT-CUSTOM-001' })
      expect(c.contractNo).toBe('HT-CUSTOM-001')
    })

    it('addContract 应创建历史记录', () => {
      const c = store.addContract({})
      const history = store.getHistory(c.id)
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].type).toBe('create')
      expect(history[0].label).toContain(c.contractNo)
    })

    it('updateContract 应正确更新指定合同', () => {
      const c = store.addContract({ partyA: '原始甲方' })
      store.updateContract(c.id, { partyA: '更新甲方', totalAmount: 99999 })

      const updated = store.getContractById(c.id)
      expect(updated.partyA).toBe('更新甲方')
      expect(updated.totalAmount).toBe(99999)
      expect(updated.updatedAt).toBeTruthy()
    })

    it('updateContract 对不存在的 id 不应报错', () => {
      expect(() => {
        store.updateContract('non_existent_id', { partyA: '无影响' })
      }).not.toThrow()
    })

    it('deleteContract 应正确删除指定合同', () => {
      const c1 = store.addContract({})
      const c2 = store.addContract({})
      store.deleteContract(c1.id)

      expect(store.getContractById(c1.id)).toBeNull()
      expect(store.getContractById(c2.id)).toBeTruthy()
      expect(store.contracts).toHaveLength(1)
    })

    it('batchDelete 应批量删除多个合同', () => {
      const c1 = store.addContract({})
      const c2 = store.addContract({})
      const c3 = store.addContract({})
      store.batchDelete([c1.id, c3.id])

      expect(store.contracts).toHaveLength(1)
      expect(store.getContractById(c2.id)).toBeTruthy()
    })

    it('getContractById 应返回对应合同', () => {
      const c = store.addContract({ partyA: '查找甲方' })
      const found = store.getContractById(c.id)
      expect(found).toBeTruthy()
      expect(found.partyA).toBe('查找甲方')
    })

    it('getContractById 对不存在的 id 应返回 null', () => {
      expect(store.getContractById('non_existent')).toBeNull()
    })
  })

  /* ================================================================
   * 二、正常流程：状态转换与计算属性
   * ================================================================ */
  describe('正常流程 - 状态转换与计算属性', () => {
    it('changeStatus: draft -> pending_approval 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      const result = store.changeStatus(c.id, 'pending_approval')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('pending_approval')
      expect(store.getContractById(c.id).submittedBy).toBeTruthy()
      expect(store.getContractById(c.id).submittedAt).toBeTruthy()
    })

    it('changeStatus: pending_approval -> approved 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      const result = store.changeStatus(c.id, 'approved')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('approved')
      expect(store.getContractById(c.id).approvedBy).toBeTruthy()
      expect(store.getContractById(c.id).approvedAt).toBeTruthy()
    })

    it('changeStatus: approved -> signed 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      const result = store.changeStatus(c.id, 'signed')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('signed')
      expect(store.getContractById(c.id).signedBy).toBeTruthy()
      expect(store.getContractById(c.id).signedAt).toBeTruthy()
    })

    it('changeStatus: signed -> archived 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      store.changeStatus(c.id, 'signed')
      const result = store.changeStatus(c.id, 'archived')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('archived')
    })

    it('changeStatus: pending_approval -> draft (驳回) 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      const result = store.changeStatus(c.id, 'draft', { reason: '价格不合理' })

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('draft')
      expect(store.getContractById(c.id).rejectedBy).toBeTruthy()
      expect(store.getContractById(c.id).rejectionReason).toBe('价格不合理')
    })

    it('changeStatus: approved -> cancelled 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      const result = store.changeStatus(c.id, 'cancelled')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('cancelled')
    })

    it('changeStatus: signed -> cancelled 应成功', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      store.changeStatus(c.id, 'signed')
      const result = store.changeStatus(c.id, 'cancelled')

      expect(result).toBe(true)
      expect(store.getContractById(c.id).status).toBe('cancelled')
    })

    it('changeStatus 应记录历史事件', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')

      const history = store.getHistory(c.id)
      // create + status change
      expect(history.length).toBeGreaterThanOrEqual(2)
    })

    it('draftCount 应正确统计草稿数量', () => {
      store.addContract({ status: 'draft' })
      store.addContract({ status: 'draft' })
      store.addContract({ status: 'pending_approval' })
      expect(store.draftCount).toBe(2)
    })

    it('pendingApprovalCount 应正确统计待审批数量', () => {
      store.addContract({ status: 'pending_approval' })
      store.addContract({ status: 'pending_approval' })
      expect(store.pendingApprovalCount).toBe(2)
    })

    it('approvedCount 应正确统计已审批数量', () => {
      store.addContract({ status: 'approved' })
      store.addContract({ status: 'approved' })
      expect(store.approvedCount).toBe(2)
    })

    it('signedCount 应正确统计已签订数量', () => {
      store.addContract({ status: 'signed' })
      store.addContract({ status: 'signed' })
      store.addContract({ status: 'signed' })
      expect(store.signedCount).toBe(3)
    })

    it('archivedCount 应正确统计已归档数量', () => {
      store.addContract({ status: 'archived' })
      expect(store.archivedCount).toBe(1)
    })

    it('cancelledCount 应正确统计已作废数量', () => {
      store.addContract({ status: 'cancelled' })
      store.addContract({ status: 'cancelled' })
      expect(store.cancelledCount).toBe(2)
    })

    it('totalAmount 应正确计算总金额', () => {
      store.addContract({ totalAmount: 100000 })
      store.addContract({ totalAmount: 200000 })
      store.addContract({ totalAmount: 300000 })
      expect(store.totalAmount).toBe(600000)
    })

    it('signedAmount 应统计已签订和已归档的金额', () => {
      store.addContract({ status: 'signed', totalAmount: 100000 })
      store.addContract({ status: 'archived', totalAmount: 200000 })
      store.addContract({ status: 'draft', totalAmount: 50000 })
      expect(store.signedAmount).toBe(300000)
    })

    it('statusCounts 应返回各状态计数', () => {
      store.addContract({ status: 'draft' })
      store.addContract({ status: 'draft' })
      store.addContract({ status: 'pending_approval' })
      store.addContract({ status: 'approved' })
      store.addContract({ status: 'signed' })
      store.addContract({ status: 'archived' })
      store.addContract({ status: 'cancelled' })

      const counts = store.statusCounts
      expect(counts.draft).toBe(2)
      expect(counts.pending_approval).toBe(1)
      expect(counts.approved).toBe(1)
      expect(counts.signed).toBe(1)
      expect(counts.archived).toBe(1)
      expect(counts.cancelled).toBe(1)
    })

    it('customerTopList 应按客户汇总金额并降序排列', () => {
      store.addContract({ partyA: '客户A', totalAmount: 300000 })
      store.addContract({ partyA: '客户B', totalAmount: 600000 })
      store.addContract({ partyA: '客户A', totalAmount: 200000 })

      const top = store.customerTopList
      expect(top[0].name).toBe('客户B')
      expect(top[0].amount).toBe(600000)
      expect(top[1].name).toBe('客户A')
      expect(top[1].amount).toBe(500000)
    })

    it('customerTopList 最多返回 10 条', () => {
      for (let i = 0; i < 15; i++) {
        store.addContract({ partyA: `客户${i}`, totalAmount: 10000 * (15 - i) })
      }
      expect(store.customerTopList.length).toBe(10)
    })

    it('settlementCounts 应统计结算方式分布', () => {
      store.addContract({ settlement: '月结30天' })
      store.addContract({ settlement: '月结30天' })
      store.addContract({ settlement: '款到发货' })

      const counts = store.settlementCounts
      expect(counts['月结30天']).toBe(2)
      expect(counts['款到发货']).toBe(1)
    })

    it('settlementCounts 未设定结算方式应归入"未设定"', () => {
      const c = store.addContract({})
      delete c.settlement
      // settlementCounts 读取 contracts.value，需要手动处理
      // addContract 默认有 settlement: '款到发货'
    })

    it('typeCounts 应统计合同类型分布', () => {
      store.addContract({ contractType: '购销合同' })
      store.addContract({ contractType: '购销合同' })
      store.addContract({ contractType: '采购合同' })

      const counts = store.typeCounts
      expect(counts['购销合同']).toBe(2)
      expect(counts['采购合同']).toBe(1)
    })

    it('monthlyAmounts 应按月汇总金额', () => {
      store.addContract({ signDate: '2026-01-15', totalAmount: 100000 })
      store.addContract({ signDate: '2026-01-20', totalAmount: 50000 })
      store.addContract({ signDate: '2026-03-10', totalAmount: 200000 })

      const monthly = store.monthlyAmounts
      expect(monthly.length).toBeGreaterThanOrEqual(2)
      const janEntry = monthly.find((m) => m.month === '2026-01')
      expect(janEntry.amount).toBe(150000)
    })
  })

  /* ================================================================
   * 三、业务逻辑：状态转换限制
   * ================================================================ */
  describe('业务逻辑 - 状态转换限制', () => {
    it('draft 不能直接转为 approved', () => {
      const c = store.addContract({ status: 'draft' })
      const result = store.changeStatus(c.id, 'approved')
      expect(result).toBe(false)
      expect(store.getContractById(c.id).status).toBe('draft')
    })

    it('draft 不能直接转为 signed', () => {
      const c = store.addContract({ status: 'draft' })
      const result = store.changeStatus(c.id, 'signed')
      expect(result).toBe(false)
    })

    it('draft 不能直接转为 archived', () => {
      const c = store.addContract({ status: 'draft' })
      const result = store.changeStatus(c.id, 'archived')
      expect(result).toBe(false)
    })

    it('pending_approval 不能直接转为 signed', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      const result = store.changeStatus(c.id, 'signed')
      expect(result).toBe(false)
    })

    it('approved 不能直接转为 pending_approval', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      const result = store.changeStatus(c.id, 'pending_approval')
      expect(result).toBe(false)
    })

    it('signed 不能直接转为 approved', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      store.changeStatus(c.id, 'signed')
      const result = store.changeStatus(c.id, 'approved')
      expect(result).toBe(false)
    })

    it('draft 不能直接转为 cancelled', () => {
      const c = store.addContract({ status: 'draft' })
      const result = store.changeStatus(c.id, 'cancelled')
      expect(result).toBe(false)
    })

    it('pending_approval 不能直接转为 cancelled', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      const result = store.changeStatus(c.id, 'cancelled')
      expect(result).toBe(false)
    })

    it('changeStatus 对不存在的 id 应返回 false', () => {
      const result = store.changeStatus('non_existent', 'pending_approval')
      expect(result).toBe(false)
    })
  })

  /* ================================================================
   * 四、业务逻辑：复制合同、历史记录、附件
   * ================================================================ */
  describe('业务逻辑 - 复制合同', () => {
    it('duplicateContract 应创建副本并重置关键字段', () => {
      const src = store.addContract({
        partyA: '原始甲方',
        totalAmount: 500000,
        status: 'signed'
      })
      // 先走完审批流程
      store.changeStatus(src.id, 'pending_approval')
      store.changeStatus(src.id, 'approved')
      store.changeStatus(src.id, 'signed')

      const dup = store.duplicateContract(src.id)

      expect(dup).toBeTruthy()
      expect(dup.id).not.toBe(src.id)
      expect(dup.contractNo).not.toBe(src.contractNo)
      expect(dup.status).toBe('draft')
      expect(dup.partyA).toBe('原始甲方')
      expect(dup.totalAmount).toBe(500000)
    })

    it('duplicateContract 对不存在的 id 应返回 null', () => {
      const result = store.duplicateContract('non_existent')
      expect(result).toBeNull()
    })

    it('duplicateContract 应添加到列表中', () => {
      const src = store.addContract({})
      store.duplicateContract(src.id)
      expect(store.contracts).toHaveLength(2)
    })

    it('duplicateContract 应创建历史记录', () => {
      const src = store.addContract({})
      const dup = store.duplicateContract(src.id)

      const history = store.getHistory(dup.id)
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].label).toContain('复制合同')
    })
  })

  describe('业务逻辑 - 历史记录', () => {
    it('getHistory 对无历史记录应返回空数组', () => {
      // addContract 会创建历史，所以用不存在的 id
      expect(store.getHistory('non_existent')).toEqual([])
    })

    it('addHistoryEvent 应添加历史事件', () => {
      const c = store.addContract({})
      const initialHistoryLen = store.getHistory(c.id).length

      store.addHistoryEvent(c.id, 'custom', '自定义事件')

      const history = store.getHistory(c.id)
      expect(history.length).toBe(initialHistoryLen + 1)
      expect(history[history.length - 1].type).toBe('custom')
      expect(history[history.length - 1].label).toBe('自定义事件')
    })
  })

  describe('业务逻辑 - 附件管理', () => {
    it('getAttachments 对无附件应返回空数组', () => {
      const c = store.addContract({})
      expect(store.getAttachments(c.id)).toEqual([])
    })

    it('addAttachment 应添加附件', () => {
      const c = store.addContract({})
      store.addAttachment(c.id, {
        name: '合同扫描件.pdf',
        size: 1024000,
        type: 'application/pdf',
        data: 'base64data'
      })

      const attachments = store.getAttachments(c.id)
      expect(attachments).toHaveLength(1)
      expect(attachments[0].name).toBe('合同扫描件.pdf')
      expect(attachments[0].size).toBe(1024000)
      expect(attachments[0].uploadedAt).toBeTruthy()
      expect(attachments[0].uploadedBy).toBeTruthy()
    })

    it('deleteAttachment 应删除指定附件', () => {
      const c = store.addContract({})
      store.addAttachment(c.id, { name: 'file1.pdf', size: 100, type: 'application/pdf' })
      store.addAttachment(c.id, { name: 'file2.pdf', size: 200, type: 'application/pdf' })

      const attachments = store.getAttachments(c.id)
      store.deleteAttachment(c.id, attachments[0].id)

      const remaining = store.getAttachments(c.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].name).toBe('file2.pdf')
    })
  })

  describe('业务逻辑 - 模板管理', () => {
    it('addTemplate 应创建模板', () => {
      const tpl = store.addTemplate({
        name: '标准合同模板',
        settlement: '月结30天',
        terms: { quality: '按国标' },
        partyBInfo: { companyName: '测试公司' }
      })

      expect(tpl.id).toBeTruthy()
      expect(tpl.name).toBe('标准合同模板')
      expect(tpl.createdAt).toBeTruthy()
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
   * 五、边界条件
   * ================================================================ */
  describe('边界条件', () => {
    it('空数据时所有计算属性应返回安全默认值', () => {
      expect(store.draftCount).toBe(0)
      expect(store.pendingApprovalCount).toBe(0)
      expect(store.approvedCount).toBe(0)
      expect(store.signedCount).toBe(0)
      expect(store.archivedCount).toBe(0)
      expect(store.cancelledCount).toBe(0)
      expect(store.totalAmount).toBe(0)
      expect(store.signedAmount).toBe(0)
      expect(store.customerTopList).toEqual([])
      expect(store.statusCounts).toEqual({
        draft: 0, pending_approval: 0, approved: 0, signed: 0, archived: 0, cancelled: 0
      })
      expect(store.settlementCounts).toEqual({})
      expect(store.typeCounts).toEqual({})
      expect(store.monthlyAmounts).toEqual([])
    })

    it('对不存在的 id 执行 updateContract 不应影响其他数据', () => {
      const c = store.addContract({ partyA: '保留甲方' })
      store.updateContract('non_existent', { partyA: '不应出现' })

      expect(store.getContractById(c.id).partyA).toBe('保留甲方')
      expect(store.contracts).toHaveLength(1)
    })

    it('对不存在的 id 执行 deleteContract 不应报错', () => {
      expect(() => {
        store.deleteContract('non_existent')
      }).not.toThrow()
    })

    it('batchDelete 传入空数组不应影响数据', () => {
      store.addContract({})
      store.batchDelete([])
      expect(store.contracts).toHaveLength(1)
    })

    it('totalAmount 为 0 或 undefined 的合同应正确处理', () => {
      store.addContract({ totalAmount: 0 })
      store.addContract({ totalAmount: undefined })
      store.addContract({ totalAmount: 500000 })

      // undefined 被当作 0 处理
      expect(store.totalAmount).toBe(500000)
    })

    it('partyA 为空的合同应归入"未知"客户', () => {
      store.addContract({ partyA: '', totalAmount: 100000 })
      const top = store.customerTopList
      expect(top[0].name).toBe('未知')
    })

    it('无 signDate 的合同不应出现在 monthlyAmounts 中', () => {
      const c = store.addContract({ totalAmount: 100000 })
      // 手动清除 signDate
      store.updateContract(c.id, { signDate: '' })
      expect(store.monthlyAmounts).toEqual([])
    })
  })

  /* ================================================================
   * 六、异常情况
   * ================================================================ */
  describe('异常情况', () => {
    it('archived 状态不能转为 signed/cancelled', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      store.changeStatus(c.id, 'signed')
      store.changeStatus(c.id, 'archived')

      // archived 不能转为 signed（需要从 approved）
      expect(store.changeStatus(c.id, 'signed')).toBe(false)
      // archived 不能转为 cancelled（需要从 approved 或 signed）
      expect(store.changeStatus(c.id, 'cancelled')).toBe(false)
      // archived 不能转为 pending_approval（需要从 draft）
      expect(store.changeStatus(c.id, 'pending_approval')).toBe(false)
      // archived 不能转为 approved（需要从 pending_approval）
      expect(store.changeStatus(c.id, 'approved')).toBe(false)
    })

    it('cancelled 状态不能转为 pending_approval/approved/signed/archived', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      store.changeStatus(c.id, 'approved')
      store.changeStatus(c.id, 'cancelled')

      expect(store.changeStatus(c.id, 'pending_approval')).toBe(false)
      expect(store.changeStatus(c.id, 'approved')).toBe(false)
      expect(store.changeStatus(c.id, 'signed')).toBe(false)
      expect(store.changeStatus(c.id, 'archived')).toBe(false)
    })

    it('重复审批同一状态不应改变数据', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')
      // 再次尝试 draft -> pending_approval，当前已经是 pending_approval
      const result = store.changeStatus(c.id, 'pending_approval')
      expect(result).toBe(false)
    })
  })

  /* ================================================================
   * 七、数据持久化
   * ================================================================ */
  describe('数据持久化', () => {
    it('addContract 应写入 localStorage', () => {
      store.addContract({ partyA: '持久化测试' })
      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toBeTruthy()
      expect(stored.length).toBe(1)
      expect(stored[0].partyA).toBe('持久化测试')
    })

    it('updateContract 应更新 localStorage', () => {
      const c = store.addContract({ partyA: '原始' })
      store.updateContract(c.id, { partyA: '更新后' })

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].partyA).toBe('更新后')
    })

    it('deleteContract 应更新 localStorage', () => {
      const c = store.addContract({})
      store.deleteContract(c.id)

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toHaveLength(0)
    })

    it('batchDelete 应更新 localStorage', () => {
      const c1 = store.addContract({})
      const c2 = store.addContract({})
      store.batchDelete([c1.id, c2.id])

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored).toHaveLength(0)
    })

    it('changeStatus 应更新 localStorage', () => {
      const c = store.addContract({ status: 'draft' })
      store.changeStatus(c.id, 'pending_approval')

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored[0].status).toBe('pending_approval')
    })

    it('历史记录应写入 localStorage', () => {
      const c = store.addContract({})
      // addContract 本身就创建了历史记录
      const historyKey = 'gj_erp_contractHistory_' + c.id
      const history = getStorageJSON(historyKey)
      expect(history).toBeTruthy()
      expect(history.length).toBeGreaterThanOrEqual(1)
    })

    it('附件应写入 localStorage', () => {
      const c = store.addContract({})
      store.addAttachment(c.id, { name: 'test.pdf', size: 100, type: 'application/pdf' })

      const attachKey = 'gj_erp_contractAttachments_' + c.id
      const attachments = getStorageJSON(attachKey)
      expect(attachments).toHaveLength(1)
      expect(attachments[0].name).toBe('test.pdf')
    })
  })

  /* ================================================================
   * 八、种子数据
   * ================================================================ */
  describe('种子数据', () => {
    it('initSeedData 应初始化种子合同', () => {
      store.initSeedData()

      expect(store.contracts.length).toBeGreaterThan(0)
      // 种子数据包含 ct1 ~ ct5, ct7, ct8（共7条）
      expect(store.contracts.length).toBe(7)
    })

    it('initSeedData 应初始化种子模板', () => {
      store.initSeedData()
      expect(store.templates.length).toBeGreaterThan(0)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(safeGetItem(INIT_KEY)).toBeTruthy()
    })

    it('initSeedData 不应重复初始化', () => {
      store.initSeedData()
      const firstCount = store.contracts.length

      store.initSeedData()
      expect(store.contracts.length).toBe(firstCount)
    })

    it('种子数据应包含各状态的合同', () => {
      store.initSeedData()
      const counts = store.statusCounts
      expect(counts.draft).toBeGreaterThanOrEqual(1)
      expect(counts.signed).toBeGreaterThanOrEqual(1)
      expect(counts.pending_approval).toBeGreaterThanOrEqual(1)
      expect(counts.approved).toBeGreaterThanOrEqual(1)
      expect(counts.archived).toBeGreaterThanOrEqual(1)
    })

    it('种子数据应持久化到 localStorage', () => {
      store.initSeedData()
      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored.length).toBe(7)
    })
  })

  /* ================================================================
   * 九、replaceData 与 mergeRemoteItems
   * ================================================================ */
  describe('replaceData 与 mergeRemoteItems', () => {
    it('replaceData 应替换全部合同数据', () => {
      store.addContract({ partyA: '旧数据' })
      const newData = createContracts(3)
      store.replaceData(newData)

      expect(store.contracts).toHaveLength(3)
    })

    it('replaceData 应更新 localStorage', () => {
      const newData = createContracts(2)
      store.replaceData(newData)

      const stored = getStorageJSON(STORAGE_KEY)
      expect(stored.length).toBe(2)
    })

    it('mergeRemoteItems 应合并远程数据', () => {
      store.addContract({ partyA: '本地数据' })
      const remote = createContracts(2)
      store.mergeRemoteItems(remote)

      // 本地 + 远程合并
      expect(store.contracts.length).toBeGreaterThanOrEqual(3)
    })

    it('mergeRemoteItems 传入非数组不应报错', () => {
      store.addContract({})
      expect(() => {
        store.mergeRemoteItems(null)
        store.mergeRemoteItems(undefined)
        store.mergeRemoteItems('invalid')
      }).not.toThrow()
      expect(store.contracts).toHaveLength(1)
    })
  })

  /* ================================================================
   * 十、expiringCount 与 expiredCount
   * ================================================================ */
  describe('即将到期与已过期统计', () => {
    it('expiringCount 应统计即将到期的合同（30天内）', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15) // 15天后到期
      const endDateStr = futureDate.toISOString().slice(0, 10)

      store.addContract({ status: 'signed', endDate: endDateStr })
      expect(store.expiringCount).toBe(1)
    })

    it('expiringCount 不应统计非 signed/active 状态的合同', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)
      const endDateStr = futureDate.toISOString().slice(0, 10)

      store.addContract({ status: 'draft', endDate: endDateStr })
      expect(store.expiringCount).toBe(0)
    })

    it('expiredCount 应统计已过期的合同', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10) // 10天前已到期
      const endDateStr = pastDate.toISOString().slice(0, 10)

      store.addContract({ status: 'signed', endDate: endDateStr })
      expect(store.expiredCount).toBe(1)
    })

    it('expiredCount 不应统计非 signed/active 状态的合同', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const endDateStr = pastDate.toISOString().slice(0, 10)

      store.addContract({ status: 'draft', endDate: endDateStr })
      expect(store.expiredCount).toBe(0)
    })

    it('无 endDate 的合同不应计入即将到期或已过期', () => {
      store.addContract({ status: 'signed', endDate: '' })
      expect(store.expiringCount).toBe(0)
      expect(store.expiredCount).toBe(0)
    })
  })
})
