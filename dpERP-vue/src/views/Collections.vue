<template>
  <div class="collection-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">回款管理</h2>
        <p class="page-header-subtitle">应收账款跟踪，回款记录管理，账龄分析</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in viewOptions"
            :key="v.key"
            class="btn btn-ghost btn-sm"
            :class="{ active: currentView === v.key }"
            @click="currentView = v.key"
            :title="v.icon + ' ' + v.label"
          ><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
        <button v-if="canExport" class="btn btn-ghost btn-sm" @click="exportCSV"><Icon name="upload" :size="14" /> 导出</button>
        <button v-if="canCreate" class="btn btn-primary" @click="openForm()">+ 记录回款</button>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">¥{{ formatMoney(collectionStore.totalCollected) }}</div>
        <div class="stat-card-label">累计回款</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">¥{{ formatMoney(collectionStore.totalPending) }}</div>
        <div class="stat-card-label">待回款</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="font-size:var(--font-size-xl);color:var(--color-success)"> {{ collectionStore.collectionRate }}%</div>
        <div class="stat-card-label">回款率</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(collectionStore.totalOverdue) }}</div>
        <div class="stat-card-label">逾期金额</div>
      </div>
    </div>

    <div class="panel-card" style="margin-bottom:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="table" :size="14" /> 账龄分析</span>
      </div>
      <div class="panel-card-body">
        <div class="stats-row stats-grid-4">
          <div class="stat-card">
            <div class="stat-card-value" style="font-size:var(--font-size-2xl)">¥{{ formatMoney(agingSummary.current) }}</div>
            <div class="stat-card-label">未到期</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value" style="font-size:var(--font-size-2xl);color:var(--color-warning)">¥{{ formatMoney(agingSummary.days30) }}</div>
            <div class="stat-card-label">逾期1-30天</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value" style="font-size:var(--font-size-2xl);color:var(--color-danger)">¥{{ formatMoney(agingSummary.days60) }}</div>
            <div class="stat-card-label">逾期31-60天</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value" style="font-size:var(--font-size-2xl);color:var(--color-danger)">¥{{ formatMoney(agingSummary.daysOver) }}</div>
            <div class="stat-card-label">逾期60天以上</div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <input
        type="text"
        class="form-input"
        v-model="filters.search"
        placeholder="搜索回款编号/客户..."
        style="min-width:160px"
      >
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="pending">待确认</option>
        <option value="confirmed">已确认</option>
        <option value="completed">已完成</option>
        <option value="voided">已作废</option>
      </select>
      <select class="form-select" v-model="filters.method">
        <option value="">全部方式</option>
        <option value="bank_transfer">银行转账</option>
        <option value="cash">现金</option>
        <option value="check">支票</option>
        <option value="wechat">微信</option>
        <option value="alipay">支付宝</option>
      </select>
      <select class="form-select" v-model="filters.overdue">
        <option value="">全部逾期</option>
        <option value="normal">正常</option>
        <option value="1-30">逾期1-30天</option>
        <option value="31-60">逾期31-60天</option>
        <option value="60+">逾期60天+</option>
      </select>
      <input type="date" class="form-input" v-model="filters.dateFrom" title="起始日期" style="width:140px">
      <input type="date" class="form-input" v-model="filters.dateTo" title="截止日期" style="width:140px">
      <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container" v-if="currentView === 'table'">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="columnVisible.collectionNo">回款编号</th>
                <th v-if="columnVisible.customer">客户</th>
                <th v-if="columnVisible.date">日期</th>
                <th v-if="columnVisible.amount">金额</th>
                <th v-if="columnVisible.paymentMethod">付款方式</th>
                <th v-if="columnVisible.progress">回款进度</th>
                <th v-if="columnVisible.status">状态</th>
                <th v-if="columnVisible.overdue">逾期</th>
                <th style="min-width:140px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredCollections.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无回款记录
                </td>
              </tr>
              <tr
                v-for="c in filteredCollections"
                :key="c.id"
                :style="getRowOverdueStyle(c)"
              >
                <td v-if="columnVisible.collectionNo" class="cell-mono" style="cursor:pointer;color:var(--color-accent)" @click="viewDetail(c)">{{ c.collectionNo }}</td>
                <td v-if="columnVisible.customer">{{ c.customerName }}</td>
                <td v-if="columnVisible.date">{{ c.date || '-' }}</td>
                <td v-if="columnVisible.amount" class="cell-mono">
                  ¥{{ formatMoney(c.amount) }}
                  <span v-if="c.installments && c.installments.length" style="font-size:10px;color:var(--color-info)"> ({{ c.installments.length }}期)</span>
                </td>
                <td v-if="columnVisible.paymentMethod">{{ collectionStore.methodLabels[c.method] || c.method || '-' }}</td>
                <td v-if="columnVisible.progress" style="min-width:120px">
                  <div class="progress-wrapper">
                    <div class="progress-bar">
                      <div
                        class="progress-bar-fill"
                        :class="getProgressColorClass(collectionStore.getProgress(c))"
                        :style="{ width: Math.min(100, collectionStore.getProgress(c)) + '%' }"
                      ></div>
                    </div>
                    <span class="progress-text">{{ collectionStore.getProgress(c) }}%</span>
                  </div>
                </td>
                <td v-if="columnVisible.status">
                  <span class="status-badge" :class="collectionStore.statusBadgeMap[c.status] || 'neutral'">
                    {{ collectionStore.statusLabels[c.status] || c.status || '待确认' }}
                  </span>
                </td>
                <td v-if="columnVisible.overdue">
                  <span class="badge" :class="getOverdueBadgeClass(c)">{{ getOverdueBadgeText(c) }}</span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-ghost btn-sm" @click="viewDetail(c)" title="查看详情"><Icon name="eye" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" @click="openForm(c)" title="编辑"><Icon name="edit" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" @click="openInstallmentManager(c)" title="分期管理" style="color:var(--color-info)"><Icon name="calendar" :size="14" /></button>
                  <button
                    v-if="c.status === 'pending'"
                    class="btn btn-ghost btn-sm"
                    style="color:var(--color-success)"
                    @click="handleConfirm(c.id)"
                    title="确认"
                  ><Icon name="checkCircle" :size="14" /></button>
                  <button v-if="canDelete" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDelete(c.id)" title="删除"><Icon name="delete" :size="14" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="currentView === 'list'" class="list-view">
          <div
            v-for="c in filteredCollections"
            :key="c.id"
            class="list-item"
            :class="{ 'list-item-overdue': collectionStore.getOverdueDays(c) > 0 }"
            @click="viewDetail(c)"
          >
            <div class="list-item-header">
              <span class="list-item-title">{{ c.collectionNo }}</span>
              <span class="status-badge" :class="collectionStore.statusBadgeMap[c.status] || 'neutral'">
                {{ collectionStore.statusLabels[c.status] || c.status }}
              </span>
            </div>
            <div class="list-item-meta">
              <span>{{ c.customerName }}</span>
              <span>¥{{ formatMoney(c.amount) }}</span>
              <span>{{ c.date }}</span>
              <span>{{ collectionStore.methodLabels[c.method] || c.method }}</span>
            </div>
          </div>
          <div v-if="filteredCollections.length === 0" class="empty-state">
            <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无回款记录
          </div>
        </div>

        <div v-else-if="currentView === 'card'" class="card-view">
          <div
            v-for="c in filteredCollections"
            :key="c.id"
            class="collection-card"
            :class="{ 'card-overdue': collectionStore.getOverdueDays(c) > 0 }"
            @click="viewDetail(c)"
          >
            <div class="card-header">
              <span class="card-title">{{ c.collectionNo }}</span>
              <span class="status-badge" :class="collectionStore.statusBadgeMap[c.status] || 'neutral'">
                {{ collectionStore.statusLabels[c.status] || c.status }}
              </span>
            </div>
            <div class="card-body">
              <div class="card-field"><span class="card-label">客户</span><span>{{ c.customerName }}</span></div>
              <div class="card-field"><span class="card-label">金额</span><span class="cell-mono">¥{{ formatMoney(c.amount) }}</span></div>
              <div class="card-field"><span class="card-label">方式</span><span>{{ collectionStore.methodLabels[c.method] || c.method }}</span></div>
              <div class="card-field"><span class="card-label">日期</span><span>{{ c.date }}</span></div>
            </div>
            <div class="card-actions">
              <button class="btn btn-ghost btn-sm" @click.stop="openForm(c)"><Icon name="edit" :size="14" /></button>
              <button v-if="c.status === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click.stop="handleConfirm(c.id)"><Icon name="checkCircle" :size="14" /></button>
              <button v-if="canDelete" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click.stop="handleDelete(c.id)"><Icon name="delete" :size="14" /></button>
            </div>
          </div>
          <div v-if="filteredCollections.length === 0" class="empty-state">
            <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无回款记录
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="chart" :size="14" /> 账龄分布图</span>
        <div style="display:flex;gap:var(--space-2)">
          <select class="form-select" v-model="agingChartFilter" style="font-size:12px;height:28px">
            <option value="">全部客户</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
        </div>
      </div>
      <div class="panel-card-body">
        <div style="display:flex;gap:var(--space-4);align-items:flex-end;height:200px;padding:var(--space-2)">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div :style="{ height: agingBarHeight('current') + 'px', background: 'var(--color-success)', borderRadius: '4px 4px 0 0', width: '100%', maxWidth: '60px', transition: 'height 0.3s' }"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary)">未到期</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div :style="{ height: agingBarHeight('days30') + 'px', background: 'var(--color-warning)', borderRadius: '4px 4px 0 0', width: '100%', maxWidth: '60px', transition: 'height 0.3s' }"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary)">1-30天</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div :style="{ height: agingBarHeight('days60') + 'px', background: 'var(--color-danger)', borderRadius: '4px 4px 0 0', width: '100%', maxWidth: '60px', transition: 'height 0.3s' }"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary)">31-60天</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div :style="{ height: agingBarHeight('daysOver') + 'px', background: 'var(--color-danger)', borderRadius: '4px 4px 0 0', width: '100%', maxWidth: '60px', transition: 'height 0.3s' }"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary)">60天+</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="list" :size="14" /> 账龄分析明细</span>
        <button class="btn btn-ghost btn-sm" @click="exportAgingCSV"><Icon name="upload" :size="14" /> 导出CSV</button>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户</th><th>余额</th><th>当期</th><th>1-30天</th><th>31-60天</th><th>61-90天</th><th>90天+</th><th>风险</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="agingDetailList.length === 0"><td colspan="8" class="empty-state">暂无数据</td></tr>
              <tr v-for="row in agingDetailList" :key="row.customer">
                <td>{{ row.customer }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.balance) }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.current) }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.days30) }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.days60) }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.days90) }}</td>
                <td class="cell-mono">¥{{ formatMoney(row.daysOver) }}</td>
                <td><span class="status-badge" :class="row.risk === '高' ? 'danger' : row.risk === '中' ? 'warning' : 'success'">{{ row.risk }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal-content" style="max-width:560px">
        <div class="modal-header">
          <h3>{{ editingCollection ? '编辑回款' : '记录回款' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeForm"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">客户 <span style="color:var(--color-danger)">*</span></label>
            <select class="form-select" v-model="formData.customerId" @change="onCustomerChange">
              <option value="">请选择客户</option>
              <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.name || c.fullName || c.companyName }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">回款金额 <span style="color:var(--color-danger)">*</span></label>
              <input type="number" class="form-input" v-model.number="formData.amount" min="0" step="0.01" placeholder="请输入金额">
            </div>
            <div class="form-group">
              <label class="form-label">付款方式</label>
              <select class="form-select" v-model="formData.method">
                <option value="bank_transfer">银行转账</option>
                <option value="cash">现金</option>
                <option value="check">支票</option>
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">回款日期</label>
              <input type="date" class="form-input" v-model="formData.date">
            </div>
            <div class="form-group">
              <label class="form-label">到期日期</label>
              <input type="date" class="form-input" v-model="formData.dueDate">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">参考号</label>
            <input type="text" class="form-input" v-model="formData.referenceNo" placeholder="银行流水号等">
          </div>
          <div class="form-group">
            <label class="form-label">银行账号</label>
            <input type="text" class="form-input" v-model="formData.bankAccount" placeholder="收款银行账号">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" v-model="formData.notes" rows="2" placeholder="备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeForm">取消</button>
          <button class="btn btn-primary" @click="saveForm">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content" style="max-width:640px">
        <div class="modal-header">
          <h3>回款详情 - {{ detailData.collectionNo }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeDetail"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">客户</span><span class="detail-value">{{ detailData.customerName }}</span></div>
            <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value cell-mono">¥{{ formatMoney(detailData.amount) }}</span></div>
            <div class="detail-item"><span class="detail-label">日期</span><span class="detail-value">{{ detailData.date }}</span></div>
            <div class="detail-item"><span class="detail-label">到期日</span><span class="detail-value">{{ detailData.dueDate || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">付款方式</span><span class="detail-value">{{ collectionStore.methodLabels[detailData.method] || detailData.method }}</span></div>
            <div class="detail-item"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge" :class="collectionStore.statusBadgeMap[detailData.status]">{{ collectionStore.statusLabels[detailData.status] }}</span></span></div>
            <div class="detail-item"><span class="detail-label">参考号</span><span class="detail-value">{{ detailData.referenceNo || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">银行账号</span><span class="detail-value">{{ detailData.bankAccount || '-' }}</span></div>
            <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">备注</span><span class="detail-value">{{ detailData.notes || '-' }}</span></div>
          </div>

          <div v-if="detailData.installments && detailData.installments.length > 0" style="margin-top:var(--space-4)">
            <h4 style="margin-bottom:var(--space-2)">分期明细 ({{ detailData.installments.length }}期)</h4>
            <table class="data-table" style="font-size:var(--font-size-sm)">
              <thead>
                <tr><th>期数</th><th>金额</th><th>日期</th><th>方式</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="inst in detailData.installments" :key="inst.id">
                  <td>第{{ inst.period }}期</td>
                  <td class="cell-mono">¥{{ formatMoney(inst.amount) }}</td>
                  <td>{{ inst.date }}</td>
                  <td>{{ collectionStore.methodLabels[inst.method] || inst.method }}</td>
                  <td>
                    <span class="status-badge" :class="inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'danger' : 'warning'">
                      {{ inst.status === 'paid' ? '已到账' : inst.status === 'overdue' ? '已逾期' : '待支付' }}
                    </span>
                  </td>
                  <td>
                    <button v-if="inst.status === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="markInstallmentPaid(detailData.id, inst.id)">确认到账</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="progress-section" style="margin-top:var(--space-4)">
            <span class="detail-label">回款进度</span>
            <div class="progress-wrapper" style="margin-top:var(--space-2)">
              <div class="progress-bar" style="height:8px">
                <div
                  class="progress-bar-fill"
                  :class="getProgressColorClass(collectionStore.getProgress(detailData))"
                  :style="{ width: Math.min(100, collectionStore.getProgress(detailData)) + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ collectionStore.getProgress(detailData) }}%</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeDetail">关闭</button>
          <button class="btn btn-ghost" @click="openForm(detailData); closeDetail()">编辑</button>
          <button v-if="detailData.status === 'pending'" class="btn btn-primary" @click="handleConfirm(detailData.id); closeDetail()">确认回款</button>
        </div>
      </div>
    </div>

    <div v-if="showInstallmentManager" class="modal-overlay" @click.self="closeInstallmentManager">
      <div class="modal-content" style="max-width:560px">
        <div class="modal-header">
          <h3>分期管理 - {{ installmentTarget.collectionNo }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeInstallmentManager"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:var(--space-4);padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
              <span>回款总额</span>
              <span class="cell-mono">¥{{ formatMoney(installmentTarget.amount) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>已分期金额</span>
              <span class="cell-mono">¥{{ formatMoney(totalInstalledAmount) }}</span>
            </div>
          </div>

          <table class="data-table" style="font-size:var(--font-size-sm);margin-bottom:var(--space-4)">
            <thead>
              <tr><th>期数</th><th>金额</th><th>日期</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="inst in (installmentTarget.installments || [])" :key="inst.id">
                <td>第{{ inst.period }}期</td>
                <td class="cell-mono">¥{{ formatMoney(inst.amount) }}</td>
                <td>{{ inst.date }}</td>
                <td>
                  <span class="status-badge" :class="inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'danger' : 'warning'">
                    {{ inst.status === 'paid' ? '已到账' : inst.status === 'overdue' ? '已逾期' : '待支付' }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button v-if="inst.status === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="markInstallmentPaid(installmentTarget.id, inst.id)"><Icon name="checkCircle" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteInstallment(installmentTarget.id, inst.id)"><Icon name="delete" :size="14" /></button>
                </td>
              </tr>
              <tr v-if="!installmentTarget.installments || installmentTarget.installments.length === 0">
                <td colspan="5" style="text-align:center;color:var(--color-text-tertiary)">暂无分期记录</td>
              </tr>
            </tbody>
          </table>

          <h4 style="margin-bottom:var(--space-2)">添加分期</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">金额</label>
              <input type="number" class="form-input" v-model.number="newInstallment.amount" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">日期</label>
              <input type="date" class="form-input" v-model="newInstallment.date">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input type="text" class="form-input" v-model="newInstallment.notes" placeholder="分期备注">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeInstallmentManager">关闭</button>
          <button class="btn btn-primary" @click="addNewInstallment">添加分期</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useCollectionStore } from '@/stores/collection'
import { useCustomerStore } from '@/stores/customer'
import { useDataStore } from '@/stores/data'
import { usePermission } from '@/utils/permissionGuard'

const collectionStore = useCollectionStore()
const customerStore = useCustomerStore()
const dataStore = useDataStore()
const perm = usePermission()

const canCreate = perm.isAllowed('statement', 'statementCreate')
const canEdit = perm.isAllowed('statement', 'statementUpdate')
const canDelete = perm.isAllowed('statement', 'statementDelete')
const canExport = perm.isAllowed('statement', 'statementExport')

const columnDefs = [
  { key: 'collectionNo', label: '回款编号' },
  { key: 'customer', label: '客户' },
  { key: 'date', label: '日期' },
  { key: 'amount', label: '金额' },
  { key: 'paymentMethod', label: '付款方式' },
  { key: 'progress', label: '回款进度' },
  { key: 'status', label: '状态' },
  { key: 'overdue', label: '逾期' },
  { key: 'actions', label: '操作', hideable: false }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => c.hideable !== false).map(c => [c.key, true])))
const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 8 + 'px', left: rect.left + 'px' }
  }
}

const currentView = ref('table')
const showForm = ref(false)
const showDetail = ref(false)
const showInstallmentManager = ref(false)
const editingCollection = ref(null)
const detailData = ref({})
const installmentTarget = ref({})
const agingChartFilter = ref('')

const viewOptions = [
  { key: 'table', label: '表格视图', icon: 'table' },
  { key: 'list', label: '列表视图', icon: 'list' },
  { key: 'card', label: '卡片视图', icon: 'card' }
]

const filters = reactive({
  search: '',
  status: '',
  method: '',
  overdue: '',
  dateFrom: '',
  dateTo: ''
})

const formData = reactive({
  customerId: '',
  customerName: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  method: 'bank_transfer',
  referenceNo: '',
  bankAccount: '',
  notes: ''
})

const newInstallment = reactive({
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  notes: ''
})

const filteredCollections = computed(() => {
  return collectionStore.collections.filter(c => {
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!(c.collectionNo || '').toLowerCase().includes(s) && !(c.customerName || '').toLowerCase().includes(s)) return false
    }
    if (filters.status && c.status !== filters.status) return false
    if (filters.method && c.method !== filters.method) return false
    if (filters.dateFrom && c.date && c.date < filters.dateFrom) return false
    if (filters.dateTo && c.date && c.date > filters.dateTo) return false
    if (filters.overdue) {
      const od = collectionStore.getOverdueDays(c)
      if (filters.overdue === 'normal' && od > 0) return false
      if (filters.overdue === '1-30' && (od < 1 || od > 30)) return false
      if (filters.overdue === '31-60' && (od < 31 || od > 60)) return false
      if (filters.overdue === '60+' && od <= 60) return false
    }
    return true
  })
})

const agingData = computed(() => {
  return collectionStore.computeAgingData(customerStore.customers, dataStore.transactions)
})

const agingSummary = computed(() => {
  const summary = { current: 0, days30: 0, days60: 0, daysOver: 0 }
  for (const d of agingData.value) {
    summary.current += d.current
    summary.days30 += d.days30
    summary.days60 += d.days60
    summary.daysOver += d.daysOver
  }
  return summary
})

const agingDetailList = computed(() => {
  const map = {}
  for (const c of collectionStore.collections) {
    const customer = c.customerName || '未知'
    if (!map[customer]) map[customer] = { customer, balance: 0, current: 0, days30: 0, days60: 0, days90: 0, daysOver: 0 }
    const amount = c.amount || 0
    const overdue = collectionStore.getOverdueDays(c)
    map[customer].balance += amount
    if (overdue <= 0) map[customer].current += amount
    else if (overdue <= 30) map[customer].days30 += amount
    else if (overdue <= 60) map[customer].days60 += amount
    else if (overdue <= 90) map[customer].days90 += amount
    else map[customer].daysOver += amount
  }
  return Object.values(map).map(r => {
    const overdueRatio = r.balance > 0 ? (r.days30 + r.days60 + r.days90 + r.daysOver) / r.balance : 0
    r.risk = overdueRatio > 0.5 ? '高' : overdueRatio > 0.2 ? '中' : '低'
    return r
  })
})

const totalInstalledAmount = computed(() => {
  if (!installmentTarget.value.installments) return 0
  return installmentTarget.value.installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
})

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getRowOverdueStyle(c) {
  const days = collectionStore.getOverdueDays(c)
  if (days > 60) return { borderLeft: '3px solid var(--color-danger)' }
  if (days > 30) return { borderLeft: '3px solid var(--color-warning)' }
  if (days > 0) return { borderLeft: '3px solid var(--color-info)' }
  return {}
}

function getOverdueBadgeClass(c) {
  const days = collectionStore.getOverdueDays(c)
  if (days > 60) return 'badge-danger'
  if (days > 30) return 'badge-warning'
  if (days > 0) return 'badge-info'
  return 'badge-success'
}

function getOverdueBadgeText(c) {
  const days = collectionStore.getOverdueDays(c)
  if (days > 60) return `逾期${days}天`
  if (days > 30) return `逾期${days}天`
  if (days > 0) return `${days}天`
  return '正常'
}

function getProgressColorClass(percent) {
  if (percent >= 100) return 'success'
  if (percent >= 60) return 'info'
  if (percent >= 30) return 'warning'
  return 'danger'
}

function resetFilters() {
  filters.search = ''
  filters.status = ''
  filters.method = ''
  filters.overdue = ''
  filters.dateFrom = ''
  filters.dateTo = ''
}

function openForm(data) {
  if (data && data.id) {
    editingCollection.value = data
    formData.customerId = data.customerId || ''
    formData.customerName = data.customerName || ''
    formData.amount = data.amount || 0
    formData.date = data.date || new Date().toISOString().split('T')[0]
    formData.dueDate = data.dueDate || ''
    formData.method = data.method || 'bank_transfer'
    formData.referenceNo = data.referenceNo || ''
    formData.bankAccount = data.bankAccount || ''
    formData.notes = data.notes || ''
  } else {
    editingCollection.value = null
    formData.customerId = ''
    formData.customerName = ''
    formData.amount = 0
    formData.date = new Date().toISOString().split('T')[0]
    formData.dueDate = ''
    formData.method = 'bank_transfer'
    formData.referenceNo = ''
    formData.bankAccount = ''
    formData.notes = ''
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingCollection.value = null
}

function onCustomerChange() {
  const c = customerStore.customers.find(c => c.id === formData.customerId)
  if (c) {
    formData.customerName = c.name || c.fullName || c.companyName
  }
}

function saveForm() {
  if (!formData.customerId) {
    alert('请选择客户')
    return
  }
  if (!formData.amount || formData.amount <= 0) {
    alert('回款金额必须大于0')
    return
  }

  if (editingCollection.value) {
    collectionStore.updateCollection(editingCollection.value.id, {
      customerId: formData.customerId,
      customerName: formData.customerName,
      amount: formData.amount,
      date: formData.date,
      dueDate: formData.dueDate,
      method: formData.method,
      referenceNo: formData.referenceNo,
      bankAccount: formData.bankAccount,
      notes: formData.notes
    })
  } else {
    collectionStore.addCollection({
      customerId: formData.customerId,
      customerName: formData.customerName,
      amount: formData.amount,
      date: formData.date,
      dueDate: formData.dueDate,
      method: formData.method,
      referenceNo: formData.referenceNo,
      bankAccount: formData.bankAccount,
      notes: formData.notes
    })
  }
  closeForm()
}

function viewDetail(c) {
  detailData.value = { ...c }
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

function handleConfirm(id) {
  if (confirm('确认此回款记录？')) {
    collectionStore.confirmCollection(id)
  }
}

function handleDelete(id) {
  if (confirm('确认删除此回款记录？删除后不可恢复。')) {
    collectionStore.deleteCollection(id)
  }
}

function openInstallmentManager(c) {
  installmentTarget.value = { ...c }
  newInstallment.amount = 0
  newInstallment.date = new Date().toISOString().split('T')[0]
  newInstallment.notes = ''
  showInstallmentManager.value = true
}

function closeInstallmentManager() {
  showInstallmentManager.value = false
  const fresh = collectionStore.collections.find(c => c.id === installmentTarget.value.id)
  if (fresh) installmentTarget.value = { ...fresh }
}

function addNewInstallment() {
  if (!newInstallment.amount || newInstallment.amount <= 0) {
    alert('分期金额必须大于0')
    return
  }
  collectionStore.addInstallment(installmentTarget.value.id, {
    amount: newInstallment.amount,
    date: newInstallment.date,
    method: installmentTarget.value.method || 'bank_transfer',
    notes: newInstallment.notes
  })
  const fresh = collectionStore.collections.find(c => c.id === installmentTarget.value.id)
  if (fresh) installmentTarget.value = { ...fresh }
  newInstallment.amount = 0
  newInstallment.notes = ''
}

function markInstallmentPaid(colId, instId) {
  collectionStore.updateInstallmentStatus(colId, instId, 'paid')
  const fresh = collectionStore.collections.find(c => c.id === colId)
  if (fresh) {
    if (showDetail.value) detailData.value = { ...fresh }
    if (showInstallmentManager.value && colId === installmentTarget.value.id) installmentTarget.value = { ...fresh }
  }
}

function handleDeleteInstallment(colId, instId) {
  if (confirm('确认删除此分期记录？')) {
    collectionStore.deleteInstallment(colId, instId)
    const fresh = collectionStore.collections.find(c => c.id === colId)
    if (fresh) installmentTarget.value = { ...fresh }
  }
}

function exportCSV() {
  const data = filteredCollections.value
  if (data.length === 0) { alert('暂无数据可导出'); return }
  let csv = '回款编号,客户,日期,金额,付款方式,状态,逾期天数\n'
  for (const c of data) {
    csv += `"${c.collectionNo}","${c.customerName}","${c.date}",${c.amount},"${collectionStore.methodLabels[c.method] || c.method}","${collectionStore.statusLabels[c.status] || c.status}",${collectionStore.getOverdueDays(c)}\n`
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '回款记录_' + new Date().toISOString().split('T')[0] + '.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function agingBarHeight(key) {
  const max = Math.max(agingSummary.value.current, agingSummary.value.days30, agingSummary.value.days60, agingSummary.value.daysOver, 1)
  return Math.max(4, (agingSummary.value[key] / max) * 160)
}

function exportAgingCSV() {
  const data = agingDetailList.value.map(r => ({
    客户: r.customer, 余额: r.balance.toFixed(2), 当期: r.current.toFixed(2),
    '1-30天': r.days30.toFixed(2), '31-60天': r.days60.toFixed(2),
    '61-90天': r.days90.toFixed(2), '90天+': r.daysOver.toFixed(2), 风险: r.risk
  }))
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '账龄分析明细.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleClickOutside(e) {
  if (showColumnConfig.value && !e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
}

onMounted(() => {
  customerStore.initSeedData()
  collectionStore.initSeedData()
  dataStore.initSeedData()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.collection-page {
  max-width: 1600px;
  margin: 0 auto;
}
.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.view-toggle {
  display: flex;
  gap: 2px;
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}
.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  min-width: 60px;
}
.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 500ms ease;
}
.progress-bar-fill.success { background: var(--color-success); }
.progress-bar-fill.info { background: var(--color-info); }
.progress-bar-fill.warning { background: var(--color-warning); }
.progress-bar-fill.danger { background: var(--color-danger); }
.progress-text {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}
.badge {
  font-size: var(--font-size-xs);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: 600;
}
.badge-success { background: var(--color-success-subtle); color: var(--color-success); }
.badge-info { background: var(--color-info-subtle); color: var(--color-info); }
.badge-warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.badge-danger { background: var(--color-danger-subtle); color: var(--color-danger); }
.chart-container {
  position: relative;
  width: 100%;
  height: 320px;
}
.list-view {
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.list-item:hover { background: var(--color-surface-hover); }
.list-item-overdue { border-left: 3px solid var(--color-danger); }
.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}
.list-item-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3);
}
.collection-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.collection-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-overdue { border-left: 3px solid var(--color-danger); }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.card-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.card-field {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.card-label {
  color: var(--color-text-tertiary);
}
.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.progress-section {
  padding: var(--space-3);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
}
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .stats-grid-4 { grid-template-columns: 1fr 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .filter-bar { flex-direction: column; }
  table { font-size: 12px; }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
</style>
