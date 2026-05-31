<template>
  <div class="inventory-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">库存查询系统</h2>
        <p class="page-header-subtitle">库存查询 · 分页浏览</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openInboundWizard">📥 入库登记</button>
        <button class="btn btn-primary" style="background:var(--color-warning);border-color:var(--color-warning)" @click="openOutboundWizard">📤 出库登记</button>
        <button class="btn btn-ghost" @click="handleExport">📥 导出</button>
      </div>
    </div>

    <div class="inv-tabs">
      <button class="inv-tab" :class="{ active: activeTab === 'stock' }" @click="activeTab = 'stock'">📦 库存列表</button>
      <button class="inv-tab" :class="{ active: activeTab === 'inbound' }" @click="activeTab = 'inbound'">📥 入库管理</button>
      <button class="inv-tab" :class="{ active: activeTab === 'outbound' }" @click="activeTab = 'outbound'">📤 出库管理</button>
      <button class="inv-tab" :class="{ active: activeTab === 'alert' }" @click="activeTab = 'alert'">⚠️ 预警中心</button>
    </div>

    <!-- ==================== 库存列表 ==================== -->
    <div v-show="activeTab === 'stock'">
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📦</div>
          <div class="inv-stat-value">{{ inventoryStore.enrichedInventory.length }}</div>
          <div class="inv-stat-label">物料种类</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)">⚖️</div>
          <div class="inv-stat-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</div>
          <div class="inv-stat-label">总库存(kg)</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)">🚫</div>
          <div class="inv-stat-value">{{ inventoryStore.exhaustedCount }}</div>
          <div class="inv-stat-label">库存耗尽</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⚠️</div>
          <div class="inv-stat-value">{{ inventoryStore.lowStockCount }}</div>
          <div class="inv-stat-label">低于安全库存</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-info-subtle);color:var(--color-info)">✅</div>
          <div class="inv-stat-value">{{ inventoryStore.normalStockCount }}</div>
          <div class="inv-stat-label">库存正常</div>
        </div>
      </div>

      <div class="inv-toolbar">
        <div class="inv-search">
          <span class="search-icon">🔍</span>
          <input v-model="stockSearch" type="text" class="search-input" placeholder="搜索物料编码/名称/牌号/颜色..." />
        </div>
        <div class="inv-filters">
          <select v-model="stockCategoryFilter" class="form-select filter-select">
            <option value="">全部类别</option>
            <option v-for="(count, cat) in inventoryStore.categoryCounts" :key="cat" :value="cat">{{ cat }} ({{ count }})</option>
          </select>
          <select v-model="stockAlertFilter" class="form-select filter-select">
            <option value="">全部状态</option>
            <option value="exhausted">耗尽</option>
            <option value="low">低库存</option>
            <option value="ok">正常</option>
            <option value="over">超量</option>
          </select>
          <select v-model="stockWarehouseFilter" class="form-select filter-select">
            <option value="">全部仓库</option>
            <option v-for="(count, wh) in inventoryStore.warehouseCounts" :key="wh" :value="wh">{{ wh }} ({{ count }})</option>
          </select>
        </div>
        <div class="inv-toolbar-right">
          <button class="btn btn-ghost btn-sm" @click="openAddItemModal">+ 新增物料</button>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">库存查询表</span>
          <span class="result-count">共 {{ filteredInventory.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>物料名称</th>
                  <th>牌号</th>
                  <th>颜色</th>
                  <th>最近入库</th>
                  <th @click="toggleStockSort('stock')" style="cursor:pointer">库存(kg) <span class="sort-icon">{{ stockSortIcon }}</span></th>
                  <th>安全库存</th>
                  <th>单价</th>
                  <th>总价值</th>
                  <th>预警状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedInventory.length === 0">
                  <td colspan="11" class="empty-cell">暂无库存数据</td>
                </tr>
                <tr v-for="item in paginatedInventory" :key="item.id">
                  <td class="cell-mono">{{ item.code }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td>{{ item.grade || item.brand || '-' }}</td>
                  <td>{{ item.color || '-' }}</td>
                  <td class="cell-xs">{{ item.lastInboundDate }}</td>
                  <td class="cell-mono" :style="{ color: alertColor(item.alertStatus), fontWeight: item.alertStatus === 'exhausted' || item.alertStatus === 'low' ? 700 : 400 }">{{ item.stock.toFixed(1) }}</td>
                  <td>{{ item.safetyStockVal }}</td>
                  <td>{{ item.unitCost.toFixed(2) }}</td>
                  <td>{{ item.totalValue.toFixed(2) }}</td>
                  <td><span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span></td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" @click="openEditItem(item)">编辑</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteItem(item.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="pagination-bar" v-if="stockTotalPages > 1">
        <span class="page-info">第 {{ stockPage }} / {{ stockTotalPages }} 页，共 {{ filteredInventory.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="stockPage <= 1" @click="stockPage--">◀</button>
          <button class="btn btn-ghost btn-sm" :disabled="stockPage >= stockTotalPages" @click="stockPage++">▶</button>
        </div>
      </div>
    </div>

    <!-- ==================== 入库管理 ==================== -->
    <div v-show="activeTab === 'inbound'">
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📥</div>
          <div class="inv-stat-value">{{ inventoryStore.inboundOrders.length }}</div>
          <div class="inv-stat-label">入库单总数</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⏳</div>
          <div class="inv-stat-value">{{ inventoryStore.pendingInboundCount }}</div>
          <div class="inv-stat-label">待处理</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div>
          <div class="inv-stat-value">{{ inventoryStore.inboundOrders.filter(o => o.status === 'confirmed').length }}</div>
          <div class="inv-stat-label">已入库</div>
        </div>
      </div>

      <div class="inv-toolbar">
        <div class="inv-search">
          <span class="search-icon">🔍</span>
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
          </select>
        </div>
        <div class="inv-toolbar-right">
          <button class="btn btn-primary btn-sm" @click="openInboundWizard">+ 入库登记</button>
        </div>
      </div>

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
                  <th>入库单号</th>
                  <th>入库日期</th>
                  <th>入库类型</th>
                  <th>供应商</th>
                  <th>总重量(kg)</th>
                  <th>总金额(元)</th>
                  <th>状态</th>
                  <th style="min-width:160px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedInbound.length === 0">
                  <td colspan="8" class="empty-cell">暂无入库记录</td>
                </tr>
                <tr v-for="order in paginatedInbound" :key="order.id">
                  <td class="cell-mono"><strong style="color:var(--color-accent)">{{ order.orderNo }}</strong></td>
                  <td>{{ order.date || '-' }}</td>
                  <td>{{ inboundTypeLabel(order.type) }}</td>
                  <td>{{ order.counterpartyName || '-' }}</td>
                  <td class="cell-mono">{{ calcInboundWeight(order).toFixed(2) }}</td>
                  <td class="cell-mono">{{ formatNumber(calcInboundAmount(order)) }}</td>
                  <td><span class="status-badge" :class="'status-' + order.status">{{ inventoryStore.INBOUND_STATUS_LABELS[order.status] || order.status }}</span></td>
                  <td class="cell-actions">
                    <template v-if="order.status === 'draft'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-warning)" @click="handleChangeInboundStatus(order.id, 'pending')">提交审核</button>
                      <button class="btn btn-ghost btn-sm" @click="openEditInbound(order)">编辑</button>
                    </template>
                    <template v-else-if="order.status === 'pending'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-info)" @click="handleChangeInboundStatus(order.id, 'inspecting')">开始质检</button>
                    </template>
                    <template v-else-if="order.status === 'inspecting'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleConfirmInbound(order.id)">确认入库</button>
                    </template>
                    <button class="btn btn-ghost btn-sm" @click="viewInboundDetail(order)">详情</button>
                    <button v-if="order.status === 'draft' || order.status === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteInbound(order.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="pagination-bar" v-if="inboundTotalPages > 1">
        <span class="page-info">第 {{ inboundPage }} / {{ inboundTotalPages }} 页，共 {{ filteredInboundOrders.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="inboundPage <= 1" @click="inboundPage--">◀</button>
          <button class="btn btn-ghost btn-sm" :disabled="inboundPage >= inboundTotalPages" @click="inboundPage++">▶</button>
        </div>
      </div>
    </div>

    <!-- ==================== 出库管理 ==================== -->
    <div v-show="activeTab === 'outbound'">
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📤</div>
          <div class="inv-stat-value">{{ inventoryStore.outboundOrders.length }}</div>
          <div class="inv-stat-label">出库单总数</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⏳</div>
          <div class="inv-stat-value">{{ inventoryStore.pendingOutboundCount }}</div>
          <div class="inv-stat-label">待审核</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div>
          <div class="inv-stat-value">{{ inventoryStore.outboundOrders.filter(o => (o.outStatus || o.status) === 'confirmed').length }}</div>
          <div class="inv-stat-label">已出库</div>
        </div>
      </div>

      <div class="inv-toolbar">
        <div class="inv-search">
          <span class="search-icon">🔍</span>
          <input v-model="outboundSearch" type="text" class="search-input" placeholder="搜索出库单号/物料编码/名称..." />
        </div>
        <div class="inv-filters">
          <select v-model="outboundTypeFilter" class="form-select filter-select">
            <option value="">全部类型</option>
            <option v-for="t in inventoryStore.OUTBOUND_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <select v-model="outboundStatusFilter" class="form-select filter-select">
            <option value="">全部状态</option>
            <option v-for="(label, key) in inventoryStore.OUTBOUND_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="inv-toolbar-right">
          <button class="btn btn-primary btn-sm" @click="openOutboundWizard">+ 出库登记</button>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">出库单列表</span>
          <span class="result-count">共 {{ filteredOutboundOrders.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th>出库单号</th>
                  <th>出库类型</th>
                  <th>物料编码</th>
                  <th>物料名称</th>
                  <th>出库日期</th>
                  <th>出库数量(kg)</th>
                  <th>单价</th>
                  <th>出库金额</th>
                  <th>状态</th>
                  <th style="min-width:140px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedOutbound.length === 0">
                  <td colspan="10" class="empty-cell">暂无出库记录</td>
                </tr>
                <tr v-for="order in paginatedOutbound" :key="order.id">
                  <td class="cell-mono"><strong style="color:var(--color-accent)">{{ order.outboundNo || order.orderNo }}</strong></td>
                  <td>{{ outboundTypeLabel(order.outType || order.type) }}</td>
                  <td class="cell-mono">{{ order.materialCode || '-' }}</td>
                  <td>{{ order.materialName || '-' }}</td>
                  <td>{{ order.date || '-' }}</td>
                  <td class="cell-mono">{{ (order.outQty || 0).toFixed(2) }}</td>
                  <td>{{ (order.unitPrice || 0).toFixed(2) }}</td>
                  <td class="cell-mono">{{ formatNumber(order.outAmount || 0) }}</td>
                  <td><span class="status-badge" :class="'status-' + (order.outStatus || order.status)">{{ inventoryStore.OUTBOUND_STATUS_LABELS[order.outStatus || order.status] || (order.outStatus || order.status) }}</span></td>
                  <td class="cell-actions">
                    <template v-if="(order.outStatus || order.status) === 'pending_review' || (order.outStatus || order.status) === 'pending'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleApproveOutbound(order.id)">审核通过</button>
                    </template>
                    <template v-if="(order.outStatus || order.status) === 'approved'">
                      <button class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="handleConfirmOutbound(order.id)">确认出库</button>
                    </template>
                    <button v-if="(order.outStatus || order.status) !== 'confirmed' && (order.outStatus || order.status) !== 'cancelled'" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleCancelOutbound(order.id)">取消</button>
                    <button v-if="(order.outStatus || order.status) === 'pending_review' || (order.outStatus || order.status) === 'pending'" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDeleteOutbound(order.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="pagination-bar" v-if="outboundTotalPages > 1">
        <span class="page-info">第 {{ outboundPage }} / {{ outboundTotalPages }} 页，共 {{ filteredOutboundOrders.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="outboundPage <= 1" @click="outboundPage--">◀</button>
          <button class="btn btn-ghost btn-sm" :disabled="outboundPage >= outboundTotalPages" @click="outboundPage++">▶</button>
        </div>
      </div>
    </div>

    <!-- ==================== 预警中心 ==================== -->
    <div v-show="activeTab === 'alert'">
      <div class="inv-stats-row">
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)">🚫</div>
          <div class="inv-stat-value">{{ inventoryStore.exhaustedCount }}</div>
          <div class="inv-stat-label">库存耗尽</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⚠️</div>
          <div class="inv-stat-value">{{ inventoryStore.lowStockCount }}</div>
          <div class="inv-stat-label">低库存预警</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-info-subtle);color:var(--color-info)">📊</div>
          <div class="inv-stat-value">{{ inventoryStore.overStockCount }}</div>
          <div class="inv-stat-label">超量库存</div>
        </div>
        <div class="inv-stat-card">
          <div class="inv-stat-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div>
          <div class="inv-stat-value">{{ inventoryStore.normalStockCount }}</div>
          <div class="inv-stat-label">库存正常</div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">⚠️ 预警物料列表</span>
          <span class="result-count">共 {{ inventoryStore.alertItems.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th>物料编码</th>
                  <th>物料名称</th>
                  <th>当前库存</th>
                  <th>安全库存</th>
                  <th>库存缺口</th>
                  <th>预警状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="inventoryStore.alertItems.length === 0">
                  <td colspan="7" class="empty-cell">🎉 所有物料库存正常，无预警信息</td>
                </tr>
                <tr v-for="item in inventoryStore.alertItems" :key="item.id">
                  <td class="cell-mono">{{ item.code }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td :style="{ color: alertColor(item.alertStatus), fontWeight: 700 }">{{ item.stock.toFixed(1) }}</td>
                  <td>{{ item.safetyStockVal }}</td>
                  <td class="cell-mono" style="color:var(--color-danger)">{{ (item.safetyStockVal - item.stock).toFixed(1) }}</td>
                  <td><span class="alert-badge" :class="'alert-' + item.alertStatus">{{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}</span></td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-accent)" @click="quickInboundForItem(item)">快速补货</button>
                    <button class="btn btn-ghost btn-sm" @click="openEditItem(item)">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 新增/编辑物料模态框 ==================== -->
    <Teleport to="body">
      <div v-if="showItemModal" class="wizard-overlay" @click.self="closeItemModal">
        <div class="wizard-modal">
          <div class="wizard-header">
            <h3>{{ editingItemId ? '编辑物料' : '新增物料' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closeItemModal">✕</button>
          </div>
          <div class="wizard-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">物料编码 <span class="required">*</span></label>
                <input v-model="itemForm.code" type="text" class="form-input" placeholder="如 MTL-001" />
              </div>
              <div class="form-group">
                <label class="form-label">物料名称 <span class="required">*</span></label>
                <input v-model="itemForm.name" type="text" class="form-input" placeholder="如 ABS树脂" />
              </div>
              <div class="form-group">
                <label class="form-label">类别</label>
                <select v-model="itemForm.category" class="form-select">
                  <option value="raw">原材料</option>
                  <option value="semi">半成品</option>
                  <option value="finished">成品</option>
                  <option value="consumable">耗材</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">仓库</label>
                <select v-model="itemForm.warehouse" class="form-select">
                  <option value="main">主仓库</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">库存数量(kg)</label>
                <input v-model.number="itemForm.quantity" type="number" class="form-input" min="0" step="0.1" />
              </div>
              <div class="form-group">
                <label class="form-label">安全库存</label>
                <input v-model.number="itemForm.safetyStock" type="number" class="form-input" min="0" step="1" />
              </div>
              <div class="form-group">
                <label class="form-label">最大库存</label>
                <input v-model.number="itemForm.maxStock" type="number" class="form-input" min="0" step="1" />
              </div>
              <div class="form-group">
                <label class="form-label">单价(元/kg)</label>
                <input v-model.number="itemForm.unitCost" type="number" class="form-input" min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label class="form-label">牌号/规格</label>
                <input v-model="itemForm.grade" type="text" class="form-input" placeholder="如 通用级" />
              </div>
              <div class="form-group">
                <label class="form-label">颜色</label>
                <input v-model="itemForm.color" type="text" class="form-input" placeholder="如 自然色" />
              </div>
              <div class="form-group">
                <label class="form-label">库位</label>
                <input v-model="itemForm.location" type="text" class="form-input" placeholder="如 A-01-03" />
              </div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeItemModal">取消</button>
            <button class="btn btn-primary" @click="handleSaveItem">{{ editingItemId ? '保存修改' : '创建物料' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== 入库向导模态框 ==================== -->
    <Teleport to="body">
      <div v-if="showInboundWizard" class="wizard-overlay" @click.self="closeInboundWizard">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3>{{ editingInboundId ? '编辑入库单' : '📥 入库登记' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closeInboundWizard">✕</button>
          </div>
          <div class="wizard-body">
            <div class="form-grid">
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
                <label class="form-label">供应商</label>
                <select v-model="inboundForm.counterpartyId" class="form-select">
                  <option value="">请选择供应商</option>
                  <option v-for="s in inventoryStore.suppliers" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">仓库</label>
                <select v-model="inboundForm.warehouseId" class="form-select">
                  <option value="main">主仓库</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-top:var(--space-4)">
              <label class="form-label">入库明细</label>
              <div class="inbound-items-table">
                <table class="inv-table inv-table-sm">
                  <thead>
                    <tr>
                      <th>物料条码/编码</th>
                      <th>物料名称</th>
                      <th>牌号</th>
                      <th>颜色</th>
                      <th>数量(kg)</th>
                      <th>单价</th>
                      <th>金额</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in inboundFormItems" :key="idx">
                      <td><input v-model="item.code" type="text" class="form-input form-input-sm" placeholder="编码" @change="onInboundItemCodeChange(idx)" /></td>
                      <td><input v-model="item.name" type="text" class="form-input form-input-sm" placeholder="名称" /></td>
                      <td><input v-model="item.grade" type="text" class="form-input form-input-sm" placeholder="牌号" /></td>
                      <td><input v-model="item.color" type="text" class="form-input form-input-sm" placeholder="颜色" /></td>
                      <td><input v-model.number="item.qty" type="number" class="form-input form-input-sm" min="0" step="0.1" style="width:80px" /></td>
                      <td><input v-model.number="item.cost" type="number" class="form-input form-input-sm" min="0" step="0.01" style="width:80px" /></td>
                      <td class="cell-mono">{{ ((item.qty || 0) * (item.cost || 0)).toFixed(2) }}</td>
                      <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="removeInboundItem(idx)">✕</button></td>
                    </tr>
                  </tbody>
                </table>
                <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-2)" @click="addInboundItem">+ 添加明细行</button>
              </div>
            </div>

            <div class="form-group" style="margin-top:var(--space-4)">
              <label class="form-label">备注</label>
              <textarea v-model="inboundForm.notes" class="form-input" rows="2" placeholder="入库备注信息..."></textarea>
            </div>

            <div v-if="inboundErrors.length > 0" class="form-errors">
              <div v-for="(err, idx) in inboundErrors" :key="idx" class="form-error">⚠️ {{ err }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeInboundWizard">取消</button>
            <button class="btn btn-secondary" @click="handleSaveInboundDraft">💾 保存草稿</button>
            <button class="btn btn-primary" @click="handleSubmitInbound">✅ 提交入库</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== 出库向导模态框 ==================== -->
    <Teleport to="body">
      <div v-if="showOutboundWizard" class="wizard-overlay" @click.self="closeOutboundWizard">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3>📤 出库登记</h3>
            <button class="btn btn-ghost btn-sm" @click="closeOutboundWizard">✕</button>
          </div>
          <div class="wizard-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">出库日期 <span class="required">*</span></label>
                <input v-model="outboundForm.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">出库类型 <span class="required">*</span></label>
                <select v-model="outboundForm.outType" class="form-select">
                  <option value="">请选择</option>
                  <option v-for="t in inventoryStore.OUTBOUND_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">出库物料 <span class="required">*</span></label>
                <select v-model="outboundForm.materialCode" class="form-select" @change="onOutboundMaterialChange">
                  <option value="">请选择物料</option>
                  <option v-for="item in inventoryStore.enrichedInventory" :key="item.code" :value="item.code">{{ item.code }} - {{ item.name }} (库存: {{ item.stock.toFixed(1) }}kg)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">客户/收货方</label>
                <input v-model="outboundForm.counterpartyName" type="text" class="form-input" placeholder="客户名称" />
              </div>
              <div class="form-group">
                <label class="form-label">出库数量(kg) <span class="required">*</span></label>
                <input v-model.number="outboundForm.outQty" type="number" class="form-input" min="0" step="0.1" />
              </div>
              <div class="form-group">
                <label class="form-label">单价(元/kg)</label>
                <input v-model.number="outboundForm.unitPrice" type="number" class="form-input" min="0" step="0.01" />
              </div>
            </div>

            <div v-if="outboundForm.materialCode" class="outbound-stock-hint">
              <span>当前库存: </span>
              <strong :style="{ color: selectedOutboundItemStock > 0 ? 'var(--color-success)' : 'var(--color-danger)' }">{{ selectedOutboundItemStock.toFixed(1) }} kg</strong>
              <span style="margin-left:var(--space-3)">出库金额: </span>
              <strong style="color:var(--color-accent)">¥{{ ((outboundForm.outQty || 0) * (outboundForm.unitPrice || 0)).toFixed(2) }}</strong>
            </div>

            <div class="form-group" style="margin-top:var(--space-4)">
              <label class="form-label">备注</label>
              <textarea v-model="outboundForm.notes" class="form-input" rows="2" placeholder="出库备注信息..."></textarea>
            </div>

            <div v-if="outboundErrors.length > 0" class="form-errors">
              <div v-for="(err, idx) in outboundErrors" :key="idx" class="form-error">⚠️ {{ err }}</div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="closeOutboundWizard">取消</button>
            <button class="btn btn-primary" @click="handleSubmitOutbound">✅ 提交出库</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== 入库单详情模态框 ==================== -->
    <Teleport to="body">
      <div v-if="showInboundDetail" class="wizard-overlay" @click.self="showInboundDetail = false">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3>入库单详情</h3>
            <button class="btn btn-ghost btn-sm" @click="showInboundDetail = false">✕</button>
          </div>
          <div class="wizard-body" v-if="detailOrder">
            <div class="detail-info-grid">
              <div class="detail-field"><span class="detail-label">入库单号</span><span class="detail-value cell-mono">{{ detailOrder.orderNo }}</span></div>
              <div class="detail-field"><span class="detail-label">入库日期</span><span class="detail-value">{{ detailOrder.date }}</span></div>
              <div class="detail-field"><span class="detail-label">入库类型</span><span class="detail-value">{{ inboundTypeLabel(detailOrder.type) }}</span></div>
              <div class="detail-field"><span class="detail-label">供应商</span><span class="detail-value">{{ detailOrder.counterpartyName || '-' }}</span></div>
              <div class="detail-field"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge" :class="'status-' + detailOrder.status">{{ inventoryStore.INBOUND_STATUS_LABELS[detailOrder.status] }}</span></span></div>
              <div class="detail-field"><span class="detail-label">总重量</span><span class="detail-value">{{ calcInboundWeight(detailOrder).toFixed(2) }} kg</span></div>
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
                  </tr>
                  <tr v-if="getParsedItems(detailOrder).length === 0">
                    <td colspan="7" class="empty-cell">无明细记录</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="detailOrder.notes" style="margin-top:var(--space-4)">
              <span class="detail-label">备注：</span>
              <span>{{ detailOrder.notes }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'

const route = useRoute()
const inventoryStore = useInventoryStore()

const activeTab = ref(route.query.tab || 'stock')

watch(() => route.query.tab, (tab) => {
  if (tab && ['stock', 'inbound', 'outbound', 'alert'].includes(tab)) {
    activeTab.value = tab
  }
})

const stockSearch = ref('')
const stockCategoryFilter = ref('')
const stockAlertFilter = ref('')
const stockWarehouseFilter = ref('')
const stockPage = ref(1)
const stockPageSize = 15
const stockSortField = ref('')
const stockSortDir = ref('asc')

const inboundSearch = ref('')
const inboundTypeFilter = ref('')
const inboundStatusFilter = ref('')
const inboundPage = ref(1)
const inboundPageSize = 15

const outboundSearch = ref('')
const outboundTypeFilter = ref('')
const outboundStatusFilter = ref('')
const outboundPage = ref(1)
const outboundPageSize = 15

const showItemModal = ref(false)
const editingItemId = ref(null)
const itemForm = reactive({
  code: '', name: '', category: 'raw', warehouse: 'main',
  quantity: 0, safetyStock: 50, maxStock: 0, unitCost: 0,
  grade: '', color: '', location: ''
})

const showInboundWizard = ref(false)
const editingInboundId = ref(null)
const inboundForm = reactive({
  date: new Date().toISOString().split('T')[0],
  type: '', counterpartyId: '', warehouseId: 'main', notes: ''
})
const inboundFormItems = ref([])
const inboundErrors = ref([])

const showOutboundWizard = ref(false)
const outboundForm = reactive({
  date: new Date().toISOString().split('T')[0],
  outType: '', materialCode: '', materialName: '',
  counterpartyName: '', outQty: 0, unitPrice: 0, notes: ''
})
const outboundErrors = ref([])

const showInboundDetail = ref(false)
const detailOrder = ref(null)

const filteredInventory = computed(() => {
  let list = inventoryStore.enrichedInventory
  const search = stockSearch.value.toLowerCase()
  if (search) {
    list = list.filter(i => [i.code, i.name, i.grade, i.brand, i.color].join(' ').toLowerCase().includes(search))
  }
  if (stockCategoryFilter.value) {
    list = list.filter(i => i.category === stockCategoryFilter.value)
  }
  if (stockAlertFilter.value) {
    list = list.filter(i => i.alertStatus === stockAlertFilter.value)
  }
  if (stockWarehouseFilter.value) {
    list = list.filter(i => i.warehouse === stockWarehouseFilter.value)
  }
  if (stockSortField.value) {
    list = [...list].sort((a, b) => {
      const va = a[stockSortField.value]
      const vb = b[stockSortField.value]
      if (typeof va === 'string') {
        return stockSortDir.value === 'asc' ? va.localeCompare(vb || '') : (vb || '').localeCompare(va)
      }
      return stockSortDir.value === 'asc' ? va - vb : vb - va
    })
  }
  return list
})

const stockTotalPages = computed(() => Math.max(1, Math.ceil(filteredInventory.value.length / stockPageSize)))
const paginatedInventory = computed(() => {
  const start = (stockPage.value - 1) * stockPageSize
  return filteredInventory.value.slice(start, start + stockPageSize)
})

const stockSortIcon = computed(() => {
  if (!stockSortField.value) return '↕'
  return stockSortDir.value === 'asc' ? '↑' : '↓'
})

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
  return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const inboundTotalPages = computed(() => Math.max(1, Math.ceil(filteredInboundOrders.value.length / inboundPageSize)))
const paginatedInbound = computed(() => {
  const start = (inboundPage.value - 1) * inboundPageSize
  return filteredInboundOrders.value.slice(start, start + inboundPageSize)
})

const filteredOutboundOrders = computed(() => {
  let list = inventoryStore.outboundOrders
  const search = outboundSearch.value.toLowerCase()
  if (search) {
    list = list.filter(o => (o.outboundNo || o.orderNo || '').toLowerCase().includes(search) || (o.materialCode || '').toLowerCase().includes(search) || (o.materialName || '').toLowerCase().includes(search))
  }
  if (outboundTypeFilter.value) {
    list = list.filter(o => (o.outType || o.type) === outboundTypeFilter.value)
  }
  if (outboundStatusFilter.value) {
    list = list.filter(o => (o.outStatus || o.status) === outboundStatusFilter.value)
  }
  return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const outboundTotalPages = computed(() => Math.max(1, Math.ceil(filteredOutboundOrders.value.length / outboundPageSize)))
const paginatedOutbound = computed(() => {
  const start = (outboundPage.value - 1) * outboundPageSize
  return filteredOutboundOrders.value.slice(start, start + outboundPageSize)
})

const selectedOutboundItemStock = computed(() => {
  if (!outboundForm.materialCode) return 0
  const item = inventoryStore.enrichedInventory.find(i => i.code === outboundForm.materialCode)
  return item ? item.stock : 0
})

function alertColor(status) {
  return inventoryStore.ALERT_STATUS_COLORS[status] || 'var(--color-text-secondary)'
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function inboundTypeLabel(type) {
  const found = inventoryStore.INBOUND_TYPES.find(t => t.value === type)
  return found ? found.label : type || '-'
}

function outboundTypeLabel(type) {
  const found = inventoryStore.OUTBOUND_TYPES.find(t => t.value === type)
  return found ? found.label : type || '-'
}

function toggleStockSort(field) {
  if (stockSortField.value === field) {
    stockSortDir.value = stockSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    stockSortField.value = field
    stockSortDir.value = 'asc'
  }
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

function openAddItemModal() {
  editingItemId.value = null
  Object.assign(itemForm, {
    code: '', name: '', category: 'raw', warehouse: 'main',
    quantity: 0, safetyStock: 50, maxStock: 0, unitCost: 0,
    grade: '', color: '', location: ''
  })
  showItemModal.value = true
}

function openEditItem(item) {
  editingItemId.value = item.id
  Object.assign(itemForm, {
    code: item.code, name: item.name, category: item.category || 'raw',
    warehouse: item.warehouse || 'main', quantity: item.quantity || item.stock || 0,
    safetyStock: item.safetyStock || 50, maxStock: item.maxStock || 0,
    unitCost: item.unitCost || 0, grade: item.grade || '',
    color: item.color || '', location: item.location || ''
  })
  showItemModal.value = true
}

function closeItemModal() {
  showItemModal.value = false
  editingItemId.value = null
}

function handleSaveItem() {
  if (!itemForm.code || !itemForm.name) {
    alert('物料编码和名称为必填项')
    return
  }
  if (editingItemId.value) {
    inventoryStore.updateInventoryItem(editingItemId.value, { ...itemForm })
  } else {
    inventoryStore.addInventoryItem({ ...itemForm })
  }
  closeItemModal()
}

function handleDeleteItem(id) {
  if (confirm('确认删除该物料？此操作不可恢复。')) {
    inventoryStore.deleteInventoryItem(id)
  }
}

function openInboundWizard() {
  editingInboundId.value = null
  Object.assign(inboundForm, {
    date: new Date().toISOString().split('T')[0],
    type: '', counterpartyId: '', warehouseId: 'main', notes: ''
  })
  inboundFormItems.value = [{ code: '', name: '', grade: '', color: '', qty: 0, cost: 0 }]
  inboundErrors.value = []
  showInboundWizard.value = true
}

function openEditInbound(order) {
  editingInboundId.value = order.id
  Object.assign(inboundForm, {
    date: order.date || '',
    type: order.type || '',
    counterpartyId: order.counterpartyId || '',
    warehouseId: order.warehouseId || 'main',
    notes: order.notes || ''
  })
  inboundFormItems.value = getParsedItems(order).length > 0
    ? getParsedItems(order).map(it => ({ ...it }))
    : [{ code: '', name: '', grade: '', color: '', qty: 0, cost: 0 }]
  inboundErrors.value = []
  showInboundWizard.value = true
}

function closeInboundWizard() {
  showInboundWizard.value = false
  editingInboundId.value = null
  inboundErrors.value = []
}

function addInboundItem() {
  inboundFormItems.value.push({ code: '', name: '', grade: '', color: '', qty: 0, cost: 0 })
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

function handleSubmitInbound() {
  const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
  const result = inventoryStore.submitInboundOrder({
    ...inboundForm,
    id: editingInboundId.value || undefined,
    counterpartyName: supplier ? (supplier.shortName || supplier.name) : '',
    supplierCode: supplier ? supplier.supplierCode : '',
    _items: inboundFormItems.value
  })
  if (result.success) {
    closeInboundWizard()
  } else {
    inboundErrors.value = result.errors || ['提交失败']
  }
}

function handleSaveInboundDraft() {
  const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
  inventoryStore.saveInboundDraft({
    ...inboundForm,
    id: editingInboundId.value || undefined,
    counterpartyName: supplier ? (supplier.shortName || supplier.name) : '',
    supplierCode: supplier ? supplier.supplierCode : '',
    _items: inboundFormItems.value
  })
  closeInboundWizard()
}

function handleChangeInboundStatus(orderId, newStatus) {
  inventoryStore.changeInboundStatus(orderId, newStatus)
}

function handleConfirmInbound(orderId) {
  const result = inventoryStore.confirmInbound(orderId)
  if (!result.success) {
    alert(result.error || '确认入库失败')
  }
}

function handleDeleteInbound(id) {
  if (confirm('确认删除该入库单？')) {
    inventoryStore.deleteInboundOrder(id)
  }
}

function viewInboundDetail(order) {
  detailOrder.value = order
  showInboundDetail.value = true
}

function openOutboundWizard() {
  Object.assign(outboundForm, {
    date: new Date().toISOString().split('T')[0],
    outType: '', materialCode: '', materialName: '',
    counterpartyName: '', outQty: 0, unitPrice: 0, notes: ''
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
    outboundForm.unitPrice = item.unitCost || 0
  }
}

function handleSubmitOutbound() {
  const result = inventoryStore.submitOutboundOrder({
    ...outboundForm,
    grade: '',
    color: ''
  })
  if (result.success) {
    closeOutboundWizard()
  } else {
    outboundErrors.value = result.errors || ['提交失败']
  }
}

function handleApproveOutbound(orderId) {
  const result = inventoryStore.approveOutbound(orderId)
  if (!result.success) {
    alert(result.error || '审核失败')
  }
}

function handleConfirmOutbound(orderId) {
  const result = inventoryStore.confirmOutbound(orderId)
  if (!result.success) {
    alert(result.error || '确认出库失败')
  }
}

function handleCancelOutbound(orderId) {
  if (confirm('确认取消该出库单？')) {
    inventoryStore.cancelOutbound(orderId)
  }
}

function handleDeleteOutbound(id) {
  if (confirm('确认删除该出库单？')) {
    inventoryStore.deleteOutboundOrder(id)
  }
}

function quickInboundForItem(item) {
  openInboundWizard()
  inboundForm.type = 'purchase'
  inboundFormItems.value = [{
    code: item.code, name: item.name, grade: item.grade || '',
    color: item.color || '', qty: Math.max(0, item.safetyStockVal - item.stock),
    cost: item.unitCost || 0
  }]
}

function handleExport() {
  const data = activeTab.value === 'stock'
    ? inventoryStore.enrichedInventory
    : activeTab.value === 'inbound'
      ? inventoryStore.inboundOrders
      : inventoryStore.outboundOrders
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory_${activeTab.value}_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.inventory-page {
  max-width: 1600px;
  margin: 0 auto;
}

.inv-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.inv-tab {
  padding: var(--space-2) var(--space-5);
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.inv-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.inv-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.inv-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
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
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.inv-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.inv-toolbar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.inv-search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.inv-filters {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-select {
  min-width: 120px;
}

.inv-toolbar-right {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}

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
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.03em;
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

.inv-table-sm th,
.inv-table-sm td {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

.cell-xs {
  font-size: var(--font-size-xs);
}

.cell-actions {
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
}

.alert-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}

.alert-exhausted {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.alert-low {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.alert-ok {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.alert-over {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
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
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}

.result-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  margin-top: var(--space-3);
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.page-btns {
  display: flex;
  gap: var(--space-2);
}

.sort-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

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
  max-width: 900px;
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
  font-size: var(--font-size-lg);
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
  font-size: var(--font-size-xs);
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

textarea.form-input {
  resize: vertical;
  min-height: 60px;
}

.inbound-items-table {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.form-errors {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-danger-subtle);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.form-error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  padding: 2px 0;
}

.outbound-stock-hint {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

@media (max-width: 1200px) {
  .inv-stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .detail-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .inv-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .inv-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .inv-filters {
    flex-direction: column;
  }
  .inv-toolbar-right {
    margin-left: 0;
  }
  .detail-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
