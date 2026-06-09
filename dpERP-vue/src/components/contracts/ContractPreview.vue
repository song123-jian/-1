<template>
  <div v-if="showPreview" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-lg preview-dialog">
      <div class="modal-header">
        <h3>合同预览 - {{ contract?.contractNo }}</h3>
        <button class="modal-close" @click="$emit('close')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="preview-tabs">
        <button class="preview-tab" :class="{ active: previewTab === 'content' }" @click="$emit('updatePreviewTab', 'content')"><Icon name="file" :size="14" /> 合同内容</button>
        <button class="preview-tab" :class="{ active: previewTab === 'attachment' }" @click="$emit('updatePreviewTab', 'attachment')"><Icon name="file" :size="14" /> 附件</button>
        <button class="preview-tab" :class="{ active: previewTab === 'history' }" @click="$emit('updatePreviewTab', 'history')"><Icon name="file" :size="14" /> 变更记录</button>
        <button class="preview-tab" :class="{ active: previewTab === 'related' }" @click="$emit('updatePreviewTab', 'related')"><Icon name="link" :size="14" /> 关联单据</button>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="exportPDF"><Icon name="print" :size="14" /> 打印/导出</button>
      </div>
      <div class="preview-body">
        <div v-if="previewTab === 'content'" class="contract-preview-content">
          <div class="contract-doc-title">{{ (contract?.contractType || '购销合同').split('').join(' ') }}</div>
          <div class="contract-doc-subtitle">合同编号：{{ contract?.contractNo }}</div>
          <hr style="border:none;border-top:2px solid #1a1a1a;margin:12px 0" />
          <div class="contract-info-grid">
            <div class="contract-info-row"><span class="contract-info-label">{{ contract?.contractType === '采购合同' ? '甲方（买方）：' : '甲方（需方）：' }}</span><span class="contract-info-value">{{ contract?.partyA }}</span></div>
            <div class="contract-info-row"><span class="contract-info-label">{{ contract?.contractType === '采购合同' ? '乙方（卖方）：' : '乙方（供方）：' }}</span><span class="contract-info-value">{{ contract?.partyB || '苏州冠久新材料科技有限公司' }}</span></div>
            <div class="contract-info-row"><span class="contract-info-label">签订地点：</span><span class="contract-info-value">{{ contract?.signPlace }}</span></div>
            <div class="contract-info-row"><span class="contract-info-label">签订日期：</span><span class="contract-info-value">{{ contract?.signDate }}</span></div>
            <div class="contract-info-row"><span class="contract-info-label">有效期至：</span><span class="contract-info-value">{{ contract?.endDate || '未设定' }}</span></div>
            <div class="contract-info-row"><span class="contract-info-label">结算方式：</span><span class="contract-info-value">{{ contract?.settlement || '款到发货' }}</span></div>
          </div>
          <div class="contract-section-title">产品明细</div>
          <table class="contract-table">
            <thead><tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>数量(KG)</th><th>含税单价(元/KG)</th><th>金额(元)</th><th>交货地点</th><th>备注</th></tr></thead>
            <tbody>
              <tr v-for="(p, i) in (contract?.products || [])" :key="i">
                <td>{{ i + 1 }}</td>
                <td style="text-align:left">{{ p.productName }}</td>
                <td style="text-align:left">{{ p.spec }}</td>
                <td>{{ p.quantity ? p.quantity.toFixed(2) : '' }}</td>
                <td style="text-align:right">{{ p.unitPrice ? p.unitPrice.toFixed(2) : '' }}</td>
                <td style="text-align:right">{{ (p.amount || p.quantity * p.unitPrice || 0).toFixed(2) }}</td>
                <td style="text-align:left">{{ p.deliveryPlace }}</td>
                <td style="text-align:left">{{ p.remark }}</td>
              </tr>
            </tbody>
            <tfoot><tr><td colspan="5" style="text-align:right">合计</td><td style="text-align:right">{{ previewTotalAmount.toFixed(2) }}</td><td colspan="2"></td></tr></tfoot>
          </table>
          <div class="contract-amount-summary">
            <div class="contract-amount-row"><span>合同总金额：</span><span>¥{{ formatNumber(previewTotalAmount) }}</span></div>
            <div class="contract-amount-row"><span>中文大写：</span><span>{{ numberToChinese(previewTotalAmount) }}</span></div>
            <div class="contract-amount-row"><span>增值税：</span><span>含13%增值税</span></div>
          </div>
          <div class="contract-section-title">合同条款</div>
          <div class="contract-terms"><ol>
            <li v-for="(item, i) in previewTermsList" :key="i"><strong>{{ item.title }}：</strong>{{ item.content }}</li>
          </ol></div>
          <div v-if="contract && (contract.status === 'signed' || contract.status === 'archived')" class="contract-exec-progress">
            <div class="contract-section-title">执行进度</div>
            <div style="margin:10px 0;padding:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary)">
              <div style="margin:6px 0;font-size:10.5pt"><strong><Icon name="dollar" :size="14" /> 回款进度：</strong>¥{{ formatNumber(previewReceivedAmount) }} / ¥{{ formatNumber(previewTotalAmount) }} ({{ previewReceivedRatio }}%)</div>
              <div style="background:var(--color-bg-tertiary);height:12px;border-radius:6px;overflow:hidden;margin:4px 0"><div style="background:#22c55e;height:100%;border-radius:6px;transition:width 0.3s" :style="{ width: previewReceivedRatio + '%' }"></div></div>
            </div>
          </div>
          <div class="contract-signature">
            <div class="contract-signature-block">
              <div style="font-weight:bold;margin-bottom:8px">{{ contract?.contractType === '采购合同' ? '甲方（买方）' : '甲方（需方）' }}：{{ contract?.partyA }}</div>
              <div>住所：<span class="contract-signature-line"></span></div>
              <div>签约代表：<span class="contract-signature-line"></span></div>
              <div>联系方式：<span class="contract-signature-line"></span></div>
              <div>日期：<span class="contract-signature-line"></span></div>
              <div v-if="contract?.partyAInfo?.seal" style="text-align:center;margin-top:10px"><img :src="contract.partyAInfo.seal" style="width:100px;height:100px;border-radius:50%;object-fit:cover;opacity:0.7" /></div>
              <div v-else class="contract-seal-area">甲方<br />签章区</div>
            </div>
            <div class="contract-signature-block">
              <div style="font-weight:bold;margin-bottom:8px">{{ contract?.contractType === '采购合同' ? '乙方（卖方）' : '乙方（供方）' }}：苏州冠久新材料科技有限公司</div>
              <div>住所：苏州高新区滨河路3337号</div>
              <div>签约代表：宋建</div>
              <div>联系方式：15589233039</div>
              <div>日期：{{ contract?.partyBInfo?.date || '-' }}</div>
              <div class="contract-seal-area has-seal">苏州冠久<br />新材料科技<br />有限公司</div>
            </div>
          </div>
        </div>

        <div v-if="previewTab === 'attachment'" class="preview-attachments">
          <div class="attachment-upload">
            <input ref="attInput" type="file" style="display:none" @change="handleAttUpload" />
            <button class="btn btn-primary btn-sm" @click="attInput?.click()"><Icon name="file" :size="14" /> 上传附件</button>
          </div>
          <div v-if="attachments.length === 0" class="empty-hint">暂无附件</div>
          <div v-for="att in attachments" :key="att.id" class="attachment-item">
            <span class="attachment-icon"><Icon name="file" :size="14" /></span>
            <span class="attachment-name">{{ att.name }}</span>
            <span class="attachment-size">{{ (att.size / 1024).toFixed(1) }}KB</span>
            <span class="attachment-date">{{ att.uploadedAt?.split('T')[0] }}</span>
            <button class="action-btn danger" @click="removeAttachment(att.id)"><Icon name="close" :size="14" /></button>
          </div>
        </div>

        <div v-if="previewTab === 'history'" class="preview-history">
          <div v-if="history.length === 0" class="empty-hint">暂无变更记录</div>
          <div class="history-timeline">
            <div v-for="ev in history" :key="ev.time + ev.type" class="history-event">
              <div class="history-dot" :style="{ background: historyTypeColors[ev.type] || 'var(--color-text-secondary)' }"></div>
              <div class="history-content">
                <div class="history-label">{{ ev.label }}</div>
                <div class="history-meta">{{ formatDateTime(ev.time) }} · {{ ev.user }}</div>
              </div>
            </div>
          </div>
        </div>

        <ContractRelatedDocs
          v-if="previewTab === 'related'"
          :relatedDocuments="relatedDocuments"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { numberToChinese } from '@/utils/numberToChinese.js'
import { useContractStore } from '@/stores/contract'
import { useQuotationStore } from '@/stores/quotation'
import { useCollectionStore } from '@/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import ContractRelatedDocs from './ContractRelatedDocs.vue'

const contractStore = useContractStore()
const quotationStore = useQuotationStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()

const props = defineProps({
  showPreview: { type: Boolean, default: false },
  contract: { type: Object, default: null },
  previewTab: { type: String, default: 'content' }
})

defineEmits([
  'close',
  'updatePreviewTab'
])

const attInput = ref(null)
const attachments = ref([])
const history = ref([])

watch(() => props.contract, (c) => {
  if (c) {
    attachments.value = contractStore.getAttachments(c.id)
    history.value = contractStore.getHistory(c.id)
  } else {
    attachments.value = []
    history.value = []
  }
}, { immediate: true })

const historyTypeColors = {
  create: 'var(--color-info)', submit: 'var(--color-warning)', approve: 'var(--color-success)',
  reject: 'var(--color-danger)', sign: 'var(--color-success)', edit: 'var(--color-text-secondary)',
  pending_approval: 'var(--color-warning)', signed: 'var(--color-success)',
  archived: 'var(--color-info)', cancelled: 'var(--color-danger)', draft: '#64748b'
}

const previewTotalAmount = computed(() => {
  if (!props.contract) return 0
  return props.contract.products?.reduce((s, p) => s + (p.amount || (p.quantity || 0) * (p.unitPrice || 0)), 0) || props.contract.totalAmount || 0
})

const previewTermsList = computed(() => {
  if (!props.contract?.terms) return []
  const t = props.contract.terms
  const settlement = props.contract.settlement || '款到发货'
  return [
    { title: '质量标准', content: t.quality || '' },
    { title: '运输方式、费用及风险承担', content: t.transport || '' },
    { title: '验收标准与异议期限', content: t.inspection || '' },
    { title: '结算方式及期限', content: (t.settlement || '').replace('${结算方式}', settlement) },
    { title: '包装标准与损耗', content: t.packaging || '' },
    { title: '违约责任', content: t.breach || '' },
    { title: '争议解决', content: t.dispute || '' },
    { title: '合同效力', content: t.validity || '' },
    { title: '知识产权与所有权', content: t.ipOwnership || '' },
    { title: '其他', content: t.other || '' }
  ]
})

const previewReceivedAmount = computed(() => {
  if (!props.contract) return 0
  try {
    const raw = localStorage.getItem('gj_erp_collections')
    const collections = raw ? JSON.parse(raw) : []
    const c = props.contract
    return collections
      .filter(col => col.customerName === c.partyA || col.contractNo === c.contractNo)
      .reduce((s, col) => s + (col.amount || 0), 0)
  } catch { return 0 }
})

const previewReceivedRatio = computed(() => {
  const total = previewTotalAmount.value
  if (total <= 0) return 0
  return Math.min(previewReceivedAmount.value / total * 100, 100).toFixed(1)
})

const quotationStatusMap = {
  draft: '草稿', pending: '待审核', sent: '已发送', approved: '已审批',
  accepted: '已接受', rejected: '已拒绝', cancelled: '已取消'
}
const deliveryStatusMap = {
  created: '已创建', pending: '待发货', shipped: '已发货', transit: '运输中',
  received: '已签收', accepted: '已验收', partial: '部分签收',
  exception: '异常处理中', returned: '退回', cancelled: '已取消'
}
const collectionStatusMap = {
  pending: '待确认', confirmed: '已确认', partial: '部分回款',
  completed: '已完成', overdue: '已逾期', cancelled: '已取消'
}

const relatedDocuments = computed(() => {
  if (!props.contract) return { quotations: [], deliveries: [], collections: [] }
  const c = props.contract
  const customerName = c.partyA
  const contractNo = c.contractNo
  const sourceQuoteId = c.sourceQuoteId
  const quotations = quotationStore.quotations.filter(q =>
    q.id === sourceQuoteId ||
    q.customerName === customerName ||
    (q.quoteNo && c.notes && c.notes.includes(q.quoteNo))
  ).map(q => ({
    id: q.id, docNo: q.quoteNo, type: '报价单', typeIcon: 'list',
    customerName: q.customerName, date: q.date || q.createdAt,
    amount: q.total || q.totalAmount || 0,
    status: q.status, statusLabel: quotationStatusMap[q.status] || q.status
  }))
  const deliveries = deliveryStore.deliveries.filter(d =>
    d.customerName === customerName ||
    (d.contractNo && d.contractNo === contractNo)
  ).map(d => ({
    id: d.id, docNo: d.deliveryNo, type: '交付单', typeIcon: 'truck',
    customerName: d.customerName, date: d.date || d.createdAt,
    amount: d.totalAmount || 0,
    status: d.status, statusLabel: deliveryStatusMap[d.status] || d.status
  }))
  const collections = collectionStore.collections.filter(col =>
    col.customerName === customerName ||
    (col.contractNo && col.contractNo === contractNo)
  ).map(col => ({
    id: col.id, docNo: col.collectionNo, type: '回款单', typeIcon: 'dollar',
    customerName: col.customerName, date: col.date,
    amount: col.amount || 0,
    status: col.status, statusLabel: collectionStatusMap[col.status] || col.status
  }))
  return { quotations, deliveries, collections }
})

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

function handleAttUpload(e) {
  const file = e.target.files[0]
  if (!file || !props.contract) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    contractStore.addAttachment(props.contract.id, {
      name: file.name,
      size: file.size,
      type: file.type,
      data: ev.target.result
    })
    attachments.value = contractStore.getAttachments(props.contract.id)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removeAttachment(attId) {
  if (!props.contract) return
  contractStore.deleteAttachment(props.contract.id, attId)
  attachments.value = contractStore.getAttachments(props.contract.id)
}

function exportPDF() {
  const printWin = window.open('', '_blank')
  if (!printWin) { alert('请允许弹出窗口以打印合同'); return }
  const content = document.querySelector('.contract-preview-content')
  if (!content) return
  printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>购销合同</title>')
  printWin.document.write('<style>body{font-family:"SimSun","Microsoft YaHei","Songti SC",serif;font-size:12pt;line-height:1.8;color:#000;margin:0;padding:20mm;}')
  printWin.document.write('table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt;}th{background:#f0f0f0;border:1px solid #333;padding:8px 6px;text-align:center;font-weight:bold;}td{border:1px solid #333;padding:6px;text-align:center;}')
  printWin.document.write('ol{padding-left:20px;margin:6px 0;}li{margin-bottom:6px;line-height:1.7;}')
  printWin.document.write('.contract-doc-title{text-align:center;font-size:20pt;font-weight:bold;letter-spacing:6px;margin-bottom:4px;}')
  printWin.document.write('.contract-doc-subtitle{text-align:center;font-size:11pt;color:#555;margin-bottom:16px;}')
  printWin.document.write('.contract-section-title{font-size:12pt;font-weight:bold;margin:18px 0 10px 0;border-bottom:1px solid #333;padding-bottom:4px;}')
  printWin.document.write('.contract-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 40px;margin:12px 0;font-size:10.5pt;}')
  printWin.document.write('.contract-info-row{display:flex;gap:4px;}.contract-info-label{color:#555;white-space:nowrap;min-width:80px;}.contract-info-value{color:#1a1a1a;}')
  printWin.document.write('.contract-amount-summary{margin:16px 0;padding:12px;background:#f9f9f9;border:1px solid #ddd;border-radius:4px;}')
  printWin.document.write('.contract-amount-row{display:flex;justify-content:space-between;margin:4px 0;font-size:10.5pt;}')
  printWin.document.write('.contract-signature{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:10.5pt;}')
  printWin.document.write('.contract-signature-block{line-height:2.2;}.contract-signature-line{display:inline-block;width:140px;border-bottom:1px solid #333;margin-left:4px;}')
  printWin.document.write('.contract-seal-area{width:120px;height:120px;border:2px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:10px auto;color:#999;font-size:9pt;text-align:center;}')
  printWin.document.write('img{max-width:100px;max-height:100px;border-radius:50%;object-fit:cover;opacity:0.7;}')
  printWin.document.write('@media print{body{padding:0;margin:0;}}</style></head><body>')
  printWin.document.write(content.innerHTML)
  printWin.document.write('</body></html>')
  printWin.document.close()
  setTimeout(() => printWin.print(), 500)
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

.preview-dialog { max-width: 1200px; }
.preview-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--color-border); padding: 0 20px; }
.preview-tab { padding: 10px 16px; font-size: 13px; border: none; background: transparent; cursor: pointer; color: var(--color-text-secondary); border-bottom: 2px solid transparent; transition: all 0.15s; }
.preview-tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }
.preview-tab:hover { color: var(--color-text-primary); }
.preview-body { padding: 20px; min-height: 300px; }

.contract-preview-content { background: #fff; border-radius: 4px; padding: 25mm 20mm 20mm; color: #000; font-family: 'SimSun','Microsoft YaHei','Songti SC',serif; font-size: 12pt; line-height: 1.8; border: 1px solid var(--color-border); }
.contract-doc-title { text-align: center; font-size: 20pt; font-weight: bold; letter-spacing: 6px; margin-bottom: 4px; color: #1a1a1a; }
.contract-doc-subtitle { text-align: center; font-size: 11pt; color: #555; margin-bottom: 16px; }
.contract-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 40px; margin: 12px 0; font-size: 10.5pt; }
.contract-info-row { display: flex; gap: 4px; }
.contract-info-label { color: #555; white-space: nowrap; min-width: 80px; }
.contract-info-value { color: #1a1a1a; }
.contract-section-title { font-size: 12pt; font-weight: bold; margin: 18px 0 10px 0; color: #1a1a1a; border-bottom: 1px solid #333; padding-bottom: 4px; }
.contract-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
.contract-table th { background: #f0f0f0; border: 1px solid #333; padding: 8px 6px; text-align: center; font-weight: bold; color: #1a1a1a; font-size: 9.5pt; }
.contract-table td { border: 1px solid #333; padding: 6px; text-align: center; color: #333; font-size: 9.5pt; }
.contract-table tfoot td { font-weight: bold; background: #f8f8f8; }
.contract-amount-summary { margin: 16px 0; padding: 12px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; }
.contract-amount-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 10.5pt; }
.contract-signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10.5pt; }
.contract-signature-block { line-height: 2.2; }
.contract-signature-line { display: inline-block; width: 140px; border-bottom: 1px solid #333; margin-left: 4px; }
.contract-seal-area { width: 120px; height: 120px; border: 2px dashed var(--color-border-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 10px auto; color: var(--color-text-tertiary); font-size: 9pt; text-align: center; }
.contract-seal-area.has-seal { border-color: #c00; color: #c00; font-weight: bold; font-size: 10pt; }

.attachment-upload { margin-bottom: 12px; }
.attachment-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: 6px; font-size: 13px; }
.attachment-icon { font-size: 16px; }
.attachment-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-size { color: var(--color-text-tertiary); font-size: 12px; }
.attachment-date { color: var(--color-text-tertiary); font-size: 12px; }

.preview-history { padding: 0; }
.history-timeline { position: relative; padding-left: 24px; }
.history-event { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; position: relative; }
.history-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; position: absolute; left: -24px; }
.history-event::before { content: ''; position: absolute; left: -19px; top: 16px; bottom: -20px; width: 2px; background: var(--color-border); }
.history-event:last-child::before { display: none; }
.history-content { flex: 1; }
.history-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.history-meta { font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }

.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
.action-btn { padding: 3px 6px; font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-draft { background: rgba(100,116,139,0.2); color: #94a3b8; }
.status-pending_approval { background: rgba(245,158,11,0.2); color: #fbbf24; }
.status-approved { background: rgba(59,130,246,0.2); color: #60a5fa; }
.status-signed { background: rgba(34,197,94,0.2); color: #4ade80; }
.status-archived { background: rgba(6,182,212,0.2); color: #22d3ee; }
.status-cancelled { background: rgba(239,68,68,0.2); color: #f87171; }

.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: 12px; }

.empty-hint { text-align: center; color: var(--color-text-tertiary); padding: 20px; }

@media (max-width: 768px) {
  .contract-info-grid { grid-template-columns: 1fr; }
  .contract-signature { grid-template-columns: 1fr; }
}
</style>
