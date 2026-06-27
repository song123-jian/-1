<template>
  <div class="production-management-page">
    <!-- 头部 -->
    <div class="page-header">
      <div>
        <h2 class="page-header-title">
          <Icon name="layers" :size="14" />
          生产管理
        </h2>
        <p class="page-header-subtitle">工单管理 / BOM管理 / 物料需求计划</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary btn-sm" @click="openOrderForm(null)">
          <Icon name="add" :size="14" />
          新增工单
        </button>
      </div>
    </div>

    <!-- 紧凑指标条 -->
    <div class="compact-metrics">
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-accent)"></span>
        <span class="compact-metric-label">工单总数</span>
        <span class="compact-metric-value">{{ productionStore.orderStats.total }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-info)"></span>
        <span class="compact-metric-label">进行中</span>
        <span class="compact-metric-value">{{ productionStore.orderStats.inProgress }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-success)"></span>
        <span class="compact-metric-label">本月完成</span>
        <span class="compact-metric-value">{{ productionStore.monthlyCompletedOrders.length }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-warning)"></span>
        <span class="compact-metric-label">本月产值</span>
        <span class="compact-metric-value">{{ formatNumber(productionStore.monthlyOutputValue) }}</span>
        <span class="compact-metric-unit">元</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <!-- 折叠统计区 -->
    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showProdStatsExpanded = !showProdStatsExpanded">
        <span class="collapsible-stats-title">
          <Icon name="chart" :size="14" />
          详细统计
        </span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showProdStatsExpanded }">▼</span>
      </div>
      <div v-show="showProdStatsExpanded" class="collapsible-stats-body">
        <div class="prod-stats-row">
          <div class="prod-stat-card">
            <div class="prod-stat-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
              <Icon name="clipboard" :size="14" />
            </div>
            <div class="prod-stat-value">{{ productionStore.orderStats.total }}</div>
            <div class="prod-stat-label">工单总数</div>
          </div>
          <div class="prod-stat-card">
            <div class="prod-stat-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="activity" :size="14" />
            </div>
            <div class="prod-stat-value">{{ productionStore.orderStats.inProgress }}</div>
            <div class="prod-stat-label">进行中</div>
          </div>
          <div class="prod-stat-card">
            <div class="prod-stat-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="checkCircle" :size="14" />
            </div>
            <div class="prod-stat-value">{{ productionStore.monthlyCompletedOrders.length }}</div>
            <div class="prod-stat-label">本月完成</div>
          </div>
          <div class="prod-stat-card">
            <div class="prod-stat-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              <Icon name="dollar" :size="14" />
            </div>
            <div class="prod-stat-value">{{ formatNumber(productionStore.monthlyOutputValue) }}</div>
            <div class="prod-stat-label">本月产值(元)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="prod-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="prod-tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: 生产工单 -->
    <div v-if="activeTab === 'orders'" class="prod-tab-content">
      <!-- 甘特图时间线 -->
      <div class="gantt-timeline">
        <div class="gantt-header">
          <span class="gantt-title">
            <Icon name="activity" :size="14" />
            工单时间线
          </span>
          <div style="display: flex; gap: var(--space-2)">
            <button class="btn btn-ghost btn-sm" :class="{ active: !showGantt }" @click="showGantt = false">
              表格
            </button>
            <button class="btn btn-ghost btn-sm" :class="{ active: showGantt }" @click="showGantt = true">
              甘特图
            </button>
          </div>
        </div>
        <div v-if="showGantt" class="gantt-body">
          <div class="gantt-time-axis">
            <span v-for="d in ganttDates" :key="d" class="gantt-time-label">{{ d }}</span>
          </div>
          <div v-for="order in filteredOrders" :key="order.id" class="gantt-row">
            <span class="gantt-row-label" :title="order.productName">{{ order.orderNo }}</span>
            <div class="gantt-row-track">
              <div
                class="gantt-bar"
                :class="'status-' + order.status"
                :style="ganttBarStyle(order)"
                @click="openOrderForm(order)"
              >
                <div class="gantt-progress-fill" :style="{ width: order.progress + '%' }"></div>
                {{ order.productName }}
              </div>
            </div>
          </div>
          <div
            v-if="filteredOrders.length === 0"
            style="text-align: center; padding: var(--space-6); color: var(--color-text-tertiary)"
          >
            暂无工单数据
          </div>
        </div>
      </div>
      <div class="prod-toolbar">
        <div class="prod-search">
          <span class="search-icon"><Icon name="search" :size="14" /></span>
          <input v-model="orderSearch" type="text" class="search-input" placeholder="搜索工单号/产品名称..." />
        </div>
        <div class="prod-filters">
          <select v-model="orderStatusFilter" class="form-select filter-select">
            <option value="">全部状态</option>
            <option value="planned">已计划</option>
            <option value="released">已下达</option>
            <option value="in_progress">生产中</option>
            <option value="quality_check">质检中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <select v-model="orderPriorityFilter" class="form-select filter-select">
            <option value="">全部优先级</option>
            <option value="low">低</option>
            <option value="normal">普通</option>
            <option value="high">高</option>
            <option value="urgent">紧急</option>
          </select>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">生产工单</span>
          <span class="result-count">共 {{ filteredOrders.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center">序号</th>
                  <th>工单号</th>
                  <th>产品名称</th>
                  <th>数量</th>
                  <th>优先级</th>
                  <th>状态</th>
                  <th>进度</th>
                  <th>计划日期</th>
                  <th>车间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedOrders.length === 0">
                  <td colspan="10" class="empty-cell">暂无工单数据</td>
                </tr>
                <tr v-for="(order, idx) in paginatedOrders" :key="order.id">
                  <td style="text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                    {{ (orderPage - 1) * orderPageSize + idx + 1 }}
                  </td>
                  <td class="cell-mono">{{ order.orderNo }}</td>
                  <td>
                    <strong>{{ order.productName }}</strong>
                  </td>
                  <td class="cell-mono">{{ order.quantity }} {{ order.unit }}</td>
                  <td>
                    <span class="priority-badge" :class="'priority-' + order.priority">
                      {{ productionStore.PRIORITY_LABELS[order.priority] }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="'status-' + order.status">
                      {{ productionStore.ORDER_STATUS_LABELS[order.status] }}
                    </span>
                  </td>
                  <td>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar">
                        <div class="progress-bar-fill" :style="{ width: order.progress + '%' }"></div>
                      </div>
                      <span class="progress-text">{{ order.progress }}%</span>
                    </div>
                  </td>
                  <td class="cell-xs">{{ order.plannedStartDate }} ~ {{ order.plannedEndDate }}</td>
                  <td>{{ order.workshop || '-' }}</td>
                  <td class="cell-actions">
                    <template v-if="order.status === 'planned'">
                      <button class="btn btn-ghost btn-sm" title="下达" @click="handleRelease(order)">
                        <Icon name="arrowRight" :size="14" />
                      </button>
                    </template>
                    <template v-if="order.status === 'released'">
                      <button class="btn btn-ghost btn-sm" title="开始生产" @click="handleStart(order)">
                        <Icon name="play" :size="14" />
                      </button>
                    </template>
                    <template v-if="order.status === 'in_progress'">
                      <button class="btn btn-ghost btn-sm" title="质检" @click="handleQualityCheck(order)">
                        <Icon name="shield" :size="14" />
                      </button>
                      <button class="btn btn-ghost btn-sm" title="更新进度" @click="handleUpdateProgress(order)">
                        <Icon name="edit" :size="14" />
                      </button>
                    </template>
                    <template v-if="order.status === 'quality_check'">
                      <button class="btn btn-ghost btn-sm" title="完成" @click="handleComplete(order)">
                        <Icon name="check" :size="14" />
                      </button>
                    </template>
                    <button class="btn btn-ghost btn-sm" title="编辑" @click="openOrderForm(order)">
                      <Icon name="edit" :size="14" />
                    </button>
                    <button
                      v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                      class="btn btn-ghost btn-sm"
                      title="取消"
                      @click="handleCancel(order)"
                    >
                      <Icon name="close" :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="orderTotalPages > 1" class="pagination-bar">
        <span class="page-info">第 {{ orderPage }} / {{ orderTotalPages }} 页，共 {{ filteredOrders.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="orderPage <= 1" @click="orderPage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="orderPage >= orderTotalPages" @click="orderPage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>

      <!-- 生产排程 -->
      <div style="margin-top: var(--space-4)">
        <ProductionSchedule :orders="productionStore.activeOrders" />
      </div>
    </div>

    <!-- Tab: BOM管理 -->
    <div v-if="activeTab === 'bom'" class="prod-tab-content">
      <div class="prod-toolbar">
        <div class="prod-search">
          <span class="search-icon"><Icon name="search" :size="14" /></span>
          <input v-model="bomSearch" type="text" class="search-input" placeholder="搜索BOM编码/名称/产品..." />
        </div>
        <div class="prod-filters">
          <select v-model="bomStatusFilter" class="form-select filter-select">
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="active">已激活</option>
            <option value="obsolete">已废弃</option>
          </select>
          <select v-model="bomTypeFilter" class="form-select filter-select">
            <option value="">全部类型</option>
            <option value="single">单层BOM</option>
            <option value="multi">多层BOM</option>
            <option value="phantom">虚拟BOM</option>
          </select>
        </div>
        <div style="margin-left: auto">
          <button class="btn btn-primary btn-sm" @click="openBomForm(null)">
            <Icon name="add" :size="14" />
            新增BOM
          </button>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">BOM列表</span>
          <span class="result-count">共 {{ filteredBomList.length }} 条</span>
        </div>
        <div class="panel-card-body no-padding">
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center">序号</th>
                  <th>BOM编码</th>
                  <th>BOM名称</th>
                  <th>产品名称</th>
                  <th>版本</th>
                  <th>类型</th>
                  <th>组件数</th>
                  <th>总成本</th>
                  <th>状态</th>
                  <th>更新日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredBomList.length === 0">
                  <td colspan="11" class="empty-cell">暂无BOM数据</td>
                </tr>
                <tr v-for="(bom, idx) in paginatedBomList" :key="bom.id">
                  <td style="text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                    {{ (bomPage - 1) * bomPageSize + idx + 1 }}
                  </td>
                  <td class="cell-mono">{{ bom.code }}</td>
                  <td>
                    <strong>{{ bom.name }}</strong>
                  </td>
                  <td>{{ bom.productName || '-' }}</td>
                  <td>
                    <span class="version-badge">{{ bom.version }}</span>
                  </td>
                  <td>
                    <span class="type-badge" :class="'type-' + bom.type">
                      {{ bomStore.BOM_TYPE_LABELS[bom.type] }}
                    </span>
                  </td>
                  <td>{{ bom.components ? bom.components.length : 0 }}</td>
                  <td class="cell-mono">{{ bom.totalCost ? bom.totalCost.toFixed(2) : '0.00' }}</td>
                  <td>
                    <span class="status-badge" :class="'bom-status-' + bom.status">
                      {{ bomStore.BOM_STATUS_LABELS[bom.status] }}
                    </span>
                  </td>
                  <td class="cell-xs">{{ bom.updateDate }}</td>
                  <td class="cell-actions">
                    <button class="btn btn-ghost btn-sm" title="查看树形结构" @click="viewBomTree(bom)">
                      <Icon name="eye" :size="14" />
                    </button>
                    <button class="btn btn-ghost btn-sm" title="编辑" @click="openBomForm(bom)">
                      <Icon name="edit" :size="14" />
                    </button>
                    <button
                      v-if="bom.status === 'draft'"
                      class="btn btn-ghost btn-sm"
                      title="激活"
                      @click="handleActivateBom(bom)"
                    >
                      <Icon name="check" :size="14" />
                    </button>
                    <button
                      v-if="bom.status === 'active'"
                      class="btn btn-ghost btn-sm"
                      title="废弃"
                      @click="handleObsoleteBom(bom)"
                    >
                      <Icon name="close" :size="14" />
                    </button>
                    <button class="btn btn-ghost btn-sm" title="删除" @click="handleDeleteBom(bom)">
                      <Icon name="delete" :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- BOM分页 -->
      <div v-if="bomTotalPages > 1" class="pagination-bar">
        <span class="page-info">第 {{ bomPage }} / {{ bomTotalPages }} 页，共 {{ filteredBomList.length }} 条</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" :disabled="bomPage <= 1" @click="bomPage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="bomPage >= bomTotalPages" @click="bomPage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>

      <!-- BOM树形查看 -->
      <div v-if="viewingBom" style="margin-top: var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="layers" :size="14" />
              BOM结构 - {{ viewingBom.name }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="viewingBom = null"><Icon name="close" :size="14" /></button>
          </div>
          <div class="panel-card-body">
            <BomTree :bom="viewingBom" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: 物料需求(MRP) -->
    <div v-if="activeTab === 'mrp'" class="prod-tab-content">
      <MaterialRequirement />
    </div>

    <!-- 新增/编辑工单弹窗 -->
    <ProductionOrder
      :order="editingOrder"
      :visible="showOrderForm"
      @close="showOrderForm = false"
      @saved="handleOrderSaved"
    />

    <!-- 新增/编辑BOM弹窗 -->
    <Teleport to="body">
      <div v-if="showBomForm" class="wizard-overlay" @click.self="showBomForm = false">
        <div class="wizard-modal wizard-modal-lg">
          <div class="wizard-header">
            <h3>{{ editingBomId ? '编辑BOM' : '新增BOM' }}</h3>
            <button class="btn btn-ghost btn-sm" @click="showBomForm = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="wizard-body">
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">
                  BOM名称
                  <span class="required">*</span>
                </label>
                <input v-model="bomForm.name" type="text" class="form-input" placeholder="如：精密减速器总成BOM" />
                <span v-if="bomErrors.name" class="form-error">{{ bomErrors.name }}</span>
              </div>
              <div class="form-group">
                <label class="form-label">
                  产品名称
                  <span class="required">*</span>
                </label>
                <input
                  v-model="bomForm.productName"
                  type="text"
                  class="form-input"
                  placeholder="如：精密减速器RV-40E"
                />
                <span v-if="bomErrors.productName" class="form-error">{{ bomErrors.productName }}</span>
              </div>
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">产品编号</label>
                <input v-model="bomForm.productId" type="text" class="form-input" placeholder="如：PRD-001" />
              </div>
              <div class="form-group">
                <label class="form-label">版本</label>
                <input v-model="bomForm.version" type="text" class="form-input" placeholder="V1.0" />
              </div>
              <div class="form-group">
                <label class="form-label">BOM类型</label>
                <select v-model="bomForm.type" class="form-select">
                  <option value="single">单层BOM</option>
                  <option value="multi">多层BOM</option>
                  <option value="phantom">虚拟BOM</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="bomForm.notes" class="form-textarea" rows="2" placeholder="BOM备注"></textarea>
            </div>

            <!-- 组件清单 -->
            <div class="form-section-title" style="margin-top: var(--space-4)">
              <Icon name="package" :size="14" />
              组件清单
              <button class="btn btn-ghost btn-sm" style="margin-left: auto" @click="addComponent">添加组件</button>
            </div>
            <div v-for="(comp, idx) in bomForm.components" :key="comp.id || idx" class="component-row">
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">编号</label>
                  <DataSelect
                    v-model="comp.materialCode"
                    module="inventory"
                    value-field="code"
                    label-field="name"
                    placeholder="选择物料"
                    @change="(e) => onMaterialChange(comp, e)"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">物料名称</label>
                  <input
                    v-model="comp.materialName"
                    type="text"
                    class="form-input form-input-sm"
                    placeholder="物料名称"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">数量</label>
                  <input
                    v-model.number="comp.quantity"
                    type="number"
                    class="form-input form-input-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">规格</label>
                  <input v-model="comp.spec" type="text" class="form-input form-input-sm" placeholder="规格" />
                </div>
                <div class="form-group">
                  <label class="form-label">单位</label>
                  <input v-model="comp.unit" type="text" class="form-input form-input-sm" placeholder="kg/个/件" />
                </div>
                <div class="form-group">
                  <label class="form-label">损耗率(%)</label>
                  <input
                    v-model.number="comp.scrapRate"
                    type="number"
                    class="form-input form-input-sm"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">
                    <input v-model="comp.isOptional" type="checkbox" />
                    选配
                  </label>
                </div>
                <div class="form-group" style="flex-direction: row; align-items: center; gap: var(--space-2)">
                  <label class="form-label" style="white-space: nowrap">备注</label>
                  <input v-model="comp.notes" type="text" class="form-input form-input-sm" placeholder="备注" />
                  <button class="btn btn-ghost btn-sm" style="color: var(--color-danger)" @click="removeComponent(idx)">
                    <Icon name="delete" :size="14" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="bomForm.components.length === 0" class="empty-components">暂无组件，请点击"添加组件"</div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="showBomForm = false">取消</button>
            <button class="btn btn-primary" @click="handleSaveBom">{{ editingBomId ? '更新' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 进度更新弹窗 -->
    <Teleport to="body">
      <div v-if="showProgressModal" class="wizard-overlay" @click.self="showProgressModal = false">
        <div class="wizard-modal" style="max-width: 400px">
          <div class="wizard-header">
            <h3>更新生产进度</h3>
            <button class="btn btn-ghost btn-sm" @click="showProgressModal = false">
              <Icon name="close" :size="14" />
            </button>
          </div>
          <div class="wizard-body">
            <div class="form-group">
              <label class="form-label">工单: {{ progressOrder?.orderNo }}</label>
            </div>
            <div class="form-group">
              <label class="form-label">当前进度: {{ progressOrder?.progress }}%</label>
              <input v-model.number="newProgress" type="range" min="0" max="100" step="5" style="width: 100%" />
              <div
                style="
                  text-align: center;
                  font-size: var(--font-size-2xl);
                  font-weight: 700;
                  color: var(--color-accent);
                "
              >
                {{ newProgress }}%
              </div>
            </div>
          </div>
          <div class="wizard-footer">
            <button class="btn btn-ghost" @click="showProgressModal = false">取消</button>
            <button class="btn btn-primary" @click="confirmProgress">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default { name: 'ProductionManagement' }
</script>
<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useBomStore } from '@/modules/production/stores/bom'
import { useProductionStore } from '@/modules/production/stores/production'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { generateId } from '@/utils/uid'
import { formatNumber } from '@/utils/format'
import DataSelect from '@/components/DataSelect.vue'
import BomTree from '@/modules/production/components/production/BomTree.vue'
import ProductionOrder from '@/modules/production/components/production/ProductionOrder.vue'
import ProductionSchedule from '@/modules/production/components/production/ProductionSchedule.vue'
import MaterialRequirement from '@/modules/production/components/production/MaterialRequirement.vue'

const bomStore = useBomStore()
const productionStore = useProductionStore()
const inventoryStore = useInventoryStore()

/* Tab配置 */
const tabs = [
  { key: 'orders', label: '生产工单', icon: 'clipboard' },
  { key: 'bom', label: 'BOM管理', icon: 'layers' },
  { key: 'mrp', label: '物料需求(MRP)', icon: 'calculator' }
]
const activeTab = ref('orders')

const showProdStatsExpanded = ref(false)
const showGantt = ref(true)

/* 甘特图日期轴 */
const ganttDates = computed(() => {
  const today = new Date()
  const dates = []
  for (let i = -3; i <= 10; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d.getMonth() + 1 + '/' + d.getDate())
  }
  return dates
})

/* 甘特图条形样式 */
function ganttBarStyle(order) {
  const today = new Date()
  let startDate = order.plannedStartDate ? new Date(order.plannedStartDate) : today
  let endDate = order.plannedEndDate ? new Date(order.plannedEndDate) : new Date(today.getTime() + 7 * 86400000)
  // 防护: 非法日期字符串会产生Invalid Date，回退到默认值
  if (isNaN(startDate.getTime())) startDate = today
  if (isNaN(endDate.getTime())) endDate = new Date(today.getTime() + 7 * 86400000)
  // 防护: 结束日期早于开始日期时，确保duration至少为1
  if (endDate < startDate) endDate = new Date(startDate.getTime() + 86400000)
  const totalDays = 14 // 显示14天范围
  const startOffset = Math.round((startDate - new Date(today.getTime() - 3 * 86400000)) / 86400000)
  const duration = Math.max(1, Math.round((endDate - startDate) / 86400000))
  const left = Math.max(0, Math.min(100, (startOffset / totalDays) * 100))
  const width = Math.max(3, Math.min(100 - left, (duration / totalDays) * 100))
  return {
    left: left + '%',
    width: width + '%'
  }
}

/* ============ 工单相关 ============ */
const orderSearch = ref('')
const orderStatusFilter = ref('')
const orderPriorityFilter = ref('')
const orderPage = ref(1)
const orderPageSize = ref(10)
const showOrderForm = ref(false)
const editingOrder = ref(null)

const filteredOrders = computed(() => {
  let list = productionStore.productionOrders
  const search = orderSearch.value.toLowerCase()
  if (search) {
    list = list.filter((o) => [o.orderNo, o.productName, o.operator].join(' ').toLowerCase().includes(search))
  }
  if (orderStatusFilter.value) {
    list = list.filter((o) => o.status === orderStatusFilter.value)
  }
  if (orderPriorityFilter.value) {
    list = list.filter((o) => o.priority === orderPriorityFilter.value)
  }
  return list
})

const orderTotalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / orderPageSize.value)))
const paginatedOrders = computed(() => {
  const start = (orderPage.value - 1) * orderPageSize.value
  return filteredOrders.value.slice(start, start + orderPageSize.value)
})

// 筛选条件变化时重置页码
watch([orderSearch, orderStatusFilter, orderPriorityFilter], () => {
  orderPage.value = 1
})

function openOrderForm(order) {
  editingOrder.value = order
  showOrderForm.value = true
}

function handleOrderSaved() {
  showOrderForm.value = false
  editingOrder.value = null
}

function handleRelease(order) {
  const result = productionStore.releaseOrder(order.id)
  if (!result.success) {
    alert(result.error)
  } else if (result.shortages && result.shortages.length > 0) {
    const msgs = result.shortages.map(
      (s) => `${s.materialName}: 需求${s.required}，库存${s.available}，缺口${s.shortage}`
    )
    alert('工单已下达，但存在物料缺口:\n' + msgs.join('\n'))
  }
}

function handleStart(order) {
  const result = productionStore.startProduction(order.id)
  if (!result.success) alert(result.error)
}

function handleQualityCheck(order) {
  const result = productionStore.qualityCheck(order.id)
  if (!result.success) alert(result.error)
}

function handleComplete(order) {
  if (!confirm('确认完成生产？成品将自动入库。')) return
  const result = productionStore.completeProduction(order.id)
  if (!result.success) alert(result.error)
}

function handleCancel(order) {
  if (!confirm('确认取消工单？')) return
  const result = productionStore.cancelProduction(order.id)
  if (!result.success) alert(result.error)
}

/* 进度更新 */
const showProgressModal = ref(false)
const progressOrder = ref(null)
const newProgress = ref(0)

function handleUpdateProgress(order) {
  progressOrder.value = order
  newProgress.value = order.progress
  showProgressModal.value = true
}

function confirmProgress() {
  if (progressOrder.value) {
    productionStore.updateProgress(progressOrder.value.id, newProgress.value)
  }
  showProgressModal.value = false
  progressOrder.value = null
}

/* ============ BOM相关 ============ */
const bomSearch = ref('')
const bomStatusFilter = ref('')
const bomTypeFilter = ref('')
const bomPage = ref(1)
const bomPageSize = ref(10)
const showBomForm = ref(false)
const editingBomId = ref(null)
const viewingBom = ref(null)

const bomForm = reactive({
  name: '',
  productName: '',
  productId: '',
  version: 'V1.0',
  type: 'single',
  notes: '',
  components: []
})

const bomErrors = reactive({
  name: '',
  productName: ''
})

const inventoryItems = computed(() => inventoryStore.inventory || [])

const filteredBomList = computed(() => {
  let list = bomStore.bomList
  const search = bomSearch.value.toLowerCase()
  if (search) {
    list = list.filter((b) => [b.code, b.name, b.productName].join(' ').toLowerCase().includes(search))
  }
  if (bomStatusFilter.value) {
    list = list.filter((b) => b.status === bomStatusFilter.value)
  }
  if (bomTypeFilter.value) {
    list = list.filter((b) => b.type === bomTypeFilter.value)
  }
  return list
})

const bomTotalPages = computed(() => Math.max(1, Math.ceil(filteredBomList.value.length / bomPageSize.value)))
const paginatedBomList = computed(() => {
  const start = (bomPage.value - 1) * bomPageSize.value
  return filteredBomList.value.slice(start, start + bomPageSize.value)
})

// BOM筛选条件变化时重置页码
watch([bomSearch, bomStatusFilter, bomTypeFilter], () => {
  bomPage.value = 1
})

function openBomForm(bom) {
  if (bom) {
    editingBomId.value = bom.id
    Object.assign(bomForm, {
      name: bom.name,
      productName: bom.productName,
      productId: bom.productId,
      version: bom.version,
      type: bom.type,
      notes: bom.notes,
      components: bom.components ? bom.components.map((c) => ({ ...c })) : []
    })
  } else {
    editingBomId.value = null
    Object.assign(bomForm, {
      name: '',
      productName: '',
      productId: '',
      version: 'V1.0',
      type: 'single',
      notes: '',
      components: []
    })
  }
  bomErrors.name = ''
  bomErrors.productName = ''
  showBomForm.value = true
}

function addComponent() {
  bomForm.components.push({
    id: generateId('cmp'),
    materialCode: '',
    materialName: '',
    spec: '',
    unit: 'kg',
    quantity: 0,
    scrapRate: 0,
    isOptional: false,
    notes: ''
  })
}

function removeComponent(idx) {
  bomForm.components.splice(idx, 1)
}

/* DataSelect 物料变更：单向联动+可改，自动填充但字段仍可编辑 */
function onMaterialChange(comp, { value, data }) {
  if (data) {
    comp.materialCode = data.code || ''
    comp.materialName = data.name || ''
    comp.spec = data.grade || ''
  } else {
    comp.materialName = ''
    comp.spec = ''
  }
}

function handleSaveBom() {
  bomErrors.name = ''
  bomErrors.productName = ''
  if (!bomForm.name) {
    bomErrors.name = '请输入BOM名称'
    return
  }
  if (!bomForm.productName) {
    bomErrors.productName = '请输入产品名称'
    return
  }

  if (editingBomId.value) {
    bomStore.updateBom(editingBomId.value, { ...bomForm })
  } else {
    bomStore.addBom({ ...bomForm })
  }
  showBomForm.value = false
}

function handleActivateBom(bom) {
  if (!confirm('确认激活此BOM？')) return
  bomStore.activateBom(bom.id)
}

function handleObsoleteBom(bom) {
  if (!confirm('确认废弃此BOM？废弃后不可恢复。')) return
  bomStore.obsoleteBom(bom.id)
}

function handleDeleteBom(bom) {
  if (!confirm('确认删除此BOM？')) return
  const result = bomStore.deleteBom(bom.id)
  if (!result.success) alert(result.error)
}

function viewBomTree(bom) {
  viewingBom.value = bom
}
</script>

<style scoped>
.production-management-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.page-header-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
}

/* 统计卡片 */
.prod-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.prod-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.prod-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.prod-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.prod-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* Tab切换 */
.prod-tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.prod-tab-btn {
  padding: var(--space-2) var(--space-4);
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -var(--space-1);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.prod-tab-btn:hover {
  color: var(--color-text-primary);
}

.prod-tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.prod-tab-content {
  min-height: 400px;
}

/* 工具栏 */
.prod-toolbar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.prod-search {
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
  color: var(--color-text-tertiary);
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

.prod-filters {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-select {
  min-width: 120px;
}

/* 面板卡片 */
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}

.panel-card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.panel-card-body {
  padding: var(--space-3);
}

.panel-card-body.no-padding {
  padding: 0;
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
}

.inv-table td {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  vertical-align: middle;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.inv-table tr:hover td {
  background: var(--color-surface-hover);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
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

/* 状态标签 */
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}

.status-planned {
  background: var(--color-gray-subtle);
  color: var(--color-text-tertiary);
}
.status-released {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.status-in_progress {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.status-quality_check {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.status-completed {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-cancelled {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.bom-status-draft {
  background: var(--color-gray-subtle);
  color: var(--color-text-tertiary);
}
.bom-status-active {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.bom-status-obsolete {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

/* 优先级标签 */
.priority-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.priority-low {
  background: var(--color-gray-subtle);
  color: var(--color-text-tertiary);
}
.priority-normal {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.priority-high {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.priority-urgent {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

/* 类型标签 */
.type-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.type-single {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.type-multi {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.type-phantom {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}

.version-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--color-info-subtle);
  color: var(--color-info);
  font-family: var(--font-mono);
}

/* 进度条 */
.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progress-bar {
  width: 80px;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width var(--transition-base);
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  min-width: 32px;
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

.page-btns {
  display: flex;
  gap: var(--space-2);
}

/* 弹窗 */
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
  backdrop-filter: blur(4px);
}

.wizard-modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wizard-modal-lg {
  max-width: 720px;
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.wizard-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.wizard-body {
  padding: var(--space-4) var(--space-6);
  overflow-y: auto;
  flex: 1;
}

.wizard-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}

/* 表单 */
.form-section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.form-row {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.form-row-2 > .form-group {
  flex: 1;
}
.form-row-3 > .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.form-input-sm,
.form-select-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--space-1);
}

.component-row {
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.empty-components {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

/* 响应式 */
@media (max-width: 1200px) {
  .prod-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .prod-stats-row {
    grid-template-columns: 1fr;
  }
  .form-row-2,
  .form-row-3 {
    flex-direction: column;
    gap: 0;
  }
  .prod-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .prod-filters {
    flex-direction: column;
  }
  .wizard-modal {
    width: 95%;
    max-height: 90vh;
  }
}

/* 紧凑指标条 */
.compact-metrics {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
}
.compact-metric {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.compact-metric-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.compact-metric-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.compact-metric-value {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}
.compact-metric-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.compact-metric-sep {
  width: 1px;
  height: 16px;
  background: var(--color-border);
}

/* 折叠统计区 */
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

/* 甘特图时间线 */
.gantt-timeline {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  overflow: hidden;
}
.gantt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}
.gantt-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.gantt-body {
  padding: var(--space-3) var(--space-4);
  overflow-x: auto;
}
.gantt-time-axis {
  display: flex;
  margin-left: var(--gantt-label-width, 100px);
  margin-bottom: var(--space-1);
}
.gantt-time-label {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  min-width: 40px;
}
.gantt-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-1);
}
.gantt-row-label {
  width: 100px;
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gantt-row-track {
  flex: 1;
  position: relative;
  height: 28px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}
.gantt-bar {
  position: absolute;
  top: 2px;
  height: 24px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  line-height: 24px;
  padding: 0 var(--space-2);
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: opacity 0.2s;
}
.gantt-bar:hover {
  opacity: 0.85;
}
.gantt-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-sm);
  pointer-events: none;
}
.gantt-bar.status-planned {
  background: var(--color-text-tertiary);
}
.gantt-bar.status-released {
  background: var(--color-info);
}
.gantt-bar.status-in_progress {
  background: var(--color-accent);
}
.gantt-bar.status-quality_check {
  background: var(--color-warning);
}
.gantt-bar.status-completed {
  background: var(--color-success);
}
.gantt-bar.status-cancelled {
  background: var(--color-danger);
}
</style>
