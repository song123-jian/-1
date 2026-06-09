<template>
  <div class="customer-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">客户管理</h2>
        <p class="page-header-subtitle">全面的客户关系管理，支持多视图、高级筛选、联系人管理</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" @click="currentView = v.key"><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <button v-if="canCreate" class="btn btn-primary" @click="openAddModal">+ 新增客户</button>
        <button class="btn btn-outline" @click="handleDownloadTemplate"><Icon name="file" :size="14" /> 模板下载</button>
        <button class="btn btn-outline" @click="handleBatchAdd"><Icon name="list" :size="14" /> 批量增加</button>
        <button class="btn btn-outline" @click="handleExport"><Icon name="download" :size="14" /> 导出CSV</button>
        <button v-if="canDelete" class="btn btn-outline btn-danger" @click="handleBatchDelete" :disabled="selectedIds.length === 0"><Icon name="delete" :size="14" /> 批量删除</button>
      </div>
    </div>

    <div class="customer-toolbar">
      <div class="customer-search-grid">
        <div class="search-field">
          <label class="search-field-label">客户编号</label>
          <input v-model="advFilterNo" type="text" class="search-input" placeholder="输入客户编号..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">客户名称</label>
          <input v-model="advFilterName" type="text" class="search-input" placeholder="输入客户名称..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">手机号码</label>
          <input v-model="advFilterPhone" type="text" class="search-input" placeholder="输入手机号..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">核心关注点</label>
          <input v-model="advFilterConcerns" type="text" class="search-input" placeholder="输入关注点..." />
        </div>
        <button class="btn btn-ghost search-reset-btn" @click="advFilterNo = ''; advFilterName = ''; advFilterPhone = ''; advFilterConcerns = ''">重置</button>
      </div>
      <div class="customer-filters">
        <select v-model="filterLevel" class="form-select filter-select">
          <option value="all">全部等级</option>
          <option value="A">大客户</option>
          <option value="B">B类客户</option>
          <option value="C">C类客户</option>
        </select>
        <select v-model="filterDept" class="form-select filter-select">
          <option value="all">全部部门</option>
          <option v-for="d in customerStore.allDepartments" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filterRegion" class="form-select filter-select">
          <option value="all">全部区域</option>
          <option v-for="r in customerStore.allRegions" :key="r" :value="r">{{ r }}</option>
        </select>
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="dormant">休眠</option>
        </select>
        <select v-model="filterDecision" class="form-select filter-select">
          <option value="all">全部决策权限</option>
          <option value="决策者">决策者</option>
          <option value="影响者">影响者</option>
          <option value="使用者">使用者</option>
          <option value="推荐者">推荐者</option>
          <option value="把关者">把关者</option>
        </select>
        <select v-model="filterTag" class="form-select filter-select">
          <option value="all">全部标签</option>
          <option v-for="t in customerStore.tags.filter(t => !t.hidden)" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="level">按等级</option>
          <option value="balance">按余额</option>
          <option value="creditLimit">按信用额度</option>
          <option value="createdAt">按创建时间</option>
          <option value="name">按名称</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"><Icon :name="sortDir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="14" /></button>
      </div>
    </div>

    <div class="customer-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span> 总计 {{ customerStore.customers.length }}</div>
      <div class="stat-item"><span class="stat-dot active"></span> 活跃 {{ customerStore.activeCount }}</div>
      <div class="stat-item"><span class="stat-dot dormant"></span> 休眠 {{ customerStore.dormantCount }}</div>
      <div class="stat-item level-stats">
        <span v-for="lvl in levelList" :key="lvl" class="level-stat" :class="'ls-' + lvl">{{ levelLabel(lvl) }} {{ customerStore.levelStats[lvl] }}</span>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <select class="form-select" style="width:120px;font-size:12px" v-model="batchLevel" @change="handleBatchLevel">
        <option value="">调整等级...</option>
        <option value="A">大客户</option>
        <option value="B">B类客户</option>
        <option value="C">C类客户</option>
      </select>
      <button class="btn btn-outline" @click="handleBatchTag"><Icon name="tag" :size="14" /> 批量标签</button>
      <button class="btn btn-outline" @click="handleBatchExport"><Icon name="download" :size="14" /> 导出选中</button>
      <button class="btn btn-outline" @click="selectedIds = []">取消选择</button>
    </div>

    <!-- 表格视图 -->
    <CustomerTable v-if="currentView === 'table'"
      :customers="filteredCustomers"
      :selected-ids="selectedIds"
      @update:selected-ids="selectedIds = $event"
      @open-edit="openEditModal"
      @open-detail="openDetailModal"
      @handle-delete="handleDelete"
    />

    <!-- 列表视图 -->
    <CustomerList v-if="currentView === 'list'"
      :customers="filteredCustomers"
      :selected-ids="selectedIds"
      @update:selected-ids="selectedIds = $event"
      @open-edit="openEditModal"
      @open-detail="openDetailModal"
      @handle-delete="handleDelete"
    />

    <!-- 卡片视图 -->
    <CustomerCardView v-if="currentView === 'card'"
      :customers="filteredCustomers"
      :selected-ids="selectedIds"
      @open-edit="openEditModal"
      @open-detail="openDetailModal"
      @handle-delete="handleDelete"
    />

    <!-- 日历视图 -->
    <CustomerCalendarView v-if="currentView === 'calendar'"
      :customers="filteredCustomers"
      @open-detail="openDetailModal"
    />

    <!-- 周视图 -->
    <CustomerWeekView v-if="currentView === 'week'"
      :customers="filteredCustomers"
      @open-detail="openDetailModal"
    />

    <!-- 空状态 -->
    <div v-if="filteredCustomers.length === 0" class="empty-state">
      <div class="empty-icon"><Icon name="building" :size="14" /></div>
      <div class="empty-text">暂无匹配的客户数据</div>
      <div class="empty-sub">尝试调整筛选条件或添加新客户</div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingCustomer ? '编辑客户' : '新增客户' }}</h3>
            <button class="modal-close" @click="closeModal"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div v-if="!editingCustomer" class="smart-recognize-panel" :class="{ expanded: showSmartRec }">
              <div class="smart-recognize-header" @click="showSmartRec = !showSmartRec">
                <div class="sr-header-left"><span class="sr-icon">[智能]</span> 智能识别 <span class="sr-badge sr-badge-success">AI</span></div>
                <span class="sr-toggle">{{ showSmartRec ? '收起' : '展开' }} <Icon :name="showSmartRec ? 'chevronUp' : 'chevronDown'" :size="14" /></span>
              </div>
              <div v-if="showSmartRec" class="smart-recognize-body">
                <textarea v-model="smartRecInput" class="form-textarea" rows="3" placeholder="粘贴客户信息文本（名片、邮件等），AI将自动识别并提取关键字段..."></textarea>
                <div class="sr-actions">
                  <label class="btn btn-ghost btn-sm">
                    <Icon name="file" :size="14" /> 上传文件
                    <input type="file" style="display:none" @change="handleSmartFileUpload" />
                  </label>
                  <button class="btn btn-ghost btn-sm" @click="smartRecInput = ''; smartRecResult = null">清空</button>
                  <button class="btn btn-primary btn-sm" @click="runSmartRecognize"><Icon name="search" :size="14" /> 开始识别</button>
                </div>
                <div v-if="smartRecResult" class="sr-result-panel">
                  <div class="sr-result-header" :class="{ 'has-warnings': smartRecResult.lowConfCount > 0 }">
                    <Icon name="checkCircle" :size="14" /> 已识别 <strong>{{ smartRecResult.identifiedCount }}</strong> 个字段
                    <span v-if="smartRecResult.lowConfCount > 0" class="sr-badge sr-badge-warning">{{ smartRecResult.lowConfCount }}项需确认</span>
                    <span v-else class="sr-badge sr-badge-success">全部可信</span>
                  </div>
                  <div class="sr-result-body">
                    <div v-for="item in smartRecResult.items" :key="item.key" class="sr-result-item">
                      <span class="sr-result-label">{{ item.label }}</span>
                      <input class="sr-result-input" v-model="item.value" />
                      <span class="sr-result-confidence" :class="item.confLevel">{{ item.confLabel }} {{ item.confidence }}%</span>
                    </div>
                  </div>
                  <div v-if="smartRecResult.identifiedCount === 0" class="sr-empty-tip">未能识别出有效客户信息，请检查输入内容格式</div>
                  <div v-if="smartRecResult.identifiedCount > 0" class="sr-result-actions">
                    <button class="btn btn-ghost btn-sm" @click="runSmartRecognize">重新识别</button>
                    <button class="btn btn-primary btn-sm" @click="applySmartRecognize"><Icon name="checkCircle" :size="14" /> 确认填入</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>客户编号</label>
                <input v-model="form.customerNo" type="text" class="form-input" :readonly="!!editingCustomer" :style="editingCustomer ? 'opacity:0.7;cursor:not-allowed' : ''" />
              </div>
              <div class="form-group">
                <label>客户全称</label>
                <input v-model="form.fullName" type="text" class="form-input" placeholder="公司全称（选填）" />
              </div>
              <div class="form-group">
                <label>姓名</label>
                <input v-model="form.contactName" type="text" class="form-input" placeholder="联系人姓名（选填）" />
              </div>
              <div class="form-group">
                <label>部门</label>
                <select v-model="form.department" class="form-select" @change="handleDeptChange">
                  <option value="">请选择部门</option>
                  <option v-for="d in customerStore.allDepartments" :key="d" :value="d">{{ d }}</option>
                  <option value="__new__">+ 新建部门...</option>
                </select>
              </div>
              <div class="form-group">
                <label>职位</label>
                <input v-model="form.position" type="text" class="form-input" placeholder="职位（选填）" />
              </div>
              <div class="form-group">
                <label>手机号码</label>
                <input v-model="form.phone" type="tel" class="form-input" placeholder="手机号码（选填）" maxlength="11" @input="form.phone = form.phone.replace(/[^0-9]/g, '')" />
              </div>
              <div class="form-group">
                <label>客户等级</label>
                <select v-model="form.level" class="form-select">
                  <option value="A">大客户</option>
                  <option value="B">B类客户</option>
                  <option value="C">C类客户</option>
                </select>
              </div>
              <div class="form-group">
                <label>决策权限</label>
                <select v-model="form.decisionAuthority" class="form-select">
                  <option value="">请选择</option>
                  <option value="决策者">决策者</option>
                  <option value="影响者">影响者</option>
                  <option value="使用者">使用者</option>
                  <option value="推荐者">推荐者</option>
                  <option value="把关者">把关者</option>
                </select>
              </div>
              <div class="form-group">
                <label>邮箱</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="邮箱地址" />
              </div>
              <div class="form-group full-width">
                <label>核心关注点</label>
                <textarea v-model="form.coreConcerns" class="form-textarea" rows="2" placeholder="如：交货速度、产品质量（选填）"></textarea>
              </div>
              <div class="form-group">
                <label>地区</label>
                <input v-model="form.region" type="text" class="form-input" placeholder="如：华东、华北" />
              </div>
              <div class="form-group">
                <label>信用额度</label>
                <input v-model.number="form.creditLimit" type="number" step="0.01" min="0" class="form-input" placeholder="0" @input="form.creditLimit = String(form.creditLimit).replace(/[^0-9.]/g, '')" />
              </div>
              <div class="form-group full-width">
                <label>地址</label>
                <textarea v-model="form.address" class="form-textarea" rows="2" placeholder="详细地址"></textarea>
              </div>
              <div class="form-group full-width">
                <label>标签</label>
                <div class="tag-selector">
                  <span v-for="tag in customerStore.tags.filter(t => !t.hidden)" :key="tag.id"
                    class="tag-option"
                    :class="{ selected: form.tags.includes(tag.id) }"
                    :style="form.tags.includes(tag.id) ? { background: tag.color + '20', color: tag.color, borderColor: tag.color } : {}"
                    @click="toggleFormTag(tag.id)"
                  >{{ tag.name }}</span>
                </div>
              </div>
            </div>
            <div v-if="formErrors.length > 0" class="form-errors-block">
              <div v-for="(err, idx) in formErrors" :key="idx" class="form-error-item">{{ err }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModal">取消</button>
            <button class="btn btn-primary" @click="saveCustomer">{{ editingCustomer ? '保存修改' : '新增客户' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 客户详情弹窗 -->
    <CustomerDetailModal
      :show-detail="showDetail"
      :detail-customer="detailCustomer"
      @close="showDetail = false"
      @edit="handleDetailEdit"
      @open360="goCustomerDetail"
    />

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px"><Icon name="warning" :size="14" /></div>
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">{{ confirmType === 'warning' ? '知道了' : '取消' }}</button>
            <button v-if="confirmType === 'confirm'" class="btn btn-danger" @click="confirmAction">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 批量标签弹窗 -->
    <Teleport to="body">
      <div v-if="showBatchTagModal" class="modal-overlay" @click.self="showBatchTagModal = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <h3><Icon name="tag" :size="14" /> 批量添加标签</h3>
            <button class="modal-close" @click="showBatchTagModal = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text-secondary)">
              已选 <strong>{{ selectedIds.length }}</strong> 位客户，请选择要添加的标签：
            </div>
            <div class="batch-tag-list">
              <span v-for="tag in customerStore.tags.filter(t => !t.hidden)" :key="tag.id"
                class="batch-tag-option"
                :class="{ selected: batchSelectedTags.includes(tag.id) }"
                :style="batchSelectedTags.includes(tag.id) ? { background: tag.color + '20', color: tag.color, borderColor: tag.color } : {}"
                @click="toggleBatchTag(tag.id)"
              >{{ tag.name }}</span>
            </div>
            <div v-if="customerStore.tags.filter(t => !t.hidden).length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);text-align:center;padding:var(--space-4)">
              暂无可用标签，请先在标签分类中创建
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showBatchTagModal = false">取消</button>
            <button class="btn btn-primary" @click="applyBatchTags" :disabled="batchSelectedTags.length === 0">确认添加 ({{ batchSelectedTags.length }})</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useDataStore } from '@/stores/data'
import { useSessionStore } from '@/stores/session'
import { useSmartRecognize } from '@/components/customers/useSmartRecognize'
import { useCustomerImport } from '@/components/customers/useCustomerImport'
import { levelColors, levelLabel } from '@/utils/customerHelpers'
import { formatNumber } from '@/utils/format'

import CustomerTable from '@/components/customers/CustomerTable.vue'
import CustomerList from '@/components/customers/CustomerList.vue'
import CustomerCardView from '@/components/customers/CustomerCardView.vue'
import CustomerCalendarView from '@/components/customers/CustomerCalendarView.vue'
import CustomerWeekView from '@/components/customers/CustomerWeekView.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'

const router = useRouter()
const route = useRoute()
const customerStore = useCustomerStore()
const dataStore = useDataStore()
const sessionStore = useSessionStore()

const canCreate = !['查看者'].includes(sessionStore.currentRole)
const canDelete = ['管理员', '总经理'].includes(sessionStore.currentRole)

const currentView = ref('table')
const advFilterNo = ref('')
const advFilterName = ref('')
const advFilterPhone = ref('')
const advFilterConcerns = ref('')
const filterLevel = ref('all')
const filterDept = ref('all')
const filterRegion = ref('all')
const filterStatus = ref('all')
const filterDecision = ref('all')
const filterTag = ref('all')
const sortField = ref('level')
const sortDir = ref('asc')
const selectedIds = ref([])
const showModal = ref(false)
const showDetail = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const confirmType = ref('confirm') // 'confirm' | 'warning'
const editingCustomer = ref(null)
const detailCustomer = ref(null)
const batchLevel = ref('')
const showBatchTagModal = ref(false)
const batchSelectedTags = ref([])
const formErrors = ref([])

const levelList = ['A', 'B', 'C']

const viewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const filteredCustomers = computed(() => {
  let list = [...customerStore.customers]
  if (advFilterNo.value) list = list.filter(c => (c.customerNo || '').includes(advFilterNo.value))
  if (advFilterName.value) list = list.filter(c => (c.fullName || c.name || '').includes(advFilterName.value))
  if (advFilterPhone.value) list = list.filter(c => (c.phone || '').includes(advFilterPhone.value))
  if (advFilterConcerns.value) list = list.filter(c => (c.coreConcerns || '').includes(advFilterConcerns.value))
  if (filterLevel.value !== 'all') list = list.filter(c => c.level === filterLevel.value)
  if (filterDept.value !== 'all') list = list.filter(c => c.department === filterDept.value)
  if (filterRegion.value !== 'all') list = list.filter(c => c.region === filterRegion.value)
  if (filterStatus.value !== 'all') list = list.filter(c => c.status === filterStatus.value)
  if (filterDecision.value !== 'all') list = list.filter(c => c.decisionAuthority === filterDecision.value)
  if (filterTag.value !== 'all') list = list.filter(c => c.tags && c.tags.includes(filterTag.value))
  const levelOrder = { A: 0, B: 1, C: 2 }
  list.sort((a, b) => {
    let va, vb
    switch (sortField.value) {
      case 'level': va = levelOrder[a.level] ?? 4; vb = levelOrder[b.level] ?? 4; break
      case 'balance': va = a.balance || 0; vb = b.balance || 0; break
      case 'creditLimit': va = a.creditLimit || 0; vb = b.creditLimit || 0; break
      case 'createdAt': va = a.createdAt || ''; vb = b.createdAt || ''; break
      case 'name': va = (a.fullName || a.name || '').toLowerCase(); vb = (b.fullName || b.name || '').toLowerCase(); break
      default: va = levelOrder[a.level] ?? 4; vb = levelOrder[b.level] ?? 4
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

const defaultForm = () => ({
  customerNo: '', fullName: '', shortName: '', contactName: '', phone: '',
  email: '', department: '', position: '', region: '',
  level: 'B', decisionAuthority: '', coreConcerns: '',
  creditLimit: 0, status: 'active', tags: [], address: ''
})
const form = reactive(defaultForm())

const { showSmartRec, smartRecInput, smartRecResult, runSmartRecognize, applySmartRecognize, handleSmartFileUpload } = useSmartRecognize(form)
const { handleBatchAdd } = useCustomerImport(customerStore)

function openAddModal() {
  editingCustomer.value = null
  formErrors.value = []
  const defaults = defaultForm()
  defaults.customerNo = customerStore.generateCustomerNo()
  Object.assign(form, defaults)
  showSmartRec.value = false
  smartRecInput.value = ''
  smartRecResult.value = null
  showModal.value = true
}

function openEditModal(c) {
  editingCustomer.value = c
  formErrors.value = []
  Object.assign(form, {
    customerNo: c.customerNo || '', fullName: c.fullName || c.name || '',
    shortName: c.shortName || '', contactName: c.contactName || c.contact || '',
    phone: c.phone || '', email: c.email || '', department: c.department || '',
    position: c.position || '', region: c.region || '', level: c.level || 'B',
    decisionAuthority: c.decisionAuthority || '', coreConcerns: c.coreConcerns || '',
    creditLimit: c.creditLimit || 0, status: c.status || 'active',
    tags: [...(c.tags || [])], address: c.address || ''
  })
  showModal.value = true
}

function openDetailModal(c) {
  detailCustomer.value = c
  showDetail.value = true
}

function goCustomerDetail(c) {
  if (!c) return
  showDetail.value = false
  router.push({ path: '/customer-detail', query: { id: c.id } })
}

function handleDetailEdit(customer) {
  showDetail.value = false
  openEditModal(customer)
}

function closeModal() {
  showModal.value = false
  editingCustomer.value = null
}

function saveCustomer() {
  formErrors.value = []

  // 至少一个关键信息字段非空
  if (!form.fullName.trim() && !form.contactName.trim() && !form.phone.trim()) {
    formErrors.value.push('请至少填写客户全称、联系人姓名或手机号码中的一项')
  }

  // 客户编号唯一性校验
  if (form.customerNo) {
    const existing = customerStore.customers.find(c =>
      c.customerNo === form.customerNo && (!editingCustomer.value || c.id !== editingCustomer.value.id)
    )
    if (existing) {
      formErrors.value.push('客户编号已存在，请使用其他编号')
    }
  }

  // 手机号格式校验
  if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) {
    formErrors.value.push('手机号格式不正确，应为11位手机号码')
  }

  // 邮箱格式校验
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    formErrors.value.push('邮箱格式不正确')
  }

  // 信用额度非负校验
  if (form.creditLimit !== undefined && form.creditLimit !== '' && Number(form.creditLimit) < 0) {
    formErrors.value.push('信用额度不能为负数')
  }

  if (formErrors.value.length > 0) return

  if (editingCustomer.value) {
    customerStore.updateCustomer(editingCustomer.value.id, { ...form, name: form.fullName, contact: form.contactName })
  } else {
    customerStore.addCustomer({ ...form, name: form.fullName })
  }
  closeModal()
}

function toggleFormTag(tagId) {
  const idx = form.tags.indexOf(tagId)
  if (idx === -1) form.tags.push(tagId)
  else form.tags.splice(idx, 1)
}

function handleDelete(c) {
  confirmMessage.value = `确定要删除客户"${c.fullName || c.name}"吗？`
  confirmCallback.value = () => {
    const result = customerStore.deleteCustomer(c.id)
    if (!result.success) {
      confirmMessage.value = result.error
      confirmType.value = 'warning'
      showConfirm.value = true
      return
    }
  }
  confirmType.value = 'confirm'
  showConfirm.value = true
}

function confirmAction() {
  if (confirmType.value === 'warning') {
    showConfirm.value = false
    return
  }
  if (confirmCallback.value) confirmCallback.value()
  showConfirm.value = false
}

function handleBatchDelete() {
  confirmMessage.value = `确定要删除选中的 ${selectedIds.value.length} 个客户吗？`
  confirmCallback.value = () => {
    customerStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
  showConfirm.value = true
}

function handleBatchLevel() {
  if (!batchLevel.value || selectedIds.value.length === 0) return
  customerStore.batchUpdateLevel(selectedIds.value, batchLevel.value)
  batchLevel.value = ''
  selectedIds.value = []
}

function handleBatchTag() {
  if (selectedIds.value.length === 0) return
  batchSelectedTags.value = []
  showBatchTagModal.value = true
}

function toggleBatchTag(tagId) {
  const idx = batchSelectedTags.value.indexOf(tagId)
  if (idx === -1) batchSelectedTags.value.push(tagId)
  else batchSelectedTags.value.splice(idx, 1)
}

function applyBatchTags() {
  if (batchSelectedTags.value.length === 0) return
  selectedIds.value.forEach(id => {
    batchSelectedTags.value.forEach(tagId => {
      customerStore.addTagToCustomer(id, tagId)
    })
  })
  showBatchTagModal.value = false
  selectedIds.value = []
}

function handleBatchExport() {
  const selected = customerStore.customers.filter(c => selectedIds.value.includes(c.id))
  const data = selected.map(c => ({
    编号: c.customerNo, 名称: c.fullName || c.name, 联系人: c.contactName || c.contact,
    电话: c.phone, 邮箱: c.email, 部门: c.department, 等级: levelLabel(c.level),
    决策权: c.decisionAuthority, 区域: c.region, 余额: c.balance,
    信用额度: c.creditLimit, 状态: c.status === 'active' ? '活跃' : '休眠'
  }))
  exportToCSV(data, `客户数据_选中${selected.length}条`)
}

function handleExport() {
  const data = filteredCustomers.value.map(c => ({
    编号: c.customerNo, 名称: c.fullName || c.name, 联系人: c.contactName || c.contact,
    电话: c.phone, 邮箱: c.email, 部门: c.department, 等级: levelLabel(c.level),
    决策权: c.decisionAuthority, 区域: c.region, 余额: c.balance,
    信用额度: c.creditLimit, 状态: c.status === 'active' ? '活跃' : '休眠'
  }))
  exportToCSV(data, '客户数据')
}

function exportToCSV(data, filename) {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : ''
      // CSV 中包含逗号、引号或换行符的字段需要用双引号包裹
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"'
      }
      return val
    })
    csvRows.push(values.join(','))
  }
  const csv = '\uFEFF' + csvRows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function handleDeptChange() {
  if (form.department === '__new__') {
    const newDept = prompt('请输入新部门名称：')
    if (newDept && newDept.trim()) {
      form.department = newDept.trim()
    } else {
      form.department = ''
    }
  }
}

function handleDownloadTemplate() {
  const headers = ['客户编号', '客户全称', '联系人', '部门', '职位', '手机号码', '邮箱', '等级', '决策权限', '核心关注点', '地区', '信用额度', '地址']
  const csv = headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '客户导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  customerStore.initSeedData()
  dataStore.initSeedData()

  // 处理从客户详情页跳转过来的编辑请求
  const editId = route.query.editId
  if (editId) {
    const customer = customerStore.customers.find(c => c.id === editId)
    if (customer) {
      openEditModal(customer)
    }
    // 清除 URL 中的 editId 参数，避免刷新页面时重复打开
    router.replace({ path: '/customers', query: {} })
  }
})
</script>

<style scoped>
.customer-page { }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); font-weight: 500; background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); border-right: 1px solid var(--color-border); }
.view-btn:last-child { border-right: none; }
.view-btn:hover { background: var(--color-surface-hover); }
.view-btn.active { background: var(--color-accent-subtle); color: var(--color-accent); }
.customer-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: end; }
.smart-recognize-panel { margin-bottom: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.smart-recognize-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: var(--color-surface-elevated); cursor: pointer; user-select: none; }
.smart-recognize-header:hover { background: var(--color-surface-hover); }
.sr-header-left { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); font-weight: 600; }
.sr-icon { font-size: 16px; }
.sr-badge { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); font-weight: 700; }
.sr-badge-success { background: var(--color-success-subtle); color: var(--color-success); }
.sr-badge-warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.sr-toggle { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.smart-recognize-body { padding: var(--space-3); border-top: 1px solid var(--color-border); }
.sr-actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); align-items: center; }
.sr-result-panel { margin-top: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.sr-result-header { padding: var(--space-2) var(--space-3); background: var(--color-success-subtle); font-size: var(--font-size-sm); }
.sr-result-header.has-warnings { background: rgba(245,158,11,0.08); }
.sr-result-body { padding: var(--space-2) var(--space-3); }
.sr-result-item { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.sr-result-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); min-width: 70px; }
.sr-result-input { flex: 1; padding: 2px 6px; font-size: var(--font-size-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-primary); color: var(--color-text-primary); }
.sr-result-confidence { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); font-weight: 600; min-width: 60px; text-align: center; }
.sr-result-confidence.high { background: var(--color-success-subtle); color: var(--color-success); }
.sr-result-confidence.medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.sr-result-confidence.low { background: var(--color-danger-subtle); color: var(--color-danger); }
.sr-empty-tip { padding: var(--space-3); text-align: center; font-size: var(--font-size-sm); color: var(--color-text-tertiary); }
.sr-result-actions { display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-top: 1px solid var(--color-border); justify-content: flex-end; }
.customer-search-grid { display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: var(--space-3); align-items: end; flex: 1; }
.search-field { display: flex; flex-direction: column; gap: 4px; }
.search-field-label { font-size: 11px; font-weight: 600; color: var(--color-text-tertiary); white-space: nowrap; }
.search-field .search-input { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 10px; font-size: 13px; color: var(--color-text-primary); width: 100%; outline: none; }
.search-field .search-input:focus { border-color: var(--color-accent); }
.search-field .search-input::placeholder { color: var(--color-text-tertiary); }
.search-reset-btn { align-self: end; }
.customer-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { width: auto; min-width: 100px; }
.customer-stats-bar { display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex-wrap: wrap; }
.stat-item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-base); color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.active { background: var(--color-success); }
.stat-dot.dormant { background: var(--color-text-tertiary); }
.level-stats { display: flex; gap: var(--space-2); }
.level-stat { font-size: var(--font-size-sm); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.ls-A { background: var(--color-danger-subtle); color: var(--color-danger); }
.ls-B { background: var(--color-warning-subtle); color: var(--color-warning); }
.ls-C { background: var(--color-info-subtle); color: var(--color-accent); }
.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-accent-subtle); border-radius: var(--radius-md); margin-bottom: var(--space-3); font-size: var(--font-size-sm); color: var(--color-accent); }
.empty-state { text-align: center; padding: var(--space-16) 0; }
.empty-icon { font-size: 48px; margin-bottom: var(--space-4); }
.empty-text { font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: var(--space-2); }
.empty-sub { color: var(--color-text-tertiary); font-size: var(--font-size-sm); }
.modal-overlay { animation: fade-in 200ms ease; }
.modal-dialog { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slide-up 200ms ease; }
.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 1; }
.modal-header h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary); }
.modal-close { background: none; border: none; font-size: 18px; color: var(--color-text-tertiary); cursor: pointer; padding: 4px; border-radius: var(--radius-sm); }
.modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }
.btn-danger { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
.btn-danger:hover { opacity: 0.9; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); }
.form-textarea { width: 100%; padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-primary); color: var(--color-text-primary); resize: vertical; font-family: inherit; line-height: 1.5; }
.form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-subtle); }
.form-textarea::placeholder { color: var(--color-text-tertiary); }
.form-errors-block {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: rgba(239,68,68,0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239,68,68,0.3);
}
.form-error-item {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  padding: 2px 0;
}
.tag-selector { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag-option { padding: 3px 10px; border-radius: 14px; font-size: 11px; cursor: pointer; border: 1px dashed var(--color-border); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.tag-option:hover { border-style: solid; }
.tag-option.selected { border-style: solid; }
.batch-tag-list { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.batch-tag-option { padding: 4px 12px; border-radius: 14px; font-size: var(--font-size-sm); cursor: pointer; border: 1px dashed var(--color-border); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.batch-tag-option:hover { border-style: solid; }
.batch-tag-option.selected { border-style: solid; }
.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: var(--color-danger-subtle); color: var(--color-danger); }
.level-B { background: var(--color-warning-subtle); color: var(--color-warning); }
.level-C { background: var(--color-info-subtle); color: var(--color-accent); }
.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.mini-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 1024px) {
  .form-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .page-header-actions { flex-direction: column; align-items: flex-start; }
}
</style>
