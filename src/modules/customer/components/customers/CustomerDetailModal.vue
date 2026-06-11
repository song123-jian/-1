<template>
  <Teleport to="body">
    <div v-if="showDetail" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <h3>客户360°全景 - {{ currentCustomer?.fullName || currentCustomer?.name }}</h3>
          <button class="modal-close" @click="$emit('close')"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body" v-if="currentCustomer">
          <div class="detail-top-bar">
            <div class="detail-avatar-lg" :style="{ background: levelColors[currentCustomer.level] || '#94a3b8' }">{{ (currentCustomer.fullName || currentCustomer.name || '?').charAt(0) }}</div>
            <div class="detail-top-info">
              <div class="detail-name">{{ currentCustomer.fullName || currentCustomer.name }}</div>
              <div class="detail-top-badges">
                <span class="level-badge" :class="'level-' + currentCustomer.level">{{ levelLabel(currentCustomer.level) }}</span>
                <span class="status-badge" :class="'status-' + currentCustomer.status">{{ currentCustomer.status === 'active' ? '活跃' : '休眠' }}</span>
                <span v-for="tagId in (currentCustomer.tags || [])" :key="tagId" class="mini-tag" :style="_getTagStyle(tagId)">{{ _getTagName(tagId) }}</span>
              </div>
              <div class="detail-top-meta">{{ currentCustomer.customerNo }} · {{ currentCustomer.region || '未知区域' }} · {{ currentCustomer.contactName || currentCustomer.contact || '未指定联系人' }}</div>
            </div>
            <div class="detail-top-kpis">
              <div class="kpi-card">
                <div class="kpi-label">余额</div>
                <div class="kpi-value mono">¥{{ formatNumber(currentCustomer.balance) }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">授信额度</div>
                <div class="kpi-value mono">¥{{ formatNumber(currentCustomer.creditLimit) }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">信用利用率</div>
                <div class="kpi-value mono" :class="creditUtilization > 80 ? 'text-danger' : creditUtilization > 50 ? 'text-warning' : 'text-success'">{{ creditUtilization }}%</div>
              </div>
            </div>
          </div>

          <div class="detail-tabs">
            <button v-for="tab in detailTabs" :key="tab.key" class="detail-tab-btn" :class="{ active: activeDetailTab === tab.key }" @click="activeDetailTab = tab.key"><Icon :name="tab.icon" :size="14" /> {{ tab.label }}</button>
          </div>

          <!-- 基本信息 Tab -->
          <div v-if="activeDetailTab === 'basic'" class="detail-tab-content">
            <div class="detail-grid-2col">
              <div class="detail-section">
                <div class="detail-section-title"><Icon name="list" :size="14" /> 联系信息</div>
                <div class="detail-fields">
                  <div class="detail-field"><span class="df-label">客户编号</span><span class="mono">{{ currentCustomer.customerNo || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">联系人</span><span>{{ currentCustomer.contactName || currentCustomer.contact || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">部门</span><span>{{ currentCustomer.department || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">职位</span><span>{{ currentCustomer.position || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">手机</span><span class="mono">{{ currentCustomer.phone || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">邮箱</span><span>{{ currentCustomer.email || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">地址</span><span>{{ currentCustomer.address || '-' }}</span></div>
                </div>
              </div>
              <div class="detail-section">
                <div class="detail-section-title">[商业] 商业信息</div>
                <div class="detail-fields">
                  <div class="detail-field"><span class="df-label">决策权限</span><span>{{ currentCustomer.decisionAuthority || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">核心关注点</span><span>{{ currentCustomer.coreConcerns || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">区域</span><span>{{ currentCustomer.region || '-' }}</span></div>
                  <div class="detail-field"><span class="df-label">信用额度</span><span class="mono">¥{{ formatNumber(currentCustomer.creditLimit) }}</span></div>
                  <div class="detail-field"><span class="df-label">创建时间</span><span>{{ currentCustomer.createdAt || '-' }}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 交易概览 Tab -->
          <div v-if="activeDetailTab === 'trade'" class="detail-tab-content">
            <div class="trade-summary">
              <div class="trade-kpi">
                <div class="trade-kpi-value mono">¥{{ formatNumber(customerTradeStats.totalQuotationAmount) }}</div>
                <div class="trade-kpi-label">报价总额</div>
              </div>
              <div class="trade-kpi">
                <div class="trade-kpi-value mono">{{ customerTradeStats.quotationCount }}</div>
                <div class="trade-kpi-label">报价次数</div>
              </div>
              <div class="trade-kpi">
                <div class="trade-kpi-value mono">¥{{ formatNumber(customerTradeStats.totalCollectionAmount) }}</div>
                <div class="trade-kpi-label">回款总额</div>
              </div>
              <div class="trade-kpi">
                <div class="trade-kpi-value mono">{{ customerTradeStats.collectionCount }}</div>
                <div class="trade-kpi-label">回款次数</div>
              </div>
              <div class="trade-kpi">
                <div class="trade-kpi-value mono" :class="customerTradeStats.avgProfitMargin > 15 ? 'text-success' : 'text-warning'">{{ customerTradeStats.avgProfitMargin }}%</div>
                <div class="trade-kpi-label">平均利润率</div>
              </div>
              <div class="trade-kpi">
                <div class="trade-kpi-value mono" :class="customerTradeStats.collectionRate >= 80 ? 'text-success' : customerTradeStats.collectionRate >= 50 ? 'text-warning' : 'text-danger'">{{ customerTradeStats.collectionRate }}%</div>
                <div class="trade-kpi-label">回款率</div>
              </div>
            </div>

            <div class="detail-section" style="margin-top:var(--space-4)">
              <div class="detail-section-title"><Icon name="table" :size="14" /> 报价记录</div>
              <table v-if="customerQuotations.length > 0" class="detail-table">
                <thead>
                  <tr><th>报价单号</th><th>日期</th><th>金额</th><th>利润率</th><th>状态</th></tr>
                </thead>
                <tbody>
                  <tr v-for="q in customerQuotations" :key="q.id">
                    <td class="mono">{{ q.quoteNo }}</td>
                    <td>{{ q.date }}</td>
                    <td class="mono">¥{{ formatNumber(q.total) }}</td>
                    <td class="mono">{{ q.profitMargin }}%</td>
                    <td><span class="status-badge" :class="quoteStatusClass(q.status)">{{ quoteStatusLabel(q.status) }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="detail-empty">暂无报价记录</div>
            </div>

            <div class="detail-section" style="margin-top:var(--space-4)">
              <div class="detail-section-title"><Icon name="dollar" :size="14" /> 回款记录</div>
              <table v-if="customerCollections.length > 0" class="detail-table">
                <thead>
                  <tr><th>回款单号</th><th>日期</th><th>金额</th><th>方式</th></tr>
                </thead>
                <tbody>
                  <tr v-for="col in customerCollections" :key="col.id">
                    <td class="mono">{{ col.collectionNo }}</td>
                    <td>{{ col.date }}</td>
                    <td class="mono">¥{{ formatNumber(col.amount) }}</td>
                    <td>{{ collectionMethodLabel(col.method) }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="detail-empty">暂无回款记录</div>
            </div>

            <div class="detail-section" style="margin-top:var(--space-4)">
              <div class="detail-section-title"><Icon name="file" :size="14" /> 合同记录</div>
              <table v-if="customerContracts.length > 0" class="detail-table">
                <thead>
                  <tr><th>合同编号</th><th>金额</th><th>有效期</th><th>状态</th></tr>
                </thead>
                <tbody>
                  <tr v-for="ct in customerContracts" :key="ct.id">
                    <td class="mono">{{ ct.contractNo }}</td>
                    <td class="mono">¥{{ formatNumber(ct.amount) }}</td>
                    <td>{{ ct.startDate }} ~ {{ ct.endDate }}</td>
                    <td><span class="status-badge" :class="contractStatusClass(ct.status)">{{ contractStatusLabel(ct.status) }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="detail-empty">暂无合同记录</div>
            </div>
          </div>

          <!-- 标签管理 Tab -->
          <div v-if="activeDetailTab === 'tags'" class="detail-tab-content">
            <div class="detail-section">
              <div class="detail-section-title"><Icon name="tag" :size="14" /> 当前标签</div>
              <div class="detail-tags-area" v-if="(currentCustomer.tags || []).length > 0">
                <span v-for="tagId in (currentCustomer.tags || [])" :key="tagId" class="detail-tag" :style="_getTagStyle(tagId)">
                  {{ _getTagName(tagId) }}
                  <span class="tag-remove" @click="removeTag(tagId)"><Icon name="close" :size="14" /></span>
                </span>
              </div>
              <div v-else class="detail-empty">暂无标签</div>
            </div>
            <div class="detail-section" style="margin-top:var(--space-4)">
              <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
                <span>[+] 添加标签</span>
                <button class="btn btn-ghost btn-sm" @click="showInlineTagCreate = true">[+] 新建标签</button>
              </div>
              <div v-if="!showInlineTagCreate">
                <div v-for="group in availableTagsByGroup" :key="group.name" style="margin-bottom:var(--space-3)">
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1)">{{ group.name }}</div>
                  <div class="detail-tags-available">
                    <span v-for="tag in group.tags" :key="tag.id" class="tag-add-btn" :style="{ borderColor: tag.color, color: tag.color }" @click="addTag(tag.id)">{{ tag.name }}</span>
                  </div>
                </div>
                <div v-if="availableTags.length === 0" class="detail-empty">所有标签已添加</div>
              </div>
              <div v-else class="inline-tag-create">
                <div class="form-row form-row-2" style="gap:var(--space-2)">
                  <div class="form-group" style="margin:0">
                    <input v-model="inlineTagForm.name" type="text" class="form-input" placeholder="标签名称" style="font-size:var(--font-size-xs)" />
                  </div>
                  <div class="form-group" style="margin:0">
                    <select v-model="inlineTagForm.group" class="form-select" style="font-size:var(--font-size-xs)">
                      <option v-for="g in detailTagGroups" :key="g" :value="g">{{ g }}</option>
                    </select>
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);align-items:center">
                  <div class="color-picker-row">
                    <span v-for="c in inlinePresetColors" :key="c" class="color-dot-sm" :class="{ active: inlineTagForm.color === c }" :style="{ background: c }" @click="inlineTagForm.color = c"></span>
                  </div>
                  <button class="btn btn-primary btn-sm" @click="createInlineTag" :disabled="!inlineTagForm.name.trim()">创建并添加</button>
                  <button class="btn btn-ghost btn-sm" @click="showInlineTagCreate = false">取消</button>
                </div>
              </div>
            </div>
            <div class="detail-section" style="margin-top:var(--space-4)">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span class="detail-section-title"><Icon name="list" :size="14" /> 标签库管理</span>
                <router-link to="/tag-category" class="btn btn-ghost btn-sm">前往标签分类 <Icon name="chevronRight" :size="14" /></router-link>
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)">在标签分类页面可编辑、删除标签及管理分组</div>
            </div>
          </div>

          <!-- 互动时间线 Tab -->
          <div v-if="activeDetailTab === 'timeline'" class="detail-tab-content">
            <div class="timeline">
              <div v-for="(evt, idx) in customerTimeline" :key="idx" class="timeline-item" :style="{ animationDelay: idx * 80 + 'ms' }">
                <div class="timeline-dot" :class="evt.dotClass"></div>
                <div class="timeline-line" v-if="idx < customerTimeline.length - 1"></div>
                <div class="timeline-content">
                  <div class="timeline-date">{{ evt.date }}</div>
                  <div class="timeline-text">{{ evt.text }}</div>
                </div>
              </div>
              <div v-if="customerTimeline.length === 0" class="detail-empty">暂无互动记录</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="$emit('close')">关闭</button>
          <button class="btn btn-outline" @click="$emit('open360', currentCustomer)"><Icon name="eye" :size="14" /> 查看360°全景</button>
          <button class="btn btn-primary" @click="$emit('edit', currentCustomer)">编辑客户</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useDataStore } from '@/stores/data'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { levelColors, levelLabel, getTagName, getTagStyle } from '@/utils/customerHelpers'
import { formatNumber } from '@/utils/format'
import { quoteStatusLabel, quoteStatusClass, contractStatusLabel, contractStatusClass, collectionMethodLabel } from '@/utils/statusMaps'

const customerStore = useCustomerStore()
const dataStore = useDataStore()
const quotationStore = useQuotationStore()

const props = defineProps({
  showDetail: { type: Boolean, required: true },
  detailCustomer: { type: Object, default: null }
})

defineEmits(['close', 'edit', 'open360'])

function _getTagName(tagId) {
  return getTagName(customerStore.tags, tagId)
}

function _getTagStyle(tagId) {
  return getTagStyle(customerStore.tags, tagId)
}

// 从 store 获取最新的客户数据（响应式）
const currentCustomer = computed(() => {
  if (!props.detailCustomer) return null
  return customerStore.customers.find(c => c.id === props.detailCustomer.id) || props.detailCustomer
})

// 详情 Tab
const activeDetailTab = ref('basic')
const detailTabs = [
  { key: 'basic', icon: 'list', label: '基本信息' },
  { key: 'trade', icon: 'dollar', label: '交易概览' },
  { key: 'tags', icon: 'tag', label: '标签管理' },
  { key: 'timeline', icon: 'calendar', label: '互动时间线' }
]

// 打开详情时重置 Tab
watch(() => props.showDetail, (val) => {
  if (val) activeDetailTab.value = 'basic'
})

// 信用利用率
const creditUtilization = computed(() => {
  if (!currentCustomer.value) return 0
  const limit = currentCustomer.value.creditLimit || 0
  if (limit === 0) return 0
  return Math.round(((currentCustomer.value.balance || 0) / limit) * 100)
})

// 交易数据
const customerQuotations = computed(() => {
  if (!currentCustomer.value) return []
  const cid = currentCustomer.value.id
  const cname = currentCustomer.value.fullName || currentCustomer.value.name || ''
  return quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname)
})

const customerCollections = computed(() => {
  if (!currentCustomer.value) return []
  const cid = currentCustomer.value.id
  const cname = currentCustomer.value.fullName || currentCustomer.value.name || ''
  return dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname)
})

const customerContracts = computed(() => {
  if (!currentCustomer.value) return []
  const cid = currentCustomer.value.id
  const cname = currentCustomer.value.fullName || currentCustomer.value.name || ''
  return dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname)
})

const customerTradeStats = computed(() => {
  const quotes = customerQuotations.value
  const cols = customerCollections.value
  const totalQuotationAmount = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const totalCollectionAmount = cols.reduce((s, c) => s + (c.amount || 0), 0)
  const profitMargins = quotes.filter(q => q.profitMargin).map(q => q.profitMargin)
  const avgProfitMargin = profitMargins.length > 0 ? Math.round(profitMargins.reduce((s, m) => s + m, 0) / profitMargins.length * 10) / 10 : 0
  const collectionRate = totalQuotationAmount > 0 ? Math.round((totalCollectionAmount / totalQuotationAmount) * 100) : 0
  return {
    quotationCount: quotes.length,
    totalQuotationAmount,
    collectionCount: cols.length,
    totalCollectionAmount,
    avgProfitMargin,
    collectionRate
  }
})

// 时间线
const customerTimeline = computed(() => {
  if (!currentCustomer.value) return []
  const events = []
  const cid = currentCustomer.value.id
  const cname = currentCustomer.value.fullName || currentCustomer.value.name || ''

  if (currentCustomer.value.createdAt) {
    events.push({ date: currentCustomer.value.createdAt, text: '创建客户档案', dotClass: 'dot-info' })
  }

  quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname).forEach(q => {
    events.push({ date: q.date, text: `报价 ${q.quoteNo} · ¥${formatNumber(q.total)} · ${quoteStatusLabel(q.status)}`, dotClass: 'dot-quote' })
  })

  dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname).forEach(col => {
    events.push({ date: col.date, text: `回款 ${col.collectionNo} · ¥${formatNumber(col.amount)} · ${collectionMethodLabel(col.method)}`, dotClass: 'dot-money' })
  })

  dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname).forEach(ct => {
    events.push({ date: ct.startDate, text: `签约 ${ct.contractNo} · ¥${formatNumber(ct.amount)} · ${contractStatusLabel(ct.status)}`, dotClass: 'dot-contract' })
  })

  events.sort((a, b) => b.date.localeCompare(a.date))
  return events
})

// 标签管理
const availableTags = computed(() => {
  if (!currentCustomer.value) return []
  return customerStore.tags.filter(t => !t.hidden && !(currentCustomer.value.tags || []).includes(t.id))
})

const availableTagsByGroup = computed(() => {
  const tags = availableTags.value
  const groups = [...new Set(tags.map(t => t.group || '其他'))].sort()
  return groups.map(name => ({
    name,
    tags: tags.filter(t => (t.group || '其他') === name)
  }))
})

const detailTagGroups = computed(() => {
  const groups = new Set()
  customerStore.tags.filter(t => !t.hidden).forEach(t => { if (t.group) groups.add(t.group) })
  return [...groups].sort()
})

const showInlineTagCreate = ref(false)
const inlineTagForm = reactive({ name: '', color: '#3b82f6', group: '关系' })
const inlinePresetColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#94a3b8']

function addTag(tagId) {
  if (!currentCustomer.value) return
  customerStore.addTagToCustomer(currentCustomer.value.id, tagId)
}

function removeTag(tagId) {
  if (!currentCustomer.value) return
  customerStore.removeTagFromCustomer(currentCustomer.value.id, tagId)
}

function createInlineTag() {
  const name = inlineTagForm.name.trim()
  if (!name) return
  const id = name
  if (customerStore.tags.some(t => t.id === id)) {
    addTag(id)
    showInlineTagCreate.value = false
    return
  }
  customerStore.addTag({ id, name, color: inlineTagForm.color, group: inlineTagForm.group })
  addTag(id)
  showInlineTagCreate.value = false
  inlineTagForm.name = ''
  inlineTagForm.color = '#3b82f6'
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: var(--z-modal); display: flex; align-items: center; justify-content: center; animation: fade-in 200ms ease}
.modal-dialog { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slide-up 200ms ease}
.modal-xl { max-width: 1100px; width: 95vw}
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 1}
.modal-header h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary)}
.modal-close { background: none; border: none; font-size: 18px; color: var(--color-text-tertiary); cursor: pointer; padding: var(--space-1); border-radius: var(--radius-sm)}
.modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary)}
.modal-body { padding: var(--space-5)}
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border)}
.detail-top-bar { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-4)}
.detail-avatar-lg { width: 64px; height: 64px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-2xl); flex-shrink: 0}
.detail-top-info { flex: 1; min-width: 0}
.detail-name { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary)}
.detail-top-badges { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-1); flex-wrap: wrap}
.detail-top-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)}
.detail-top-kpis { display: flex; gap: var(--space-3); flex-shrink: 0}
.kpi-card { text-align: center; padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); min-width: 80px; border: 1px solid var(--color-border); transition: transform 0.2s ease, box-shadow 0.2s ease}
.kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm)}
.kpi-label { font-size: 10px; color: var(--color-text-tertiary)}
.kpi-value { font-size: var(--font-size-sm); font-weight: 700}
.text-danger { color: var(--color-danger, #e53e3e); font-weight: 600}
.text-warning { color: #f59e0b}
.text-success { color: var(--color-success, #38a169)}
.detail-tabs { display: flex; gap: var(--space-1); border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4)}
.detail-tab-btn { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -var(--space-1); transition: all var(--transition-fast)}
.detail-tab-btn:hover { color: var(--color-text-primary)}
.detail-tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600}
.detail-tab-content {}
.detail-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4)}
.detail-section {}
.detail-section-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border)}
.detail-fields {}
.detail-field { display: flex; padding: var(--space-1) 0; font-size: var(--font-size-sm)}
.df-label { color: var(--color-text-tertiary); width: 80px; flex-shrink: 0; white-space: nowrap}
.detail-empty { font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--space-4) 0; text-align: center}
.trade-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-3)}
.trade-kpi { text-align: center; padding: var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md)}
.trade-kpi-value { font-size: var(--font-size-lg); font-weight: 700}
.trade-kpi-label { font-size: 10px; color: var(--color-text-tertiary); margin-top: var(--space-1)}
.detail-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm)}
.detail-table th{padding: var(--space-2) var(--space-2); border-bottom: 1px solid var(--color-border); text-align: left; overflow-wrap: break-word; word-wrap: break-word}
.detail-table td {padding: var(--space-2) var(--space-2); border-bottom: 1px solid var(--color-border); text-align: left; overflow-wrap: break-word; word-wrap: break-word}
.detail-table th { background: var(--color-surface-elevated); font-weight: 600; position: sticky; top: 0}
.detail-tags-area { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3)}
.detail-tag { display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-2); border-radius: 16px; font-size: 12px}
.tag-remove { cursor: pointer; font-size: 10px; opacity: 0.7}
.tag-remove:hover { opacity: 1}
.detail-tags-available { display: flex; flex-wrap: wrap; gap: var(--space-2)}
.tag-add-btn { padding: var(--space-1) var(--space-2); border-radius: 14px; font-size: 11px; cursor: pointer; border: 1px dashed; background: transparent; transition: all var(--transition-fast)}
.tag-add-btn:hover { border-style: solid}
.inline-tag-create { padding: var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md)}
.color-picker-row { display: flex; flex-wrap: wrap; gap: var(--space-1); align-items: center}
.color-dot-sm { width: 18px; height: 18px; border-radius: var(--radius-full); cursor: pointer; border: 2px solid transparent; transition: all var(--transition-fast)}
.color-dot-sm:hover { transform: scale(1.15)}
.color-dot-sm.active { border-color: var(--color-text-primary); box-shadow: 0 0 0 2px var(--color-accent-subtle)}
.timeline { position: relative; padding-left: var(--space-6)}
.timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--color-border)}
@keyframes timelineSlideIn { from { opacity: 0; transform: translateX(-8px)} to { opacity: 1; transform: translateX(0)} }
.timeline-item { position: relative; padding-bottom: var(--space-4); animation: timelineSlideIn 0.4s ease-out both}
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: var(--radius-full); border: 2px solid var(--color-bg-secondary); z-index: 1}
.timeline-line { position: absolute; left: -16px; top: 16px; bottom: -4px; width: 2px; background: var(--color-border)}
.dot-info { background: var(--color-accent); box-shadow: 0 0 6px rgba(59, 130, 246, 0.3)}
.dot-quote { background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.3)}
.dot-money { background: var(--color-success); box-shadow: 0 0 6px rgba(34, 197, 94, 0.3)}
.dot-contract { background: #8b5cf6; box-shadow: 0 0 6px rgba(139, 92, 246, 0.3)}
.timeline-date { font-size: 10px; color: var(--color-text-tertiary)}
.timeline-text { font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: var(--space-1)}
.mono { font-family: var(--font-mono)}
.level-badge { padding: var(--space-1) var(--space-2); border-radius: 12px; font-size: 12px; font-weight: 700}
.level-A { background: rgba(239,68,68,0.12); color: #ef4444}
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b}
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6}
.status-badge { padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: 10px; font-weight: 600}
.status-active { background: var(--color-success-subtle); color: var(--color-success)}
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary)}
.status-draft { background: var(--color-bg-tertiary); color: var(--color-text-tertiary)}
.status-pending { background: rgba(245,158,11,0.12); color: #f59e0b}
.status-sent { background: rgba(59,130,246,0.12); color: #3b82f6}
.status-accepted { background: var(--color-success-subtle); color: var(--color-success)}
.status-approved { background: var(--color-success-subtle); color: var(--color-success)}
.status-rejected { background: rgba(239,68,68,0.12); color: #ef4444}
.status-expired { background: var(--color-bg-tertiary); color: var(--color-text-tertiary)}
.mini-tag { display: inline-block; font-size: 10px; padding: var(--space-1) var(--space-2); border-radius: 10px}
@keyframes fade-in { from { opacity: 0} to { opacity: 1} }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px)} to { opacity: 1; transform: translateY(0)} }
@media (max-width: 768px) {
  .detail-grid-2col { grid-template-columns: 1fr}
  .detail-top-bar { flex-direction: column; align-items: flex-start}
  .detail-top-kpis { width: 100%}
  .trade-summary { grid-template-columns: repeat(3, 1fr)}
}
</style>
