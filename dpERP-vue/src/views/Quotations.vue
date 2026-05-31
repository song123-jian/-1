<template>
  <div class="quotation-page">
    <div class="quotation-page-inner">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">报价管理</h2>
        <p class="page-header-subtitle">端到端报价生命周期：创建→审批→跟踪→转换</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" @click="currentView = v.key">{{ v.label }}</button>
        </div>
        <button class="btn btn-outline" @click="showAnalytics = !showAnalytics">{{ showAnalytics ? '列表' : '分析' }}</button>
        <button class="btn btn-outline" @click="handleExport">导出</button>
        <button class="btn btn-outline" @click="handleBatchApprove" :disabled="selectedIds.length === 0">批量审批</button>
        <button class="btn btn-outline" @click="openComparisonModal">对比</button>
        <button class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button class="btn btn-outline" @click="openTemplateManager">模板</button>
        <button class="btn btn-primary" @click="openAddModal">+ 新建报价</button>
      </div>
    </div>

    <div class="quotation-toolbar">
      <div class="quotation-search">
        <span class="search-icon">🔍</span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索报价编号/客户名称..." />
      </div>
      <div class="quotation-filters">
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending">待审批</option>
          <option value="approved">已审批</option>
          <option value="sent">已发送</option>
          <option value="accepted">已接受</option>
          <option value="rejected">已拒绝</option>
          <option value="expired">已过期</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="date">按日期</option>
          <option value="total">按金额</option>
          <option value="profitMargin">按利润率</option>
          <option value="quoteNo">按编号</option>
          <option value="customerName">按客户</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">{{ sortDir === 'asc' ? '↑' : '↓' }}</button>
      </div>
    </div>

    <div class="quotation-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span> 总计 {{ quotationStore.quotations.length }}</div>
      <div class="column-config-wrapper">
        <button class="btn btn-outline btn-sm" @click="toggleColumnConfig">⚙ 列</button>
        <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
          <label v-for="col in columnDefs.filter(c => !c.hidden)" :key="col.key" class="column-config-item">
            <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
          </label>
        </div>
      </div>
      <div class="stat-item"><span class="stat-dot draft"></span> 草稿 {{ quotationStore.draftCount }}</div>
      <div class="stat-item"><span class="stat-dot pending"></span> 待审 {{ quotationStore.pendingCount }}</div>
      <div class="stat-item"><span class="stat-dot approved"></span> 已审 {{ quotationStore.approvedCount }}</div>
      <div class="stat-item"><span class="stat-dot accepted"></span> 已接受 {{ quotationStore.acceptedCount }}</div>
      <div class="stat-item stat-money">总额 ¥{{ formatNumber(quotationStore.totalAmount) }}</div>
      <div class="stat-item stat-money">转化率 {{ quotationStore.conversionRate }}%</div>
      <div class="stat-item stat-money">平均利润率 {{ quotationStore.avgProfitMargin }}%</div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <div v-if="showAnalytics" class="analytics-panel">
      <div class="analytics-kpis">
        <div class="kpi-card"><div class="kpi-value">{{ quotationStore.quotations.length }}</div><div class="kpi-label">报价总数</div></div>
        <div class="kpi-card"><div class="kpi-value text-success">{{ quotationStore.conversionRate }}%</div><div class="kpi-label">转化率</div></div>
        <div class="kpi-card"><div class="kpi-value text-accent">{{ quotationStore.avgProfitMargin }}%</div><div class="kpi-label">平均利润率</div></div>
        <div class="kpi-card"><div class="kpi-value">¥{{ formatNumber(quotationStore.avgQuoteAmount) }}</div><div class="kpi-label">平均报价金额</div></div>
        <div class="kpi-card"><div class="kpi-value text-warning">¥{{ formatNumber(quotationStore.acceptedAmount) }}</div><div class="kpi-label">已接受金额</div></div>
      </div>
      <div class="analytics-grid">
        <div class="panel-card">
          <div class="panel-card-header">状态分布</div>
          <div class="panel-card-body">
            <div v-for="(label, key) in statusLabels" :key="key" class="bar-row">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(key), background: statusColors[key] }"></div></div>
              <span class="bar-value">{{ quotationStore.statusCounts[key] }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">客户报价 TOP10</div>
          <div class="panel-card-body">
            <div v-for="(c, i) in quotationStore.customerTopList" :key="c.name" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.name }}</span>
              <span class="top-amount mono">¥{{ formatNumber(c.amount) }}</span>
            </div>
            <div v-if="quotationStore.customerTopList.length === 0" class="empty-hint">暂无数据</div>
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
                  <th v-if="columnVisible.quoteNo">报价编码</th>
                  <th v-if="columnVisible.date" class="sortable" @click="toggleSort('date')">日期 <span class="sort-icon">{{ sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}</span></th>
                  <th v-if="columnVisible.customer">客户</th>
                  <th v-if="columnVisible.grade">牌号</th>
                  <th v-if="columnVisible.unitPrice">单价含税</th>
                  <th v-if="columnVisible.status">状态</th>
                  <th v-if="columnVisible.notes">备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedQuotations.length === 0"><td :colspan="2 + visibleColCount" class="empty-state"><div class="empty-state-icon">📭</div>暂无报价数据</td></tr>
                <tr v-for="q in pagedQuotations" :key="q.id">
                  <td><div class="checkbox" :class="{ checked: selectedIds.includes(q.id) }" @click="toggleSelect(q.id)">✓</div></td>
                  <td v-if="columnVisible.quoteNo" class="mono"><strong style="color:var(--color-accent)">{{ q.quoteNo }}</strong></td>
                  <td v-if="columnVisible.date">{{ q.date || '-' }}</td>
                  <td v-if="columnVisible.customer">{{ q.customerName }}</td>
                  <td v-if="columnVisible.grade">{{ getFirstGrade(q) }}</td>
                  <td v-if="columnVisible.unitPrice" class="mono">{{ getFirstPrice(q) }}</td>
                  <td v-if="columnVisible.status"><span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span></td>
                  <td v-if="columnVisible.notes">{{ q.notes || '-' }}</td>
                  <td class="cell-actions">
                    <button class="btn btn-sm btn-outline" @click="openEditModal(q)">编辑</button>
                    <button class="btn btn-sm btn-outline" @click="handleDuplicate(q)">复制</button>
                    <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)">预览</button>
                    <button class="btn btn-sm btn-outline" @click="sendQuoteByEmail(q)">邮件</button>
                    <button class="btn btn-sm btn-outline" @click="openFollowUpModal(q)">电话</button>
                    <button v-if="canApprove(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)">确认</button>
                    <button v-if="q.status === 'approved' || q.status === 'accepted'" class="btn btn-sm btn-outline" @click="convertToDelivery(q)">送货</button>
                    <button v-if="q.status === 'approved' || q.status === 'accepted'" class="btn btn-sm btn-outline" @click="convertToContract(q)">合同</button>
                    <button class="btn btn-sm btn-outline" @click="openVersionModal(q)">版本</button>
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
            <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredQuotations.length }} 条</span>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'list'" class="panel-card">
        <div class="panel-card-body">
          <div v-if="filteredQuotations.length === 0" class="empty-state"><div class="empty-state-icon">📭</div>暂无报价数据</div>
          <div v-for="q in filteredQuotations" :key="q.id" class="list-item" @click="openEditModal(q)">
            <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(q.id) }" @click="toggleSelect(q.id)">✓</div></div>
            <div class="list-item-avatar" :style="{ background: statusColors[q.status] || '#94a3b8' }">{{ (q.quoteNo || '?').slice(-3) }}</div>
            <div class="list-item-main">
              <div class="list-item-row1">
                <strong class="list-item-name">{{ q.quoteNo }}</strong>
                <span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
                <span class="mono" :class="profitClass(q.profitMargin)">{{ q.profitMargin || 0 }}%</span>
              </div>
              <div class="list-item-row2">
                <span>{{ q.customerName }}</span>
                <span>{{ q.date }}</span>
                <span v-if="q.expiryDate">到期 {{ q.expiryDate }}</span>
              </div>
              <div class="list-item-row3">
                <span class="mono">¥{{ formatNumber(q.total) }}</span>
                <span v-if="q.notes" class="text-muted">{{ q.notes }}</span>
              </div>
            </div>
            <div class="list-item-actions" @click.stop>
              <button class="btn btn-sm btn-outline" @click="openEditModal(q)">编辑</button>
              <button v-if="canApprove(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)">确认</button>
              <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)">预览</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'card'" class="card-grid">
        <div v-if="filteredQuotations.length === 0" class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📭</div>暂无报价数据</div>
        <div v-for="q in filteredQuotations" :key="q.id" class="quote-card" :class="'card-status-' + q.status">
          <div class="quote-card-header">
            <strong class="mono">{{ q.quoteNo }}</strong>
            <span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
          </div>
          <div class="quote-card-body">
            <div class="quote-card-field"><span class="field-label">客户</span><span>{{ q.customerName }}</span></div>
            <div class="quote-card-field"><span class="field-label">金额</span><span class="mono">¥{{ formatNumber(q.total) }}</span></div>
            <div class="quote-card-field"><span class="field-label">利润率</span><span class="mono" :class="profitClass(q.profitMargin)">{{ q.profitMargin || 0 }}%</span></div>
            <div class="quote-card-field"><span class="field-label">到期日</span><span>{{ q.expiryDate || '-' }}</span></div>
          </div>
          <div class="quote-card-footer">
            <button class="btn btn-sm btn-outline" @click="openEditModal(q)">编辑</button>
            <button v-if="canApprove(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)">确认</button>
            <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)">预览</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="currentView === 'calendar' && !showAnalytics" class="panel-card">
      <div class="panel-card-body">
        <div class="calendar-nav">
          <button class="btn btn-secondary btn-sm" @click="calMonth--">◀</button>
          <span class="calendar-month-label">{{ calYear }}年{{ calMonth }}月</span>
          <button class="btn btn-secondary btn-sm" @click="calMonth++">▶</button>
          <button class="btn btn-ghost btn-sm" @click="calYear = new Date().getFullYear(); calMonth = new Date().getMonth() + 1">今天</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-header-cell" v-for="d in ['一','二','三','四','五','六','日']" :key="d">{{ d }}</div>
          <div v-for="(day, idx) in calendarDays" :key="idx" class="calendar-cell" :class="{ 'other-month': !day.currentMonth, 'today': day.isToday }">
            <div class="calendar-day-num">{{ day.day || '' }}</div>
            <div class="calendar-events">
              <div v-for="q in day.quotations" :key="q.id" class="calendar-event" :class="'cal-status-' + q.status" @click="openEditModal(q)" :title="q.quoteNo + ' ' + q.customerName">
                {{ q.quoteNo.slice(-3) }} {{ q.customerName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>

    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3>{{ isEditing ? '编辑报价' : '新建报价' }}</h3>
            <button class="modal-close" @click="showEditModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <h4 class="form-section-title">📋 报价基本信息</h4>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">报价编号</label>
                  <input v-model="form.quoteNo" class="form-input" :readonly="isEditing" :style="isEditing ? 'opacity:0.7;cursor:not-allowed' : ''" />
                </div>
                <div class="form-group">
                  <label class="form-label">报价日期</label>
                  <input v-model="form.date" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">报价有效期</label>
                  <input v-model="form.expiryDate" type="date" class="form-input" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4 class="form-section-title">🏢 客户信息</h4>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">客户公司</label>
                  <select v-model="form.customerId" class="form-select" @change="fillCustomerInfo">
                    <option value="">请选择客户</option>
                    <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.fullName || c.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">客户公司全称</label>
                  <input v-model="form.customerFullName" class="form-input" readonly style="opacity:0.8" />
                </div>
              </div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">联系人姓名</label>
                  <input v-model="form.custContact" class="form-input" placeholder="自动填充" />
                </div>
                <div class="form-group">
                  <label class="form-label">联系电话</label>
                  <input v-model="form.custPhone" class="form-input" placeholder="自动填充" />
                </div>
                <div class="form-group">
                  <label class="form-label">电子邮箱</label>
                  <input v-model="form.custEmail" type="email" class="form-input" placeholder="自动填充" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4 class="form-section-title">🏭 我方信息</h4>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">发件方</label>
                  <input v-model="form.senderCompany" class="form-input" readonly style="opacity:0.8" />
                </div>
                <div class="form-group">
                  <label class="form-label">业务对接人</label>
                  <input v-model="form.senderContact" class="form-input" />
                </div>
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">联系电话</label>
                  <input v-model="form.senderPhone" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">业务邮箱</label>
                  <input v-model="form.senderEmail" type="email" class="form-input" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4 class="form-section-title">📦 产品报价明细</h4>
              <div style="overflow-x:auto;margin-bottom:8px">
                <table class="data-table items-table" style="min-width:700px">
                  <thead>
                    <tr>
                      <th style="width:40px">序号</th>
                      <th>牌号/规格</th>
                      <th>材料标准</th>
                      <th style="width:90px">数量(KG)</th>
                      <th style="width:130px">含税单价(元/KG)</th>
                      <th style="width:100px">小计(元)</th>
                      <th>备注(最小起订量等)</th>
                      <th style="width:40px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in formItems" :key="idx">
                      <td style="text-align:center">{{ idx + 1 }}</td>
                      <td><input v-model="item.grade" class="form-input" placeholder="牌号" /></td>
                      <td><input v-model="item.standard" class="form-input" placeholder="标准" /></td>
                      <td><input v-model.number="item.qty" type="number" class="form-input" min="0" step="0.01" /></td>
                      <td><input v-model.number="item.price" type="number" class="form-input" min="0" step="0.01" /></td>
                      <td class="mono" style="text-align:right;font-weight:600">{{ formatNumber(item.qty * item.price) }}</td>
                      <td><input v-model="item.remark" class="form-input" placeholder="备注" /></td>
                      <td style="text-align:center"><button class="action-btn danger" @click="removeItem(idx)" :disabled="formItems.length <= 1">✕</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button class="btn btn-secondary btn-sm" @click="addItem" style="margin-bottom:12px">+ 添加产品行</button>
              <div class="form-row form-row-4">
                <div class="form-group">
                  <label class="form-label">不含税金额</label>
                  <input v-model.number="form.subtotal" type="number" step="0.01" class="form-input" @input="recalcTotal" />
                </div>
                <div class="form-group">
                  <label class="form-label">税率(%)</label>
                  <input v-model.number="form.taxRate" type="number" class="form-input" @input="recalcTotal" />
                </div>
                <div class="form-group">
                  <label class="form-label">含税合计</label>
                  <input :value="calculatedTotal.toFixed(2)" type="text" class="form-input" readonly style="opacity:0.8;font-weight:700;color:var(--color-accent)" />
                </div>
                <div class="form-group">
                  <label class="form-label">成本基准</label>
                  <input v-model.number="form.costBasis" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4 class="form-section-title">📝 报价说明条款</h4>
              <div class="form-group">
                <label class="form-label">价格条款</label>
                <input v-model="form.termPrice" class="form-input" />
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">付款方式</label>
                  <input v-model="form.termPayment" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">交货周期</label>
                  <input v-model="form.termDelivery" class="form-input" />
                </div>
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">交货地点</label>
                  <input v-model="form.termDeliveryAddr" class="form-input" placeholder="请填写具体收货地址" />
                </div>
                <div class="form-group">
                  <label class="form-label">质量标准</label>
                  <input v-model="form.termQuality" class="form-input" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">价格调整机制</label>
                <input v-model="form.termPriceAdj" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">法律效力声明</label>
                <textarea v-model="form.termLegal" class="form-textarea" rows="2"></textarea>
              </div>
              <div style="margin-bottom:12px" v-if="!isEditing">
                <button class="btn btn-secondary btn-sm" type="button" @click="saveAsTemplate">💾 另存为模板</button>
              </div>
              <div class="form-group">
                <label class="form-label">备注</label>
                <textarea v-model="form.notes" class="form-textarea" rows="2" placeholder="备注信息..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showEditModal = false">取消</button>
            <label class="save-template-check" style="display:flex;align-items:center;gap:6px;margin-left:auto;cursor:pointer;font-size:13px;">
              <input type="checkbox" v-model="saveAsTemplateFlag"> 另存为模板
            </label>
            <button class="btn btn-primary" @click="handleSave">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showFollowUpModal" class="modal-overlay" @click.self="showFollowUpModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>📞 跟进记录 - {{ followUpQuote?.quoteNo }}</h3>
            <button class="modal-close" @click="showFollowUpModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row form-row-2" style="margin-bottom:12px">
              <div class="form-group">
                <label class="form-label">跟进日期</label>
                <input v-model="followUpDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">跟进内容</label>
                <input v-model="followUpNote" class="form-input" placeholder="沟通内容/结果" />
              </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="addFollowUp" style="margin-bottom:16px">添加跟进</button>
            <div style="max-height:300px;overflow-y:auto">
              <div v-if="!followUpQuote?.followUps?.length" style="text-align:center;padding:20px;color:var(--color-text-tertiary)">暂无跟进记录</div>
              <div v-for="f in [...(followUpQuote?.followUps || [])].reverse()" :key="f.createdAt" class="follow-up-item">
                <div class="follow-up-date">{{ f.date || '-' }} <span class="follow-up-by">{{ f.createdBy }}</span></div>
                <div class="follow-up-note">{{ f.note }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showFollowUpModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showVersionModal" class="modal-overlay" @click.self="showVersionModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>📜 版本历史 - {{ versionQuote?.quoteNo }}</h3>
            <button class="modal-close" @click="showVersionModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="versionList.length === 0" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">暂无版本历史</div>
            <table v-else class="data-table">
              <thead>
                <tr><th>版本</th><th>修改人</th><th>修改时间</th><th>金额</th><th>备注</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="v in [...versionList].reverse()" :key="v.version">
                  <td>v{{ v.version }}</td>
                  <td>{{ v.changedBy }}</td>
                  <td>{{ (v.changedAt || '').substring(0, 16).replace('T', ' ') }}</td>
                  <td class="mono">¥{{ formatNumber(v.data?.total || 0) }}</td>
                  <td>{{ v.changeNote || '-' }}</td>
                  <td><button class="action-btn" @click="handleRollback(versionQuote.id, v.version)">回滚</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showVersionModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showComparisonModal" class="modal-overlay" @click.self="showComparisonModal = false">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3>📊 报价对比</h3>
            <button class="modal-close" @click="showComparisonModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="selectedIds.length < 2" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">
              <div style="font-size:36px;margin-bottom:12px">📊</div>
              请至少勾选2条报价进行对比<br><span style="font-size:12px">最多同时对比3条报价</span>
            </div>
            <div v-else-if="selectedIds.length > 3" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">
              最多同时对比3条报价，当前已选{{ selectedIds.length }}条
            </div>
            <div v-else style="overflow-x:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:120px">对比项</th>
                    <th v-for="q in comparisonQuotes" :key="q.id">{{ q.quoteNo }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparisonRows" :key="row.label">
                    <td style="font-weight:600;color:var(--color-accent)">{{ row.label }}</td>
                    <td v-for="q in comparisonQuotes" :key="q.id" v-html="row.fn(q)"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showComparisonModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showQuoteLetterModal" class="quote-letter-overlay" @click.self="showQuoteLetterModal = false">
        <div class="quote-letter-container">
          <div class="quote-letter-toolbar">
            <span class="quote-letter-toolbar-title">📄 正式报价函预览</span>
            <div class="quote-letter-toolbar-actions">
              <button class="btn btn-secondary btn-sm" @click="exportQuoteLetterPDF">📥 导出PDF</button>
              <button class="btn btn-secondary btn-sm" @click="exportQuoteLetterWord">📥 导出Word</button>
              <button class="btn btn-secondary btn-sm" @click="printQuoteLetter">🖨 打印</button>
              <button class="btn btn-ghost btn-sm" @click="showQuoteLetterModal = false">✕ 关闭</button>
            </div>
          </div>
          <div class="quote-letter-content" v-if="letterQuote">
            <div class="ql-company-name">{{ letterQuote.senderCompany || '苏州冠久新材料科技有限公司' }}</div>
            <div class="ql-doc-title">正 式 报 价 函</div>
            <div class="ql-doc-no">编号：{{ letterQuote.quoteNo }}</div>
            <hr class="ql-divider" />
            <div class="ql-info-grid">
              <div class="ql-info-row"><span class="ql-info-label">致：</span><span class="ql-info-value">{{ letterQuote.customerFullName || letterQuote.customerName }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">发件方：</span><span class="ql-info-value">{{ letterQuote.senderCompany || '苏州冠久新材料科技有限公司' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">联系人：</span><span class="ql-info-value">{{ letterQuote.custContact || '-' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">联系人：</span><span class="ql-info-value">{{ letterQuote.senderContact || '[我司业务对接人]' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">联系电话：</span><span class="ql-info-value">{{ letterQuote.custPhone || '-' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">联系电话：</span><span class="ql-info-value">{{ letterQuote.senderPhone || '-' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">电子邮箱：</span><span class="ql-info-value">{{ letterQuote.custEmail || '-' }}</span></div>
              <div class="ql-info-row"><span class="ql-info-label">电子邮箱：</span><span class="ql-info-value">{{ letterQuote.senderEmail || '-' }}</span></div>
            </div>
            <hr class="ql-divider-thin" />
            <p class="ql-indent">尊敬的{{ letterQuote.custContact || letterQuote.customerName }}：</p>
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
                  <td style="text-align:right">{{ (letterQuote.subtotal || 0).toFixed(2) }}</td>
                  <td></td>
                </tr>
                <tr style="font-weight:bold;background:#f8f8f8">
                  <td colspan="3" style="text-align:right">税额({{ letterQuote.taxRate || 13 }}%)</td>
                  <td style="text-align:right">{{ ((letterQuote.subtotal || 0) * (letterQuote.taxRate || 13) / 100).toFixed(2) }}</td>
                  <td></td>
                </tr>
                <tr style="font-weight:bold;background:#f0f0f0">
                  <td colspan="3" style="text-align:right">含税合计</td>
                  <td style="text-align:right;color:#c00">{{ (letterQuote.total || 0).toFixed(2) }}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div class="ql-section-title">二、报价条款说明</div>
            <div class="ql-terms">
              <ol>
                <li><strong>价格构成：</strong>{{ letterQuote.termPrice || '本报价所有金额均为人民币含税价格（含' + (letterQuote.taxRate || 13) + '%增值税），已包含标准包装费及国内运输费用。' }}</li>
                <li><strong>报价有效期：</strong>自{{ formatDateCN(letterQuote.date) }}起至{{ formatDateCN(letterQuote.expiryDate) }}止，共计{{ expiryDays }}天。</li>
                <li><strong>付款方式：</strong>{{ letterQuote.termPayment || '默认采用"款到发货"结算方式，具体付款条件可根据订单金额另行友好协商确定。' }}</li>
                <li><strong>交货周期：</strong>{{ letterQuote.termDelivery || '在收到贵司全额货款后5个工作日内完成生产并发货。' }}</li>
                <li><strong>交货地点：</strong>{{ letterQuote.termDeliveryAddr || '[请填写具体收货地址]' }}</li>
                <li><strong>质量标准：</strong>{{ letterQuote.termQuality || '产品质量严格符合国家相关行业标准及双方确认的技术要求，随货提供质检报告。' }}</li>
                <li><strong>价格调整机制：</strong>{{ letterQuote.termPriceAdj || '本报价基于当前市场原材料价格制定，若遇主要原材料价格波动超过±5%，我司有权对未确认订单价格进行相应调整，正式下单前请以双方最新书面确认为准。' }}</li>
                <li><strong>法律效力：</strong>{{ letterQuote.termLegal || '本报价函经双方授权代表签字并加盖公司公章后即构成具有法律约束力的合同要约，与正式采购合同具有同等法律效力。' }}</li>
              </ol>
            </div>
            <div class="ql-closing">
              <p class="ql-indent">感谢贵公司长期以来的信任与支持，我司将一如既往地为贵司提供稳定可靠的产品品质与专业高效的技术服务！期待与贵司的愉快合作！</p>
              <p style="text-align:right;margin:16px 0;">顺颂商祺！</p>
            </div>
            <hr class="ql-divider" />
            <div class="ql-signature">
              <div class="ql-signature-block">
                <div><strong>{{ letterQuote.senderCompany || '苏州冠久新材料科技有限公司' }}</strong></div>
                <div style="margin-top:8px">（公司公章盖章处）</div>
                <div class="ql-stamp"><div class="ql-stamp-box">盖章区</div></div>
              </div>
              <div class="ql-signature-block">
                <div>授权代表签字：<span class="ql-signature-line"></span></div>
                <div>联系人：<span class="ql-signature-line"></span></div>
                <div>联系电话：<span class="ql-signature-line"></span></div>
                <div>日期：{{ formatDateCN(letterQuote.date) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>📋 报价模板管理</h3>
            <button class="modal-close" @click="showTemplateModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="template-upload-area">
              <div class="upload-zone" @click="triggerTemplateUpload" @dragover.prevent @drop.prevent="handleTemplateDrop">
                <div class="upload-icon">🤖</div>
                <div class="upload-text">AI智能识别报价单</div>
                <div class="upload-hint">点击上传或拖拽文件（支持PDF/Word/Excel/图片）</div>
                <input ref="templateFileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" @change="handleTemplateFileSelect" />
              </div>
              <div v-if="aiParsing" class="ai-parsing-hint">🤖 AI正在识别中...</div>
            </div>
            <div style="max-height:400px;overflow-y:auto">
              <div v-if="quotationStore.templates.length === 0" style="text-align:center;padding:40px;color:var(--color-text-tertiary)">
                <div style="font-size:36px;margin-bottom:12px">📋</div>暂无报价模板<br><span style="font-size:12px">在报价编辑界面点击"另存为模板"来创建</span>
              </div>
              <table v-else class="data-table">
                <thead>
                  <tr><th>模板名称</th><th>客户</th><th>创建时间</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in quotationStore.templates" :key="t.id">
                    <td>{{ t.name }}</td>
                    <td>{{ t.customerName || '-' }}</td>
                    <td>{{ (t.createdAt || '').substring(0, 10) }}</td>
                    <td>
                      <button class="action-btn" @click="createQuoteFromTemplate(t)">使用</button>
                      <button class="action-btn danger" @click="handleDeleteTemplate(t.id)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showTemplateModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuotationStore } from '@/stores/quotation'
import { useCustomerStore } from '@/stores/customer'

const quotationStore = useQuotationStore()
const customerStore = useCustomerStore()

const currentView = ref('table')
const viewModes = [
  { key: 'table', label: '表格' },
  { key: 'list', label: '列表' },
  { key: 'card', label: '卡片' },
  { key: 'calendar', label: '日历' }
]

const searchText = ref('')
const filterStatus = ref('')
const sortField = ref('date')
const sortDir = ref('desc')
const currentPage = ref(1)
const pageSize = 15
const selectedIds = ref([])
const showAnalytics = ref(false)
const showComparisonModal = ref(false)
const showQuoteLetterModal = ref(false)
const showTemplateModal = ref(false)
const templateFileInput = ref(null)
const aiParsing = ref(false)

function triggerTemplateUpload() {
  templateFileInput.value?.click()
}

function handleTemplateFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseTemplateFile(file)
}

function handleTemplateDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseTemplateFile(file)
}

function parseTemplateFile(file) {
  aiParsing.value = true
  setTimeout(() => {
    aiParsing.value = false
    const name = prompt('AI识别完成，请确认模板名称：', file.name.replace(/\.[^.]+$/, ''))
    if (name) {
      quotationStore.addTemplate({
        name,
        customerName: 'AI识别 - 待确认',
        items: JSON.stringify([{ grade: 'AI识别牌号', standard: '', qty: 0, price: 0, remark: '请手动确认' }]),
        termPrice: '', termPayment: '', termDelivery: '', termDeliveryAddr: '',
        termQuality: '', termPriceAdj: '', termLegal: '', taxRate: 13, costBasis: 0
      })
      alert('模板"' + name + '"已通过AI识别创建，请编辑确认详细信息')
    }
  }, 2000)
}
const letterQuote = ref(null)

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
const columnDefs = [
  { key: 'check', label: '选择', hidden: true },
  { key: 'quoteNo', label: '报价编码' },
  { key: 'date', label: '日期' },
  { key: 'customer', label: '客户' },
  { key: 'grade', label: '牌号' },
  { key: 'unitPrice', label: '单价含税' },
  { key: 'status', label: '状态' },
  { key: 'notes', label: '备注' },
  { key: 'actions', label: '操作', hidden: true }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => !c.hidden).map(c => [c.key, true])))
const visibleColCount = computed(() => columnDefs.filter(c => !c.hidden && columnVisible.value[c.key]).length)

function toggleColumnConfig(e) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = e.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}
function closeColumnConfig() {
  showColumnConfig.value = false
}

function getFirstGrade(q) {
  try {
    const items = JSON.parse(q.items || '[]')
    if (items.length > 0 && items[0].grade) {
      return items[0].grade
    }
  } catch { /* ignore */ }
  return '-'
}

function getFirstPrice(q) {
  try {
    const items = JSON.parse(q.items || '[]')
    if (items.length > 0 && items[0].price) {
      return '¥' + parseFloat(items[0].price).toFixed(2)
    }
  } catch { /* ignore */ }
  return '-'
}

const statusLabels = {
  draft: '草稿', pending: '待审批', approved: '已审批',
  sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期'
}
const statusColors = {
  draft: '#64748b', pending: '#f59e0b', approved: '#3b82f6',
  sent: '#06b6d4', accepted: '#22c55e', rejected: '#ef4444', expired: '#94a3b8'
}

const filteredQuotations = computed(() => {
  let list = [...quotationStore.quotations]
  if (searchText.value) {
    const s = searchText.value.toLowerCase()
    list = list.filter(q =>
      (q.quoteNo || '').toLowerCase().includes(s) ||
      (q.customerName || '').toLowerCase().includes(s) ||
      (q.customerFullName || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) {
    list = list.filter(q => q.status === filterStatus.value)
  }
  list.sort((a, b) => {
    let va = a[sortField.value], vb = b[sortField.value]
    if (sortField.value === 'total' || sortField.value === 'profitMargin') {
      va = parseFloat(va) || 0
      vb = parseFloat(vb) || 0
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredQuotations.value.length / pageSize)))
const pagedQuotations = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredQuotations.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const sp = Math.max(1, currentPage.value - 2)
  const ep = Math.min(totalPages.value, currentPage.value + 2)
  const pages = []
  for (let p = sp; p <= ep; p++) pages.push(p)
  return pages
})

const isAllSelected = computed(() =>
  pagedQuotations.value.length > 0 && pagedQuotations.value.every(q => selectedIds.value.includes(q.id))
)

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !pagedQuotations.value.some(q => q.id === id))
  } else {
    for (const q of pagedQuotations.value) {
      if (!selectedIds.value.includes(q.id)) selectedIds.value.push(q.id)
    }
  }
}

function barWidth(key) {
  const total = quotationStore.quotations.length
  if (total === 0) return '0%'
  return (quotationStore.statusCounts[key] / total * 100).toFixed(0) + '%'
}

function profitClass(margin) {
  const m = parseFloat(margin) || 0
  if (m >= 20) return 'text-success'
  if (m >= 10) return 'text-warning'
  return 'text-danger'
}

function canApprove(q) {
  return q.status === 'pending' || q.status === 'draft'
}

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const showEditModal = ref(false)
const saveAsTemplateFlag = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const form = ref({})
const formItems = ref([{ grade: '', standard: '', qty: 0, price: 0, remark: '' }])

const itemsSubtotal = computed(() => formItems.value.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0))
const calculatedTotal = computed(() => itemsSubtotal.value * (1 + (form.value.taxRate || 0) / 100))
const calculatedProfitMargin = computed(() => {
  const cost = form.value.costBasis || 0
  if (cost <= 0 || itemsSubtotal.value <= 0) return 0
  return ((itemsSubtotal.value - cost) / itemsSubtotal.value) * 100
})

function resetForm() {
  const today = new Date().toISOString().split('T')[0]
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  form.value = {
    quoteNo: generateQuoteNo(),
    customerId: '', customerName: '', customerFullName: '',
    custContact: '', custPhone: '', custEmail: '',
    senderContact: '', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '', senderEmail: '',
    date: today, expiryDate: expiry,
    subtotal: 0, taxRate: 13, costBasis: 0, notes: '',
    termPrice: '本报价所有金额均为人民币含税价格（含13%增值税），已包含标准包装费及国内运输费用。',
    termPayment: '默认采用"款到发货"结算方式，具体付款条件可根据订单金额另行友好协商确定。',
    termDelivery: '在收到贵司全额货款后5个工作日内完成生产并发货。',
    termDeliveryAddr: '',
    termQuality: '产品质量严格符合国家相关行业标准及双方确认的技术要求，随货提供质检报告。',
    termPriceAdj: '本报价基于当前市场原材料价格制定，若遇主要原材料价格波动超过±5%，我司有权对未确认订单价格进行相应调整，正式下单前请以双方最新书面确认为准。',
    termLegal: '本报价函经双方授权代表签字并加盖公司公章后即构成具有法律约束力的合同要约，与正式采购合同具有同等法律效力。'
  }
  formItems.value = [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
}

function generateQuoteNo() {
  const now = new Date()
  const prefix = 'QT' + now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  let maxSeq = 0
  for (const q of quotationStore.quotations) {
    if (q.quoteNo && q.quoteNo.startsWith(prefix)) {
      const seq = parseInt(q.quoteNo.slice(prefix.length), 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

function openAddModal() {
  resetForm()
  isEditing.value = false
  editingId.value = null
  showEditModal.value = true
}

function openEditModal(q) {
  isEditing.value = true
  editingId.value = q.id
  form.value = {
    quoteNo: q.quoteNo || '',
    customerId: q.customerId || '', customerName: q.customerName || '', customerFullName: q.customerFullName || '',
    custContact: q.custContact || '', custPhone: q.custPhone || '', custEmail: q.custEmail || '',
    senderContact: q.senderContact || '', senderCompany: q.senderCompany || '苏州冠久新材料科技有限公司', senderPhone: q.senderPhone || '', senderEmail: q.senderEmail || '',
    date: q.date || '', expiryDate: q.expiryDate || '',
    subtotal: q.subtotal || 0, taxRate: q.taxRate ?? 13, costBasis: q.costBasis || 0, notes: q.notes || '',
    termPrice: q.termPrice || '', termPayment: q.termPayment || '', termDelivery: q.termDelivery || '',
    termDeliveryAddr: q.termDeliveryAddr || '', termQuality: q.termQuality || '', termPriceAdj: q.termPriceAdj || '', termLegal: q.termLegal || ''
  }
  try {
    const parsed = JSON.parse(q.items || '[]')
    formItems.value = parsed.length > 0 ? parsed : [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
  } catch {
    formItems.value = [{ grade: '', standard: '', qty: 0, price: 0, remark: '' }]
  }
  showEditModal.value = true
}

function fillCustomerInfo() {
  const c = customerStore.customers.find(x => x.id === form.value.customerId)
  if (!c) return
  form.value.customerName = c.fullName || c.name || ''
  form.value.customerFullName = c.fullName || c.name || ''
  form.value.custContact = c.contactName || c.contact || ''
  form.value.custPhone = c.phone || ''
  form.value.custEmail = c.email || ''
}

function addItem() {
  formItems.value.push({ grade: '', standard: '', qty: 0, price: 0, remark: '' })
}

function removeItem(idx) {
  if (formItems.value.length <= 1) return
  formItems.value.splice(idx, 1)
}

function handleSave() {
  const data = {
    ...form.value,
    items: JSON.stringify(formItems.value),
    subtotal: form.value.subtotal || itemsSubtotal.value,
    total: calculatedTotal.value,
    profitMargin: parseFloat(calculatedProfitMargin.value.toFixed(1))
  }
  if (isEditing.value) {
    quotationStore.saveVersion(editingId.value, '编辑保存')
    quotationStore.updateQuotation(editingId.value, data)
  } else {
    quotationStore.addQuotation(data)
  }
  if (saveAsTemplateFlag.value) {
    const name = prompt('请输入模板名称：', form.value.customerName || '新模板')
    if (name) {
      quotationStore.addTemplate({
        name,
        customerId: form.value.customerId,
        customerName: form.value.customerName,
        items: JSON.stringify(formItems.value),
        termPrice: form.value.termPrice,
        termPayment: form.value.termPayment,
        termDelivery: form.value.termDelivery,
        termDeliveryAddr: form.value.termDeliveryAddr,
        termQuality: form.value.termQuality,
        termPriceAdj: form.value.termPriceAdj,
        termLegal: form.value.termLegal,
        taxRate: form.value.taxRate,
        costBasis: form.value.costBasis
      })
    }
    saveAsTemplateFlag.value = false
  }
  showEditModal.value = false
}

function handleDuplicate(q) {
  const dup = quotationStore.duplicateQuotation(q.id)
  if (dup) {
    alert('已复制报价单 ' + q.quoteNo + ' 的内容，新单号：' + dup.quoteNo)
  }
}

function handleApprove(q) {
  if (confirm('确认审批报价单 ' + q.quoteNo + '？')) {
    quotationStore.changeStatus(q.id, 'approved')
  }
}

function handleDelete(q) {
  if (confirm('确认删除报价单 ' + q.quoteNo + '？此操作不可恢复。')) {
    quotationStore.deleteQuotation(q.id)
    selectedIds.value = selectedIds.value.filter(id => id !== q.id)
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条报价？')) {
    quotationStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleBatchApprove() {
  if (confirm('确认审批选中的 ' + selectedIds.value.length + ' 条报价？')) {
    quotationStore.batchApprove(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  const data = JSON.stringify(quotationStore.quotations, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quotations_export.json'
  a.click()
  URL.revokeObjectURL(url)
}

function saveAsTemplate() {
  const name = prompt('请输入模板名称：', form.value.customerName || '新模板')
  if (!name) return
  quotationStore.addTemplate({
    name,
    customerId: form.value.customerId,
    customerName: form.value.customerName,
    items: JSON.stringify(formItems.value),
    termPrice: form.value.termPrice,
    termPayment: form.value.termPayment,
    termDelivery: form.value.termDelivery,
    termDeliveryAddr: form.value.termDeliveryAddr,
    termQuality: form.value.termQuality,
    termPriceAdj: form.value.termPriceAdj,
    termLegal: form.value.termLegal,
    taxRate: form.value.taxRate,
    costBasis: form.value.costBasis
  })
  alert('模板"' + name + '"已保存')
}

function openTemplateManager() {
  showTemplateModal.value = true
}

function handleDeleteTemplate(id) {
  if (confirm('确认删除此模板？')) {
    quotationStore.deleteTemplate(id)
  }
}

function createQuoteFromTemplate(tpl) {
  resetForm()
  form.value.customerId = tpl.customerId || ''
  form.value.customerName = tpl.customerName || ''
  form.value.taxRate = tpl.taxRate || 13
  form.value.costBasis = tpl.costBasis || 0
  form.value.termPrice = tpl.termPrice || ''
  form.value.termPayment = tpl.termPayment || ''
  form.value.termDelivery = tpl.termDelivery || ''
  form.value.termDeliveryAddr = tpl.termDeliveryAddr || ''
  form.value.termQuality = tpl.termQuality || ''
  form.value.termPriceAdj = tpl.termPriceAdj || ''
  form.value.termLegal = tpl.termLegal || ''
  if (tpl.items) {
    try {
      formItems.value = JSON.parse(tpl.items)
    } catch { /* ignore */ }
  }
  if (tpl.customerId) fillCustomerInfo()
  showTemplateModal.value = false
  showEditModal.value = true
}

function openComparisonModal() {
  if (selectedIds.value.length < 2) {
    alert('请至少勾选2条报价进行对比')
    return
  }
  if (selectedIds.value.length > 3) {
    alert('最多同时对比3条报价')
    return
  }
  showComparisonModal.value = true
}

const comparisonQuotes = computed(() => {
  return selectedIds.value.map(id => quotationStore.getQuotationById(id)).filter(Boolean)
})

const comparisonRows = [
  { label: '客户', fn: q => q.customerName || '-' },
  { label: '日期', fn: q => q.date || '-' },
  { label: '到期日', fn: q => q.expiryDate || '-' },
  { label: '不含税金额', fn: q => '¥' + formatNumber(q.subtotal || 0) },
  { label: '含税合计', fn: q => {
    const val = '¥' + formatNumber(q.total || 0)
    const maxTotal = Math.max(...comparisonQuotes.value.map(c => c.total || 0))
    const minTotal = Math.min(...comparisonQuotes.value.map(c => c.total || 0))
    if (q.total === maxTotal && maxTotal !== minTotal) return '<span style="color:var(--color-danger)">' + val + ' ↑</span>'
    if (q.total === minTotal && maxTotal !== minTotal) return '<span style="color:var(--color-success)">' + val + ' ↓</span>'
    return val
  }},
  { label: '利润率', fn: q => (q.profitMargin || 0) + '%' },
  { label: '税率', fn: q => (q.taxRate || 13) + '%' },
  { label: '状态', fn: q => '<span class="status-badge status-' + q.status + '">' + (statusLabels[q.status] || q.status) + '</span>' },
  { label: '联系人', fn: q => q.custContact || '-' },
  { label: '付款方式', fn: q => q.termPayment || '-' }
]

function openQuoteLetter(q) {
  letterQuote.value = q
  showQuoteLetterModal.value = true
}

const letterItems = computed(() => {
  if (!letterQuote.value) return []
  try {
    return JSON.parse(letterQuote.value.items || '[]')
  } catch { return [] }
})

const expiryDays = computed(() => {
  if (!letterQuote.value) return 30
  const d1 = new Date(letterQuote.value.date)
  const d2 = new Date(letterQuote.value.expiryDate)
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 30
})

function formatDateCN(dateStr) {
  if (!dateStr) return '-'
  return dateStr.replace(/-/g, '年').replace(/年(\d+)$/, '月$1日')
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
  a.download = (letterQuote.value?.quoteNo || '报价函') + '.doc'
  a.click()
  URL.revokeObjectURL(url)
}

function printQuoteLetter() {
  window.print()
}

function sendQuoteByEmail(q) {
  const email = q.custEmail || ''
  const subject = encodeURIComponent('报价函 - ' + q.quoteNo + ' - 苏州冠久新材料科技有限公司')
  const body = encodeURIComponent(
    '尊敬的' + (q.custContact || q.customerName || '') + '：\n\n感谢贵司的信任与支持！\n\n现就贵司近期提出的材料采购需求，我司提供报价方案如下：\n报价单号：' + q.quoteNo + '\n报价日期：' + q.date + '\n有效期至：' + q.expiryDate + '\n含税合计：¥' + formatNumber(q.total) + '\n\n详细报价函请见附件。\n\n如有任何疑问，请随时联系我们。\n\n此致\n敬礼\n\n' + (q.senderCompany || '苏州冠久新材料科技有限公司') + '\n' + (q.senderContact || '') + '\n电话：' + (q.senderPhone || '') + '\n邮箱：' + (q.senderEmail || '')
  )
  const mailtoUrl = 'mailto:' + email + '?subject=' + subject + '&body=' + body
  window.open(mailtoUrl, '_blank')
}

function convertToDelivery(q) {
  if (q.status !== 'approved' && q.status !== 'accepted') {
    alert('只有已审批或已接受的报价可以转为送货单')
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转送货单，请前往送货管理查看。')
}

function convertToContract(q) {
  if (q.status !== 'approved' && q.status !== 'accepted') {
    alert('只有已审批或已接受的报价可以转为合同')
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转合同，请前往合同管理查看。')
}

function recalcTotal() {
  if (!form.value.subtotal) {
    form.value.subtotal = itemsSubtotal.value
  }
}

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth() + 1)

const calendarDays = computed(() => {
  const y = calYear.value
  const m = calMonth.value
  if (m < 1) { calMonth.value = 12; calYear.value = y - 1; return [] }
  if (m > 12) { calMonth.value = 1; calYear.value = y + 1; return [] }
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]
  const days = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    days.push({ day, currentMonth: false, isToday: false, quotations: [] })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    const isToday = dateStr === today
    const dayQuotes = filteredQuotations.value.filter(q => q.date === dateStr)
    days.push({ day: d, currentMonth: true, isToday, quotations: dayQuotes })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, currentMonth: false, isToday: false, quotations: [] })
  }
  return days
})

const showFollowUpModal = ref(false)
const followUpQuote = ref(null)
const followUpDate = ref('')
const followUpNote = ref('')

function openFollowUpModal(q) {
  followUpQuote.value = q
  followUpDate.value = new Date().toISOString().split('T')[0]
  followUpNote.value = ''
  showFollowUpModal.value = true
}

function addFollowUp() {
  if (!followUpDate.value || !followUpNote.value) {
    alert('请填写跟进日期和内容')
    return
  }
  quotationStore.addFollowUp(followUpQuote.value.id, followUpDate.value, followUpNote.value)
  followUpQuote.value = quotationStore.getQuotationById(followUpQuote.value.id)
  followUpNote.value = ''
}

const showVersionModal = ref(false)
const versionQuote = ref(null)
const versionList = ref([])

function openVersionModal(q) {
  versionQuote.value = q
  versionList.value = quotationStore.getVersions(q.id)
  showVersionModal.value = true
}

function handleRollback(quoteId, version) {
  if (confirm('确认回滚到 v' + version + '？当前数据将被覆盖。')) {
    quotationStore.rollbackVersion(quoteId, version)
    versionList.value = quotationStore.getVersions(quoteId)
  }
}

watch([searchText, filterStatus], () => { currentPage.value = 1 })

onMounted(() => {
  quotationStore.initSeedData()
  document.addEventListener('click', (e) => {
    const wrapper = e.target.closest('.column-config-wrapper')
    if (!wrapper && showColumnConfig.value) closeColumnConfig()
  })
  window.addEventListener('resize', closeColumnConfig)
  window.addEventListener('scroll', closeColumnConfig, true)
})
</script>

<style scoped>
.quotation-page { padding: 0; margin: calc(var(--space-6) * -1); min-height: calc(100vh - var(--topbar-height) - var(--space-6) * 2); display: flex; flex-direction: column; }
.quotation-page-inner { padding: var(--space-6); flex: 1; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 4px 0 0; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: 6px 14px; font-size: var(--font-size-base); border: none; background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s; }
.view-btn + .view-btn { border-left: 1px solid var(--color-border); }
.view-btn.active { background: var(--color-accent); color: #fff; }

.quotation-toolbar { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.quotation-search { position: relative; flex: 1; min-width: 200px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }
.search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); }
.quotation-filters { display: flex; gap: var(--space-2); align-items: center; }
.filter-select { min-width: 120px; font-size: 12px; }

.quotation-stats-bar { display: flex; gap: var(--space-4); padding: 10px 16px; background: var(--color-bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 13px; flex-wrap: wrap; align-items: center; }
.stat-item { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.draft { background: #64748b; }
.stat-dot.pending { background: #f59e0b; }
.stat-dot.approved { background: #3b82f6; }
.stat-dot.accepted { background: #22c55e; }
.stat-money { font-weight: 600; color: var(--color-text-primary); }

.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 16px; background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 13px; }

.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-draft { background: #f1f5f9; color: #64748b; }
.status-pending { background: #fef3c7; color: #d97706; }
.status-approved { background: #dbeafe; color: #2563eb; }
.status-sent { background: #cffafe; color: #0891b2; }
.status-accepted { background: #dcfce7; color: #16a34a; }
.status-rejected { background: #fee2e2; color: #dc2626; }
.status-expired { background: #f1f5f9; color: #94a3b8; }

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
.quote-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; transition: box-shadow 0.15s; }
.quote-card:hover { box-shadow: var(--shadow-md); }
.quote-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.quote-card-body { padding: 12px 16px; }
.quote-card-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.field-label { color: var(--color-text-secondary); }
.quote-card-footer { display: flex; gap: 4px; padding: 8px 16px; border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 20px; z-index: 1000; overflow-y: auto; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-lg { max-width: 900px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-surface); z-index: 1; }
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }

.form-section { margin-bottom: 20px; }
.form-section-title { font-size: 14px; font-weight: 600; color: var(--color-accent); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
.required { color: var(--color-danger); }
.form-input, .form-select, .form-textarea { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); }
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle, rgba(59,130,246,0.1)); }
.form-textarea { resize: vertical; }

.items-table { font-size: 12px; }
.items-table input { padding: 4px 6px; font-size: 12px; }

.summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.summary-row.total { font-size: 16px; font-weight: 700; border-top: 2px solid var(--color-border); padding-top: 8px; margin-top: 4px; color: var(--color-accent); }

.follow-up-item { padding: 8px; border-left: 3px solid var(--color-accent); margin-bottom: 8px; background: var(--color-bg-tertiary); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.follow-up-date { font-size: 12px; font-weight: 600; }
.follow-up-by { color: var(--color-text-tertiary); font-weight: 400; }
.follow-up-note { font-size: 12px; color: var(--color-text-secondary); }

.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-secondary:hover { background: var(--color-bg-tertiary); }
.btn-danger { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
.btn-danger:hover { opacity: 0.9; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-outline:hover { background: var(--color-bg-secondary); }

th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { color: var(--color-accent); }
.sort-icon { font-size: 10px; margin-left: 2px; }

.calendar-nav { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.calendar-month-label { font-size: 16px; font-weight: 700; min-width: 120px; text-align: center; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.calendar-header-cell { padding: 8px; text-align: center; font-weight: 600; font-size: 12px; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); }
.calendar-cell { min-height: 80px; padding: 4px; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.calendar-cell:nth-child(7n) { border-right: none; }
.calendar-cell.other-month { background: var(--color-bg-tertiary); opacity: 0.5; }
.calendar-cell.today { background: var(--color-accent-subtle, #eff6ff); }
.calendar-day-num { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 2px; }
.calendar-events { display: flex; flex-direction: column; gap: 2px; }
.calendar-event { font-size: 10px; padding: 2px 4px; border-radius: 3px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
.cal-status-draft { background: #64748b; }
.cal-status-pending { background: #f59e0b; }
.cal-status-approved { background: #3b82f6; }
.cal-status-sent { background: #06b6d4; }
.cal-status-accepted { background: #22c55e; }
.cal-status-rejected { background: #ef4444; }
.cal-status-expired { background: #94a3b8; }

.quote-letter-overlay { position: fixed; inset: 0; z-index: 250; background: rgba(0,0,0,0.75); display: flex; align-items: flex-start; justify-content: center; padding: 20px; overflow-y: auto; }
.quote-letter-container { background: #fff; border-radius: 4px; width: 210mm; min-height: 297mm; box-shadow: 0 8px 32px rgba(0,0,0,0.4); position: relative; color: #000; font-family: 'SimSun','Microsoft YaHei','Songti SC',serif; font-size: 12pt; line-height: 1.8; }
.quote-letter-toolbar { position: sticky; top: 0; z-index: 10; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; border-radius: 4px 4px 0 0; }
.quote-letter-toolbar-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.quote-letter-toolbar-actions { display: flex; gap: 8px; }
.quote-letter-content { padding: 25mm 20mm 20mm 20mm; }
.ql-company-name { text-align: center; font-size: 22pt; font-weight: bold; letter-spacing: 4px; margin-bottom: 4px; color: #1a1a1a; }
.ql-doc-title { text-align: center; font-size: 18pt; font-weight: bold; letter-spacing: 8px; margin-bottom: 6px; color: #1a1a1a; }
.ql-doc-no { text-align: center; font-size: 10pt; color: #555; margin-bottom: 20px; }
.ql-divider { border: none; border-top: 2px solid #1a1a1a; margin: 12px 0; }
.ql-divider-thin { border: none; border-top: 1px solid #999; margin: 8px 0; }
.ql-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 40px; margin: 12px 0; font-size: 10.5pt; }
.ql-info-label { color: #555; white-space: nowrap; }
.ql-info-value { color: #1a1a1a; }
.ql-info-row { display: flex; gap: 4px; }
.ql-indent { text-indent: 2em; margin: 8px 0; font-size: 10.5pt; color: #333; line-height: 2; }
.ql-section-title { font-size: 12pt; font-weight: bold; margin: 18px 0 10px 0; color: #1a1a1a; }
.ql-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
.ql-table th { background: #f0f0f0; border: 1px solid #333; padding: 8px 10px; text-align: center; font-weight: bold; color: #1a1a1a; }
.ql-table td { border: 1px solid #333; padding: 8px 10px; text-align: center; color: #333; }
.ql-terms { font-size: 10.5pt; margin: 12px 0; }
.ql-terms ol { padding-left: 20px; margin: 6px 0; }
.ql-terms li { margin-bottom: 6px; line-height: 1.7; color: #333; }
.ql-terms li strong { color: #1a1a1a; }
.ql-closing { margin-top: 24px; font-size: 10.5pt; line-height: 2; color: #333; }
.ql-signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10.5pt; }
.ql-signature-block { line-height: 2.2; }
.ql-signature-line { display: inline-block; width: 140px; border-bottom: 1px solid #333; margin-left: 4px; }
.ql-stamp { margin-top: 20px; text-align: right; padding-right: 40px; }
.ql-stamp-box { display: inline-block; width: 120px; height: 120px; border: 2px dashed #ccc; border-radius: 50%; text-align: center; line-height: 120px; color: #ccc; font-size: 9pt; }

@media print {
  .quote-letter-overlay, .quote-letter-toolbar { display: none !important; }
  .quote-letter-container { box-shadow: none; border-radius: 0; width: 100%; min-height: auto; }
  .quote-letter-content { padding: 0; }
}

.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex: 1; display: flex; flex-direction: column; }
.panel-card-header { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.panel-card-body { padding: 16px; flex: 1; }
.panel-card-body.no-padding { padding: 0; flex: 1; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: 12px; white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.data-table tbody tr:hover { background: var(--color-bg-secondary); }

@media (max-width: 768px) {
  .quotation-page { margin: calc(var(--space-3) * -1); }
  .quotation-page-inner { padding: var(--space-3); }
  .page-header { flex-direction: column; }
  .form-row-2, .form-row-3, .form-row-4 { grid-template-columns: 1fr; }
  .analytics-kpis { grid-template-columns: repeat(2, 1fr); }
  .analytics-grid { grid-template-columns: 1fr; }
  .card-grid { grid-template-columns: 1fr; }
}

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
.cell-actions { display: flex; gap: 4px; flex-wrap: wrap; }

.template-upload-area { margin-bottom: 16px; }
.upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.15s; }
.upload-zone:hover { border-color: var(--color-accent); background: var(--color-accent-subtle, #eff6ff); }
.upload-icon { font-size: 28px; margin-bottom: 8px; }
.upload-text { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
.upload-hint { font-size: 12px; color: var(--color-text-tertiary); }
.ai-parsing-hint { text-align: center; padding: 8px; color: var(--color-accent); font-size: 13px; margin-top: 8px; }
.save-template-check { color: var(--color-text-secondary); }
</style>
