<template>
  <div class="delivery-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">送货管理</h2>
        <p class="page-header-subtitle">送货单生命周期管理：看板、日历、状态跟踪</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewOptions" :key="v.key"
            class="btn btn-ghost btn-sm" :class="{ active: currentView === v.key }"
            @click="currentView = v.key" :title="v.icon + ' ' + v.label"><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
        <button class="btn btn-secondary" @click="showAssessment = true"><Icon name="search" :size="14" /> 自主评估</button>
        <button v-if="canCreate" class="btn btn-primary" @click="openEditor()">新建送货单</button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid stats-grid-6">
      <div class="stat-card" style="animation-delay:0ms">
        <div class="stat-card-header">
          <span class="stat-card-label">全部送货单</span>
          <div class="stat-card-icon" style="background:var(--color-bg-tertiary);color:var(--color-text-secondary)"><Icon name="list" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ deliveryStore.totalDeliveries }}</div>
      </div>
      <div class="stat-card" style="animation-delay:60ms">
        <div class="stat-card-header">
          <span class="stat-card-label">待发货</span>
          <div class="stat-card-icon" style="background:var(--color-warning-subtle,rgba(245,158,11,0.1));color:var(--color-warning)"><Icon name="warning" :size="14" /></div>
        </div>
        <div class="stat-card-value"><span class="stat-dot-halo" style="background:var(--color-warning)"></span>{{ deliveryStore.pendingCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:120ms">
        <div class="stat-card-header">
          <span class="stat-card-label">已发货</span>
          <div class="stat-card-icon" style="background:var(--color-info-subtle,rgba(6,182,212,0.1));color:var(--color-info)"><Icon name="truck" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ deliveryStore.shippedCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:180ms">
        <div class="stat-card-header">
          <span class="stat-card-label">运输中</span>
          <div class="stat-card-icon" style="background:var(--color-accent-subtle,rgba(59,130,246,0.1));color:var(--color-accent)"><Icon name="mapPin" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ deliveryStore.transitCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:240ms">
        <div class="stat-card-header">
          <span class="stat-card-label">已签收</span>
          <div class="stat-card-icon" style="background:var(--color-success-subtle,rgba(16,185,129,0.1));color:var(--color-success)"><Icon name="checkCircle" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ deliveryStore.receivedCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:300ms">
        <div class="stat-card-header">
          <span class="stat-card-label">异常处理中</span>
          <div class="stat-card-icon" style="background:var(--color-danger-subtle,rgba(239,68,68,0.1));color:var(--color-danger)"><Icon name="warning" :size="14" /></div>
        </div>
        <div class="stat-card-value"><span class="stat-dot-halo" style="background:var(--color-danger)"></span>{{ deliveryStore.exceptionCount }}</div>
      </div>
    </div>

    <!-- 概览面板：送货完成率 + 运输方式分布 + 近7日趋势 -->
    <div class="delivery-overview-row">
      <div class="overview-card overview-ring-card">
        <div class="overview-card-title">送货完成率</div>
        <div class="overview-ring-body">
          <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
            <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
            <circle cx="36" cy="36" r="26" fill="none" :stroke="completionRateColor" stroke-width="5" stroke-linecap="round"
              :stroke-dasharray="completionRateDash" stroke-dashoffset="0" transform="rotate(-90 36 36)" class="overview-ring-progress" />
          </svg>
          <div class="overview-ring-text">
            <span class="overview-ring-percent" :style="{ color: completionRateColor }">{{ completionRate }}%</span>
            <span class="overview-ring-sub">已签收/总数</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-transport-card">
        <div class="overview-card-title">运输方式分布</div>
        <div class="transport-bars">
          <div v-for="t in transportStats" :key="t.type" class="transport-bar-item">
            <span class="transport-bar-label">{{ t.label }}</span>
            <div class="transport-bar-track">
              <div class="transport-bar-fill" :style="{ width: t.percent + '%', background: t.color }"></div>
            </div>
            <span class="transport-bar-count">{{ t.count }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-trend-card">
        <div class="overview-card-title">近7日送货趋势</div>
        <div class="trend-bars">
          <div v-for="(d, idx) in recent7Days" :key="idx" class="trend-bar-col">
            <div class="trend-bar-track-v">
              <div class="trend-bar-fill-v" :style="{ height: d.percent + '%', background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)' }"></div>
            </div>
            <span class="trend-bar-day">{{ d.dayLabel }}</span>
            <span class="trend-bar-num">{{ d.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 逾期/异常预警 -->
    <div v-if="deliveryAlerts.length > 0" class="panel-card delivery-alert-panel">
      <div class="panel-card-header">
        <span class="panel-card-title" style="color:var(--color-danger)"><span class="alert-dot-pulse" style="background:var(--color-danger)"></span> 送货预警</span>
      </div>
      <div class="panel-card-body">
        <div v-for="(a, idx) in deliveryAlerts" :key="a.id" class="delivery-alert-item" :style="{ animationDelay: idx * 60 + 'ms' }">
          <span class="delivery-alert-badge" :class="'alert-' + a.alertType">{{ a.alertLabel }}</span>
          <span class="delivery-alert-no">{{ a.deliveryNo }}</span>
          <span class="delivery-alert-customer">{{ a.customerName }}</span>
          <span class="delivery-alert-amount">¥{{ formatMoney(a.totalAmount) }}</span>
          <span class="delivery-alert-date">{{ a.expectedArrivalDate || '-' }}</span>
          <button class="btn btn-ghost btn-sm" @click="viewDetail(a.id)">查看</button>
        </div>
      </div>
    </div>

    <div v-else-if="deliveryStore.overdueCount > 0" class="panel-card" style="margin-bottom:var(--space-4);border-left:3px solid var(--color-danger)">
      <div class="panel-card-body" style="display:flex;align-items:center;gap:var(--space-3)">
        <span style="font-size:1.2em"><Icon name="warning" :size="14" /></span>
        <span>有 <strong>{{ deliveryStore.overdueCount }}</strong> 单送货已超过预计送达日期但尚未签收，请优先处理。</span>
      </div>
    </div>

    <div v-if="currentView !== 'kanban'" class="filter-bar">
      <input type="text" class="form-input" v-model="filters.search" placeholder="搜索送货单号/客户名称...">
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="created">已创建</option>
        <option value="pending">待发货</option>
        <option value="shipped">已发货</option>
        <option value="transit">运输中</option>
        <option value="received">已签收</option>
        <option value="accepted">已验收</option>
        <option value="partial">部分签收</option>
        <option value="exception">异常处理中</option>
        <option value="returned">退回</option>
      </select>
      <select class="form-select" v-model="filters.urgency">
        <option value="">全部紧急程度</option>
        <option value="urgent">紧急</option>
        <option value="high">高</option>
        <option value="normal">普通</option>
        <option value="low">低</option>
      </select>
      <select class="form-select" v-model="filters.transport">
        <option value="">全部运输方式</option>
        <option value="self">自提</option>
        <option value="logistics">物流</option>
        <option value="express">快递</option>
        <option value="dedicated">专车</option>
      </select>
      <DataSelect module="customer" variant="active" v-model="filters.customerName" value-field="name" label-field="name" placeholder="全部客户" clearable style="min-width:160px" />
      <input type="date" class="form-input" v-model="filters.dateFrom" style="max-width:140px" title="起始日期">
      <input type="date" class="form-input" v-model="filters.dateTo" style="max-width:140px" title="截止日期">
      <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
    </div>

    <div v-if="statusConfirmId" class="modal-overlay" @click.self="cancelStatusChange">
      <div class="modal-panel" style="max-width:400px">
        <div class="modal-header"><h3>确认状态流转</h3></div>
        <div class="modal-body">
          <p>确认将状态从「{{ deliveryStore.statusLabels[deliveryStore.getById(statusConfirmId)?.status] }}」流转到「{{ deliveryStore.statusLabels[statusConfirmNext] || statusConfirmNext }}」？</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="cancelStatusChange">取消</button>
          <button class="btn btn-primary" @click="confirmStatusChange">确认流转</button>
        </div>
      </div>
    </div>

    <div v-if="currentView === 'table'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll"></th>
                <th style="width:50px;text-align:center">序号</th>
                <th v-if="columnVisible.deliveryNo" @click="toggleSort('deliveryNo')" style="cursor:pointer">送货单号 <span class="sort-icon"><Icon :name="sortField === 'deliveryNo' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'" :size="12" /></span></th>
                <th v-if="columnVisible.customer" @click="toggleSort('customerName')" style="cursor:pointer">购货单位 <span class="sort-icon"><Icon :name="sortField === 'customerName' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'" :size="12" /></span></th>
                <th v-if="columnVisible.purchaseNo">关联采购单号</th>
                <th v-if="columnVisible.shipDate" @click="toggleSort('date')" style="cursor:pointer">发货日期 <span class="sort-icon"><Icon :name="sortField === 'date' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'" :size="12" /></span></th>
                <th v-if="columnVisible.expectedDate">预计送达</th>
                <th v-if="columnVisible.transportMode">运输方式</th>
                <th v-if="columnVisible.carrier">承运单位</th>
                <th v-if="columnVisible.amount" @click="toggleSort('totalAmount')" style="cursor:pointer">金额 <span class="sort-icon"><Icon :name="sortField === 'totalAmount' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'" :size="12" /></span></th>
                <th v-if="columnVisible.urgency">紧急程度</th>
                <th v-if="columnVisible.status">状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pagedDeliveries.length === 0">
                <td colspan="13" class="empty-state">
                  <div class="empty-state-icon"><Icon name="package" :size="32" /></div>暂无送货记录
                </td>
              </tr>
              <tr v-for="(d, idx) in pagedDeliveries" :key="d.id"
                :style="[d.hasException === '1' ? 'border-left:3px solid var(--color-danger)' : '', { animationDelay: idx * 20 + 'ms' }]" class="delivery-table-row">
                <td><input type="checkbox" :value="d.id" v-model="selectedIds"></td>
                <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                <td v-if="columnVisible.deliveryNo" class="cell-mono" style="font-weight:600;color:var(--color-accent);cursor:pointer" @click="viewDetail(d.id)">{{ d.deliveryNo }}</td>
                <td v-if="columnVisible.customer">{{ d.customerName || '-' }}</td>
                <td v-if="columnVisible.purchaseNo" class="cell-mono">{{ d.orderId || '-' }}</td>
                <td v-if="columnVisible.shipDate">{{ d.date || '-' }}</td>
                <td v-if="columnVisible.expectedDate" :style="isOverdue(d) ? 'color:var(--color-danger);font-weight:600' : ''">{{ d.expectedArrivalDate || d.expectedDate || '-' }}</td>
                <td v-if="columnVisible.transportMode">{{ deliveryStore.transportLabels[d.transportMethod] || '-' }}</td>
                <td v-if="columnVisible.carrier">{{ d.carrier || '-' }}</td>
                <td v-if="columnVisible.amount" class="cell-mono">¥{{ formatMoney(d.totalAmount) }}</td>
                <td v-if="columnVisible.urgency">
                  <span class="status-badge" :class="deliveryStore.urgencyBadgeMap[d.urgency] || 'neutral'">
                    {{ deliveryStore.urgencyLabels[d.urgency] || d.urgency }}
                  </span>
                </td>
                <td v-if="columnVisible.status">
                  <span class="status-badge" :class="deliveryStore.statusBadgeMap[d.status] || 'neutral'">
                    {{ deliveryStore.statusLabels[d.status] || d.status }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-ghost btn-sm" @click="viewDetail(d.id)" title="查看"><Icon name="eye" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" @click="handleChangeStatus(d.id)" title="状态流转" style="color:var(--color-accent)"><Icon name="refresh" :size="14" /></button>
                  <button v-if="d.status === 'created' || d.status === 'pending'" class="btn btn-ghost btn-sm" @click="openEditor(d)" title="编辑"><Icon name="edit" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" @click="handlePrint(d.id)" title="打印"><Icon name="print" :size="14" /></button>
                  <button v-if="d.status === 'created' || d.status === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDelete(d.id)" title="删除"><Icon name="delete" :size="14" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel-card-footer" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">每页</span>
          <select class="form-select" v-model.number="pageSize" style="width:70px;padding:2px 6px;font-size:var(--font-size-xs)">
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">条</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-1)">
          <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
          <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
          <button v-for="p in visiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === currentPage }" @click="currentPage = p" style="min-width:28px">{{ p }}</button>
          <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
          <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <button v-if="canExport" class="btn btn-ghost btn-sm" @click="exportCSV"><Icon name="upload" :size="14" /> 导出CSV</button>
          <button v-if="canDelete && selectedIds.length > 0" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="batchDelete"><Icon name="delete" :size="14" /> 批量删除({{ selectedIds.length }})</button>
        </div>
      </div>
    </div>

    <div v-if="currentView === 'list'" class="panel-card">
      <div class="panel-card-body">
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3)">共 {{ filteredDeliveries.length }} 条</div>
        <div v-if="pagedDeliveries.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="package" :size="32" /></div>暂无送货记录
        </div>
        <div v-for="(d, idx) in pagedDeliveries" :key="d.id" class="list-item" @click="viewDetail(d.id)" style="cursor:pointer" :style="{ animationDelay: idx * 50 + 'ms' }">
          <div class="list-item-main">
            <div class="list-item-title">
              <span style="font-weight:600;color:var(--color-accent)">{{ d.deliveryNo }}</span>
              <span v-if="d.urgency === 'urgent'" style="color:var(--color-danger);font-weight:700;margin-left:4px"><Icon name="warning" :size="14" /></span>
              <span v-if="d.hasException === '1'" style="color:var(--color-danger);font-weight:700;margin-left:4px"><Icon name="warning" :size="14" /></span>
            </div>
            <div class="list-item-desc">{{ d.customerName || '-' }} · {{ d.date || '-' }}</div>
          </div>
          <div class="list-item-side">
            <span class="status-badge" :class="deliveryStore.statusBadgeMap[d.status] || 'neutral'">
              {{ deliveryStore.statusLabels[d.status] || d.status }}
            </span>
            <span class="cell-mono">¥{{ formatMoney(d.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="currentView === 'list' && totalPages > 1" class="pagination-bar">
      <span class="page-info">共 {{ filteredDeliveries.length }} 条</span>
      <div style="display:flex;align-items:center;gap:var(--space-1)">
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
        <button v-for="p in visiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === currentPage }" @click="currentPage = p" style="min-width:28px">{{ p }}</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
      </div>
    </div>

    <div v-if="currentView === 'card'" class="panel-card">
      <div class="panel-card-body">
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-3)">共 {{ filteredDeliveries.length }} 条</div>
        <div v-if="pagedDeliveries.length === 0" class="empty-state">
          <div class="empty-state-icon"><Icon name="package" :size="32" /></div>暂无送货记录
        </div>
        <div class="card-grid">
          <div v-for="(d, idx) in pagedDeliveries" :key="d.id" class="card-item" @click="viewDetail(d.id)" style="cursor:pointer" :style="{ animationDelay: idx * 60 + 'ms' }">
            <div class="card-item-header">
              <span style="font-weight:600;color:var(--color-accent)">{{ d.deliveryNo }}</span>
              <span class="status-badge" :class="deliveryStore.statusBadgeMap[d.status] || 'neutral'">
                {{ deliveryStore.statusLabels[d.status] || d.status }}
              </span>
            </div>
            <div class="card-item-body">
              <div><Icon name="users" :size="14" /> {{ d.customerName || '-' }}</div>
              <div><Icon name="dollar" :size="14" /> ¥{{ formatMoney(d.totalAmount) }}</div>
              <div><Icon name="warning" :size="14" /> {{ deliveryStore.urgencyLabels[d.urgency] || '普通' }}</div>
              <div><Icon name="calendar" :size="14" /> {{ d.date || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="currentView === 'card' && totalPages > 1" class="pagination-bar">
      <span class="page-info">共 {{ filteredDeliveries.length }} 条</span>
      <div style="display:flex;align-items:center;gap:var(--space-1)">
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
        <button v-for="p in visiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === currentPage }" @click="currentPage = p" style="min-width:28px">{{ p }}</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
      </div>
    </div>

    <div v-if="currentView === 'kanban'" class="kanban-board">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-column"
        @dragover.prevent="$event.currentTarget.classList.add('drop-target')"
        @dragleave="$event.currentTarget.classList.remove('drop-target')"
        @drop="onDropCard($event, col.key)">
        <div class="kanban-column-header" :style="{ borderBottomColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-count">{{ kanbanItems(col.key).length }}</span>
        </div>
        <div class="kanban-column-body">
          <div v-for="(d, idx) in kanbanItems(col.key)" :key="d.id" class="kanban-card"
            draggable="true" @dragstart="onDragStart($event, d.id)" @dragend="onDragEnd" :style="{ animationDelay: idx * 40 + 'ms' }">
            <div class="kanban-card-title">
              <span v-if="d.urgency === 'urgent'" style="color:var(--color-danger)"><Icon name="warning" :size="14" /></span>
              <span v-if="d.urgency === 'high'" style="color:var(--color-warning)"><Icon name="warning" :size="14" /></span>
              {{ d.deliveryNo }}
              <span v-if="d.hasException === '1'" style="color:var(--color-danger);font-weight:700;margin-left:4px"><Icon name="warning" :size="14" /></span>
            </div>
            <div class="kanban-card-meta">{{ d.customerName || '-' }}</div>
            <div class="kanban-card-footer">
              <span>{{ d.carrier || '-' }}</span>
              <span style="font-family:var(--font-mono);font-size:10px">¥{{ formatMoney(d.totalAmount) }}</span>
            </div>
          </div>
          <div v-if="kanbanItems(col.key).length === 0" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4);font-size:var(--font-size-xs)">暂无记录</div>
        </div>
      </div>
    </div>

    <div v-if="showAssessment" class="modal-overlay" @click.self="showAssessment = false">
      <div class="modal-panel" style="max-width:800px">
        <div class="modal-header">
          <h3><Icon name="search" :size="14" /> 送货单自主评估报告</h3>
          <button class="btn btn-ghost btn-sm" @click="showAssessment = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-4)">
            <div style="text-align:center;padding:var(--space-4);background:var(--color-bg-tertiary);border-radius:var(--radius-lg)">
              <div style="font-size:2rem;font-weight:800" :style="{ color: gradeColor }">{{ assessment.grade }}</div>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">综合评级</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">评分 {{ assessment.score }}/100</div>
            </div>
            <div style="text-align:center;padding:var(--space-4);background:var(--color-bg-tertiary);border-radius:var(--radius-lg)">
              <div style="font-size:1.5rem;font-weight:700;color:var(--color-success)">{{ assessment.completionRate }}%</div>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">完成率</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">已签收+已验收</div>
            </div>
            <div style="text-align:center;padding:var(--space-4);background:var(--color-bg-tertiary);border-radius:var(--radius-lg)">
              <div style="font-size:1.5rem;font-weight:700;color:var(--color-info)">{{ assessment.onTimeRate }}%</div>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">准时率</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">逾期 {{ assessment.overdueCount }} 单</div>
            </div>
            <div style="text-align:center;padding:var(--space-4);background:var(--color-bg-tertiary);border-radius:var(--radius-lg)">
              <div style="font-size:1.5rem;font-weight:700" :style="{ color: assessment.exceptionRate > 10 ? 'var(--color-danger)' : 'var(--color-success)' }">{{ assessment.exceptionRate }}%</div>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">异常率</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">异常 {{ assessment.exceptionCount }} 单</div>
            </div>
          </div>
          <div v-if="assessment.overdueCount > 0" style="padding:var(--space-3);background:var(--color-danger-subtle,rgba(239,68,68,0.1));border-radius:var(--radius-md);margin-bottom:var(--space-3)">
            <strong style="color:var(--color-danger)"><Icon name="warning" :size="14" /> 逾期预警：</strong>有 {{ assessment.overdueCount }} 单送货已超过预计送达日期但尚未签收，请优先处理。
          </div>
          <div v-if="assessment.exceptionCount > 0" style="padding:var(--space-3);background:var(--color-warning-subtle,rgba(245,158,11,0.1));border-radius:var(--radius-md);margin-bottom:var(--space-3)">
            <strong style="color:var(--color-warning)"><Icon name="warning" :size="14" /> 异常提醒：</strong>有 {{ assessment.exceptionCount }} 单存在异常情况，请及时跟进处理。
          </div>
          <div v-if="assessment.suggestions && assessment.suggestions.length > 0" style="padding:var(--space-3);background:var(--color-info-subtle,rgba(6,182,212,0.1));border-radius:var(--radius-md)">
            <strong style="color:var(--color-info)"><Icon name="info" :size="14" /> 改进建议：</strong>
            <ul style="margin:var(--space-2) 0 0 var(--space-4);font-size:var(--font-size-sm)">
              <li v-for="(s, i) in assessment.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
      <div class="modal-panel" style="max-width:1000px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑送货单' : '新建送货单' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeEditor"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-section-title"><Icon name="list" :size="14" /> 基本信息</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">单据编号</label>
              <input class="form-input" v-model="editorData.deliveryNo" readonly style="opacity:0.7;cursor:not-allowed">
            </div>
            <div class="form-group">
              <label class="form-label">发货日期</label>
              <input class="form-input" type="date" v-model="editorData.date">
            </div>
            <div class="form-group">
              <label class="form-label">关联采购单号</label>
              <input class="form-input" v-model="editorData.orderId">
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">紧急程度</label>
              <select class="form-select" v-model="editorData.urgency">
                <option value="normal">普通</option>
                <option value="low">低</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div class="form-group"></div>
            <div class="form-group"></div>
          </div>

          <div class="form-section-title"><Icon name="users" :size="14" /> 购货单位信息</div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">购货单位名称 <span class="required">*</span></label>
              <DataSelect module="customer" variant="active" v-model="editorData.customerName" value-field="name" label-field="name" placeholder="选择客户" @change="onCustomerChange" />
            </div>
            <div class="form-group">
              <label class="form-label">地址</label>
              <input class="form-input" v-model="editorData.address">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">联系人</label>
              <input class="form-input" v-model="editorData.contact">
            </div>
            <div class="form-group">
              <label class="form-label">联系电话</label>
              <input class="form-input" v-model="editorData.phone">
            </div>
          </div>

          <div class="form-section-title"><Icon name="download" :size="14" /> 送货计划</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">预计送货日期</label>
              <input class="form-input" type="date" v-model="editorData.expectedDate">
            </div>
            <div class="form-group">
              <label class="form-label">预计送达日期</label>
              <input class="form-input" type="date" v-model="editorData.expectedArrivalDate">
            </div>
            <div class="form-group">
              <label class="form-label">运输方式</label>
              <select class="form-select" v-model="editorData.transportMethod">
                <option value="logistics">物流</option>
                <option value="express">快递</option>
                <option value="self">自提</option>
                <option value="dedicated">专车</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">承运单位</label>
              <input class="form-input" v-model="editorData.carrier">
            </div>
            <div class="form-group">
              <label class="form-label">送货人员</label>
              <input class="form-input" v-model="editorData.driver">
            </div>
            <div class="form-group">
              <label class="form-label">送货电话</label>
              <input class="form-input" v-model="editorData.driverPhone">
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">车辆牌号</label>
              <input class="form-input" v-model="editorData.plateNo">
            </div>
            <div class="form-group">
              <label class="form-label">司机电话</label>
              <input class="form-input" v-model="editorData.driverMobile">
            </div>
            <div class="form-group">
              <label class="form-label">物流单号</label>
              <input class="form-input" v-model="editorData.trackingNo">
            </div>
          </div>

          <div class="form-section-title"><Icon name="package" :size="14" /> 产品明细</div>
          <div style="overflow-x:auto">
            <table class="data-table" style="font-size:var(--font-size-xs)">
              <thead>
                <tr>
                  <th style="width:36px">序号</th>
                  <th>产品名称</th>
                  <th>料号</th>
                  <th>存货编号</th>
                  <th>规格</th>
                  <th style="width:50px">单位</th>
                  <th style="width:70px">数量</th>
                  <th style="width:80px">单价</th>
                  <th style="width:80px">金额</th>
                  <th style="width:55px">税率%</th>
                  <th style="width:70px">税额</th>
                  <th style="width:36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, idx) in editorItems" :key="idx">
                  <td style="text-align:center;overflow-wrap:break-word;word-wrap:break-word">{{ idx + 1 }}</td>
                  <td><input class="form-input" style="min-width:100px" v-model="it.productName"></td>
                  <td><input class="form-input" style="min-width:80px" v-model="it.partNo"></td>
                  <td><input class="form-input" style="min-width:80px" v-model="it.inventoryCode"></td>
                  <td><input class="form-input" style="min-width:80px" v-model="it.spec"></td>
                  <td><input class="form-input" style="width:50px" v-model="it.unit"></td>
                  <td><input class="form-input" type="number" min="0" step="0.01" style="width:70px" v-model.number="it.quantity" @input="calcItemAmount(idx)"></td>
                  <td><input class="form-input" type="number" min="0" step="0.01" style="width:80px" v-model.number="it.unitPrice" @input="calcItemAmount(idx)"></td>
                  <td class="cell-mono" style="text-align:right">{{ formatMoney(it.amount || 0) }}</td>
                  <td><input class="form-input" type="number" min="0" max="100" step="1" style="width:55px" v-model.number="it.taxRate" @input="calcItemAmount(idx)"></td>
                  <td class="cell-mono" style="text-align:right">{{ formatMoney(it.taxAmount || 0) }}</td>
                  <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="removeItemRow(idx)"><Icon name="close" :size="14" /></button></td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background:var(--color-bg-tertiary);font-weight:600">
                  <td colspan="6" style="text-align:right">合计</td>
                  <td class="cell-mono" style="text-align:right">{{ calcTotalQuantity }}</td>
                  <td></td>
                  <td class="cell-mono" style="text-align:right">{{ formatMoney(calcTotalAmount) }}</td>
                  <td></td>
                  <td class="cell-mono" style="text-align:right">{{ formatMoney(calcTotalTax) }}</td>
                  <td></td>
                </tr>
                <tr style="background:var(--color-bg-tertiary);font-weight:700">
                  <td colspan="8" style="text-align:right">价税合计</td>
                  <td class="cell-mono" style="text-align:right;color:var(--color-danger)" colspan="3">{{ formatMoney(calcGrandTotal) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style="margin-top:var(--space-2)">
            <button class="btn btn-ghost btn-sm" @click="addItemRow">添加产品行</button>
          </div>

          <div class="form-section-title"><Icon name="check" :size="14" /> 收货确认</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">实际送达日期</label>
              <input class="form-input" type="date" v-model="editorData.actualDate">
            </div>
            <div class="form-group">
              <label class="form-label">货物验收情况</label>
              <select class="form-select" v-model="editorData.acceptanceResult">
                <option value="">未验收</option>
                <option value="passed">验收通过</option>
                <option value="partial">部分通过</option>
                <option value="failed">不通过</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">验收人员</label>
              <input class="form-input" v-model="editorData.acceptPerson">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">验收说明</label>
              <input class="form-input" v-model="editorData.acceptNote">
            </div>
            <div class="form-group">
              <label class="form-label">验收日期</label>
              <input class="form-input" type="date" v-model="editorData.acceptDate">
            </div>
          </div>

          <div class="form-section-title"><Icon name="warning" :size="14" /> 异常处理</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">是否有异常</label>
              <select class="form-select" v-model="editorData.hasException">
                <option value="0">无</option>
                <option value="1">有</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">异常类型</label>
              <select class="form-select" v-model="editorData.exceptionType" :disabled="editorData.hasException !== '1'">
                <option value="">请选择</option>
                <option value="delay">延迟送达</option>
                <option value="damage">货物破损</option>
                <option value="shortage">数量短缺</option>
                <option value="address_error">地址错误</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">异常处理责任人</label>
              <input class="form-input" v-model="editorData.exceptionResponsible" :disabled="editorData.hasException !== '1'">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">异常原因</label>
              <textarea class="form-textarea" rows="2" v-model="editorData.exceptionReason" :disabled="editorData.hasException !== '1'"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">处理方案</label>
              <textarea class="form-textarea" rows="2" v-model="editorData.exceptionSolution" :disabled="editorData.hasException !== '1'"></textarea>
            </div>
          </div>

          <div class="form-section-title"><Icon name="list" :size="14" /> 签章确认</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">审核人</label>
              <input class="form-input" v-model="editorData.reviewer">
            </div>
            <div class="form-group">
              <label class="form-label">财务确认人</label>
              <input class="form-input" v-model="editorData.financePerson">
            </div>
            <div class="form-group">
              <label class="form-label">制表人</label>
              <input class="form-input" v-model="editorData.creator">
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">送货人签字</label>
              <input class="form-input" v-model="editorData.deliverySigner">
            </div>
            <div class="form-group">
              <label class="form-label">收货单位签章</label>
              <input class="form-input" v-model="editorData.receiverSeal">
            </div>
            <div class="form-group">
              <label class="form-label">签章日期</label>
              <input class="form-input" type="date" v-model="editorData.signDate">
            </div>
          </div>

          <div class="form-section-title"><Icon name="checkCircle" :size="14" /> 备注</div>
          <div class="form-group">
            <textarea class="form-textarea" rows="2" v-model="editorData.remarks" placeholder="其他补充说明..."></textarea>
          </div>
        </div>
        <div v-if="editorErrors.length > 0" class="form-errors">
          <div v-for="(err, idx) in editorErrors" :key="idx" class="form-error"><Icon name="warning" :size="14" /> {{ err }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeEditor">取消</button>
          <button class="btn btn-primary" @click="saveDelivery">{{ editingId ? '更新' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteConfirmVisible" class="modal-overlay" style="z-index: var(--z-toast)" @click.self="cancelDelete">
      <div class="modal-dialog" style="max-width:400px">
        <div class="modal-header"><span class="modal-title">确认删除</span></div>
        <div class="modal-body" style="text-align:center">
          <div class="confirm-icon-circle danger"><Icon name="delete" :size="24" /></div>
          <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">确认删除该送货单？此操作不可恢复。</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="cancelDelete">取消</button>
          <button class="btn btn-primary" style="background:var(--color-danger)" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-panel" style="max-width:900px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <h3>送货单详情</h3>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-primary btn-sm" @click="handlePrint(detailData.id)"><Icon name="print" :size="14" /> 打印</button>
            <button class="btn btn-ghost btn-sm" @click="closeDetail"><Icon name="close" :size="14" /></button>
          </div>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
            <div class="panel-card">
              <div class="panel-card-header"><Icon name="list" :size="14" /> 基本信息</div>
              <div class="panel-card-body" style="font-size:var(--font-size-sm)">
                <div><strong>单据编号：</strong>{{ detailData.deliveryNo }}</div>
                <div><strong>发货日期：</strong>{{ detailData.date || '-' }}</div>
                <div><strong>关联采购单号：</strong>{{ detailData.orderId || '-' }}</div>
                <div><strong>紧急程度：</strong>{{ deliveryStore.urgencyLabels[detailData.urgency] || '-' }}</div>
                <div><strong>订单状态：</strong>
                  <span class="status-badge" :class="deliveryStore.statusBadgeMap[detailData.status] || 'neutral'">
                    {{ deliveryStore.statusLabels[detailData.status] || detailData.status }}
                  </span>
                </div>
              </div>
            </div>
            <div class="panel-card">
              <div class="panel-card-header"><Icon name="users" :size="14" /> 购货单位</div>
              <div class="panel-card-body" style="font-size:var(--font-size-sm)">
                <div><strong>单位名称：</strong>{{ detailData.customerName || '-' }}</div>
                <div><strong>地址：</strong>{{ detailData.address || '-' }}</div>
                <div><strong>联系人：</strong>{{ detailData.contact || '-' }}</div>
                <div><strong>联系电话：</strong>{{ detailData.phone || '-' }}</div>
              </div>
            </div>
          </div>

          <div class="panel-card" style="margin-bottom:var(--space-4)">
            <div class="panel-card-header"><Icon name="download" :size="14" /> 送货计划</div>
            <div class="panel-card-body" style="font-size:var(--font-size-sm)">
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)">
                <div><strong>预计送货日期：</strong>{{ detailData.expectedDate || '-' }}</div>
                <div><strong>预计送达日期：</strong>{{ detailData.expectedArrivalDate || '-' }}</div>
                <div><strong>运输方式：</strong>{{ deliveryStore.transportLabels[detailData.transportMethod] || '-' }}</div>
                <div><strong>承运单位：</strong>{{ detailData.carrier || '-' }}</div>
                <div><strong>送货人员：</strong>{{ detailData.driver || '-' }}</div>
                <div><strong>送货电话：</strong>{{ detailData.driverPhone || '-' }}</div>
                <div><strong>车辆牌号：</strong>{{ detailData.plateNo || '-' }}</div>
                <div><strong>司机电话：</strong>{{ detailData.driverMobile || '-' }}</div>
                <div><strong>物流单号：</strong>{{ detailData.trackingNo || '-' }}</div>
              </div>
            </div>
          </div>

          <div v-if="detailData.items && detailData.items.length > 0" class="panel-card" style="margin-bottom:var(--space-4)">
            <div class="panel-card-header"><Icon name="package" :size="14" /> 产品明细</div>
            <div class="panel-card-body no-padding">
              <div class="table-container">
                <table class="data-table" style="font-size:var(--font-size-xs)">
                  <thead>
                    <tr><th>序号</th><th>产品名称</th><th>料号</th><th>存货编号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>税率</th><th>税额</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(it, i) in detailData.items" :key="i">
                      <td>{{ it.seq || i + 1 }}</td>
                      <td>{{ it.productName }}</td>
                      <td>{{ it.partNo || '-' }}</td>
                      <td>{{ it.inventoryCode || '-' }}</td>
                      <td>{{ it.spec || '-' }}</td>
                      <td>{{ it.unit || '-' }}</td>
                      <td class="cell-mono">{{ it.quantity || 0 }}</td>
                      <td class="cell-mono">{{ formatMoney(it.unitPrice || 0) }}</td>
                      <td class="cell-mono">{{ formatMoney(it.amount || 0) }}</td>
                      <td>{{ it.taxRate || 13 }}%</td>
                      <td class="cell-mono">{{ formatMoney(it.taxAmount || 0) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="padding:var(--space-3);text-align:right;font-size:var(--font-size-sm)">
                <strong>金额合计：</strong>¥{{ formatMoney(detailData.totalAmount || 0) }} ·
                <strong>税额合计：</strong>¥{{ formatMoney(detailData.totalTax || 0) }} ·
                <strong style="color:var(--color-danger)">价税合计：</strong>¥{{ formatMoney(detailData.grandTotal || 0) }}
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
            <div class="panel-card">
              <div class="panel-card-header"><Icon name="check" :size="14" /> 收货确认</div>
              <div class="panel-card-body" style="font-size:var(--font-size-sm)">
                <div><strong>实际送达日期：</strong>{{ detailData.actualDate || '-' }}</div>
                <div><strong>验收情况：</strong>{{ deliveryStore.acceptanceLabels[detailData.acceptanceResult] || '未验收' }}</div>
                <div><strong>验收说明：</strong>{{ detailData.acceptNote || '-' }}</div>
                <div><strong>验收人员：</strong>{{ detailData.acceptPerson || '-' }}</div>
                <div><strong>验收日期：</strong>{{ detailData.acceptDate || '-' }}</div>
              </div>
            </div>
            <div class="panel-card">
              <div class="panel-card-header"><Icon v-if="detailData.hasException === '1'" name="warning" :size="14" style="color:var(--color-danger)" /><Icon v-else name="checkCircle" :size="14" style="color:var(--color-success)" /> 异常处理</div>
              <div class="panel-card-body" style="font-size:var(--font-size-sm)">
                <template v-if="detailData.hasException === '1'">
                  <div><strong>异常类型：</strong><span style="color:var(--color-danger)">{{ deliveryStore.exceptionTypeLabels[detailData.exceptionType] || '-' }}</span></div>
                  <div><strong>异常原因：</strong>{{ detailData.exceptionReason || '-' }}</div>
                  <div><strong>处理方案：</strong>{{ detailData.exceptionSolution || '-' }}</div>
                  <div><strong>责任人：</strong>{{ detailData.exceptionResponsible || '-' }}</div>
                </template>
                <div v-else style="color:var(--color-success)">无异常</div>
              </div>
            </div>
          </div>

          <div class="panel-card" style="margin-bottom:var(--space-4)">
            <div class="panel-card-header"><Icon name="list" :size="14" /> 签章确认</div>
            <div class="panel-card-body" style="font-size:var(--font-size-sm)">
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)">
                <div><strong>审核人：</strong>{{ detailData.reviewer || '-' }}</div>
                <div><strong>财务确认人：</strong>{{ detailData.financePerson || '-' }}</div>
                <div><strong>制表人：</strong>{{ detailData.creator || '-' }}</div>
                <div><strong>送货人签字：</strong>{{ detailData.deliverySigner || '-' }}</div>
                <div><strong>收货单位签章：</strong>{{ detailData.receiverSeal || '-' }}</div>
                <div><strong>签章日期：</strong>{{ detailData.signDate || '-' }}</div>
              </div>
            </div>
          </div>

          <div v-if="detailData.remarks" class="panel-card">
            <div class="panel-card-header"><Icon name="checkCircle" :size="14" /> 备注</div>
            <div class="panel-card-body" style="font-size:var(--font-size-sm)">{{ detailData.remarks }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useDeliveryStore } from '@/stores/delivery'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { usePermission } from '@/utils/permissionGuard'
import { formatMoney, escapeHtml } from '@/utils/format'
import DataSelect from '@/components/DataSelect.vue'

const deliveryStore = useDeliveryStore()
const customerStore = useCustomerStore()
const perm = usePermission()

const canCreate = perm.isAllowed('delivery', 'deliveryCreate')
const canEdit = perm.isAllowed('delivery', 'deliveryEdit')
const canDelete = perm.isAllowed('delivery', 'deliveryDelete')
const canExport = perm.isAllowed('delivery', 'deliveryExport')

const columnDefs = [
  { key: 'check', label: '选择', hideable: false },
  { key: 'deliveryNo', label: '送货单号' },
  { key: 'customer', label: '购货单位' },
  { key: 'purchaseNo', label: '关联采购单号' },
  { key: 'shipDate', label: '发货日期' },
  { key: 'expectedDate', label: '预计送达' },
  { key: 'transportMode', label: '运输方式' },
  { key: 'carrier', label: '承运单位' },
  { key: 'amount', label: '金额' },
  { key: 'urgency', label: '紧急程度' },
  { key: 'status', label: '状态' },
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
const showEditor = ref(false)
const showDetail = ref(false)
const showAssessment = ref(false)
const editingId = ref(null)
const detailData = ref({})
const selectedIds = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const pageSize = ref(15)
const sortField = ref('')
const sortDir = ref('asc')

const dragId = ref(null)
const statusConfirmId = ref(null)
const statusConfirmNext = ref('')
const editorErrors = ref([])

const viewOptions = [
  { key: 'table', label: '表格视图', icon: 'chart' },
  { key: 'list', label: '列表视图', icon: 'list' },
  { key: 'card', label: '卡片视图', icon: 'card' },
  { key: 'kanban', label: '看板视图', icon: 'checkCircle' }
]

const filters = reactive({
  search: '',
  status: '',
  urgency: '',
  transport: '',
  customerName: '',
  dateFrom: '',
  dateTo: ''
})

const editorData = reactive({
  deliveryNo: '',
  date: '',
  orderId: '',
  urgency: 'normal',
  status: 'created',
  customerName: '',
  address: '',
  contact: '',
  phone: '',
  expectedDate: '',
  expectedArrivalDate: '',
  transportMethod: 'logistics',
  carrier: '',
  driver: '',
  driverPhone: '',
  plateNo: '',
  driverMobile: '',
  trackingNo: '',
  actualDate: '',
  acceptanceResult: '',
  acceptNote: '',
  acceptPerson: '',
  acceptDate: '',
  hasException: '0',
  exceptionType: '',
  exceptionReason: '',
  exceptionSolution: '',
  exceptionResponsible: '',
  reviewer: '',
  financePerson: '',
  creator: '',
  deliverySigner: '',
  receiverSeal: '',
  signDate: '',
  remarks: ''
})

const editorItems = ref([])

const customerOptions = computed(() => customerStore.customers || [])

const filteredDeliveries = computed(() => {
  let list = [...deliveryStore.deliveries]
  const s = filters.search.toLowerCase()
  if (s) list = list.filter(d => (d.deliveryNo || '').toLowerCase().includes(s) || (d.customerName || '').toLowerCase().includes(s))
  if (filters.status) list = list.filter(d => d.status === filters.status)
  if (filters.urgency) list = list.filter(d => d.urgency === filters.urgency)
  if (filters.transport) list = list.filter(d => d.transportMethod === filters.transport)
  if (filters.customerName) list = list.filter(d => d.customerName === filters.customerName)
  if (filters.dateFrom) list = list.filter(d => d.date >= filters.dateFrom)
  if (filters.dateTo) list = list.filter(d => d.date <= filters.dateTo)
  if (sortField.value) {
    list = [...list].sort((a, b) => {
      let va = a[sortField.value] || ''
      let vb = b[sortField.value] || ''
      if (sortField.value === 'totalAmount') {
        va = parseFloat(va) || 0
        vb = parseFloat(vb) || 0
      }
      if (va < vb) return sortDir.value === 'asc' ? -1 : 1
      if (va > vb) return sortDir.value === 'asc' ? 1 : -1
      return 0
    })
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredDeliveries.value.length / pageSize.value)))
const pagedDeliveries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDeliveries.value.slice(start, start + pageSize.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

/* ====== 概览面板计算 ====== */

/* 送货完成率 */
const completionRate = computed(() => {
  const total = deliveryStore.totalDeliveries
  if (total === 0) return 0
  return Math.round((deliveryStore.receivedCount / total) * 100)
})
const RING_C = 2 * Math.PI * 26
const completionRateColor = computed(() => {
  const r = completionRate.value
  if (r >= 70) return 'var(--color-success)'
  if (r >= 40) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const completionRateDash = computed(() => {
  const p = completionRate.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 运输方式分布 */
const TRANSPORT_COLORS = { self: '#3b82f6', logistics: '#f59e0b', express: '#10b981', dedicated: '#a855f7' }
const transportStats = computed(() => {
  const map = {}
  for (const d of deliveryStore.deliveries) {
    const t = d.transportMethod || 'logistics'
    if (!map[t]) map[t] = 0
    map[t]++
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 1
  return entries.map(([type, count]) => ({
    type,
    label: deliveryStore.transportLabels[type] || type,
    count,
    percent: Math.round((count / max) * 100),
    color: TRANSPORT_COLORS[type] || '#64748b'
  }))
})

/* 近7日送货趋势 */
const recent7Days = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const count = deliveryStore.deliveries.filter(d => d.date === ds).length
    days.push({
      date: ds,
      dayLabel: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      count,
      percent: 0
    })
  }
  const max = Math.max(...days.map(d => d.count), 1)
  days.forEach(d => { d.percent = Math.round((d.count / max) * 100) })
  return days
})

/* 送货预警 */
const deliveryAlerts = computed(() => {
  const now = new Date().toISOString().split('T')[0]
  const alerts = []
  for (const d of deliveryStore.deliveries) {
    if (d.status === 'exception') {
      alerts.push({ ...d, alertType: 'exception', alertLabel: '异常' })
    } else if (d.expectedArrivalDate && d.expectedArrivalDate < now && d.status !== 'received' && d.status !== 'accepted') {
      alerts.push({ ...d, alertType: 'overdue', alertLabel: '逾期' })
    }
  }
  return alerts.slice(0, 5)
})

const assessment = computed(() => deliveryStore.runAssessment())
const gradeColor = computed(() => {
  const s = assessment.value.score
  if (s >= 90) return 'var(--color-success)'
  if (s >= 75) return 'var(--color-info)'
  if (s >= 60) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const kanbanColumns = [
  { key: 'created', label: '已创建', color: 'var(--color-text-secondary)' },
  { key: 'pending', label: '待发货', color: 'var(--color-warning)' },
  { key: 'shipped', label: '已发货', color: 'var(--color-info)' },
  { key: 'transit', label: '运输中', color: 'var(--color-accent)' },
  { key: 'received', label: '已签收', color: 'var(--color-success)' },
  { key: 'partial', label: '部分签收', color: 'var(--color-warning)' },
  { key: 'accepted', label: '已验收', color: '#1b5e20' },
  { key: 'exception', label: '异常', color: 'var(--color-danger)' },
  { key: 'returned', label: '退回', color: '#795548' }
]

const calcTotalQuantity = computed(() => editorItems.value.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0))
const calcTotalAmount = computed(() => editorItems.value.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0))
const calcTotalTax = computed(() => editorItems.value.reduce((s, it) => s + (parseFloat(it.taxAmount) || 0), 0))
const calcGrandTotal = computed(() => calcTotalAmount.value + calcTotalTax.value)

function kanbanItems(status) {
  return filteredDeliveries.value.filter(d => d.status === status)
}

function isOverdue(d) {
  if (!d.expectedArrivalDate) return false
  const now = new Date().toISOString().split('T')[0]
  return d.expectedArrivalDate < now && d.status !== 'received' && d.status !== 'accepted'
}

function resetFilters() {
  filters.search = ''
  filters.status = ''
  filters.urgency = ''
  filters.transport = ''
  filters.customerName = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  currentPage.value = 1
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = pagedDeliveries.value.map(d => d.id)
  } else {
    selectedIds.value = []
  }
}

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function batchDelete() {
  if (selectedIds.value.length === 0) return
  if (!confirm('确认批量删除选中的 ' + selectedIds.value.length + ' 条送货记录？')) return
  for (const id of selectedIds.value) {
    deliveryStore.deleteDelivery(id)
  }
  selectedIds.value = []
  selectAll.value = false
}

function openEditor(data) {
  editorErrors.value = []
  editingId.value = data ? data.id : null
  if (data) {
    Object.keys(editorData).forEach(k => { editorData[k] = data[k] || (k === 'hasException' ? '0' : '') })
    editorItems.value = Array.isArray(data.items) ? data.items.map(it => ({ ...it })) : []
  } else {
    editorData.deliveryNo = deliveryStore.generateDeliveryNo()
    editorData.date = new Date().toISOString().split('T')[0]
    editorData.orderId = ''
    editorData.urgency = 'normal'
    editorData.status = 'created'
    editorData.customerName = ''
    editorData.address = ''
    editorData.contact = ''
    editorData.phone = ''
    editorData.expectedDate = ''
    editorData.expectedArrivalDate = ''
    editorData.transportMethod = 'logistics'
    editorData.carrier = ''
    editorData.driver = ''
    editorData.driverPhone = ''
    editorData.plateNo = ''
    editorData.driverMobile = ''
    editorData.trackingNo = ''
    editorData.actualDate = ''
    editorData.acceptanceResult = ''
    editorData.acceptNote = ''
    editorData.acceptPerson = ''
    editorData.acceptDate = ''
    editorData.hasException = '0'
    editorData.exceptionType = ''
    editorData.exceptionReason = ''
    editorData.exceptionSolution = ''
    editorData.exceptionResponsible = ''
    editorData.reviewer = ''
    editorData.financePerson = ''
    editorData.creator = ''
    editorData.deliverySigner = ''
    editorData.receiverSeal = ''
    editorData.signDate = ''
    editorData.remarks = ''
    editorItems.value = [{ productName: '', partNo: '', inventoryCode: '', spec: '', unit: 'kg', quantity: 0, unitPrice: 0, amount: 0, taxRate: 13, taxAmount: 0 }]
  }
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingId.value = null
}

function onCustomerChange({ value, data }) {
  if (data) {
    editorData.customerName = data.fullName || data.name
    editorData.address = data.address || ''
    editorData.contact = data.contact || data.contactPerson || ''
    editorData.phone = data.phone || data.contactPhone || ''
  }
}

function addItemRow() {
  editorItems.value.push({ productName: '', partNo: '', inventoryCode: '', spec: '', unit: 'kg', quantity: 0, unitPrice: 0, amount: 0, taxRate: 13, taxAmount: 0 })
}

function removeItemRow(idx) {
  editorItems.value.splice(idx, 1)
}

function calcItemAmount(idx) {
  const it = editorItems.value[idx]
  if (!it) return
  it.amount = Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) * 100) / 100
  it.taxAmount = Math.round(it.amount * (parseFloat(it.taxRate) || 13)) / 100
}

function saveDelivery() {
  editorErrors.value = []
  if (!editorData.customerName) editorErrors.value.push('购货单位名称为必填项')
  if (!editorData.date) editorErrors.value.push('发货日期为必填项')
  const validItems = editorItems.value.filter(it => it.productName && it.quantity > 0)
  if (validItems.length === 0) editorErrors.value.push('至少需要一条有效的产品明细（名称非空且数量大于0）')
  if (editorData.date && editorData.expectedArrivalDate && editorData.expectedArrivalDate < editorData.date) {
    editorErrors.value.push('预计送达日期不能早于发货日期')
  }
  if (editorErrors.value.length > 0) return

  const items = validItems.map((it, i) => ({
    seq: i + 1,
    productName: it.productName,
    partNo: it.partNo || '',
    inventoryCode: it.inventoryCode || '',
    spec: it.spec || '',
    unit: it.unit || 'kg',
    quantity: parseFloat(it.quantity) || 0,
    unitPrice: parseFloat(it.unitPrice) || 0,
    amount: Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) * 100) / 100,
    taxRate: parseFloat(it.taxRate) || 13,
    taxAmount: Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) * 100 * (parseFloat(it.taxRate) || 13)) / 10000
  }))

  const totalQty = items.reduce((s, it) => s + it.quantity, 0)
  const totalAmt = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100
  const totalTax = Math.round(items.reduce((s, it) => s + it.taxAmount, 0) * 100) / 100

  const data = {
    ...editorData,
    items,
    totalQuantity: totalQty,
    totalAmount: totalAmt,
    totalTax: totalTax,
    grandTotal: Math.round((totalAmt + totalTax) * 100) / 100
  }

  if (editingId.value) {
    deliveryStore.updateDelivery(editingId.value, data)
  } else {
    deliveryStore.addDelivery(data)
  }
  closeEditor()
}

function viewDetail(id) {
  const d = deliveryStore.getById(id)
  if (!d) return
  detailData.value = { ...d }
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

function handleChangeStatus(id) {
  const d = deliveryStore.getById(id)
  if (!d) return
  const flow = deliveryStore.STATUS_FLOW[d.status]
  if (!flow || flow.next.length === 0) {
    editorErrors.value = ['当前状态「' + (deliveryStore.statusLabels[d.status] || d.status) + '」不允许流转']
    return
  }
  statusConfirmId.value = id
  statusConfirmNext.value = flow.next[0]
}
function confirmStatusChange() {
  if (statusConfirmId.value) {
    deliveryStore.changeStatus(statusConfirmId.value, statusConfirmNext.value)
  }
  statusConfirmId.value = null
  statusConfirmNext.value = ''
}
function cancelStatusChange() {
  statusConfirmId.value = null
  statusConfirmNext.value = ''
}

const deleteConfirmId = ref(null)
const deleteConfirmVisible = ref(false)

function handleDelete(id) {
  deleteConfirmId.value = id
  deleteConfirmVisible.value = true
}
function confirmDelete() {
  if (deleteConfirmId.value) {
    deliveryStore.deleteDelivery(deleteConfirmId.value)
  }
  deleteConfirmId.value = null
  deleteConfirmVisible.value = false
}
function cancelDelete() {
  deleteConfirmId.value = null
  deleteConfirmVisible.value = false
}

function handlePrint(id) {
  const d = deliveryStore.getById(id)
  if (!d) return
  const items = Array.isArray(d.items) ? d.items : []
  const itemsHtml = items.map((it, i) =>
    `<tr><td>${it.seq || i + 1}</td><td>${escapeHtml(it.productName || '')}</td><td>${escapeHtml(it.partNo || '')}</td><td>${escapeHtml(it.spec || '')}</td><td>${escapeHtml(it.unit || '')}</td><td style="text-align:right;overflow-wrap:break-word;word-wrap:break-word">${it.quantity || 0}</td><td style="text-align:right;overflow-wrap:break-word;word-wrap:break-word">${formatMoney(it.unitPrice || 0)}</td><td style="text-align:right;overflow-wrap:break-word;word-wrap:break-word">${formatMoney(it.amount || 0)}</td></tr>`
  ).join('')
/* eslint-disable no-useless-escape */
  const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>送货单 - ${escapeHtml(d.deliveryNo || '')}</title>
<style>body{font-family:sans-serif;padding:var(--space-5);font-size:12px}table{width:100%;border-collapse:collapse;margin:var(--space-2) 0}th{border:1px solid #ccc;padding:var(--space-2) var(--space-2);text-align:left; overflow-wrap: break-word; word-wrap: break-word}td{border:1px solid #ccc;padding:var(--space-2) var(--space-2);text-align:left; overflow-wrap: break-word; word-wrap: break-word}th{background:#f5f5f5;font-weight:600}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);border-bottom:2px solid #333;padding-bottom:var(--space-2)}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin:var(--space-2) 0}.section-title{font-weight:700;margin:var(--space-4) 0 var(--space-2);padding-bottom:var(--space-1);border-bottom:1px solid #ccc}</style></head>
<body><div class="header"><h2>送货单</h2><div>单据编号：${escapeHtml(d.deliveryNo || '')}</div></div>
<div class="section-title">基本信息</div>
<div class="info-grid"><div>发货日期：${escapeHtml(d.date || '-')}</div><div>关联采购单号：${escapeHtml(d.orderId || '-')}</div><div>紧急程度：${deliveryStore.urgencyLabels[d.urgency] || '-'}</div><div>运输方式：${deliveryStore.transportLabels[d.transportMethod] || '-'}</div></div>
<div class="section-title">购货单位</div>
<div class="info-grid"><div>单位名称：${escapeHtml(d.customerName || '-')}</div><div>地址：${escapeHtml(d.address || '-')}</div><div>联系人：${escapeHtml(d.contact || '-')}</div><div>联系电话：${escapeHtml(d.phone || '-')}</div></div>
<div class="section-title">送货计划</div>
<div class="info-grid"><div>预计送货日期：${escapeHtml(d.expectedDate || '-')}</div><div>预计送达日期：${escapeHtml(d.expectedArrivalDate || '-')}</div><div>运输方式：${deliveryStore.transportLabels[d.transportMethod] || '-'}</div><div>承运单位：${escapeHtml(d.carrier || '-')}</div><div>送货人员：${escapeHtml(d.driver || '-')}</div><div>物流单号：${escapeHtml(d.trackingNo || '-')}</div></div>
<div class="section-title">产品明细</div>
<table><thead><tr><th>序号</th><th>产品名称</th><th>料号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>${itemsHtml}</tbody></table>
<div style="text-align:right;font-weight:700">金额合计：¥${formatMoney(d.totalAmount || 0)} · 税额合计：¥${formatMoney(d.totalTax || 0)} · 价税合计：¥${formatMoney(d.grandTotal || 0)}</div>
${d.actualDate ? '<div class="section-title">收货确认</div><div class="info-grid"><div>实际送达日期：' + escapeHtml(d.actualDate) + '</div><div>验收情况：' + (deliveryStore.acceptanceLabels[d.acceptanceResult] || '未验收') + '</div><div>验收人员：' + escapeHtml(d.acceptPerson || '-') + '</div></div>' : ''}
${d.hasException === '1' ? '<div class="section-title">异常处理</div><div class="info-grid"><div>异常类型：' + (deliveryStore.exceptionTypeLabels[d.exceptionType] || '-') + '</div><div>异常原因：' + escapeHtml(d.exceptionReason || '-') + '</div><div>处理方案：' + escapeHtml(d.exceptionSolution || '-') + '</div><div>责任人：' + escapeHtml(d.exceptionResponsible || '-') + '</div></div>' : ''}
<div class="section-title">签章确认</div>
<div class="info-grid"><div>审核人：${escapeHtml(d.reviewer || '-')}</div><div>制表人：${escapeHtml(d.creator || '-')}</div><div>送货人签字：${escapeHtml(d.deliverySigner || '-')}</div><div>签章日期：${escapeHtml(d.signDate || '-')}</div></div>
<script>window.onload=function(){window.print()}<\/script></body></html>` /* eslint-enable no-useless-escape */
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(printHtml)
    win.document.close()
  }
}

function exportCSV() {
  try {
  const list = filteredDeliveries.value
  if (list.length === 0) { alert('无数据可导出'); return }
  const urgencyMap = deliveryStore.urgencyLabels
  const statusMap = deliveryStore.statusLabels
  const transportMap = deliveryStore.transportLabels
  const exTypeMap = deliveryStore.exceptionTypeLabels
  const acceptMap = deliveryStore.acceptanceLabels
  let csv = ''
  csv += '送货单号,发货日期,购货单位,地址,联系人,联系电话,关联采购单号,紧急程度,订单状态,'
  csv += '预计送货日期,预计送达日期,运输方式,承运单位,送货人员,送货电话,车辆牌号,司机电话,物流单号,'
  csv += '产品名称,料号,存货编号,规格,单位,送货数量,单价,金额,税率%,税额,'
  csv += '实际送达日期,验收情况,验收说明,验收人员,验收日期,'
  csv += '是否有异常,异常类型,异常原因,处理方案,责任人,'
  csv += '审核人,财务确认人,制表人,送货人签字,收货单位签章,签章日期,备注,'
  csv += '总金额,总税额,价税合计\n'
  for (const d of list) {
    const items = Array.isArray(d.items) && d.items.length > 0 ? d.items : [{}]
    for (let j = 0; j < items.length; j++) {
      const it = items[j] || {}
      const row = [
        d.deliveryNo || '', d.date || '', d.customerName || '', d.address || '', d.contact || '', d.phone || '',
        d.orderId || '', urgencyMap[d.urgency] || d.urgency || '', statusMap[d.status] || d.status || '',
        d.expectedDate || '', d.expectedArrivalDate || '', transportMap[d.transportMethod] || d.transportMethod || '', d.carrier || '',
        d.driver || '', d.driverPhone || '', d.plateNo || '', d.driverMobile || '', d.trackingNo || '',
        it.productName || '', it.partNo || '', it.inventoryCode || '', it.spec || '', it.unit || '',
        it.quantity || 0, it.unitPrice || 0, it.amount || 0, it.taxRate || 13, it.taxAmount || 0,
        d.actualDate || '', acceptMap[d.acceptanceResult] || d.acceptanceResult || '', d.acceptNote || '',
        d.acceptPerson || '', d.acceptDate || '',
        d.hasException === '1' ? '是' : '否', exTypeMap[d.exceptionType] || d.exceptionType || '',
        d.exceptionReason || '', d.exceptionSolution || '', d.exceptionResponsible || '',
        d.reviewer || '', d.financePerson || '', d.creator || '',
        d.deliverySigner || '', d.receiverSeal || '', d.signDate || '', d.remarks || '',
        j === 0 ? (d.totalAmount || 0) : '', j === 0 ? (d.totalTax || 0) : '', j === 0 ? (d.grandTotal || 0) : ''
      ]
      csv += row.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',') + '\n'
    }
  }
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '送货单_' + new Date().toISOString().split('T')[0] + '.csv'
  a.click()
  URL.revokeObjectURL(url)
  } catch (e) { console.error('导出失败:', e); alert('导出失败: ' + e.message) }
}

function onDragStart(e, id) {
  dragId.value = id
  e.dataTransfer.effectAllowed = 'move'
  e.target.classList.add('dragging')
}

function onDragEnd(e) {
  e.target.classList.remove('dragging')
  dragId.value = null
}

function onDropCard(e, newStatus) {
  e.currentTarget.classList.remove('drop-target')
  if (!dragId.value) return
  const d = deliveryStore.getById(dragId.value)
  if (!d) return
  if (deliveryStore.canTransition(d.status, newStatus)) {
    deliveryStore.changeStatus(dragId.value, newStatus)
  } else {
    alert('不允许从「' + (deliveryStore.statusLabels[d.status] || d.status) + '」流转到「' + (deliveryStore.statusLabels[newStatus] || newStatus) + '」')
  }
  dragId.value = null
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
.sort-icon {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-left: var(--space-1);
}
.kanban-board {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-3);
}
.kanban-column {
  flex: 0 0 220px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  min-height: 400px;
}
.kanban-column.drop-target {
  background: var(--color-accent-subtle, rgba(59,130,246,0.1));
}
.kanban-column-header {
  padding: var(--space-3) var(--space-4);
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid var(--color-border);
}
.kanban-count {
  background: var(--color-surface);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.kanban-column-body {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;
}
.kanban-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  cursor: grab;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
}
.kanban-card:hover {
  box-shadow: var(--shadow-md);
}
.kanban-card.dragging {
  opacity: 0.4;
}
.kanban-card-title {
  font-weight: 600;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-1);
}
.kanban-card-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.kanban-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}
.card-item {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: box-shadow var(--transition-fast);
}
.card-item:hover {
  box-shadow: var(--shadow-md);
}
.card-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.card-item-body {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}
.list-item:last-child {
  border-bottom: none;
}
.list-item-main {
  flex: 1;
}
.list-item-title {
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-1);
}
.list-item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.list-item-side {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.stats-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stats-grid-6 {
  grid-template-columns: repeat(6, 1fr);
}
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
@keyframes statCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
@keyframes alertDotPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(245,158,11,0.3); }
  50% { box-shadow: 0 0 10px rgba(245,158,11,0.7); }
}
.stat-card-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.form-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-accent);
}
.form-section-title:not(:first-child) {
  margin-top: var(--space-4);
}

/* ====== 概览面板 ====== */
.delivery-overview-row {
  display: grid;
  grid-template-columns: 200px 1fr 220px;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.overview-card {
  background: var(--color-bg-primary, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.overview-card:nth-child(1) { animation-delay: 0ms; }
.overview-card:nth-child(2) { animation-delay: 80ms; }
.overview-card:nth-child(3) { animation-delay: 160ms; }
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
.overview-ring-svg { flex-shrink: 0; }
.overview-ring-progress { transition: stroke-dasharray 0.6s ease; }
.overview-ring-text { display: flex; flex-direction: column; }
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

/* 运输方式分布条形图 */
.transport-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.transport-bar-item {
  display: grid;
  grid-template-columns: 60px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.transport-bar-label {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.transport-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.transport-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.transport-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
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

/* ====== 送货预警 ====== */
.delivery-alert-panel {
  margin-bottom: var(--space-3);
  border-left: 3px solid var(--color-danger);
}
.alert-dot-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: alertDotPulse 1.5s ease-in-out infinite;
  margin-right: var(--space-1);
}
.delivery-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.delivery-alert-item:last-child { border-bottom: none; }
@keyframes alertSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
.delivery-alert-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.delivery-alert-badge.alert-exception {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.delivery-alert-badge.alert-overdue {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.delivery-alert-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.delivery-alert-customer {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.delivery-alert-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-primary);
  margin-left: auto;
}
.delivery-alert-date {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

/* ====== 表格行入场动画 ====== */
.delivery-table-row {
  animation: rowSlideIn 0.3s ease-out both;
}
@keyframes rowSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ====== 列表项入场动画 ====== */
.list-item {
  animation: listSlideIn 0.3s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.list-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
@keyframes listSlideIn {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ====== 卡片项入场动画 ====== */
.card-item {
  animation: cardFadeIn 0.4s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
}
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ====== 看板卡片入场动画 ====== */
.kanban-card {
  animation: cardFadeIn 0.4s ease-out both;
}

/* ====== 空状态圆形图标 ====== */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-bg-secondary, var(--color-surface-hover));
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}
.confirm-icon-circle.danger {
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  color: var(--color-danger);
}

@media (max-width: 1024px) {
  .stats-grid-6 {
    grid-template-columns: repeat(4, 1fr);
  }
  .delivery-overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .stats-grid-6 {
    grid-template-columns: repeat(3, 1fr);
  }
  .kanban-board {
    flex-direction: column;
  }
  .kanban-column {
    flex: none;
    min-height: 200px;
  }
}
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: var(--z-popover, 9999); min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  margin-top: var(--space-3);
}
.page-info {
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
}
.form-errors {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.form-error {
  font-size: var(--font-size-base);
  color: var(--color-danger);
  padding: var(--space-1) 0;
}
.form-textarea {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  resize: vertical;
  width: 100%;
}
.form-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}
.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-tertiary);
}
</style>
