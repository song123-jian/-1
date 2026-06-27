<template>
  <div class="purchase-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-header-title">采购管理</h1>
          <p class="page-header-subtitle">统一处理采购下单、审批、到货与入库，减少流程断点</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openAddModal">
            <Icon name="add" :size="14" />
            新建采购单
          </button>
        </div>
      </div>
    </div>

    <!-- 流程看板 -->
    <div class="flow-board">
      <div
        class="flow-board-node"
        :class="{ active: filterStatus === 'pending' }"
        :title="'待审批: ' + purchaseStore.pendingCount + ' 单，金额 ' + formatAmount(pendingAmount)"
        @click="filterStatus = filterStatus === 'pending' ? '' : 'pending'"
      >
        <span class="flow-board-dot pending"></span>
        <div>
          <div class="flow-board-count">{{ purchaseStore.pendingCount }}</div>
          <div class="flow-board-amount">{{ formatAmountShort(pendingAmount) }}</div>
          <div class="flow-board-label">待审批</div>
        </div>
      </div>
      <span class="flow-board-arrow">→</span>
      <div
        class="flow-board-node"
        :class="{
          active:
            filterStatus === 'approved' ||
            filterStatus === 'ordered' ||
            filterStatus === 'receiving' ||
            filterStatus === 'inspecting'
        }"
        :title="'进行中: ' + purchaseStore.inProgressCount + ' 单，金额 ' + formatAmount(inProgressAmount)"
        @click="toggleInProgressFilter"
      >
        <span class="flow-board-dot progress"></span>
        <div>
          <div class="flow-board-count">{{ purchaseStore.inProgressCount }}</div>
          <div class="flow-board-amount">{{ formatAmountShort(inProgressAmount) }}</div>
          <div class="flow-board-label">进行中</div>
        </div>
      </div>
      <span class="flow-board-arrow">→</span>
      <div
        class="flow-board-node"
        :class="{ active: filterStatus === 'completed' }"
        :title="'已完成: ' + completedCount + ' 单，金额 ' + formatAmount(completedAmount)"
        @click="filterStatus = filterStatus === 'completed' ? '' : 'completed'"
      >
        <span class="flow-board-dot completed"></span>
        <div>
          <div class="flow-board-count">{{ completedCount }}</div>
          <div class="flow-board-amount">{{ formatAmountShort(completedAmount) }}</div>
          <div class="flow-board-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 折叠统计区 -->
    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showStatsExpanded = !showStatsExpanded">
        <span class="collapsible-stats-title">
          <Icon name="chart" :size="14" />
          统计与概览
        </span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showStatsExpanded }">▼</span>
      </div>
      <div v-show="showStatsExpanded" class="collapsible-stats-body">
        <!-- 统计卡片 -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card" style="animation-delay: 0ms">
            <div class="stat-card-header">
              <span class="stat-card-label">采购单总数</span>
              <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
                <Icon name="clipboard" :size="16" />
              </div>
            </div>
            <div class="stat-card-value">{{ purchaseStore.totalCount }}</div>
            <div class="stat-card-trend" :class="totalCountTrend >= 0 ? 'trend-up' : 'trend-down'">
              <Icon :name="totalCountTrend >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
              <span>{{ Math.abs(totalCountTrend) }}%</span>
              <span class="trend-period">较上月</span>
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 60ms">
            <div class="stat-card-header">
              <span class="stat-card-label">待审批</span>
              <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
                <Icon name="clock" :size="16" />
              </div>
            </div>
            <div class="stat-card-value">
              <span class="stat-dot-halo" style="background: var(--color-warning)"></span>
              {{ purchaseStore.pendingCount }}
            </div>
            <div class="stat-card-trend" :class="pendingTrend >= 0 ? 'trend-up' : 'trend-down'">
              <Icon :name="pendingTrend >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
              <span>{{ Math.abs(pendingTrend) }}</span>
              <span class="trend-period">较昨日</span>
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 120ms">
            <div class="stat-card-header">
              <span class="stat-card-label">进行中</span>
              <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
                <Icon name="refresh" :size="16" />
              </div>
            </div>
            <div class="stat-card-value">{{ purchaseStore.inProgressCount }}</div>
          </div>
          <div class="stat-card" style="animation-delay: 180ms">
            <div class="stat-card-header">
              <span class="stat-card-label">本月采购金额</span>
              <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
                <Icon name="dollar" :size="16" />
              </div>
            </div>
            <div class="stat-card-value">{{ formatAmount(purchaseStore.thisMonthAmount) }}</div>
            <div class="stat-card-trend" :class="amountTrend >= 0 ? 'trend-up' : 'trend-down'">
              <Icon :name="amountTrend >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
              <span>{{ Math.abs(amountTrend) }}%</span>
              <span class="trend-period">较上月</span>
            </div>
          </div>
        </div>

        <!-- 概览面板：采购完成率 + 供应商TOP5 + 近7日趋势 -->
        <div class="purchase-overview-row">
          <div
            class="overview-card overview-ring-card"
            style="cursor: pointer"
            title="点击筛选已完成订单"
            @click="filterStatus = filterStatus === 'completed' ? '' : 'completed'"
          >
            <div class="overview-card-title">采购完成率</div>
            <div class="overview-ring-body">
              <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
                <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
                <circle
                  cx="36"
                  cy="36"
                  r="26"
                  fill="none"
                  :stroke="completionRateColor"
                  stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="completionRateDash"
                  stroke-dashoffset="0"
                  transform="rotate(-90 36 36)"
                  class="overview-ring-progress"
                />
              </svg>
              <div class="overview-ring-text">
                <span class="overview-ring-percent" :style="{ color: completionRateColor }">{{ completionRate }}%</span>
                <span class="overview-ring-sub">已完成/总数</span>
              </div>
            </div>
          </div>
          <div class="overview-card overview-supplier-card">
            <div class="overview-card-title">供应商采购TOP5</div>
            <div class="supplier-bars">
              <div v-for="s in topSuppliers" :key="s.name" class="supplier-bar-item">
                <span class="supplier-bar-label">{{ s.name }}</span>
                <div class="supplier-bar-track">
                  <div class="supplier-bar-fill" :style="{ width: s.percent + '%', background: s.color }"></div>
                </div>
                <span class="supplier-bar-amount">{{ formatAmountShort(s.amount) }}</span>
              </div>
            </div>
          </div>
          <div class="overview-card overview-trend-card">
            <div class="overview-card-title">近7日采购趋势</div>
            <div class="trend-bars">
              <div v-for="(d, idx) in recent7Days" :key="idx" class="trend-bar-col">
                <div class="trend-bar-track-v">
                  <div
                    class="trend-bar-fill-v"
                    :style="{
                      height: d.percent + '%',
                      background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)'
                    }"
                  ></div>
                </div>
                <span class="trend-bar-day">{{ d.dayLabel }}</span>
                <span class="trend-bar-num">{{ d.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 待处理预警 -->
        <div v-if="pendingAlerts.length > 0" class="panel-card purchase-alert-panel">
          <div class="panel-card-header">
            <span class="panel-card-title" style="color: var(--color-warning)">
              <span class="alert-dot-pulse"></span>
              待处理预警
            </span>
          </div>
          <div class="panel-card-body">
            <div
              v-for="(a, idx) in pendingAlerts"
              :key="a.id"
              class="purchase-alert-item"
              :class="'alert-severity-' + a.status"
              :style="{ animationDelay: idx * 60 + 'ms' }"
            >
              <span class="purchase-alert-badge" :class="'status-' + a.status">{{ STATUS_LABELS[a.status] }}</span>
              <span class="purchase-alert-no">{{ a.orderNo }}</span>
              <span class="purchase-alert-supplier">{{ a.supplierName || '-' }}</span>
              <span class="purchase-alert-amount">{{ formatAmount(a.totalAmount) }}</span>
              <span class="purchase-alert-date">{{ a.expectedDate || '-' }}</span>
              <div class="purchase-alert-actions">
                <button v-if="a.status === 'pending'" class="btn btn-primary btn-sm" @click="openApproveModal(a)">
                  审批
                </button>
                <button class="btn btn-ghost btn-sm" @click="openPreview(a)">查看</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-3)">
      <div class="filter-quick-tags">
        <button class="quick-tag" :class="{ active: quickDateFilter === 'today' }" @click="toggleQuickDate('today')">
          今日
        </button>
        <button class="quick-tag" :class="{ active: quickDateFilter === 'week' }" @click="toggleQuickDate('week')">
          本周
        </button>
        <button class="quick-tag" :class="{ active: quickDateFilter === 'month' }" @click="toggleQuickDate('month')">
          本月
        </button>
      </div>
      <input
        v-model="searchText"
        type="text"
        class="form-input"
        placeholder="搜索单号/标题/供应商..."
        style="min-width: 200px"
      />
      <select v-model="filterType" class="form-select" style="min-width: 100px">
        <option value="">全部类型</option>
        <option value="purchase">采购</option>
        <option value="return">退货</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="min-width: 120px">
        <option value="">全部状态</option>
        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="filterSupplier" class="form-select" style="min-width: 140px">
        <option value="">全部供应商</option>
        <option v-for="s in supplierStore.activeSuppliers" :key="s.id" :value="s.id">
          {{ s.shortName || s.name }}
        </option>
      </select>
    </div>
    <!-- 筛选条件标签 -->
    <div v-if="activeFilterTags.length > 0" class="filter-tags-bar">
      <span class="filter-tags-label">当前筛选:</span>
      <span v-for="tag in activeFilterTags" :key="tag.key" class="filter-tag-item">
        {{ tag.label }}
        <button class="filter-tag-remove" @click="removeFilterTag(tag.key)">×</button>
      </span>
      <button class="filter-tag-clear" @click="clearAllFilters">清除全部</button>
    </div>

    <!-- Tab切换 + 视图切换 -->
    <div class="tab-view-row">
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">采购列表</button>
        <button class="tab-btn" :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'">
          采购明细
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'return' }" @click="activeTab = 'return'">
          采购退货
        </button>
      </div>
      <div v-if="activeTab === 'list'" class="view-toggle">
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'table' }"
          title="表格视图"
          @click="viewMode = 'table'"
        >
          <Icon name="chart" :size="14" />
          <span>表格</span>
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'list' }"
          title="列表视图"
          @click="viewMode = 'list'"
        >
          <Icon name="list" :size="14" />
          <span>列表</span>
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'card' }"
          title="卡片视图"
          @click="viewMode = 'card'"
        >
          <Icon name="card" :size="14" />
          <span>卡片</span>
        </button>
      </div>
    </div>

    <!-- 采购列表 - 表格视图 -->
    <div v-show="activeTab === 'list' && viewMode === 'table'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购单列表</span>
        <span class="panel-card-count">共 {{ filteredOrders.length }} 条</span>
      </div>
      <div class="table-container">
        <table v-if="paginatedOrders.length > 0" class="data-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center">序号</th>
              <th>采购单号</th>
              <th>标题</th>
              <th>供应商</th>
              <th>类型</th>
              <th>金额</th>
              <th>状态</th>
              <th>预计到货</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(order, idx) in paginatedOrders" :key="order.id" :style="{ animationDelay: idx * 20 + 'ms' }">
              <td style="width: 50px; text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                {{ (currentPage - 1) * pageSize + idx + 1 }}
              </td>
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>{{ order.title || '-' }}</td>
              <td>{{ order.supplierName || '-' }}</td>
              <td>
                <span
                  class="tag-badge"
                  :style="{
                    background: order.type === 'return' ? 'var(--color-danger-subtle)' : 'var(--color-accent-subtle)',
                    color: order.type === 'return' ? 'var(--color-danger)' : 'var(--color-accent)'
                  }"
                >
                  {{ order.type === 'return' ? '退货' : '采购' }}
                </span>
              </td>
              <td class="cell-mono">{{ formatAmount(order.totalAmount) }}</td>
              <td>
                <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
              </td>
              <td>{{ order.expectedDate || '-' }}</td>
              <td>
                <div class="action-cell">
                  <button class="action-btn" title="预览" @click="openPreview(order)">
                    <Icon name="eye" :size="14" />
                  </button>
                  <button v-if="order.status === 'draft'" class="action-btn" title="编辑" @click="openEditModal(order)">
                    <Icon name="edit" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'draft'"
                    class="action-btn"
                    title="提交审批"
                    @click="handleSubmit(order.id)"
                  >
                    <Icon name="send" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'pending'"
                    class="action-btn"
                    title="审批"
                    @click="openApproveModal(order)"
                  >
                    <Icon name="checkCircle" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'approved'"
                    class="action-btn"
                    title="下单"
                    @click="handleOrder(order.id)"
                  >
                    <Icon name="truck" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'ordered'"
                    class="action-btn"
                    title="收货"
                    @click="handleReceive(order.id)"
                  >
                    <Icon name="download" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'receiving'"
                    class="action-btn"
                    title="质检"
                    @click="handleInspect(order.id)"
                  >
                    <Icon name="shield" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'inspecting'"
                    class="action-btn"
                    title="完成入库"
                    @click="handleComplete(order.id)"
                  >
                    <Icon name="check" :size="14" />
                  </button>
                  <button
                    v-if="
                      ['ordered', 'receiving', 'inspecting', 'completed'].includes(order.status) &&
                      order.type !== 'return'
                    "
                    class="action-btn"
                    title="退货"
                    @click="handleReturn(order)"
                  >
                    <Icon name="refresh" :size="14" />
                  </button>
                  <button
                    v-if="['draft', 'pending', 'approved'].includes(order.status)"
                    class="action-btn danger"
                    title="取消"
                    @click="handleCancel(order.id)"
                  >
                    <Icon name="close" :size="14" />
                  </button>
                  <button
                    v-if="order.status === 'draft'"
                    class="action-btn danger"
                    title="删除"
                    @click="handleDelete(order)"
                  >
                    <Icon name="delete" :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="clipboard" :size="24" /></div>
          <p>暂无匹配的采购单数据</p>
        </div>
      </div>
    </div>

    <!-- 采购列表 - 列表视图 -->
    <div v-show="activeTab === 'list' && viewMode === 'list'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购单列表</span>
        <span class="panel-card-count">共 {{ filteredOrders.length }} 条</span>
      </div>
      <div class="panel-card-body">
        <div v-if="filteredOrders.length > 0">
          <div
            v-for="(order, idx) in paginatedOrders"
            :key="order.id"
            class="purchase-list-item"
            :style="{ animationDelay: idx * 50 + 'ms' }"
            @click="openPreview(order)"
          >
            <div class="purchase-list-left">
              <span class="purchase-list-no">{{ order.orderNo }}</span>
              <span class="purchase-list-title">{{ order.title || '-' }}</span>
              <span
                class="tag-badge tag-sm"
                :style="{
                  background: order.type === 'return' ? 'var(--color-danger-subtle)' : 'var(--color-accent-subtle)',
                  color: order.type === 'return' ? 'var(--color-danger)' : 'var(--color-accent)'
                }"
              >
                {{ order.type === 'return' ? '退货' : '采购' }}
              </span>
            </div>
            <div class="purchase-list-center">
              <span class="purchase-list-supplier">{{ order.supplierName || '-' }}</span>
              <span class="purchase-list-date">{{ order.expectedDate || '-' }}</span>
            </div>
            <div class="purchase-list-right">
              <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
              <span class="purchase-list-amount">{{ formatAmount(order.totalAmount) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="clipboard" :size="24" /></div>
          <p>暂无匹配的采购单数据</p>
        </div>
      </div>
    </div>

    <!-- 采购列表 - 卡片视图 -->
    <div v-show="activeTab === 'list' && viewMode === 'card'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购单列表</span>
        <span class="panel-card-count">共 {{ filteredOrders.length }} 条</span>
      </div>
      <div class="panel-card-body">
        <div v-if="filteredOrders.length > 0" class="purchase-card-grid">
          <div
            v-for="(order, idx) in paginatedOrders"
            :key="order.id"
            class="purchase-card-item"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @click="openPreview(order)"
          >
            <div class="purchase-card-top-bar" :style="{ background: statusBarColor(order.status) }"></div>
            <div class="purchase-card-header">
              <span class="purchase-card-no">{{ order.orderNo }}</span>
              <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
            </div>
            <div class="purchase-card-title">{{ order.title || '-' }}</div>
            <div class="purchase-card-info">
              <span>
                <Icon name="truck" :size="12" />
                {{ order.supplierName || '-' }}
              </span>
              <span>
                <Icon name="calendar" :size="12" />
                {{ order.expectedDate || '-' }}
              </span>
            </div>
            <div class="purchase-card-footer">
              <span class="purchase-card-amount">{{ formatAmount(order.totalAmount) }}</span>
              <span
                class="tag-badge tag-sm"
                :style="{
                  background: order.type === 'return' ? 'var(--color-danger-subtle)' : 'var(--color-accent-subtle)',
                  color: order.type === 'return' ? 'var(--color-danger)' : 'var(--color-accent)'
                }"
              >
                {{ order.type === 'return' ? '退货' : '采购' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="clipboard" :size="24" /></div>
          <p>暂无匹配的采购单数据</p>
        </div>
      </div>
    </div>

    <!-- 采购明细 -->
    <div v-show="activeTab === 'detail'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购明细</span>
      </div>
      <div class="table-container">
        <table v-if="allItemDetails.length > 0" class="data-table">
          <thead>
            <tr>
              <th>采购单号</th>
              <th>编号</th>
              <th>物料名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>仓库</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(detail, idx) in paginatedDetails" :key="idx" :style="{ animationDelay: idx * 20 + 'ms' }">
              <td class="cell-mono">{{ detail.orderNo }}</td>
              <td>{{ detail.materialCode }}</td>
              <td>{{ detail.materialName }}</td>
              <td>{{ detail.spec || '-' }}</td>
              <td>{{ detail.unit }}</td>
              <td class="cell-mono">{{ detail.quantity }}</td>
              <td class="cell-mono">{{ formatAmount(detail.unitPrice) }}</td>
              <td class="cell-mono">{{ formatAmount(detail.amount) }}</td>
              <td>{{ detail.warehouseName || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="clipboard" :size="24" /></div>
          <p>暂无采购明细数据</p>
        </div>
      </div>
      <div v-if="detailTotalPages > 1" class="pagination">
        <button class="btn btn-sm btn-ghost" :disabled="detailPage <= 1" @click="detailPage--">
          <Icon name="chevronLeft" :size="12" />
          上一页
        </button>
        <span class="pagination-info">{{ detailPage }} / {{ detailTotalPages }}</span>
        <button class="btn btn-sm btn-ghost" :disabled="detailPage >= detailTotalPages" @click="detailPage++">
          下一页
          <Icon name="chevronRight" :size="12" />
        </button>
      </div>
    </div>

    <!-- 采购退货 -->
    <div v-show="activeTab === 'return'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">采购退货</span>
        <span class="panel-card-count">共 {{ purchaseStore.returnOrders.length }} 条</span>
      </div>
      <div class="table-container">
        <table v-if="purchaseStore.returnOrders.length > 0" class="data-table">
          <thead>
            <tr>
              <th>退货单号</th>
              <th>标题</th>
              <th>供应商</th>
              <th>金额</th>
              <th>状态</th>
              <th>日期</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(order, idx) in purchaseStore.returnOrders"
              :key="order.id"
              :style="{ animationDelay: idx * 20 + 'ms' }"
            >
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>{{ order.title || '-' }}</td>
              <td>{{ order.supplierName || '-' }}</td>
              <td class="cell-mono">{{ formatAmount(order.totalAmount) }}</td>
              <td>
                <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
              </td>
              <td>{{ order.createDate }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><Icon name="refresh" :size="24" /></div>
          <p>暂无退货记录</p>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="activeTab === 'list' && totalPages > 1" class="pagination">
      <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">
        <Icon name="chevronLeft" :size="12" />
        上一页
      </button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">
        下一页
        <Icon name="chevronRight" :size="12" />
      </button>
    </div>

    <!-- 新增/编辑弹窗 -->
    <PurchaseFormModal
      :visible="showFormModal"
      :order="editingOrder"
      @save="handleFormSave"
      @cancel="showFormModal = false"
    />

    <!-- 预览弹窗 -->
    <PurchasePreview :visible="showPreviewModal" :order="previewOrder" @close="showPreviewModal = false" />

    <!-- 审批弹窗 -->
    <Teleport to="body">
      <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
        <div class="modal-dialog" style="max-width: 460px">
          <div class="modal-header">
            <h3 class="modal-title">采购单审批</h3>
            <button class="modal-close" @click="showApproveModal = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="approve-info">
              <p>
                <strong>单号:</strong>
                {{ approvingOrder?.orderNo }}
              </p>
              <p>
                <strong>供应商:</strong>
                {{ approvingOrder?.supplierName }}
              </p>
              <p>
                <strong>金额:</strong>
                {{ formatAmount(approvingOrder?.totalAmount) }}
              </p>
            </div>
            <div class="form-group">
              <label class="form-label">拒绝原因（拒绝时填写）</label>
              <textarea v-model="rejectReason" class="form-input" rows="3" placeholder="请输入拒绝原因..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showApproveModal = false">取消</button>
            <button class="btn btn-danger" @click="handleReject">拒绝</button>
            <button class="btn btn-primary" @click="handleApprove">通过</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-dialog" style="max-width: 420px">
          <div class="modal-header">
            <h3 class="modal-title">确认删除</h3>
            <button class="modal-close" @click="showDeleteConfirm = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon-circle"><Icon name="warning" :size="24" /></div>
            <p class="confirm-text">
              确定要删除采购单
              <strong>{{ deletingOrder?.orderNo }}</strong>
              吗？
            </p>
            <p class="confirm-hint">仅草稿状态的采购单可以删除</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 取消确认弹窗 -->
    <Teleport to="body">
      <div v-if="showCancelConfirm" class="modal-overlay" @click.self="showCancelConfirm = false">
        <div class="modal-dialog" style="max-width: 420px">
          <div class="modal-header">
            <h3 class="modal-title">确认取消</h3>
            <button class="modal-close" @click="showCancelConfirm = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon-circle"><Icon name="warning" :size="24" /></div>
            <p class="confirm-text">
              确定要取消采购单
              <strong>{{ cancellingOrderNo }}</strong>
              吗？
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showCancelConfirm = false">返回</button>
            <button class="btn btn-danger" @click="confirmCancel">确认取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default { name: 'PurchaseManagement' }
</script>
<script setup>
import PurchaseFormModal from '@/modules/purchase/components/purchase/PurchaseFormModal.vue'
import PurchasePreview from '@/modules/purchase/components/purchase/PurchasePreview.vue'
import { usePurchaseManagement } from '@/modules/purchase/composables/usePurchaseManagement'

const {
  purchaseStore,
  supplierStore,
  STATUS_LABELS,
  STATUS_COLORS,
  searchText,
  filterType,
  filterStatus,
  filterSupplier,
  quickDateFilter,
  activeTab,
  viewMode,
  showStatsExpanded,
  toggleInProgressFilter,
  pendingAmount,
  inProgressAmount,
  completedCount,
  completedAmount,
  totalCountTrend,
  pendingTrend,
  amountTrend,
  toggleQuickDate,
  activeFilterTags,
  removeFilterTag,
  clearAllFilters,
  filteredOrders,
  allItemDetails,
  pageSize,
  currentPage,
  detailPage,
  totalPages,
  detailTotalPages,
  paginatedOrders,
  paginatedDetails,
  completionRate,
  RING_C,
  completionRateColor,
  completionRateDash,
  topSuppliers,
  recent7Days,
  pendingAlerts,
  statusBarColor,
  showFormModal,
  editingOrder,
  openAddModal,
  openEditModal,
  handleFormSave,
  showPreviewModal,
  previewOrder,
  openPreview,
  showApproveModal,
  approvingOrder,
  rejectReason,
  openApproveModal,
  handleApprove,
  handleReject,
  handleSubmit,
  handleOrder,
  handleReceive,
  handleInspect,
  handleComplete,
  handleReturn,
  showCancelConfirm,
  cancellingOrderNo,
  handleCancel,
  confirmCancel,
  showDeleteConfirm,
  deletingOrder,
  handleDelete,
  confirmDelete,
  formatAmount,
  formatAmountShort
} = usePurchaseManagement()
</script>

<style scoped>
.purchase-management-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* ====== 流程看板 ====== */
.flow-board {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  margin-bottom: var(--space-4);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.flow-board-node {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}
.flow-board-node:hover {
  background: var(--color-bg-secondary);
}
.flow-board-node.active {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.flow-board-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.flow-board-dot.pending {
  background: var(--color-warning);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}
.flow-board-dot.progress {
  background: var(--color-info);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.flow-board-dot.completed {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}
.flow-board-count {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}
.flow-board-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.flow-board-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.flow-board-arrow {
  font-size: var(--font-size-lg);
  color: var(--color-text-tertiary);
  font-weight: 300;
}

/* ====== 折叠统计区 ====== */
.collapsible-stats {
  margin-bottom: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.collapsible-stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-secondary);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.collapsible-stats-header:hover {
  background: var(--color-bg-tertiary);
}
.collapsible-stats-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.collapsible-stats-toggle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  transition: transform 0.3s ease;
}
.collapsible-stats-toggle.expanded {
  transform: rotate(180deg);
}
.collapsible-stats-body {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}

/* ====== 统计卡片动画 ====== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.stat-card-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 700;
  font-size: var(--font-size-2xl);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.stat-dot-halo {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 1.5s ease-in-out infinite;
}

/* ====== 概览面板 ====== */
.purchase-overview-row {
  display: grid;
  grid-template-columns: 200px 1fr 220px;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.overview-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.overview-card:nth-child(1) {
  animation-delay: 0ms;
}
.overview-card:nth-child(2) {
  animation-delay: 80ms;
}
.overview-card:nth-child(3) {
  animation-delay: 160ms;
}
.overview-card-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
  font-weight: 500;
}

/* 进度环 */
.overview-ring-body {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.overview-ring-svg {
  flex-shrink: 0;
}
.overview-ring-progress {
  transition: stroke-dasharray 0.6s ease;
}
.overview-ring-text {
  display: flex;
  flex-direction: column;
}
.overview-ring-percent {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
}
.overview-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* 供应商条形图 */
.supplier-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.supplier-bar-item {
  display: grid;
  grid-template-columns: 80px 1fr 60px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.supplier-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}
.supplier-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}
.supplier-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.supplier-bar-amount {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
  font-size: 10px;
}

/* 近7日趋势柱状图 */
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
  height: 80px;
  padding-top: var(--space-1);
}
.trend-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.trend-bar-track-v {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.trend-bar-fill-v {
  width: 100%;
  border-radius: 3px 3px 0 0;
  transition: height 0.5s ease;
  min-height: 2px;
}
.trend-bar-day {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.trend-bar-num {
  font-size: 10px;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* ====== 待处理预警 ====== */
.purchase-alert-panel {
  margin-bottom: var(--space-3);
  border-left: 3px solid var(--color-warning);
}
.alert-dot-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
  animation: alertDotPulse 1.5s ease-in-out infinite;
  margin-right: var(--space-1);
}
@keyframes alertDotPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
  }
}
.purchase-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.purchase-alert-item:last-child {
  border-bottom: none;
}
@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.purchase-alert-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.purchase-alert-badge.status-pending {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.purchase-alert-badge.status-inspecting {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.purchase-alert-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.purchase-alert-supplier {
  color: var(--color-text-secondary);
}
.purchase-alert-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-primary);
  margin-left: auto;
}
.purchase-alert-date {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

/* ====== Tab + 视图切换 ====== */
.tab-view-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.tab-bar {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  width: fit-content;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  background: var(--color-accent);
  color: #fff;
}
.view-toggle {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}
.view-toggle-btn {
  padding: var(--space-1) var(--space-2);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
}
.view-toggle-btn:hover {
  color: var(--color-text-secondary);
}
.view-toggle-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ====== 表格行入场动画 ====== */
.data-table tbody tr {
  animation: rowSlideIn 0.3s ease-out both;
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

/* ====== 列表视图 ====== */
.purchase-list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: listSlideIn 0.3s ease-out both;
}
.purchase-list-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
.purchase-list-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}
.purchase-list-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.purchase-list-title {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-sm {
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
}
.purchase-list-center {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}
.purchase-list-supplier {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.purchase-list-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.purchase-list-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.purchase-list-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* ====== 卡片视图 ====== */
.purchase-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}
.purchase-card-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  transition: all 0.25s ease;
  cursor: pointer;
  animation: cardFadeIn 0.4s ease-out both;
  overflow: hidden;
  position: relative;
}
.purchase-card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
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
.purchase-card-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.purchase-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.purchase-card-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  font-size: var(--font-size-sm);
}
.purchase-card-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.purchase-card-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}
.purchase-card-info span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.purchase-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.purchase-card-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ====== 空状态 ====== */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-2);
  color: var(--color-text-tertiary);
}

/* ====== 确认弹窗圆形图标 ====== */
.confirm-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-warning-subtle, rgba(245, 158, 11, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
  color: var(--color-warning);
}

/* ====== 分页 ====== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.action-cell {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.panel-card-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
/* 审批弹窗 */
.approve-info {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
}
.approve-info p {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
/* 确认弹窗 */
.confirm-text {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.confirm-hint {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ====== 统计卡片趋势 ====== */
.stat-card-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
}
.stat-card-trend.trend-up {
  color: var(--color-success);
}
.stat-card-trend.trend-down {
  color: var(--color-danger);
}
.trend-period {
  color: var(--color-text-tertiary);
  margin-left: var(--space-1);
}

/* ====== 完成率环可点击 ====== */
.overview-ring-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ====== 预警项增强 ====== */
.purchase-alert-item.alert-severity-pending {
  border-left: 3px solid var(--color-warning);
  padding-left: var(--space-3);
  background: var(--color-warning-subtle);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}
.purchase-alert-item.alert-severity-inspecting {
  border-left: 3px solid var(--color-info);
  padding-left: var(--space-3);
  background: var(--color-info-subtle);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}
.purchase-alert-actions {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
  flex-shrink: 0;
}

/* ====== 快速筛选标签 ====== */
.filter-quick-tags {
  display: flex;
  gap: var(--space-1);
}
.quick-tag {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.quick-tag:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quick-tag.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

/* ====== 筛选条件标签栏 ====== */
.filter-tags-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
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
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
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
  opacity: 0.7;
  transition: opacity 0.2s;
}
.filter-tag-remove:hover {
  opacity: 1;
}
.filter-tag-clear {
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  text-decoration: underline;
  margin-left: var(--space-1);
}
.filter-tag-clear:hover {
  color: var(--color-danger);
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .purchase-overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .page-header-row {
    flex-direction: column;
    gap: var(--space-3);
  }
  .tab-view-row {
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
  }
  .tab-bar,
  .tab-btn {
    width: 100%;
  }
  .tab-btn {
    flex: 1;
    text-align: center;
  }
  .purchase-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
