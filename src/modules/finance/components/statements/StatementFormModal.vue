<template>
  <div v-if="showModal" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content modal-wide">
      <div class="modal-header">
        <h3 class="modal-title">{{ editingId ? '编辑对账单' : '新建对账单' }}</h3>
        <button class="modal-close" @click="handleClose"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <!-- 步骤指示器 -->
        <div class="wizard-steps">
          <div class="wizard-step" :class="{ active: editorStep === 1, completed: editorStep > 1 }">
            <div class="step-number">1</div>
            <div class="step-label">基本信息</div>
          </div>
          <div class="wizard-step-line" :class="{ completed: editorStep > 1 }"></div>
          <div class="wizard-step" :class="{ active: editorStep === 2, completed: editorStep > 2 }">
            <div class="step-number">2</div>
            <div class="step-label">交易双方</div>
          </div>
          <div class="wizard-step-line" :class="{ completed: editorStep > 2 }"></div>
          <div class="wizard-step" :class="{ active: editorStep === 3, completed: editorStep > 3 }">
            <div class="step-number">3</div>
            <div class="step-label">交易明细</div>
          </div>
          <div class="wizard-step-line" :class="{ completed: editorStep > 3 }"></div>
          <div class="wizard-step" :class="{ active: editorStep === 4 }">
            <div class="step-number">4</div>
            <div class="step-label">付款条款</div>
          </div>
        </div>

        <SmartRecognizePanel v-if="!editingId"
          v-model:showSmartRec="showSmartRec"
          v-model:smartRecInput="smartRecInput"
          :smartRecResult="smartRecResult"
          :placeholder="smartRecPlaceholder"
          @runSmartRecognize="runSmartRecognize"
          @applySmartRecognize="onApplySmartRecognize"
          @handleSmartFileUpload="handleSmartFileUpload"
        />
        <div v-if="hasErrors || hasWarnings" class="form-validation-panel">
          <div v-for="e in errors" :key="e.field" class="val-error">{{ e.message }}</div>
          <div v-for="w in warnings" :key="w.field" class="val-warning">{{ w.message }}</div>
        </div>

        <!-- 步骤1：基本信息 -->
        <div v-if="editorStep === 1" class="wizard-content">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">对账单号</label>
              <input type="text" class="form-input" v-model="editorData.statementNo" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">账单期间</label>
              <input type="month" class="form-input" v-model="editorData.period" @change="onPeriodChange">
            </div>
            <div class="form-group">
              <label class="form-label">对账日期</label>
              <input type="date" class="form-input" v-model="editorData.reconDate">
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">联系方式</label>
              <input type="text" class="form-input" v-model="editorData.contactPhone" placeholder="联系电话">
            </div>
            <div class="form-group">
              <label class="form-label">制单人</label>
              <input type="text" class="form-input" v-model="editorData.preparer" placeholder="制单人">
            </div>
            <div class="form-group">
              <label class="form-label">审核人</label>
              <select class="form-select" v-model="editorData.reviewer">
                <option value="">请选择</option>
                <option value="admin">管理员</option>
                <option value="finance">财务主管</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 步骤2：交易双方 -->
        <div v-if="editorStep === 2" class="wizard-content">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购方</label>
              <select class="form-select" v-model="editorData.buyerId" @change="onBuyerChange">
                <option value="">请选择采购方</option>
                <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.name || c.fullName || c.companyName }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">供应商</label>
              <select class="form-select" v-model="editorData.sellerId" @change="onSellerChange">
                <option value="">请选择供应商</option>
                <option v-for="s in dataStore.suppliers" :key="s.id" :value="s.id">{{ s.name || s.shortName }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购方地址</label>
              <input type="text" class="form-input" v-model="editorData.buyerAddress">
            </div>
            <div class="form-group">
              <label class="form-label">供应商地址</label>
              <input type="text" class="form-input" v-model="editorData.sellerAddress">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购方联系人</label>
              <input type="text" class="form-input" v-model="editorData.buyerContact">
            </div>
            <div class="form-group">
              <label class="form-label">供应商联系人</label>
              <input type="text" class="form-input" v-model="editorData.sellerContact">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购方电话</label>
              <input type="text" class="form-input" v-model="editorData.buyerPhone">
            </div>
            <div class="form-group">
              <label class="form-label">供应商电话</label>
              <input type="text" class="form-input" v-model="editorData.sellerPhone">
            </div>
          </div>
        </div>

        <!-- 步骤3：交易明细 -->
        <div v-if="editorStep === 3" class="wizard-content">
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3)">
            <button class="btn btn-sm btn-outline" @click="addItemRow">添加一行</button>
            <button class="btn btn-sm btn-outline" @click="autoFetchTransactions">自动拉取交易</button>
            <button class="btn btn-sm btn-outline" @click="clearItems" style="color:var(--color-danger)">清空</button>
            <span style="margin-left:auto;font-size:var(--font-size-sm);color:var(--color-text-secondary)">共 {{ editorItems.length }} 条</span>
          </div>
          <div class="table-container" style="max-height:300px;overflow-y:auto">
            <table class="data-table" style="font-size:var(--font-size-xs)">
              <thead>
                <tr>
                  <th>#</th>
                  <th>日期</th>
                  <th>货物名称</th>
                  <th>料号</th>
                  <th>规格</th>
                  <th>单位</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>金额</th>
                  <th>备注</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="editorItems.length === 0">
                  <td colspan="11" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-3)">暂无明细，请点击"添加一行"</td>
                </tr>
                <tr v-for="(item, idx) in editorItems" :key="idx">
                  <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word">{{ idx + 1 }}</td>
                  <td><input type="date" class="form-input form-input-xs" v-model="item.date"></td>
                  <td><input class="form-input form-input-xs" v-model="item.name" placeholder="名称"></td>
                  <td><input class="form-input form-input-xs" style="width:80px" v-model="item.code" placeholder="料号"></td>
                  <td><input class="form-input form-input-xs" v-model="item.spec" placeholder="规格"></td>
                  <td>
                    <select class="form-select form-input-xs" style="width:65px" v-model="item.unit">
                      <option value="个">个</option>
                      <option value="件">件</option>
                      <option value="kg">kg</option>
                      <option value="米">米</option>
                      <option value="箱">箱</option>
                      <option value="台">台</option>
                      <option value="套">套</option>
                    </select>
                  </td>
                  <td><input type="number" class="form-input form-input-xs" style="width:70px;text-align:right" v-model.number="item.qty" step="0.01" min="0" @input="calcItemAmount(idx)"></td>
                  <td><input type="number" class="form-input form-input-xs" style="width:80px;text-align:right" v-model.number="item.price" step="0.01" min="0" @input="calcItemAmount(idx)"></td>
                  <td style="text-align:right;font-weight:600;overflow-wrap:break-word;word-wrap:break-word">¥{{ formatMoney(item.amount) }}</td>
                  <td><input class="form-input form-input-xs" style="width:60px" v-model="item.remark" placeholder="备注"></td>
                  <td><button class="btn btn-sm btn-outline" style="color:var(--color-danger);padding:0 4px" @click="removeItemRow(idx)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="editor-section" style="margin-top:var(--space-4)">
            <h4 class="editor-section-title">金额合计</h4>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">税率(%)</label>
                <input type="number" class="form-input" v-model.number="editorData.taxRate" @input="calcAmounts">
              </div>
              <div class="form-group">
                <label class="form-label">小计</label>
                <input type="text" class="form-input" :value="'¥' + formatMoney(calcSubtotal)" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">税额</label>
                <input type="text" class="form-input" :value="'¥' + formatMoney(calcTaxAmount)" readonly>
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">合计</label>
                <input type="text" class="form-input" :value="'¥' + formatMoney(calcTotalAmount)" readonly style="color:var(--color-danger);font-weight:700">
              </div>
              <div class="form-group">
                <label class="form-label">大写金额</label>
                <input type="text" class="form-input" :value="calcTotalChinese" readonly style="color:var(--color-danger)">
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤4：付款条款 -->
        <div v-if="editorStep === 4" class="wizard-content">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">付款方式</label>
              <select class="form-select" v-model="editorData.paymentMethod">
                <option value="">请选择</option>
                <option value="银行转账">银行转账</option>
                <option value="承兑汇票">承兑汇票</option>
                <option value="现金">现金</option>
                <option value="月结">月结</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">付款期限</label>
              <select class="form-select" v-model="editorData.paymentTerm">
                <option value="">请选择</option>
                <option value="月结30天">月结30天</option>
                <option value="月结60天">月结60天</option>
                <option value="票到15天">票到15天</option>
                <option value="票到30天">票到30天</option>
                <option value="货到付款">货到付款</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">开户银行</label>
              <input type="text" class="form-input" v-model="editorData.bankName">
            </div>
            <div class="form-group">
              <label class="form-label">银行账号</label>
              <input type="text" class="form-input" v-model="editorData.bankAccount">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">账户名称</label>
            <input type="text" class="form-input" v-model="editorData.bankHolder">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="prevStep" v-if="editorStep > 1">上一步</button>
        <button class="btn btn-outline" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="nextStep" v-if="editorStep < 4">下一步</button>
        <button class="btn btn-outline" @click="saveDraft" v-if="editorStep === 4">保存草稿</button>
        <button class="btn btn-primary" @click="submitStatement" v-if="editorStep === 4">提交审核</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useDataStore } from '@/stores/data'
import { useSmartRecognize } from './useSmartRecognize'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useFormDraft } from '@/composables/useFormDraft'
import { useFormValidator } from '@/composables/useFormValidator'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  editingStatement: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved'])

const statementStore = useStatementStore()
const customerStore = useCustomerStore()
const dataStore = useDataStore()

const editorStep = ref(1)
const editingId = ref(null)
const editorData = reactive({
  statementNo: '',
  period: '',
  reconDate: '',
  contactPhone: '',
  preparer: 'admin',
  reviewer: '',
  buyerId: '',
  buyerName: '',
  buyerAddress: '',
  buyerContact: '',
  buyerPhone: '',
  buyerEmail: '',
  sellerId: '',
  sellerName: '',
  sellerAddress: '',
  sellerContact: '',
  sellerPhone: '',
  sellerEmail: '',
  taxRate: 13,
  paymentMethod: '',
  paymentTerm: '',
  bankName: '',
  bankAccount: '',
  bankHolder: ''
})
const editorItems = ref([])

const { warnings, errors, hasErrors, hasWarnings, validate, clearWarnings } = useFormValidator(editorData, {
  required: [
    { key: 'period', label: '账单期间' },
    { key: 'buyerName', label: '采购方' }
  ],
  dateCheck: [
    { startField: 'reconDate', endField: 'dueDate', message: '到期日不能早于对账日期' }
  ]
})

const draftData = reactive({})
watch([editorData, editorItems], ([ed, items]) => {
  if (editingId.value) return
  Object.assign(draftData, { ...ed, items: items ? [...items] : [] })
}, { deep: true })

const { restoreDraft, clearDraft, hasDraft } = useFormDraft('statement-form', draftData, {
  debounce: 1500,
  onRestore: (draft) => {
    if (draft.data.items) {
      editorItems.value = draft.data.items.map(item => ({ ...item }))
    }
  }
})

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder,
  runSmartRecognize,
  applySmartRecognize,
  handleSmartFileUpload
} = useSmartRecognize(editorData)

function onApplySmartRecognize() {
  applySmartRecognize()
  // 填入表格明细行
  if (smartRecResult.value && smartRecResult.value.tableRows && smartRecResult.value.tableRows.length > 0) {
    smartRecResult.value.tableRows.forEach(row => {
      editorItems.value.push({
        date: row.date || '',
        name: row.name || '',
        code: row.code || '',
        spec: row.spec || '',
        unit: row.unit || 'kg',
        qty: row.qty || 0,
        price: row.price || 0,
        amount: (row.qty && row.price) ? row.qty * row.price : 0,
        remark: row.remark || '',
        sourceTransactionId: ''
      })
    })
  }
}

// 初始化表单数据
function initForm() {
  if (props.editingStatement && props.editingStatement.id) {
    editingId.value = props.editingStatement.id
    Object.keys(editorData).forEach(k => {
      editorData[k] = props.editingStatement[k] !== undefined ? props.editingStatement[k] : (typeof editorData[k] === 'number' ? 0 : '')
    })
    editorItems.value = (props.editingStatement.items || []).map(i => ({ ...i }))
  } else {
    editingId.value = null
    const now = new Date()
    const curPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const curDate = now.toISOString().split('T')[0]
    editorData.statementNo = statementStore.generateStatementNo(curPeriod)
    editorData.period = curPeriod
    editorData.reconDate = curDate
    editorData.contactPhone = ''
    editorData.preparer = 'admin'
    editorData.reviewer = ''
    editorData.buyerId = ''
    editorData.buyerName = ''
    editorData.buyerAddress = ''
    editorData.buyerContact = ''
    editorData.buyerPhone = ''
    editorData.buyerEmail = ''
    editorData.sellerId = ''
    editorData.sellerName = ''
    editorData.sellerAddress = ''
    editorData.sellerContact = ''
    editorData.sellerPhone = ''
    editorData.sellerEmail = ''
    editorData.taxRate = 13
    editorData.paymentMethod = ''
    editorData.paymentTerm = ''
    editorData.bankName = ''
    editorData.bankAccount = ''
    editorData.bankHolder = ''
    editorItems.value = []
    if (hasDraft()) {
      restoreDraft()
    }
  }
  editorStep.value = 1
}

// 组件挂载时初始化
initForm()

const calcSubtotal = computed(() => {
  return editorItems.value.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
})

const calcTaxAmount = computed(() => {
  return calcSubtotal.value * (editorData.taxRate || 0) / 100
})

const calcTotalAmount = computed(() => {
  return calcSubtotal.value + calcTaxAmount.value
})

const calcTotalChinese = computed(() => {
  return statementStore.numberToChinese(calcTotalAmount.value)
})

// 保留本地版本：minimumFractionDigits 为 0（整数不显示小数位），与全局 formatMoney 固定2位小数不同
function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function handleClose() {
  emit('close')
}

function prevStep() {
  if (editorStep.value > 1) {
    editorStep.value--
  }
}

function nextStep() {
  if (editorStep.value < 4) {
    editorStep.value++
  }
}

function onPeriodChange() {
  if (editorData.period && !editingId.value) {
    editorData.statementNo = statementStore.generateStatementNo(editorData.period)
  }
}

function onBuyerChange() {
  const c = customerStore.customers.find(c => c.id === editorData.buyerId)
  if (c) {
    editorData.buyerName = c.name || c.fullName || c.companyName
    editorData.buyerAddress = c.address || ''
    editorData.buyerContact = c.contact || ''
    editorData.buyerPhone = c.phone || ''
    editorData.buyerEmail = c.email || ''
  }
}

function onSellerChange() {
  const s = dataStore.suppliers.find(s => s.id === editorData.sellerId)
  if (s) {
    editorData.sellerName = s.name || s.shortName
    editorData.sellerAddress = s.address || ''
    editorData.sellerContact = s.contact || ''
    editorData.sellerPhone = s.phone || ''
    editorData.sellerEmail = s.email || ''
    editorData.bankName = s.bankName || ''
    editorData.bankAccount = s.bankAccount || ''
    editorData.bankHolder = s.bankHolder || s.name || ''
  }
}

function addItemRow() {
  const period = editorData.period
  let lastDay = ''
  if (period) {
    const parts = period.split('-')
    const yr = parseInt(parts[0])
    const mo = parseInt(parts[1])
    const dt = new Date(yr, mo, 0)
    lastDay = yr + '-' + String(mo).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
  }
  editorItems.value.push({
    date: lastDay,
    name: '',
    code: '',
    spec: '',
    unit: 'kg',
    qty: 0,
    price: 0,
    amount: 0,
    remark: ''
  })
}

function removeItemRow(idx) {
  editorItems.value.splice(idx, 1)
}

function clearItems() {
  if (editorItems.value.length > 0 && !confirm('确认清空所有明细？')) return
  editorItems.value = []
}

function calcItemAmount(idx) {
  const item = editorItems.value[idx]
  if (item) {
    item.amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
  }
}

function calcAmounts() {
  for (const item of editorItems.value) {
    item.amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
  }
}

function autoFetchTransactions() {
  if (!editorData.buyerId) { alert('请先选择采购方'); return }
  if (!editorData.period) { alert('请先选择账单期间'); return }
  const transactions = dataStore.transactions || []
  const parts = editorData.period.split('-')
  const yr = parseInt(parts[0])
  const mo = parseInt(parts[1])
  const lastDay = new Date(yr, mo, 0).getDate()
  const periodStart = editorData.period + '-01'
  const periodEnd = editorData.period + '-' + String(lastDay).padStart(2, '0')
  const matched = transactions.filter(t =>
    t.customerId === editorData.buyerId &&
    t.type !== 'collection' &&
    t.date >= periodStart &&
    t.date <= periodEnd &&
    (!t.reconciliationStatus || t.reconciliationStatus === '')
  )
  if (matched.length === 0) { alert('该期间无未对账交易记录'); return }
  const existingIds = new Set(editorItems.value.filter(i => i.sourceTransactionId).map(i => i.sourceTransactionId))
  let added = 0
  for (const t of matched) {
    if (!existingIds.has(t.id)) {
      editorItems.value.push({
        date: t.date || '',
        name: t.productName || t.description || '',
        code: t.productCode || '',
        spec: t.spec || '',
        unit: t.unit || 'kg',
        qty: t.quantity || 0,
        price: t.unitPrice || 0,
        amount: t.amount || 0,
        remark: '自动匹配·' + (t.transactionNo || ''),
        sourceTransactionId: t.id
      })
      added++
    }
  }
  alert('已自动拉取 ' + added + ' 条交易明细')
}

function collectData() {
  return {
    statementNo: editorData.statementNo,
    type: '月度对账单',
    period: editorData.period,
    reconDate: editorData.reconDate,
    preparer: editorData.preparer,
    reviewer: editorData.reviewer,
    contactPhone: editorData.contactPhone,
    buyerId: editorData.buyerId,
    buyerName: editorData.buyerName,
    buyerAddress: editorData.buyerAddress,
    buyerContact: editorData.buyerContact,
    buyerPhone: editorData.buyerPhone,
    buyerEmail: editorData.buyerEmail,
    sellerId: editorData.sellerId,
    sellerName: editorData.sellerName,
    sellerAddress: editorData.sellerAddress,
    sellerContact: editorData.sellerContact,
    sellerPhone: editorData.sellerPhone,
    sellerEmail: editorData.sellerEmail,
    items: JSON.parse(JSON.stringify(editorItems.value)),
    subtotal: calcSubtotal.value,
    taxRate: editorData.taxRate,
    taxAmount: calcTaxAmount.value,
    totalAmount: calcTotalAmount.value,
    totalChinese: calcTotalChinese.value,
    paymentMethod: editorData.paymentMethod,
    paymentTerm: editorData.paymentTerm,
    bankName: editorData.bankName,
    bankAccount: editorData.bankAccount,
    bankHolder: editorData.bankHolder
  }
}

function validateData(data) {
  return []
}

function saveDraft() {
  const data = collectData()
  if (editingId.value) {
    statementStore.updateStatement(editingId.value, { ...data, status: 'draft' })
  } else {
    statementStore.addStatement({ ...data, status: 'draft' })
  }
  emit('saved')
  emit('close')
}

function submitStatement() {
  validate()
  if (hasErrors.value) {
    return
  }
  const data = collectData()
  if (editingId.value) {
    statementStore.updateStatement(editingId.value, { ...data, status: 'pending' })
  } else {
    statementStore.addStatement(data)
  }
  clearDraft()
  emit('saved')
  emit('close')
}
</script>

<style scoped>
.form-validation-panel { margin-bottom: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-surface); border: 1px solid var(--color-border); }
.val-error { color: var(--color-danger); background: var(--color-danger-subtle); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); margin-bottom: var(--space-1); font-size: var(--font-size-sm); }
.val-warning { color: var(--color-warning); background: var(--color-warning-subtle); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); margin-bottom: var(--space-1); font-size: var(--font-size-sm); }
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-row-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.form-input-xs {
  padding: var(--space-1) var(--space-1);
  font-size: var(--font-size-xs);
}
.wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: var(--space-4);
  padding: var(--space-3) 0;
}
.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.wizard-step .step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text-tertiary);
  transition: all 0.2s;
}
.wizard-step .step-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  transition: all 0.2s;
}
.wizard-step.active .step-number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.wizard-step.active .step-label {
  color: var(--color-accent);
  font-weight: 600;
}
.wizard-step.completed .step-number {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}
.wizard-step.completed .step-label {
  color: var(--color-success);
}
.wizard-step-line {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  max-width: 60px;
  margin: 0 var(--space-2);
  transition: all 0.2s;
}
.wizard-step-line.completed {
  background: var(--color-success);
}
.wizard-content {
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.editor-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.editor-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.editor-section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin: 0 0 var(--space-3) 0;
  color: var(--color-accent);
}
@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .form-row-3 { grid-template-columns: 1fr; }
}
</style>
