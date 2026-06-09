<template>
  <div class="outbound-page">
    <div class="outbound-header">
      <div class="outbound-header-info">
        <h2><Icon name="download" :size="14" /> 出库管理</h2>
        <p>全流程可追溯出库管理，库存校验，防错防漏</p>
      </div>
        <div class="outbound-header-actions">
          <div class="view-toggle-dropdown" @click.stop>
            <button class="btn btn-ghost btn-sm" @click="outboundViewMenuOpen = !outboundViewMenuOpen"><Icon name="chart" :size="14" /> 视图</button>
            <div v-if="outboundViewMenuOpen" class="view-toggle-menu">
              <button :class="{ active: outboundView === 'table' }" @click="outboundView = 'table'; outboundViewMenuOpen = false"><Icon name="chart" :size="14" /> 表格视图</button>
              <button :class="{ active: outboundView === 'list' }" @click="outboundView = 'list'; outboundViewMenuOpen = false"><Icon name="list" :size="14" /> 列表视图</button>
              <button :class="{ active: outboundView === 'card' }" @click="outboundView = 'card'; outboundViewMenuOpen = false"><Icon name="card" :size="14" /> 卡片视图</button>
              <button :class="{ active: outboundView === 'calendar' }" @click="outboundView = 'calendar'; outboundViewMenuOpen = false"><Icon name="calendar" :size="14" /> 日历视图</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="handleExportOutbound"><Icon name="upload" :size="14" /> 导出</button>
          <button v-if="canOutbound" class="btn btn-primary btn-sm" @click="openOutboundWizard">+ 出库登记</button>
        </div>
      </div>

      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="download" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.outboundOrders.length }}</div>
          <div class="inv-stat-label">出库单总数</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:#e65100;color:#fff"><Icon name="dollar" :size="14" /></div>
          <div class="inv-stat-value">{{ (outboundMonthAmount / 10000).toFixed(1) }}万</div>
          <div class="inv-stat-label">本月出库金额</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="warning" :size="14" /></div>
          <div class="inv-stat-value">{{ inventoryStore.pendingOutboundCount }}</div>
          <div class="inv-stat-label">待审核</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-info-subtle);color:var(--color-info)"><Icon name="info" :size="14" /></div>
          <div class="inv-stat-value">{{ outboundApprovedCount }}</div>
          <div class="inv-stat-label">待出库</div>
        </div>
      </div>

      <div v-if="outboundSelectedIds.length > 0" class="outbound-bulk-bar">
        <span style="font-size:var(--font-size-sm);font-weight:600">已选择 {{ outboundSelectedIds.length }} 条</span>
        <button v-if="outboundSelectedPendingCount > 0 && canApproveOutbound" class="btn btn-secondary btn-sm" @click="handleBatchApproveOutbound">批量审批({{ outboundSelectedPendingCount }})</button>
        <button v-if="outboundSelectedApprovedCount > 0" class="btn btn-primary btn-sm" @click="handleBatchConfirmOutbound">批量确认出库({{ outboundSelectedApprovedCount }})</button>
        <button class="btn btn-ghost btn-sm" @click="handleExportSelectedOutbound">导出选中</button>
      </div>

      <div class="filter-bar">
        <input v-model="outboundSearch" type="text" class="form-input" placeholder="搜索出库单号/物料编码/名称..." />
        <select v-model="outboundTypeFilter" class="form-select filter-select">
          <option value="">全部类型</option>
          <option value="production">生产领用</option>
          <option value="sales">销售出库</option>
          <option value="transfer">调拨出库</option>
          <option value="scrap">报废出库</option>
          <option value="sample">样品出库</option>
          <option value="return">退货出库</option>
        </select>
        <select v-model="outboundStatusFilter" class="form-select filter-select">
          <option value="">全部状态</option>
          <option value="pending_review">待审核</option>
          <option value="pending">待审核(历史)</option>
          <option value="approved">已审核</option>
          <option value="confirmed">已出库</option>
          <option value="cancelled">已取消</option>
          <option value="reversed">已冲销</option>
        </select>
      </div>

      <div v-if="outboundView === 'table'" class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">出库单列表</span>
          <span class="result-count">共 {{ filteredOutboundOrders.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center"><input type="checkbox" v-model="outboundSelectAll" @change="toggleOutboundSelectAll"></th>
                  <th v-if="outboundColumnVisible.outboundNo">出库单号</th>
                  <th v-if="outboundColumnVisible.outboundType">出库类型</th>
                  <th v-if="outboundColumnVisible.materialCode">物料编码</th>
                  <th v-if="outboundColumnVisible.materialName">物料名称</th>
                  <th v-if="outboundColumnVisible.grade">牌号</th>
                  <th v-if="outboundColumnVisible.color">颜色</th>
                  <th v-if="outboundColumnVisible.outboundDate">出库日期</th>
                  <th v-if="outboundColumnVisible.outQty">出库数量(kg)</th>
                  <th v-if="outboundColumnVisible.unitPrice">单价(元/kg)</th>
                  <th v-if="outboundColumnVisible.outAmount">出库金额(元)</th>
                  <th v-if="outboundColumnVisible.relatedNo">关联单号</th>
                  <th v-if="outboundColumnVisible.outStatus">出库状态</th>
                  <th style="min-width:160px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedOutbound.length === 0">
                  <td colspan="14" class="empty-cell"><Icon name="package" :size="32" /> 暂无出库记录</td>
                </tr>
                <tr v-for="order in paginatedOutbound" :key="order.id">
                  <td style="text-align:center"><input type="checkbox" :value="order.id" v-model="outboundSelectedIds"></td>
                  <td v-if="outboundColumnVisible.outboundNo" class="cell-mono"><strong style="color:var(--color-accent)">{{ order.outboundNo || order.orderNo }}</strong></td>
                  <td v-if="outboundColumnVisible.outboundType">{{ outboundTypeLabel(order.outType || order.type) }}</td>
                  <td v-if="outboundColumnVisible.materialCode" class="cell-mono">{{ order.materialCode || '-' }}</td>
                  <td v-if="outboundColumnVisible.materialName">{{ order.materialName || '-' }}</td>
                  <td v-if="outboundColumnVisible.grade">{{ order.grade || '-' }}</td>
                  <td v-if="outboundColumnVisible.color">{{ order.color || '-' }}</td>
                  <td v-if="outboundColumnVisible.outboundDate">{{ order.date || '-' }}</td>
                  <td v-if="outboundColumnVisible.outQty" class="cell-mono">{{ (order.outQty || 0).toFixed(2) }}</td>
                  <td v-if="outboundColumnVisible.unitPrice" class="cell-mono">{{ (order.unitPrice || 0).toFixed(2) }}</td>
                  <td v-if="outboundColumnVisible.outAmount" class="cell-mono" style="font-weight:600">{{ formatNumber(order.outAmount || 0) }}</td>
                  <td v-if="outboundColumnVisible.relatedNo" class="cell-mono">{{ order.referenceId || '-' }}</td>
                  <td v-if="outboundColumnVisible.outStatus"><span class="status-badge" :class="'status-' + (order.outStatus || order.status)">{{ inventoryStore.OUTBOUND_STATUS_LABELS[order.outStatus || order.status] || (order.outStatus || order.status) }}</span></td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" @click="handleViewOutbound(order)">查看</button>
                    <template v-if="(order.outStatus || order.status) === 'pending_review' || (order.outStatus || order.status) === 'pending'">
                      <button class="btn btn-ghost btn-sm" @click="openEditOutbound(order)"><Icon name="edit" :size="14" /></button>
                      <button v-if="canApproveOutbound" class="btn btn-ghost btn-sm" style="color:var(--color-info)" @click="handleApproveOutbound(order.id)">审批</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleCancelOutbound(order.id)">取消</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteOutbound(order.id)"><Icon name="trash" :size="14" /></button>
                    </template>
                    <template v-if="(order.outStatus || order.status) === 'approved'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleConfirmOutbound(order.id)">确认出库</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleCancelOutbound(order.id)">取消</button>
                    </template>
                    <template v-if="(order.outStatus || order.status) === 'confirmed'">
                      <button class="btn btn-ghost btn-sm" @click="handlePrintOutbound(order)">打印</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-purple)" @click="handleReverseOutbound(order.id)">冲销</button>
                    </template>
                    <template v-if="(order.outStatus || order.status) === 'cancelled' || (order.outStatus || order.status) === 'reversed'">
                      <button class="btn btn-ghost btn-sm" @click="handlePrintOutbound(order)">打印</button>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="outboundView === 'list'" class="panel-card" style="margin-top:var(--space-3)">
        <div class="panel-card-header">
          <span class="panel-card-title">出库列表视图</span>
          <span class="result-count">共 {{ filteredOutboundOrders.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div v-for="order in paginatedOutbound" :key="order.id" class="outbound-list-item" style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="color:var(--color-accent)">{{ order.outboundNo || order.orderNo }}</strong>
                <span style="margin-left:var(--space-2);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">{{ order.materialName || '-' }}</span>
              </div>
              <span class="status-badge" :class="'status-' + (order.outStatus || order.status)">{{ inventoryStore.OUTBOUND_STATUS_LABELS[order.outStatus || order.status] || (order.outStatus || order.status) }}</span>
            </div>
            <div style="display:flex;gap:var(--space-4);margin-top:var(--space-1);font-size:var(--font-size-xs);color:var(--color-text-tertiary)">
              <span>类型: {{ outboundTypeLabel(order.outType || order.type) }}</span>
              <span>数量: {{ (order.outQty || 0).toFixed(2) }}kg</span>
              <span>日期: {{ order.date || '-' }}</span>
            </div>
          </div>
          <div v-if="filteredOutboundOrders.length === 0" class="empty-cell" style="padding:var(--space-8)"><Icon name="package" :size="32" /> 暂无出库记录</div>
        </div>
      </div>

      <div v-if="outboundView === 'card'" style="margin-top:var(--space-3)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <span style="font-size:var(--font-size-sm);color:var(--color-text-tertiary)">共 {{ filteredOutboundOrders.length }} 条</span>
        </div>
        <div v-if="filteredOutboundOrders.length === 0" class="empty-cell" style="padding:var(--space-8);text-align:center"><Icon name="package" :size="32" /> 暂无出库记录</div>
        <div v-else class="outbound-card-grid">
          <div v-for="order in paginatedOutbound" :key="order.id" class="outbound-card-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
              <strong>{{ order.outboundNo || order.orderNo }}</strong>
              <span class="status-badge" :class="'status-' + (order.outStatus || order.status)">{{ inventoryStore.OUTBOUND_STATUS_LABELS[order.outStatus || order.status] || (order.outStatus || order.status) }}</span>
            </div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">
              <div><span class="detail-label">物料</span> {{ order.materialName || '-' }}</div>
              <div><span class="detail-label">数量</span> {{ (order.outQty || 0).toFixed(2) }} kg</div>
              <div><span class="detail-label">金额</span> {{ formatNumber(order.outAmount || 0) }} 元</div>
              <div><span class="detail-label">日期</span> {{ order.date || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="outboundView === 'calendar'" class="panel-card" style="margin-top:var(--space-3)">
        <div class="panel-card-header">
          <button class="btn btn-ghost btn-sm" @click="outboundCalPrev"><Icon name="chevronLeft" :size="14" /></button>
          <span class="panel-card-title">{{ outboundCalYear }}年{{ outboundCalMonth + 1 }}月</span>
          <button class="btn btn-ghost btn-sm" @click="outboundCalNext"><Icon name="chevronRight" :size="14" /></button>
          <button class="btn btn-ghost btn-sm" @click="outboundCalToday">今天</button>
        </div>
        <div class="panel-card-body no-padding" v-safe-html="outboundCalHtml"></div>
      </div>

      <div class="pagination-bar" v-if="outboundView !== 'calendar' && outboundTotalPages > 1">
        <span class="page-info">共 {{ filteredOutboundOrders.length }} 条</span>
        <button class="pagination-btn" :disabled="outboundPage <= 1" @click="outboundPage = 1">«</button>
        <button class="pagination-btn" :disabled="outboundPage <= 1" @click="outboundPage--">‹</button>
        <button v-for="p in outboundVisiblePages" :key="p" class="pagination-btn" :class="{ active: p === outboundPage }" @click="outboundPage = p">{{ p }}</button>
        <button class="pagination-btn" :disabled="outboundPage >= outboundTotalPages" @click="outboundPage++">›</button>
        <button class="pagination-btn" :disabled="outboundPage >= outboundTotalPages" @click="outboundPage = outboundTotalPages">»</button>
        <select v-model="outboundPageSize" class="form-select" style="width:auto;font-size:var(--font-size-xs);padding:2px 4px">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
          <option :value="100">100条/页</option>
        </select>
      </div>
    </div>

    <!-- 自定义确认弹窗 -->
    <Teleport to="body">
      <div v-if="confirmDialog.show" class="wizard-overlay" @click.self="handleConfirmCancel">
        <div class="wizard-modal" style="max-width:400px">
          <div class="wizard-header">
            <h3>{{ confirmDialog.title }}</h3>
            <button class="btn btn-ghost btn-sm" @click="handleConfirmCancel"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body" style="text-align:center;padding:24px">
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmDialog.message }}</div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="handleConfirmCancel">取消</button>
            <button class="btn btn-primary" @click="handleConfirmOk">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 内联消息提示 -->
    <div v-if="inlineMessage.show" class="inline-message" :class="'inline-' + inlineMessage.type">
      {{ inlineMessage.message }}
    </div>

    <!-- 出库向导模态框 -->
    <Teleport to="body">
      <div v-if="showOutboundWizard" class="wizard-overlay" @click.self="closeOutboundWizard">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3><Icon name="download" :size="14" /> {{ editingOutboundId ? '编辑出库单' : '出库登记' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closeOutboundWizard"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <div class="form-section-title"><Icon name="list" :size="14" /> 出库基本信息</div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">出库单号 <span class="required">*</span></label>
                <input v-model="outboundForm.outboundNo" type="text" class="form-input" :readonly="true" style="opacity:0.7;cursor:not-allowed" />
              </div>
              <div class="form-group">
                <label class="form-label">出库类型 <span class="required">*</span></label>
                <select v-model="outboundForm.outType" class="form-select">
                  <option value="">请选择</option>
                  <option value="production">生产领用</option>
                  <option value="sales">销售出库</option>
                  <option value="transfer">调拨出库</option>
                  <option value="scrap">报废出库</option>
                  <option value="sample">样品出库</option>
                  <option value="return">退货出库</option>
                </select>
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">出库日期 <span class="required">*</span></label>
                <input v-model="outboundForm.date" type="date" class="form-input" :max="new Date().toISOString().split('T')[0]" />
              </div>
              <div class="form-group">
                <label class="form-label">关联单号</label>
                <input v-model="outboundForm.referenceId" type="text" class="form-input" placeholder="生产工单/销售订单/调拨单号" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">出库仓库 <span class="required">*</span></label>
                <DataSelect module="warehouse" v-model="outboundForm.warehouseId"
                  value-field="id" label-field="name" placeholder="选择仓库"
                  @change="onWarehouseChange" />
              </div>
              <div class="form-group">
                <label class="form-label">库位</label>
                <DataSelect module="warehouseLocation" variant="byWarehouse" v-model="outboundForm.locationId"
                  value-field="id" label-field="locationCode" placeholder="选择库位"
                  :parent-filters="locationParentFilters" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">备注</label>
                <input v-model="outboundForm.notes" type="text" class="form-input" placeholder="特殊说明" />
              </div>
            </div>

            <div class="form-section-title" style="margin-top:var(--space-4)"><Icon name="package" :size="14" /> 物料信息</div>
            <div class="form-group">
              <label class="form-label">物料编码 <span class="required">*</span></label>
              <DataSelect module="inventory" variant="inStock" v-model="outboundForm.materialCode"
                value-field="code" label-field="name" placeholder="选择物料"
                @change="onMaterialChange" />
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">物料名称</label>
                <input v-model="outboundForm.materialName" type="text" class="form-input" placeholder="自动填充，可修改" />
              </div>
              <div class="form-group">
                <label class="form-label">牌号</label>
                <input v-model="outboundForm.grade" type="text" class="form-input" placeholder="自动填充，可修改" />
              </div>
              <div class="form-group">
                <label class="form-label">颜色</label>
                <input v-model="outboundForm.color" type="text" class="form-input" placeholder="自动填充，可修改" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">出库数量(kg) <span class="required">*</span></label>
                <input v-model.number="outboundForm.outQty" type="number" class="form-input" min="0" step="0.01" />
                <div v-if="outboundForm.materialCode" style="font-size:11px;margin-top:4px;color:var(--color-text-tertiary)">当前库存: <strong :style="{ color: selectedOutboundItemStock > 0 ? 'var(--color-success)' : 'var(--color-danger)' }">{{ selectedOutboundItemStock.toFixed(1) }} kg</strong></div>
              </div>
              <div class="form-group">
                <label class="form-label">单价(元/kg)</label>
                <input v-model.number="outboundForm.unitPrice" type="number" class="form-input" min="0" step="0.01" />
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">出库金额(元)</label>
                <input :value="outboundAmountDisplay" type="text" class="form-input" readonly style="opacity:0.8;font-weight:700;color:var(--color-accent)" />
              </div>
              <div class="form-group">
                <label class="form-label">批号/批次号</label>
                <input v-model="outboundForm.batchNo" type="text" class="form-input" placeholder="如: B202501001" />
              </div>
            </div>

            <div v-if="outboundErrors.length > 0" class="form-errors">
              <div v-for="(err, idx) in outboundErrors" :key="idx" class="form-error"><Icon name="warning" :size="14" /> {{ err }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeOutboundWizard">取消</button>
            <button class="btn btn-secondary" @click="handleSaveOutboundDraft"><Icon name="save" :size="14" /> 保存草稿</button>
            <button class="btn btn-primary" @click="handleSubmitOutbound"><Icon name="check" :size="14" /> 提交出库</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 出库单详情弹窗 -->
    <Teleport to="body">
      <div v-if="viewDetail && selectedOrder" class="wizard-overlay" @click.self="viewDetail = false">
        <div class="wizard-modal">
          <div class="wizard-header">
            <h3><Icon name="download" :size="14" /> 出库单详情</h3>
            <button class="btn btn-ghost btn-sm" @click="viewDetail = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <div class="form-section-title"><Icon name="list" :size="14" /> 基本信息</div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">出库单号</span><span class="detail-value cell-mono">{{ selectedOrder.outboundNo || selectedOrder.orderNo || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">出库类型</span><span class="detail-value">{{ outboundTypeLabel(selectedOrder.outType || selectedOrder.type) }}</span></div>
              <div class="detail-item"><span class="detail-label">出库状态</span><span class="status-badge" :class="'status-' + (selectedOrder.outStatus || selectedOrder.status)">{{ inventoryStore.OUTBOUND_STATUS_LABELS[selectedOrder.outStatus || selectedOrder.status] || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">出库日期</span><span class="detail-value">{{ selectedOrder.date || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">关联单号</span><span class="detail-value cell-mono">{{ selectedOrder.referenceId || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">仓库</span><span class="detail-value">{{ selectedOrder.warehouseId || '-' }}</span></div>
            </div>
            <div class="form-section-title" style="margin-top:var(--space-4)"><Icon name="package" :size="14" /> 物料信息</div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">物料编码</span><span class="detail-value cell-mono">{{ selectedOrder.materialCode || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">物料名称</span><span class="detail-value">{{ selectedOrder.materialName || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">牌号</span><span class="detail-value">{{ selectedOrder.grade || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">颜色</span><span class="detail-value">{{ selectedOrder.color || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">出库数量</span><span class="detail-value cell-mono">{{ (selectedOrder.outQty || 0).toFixed(2) }} kg</span></div>
              <div class="detail-item"><span class="detail-label">单价</span><span class="detail-value cell-mono">{{ (selectedOrder.unitPrice || 0).toFixed(2) }} 元/kg</span></div>
              <div class="detail-item"><span class="detail-label">出库金额</span><span class="detail-value cell-mono" style="font-weight:700;color:var(--color-accent)">{{ formatNumber(selectedOrder.outAmount || 0) }} 元</span></div>
              <div class="detail-item"><span class="detail-label">批号</span><span class="detail-value">{{ selectedOrder.batchNo || '-' }}</span></div>
            </div>
            <div class="form-section-title" style="margin-top:var(--space-4)"><Icon name="clock" :size="14" /> 操作记录</div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">创建时间</span><span class="detail-value">{{ selectedOrder.createdAt || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">更新时间</span><span class="detail-value">{{ selectedOrder.updatedAt || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">审批人</span><span class="detail-value">{{ selectedOrder.approvedBy || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">审批时间</span><span class="detail-value">{{ selectedOrder.approvedAt || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">确认人</span><span class="detail-value">{{ selectedOrder.confirmedBy || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">确认时间</span><span class="detail-value">{{ selectedOrder.confirmedAt || '-' }}</span></div>
            </div>
            <div v-if="selectedOrder.notes" style="margin-top:var(--space-4)">
              <div class="form-section-title"><Icon name="edit" :size="14" /> 备注</div>
              <div style="padding:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--color-text-secondary)">{{ selectedOrder.notes }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="viewDetail = false">关闭</button>
            <button class="btn btn-primary" @click="handlePrintOutbound(selectedOrder)"><Icon name="print" :size="14" /> 打印</button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePermission } from '@/utils/permissionGuard'
import DataSelect from '@/components/DataSelect.vue'
import { escapeHtml, formatNumber } from '@/utils/format'

const emit = defineEmits([])

const inventoryStore = useInventoryStore()
const perm = usePermission()

const canOutbound = computed(() => perm.isAllowed('outbound', 'outboundCreate'))
const canApproveOutbound = computed(() => perm.isAllowed('outbound', 'outboundApprove'))

/* 出库记录列配置 */
const outboundColumnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'outboundNo', label: '出库单号' },
  { key: 'outboundType', label: '出库类型' },
  { key: 'materialCode', label: '物料编码' },
  { key: 'materialName', label: '物料名称' },
  { key: 'grade', label: '牌号' },
  { key: 'color', label: '颜色' },
  { key: 'outboundDate', label: '出库日期' },
  { key: 'outQty', label: '出库数量(kg)' },
  { key: 'unitPrice', label: '单价(元/kg)' },
  { key: 'outAmount', label: '出库金额(元)' },
  { key: 'relatedNo', label: '关联单号' },
  { key: 'outStatus', label: '出库状态' },
  { key: 'actions', label: '操作', hideable: false }
]
const outboundColumnVisible = ref(Object.fromEntries(outboundColumnDefs.filter(c => c.hideable !== false).map(c => [c.key, true])))

const outboundSearch = ref('')
const outboundTypeFilter = ref('')
const outboundStatusFilter = ref('')
const outboundPage = ref(1)
const outboundPageSize = ref(20)
const outboundView = ref('table')
const outboundViewMenuOpen = ref(false)

function closeOutboundViewMenu() {
  if (outboundViewMenuOpen.value) outboundViewMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeOutboundViewMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeOutboundViewMenu))

const outboundSelectAll = ref(false)
const outboundSelectedIds = ref([])
const editingOutboundId = ref(null)
const outboundCalYear = ref(new Date().getFullYear())
const outboundCalMonth = ref(new Date().getMonth())

const showOutboundWizard = ref(false)
const viewDetail = ref(false)
const selectedOrder = ref(null)
const outboundForm = reactive({
  date: new Date().toISOString().split('T')[0],
  outType: '', materialCode: '', materialName: '',
  grade: '', color: '',
  outQty: 0, unitPrice: 0, notes: '',
  outboundNo: '', referenceId: '', warehouseId: 'main', locationId: '', batchNo: ''
})
const outboundErrors = ref([])

/* 自定义确认弹窗 */
const confirmDialog = ref({ show: false, title: '', message: '', onConfirm: null })
function showConfirmDialog(title, message, onConfirm) {
  confirmDialog.value = { show: true, title, message, onConfirm }
}
function handleConfirmOk() {
  if (confirmDialog.value.onConfirm) confirmDialog.value.onConfirm()
  confirmDialog.value.show = false
}
function handleConfirmCancel() {
  confirmDialog.value.show = false
}

/* 内联消息提示 */
const inlineMessage = ref({ show: false, type: 'warning', message: '' })
let inlineTimer = null
function showInlineMessage(type, message) {
  inlineMessage.value = { show: true, type, message }
  if (inlineTimer) clearTimeout(inlineTimer)
  inlineTimer = setTimeout(() => { inlineMessage.value.show = false }, 3000)
}

const filteredOutboundOrders = computed(() => {
  let list = inventoryStore.outboundOrders
  const search = outboundSearch.value.toLowerCase()
  if (search) {
    list = list.filter(o => {
      const items = getParsedItems(o)
      const mc = o.materialCode || (items[0] ? items[0].code : '') || ''
      const mn = o.materialName || (items[0] ? items[0].name : '') || ''
      return [o.outboundNo || o.orderNo, mc, mn, o.grade || '', o.color || ''].join(' ').toLowerCase().includes(search)
    })
  }
  if (outboundTypeFilter.value) {
    list = list.filter(o => (o.outType || o.type) === outboundTypeFilter.value)
  }
  if (outboundStatusFilter.value) {
    list = list.filter(o => (o.outStatus || o.status) === outboundStatusFilter.value)
  }
  return list
})

const outboundTotalPages = computed(() => Math.max(1, Math.ceil(filteredOutboundOrders.value.length / outboundPageSize.value)))
const paginatedOutbound = computed(() => {
  const start = (outboundPage.value - 1) * outboundPageSize.value
  return filteredOutboundOrders.value.slice(start, start + outboundPageSize.value)
})

const selectedOutboundItemStock = computed(() => {
  if (!outboundForm.materialCode) return 0
  const item = inventoryStore.enrichedInventory.find(i => i.code === outboundForm.materialCode)
  return item ? item.stock : 0
})

const outboundMonthAmount = computed(() => {
  const now = new Date()
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  return inventoryStore.outboundOrders.filter(o => (o.outStatus || o.status) === 'confirmed' && (o.date || '').startsWith(ym)).reduce((s, o) => s + Math.abs(o.outAmount || 0), 0)
})

const outboundApprovedCount = computed(() => inventoryStore.outboundOrders.filter(o => (o.outStatus || o.status) === 'approved').length)

const outboundSelectedPendingCount = computed(() => {
  return outboundSelectedIds.value.filter(id => {
    const o = inventoryStore.outboundOrders.find(x => x.id === id)
    const st = o ? (o.outStatus || o.status) : ''
    return st === 'pending_review' || st === 'pending'
  }).length
})

const outboundSelectedApprovedCount = computed(() => {
  return outboundSelectedIds.value.filter(id => {
    const o = inventoryStore.outboundOrders.find(x => x.id === id)
    return o && (o.outStatus || o.status) === 'approved'
  }).length
})

const outboundAmountDisplay = computed(() => ((outboundForm.outQty || 0) * (outboundForm.unitPrice || 0)).toFixed(2))

const outboundVisiblePages = computed(() => {
  const total = outboundTotalPages.value
  const current = outboundPage.value
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const outboundCalHtml = computed(() => {
  const year = outboundCalYear.value
  const month = outboundCalMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  const itemsByDate = {}
  for (const o of inventoryStore.outboundOrders) {
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
        html += '<div style="font-size:10px;color:var(--color-text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(di.outboundNo || di.orderNo) + '</div>'
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

function outboundTypeLabel(type) {
  const found = inventoryStore.OUTBOUND_TYPES.find(t => t.value === type)
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

function openOutboundWizard() {
  editingOutboundId.value = null
  Object.assign(outboundForm, {
    date: new Date().toISOString().split('T')[0],
    outType: '', materialCode: '', materialName: '',
    grade: '', color: '',
    outQty: 0, unitPrice: 0, notes: '',
    outboundNo: inventoryStore.generateOutboundNo(),
    referenceId: '', warehouseId: 'main', locationId: '', batchNo: ''
  })
  outboundErrors.value = []
  showOutboundWizard.value = true
}

function closeOutboundWizard() {
  showOutboundWizard.value = false
  outboundErrors.value = []
}

function onOutboundMaterialChange() {
  const item = inventoryStore.enrichedInventory.find(i => i.code === outboundForm.materialCode)
  if (item) {
    outboundForm.materialName = item.name
    outboundForm.grade = item.grade || item.brand || ''
    outboundForm.color = item.color || ''
    outboundForm.unitPrice = item.unitCost || 0
  }
}

/* DataSelect 物料变更处理：接收 { value, data, option } */
function onMaterialChange({ data }) {
  if (data) {
    outboundForm.materialName = data.name || ''
    outboundForm.grade = data.grade || data.brand || ''
    outboundForm.color = data.color || ''
    outboundForm.unitPrice = data.unitCost || 0
  }
}

/* 仓库→库位级联过滤的计算属性 */
const locationParentFilters = computed(() => {
  const warehouseId = outboundForm.warehouseId
  if (!warehouseId) return []
  /* 通过 inventoryStore.warehouses 映射 warehouseId → warehouseName */
  const wh = inventoryStore.warehouses.find(w => w.id === warehouseId)
  const warehouseName = wh ? wh.warehouseName : ''
  return warehouseName ? [{ field: 'warehouseName', value: warehouseName }] : []
})

/* DataSelect 仓库变更处理 */
function onWarehouseChange() {
  /* 仓库变更时清空库位选择，避免库位与仓库不匹配 */
  outboundForm.locationId = ''
}

function handleSubmitOutbound() {
  if (!outboundForm.outType) { outboundErrors.value = ['请选择出库类型']; return }
  if (!outboundForm.materialCode) { outboundErrors.value = ['请选择物料编码']; return }
  if (!outboundForm.outQty || outboundForm.outQty <= 0) { outboundErrors.value = ['出库数量必须大于0']; return }
  if (!outboundForm.date) { outboundErrors.value = ['请选择出库日期']; return }
  if (outboundForm.date > new Date().toISOString().split('T')[0]) { outboundErrors.value = ['出库日期不能是未来日期']; return }
  if (!outboundForm.warehouseId) { outboundErrors.value = ['请选择出库仓库']; return }
  const outNo = outboundForm.outboundNo || inventoryStore.generateOutboundNo()
  const dupOrder = inventoryStore.outboundOrders.find(o => o.outboundNo === outNo && o.id !== (editingOutboundId.value || ''))
  if (dupOrder) { outboundErrors.value = ['出库单号 ' + outNo + ' 已存在']; return }
  if (editingOutboundId.value) {
    const result = inventoryStore.updateOutboundOrder(editingOutboundId.value, {
      ...outboundForm, outboundNo: outNo, orderNo: outNo,
      outAmount: outboundForm.outQty * outboundForm.unitPrice
    })
    if (result.success) {
      inventoryStore.addAuditLog('update', 'outbound', '更新出库单: ' + outNo)
      closeOutboundWizard()
    } else {
      outboundErrors.value = [result.error || '更新失败']
    }
  } else {
    const result = inventoryStore.submitOutboundOrder({
      ...outboundForm, outboundNo: outNo, orderNo: outNo,
      outAmount: outboundForm.outQty * outboundForm.unitPrice
    })
    if (result.success) {
      inventoryStore.addAuditLog('create', 'outbound', '创建出库单: ' + outNo)
      closeOutboundWizard()
    } else {
      outboundErrors.value = result.errors || ['提交失败']
    }
  }
}

function handleSaveOutboundDraft() {
  const outNo = outboundForm.outboundNo || inventoryStore.generateOutboundNo()
  const result = inventoryStore.saveOutboundDraft({
    ...outboundForm, outboundNo: outNo, orderNo: outNo,
    outAmount: outboundForm.outQty * outboundForm.unitPrice
  })
  if (result.success) {
    inventoryStore.addAuditLog('create', 'outbound', '保存出库草稿: ' + outNo)
    closeOutboundWizard()
  } else {
    outboundErrors.value = ['保存草稿失败']
  }
}

function handleApproveOutbound(orderId) {
  const result = inventoryStore.approveOutbound(orderId)
  if (result.success) {
    inventoryStore.addAuditLog('approve', 'outbound', '审批出库单')
  } else {
    showInlineMessage('error', result.error || '审批失败')
  }
}

function handleConfirmOutbound(orderId) {
  const result = inventoryStore.confirmOutbound(orderId)
  if (result.success) {
    inventoryStore.addAuditLog('confirm', 'outbound', '确认出库')
  } else {
    showInlineMessage('error', result.error || '确认出库失败')
  }
}

function handleCancelOutbound(orderId) {
  showConfirmDialog('确认取消', '确认取消该出库单？此操作不可撤销。', () => {
    const result = inventoryStore.cancelOutbound(orderId)
    if (result) {
      inventoryStore.addAuditLog('cancel', 'outbound', '取消出库单')
    }
  })
}

function handleDeleteOutbound(id) {
  showConfirmDialog('确认删除', '确认删除该出库单？', () => {
    const order = inventoryStore.outboundOrders.find(o => o.id === id)
    inventoryStore.deleteOutboundOrder(id)
    inventoryStore.addAuditLog('delete', 'outbound', '删除出库单: ' + (order ? order.outboundNo : id))
  })
}

function toggleOutboundSelectAll() {
  outboundSelectedIds.value = outboundSelectAll.value ? paginatedOutbound.value.map(o => o.id) : []
}

function handleBatchApproveOutbound() {
  const pendingIds = outboundSelectedIds.value.filter(id => {
    const o = inventoryStore.outboundOrders.find(x => x.id === id)
    const st = o ? (o.outStatus || o.status) : ''
    return st === 'pending_review' || st === 'pending'
  })
  if (pendingIds.length === 0) { showInlineMessage('warning', '请选择待审核的出库单'); return }
  showConfirmDialog('批量审批', '确认批量审批选中的 ' + pendingIds.length + ' 条待审核出库单？', () => {
    const count = inventoryStore.batchApproveOutbound(pendingIds)
    outboundSelectedIds.value = []
    outboundSelectAll.value = false
    inventoryStore.addAuditLog('batchApprove', 'outbound', '批量审批出库单: ' + count + '条')
  })
}

function handleBatchConfirmOutbound() {
  const approvedIds = outboundSelectedIds.value.filter(id => {
    const o = inventoryStore.outboundOrders.find(x => x.id === id)
    return o && (o.outStatus || o.status) === 'approved'
  })
  if (approvedIds.length === 0) { showInlineMessage('warning', '请选择已审核的出库单'); return }
  showConfirmDialog('批量确认出库', '确认批量出库选中的记录？库存将相应扣减。', () => {
    const count = inventoryStore.batchConfirmOutbound(approvedIds)
    outboundSelectedIds.value = []
    outboundSelectAll.value = false
    inventoryStore.addAuditLog('batchConfirm', 'outbound', '批量确认出库: ' + count + '条')
  })
}

function handleExportOutbound() {
  const data = filteredOutboundOrders.value.map(o => ({
    出库单号: o.outboundNo || o.orderNo, 出库类型: outboundTypeLabel(o.outType || o.type),
    物料编码: o.materialCode || '', 物料名称: o.materialName || '',
    牌号: o.grade || '', 颜色: o.color || '',
    出库日期: o.date || '', 出库数量: (o.outQty || 0).toFixed(2),
    单价: (o.unitPrice || 0).toFixed(2), 出库金额: (o.outAmount || 0).toFixed(2),
    关联单号: o.referenceId || '', 状态: inventoryStore.OUTBOUND_STATUS_LABELS[o.outStatus || o.status] || ''
  }))
  /* CSV导出（含UTF-8 BOM） */
  const headers = Object.keys(data[0] || {})
  const csvRows = [headers.join(',')]
  for (const row of data) {
    csvRows.push(headers.map(h => '"' + String(row[h] || '').replace(/"/g, '""') + '"').join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '出库数据_' + new Date().toISOString().split('T')[0] + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportSelectedOutbound() {
  const selected = filteredOutboundOrders.value.filter(o => outboundSelectedIds.value.includes(o.id))
  const data = selected.map(o => ({
    出库单号: o.outboundNo || o.orderNo, 物料: o.materialName || '',
    数量: (o.outQty || 0).toFixed(2), 金额: (o.outAmount || 0).toFixed(2),
    状态: inventoryStore.OUTBOUND_STATUS_LABELS[o.outStatus || o.status] || ''
  }))
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '出库选中数据.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleReverseOutbound(orderId) {
  showConfirmDialog('确认冲销', '确认冲销该出库单？库存将恢复，此操作不可撤销。', () => {
    const result = inventoryStore.reverseOutboundOrder(orderId)
    if (result.success) {
      inventoryStore.addAuditLog('reverse', 'outbound', '冲销出库单: ' + (result.reverseOrder ? result.reverseOrder.outboundNo : ''))
    } else {
      showInlineMessage('error', result.error || '冲销失败')
    }
  })
}

function handlePrintOutbound(order) {
  const typeLabel = outboundTypeLabel(order.outType || order.type)
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>出库单 - ' + (order.outboundNo || order.orderNo) + '</title><style>body{font-family:"SimSun","Microsoft YaHei",serif;font-size:12pt;line-height:1.8;color:#000;margin:0;padding:20mm}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #333;padding:6px 8px;text-align:center;font-size:10.5pt}th{background:#f0f0f0;font-weight:bold}.title{text-align:center;font-size:20pt;font-weight:bold;letter-spacing:6px;margin-bottom:4px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10.5pt;margin:10px 0}.sign{margin-top:40px;display:flex;justify-content:space-between;font-size:10.5pt}.sign-line{display:inline-block;width:140px;border-bottom:1px solid #333}@page{size:A4;margin:15mm}</style></head><body>')
  printWindow.document.write('<div class="title">苏州冠久新材料科技有限公司</div><div class="title" style="font-size:16pt">出 库 单</div>')
  printWindow.document.write('<div class="info-grid"><div>出库单号: ' + (order.outboundNo || order.orderNo) + '</div><div>出库类型: ' + typeLabel + '</div><div>出库日期: ' + (order.date || '-') + '</div><div>物料: ' + (order.materialName || '-') + '</div><div>出库数量: ' + (order.outQty || 0).toFixed(2) + ' kg</div><div>出库金额: ' + (order.outAmount || 0).toFixed(2) + ' 元</div><div>仓库: ' + (order.warehouseId || '-') + '</div><div>牌号: ' + (order.grade || '-') + '</div><div>颜色: ' + (order.color || '-') + '</div><div>批号: ' + (order.batchNo || '-') + '</div><div>状态: ' + (inventoryStore.OUTBOUND_STATUS_LABELS[order.outStatus || order.status] || '') + '</div><div>备注: ' + (order.notes || '-') + '</div></div>')
  printWindow.document.write('<div class="sign"><div>制单人: <span class="sign-line"></span></div><div>审核人: <span class="sign-line"></span></div><div>仓管人: <span class="sign-line"></span></div><div>领用人: <span class="sign-line"></span></div></div>')
  printWindow.document.write('<div style="text-align:right;font-size:9pt;color:#999;margin-top:20px">打印时间: ' + new Date().toLocaleString('zh-CN') + '</div>')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
  inventoryStore.addAuditLog('print', 'outbound', '打印出库单: ' + (order.outboundNo || order.orderNo))
}

function openEditOutbound(order) {
  editingOutboundId.value = order.id
  Object.assign(outboundForm, {
    date: order.date || '',
    outType: order.outType || order.type || '',
    materialCode: order.materialCode || '',
    materialName: order.materialName || '',
    grade: order.grade || '',
    color: order.color || '',
    outQty: order.outQty || 0,
    unitPrice: order.unitPrice || 0,
    notes: order.notes || '',
    outboundNo: order.outboundNo || order.orderNo || '',
    referenceId: order.referenceId || '',
    warehouseId: order.warehouseId || 'main',
    locationId: order.locationId || '',
    batchNo: order.batchNo || ''
  })
  outboundErrors.value = []
  showOutboundWizard.value = true
}

function handleViewOutbound(order) {
  selectedOrder.value = order
  viewDetail.value = true
}

function outboundCalPrev() {
  outboundCalMonth.value--
  if (outboundCalMonth.value < 0) { outboundCalMonth.value = 11; outboundCalYear.value-- }
}

function outboundCalNext() {
  outboundCalMonth.value++
  if (outboundCalMonth.value > 11) { outboundCalMonth.value = 0; outboundCalYear.value++ }
}

function outboundCalToday() {
  outboundCalYear.value = new Date().getFullYear()
  outboundCalMonth.value = new Date().getMonth()
}

defineExpose({
  openOutboundWizard
})
</script>

<style scoped>
/* 手风琴折叠面板 */
.inv-section {
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}
.inv-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.inv-section-header:hover {
  background: var(--color-surface-hover);
}
.inv-section-icon { font-size: 1.3em; line-height: 1; }
.inv-section-title { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text-primary); flex: 1; }
.inv-section-count { font-size: var(--font-size-sm); color: var(--color-text-secondary); background: var(--color-surface); padding: 2px var(--space-2); border-radius: var(--radius-sm); }
.inv-section-toggle { font-size: var(--font-size-sm); color: var(--color-text-secondary); width: 20px; text-align: center; }
.inv-section-body { padding: var(--space-3); }

/* 统计卡片 */
.inv-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.inv-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.inv-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.inv-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}
.inv-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* 入库/出库头部（出库复用 outbound-header 样式名） */
.outbound-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}
.outbound-header-info h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.outbound-header-info p {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}
.outbound-header-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}

/* 批量操作栏 */
.outbound-bulk-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.filter-bar .form-input {
  flex: 1;
  min-width: 200px;
}
.filter-select {
  min-width: 120px;
}

/* 表格 */
.inv-table-wrap {
  overflow-x: auto;
}
.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.inv-table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  font-size: var(--font-size-sm);
  letter-spacing: 0.02em;
}
.inv-table td {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  vertical-align: middle;
}
.inv-table tr:hover td {
  background: var(--color-surface-hover);
}
.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}
.cell-actions {
  white-space: nowrap;
}
.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
}

/* 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
}
.status-draft {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}
.status-pending,
.status-pending_review {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.status-inspecting {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.status-confirmed {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-approved {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.status-cancelled {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.status-reversed {
  background: var(--color-purple-subtle, rgba(128,0,128,0.1));
  color: var(--color-purple, #9c27b0);
}

/* 分页 */
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
.pagination-btn {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.pagination-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}
.pagination-btn.active {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 列表视图 */
.outbound-list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}
.outbound-list-item:hover {
  background: var(--color-surface-hover);
}

/* 卡片视图 */
.outbound-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
.outbound-card-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
}
.outbound-card-item:hover {
  box-shadow: var(--shadow-md);
}

/* 视图切换下拉 */
.view-toggle-dropdown {
  position: relative;
  display: inline-block;
}
.view-toggle-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 100;
  min-width: 120px;
  padding: var(--space-1) 0;
}
.view-toggle-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.view-toggle-menu button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.view-toggle-menu button.active {
  color: var(--color-accent);
  font-weight: 600;
}

/* 向导模态框 */
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}
.wizard-modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.wizard-modal-lg {
  max-width: 960px;
}
.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.wizard-header h3 {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin: 0;
}
.wizard-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}
.wizard-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* 表单 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.required {
  color: var(--color-danger);
}
.form-input,
.form-select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}
.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}
.form-input-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}
.form-row {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.form-row-2 .form-group {
  flex: 1;
}
.form-row-3 .form-group {
  flex: 1;
}
.form-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.form-errors {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-danger-subtle);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.form-error {
  font-size: var(--font-size-base);
  color: var(--color-danger);
  padding: 2px 0;
}

/* 出库库存提示 */
.outbound-stock-hint {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

/* 详情标签 */
.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  margin-right: var(--space-2);
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
.detail-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.detail-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 日历表格 */
.cal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.cal-table th {
  padding: var(--space-2);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}
.cal-table td {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  vertical-align: top;
  min-height: 60px;
  height: 60px;
  font-size: var(--font-size-xs);
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

/* 响应式 */
@media (max-width: 1200px) {
  .inv-stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 内联消息提示 */
.inline-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  z-index: 9999;
  animation: fadeInUp 0.3s ease;
  max-width: 400px;
  text-align: center;
}
.inline-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}
.inline-error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}
.inline-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@media (max-width: 768px) {
  .inv-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
  }
  .outbound-header {
    flex-direction: column;
  }
  .outbound-header-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
