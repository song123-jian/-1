<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="handleClose">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑报价' : '新建报价' }}</h3>
          <button class="modal-close" @click="handleClose"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-section">
            <h4 class="form-section-title"><Icon name="list" :size="14" /> 报价基本信息</h4>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">报价编号</label>
                <input v-model="form.quoteNo" class="form-input" :readonly="isEditing" :style="isEditing ? 'opacity:0.7;cursor:not-allowed' : ''" />
              </div>
              <div class="form-group">
                <label class="form-label">报价日期</label>
                <input v-model="form.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">报价有效期</label>
                <input v-model="form.expiryDate" type="date" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="form-section-title"><Icon name="building" :size="14" /> 客户信息</h4>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">客户公司</label>
                <DataSelect
                  module="customer"
                  variant="active"
                  v-model="form.customerId"
                  value-field="id"
                  label-field="name"
                  placeholder="选择客户"
                  @change="onCustomerChange"
                />
              </div>
              <div class="form-group">
                <label class="form-label">客户公司全称</label>
                <input v-model="form.customerFullName" class="form-input" placeholder="自动填充，可编辑" />
              </div>
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">联系人姓名</label>
                <input v-model="form.custContact" class="form-input" placeholder="自动填充" />
              </div>
              <div class="form-group">
                <label class="form-label">联系电话</label>
                <input v-model="form.custPhone" class="form-input" placeholder="自动填充" />
              </div>
              <div class="form-group">
                <label class="form-label">电子邮箱</label>
                <input v-model="form.custEmail" type="email" class="form-input" placeholder="自动填充" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="form-section-title"><Icon name="building" :size="14" /> 我方信息</h4>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">发件方</label>
                <input v-model="form.senderCompany" class="form-input" readonly style="opacity:0.8" />
              </div>
              <div class="form-group">
                <label class="form-label">业务对接人</label>
                <input v-model="form.senderContact" class="form-input" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">联系电话</label>
                <input v-model="form.senderPhone" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">业务邮箱</label>
                <input v-model="form.senderEmail" type="email" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="form-section-title"><Icon name="package" :size="14" /> 产品报价明细</h4>
            <div style="overflow-x:auto;margin-bottom:8px">
              <table class="data-table items-table" style="min-width:700px">
                <thead>
                  <tr>
                    <th style="width:40px">序号</th>
                    <th>牌号/规格</th>
                    <th>材料标准</th>
                    <th style="width:90px">数量(KG)</th>
                    <th style="width:130px">含税单价(元/KG)</th>
                    <th style="width:100px">小计(元)</th>
                    <th>备注(最小起订量等)</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in formItems" :key="idx">
                    <td style="text-align:center">{{ idx + 1 }}</td>
                    <td><input v-model="item.grade" class="form-input" placeholder="牌号" /></td>
                    <td><input v-model="item.standard" class="form-input" placeholder="标准" /></td>
                    <td><input v-model.number="item.qty" type="number" class="form-input" min="0" step="0.01" /></td>
                    <td><input v-model.number="item.price" type="number" class="form-input" min="0" step="0.01" /></td>
                    <td class="mono" style="text-align:right;font-weight:600">{{ formatNumber(item.qty * item.price) }}</td>
                    <td><input v-model="item.remark" class="form-input" placeholder="备注" /></td>
                    <td style="text-align:center"><button class="action-btn danger" @click="removeItem(idx)" :disabled="formItems.length <= 1"><Icon name="close" :size="14" /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button class="btn btn-secondary btn-sm" @click="addItem" style="margin-bottom:12px">添加产品行</button>
            <div class="form-row form-row-4">
              <div class="form-group">
                <label class="form-label">不含税金额</label>
                <input v-model.number="form.subtotal" type="number" step="0.01" class="form-input" @input="recalcTotal" />
              </div>
              <div class="form-group">
                <label class="form-label">税率(%)</label>
                <input v-model.number="form.taxRate" type="number" class="form-input" @input="recalcTotal" />
              </div>
              <div class="form-group">
                <label class="form-label">含税合计</label>
                <input :value="calculatedTotal.toFixed(2)" type="text" class="form-input" readonly style="opacity:0.8;font-weight:700;color:var(--color-accent)" />
              </div>
              <div class="form-group">
                <label class="form-label">成本基准</label>
                <input v-model.number="form.costBasis" type="number" step="0.01" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="form-section-title"><Icon name="edit" :size="14" /> 报价说明条款</h4>
            <div class="form-group">
              <label class="form-label">价格条款</label>
              <input v-model="form.termPrice" class="form-input" />
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">付款方式</label>
                <input v-model="form.termPayment" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">交货周期</label>
                <input v-model="form.termDelivery" class="form-input" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">交货地点</label>
                <input v-model="form.termDeliveryAddr" class="form-input" placeholder="请填写具体收货地址" />
              </div>
              <div class="form-group">
                <label class="form-label">质量标准</label>
                <input v-model="form.termQuality" class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">价格调整机制</label>
              <input v-model="form.termPriceAdj" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">法律效力声明</label>
              <textarea v-model="form.termLegal" class="form-textarea" rows="2"></textarea>
            </div>
            <div style="margin-bottom:12px" v-if="!isEditing">
              <button class="btn btn-secondary btn-sm" type="button" @click="saveAsTemplate"><Icon name="save" :size="14" /> 另存为模板</button>
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="form.notes" class="form-textarea" rows="2" placeholder="备注信息..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose">取消</button>
          <label class="save-template-check" style="display:flex;align-items:center;gap:6px;margin-left:auto;cursor:pointer;font-size:13px;">
            <input type="checkbox" v-model="saveAsTemplateFlag"> 另存为模板
          </label>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuotationStore } from '@/stores/quotation'
import { useCustomerStore } from '@/stores/customer'
import DataSelect from '@/components/DataSelect.vue'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  editingQuotation: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save'])

const quotationStore = useQuotationStore()
const customerStore = useCustomerStore()

const isEditing = computed(() => !!props.editingQuotation)
const saveAsTemplateFlag = ref(false)
const form = ref({})
const formItems = ref([{ grade: '', standard: '', qty: 0, price: 0, remark: '' }])

const itemsSubtotal = computed(() => formItems.value.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0))
const calculatedTotal = computed(() => itemsSubtotal.value * (1 + (form.value.taxRate || 0) / 100))
const calculatedProfitMargin = computed(() => {
  const cost = form.value.costBasis || 0
  if (cost <= 0 || itemsSubtotal.value <= 0) return 0
  return ((itemsSubtotal.value - cost) / itemsSubtotal.value) * 100
})

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generateQuoteNo() {
  const now = new Date()
  const prefix = 'QT' + now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  let maxSeq = 0
  for (const q of quotationStore.quotations) {
    if (q.quoteNo && q.quoteNo.startsWith(prefix)) {
      const seq = parseInt(q.quoteNo.slice(prefix.length), 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

function resetForm() {
  const today = new Date().toISOString().split('T')[0]
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  form.value = {
    quoteNo: generateQuoteNo(),
    customerId: '', customerName: '', customerFullName: '',
    custContact: '', custPhone: '', custEmail: '',
    senderContact: '', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '', senderEmail: '',
    date: today, expiryDate: expiry,
    subtotal: 0, taxRate: 13, costBasis: 0, notes: '',
    termPrice: '本报价所有金额均为人民币含税价格（含13%增值税），已包含标准包装费及国内运输费用。',
    termPayment: '默认采用"款到发货"结算方式，具体付款条件可根据订单金额另行友好协商确定。',
    termDelivery: '在收到贵司全额货款后5个工作日内完成生产并发货。',
    termDeliveryAddr: '',
    termQuality: '产品质量严格符合国家相关行业标准及双方确认的技术要求，随货提供质检报告。',
    termPriceAdj: '本报价基于当前市场原材料价格制定，若遇主要原材料价格波动超过±5%，我司有权对未确认订单价格进行相应调整，正式下单前请以双方最新书面确认为准。',
    termLegal: '本报价函经双方授权代表签字并加盖公司公章后即构成具有法律约束力的合同要约，与正式采购合同具有同等法律效力。'
  }
  formItems.value = [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
}

/* DataSelect change 事件提供 { value, data, option }，data 为完整客户对象 */
function onCustomerChange(event) {
  const c = event?.data
  if (!c) return
  form.value.customerName = c.fullName || c.name || ''
  form.value.customerFullName = c.fullName || c.name || ''
  form.value.custContact = c.contactName || c.contact || ''
  form.value.custPhone = c.phone || ''
  form.value.custEmail = c.email || ''
}

function addItem() {
  formItems.value.push({ grade: '', standard: '', qty: 0, price: 0, remark: '' })
}

function removeItem(idx) {
  if (formItems.value.length <= 1) return
  formItems.value.splice(idx, 1)
}

function recalcTotal() {
  if (!form.value.subtotal) {
    form.value.subtotal = itemsSubtotal.value
  }
}

function saveAsTemplate() {
  const name = prompt('请输入模板名称：', form.value.customerName || '新模板')
  if (!name) return
  quotationStore.addTemplate({
    name,
    customerId: form.value.customerId,
    customerName: form.value.customerName,
    items: JSON.stringify(formItems.value),
    termPrice: form.value.termPrice,
    termPayment: form.value.termPayment,
    termDelivery: form.value.termDelivery,
    termDeliveryAddr: form.value.termDeliveryAddr,
    termQuality: form.value.termQuality,
    termPriceAdj: form.value.termPriceAdj,
    termLegal: form.value.termLegal,
    taxRate: form.value.taxRate,
    costBasis: form.value.costBasis
  })
  alert('模板"' + name + '"已保存')
}

function handleClose() {
  emit('close')
}

function handleSave() {
  const data = {
    ...form.value,
    items: JSON.stringify(formItems.value),
    subtotal: form.value.subtotal || itemsSubtotal.value,
    total: calculatedTotal.value,
    profitMargin: parseFloat(calculatedProfitMargin.value.toFixed(1))
  }
  if (saveAsTemplateFlag.value) {
    const name = prompt('请输入模板名称：', form.value.customerName || '新模板')
    if (name) {
      quotationStore.addTemplate({
        name,
        customerId: form.value.customerId,
        customerName: form.value.customerName,
        items: JSON.stringify(formItems.value),
        termPrice: form.value.termPrice,
        termPayment: form.value.termPayment,
        termDelivery: form.value.termDelivery,
        termDeliveryAddr: form.value.termDeliveryAddr,
        termQuality: form.value.termQuality,
        termPriceAdj: form.value.termPriceAdj,
        termLegal: form.value.termLegal,
        taxRate: form.value.taxRate,
        costBasis: form.value.costBasis
      })
    }
    saveAsTemplateFlag.value = false
  }
  emit('save', { data, isEditing: isEditing.value, editingId: props.editingQuotation?.id })
}

watch(() => props.showModal, (val) => {
  if (val) {
    if (props.editingQuotation) {
      const q = props.editingQuotation
      form.value = {
        quoteNo: q.quoteNo || '',
        customerId: q.customerId || '', customerName: q.customerName || '', customerFullName: q.customerFullName || '',
        custContact: q.custContact || '', custPhone: q.custPhone || '', custEmail: q.custEmail || '',
        senderContact: q.senderContact || '', senderCompany: q.senderCompany || '苏州冠久新材料科技有限公司', senderPhone: q.senderPhone || '', senderEmail: q.senderEmail || '',
        date: q.date || '', expiryDate: q.expiryDate || '',
        subtotal: q.subtotal || 0, taxRate: q.taxRate ?? 13, costBasis: q.costBasis || 0, notes: q.notes || '',
        termPrice: q.termPrice || '', termPayment: q.termPayment || '', termDelivery: q.termDelivery || '',
        termDeliveryAddr: q.termDeliveryAddr || '', termQuality: q.termQuality || '', termPriceAdj: q.termPriceAdj || '', termLegal: q.termLegal || ''
      }
      try {
        const parsed = JSON.parse(q.items || '[]')
        formItems.value = parsed.length > 0 ? parsed : [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
      } catch {
        formItems.value = [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
      }
    } else {
      resetForm()
    }
  }
})
</script>

<style scoped>
.modal-overlay { align-items: flex-start; padding: 20px; overflow-y: auto; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-lg { max-width: 900px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-surface); z-index: 1; }
.modal-header h3 { margin: 0; font-size: var(--font-size-xl); }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }
.form-section { margin-bottom: 20px; }
.form-section-title { font-size: var(--font-size-base); font-weight: 600; color: var(--color-accent); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.form-input, .form-select, .form-textarea { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text-primary); }
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle, rgba(59,130,246,0.1)); }
.form-textarea { resize: vertical; }
.items-table { font-size: var(--font-size-sm); }
.items-table input { padding: 4px 6px; font-size: var(--font-size-sm); }
.mono { font-family: var(--font-mono); }
.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.action-btn { padding: 3px 6px; font-size: var(--font-size-xs); border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }
.save-template-check { color: var(--color-text-secondary); }
.data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: var(--font-size-sm); white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
</style>
