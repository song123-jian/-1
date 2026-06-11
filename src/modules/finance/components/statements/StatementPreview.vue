<template>
  <div v-if="showModal" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content" style="max-width:800px">
      <div class="modal-header">
        <h3>对账单详情 - {{ detailData.statementNo }}</h3>
        <button class="btn btn-sm btn-outline" @click="handleClose">关闭</button>
      </div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto">
        <div class="detail-section">
          <div class="detail-section-header">
            <span>账单抬头信息</span>
            <span class="status-badge" :class="statementStore.statusBadgeMap[detailData.status]">
              {{ statementStore.statusLabels[detailData.status] }}
            </span>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">账单编号</span><span class="detail-value cell-mono">{{ detailData.statementNo }}</span></div>
            <div class="detail-item"><span class="detail-label">账单类型</span><span class="detail-value">{{ detailData.type || '月度对账单' }}</span></div>
            <div class="detail-item"><span class="detail-label">账单期间</span><span class="detail-value">{{ formatPeriod(detailData.period) }}</span></div>
            <div class="detail-item"><span class="detail-label">对账日期</span><span class="detail-value">{{ detailData.reconDate || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">制单人</span><span class="detail-value">{{ detailData.preparer || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">审核人</span><span class="detail-value">{{ detailData.reviewer || '-' }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-header"><span>交易双方</span></div>
          <div class="detail-parties">
            <div class="detail-party">
              <h5 style="color:var(--color-accent);margin:0 0 var(--space-2) 0">采购方</h5>
              <div><strong>公司：</strong>{{ detailData.buyerName || '-' }}</div>
              <div><strong>地址：</strong>{{ detailData.buyerAddress || '-' }}</div>
              <div><strong>联系人：</strong>{{ detailData.buyerContact || '-' }}</div>
              <div><strong>电话：</strong>{{ detailData.buyerPhone || '-' }}</div>
              <div><strong>邮箱：</strong>{{ detailData.buyerEmail || '-' }}</div>
            </div>
            <div class="detail-party">
              <h5 style="color:var(--color-accent);margin:0 0 var(--space-2) 0">供应商</h5>
              <div><strong>公司：</strong>{{ detailData.sellerName || '-' }}</div>
              <div><strong>地址：</strong>{{ detailData.sellerAddress || '-' }}</div>
              <div><strong>联系人：</strong>{{ detailData.sellerContact || '-' }}</div>
              <div><strong>电话：</strong>{{ detailData.sellerPhone || '-' }}</div>
              <div><strong>邮箱：</strong>{{ detailData.sellerEmail || '-' }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-header"><span>交易明细</span></div>
          <div class="table-container">
            <table class="data-table" style="font-size:var(--font-size-sm)">
              <thead>
                <tr>
                  <th>#</th><th>日期</th><th>名称</th><th>料号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!detailData.items || detailData.items.length === 0">
                  <td colspan="10" style="text-align:center;color:var(--color-text-tertiary)">暂无明细</td>
                </tr>
                <tr v-for="(it, idx) in (detailData.items || [])" :key="idx">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ it.date || '-' }}</td>
                  <td>{{ it.name }}</td>
                  <td class="cell-mono">{{ it.code }}</td>
                  <td>{{ it.spec || '-' }}</td>
                  <td>{{ it.unit || '-' }}</td>
                  <td class="cell-mono">{{ (it.qty || 0).toFixed(2) }}</td>
                  <td class="cell-mono">{{ (it.price || 0).toFixed(2) }}</td>
                  <td class="cell-mono" style="font-weight:600">¥{{ formatMoney(it.amount) }}</td>
                  <td>{{ it.remark || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-header"><span>金额合计</span></div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">小计</span><span class="detail-value">¥{{ formatMoney(detailData.subtotal) }}</span></div>
            <div class="detail-item"><span class="detail-label">税率</span><span class="detail-value">{{ detailData.taxRate || 0 }}%</span></div>
            <div class="detail-item"><span class="detail-label">税额</span><span class="detail-value">¥{{ formatMoney(detailData.taxAmount) }}</span></div>
            <div class="detail-item"><span class="detail-label">合计</span><span class="detail-value" style="color:var(--color-danger);font-weight:700;font-size:var(--font-size-lg)">¥{{ formatMoney(detailData.totalAmount) }}</span></div>
          </div>
          <div style="margin-top:var(--space-2)"><strong>大写：</strong><span style="color:var(--color-danger)">{{ detailData.totalChinese || statementStore.numberToChinese(detailData.totalAmount || 0) }}</span></div>
        </div>

        <div class="detail-section" v-if="discrepancy">
          <div class="detail-section-header"><span>对账差异分析</span></div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">对账单小计</span><span class="detail-value">¥{{ formatMoney(discrepancy.statementSubtotal) }}</span></div>
            <div class="detail-item"><span class="detail-label">交易总额</span><span class="detail-value">¥{{ formatMoney(discrepancy.transactionTotal) }}</span></div>
            <div class="detail-item">
              <span class="detail-label">差异</span>
              <span class="detail-value" :style="{ color: discrepancy.isBalanced ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }">
                ¥{{ formatMoney(discrepancy.difference) }} {{ discrepancy.isBalanced ? '对账平衡' : '存在差异' }}
              </span>
            </div>
            <div class="detail-item"><span class="detail-label">匹配</span><span class="detail-value">交易 {{ discrepancy.matchedCount }} 条 · 明细 {{ discrepancy.itemCount }} 条</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-header"><span>付款条款</span></div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">付款方式</span><span class="detail-value">{{ detailData.paymentMethod || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">付款期限</span><span class="detail-value">{{ detailData.paymentTerm || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">开户银行</span><span class="detail-value">{{ detailData.bankName || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">银行账号</span><span class="detail-value">{{ detailData.bankAccount || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">账户名称</span><span class="detail-value">{{ detailData.bankHolder || '-' }}</span></div>
            <div class="detail-item" v-if="detailData.status === 'confirmed'">
              <span class="detail-label">已付/应付</span>
              <span class="detail-value">¥{{ formatMoney(detailData.paidAmount) }} / ¥{{ formatMoney(detailData.totalAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-header"><span>确认签字</span></div>
          <div class="detail-parties">
            <div class="detail-party">
              <h5 style="margin:0 0 var(--space-2) 0">采购方确认</h5>
              <div><strong>签字：</strong>{{ detailData.buyerSign || '__________' }}</div>
              <div><strong>日期：</strong>{{ detailData.buyerSignDate || '____年__月__日' }}</div>
            </div>
            <div class="detail-party">
              <h5 style="margin:0 0 var(--space-2) 0">供应商确认</h5>
              <div><strong>签字：</strong>{{ detailData.sellerSign || '__________' }}</div>
              <div><strong>日期：</strong>{{ detailData.sellerSignDate || '____年__月__日' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="handleClose">关闭</button>
        <button class="btn btn-outline" @click="handlePrint">打印</button>
        <button
          v-if="detailData.status === 'pending' || detailData.status === 'draft'"
          class="btn btn-outline"
          @click="handleEdit"
        >编辑</button>
        <button
          v-if="detailData.status === 'pending'"
          class="btn btn-primary"
          @click="handleConfirm"
        >确认</button>
        <button
          v-if="detailData.status === 'confirmed'"
          class="btn btn-primary"
          @click="handleMarkPaid"
        >记录付款</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  showModal: { type: Boolean, default: false },
  statementId: { type: String, default: null }
})

const emit = defineEmits(['close', 'edit', 'confirm', 'markPaid', 'print', 'reopen'])

const statementStore = useStatementStore()
const dataStore = useDataStore()

const detailData = ref({})
const discrepancy = ref(null)

// 监听 statementId 变化加载详情数据
watch(() => props.statementId, (id) => {
  if (id) {
    const stmt = statementStore.getById(id)
    if (stmt) {
      detailData.value = { ...stmt }
      discrepancy.value = statementStore.analyzeDiscrepancies(id, dataStore.transactions)
    }
  }
}, { immediate: true })

// 保留本地版本：minimumFractionDigits 为 0（整数不显示小数位），与全局 formatMoney 固定2位小数不同
function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatPeriod(period) {
  if (!period) return '-'
  const parts = period.split('-')
  if (parts.length === 2) return parts[0] + ' 年 ' + parts[1] + ' 月'
  return period
}

function handleClose() {
  emit('close')
}

function handleEdit() {
  emit('edit', { ...detailData.value })
}

function handleConfirm() {
  emit('confirm', detailData.value.id)
}

function handleMarkPaid() {
  emit('markPaid', { ...detailData.value })
}

function handlePrint() {
  emit('print', detailData.value.id)
}
</script>

<style scoped>
.detail-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.detail-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--space-3);
  color: var(--color-accent);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.detail-party {
  font-size: var(--font-size-sm);
}
.detail-party div {
  margin-bottom: var(--space-1);
}
@media (max-width: 1024px) {
  .detail-grid { grid-template-columns: 1fr; }
  .detail-parties { grid-template-columns: 1fr; }
}
</style>
