<template>
  <Teleport to="body">
    <div v-if="showModal" class="quote-letter-overlay" @click.self="handleClose">
      <div class="quote-letter-container">
        <div class="quote-letter-toolbar">
          <span class="quote-letter-toolbar-title"><Icon name="file" :size="14" /> 正式报价函预览</span>
          <div class="quote-letter-toolbar-actions">
            <button class="btn btn-secondary btn-sm" @click="exportQuoteLetterPDF"><Icon name="download" :size="14" /> 导出PDF</button>
            <button class="btn btn-secondary btn-sm" @click="exportQuoteLetterWord"><Icon name="download" :size="14" /> 导出Word</button>
            <button class="btn btn-secondary btn-sm" @click="printQuoteLetter"><Icon name="print" :size="14" /> 打印</button>
            <button class="btn btn-ghost btn-sm" @click="handleClose"><Icon name="close" :size="14" /> 关闭</button>
          </div>
        </div>
        <div class="quote-letter-content" v-if="quotation">
          <div class="ql-company-name">{{ quotation.senderCompany || '苏州冠久新材料科技有限公司' }}</div>
          <div class="ql-doc-title">正 式 报 价 函</div>
          <div class="ql-doc-no">编号：{{ quotation.quoteNo }}</div>
          <hr class="ql-divider" />
          <div class="ql-info-grid">
            <div class="ql-info-row"><span class="ql-info-label">致：</span><span class="ql-info-value">{{ quotation.customerFullName || quotation.customerName }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">发件方：</span><span class="ql-info-value">{{ quotation.senderCompany || '苏州冠久新材料科技有限公司' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">联系人：</span><span class="ql-info-value">{{ quotation.custContact || '-' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">联系人：</span><span class="ql-info-value">{{ quotation.senderContact || '[我司业务对接人]' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">联系电话：</span><span class="ql-info-value">{{ quotation.custPhone || '-' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">联系电话：</span><span class="ql-info-value">{{ quotation.senderPhone || '-' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">电子邮箱：</span><span class="ql-info-value">{{ quotation.custEmail || '-' }}</span></div>
            <div class="ql-info-row"><span class="ql-info-label">电子邮箱：</span><span class="ql-info-value">{{ quotation.senderEmail || '-' }}</span></div>
          </div>
          <hr class="ql-divider-thin" />
          <p class="ql-indent">尊敬的{{ quotation.custContact || quotation.customerName }}：</p>
          <p class="ql-indent">首先，衷心感谢贵司及您对我司的信任与长期支持！针对贵司近期提出的材料采购需求，我司经过认真核算，现提供以下正式报价方案：</p>
          <div class="ql-section-title">一、产品报价明细</div>
          <table class="ql-table">
            <thead>
              <tr>
                <th style="width:40px">序号</th>
                <th>产品牌号/规格型号</th>
                <th>执行材料标准</th>
                <th>含税单价（元/KG）</th>
                <th>备注说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in letterItems" :key="idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ it.grade || '' }}</td>
                <td>{{ it.standard || '' }}</td>
                <td>{{ it.price ? parseFloat(it.price).toFixed(2) : '' }}</td>
                <td>{{ it.remark || '' }}</td>
              </tr>
              <tr style="font-weight:bold;background:#f8f8f8">
                <td colspan="3" style="text-align:right">小计</td>
                <td style="text-align:right;overflow-wrap:break-word;word-wrap:break-word">{{ (quotation.subtotal || 0).toFixed(2) }}</td>
                <td></td>
              </tr>
              <tr style="font-weight:bold;background:#f8f8f8">
                <td colspan="3" style="text-align:right">税额({{ quotation.taxRate || 13 }}%)</td>
                <td style="text-align:right;overflow-wrap:break-word;word-wrap:break-word">{{ ((quotation.subtotal || 0) * (quotation.taxRate || 13) / 100).toFixed(2) }}</td>
                <td></td>
              </tr>
              <tr style="font-weight:bold;background:#f0f0f0">
                <td colspan="3" style="text-align:right">含税合计</td>
                <td style="text-align:right;color:#c00;overflow-wrap:break-word;word-wrap:break-word">{{ (quotation.total || 0).toFixed(2) }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="ql-section-title">二、报价条款说明</div>
          <div class="ql-terms">
            <ol>
              <li><strong>价格构成：</strong>{{ quotation.termPrice || '本报价所有金额均为人民币含税价格（含' + (quotation.taxRate || 13) + '%增值税），已包含标准包装费及国内运输费用。' }}</li>
              <li><strong>报价有效期：</strong>自{{ formatDateCN(quotation.date) }}起至{{ formatDateCN(quotation.expiryDate) }}止，共计{{ expiryDays }}天。</li>
              <li><strong>付款方式：</strong>{{ quotation.termPayment || '默认采用"款到发货"结算方式，具体付款条件可根据订单金额另行友好协商确定。' }}</li>
              <li><strong>交货周期：</strong>{{ quotation.termDelivery || '在收到贵司全额货款后5个工作日内完成生产并发货。' }}</li>
              <li><strong>交货地点：</strong>{{ quotation.termDeliveryAddr || '[请填写具体收货地址]' }}</li>
              <li><strong>质量标准：</strong>{{ quotation.termQuality || '产品质量严格符合国家相关行业标准及双方确认的技术要求，随货提供质检报告。' }}</li>
              <li><strong>价格调整机制：</strong>{{ quotation.termPriceAdj || '本报价基于当前市场原材料价格制定，若遇主要原材料价格波动超过±5%，我司有权对未确认订单价格进行相应调整，正式下单前请以双方最新书面确认为准。' }}</li>
              <li><strong>法律效力：</strong>{{ quotation.termLegal || '本报价函经双方授权代表签字并加盖公司公章后即构成具有法律约束力的合同要约，与正式采购合同具有同等法律效力。' }}</li>
            </ol>
          </div>
          <div class="ql-closing">
            <p class="ql-indent">感谢贵公司长期以来的信任与支持，我司将一如既往地为贵司提供稳定可靠的产品品质与专业高效的技术服务！期待与贵司的愉快合作！</p>
            <p style="text-align:right;margin:16px 0;">顺颂商祺！</p>
          </div>
          <hr class="ql-divider" />
          <div class="ql-signature">
            <div class="ql-signature-block">
              <div><strong>{{ quotation.senderCompany || '苏州冠久新材料科技有限公司' }}</strong></div>
              <div style="margin-top:8px">（公司公章盖章处）</div>
              <div class="ql-stamp"><div class="ql-stamp-box">盖章区</div></div>
            </div>
            <div class="ql-signature-block">
              <div>授权代表签字：<span class="ql-signature-line"></span></div>
              <div>联系人：<span class="ql-signature-line"></span></div>
              <div>联系电话：<span class="ql-signature-line"></span></div>
              <div>日期：{{ formatDateCN(quotation.date) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  quotation: { type: Object, default: null }
})

const emit = defineEmits(['close', 'edit', 'print', 'createContract'])

const letterItems = computed(() => {
  if (!props.quotation) return []
  try {
    return JSON.parse(props.quotation.items || '[]')
  } catch { return [] }
})

const expiryDays = computed(() => {
  if (!props.quotation) return 30
  const d1 = new Date(props.quotation.date)
  const d2 = new Date(props.quotation.expiryDate)
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 30
})

function formatDateCN(dateStr) {
  if (!dateStr) return '-'
  return dateStr.replace(/-/g, '年').replace(/年(\d+)$/, '月$1日')
}

function handleClose() {
  emit('close')
}

function exportQuoteLetterPDF() {
  window.print()
}

function exportQuoteLetterWord() {
  const content = document.querySelector('.quote-letter-content')
  if (!content) return
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>报价函</title></head><body>' + content.innerHTML + '</body></html>'
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (props.quotation?.quoteNo || '报价函') + '.doc'
  a.click()
  URL.revokeObjectURL(url)
}

function printQuoteLetter() {
  window.print()
}
</script>

<style scoped>
.btn { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs); }
.quote-letter-overlay { position: fixed; inset: 0; z-index: 250; background: rgba(0,0,0,0.75); display: flex; align-items: flex-start; justify-content: center; padding: var(--space-5); overflow-y: auto; }
.quote-letter-container { background: #fff; border-radius: 4px; width: 210mm; min-height: 297mm; box-shadow: 0 8px 32px rgba(0,0,0,0.4); position: relative; color: #000; font-family: 'SimSun','Microsoft YaHei','Songti SC',serif; font-size: 12pt; line-height: 1.8; }
.quote-letter-toolbar { position: sticky; top: 0; z-index: 10; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); padding: var(--space-2) var(--space-5); display: flex; align-items: center; justify-content: space-between; border-radius: 4px 4px 0 0; }
.quote-letter-toolbar-title { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text-primary); }
.quote-letter-toolbar-actions { display: flex; gap: var(--space-2); }
.quote-letter-content { padding: 25mm 20mm 20mm 20mm; }
.ql-company-name { text-align: center; font-size: 22pt; font-weight: bold; letter-spacing: 4px; margin-bottom: var(--space-1); color: #1a1a1a; }
.ql-doc-title { text-align: center; font-size: 18pt; font-weight: bold; letter-spacing: 8px; margin-bottom: var(--space-2); color: #1a1a1a; }
.ql-doc-no { text-align: center; font-size: 10pt; color: #555; margin-bottom: var(--space-5); }
.ql-divider { border: none; border-top: 2px solid #1a1a1a; margin: var(--space-3) 0; }
.ql-divider-thin { border: none; border-top: 1px solid #999; margin: var(--space-2) 0; }
.ql-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1) var(--space-10); margin: var(--space-3) 0; font-size: 10.5pt; }
.ql-info-label { color: #555; white-space: nowrap; }
.ql-info-value { color: #1a1a1a; }
.ql-info-row { display: flex; gap: var(--space-1); }
.ql-indent { text-indent: 2em; margin: var(--space-2) 0; font-size: 10.5pt; color: #333; line-height: 2; }
.ql-section-title { font-size: 12pt; font-weight: bold; margin: var(--space-4) 0 var(--space-2) 0; color: #1a1a1a; }
.ql-table { width: 100%; border-collapse: collapse; margin: var(--space-2) 0; font-size: 10pt; }
.ql-table th { background: #f0f0f0; border: 1px solid #333; padding: var(--space-2) var(--space-2); text-align: center; font-weight: bold; color: #1a1a1a; }
.ql-table td {border: 1px solid #333; padding: var(--space-2) var(--space-2); text-align: center; color: #333; overflow-wrap: break-word; word-wrap: break-word}
.ql-terms { font-size: 10.5pt; margin: var(--space-3) 0; }
.ql-terms ol { padding-left: var(--space-5); margin: var(--space-2) 0; }
.ql-terms li { margin-bottom: var(--space-2); line-height: 1.7; color: #333; }
.ql-terms li strong { color: #1a1a1a; }
.ql-closing { margin-top: var(--space-6); font-size: 10.5pt; line-height: 2; color: #333; }
.ql-signature { margin-top: var(--space-8); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-10); font-size: 10.5pt; }
.ql-signature-block { line-height: 2.2; }
.ql-signature-line { display: inline-block; width: 140px; border-bottom: 1px solid #333; margin-left: var(--space-1); }
.ql-stamp { margin-top: var(--space-5); text-align: right; padding-right: var(--space-10); }
.ql-stamp-box { display: inline-block; width: 120px; height: 120px; border: 2px dashed #ccc; border-radius: 50%; text-align: center; line-height: 120px; color: #ccc; font-size: 9pt; }
@media print {
  .quote-letter-overlay, .quote-letter-toolbar { display: none !important; }
  .quote-letter-container { box-shadow: none; border-radius: 0; width: 100%; min-height: auto; }
  .quote-letter-content { padding: 0; }
}
</style>
