<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEdit ? '编辑供应商' : '新增供应商' }}</h3>
          <button class="modal-close" @click="handleCancel"><Icon name="close" :size="16" /></button>
        </div>
        <div class="modal-body">
          <SmartRecognizePanel
            v-if="!isEdit"
            v-model:show-smart-rec="showSmartRec"
            v-model:smart-rec-input="smartRecInput"
            :smart-rec-result="smartRecResult"
            :placeholder="smartRecPlaceholder"
            @run-smart-recognize="runSmartRecognize"
            @apply-smart-recognize="applySmartRecognize"
            @handle-smart-file-upload="handleSmartFileUpload"
          />
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">供应商编码</label>
              <input :value="form.code" type="text" class="form-input" readonly disabled />
            </div>
            <div class="form-group">
              <label class="form-label">
                供应商名称
                <span class="required">*</span>
              </label>
              <input v-model="form.name" type="text" class="form-input" placeholder="请输入供应商全称" />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">简称</label>
              <input v-model="form.shortName" type="text" class="form-input" placeholder="请输入简称" />
            </div>
            <div class="form-group">
              <label class="form-label">类别</label>
              <select v-model="form.category" class="form-select">
                <option value="原材料">原材料</option>
                <option value="成品">成品</option>
                <option value="服务">服务</option>
                <option value="物流">物流</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">联系人</label>
              <input v-model="form.contact" type="text" class="form-input" placeholder="请输入联系人" />
            </div>
            <div class="form-group">
              <label class="form-label">电话</label>
              <input v-model="form.phone" type="text" class="form-input" placeholder="请输入电话号码" />
              <span v-if="errors.phone" class="form-error">{{ errors.phone }}</span>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input v-model="form.email" type="text" class="form-input" placeholder="请输入邮箱地址" />
              <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">评级</label>
              <select v-model="form.rating" class="form-select">
                <option :value="5">5 - 优秀</option>
                <option :value="4">4 - 良好</option>
                <option :value="3">3 - 一般</option>
                <option :value="2">2 - 较差</option>
                <option :value="1">1 - 很差</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">地址</label>
            <input v-model="form.address" type="text" class="form-input" placeholder="请输入详细地址" />
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">开户银行</label>
              <input v-model="form.bankName" type="text" class="form-input" placeholder="请输入开户银行" />
            </div>
            <div class="form-group">
              <label class="form-label">银行账号</label>
              <input v-model="form.bankAccount" type="text" class="form-input" placeholder="请输入银行账号" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">资质认证</label>
              <input v-model="form.qualification" type="text" class="form-input" placeholder="如 ISO9001" />
            </div>
            <div class="form-group">
              <label class="form-label">资质到期日</label>
              <input v-model="form.qualificationExpiry" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="form.notes" class="form-input" rows="3" placeholder="请输入备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="handleCancel">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'SupplierFormModal' }
</script>
<script setup>
import { reactive, computed, watch } from 'vue'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import { useSmartRecognize } from './useSmartRecognize'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useFormDraft } from '@/composables/useFormDraft'

const props = defineProps({
  supplier: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['save', 'cancel'])

const supplierStore = useSupplierStore()
const isEdit = computed(() => !!props.supplier?.id)

const form = reactive({
  code: '',
  name: '',
  shortName: '',
  category: '原材料',
  contact: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  bankAccount: '',
  qualification: '',
  qualificationExpiry: '',
  rating: 3,
  notes: ''
})

const draftData = reactive({})
watch(
  [form],
  ([f]) => {
    if (!isEdit.value) {
      Object.assign(draftData, { ...f })
    }
  },
  { deep: true }
)

const { restoreDraft, clearDraft, hasDraft } = useFormDraft('supplier-form', draftData, {
  debounce: 1500,
  onRestore: (draft) => {
    if (draft.data) {
      Object.assign(form, draft.data)
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
  handleSmartFileUpload,
  resetSmartRec
} = useSmartRecognize(form)

const errors = reactive({
  name: '',
  phone: '',
  email: ''
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetErrors()
      if (props.supplier?.id) {
        Object.assign(form, {
          code: props.supplier.code || '',
          name: props.supplier.name || '',
          shortName: props.supplier.shortName || '',
          category: props.supplier.category || '原材料',
          contact: props.supplier.contact || '',
          phone: props.supplier.phone || '',
          email: props.supplier.email || '',
          address: props.supplier.address || '',
          bankName: props.supplier.bankName || '',
          bankAccount: props.supplier.bankAccount || '',
          qualification: props.supplier.qualification || '',
          qualificationExpiry: props.supplier.qualificationExpiry || '',
          rating: props.supplier.rating || 3,
          notes: props.supplier.notes || ''
        })
      } else {
        Object.assign(form, {
          code: '',
          name: '',
          shortName: '',
          category: '原材料',
          contact: '',
          phone: '',
          email: '',
          address: '',
          bankName: '',
          bankAccount: '',
          qualification: '',
          qualificationExpiry: '',
          rating: 3,
          notes: ''
        })
        resetSmartRec()
        if (hasDraft()) {
          restoreDraft()
        }
      }
    }
  }
)

function resetErrors() {
  errors.name = ''
  errors.phone = ''
  errors.email = ''
}

function validate() {
  resetErrors()
  let valid = true
  if (!form.name || !form.name.trim()) {
    errors.name = '供应商名称不能为空'
    valid = false
  }
  if (form.phone && !/^[\d\-+() ]{7,20}$/.test(form.phone)) {
    errors.phone = '电话格式不正确'
    valid = false
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = '邮箱格式不正确'
    valid = false
  }
  return valid
}

function handleSave() {
  if (!validate()) return
  const data = { ...form }
  if (isEdit.value) {
    supplierStore.updateSupplier(props.supplier.id, data)
  } else {
    supplierStore.addSupplier(data)
  }
  clearDraft()
  emit('save', data)
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.modal-lg {
  max-width: 720px;
}
.form-error {
  display: block;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
}
.form-input:read-only {
  opacity: 0.6;
  cursor: not-allowed;
}
textarea.form-input {
  resize: vertical;
  min-height: 60px;
}
</style>
