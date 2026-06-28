<template>
  <Teleport to="body">
    <div v-if="visible" class="wizard-overlay" @click.self="handleClose">
      <div class="wizard-modal wizard-modal-lg">
        <div class="wizard-header">
          <h3>{{ isEdit ? '编辑工单' : '新增工单' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="handleClose"><Icon name="close" :size="14" /></button>
        </div>
        <div class="wizard-body">
          <SmartRecognizePanel
            v-if="!isEdit"
            v-model:show-smart-rec="showSmartRec"
            v-model:smart-rec-input="smartRecInput"
            :smart-rec-result="smartRecResult"
            :placeholder="smartRecPlaceholder"
            :template-name="smartRecTemplateName"
            :template-content="smartRecTemplateContent"
            @run-smart-recognize="runSmartRecognize"
            @apply-smart-recognize="applySmartRecognizeToForm"
            @handle-smart-file-upload="handleSmartFileUpload"
            @clear="smartRecInput = ''; smartRecResult = null"
          />
          <!-- 基本信息 -->
          <div class="form-section-title">
            <Icon name="info" :size="14" />
            基本信息
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                关联BOM
                <span class="required">*</span>
              </label>
              <select v-model="form.bomId" class="form-select" @change="handleBomChange">
                <option value="">请选择BOM</option>
                <option v-for="bom in activeBomList" :key="bom.id" :value="bom.id">
                  {{ bom.code }} - {{ bom.name }}
                </option>
              </select>
              <span v-if="errors.bomId" class="form-error">{{ errors.bomId }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">产品名称</label>
              <input v-model="form.productName" type="text" class="form-input" readonly placeholder="自动关联BOM产品" />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">
                生产数量
                <span class="required">*</span>
              </label>
              <input
                v-model.number="form.quantity"
                type="number"
                class="form-input"
                min="1"
                placeholder="请输入数量"
                @input="recalcMaterials"
              />
              <span v-if="errors.quantity" class="form-error">{{ errors.quantity }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">单位</label>
              <select v-model="form.unit" class="form-select">
                <option value="台">台</option>
                <option value="件">件</option>
                <option value="套">套</option>
                <option value="条">条</option>
                <option value="个">个</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select v-model="form.priority" class="form-select">
                <option value="low">低</option>
                <option value="normal">普通</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                计划开始日期
                <span class="required">*</span>
              </label>
              <input v-model="form.plannedStartDate" type="date" class="form-input" />
              <span v-if="errors.plannedStartDate" class="form-error">{{ errors.plannedStartDate }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">
                计划结束日期
                <span class="required">*</span>
              </label>
              <input v-model="form.plannedEndDate" type="date" class="form-input" />
              <span v-if="errors.plannedEndDate" class="form-error">{{ errors.plannedEndDate }}</span>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">生产车间</label>
              <select v-model="form.workshop" class="form-select">
                <option value="">请选择车间</option>
                <option value="一号车间">一号车间</option>
                <option value="二号车间">二号车间</option>
                <option value="三号车间">三号车间</option>
                <option value="装配车间">装配车间</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">操作员</label>
              <input v-model="form.operator" type="text" class="form-input" placeholder="负责操作员" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="form.notes" class="form-textarea" rows="2" placeholder="工单备注信息"></textarea>
          </div>

          <!-- 物料需求清单 -->
          <div
            v-if="form.materialRequisitions.length > 0"
            class="form-section-title"
            style="margin-top: var(--space-4)"
          >
            <Icon name="package" :size="14" />
            物料需求清单（自动从BOM生成）
          </div>
          <div v-if="form.materialRequisitions.length > 0" class="material-table-wrap">
            <table class="inv-table inv-table-sm">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>物料名称</th>
                  <th>需求数量</th>
                  <th>单位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mat in form.materialRequisitions" :key="mat.materialCode">
                  <td class="cell-mono">{{ mat.materialCode }}</td>
                  <td>{{ mat.materialName }}</td>
                  <td class="cell-mono" style="color: var(--color-accent); font-weight: 600">
                    {{ mat.requiredQty.toFixed(2) }}
                  </td>
                  <td>{{ mat.unit }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="wizard-footer">
          <button class="btn btn-ghost" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSubmit">{{ isEdit ? '更新' : '创建' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default { name: 'ProductionOrder' }
</script>
<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useBomStore } from '@/modules/production/stores/bom'
import { useProductionStore } from '@/modules/production/stores/production'
import { generateId } from '@/utils/uid'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useProductionOrderSmartRecognize } from './useProductionOrderSmartRecognize'

const props = defineProps({
  order: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])

const bomStore = useBomStore()
const productionStore = useProductionStore()

const isEdit = computed(() => !!props.order?.id)

const activeBomList = computed(() => bomStore.activeBomList)

const form = reactive({
  bomId: '',
  bomName: '',
  productName: '',
  quantity: 1,
  unit: '台',
  priority: 'normal',
  plannedStartDate: '',
  plannedEndDate: '',
  workshop: '',
  operator: '',
  notes: '',
  materialRequisitions: []
})

const errors = reactive({
  bomId: '',
  quantity: '',
  plannedStartDate: '',
  plannedEndDate: ''
})

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder,
  smartRecTemplateName: smartRecTemplateName,
  smartRecTemplateContent: smartRecTemplateContent,
  runSmartRecognize,
  applySmartRecognize,
  handleSmartFileUpload,
  resetSmartRec
} = useProductionOrderSmartRecognize(form, bomStore)

function applySmartRecognizeToForm() {
  applySmartRecognize()
  if (form.bomId) {
    handleBomChange()
  } else if (form.quantity > 0) {
    recalcMaterials()
  }
}

/* 监听order变化，编辑时填充表单 */
watch(
  () => props.visible,
  (val) => {
    if (val && props.order) {
      Object.assign(form, {
        bomId: props.order.bomId || '',
        bomName: props.order.bomName || '',
        productName: props.order.productName || '',
        quantity: props.order.quantity || 1,
        unit: props.order.unit || '台',
        priority: props.order.priority || 'normal',
        plannedStartDate: props.order.plannedStartDate || '',
        plannedEndDate: props.order.plannedEndDate || '',
        workshop: props.order.workshop || '',
        operator: props.order.operator || '',
        notes: props.order.notes || '',
        materialRequisitions: props.order.materialRequisitions ? [...props.order.materialRequisitions] : []
      })
    } else if (val && !props.order) {
      Object.assign(form, {
        bomId: '',
        bomName: '',
        productName: '',
        quantity: 1,
        unit: '台',
        priority: 'normal',
        plannedStartDate: '',
        plannedEndDate: '',
        workshop: '',
        operator: '',
        notes: '',
        materialRequisitions: []
      })
    }
    if (val && !props.order) {
      resetSmartRec()
      showSmartRec.value = true
    }
    clearErrors()
  }
)

function clearErrors() {
  Object.keys(errors).forEach((k) => (errors[k] = ''))
}

function handleBomChange() {
  const bom = bomStore.getBomById(form.bomId)
  if (bom) {
    form.bomName = bom.name
    form.productName = bom.productName
    recalcMaterials()
  } else {
    form.bomName = ''
    form.productName = ''
    form.materialRequisitions = []
  }
}

function recalcMaterials() {
  if (!form.bomId || form.quantity <= 0) {
    form.materialRequisitions = []
    return
  }
  const bom = bomStore.getBomById(form.bomId)
  if (!bom) return

  form.materialRequisitions = bom.components.map((comp) => ({
    id: generateId('mr'),
    materialCode: comp.materialCode,
    materialName: comp.materialName,
    requiredQty:
      (parseFloat(comp.quantity) || 0) *
      (parseFloat(form.quantity) || 0) *
      (1 + (parseFloat(comp.scrapRate) || 0) / 100),
    issuedQty: 0,
    unit: comp.unit
  }))
}

function validate() {
  clearErrors()
  let valid = true
  if (!form.bomId) {
    errors.bomId = '请选择关联BOM'
    valid = false
  }
  if (!form.quantity || form.quantity <= 0) {
    errors.quantity = '生产数量必须大于0'
    valid = false
  }
  if (!form.plannedStartDate) {
    errors.plannedStartDate = '请选择计划开始日期'
    valid = false
  }
  if (!form.plannedEndDate) {
    errors.plannedEndDate = '请选择计划结束日期'
    valid = false
  }
  if (form.plannedStartDate && form.plannedEndDate && form.plannedStartDate > form.plannedEndDate) {
    errors.plannedEndDate = '结束日期不能早于开始日期'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!validate()) return

  if (isEdit.value) {
    productionStore.updateProductionOrder(props.order.id, { ...form })
  } else {
    productionStore.addProductionOrder({ ...form })
  }
  emit('saved')
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
  backdrop-filter: blur(4px);
}

.wizard-modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wizard-modal-lg {
  max-width: 720px;
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.wizard-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.wizard-body {
  padding: var(--space-4) var(--space-6);
  overflow-y: auto;
  flex: 1;
}

.wizard-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}

.form-section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.form-row {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.form-row-2 > .form-group {
  flex: 1;
}
.form-row-3 > .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.form-input[readonly] {
  background: var(--color-surface-hover);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--space-1);
}

.material-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.inv-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  font-size: var(--font-size-xs);
  background: var(--color-surface-elevated);
}

.inv-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.inv-table-sm th {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.inv-table-sm td {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .form-row-2,
  .form-row-3 {
    flex-direction: column;
    gap: 0;
  }
  .wizard-modal {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
