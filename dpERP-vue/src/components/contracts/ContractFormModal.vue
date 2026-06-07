<template>
  <div v-if="showModal" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-lg wizard-dialog">
      <div class="modal-header">
        <h3>{{ isEditing ? '编辑合同' : '新建合同' }}</h3>
        <button class="modal-close" @click="$emit('close')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="wizard-steps">
        <div v-for="(s, i) in wizardSteps" :key="i" class="wizard-step" :class="{ active: wizardStep === i + 1, completed: wizardStep > i + 1 }">
          <div class="wizard-step-num">{{ i + 1 }}</div>
          <div class="wizard-step-label">{{ s }}</div>
        </div>
      </div>
      <div class="wizard-body">
        <div v-if="wizardStep === 1" class="form-section">
          <div v-if="!isEditing && !wizardData.sourceQuoteId" class="contract-import-hint"><Icon name="info" :size="14" /> 可从报价单导入数据创建合同，选择客户后可关联报价单</div>
          <div v-if="wizardData.sourceQuoteId" class="contract-import-hint"><Icon name="file" :size="14" /> 已关联报价单，产品明细将自动导入</div>
          <div class="form-section-title">合同基本信息</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">合同类型</label>
              <select v-model="wizardData.contractType" class="form-select">
                <option value="购销合同">购销合同</option>
                <option value="采购合同">采购合同</option>
                <option value="服务合同">服务合同</option>
                <option value="框架协议">框架协议</option>
                <option value="技术协议">技术协议</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">合同编号</label>
              <input v-model="wizardData.contractNo" class="form-input" :readonly="isEditing" :style="isEditing ? 'opacity:0.7;cursor:not-allowed' : ''" />
            </div>
            <div class="form-group">
              <label class="form-label">签订日期</label>
              <input v-model="wizardData.signDate" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">{{ partyALabel }}</label>
              <div style="display:flex;gap:8px">
                <select v-model="wizardData.partyA" class="form-select" style="flex:1" @change="$emit('partyAChange')">
                  <option value="">{{ partyASelectPlaceholder }}</option>
                  <option v-for="c in customers" :key="c.id" :value="c.fullName || c.name">{{ c.fullName || c.name }}</option>
                </select>
                <input v-model="wizardData.partyA" class="form-input" style="flex:1" :placeholder="partyAManualPlaceholder" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ partyBLabel }}</label>
              <input class="form-input" value="苏州冠久新材料科技有限公司" readonly style="opacity:0.8" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">签订地点</label>
              <input v-model="wizardData.signPlace" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">结算方式</label>
              <select v-model="wizardData.settlement" class="form-select">
                <option value="款到发货">款到发货</option>
                <option value="月结30天">月结30天</option>
                <option value="月结60天">月结60天</option>
                <option value="月结90天">月结90天</option>
                <option value="货到付款">货到付款</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">合同有效期至</label>
              <input v-model="wizardData.endDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="wizardData.notes" class="form-textarea" rows="2"></textarea>
            </div>
          </div>
        </div>

        <div v-if="wizardStep === 2" class="form-section">
          <div class="form-section-title">产品明细</div>
          <div style="overflow-x:auto">
            <table class="data-table items-table">
              <thead>
                <tr>
                  <th style="width:36px">序号</th>
                  <th>产品名称</th>
                  <th>规格型号</th>
                  <th style="min-width:120px">数量(KG)</th>
                  <th style="min-width:120px">含税单价(元/KG)</th>
                  <th style="min-width:90px">金额</th>
                  <th>交货地点</th>
                  <th>备注</th>
                  <th style="width:36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in wizardData.products" :key="idx">
                  <td style="text-align:center">{{ idx + 1 }}</td>
                  <td><input v-model="p.productName" class="form-input" placeholder="产品名称" /></td>
                  <td><input v-model="p.spec" class="form-input" placeholder="规格型号" maxlength="50" /></td>
                  <td><input v-model.number="p.quantity" type="number" step="0.01" class="form-input" min="0" placeholder="0.00" /></td>
                  <td><input v-model.number="p.unitPrice" type="number" step="0.01" class="form-input" min="0" placeholder="0.00" /></td>
                  <td class="mono" style="text-align:right;font-weight:600">{{ formatNumber(p.quantity * p.unitPrice) }}</td>
                  <td><input v-model="p.deliveryPlace" class="form-input" placeholder="交货地点" /></td>
                  <td><input v-model="p.remark" class="form-input" placeholder="备注" /></td>
                  <td style="text-align:center"><button class="action-btn danger" @click="$emit('removeProductRow', idx)" :disabled="wizardData.products.length <= 1"><Icon name="close" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-ghost btn-sm" @click="$emit('addProductRow')" style="margin-top:8px">+ 添加产品行</button>
          <div class="contract-amount-display">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>合同总金额（含13%增值税）</span>
              <span class="amount-num mono">¥{{ formatNumber(productsTotal) }}</span>
            </div>
            <div class="amount-cn">{{ numberToChinese(productsTotal) }}</div>
          </div>
        </div>

        <div v-if="wizardStep === 3" class="form-section">
          <div class="form-section-title">合同条款（标准化展示）</div>
          <div class="contract-term-block"><div class="term-title">一、质量标准</div><div class="term-content">{{ wizardData.terms.quality }}</div></div>
          <div class="contract-term-block"><div class="term-title">二、运输方式、费用及风险承担</div><div class="term-content">{{ wizardData.terms.transport }}</div></div>
          <div class="contract-term-block"><div class="term-title">三、验收标准与异议期限</div><div class="term-content">{{ wizardData.terms.inspection }}</div></div>
          <div class="contract-term-block"><div class="term-title">四、结算方式及期限</div><div class="term-content">{{ wizardData.terms.settlement.replace('${结算方式}', wizardData.settlement) }}</div></div>
          <div class="contract-term-block"><div class="term-title">五、包装标准与损耗</div><div class="term-content">{{ wizardData.terms.packaging }}</div></div>
          <div class="contract-term-block"><div class="term-title">六、违约责任</div><div class="term-content">{{ wizardData.terms.breach }}</div></div>
          <div class="contract-term-block"><div class="term-title">七、争议解决</div><div class="term-content">{{ wizardData.terms.dispute }}</div></div>
          <div class="contract-term-block"><div class="term-title">八、合同效力</div><div class="term-content">{{ wizardData.terms.validity }}</div></div>
          <div class="contract-term-block"><div class="term-title">九、知识产权与所有权</div><div class="term-content">{{ wizardData.terms.ipOwnership }}</div></div>
          <div class="contract-term-block"><div class="term-title">十、其他</div><div class="term-content">{{ wizardData.terms.other }}</div></div>
          <div style="margin-top:var(--space-4)"><button class="btn btn-ghost btn-sm" @click="$emit('toggleTermsEditing')"><template v-if="termsEditing">收起编辑</template><template v-else><Icon name="edit" :size="14" /> 编辑条款内容</template></button></div>
          <div v-if="termsEditing" style="margin-top:var(--space-4)">
            <div class="form-group"><label class="form-label">质量标准</label><textarea v-model="wizardData.terms.quality" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">运输方式、费用及风险承担</label><textarea v-model="wizardData.terms.transport" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">验收标准与异议期限</label><textarea v-model="wizardData.terms.inspection" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">结算方式及期限</label><textarea v-model="wizardData.terms.settlement" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">包装标准与损耗</label><textarea v-model="wizardData.terms.packaging" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">违约责任</label><textarea v-model="wizardData.terms.breach" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">争议解决</label><textarea v-model="wizardData.terms.dispute" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">合同效力</label><textarea v-model="wizardData.terms.validity" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">知识产权与所有权</label><textarea v-model="wizardData.terms.ipOwnership" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">其他</label><textarea v-model="wizardData.terms.other" class="form-textarea" rows="2"></textarea></div>
          </div>
        </div>

        <div v-if="wizardStep === 4" class="form-section">
          <div class="form-section-title">签约信息</div>
          <div class="contract-sign-form">
            <div class="contract-sign-block">
              <div class="contract-sign-block-title">{{ partyALabel }}</div>
              <div class="form-group"><label class="form-label">公司名称</label><input class="form-input" :value="wizardData.partyA" readonly style="opacity:0.8" /></div>
              <div class="form-group"><label class="form-label">住所</label><textarea v-model="wizardData.partyAInfo.address" class="form-textarea" rows="2"></textarea></div>
              <div class="form-row form-row-2">
                <div class="form-group"><label class="form-label">签约代表</label><input v-model="wizardData.partyAInfo.representative" class="form-input" /></div>
                <div class="form-group"><label class="form-label">联系方式</label><input v-model="wizardData.partyAInfo.contact" class="form-input" placeholder="电话/邮箱" /></div>
              </div>
              <div class="form-group"><label class="form-label">日期</label><input v-model="wizardData.partyAInfo.date" type="date" class="form-input" /></div>
              <div class="form-group">
                <label class="form-label">电子签章</label>
                <div v-if="wizardData.partyAInfo.seal" style="text-align:center">
                  <img :src="wizardData.partyAInfo.seal" class="contract-seal-preview" />
                  <br /><button class="btn btn-ghost btn-sm" @click="wizardData.partyAInfo.seal = ''">移除签章</button>
                </div>
                <div v-else class="contract-seal-upload" @click="$emit('uploadSeal', 'A')">点击上传<br />电子签章</div>
              </div>
            </div>
            <div class="contract-sign-block" :class="{ fixed: !isPurchaseType }">
              <div class="contract-sign-block-title">{{ partyBLabel }}</div>
              <div class="form-group"><label class="form-label">公司名称</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.companyName" class="form-input" placeholder="请输入供应商公司名称" /><input v-else class="form-input" :value="wizardData.partyBInfo.companyName || '苏州冠久新材料科技有限公司'" readonly style="opacity:0.8" /></div>
              <div class="form-group"><label class="form-label">住所</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.address" class="form-input" placeholder="请输入供应商住所" /><input v-else class="form-input" :value="wizardData.partyBInfo.address || '苏州高新区滨河路3337号'" readonly style="opacity:0.8" /></div>
              <div class="form-row form-row-2">
                <div class="form-group"><label class="form-label">签约代表</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.representative" class="form-input" placeholder="请输入签约代表" /><input v-else class="form-input" :value="wizardData.partyBInfo.representative || '宋建'" readonly style="opacity:0.8" /></div>
                <div class="form-group"><label class="form-label">联系方式</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.contact" class="form-input" placeholder="电话/邮箱" /><input v-else class="form-input" :value="wizardData.partyBInfo.contact || '15589233039'" readonly style="opacity:0.8" /></div>
              </div>
              <div class="form-group"><label class="form-label">日期</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.date" type="date" class="form-input" /><input v-else class="form-input" :value="wizardData.partyBInfo.date" readonly style="opacity:0.8" /></div>
              <div class="form-group">
                <label class="form-label">电子签章</label>
                <div v-if="isPurchaseType">
                  <div v-if="wizardData.partyBInfo.seal" style="text-align:center">
                    <img :src="wizardData.partyBInfo.seal" class="contract-seal-preview" />
                    <br /><button class="btn btn-ghost btn-sm" @click="wizardData.partyBInfo.seal = ''">移除签章</button>
                  </div>
                  <div v-else class="contract-seal-upload" @click="$emit('uploadSeal', 'B')">点击上传<br />电子签章</div>
                </div>
                <div v-else class="contract-seal-area has-seal">苏州冠久<br />新材料科技<br />有限公司</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" v-if="wizardStep > 1" @click="$emit('prevStep')"><Icon name="chevronLeft" :size="14" /> 上一步</button>
        <label class="save-template-check" style="display:flex;align-items:center;gap:6px;margin-left:auto;cursor:pointer;font-size:13px;">
          <input type="checkbox" :checked="saveAsTemplateFlag" @change="$emit('update:saveAsTemplateFlag', $event.target.checked)"> 另存为模板
        </label>
        <button class="btn btn-ghost" @click="$emit('saveDraft')">保存草稿</button>
        <button class="btn btn-primary" v-if="wizardStep < 4" @click="$emit('nextStep')">下一步 <Icon name="chevronRight" :size="14" /></button>
        <button class="btn btn-primary" v-if="wizardStep === 4" @click="$emit('submitContract')">提交审批</button>
      </div>
    </div>
  </div>

  <div v-if="showTemplateModal" class="modal-overlay" @click.self="$emit('closeTemplateModal')">
    <div class="modal-dialog" style="max-width:600px">
      <div class="modal-header">
        <h3>合同模板管理</h3>
        <button class="modal-close" @click="$emit('closeTemplateModal')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="template-upload-area">
          <div class="upload-zone" @click="clickTemplateFileInput" @dragover.prevent @drop.prevent="$emit('templateDrop', $event)">
            <div class="upload-icon">[机器人]</div>
            <div class="upload-text">AI智能识别合同</div>
            <div class="upload-hint">点击上传或拖拽文件（支持PDF/Word/Excel/图片）</div>
            <input ref="templateFileInput" type="file" style="display:none" @change="$emit('templateFileSelect', $event)" />
          </div>
          <div v-if="aiParsing" class="ai-parsing-hint">[机器人] AI正在识别中...</div>
        </div>
        <div v-if="templates.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="list" :size="14" /></div>
          <div>暂无合同模板</div>
          <div style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-top:8px">创建合同后可保存为模板，方便复用</div>
        </div>
        <div v-for="tpl in templates" :key="tpl.id" class="template-card">
          <div class="template-card-header">
            <div>
              <span class="template-card-title">{{ tpl.name }}</span>
              <span class="template-type-tag">{{ tpl.contractType || '购销合同' }}</span>
            </div>
            <div class="template-card-actions">
              <button class="btn btn-primary btn-sm" @click="$emit('useTemplate', tpl)">使用模板</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="$emit('deleteTemplate', tpl.id)">删除</button>
            </div>
          </div>
          <div class="template-card-meta">版本: {{ tpl.version || 'v1.0' }} | 创建: {{ tpl.createdAt || '-' }} | 结算方式: {{ tpl.settlement || '-' }}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('closeTemplateModal')">关闭</button>
        <button class="btn btn-primary" @click="$emit('saveAsTemplate')"><Icon name="save" :size="14" /> 保存当前合同为模板</button>
      </div>
    </div>
  </div>

  <div v-if="showRejectModal" class="modal-overlay" @click.self="$emit('closeRejectModal')">
    <div class="modal-dialog" style="max-width:450px">
      <div class="modal-header">
        <h3>驳回合同</h3>
        <button class="modal-close" @click="$emit('closeRejectModal')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">驳回原因</label>
          <textarea :value="rejectReason" @input="$emit('update:rejectReason', $event.target.value)" class="form-textarea" rows="3" placeholder="请输入驳回原因..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('closeRejectModal')">取消</button>
        <button class="btn btn-primary" style="background:var(--color-danger);border-color:var(--color-danger)" @click="$emit('confirmReject')">确认驳回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { numberToChinese } from '@/utils/numberToChinese.js'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  wizardStep: { type: Number, default: 1 },
  wizardData: { type: Object, default: () => ({}) },
  isEditing: { type: Boolean, default: false },
  termsEditing: { type: Boolean, default: false },
  customers: { type: Array, default: () => [] },
  saveAsTemplateFlag: { type: Boolean, default: false },
  showTemplateModal: { type: Boolean, default: false },
  templates: { type: Array, default: () => [] },
  aiParsing: { type: Boolean, default: false },
  showRejectModal: { type: Boolean, default: false },
  rejectReason: { type: String, default: '' }
})

defineEmits([
  'close',
  'nextStep',
  'prevStep',
  'saveDraft',
  'submitContract',
  'addProductRow',
  'removeProductRow',
  'partyAChange',
  'uploadSeal',
  'toggleTermsEditing',
  'update:saveAsTemplateFlag',
  'closeTemplateModal',
  'triggerTemplateUpload',
  'templateDrop',
  'templateFileSelect',
  'useTemplate',
  'deleteTemplate',
  'saveAsTemplate',
  'closeRejectModal',
  'update:rejectReason',
  'confirmReject'
])

const templateFileInput = ref(null)
function clickTemplateFileInput() {
  templateFileInput.value?.click()
}

const wizardSteps = ['基本信息', '产品明细', '合同条款', '签约信息']

const isPurchaseType = computed(() => props.wizardData.contractType === '采购合同')
const partyALabel = computed(() => isPurchaseType.value ? '甲方（买方）' : '甲方（需方）')
const partyBLabel = computed(() => isPurchaseType.value ? '乙方（卖方）' : '乙方（供方）')
const partyASelectPlaceholder = computed(() => isPurchaseType.value ? '请选择供应商' : '请选择客户')
const partyAManualPlaceholder = computed(() => isPurchaseType.value ? '或手动输入供应商名称' : '或手动输入')

const productsTotal = computed(() => {
  return props.wizardData.products?.reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0) || 0
})

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.modal-overlay { align-items: flex-start; padding: 20px; overflow-y: auto; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-lg { max-width: 1200px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-surface); z-index: 1; }
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }

.wizard-dialog { display: flex; flex-direction: column; }
.wizard-steps { display: flex; padding: var(--space-3) var(--space-6); border-bottom: 1px solid var(--color-border); gap: var(--space-2); background: var(--color-bg-primary); flex-shrink: 0; }
.wizard-step { flex: 1; text-align: center; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--color-text-tertiary); cursor: pointer; transition: all var(--transition-fast); position: relative; }
.wizard-step.active { background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 600; }
.wizard-step.completed { color: var(--color-success); }
.wizard-step.completed::after { content: ' [√]'; }
.wizard-body { flex: 1; overflow-y: auto; padding: var(--space-6); min-height: 400px; }

.form-section { margin-bottom: 20px; }
.form-section-title { font-size: 14px; font-weight: 600; color: var(--color-accent); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
.form-input, .form-select, .form-textarea { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); }
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle, rgba(59,130,246,0.1)); }
.form-textarea { resize: vertical; }

.contract-import-hint { background: var(--color-info-subtle, #eff6ff); border: 1px solid var(--color-info, #3b82f6); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-info, #3b82f6); }

.items-table { font-size: 12px; }
.items-table input { padding: 4px 6px; font-size: 12px; }

.contract-amount-display { background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); padding: var(--space-4); margin-top: var(--space-3); }
.contract-amount-display .amount-num { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent); }
.contract-amount-display .amount-cn { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px; }

.contract-term-block { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); }
.contract-term-block .term-title { font-weight: 600; color: var(--color-text-primary); margin-bottom: 6px; font-size: var(--font-size-sm); }
.contract-term-block .term-content { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.7; }

.contract-sign-form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); }
.contract-sign-block { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
.contract-sign-block-title { font-weight: 700; font-size: var(--font-size-md); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.contract-sign-block.fixed .contract-sign-block-title { color: var(--color-accent); }
.contract-seal-upload { width: 100px; height: 100px; border: 2px dashed var(--color-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: var(--space-3) auto; cursor: pointer; transition: border-color var(--transition-fast); color: var(--color-text-tertiary); font-size: var(--font-size-xs); text-align: center; }
.contract-seal-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.contract-seal-preview { width: 100px; height: 100px; border-radius: 50%; margin: var(--space-3) auto; object-fit: cover; }
.contract-seal-area { width: 120px; height: 120px; border: 2px dashed var(--color-border-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 10px auto; color: var(--color-text-tertiary); font-size: 9pt; text-align: center; }
.contract-seal-area.has-seal { border-color: #c00; color: #c00; font-weight: bold; font-size: 10pt; }

.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
.action-btn { padding: 3px 6px; font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }

.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: 12px; white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }

.save-template-check { color: var(--color-text-secondary); }

.template-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); transition: border-color var(--transition-fast); }
.template-card:hover { border-color: var(--color-accent); }
.template-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
.template-card-title { font-weight: 600; color: var(--color-text-primary); margin-right: 8px; }
.template-type-tag { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--color-accent); font-weight: 500; vertical-align: middle; }
.template-card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.template-card-actions { display: flex; gap: var(--space-2); }

.template-upload-area { margin-bottom: 16px; }
.upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.15s; }
.upload-zone:hover { border-color: var(--color-accent); background: var(--color-accent-subtle, #eff6ff); }
.upload-icon { font-size: 28px; margin-bottom: 8px; }
.upload-text { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
.upload-hint { font-size: 12px; color: var(--color-text-tertiary); }
.ai-parsing-hint { text-align: center; padding: 8px; color: var(--color-accent); font-size: 13px; margin-top: 8px; }

.empty-state { text-align: center; padding: 40px; color: var(--color-text-tertiary); }
.empty-state-icon { font-size: 36px; margin-bottom: 12px; }

@media (max-width: 768px) {
  .form-row-2, .form-row-3 { grid-template-columns: 1fr; }
  .contract-sign-form { grid-template-columns: 1fr; }
}
</style>
