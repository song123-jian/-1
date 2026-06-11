<template>
  <div v-if="showModal" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-lg wizard-dialog">
      <div class="modal-header">
        <h3>{{ isEditing ? '�༭��ͬ' : '�½���ͬ' }}</h3>
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
          <div v-if="!isEditing && !wizardData.sourceQuoteId" class="contract-import-hint"><Icon name="info" :size="14" /> �ɴӱ��۵��������ݴ�����ͬ��ѡ��ͻ���ɹ������۵�</div>
          <div v-if="wizardData.sourceQuoteId" class="contract-import-hint"><Icon name="file" :size="14" /> �ѹ������۵�����Ʒ��ϸ���Զ�����</div>
          <div class="form-section-title">��ͬ������Ϣ</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">��ͬ����</label>
              <select v-model="wizardData.contractType" class="form-select">
                <option value="������ͬ">������ͬ</option>
                <option value="�ɹ���ͬ">�ɹ���ͬ</option>
                <option value="�����ͬ">�����ͬ</option>
                <option value="���Э��">���Э��</option>
                <option value="����Э��">����Э��</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">��ͬ���</label>
              <input v-model="wizardData.contractNo" class="form-input" :readonly="isEditing" :style="isEditing ? 'opacity:0.7;cursor:not-allowed' : ''" />
            </div>
            <div class="form-group">
              <label class="form-label">ǩ������</label>
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
              <input class="form-input" value="���ݹھ��²��ϿƼ����޹�˾" readonly style="opacity:0.8" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">ǩ���ص�</label>
              <input v-model="wizardData.signPlace" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">���㷽ʽ</label>
              <select v-model="wizardData.settlement" class="form-select">
                <option value="�����">�����</option>
                <option value="�½�30��">�½�30��</option>
                <option value="�½�60��">�½�60��</option>
                <option value="�½�90��">�½�90��</option>
                <option value="��������">��������</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">��ͬ��Ч����</label>
              <input v-model="wizardData.endDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">��ע</label>
              <textarea v-model="wizardData.notes" class="form-textarea" rows="2"></textarea>
            </div>
          </div>
        </div>

        <div v-if="wizardStep === 2" class="form-section">
          <div class="form-section-title">��Ʒ��ϸ</div>
          <div style="overflow-x:auto">
            <table class="data-table items-table">
              <thead>
                <tr>
                  <th style="width:36px">���</th>
                  <th>��Ʒ����</th>
                  <th>����ͺ�</th>
                  <th style="min-width:120px">����(KG)</th>
                  <th style="min-width:120px">��˰����(Ԫ/KG)</th>
                  <th style="min-width:90px">���</th>
                  <th>�����ص�</th>
                  <th>��ע</th>
                  <th style="width:36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in wizardData.products" :key="idx">
                  <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word">{{ idx + 1 }}</td>
                  <td><input v-model="p.productName" class="form-input" placeholder="��Ʒ����" /></td>
                  <td><input v-model="p.spec" class="form-input" placeholder="����ͺ�" maxlength="50" /></td>
                  <td><input v-model.number="p.quantity" type="number" step="0.01" class="form-input" min="0" placeholder="0.00" /></td>
                  <td><input v-model.number="p.unitPrice" type="number" step="0.01" class="form-input" min="0" placeholder="0.00" /></td>
                  <td class="mono" style="text-align:right;font-weight:600">{{ formatNumber(p.quantity * p.unitPrice) }}</td>
                  <td><input v-model="p.deliveryPlace" class="form-input" placeholder="�����ص�" /></td>
                  <td><input v-model="p.remark" class="form-input" placeholder="��ע" /></td>
                  <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word"><button class="action-btn danger" @click="$emit('removeProductRow', idx)" :disabled="wizardData.products.length <= 1"><Icon name="close" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-ghost btn-sm" @click="$emit('addProductRow')" style="margin-top:8px">���Ӳ�Ʒ��</button>
          <div class="contract-amount-display">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>��ͬ�ܽ���13%��ֵ˰��</span>
              <span class="amount-num mono">��{{ formatNumber(productsTotal) }}</span>
            </div>
            <div class="amount-cn">{{ numberToChinese(productsTotal) }}</div>
          </div>
        </div>

        <div v-if="wizardStep === 3" class="form-section">
          <div class="form-section-title">��ͬ�����׼��չʾ��</div>
          <div class="contract-term-block"><div class="term-title">һ��������׼</div><div class="term-content">{{ wizardData.terms.quality }}</div></div>
          <div class="contract-term-block"><div class="term-title">�������䷽ʽ�����ü����ճе�</div><div class="term-content">{{ wizardData.terms.transport }}</div></div>
          <div class="contract-term-block"><div class="term-title">�������ձ�׼����������</div><div class="term-content">{{ wizardData.terms.inspection }}</div></div>
          <div class="contract-term-block"><div class="term-title">�ġ����㷽ʽ������</div><div class="term-content">{{ wizardData.terms.settlement.replace('${���㷽ʽ}', wizardData.settlement) }}</div></div>
          <div class="contract-term-block"><div class="term-title">�塢��װ��׼�����</div><div class="term-content">{{ wizardData.terms.packaging }}</div></div>
          <div class="contract-term-block"><div class="term-title">����ΥԼ����</div><div class="term-content">{{ wizardData.terms.breach }}</div></div>
          <div class="contract-term-block"><div class="term-title">�ߡ�������</div><div class="term-content">{{ wizardData.terms.dispute }}</div></div>
          <div class="contract-term-block"><div class="term-title">�ˡ���ͬЧ��</div><div class="term-content">{{ wizardData.terms.validity }}</div></div>
          <div class="contract-term-block"><div class="term-title">�š�֪ʶ��Ȩ������Ȩ</div><div class="term-content">{{ wizardData.terms.ipOwnership }}</div></div>
          <div class="contract-term-block"><div class="term-title">ʮ������</div><div class="term-content">{{ wizardData.terms.other }}</div></div>
          <div style="margin-top:var(--space-4)"><button class="btn btn-ghost btn-sm" @click="$emit('toggleTermsEditing')"><template v-if="termsEditing">����༭</template><template v-else><Icon name="edit" :size="14" /> �༭��������</template></button></div>
          <div v-if="termsEditing" style="margin-top:var(--space-4)">
            <div class="form-group"><label class="form-label">������׼</label><textarea v-model="wizardData.terms.quality" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">���䷽ʽ�����ü����ճе�</label><textarea v-model="wizardData.terms.transport" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">���ձ�׼����������</label><textarea v-model="wizardData.terms.inspection" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">���㷽ʽ������</label><textarea v-model="wizardData.terms.settlement" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">��װ��׼�����</label><textarea v-model="wizardData.terms.packaging" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">ΥԼ����</label><textarea v-model="wizardData.terms.breach" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">������</label><textarea v-model="wizardData.terms.dispute" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">��ͬЧ��</label><textarea v-model="wizardData.terms.validity" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">֪ʶ��Ȩ������Ȩ</label><textarea v-model="wizardData.terms.ipOwnership" class="form-textarea" rows="2"></textarea></div>
            <div class="form-group"><label class="form-label">����</label><textarea v-model="wizardData.terms.other" class="form-textarea" rows="2"></textarea></div>
          </div>
        </div>

        <div v-if="wizardStep === 4" class="form-section">
          <div class="form-section-title">ǩԼ��Ϣ</div>
          <div class="contract-sign-form">
            <div class="contract-sign-block">
              <div class="contract-sign-block-title">{{ partyALabel }}</div>
              <div class="form-group"><label class="form-label">��˾����</label><input class="form-input" :value="wizardData.partyA" readonly style="opacity:0.8" /></div>
              <div class="form-group"><label class="form-label">ס��</label><textarea v-model="wizardData.partyAInfo.address" class="form-textarea" rows="2"></textarea></div>
              <div class="form-row form-row-2">
                <div class="form-group"><label class="form-label">ǩԼ����</label><input v-model="wizardData.partyAInfo.representative" class="form-input" /></div>
                <div class="form-group"><label class="form-label">��ϵ��ʽ</label><input v-model="wizardData.partyAInfo.contact" class="form-input" placeholder="�绰/����" /></div>
              </div>
              <div class="form-group"><label class="form-label">����</label><input v-model="wizardData.partyAInfo.date" type="date" class="form-input" /></div>
              <div class="form-group">
                <label class="form-label">����ǩ��</label>
                <div v-if="wizardData.partyAInfo.seal" style="text-align:center">
                  <img :src="wizardData.partyAInfo.seal" class="contract-seal-preview" />
                  <br /><button class="btn btn-ghost btn-sm" @click="wizardData.partyAInfo.seal = ''">�Ƴ�ǩ��</button>
                </div>
                <div v-else class="contract-seal-upload" @click="$emit('uploadSeal', 'A')">����ϴ�<br />����ǩ��</div>
              </div>
            </div>
            <div class="contract-sign-block" :class="{ fixed: !isPurchaseType }">
              <div class="contract-sign-block-title">{{ partyBLabel }}</div>
              <div class="form-group"><label class="form-label">��˾����</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.companyName" class="form-input" placeholder="�����빩Ӧ�̹�˾����" /><input v-else class="form-input" :value="wizardData.partyBInfo.companyName || '���ݹھ��²��ϿƼ����޹�˾'" readonly style="opacity:0.8" /></div>
              <div class="form-group"><label class="form-label">ס��</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.address" class="form-input" placeholder="�����빩Ӧ��ס��" /><input v-else class="form-input" :value="wizardData.partyBInfo.address || '���ݸ���������·3337��'" readonly style="opacity:0.8" /></div>
              <div class="form-row form-row-2">
                <div class="form-group"><label class="form-label">ǩԼ����</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.representative" class="form-input" placeholder="������ǩԼ����" /><input v-else class="form-input" :value="wizardData.partyBInfo.representative || '�ν�'" readonly style="opacity:0.8" /></div>
                <div class="form-group"><label class="form-label">��ϵ��ʽ</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.contact" class="form-input" placeholder="�绰/����" /><input v-else class="form-input" :value="wizardData.partyBInfo.contact || '15589233039'" readonly style="opacity:0.8" /></div>
              </div>
              <div class="form-group"><label class="form-label">����</label><input v-if="isPurchaseType" v-model="wizardData.partyBInfo.date" type="date" class="form-input" /><input v-else class="form-input" :value="wizardData.partyBInfo.date" readonly style="opacity:0.8" /></div>
              <div class="form-group">
                <label class="form-label">����ǩ��</label>
                <div v-if="isPurchaseType">
                  <div v-if="wizardData.partyBInfo.seal" style="text-align:center">
                    <img :src="wizardData.partyBInfo.seal" class="contract-seal-preview" />
                    <br /><button class="btn btn-ghost btn-sm" @click="wizardData.partyBInfo.seal = ''">�Ƴ�ǩ��</button>
                  </div>
                  <div v-else class="contract-seal-upload" @click="$emit('uploadSeal', 'B')">����ϴ�<br />����ǩ��</div>
                </div>
                <div v-else class="contract-seal-area has-seal">���ݹھ�<br />�²��ϿƼ�<br />���޹�˾</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" v-if="wizardStep > 1" @click="$emit('prevStep')"><Icon name="chevronLeft" :size="14" /> ��һ��</button>
        <label class="save-template-check" style="display:flex;align-items:center;gap:6px;margin-left:auto;cursor:pointer;font-size:13px;">
          <input type="checkbox" :checked="saveAsTemplateFlag" @change="$emit('update:saveAsTemplateFlag', $event.target.checked)"> ����Ϊģ��
        </label>
        <button class="btn btn-ghost" @click="$emit('saveDraft')">����ݸ�</button>
        <button class="btn btn-primary" v-if="wizardStep < 4" @click="$emit('nextStep')">��һ�� <Icon name="chevronRight" :size="14" /></button>
        <button class="btn btn-primary" v-if="wizardStep === 4" @click="$emit('submitContract')">�ύ����</button>
      </div>
    </div>
  </div>

  <div v-if="showTemplateModal" class="modal-overlay" @click.self="$emit('closeTemplateModal')">
    <div class="modal-dialog" style="max-width:600px">
      <div class="modal-header">
        <h3>��ͬģ�����</h3>
        <button class="modal-close" @click="$emit('closeTemplateModal')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="template-upload-area">
          <div class="upload-zone" @click="clickTemplateFileInput" @dragover.prevent @drop.prevent="$emit('templateDrop', $event)">
            <div class="upload-icon">[������]</div>
            <div class="upload-text">AI����ʶ���ͬ</div>
            <div class="upload-hint">����ϴ�����ק�ļ���֧��PDF/Word/Excel/ͼƬ��</div>
            <input ref="templateFileInput" type="file" style="display:none" @change="$emit('templateFileSelect', $event)" />
          </div>
          <div v-if="aiParsing" class="ai-parsing-hint">[������] AI����ʶ����...</div>
        </div>
        <div v-if="templates.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="list" :size="14" /></div>
          <div>���޺�ͬģ��</div>
          <div style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-top:8px">������ͬ��ɱ���Ϊģ�壬���㸴��</div>
        </div>
        <div v-for="tpl in templates" :key="tpl.id" class="template-card">
          <div class="template-card-header">
            <div>
              <span class="template-card-title">{{ tpl.name }}</span>
              <span class="template-type-tag">{{ tpl.contractType || '������ͬ' }}</span>
            </div>
            <div class="template-card-actions">
              <button class="btn btn-primary btn-sm" @click="$emit('useTemplate', tpl)">ʹ��ģ��</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="$emit('deleteTemplate', tpl.id)">ɾ��</button>
            </div>
          </div>
          <div class="template-card-meta">�汾: {{ tpl.version || 'v1.0' }} | ����: {{ tpl.createdAt || '-' }} | ���㷽ʽ: {{ tpl.settlement || '-' }}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('closeTemplateModal')">�ر�</button>
        <button class="btn btn-primary" @click="$emit('saveAsTemplate')"><Icon name="save" :size="14" /> ���浱ǰ��ͬΪģ��</button>
      </div>
    </div>
  </div>

  <div v-if="showRejectModal" class="modal-overlay" @click.self="$emit('closeRejectModal')">
    <div class="modal-dialog" style="max-width:450px">
      <div class="modal-header">
        <h3>���غ�ͬ</h3>
        <button class="modal-close" @click="$emit('closeRejectModal')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">����ԭ��</label>
          <textarea :value="rejectReason" @input="$emit('update:rejectReason', $event.target.value)" class="form-textarea" rows="3" placeholder="�����벵��ԭ��..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('closeRejectModal')">ȡ��</button>
        <button class="btn btn-primary" style="background:var(--color-danger);border-color:var(--color-danger)" @click="$emit('confirmReject')">ȷ�ϲ���</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { numberToChinese } from '@/utils/numberToChinese.js'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  wizardStep: { type: Number, default: 1 },
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

const wizardData = defineModel('wizardData', { default: () => ({}) })

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

const wizardSteps = ['������Ϣ', '��Ʒ��ϸ', '��ͬ����', 'ǩԼ��Ϣ']

const isPurchaseType = computed(() => wizardData.value.contractType === '�ɹ���ͬ')
const partyALabel = computed(() => isPurchaseType.value ? '�׷����򷽣�' : '�׷����跽��')
const partyBLabel = computed(() => isPurchaseType.value ? '�ҷ���������' : '�ҷ���������')
const partyASelectPlaceholder = computed(() => isPurchaseType.value ? '��ѡ��Ӧ��' : '��ѡ��ͻ�')
const partyAManualPlaceholder = computed(() => isPurchaseType.value ? '���ֶ����빩Ӧ������' : '���ֶ�����')

const productsTotal = computed(() => {
  return wizardData.value.products?.reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0) || 0
})

</script>

<style scoped>
.modal-overlay { align-items: flex-start; padding: var(--space-5); overflow-y: auto; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-lg { max-width: 1200px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-surface); z-index: 1; }
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); }

.wizard-dialog { display: flex; flex-direction: column; }
.wizard-steps { display: flex; padding: var(--space-3) var(--space-6); border-bottom: 1px solid var(--color-border); gap: var(--space-2); background: var(--color-bg-primary); flex-shrink: 0; }
.wizard-step { flex: 1; text-align: center; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--color-text-tertiary); cursor: pointer; transition: all var(--transition-fast); position: relative; }
.wizard-step.active { background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 600; }
.wizard-step.completed { color: var(--color-success); }
.wizard-step.completed::after { content: ' [��]'; }
.wizard-body { flex: 1; overflow-y: auto; padding: var(--space-6); min-height: 400px; }

.form-section { margin-bottom: var(--space-5); }
.form-section-title { font-size: 14px; font-weight: 600; color: var(--color-accent); margin: 0 0 var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
.form-input, .form-select, .form-textarea { padding: var(--space-2) var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); }
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle, rgba(59,130,246,0.1)); }
.form-textarea { resize: vertical; }

.contract-import-hint { background: var(--color-info-subtle, #eff6ff); border: 1px solid var(--color-info, #3b82f6); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-info, #3b82f6); }

.items-table { font-size: 12px; }
.items-table input { padding: var(--space-1) var(--space-2); font-size: 12px; }

.contract-amount-display { background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); padding: var(--space-4); margin-top: var(--space-3); }
.contract-amount-display .amount-num { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent); }
.contract-amount-display .amount-cn { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-1); }

.contract-term-block { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); }
.contract-term-block .term-title { font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-2); font-size: var(--font-size-sm); }
.contract-term-block .term-content { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.7; }

.contract-sign-form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); }
.contract-sign-block { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
.contract-sign-block-title { font-weight: 700; font-size: var(--font-size-md); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.contract-sign-block.fixed .contract-sign-block-title { color: var(--color-accent); }
.contract-seal-upload { width: 100px; height: 100px; border: 2px dashed var(--color-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: var(--space-3) auto; cursor: pointer; transition: border-color var(--transition-fast); color: var(--color-text-tertiary); font-size: var(--font-size-xs); text-align: center; }
.contract-seal-upload:hover { border-color: var(--color-accent); color: var(--color-accent); }
.contract-seal-preview { width: 100px; height: 100px; border-radius: 50%; margin: var(--space-3) auto; object-fit: cover; }
.contract-seal-area { width: 120px; height: 120px; border: 2px dashed var(--color-border-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: var(--space-2) auto; color: var(--color-text-tertiary); font-size: 9pt; text-align: center; }
.contract-seal-area.has-seal { border-color: #c00; color: #c00; font-weight: bold; font-size: 10pt; }

.mono { font-family: var(--font-mono); }
.action-btn { padding: var(--space-1) var(--space-2); font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }

.btn { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: var(--space-1) var(--space-2); font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
.data-table th { padding: var(--space-2) var(--space-3); text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: 12px; white-space: nowrap; }
.data-table td {padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); overflow-wrap: break-word; word-wrap: break-word}

.save-template-check { color: var(--color-text-secondary); }

.template-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); transition: border-color var(--transition-fast); }
.template-card:hover { border-color: var(--color-accent); }
.template-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
.template-card-title { font-weight: 600; color: var(--color-text-primary); margin-right: var(--space-2); }
.template-type-tag { display: inline-block; font-size: 11px; padding: var(--space-1) var(--space-2); border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--color-accent); font-weight: 500; vertical-align: middle; }
.template-card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.template-card-actions { display: flex; gap: var(--space-2); }

.template-upload-area { margin-bottom: var(--space-4); }
.upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: var(--space-5); text-align: center; cursor: pointer; transition: all 0.15s; }
.upload-zone:hover { border-color: var(--color-accent); background: var(--color-accent-subtle, #eff6ff); }
.upload-icon { font-size: 28px; margin-bottom: var(--space-2); }
.upload-text { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-1); }
.upload-hint { font-size: 12px; color: var(--color-text-tertiary); }
.ai-parsing-hint { text-align: center; padding: var(--space-2); color: var(--color-accent); font-size: 13px; margin-top: var(--space-2); }

.empty-state { text-align: center; padding: var(--space-10); color: var(--color-text-tertiary); }
.empty-state-icon { font-size: 36px; margin-bottom: var(--space-3); }

@media (max-width: 768px) {
  .form-row-2, .form-row-3 { grid-template-columns: 1fr; }
  .contract-sign-form { grid-template-columns: 1fr; }
}
</style>
