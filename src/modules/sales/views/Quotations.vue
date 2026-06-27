<template>
  <div class="quotation-page">
    <div class="quotation-page-inner">
      <div class="page-header">
        <div>
          <h2 class="page-header-title">报价管理</h2>
          <p class="page-header-subtitle">
            统一管理报价创建、审批、跟踪和转送货
            <Icon name="chevronRight" :size="14" />
          </p>
        </div>
        <div class="page-header-actions">
          <div class="view-toggle">
            <button
              v-for="v in viewModes"
              :key="v.key"
              class="view-btn"
              :class="{ active: currentView === v.key }"
              :title="v.icon + ' ' + v.label"
              @click="currentView = v.key"
            >
              <Icon :name="v.icon" :size="14" />
              {{ v.label }}
            </button>
          </div>
          <button class="btn btn-outline" @click="showAnalytics = !showAnalytics">
            {{ showAnalytics ? '列表' : '分析' }}
          </button>
          <button class="btn btn-outline" @click="handleExport">导出报价</button>
          <button
            v-if="canApprove"
            class="btn btn-outline"
            :disabled="selectedIds.length === 0"
            @click="handleBatchApprove"
          >
            批量审批
          </button>
          <button class="btn btn-outline" @click="openComparisonModal">对比</button>
          <button
            v-if="canDelete"
            class="btn btn-outline"
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            删除所选
          </button>
          <button class="btn btn-outline" @click="showTemplateModal = true">模板</button>
          <button v-if="canCreate" class="btn btn-primary" @click="openAddModal">新建报价</button>
        </div>
      </div>

      <div class="quotation-toolbar">
        <div class="quotation-search">
          <span class="search-icon"><Icon name="search" :size="14" /></span>
          <input
            v-model="searchText"
            type="text"
            class="search-input"
            placeholder="搜索报价编号/客户名称..."
          />
        </div>
        <div class="quotation-filters">
          <DataSelect
            v-model="filterCustomerId"
            module="customer"
            variant="active"
            value-field="id"
            label-field="name"
            placeholder="全部客户"
            clearable
            style="min-width: 160px"
          />
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
          <button class="btn btn-ghost btn-sm" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
            <Icon :name="sortDir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="14" />
          </button>
        </div>
        <div class="quick-filter-tags quick-filter-tags-inline">
          <button
            class="quick-filter-tag"
            :class="{ active: quickFilter === 'today' }"
            @click="setQuickFilter('today')"
          >
            今天
          </button>
          <button class="quick-filter-tag" :class="{ active: quickFilter === 'week' }" @click="setQuickFilter('week')">
            本周
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: quickFilter === 'month' }"
            @click="setQuickFilter('month')"
          >
            本月
          </button>
        </div>
      </div>

      <div v-if="activeFilterTags.length > 0" class="filter-tags-bar">
        <span class="filter-tags-label">筛选条件</span>
        <span v-for="tag in activeFilterTags" :key="tag.key" class="filter-tag-item">
          {{ tag.label }}
          <button class="filter-tag-remove" @click="removeFilterTag(tag.key)">×</button>
        </span>
        <button class="filter-tag-clear" @click="clearAllFilters">清除全部</button>
      </div>

      <div class="quotation-stats-bar">
        <div
          class="stats-ring-section"
          style="cursor: pointer"
          title="点击筛选已接受报价"
          @click="handleRingClick"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" class="stats-ring-svg">
            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--color-border)" stroke-width="3" />
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              :stroke="conversionColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="conversionDash"
              stroke-dashoffset="0"
              transform="rotate(-90 24 24)"
              class="stats-ring-progress"
            />
          </svg>
          <div class="stats-ring-text">
            <span class="stats-ring-percent" :style="{ color: conversionColor }">
              {{ quotationStore.conversionRate }}%
            </span>
            <span class="stats-ring-label">转化率</span>
          </div>
        </div>
        <div class="stats-items">
          <div class="stat-item">
            <Icon name="hash" :size="14" class="stat-icon total" />
            <span class="stat-num">{{ quotationStore.quotations.length }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.total.trend">
              {{ statsTrends.total.trend === 'up' ? '↑' : statsTrends.total.trend === 'down' ? '↓' : '→' }}{{ Math.abs(statsTrends.total.pct) }}%
            </span>
            <span class="stat-label">总计</span>
          </div>
          <div class="stat-item">
            <Icon name="edit3" :size="14" class="stat-icon draft" />
            <span class="stat-num">{{ quotationStore.draftCount }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.draft.trend">
              {{ statsTrends.draft.trend === 'up' ? '↑' : statsTrends.draft.trend === 'down' ? '↓' : '→' }}{{ Math.abs(statsTrends.draft.pct) }}%
            </span>
            <span class="stat-label">草稿</span>
          </div>
          <div class="stat-item">
            <Icon name="clock" :size="14" class="stat-icon pending" />
            <span class="stat-num">{{ quotationStore.pendingCount }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.pending.trend">
              {{ statsTrends.pending.trend === 'up' ? '↑' : statsTrends.pending.trend === 'down' ? '↓' : '→' }}{{ Math.abs(statsTrends.pending.pct) }}%
            </span>
            <span class="stat-label">待审</span>
          </div>
          <div class="stat-item">
            <Icon name="checkCircle" :size="14" class="stat-icon approved" />
            <span class="stat-num">{{ quotationStore.approvedCount }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.approved.trend">
              {{ statsTrends.approved.trend === 'up' ? '↑' : statsTrends.approved.trend === 'down' ? '↓' : '→' }}{{ Math.abs(statsTrends.approved.pct) }}%
            </span>
            <span class="stat-label">已审</span>
          </div>
          <div class="stat-item">
            <Icon name="thumbsUp" :size="14" class="stat-icon accepted" />
            <span class="stat-num">{{ quotationStore.acceptedCount }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.accepted.trend">
              {{ statsTrends.accepted.trend === 'up' ? '↑' : statsTrends.accepted.trend === 'down' ? '↓' : '→'
              }}{{ Math.abs(statsTrends.accepted.pct) }}%
            </span>
            <span class="stat-label">已接受</span>
          </div>
        </div>
        <div class="stats-money-items">
          <div class="stat-money-item">
            <span class="stat-money-icon"><Icon name="dollarSign" :size="14" /></span>
            <span class="stat-money-val">¥{{ formatNumber(quotationStore.totalAmount) }}</span>
            <span class="stat-trend" :class="'trend-' + statsTrends.amount.trend">
              {{ statsTrends.amount.trend === 'up' ? '↑' : statsTrends.amount.trend === 'down' ? '↓' : '→'
              }}{{ Math.abs(statsTrends.amount.pct) }}%
            </span>
            <span class="stat-money-label">总额</span>
          </div>
          <div class="stat-money-item">
            <span class="stat-money-icon"><Icon name="percent" :size="14" /></span>
            <span class="stat-money-val" :class="profitClass(quotationStore.avgProfitMargin)">
              {{ quotationStore.avgProfitMargin }}%
            </span>
            <span class="stat-trend" :class="'trend-' + statsTrends.profit.trend">
              {{ statsTrends.profit.trend === 'up' ? '↑' : statsTrends.profit.trend === 'down' ? '↓' : '→'
              }}{{ Math.abs(statsTrends.profit.pct) }}%
            </span>
            <span class="stat-money-label">平均利润率</span>
          </div>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline btn-sm" @click="toggleColumnConfig">
            <Icon name="setting" :size="14" />
            列配置
          </button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter((c) => !c.hidden)" :key="col.key" class="column-config-item">
              <input v-model="columnVisible[col.key]" type="checkbox" />
              {{ col.label }}
            </label>
          </div>
        </div>
      </div>

      <Transition name="batch-slide">
      <div v-if="selectedIds.length > 0" class="batch-bar">
          <span class="batch-count-badge">{{ selectedIds.length }}</span>
          <span>已选 {{ selectedIds.length }} 项</span>
          <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
        </div>
      </Transition>

      <QuotationAnalytics v-if="showAnalytics" />

      <template v-else>
        <div v-if="currentView === 'table'" class="panel-card">
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 40px">
                      <div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">
                        <Icon name="checkCircle" :size="14" />
                      </div>
                    </th>
                    <th style="width: 50px; text-align: center">序号</th>
                    <th v-if="columnVisible.quoteNo">
                      <span class="th-icon"><Icon name="hash" :size="14" /></span>
                      报价编号
                    </th>
                    <th v-if="columnVisible.date" class="sortable" @click="toggleSort('date')">
                      <span class="th-icon"><Icon name="calendar" :size="14" /></span>
                      日期
                      <span class="sort-icon">
                        <Icon
                          :name="sortField === 'date' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'"
                          :size="14"
                        />
                      </span>
                    </th>
                    <th v-if="columnVisible.customer">
                      <span class="th-icon"><Icon name="building" :size="14" /></span>
                      客户
                    </th>
                    <th v-if="columnVisible.grade">
                      <span class="th-icon"><Icon name="package" :size="14" /></span>
                      品号
                    </th>
                    <th v-if="columnVisible.unitPrice">
                      <span class="th-icon"><Icon name="dollarSign" :size="14" /></span>
                      单价含税
                    </th>
                    <th v-if="columnVisible.total">
                      <span class="th-icon"><Icon name="dollarSign" :size="14" /></span>
                      金额
                    </th>
                    <th v-if="columnVisible.status">
                      <span class="th-icon"><Icon name="list" :size="14" /></span>
                      状态
                    </th>
                    <th v-if="columnVisible.notes">
                      <span class="th-icon"><Icon name="messageSquare" :size="14" /></span>
                      备注
                    </th>
                    <th>
                      <span class="th-icon"><Icon name="settings" :size="14" /></span>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pagedQuotations.length === 0">
                    <td :colspan="3 + visibleColCount" class="empty-state">
                      <div class="empty-state-icon"><Icon name="empty" :size="24" /></div>
                      暂无报价数据
                    </td>
                  </tr>
                  <tr v-for="(q, index) in pagedQuotations" :key="q.id">
                    <td>
                      <div
                        class="checkbox"
                        :class="{ checked: selectedIds.includes(q.id) }"
                        @click="toggleSelect(q.id)"
                      >
                        <Icon name="checkCircle" :size="14" />
                      </div>
                    </td>
                    <td style="width: 50px; text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                      {{ (currentPage - 1) * pageSize + index + 1 }}
                    </td>
                    <td v-if="columnVisible.quoteNo" class="mono">
                      <strong style="color: var(--color-accent)">{{ q.quoteNo }}</strong>
                    </td>
                    <td v-if="columnVisible.date">{{ q.date || '-' }}</td>
                    <td v-if="columnVisible.customer">{{ q.customerName }}</td>
                    <td v-if="columnVisible.grade">{{ getFirstGrade(q) }}</td>
                    <td v-if="columnVisible.unitPrice" class="mono">{{ getFirstPrice(q) }}</td>
                    <td
                      v-if="columnVisible.total"
                      class="mono"
                      :class="{ 'anomaly-highlight': anomalyData[(currentPage - 1) * pageSize + index]?.isAnomaly }"
                    >
                       ¥{{ formatNumber(q.total || 0) }}
                      <span
                        v-if="trendData[(currentPage - 1) * pageSize + index]"
                        :class="'trend-' + trendData[(currentPage - 1) * pageSize + index].trend"
                      >
                        {{
                          trendData[(currentPage - 1) * pageSize + index].trend === 'up'
                            ? '↑'
                            : trendData[(currentPage - 1) * pageSize + index].trend === 'down'
                              ? '↓'
                              : '→'
                        }}
                      </span>
                    </td>
                    <td v-if="columnVisible.status">
                      <span class="status-badge" :class="'status-' + q.status">
                        {{ statusLabels[q.status] || q.status }}
                      </span>
                    </td>
                    <td v-if="columnVisible.notes">{{ q.notes || '-' }}</td>
                    <td class="cell-actions">
                      <button class="btn btn-sm btn-icon" title="编辑" @click="openEditModal(q)">
                        <Icon name="edit" :size="14" />
                      </button>
                      <button class="btn btn-sm btn-icon" title="预览" @click="openQuoteLetter(q)">
                        <Icon name="eye" :size="14" />
                      </button>
                      <button
                        v-if="canApprove && canApproveQ(q)"
                        class="btn btn-sm btn-primary"
                        @click="handleApprove(q)"
                      >
                        <Icon name="checkCircle" :size="14" />
                        确认
                      </button>
                      <button
                        v-if="q.status === 'approved' || q.status === 'accepted'"
                        class="btn btn-sm btn-outline"
                        @click="convertToDelivery(q)"
                      >
                        <Icon name="truck" :size="14" />
                        送货
                      </button>
                      <button
                        v-if="q.status === 'approved' || q.status === 'accepted'"
                        class="btn btn-sm btn-outline"
                        @click="convertToContract(q)"
                      >
                        <Icon name="file" :size="14" />
                        合同
                      </button>
                      <div class="action-more-wrapper">
                        <button class="btn btn-sm btn-icon" title="更多操作" @click="toggleActionMenu(q.id)">
                          <Icon name="moreHorizontal" :size="14" />
                        </button>
                        <div v-if="activeActionMenu === q.id" class="action-more-dropdown">
                          <button class="action-more-item" @click="(handleDuplicate(q), closeActionMenu())">
                            <Icon name="copy" :size="14" />
                            复制
                          </button>
                          <button class="action-more-item" @click="(sendQuoteByEmail(q), closeActionMenu())">
                            <Icon name="mail" :size="14" />
                            邮件
                          </button>
                          <button class="action-more-item" @click="(openFollowUpModal(q), closeActionMenu())">
                            <Icon name="phone" :size="14" />
                            电话
                          </button>
                          <button class="action-more-item" @click="(openVersionModal(q), closeActionMenu())">
                            <Icon name="refresh" :size="14" />
                            版本
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="totalPages > 1" class="pagination-bar">
              <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
              <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
              <button
                v-for="p in visiblePages"
                :key="p"
                class="pagination-btn"
                :class="{ active: p === currentPage }"
                @click="currentPage = p"
              >
                {{ p }}
              </button>
              <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
              <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">
                »
              </button>
              <span class="pagination-info">
                第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredQuotations.length }} 条
              </span>
            </div>
          </div>
        </div>

        <div v-if="currentView === 'list'" class="panel-card">
          <div class="panel-card-body">
            <div v-if="filteredQuotations.length === 0" class="empty-state">
              <div class="empty-state-icon"><Icon name="empty" :size="24" /></div>
              暂无报价数据
            </div>
            <div v-for="q in filteredQuotations" :key="q.id" class="list-item" @click="openEditModal(q)">
              <div class="list-item-check" @click.stop>
                <div class="checkbox" :class="{ checked: selectedIds.includes(q.id) }" @click="toggleSelect(q.id)">
                  <Icon name="checkCircle" :size="14" />
                </div>
              </div>
              <div class="list-item-avatar" :style="{ background: statusColors[q.status] || '#94a3b8' }">
                {{ (q.quoteNo || '?').slice(-3) }}
              </div>
              <div class="list-item-main">
                <div class="list-item-row1">
                  <strong class="list-item-name">
                    <Icon name="hash" :size="14" />
                    {{ q.quoteNo }}
                  </strong>
                  <span class="status-badge" :class="'status-' + q.status">
                    {{ statusLabels[q.status] || q.status }}
                  </span>
                  <span class="mono" :class="profitClass(q.profitMargin)">
                    <Icon name="percent" :size="14" />
                    {{ q.profitMargin || 0 }}%
                  </span>
                </div>
                <div class="list-item-row2">
                  <span>
                    <Icon name="building" :size="14" />
                    {{ q.customerName }}
                  </span>
                  <span>
                    <Icon name="calendar" :size="14" />
                    {{ q.date }}
                  </span>
                  <span v-if="q.expiryDate">
                    <Icon name="bell" :size="14" />
                    鍒版湡 {{ q.expiryDate }}
                  </span>
                </div>
                <div class="list-item-row3">
                  <span class="mono">
                    <Icon name="dollarSign" :size="14" />
                    楼{{ formatNumber(q.total) }}
                  </span>
                  <span v-if="q.notes" class="text-muted">
                    <Icon name="messageSquare" :size="14" />
                    {{ q.notes }}
                  </span>
                </div>
              </div>
              <div class="list-item-actions" @click.stop>
                <button class="btn btn-sm btn-outline" @click="openEditModal(q)">
                  <Icon name="edit" :size="14" />
                  编辑
                </button>
                <button v-if="canApprove && canApproveQ(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)">
                  <Icon name="checkCircle" :size="14" />
                  确认
                </button>
                <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)">
                  <Icon name="eye" :size="14" />
                  预览
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentView === 'card'" class="card-grid">
          <div v-if="filteredQuotations.length === 0" class="empty-state" style="grid-column: 1/-1">
            <div class="empty-state-icon"><Icon name="empty" :size="24" /></div>
              暂无报价数据
          </div>
          <div v-for="q in filteredQuotations" :key="q.id" class="quote-card" :class="'card-status-' + q.status">
            <div class="quote-card-header">
              <strong class="mono">
                <Icon name="hash" :size="14" />
                {{ q.quoteNo }}
              </strong>
              <span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
            </div>
            <div class="quote-card-body">
              <div class="quote-card-field">
                <span class="field-label">
                  <Icon name="building" :size="14" />
                  客户
                </span>
                <span>{{ q.customerName }}</span>
              </div>
              <div class="quote-card-field">
                <span class="field-label">
                  <Icon name="dollarSign" :size="14" />
                  金额
                </span>
                  <span class="mono">¥{{ formatNumber(q.total) }}</span>
              </div>
              <div class="quote-card-field">
                <span class="field-label">
                  <Icon name="percent" :size="14" />
                  利润率
                </span>
                <span class="mono" :class="profitClass(q.profitMargin)">{{ q.profitMargin || 0 }}%</span>
              </div>
              <div class="quote-card-field">
                <span class="field-label">
                  <Icon name="bell" :size="14" />
                  到期日
                </span>
                <span>{{ q.expiryDate || '-' }}</span>
              </div>
            </div>
            <div class="quote-card-footer">
                <button class="btn btn-sm btn-outline" @click="openEditModal(q)">
                  <Icon name="edit" :size="14" />
                  编辑
                </button>
              <button v-if="canApprove && canApproveQ(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)">
                <Icon name="checkCircle" :size="14" />
                确认
              </button>
                <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)">
                  <Icon name="eye" :size="14" />
                  预览
                </button>
            </div>
          </div>
        </div>
      </template>

      <template v-if="!showAnalytics">
        <QuotationCalendarView
          v-if="currentView === 'calendar' || currentView === 'week'"
          :current-view="currentView"
          :quotations="filteredQuotations"
          @edit="openEditModal"
        />

        <!-- 销售漏斗视图 -->
        <div v-if="currentView === 'funnel'" class="panel-card" style="margin-bottom: var(--space-4)">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="trendingUp" :size="14" />
              销售漏斗
            </span>
          </div>
          <div class="panel-card-body">
            <div class="sales-funnel">
              <template v-for="(stage, idx) in funnelStages" :key="stage.key">
                <div
                  class="funnel-stage"
                  style="cursor: pointer"
                  :title="'点击筛选 ' + stage.label"
                  @click="handleFunnelStageClick(stage.key)"
                >
                  <div
                    class="funnel-bar"
                    :style="{ height: stage.height + 'px', background: stage.color }"
                    :class="{ 'funnel-bar-active': filterStatus === stage.key }"
                  >
                    <span class="funnel-bar-label">{{ stage.count }}</span>
                  </div>
                  <span class="funnel-stage-name">{{ stage.label }}</span>
                  <span v-if="stage.rate" class="funnel-stage-rate">{{ stage.rate }}%</span>
                </div>
                <div v-if="idx < funnelStages.length - 1" class="funnel-conversion-arrow">
                  <span class="funnel-conversion-label">{{ funnelStages[idx + 1].rate }}%</span>
                  <span class="funnel-conversion-icon">→</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <QuotationFormModal
      :show-modal="showEditModal"
      :editing-quotation="editingQuotation"
      @close="showEditModal = false"
      @save="handleFormSave"
    />
    <QuotationPreview
      :show-modal="showQuoteLetterModal"
      :quotation="letterQuote"
      @close="showQuoteLetterModal = false"
    />
    <QuotationTemplateModal
      :show-modal="showTemplateModal"
      @close="showTemplateModal = false"
      @apply="createQuoteFromTemplate"
    />
    <QuotationFollowUpModal :show-modal="showFollowUpModal" :quote="followUpQuote" @close="showFollowUpModal = false" />
    <QuotationVersionModal :show-modal="showVersionModal" :quote="versionQuote" @close="showVersionModal = false" />
    <QuotationComparisonModal
      :show-modal="showComparisonModal"
      :selected-ids="selectedIds"
      @close="showComparisonModal = false"
    />
  </div>
</template>

<script>
export default { name: 'Quotations' }
</script>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { usePermission } from '@/utils/permissionGuard'
import { formatNumber } from '@/utils/format'
import { useClickOutside } from '@/composables/useClickOutside'
import { useTableEnhance } from '@/composables/useTableEnhance'
import QuotationFormModal from '@/modules/sales/components/quotations/QuotationFormModal.vue'
import QuotationPreview from '@/modules/sales/components/quotations/QuotationPreview.vue'
import QuotationTemplateModal from '@/modules/sales/components/quotations/QuotationTemplateModal.vue'
import QuotationFollowUpModal from '@/modules/sales/components/quotations/QuotationFollowUpModal.vue'
import QuotationVersionModal from '@/modules/sales/components/quotations/QuotationVersionModal.vue'
import QuotationComparisonModal from '@/modules/sales/components/quotations/QuotationComparisonModal.vue'
import QuotationAnalytics from '@/modules/sales/components/quotations/QuotationAnalytics.vue'
import QuotationCalendarView from '@/modules/sales/components/quotations/QuotationCalendarView.vue'
import DataSelect from '@/components/DataSelect.vue'

const quotationStore = useQuotationStore()
const customerStore = useCustomerStore()
const perm = usePermission()

const canCreate = computed(() => perm.isAllowed('quote_contract', 'canCreateQuote'))
const canDelete = computed(() => perm.isAllowed('quote_contract', 'canDeleteQuote'))
const canApprove = computed(() => perm.isAllowed('quote_contract', 'canApproveQuote'))

const currentView = ref('table')
const viewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' },
  { key: 'funnel', icon: 'trendingUp', label: '销售漏斗' }
]

const searchText = ref('')
const filterStatus = ref('')
const filterCustomerId = ref('')
const quickFilter = ref('')
const filterDateRange = ref({ start: '', end: '' })
const sortField = ref('date')
const sortDir = ref('desc')
const currentPage = ref(1)
const pageSize = 15
const selectedIds = ref([])
const showAnalytics = ref(false)
const showComparisonModal = ref(false)
const showQuoteLetterModal = ref(false)
const showTemplateModal = ref(false)
const letterQuote = ref(null)

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
const columnDefs = [
  { key: 'check', label: '选择', hidden: true },
  { key: 'quoteNo', label: '报价编号' },
  { key: 'date', label: '日期' },
  { key: 'customer', label: '客户' },
  { key: 'grade', label: '品号' },
  { key: 'unitPrice', label: '单价含税' },
  { key: 'total', label: '金额' },
  { key: 'status', label: '状态' },
  { key: 'notes', label: '备注' },
  { key: 'actions', label: '操作', hidden: true }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter((c) => !c.hidden).map((c) => [c.key, true])))
const visibleColCount = computed(() => columnDefs.filter((c) => !c.hidden && columnVisible.value[c.key]).length)

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
    if (items.length > 0 && items[0].grade) return items[0].grade
  } catch {
    /* ignore */
  }
  return '-'
}

function getFirstPrice(q) {
  try {
    const items = JSON.parse(q.items || '[]')
    if (items.length > 0 && items[0].price) return '¥' + parseFloat(items[0].price).toFixed(2)
  } catch {
    /* ignore */
  }
  return '-'
}

const statusLabels = {
  draft: '草稿',
  pending: '待审批',
  approved: '已审批',
  sent: '已发送',
  accepted: '已接受',
  rejected: '已拒绝',
  expired: '已过期'
}
const statusColors = {
  draft: '#64748b',
  pending: '#f59e0b',
  approved: '#3b82f6',
  sent: '#06b6d4',
  accepted: '#22c55e',
  rejected: '#ef4444',
  expired: '#94a3b8'
}

const RING_CIRC = 2 * Math.PI * 18
const conversionColor = computed(() => {
  const r = quotationStore.conversionRate
  if (r >= 60) return 'var(--color-success)'
  if (r >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const conversionDash = computed(() => {
  const p = (quotationStore.conversionRate || 0) / 100
  return `${p * RING_CIRC} ${RING_CIRC}`
})

const statsTrends = computed(() => {
  const q = quotationStore.quotations || []
  const total = q.length
  const accepted = q.filter((i) => i.status === 'accepted').length
  const pending = q.filter((i) => i.status === 'pending').length
  return {
    total: { trend: total > 10 ? 'up' : total > 5 ? 'neutral' : 'down', pct: total > 10 ? 12 : total > 5 ? 0 : -5 },
    draft: { trend: 'neutral', pct: 0 },
    pending: { trend: pending > 3 ? 'up' : 'down', pct: pending > 3 ? 8 : -3 },
    approved: { trend: 'up', pct: 15 },
    accepted: { trend: accepted > 2 ? 'up' : 'neutral', pct: accepted > 2 ? 10 : 0 },
    amount: { trend: 'up', pct: 8 },
    profit: { trend: 'up', pct: 3 }
  }
})

function handleRingClick() {
  if (filterStatus.value === 'accepted') {
    filterStatus.value = ''
  } else {
    filterStatus.value = 'accepted'
  }
}

function handleFunnelStageClick(stageKey) {
  if (filterStatus.value === stageKey) {
    filterStatus.value = ''
  } else {
    filterStatus.value = stageKey
  }
}

function setQuickFilter(type) {
  if (quickFilter.value === type) {
    quickFilter.value = ''
    filterDateRange.value = { start: '', end: '' }
    return
  }
  quickFilter.value = type
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (type === 'today') {
    filterDateRange.value = { start: today, end: today }
  } else if (type === 'week') {
    const day = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - day + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    filterDateRange.value = { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
  } else if (type === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    filterDateRange.value = { start: firstDay, end: lastDay }
  }
}

const activeFilterTags = computed(() => {
  const tags = []
  if (filterStatus.value) {
    tags.push({ key: 'status', label: '状态: ' + (statusLabels[filterStatus.value] || filterStatus.value) })
  }
  if (filterCustomerId.value) {
    const cust = customerStore.customers?.find((c) => c.id === filterCustomerId.value)
    tags.push({ key: 'customer', label: '客户: ' + (cust?.name || filterCustomerId.value) })
  }
  if (quickFilter.value) {
    const labels = { today: '今天', week: '本周', month: '本月' }
    tags.push({ key: 'quickFilter', label: labels[quickFilter.value] })
  }
  if (searchText.value) {
    tags.push({ key: 'search', label: '搜索: ' + searchText.value })
  }
  return tags
})

function removeFilterTag(key) {
  if (key === 'status') filterStatus.value = ''
  else if (key === 'customer') filterCustomerId.value = ''
  else if (key === 'quickFilter') {
    quickFilter.value = ''
    filterDateRange.value = { start: '', end: '' }
  } else if (key === 'search') searchText.value = ''
}

function clearAllFilters() {
  filterStatus.value = ''
  filterCustomerId.value = ''
  quickFilter.value = ''
  filterDateRange.value = { start: '', end: '' }
  searchText.value = ''
}

/* 销售漏斗 */
const funnelStages = computed(() => {
  const quotations = quotationStore.quotations || []
  const draft = quotations.filter((q) => q.status === 'draft').length
  const pending = quotations.filter((q) => q.status === 'pending').length
  const approved = quotations.filter((q) => q.status === 'approved').length
  const accepted = quotations.filter((q) => q.status === 'accepted').length
  const total = quotations.length || 1
  const maxCount = Math.max(draft, pending, approved, accepted, 1)

  return [
    {
      key: 'draft',
      label: '草稿',
      count: draft,
      height: Math.max(20, (draft / maxCount) * 160),
      color: 'var(--color-text-tertiary)',
      rate: Math.round((draft / total) * 100)
    },
    {
      key: 'pending',
      label: '待审批',
      count: pending,
      height: Math.max(20, (pending / maxCount) * 160),
      color: 'var(--color-warning)',
      rate: draft > 0 ? Math.round((pending / draft) * 100) : 0
    },
    {
      key: 'approved',
      label: '已审批',
      count: approved,
      height: Math.max(20, (approved / maxCount) * 160),
      color: 'var(--color-info)',
      rate: pending > 0 ? Math.round((approved / pending) * 100) : 0
    },
    {
      key: 'accepted',
      label: '已接受',
      count: accepted,
      height: Math.max(20, (accepted / maxCount) * 160),
      color: 'var(--color-success)',
      rate: approved > 0 ? Math.round((accepted / approved) * 100) : 0
    }
  ]
})

const filteredQuotations = computed(() => {
  let list = [...quotationStore.quotations]
  if (searchText.value) {
    const s = searchText.value.toLowerCase()
    list = list.filter(
      (q) =>
        (q.quoteNo || '').toLowerCase().includes(s) ||
        (q.customerName || '').toLowerCase().includes(s) ||
        (q.customerFullName || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) {
    list = list.filter((q) => q.status === filterStatus.value)
  }
  if (filterCustomerId.value) {
    list = list.filter((q) => q.customerId === filterCustomerId.value)
  }
  if (filterDateRange.value.start && filterDateRange.value.end) {
    list = list.filter((q) => {
      if (!q.date) return false
      return q.date >= filterDateRange.value.start && q.date <= filterDateRange.value.end
    })
  }
  list.sort((a, b) => {
    let va = a[sortField.value],
      vb = b[sortField.value]
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

const { trendData, anomalyData } = useTableEnhance(
  computed(() => filteredQuotations.value),
  { trendField: 'total', highlightField: 'total', highlightThreshold: 2 }
)

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

const isAllSelected = computed(
  () => pagedQuotations.value.length > 0 && pagedQuotations.value.every((q) => selectedIds.value.includes(q.id))
)

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !pagedQuotations.value.some((q) => q.id === id))
  } else {
    for (const q of pagedQuotations.value) {
      if (!selectedIds.value.includes(q.id)) selectedIds.value.push(q.id)
    }
  }
}

function profitClass(margin) {
  const m = parseFloat(margin) || 0
  if (m >= 20) return 'text-success'
  if (m >= 10) return 'text-warning'
  return 'text-danger'
}

function canApproveQ(q) {
  return q.status === 'pending' || q.status === 'draft'
}

const showEditModal = ref(false)
const editingQuotation = ref(null)

function openAddModal() {
  editingQuotation.value = null
  showEditModal.value = true
}

function openEditModal(q) {
  editingQuotation.value = q
  showEditModal.value = true
}

function handleFormSave({ data, isEditing, editingId }) {
  if (isEditing) {
    quotationStore.saveVersion(editingId, '编辑保存')
    quotationStore.updateQuotation(editingId, data)
  } else {
    quotationStore.addQuotation(data)
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
  if (confirm('确认审批报价单 ' + q.quoteNo + ' 吗？')) {
    quotationStore.changeStatus(q.id, 'approved')
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条报价吗？')) {
    quotationStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleBatchApprove() {
  if (confirm('确认审批选中的 ' + selectedIds.value.length + ' 条报价吗？')) {
    quotationStore.batchApprove(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  try {
    const data = JSON.stringify(quotationStore.quotations, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quotations_export.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function openQuoteLetter(q) {
  letterQuote.value = q
  showQuoteLetterModal.value = true
}

function sendQuoteByEmail(q) {
  const email = q.custEmail || ''
  const subject = encodeURIComponent('报价函 - ' + q.quoteNo)
  const body = encodeURIComponent(
    '尊敬的 ' +
      (q.custContact || q.customerName || '客户') +
      '：\n\n' +
      '感谢您的信任，报价信息如下：\n' +
      '报价单号：' +
      q.quoteNo +
      '\n报价日期：' +
      (q.date || '') +
      '\n有效期至：' +
      (q.expiryDate || '') +
      '\n含税合计：' +
      formatNumber(q.total) +
      '\n\n如有问题请随时联系。\n\n' +
      (q.senderCompany || '苏州冠久新材料科技有限公司') +
      '\n' +
      (q.senderContact || '') +
      '\n电话：' +
      (q.senderPhone || '') +
      '\n邮箱：' +
      (q.senderEmail || '')
  )
  const mailtoUrl = 'mailto:' + email + '?subject=' + subject + '&body=' + body
  window.open(mailtoUrl, '_blank')
}

function convertToDelivery(q) {
  const result = quotationStore.convertToDelivery(q.id)
  if (!result.success) {
    alert(result.error)
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转送货单，请前往送货管理查看。')
}

function convertToContract(q) {
  const result = quotationStore.convertToContract(q.id)
  if (!result.success) {
    alert(result.error)
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转合同，请前往合同管理查看。')
}

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

const showFollowUpModal = ref(false)
const followUpQuote = ref(null)
const activeActionMenu = ref(null)

function toggleActionMenu(id) {
  activeActionMenu.value = activeActionMenu.value === id ? null : id
}
function closeActionMenu() {
  activeActionMenu.value = null
}

function openFollowUpModal(q) {
  followUpQuote.value = q
  showFollowUpModal.value = true
}

const showVersionModal = ref(false)
const versionQuote = ref(null)

function openVersionModal(q) {
  versionQuote.value = q
  showVersionModal.value = true
}

function openComparisonModal() {
  if (selectedIds.value.length < 2) {
    alert('请至少勾选 2 条报价进行对比')
    return
  }
  if (selectedIds.value.length > 3) {
    alert('最多同时对比 3 条报价')
    return
  }
  showComparisonModal.value = true
}

function createQuoteFromTemplate(tpl) {
  showEditModal.value = true
  editingQuotation.value = { _fromTemplate: tpl }
}

watch([searchText, filterStatus, filterCustomerId, quickFilter], () => {
  currentPage.value = 1
})

function closeColumnConfigOnClick(e) {
  const wrapper = e.target.closest('.column-config-wrapper')
  if (!wrapper && showColumnConfig.value) closeColumnConfig()
  const actionWrapper = e.target.closest('.action-more-wrapper')
  if (!actionWrapper && activeActionMenu.value) closeActionMenu()
}

useClickOutside(closeColumnConfigOnClick)

onMounted(() => {
  window.addEventListener('resize', closeColumnConfig)
  window.addEventListener('scroll', closeColumnConfig, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', closeColumnConfig)
  window.removeEventListener('scroll', closeColumnConfig, true)
})
</script>

<style scoped>
.quotation-page {
  padding: 0;
  margin: calc(var(--space-6) * -1);
  min-height: calc(100vh - var(--topbar-height) - var(--space-6) * 2);
  display: flex;
  flex-direction: column;
}
.quotation-page-inner {
  padding: var(--space-6);
  flex: 1;
  display: flex;
  flex-direction: column;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-4);
}
.page-header-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-1) 0 0;
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.view-btn {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.view-btn + .view-btn {
  border-left: 1px solid var(--color-border);
}
.view-btn.active {
  background: var(--color-accent);
  color: #fff;
}
.quotation-toolbar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.quotation-search {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}
.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.quotation-filters {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.filter-select {
  min-width: 120px;
  font-size: var(--font-size-sm);
}
.quotation-stats-bar {
  display: flex;
  gap: var(--space-5);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-base);
  flex-wrap: wrap;
  align-items: center;
}
.stats-ring-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: var(--space-4);
  border-right: 1px solid var(--color-border);
}
.stats-ring-svg {
  flex-shrink: 0;
}
@keyframes ringDraw {
  from {
    stroke-dashoffset: 113.1;
  }
}
.stats-ring-progress {
  animation: ringDraw 1s ease-out;
  transition: stroke-dasharray 0.6s ease;
}
.stats-ring-text {
  display: flex;
  flex-direction: column;
}
.stats-ring-percent {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}
.stats-ring-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.stats-items {
  display: flex;
  gap: var(--space-4);
  flex: 1;
  flex-wrap: wrap;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}
.stat-icon {
  flex-shrink: 0;
}
.stat-icon.total {
  color: var(--color-accent);
}
.stat-icon.draft {
  color: var(--color-text-tertiary);
}
.stat-icon.pending {
  color: var(--color-warning);
  animation: pendingPulse 2s ease-in-out infinite;
}
.stat-icon.approved {
  color: var(--color-accent);
}
.stat-icon.accepted {
  color: var(--color-success);
}
@keyframes pendingPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
  }
}
.stat-num {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}
.stat-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.stats-money-items {
  display: flex;
  gap: var(--space-4);
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-border);
}
.stat-money-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.stat-money-icon {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.stat-money-val {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}
.stat-money-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.th-icon {
  font-size: var(--font-size-sm);
  margin-right: var(--space-1);
  vertical-align: middle;
  line-height: 1;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent-subtle, #eff6ff);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-base);
}
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.status-draft {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.status-pending {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.status-approved {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.status-sent {
  background: var(--color-cyan-subtle);
  color: var(--color-info);
}
.status-accepted {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-rejected {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.status-expired {
  background: var(--color-gray-subtle);
  color: var(--color-text-tertiary);
}
.mono {
  font-family: var(--font-mono);
}
.text-success {
  color: var(--color-success, #22c55e);
}
.text-warning {
  color: var(--color-warning, #f59e0b);
}
.text-danger {
  color: var(--color-danger, #ef4444);
}
.text-accent {
  color: var(--color-accent);
}
.text-muted {
  color: var(--color-text-tertiary);
}
.cell-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}
.action-more-wrapper {
  position: relative;
  display: inline-flex;
}
.action-more-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) 0;
  z-index: var(--z-dropdown, 100);
  min-width: 140px;
  box-shadow: var(--shadow-lg);
  margin-top: var(--space-1);
}
.action-more-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.action-more-item:hover {
  background: var(--color-bg-secondary);
}
.empty-state {
  text-align: center;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
  color: var(--color-text-tertiary);
  font-size: 24px;
}
.pagination-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
}
.pagination-btn {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  cursor: pointer;
}
.pagination-btn.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: var(--space-2);
}
.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: listSlideIn 0.3s ease-out both;
}
@keyframes listSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.list-item:hover {
  background: var(--color-bg-secondary);
  transform: translateX(2px);
}
.list-item-check {
  flex-shrink: 0;
}
.list-item-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}
.list-item:hover .list-item-avatar {
  transform: scale(1.08);
}
.list-item-main {
  flex: 1;
  min-width: 0;
}
.list-item-row1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.list-item-name {
  font-size: var(--font-size-base);
}
.list-item-row2 {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.list-item-row3 {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}
.list-item-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}
.quote-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.25s ease;
  animation: cardFadeIn 0.4s ease-out both;
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.quote-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.quote-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.quote-card-body {
  padding: var(--space-3) var(--space-4);
}
.quote-card-field {
  display: flex;
  justify-content: space-between;
  padding: var(--space-1) 0;
  font-size: var(--font-size-base);
}
.field-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  white-space: nowrap;
}
.quote-card-footer {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
.btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn:hover {
  background: var(--color-bg-secondary);
}
.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.btn-secondary:hover {
  background: var(--color-bg-tertiary);
}
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
}
.btn-icon {
  padding: var(--space-1);
  min-width: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-outline {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.btn-outline:hover {
  background: var(--color-bg-secondary);
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  color: var(--color-accent);
}
.sort-icon {
  font-size: var(--font-size-xs);
  margin-left: var(--space-1);
}
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex: 1;
  display: flex;
  flex-direction: column;
}
.panel-card-header {
  padding: var(--space-4) var(--space-5);
  font-weight: 600;
  font-size: var(--font-size-base);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.panel-card-body {
  padding: var(--space-4) var(--space-5);
  flex: 1;
}
.panel-card-body.no-padding {
  padding: 0;
  flex: 1;
}
.table-container {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.data-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.data-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.data-table tbody tr:hover {
  background: var(--color-bg-secondary);
}
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.data-table tbody tr {
  animation: rowSlideIn 0.3s ease-out both;
}
.data-table tbody tr:nth-child(1) {
  animation-delay: 0ms;
}
.data-table tbody tr:nth-child(2) {
  animation-delay: 20ms;
}
.data-table tbody tr:nth-child(3) {
  animation-delay: 40ms;
}
.data-table tbody tr:nth-child(4) {
  animation-delay: 60ms;
}
.data-table tbody tr:nth-child(5) {
  animation-delay: 80ms;
}
.data-table tbody tr:nth-child(n + 6) {
  animation-delay: 100ms;
}
.column-config-wrapper {
  position: relative;
}
.column-config-dropdown {
  position: fixed;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  z-index: var(--z-popover, 9999);
  min-width: 200px;
  max-height: 360px;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}
.column-config-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  white-space: nowrap;
}
.column-config-item:hover {
  background: var(--color-surface-hover);
  border-radius: var(--radius-sm);
}
.sales-funnel {
  display: flex;
  align-items: flex-end;
  gap: var(--space-5);
  padding: var(--space-4) 0;
  justify-content: center;
  min-height: 240px;
}
.funnel-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  max-width: 160px;
}
.funnel-bar {
  width: 100%;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--space-2);
  transition: height 0.4s ease;
  min-width: 60px;
}
.funnel-bar-label {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-lg);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.funnel-stage-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.funnel-stage-rate {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}
@media (max-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .quotation-page {
    margin: calc(var(--space-3) * -1);
  }
  .quotation-page-inner {
    padding: var(--space-3);
  }
  .page-header {
    flex-direction: column;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
}
.trend-up {
  color: var(--color-danger);
}
.trend-down {
  color: var(--color-success);
}
.trend-neutral {
  color: var(--color-text-tertiary);
}
.anomaly-highlight {
  background: var(--color-danger-subtle) !important;
}

/* Stats trend indicators */
.stat-trend {
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  font-weight: 600;
  margin-left: var(--space-1);
}
.stat-trend.trend-up {
  color: var(--color-danger);
}
.stat-trend.trend-down {
  color: var(--color-success);
}
.stat-trend.trend-neutral {
  color: var(--color-text-tertiary);
}
.stats-ring-section:hover {
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

/* Quick filter tags */
.quick-filter-tags {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}
.quick-filter-tag {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.quick-filter-tag:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quick-filter-tag.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

/* Filter tags bar */
.filter-tags-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.filter-tags-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
}
.filter-tag-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-subtle, #eff6ff);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.filter-tag-remove {
  border: none;
  background: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--font-size-sm);
  line-height: 1;
  padding: 0;
  margin-left: var(--space-1);
}
.filter-tag-remove:hover {
  color: var(--color-danger);
}
.filter-tag-clear {
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  text-decoration: underline;
  padding: 0;
}
.filter-tag-clear:hover {
  color: var(--color-danger);
}

/* Funnel conversion arrows */
.funnel-conversion-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: var(--space-8);
  gap: var(--space-1);
  min-width: 40px;
}
.funnel-conversion-label {
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-subtle, #eff6ff);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.funnel-conversion-icon {
  font-size: var(--font-size-lg);
  color: var(--color-text-tertiary);
}
.funnel-bar-active {
  box-shadow:
    0 0 0 2px var(--color-accent),
    0 0 12px rgba(59, 130, 246, 0.3);
}
.funnel-stage:hover .funnel-bar {
  filter: brightness(1.1);
  transition: filter 0.2s ease;
}

/* Batch bar animation */
.batch-slide-enter-active {
  animation: batchSlideIn 0.3s ease-out;
}
.batch-slide-leave-active {
  animation: batchSlideIn 0.2s ease-in reverse;
}
@keyframes batchSlideIn {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.batch-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 var(--space-1);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  font-family: var(--font-mono);
}
</style>
