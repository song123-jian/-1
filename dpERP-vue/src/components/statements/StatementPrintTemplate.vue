<template>
  <div class="print-template" ref="printRef">
    <div class="print-header">
      <h2 class="print-title">对账单</h2>
      <div class="print-company">{{ companyInfo.name || '苏州冠久' }}</div>
    </div>

    <div class="print-section">
      <div class="print-section-title">账单信息</div>
      <table class="print-info-table">
        <tr>
          <td><strong>编号：</strong>{{ statement.statementNo }}</td>
          <td><strong>期间：</strong>{{ formatPeriod(statement.period) }}</td>
        </tr>
        <tr>
          <td><strong>对账日期：</strong>{{ statement.reconDate || '-' }}</td>
          <td><strong>类型：</strong>{{ statement.type || '月度对账单' }}</td>
        </tr>
        <tr>
          <td><strong>采购方：</strong>{{ statement.buyerName || '-' }}</td>
          <td><strong>供应商：</strong>{{ statement.sellerName || '-' }}</td>
        </tr>
      </table>
    </div>

    <div class="print-section">
      <div class="print-section-title">交易双方</div>
      <div class="print-parties">
        <div class="print-party">
          <div><strong>采购方公司：</strong>{{ statement.buyerName || '-' }}</div>
          <div><strong>地址：</strong>{{ statement.buyerAddress || '-' }}</div>
          <div><strong>联系人：</strong>{{ statement.buyerContact || '-' }}</div>
          <div><strong>电话：</strong>{{ statement.buyerPhone || '-' }}</div>
        </div>
        <div class="print-party">
          <div><strong>供应商公司：</strong>{{ statement.sellerName || '-' }}</div>
          <div><strong>地址：</strong>{{ statement.sellerAddress || '-' }}</div>
          <div><strong>联系人：</strong>{{ statement.sellerContact || '-' }}</div>
          <div><strong>电话：</strong>{{ statement.sellerPhone || '-' }}</div>
        </div>
      </div>
    </div>

    <div class="print-section">
      <div class="print-section-title">交易明细</div>
      <table class="print-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>日期</th>
            <th>名称</th>
            <th>料号</th>
            <th>规格</th>
            <th>单位</th>
            <th>数量</th>
            <th>单价</th>
            <th>金额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(it, idx) in (statement.items || [])" :key="idx">
            <td>{{ idx + 1 }}</td>
            <td>{{ it.date || '' }}</td>
            <td>{{ it.name || '' }}</td>
            <td>{{ it.code || '' }}</td>
            <td>{{ it.spec || '' }}</td>
            <td>{{ it.unit || '' }}</td>
            <td class="text-right">{{ (it.qty || 0).toFixed(2) }}</td>
            <td class="text-right">{{ (it.price || 0).toFixed(2) }}</td>
            <td class="text-right" style="font-weight:600">{{ (it.amount || 0).toFixed(2) }}</td>
          </tr>
          <tr v-if="!statement.items || statement.items.length === 0">
            <td colspan="9" style="text-align:center;color:#999">暂无明细</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="print-section">
      <div class="print-section-title">金额合计</div>
      <div class="print-amounts">
        <div><strong>小计：</strong>¥{{ formatMoney(statement.subtotal) }}</div>
        <div><strong>税率：</strong>{{ statement.taxRate || 0 }}%</div>
        <div><strong>税额：</strong>¥{{ formatMoney(statement.taxAmount) }}</div>
        <div><strong style="color:red">合计：¥{{ formatMoney(statement.totalAmount) }}</strong></div>
      </div>
      <div style="margin-top:8px"><strong>大写：</strong><span style="color:red">{{ statement.totalChinese || '' }}</span></div>
    </div>

    <div class="print-section">
      <div class="print-section-title">付款条款</div>
      <div class="print-amounts">
        <div><strong>付款方式：</strong>{{ statement.paymentMethod || '-' }}</div>
        <div><strong>付款期限：</strong>{{ statement.paymentTerm || '-' }}</div>
        <div><strong>开户银行：</strong>{{ statement.bankName || '-' }}</div>
        <div><strong>银行账号：</strong>{{ statement.bankAccount || '-' }}</div>
      </div>
    </div>

    <div class="print-section">
      <div class="print-section-title">确认签字</div>
      <div class="print-parties">
        <div class="print-party">
          <div><strong>采购方签字：</strong>__________</div>
          <div><strong>日期：</strong>____年__月__日</div>
        </div>
        <div class="print-party">
          <div><strong>供应商签字：</strong>__________</div>
          <div><strong>日期：</strong>____年__月__日</div>
        </div>
      </div>
    </div>

    <div class="print-footer">
      {{ companyInfo.name || '苏州冠久' }}标准化对账单 · 打印时间：{{ printTime }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  statement: { type: Object, default: () => ({}) },
  companyInfo: { type: Object, default: () => ({}) }
})

const printRef = ref(null)

const printTime = computed(() => new Date().toLocaleString())

function formatMoney(num) {
  if (num === undefined || num === null) return '0.00'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriod(period) {
  if (!period) return '-'
  const parts = period.split('-')
  if (parts.length === 2) return parts[0] + ' 年 ' + parts[1] + ' 月'
  return period
}

defineExpose({
  printRef,
  getHtml: () => {
    return printRef.value ? printRef.value.outerHTML : ''
  }
})
</script>

<style scoped>
.print-template {
  font-family: "Microsoft YaHei", sans-serif;
  color: #333;
  font-size: 12px;
  padding: 20px;
}
.print-header {
  text-align: center;
  margin-bottom: 20px;
}
.print-title {
  font-size: 20px;
  margin: 0 0 4px 0;
}
.print-company {
  font-size: 14px;
  color: #666;
}
.print-section {
  margin-bottom: 16px;
}
.print-section-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
}
.print-info-table {
  width: 100%;
  border-collapse: collapse;
}
.print-info-table td {
  padding: 4px 6px;
  border: 1px solid #999;
  font-size: 11px;
}
.print-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.print-party div {
  margin-bottom: 4px;
  font-size: 11px;
}
.print-items-table {
  width: 100%;
  border-collapse: collapse;
}
.print-items-table th,
.print-items-table td {
  border: 1px solid #999;
  padding: 4px 6px;
  text-align: left;
  font-size: 11px;
}
.print-items-table th {
  background: #f0f0f0;
  font-weight: 600;
}
.text-right {
  text-align: right;
}
.print-amounts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.print-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 10px;
  color: #999;
}
@media print {
  .print-template { padding: 0; }
}
</style>
