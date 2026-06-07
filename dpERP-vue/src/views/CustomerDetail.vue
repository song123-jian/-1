<template>
  <div class="customer-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <button class="btn btn-ghost" @click="goBack">← 返回</button>
        <div>
          <h2 class="page-header-title">{{ customer ? (customer.fullName || customer.name) : '加载中...' }}</h2>
          <p class="page-header-subtitle">客户360°全景视图</p>
        </div>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="goEdit"><Icon name="edit" :size="14" /> 编辑</button>
        <button class="btn btn-outline btn-danger" @click="handleDelete"><Icon name="delete" :size="14" /> 删除</button>
      </div>
    </div>

    <div v-if="customer">
      <!-- 基本信息卡片 -->
      <div class="detail-top-bar">
        <div class="detail-avatar-lg" :style="{ background: levelColors[customer.level] || '#94a3b8' }">{{ (customer.fullName || customer.name || '?').charAt(0) }}</div>
        <div class="detail-top-info">
          <div class="detail-name">{{ customer.fullName || customer.name }}</div>
          <div class="detail-top-badges">
            <span class="level-badge" :class="'level-' + customer.level">{{ levelLabel(customer.level) }}</span>
            <span class="status-badge" :class="'status-' + customer.status">{{ customer.status === 'active' ? '活跃' : '休眠' }}</span>
            <span v-for="tagId in (customer.tags || [])" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
          </div>
          <div class="detail-top-meta">{{ customer.customerNo }} · {{ customer.region || '未知区域' }} · {{ customer.contactName || customer.contact || '未指定联系人' }}</div>
        </div>
        <div class="detail-top-kpis">
          <div class="kpi-card">
            <div class="kpi-label">余额</div>
            <div class="kpi-value mono">¥{{ formatNumber(customer.balance) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">信用额度</div>
            <div class="kpi-value mono">¥{{ formatNumber(customer.creditLimit) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">信用利用率</div>
            <div class="kpi-value mono" :class="creditUtilization > 80 ? 'text-danger' : creditUtilization > 50 ? 'text-warning' : 'text-success'">{{ creditUtilization }}%</div>
          </div>
        </div>
      </div>

      <!-- 基本信息详情 -->
      <div class="detail-grid-2col">
        <div class="detail-section">
          <div class="detail-section-title"><Icon name="list" :size="14" /> 联系信息</div>
          <div class="detail-fields">
            <div class="detail-field"><span class="df-label">客户编号</span><span class="mono">{{ customer.customerNo || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">全称</span><span>{{ customer.fullName || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">简称</span><span>{{ customer.shortName || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">联系人</span><span>{{ customer.contactName || customer.contact || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">电话</span><span class="mono">{{ customer.phone || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">部门</span><span>{{ customer.department || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">职位</span><span>{{ customer.position || '-' }}</span></div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">[商业] 商业信息</div>
          <div class="detail-fields">
            <div class="detail-field"><span class="df-label">客户等级</span><span class="level-badge" :class="'level-' + customer.level">{{ levelLabel(customer.level) }}</span></div>
            <div class="detail-field"><span class="df-label">决策权限</span><span>{{ customer.decisionAuthority || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">关注点</span><span>{{ customer.coreConcerns || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">区域</span><span>{{ customer.region || '-' }}</span></div>
            <div class="detail-field"><span class="df-label">信用额度</span><span class="mono">¥{{ formatNumber(customer.creditLimit) }}</span></div>
            <div class="detail-field"><span class="df-label">余额</span><span class="mono">¥{{ formatNumber(customer.balance) }}</span></div>
            <div class="detail-field"><span class="df-label">状态</span><span class="status-badge" :class="'status-' + customer.status">{{ customer.status === 'active' ? '活跃' : '休眠' }}</span></div>
          </div>
        </div>
      </div>

      <!-- 交易概览统计栏 -->
      <div class="trade-summary">
        <div class="trade-kpi">
          <div class="trade-kpi-value mono">{{ tradeStats.quotationCount }}</div>
          <div class="trade-kpi-label">报价数量</div>
        </div>
        <div class="trade-kpi">
          <div class="trade-kpi-value mono">{{ tradeStats.contractCount }}</div>
          <div class="trade-kpi-label">合同数量</div>
        </div>
        <div class="trade-kpi">
          <div class="trade-kpi-value mono">{{ tradeStats.deliveryCount }}</div>
          <div class="trade-kpi-label">送货数量</div>
        </div>
        <div class="trade-kpi">
          <div class="trade-kpi-value mono">¥{{ formatNumber(tradeStats.collectionAmount) }}</div>
          <div class="trade-kpi-label">回款金额</div>
        </div>
      </div>

      <!-- 交易历史时间线 -->
      <div class="detail-section" style="margin-top:var(--space-4)">
        <div class="detail-section-title"><Icon name="calendar" :size="14" /> 交易历史时间线</div>
        <div class="timeline">
          <div v-for="(evt, idx) in timeline" :key="idx" class="timeline-item">
            <div class="timeline-dot" :class="evt.dotClass"></div>
            <div class="timeline-content">
              <div class="timeline-date">{{ evt.date }}</div>
              <div class="timeline-text">{{ evt.text }}</div>
            </div>
          </div>
          <div v-if="timeline.length === 0" class="detail-empty">暂无交易记录</div>
        </div>
      </div>

      <!-- 关联单据列表 Tab -->
      <div class="detail-section" style="margin-top:var(--space-4)">
        <div class="detail-tabs">
          <button v-for="tab in docTabs" :key="tab.key" class="detail-tab-btn" :class="{ active: activeDocTab === tab.key }" @click="activeDocTab = tab.key"><Icon :name="tab.icon" :size="14" /> {{ tab.label }}</button>
        </div>

        <!-- 报价单列表 -->
        <div v-if="activeDocTab === 'quotations'" class="detail-tab-content">
          <table v-if="customerQuotations.length > 0" class="detail-table">
            <thead>
              <tr><th>报价单号</th><th>日期</th><th>金额</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="q in customerQuotations" :key="q.id">
                <td class="mono">{{ q.quoteNo }}</td>
                <td>{{ q.date }}</td>
                <td class="mono">¥{{ formatNumber(q.total) }}</td>
                <td><span class="status-badge" :class="quoteStatusClass(q.status)">{{ quoteStatusLabel(q.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="detail-empty">暂无报价记录</div>
        </div>

        <!-- 合同列表 -->
        <div v-if="activeDocTab === 'contracts'" class="detail-tab-content">
          <table v-if="customerContracts.length > 0" class="detail-table">
            <thead>
              <tr><th>合同编号</th><th>日期</th><th>金额</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="ct in customerContracts" :key="ct.id">
                <td class="mono">{{ ct.contractNo }}</td>
                <td>{{ ct.signDate || ct.createdAt }}</td>
                <td class="mono">¥{{ formatNumber(ct.totalAmount) }}</td>
                <td><span class="status-badge" :class="contractStatusClass(ct.status)">{{ contractStatusLabel(ct.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="detail-empty">暂无合同记录</div>
        </div>

        <!-- 送货单列表 -->
        <div v-if="activeDocTab === 'deliveries'" class="detail-tab-content">
          <table v-if="customerDeliveries.length > 0" class="detail-table">
            <thead>
              <tr><th>送货单号</th><th>日期</th><th>金额</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in customerDeliveries" :key="d.id">
                <td class="mono">{{ d.deliveryNo }}</td>
                <td>{{ d.date }}</td>
                <td class="mono">¥{{ formatNumber(d.totalAmount) }}</td>
                <td><span class="status-badge" :class="deliveryStatusClass(d.status)">{{ deliveryStatusLabel(d.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="detail-empty">暂无送货记录</div>
        </div>

        <!-- 回款记录列表 -->
        <div v-if="activeDocTab === 'collections'" class="detail-tab-content">
          <table v-if="customerCollections.length > 0" class="detail-table">
            <thead>
              <tr><th>回款单号</th><th>日期</th><th>金额</th><th>方式</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="col in customerCollections" :key="col.id">
                <td class="mono">{{ col.collectionNo }}</td>
                <td>{{ col.date }}</td>
                <td class="mono">¥{{ formatNumber(col.amount) }}</td>
                <td>{{ collectionMethodLabel(col.method) }}</td>
                <td><span class="status-badge" :class="collectionStatusClass(col.status)">{{ collectionStatusLabel(col.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="detail-empty">暂无回款记录</div>
        </div>
      </div>
    </div>

    <!-- 未找到客户 -->
    <div v-else class="empty-state">
      <div class="empty-icon"><Icon name="building" :size="14" /></div>
      <div class="empty-text">未找到客户信息</div>
      <div class="empty-sub">请检查客户ID是否正确，或返回客户列表重新选择</div>
      <button class="btn btn-primary" style="margin-top:var(--space-4)" @click="router.push('/customers')">返回客户列表</button>
    </div>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px"><Icon name="warning" :size="14" /></div>
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/stores/collection'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const deliveryStore = useDeliveryStore()
const collectionStore = useCollectionStore()

const activeDocTab = ref('quotations')
const showConfirm = ref(false)
const confirmMessage = ref('')

const levelColors = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' }
const levelLabelMap = { A: '大客户', B: 'B类客户', C: 'C类客户' }
function levelLabel(lvl) { return levelLabelMap[lvl] || lvl }

const docTabs = [
  { key: 'quotations', icon: 'list', label: '报价单' },
  { key: 'contracts', icon: 'file', label: '合同' },
  { key: 'deliveries', icon: 'truck', label: '送货单' },
  { key: 'collections', icon: 'dollar', label: '回款记录' }
]

const customerId = computed(() => route.query.id || route.params.id || '')
const customer = computed(() => {
  if (!customerId.value) return null
  return customerStore.getCustomerById(customerId.value)
})

const creditUtilization = computed(() => {
  if (!customer.value) return 0
  const limit = customer.value.creditLimit || 0
  if (limit === 0) return 0
  return Math.round(((customer.value.balance || 0) / limit) * 100)
})

/* 关联数据 */
const cname = computed(() => customer.value ? (customer.value.fullName || customer.value.name || '') : '')

const customerQuotations = computed(() => {
  if (!customer.value) return []
  const cid = customer.value.id
  return quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname.value)
})

const customerContracts = computed(() => {
  if (!customer.value) return []
  const cid = customer.value.id
  return contractStore.contracts.filter(ct => ct.partyAId === cid || ct.partyA === cname.value)
})

const customerDeliveries = computed(() => {
  if (!customer.value) return []
  return deliveryStore.deliveries.filter(d => d.customerName === cname.value)
})

const customerCollections = computed(() => {
  if (!customer.value) return []
  const cid = customer.value.id
  return collectionStore.collections.filter(col => col.customerId === cid || col.customerName === cname.value)
})

/* 交易概览统计 */
const tradeStats = computed(() => ({
  quotationCount: customerQuotations.value.length,
  contractCount: customerContracts.value.length,
  deliveryCount: customerDeliveries.value.length,
  collectionAmount: customerCollections.value.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
}))

/* 交易历史时间线 */
const timeline = computed(() => {
  if (!customer.value) return []
  const events = []
  const cid = customer.value.id

  if (customer.value.createdAt) {
    events.push({ date: customer.value.createdAt, text: '创建客户档案', dotClass: 'dot-info' })
  }

  customerQuotations.value.forEach(q => {
    events.push({ date: q.date, text: `报价 ${q.quoteNo} · ¥${formatNumber(q.total)} · ${quoteStatusLabel(q.status)}`, dotClass: 'dot-quote' })
  })

  customerContracts.value.forEach(ct => {
    events.push({ date: ct.signDate || ct.createdAt, text: `签约 ${ct.contractNo} · ¥${formatNumber(ct.totalAmount)} · ${contractStatusLabel(ct.status)}`, dotClass: 'dot-contract' })
  })

  customerDeliveries.value.forEach(d => {
    events.push({ date: d.date, text: `送货 ${d.deliveryNo} · ¥${formatNumber(d.totalAmount)} · ${deliveryStatusLabel(d.status)}`, dotClass: 'dot-delivery' })
  })

  customerCollections.value.forEach(col => {
    events.push({ date: col.date, text: `回款 ${col.collectionNo} · ¥${formatNumber(col.amount)} · ${collectionMethodLabel(col.method)}`, dotClass: 'dot-money' })
  })

  events.sort((a, b) => b.date.localeCompare(a.date))
  return events
})

/* 状态标签 */
function quoteStatusLabel(s) {
  const map = { draft: '草稿', pending: '待审', sent: '已发送', accepted: '已接受', approved: '已批准', rejected: '已拒绝', expired: '已过期' }
  return map[s] || s
}
function quoteStatusClass(s) {
  const map = { draft: 'status-draft', pending: 'status-pending', sent: 'status-sent', accepted: 'status-accepted', approved: 'status-approved', rejected: 'status-rejected', expired: 'status-expired' }
  return map[s] || ''
}
function contractStatusLabel(s) {
  const map = { draft: '草稿', pending_approval: '待审批', approved: '已审批', signed: '已签订', archived: '已归档', cancelled: '已作废' }
  return map[s] || s
}
function contractStatusClass(s) {
  const map = { draft: 'status-draft', pending_approval: 'status-pending', approved: 'status-approved', signed: 'status-accepted', archived: 'status-expired', cancelled: 'status-rejected' }
  return map[s] || ''
}
function deliveryStatusLabel(s) {
  const map = { created: '已创建', pending: '待发货', shipped: '已发货', transit: '运输中', received: '已签收', accepted: '已验收', partial: '部分签收', exception: '异常处理中', returned: '退回', cancelled: '已取消' }
  return map[s] || s
}
function deliveryStatusClass(s) {
  const map = { created: 'status-draft', pending: 'status-pending', shipped: 'status-sent', transit: 'status-pending', received: 'status-accepted', accepted: 'status-approved', partial: 'status-pending', exception: 'status-rejected', returned: 'status-rejected', cancelled: 'status-expired' }
  return map[s] || ''
}
function collectionStatusLabel(s) {
  const map = { pending: '待确认', confirmed: '已确认', completed: '已完成', voided: '已作废' }
  return map[s] || s
}
function collectionStatusClass(s) {
  const map = { pending: 'status-pending', confirmed: 'status-accepted', completed: 'status-approved', voided: 'status-rejected' }
  return map[s] || ''
}
function collectionMethodLabel(m) {
  const map = { bank_transfer: '银行转账', cash: '现金', check: '支票', wechat: '微信', alipay: '支付宝', other: '其他' }
  return map[m] || m || '-'
}

/* 工具函数 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function getTagName(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  return tag ? tag.name : tagId
}

function getTagStyle(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  if (!tag) return {}
  return { background: tag.color + '20', color: tag.color }
}

/* 操作 */
function goBack() {
  router.push('/customers')
}

function goEdit() {
  router.push({ path: '/customers', query: { editId: customer.value.id } })
}

function handleDelete() {
  confirmMessage.value = `确定要删除客户"${customer.value.fullName || customer.value.name}"吗？`
  showConfirm.value = true
}

function confirmDelete() {
  customerStore.deleteCustomer(customer.value.id)
  showConfirm.value = false
  router.push('/customers')
}

onMounted(() => {
  customerStore.initSeedData()
  quotationStore.initSeedData()
  contractStore.initSeedData()
  deliveryStore.initSeedData()
  collectionStore.initSeedData()
})
</script>

<style scoped>
.customer-detail-page { max-width: 1200px; margin: 0 auto; }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin: 2px 0 0; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; }

/* 基本信息顶栏 */
.detail-top-bar { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-4); }
.detail-avatar-lg { width: 64px; height: 64px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-2xl); flex-shrink: 0; }
.detail-top-info { flex: 1; min-width: 0; }
.detail-name { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); }
.detail-top-badges { display: flex; align-items: center; gap: var(--space-2); margin-top: 4px; flex-wrap: wrap; }
.detail-top-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 4px; }
.detail-top-kpis { display: flex; gap: var(--space-3); flex-shrink: 0; }
.kpi-card { text-align: center; padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); min-width: 80px; }
.kpi-label { font-size: 10px; color: var(--color-text-tertiary); }
.kpi-value { font-size: var(--font-size-sm); font-weight: 700; }

/* 两列详情 */
.detail-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); }
.detail-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }
.detail-section-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.detail-fields { }
.detail-field { display: flex; padding: 3px 0; font-size: var(--font-size-sm); }
.df-label { color: var(--color-text-tertiary); width: 80px; flex-shrink: 0; white-space: nowrap; }
.detail-empty { font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--space-4) 0; text-align: center; }

/* 交易概览统计 */
.trade-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
.trade-kpi { text-align: center; padding: var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.trade-kpi-value { font-size: var(--font-size-lg); font-weight: 700; }
.trade-kpi-label { font-size: 10px; color: var(--color-text-tertiary); margin-top: 2px; }

/* Tab 切换 */
.detail-tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-3); }
.detail-tab-btn { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all var(--transition-fast); }
.detail-tab-btn:hover { color: var(--color-text-primary); }
.detail-tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }

/* 表格 */
.detail-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.detail-table th { text-align: left; padding: 6px 8px; color: var(--color-text-tertiary); border-bottom: 1px solid var(--color-border); font-weight: 600; background: var(--color-surface-elevated); }
.detail-table td { padding: 6px 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); }

/* 时间线 */
.timeline { position: relative; padding-left: 24px; }
.timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--color-border); }
.timeline-item { position: relative; padding-bottom: var(--space-4); }
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: var(--radius-full); border: 2px solid var(--color-bg-secondary); }
.dot-info { background: var(--color-accent); }
.dot-quote { background: #3b82f6; }
.dot-money { background: var(--color-success); }
.dot-contract { background: #8b5cf6; }
.dot-delivery { background: #f59e0b; }
.timeline-date { font-size: 10px; color: var(--color-text-tertiary); }
.timeline-text { font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: 2px; }

/* 徽章 */
.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.status-draft { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.status-pending { background: rgba(245,158,11,0.12); color: #f59e0b; }
.status-sent { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-accepted { background: var(--color-success-subtle); color: var(--color-success); }
.status-approved { background: var(--color-success-subtle); color: var(--color-success); }
.status-rejected { background: rgba(239,68,68,0.12); color: #ef4444; }
.status-expired { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.mini-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
.mono { font-family: var(--font-mono); }
.text-danger { color: var(--color-danger, #e53e3e); font-weight: 600; }
.text-warning { color: #f59e0b; }
.text-success { color: var(--color-success, #38a169); }

/* 空状态 */
.empty-state { text-align: center; padding: var(--space-16) 0; }
.empty-icon { font-size: 48px; margin-bottom: var(--space-4); }
.empty-text { font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: var(--space-2); }
.empty-sub { color: var(--color-text-tertiary); font-size: var(--font-size-sm); }

/* 弹窗 */
.modal-overlay { animation: fade-in 200ms ease; }
.modal-dialog { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slide-up 200ms ease; }
.modal-sm { max-width: 400px; }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }
.btn-danger { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
.btn-danger:hover { opacity: 0.9; }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1024px) {
  .detail-grid-2col { grid-template-columns: 1fr 1fr; }
  .trade-summary { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .detail-grid-2col { grid-template-columns: 1fr; }
  .detail-top-bar { flex-direction: column; align-items: flex-start; }
  .detail-top-kpis { width: 100%; }
  .trade-summary { grid-template-columns: repeat(2, 1fr); }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>
