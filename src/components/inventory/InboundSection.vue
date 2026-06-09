<template>
  <div class="inbound-page">
    <div class="inbound-header">
      <div class="inbound-header-info">
        <h2><Icon name="upload" :size="14" /> 入库管理</h2>
        <p>采购入库、退货入库、调拨入库登记与跟踪 · 双击已入库记录可快速创建出库单</p>
      </div>
        <div class="inbound-header-actions">
          <button class="btn btn-ghost btn-sm" @click="openRecycleBinModal"><Icon name="delete" :size="14" /> 回收站</button>
          <div class="view-toggle-dropdown">
            <button class="btn btn-ghost btn-sm" @click="showViewMenu = !showViewMenu"><Icon name="chart" :size="14" /> 视图切换 <Icon name="chevronDown" :size="14" /></button>
            <div v-if="showViewMenu" class="view-toggle-menu">
              <button :class="{ active: inboundView === 'table' }" @click="inboundView = 'table'; showViewMenu = false"><Icon name="chart" :size="14" /> 表格视图</button>
              <button :class="{ active: inboundView === 'list' }" @click="inboundView = 'list'; showViewMenu = false"><Icon name="list" :size="14" /> 列表视图</button>
              <button :class="{ active: inboundView === 'card' }" @click="inboundView = 'card'; showViewMenu = false"><Icon name="card" :size="14" /> 卡片视图</button>
              <button :class="{ active: inboundView === 'calendar' }" @click="inboundView = 'calendar'; showViewMenu = false"><Icon name="calendar" :size="14" /> 日历视图</button>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="handleDownloadImportTemplate"><Icon name="upload" :size="14" /> 导入模板</button>
          <button v-if="canInbound" class="btn btn-primary btn-sm" @click="openInboundWizard">入库登记</button>
        </div>
      </div>

      <div v-if="copySuccessMsg" class="copy-success-toast">{{ copySuccessMsg }}</div>

      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="upload" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.inboundOrders.length }}</div>
          <div class="inv-stat-label">入库单总数</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="clock" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.pendingInboundCount }}</div>
          <div class="inv-stat-label">待处理</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:#e65100;color:#fff"><Icon name="dollar" :size="14" /></div>
          <div class="inv-stat-value">{{ (inboundMonthAmount / 10000).toFixed(1) }}万</div>
          <div class="inv-stat-label">本月入库金额</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="check" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.inboundOrders.filter(o => o.status === 'confirmed').length }}</div>
          <div class="inv-stat-label">已入库</div>
        </div>
      </div>

      <!-- 概览面板：入库率 + 类型分布 + 近7日趋势 -->
      <div class="inbound-overview-row">
        <div class="overview-card overview-ring-card">
          <div class="overview-card-title">入库完成率</div>
          <div class="overview-ring-body">
            <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
              <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
              <circle cx="36" cy="36" r="26" fill="none" :stroke="confirmRateColor" stroke-width="5" stroke-linecap="round"
                :stroke-dasharray="confirmRateDash" stroke-dashoffset="0" transform="rotate(-90 36 36)" class="overview-ring-progress" />
            </svg>
            <div class="overview-ring-text">
              <span class="overview-ring-percent" :style="{ color: confirmRateColor }">{{ confirmRate }}%</span>
              <span class="overview-ring-sub">已入库/总数</span>
            </div>
          </div>
        </div>
        <div class="overview-card overview-type-card">
          <div class="overview-card-title">入库类型分布</div>
          <div class="type-bars">
            <div v-for="t in inboundTypeStats" :key="t.type" class="type-bar-item">
              <span class="type-bar-label">{{ t.label }}</span>
              <div class="type-bar-track">
                <div class="type-bar-fill" :style="{ width: t.percent + '%', background: t.color }"></div>
              </div>
              <span class="type-bar-count">{{ t.count }}</span>
            </div>
          </div>
        </div>
        <div class="overview-card overview-trend-card">
          <div class="overview-card-title">近7日入库趋势</div>
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

      <!-- 待处理预警 -->
      <div v-if="pendingAlerts.length > 0" class="panel-card inbound-alert-panel">
        <div class="panel-card-header">
          <span class="panel-card-title" style="color:var(--color-warning)"><span class="alert-dot-pulse"></span> 待处理预警</span>
        </div>
        <div class="panel-card-body">
          <div v-for="(a, idx) in pendingAlerts" :key="a.id" class="inbound-alert-item" :style="{ animationDelay: idx * 60 + 'ms' }">
            <span class="inbound-alert-badge" :class="'status-' + a.status">{{ inventoryStore.INBOUND_STATUS_LABELS[a.status] }}</span>
            <span class="inbound-alert-no">{{ a.orderNo }}</span>
            <span class="inbound-alert-supplier">{{ a.counterpartyName || '-' }}</span>
            <span class="inbound-alert-amount">¥{{ formatNumber(calcInboundAmount(a)) }}</span>
            <button class="btn btn-ghost btn-sm" @click="viewInboundDetail(a)">查看</button>
          </div>
        </div>
      </div>

      <div v-if="inboundSelectedIds.length > 0" class="inbound-bulk-bar">
        <span style="font-size:var(--font-size-sm);font-weight:600">已选择 {{ inboundSelectedIds.length }} 条</span>
        <button v-if="inboundSelectedPendingCount > 0 && canInspectInbound" class="btn btn-secondary btn-sm" @click="handleBatchApproveInbound">批量审批({{ inboundSelectedPendingCount }})</button>
        <button v-if="inboundSelectedInspectingCount > 0 && canConfirmInbound" class="btn btn-primary btn-sm" @click="handleBatchConfirmInbound">批量确认入库({{ inboundSelectedInspectingCount }})</button>
        <button v-if="canExportInbound" class="btn btn-ghost btn-sm" @click="handleExportSelectedInbound">导出选中</button>
      </div>

      <div class="inv-toolbar">
        <div class="inv-search">
          <span class="search-icon"><Icon name="search" :size="14" /></span>
          <input v-model="inboundSearch" type="text" class="search-input" placeholder="搜索入库单号/供应商..." />
        </div>
        <div class="inv-filters">
          <select v-model="inboundTypeFilter" class="form-select filter-select">
            <option value="">全部类型</option>
            <option v-for="t in inventoryStore.INBOUND_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <select v-model="inboundStatusFilter" class="form-select filter-select">
            <option value="">全部状态</option>
            <option v-for="(label, key) in inventoryStore.INBOUND_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
            <option value="reversed">已冲销</option>
          </select>
          <select v-model="inboundSupplierFilter" class="form-select filter-select">
            <option value="">全部供应商</option>
            <option v-for="s in inventoryStore.suppliers" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</option>
          </select>
        </div>
      </div>

      <div class="inbound-tab-bar">
        <button class="btn btn-sm" :class="{ active: inboundTab === 'main' }" @click="inboundTab = 'main'">入库单主表</button>
        <button class="btn btn-sm" :class="{ active: inboundTab === 'detail' }" @click="inboundTab = 'detail'">入库明细表</button>
      </div>

      <div v-if="inboundView === 'table'">
        <div v-if="inboundTab === 'main'">
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">入库单列表</span>
              <span class="result-count">共 {{ filteredInboundOrders.length }} 条</span>
            </div>
            <div class="panel-card-body no-padding">
              <div class="inv-table-wrap">
                <table class="inv-table">
                  <thead>
                    <tr>
                      <th style="width:40px"><input type="checkbox" :checked="inboundSelectAll" @change="toggleInboundSelectAll($event.target.checked)" /></th>
                      <th v-if="inboundColumnVisible.orderNo">入库单号</th>
                      <th v-if="inboundColumnVisible.date">入库日期</th>
                      <th v-if="inboundColumnVisible.type">入库类型</th>
                      <th v-if="inboundColumnVisible.supplierCode">供应商编码</th>
                      <th v-if="inboundColumnVisible.supplierName">供应商名称</th>
                      <th v-if="inboundColumnVisible.totalWeight">总重量(kg)</th>
                      <th v-if="inboundColumnVisible.totalAmount">总金额(元)</th>
                      <th v-if="inboundColumnVisible.status">状态</th>
                      <th style="min-width:200px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="paginatedInbound.length === 0">
                      <td colspan="10" class="empty-cell"><div class="empty-state-icon"><Icon name="upload" :size="24" /></div>暂无入库记录</td>
                    </tr>
                    <tr v-for="order in paginatedInbound" :key="order.id" :class="{ 'row-confirmed': order.status === 'confirmed' }" @dblclick="handleDoubleClickInbound(order)">
                      <td><input type="checkbox" :value="order.id" v-model="inboundSelectedIds" /></td>
                      <td v-if="inboundColumnVisible.orderNo" class="cell-mono"><strong style="color:var(--color-accent)">{{ order.orderNo }}</strong></td>
                      <td v-if="inboundColumnVisible.date">{{ order.date || '-' }}</td>
                      <td v-if="inboundColumnVisible.type">{{ inboundTypeLabel(order.type) }}</td>
                      <td v-if="inboundColumnVisible.supplierCode" class="cell-mono">{{ order.supplierCode || '-' }}</td>
                      <td v-if="inboundColumnVisible.supplierName">{{ order.counterpartyName || '-' }}</td>
                      <td v-if="inboundColumnVisible.totalWeight" class="cell-mono">{{ calcInboundWeight(order).toFixed(2) }}</td>
                      <td v-if="inboundColumnVisible.totalAmount" class="cell-mono">{{ formatNumber(calcInboundAmount(order)) }}</td>
                      <td v-if="inboundColumnVisible.status"><span class="status-badge" :class="'status-' + order.status">{{ inventoryStore.INBOUND_STATUS_LABELS[order.status] || order.status }}</span></td>
                      <td class="cell-actions">
                        <template v-if="order.status === 'draft'">
                          <button class="btn btn-ghost btn-sm" style="color:var(--color-warning)" @click="handleChangeInboundStatus(order.id, 'pending')">提交审核</button>
                          <button class="btn btn-ghost btn-sm" @click="openEditInbound(order)">编辑</button>
                        </template>
                        <template v-else-if="order.status === 'pending'">
                          <button v-if="canInspectInbound" class="btn btn-ghost btn-sm" style="color:var(--color-info)" @click="handleChangeInboundStatus(order.id, 'inspecting')">审批</button>
                        </template>
                        <template v-else-if="order.status === 'inspecting'">
                          <button v-if="canConfirmInbound" class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleConfirmInbound(order.id)">确认入库</button>
                        </template>
                        <button class="btn btn-ghost btn-sm" @click="viewInboundDetail(order)">详情</button>
                        <template v-if="order.status === 'confirmed'">
                          <button class="btn btn-ghost btn-sm" @click="handlePrintInbound(order)">打印</button>
                          <button class="btn btn-ghost btn-sm" @click="handleCopyInbound(order.id)">复制</button>
                          <button class="btn btn-ghost btn-sm" style="color:var(--color-purple)" @click="handleReverseInbound(order.id)">冲销</button>
                        </template>
                        <button v-if="(order.status === 'draft' || order.status === 'pending') && canDeleteInbound" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteInbound(order.id)">删除</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="panel-card-footer" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4)">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">每页</span>
              <select class="form-select" v-model.number="inboundPageSize" style="width:70px;padding:2px 6px;font-size:var(--font-size-xs)" @change="inboundPage = 1">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">条</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-1)">
              <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage = 1">&laquo;</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage--">&lsaquo;</button>
              <button v-for="p in inboundVisiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === inboundPage }" @click="inboundPage = p" style="min-width:28px">{{ p }}</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage++">&rsaquo;</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage = inboundTotalPages">&raquo;</button>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <button v-if="canExportInbound" class="btn btn-ghost btn-sm" @click="handleExport"><Icon name="upload" :size="14" /> 导出Excel</button>
              <button v-if="canDeleteInbound && inboundSelectedIds.length > 0" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleBatchDeleteInbound"><Icon name="delete" :size="14" /> 批量删除({{ inboundSelectedIds.length }})</button>
            </div>
          </div>
        </div>

        <div v-if="inboundTab === 'detail'">
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">入库明细表</span>
              <span class="result-count">共 {{ filteredInboundDetails.length }} 条</span>
            </div>
            <div class="panel-card-body no-padding">
              <div class="inv-table-wrap">
                <table class="inv-table">
                  <thead>
                    <tr>
                      <th>明细ID</th>
                      <th>入库单号</th>
                      <th>物料条码</th>
                      <th>物料编码</th>
                      <th>物料名称</th>
                      <th>牌号</th>
                      <th>颜色</th>
                      <th>数量(kg)</th>
                      <th>单价(元/kg)</th>
                      <th>金额(元)</th>
                      <th>批次号</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="paginatedInboundDetails.length === 0">
                      <td colspan="12" class="empty-cell"><div class="empty-state-icon"><Icon name="upload" :size="24" /></div>暂无入库明细</td>
                    </tr>
                    <tr v-for="d in paginatedInboundDetails" :key="d.id">
                      <td class="cell-mono">{{ d.detailId }}</td>
                      <td class="cell-mono"><strong style="color:var(--color-accent)">{{ d.orderNo }}</strong></td>
                      <td class="cell-mono">{{ d.barcode || '-' }}</td>
                      <td class="cell-mono">{{ d.code || '-' }}</td>
                      <td>{{ d.name || '-' }}</td>
                      <td>{{ d.grade || '-' }}</td>
                      <td>{{ d.color || '-' }}</td>
                      <td class="cell-mono">{{ d.qty.toFixed(2) }}</td>
                      <td class="cell-mono">{{ d.cost.toFixed(2) }}</td>
                      <td class="cell-mono">{{ d.amount.toFixed(2) }}</td>
                      <td class="cell-mono">{{ d.batch || '-' }}</td>
                      <td class="cell-actions">
                        <button class="btn btn-ghost btn-sm" @click="viewInboundDetail(inventoryStore.inboundOrders.find(o => o.id === d.orderId))">详情</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="pagination-bar" v-if="inboundDetailTotalPages > 1">
            <span class="page-info">第 {{ inboundDetailPage }} / {{ inboundDetailTotalPages }} 页，共 {{ filteredInboundDetails.length }} 条</span>
            <div class="page-btns">
              <button class="btn btn-ghost btn-sm" :disabled="inboundDetailPage <= 1" @click="inboundDetailPage = 1">&laquo;</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundDetailPage <= 1" @click="inboundDetailPage--">&lsaquo;</button>
              <button v-for="p in inboundDetailVisiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === inboundDetailPage }" @click="inboundDetailPage = p" style="min-width:28px">{{ p }}</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundDetailPage >= inboundDetailTotalPages" @click="inboundDetailPage++">&rsaquo;</button>
              <button class="btn btn-ghost btn-sm" :disabled="inboundDetailPage >= inboundDetailTotalPages" @click="inboundDetailPage = inboundDetailTotalPages">&raquo;</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="inboundView === 'list'">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">入库单列表视图</span>
            <span class="result-count">共 {{ filteredInboundOrders.length }} 条</span>
          </div>
          <div class="panel-card-body">
            <div v-if="filteredInboundOrders.length === 0" class="empty-cell"><div class="empty-state-icon"><Icon name="upload" :size="24" /></div>暂无入库记录</div>
            <div v-for="(order, idx) in paginatedInbound" :key="order.id" class="inbound-list-item" :style="{ animationDelay: idx * 50 + 'ms' }" @dblclick="handleDoubleClickInbound(order)">
              <div class="inbound-list-item-header">
                <strong style="color:var(--color-accent)">{{ order.orderNo }}</strong>
                <span class="status-badge" :class="'status-' + order.status">{{ inventoryStore.INBOUND_STATUS_LABELS[order.status] || order.status }}</span>
              </div>
              <div class="inbound-list-item-body">
                <span>{{ order.date || '-' }}</span>
                <span>{{ inboundTypeLabel(order.type) }}</span>
                <span>{{ order.counterpartyName || '-' }}</span>
                <span>{{ calcInboundWeight(order).toFixed(2) }} kg</span>
                <span>¥{{ formatNumber(calcInboundAmount(order)) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="pagination-bar" v-if="inboundTotalPages > 1">
          <span class="page-info">第 {{ inboundPage }} / {{ inboundTotalPages }} 页，共 {{ filteredInboundOrders.length }} 条</span>
          <div class="page-btns">
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage = 1">&laquo;</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage--">&lsaquo;</button>
            <button v-for="p in inboundVisiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === inboundPage }" @click="inboundPage = p" style="min-width:28px">{{ p }}</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage++">&rsaquo;</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage = inboundTotalPages">&raquo;</button>
          </div>
        </div>
      </div>

      <div v-else-if="inboundView === 'card'">
        <div class="inbound-card-grid">
          <div v-if="filteredInboundOrders.length === 0" class="empty-cell"><div class="empty-state-icon"><Icon name="upload" :size="24" /></div>暂无入库记录</div>
          <div v-for="(order, idx) in paginatedInbound" :key="order.id" class="inbound-card-item" :style="{ animationDelay: idx * 60 + 'ms' }" @dblclick="handleDoubleClickInbound(order)">
            <div class="inbound-card-item-header">
              <strong style="color:var(--color-accent)">{{ order.orderNo }}</strong>
              <span class="status-badge" :class="'status-' + order.status">{{ inventoryStore.INBOUND_STATUS_LABELS[order.status] || order.status }}</span>
            </div>
            <div class="inbound-card-item-body">
              <div><span class="detail-label">入库日期</span> {{ order.date || '-' }}</div>
              <div><span class="detail-label">入库类型</span> {{ inboundTypeLabel(order.type) }}</div>
              <div><span class="detail-label">供应商</span> {{ order.counterpartyName || '-' }}</div>
              <div><span class="detail-label">总重量</span> {{ calcInboundWeight(order).toFixed(2) }} kg</div>
              <div><span class="detail-label">总金额</span> ¥{{ formatNumber(calcInboundAmount(order)) }}</div>
            </div>
            <div class="inbound-card-item-actions">
              <button class="btn btn-ghost btn-sm" @click="viewInboundDetail(order)">详情</button>
            </div>
          </div>
        </div>
        <div class="pagination-bar" v-if="inboundTotalPages > 1">
          <span class="page-info">第 {{ inboundPage }} / {{ inboundTotalPages }} 页，共 {{ filteredInboundOrders.length }} 条</span>
          <div class="page-btns">
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage = 1">&laquo;</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage--">&lsaquo;</button>
            <button v-for="p in inboundVisiblePages" :key="p" class="btn btn-ghost btn-sm" :class="{ 'btn-primary': p === inboundPage }" @click="inboundPage = p" style="min-width:28px">{{ p }}</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage++">&rsaquo;</button>
            <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage = inboundTotalPages">&raquo;</button>
          </div>
        </div>
      </div>

      <div v-else-if="inboundView === 'calendar'">
        <div class="panel-card">
          <div class="panel-card-header">
            <button class="btn btn-ghost btn-sm" @click="inboundCalPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="panel-card-title">{{ inboundCalYear }}年{{ inboundCalMonth + 1 }}月</span>
            <button class="btn btn-ghost btn-sm" @click="inboundCalNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" @click="inboundCalToday">今天</button>
          </div>
          <div class="panel-card-body no-padding" v-safe-html="inboundCalHtml"></div>
        </div>
      </div>
    </div>

    <!-- 入库向导模态框 -->
    <Teleport to="body">
      <div v-if="showInboundWizard" class="wizard-overlay" @click.self="closeInboundWizard">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3><Icon name="upload" :size="14" /> {{ editingInboundId ? '编辑入库单' : '入库登记' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closeInboundWizard"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <div class="form-section-title"><Icon name="list" :size="14" /> 基本信息</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label">入库单号</label>
                <input v-model="inboundForm.orderNo" type="text" class="form-input" readonly style="background:var(--color-bg-tertiary)" />
              </div>
              <div class="form-group">
                <label class="form-label">入库日期 <span class="required">*</span></label>
                <input v-model="inboundForm.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">入库类型 <span class="required">*</span></label>
                <select v-model="inboundForm.type" class="form-select">
                  <option value="">请选择</option>
                  <option v-for="t in inventoryStore.INBOUND_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">目标仓库</label>
                <DataSelect module="warehouse" v-model="inboundForm.warehouseId"
                  value-field="id" label-field="name" placeholder="选择仓库"
                  @change="onWarehouseChange" />
              </div>
              <div class="form-group">
                <label class="form-label">库位</label>
                <DataSelect module="warehouseLocation" v-model="inboundForm.locationId"
                  value-field="id" label-field="locationCode" placeholder="选择库位"
                  :parent-filters="locationParentFilters" />
              </div>
              <div class="form-group">
                <label class="form-label">供应商 <span class="required">*</span></label>
                <div class="supplier-input-group">
                  <DataSelect module="supplier" variant="active" v-model="inboundForm.counterpartyId"
                    value-field="id" label-field="name" placeholder="选择供应商"
                    @change="onSupplierChange" />
                  <input v-model="inboundForm.supplierCode" type="text" class="form-input" placeholder="供应商编码" @change="onInboundSupplierCodeChange" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">备注</label>
                <textarea v-model="inboundForm.notes" class="form-textarea" rows="1" placeholder="入库备注信息..."></textarea>
              </div>
            </div>

            <div style="margin-top:var(--space-4)">
              <div class="form-section-title"><Icon name="package" :size="14" /> 入库明细</div>
              <div class="inbound-items-table">
                <table class="inv-table inv-table-sm">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>物料条码</th>
                      <th>物料选择</th>
                      <th>物料编码</th>
                      <th>物料名称</th>
                      <th>牌号</th>
                      <th>颜色</th>
                      <th>数量(kg)</th>
                      <th>单价(元/kg)</th>
                      <th>金额(元)</th>
                      <th>批次号</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in inboundFormItems" :key="idx">
                      <td class="cell-mono">{{ idx + 1 }}</td>
                      <td><input v-model="item.barcode" type="text" class="form-input form-input-sm inbound-barcode-input" placeholder="扫码/输入" @change="onInboundItemBarcodeChange(idx)" /></td>
                      <td class="cell-material-select"><DataSelect module="inventory" v-model="item.code" value-field="code" label-field="name" placeholder="选择物料" @change="(e) => onMaterialChange(idx, e)" /></td>
                      <td><input v-model="item.code" type="text" class="form-input form-input-sm" placeholder="编码" readonly style="opacity:0.7;cursor:not-allowed" /></td>
                      <td><input v-model="item.name" type="text" class="form-input form-input-sm" placeholder="名称" /></td>
                      <td><input v-model="item.grade" type="text" class="form-input form-input-sm" placeholder="牌号" /></td>
                      <td><input v-model="item.color" type="text" class="form-input form-input-sm" placeholder="颜色" /></td>
                      <td><input v-model.number="item.qty" type="number" class="form-input form-input-sm" min="0.01" step="0.01" max="999999" style="width:90px" /></td>
                      <td><input v-model.number="item.cost" type="number" class="form-input form-input-sm" min="0" step="0.01" max="999999" style="width:90px" /></td>
                      <td class="cell-mono">{{ ((item.qty || 0) * (item.cost || 0)).toFixed(2) }}</td>
                      <td><input v-model="item.batch" type="text" class="form-input form-input-sm" placeholder="批次号" style="width:90px" /></td>
                      <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="removeInboundItem(idx)"><Icon name="close" :size="14" /></button></td>
                    </tr>
                  </tbody>
                </table>
                <div style="display:flex;gap:var(--space-2);align-items:center;margin-top:var(--space-2);flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" @click="addInboundItem">添加明细行</button>
                  <button class="btn btn-ghost btn-sm" @click="focusBarcodeInput"><Icon name="mobile" :size="14" /> 扫码录入</button>
                  <button class="btn btn-ghost btn-sm" @click="toggleContinuousScan"><Icon name="search" :size="14" /> 连续扫码({{ continuousScanMode ? '开' : '关' }})</button>
                </div>
                <div class="inbound-summary">
                  <span>总重量：<strong>{{ inboundItemsTotalWeight.toFixed(2) }}</strong> kg</span>
                  <span>总金额：<strong>{{ inboundItemsTotalAmount.toFixed(2) }}</strong> 元</span>
                </div>
              </div>
            </div>

            <div v-if="inboundErrors.length > 0" class="form-errors">
              <div v-for="(err, idx) in inboundErrors" :key="idx" class="form-error"><Icon name="warning" :size="14" /> {{ err }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeInboundWizard">取消</button>
            <button class="btn btn-secondary" @click="handleSaveInboundDraft"><Icon name="save" :size="14" /> 保存草稿</button>
            <button class="btn btn-primary" @click="handleSubmitInbound"><Icon name="check" :size="14" /> 提交入库</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 入库单详情模态框 -->
    <Teleport to="body">
      <div v-if="showInboundDetail" class="wizard-overlay" @click.self="showInboundDetail = false">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3 style="color:var(--color-accent)">入库单详情</h3>
            <button class="btn btn-ghost btn-sm" @click="showInboundDetail = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body" v-if="detailOrder">
            <div class="detail-info-grid">
              <div class="detail-field"><span class="detail-label">入库单号</span><span class="detail-value cell-mono">{{ detailOrder.orderNo }}</span></div>
              <div class="detail-field"><span class="detail-label">入库日期</span><span class="detail-value">{{ detailOrder.date }}</span></div>
              <div class="detail-field"><span class="detail-label">入库类型</span><span class="detail-value">{{ inboundTypeLabel(detailOrder.type) }}</span></div>
              <div class="detail-field"><span class="detail-label">供应商</span><span class="detail-value">{{ detailOrder.counterpartyName || '-' }}</span></div>
              <div class="detail-field"><span class="detail-label">供应商编码</span><span class="detail-value cell-mono">{{ detailOrder.supplierCode || '-' }}</span></div>
              <div class="detail-field"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge" :class="'status-' + detailOrder.status">{{ inventoryStore.INBOUND_STATUS_LABELS[detailOrder.status] }}</span></span></div>
              <div class="detail-field"><span class="detail-label">总重量</span><span class="detail-value">{{ calcInboundWeight(detailOrder).toFixed(2) }} kg</span></div>
              <div class="detail-field"><span class="detail-label">总金额</span><span class="detail-value">¥{{ formatNumber(calcInboundAmount(detailOrder)) }}</span></div>
            </div>
            <div style="margin-top:var(--space-4)">
              <h4 style="margin-bottom:var(--space-2);color:var(--color-text-secondary)">入库明细</h4>
              <table class="inv-table inv-table-sm">
                <thead>
                  <tr>
                    <th>物料编码</th>
                    <th>物料名称</th>
                    <th>牌号</th>
                    <th>颜色</th>
                    <th>数量(kg)</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>批次号</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in getParsedItems(detailOrder)" :key="idx">
                    <td class="cell-mono">{{ item.code || '-' }}</td>
                    <td>{{ item.name || '-' }}</td>
                    <td>{{ item.grade || '-' }}</td>
                    <td>{{ item.color || '-' }}</td>
                    <td class="cell-mono">{{ (item.qty || 0).toFixed(2) }}</td>
                    <td>{{ (item.cost || 0).toFixed(2) }}</td>
                    <td class="cell-mono">{{ ((item.qty || 0) * (item.cost || 0)).toFixed(2) }}</td>
                    <td class="cell-mono">{{ item.batch || '-' }}</td>
                  </tr>
                  <tr v-if="getParsedItems(detailOrder).length === 0">
                    <td colspan="8" class="empty-cell">无明细记录</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="detailOrder.notes" style="margin-top:var(--space-4)">
              <span class="detail-label">备注：</span>
              <span>{{ detailOrder.notes }}</span>
            </div>
            <div style="margin-top:var(--space-4)">
              <h4 style="margin-bottom:var(--space-2);color:var(--color-text-secondary)">附件</h4>
              <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
                <button class="btn btn-ghost btn-sm" disabled title="功能开发中"><Icon name="file" :size="14" /> 上传附件</button>
                <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">暂无附件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 回收站模态框 -->
    <Teleport to="body">
      <div v-if="showRecycleBin" class="wizard-overlay" @click.self="showRecycleBin = false">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3><Icon name="delete" :size="14" /> 数据回收站</h3>
            <button class="btn btn-ghost btn-sm" @click="showRecycleBin = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <div v-if="inventoryStore.recycleBin.length === 0" class="empty-cell">回收站为空</div>
            <table v-else class="recycle-bin-table">
              <thead>
                <tr>
                  <th>单号</th>
                  <th>类型</th>
                  <th>删除时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in inventoryStore.recycleBin" :key="item.id">
                  <td class="cell-mono">{{ item.orderNo || '-' }}</td>
                  <td>{{ item._type || '-' }}</td>
                  <td>{{ item._deletedAt || '-' }}</td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleRestoreFromRecycleBin(item.id)">恢复</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handlePermanentDeleteFromRecycleBin(item.id)">永久删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="showRecycleBin = false">关闭</button>
            <button class="btn btn-sm" style="background:var(--color-danger);color:#fff;border-color:var(--color-danger)" @click="handleEmptyRecycleBin"><Icon name="delete" :size="14" /> 清空回收站</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="confirmDialog.show" class="wizard-overlay" @click.self="handleConfirmDialogCancel">
        <div class="wizard-modal" style="max-width:400px">
          <div class="wizard-header"><h3>{{ confirmDialog.title }}</h3></div>
          <div class="wizard-body"><p>{{ confirmDialog.message }}</p></div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="handleConfirmDialogCancel">取消</button>
            <button class="btn btn-primary" @click="handleConfirmDialogOk">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePermission } from '@/utils/permissionGuard'
import DataSelect from '@/components/DataSelect.vue'
import { escapeHtml, formatNumber } from '@/utils/format'

const emit = defineEmits(['edit-item', 'quick-outbound'])

const inventoryStore = useInventoryStore()
const perm = usePermission()

const canInbound = computed(() => perm.isAllowed('inbound', 'inboundCreate'))
const canDeleteInbound = computed(() => perm.isAllowed('inbound', 'inboundDelete'))
const canConfirmInbound = computed(() => perm.isAllowed('inbound', 'inboundConfirm'))
const canInspectInbound = computed(() => perm.isAllowed('inbound', 'inboundInspect'))
const canExportInbound = computed(() => perm.isAllowed('inbound', 'inboundExport'))

/* 入库单列配置 */
const inboundColumnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'orderNo', label: '入库单号' },
  { key: 'date', label: '入库日期' },
  { key: 'type', label: '入库类型' },
  { key: 'supplierCode', label: '供应商编码' },
  { key: 'supplierName', label: '供应商名称' },
  { key: 'totalWeight', label: '总重量(kg)' },
  { key: 'totalAmount', label: '总金额(元)' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作', hideable: false }
]
const inboundColumnVisible = ref(Object.fromEntries(inboundColumnDefs.filter(c => c.hideable !== false).map(c => [c.key, true])))

/* ref 变量 */
const inboundSearch = ref('')
const inboundTypeFilter = ref('')
const inboundStatusFilter = ref('')
const inboundSupplierFilter = ref('')
const inboundPage = ref(1)
const inboundPageSize = ref(15)
const inboundTab = ref('main')
const inboundSelectAll = ref(false)
const inboundSelectedIds = ref([])
const inboundView = ref('table')
const showViewMenu = ref(false)

function handleClickOutside(e) {
  if (showViewMenu.value && !e.target.closest('.view-toggle-dropdown')) {
    showViewMenu.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const inboundDetailPage = ref(1)
const inboundDetailPageSize = 15
const showInboundWizard = ref(false)
const editingInboundId = ref(null)
const inboundFormItems = ref([])
const inboundErrors = ref([])
const continuousScanMode = ref(false)
const showInboundDetail = ref(false)
const detailOrder = ref(null)
const showRecycleBin = ref(false)
const inboundCalYear = ref(new Date().getFullYear())
const inboundCalMonth = ref(new Date().getMonth())
const confirmDialog = ref({ show: false, title: '', message: '', onConfirm: null })
const copySuccessMsg = ref('')

/* reactive 变量 */
const inboundForm = reactive({
  date: new Date().toISOString().split('T')[0],
  type: '', counterpartyId: '', counterpartyName: '', supplierCode: '',
  warehouseId: 'main', locationId: '', notes: '', orderNo: ''
})

/* computed */
const filteredInboundOrders = computed(() => {
  let list = inventoryStore.inboundOrders
  const search = inboundSearch.value.toLowerCase()
  if (search) {
    list = list.filter(o => (o.orderNo || '').toLowerCase().includes(search) || (o.counterpartyName || '').toLowerCase().includes(search))
  }
  if (inboundTypeFilter.value) {
    list = list.filter(o => o.type === inboundTypeFilter.value)
  }
  if (inboundStatusFilter.value) {
    list = list.filter(o => o.status === inboundStatusFilter.value)
  }
  if (inboundSupplierFilter.value) {
    list = list.filter(o => o.counterpartyId === inboundSupplierFilter.value)
  }
  return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const inboundTotalPages = computed(() => Math.max(1, Math.ceil(filteredInboundOrders.value.length / inboundPageSize.value)))
const paginatedInbound = computed(() => {
  const start = (inboundPage.value - 1) * inboundPageSize.value
  return filteredInboundOrders.value.slice(start, start + inboundPageSize.value)
})

const inboundVisiblePages = computed(() => {
  const total = inboundTotalPages.value
  const current = inboundPage.value
  const pages = []
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const inboundMonthAmount = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return inventoryStore.inboundOrders
    .filter(o => o.status === 'confirmed' && o.date)
    .filter(o => {
      const d = new Date(o.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((s, o) => s + calcInboundAmount(o), 0)
})

const inboundAllDetails = computed(() => {
  const details = []
  let detailId = 1
  for (const o of inventoryStore.inboundOrders) {
    const items = getParsedItems(o)
    for (const item of items) {
      const inv = inventoryStore.lookupByBarcode(item.code || item.name || '')
      details.push({
        id: o.id + '_' + detailId,
        detailId: detailId++,
        orderNo: o.orderNo,
        barcode: item.barcode || item.code || '',
        code: item.code || (inv ? inv.code : ''),
        name: item.name || (inv ? inv.name : ''),
        grade: item.grade || (inv ? inv.grade : ''),
        color: item.color || (inv ? inv.color : ''),
        qty: item.qty || 0,
        cost: item.cost || 0,
        amount: Math.round((item.qty || 0) * (item.cost || 0) * 100) / 100,
        batch: item.batch || '',
        orderId: o.id,
        status: o.status
      })
    }
  }
  return details
})

const filteredInboundDetails = computed(() => {
  let list = inboundAllDetails.value
  const search = inboundSearch.value.toLowerCase()
  if (search) {
    list = list.filter(d => (d.orderNo || '').toLowerCase().includes(search) || (d.code || '').toLowerCase().includes(search) || (d.name || '').toLowerCase().includes(search))
  }
  if (inboundTypeFilter.value) {
    list = list.filter(d => {
      const order = inventoryStore.inboundOrders.find(o => o.id === d.orderId)
      return order && order.type === inboundTypeFilter.value
    })
  }
  if (inboundStatusFilter.value) {
    list = list.filter(d => d.status === inboundStatusFilter.value)
  }
  if (inboundSupplierFilter.value) {
    list = list.filter(d => {
      const order = inventoryStore.inboundOrders.find(o => o.id === d.orderId)
      return order && order.counterpartyId === inboundSupplierFilter.value
    })
  }
  return list
})

const inboundDetailTotalPages = computed(() => Math.max(1, Math.ceil(filteredInboundDetails.value.length / inboundDetailPageSize)))
const paginatedInboundDetails = computed(() => {
  const start = (inboundDetailPage.value - 1) * inboundDetailPageSize
  return filteredInboundDetails.value.slice(start, start + inboundDetailPageSize)
})

const inboundDetailVisiblePages = computed(() => {
  const total = inboundDetailTotalPages.value
  const current = inboundDetailPage.value
  const pages = []
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const inboundItemsTotalWeight = computed(() => inboundFormItems.value.reduce((s, it) => s + (it.qty || 0), 0))
const inboundItemsTotalAmount = computed(() => inboundFormItems.value.reduce((s, it) => s + (it.qty || 0) * (it.cost || 0), 0))

/* 入库完成率 */
const confirmRate = computed(() => {
  const total = inventoryStore.inboundOrders.length
  if (total === 0) return 0
  const confirmed = inventoryStore.inboundOrders.filter(o => o.status === 'confirmed').length
  return Math.round((confirmed / total) * 100)
})
const RING_C = 2 * Math.PI * 26
const confirmRateColor = computed(() => {
  const r = confirmRate.value
  if (r >= 70) return 'var(--color-success)'
  if (r >= 40) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const confirmRateDash = computed(() => {
  const p = confirmRate.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 入库类型分布 */
const TYPE_COLORS = { purchase: '#3b82f6', return: '#f59e0b', transfer: '#a855f7', other: '#64748b' }
const inboundTypeStats = computed(() => {
  const map = {}
  inventoryStore.inboundOrders.forEach(o => { map[o.type] = (map[o.type] || 0) + 1 })
  const total = inventoryStore.inboundOrders.length || 1
  return Object.entries(map).map(([type, count]) => {
    const found = inventoryStore.INBOUND_TYPES.find(t => t.value === type)
    return { type, label: found ? found.label : type, count, percent: Math.round((count / total) * 100), color: TYPE_COLORS[type] || '#64748b' }
  })
})

/* 近7日入库趋势 */
const recent7Days = computed(() => {
  const today = new Date()
  const days = []
  let maxCount = 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = inventoryStore.inboundOrders.filter(o => o.date === dateStr).length
    if (count > maxCount) maxCount = count
    days.push({ dateStr, count, dayLabel: (d.getMonth() + 1) + '/' + d.getDate() })
  }
  return days.map(d => ({ ...d, percent: maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0 }))
})

/* 待处理预警 */
const pendingAlerts = computed(() => {
  return inventoryStore.inboundOrders
    .filter(o => o.status === 'pending' || o.status === 'inspecting')
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .slice(0, 5)
})

/* 库位级联过滤：根据选中仓库的 warehouseId 过滤库位选项 */
const locationParentFilters = computed(() => {
  if (!inboundForm.warehouseId) return []
  return [{ field: 'warehouseId', operator: 'eq', value: inboundForm.warehouseId }]
})

const inboundSelectedPendingCount = computed(() => {
  return inboundSelectedIds.value.filter(id => {
    const o = inventoryStore.inboundOrders.find(ord => ord.id === id)
    return o && o.status === 'pending'
  }).length
})
const inboundSelectedInspectingCount = computed(() => {
  return inboundSelectedIds.value.filter(id => {
    const o = inventoryStore.inboundOrders.find(ord => ord.id === id)
    return o && o.status === 'inspecting'
  }).length
})

const inboundCalHtml = computed(() => {
  const year = inboundCalYear.value
  const month = inboundCalMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  const itemsByDate = {}
  for (const o of inventoryStore.inboundOrders) {
    const d = o.date || ''
    if (d) {
      if (!itemsByDate[d]) itemsByDate[d] = []
      itemsByDate[d].push(o)
    }
  }
  let html = '<table class="cal-table"><thead><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr></thead><tbody>'
  let day = 1
  for (let i = 0; i < 6; i++) {
    if (day > daysInMonth) break
    html += '<tr>'
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) { html += '<td></td>'; continue }
      if (day > daysInMonth) { html += '<td></td>'; continue }
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      const isToday = dateStr === todayStr
      const dayItems = itemsByDate[dateStr] || []
      html += '<td' + (isToday ? ' style="background:var(--color-accent-subtle)"' : '') + '><div style="font-weight:' + (isToday ? '700' : '400') + '">' + day + '</div>'
      for (const di of dayItems.slice(0, 2)) {
        html += '<div style="font-size:10px;color:var(--color-text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(di.orderNo) + '</div>'
      }
      if (dayItems.length > 2) html += '<div style="font-size:10px;color:var(--color-accent)">+' + (dayItems.length - 2) + '</div>'
      html += '</td>'
      day++
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
})

/* 函数 */
function inboundTypeLabel(type) {
  const found = inventoryStore.INBOUND_TYPES.find(t => t.value === type)
  return found ? found.label : type || '-'
}

function getParsedItems(order) {
  if (!order) return []
  try {
    return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
  } catch (e) {
    return []
  }
}

function calcInboundWeight(order) {
  const items = getParsedItems(order)
  return items.reduce((s, it) => s + (it.qty || 0), 0)
}

function calcInboundAmount(order) {
  const items = getParsedItems(order)
  return items.reduce((s, it) => s + (it.qty || 0) * (it.cost || 0), 0)
}

function openInboundWizard() {
  editingInboundId.value = null
  Object.assign(inboundForm, {
    date: new Date().toISOString().split('T')[0],
    type: '', counterpartyId: '', counterpartyName: '', supplierCode: '',
    warehouseId: 'main', locationId: '', notes: '',
    orderNo: inventoryStore.generateInboundNo()
  })
  inboundFormItems.value = [{ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' }]
  inboundErrors.value = []
  showInboundWizard.value = true
}

function openEditInbound(order) {
  editingInboundId.value = order.id
  Object.assign(inboundForm, {
    date: order.date || '',
    type: order.type || '',
    counterpartyId: order.counterpartyId || '',
    counterpartyName: order.counterpartyName || '',
    supplierCode: order.supplierCode || '',
    warehouseId: order.warehouseId || 'main',
    locationId: order.locationId || '',
    notes: order.notes || '',
    orderNo: order.orderNo || ''
  })
  inboundFormItems.value = getParsedItems(order).length > 0
    ? getParsedItems(order).map(it => ({ barcode: it.barcode || it.code || '', ...it }))
    : [{ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' }]
  inboundErrors.value = []
  showInboundWizard.value = true
}

function closeInboundWizard() {
  showInboundWizard.value = false
  editingInboundId.value = null
  inboundErrors.value = []
}

function addInboundItem() {
  inboundFormItems.value.push({ barcode: '', code: '', name: '', grade: '', color: '', qty: 0, cost: 0, batch: '' })
}

function removeInboundItem(idx) {
  inboundFormItems.value.splice(idx, 1)
}

function onInboundItemCodeChange(idx) {
  const code = inboundFormItems.value[idx].code
  if (!code) return
  const found = inventoryStore.lookupByBarcode(code)
  if (found) {
    inboundFormItems.value[idx].name = found.name
    inboundFormItems.value[idx].grade = found.grade || ''
    inboundFormItems.value[idx].color = found.color || ''
    inboundFormItems.value[idx].cost = found.unitCost || 0
  }
}

function onInboundItemBarcodeChange(idx) {
  const barcode = inboundFormItems.value[idx].barcode || inboundFormItems.value[idx].code
  if (!barcode) return
  const found = inventoryStore.lookupByBarcode(barcode)
  if (found) {
    inboundFormItems.value[idx].code = found.code || ''
    inboundFormItems.value[idx].name = found.name || ''
    inboundFormItems.value[idx].grade = found.grade || ''
    inboundFormItems.value[idx].color = found.color || ''
    inboundFormItems.value[idx].cost = found.unitCost || 0
  }
}

function onInboundSupplierChange() {
  const sup = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
  if (sup) {
    inboundForm.counterpartyName = sup.shortName || sup.name
    inboundForm.supplierCode = sup.supplierCode || ''
  } else {
    inboundForm.supplierCode = ''
  }
}

/* DataSelect 供应商变更：单向联动+可改，自动填充但字段仍可编辑 */
function onSupplierChange({ value, data }) {
  if (data) {
    inboundForm.counterpartyName = data.shortName || data.name
    inboundForm.supplierCode = data.supplierCode || ''
  } else {
    inboundForm.counterpartyName = ''
    inboundForm.supplierCode = ''
  }
}

/* DataSelect 仓库变更：清空库位选择 */
function onWarehouseChange({ value, data }) {
  inboundForm.locationId = ''
}

/* DataSelect 物料变更：单向联动+可改，自动填充但字段仍可编辑 */
function onMaterialChange(idx, { value, data }) {
  if (data) {
    inboundFormItems.value[idx].code = data.code || ''
    inboundFormItems.value[idx].name = data.name || ''
    inboundFormItems.value[idx].grade = data.grade || ''
    inboundFormItems.value[idx].color = data.color || ''
    inboundFormItems.value[idx].cost = data.unitCost || 0
  }
}

function onInboundSupplierCodeChange() {
  if (!inboundForm.supplierCode) return
  const sup = inventoryStore.suppliers.find(s => s.supplierCode === inboundForm.supplierCode || s.id === inboundForm.supplierCode)
  if (sup) {
    inboundForm.counterpartyId = sup.id
    inboundForm.counterpartyName = sup.shortName || sup.name
  }
}

function toggleContinuousScan() {
  continuousScanMode.value = !continuousScanMode.value
}

function focusBarcodeInput() {
  const inputs = document.querySelectorAll('.inbound-barcode-input')
  if (inputs.length > 0) inputs[inputs.length - 1].focus()
}

function inboundCalPrev() {
  inboundCalMonth.value--
  if (inboundCalMonth.value < 0) { inboundCalMonth.value = 11; inboundCalYear.value-- }
}
function inboundCalNext() {
  inboundCalMonth.value++
  if (inboundCalMonth.value > 11) { inboundCalMonth.value = 0; inboundCalYear.value++ }
}
function inboundCalToday() {
  inboundCalYear.value = new Date().getFullYear()
  inboundCalMonth.value = new Date().getMonth()
}

function handleSubmitInbound() {
  const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
  const result = inventoryStore.submitInboundOrder({
    ...inboundForm,
    id: editingInboundId.value || undefined,
    counterpartyName: supplier ? (supplier.shortName || supplier.name) : inboundForm.counterpartyName,
    supplierCode: supplier ? supplier.supplierCode : inboundForm.supplierCode,
    _items: inboundFormItems.value
  })
  if (result.success) {
    inventoryStore.addAuditLog('create', 'inbound', (editingInboundId.value ? '编辑并提交入库单: ' : '创建入库单: ') + (result.order ? result.order.orderNo : ''), { orderNo: result.order ? result.order.orderNo : '' })
    closeInboundWizard()
  } else {
    inboundErrors.value = result.errors || ['提交失败']
  }
}

function handleSaveInboundDraft() {
  const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
  const result = inventoryStore.saveInboundDraft({
    ...inboundForm,
    id: editingInboundId.value || undefined,
    counterpartyName: supplier ? (supplier.shortName || supplier.name) : inboundForm.counterpartyName,
    supplierCode: supplier ? supplier.supplierCode : inboundForm.supplierCode,
    _items: inboundFormItems.value
  })
  if (result && result.success) {
    inventoryStore.addAuditLog('save', 'inbound', '保存入库草稿: ' + (result.order ? result.order.orderNo : ''))
    closeInboundWizard()
  } else {
    inboundErrors.value = (result && result.errors) || ['草稿保存失败，请检查表单数据']
  }
}

function handleChangeInboundStatus(orderId, newStatus) {
  const order = inventoryStore.inboundOrders.find(o => o.id === orderId)
  inventoryStore.changeInboundStatus(orderId, newStatus)
  inventoryStore.addAuditLog('status_change', 'inbound', '入库单状态变更: ' + (order ? order.orderNo : orderId) + ' → ' + (inventoryStore.INBOUND_STATUS_LABELS[newStatus] || newStatus))
}

function showConfirmDialog(title, message, onConfirm) {
  confirmDialog.value = { show: true, title, message, onConfirm }
}
function handleConfirmDialogOk() {
  if (confirmDialog.value.onConfirm) confirmDialog.value.onConfirm()
  confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
}
function handleConfirmDialogCancel() {
  confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
}

function handleConfirmInbound(orderId) {
  const result = inventoryStore.confirmInbound(orderId)
  if (result.success) {
    inventoryStore.addAuditLog('status_change', 'inbound', '入库单已确认入库', { orderId, sensitive: true })
  } else {
    inboundErrors.value = [result.error || '确认入库失败']
  }
}

function handleReverseInbound(orderId) {
  showConfirmDialog('冲销入库单', '确认冲销该入库单？库存将相应扣回，此操作不可撤销。', () => {
    const result = inventoryStore.reverseInboundOrder(orderId)
    if (result.success) {
      inventoryStore.addAuditLog('reverse', 'inbound', '冲销入库单: ' + (result.reverseOrder ? result.reverseOrder.orderNo : ''))
    } else {
      inboundErrors.value = [result.error || '冲销失败']
    }
  })
}

function handleDeleteInbound(id) {
  const order = inventoryStore.inboundOrders.find(o => o.id === id)
  showConfirmDialog('确认删除', '确认删除该入库单？', () => {
    inventoryStore.deleteInboundOrder(id)
    inventoryStore.addAuditLog('delete', 'inbound', '删除入库单: ' + (order ? order.orderNo : id))
  })
}

function viewInboundDetail(order) {
  detailOrder.value = order
  showInboundDetail.value = true
}

function toggleInboundSelectAll(checked) {
  inboundSelectedIds.value = checked ? paginatedInbound.value.map(o => o.id) : []
}

function handleBatchDeleteInbound() {
  if (inboundSelectedIds.value.length === 0) { inboundErrors.value = ['请先勾选要删除的入库记录']; return }
  showConfirmDialog('批量删除', '确认删除选中的 ' + inboundSelectedIds.value.length + ' 条入库记录？此操作不可撤销。', () => {
    const count = inventoryStore.batchDeleteInboundOrders(inboundSelectedIds.value)
    inboundSelectedIds.value = []
    inventoryStore.addAuditLog('delete', 'inbound', '批量删除入库记录 ' + count + ' 条')
  })
}

function handleBatchApproveInbound() {
  const pendingIds = inboundSelectedIds.value.filter(id => {
    const o = inventoryStore.inboundOrders.find(ord => ord.id === id)
    return o && o.status === 'pending'
  })
  if (pendingIds.length === 0) { inboundErrors.value = ['请选择待审核的入库单']; return }
  showConfirmDialog('批量审批', '确认审批选中的 ' + pendingIds.length + ' 条待审核入库单？', () => {
    const count = inventoryStore.batchApproveInbound(pendingIds)
    inboundSelectedIds.value = []
    inboundSelectAll.value = false
    inventoryStore.addAuditLog('batchApprove', 'inbound', '批量审批入库单: ' + count + '条')
  })
}

function handleBatchConfirmInbound() {
  const inspectingIds = inboundSelectedIds.value.filter(id => {
    const o = inventoryStore.inboundOrders.find(ord => ord.id === id)
    return o && o.status === 'inspecting'
  })
  if (inspectingIds.length === 0) { inboundErrors.value = ['请选择质检中的入库单']; return }
  showConfirmDialog('批量确认入库', '确认入库选中的记录？库存将相应增加。', () => {
    const count = inventoryStore.batchConfirmInbound(inspectingIds)
    inboundSelectedIds.value = []
    inboundSelectAll.value = false
    inventoryStore.addAuditLog('batchConfirm', 'inbound', '批量确认入库: ' + count + '条')
  })
}

function handleExportSelectedInbound() {
  const selected = inventoryStore.inboundOrders.filter(o => inboundSelectedIds.value.includes(o.id))
  if (selected.length === 0) { inboundErrors.value = ['请选择要导出的入库单']; return }
  const data = selected.map(o => ({
    入库单号: o.orderNo, 入库日期: o.date, 入库类型: inboundTypeLabel(o.type),
    供应商编码: o.supplierCode || '', 供应商名称: o.counterpartyName || '',
    总重量: calcInboundWeight(o).toFixed(2), 总金额: calcInboundAmount(o).toFixed(2),
    状态: inventoryStore.INBOUND_STATUS_LABELS[o.status] || o.status
  }))
  const filename = '入库数据_选中'
  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, filename)
    XLSX.writeFile(wb, filename + '_' + new Date().toISOString().split('T')[0] + '.xlsx')
  } else {
    const csv = '\uFEFF' + Object.keys(data[0]).join(',') + '\n' + data.map(r => Object.values(r).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
}

function handleCopyInbound(id) {
  const newOrder = inventoryStore.copyInboundOrder(id)
  if (newOrder) {
    copySuccessMsg.value = '已复制入库单: ' + newOrder.orderNo
    setTimeout(() => { copySuccessMsg.value = '' }, 3000)
  }
}

function handlePrintInbound(order) {
  const items = getParsedItems(order)
  const typeLabel = inboundTypeLabel(order.type)
  let itemRows = ''
  let totalQty = 0, totalAmt = 0
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const amt = (it.qty || 0) * (it.cost || 0)
    totalQty += (it.qty || 0)
    totalAmt += amt
    itemRows += '<tr><td>' + (i + 1) + '</td><td>' + (it.code || '') + '</td><td>' + (it.name || '') + '</td><td>' + (it.grade || '') + '</td><td>' + (it.color || '') + '</td><td>' + (it.qty || 0).toFixed(2) + '</td><td>' + (it.cost || 0).toFixed(2) + '</td><td style="font-weight:bold">' + amt.toFixed(2) + '</td><td>' + (it.batch || '') + '</td></tr>'
  }
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>入库单 - ' + order.orderNo + '</title><style>body{font-family:"SimSun","Microsoft YaHei",serif;font-size:12pt;line-height:1.8;color:#000;margin:0;padding:20mm}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #333;padding:6px 8px;text-align:center;font-size:10.5pt}th{background:#f0f0f0;font-weight:bold}.title{text-align:center;font-size:20pt;font-weight:bold;letter-spacing:6px;margin-bottom:4px}.sub{text-align:center;font-size:10pt;color:#555;margin-bottom:20px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10.5pt;margin:10px 0}.sign{margin-top:40px;display:flex;justify-content:space-between;font-size:10.5pt}.sign-line{display:inline-block;width:140px;border-bottom:1px solid #333}.total-row td{font-weight:bold;background:#f8f8f8}@page{size:A4;margin:15mm}</style></head><body>')
  printWindow.document.write('<div class="title">苏州冠久新材料科技有限公司</div><div class="title" style="font-size:16pt">入 库 单</div><div class="sub">入库单号: ' + order.orderNo + '</div>')
  printWindow.document.write('<div class="info-grid"><div>入库类型: ' + typeLabel + '</div><div>入库日期: ' + (order.date || '-') + '</div><div>供应商: ' + (order.counterpartyName || '-') + '</div><div>供应商编码: ' + (order.supplierCode || '-') + '</div><div>状态: ' + (inventoryStore.INBOUND_STATUS_LABELS[order.status] || order.status) + '</div><div>备注: ' + (order.notes || '-') + '</div></div>')
  printWindow.document.write('<table><thead><tr><th>序号</th><th>物料编码</th><th>物料名称</th><th>牌号</th><th>颜色</th><th>数量(kg)</th><th>单价(元/kg)</th><th>金额(元)</th><th>批次号</th></tr></thead><tbody>')
  printWindow.document.write(itemRows)
  printWindow.document.write('<tr class="total-row"><td colspan="5">合计</td><td>' + totalQty.toFixed(2) + '</td><td></td><td>' + totalAmt.toFixed(2) + '</td><td></td></tr>')
  printWindow.document.write('</tbody></table>')
  printWindow.document.write('<div class="sign"><div>制单人: <span class="sign-line"></span></div><div>质检人: <span class="sign-line"></span></div><div>仓管人: <span class="sign-line"></span></div><div>供应商确认: <span class="sign-line"></span></div></div>')
  printWindow.document.write('<div style="text-align:right;font-size:9pt;color:#999;margin-top:20px">打印时间: ' + new Date().toLocaleString('zh-CN') + '</div>')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
  inventoryStore.addAuditLog('print', 'inbound', '打印入库单: ' + order.orderNo)
}

function handleDoubleClickInbound(order) {
  if (order.status !== 'confirmed') return
  emit('quick-outbound', order)
}

function openRecycleBinModal() {
  showRecycleBin.value = true
}

function handleRestoreFromRecycleBin(id) {
  inventoryStore.restoreFromRecycleBin(id)
}

function handlePermanentDeleteFromRecycleBin(id) {
  showConfirmDialog('永久删除', '确认永久删除？此操作不可恢复。', () => {
    inventoryStore.permanentDeleteFromRecycleBin(id)
  })
}

function handleEmptyRecycleBin() {
  showConfirmDialog('清空回收站', '确认清空回收站？所有数据将永久删除，此操作不可恢复。', () => {
    inventoryStore.emptyRecycleBin()
  })
}

function handleDownloadImportTemplate() {
  const headers = ['入库类型', '入库日期', '供应商编码', '物料编码', '物料名称', '牌号', '颜色', '数量(kg)', '单价(元/kg)', '批次号', '备注']
  const csv = '\uFEFF' + headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '入库导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function quickInboundForItem(item) {
  openInboundWizard()
  inboundForm.type = 'purchase'
  inboundFormItems.value = [{
    barcode: item.code, code: item.code, name: item.name, grade: item.grade || '',
    color: item.color || '', qty: Math.max(0, item.safetyStockVal - item.stock),
    cost: item.unitCost || 0, batch: ''
  }]
}

function handleExport() {
  const data = inventoryStore.inboundOrders.map(o => ({
    入库单号: o.orderNo, 入库日期: o.date, 入库类型: inboundTypeLabel(o.type),
    供应商编码: o.supplierCode || '', 供应商名称: o.counterpartyName || '',
    总重量: calcInboundWeight(o).toFixed(2), 总金额: calcInboundAmount(o).toFixed(2),
    状态: inventoryStore.INBOUND_STATUS_LABELS[o.status] || o.status
  }))
  const filename = '入库数据'
  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, filename)
    XLSX.writeFile(wb, filename + '_' + new Date().toISOString().split('T')[0] + '.xlsx')
  } else {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }
}

defineExpose({
  openInboundWizard,
  quickInboundForItem
})
</script>

<style scoped>
.inbound-page { width: 100%; }
.inbound-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3); }
.inbound-header-info h2 { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-size: var(--font-size-xl); }
.inbound-header-info p { margin: var(--space-1) 0 0; color: var(--color-text-tertiary); font-size: var(--font-size-sm); }
.inbound-header-actions { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

.inv-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); margin-bottom: var(--space-4); }
.inv-stat-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); display: flex; align-items: center; gap: var(--space-3); }
.inv-stat-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.inv-stat-value { font-size: var(--font-size-xl); font-weight: 700; font-family: var(--font-mono); }
.inv-stat-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

/* 概览面板 */
.inbound-overview-row { display: grid; grid-template-columns: 200px 1fr 220px; gap: var(--space-3); margin-bottom: var(--space-4); }
.overview-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); animation: statCardIn 0.4s ease-out both; }
.overview-card:nth-child(1) { animation-delay: 0ms; }
.overview-card:nth-child(2) { animation-delay: 60ms; }
.overview-card:nth-child(3) { animation-delay: 120ms; }
@keyframes statCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.overview-card-title { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--space-2); }
.overview-ring-body { display: flex; align-items: center; gap: var(--space-3); }
@keyframes ringDraw { from { stroke-dashoffset: 163.4; } }
.overview-ring-progress { animation: ringDraw 1s ease-out; transition: stroke-dasharray 0.6s ease; }
.overview-ring-text { display: flex; flex-direction: column; }
.overview-ring-percent { font-size: var(--font-size-2xl); font-weight: 700; font-family: var(--font-mono); line-height: 1; }
.overview-ring-sub { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.type-bars { display: flex; flex-direction: column; gap: var(--space-2); }
.type-bar-item { display: flex; align-items: center; gap: var(--space-2); }
.type-bar-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); min-width: 56px; }
.type-bar-track { flex: 1; height: 6px; background: var(--color-bg-tertiary); border-radius: var(--radius-full); overflow: hidden; }
.type-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.6s ease; position: relative; }
.type-bar-fill::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent); animation: barShimmer 2s ease-in-out infinite; }
@keyframes barShimmer { 0% { left: -100%; } 100% { left: 100%; } }
.type-bar-count { font-size: var(--font-size-xs); font-weight: 600; font-family: var(--font-mono); min-width: 16px; text-align: right; }
.trend-bars { display: flex; align-items: flex-end; gap: 6px; height: 80px; padding-top: 4px; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; }
.trend-bar-track-v { flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; }
.trend-bar-fill-v { width: 100%; border-radius: 2px 2px 0 0; transition: height 0.5s ease; min-height: 2px; }
.trend-bar-day { font-size: 9px; color: var(--color-text-tertiary); }
.trend-bar-num { font-size: 9px; font-family: var(--font-mono); font-weight: 600; color: var(--color-text-secondary); }

/* 待处理预警 */
.inbound-alert-panel { margin-bottom: var(--space-3); border-left: 3px solid var(--color-warning); }
.alert-dot-pulse { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); animation: alertDotPulse 1.5s ease-in-out infinite; margin-right: 4px; }
@keyframes alertDotPulse { 0%, 100% { box-shadow: 0 0 4px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 10px rgba(245,158,11,0.7); } }
.inbound-alert-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); animation: alertSlideIn 0.3s ease-out both; transition: background 0.15s; }
.inbound-alert-item:hover { background: var(--color-surface-hover); }
.inbound-alert-item:last-child { border-bottom: none; }
@keyframes alertSlideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
.inbound-alert-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
.inbound-alert-no { font-weight: 600; color: var(--color-accent); font-family: var(--font-mono); font-size: var(--font-size-sm); }
.inbound-alert-supplier { color: var(--color-text-secondary); font-size: var(--font-size-sm); flex: 1; }
.inbound-alert-amount { font-family: var(--font-mono); font-weight: 600; font-size: var(--font-size-sm); color: var(--color-text-primary); }

.inv-toolbar { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); flex-wrap: wrap; }
.inv-search { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
.inv-search .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-tertiary); }
.inv-search .search-input { width: 100%; padding-left: 32px; }
.inv-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { min-width: 120px; }

.inbound-tab-bar { display: flex; gap: var(--space-1); margin-bottom: var(--space-3); border-bottom: 2px solid var(--color-border); padding-bottom: 0; }
.inbound-tab-bar .btn { border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; border-radius: var(--radius-md) var(--radius-md) 0 0; padding: var(--space-2) var(--space-3); }
.inbound-tab-bar .btn.active { border-bottom-color: var(--color-accent); color: var(--color-accent); font-weight: 600; }

.inv-table-wrap { overflow-x: auto; }
.inv-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.inv-table th, .inv-table td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
.inv-table th { background: var(--color-bg-secondary); font-weight: 600; color: var(--color-text-secondary); position: sticky; top: 0; }
.inv-table-sm th, .inv-table-sm td { padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs); }
.inv-table tr:hover td { background: var(--color-bg-tertiary); }
@keyframes rowSlideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.inv-table tbody tr { animation: rowSlideIn 0.3s ease-out both; }
.inv-table tbody tr:nth-child(1) { animation-delay: 0ms; }
.inv-table tbody tr:nth-child(2) { animation-delay: 20ms; }
.inv-table tbody tr:nth-child(3) { animation-delay: 40ms; }
.inv-table tbody tr:nth-child(4) { animation-delay: 60ms; }
.inv-table tbody tr:nth-child(5) { animation-delay: 80ms; }
.inv-table tbody tr:nth-child(n+6) { animation-delay: 100ms; }

.cell-mono { font-family: var(--font-mono); font-size: var(--font-size-xs); }
.cell-actions { white-space: nowrap; }
.cell-actions .btn { margin-right: 2px; }
.empty-cell { text-align: center; padding: var(--space-6) 0; color: var(--color-text-tertiary); }
.empty-state-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2); color: var(--color-text-tertiary); }

.row-confirmed td { background: rgba(16, 185, 129, 0.04); }

.status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: var(--font-size-xs); font-weight: 600; }
.status-draft { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.status-pending { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
.status-inspecting { background: rgba(6, 182, 212, 0.1); color: var(--color-info); }
.status-confirmed { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
.status-cancelled { background: rgba(107, 114, 128, 0.1); color: var(--color-text-tertiary); }
.status-reversed { background: rgba(168, 85, 247, 0.1); color: var(--color-purple); }

.inbound-bulk-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.inbound-list-item { padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-2); cursor: pointer; transition: all 0.2s ease; animation: listSlideIn 0.3s ease-out both; }
@keyframes listSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.inbound-list-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); transform: translateX(2px); }
.inbound-list-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1); }
.inbound-list-item-body { display: flex; gap: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm); flex-wrap: wrap; }

.inbound-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
.inbound-card-item { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-3); transition: all 0.25s ease; cursor: pointer; animation: cardFadeIn 0.4s ease-out both; }
@keyframes cardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.inbound-card-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); }
.inbound-card-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
.inbound-card-item-body { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.inbound-card-item-body > div { margin-bottom: var(--space-1); }
.inbound-card-item-actions { margin-top: var(--space-2); display: flex; gap: var(--space-2); }

.detail-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3); }
.detail-field { display: flex; flex-direction: column; gap: 2px; }
.detail-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.detail-value { font-size: var(--font-size-sm); }

.wizard-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.wizard-modal { background: var(--color-bg-primary); border-radius: var(--radius-lg); width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.wizard-modal-lg { max-width: 960px; }
.wizard-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }
.wizard-header h3 { margin: 0; font-size: var(--font-size-base); display: flex; align-items: center; gap: var(--space-2); }
.wizard-body { padding: var(--space-4); overflow-y: auto; flex: 1; }
.wizard-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border); }

.form-section-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--space-3); display: flex; align-items: center; gap: var(--space-2); }
.form-grid { display: grid; gap: var(--space-3); }
.form-grid-3 { grid-template-columns: repeat(3, 1fr); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg-primary); color: var(--color-text-primary); }
.form-input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle); }
.form-input-sm { padding: 4px var(--space-2); font-size: var(--font-size-xs); }
.form-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg-primary); color: var(--color-text-primary); }
.form-select:focus { outline: none; border-color: var(--color-accent); }
.form-textarea { padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); font-size: var(--font-size-sm); font-family: var(--font-family); resize: vertical; width: 100%; }
.form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle); }

.form-errors { margin-top: var(--space-3); padding: var(--space-3); background: rgba(239,68,68,0.1); border-radius: var(--radius-md); border: 1px solid rgba(239,68,68,0.3); }
.form-error { font-size: var(--font-size-sm); color: var(--color-danger); padding: 2px 0; display: flex; align-items: center; gap: var(--space-1); }

.inbound-items-table { overflow-x: auto; }
.inbound-summary { display: flex; gap: var(--space-4); margin-top: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md); font-size: var(--font-size-sm); }

.supplier-input-group { display: flex; gap: var(--space-2); }
.supplier-input-group .data-select { flex: 2; }
.supplier-input-group .form-input { flex: 1; }

/* 表格内 DataSelect 紧凑样式 */
.cell-material-select { min-width: 140px; }
.cell-material-select .data-select { min-width: 120px; }
.cell-material-select .data-select-trigger { min-height: 28px; padding: 2px 24px 2px 6px; font-size: var(--font-size-xs); }
.cell-material-select .data-select-dropdown { font-size: var(--font-size-xs); }

.view-toggle-dropdown { position: relative; }
.view-toggle-menu { position: absolute; top: 100%; left: 0; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; min-width: 140px; padding: var(--space-1) 0; }
.view-toggle-menu button { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border: none; background: none; cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-primary); text-align: left; }
.view-toggle-menu button:hover { background: var(--color-bg-tertiary); }
.view-toggle-menu button.active { color: var(--color-accent); font-weight: 600; }

.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; margin-top: var(--space-2); }
.page-info { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.page-btns { display: flex; gap: var(--space-1); }

.panel-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-3); }
.panel-card-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }
.panel-card-title { font-weight: 600; font-size: var(--font-size-base); }
.panel-card-body { padding: var(--space-4); }
.panel-card-body.no-padding { padding: 0; }
.panel-card-footer { border-top: 1px solid var(--color-border); }
.result-count { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

.cal-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cal-table th, .cal-table td { border: 1px solid var(--color-border); padding: var(--space-1) var(--space-2); vertical-align: top; min-height: 60px; height: 80px; }
.cal-table th { background: var(--color-bg-secondary); font-weight: 600; text-align: center; font-size: var(--font-size-xs); }

.recycle-bin-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.recycle-bin-table th, .recycle-bin-table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); text-align: left; }
.recycle-bin-table th { background: var(--color-bg-secondary); font-weight: 600; }

.required { color: var(--color-danger); }
.no-padding { padding: 0 !important; }

.copy-success-toast { position: fixed; top: 20px; right: 20px; background: var(--color-success); color: #fff; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--font-size-sm); z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.3s; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .inv-stats-row { grid-template-columns: 1fr; }
  .form-grid-3 { grid-template-columns: 1fr; }
  .inbound-header { flex-direction: column; }
  .supplier-input-group { flex-direction: column; }
}
</style>
