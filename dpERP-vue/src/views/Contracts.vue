<template>
  <div class="contract-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">合同管理</h2>
        <p class="page-header-subtitle">合同全生命周期管理：创建→审批→签订→归档</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" @click="currentView = v.key">{{ v.label }}</button>
        </div>
        <button class="btn btn-outline" @click="showAnalytics = !showAnalytics">{{ showAnalytics ? '列表' : '分析' }}</button>
        <button class="btn btn-outline" @click="handleExport">导出</button>
        <button class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button class="btn btn-outline" @click="openTemplateManager">模板管理</button>
        <button class="btn btn-primary" @click="openWizard">+ 新建合同</button>
      </div>
    </div>

    <div class="contract-toolbar">
      <select v-model="filterStatus" class="form-select filter-select">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_approval">待审批</option>
        <option value="approved">已审批</option>
        <option value="signed">已签订</option>
        <option value="archived">已归档</option>
        <option value="cancelled">已作废</option>
      </select>
      <select v-model="filterSettlement" class="form-select filter-select">
        <option value="">全部结算方式</option>
        <option value="款到发货">款到发货</option>
        <option value="月结30天">月结30天</option>
        <option value="月结60天">月结60天</option>
        <option value="月结90天">月结90天</option>
        <option value="货到付款">货到付款</option>
      </select>
      <select v-model="filterType" class="form-select filter-select">
        <option value="">全部类型</option>
        <option value="购销合同">购销合同</option>
        <option value="采购合同">采购合同</option>
        <option value="服务合同">服务合同</option>
        <option value="框架协议">框架协议</option>
        <option value="技术协议">技术协议</option>
      </select>
      <div class="contract-search">
        <span class="search-icon">🔍</span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索合同编号/客户名称/合同类型..." />
      </div>
      <div class="filter-date-group">
        <input v-model="filterDateFrom" type="date" class="form-input filter-date" title="签订日期起" />
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateTo" type="date" class="form-input filter-date" title="签订日期止" />
      </div>
      <input v-model.number="filterAmountMin" type="number" class="form-input filter-amount" placeholder="金额≥(万)" />
      <input v-model.number="filterAmountMax" type="number" class="form-input filter-amount" placeholder="金额≤(万)" />
      <button class="btn btn-outline filter-reset-btn" @click="resetFilters">重置</button>
    </div>

    <div class="contract-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span> 总计 {{ contractStore.contracts.length }}</div>
      <div class="stat-item"><span class="stat-dot draft"></span> 草稿 {{ contractStore.draftCount }}</div>
      <div class="stat-item"><span class="stat-dot pending"></span> 待审批 {{ contractStore.pendingApprovalCount }}</div>
      <div class="stat-item"><span class="stat-dot approved"></span> 已审批 {{ contractStore.approvedCount }}</div>
      <div class="stat-item"><span class="stat-dot signed"></span> 已签订 {{ contractStore.signedCount }}</div>
      <div class="stat-item stat-money">总额 ¥{{ formatNumber(contractStore.totalAmount) }}</div>
      <div class="stat-item stat-money">已签订 ¥{{ formatNumber(contractStore.signedAmount) }}</div>
      <div class="stat-item" v-if="contractStore.expiringCount > 0" style="color:var(--color-warning)"><span class="stat-dot expiring"></span> 即将到期 {{ contractStore.expiringCount }}</div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <div v-if="showAnalytics" class="analytics-panel">
      <div class="analytics-kpis">
        <div class="kpi-card"><div class="kpi-value">{{ contractStore.contracts.length }}</div><div class="kpi-label">合同总数</div></div>
        <div class="kpi-card"><div class="kpi-value text-success">{{ contractStore.signedCount }}</div><div class="kpi-label">已签订</div></div>
        <div class="kpi-card"><div class="kpi-value text-accent">¥{{ formatNumber(contractStore.signedAmount) }}</div><div class="kpi-label">已签金额</div></div>
        <div class="kpi-card"><div class="kpi-value text-warning">{{ contractStore.expiringCount }}</div><div class="kpi-label">即将到期</div></div>
        <div class="kpi-card"><div class="kpi-value text-danger">{{ contractStore.cancelledCount }}</div><div class="kpi-label">已作废</div></div>
      </div>
      <div class="analytics-grid">
        <div class="panel-card">
          <div class="panel-card-header">状态分布</div>
          <div class="panel-card-body">
            <div v-for="(label, key) in statusLabels" :key="key" class="bar-row">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(key), background: statusColors[key] }"></div></div>
              <span class="bar-value">{{ contractStore.statusCounts[key] || 0 }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">客户合同金额 TOP10</div>
          <div class="panel-card-body">
            <div v-for="(c, i) in contractStore.customerTopList" :key="c.name" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.name }}</span>
              <span class="top-amount mono">¥{{ formatNumber(c.amount) }}</span>
            </div>
            <div v-if="contractStore.customerTopList.length === 0" class="empty-hint">暂无数据</div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="currentView === 'table'" class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40px"><div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">✓</div></th>
                  <th style="width:140px">合同编号</th>
                  <th style="width:110px;text-align:center">签订日期</th>
                  <th style="min-width:100px">甲方</th>
                  <th style="min-width:100px">乙方</th>
                  <th style="width:110px;text-align:center">回款日</th>
                  <th style="width:100px;text-align:right">单价</th>
                  <th style="width:120px;text-align:right">金额</th>
                  <th style="width:100px;text-align:center">结算方式</th>
                  <th style="width:80px;text-align:center">状态</th>
                  <th style="width:80px;text-align:center">关联单据</th>
                  <th style="min-width:200px;text-align:center">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedContracts.length === 0"><td colspan="12" class="empty-state"><div class="empty-state-icon">📄</div>暂无合同数据</td></tr>
                <tr v-for="c in pagedContracts" :key="c.id">
                  <td><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">✓</div></td>
                  <td class="mono"><strong style="color:var(--color-accent)">{{ c.contractNo }}</strong></td>
                  <td style="text-align:center">{{ c.signDate || '-' }}</td>
                  <td>{{ c.partyA }}</td>
                  <td>{{ c.partyB || '苏州冠久新材料科技有限公司' }}</td>
                  <td style="text-align:center">{{ getPaymentDate(c) }}</td>
                  <td class="mono" style="text-align:right">{{ getFirstUnitPrice(c) }}</td>
                  <td class="mono" style="text-align:right">¥{{ formatNumber(c.totalAmount) }}</td>
                  <td style="text-align:center">{{ c.settlement || '-' }}</td>
                  <td style="text-align:center"><span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span></td>
                  <td style="text-align:center">
                    <span v-if="getRelatedCount(c) > 0" class="related-count-badge" @click="openPreview(c); previewTab = 'related'">{{ getRelatedCount(c) }}份</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td class="cell-actions">
                    <button class="action-btn action-btn-text" @click="openPreview(c)">预览</button>
                    <button class="action-btn action-btn-text" @click="openWizard(c.id)">编辑</button>
                    <button v-if="c.status === 'draft'" class="action-btn action-btn-text" @click="handleSubmitApproval(c)" style="color:var(--color-purple)">提交审批</button>
                    <button v-if="c.status === 'pending_approval'" class="action-btn action-btn-text" @click="handleApprove(c)" style="color:var(--color-success)">通过</button>
                    <button v-if="c.status === 'pending_approval'" class="action-btn action-btn-text" @click="handleReject(c)" style="color:var(--color-danger)">驳回</button>
                    <button v-if="c.status === 'approved'" class="action-btn action-btn-text" @click="handleSign(c)" style="color:var(--color-success)">签订</button>
                    <button v-if="c.status === 'signed'" class="action-btn action-btn-text" @click="handleArchive(c)" style="color:var(--color-info)">归档</button>
                    <button v-if="c.status === 'approved' || c.status === 'signed'" class="action-btn action-btn-text" @click="handleCancel(c)" style="color:var(--color-danger)">作废</button>
                    <button class="action-btn action-btn-text" @click="handleDuplicate(c)">复制</button>
                    <button class="action-btn action-btn-text" style="color:var(--color-danger)" @click="handleDelete(c)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="totalPages > 1" class="pagination-bar">
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
            <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
            <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredContracts.length }} 条</span>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'list'" class="panel-card">
        <div class="panel-card-body">
          <div v-if="filteredContracts.length === 0" class="empty-state"><div class="empty-state-icon">📄</div>暂无合同数据</div>
          <div v-for="c in filteredContracts" :key="c.id" class="list-item" @click="openPreview(c)">
            <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">✓</div></div>
            <div class="list-item-avatar" :style="{ background: statusColors[c.status] || '#94a3b8' }">{{ (c.contractNo || '?').slice(-3) }}</div>
            <div class="list-item-main">
              <div class="list-item-row1">
                <strong class="list-item-name">{{ c.contractNo }}</strong>
                <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
                <span class="mono">¥{{ formatNumber(c.totalAmount) }}</span>
              </div>
              <div class="list-item-row2">
                <span>{{ c.partyA }}</span>
                <span>{{ c.signDate }}</span>
                <span v-if="c.endDate">到期 {{ c.endDate }}</span>
              </div>
              <div class="list-item-row3">
                <span>{{ c.settlement }}</span>
                <span>{{ c.contractType }}</span>
              </div>
            </div>
            <div class="list-item-actions" @click.stop>
              <button class="action-btn" @click="openWizard(c.id)" title="编辑">✏️</button>
              <button class="action-btn" @click="handleDuplicate(c)" title="复制">📋</button>
              <button class="action-btn danger" @click="handleDelete(c)" title="删除">🗑</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'card'" class="card-grid">
        <div v-if="filteredContracts.length === 0" class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📄</div>暂无合同数据</div>
        <div v-for="c in filteredContracts" :key="c.id" class="contract-card" :class="'card-status-' + c.status">
          <div class="contract-card-header">
            <strong class="mono">{{ c.contractNo }}</strong>
            <span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span>
          </div>
          <div class="contract-card-body">
            <div class="contract-card-field"><span class="field-label">甲方</span><span>{{ c.partyA }}</span></div>
            <div class="contract-card-field"><span class="field-label">金额</span><span class="mono">¥{{ formatNumber(c.totalAmount) }}</span></div>
            <div class="contract-card-field"><span class="field-label">结算方式</span><span>{{ c.settlement }}</span></div>
            <div class="contract-card-field"><span class="field-label">签订日期</span><span>{{ c.signDate }}</span></div>
            <div class="contract-card-field"><span class="field-label">到期日</span><span :style="endDateStyle(c)">{{ c.endDate || '-' }}</span></div>
          </div>
          <div class="contract-card-footer">
            <button class="action-btn" @click="openPreview(c)">👁 预览</button>
            <button class="action-btn" @click="openWizard(c.id)">✏️ 编辑</button>
            <button v-if="c.status === 'draft'" class="action-btn" @click="handleSubmitApproval(c)">📤 审批</button>
            <button v-if="c.status === 'approved'" class="action-btn" @click="handleSign(c)">📝 签订</button>
            <button class="action-btn danger" @click="handleDelete(c)">🗑</button>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'calendar'" class="panel-card">
        <div class="panel-card-body">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="prevMonth">◀ 上月</button>
            <span class="calendar-nav-title">{{ calendarMonth }}</span>
            <button class="btn btn-ghost btn-sm" @click="nextMonth">下月 ▶</button>
          </div>
          <div class="calendar-grid">
            <div class="calendar-header" v-for="d in ['一','二','三','四','五','六','日']" :key="d">周{{ d }}</div>
            <div v-for="(day, idx) in calendarDays" :key="idx" class="calendar-cell" :class="{ 'other-month': !day.isCurrentMonth, 'is-today': day.isToday }">
              <div class="calendar-date">{{ day.day }}</div>
              <div class="calendar-events">
                <div v-for="c in day.contracts.slice(0, 3)" :key="c.id" class="calendar-event" :class="'cal-status-' + c.status" @click="openPreview(c)" :title="c.contractNo + ' ' + (statusLabels[c.status]||'')">
                  <span class="cal-dot" :style="{ background: statusColors[c.status] }"></span>
                  <span class="cal-text">{{ c.contractNo }}</span>
                </div>
                <div v-if="day.contracts.length > 3" class="calendar-more">+{{ day.contracts.length - 3 }}项</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'week'" class="panel-card">
        <div class="panel-card-body">
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" @click="prevWeek">◀ 上一周</button>
            <span class="calendar-nav-title">{{ weekDays[0]?.date }} ~ {{ weekDays[6]?.date }}</span>
            <button class="btn btn-ghost btn-sm" @click="nextWeek">下一周 ▶</button>
          </div>
          <div class="week-grid">
            <div v-for="day in weekDays" :key="day.date" class="week-column" :class="{ 'is-today': day.isToday }">
              <div class="week-column-header">
                <span class="week-day-label">{{ day.label }}</span>
                <span class="week-day-num">{{ day.day }}</span>
              </div>
              <div class="week-column-body">
                <div v-if="day.contracts.length === 0" class="week-empty">无合同</div>
                <div v-for="c in day.contracts" :key="c.id" class="week-event" :class="'cal-status-' + c.status" @click="openPreview(c)">
                  <div class="week-event-header">
                    <span class="cal-dot" :style="{ background: statusColors[c.status] }"></span>
                    <strong>{{ c.contractNo }}</strong>
                  </div>
                  <div class="week-event-detail">{{ c.partyA }}</div>
                  <div class="week-event-detail mono">¥{{ formatNumber(c.totalAmount) }}</div>
                  <span class="status-badge" :class="'status-' + c.status" style="font-size:10px">{{ statusLabels[c.status] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="showWizard" class="modal-overlay" @click.self="closeWizard">
        <div class="modal-dialog modal-lg wizard-dialog">
          <div class="modal-header">
            <h3>{{ isEditing ? '编辑合同' : '新建合同' }}</h3>
            <button class="modal-close" @click="closeWizard">✕</button>
          </div>
          <div class="wizard-steps">
            <div v-for="(s, i) in wizardSteps" :key="i" class="wizard-step" :class="{ active: wizardStep === i + 1, completed: wizardStep > i + 1 }">
              <div class="wizard-step-num">{{ i + 1 }}</div>
              <div class="wizard-step-label">{{ s }}</div>
            </div>
          </div>
          <div class="wizard-body">
            <div v-if="wizardStep === 1" class="form-section">
              <div v-if="!isEditing && !wizardData.sourceQuoteId" class="contract-import-hint">💡 可从报价单导入数据创建合同，选择客户后可关联报价单</div>
              <div v-if="wizardData.sourceQuoteId" class="contract-import-hint">📎 已关联报价单，产品明细将自动导入</div>
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
                    <select v-model="wizardData.partyA" class="form-select" style="flex:1" @change="onPartyAChange">
                      <option value="">{{ partyASelectPlaceholder }}</option>
                      <option v-for="c in customerStore.customers" :key="c.id" :value="c.fullName || c.name">{{ c.fullName || c.name }}</option>
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
                      <td style="text-align:center"><button class="action-btn danger" @click="removeProductRow(idx)" :disabled="wizardData.products.length <= 1">✕</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button class="btn btn-ghost btn-sm" @click="addProductRow" style="margin-top:8px">+ 添加产品行</button>
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
              <div style="margin-top:var(--space-4)"><button class="btn btn-ghost btn-sm" @click="termsEditing = !termsEditing">{{ termsEditing ? '收起编辑' : '✏️ 编辑条款内容' }}</button></div>
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
                    <div v-else class="contract-seal-upload" @click="uploadSeal('A')">点击上传<br />电子签章</div>
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
                      <div v-else class="contract-seal-upload" @click="uploadSeal('B')">点击上传<br />电子签章</div>
                    </div>
                    <div v-else class="contract-seal-area has-seal">苏州冠久<br />新材料科技<br />有限公司</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" v-if="wizardStep > 1" @click="wizardStep--">← 上一步</button>
            <label class="save-template-check" style="display:flex;align-items:center;gap:6px;margin-left:auto;cursor:pointer;font-size:13px;">
              <input type="checkbox" v-model="saveAsTemplateFlag"> 另存为模板
            </label>
            <button class="btn btn-ghost" @click="saveDraft">保存草稿</button>
            <button class="btn btn-primary" v-if="wizardStep < 4" @click="nextStep">下一步 →</button>
            <button class="btn btn-primary" v-if="wizardStep === 4" @click="submitContract">提交审批</button>
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
        <div class="modal-dialog modal-lg preview-dialog">
          <div class="modal-header">
            <h3>合同预览 - {{ previewContract?.contractNo }}</h3>
            <button class="modal-close" @click="showPreview = false">✕</button>
          </div>
          <div class="preview-tabs">
            <button class="preview-tab" :class="{ active: previewTab === 'content' }" @click="previewTab = 'content'">📄 合同内容</button>
            <button class="preview-tab" :class="{ active: previewTab === 'attachment' }" @click="previewTab = 'attachment'">📎 附件</button>
            <button class="preview-tab" :class="{ active: previewTab === 'history' }" @click="previewTab = 'history'">📜 变更记录</button>
            <button class="preview-tab" :class="{ active: previewTab === 'related' }" @click="previewTab = 'related'">🔗 关联单据</button>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="exportPDF">🖨 打印/导出</button>
          </div>
          <div class="preview-body">
            <div v-if="previewTab === 'content'" class="contract-preview-content">
              <div class="contract-doc-title">{{ (previewContract?.contractType || '购销合同').split('').join(' ') }}</div>
              <div class="contract-doc-subtitle">合同编号：{{ previewContract?.contractNo }}</div>
              <hr style="border:none;border-top:2px solid #1a1a1a;margin:12px 0" />
              <div class="contract-info-grid">
                <div class="contract-info-row"><span class="contract-info-label">{{ previewContract?.contractType === '采购合同' ? '甲方（买方）：' : '甲方（需方）：' }}</span><span class="contract-info-value">{{ previewContract?.partyA }}</span></div>
                <div class="contract-info-row"><span class="contract-info-label">{{ previewContract?.contractType === '采购合同' ? '乙方（卖方）：' : '乙方（供方）：' }}</span><span class="contract-info-value">{{ previewContract?.partyB || '苏州冠久新材料科技有限公司' }}</span></div>
                <div class="contract-info-row"><span class="contract-info-label">签订地点：</span><span class="contract-info-value">{{ previewContract?.signPlace }}</span></div>
                <div class="contract-info-row"><span class="contract-info-label">签订日期：</span><span class="contract-info-value">{{ previewContract?.signDate }}</span></div>
                <div class="contract-info-row"><span class="contract-info-label">有效期至：</span><span class="contract-info-value">{{ previewContract?.endDate || '未设定' }}</span></div>
                <div class="contract-info-row"><span class="contract-info-label">结算方式：</span><span class="contract-info-value">{{ previewContract?.settlement || '款到发货' }}</span></div>
              </div>
              <div class="contract-section-title">产品明细</div>
              <table class="contract-table">
                <thead><tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>数量(KG)</th><th>含税单价(元/KG)</th><th>金额(元)</th><th>交货地点</th><th>备注</th></tr></thead>
                <tbody>
                  <tr v-for="(p, i) in (previewContract?.products || [])" :key="i">
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
              <div v-if="previewContract && (previewContract.status === 'signed' || previewContract.status === 'archived')" class="contract-exec-progress">
                <div class="contract-section-title">执行进度</div>
                <div style="margin:10px 0;padding:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary)">
                  <div style="margin:6px 0;font-size:10.5pt"><strong>💰 回款进度：</strong>¥{{ formatNumber(previewReceivedAmount) }} / ¥{{ formatNumber(previewTotalAmount) }} ({{ previewReceivedRatio }}%)</div>
                  <div style="background:var(--color-bg-tertiary);height:12px;border-radius:6px;overflow:hidden;margin:4px 0"><div style="background:#22c55e;height:100%;border-radius:6px;transition:width 0.3s" :style="{ width: previewReceivedRatio + '%' }"></div></div>
                </div>
              </div>
              <div class="contract-signature">
                <div class="contract-signature-block">
                  <div style="font-weight:bold;margin-bottom:8px">{{ previewContract?.contractType === '采购合同' ? '甲方（买方）' : '甲方（需方）' }}：{{ previewContract?.partyA }}</div>
                  <div>住所：<span class="contract-signature-line"></span></div>
                  <div>签约代表：<span class="contract-signature-line"></span></div>
                  <div>联系方式：<span class="contract-signature-line"></span></div>
                  <div>日期：<span class="contract-signature-line"></span></div>
                  <div v-if="previewContract?.partyAInfo?.seal" style="text-align:center;margin-top:10px"><img :src="previewContract.partyAInfo.seal" style="width:100px;height:100px;border-radius:50%;object-fit:cover;opacity:0.7" /></div>
                  <div v-else class="contract-seal-area">甲方<br />签章区</div>
                </div>
                <div class="contract-signature-block">
                  <div style="font-weight:bold;margin-bottom:8px">{{ previewContract?.contractType === '采购合同' ? '乙方（卖方）' : '乙方（供方）' }}：苏州冠久新材料科技有限公司</div>
                  <div>住所：苏州高新区滨河路3337号</div>
                  <div>签约代表：宋建</div>
                  <div>联系方式：15589233039</div>
                  <div>日期：{{ previewContract?.partyBInfo?.date || '-' }}</div>
                  <div class="contract-seal-area has-seal">苏州冠久<br />新材料科技<br />有限公司</div>
                </div>
              </div>
            </div>

            <div v-if="previewTab === 'attachment'" class="preview-attachments">
              <div class="attachment-upload">
                <input ref="attInput" type="file" style="display:none" @change="handleAttUpload" />
                <button class="btn btn-primary btn-sm" @click="$refs.attInput.click()">📎 上传附件</button>
              </div>
              <div v-if="previewAttachments.length === 0" class="empty-hint">暂无附件</div>
              <div v-for="att in previewAttachments" :key="att.id" class="attachment-item">
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">{{ att.name }}</span>
                <span class="attachment-size">{{ (att.size / 1024).toFixed(1) }}KB</span>
                <span class="attachment-date">{{ att.uploadedAt?.split('T')[0] }}</span>
                <button class="action-btn danger" @click="removeAttachment(att.id)">✕</button>
              </div>
            </div>

            <div v-if="previewTab === 'history'" class="preview-history">
              <div v-if="previewHistory.length === 0" class="empty-hint">暂无变更记录</div>
              <div class="history-timeline">
                <div v-for="ev in previewHistory" :key="ev.time + ev.type" class="history-event">
                  <div class="history-dot" :style="{ background: historyTypeColors[ev.type] || 'var(--color-text-secondary)' }"></div>
                  <div class="history-content">
                    <div class="history-label">{{ ev.label }}</div>
                    <div class="history-meta">{{ formatDateTime(ev.time) }} · {{ ev.user }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="previewTab === 'related'" class="preview-related">
              <div class="related-section">
                <div class="related-section-title">📋 关联报价单</div>
                <div v-if="relatedDocuments.quotations.length === 0" class="empty-hint">暂无关联报价单</div>
                <div v-for="doc in relatedDocuments.quotations" :key="doc.id" class="related-doc-item">
                  <div class="related-doc-icon">{{ doc.typeIcon }}</div>
                  <div class="related-doc-main">
                    <div class="related-doc-header">
                      <span class="related-doc-no">{{ doc.docNo }}</span>
                      <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
                    </div>
                    <div class="related-doc-meta">
                      <span>{{ doc.customerName }}</span>
                      <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
                      <span>{{ doc.date }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="related-section">
                <div class="related-section-title">🚚 关联交付单</div>
                <div v-if="relatedDocuments.deliveries.length === 0" class="empty-hint">暂无关联交付单</div>
                <div v-for="doc in relatedDocuments.deliveries" :key="doc.id" class="related-doc-item">
                  <div class="related-doc-icon">{{ doc.typeIcon }}</div>
                  <div class="related-doc-main">
                    <div class="related-doc-header">
                      <span class="related-doc-no">{{ doc.docNo }}</span>
                      <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
                    </div>
                    <div class="related-doc-meta">
                      <span>{{ doc.customerName }}</span>
                      <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
                      <span>{{ doc.date }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="related-section">
                <div class="related-section-title">💰 关联回款单</div>
                <div v-if="relatedDocuments.collections.length === 0" class="empty-hint">暂无关联回款单</div>
                <div v-for="doc in relatedDocuments.collections" :key="doc.id" class="related-doc-item">
                  <div class="related-doc-icon">{{ doc.typeIcon }}</div>
                  <div class="related-doc-main">
                    <div class="related-doc-header">
                      <span class="related-doc-no">{{ doc.docNo }}</span>
                      <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
                    </div>
                    <div class="related-doc-meta">
                      <span>{{ doc.customerName }}</span>
                      <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
                      <span>{{ doc.date }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
        <div class="modal-dialog" style="max-width:600px">
          <div class="modal-header">
            <h3>合同模板管理</h3>
            <button class="modal-close" @click="showTemplateModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="template-upload-area">
              <div class="upload-zone" @click="triggerContractTemplateUpload" @dragover.prevent @drop.prevent="handleContractTemplateDrop">
                <div class="upload-icon">🤖</div>
                <div class="upload-text">AI智能识别合同</div>
                <div class="upload-hint">点击上传或拖拽文件（支持PDF/Word/Excel/图片）</div>
                <input ref="contractTemplateFileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" @change="handleContractTemplateFileSelect" />
              </div>
              <div v-if="aiParsing" class="ai-parsing-hint">🤖 AI正在识别中...</div>
            </div>
            <div v-if="contractStore.templates.length === 0" class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div>暂无合同模板</div>
              <div style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-top:8px">创建合同后可保存为模板，方便复用</div>
            </div>
            <div v-for="tpl in contractStore.templates" :key="tpl.id" class="template-card">
              <div class="template-card-header">
                <div>
                  <span class="template-card-title">{{ tpl.name }}</span>
                  <span class="template-type-tag">{{ tpl.contractType || '购销合同' }}</span>
                </div>
                <div class="template-card-actions">
                  <button class="btn btn-primary btn-sm" @click="useTemplate(tpl)">使用模板</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteTemplate(tpl.id)">删除</button>
                </div>
              </div>
              <div class="template-card-meta">版本: {{ tpl.version || 'v1.0' }} | 创建: {{ tpl.createdAt || '-' }} | 结算方式: {{ tpl.settlement || '-' }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showTemplateModal = false">关闭</button>
            <button class="btn btn-primary" @click="saveCurrentAsTemplate">💾 保存当前合同为模板</button>
          </div>
        </div>
      </div>

      <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
        <div class="modal-dialog" style="max-width:450px">
          <div class="modal-header">
            <h3>驳回合同</h3>
            <button class="modal-close" @click="showRejectModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">驳回原因</label>
              <textarea v-model="rejectReason" class="form-textarea" rows="3" placeholder="请输入驳回原因..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showRejectModal = false">取消</button>
            <button class="btn btn-primary" style="background:var(--color-danger);border-color:var(--color-danger)" @click="confirmReject">确认驳回</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useContractStore } from '@/stores/contract'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useCollectionStore } from '@/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import { numberToChinese } from '@/utils/numberToChinese.js'

const contractStore = useContractStore()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()

const isPurchaseType = computed(() => wizardData.value.contractType === '采购合同')
const partyALabel = computed(() => isPurchaseType.value ? '甲方（买方）' : '甲方（需方）')
const partyBLabel = computed(() => isPurchaseType.value ? '乙方（卖方）' : '乙方（供方）')
const partyASelectPlaceholder = computed(() => isPurchaseType.value ? '请选择供应商' : '请选择客户')
const partyAManualPlaceholder = computed(() => isPurchaseType.value ? '或手动输入供应商名称' : '或手动输入')

const statusLabels = {
  draft: '草稿', pending_approval: '待审批', approved: '已审批',
  signed: '已签订', archived: '已归档', cancelled: '已作废'
}
const statusColors = {
  draft: '#64748b', pending_approval: '#f59e0b', approved: '#3b82f6',
  signed: '#22c55e', archived: '#06b6d4', cancelled: '#ef4444'
}
const historyTypeColors = {
  create: 'var(--color-info)', submit: 'var(--color-warning)', approve: 'var(--color-success)',
  reject: 'var(--color-danger)', sign: 'var(--color-success)', edit: 'var(--color-text-secondary)',
  pending_approval: 'var(--color-warning)', signed: 'var(--color-success)',
  archived: 'var(--color-info)', cancelled: 'var(--color-danger)', draft: '#64748b'
}

const viewModes = [
  { key: 'table', label: '表格' },
  { key: 'list', label: '列表' },
  { key: 'card', label: '卡片' },
  { key: 'calendar', label: '日历' },
  { key: 'week', label: '周视图' }
]
const wizardSteps = ['基本信息', '产品明细', '合同条款', '签约信息']

const currentView = ref('table')
const showAnalytics = ref(false)
const searchText = ref('')
const filterStatus = ref('')
const filterSettlement = ref('')
const filterType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAmountMin = ref(0)
const filterAmountMax = ref(0)
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = 15

const filteredContracts = computed(() => {
  let list = contractStore.contracts
  const s = searchText.value.toLowerCase()
  if (s) {
    list = list.filter(c =>
      (c.contractNo || '').toLowerCase().includes(s) ||
      (c.partyA || '').toLowerCase().includes(s) ||
      (c.contractType || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) list = list.filter(c => c.status === filterStatus.value)
  if (filterSettlement.value) list = list.filter(c => c.settlement === filterSettlement.value)
  if (filterType.value) list = list.filter(c => (c.contractType || '购销合同') === filterType.value)
  if (filterDateFrom.value) list = list.filter(c => c.signDate && c.signDate >= filterDateFrom.value)
  if (filterDateTo.value) list = list.filter(c => c.signDate && c.signDate <= filterDateTo.value)
  if (filterAmountMin.value > 0) list = list.filter(c => (c.totalAmount || 0) >= filterAmountMin.value * 10000)
  if (filterAmountMax.value > 0) list = list.filter(c => (c.totalAmount || 0) <= filterAmountMax.value * 10000)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredContracts.value.length / pageSize)))
const pagedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredContracts.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  const pages = []
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i)
  return pages
})

const isAllSelected = computed(() =>
  pagedContracts.value.length > 0 && pagedContracts.value.every(c => selectedIds.value.includes(c.id))
)

const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
const weekViewDate = ref(new Date())

const calendarDays = computed(() => {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days = []
  for (let i = 1 - startPad; i <= lastDay.getDate(); i++) {
    const d = new Date(y, m - 1, i)
    const dateStr = d.toISOString().split('T')[0]
    const contracts = filteredContracts.value.filter(c => c.signDate === dateStr || c.endDate === dateStr)
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: d.getMonth() === m - 1, contracts, isToday: dateStr === new Date().toISOString().split('T')[0] })
  }
  return days
})

const weekDays = computed(() => {
  const base = new Date(weekViewDate.value)
  const dow = (base.getDay() + 6) % 7
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)
  const days = []
  const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const contracts = filteredContracts.value.filter(c => c.signDate === dateStr || c.endDate === dateStr)
    days.push({ date: dateStr, day: d.getDate(), label: weekLabels[i], contracts, isToday: dateStr === new Date().toISOString().split('T')[0] })
  }
  return days
})

function prevMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 1) calendarMonth.value = (y - 1) + '-12'
  else calendarMonth.value = y + '-' + String(m - 1).padStart(2, '0')
}

function nextMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 12) calendarMonth.value = (y + 1) + '-01'
  else calendarMonth.value = y + '-' + String(m + 1).padStart(2, '0')
}

function prevWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() - 7)
  weekViewDate.value = d
}

function nextWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() + 7)
  weekViewDate.value = d
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !pagedContracts.value.some(c => c.id === id))
  } else {
    for (const c of pagedContracts.value) {
      if (!selectedIds.value.includes(c.id)) selectedIds.value.push(c.id)
    }
  }
}

function barWidth(key) {
  const total = contractStore.contracts.length
  if (total === 0) return '0%'
  return ((contractStore.statusCounts[key] || 0) / total * 100).toFixed(0) + '%'
}

function endDateStyle(c) {
  if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) return {}
  const days = Math.floor((new Date(c.endDate) - new Date()) / 86400000)
  if (days <= 0) return { color: 'var(--color-danger)', fontWeight: '700', textDecoration: 'line-through' }
  if (days <= 7) return { color: 'var(--color-danger)', fontWeight: '700' }
  if (days <= 30) return { color: 'var(--color-warning)', fontWeight: '600' }
  return {}
}

function getPaymentDate(c) {
  if (!c.signDate || !c.settlement) return '-'
  const signDate = new Date(c.signDate)
  const match = c.settlement.match(/(\d+)/)
  if (match) {
    const days = parseInt(match[1])
    signDate.setDate(signDate.getDate() + days)
    return signDate.toISOString().split('T')[0]
  }
  return c.endDate || '-'
}

function getFirstUnitPrice(c) {
  try {
    const products = c.products
    if (Array.isArray(products) && products.length > 0 && products[0].unitPrice) {
      return '¥' + parseFloat(products[0].unitPrice).toFixed(2)
    }
  } catch { /* ignore */ }
  return '-'
}

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

const showWizard = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const wizardStep = ref(1)
const termsEditing = ref(false)
const wizardData = ref({})
const saveAsTemplateFlag = ref(false)

function getDefaultWizardData() {
  return {
    contractType: '购销合同',
    contractNo: '',
    partyA: '',
    partyAId: '',
    partyB: '苏州冠久新材料科技有限公司',
    signPlace: '苏州・高新区',
    signDate: new Date().toISOString().split('T')[0],
    endDate: '',
    settlement: '款到发货',
    products: [{ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' }],
    totalAmount: 0,
    terms: contractStore.getDefaultTerms(),
    partyAInfo: { address: '', representative: '', contact: '', date: new Date().toISOString().split('T')[0], seal: '' },
    partyBInfo: { companyName: '苏州冠久新材料科技有限公司', address: '苏州高新区滨河路3337号', representative: '宋建', contact: '15589233039', date: new Date().toISOString().split('T')[0], seal: 'preset' },
    status: 'draft',
    sourceQuoteId: '',
    notes: ''
  }
}

function openWizard(editId) {
  wizardStep.value = 1
  termsEditing.value = false
  if (editId) {
    const c = contractStore.getContractById(editId)
    if (!c) { alert('未找到该合同'); return }
    isEditing.value = true
    editingId.value = editId
    wizardData.value = JSON.parse(JSON.stringify(c))
  } else {
    isEditing.value = false
    editingId.value = null
    wizardData.value = getDefaultWizardData()
  }
  showWizard.value = true
  document.body.style.overflow = 'hidden'
}

function closeWizard() {
  showWizard.value = false
  document.body.style.overflow = ''
  wizardStep.value = 1
  editingId.value = null
}

const productsTotal = computed(() => {
  return wizardData.value.products?.reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0) || 0
})

function addProductRow() {
  wizardData.value.products.push({ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' })
}

function removeProductRow(idx) {
  wizardData.value.products.splice(idx, 1)
  if (wizardData.value.products.length === 0) {
    wizardData.value.products.push({ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' })
  }
}

function onPartyAChange() {
  const name = wizardData.value.partyA
  const c = customerStore.customers.find(x => (x.fullName || x.name) === name)
  if (c) {
    wizardData.value.partyAId = c.id
    wizardData.value.partyAInfo = wizardData.value.partyAInfo || {}
    if (c.address) wizardData.value.partyAInfo.address = c.address
    if (c.contact || c.contactName) wizardData.value.partyAInfo.representative = c.contact || c.contactName
    if (c.phone) wizardData.value.partyAInfo.contact = c.phone
  }
}

function uploadSeal(party) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (party === 'A') {
        wizardData.value.partyAInfo.seal = e.target.result
        wizardData.value.partyAInfo.sealTimestamp = new Date().toISOString()
      } else if (party === 'B') {
        wizardData.value.partyBInfo.seal = e.target.result
        wizardData.value.partyBInfo.sealTimestamp = new Date().toISOString()
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function nextStep() {
  const d = wizardData.value
  if (wizardStep.value === 1) {
    const existing = contractStore.contracts.filter(c => c.contractNo === d.contractNo && c.id !== editingId.value)
    if (d.contractNo && existing.length > 0) { alert('合同编号 ' + d.contractNo + ' 已存在'); return }
    if (d.endDate && d.signDate && d.endDate < d.signDate) { alert('到期日期不能早于签订日期'); return }
  }
  if (wizardStep.value === 2) {
    const hasValid = d.products.some(p => p.productName && p.quantity > 0 && p.unitPrice > 0)
    if (!hasValid) { alert('请至少添加一条完整的产品明细'); return }
    for (let i = 0; i < d.products.length; i++) {
      if (d.products[i].quantity < 0) { alert('第' + (i + 1) + '行数量不能为负数'); return }
      if (d.products[i].unitPrice < 0) { alert('第' + (i + 1) + '行单价不能为负数'); return }
    }
    d.totalAmount = Math.round(productsTotal.value * 100) / 100
  }
  if (wizardStep.value < 4) wizardStep.value++
}

function saveDraft() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'draft'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
  } else {
    contractStore.addContract(d)
    editingId.value = contractStore.contracts[contractStore.contracts.length - 1].id
    isEditing.value = true
  }
  if (saveAsTemplateFlag.value) {
    const name = prompt('请输入模板名称：', '标准购销合同模板')
    if (name) {
      contractStore.addTemplate({
        name,
        contractType: d.contractType,
        settlement: d.settlement,
        terms: JSON.parse(JSON.stringify(d.terms || {})),
        partyBInfo: JSON.parse(JSON.stringify(d.partyBInfo || {})),
        products: JSON.parse(JSON.stringify(d.products || []))
      })
    }
    saveAsTemplateFlag.value = false
  }
  alert('草稿已保存，合同编号: ' + d.contractNo)
}

function submitContract() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'pending_approval'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
    contractStore.addHistoryEvent(editingId.value, 'submit', d.contractNo + ' 提交审批')
  } else {
    const c = contractStore.addContract(d)
    contractStore.addHistoryEvent(c.id, 'submit', c.contractNo + ' 提交审批')
  }
  if (saveAsTemplateFlag.value) {
    const name = prompt('请输入模板名称：', '标准购销合同模板')
    if (name) {
      contractStore.addTemplate({
        name,
        contractType: d.contractType,
        settlement: d.settlement,
        terms: JSON.parse(JSON.stringify(d.terms || {})),
        partyBInfo: JSON.parse(JSON.stringify(d.partyBInfo || {})),
        products: JSON.parse(JSON.stringify(d.products || []))
      })
    }
    saveAsTemplateFlag.value = false
  }
  closeWizard()
  alert('合同已提交审批')
}

function handleSubmitApproval(c) {
  if (c.status !== 'draft') { alert('只有草稿状态的合同才能提交审批'); return }
  contractStore.changeStatus(c.id, 'pending_approval')
}

function handleApprove(c) {
  if (c.status !== 'pending_approval') { alert('该合同不在待审批状态'); return }
  if (confirm('确认审批通过合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'approved')
  }
}

const showRejectModal = ref(false)
const rejectTargetId = ref(null)
const rejectReason = ref('')

function handleReject(c) {
  if (c.status !== 'pending_approval') { alert('该合同不在待审批状态'); return }
  rejectTargetId.value = c.id
  rejectReason.value = ''
  showRejectModal.value = true
}

function confirmReject() {
  contractStore.changeStatus(rejectTargetId.value, 'draft', { reason: rejectReason.value })
  showRejectModal.value = false
}

function handleSign(c) {
  if (c.status !== 'approved') { alert('只有已审批的合同才能签订'); return }
  if (confirm('确认签订合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'signed')
  }
}

function handleArchive(c) {
  if (c.status !== 'signed') { alert('只有已签订的合同才能归档'); return }
  if (confirm('确认归档合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'archived')
  }
}

function handleCancel(c) {
  if (c.status !== 'approved' && c.status !== 'signed') { alert('只有已审批或已签订的合同才能作废'); return }
  if (confirm('确认作废合同 ' + c.contractNo + '？作废后不可恢复。')) {
    contractStore.changeStatus(c.id, 'cancelled')
  }
}

function handleDuplicate(c) {
  const dup = contractStore.duplicateContract(c.id)
  if (dup) alert('已复制合同 ' + c.contractNo + '，新单号：' + dup.contractNo)
}

function handleDelete(c) {
  if (confirm('确认删除合同 ' + c.contractNo + '？此操作不可恢复。')) {
    contractStore.deleteContract(c.id)
    selectedIds.value = selectedIds.value.filter(id => id !== c.id)
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条合同？')) {
    contractStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  const fmt = prompt('请选择导出格式：\n1 - JSON（完整数据）\n2 - CSV（表格数据）\n\n请输入 1 或 2', '2')
  if (fmt === null) return
  if (fmt === '1' || fmt.trim() === '1') {
    const data = JSON.stringify(contractStore.contracts, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contracts_export.json'
    a.click()
    URL.revokeObjectURL(url)
  } else {
    const headers = ['合同编号', '合同类型', '甲方', '乙方', '签订日期', '到期日', '金额', '结算方式', '状态', '签订地点']
    const statusMap = { draft: '草稿', pending_approval: '待审批', approved: '已审批', signed: '已签订', archived: '已归档', cancelled: '已作废' }
    const rows = contractStore.contracts.map(c => [
      c.contractNo, c.contractType, c.partyA, c.partyB || '苏州冠久新材料科技有限公司',
      c.signDate, c.endDate, c.totalAmount, c.settlement, statusMap[c.status] || c.status, c.signPlace
    ])
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contracts_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
}

const showPreview = ref(false)
const previewContract = ref(null)
const previewTab = ref('content')
const previewAttachments = ref([])
const previewHistory = ref([])

const previewTotalAmount = computed(() => {
  if (!previewContract.value) return 0
  return previewContract.value.products?.reduce((s, p) => s + (p.amount || (p.quantity || 0) * (p.unitPrice || 0)), 0) || previewContract.value.totalAmount || 0
})

const previewTermsList = computed(() => {
  if (!previewContract.value?.terms) return []
  const t = previewContract.value.terms
  const settlement = previewContract.value.settlement || '款到发货'
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
  if (!previewContract.value) return 0
  try {
    const raw = localStorage.getItem('gj_erp_collections')
    const collections = raw ? JSON.parse(raw) : []
    const c = previewContract.value
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

const relatedDocuments = computed(() => {
  if (!previewContract.value) return { quotations: [], deliveries: [], collections: [] }
  const c = previewContract.value
  const customerName = c.partyA
  const contractNo = c.contractNo
  const sourceQuoteId = c.sourceQuoteId
  const quotations = quotationStore.quotations.filter(q =>
    q.id === sourceQuoteId ||
    q.customerName === customerName ||
    (q.quoteNo && c.notes && c.notes.includes(q.quoteNo))
  ).map(q => ({
    id: q.id, docNo: q.quoteNo, type: '报价单', typeIcon: '📋',
    customerName: q.customerName, date: q.date || q.createdAt,
    amount: q.total || q.totalAmount || 0,
    status: q.status, statusLabel: quotationStatusMap[q.status] || q.status
  }))
  const deliveries = deliveryStore.deliveries.filter(d =>
    d.customerName === customerName ||
    (d.contractNo && d.contractNo === contractNo)
  ).map(d => ({
    id: d.id, docNo: d.deliveryNo, type: '交付单', typeIcon: '🚚',
    customerName: d.customerName, date: d.date || d.createdAt,
    amount: d.totalAmount || 0,
    status: d.status, statusLabel: deliveryStatusMap[d.status] || d.status
  }))
  const collections = collectionStore.collections.filter(col =>
    col.customerName === customerName ||
    (col.contractNo && col.contractNo === contractNo)
  ).map(col => ({
    id: col.id, docNo: col.collectionNo, type: '回款单', typeIcon: '💰',
    customerName: col.customerName, date: col.date,
    amount: col.amount || 0,
    status: col.status, statusLabel: collectionStatusMap[col.status] || col.status
  }))
  return { quotations, deliveries, collections }
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

function getRelatedCount(c) {
  const customerName = c.partyA
  const contractNo = c.contractNo
  const sourceQuoteId = c.sourceQuoteId
  let count = 0
  count += quotationStore.quotations.filter(q =>
    q.id === sourceQuoteId || q.customerName === customerName || (q.quoteNo && c.notes && c.notes.includes(q.quoteNo))
  ).length
  count += deliveryStore.deliveries.filter(d =>
    d.customerName === customerName || (d.contractNo && d.contractNo === contractNo)
  ).length
  count += collectionStore.collections.filter(col =>
    col.customerName === customerName || (col.contractNo && col.contractNo === contractNo)
  ).length
  return count
}

function openPreview(c) {
  previewContract.value = c
  previewTab.value = 'content'
  previewAttachments.value = contractStore.getAttachments(c.id)
  previewHistory.value = contractStore.getHistory(c.id)
  showPreview.value = true
  document.body.style.overflow = 'hidden'
}

function handleAttUpload(e) {
  const file = e.target.files[0]
  if (!file || !previewContract.value) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    contractStore.addAttachment(previewContract.value.id, {
      name: file.name,
      size: file.size,
      type: file.type,
      data: ev.target.result
    })
    previewAttachments.value = contractStore.getAttachments(previewContract.value.id)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removeAttachment(attId) {
  if (!previewContract.value) return
  contractStore.deleteAttachment(previewContract.value.id, attId)
  previewAttachments.value = contractStore.getAttachments(previewContract.value.id)
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

const showTemplateModal = ref(false)
const contractTemplateFileInput = ref(null)
const aiParsing = ref(false)

function triggerContractTemplateUpload() {
  contractTemplateFileInput.value?.click()
}

function handleContractTemplateFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function handleContractTemplateDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function parseContractTemplateFile(file) {
  aiParsing.value = true
  setTimeout(() => {
    aiParsing.value = false
    const name = prompt('AI识别完成，请确认模板名称：', file.name.replace(/\.[^.]+$/, ''))
    if (name) {
      contractStore.addTemplate({
        name,
        contractType: '购销合同',
        settlement: '款到发货',
        terms: contractStore.getDefaultTerms(),
        partyBInfo: { companyName: '苏州冠久新材料科技有限公司', address: '苏州高新区滨河路3337号', representative: '宋建', contact: '15589233039' }
      })
      alert('模板"' + name + '"已通过AI识别创建，请编辑确认详细信息')
    }
  }, 2000)
}

function openTemplateManager() {
  showTemplateModal.value = true
  document.body.style.overflow = 'hidden'
}

function useTemplate(tpl) {
  showTemplateModal.value = false
  const data = getDefaultWizardData()
  data.contractType = tpl.contractType || data.contractType
  data.terms = JSON.parse(JSON.stringify(tpl.terms || {}))
  data.settlement = tpl.settlement || data.settlement
  data.partyBInfo = JSON.parse(JSON.stringify(tpl.partyBInfo || {}))
  if (tpl.products && tpl.products.length > 0) {
    data.products = JSON.parse(JSON.stringify(tpl.products))
  }
  wizardData.value = data
  isEditing.value = false
  editingId.value = null
  wizardStep.value = 1
  showWizard.value = true
}

function deleteTemplate(id) {
  if (confirm('确认删除该模板？')) {
    contractStore.deleteTemplate(id)
  }
}

function saveCurrentAsTemplate() {
  const name = prompt('请输入模板名称：', '标准购销合同模板')
  if (!name) return
  contractStore.addTemplate({
    name,
    settlement: wizardData.value.settlement,
    terms: JSON.parse(JSON.stringify(wizardData.value.terms || {})),
    partyBInfo: JSON.parse(JSON.stringify(wizardData.value.partyBInfo || {}))
  })
  alert('模板"' + name + '"已保存')
}

watch([searchText, filterStatus, filterSettlement, filterType], () => { currentPage.value = 1 })

watch(() => wizardData.value.contractType, (newType, oldType) => {
  if (newType === oldType || !oldType) return
  if (newType === '采购合同') {
    const currentPartyA = wizardData.value.partyA
    if (currentPartyA && currentPartyA !== '苏州冠久新材料科技有限公司') {
      wizardData.value._savedPartyA = currentPartyA
    }
    wizardData.value.partyA = '苏州冠久新材料科技有限公司'
    wizardData.value.partyAInfo = {
      address: '苏州高新区滨河路3337号',
      representative: '宋建',
      contact: '15589233039',
      date: new Date().toISOString().split('T')[0],
      seal: 'preset'
    }
    wizardData.value.partyB = ''
    wizardData.value.partyBInfo = { companyName: '', address: '', representative: '', contact: '', date: new Date().toISOString().split('T')[0], seal: '' }
  } else if (oldType === '采购合同') {
    wizardData.value.partyA = wizardData.value._savedPartyA || ''
    wizardData.value.partyAInfo = { address: '', representative: '', contact: '', date: new Date().toISOString().split('T')[0], seal: '' }
    wizardData.value.partyB = '苏州冠久新材料科技有限公司'
    wizardData.value.partyBInfo = { companyName: '苏州冠久新材料科技有限公司', address: '苏州高新区滨河路3337号', representative: '宋建', contact: '15589233039', date: new Date().toISOString().split('T')[0], seal: 'preset' }
  }
})

function resetFilters() {
  searchText.value = ''
  filterStatus.value = ''
  filterSettlement.value = ''
  filterType.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAmountMin.value = 0
  filterAmountMax.value = 0
}

onMounted(() => {
  contractStore.initSeedData()
  contractStore.initTemplateSeedData()
})
</script>

<style scoped>
.contract-page { max-width: 100%; margin: calc(var(--space-6) * -1); min-height: calc(100vh - var(--topbar-height)); padding: var(--space-6); background: var(--color-bg-primary); }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 4px 0 0; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: 6px 14px; font-size: var(--font-size-base); border: none; background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s; }
.view-btn + .view-btn { border-left: 1px solid var(--color-border); }
.view-btn.active { background: var(--color-accent); color: #fff; }

.contract-toolbar { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.contract-search { position: relative; min-width: 200px; flex: 1 1 200px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; height: 34px; padding: 0 12px 0 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: var(--color-accent); }
.filter-select { height: 34px; min-width: 110px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-date-group { display: flex; align-items: center; gap: 4px; }
.filter-date { height: 34px; width: 130px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-date-sep { color: var(--color-text-tertiary); font-size: 12px; flex-shrink: 0; }
.filter-amount { height: 34px; width: 100px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-reset-btn { height: 34px; white-space: nowrap; }

.contract-stats-bar { display: flex; gap: var(--space-4); padding: 10px 16px; background: var(--color-bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 13px; flex-wrap: wrap; align-items: center; }
.stat-item { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.draft { background: #64748b; }
.stat-dot.pending { background: #f59e0b; }
.stat-dot.approved { background: #3b82f6; }
.stat-dot.signed { background: #22c55e; }
.stat-dot.expiring { background: #f59e0b; }
.stat-money { font-weight: 600; color: var(--color-text-primary); }

.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 16px; background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 13px; }

.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-draft { background: rgba(100,116,139,0.2); color: #94a3b8; }
.status-pending_approval { background: rgba(245,158,11,0.2); color: #fbbf24; }
.status-approved { background: rgba(59,130,246,0.2); color: #60a5fa; }
.status-signed { background: rgba(34,197,94,0.2); color: #4ade80; }
.status-archived { background: rgba(6,182,212,0.2); color: #22d3ee; }
.status-cancelled { background: rgba(239,68,68,0.2); color: #f87171; }

.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
.text-success { color: var(--color-success, #22c55e); }
.text-warning { color: var(--color-warning, #f59e0b); }
.text-danger { color: var(--color-danger, #ef4444); }
.text-accent { color: var(--color-accent); }
.text-muted { color: var(--color-text-tertiary); }

.cell-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.action-btn { padding: 3px 6px; font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }
.action-btn.danger { color: var(--color-danger); }

.checkbox { width: 16px; height: 16px; border: 1.5px solid var(--color-border); border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all 0.15s; user-select: none; }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

.empty-state { text-align: center; padding: 40px; color: var(--color-text-tertiary); }
.empty-state-icon { font-size: 36px; margin-bottom: 12px; }

.pagination-bar { display: flex; align-items: center; gap: 4px; padding: 8px 16px; }
.pagination-btn { padding: 4px 10px; font-size: 12px; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-surface); cursor: pointer; }
.pagination-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-info { font-size: 12px; color: var(--color-text-tertiary); margin-left: 8px; }

.analytics-panel { margin-bottom: var(--space-4); }
.analytics-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
.kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; text-align: center; }
.kpi-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); }
.kpi-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
.bar-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.bar-label { width: 60px; font-size: 12px; }
.bar-track { flex: 1; height: 20px; background: var(--color-bg-tertiary); border-radius: var(--radius-sm); overflow: hidden; }
.bar-fill { height: 100%; border-radius: var(--radius-sm); transition: width 0.3s; }
.bar-value { font-size: 12px; min-width: 30px; text-align: right; }
.top-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.top-rank { width: 24px; font-weight: 700; color: var(--color-accent); }
.top-name { flex: 1; }
.top-amount { font-weight: 600; }
.empty-hint { text-align: center; color: var(--color-text-tertiary); padding: 20px; }

.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.15s; }
.list-item:hover { background: var(--color-bg-secondary); }
.list-item-check { flex-shrink: 0; }
.list-item-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.list-item-main { flex: 1; min-width: 0; }
.list-item-row1 { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.list-item-name { font-size: 14px; }
.list-item-row2 { display: flex; gap: 12px; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 2px; }
.list-item-row3 { display: flex; gap: 12px; font-size: 12px; }
.list-item-actions { display: flex; gap: 4px; flex-shrink: 0; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); }
.contract-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; transition: box-shadow 0.15s; }
.contract-card:hover { box-shadow: var(--shadow-md); }
.contract-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.contract-card-body { padding: 12px 16px; }
.contract-card-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.field-label { color: var(--color-text-secondary); }
.contract-card-footer { display: flex; gap: 4px; padding: 8px 16px; border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); flex-wrap: wrap; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 20px; z-index: 1000; overflow-y: auto; }
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
.wizard-step.completed::after { content: ' ✓'; }
.wizard-body { flex: 1; overflow-y: auto; padding: var(--space-6); min-height: 400px; }

.form-section { margin-bottom: 20px; }
.form-section-title { font-size: 14px; font-weight: 600; color: var(--color-accent); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
.required { color: var(--color-danger); }
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
.contract-amount-total { font-size: 14pt; font-weight: bold; color: #c00; margin-top: 8px; padding-top: 8px; border-top: 2px solid #333; }
.contract-signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10.5pt; }
.contract-signature-block { line-height: 2.2; }
.contract-signature-line { display: inline-block; width: 140px; border-bottom: 1px solid #333; margin-left: 4px; }

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

.preview-related { padding: 0; }
.related-section { margin-bottom: var(--space-6); }
.related-section-title { font-size: 14px; font-weight: 700; color: var(--color-text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.related-doc-item { display: flex; align-items: center; gap: var(--space-3); padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-2); transition: background 0.15s; cursor: pointer; }
.related-doc-item:hover { background: var(--color-bg-secondary); }
.related-doc-icon { font-size: 20px; flex-shrink: 0; }
.related-doc-main { flex: 1; min-width: 0; }
.related-doc-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px; }
.related-doc-no { font-weight: 600; color: var(--color-text-primary); font-size: 13px; }
.related-doc-meta { display: flex; gap: var(--space-4); font-size: 12px; color: var(--color-text-secondary); }

.template-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); transition: border-color var(--transition-fast); }
.template-card:hover { border-color: var(--color-accent); }
.template-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
.template-card-title { font-weight: 600; color: var(--color-text-primary); margin-right: 8px; }
.template-type-tag { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--color-accent); font-weight: 500; vertical-align: middle; }
.template-card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.template-card-actions { display: flex; gap: var(--space-2); }

.calendar-nav { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-bottom: var(--space-4); }
.calendar-nav-title { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); min-width: 120px; text-align: center; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--color-border); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.calendar-header { padding: 8px; text-align: center; font-weight: 600; font-size: 12px; color: var(--color-text-secondary); background: var(--color-bg-secondary); }
.calendar-cell { background: var(--color-surface); min-height: 90px; padding: 4px; }
.calendar-cell.other-month { opacity: 0.4; }
.calendar-cell.is-today { background: var(--color-accent-subtle); }
.calendar-date { font-size: 12px; font-weight: 600; color: var(--color-text-primary); padding: 2px 4px; }
.calendar-events { margin-top: 2px; }
.calendar-event { display: flex; align-items: center; gap: 4px; padding: 2px 4px; font-size: 11px; cursor: pointer; border-radius: 3px; transition: background 0.15s; color: var(--color-text-primary); }
.calendar-event:hover { background: var(--color-bg-tertiary); }
.cal-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.cal-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calendar-more { font-size: 10px; color: var(--color-text-tertiary); padding: 1px 4px; }

.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-2); }
.week-column { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); min-height: 300px; display: flex; flex-direction: column; }
.week-column.is-today { border-color: var(--color-accent); }
.week-column-header { padding: 8px; text-align: center; border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary); border-radius: var(--radius-md) var(--radius-md) 0 0; }
.week-day-label { font-size: 12px; color: var(--color-text-secondary); display: block; }
.week-day-num { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
.week-column-body { flex: 1; padding: 6px; overflow-y: auto; }
.week-empty { text-align: center; color: var(--color-text-tertiary); font-size: 12px; padding: 20px 0; }
.week-event { padding: 6px 8px; margin-bottom: 6px; border-radius: var(--radius-sm); border-left: 3px solid var(--color-border); cursor: pointer; transition: background 0.15s; }
.week-event:hover { background: var(--color-bg-secondary); }
.week-event.cal-status-signed { border-left-color: #22c55e; }
.week-event.cal-status-pending_approval { border-left-color: #f59e0b; }
.week-event.cal-status-approved { border-left-color: #3b82f6; }
.week-event.cal-status-draft { border-left-color: #64748b; }
.week-event.cal-status-archived { border-left-color: #06b6d4; }
.week-event.cal-status-cancelled { border-left-color: #ef4444; }
.week-event-header { display: flex; align-items: center; gap: 4px; font-size: 12px; margin-bottom: 2px; color: var(--color-text-primary); }
.week-event-detail { font-size: 11px; color: var(--color-text-secondary); }

.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn-primary:hover { opacity: 0.9; }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); width: 100%; }
.panel-card-header { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.panel-card-body { padding: 16px; }
.panel-card-body.no-padding { padding: 0; }

.table-container { overflow-x: auto; width: 100%; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: 12px; white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.related-count-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--color-accent); background: rgba(99,102,241,0.1); cursor: pointer; transition: background 0.2s; }
.related-count-badge:hover { background: rgba(99,102,241,0.2); }
.text-muted { color: var(--color-text-tertiary); }
.action-btn-text { font-size: 12px; padding: 2px 8px; border-radius: 4px; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.action-btn-text:hover { background: var(--color-bg-secondary); border-color: var(--color-accent); color: var(--color-accent); }
.data-table tbody tr:hover { background: var(--color-bg-secondary); }

@media (max-width: 768px) {
  .contract-page { padding: var(--space-3); }
  .page-header { flex-direction: column; }
  .form-row-2, .form-row-3 { grid-template-columns: 1fr; }
  .analytics-kpis { grid-template-columns: repeat(2, 1fr); }
  .analytics-grid { grid-template-columns: 1fr; }
  .card-grid { grid-template-columns: 1fr; }
  .contract-sign-form { grid-template-columns: 1fr; }
  .contract-info-grid { grid-template-columns: 1fr; }
  .contract-signature { grid-template-columns: 1fr; }
  .contract-toolbar { flex-wrap: wrap; }
  .contract-search { min-width: 100%; flex: 1 1 100%; }
  .filter-date-group { flex-direction: row; }
  .filter-select, .filter-date, .filter-amount, .filter-reset-btn { flex: 1 1 calc(50% - var(--space-2)); min-width: 0; }
}

.btn-outline { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-outline:hover { background: var(--color-bg-secondary); }

.template-upload-area { margin-bottom: 16px; }
.upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.15s; }
.upload-zone:hover { border-color: var(--color-accent); background: var(--color-accent-subtle, #eff6ff); }
.upload-icon { font-size: 28px; margin-bottom: 8px; }
.upload-text { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
.upload-hint { font-size: 12px; color: var(--color-text-tertiary); }
.ai-parsing-hint { text-align: center; padding: 8px; color: var(--color-accent); font-size: 13px; margin-top: 8px; }
.save-template-check { color: var(--color-text-secondary); }
</style>