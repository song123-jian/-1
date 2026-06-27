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
            :title="v.icon + ' ' + v.label"
            @click="currentView = v.key"
          >
            <Icon :name="v.icon" :size="14" />
            {{ v.label }}
          </button>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig">
            <Icon name="setting" :size="14" />
            列配置
          </button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label
              v-for="col in columnDefs.filter((c) => c.hideable !== false)"
              :key="col.key"
              class="column-config-item"
            >
              <input v-model="columnVisible[col.key]" type="checkbox" />
              {{ col.label }}
            </label>
          </div>
        </div>
        <button v-if="canExport" class="btn btn-ghost btn-sm" @click="exportCSV">
          <Icon name="upload" :size="14" />
          导出
        </button>
        <button v-if="canCreate" class="btn btn-primary" @click="openForm()">记录回款</button>
      </div>
    </div>

    <div class="fund-pipeline fund-pipeline-compact">
      <div
        class="pipeline-stage"
        :class="{ 'pipeline-stage-clickable': true }"
        title="点击查看全部"
        @click="handlePipelineClick('total')"
      >
        <span class="pipeline-stage-label">应收总额</span>
        <span class="pipeline-stage-value">
          ¥{{ formatMoney(collectionStore.totalCollected + collectionStore.totalPending) }}
        </span>
        <span class="pipeline-stage-percent">100%</span>
      </div>
      <div class="pipeline-arrow">→</div>
      <div
        class="pipeline-stage"
        :class="{ 'pipeline-stage-clickable': true }"
        title="点击筛选已回款"
        @click="handlePipelineClick('collected')"
      >
        <span class="pipeline-stage-label">累计回款</span>
        <span class="pipeline-stage-value" style="color: var(--color-success)">
          ¥{{ formatMoney(collectionStore.totalCollected) }}
        </span>
        <span class="pipeline-stage-percent">{{ pipelineCollectedPercent }}%</span>
      </div>
      <div class="pipeline-arrow">→</div>
      <div
        class="pipeline-stage"
        :class="{ 'pipeline-stage-clickable': true }"
        title="点击筛选待回款"
        @click="handlePipelineClick('pending')"
      >
        <span class="pipeline-stage-label">待回款</span>
        <span class="pipeline-stage-value" style="color: var(--color-warning)">
          ¥{{ formatMoney(collectionStore.totalPending) }}
        </span>
        <span class="pipeline-stage-percent">{{ pipelinePendingPercent }}%</span>
      </div>
      <div class="pipeline-arrow">→</div>
      <div
        class="pipeline-stage pipeline-stage-danger pipeline-stage-pulse"
        :class="{ 'pipeline-stage-clickable': true }"
        title="点击筛选逾期"
        @click="handlePipelineClick('overdue')"
      >
        <span class="pipeline-stage-label">逾期金额</span>
        <span class="pipeline-stage-value" style="color: var(--color-danger)">
          ¥{{ formatMoney(collectionStore.totalOverdue) }}
        </span>
        <span class="pipeline-stage-percent">{{ pipelineOverduePercent }}%</span>
      </div>
    </div>

    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showCollectionStatsExpanded = !showCollectionStatsExpanded">
        <span class="collapsible-stats-title">统计概览</span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showCollectionStatsExpanded }">▼</span>
      </div>
      <div v-show="showCollectionStatsExpanded" class="collapsible-stats-body">
        <div class="stats-row stats-grid-4">
          <div class="stat-card" style="animation-delay: 0ms">
            <div class="stat-card-header">
              <span class="stat-card-label">累计回款</span>
              <Icon name="money" :size="16" style="color: var(--color-success)" />
            </div>
            <div class="stat-card-value" style="color: var(--color-success)">
              ¥{{ formatMoney(collectionStore.totalCollected) }}
            </div>
            <div class="stat-card-trend" :class="collectionTrend.direction">
              <span class="trend-arrow">{{ collectionTrend.direction === 'up' ? '↑' : '↓' }}</span>
              <span class="trend-value">{{ collectionTrend.value }}%</span>
              <span class="trend-label">较上周</span>
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 60ms">
            <div class="stat-card-header">
              <span class="stat-card-label">待回款</span>
              <div class="stat-dot-halo">
                <span class="alert-dot-pulse" style="background: var(--color-warning)"></span>
              </div>
            </div>
            <div class="stat-card-value" style="color: var(--color-warning)">
              ¥{{ formatMoney(collectionStore.totalPending) }}
            </div>
            <div class="stat-card-trend" :class="pendingTrend.direction">
              <span class="trend-arrow">{{ pendingTrend.direction === 'up' ? '↑' : '↓' }}</span>
              <span class="trend-value">{{ pendingTrend.value }}%</span>
              <span class="trend-label">较上周</span>
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 120ms">
            <div class="stat-card-header">
              <span class="stat-card-label">回款率</span>
              <Icon name="chart" :size="16" style="color: var(--color-info)" />
            </div>
            <div class="stat-card-value" style="color: var(--color-info)">{{ collectionStore.collectionRate }}%</div>
          </div>
          <div class="stat-card stat-card-danger-pulse" style="animation-delay: 180ms">
            <div class="stat-card-header">
              <span class="stat-card-label">逾期金额</span>
              <div class="stat-dot-halo">
                <span class="alert-dot-pulse" style="background: var(--color-danger)"></span>
              </div>
            </div>
            <div class="stat-card-value" style="color: var(--color-danger)">
              ¥{{ formatMoney(collectionStore.totalOverdue) }}
            </div>
            <div class="stat-card-trend" :class="overdueTrend.direction">
              <span class="trend-arrow">{{ overdueTrend.direction === 'up' ? '↑' : '↓' }}</span>
              <span class="trend-value">{{ overdueTrend.value }}%</span>
              <span class="trend-label">较上周</span>
            </div>
          </div>
        </div>

        <div class="overview-row">
          <div class="overview-card" style="animation-delay: 0ms">
            <div class="overview-card-title">回款率</div>
            <div class="overview-card-body center">
              <div
                class="progress-ring-wrapper progress-ring-clickable"
                title="点击筛选已回款"
                @click="handlePipelineClick('collected')"
              >
                <svg class="progress-ring" width="80" height="80" viewBox="0 0 80 80">
                  <circle class="progress-ring-bg" cx="40" cy="40" r="26" />
                  <circle
                    class="progress-ring-fill"
                    cx="40"
                    cy="40"
                    r="26"
                    :stroke="getCollectionRateColor(collectionStore.collectionRate)"
                    :stroke-dasharray="getRingCircumference()"
                    :stroke-dashoffset="getRingOffset(collectionStore.collectionRate)"
                  />
                </svg>
                <div class="progress-ring-text">{{ collectionStore.collectionRate }}%</div>
              </div>
              <div class="progress-ring-sub">已回款 / 应收总额</div>
            </div>
          </div>
          <div class="overview-card" style="animation-delay: 60ms">
            <div class="overview-card-title">付款方式分布</div>
            <div class="overview-card-body">
              <div v-for="m in methodDistribution" :key="m.key" class="method-bar-row">
                <span class="method-bar-label">{{ m.label }}</span>
                <div class="method-bar-track">
                  <div class="method-bar-fill" :style="{ width: m.percent + '%', background: m.color }"></div>
                </div>
                <span class="method-bar-value">{{ m.count }}笔</span>
              </div>
            </div>
          </div>
          <div class="overview-card" style="animation-delay: 120ms">
            <div class="overview-card-title">近 7 日回款趋势</div>
            <div class="overview-card-body">
              <div class="trend-chart">
                <div v-for="(d, i) in last7DaysTrend" :key="i" class="trend-bar-wrapper">
                  <div class="trend-bar" :style="{ height: d.percent + '%', background: d.color }"></div>
                  <span class="trend-bar-label">{{ d.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card" style="margin-bottom: var(--space-6)">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              账龄分析
            </span>
          </div>
          <div class="panel-card-body">
            <div class="stats-row stats-grid-4">
              <div class="stat-card">
                <div class="stat-card-value" style="font-size: var(--font-size-2xl)">
                  ¥{{ formatMoney(agingSummary.current) }}
                </div>
                <div class="stat-card-label">未到期</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value" style="font-size: var(--font-size-2xl); color: var(--color-warning)">
                  ¥{{ formatMoney(agingSummary.days30) }}
                </div>
                <div class="stat-card-label">逾期1-30天</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value" style="font-size: var(--font-size-2xl); color: var(--color-danger)">
                  ¥{{ formatMoney(agingSummary.days60) }}
                </div>
                <div class="stat-card-label">逾期31-60天</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value" style="font-size: var(--font-size-2xl); color: var(--color-danger)">
                  ¥{{ formatMoney(agingSummary.daysOver) }}
                </div>
                <div class="stat-card-label">逾期 60 天以上</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="alertCollections.length > 0" class="alert-panel">
          <div class="alert-panel-header">
            <div class="alert-dot-halo">
              <span class="alert-dot-pulse" style="background: var(--color-danger)"></span>
            </div>
            <span class="alert-panel-title">回款预警</span>
            <span class="alert-panel-count">{{ alertCollections.length }} 条异常</span>
          </div>
          <div class="alert-list">
            <div
              v-for="(c, i) in alertCollections"
              :key="c.id"
              class="alert-item"
              :style="{ animationDelay: i * 60 + 'ms' }"
            >
              <span class="alert-item-no">{{ c.collectionNo }}</span>
              <span class="alert-item-customer">{{ c.customerName }}</span>
               <span class="alert-item-amount cell-mono">¥{{ formatMoney(c.amount) }}</span>
              <span class="alert-item-days" :class="c.overdueDays > 30 ? 'danger' : 'warning'">
                逾期 {{ c.overdueDays }} 天
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="quick-filter-tags">
        <button class="quick-filter-tag" :class="{ active: quickFilter === 'today' }" @click="setQuickFilter('today')">
          今天
        </button>
        <button class="quick-filter-tag" :class="{ active: quickFilter === 'week' }" @click="setQuickFilter('week')">
          本周
        </button>
        <button class="quick-filter-tag" :class="{ active: quickFilter === 'month' }" @click="setQuickFilter('month')">
          本月
        </button>
      </div>
      <input
        v-model="filters.search"
        type="text"
        class="form-input"
        placeholder="搜索回款编号/客户..."
        style="min-width: 160px"
      />
      <select v-model="filters.status" class="form-select">
        <option value="">全部状态</option>
        <option value="pending">待确认</option>
        <option value="confirmed">已确认</option>
        <option value="completed">已完成</option>
        <option value="voided">已作废</option>
      </select>
      <select v-model="filters.method" class="form-select">
        <option value="">全部方式</option>
        <option value="bank_transfer">银行转账</option>
        <option value="cash">现金</option>
        <option value="check">支票</option>
        <option value="wechat">微信</option>
        <option value="alipay">支付宝</option>
      </select>
      <select v-model="filters.overdue" class="form-select">
        <option value="">全部逾期</option>
        <option value="normal">正常</option>
        <option value="1-30">逾期1-30天</option>
        <option value="31-60">逾期31-60天</option>
        <option value="60+">逾期60天以上</option>
      </select>
       <input v-model="filters.dateFrom" type="date" class="form-input" title="起始日期" style="width: 140px" />
       <input v-model="filters.dateTo" type="date" class="form-input" title="截止日期" style="width: 140px" />
      <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
    </div>
    <div v-if="activeFilterTags.length > 0" class="filter-tags-bar">
      <span class="filter-tags-label">筛选条件</span>
      <span v-for="tag in activeFilterTags" :key="tag.key" class="filter-tag-item">
        {{ tag.label }}
        <button class="filter-tag-remove" @click="removeFilterTag(tag.key)">×</button>
      </span>
      <button class="filter-tag-clear" @click="resetFilters">清除全部</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div v-if="currentView === 'table'" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
        <th style="width: 50px; text-align: center">序号</th>
                <th v-if="columnVisible.collectionNo">回款编号</th>
                <th v-if="columnVisible.customer">客户</th>
                <th v-if="columnVisible.date">日期</th>
                <th v-if="columnVisible.amount">金额</th>
                <th v-if="columnVisible.paymentMethod">付款方式</th>
                <th v-if="columnVisible.progress">回款进度</th>
                <th v-if="columnVisible.status">状态</th>
                <th v-if="columnVisible.overdue">逾期</th>
                <th style="min-width: 140px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredCollections.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="28" /></div>
                  暂无回款记录
                </td>
              </tr>
              <tr
                v-for="(c, i) in filteredCollections"
                :key="c.id"
                :ref="(el) => setRowRef(el, i)"
                :style="getRowOverdueStyle(c)"
                class="row-animate"
                :class="{ 'row-slide-in': true }"
              >
                <td style="width: 50px; text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                  {{ i + 1 }}
                </td>
                <td
                  v-if="columnVisible.collectionNo"
                  class="cell-mono"
                  style="cursor: pointer; color: var(--color-accent)"
                  @click="viewDetail(c)"
                >
                  {{ c.collectionNo }}
                </td>
                <td v-if="columnVisible.customer">{{ c.customerName }}</td>
                <td v-if="columnVisible.date">{{ c.date || '-' }}</td>
                <td v-if="columnVisible.amount" class="cell-mono">
                   ¥{{ formatMoney(c.amount) }}
                  <span
                    v-if="c.installments && c.installments.length"
                    style="font-size: 10px; color: var(--color-info)"
                  >
                    ({{ c.installments.length }}期)
                  </span>
                </td>
                <td v-if="columnVisible.paymentMethod">
                  {{ collectionStore.methodLabels[c.method] || c.method || '-' }}
                </td>
                <td v-if="columnVisible.progress" style="min-width: 120px">
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
                  <button class="btn btn-ghost btn-sm" title="查看详情" @click="viewDetail(c)">
                    <Icon name="eye" :size="14" />
                  </button>
                  <button class="btn btn-ghost btn-sm" title="编辑" @click="openForm(c)">
                    <Icon name="edit" :size="14" />
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    title="分期管理"
                    style="color: var(--color-info)"
                    @click="openInstallmentManager(c)"
                  >
                    <Icon name="calendar" :size="14" />
                  </button>
                  <button
                    v-if="c.status === 'pending'"
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-success)"
                    title="确认"
                    @click="handleConfirm(c.id)"
                  >
                    <Icon name="checkCircle" :size="14" />
                  </button>
                  <button
                    v-if="canDelete"
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-danger)"
                    title="删除"
                    @click="handleDelete(c.id)"
                  >
                    <Icon name="delete" :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="currentView === 'list'" class="list-view">
          <div
            v-for="(c, i) in filteredCollections"
            :key="c.id"
            class="list-item list-slide-in"
            :class="{ 'list-item-overdue': collectionStore.getOverdueDays(c) > 0 }"
            :style="{ animationDelay: i * 20 + 'ms' }"
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
            <div class="empty-state-icon"><Icon name="empty" :size="28" /></div>
            暂无回款记录
          </div>
        </div>

        <div v-else-if="currentView === 'card'" class="card-view">
          <div
            v-for="(c, i) in filteredCollections"
            :key="c.id"
            class="collection-card card-fade-in"
            :class="{ 'card-overdue': collectionStore.getOverdueDays(c) > 0 }"
            :style="{ animationDelay: i * 20 + 'ms' }"
            @click="viewDetail(c)"
          >
            <div class="card-header">
              <span class="card-title">{{ c.collectionNo }}</span>
              <span class="status-badge" :class="collectionStore.statusBadgeMap[c.status] || 'neutral'">
                {{ collectionStore.statusLabels[c.status] || c.status }}
              </span>
            </div>
            <div class="card-body">
              <div class="card-field">
                <span class="card-label">客户</span>
                <span>{{ c.customerName }}</span>
              </div>
              <div class="card-field">
                <span class="card-label">金额</span>
                <span class="cell-mono">¥{{ formatMoney(c.amount) }}</span>
              </div>
              <div class="card-field">
                <span class="card-label">方式</span>
                <span>{{ collectionStore.methodLabels[c.method] || c.method }}</span>
              </div>
              <div class="card-field">
                <span class="card-label">日期</span>
                <span>{{ c.date }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn btn-ghost btn-sm" @click.stop="openForm(c)"><Icon name="edit" :size="14" /></button>
              <button
                v-if="c.status === 'pending'"
                class="btn btn-ghost btn-sm"
                style="color: var(--color-success)"
                @click.stop="handleConfirm(c.id)"
              >
                <Icon name="checkCircle" :size="14" />
              </button>
              <button
                v-if="canDelete"
                class="btn btn-ghost btn-sm"
                style="color: var(--color-danger)"
                @click.stop="handleDelete(c.id)"
              >
                <Icon name="delete" :size="14" />
              </button>
            </div>
          </div>
          <div v-if="filteredCollections.length === 0" class="empty-state">
            <div class="empty-state-icon"><Icon name="empty" :size="28" /></div>
            暂无回款记录
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top: var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="chart" :size="14" />
          账龄分布图
        </span>
        <div style="display: flex; gap: var(--space-2)">
          <select v-model="agingChartFilter" class="form-select" style="font-size: 12px; height: 28px">
            <option value="">全部客户</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
        </div>
      </div>
      <div class="panel-card-body">
        <div style="display: flex; gap: var(--space-4); align-items: flex-end; height: 200px; padding: var(--space-2)">
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px">
            <div
              :style="{
                height: agingBarHeight('current') + 'px',
                background: 'var(--color-success)',
                borderRadius: '4px 4px 0 0',
                width: '100%',
                maxWidth: '60px',
                transition: 'height 0.3s'
              }"
            ></div>
            <span style="font-size: 10px; color: var(--color-text-tertiary)">未到期</span>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px">
            <div
              :style="{
                height: agingBarHeight('days30') + 'px',
                background: 'var(--color-warning)',
                borderRadius: '4px 4px 0 0',
                width: '100%',
                maxWidth: '60px',
                transition: 'height 0.3s'
              }"
            ></div>
            <span style="font-size: 10px; color: var(--color-text-tertiary)">1-30天</span>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px">
            <div
              :style="{
                height: agingBarHeight('days60') + 'px',
                background: 'var(--color-danger)',
                borderRadius: '4px 4px 0 0',
                width: '100%',
                maxWidth: '60px',
                transition: 'height 0.3s'
              }"
            ></div>
            <span style="font-size: 10px; color: var(--color-text-tertiary)">31-60天</span>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px">
            <div
              :style="{
                height: agingBarHeight('daysOver') + 'px',
                background: 'var(--color-danger)',
                borderRadius: '4px 4px 0 0',
                width: '100%',
                maxWidth: '60px',
                transition: 'height 0.3s'
              }"
            ></div>
            <span style="font-size: 10px; color: var(--color-text-tertiary)">60天+</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top: var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="list" :size="14" />
          账龄分析明细
        </span>
        <button class="btn btn-ghost btn-sm" @click="exportAgingCSV">
          <Icon name="upload" :size="14" />
          导出CSV
        </button>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户</th>
                <th>余额</th>
                <th>当前</th>
                <th>1-30天</th>
                <th>31-60天</th>
                <th>61-90天</th>
                <th>90天+</th>
                <th>风险</th>
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
                <td>
                  <span
                    class="status-badge"
                    :class="row.risk === '高' ? 'danger' : row.risk === '中' ? 'warning' : 'success'"
                  >
                    {{ row.risk }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal-content" style="max-width: 560px">
        <div class="modal-header">
          <h3>{{ editingCollection ? '编辑回款' : '记录回款' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeForm"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <SmartRecognizePanel
            v-if="!editingCollection"
            v-model:show-smart-rec="showSmartRec"
            v-model:smart-rec-input="smartRecInput"
            :smart-rec-result="smartRecResult"
            :placeholder="smartRecPlaceholder"
            @run-smart-recognize="runSmartRecognize"
            @apply-smart-recognize="applySmartRecognize"
            @handle-smart-file-upload="handleSmartFileUpload"
            @clear="resetSmartRec"
          />
          <div class="form-group">
            <label class="form-label">
               客户
              <span style="color: var(--color-danger)">*</span>
            </label>
            <DataSelect
              v-model="formData.customerId"
              module="customer"
              variant="active"
              value-field="id"
              label-field="name"
              placeholder="选择客户"
              @change="onCustomerChange"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                回款金额
                <span style="color: var(--color-danger)">*</span>
              </label>
              <input
                v-model.number="formData.amount"
                type="number"
                class="form-input"
                min="0"
                step="0.01"
                placeholder="请输入金额"
              />
            </div>
            <div class="form-group">
              <label class="form-label">付款方式</label>
              <select v-model="formData.method" class="form-select">
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
              <input v-model="formData.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">到期日期</label>
              <input v-model="formData.dueDate" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">参考号</label>
            <input v-model="formData.referenceNo" type="text" class="form-input" placeholder="银行流水号等" />
          </div>
          <div class="form-group">
            <label class="form-label">银行账号</label>
            <input v-model="formData.bankAccount" type="text" class="form-input" placeholder="收款银行账号" />
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="formData.notes" class="form-textarea" rows="2" placeholder="备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeForm">取消</button>
          <button class="btn btn-primary" @click="saveForm">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content" style="max-width: 640px">
        <div class="modal-header">
          <h3>回款详情 - {{ detailData.collectionNo }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeDetail"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">客户</span>
              <span class="detail-value">{{ detailData.customerName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">金额</span>
              <span class="detail-value cell-mono">¥{{ formatMoney(detailData.amount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">日期</span>
              <span class="detail-value">{{ detailData.date }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">到期日期</span>
              <span class="detail-value">{{ detailData.dueDate || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">付款方式</span>
              <span class="detail-value">
                {{ collectionStore.methodLabels[detailData.method] || detailData.method }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">状态</span>
              <span class="detail-value">
                <span class="status-badge" :class="collectionStore.statusBadgeMap[detailData.status]">
                  {{ collectionStore.statusLabels[detailData.status] }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">参考号</span>
              <span class="detail-value">{{ detailData.referenceNo || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">银行账号</span>
              <span class="detail-value">{{ detailData.bankAccount || '-' }}</span>
            </div>
            <div class="detail-item" style="grid-column: 1/-1">
              <span class="detail-label">备注</span>
              <span class="detail-value">{{ detailData.notes || '-' }}</span>
            </div>
          </div>

          <div v-if="detailData.installments && detailData.installments.length > 0" style="margin-top: var(--space-4)">
            <h4 style="margin-bottom: var(--space-2)">分期明细 ({{ detailData.installments.length }}期)</h4>
            <table class="data-table" style="font-size: var(--font-size-sm)">
              <thead>
                <tr>
                  <th>期数</th>
                  <th>金额</th>
                  <th>日期</th>
                  <th>方式</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inst in detailData.installments" :key="inst.id">
                  <td>第{{ inst.period }}期</td>
                   <td class="cell-mono">¥{{ formatMoney(inst.amount) }}</td>
                  <td>{{ inst.date }}</td>
                  <td>{{ collectionStore.methodLabels[inst.method] || inst.method }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'danger' : 'warning'"
                    >
                      {{ inst.status === 'paid' ? '已到账' : inst.status === 'overdue' ? '已逾期' : '待支付' }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="inst.status === 'pending'"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-success)"
                      @click="markInstallmentPaid(detailData.id, inst.id)"
                    >
                       确认到账
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="progress-section" style="margin-top: var(--space-4)">
            <span class="detail-label">回款进度</span>
            <div class="progress-wrapper" style="margin-top: var(--space-2)">
              <div class="progress-bar" style="height: 8px">
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
          <button class="btn btn-ghost" @click="(openForm(detailData), closeDetail())">编辑</button>
          <button
            v-if="detailData.status === 'pending'"
            class="btn btn-primary"
            @click="(handleConfirm(detailData.id), closeDetail())"
          >
            确认回款
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content" style="max-width: 360px">
        <div class="modal-body" style="text-align: center; padding: var(--space-6)">
          <div class="confirm-icon-circle danger">
            <Icon name="delete" :size="28" />
          </div>
          <h3 style="margin: var(--space-3) 0 var(--space-2)">确认删除</h3>
          <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">删除后不可恢复，是否继续？</p>
        </div>
        <div class="modal-footer" style="justify-content: center">
          <button class="btn btn-ghost" @click="cancelDelete">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="showInstallmentManager" class="modal-overlay" @click.self="closeInstallmentManager">
      <div class="modal-content" style="max-width: 560px">
        <div class="modal-header">
          <h3>分期管理 - {{ installmentTarget.collectionNo }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeInstallmentManager">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <div
            style="
              margin-bottom: var(--space-4);
              padding: var(--space-3);
              background: var(--color-bg-primary);
              border-radius: var(--radius-md);
            "
          >
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2)">
              <span>回款总额</span>
              <span class="cell-mono">¥{{ formatMoney(installmentTarget.amount) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span>已分期金额</span>
              <span class="cell-mono">¥{{ formatMoney(totalInstalledAmount) }}</span>
            </div>
          </div>

          <table class="data-table" style="font-size: var(--font-size-sm); margin-bottom: var(--space-4)">
            <thead>
              <tr>
                <th>期数</th>
                <th>金额</th>
                <th>日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inst in installmentTarget.installments || []" :key="inst.id">
                <td>第{{ inst.period }}期</td>
                 <td class="cell-mono">¥{{ formatMoney(inst.amount) }}</td>
                <td>{{ inst.date }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'danger' : 'warning'"
                  >
                    {{ inst.status === 'paid' ? '已到账' : inst.status === 'overdue' ? '已逾期' : '待支付' }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button
                    v-if="inst.status === 'pending'"
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-success)"
                    @click="markInstallmentPaid(installmentTarget.id, inst.id)"
                  >
                    <Icon name="checkCircle" :size="14" />
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-danger)"
                    @click="handleDeleteInstallment(installmentTarget.id, inst.id)"
                  >
                    <Icon name="delete" :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="!installmentTarget.installments || installmentTarget.installments.length === 0">
                <td colspan="5" style="text-align: center; color: var(--color-text-tertiary)">暂无分期记录</td>
              </tr>
            </tbody>
          </table>

          <h4 style="margin-bottom: var(--space-2)">添加分期</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">金额</label>
              <input v-model.number="newInstallment.amount" type="number" class="form-input" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">日期</label>
              <input v-model="newInstallment.date" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="newInstallment.notes" type="text" class="form-input" placeholder="分期备注" />
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

<script>
export default { name: 'Collections' }
</script>
<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useDataStore } from '@/stores/data'
import { usePermission } from '@/utils/permissionGuard'
import { formatMoney, toLocalDateStr } from '@/utils/format'
import DataSelect from '@/components/DataSelect.vue'
import SmartRecognizePanel from '@/components/SmartRecognizePanel.vue'
import { useSmartRecognizeBase, makeItem } from '@/composables/useSmartRecognizeBase'

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
const columnVisible = ref(Object.fromEntries(columnDefs.filter((c) => c.hideable !== false).map((c) => [c.key, true])))
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
const showCollectionStatsExpanded = ref(false)
const showForm = ref(false)
const showDetail = ref(false)
const showInstallmentManager = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref(null)
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

const quickFilter = ref('')

const pipelineTotal = computed(() => collectionStore.totalCollected + collectionStore.totalPending)
const pipelineCollectedPercent = computed(() => {
  const total = pipelineTotal.value
  if (!total) return 0
  return Math.round((collectionStore.totalCollected / total) * 100)
})
const pipelinePendingPercent = computed(() => {
  const total = pipelineTotal.value
  if (!total) return 0
  return Math.round((collectionStore.totalPending / total) * 100)
})
const pipelineOverduePercent = computed(() => {
  const total = pipelineTotal.value
  if (!total) return 0
  return Math.round((collectionStore.totalOverdue / total) * 100)
})

function computeWeekTrend(filterFn) {
  const now = new Date()
  const thisWeek = collectionStore.collections
    .filter((c) => {
      const d = new Date(c.date)
      const diff = (now - d) / 86400000
      return diff >= 0 && diff < 7 && filterFn(c)
    })
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
  const lastWeek = collectionStore.collections
    .filter((c) => {
      const d = new Date(c.date)
      const diff = (now - d) / 86400000
      return diff >= 7 && diff < 14 && filterFn(c)
    })
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
  if (lastWeek === 0) return { value: 0, direction: 'up' }
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { value: Math.abs(pct), direction: pct >= 0 ? 'up' : 'down' }
}

const collectionTrend = computed(() => computeWeekTrend(() => true))
const pendingTrend = computed(() => computeWeekTrend((c) => c.status === 'pending' || c.status === 'confirmed'))
const overdueTrend = computed(() => computeWeekTrend((c) => collectionStore.getOverdueDays(c) > 0))

const activeFilterTags = computed(() => {
  const tags = []
  if (filters.search) tags.push({ key: 'search', label: `鎼滅储: ${filters.search}` })
  if (filters.status)
    tags.push({ key: 'status', label: `状态: ${collectionStore.statusLabels[filters.status] || filters.status}` })
  if (filters.method)
    tags.push({ key: 'method', label: `方式: ${collectionStore.methodLabels[filters.method] || filters.method}` })
  if (filters.overdue)
    tags.push({ key: 'overdue', label: `逾期: ${filters.overdue === 'normal' ? '正常' : filters.overdue}` })
  if (filters.dateFrom) tags.push({ key: 'dateFrom', label: `起始: ${filters.dateFrom}` })
  if (filters.dateTo) tags.push({ key: 'dateTo', label: `截止: ${filters.dateTo}` })
  return tags
})

function removeFilterTag(key) {
  if (key === 'search') filters.search = ''
  else if (key === 'status') filters.status = ''
  else if (key === 'method') filters.method = ''
  else if (key === 'overdue') filters.overdue = ''
  else if (key === 'dateFrom') filters.dateFrom = ''
  else if (key === 'dateTo') filters.dateTo = ''
}

function setQuickFilter(period) {
  if (quickFilter.value === period) {
    quickFilter.value = ''
    filters.dateFrom = ''
    filters.dateTo = ''
    return
  }
  quickFilter.value = period
  const now = new Date()
  const today = toLocalDateStr(now)
  filters.dateTo = today
  if (period === 'today') {
    filters.dateFrom = today
  } else if (period === 'week') {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    filters.dateFrom = toLocalDateStr(weekStart)
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    filters.dateFrom = toLocalDateStr(monthStart)
  }
}

function handlePipelineClick(stage) {
  if (stage === 'total') {
    resetFilters()
  } else if (stage === 'collected') {
    filters.status = 'completed'
  } else if (stage === 'pending') {
    filters.status = 'pending'
  } else if (stage === 'overdue') {
    filters.overdue = '1-30'
  }
}

const formData = reactive({
  customerId: '',
  customerName: '',
  amount: 0,
  date: toLocalDateStr(),
  dueDate: '',
  method: 'bank_transfer',
  referenceNo: '',
  bankAccount: '',
  notes: ''
})

const smartRecPlaceholder = '粘贴回款单、收款信息或文本摘要，系统会自动识别客户、金额、日期、方式、参考号和备注。'

function parseCollectionSmartInfo(text) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0

  const pushItem = (key, label, value, confidence) => {
    items.push(makeItem(key, label, value, confidence))
    identifiedCount += 1
    if (confidence < 80) lowConfCount += 1
  }

  const pick = (patterns, label, key, confidence, mapper = (v) => v.trim()) => {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match?.[1]) {
        pushItem(key, label, mapper(match[1]), confidence)
        return true
      }
    }
    return false
  }

  pick([/(?:客户|客户名称|客户单位)[:：\s]*([^\n\r]{2,40})/], '客户', 'customerName', 90)
  pick([/(?:金额|回款金额|收款金额)[:：\s]*([0-9][\d,]*(?:\.\d+)?)\s*(?:元|万)?/], '金额', 'amount', 90, (v) => Number(String(v).replace(/,/g, '')) || 0)
  pick([/(?:回款日期|收款日期|日期)[:：\s]*([0-9]{4}[-/年][0-9]{1,2}[-/月][0-9]{1,2})/], '日期', 'date', 88, (v) => v.replace(/[年月]/g, '-').replace(/\//g, '-'))
  pick([/(?:到期日期|截止日期)[:：\s]*([0-9]{4}[-/年][0-9]{1,2}[-/月][0-9]{1,2})/], '到期日期', 'dueDate', 84, (v) => v.replace(/[年月]/g, '-').replace(/\//g, '-'))
  pick([/(?:付款方式|收款方式|方式)[:：\s]*([^\n\r]{1,20})/], '付款方式', 'method', 82, (v) => {
    const raw = v.trim()
    if (/银行|转账|对公|汇款/.test(raw)) return 'bank_transfer'
    if (/现金/.test(raw)) return 'cash'
    if (/支票|票据/.test(raw)) return 'check'
    if (/微信/.test(raw)) return 'wechat'
    if (/支付宝/.test(raw)) return 'alipay'
    return 'other'
  })
  pick([/(?:参考号|流水号|单号|凭证号)[:：\s]*([^\n\r]{1,40})/], '参考号', 'referenceNo', 78)
  pick([/(?:银行名称|开户行|收款银行)[:：\s]*([^\n\r]{1,40})/], '银行名称', 'bankAccount', 76)
  pick([/(?:备注|说明)[:：\s]*([^\n\r]{1,120})/], '备注', 'notes', 68)

  return { items, identifiedCount, lowConfCount }
}

const {
  showSmartRec,
  smartRecInput,
  smartRecResult,
  smartRecPlaceholder: smartRecPlaceholderValue,
  runSmartRecognize,
  applySmartRecognize,
  handleSmartFileUpload,
  resetSmartRec
} = useSmartRecognizeBase(formData, parseCollectionSmartInfo, smartRecPlaceholder)

const newInstallment = reactive({
  amount: 0,
  date: toLocalDateStr(),
  notes: ''
})

const filteredCollections = computed(() => {
  return collectionStore.collections.filter((c) => {
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!(c.collectionNo || '').toLowerCase().includes(s) && !(c.customerName || '').toLowerCase().includes(s))
        return false
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
    if (!map[customer])
      map[customer] = { customer, balance: 0, current: 0, days30: 0, days60: 0, days90: 0, daysOver: 0 }
    const amount = c.amount || 0
    const overdue = collectionStore.getOverdueDays(c)
    map[customer].balance += amount
    if (overdue <= 0) map[customer].current += amount
    else if (overdue <= 30) map[customer].days30 += amount
    else if (overdue <= 60) map[customer].days60 += amount
    else if (overdue <= 90) map[customer].days90 += amount
    else map[customer].daysOver += amount
  }
  return Object.values(map).map((r) => {
    const overdueRatio = r.balance > 0 ? (r.days30 + r.days60 + r.days90 + r.daysOver) / r.balance : 0
    r.risk = overdueRatio > 0.5 ? '高' : overdueRatio > 0.2 ? '中' : '低'
    return r
  })
})

const totalInstalledAmount = computed(() => {
  if (!installmentTarget.value.installments) return 0
  return installmentTarget.value.installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
})

const alertCollections = computed(() => {
  return collectionStore.collections
    .filter((c) => {
      const od = collectionStore.getOverdueDays(c)
      return od > 0 || c.status === 'voided'
    })
    .map((c) => ({
      ...c,
      overdueDays: collectionStore.getOverdueDays(c)
    }))
    .sort((a, b) => b.overdueDays - a.overdueDays)
})

const methodDistribution = computed(() => {
  const methods = [
     { key: 'bank_transfer', label: '银行转账', color: '#3b82f6' },
     { key: 'cash', label: '现金', color: '#10b981' },
     { key: 'check', label: '支票', color: '#f59e0b' },
     { key: 'wechat', label: '微信', color: '#06b6d4' },
    { key: 'alipay', label: '支付宝', color: '#1677ff' }
  ]
  const total = collectionStore.collections.length || 1
  return methods.map((m) => {
    const count = collectionStore.collections.filter((c) => c.method === m.key).length
    return { ...m, count, percent: Math.max(4, (count / total) * 100) }
  })
})

const last7DaysTrend = computed(() => {
  const days = []
  const maxAmount = Math.max(
    ...Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = toLocalDateStr(d)
      return collectionStore.collections
        .filter((c) => c.date === dateStr)
        .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
    }),
    1
  )
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = toLocalDateStr(d)
    const amount = collectionStore.collections
      .filter((c) => c.date === dateStr)
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const percent = Math.max(4, (amount / maxAmount) * 100)
    const color = amount > 0 ? 'var(--color-success)' : 'var(--color-border)'
    days.push({ label, amount, percent, color })
  }
  return days
})

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

function getCollectionRateColor(rate) {
  if (rate >= 70) return 'var(--color-success)'
  if (rate >= 40) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function getRingCircumference() {
  return 2 * Math.PI * 26
}

function getRingOffset(rate) {
  const circumference = 2 * Math.PI * 26
  const pct = Math.min(100, Math.max(0, rate)) / 100
  return circumference * (1 - pct)
}

function setRowRef(el, index) {
  if (el) {
    el.style.animationDelay = index * 20 + 'ms'
  }
}

function resetFilters() {
  filters.search = ''
  filters.status = ''
  filters.method = ''
  filters.overdue = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  quickFilter.value = ''
}

function openForm(data) {
  if (data && data.id) {
    editingCollection.value = data
    formData.customerId = data.customerId || ''
    formData.customerName = data.customerName || ''
    formData.amount = data.amount || 0
    formData.date = data.date || toLocalDateStr()
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
    formData.date = toLocalDateStr()
    formData.dueDate = ''
    formData.method = 'bank_transfer'
    formData.referenceNo = ''
    formData.bankAccount = ''
    formData.notes = ''
  }
  resetSmartRec()
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingCollection.value = null
}

function onCustomerChange({ value, data }) {
  if (data) {
    formData.customerName = data.name || data.fullName || data.companyName
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
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (deleteTargetId.value) {
    collectionStore.deleteCollection(deleteTargetId.value)
  }
  cancelDelete()
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function openInstallmentManager(c) {
  installmentTarget.value = { ...c }
  newInstallment.amount = 0
  newInstallment.date = toLocalDateStr()
  newInstallment.notes = ''
  showInstallmentManager.value = true
}

function closeInstallmentManager() {
  showInstallmentManager.value = false
  const fresh = collectionStore.collections.find((c) => c.id === installmentTarget.value.id)
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
  const fresh = collectionStore.collections.find((c) => c.id === installmentTarget.value.id)
  if (fresh) installmentTarget.value = { ...fresh }
  newInstallment.amount = 0
  newInstallment.notes = ''
}

function markInstallmentPaid(colId, instId) {
  collectionStore.updateInstallmentStatus(colId, instId, 'paid')
  const fresh = collectionStore.collections.find((c) => c.id === colId)
  if (fresh) {
    if (showDetail.value) detailData.value = { ...fresh }
    if (showInstallmentManager.value && colId === installmentTarget.value.id) installmentTarget.value = { ...fresh }
  }
}

function handleDeleteInstallment(colId, instId) {
  if (confirm('确认删除此分期记录？')) {
    collectionStore.deleteInstallment(colId, instId)
    const fresh = collectionStore.collections.find((c) => c.id === colId)
    if (fresh) installmentTarget.value = { ...fresh }
  }
}

function exportCSV() {
  try {
    const data = filteredCollections.value
    if (data.length === 0) {
      alert('暂无数据可导出')
      return
    }
    let csv = '回款编号,客户,日期,金额,付款方式,状态,逾期天数\n'
    for (const c of data) {
      csv += `"${c.collectionNo}","${c.customerName}","${c.date}",${c.amount},"${collectionStore.methodLabels[c.method] || c.method}","${collectionStore.statusLabels[c.status] || c.status}",${collectionStore.getOverdueDays(c)}\n`
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '回款记录_' + toLocalDateStr() + '.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function agingBarHeight(key) {
  const max = Math.max(
    agingSummary.value.current,
    agingSummary.value.days30,
    agingSummary.value.days60,
    agingSummary.value.daysOver,
    1
  )
  return Math.max(4, (agingSummary.value[key] / max) * 160)
}

function exportAgingCSV() {
  const data = agingDetailList.value.map((r) => ({
    客户: r.customer,
    余额: r.balance.toFixed(2),
    当前: r.current.toFixed(2),
    '1-30天': r.days30.toFixed(2),
    '31-60天': r.days60.toFixed(2),
    '61-90天': r.days90.toFixed(2),
    '90天+': r.daysOver.toFixed(2),
    风险: r.risk
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
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.collection-page {
}

/* 资金流水线 */
.fund-pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  margin-bottom: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.pipeline-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.pipeline-stage-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.pipeline-stage-value {
  font-family: var(--font-mono);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}
.pipeline-arrow {
  font-size: var(--font-size-lg);
  color: var(--color-text-tertiary);
  font-weight: 300;
}
.pipeline-stage-danger {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.04);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}
.pipeline-stage-percent {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}
.pipeline-stage-clickable {
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}
.pipeline-stage-clickable:hover {
  background: var(--color-surface-hover);
  transform: translateY(-1px);
}
.pipeline-stage-pulse {
  animation: dangerPulse 2s ease-in-out infinite;
}
@keyframes dangerPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.15);
  }
}

/* ===== Keyframes ===== */
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes alertDotPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.5;
  }
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes listSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Stat Cards ===== */
.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
}
.stat-card-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
}
.stat-card-trend.up {
  color: var(--color-success);
}
.stat-card-trend.down {
  color: var(--color-danger);
}
.stat-card-trend .trend-arrow {
  font-weight: 700;
}
.stat-card-trend .trend-value {
  font-family: var(--font-mono);
  font-weight: 600;
}
.stat-card-trend .trend-label {
  color: var(--color-text-tertiary);
}
.stat-card-danger-pulse {
  animation: dangerCardPulse 2s ease-in-out infinite;
}
@keyframes dangerCardPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
  }
}
.progress-ring-clickable {
  cursor: pointer;
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.progress-ring-clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px var(--color-accent-subtle);
}
.stat-dot-halo {
  position: relative;
  width: 10px;
  height: 10px;
}
.alert-dot-pulse {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 2s ease-in-out infinite;
}

/* ===== Overview Panel ===== */
.overview-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.overview-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.overview-card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
}
.overview-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.overview-card-body.center {
  align-items: center;
}

/* Progress Ring */
.progress-ring-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
}
.progress-ring {
  transform: rotate(-90deg);
}
.progress-ring-bg {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 5;
}
.progress-ring-fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 0.8s ease-out,
    stroke 0.3s ease;
}
.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--font-size-sm);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}
.progress-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* Method Bars */
.method-bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.method-bar-label {
  width: 60px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.method-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.method-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}
.method-bar-value {
  width: 40px;
  text-align: right;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

/* Trend Chart */
.trend-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100px;
  gap: var(--space-2);
  padding-top: var(--space-2);
}
.trend-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  height: 100%;
  justify-content: flex-end;
}
.trend-bar {
  width: 100%;
  max-width: 24px;
  border-radius: 4px 4px 0 0;
  transition: height 0.4s ease;
  min-height: 4px;
}
.trend-bar-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

/* ===== Alert Panel ===== */
.alert-panel {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-danger-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.alert-panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.alert-panel-title {
  font-weight: 600;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}
.alert-panel-count {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  background: var(--color-danger-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.alert-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  animation: alertSlideIn 0.4s ease-out both;
}
.alert-item-no {
  font-family: var(--font-mono);
  color: var(--color-accent);
  font-weight: 600;
  min-width: 100px;
}
.alert-item-customer {
  flex: 1;
  color: var(--color-text-primary);
}
.alert-item-amount {
  color: var(--color-text-secondary);
  min-width: 80px;
  text-align: right;
}
.alert-item-days {
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 600;
}
.alert-item-days.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.alert-item-days.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

/* ===== Table Row Animation ===== */
.row-slide-in {
  animation: rowSlideIn 0.3s ease-out both;
}

/* ===== List View ===== */
.list-view {
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    transform 0.2s ease;
}
.list-item:hover {
  background: var(--color-surface-hover);
  transform: translateX(2px);
}
.list-item-overdue {
  border-left: 3px solid var(--color-danger);
}
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
.list-slide-in {
  animation: listSlideIn 0.3s ease-out both;
}

/* ===== Card View ===== */
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
.card-fade-in {
  animation: cardFadeIn 0.3s ease-out both;
}
.card-overdue {
  border-left: 3px solid var(--color-danger);
}
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

/* ===== Empty State ===== */
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}

/* ===== Confirm Modal ===== */
.confirm-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.confirm-icon-circle.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

/* ===== Common ===== */
.view-toggle {
  display: flex;
  gap: var(--space-1);
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
.progress-bar-fill.success {
  background: var(--color-success);
}
.progress-bar-fill.info {
  background: var(--color-info);
}
.progress-bar-fill.warning {
  background: var(--color-warning);
}
.progress-bar-fill.danger {
  background: var(--color-danger);
}
.progress-text {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}
.badge {
  font-size: var(--font-size-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 600;
}
.badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.badge-info {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.badge-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.badge-danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.chart-container {
  position: relative;
  width: 100%;
  height: 320px;
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
  min-width: 160px;
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

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-row {
    grid-template-columns: 1fr;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: 1fr 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-bar {
    flex-direction: column;
  }
  table {
    font-size: 12px;
  }
}
@media (max-width: 640px) {
  .stats-grid-4 {
    grid-template-columns: 1fr;
  }
  .overview-row {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
.table-container {
  overflow-x: auto;
}

/* ===== Quick Filter Tags ===== */
.quick-filter-tags {
  display: flex;
  gap: var(--space-1);
}
.quick-filter-tag {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.quick-filter-tag:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quick-filter-tag.active {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

/* ===== Filter Tags Bar ===== */
.filter-tags-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.filter-tags-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.filter-tag-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
}
.filter-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: none;
  background: var(--color-border);
  border-radius: 50%;
  color: var(--color-text-tertiary);
  font-size: 10px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: background 0.2s;
}
.filter-tag-remove:hover {
  background: var(--color-danger);
  color: #fff;
}
.filter-tag-clear {
  padding: var(--space-1) var(--space-2);
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  cursor: pointer;
  font-weight: 500;
}
.filter-tag-clear:hover {
  text-decoration: underline;
}
</style>
