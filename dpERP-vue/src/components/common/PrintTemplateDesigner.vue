<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" style="max-width: 1100px; height: 85vh; display: flex; flex-direction: column">
      <div class="modal-header">
        <span class="modal-title">{{ isEdit ? '编辑模板' : '模板设计器' }}</span>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body" style="flex: 1; display: flex; gap: var(--space-4); padding: var(--space-4); overflow: hidden">
        <!-- 左侧：变量列表 -->
        <div class="designer-sidebar" style="width: 200px; flex-shrink: 0; overflow-y: auto">
          <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--space-2); color: var(--color-text-secondary)">可用变量</div>
          <div style="margin-bottom: var(--space-3)">
            <select v-model="selectedType" class="form-select" style="margin-bottom: var(--space-2)">
              <option value="quotation">报价单</option>
              <option value="contract">合同</option>
              <option value="outbound">出库单</option>
              <option value="delivery">送货单</option>
              <option value="statement">对账单</option>
              <option value="purchase">采购单</option>
              <option value="transfer">调拨单</option>
            </select>
          </div>
          <div v-for="v in currentVariables" :key="v" class="variable-item" draggable="true" @dragstart="handleDragStart($event, v)">
            <Icon name="code" :size="12" /> {{ v }}
          </div>
        </div>

        <!-- 中间：编辑区 -->
        <div style="flex: 1; display: flex; flex-direction: column; min-width: 0">
          <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2); align-items: center">
            <input v-model="templateName" type="text" class="form-input" placeholder="模板名称" style="flex: 1" />
          </div>
          <div
            ref="editorRef"
            class="template-editor"
            contenteditable="true"
            @input="handleEditorInput"
            @drop="handleDrop"
            @dragover.prevent
            v-html="editorContent"
          ></div>
        </div>

        <!-- 右侧：模板属性 -->
        <div style="width: 200px; flex-shrink: 0; overflow-y: auto">
          <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--space-3); color: var(--color-text-secondary)">模板属性</div>

          <div class="form-group">
            <label class="form-label">纸张大小</label>
            <select v-model="pageSize" class="form-select">
              <option value="A4">A4</option>
              <option value="A5">A5</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">方向</label>
            <select v-model="orientation" class="form-select">
              <option value="portrait">纵向</option>
              <option value="landscape">横向</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">上边距(mm)</label>
            <input v-model.number="margins.top" type="number" class="form-input" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label">右边距(mm)</label>
            <input v-model.number="margins.right" type="number" class="form-input" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label">下边距(mm)</label>
            <input v-model.number="margins.bottom" type="number" class="form-input" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label">左边距(mm)</label>
            <input v-model.number="margins.left" type="number" class="form-input" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label">页眉</label>
            <input v-model="header" type="text" class="form-input" placeholder="如: {{companyName}}" />
          </div>

          <div class="form-group">
            <label class="form-label">页脚</label>
            <input v-model="footer" type="text" class="form-input" placeholder="如: 第{{pageNumber}}页" />
          </div>

          <button class="btn btn-outline" style="width: 100%; margin-top: var(--space-3)" @click="handlePreview">
            <Icon name="eye" :size="14" /> 预览
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">
          <Icon name="check" :size="14" /> 保存
        </button>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <PrintPreview
      v-if="previewHtml"
      :html="previewHtml"
      title="模板预览"
      @close="previewHtml = ''"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { getPrintEngine } from '@/utils/printEngine'
import PrintPreview from '@/components/common/PrintPreview.vue'

const props = defineProps({
  templateId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'saved'])

const engine = getPrintEngine()

const isEdit = computed(() => !!props.templateId)
const editorRef = ref(null)

const templateName = ref('')
const selectedType = ref('quotation')
const pageSize = ref('A4')
const orientation = ref('portrait')
const margins = ref({ top: 15, right: 15, bottom: 15, left: 15 })
const header = ref('')
const footer = ref('')
const editorContent = ref('')
const previewHtml = ref('')

let currentContent = ''

const currentVariables = computed(() => engine.getVariablesByType(selectedType.value))

onMounted(() => {
  if (props.templateId) {
    const tpl = engine.getTemplate(props.templateId)
    if (tpl) {
      templateName.value = tpl.name
      selectedType.value = tpl.type
      pageSize.value = tpl.pageSize
      orientation.value = tpl.orientation
      margins.value = { ...tpl.margins }
      header.value = tpl.header || ''
      footer.value = tpl.footer || ''
      currentContent = tpl.content
      editorContent.value = tpl.content
    }
  } else {
    currentContent = '<div>新模板内容</div>'
    editorContent.value = currentContent
  }
})

function handleEditorInput() {
  if (editorRef.value) {
    currentContent = editorRef.value.innerHTML
  }
}

function handleDragStart(event, variable) {
  event.dataTransfer.setData('text/plain', '{{' + variable.split('[')[0] + '}}')
}

function handleDrop(event) {
  event.preventDefault()
  const text = event.dataTransfer.getData('text/plain')
  if (text && editorRef.value) {
    document.execCommand('insertText', false, text)
    currentContent = editorRef.value.innerHTML
  }
}

function handlePreview() {
  /* 用示例数据渲染预览 */
  const sampleData = {
    title: '示例标题',
    orderNo: 'EX20260607001',
    date: '2026-06-07',
    companyName: '冠久企业',
    customerName: '示例客户',
    supplierName: '示例供应商',
    totalAmount: '12,345.67',
    totalBalance: '8,888.88',
    notes: '示例备注',
    contractNo: 'CT-2026-001',
    partyA: '甲方公司',
    partyB: '乙方公司',
    signDate: '2026-06-07',
    fromWarehouse: '主仓库',
    toWarehouse: '分仓库',
    type: '同价调拨',
    address: '示例地址',
    contact: '张经理',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    deliveryDate: '2026-06-10',
    content: '示例合同内容...',
    items: [
      { index: 1, code: 'MTL-001', name: 'ABS树脂', spec: '通用级', quantity: 100, unit: 'kg', unitPrice: 85.5, amount: 8550, location: 'A-01', summary: '销售', debit: 8550, credit: 0, balance: 8550, remark: '', date: '2026-06-01', orderNo: 'SO-001' },
      { index: 2, code: 'MTL-002', name: '不锈钢板304', spec: '2B/BA', quantity: 200, unit: 'kg', unitPrice: 120, amount: 24000, location: 'B-02', summary: '收款', debit: 0, credit: 12000, balance: -3450, remark: '', date: '2026-06-03', orderNo: 'RC-001' }
    ]
  }

  /* 临时用当前编辑器内容渲染 */
  const tempTemplate = {
    content: currentContent
  }
  const oldContent = engine.getTemplate(selectedType.value)?.content
  if (engine.getTemplate(selectedType.value)) {
    engine.getTemplate(selectedType.value).content = currentContent
  }
  previewHtml.value = engine.render(engine.getTemplateByType(selectedType.value)?.id || 'tpl_quotation', sampleData)
  if (engine.getTemplate(selectedType.value) && oldContent) {
    engine.getTemplate(selectedType.value).content = oldContent
  }
}

function handleSave() {
  if (!templateName.value) {
    templateName.value = selectedType.value + '模板'
  }

  const template = {
    id: props.templateId || 'tpl_' + Date.now(),
    name: templateName.value,
    type: selectedType.value,
    pageSize: pageSize.value,
    orientation: orientation.value,
    margins: { ...margins.value },
    header: header.value,
    footer: footer.value,
    content: currentContent,
    createDate: new Date().toISOString().split('T')[0]
  }

  engine.saveTemplate(template)
  emit('saved', template)
  emit('close')
}
</script>

<style scoped>
.designer-sidebar {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.variable-item {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  color: var(--color-accent);
  cursor: grab;
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.variable-item:hover {
  background: var(--color-accent-subtle);
}
.template-editor {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  overflow-y: auto;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
}
.template-editor:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}
</style>
