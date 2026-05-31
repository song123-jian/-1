<template>
  <div class="transaction-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">交易管理</h2>
        <p class="page-header-subtitle">全链路交易记录追踪：报价→合同→回款→对账</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewOptions" :key="v.key" class="btn btn-outline" :class="{ active: currentView === v.key }" @click="currentView = v.key">{{ v.icon }} {{ v.label }}</button>
        </div>
        <button class="btn btn-outline" @click="exportCSV">导出</button>
        <button class="btn btn-primary" @click="openForm()">+ 新建交易</button>
      </div>
    </div>

    <div class="stats-row stats-grid-5">
      <div class="stat-card">
        <div class="stat-card-value" style="font-size:var(--font-size-xl)">{{ allTransactions.length }}</div>
        <div class="stat-card-label">交易总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-accent);font-size:var(--font-size-xl)">¥{{ formatMoney(totalAmount) }}</div>
        <div class="stat-card-label">交易总额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">{{ completedCount }}</div>
        <div class="stat-card-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">{{ pendingCount }}</div>
        <div class="stat-card-label">进行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(overdueAmount) }}</div>
        <div class="stat-card-label">逾期金额</div>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" class="form-input" v-model="filters.search" placeholder="搜索编号/客户名称..." style="min-width:180px">
      <select class="form-select" v-model="filters.type">
        <option value="">全部类型</option>
        <option value="quotation">报价</option>
        <option value="contract">合同</option>
        <option value="collection">回款</option>
        <option value="delivery">送货</option>
      </select>
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="completed">已完成</option>
        <option value="in_progress">进行中</option>
        <option value="pending">待处理</option>
        <option value="overdue">已逾期</option>
        <option value="cancelled">已取消</option>
      </select>
      <input type="date" class="form-input" v-model="filters.dateFrom" title="起始日期" style="width:140px">
      <input type="date" class="form-input" v-model="filters.dateTo" title="截止日期" style="width:140px">
      <button class="btn btn-outline" @click="resetFilters">重置</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">

        <!-- 表格视图 -->
        <div class="table-container" v-if="currentView === 'table'">
          <div class="table-toolbar">
            <span class="table-toolbar-info">共 {{ filteredTransactions.length }} 条记录</span>
            <button class="btn btn-outline" @click="showSpacingPanel = !showSpacingPanel" :class="{ active: showSpacingPanel }">间距评估</button>
          </div>

          <div v-if="showSpacingPanel" class="spacing-eval-panel">
            <div class="spacing-eval-header">
              <span class="spacing-eval-title">📊 自动化内容间距评估报告</span>
              <button class="btn btn-outline" @click="runSpacingEval">重新评估</button>
            </div>
            <div class="spacing-eval-body">
              <div class="spacing-eval-summary">
                <div class="eval-score-card" :class="spacingScoreClass">
                  <div class="eval-score-value">{{ spacingScore }}</div>
                  <div class="eval-score-label">综合评分</div>
                </div>
                <div class="eval-metrics">
                  <div class="eval-metric">
                    <span class="eval-metric-label">列间距均衡度</span>
                    <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.columnBalance + '%' }"></div></div>
                    <span class="eval-metric-value">{{ spacingMetrics.columnBalance }}%</span>
                  </div>
                  <div class="eval-metric">
                    <span class="eval-metric-label">文本对齐一致性</span>
                    <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.alignmentConsistency + '%' }"></div></div>
                    <span class="eval-metric-value">{{ spacingMetrics.alignmentConsistency }}%</span>
                  </div>
                  <div class="eval-metric">
                    <span class="eval-metric-label">内容密度适宜度</span>
                    <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.densityScore + '%' }"></div></div>
                    <span class="eval-metric-value">{{ spacingMetrics.densityScore }}%</span>
                  </div>
                  <div class="eval-metric">
                    <span class="eval-metric-label">视觉层级清晰度</span>
                    <div class="eval-metric-bar"><div class="eval-metric-fill" :style="{ width: spacingMetrics.visualHierarchy + '%' }"></div></div>
                    <span class="eval-metric-value">{{ spacingMetrics.visualHierarchy }}%</span>
                  </div>
                </div>
              </div>
              <div class="spacing-eval-columns">
                <div class="eval-col-title">各列间距详情</div>
                <div class="eval-col-list">
                  <div v-for="col in columnSpacingDetails" :key="col.key" class="eval-col-item">
                    <span class="eval-col-name">{{ col.label }}</span>
                    <span class="eval-col-width">{{ col.currentWidth }}px</span>
                    <span class="eval-col-optimal">建议 {{ col.optimalWidth }}px</span>
                    <span class="eval-col-status" :class="col.statusClass">{{ col.statusText }}</span>
                  </div>
                </div>
              </div>
              <div class="spacing-eval-suggestions" v-if="spacingSuggestions.length > 0">
                <div class="eval-suggest-title">优化建议</div>
                <div v-for="(s, i) in spacingSuggestions" :key="i" class="eval-suggest-item">
                  <span class="eval-suggest-icon">{{ s.icon }}</span>
                  <span class="eval-suggest-text">{{ s.text }}</span>
                </div>
              </div>
            </div>
          </div>

          <table class="data-table txn-table" ref="txnTableRef">
            <colgroup>
              <col class="col-ref" />
              <col class="col-type" />
              <col class="col-customer" />
              <col class="col-date" />
              <col class="col-amount" />
              <col class="col-status" />
              <col class="col-related" />
              <col class="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th class="th-ref">编号</th>
                <th class="th-type">类型</th>
                <th class="th-customer">客户</th>
                <th class="th-date">日期</th>
                <th class="th-amount">金额</th>
                <th class="th-status">状态</th>
                <th class="th-related">关联单据</th>
                <th class="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pagedTransactions.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-state-icon">💱</div>暂无交易记录
                </td>
              </tr>
              <tr v-for="t in pagedTransactions" :key="t.id" :class="{ 'row-overdue': t.status === 'overdue' }">
                <td class="cell-ref cell-mono" @click="viewDetail(t)">{{ t.refNo }}</td>
                <td class="cell-type">
                  <span class="type-badge" :class="'type-' + t.type">
                    {{ typeLabels[t.type] || t.type }}
                  </span>
                </td>
                <td class="cell-customer">{{ t.customerName }}</td>
                <td class="cell-date">{{ t.date || '-' }}</td>
                <td class="cell-amount cell-mono">¥{{ formatMoney(t.amount) }}</td>
                <td class="cell-status">
                  <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">
                    {{ statusLabels[t.status] || t.status }}
                  </span>
                </td>
                <td class="cell-related">
                  <template v-if="t.relatedDocs && t.relatedDocs.length > 0">
                    <div v-for="rd in t.relatedDocs" :key="rd.refNo" class="related-doc-item">
                      <span class="type-badge" :class="'type-' + rd.type" style="font-size:10px;padding:1px 4px">{{ typeLabels[rd.type] }}</span>
                      <span class="related-ref" @click="navigateToPath(rd.path)">{{ rd.refNo }}</span>
                    </div>
                  </template>
                  <span v-else class="cell-placeholder">—</span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-sm btn-outline" @click="viewDetail(t)" title="查看详情">查看</button>
                  <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" @click="openForm(t)" title="编辑">编辑</button>
                  <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click="handleDelete(t.id)" title="删除">删除</button>
                  <button v-if="t.relatedPath" class="btn btn-sm btn-outline" @click="navigateToPath(t.relatedPath)" title="跳转关联">跳转</button>
                  <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click="handleDelete(t.id)" title="删除">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="totalPages > 1" class="pagination-bar">
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
            <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
            <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredTransactions.length }} 条</span>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else-if="currentView === 'list'" class="list-view">
          <div v-for="t in filteredTransactions" :key="t.id" class="list-item" @click="viewDetail(t)">
            <div class="list-item-header">
              <span class="list-item-title">{{ t.refNo }}</span>
              <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
              <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">{{ statusLabels[t.status] || t.status }}</span>
            </div>
            <div class="list-item-meta">
              <span>{{ t.customerName }}</span>
              <span class="cell-mono">¥{{ formatMoney(t.amount) }}</span>
              <span>{{ t.date }}</span>
            </div>
            <div class="list-item-related" v-if="t.relatedDocs && t.relatedDocs.length > 0">
              <span class="list-related-label">关联：</span>
              <span v-for="(rd, idx) in t.relatedDocs" :key="rd.refNo" class="list-related-item">
                <span class="type-badge" :class="'type-' + rd.type" style="font-size:10px;padding:1px 4px">{{ typeLabels[rd.type] }}</span>
                <span class="related-ref" @click.stop="navigateToPath(rd.path)">{{ rd.refNo }}</span>
                <span v-if="idx < t.relatedDocs.length - 1" style="margin:0 2px">·</span>
              </span>
            </div>
          </div>
          <div v-if="filteredTransactions.length === 0" class="empty-state">
            <div class="empty-state-icon">💱</div>暂无交易记录
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-else-if="currentView === 'card'" class="card-view">
          <div v-for="t in filteredTransactions" :key="t.id" class="txn-card" :class="'card-type-' + t.type" @click="viewDetail(t)">
            <div class="card-header">
              <span class="card-title">{{ t.refNo }}</span>
              <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
            </div>
            <div class="card-body">
              <div class="card-field"><span class="card-label">客户</span><span>{{ t.customerName }}</span></div>
              <div class="card-field"><span class="card-label">金额</span><span class="cell-mono">¥{{ formatMoney(t.amount) }}</span></div>
              <div class="card-field"><span class="card-label">日期</span><span>{{ t.date }}</span></div>
              <div class="card-field"><span class="card-label">状态</span><span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">{{ statusLabels[t.status] || t.status }}</span></div>
              <div class="card-field" v-if="t.relatedDocs && t.relatedDocs.length > 0">
                <span class="card-label">关联</span>
                <span class="card-related-refs">
                  <span v-for="rd in t.relatedDocs" :key="rd.refNo" class="related-ref" @click.stop="navigateToPath(rd.path)">{{ rd.refNo }}</span>
                </span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-outline" @click.stop="viewDetail(t)">详情</button>
              <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" @click.stop="openForm(t)">编辑</button>
              <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click.stop="handleDelete(t.id)">删除</button>
              <button v-if="t.relatedPath" class="btn btn-sm btn-outline" @click.stop="navigateToPath(t.relatedPath)">跳转</button>
              <button v-if="t.type === 'manual'" class="btn btn-sm btn-outline" style="color:var(--color-danger)" @click.stop="handleDelete(t.id)">删除</button>
            </div>
          </div>
          <div v-if="filteredTransactions.length === 0" class="empty-state">
            <div class="empty-state-icon">💱</div>暂无交易记录
          </div>
        </div>

        <!-- 日历视图 -->
        <div v-else-if="currentView === 'calendar'" class="calendar-view">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="calendarPrev">◀ 上月</button>
            <span class="calendar-title">{{ calendarYear }}年{{ calendarMonth }}月</span>
            <button class="btn btn-ghost btn-sm" @click="calendarNext">下月 ▶</button>
            <button class="btn btn-ghost btn-sm" @click="calendarToday" style="margin-left:8px">今天</button>
          </div>
          <div class="calendar-grid">
            <div class="calendar-header-cell" v-for="d in weekDayNames" :key="d">{{ d }}</div>
            <div
              v-for="(cell, idx) in calendarCells"
              :key="idx"
              class="calendar-cell"
              :class="{
                'other-month': !cell.currentMonth,
                'is-today': cell.isToday,
                'has-events': cell.transactions.length > 0
              }"
            >
              <div class="cell-date">{{ cell.day }}</div>
              <div class="cell-events">
                <div
                  v-for="t in cell.transactions.slice(0, 3)"
                  :key="t.id"
                  class="cell-event"
                  :class="'event-type-' + t.type"
                  @click="viewDetail(t)"
                  :title="t.refNo + ' ' + t.customerName + ' ¥' + formatMoney(t.amount)"
                >
                  <span class="type-badge" :class="'type-' + t.type" style="font-size:9px;padding:0 3px">{{ typeLabels[t.type] }}</span>
                  <span class="cell-event-text">{{ t.customerName }} ¥{{ formatMoney(t.amount) }}</span>
                </div>
                <div v-if="cell.transactions.length > 3" class="cell-more" @click="showDayDetail(cell.dateStr)">
                  +{{ cell.transactions.length - 3 }} 更多
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 周视图 -->
        <div v-else-if="currentView === 'week'" class="week-view">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="weekPrev">◀ 上一周</button>
            <span class="calendar-title">{{ weekRangeLabel }}</span>
            <button class="btn btn-ghost btn-sm" @click="weekNext">下一周 ▶</button>
            <button class="btn btn-ghost btn-sm" @click="weekToday" style="margin-left:8px">本周</button>
          </div>
          <div class="week-grid">
            <div class="week-day-col" v-for="(day, dIdx) in weekDays" :key="dIdx" :class="{ 'is-today': day.isToday }">
              <div class="week-day-header">
                <div class="week-day-name">{{ day.name }}</div>
                <div class="week-day-date">{{ day.dateStr.slice(5) }}</div>
              </div>
              <div class="week-day-body">
                <div v-if="day.transactions.length === 0" class="week-empty">暂无交易</div>
                <div
                  v-for="t in day.transactions"
                  :key="t.id"
                  class="week-event"
                  :class="'event-type-' + t.type"
                  @click="viewDetail(t)"
                >
                  <div class="week-event-header">
                    <span class="type-badge" :class="'type-' + t.type" style="font-size:10px;padding:1px 4px">{{ typeLabels[t.type] }}</span>
                    <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'" style="font-size:10px;padding:1px 4px">{{ statusLabels[t.status] || t.status }}</span>
                  </div>
                  <div class="week-event-ref">{{ t.refNo }}</div>
                  <div class="week-event-customer">{{ t.customerName }}</div>
                  <div class="week-event-amount">¥{{ formatMoney(t.amount) }}</div>
                  <div class="week-event-related" v-if="t.relatedDocs && t.relatedDocs.length > 0">
                    <span v-for="rd in t.relatedDocs" :key="rd.refNo" class="related-ref" @click.stop="navigateToPath(rd.path)" style="font-size:10px">{{ typeLabels[rd.type] }}:{{ rd.refNo }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 新建/编辑表单弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal-content" style="max-width:560px">
        <div class="modal-header">
          <h3>{{ editingTxn ? '编辑交易' : '新建交易' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">客户</label>
            <select class="form-select" v-model="formData.customerId">
              <option value="">请选择客户</option>
              <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.name || c.fullName || c.companyName }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">交易类型</label>
            <select class="form-select" v-model="formData.type">
              <option value="manual">手动记录</option>
              <option value="quotation">报价</option>
              <option value="contract">合同</option>
              <option value="collection">回款</option>
              <option value="delivery">送货</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">金额</label>
            <input type="number" class="form-input" v-model.number="formData.amount" placeholder="请输入金额" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">日期</label>
            <input type="date" class="form-input" v-model="formData.date">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-input" v-model="formData.notes" rows="3" placeholder="备注信息..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeForm">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="!canSubmit">{{ editingTxn ? '保存修改' : '创建交易' }}</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-content" style="max-width:700px">
        <div class="modal-header">
          <h3>交易详情</h3>
          <button class="btn btn-ghost btn-sm" @click="showDetail = false">关闭</button>
        </div>
        <div class="modal-body" v-if="detailTxn">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">编号</span><span class="detail-value mono">{{ detailTxn.refNo }}</span></div>
            <div class="detail-item"><span class="detail-label">类型</span><span class="detail-value"><span class="type-badge" :class="'type-' + detailTxn.type">{{ typeLabels[detailTxn.type] }}</span></span></div>
            <div class="detail-item"><span class="detail-label">客户</span><span class="detail-value">{{ detailTxn.customerName }}</span></div>
            <div class="detail-item"><span class="detail-label">日期</span><span class="detail-value">{{ detailTxn.date }}</span></div>
            <div class="detail-item"><span class="detail-label">金额</span><span class="detail-value mono" style="font-size:var(--font-size-lg);font-weight:700">¥{{ formatMoney(detailTxn.amount) }}</span></div>
            <div class="detail-item"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge" :class="statusBadgeMap[detailTxn.status] || 'neutral'">{{ statusLabels[detailTxn.status] || detailTxn.status }}</span></span></div>
          </div>
          <div class="detail-related-section" v-if="detailTxn.relatedDocs && detailTxn.relatedDocs.length > 0">
            <div class="detail-related-title">关联单据</div>
            <div class="detail-related-list">
              <div v-for="rd in detailTxn.relatedDocs" :key="rd.refNo" class="detail-related-item" @click="navigateToPath(rd.path)">
                <span class="type-badge" :class="'type-' + rd.type">{{ typeLabels[rd.type] }}</span>
                <span class="detail-related-ref">{{ rd.refNo }}</span>
                <span class="detail-related-amount" v-if="rd.amount">¥{{ formatMoney(rd.amount) }}</span>
                <span class="detail-related-status" v-if="rd.status">{{ statusLabels[rd.status] || rd.status }}</span>
                <span class="detail-related-link">查看 →</span>
              </div>
            </div>
          </div>
          <div class="detail-notes" v-if="detailTxn.notes">
            <div class="detail-label" style="margin-bottom:4px">备注</div>
            <div class="detail-notes-content">{{ detailTxn.notes }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDetail = false">关闭</button>
          <button v-if="detailTxn && detailTxn.type === 'manual'" class="btn btn-outline" @click="openForm(detailTxn); showDetail = false">编辑</button>
          <button v-if="detailTxn && detailTxn.relatedPath" class="btn btn-primary" @click="navigateToPath(detailTxn.relatedPath)">查看关联单据</button>
        </div>
      </div>
    </div>

    <!-- 日历日期详情弹窗 -->
    <div v-if="showDayModal" class="modal-overlay" @click.self="showDayModal = false">
      <div class="modal-content" style="max-width:640px">
        <div class="modal-header">
          <h3>{{ dayModalDate }} 交易记录</h3>
          <button class="btn btn-ghost btn-sm" @click="showDayModal = false">关闭</button>
        </div>
        <div class="modal-body">
          <div v-if="dayModalTransactions.length === 0" class="empty-state">当日无交易记录</div>
          <div v-for="t in dayModalTransactions" :key="t.id" class="day-modal-item" @click="viewDetail(t); showDayModal = false">
            <span class="type-badge" :class="'type-' + t.type">{{ typeLabels[t.type] }}</span>
            <span class="day-modal-ref">{{ t.refNo }}</span>
            <span class="day-modal-customer">{{ t.customerName }}</span>
            <span class="day-modal-amount cell-mono">¥{{ formatMoney(t.amount) }}</span>
            <span class="status-badge" :class="statusBadgeMap[t.status] || 'neutral'">{{ statusLabels[t.status] || t.status }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDayModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useCollectionStore } from '@/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'

const router = useRouter()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()

const STORAGE_KEY = 'gj_erp_manual_transactions'

function loadManual() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return []
}

function saveManual(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

const manualTransactions = ref(loadManual())

const currentView = ref('table')
const currentPage = ref(1)
const pageSize = 15
const showForm = ref(false)
const showDetail = ref(false)
const editingTxn = ref(null)
const detailTxn = ref(null)
const showDayModal = ref(false)
const dayModalDate = ref('')
const showSpacingPanel = ref(false)
const txnTableRef = ref(null)
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth() + 1)
const weekStartDate = ref(getMonday(new Date()))

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const filters = ref({
  search: '',
  type: '',
  status: '',
  dateFrom: '',
  dateTo: ''
})

const formData = ref({
  customerId: '',
  type: 'manual',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  notes: ''
})

const viewOptions = [
  { key: 'table', icon: '📊', label: '表格' },
  { key: 'list', icon: '📋', label: '列表' },
  { key: 'card', icon: '🗂', label: '卡片' },
  { key: 'calendar', icon: '📅', label: '日历' },
  { key: 'week', icon: '🗓', label: '周视图' }
]

const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const typeLabels = {
  quotation: '报价',
  contract: '合同',
  collection: '回款',
  delivery: '送货',
  manual: '手动记录'
}

const statusLabels = {
  completed: '已完成',
  in_progress: '进行中',
  pending: '待处理',
  overdue: '已逾期',
  cancelled: '已取消'
}

const statusBadgeMap = {
  completed: 'success',
  in_progress: 'accent',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'neutral'
}

function getCustomerName(customerId) {
  const c = customerStore.customers.find(c => c.id === customerId)
  return c ? (c.name || c.fullName || c.companyName || '未知客户') : '未知客户'
}

function getQuotationStatus(q) {
  if (q.status === 'accepted') return 'completed'
  if (q.status === 'rejected' || q.status === 'expired') return 'cancelled'
  if (q.status === 'approved' || q.status === 'sent') return 'in_progress'
  return 'pending'
}

function getContractStatus(c) {
  if (c.status === 'signed' || c.status === 'archived') return 'completed'
  if (c.status === 'cancelled') return 'cancelled'
  if (c.status === 'approved') return 'in_progress'
  return 'pending'
}

function getCollectionStatus(c) {
  if (c.status === 'completed' || c.status === 'confirmed') return 'completed'
  if (c.status === 'voided') return 'cancelled'
  return 'pending'
}

function getDeliveryStatus(d) {
  if (d.status === 'received' || d.status === 'accepted') return 'completed'
  if (d.status === 'returned' || d.status === 'exception') return 'cancelled'
  if (d.status === 'shipped' || d.status === 'transit') return 'in_progress'
  return 'pending'
}

function findRelatedDocs(type, source) {
  const docs = []
  if (type === 'quotation' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find(x => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c) docs.push({ type: 'contract', refNo: c.contractNo, amount: c.totalAmount, status: getContractStatus(c), path: '/contracts' })
    }
  } else if (type === 'contract' && source) {
    if (source.quoteId || source.quoteNo) {
      const q = quotationStore.quotations.find(x => x.id === source.quoteId || x.quoteNo === source.quoteNo)
      if (q) docs.push({ type: 'quotation', refNo: q.quoteNo, amount: q.total || q.subtotal, status: getQuotationStatus(q), path: '/quotations' })
    }
    const relatedCols = collectionStore.collections.filter(x => x.contractId === source.id || x.contractNo === source.contractNo)
    relatedCols.forEach(c => docs.push({ type: 'collection', refNo: c.collectionNo, amount: parseFloat(c.amount) || 0, status: getCollectionStatus(c), path: '/collections' }))
    const relatedDel = deliveryStore.deliveries.filter(x => x.contractId === source.id || x.contractNo === source.contractNo)
    relatedDel.forEach(d => docs.push({ type: 'delivery', refNo: d.deliveryNo || d.orderNo, amount: d.totalAmount, status: getDeliveryStatus(d), path: '/deliveries' }))
  } else if (type === 'collection' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find(x => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c) docs.push({ type: 'contract', refNo: c.contractNo, amount: c.totalAmount, status: getContractStatus(c), path: '/contracts' })
    }
  } else if (type === 'delivery' && source) {
    if (source.contractId || source.contractNo) {
      const c = contractStore.contracts.find(x => x.id === source.contractId || x.contractNo === source.contractNo)
      if (c) docs.push({ type: 'contract', refNo: c.contractNo, amount: c.totalAmount, status: getContractStatus(c), path: '/contracts' })
    }
  }
  return docs
}

const allTransactions = computed(() => {
  const list = []

  quotationStore.quotations.forEach(q => {
    const relatedDocs = findRelatedDocs('quotation', q)
    list.push({
      id: 'q-' + q.id,
      refNo: q.quoteNo,
      type: 'quotation',
      customerName: q.customerName || getCustomerName(q.customerId),
      date: q.date,
      amount: q.total || q.subtotal || 0,
      status: getQuotationStatus(q),
      relatedDocs,
      relatedPath: '/quotations',
      source: q
    })
  })

  contractStore.contracts.forEach(c => {
    const relatedDocs = findRelatedDocs('contract', c)
    list.push({
      id: 'c-' + c.id,
      refNo: c.contractNo,
      type: 'contract',
      customerName: c.partyA || c.customerName || getCustomerName(c.customerId),
      date: c.signDate || c.startDate,
      amount: c.totalAmount || c.amount || 0,
      status: getContractStatus(c),
      relatedDocs,
      relatedPath: '/contracts',
      source: c
    })
  })

  collectionStore.collections.forEach(c => {
    const relatedDocs = findRelatedDocs('collection', c)
    list.push({
      id: 'col-' + c.id,
      refNo: c.collectionNo,
      type: 'collection',
      customerName: c.customerName || getCustomerName(c.customerId),
      date: c.date,
      amount: parseFloat(c.amount) || 0,
      status: getCollectionStatus(c),
      relatedDocs,
      relatedPath: '/collections',
      source: c
    })
  })

  deliveryStore.deliveries.forEach(d => {
    const relatedDocs = findRelatedDocs('delivery', d)
    list.push({
      id: 'd-' + d.id,
      refNo: d.deliveryNo || d.orderNo || '',
      type: 'delivery',
      customerName: d.customerName || d.buyerName || getCustomerName(d.customerId),
      date: d.date || d.deliveryDate,
      amount: d.totalAmount || 0,
      status: getDeliveryStatus(d),
      relatedDocs,
      relatedPath: '/deliveries',
      source: d
    })
  })

  manualTransactions.value.forEach(t => {
    list.push({
      id: 'm-' + t.id,
      refNo: t.refNo,
      type: 'manual',
      customerName: t.customerName || getCustomerName(t.customerId),
      date: t.date,
      amount: t.amount || 0,
      status: t.status || 'pending',
      relatedDocs: [],
      relatedPath: '',
      notes: t.notes || '',
      source: t
    })
  })

  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const filteredTransactions = computed(() => {
  let list = allTransactions.value
  if (filters.value.search) {
    const s = filters.value.search.toLowerCase()
    list = list.filter(t =>
      (t.refNo || '').toLowerCase().includes(s) ||
      (t.customerName || '').toLowerCase().includes(s)
    )
  }
  if (filters.value.type) {
    list = list.filter(t => t.type === filters.value.type)
  }
  if (filters.value.status) {
    list = list.filter(t => t.status === filters.value.status)
  }
  if (filters.value.dateFrom) {
    list = list.filter(t => t.date && t.date >= filters.value.dateFrom)
  }
  if (filters.value.dateTo) {
    list = list.filter(t => t.date && t.date <= filters.value.dateTo)
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTransactions.value.length / pageSize)))

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const pagedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredTransactions.value.slice(start, start + pageSize)
})

const totalAmount = computed(() => {
  return allTransactions.value.reduce((s, t) => s + (t.amount || 0), 0)
})

const completedCount = computed(() => {
  return allTransactions.value.filter(t => t.status === 'completed').length
})

const pendingCount = computed(() => {
  return allTransactions.value.filter(t => t.status === 'pending' || t.status === 'in_progress').length
})

const overdueAmount = computed(() => {
  return allTransactions.value.filter(t => t.status === 'overdue').reduce((s, t) => s + (t.amount || 0), 0)
})

const canSubmit = computed(() => {
  return true
})

function formatMoney(num) {
  if (num === undefined || num === null) return '0.00'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function resetFilters() {
  filters.value = { search: '', type: '', status: '', dateFrom: '', dateTo: '' }
  currentPage.value = 1
}

function openForm(txn) {
  if (txn && txn.type === 'manual') {
    editingTxn.value = txn
    const src = txn.source || txn
    formData.value = {
      customerId: src.customerId || '',
      type: 'manual',
      amount: src.amount || 0,
      date: src.date || '',
      notes: src.notes || ''
    }
  } else {
    editingTxn.value = null
    formData.value = {
      customerId: '',
      type: 'manual',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      notes: ''
    }
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTxn.value = null
}

function handleSubmit() {
  const customerName = getCustomerName(formData.value.customerId)
  if (editingTxn.value) {
    const src = editingTxn.value.source || editingTxn.value
    const idx = manualTransactions.value.findIndex(t => t.id === src.id)
    if (idx !== -1) {
      manualTransactions.value[idx] = {
        ...manualTransactions.value[idx],
        customerId: formData.value.customerId,
        customerName,
        amount: formData.value.amount,
        date: formData.value.date,
        notes: formData.value.notes
      }
      saveManual(manualTransactions.value)
    }
  } else {
    const now = new Date()
    const refNo = 'TXN-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(manualTransactions.value.length + 1).padStart(3, '0')
    manualTransactions.value.push({
      id: 'txn-' + Date.now(),
      refNo,
      customerId: formData.value.customerId,
      customerName,
      type: 'manual',
      amount: formData.value.amount,
      date: formData.value.date,
      status: 'pending',
      notes: formData.value.notes,
      createdAt: now.toISOString()
    })
    saveManual(manualTransactions.value)
  }
  closeForm()
}

function handleDelete(id) {
  const realId = id.replace('m-', '')
  manualTransactions.value = manualTransactions.value.filter(t => t.id !== realId)
  saveManual(manualTransactions.value)
}

function viewDetail(t) {
  detailTxn.value = t
  showDetail.value = true
}

function navigateToPath(path) {
  if (path) router.push(path)
}

function showDayDetail(dateStr) {
  dayModalDate.value = dateStr
  showDayModal.value = true
}

const dayModalTransactions = computed(() => {
  if (!dayModalDate.value) return []
  return filteredTransactions.value.filter(t => t.date === dayModalDate.value)
})

function exportCSV() {
  const headers = ['编号', '类型', '客户', '日期', '金额', '状态', '关联单据']
  const rows = filteredTransactions.value.map(t => [
    t.refNo,
    typeLabels[t.type] || t.type,
    t.customerName,
    t.date || '',
    t.amount || 0,
    statusLabels[t.status] || t.status,
    (t.relatedDocs || []).map(rd => typeLabels[rd.type] + ':' + rd.refNo).join('; ')
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '交易记录_' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const calendarCells = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  let startWeekDay = firstDay.getDay()
  if (startWeekDay === 0) startWeekDay = 7
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const cells = []
  const txMap = buildTransactionDateMap()

  for (let i = startWeekDay - 1; i > 0; i--) {
    const day = prevMonthLastDay - i + 1
    const pm = month - 1 <= 0 ? 12 : month - 1
    const py = month - 1 <= 0 ? year - 1 : year
    const dateStr = py + '-' + String(pm).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    cells.push({ day, currentMonth: false, isToday: false, dateStr, transactions: txMap[dateStr] || [] })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    cells.push({ day: d, currentMonth: true, isToday: dateStr === today, dateStr, transactions: txMap[dateStr] || [] })
  }

  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nm = month + 1 > 12 ? 1 : month + 1
    const ny = month + 1 > 12 ? year + 1 : year
    const dateStr = ny + '-' + String(nm).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    cells.push({ day: d, currentMonth: false, isToday: false, dateStr, transactions: txMap[dateStr] || [] })
  }

  return cells
})

function buildTransactionDateMap() {
  const map = {}
  filteredTransactions.value.forEach(t => {
    if (!t.date) return
    if (!map[t.date]) map[t.date] = []
    map[t.date].push(t)
  })
  return map
}

function calendarPrev() {
  if (calendarMonth.value <= 1) {
    calendarMonth.value = 12
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

function calendarNext() {
  if (calendarMonth.value >= 12) {
    calendarMonth.value = 1
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

function calendarToday() {
  const now = new Date()
  calendarYear.value = now.getFullYear()
  calendarMonth.value = now.getMonth() + 1
}

const weekDays = computed(() => {
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const txMap = buildTransactionDateMap()
  const today = new Date().toISOString().slice(0, 10)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate.value)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      name: names[i],
      dateStr,
      isToday: dateStr === today,
      transactions: txMap[dateStr] || []
    })
  }
  return days
})

const weekRangeLabel = computed(() => {
  const start = new Date(weekStartDate.value)
  const end = new Date(weekStartDate.value)
  end.setDate(end.getDate() + 6)
  return formatShortDate(start) + ' ~ ' + formatShortDate(end)
})

function formatShortDate(d) {
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

function weekPrev() {
  const d = new Date(weekStartDate.value)
  d.setDate(d.getDate() - 7)
  weekStartDate.value = d
}

function weekNext() {
  const d = new Date(weekStartDate.value)
  d.setDate(d.getDate() + 7)
  weekStartDate.value = d
}

function weekToday() {
  weekStartDate.value = getMonday(new Date())
}

const columnDefs = [
  { key: 'ref', label: '编号', optimalWidth: 140, align: 'left' },
  { key: 'type', label: '类型', optimalWidth: 80, align: 'center' },
  { key: 'customer', label: '客户', optimalWidth: 140, align: 'left' },
  { key: 'date', label: '日期', optimalWidth: 110, align: 'center' },
  { key: 'amount', label: '金额', optimalWidth: 120, align: 'right' },
  { key: 'status', label: '状态', optimalWidth: 80, align: 'center' },
  { key: 'related', label: '关联单据', optimalWidth: 205, align: 'left' },
  { key: 'actions', label: '操作', optimalWidth: 230, align: 'center' }
]

const spacingMetrics = ref({
  columnBalance: 0,
  alignmentConsistency: 0,
  densityScore: 0,
  visualHierarchy: 0
})

const columnSpacingDetails = ref([])

const spacingSuggestions = ref([])

const spacingScore = computed(() => {
  const m = spacingMetrics.value
  return Math.round((m.columnBalance + m.alignmentConsistency + m.densityScore + m.visualHierarchy) / 4)
})

const spacingScoreClass = computed(() => {
  const s = spacingScore.value
  if (s >= 90) return 'score-excellent'
  if (s >= 75) return 'score-good'
  if (s >= 60) return 'score-fair'
  return 'score-poor'
})

function runSpacingEval() {
  nextTick(() => {
    const table = txnTableRef.value
    if (!table) return

    const cols = table.querySelectorAll('colgroup col')
    const ths = table.querySelectorAll('thead th')
    const currentWidths = []

    ths.forEach((th, i) => {
      currentWidths.push(th.offsetWidth || 0)
    })

    const totalWidth = currentWidths.reduce((s, w) => s + w, 0) || 1

    const details = columnDefs.map((def, i) => {
      const cw = currentWidths[i] || 0
      const ow = def.optimalWidth
      const ratio = cw / totalWidth
      const diff = Math.abs(cw - ow)
      let statusClass = 'status-optimal'
      let statusText = '最佳'
      if (diff > 40) { statusClass = 'status-warning'; statusText = '偏窄' }
      if (cw > ow + 60) { statusClass = 'status-loose'; statusText = '偏宽' }
      if (diff <= 20) { statusClass = 'status-optimal'; statusText = '最佳' }
      return { key: def.key, label: def.label, currentWidth: cw, optimalWidth: ow, statusClass, statusText }
    })
    columnSpacingDetails.value = details

    const avgDiff = details.reduce((s, d) => s + Math.abs(d.currentWidth - d.optimalWidth), 0) / details.length
    const maxOptimal = Math.max(...columnDefs.map(d => d.optimalWidth))
    const balanceScore = Math.max(0, Math.min(100, Math.round(100 - (avgDiff / maxOptimal) * 100)))

    const alignMap = { ref: 'left', type: 'center', customer: 'left', date: 'center', amount: 'right', status: 'center', related: 'left', actions: 'center' }
    const actualAligns = []
    ths.forEach((th, i) => {
      const style = window.getComputedStyle(th)
      actualAligns.push(style.textAlign || 'left')
    })
    const expectedAligns = columnDefs.map(d => d.align)
    let alignMatches = 0
    expectedAligns.forEach((ea, i) => {
      if (actualAligns[i] === ea) alignMatches++
    })
    const alignScore = Math.round((alignMatches / expectedAligns.length) * 100)

    const rowCount = pagedTransactions.value.length
    const rowHeight = table.querySelector('tbody tr') ? table.querySelector('tbody tr').offsetHeight : 40
    const idealRowHeight = 44
    const densityRatio = rowHeight / idealRowHeight
    let densityScore = 100
    if (densityRatio < 0.8) densityScore = 60
    else if (densityRatio < 0.9) densityScore = 80
    else if (densityRatio > 1.3) densityScore = 70
    else if (densityRatio > 1.1) densityScore = 90

    const hasColgroup = table.querySelectorAll('colgroup col').length === columnDefs.length
    const hasFixedLayout = window.getComputedStyle(table).tableLayout === 'fixed'
    let hierarchyScore = 70
    if (hasColgroup) hierarchyScore += 15
    if (hasFixedLayout) hierarchyScore += 10
    if (balanceScore >= 80) hierarchyScore += 5
    hierarchyScore = Math.min(100, hierarchyScore)

    spacingMetrics.value = {
      columnBalance: balanceScore,
      alignmentConsistency: alignScore,
      densityScore,
      visualHierarchy: hierarchyScore
    }

    const suggestions = []
    if (balanceScore < 80) suggestions.push({ icon: '', text: '部分列宽偏离建议值较大，建议通过colgroup精确控制各列宽度比例' })
    if (alignScore < 100) suggestions.push({ icon: '', text: '部分列文本对齐方式与最佳实践不一致：数字列应右对齐，标签列应居中，文本列应左对齐' })
    if (densityScore < 85) suggestions.push({ icon: '', text: '行高偏小导致内容密度过高，建议增加行内间距(padding)至12px 16px以提升可读性' })
    if (hierarchyScore < 85) suggestions.push({ icon: '', text: '视觉层级不够清晰，建议使用table-layout:fixed配合colgroup确保列宽稳定' })
    details.forEach(d => {
      if (d.statusClass !== 'status-optimal') {
        suggestions.push({ icon: '', text: `「${d.label}」列当前${d.currentWidth}px，建议调整为${d.optimalWidth}px（${d.statusText}）` })
      }
    })
    if (suggestions.length === 0) {
      suggestions.push({ icon: '', text: '表格排版已达到最佳状态，各列间距均衡、对齐一致、密度适宜' })
    }
    spacingSuggestions.value = suggestions
  })
}

onMounted(() => {
  customerStore.initSeedData()
})
</script>

<style scoped>
.transaction-page {
  max-width: 1600px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}
.page-header-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.stats-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stats-grid-5 {
  grid-template-columns: repeat(5, 1fr);
}
.stat-card {
  background: var(--color-surface-elevated);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  text-align: center;
}
.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}
.stat-card-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.filter-bar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.type-quotation { background: var(--color-info-subtle); color: var(--color-info); }
.type-contract { background: var(--color-accent-subtle); color: var(--color-accent); }
.type-collection { background: var(--color-success-subtle); color: var(--color-success); }
.type-delivery { background: var(--color-warning-subtle); color: var(--color-warning); }
.type-manual { background: var(--color-purple-subtle); color: var(--color-purple); }
.related-doc-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 6px;
}
.related-ref {
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.related-ref:hover {
  text-decoration: underline;
}
.row-overdue {
  background: var(--color-danger-subtle);
}
.list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
}
.list-item:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.list-item-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.list-item-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.list-item-related {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.list-related-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}
.list-related-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  padding: var(--space-3);
}
.txn-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  cursor: pointer;
  transition: all 0.15s;
}
.txn-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.card-title {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.card-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}
.card-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.card-related-refs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.card-type-quotation { border-left: 3px solid var(--color-info); }
.card-type-contract { border-left: 3px solid var(--color-accent); }
.card-type-collection { border-left: 3px solid var(--color-success); }
.card-type-delivery { border-left: 3px solid var(--color-warning); }
.card-type-manual { border-left: 3px solid var(--color-purple); }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-item {
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}
.detail-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-related-section {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-related-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.detail-related-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.detail-related-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}
.detail-related-item:hover {
  background: var(--color-accent-subtle);
}
.detail-related-ref {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-related-amount {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.detail-related-status {
  font-size: var(--font-size-xs);
}
.detail-related-link {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-accent);
}
.detail-notes {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-notes-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.form-group {
  margin-bottom: var(--space-4);
}
.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.pagination-bar {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.pagination-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 4px 10px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.pagination-btn:hover:not(:disabled) {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.pagination-btn.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pagination-info {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  font-size: 2em;
  margin-bottom: var(--space-2);
}
.cell-mono {
  font-family: var(--font-mono);
}
.cell-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.cell-placeholder {
  color: var(--color-text-tertiary);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
.table-toolbar-info {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.txn-table {
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.txn-table col.col-ref { width: 140px; }
.txn-table col.col-type { width: 80px; }
.txn-table col.col-customer { width: 140px; }
.txn-table col.col-date { width: 110px; }
.txn-table col.col-amount { width: 120px; }
.txn-table col.col-status { width: 80px; }
.txn-table col.col-related { width: 205px; }
.txn-table col.col-actions { width: 230px; }

.txn-table thead th {
  padding: 10px 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  text-transform: none;
  letter-spacing: 0;
}
.th-ref, .th-customer, .th-related { text-align: left; }
.th-type, .th-date, .th-status, .th-actions { text-align: center; }
.th-amount { text-align: right; }

.txn-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
  line-height: 1.5;
}
.cell-ref {
  cursor: pointer;
  color: var(--color-accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-ref:hover {
  text-decoration: underline;
}
.cell-type { text-align: center; }
.cell-customer {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.cell-date { text-align: center; color: var(--color-text-secondary); }
.cell-amount { text-align: right; font-weight: 600; }
.cell-status { text-align: center; }
.cell-related {
  max-width: 160px;
  overflow: hidden;
}
.cell-actions {
  text-align: center;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.spacing-eval-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin: var(--space-3);
  background: var(--color-surface-elevated);
  overflow: hidden;
}
.spacing-eval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}
.spacing-eval-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
}
.spacing-eval-body {
  padding: var(--space-4);
}
.spacing-eval-summary {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-4);
  align-items: flex-start;
}
.eval-score-card {
  text-align: center;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  min-width: 100px;
}
.score-excellent { background: #e6f9ee; color: #0d8042; }
.score-good { background: #e8f4fd; color: #1a73e8; }
.score-fair { background: #fef7e0; color: #b06000; }
.score-poor { background: #fce8e6; color: #c5221f; }
.eval-score-value {
  font-size: 2rem;
  font-weight: 800;
  font-family: var(--font-mono);
  line-height: 1;
}
.eval-score-label {
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
  opacity: 0.8;
}
.eval-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.eval-metric {
  display: grid;
  grid-template-columns: 120px 1fr 48px;
  align-items: center;
  gap: var(--space-2);
}
.eval-metric-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.eval-metric-bar {
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}
.eval-metric-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.eval-metric-value {
  font-size: var(--font-size-xs);
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
  text-align: right;
}
.spacing-eval-columns {
  margin-bottom: var(--space-4);
}
.eval-col-title, .eval-suggest-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}
.eval-col-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-2);
}
.eval-col-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
.eval-col-name {
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 56px;
}
.eval-col-width {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}
.eval-col-optimal {
  color: var(--color-text-tertiary);
}
.eval-col-status {
  margin-left: auto;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 10px;
}
.status-optimal { background: #e6f9ee; color: #0d8042; }
.status-warning { background: #fce8e6; color: #c5221f; }
.status-loose { background: #fef7e0; color: #b06000; }

.spacing-eval-suggestions {
  padding-top: var(--space-2);
}
.eval-suggest-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.eval-suggest-icon {
  flex-shrink: 0;
}
.eval-suggest-text {
  flex: 1;
}
.view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 2px;
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.calendar-view {
  padding: var(--space-3);
}
.calendar-nav {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.calendar-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 140px;
  text-align: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.calendar-header-cell {
  padding: var(--space-2);
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}
.calendar-cell {
  min-height: 100px;
  padding: 4px;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  transition: background 0.15s;
}
.calendar-cell:nth-child(7n) {
  border-right: none;
}
.calendar-cell:hover {
  background: var(--color-bg-secondary);
}
.calendar-cell.other-month {
  background: var(--color-bg-tertiary);
  opacity: 0.5;
}
.calendar-cell.is-today {
  background: var(--color-accent-subtle);
}
.calendar-cell.is-today .cell-date {
  background: var(--color-accent);
  color: #fff;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-date {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}
.cell-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cell-event {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s;
  overflow: hidden;
}
.cell-event:hover {
  background: var(--color-bg-tertiary);
}
.event-type-quotation { border-left: 2px solid var(--color-info); }
.event-type-contract { border-left: 2px solid var(--color-accent); }
.event-type-collection { border-left: 2px solid var(--color-success); }
.event-type-delivery { border-left: 2px solid var(--color-warning); }
.event-type-manual { border-left: 2px solid var(--color-purple); }
.cell-event-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
}
.cell-more {
  font-size: 10px;
  color: var(--color-accent);
  cursor: pointer;
  padding: 1px 4px;
}
.cell-more:hover {
  text-decoration: underline;
}
.week-view {
  padding: var(--space-3);
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.week-day-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}
.week-day-col.is-today {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.week-day-header {
  padding: var(--space-2) var(--space-3);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.week-day-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.week-day-date {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}
.is-today .week-day-date {
  color: var(--color-accent);
}
.week-day-body {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.week-empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4) 0;
}
.week-event {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}
.week-event:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.week-event-header {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.week-event-ref {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
}
.week-event-customer {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.week-event-amount {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent);
}
.week-event-related {
  margin-top: 2px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.day-modal-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-bottom: var(--space-2);
  transition: all 0.15s;
}
.day-modal-item:hover {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}
.day-modal-ref {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--font-size-sm);
}
.day-modal-customer {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.day-modal-amount {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
@media (max-width: 1024px) {
  .stats-grid-5 { grid-template-columns: repeat(3, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
  .week-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid-5 { grid-template-columns: repeat(2, 1fr); }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .week-grid { grid-template-columns: 1fr; }
  .calendar-cell { min-height: 60px; }
}
</style>
