<template>
  <div class="stock-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">
          <Icon name="package" :size="14" />
          库存管理
        </h2>
        <p class="page-header-subtitle">{{ inventoryStore.enrichedInventory.length }} 种物料</p>
      </div>
      <div class="page-header-actions"></div>
    </div>

    <!-- 预警优先状态条 -->
    <div v-if="inventoryStore.exhaustedCount > 0" class="alert-priority-bar danger">
      <span class="alert-priority-icon">⚠</span>
      <span class="alert-priority-text">{{ inventoryStore.exhaustedCount }} 种物料库存耗尽</span>
      <span class="alert-priority-detail">{{ inventoryStore.lowStockCount }} 种低于安全库存</span>
    </div>
    <div v-else-if="inventoryStore.lowStockCount > 0" class="alert-priority-bar warning">
      <span class="alert-priority-icon">⚡</span>
      <span class="alert-priority-text">{{ inventoryStore.lowStockCount }} 种物料低于安全库存</span>
      <span class="alert-priority-detail">建议尽快补货</span>
    </div>
    <div v-else class="alert-priority-bar success">
      <span class="alert-priority-icon">✓</span>
      <span class="alert-priority-text">库存状况良好</span>
      <span class="alert-priority-detail">所有物料库存正常</span>
    </div>

    <!-- 紧凑指标条 -->
    <div class="compact-metrics">
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-accent)"></span>
        <span class="compact-metric-label">物料种类</span>
        <span class="compact-metric-value">{{ inventoryStore.enrichedInventory.length }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-success)"></span>
        <span class="compact-metric-label">总库存</span>
        <span class="compact-metric-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</span>
        <span class="compact-metric-unit">kg</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-danger)"></span>
        <span class="compact-metric-label">耗尽</span>
        <span class="compact-metric-value">{{ inventoryStore.exhaustedCount }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-warning)"></span>
        <span class="compact-metric-label">偏低</span>
        <span class="compact-metric-value">{{ inventoryStore.lowStockCount }}</span>
      </div>
      <div class="compact-metric-sep"></div>
      <div class="compact-metric">
        <span class="compact-metric-dot" style="background: var(--color-success)"></span>
        <span class="compact-metric-label">健康度</span>
        <span
          class="compact-metric-value"
          :style="{
            color:
              healthScore >= 80
                ? 'var(--color-success)'
                : healthScore >= 50
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)'
          }"
        >
          {{ healthScore }}%
        </span>
      </div>
    </div>

    <!-- 折叠统计区 -->
    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showStockStatsExpanded = !showStockStatsExpanded">
        <span class="collapsible-stats-title">
          <Icon name="chart" :size="14" />
          详细统计与概览
        </span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showStockStatsExpanded }">▼</span>
      </div>
      <div v-show="showStockStatsExpanded" class="collapsible-stats-body">
        <div class="inv-stats-row">
          <div class="inv-stat-card" style="animation-delay: 0ms">
            <div class="inv-stat-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
              <Icon name="package" :size="14" />
            </div>
            <div>
              <div class="inv-stat-value">{{ inventoryStore.enrichedInventory.length }}</div>
              <div class="inv-stat-label">物料种类</div>
            </div>
          </div>
          <div class="inv-stat-card" style="animation-delay: 60ms">
            <div class="inv-stat-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="shield" :size="14" />
            </div>
            <div>
              <div class="inv-stat-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</div>
              <div class="inv-stat-label">总库存(kg)</div>
            </div>
          </div>
          <div class="inv-stat-card" style="animation-delay: 120ms">
            <div class="inv-stat-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
              <Icon name="warning" :size="14" />
            </div>
            <div>
              <div class="inv-stat-value">
                <span class="stat-dot-halo" style="background: var(--color-danger)"></span>
                {{ inventoryStore.exhaustedCount }}
              </div>
              <div class="inv-stat-label">库存耗尽</div>
            </div>
          </div>
          <div class="inv-stat-card" style="animation-delay: 180ms">
            <div class="inv-stat-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              <Icon name="warning" :size="14" />
            </div>
            <div>
              <div class="inv-stat-value">
                <span class="stat-dot-halo" style="background: var(--color-warning)"></span>
                {{ inventoryStore.lowStockCount }}
              </div>
              <div class="inv-stat-label">低于安全库存</div>
            </div>
          </div>
          <div class="inv-stat-card" style="animation-delay: 240ms">
            <div class="inv-stat-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="checkCircle" :size="14" />
            </div>
            <div>
              <div class="inv-stat-value">{{ inventoryStore.normalStockCount }}</div>
              <div class="inv-stat-label">库存正常</div>
            </div>
          </div>
        </div>

        <!-- 概览面板：库存健康度 + 预警分布 + 库存价值TOP5 -->
        <div class="stock-overview-row">
          <div class="overview-card overview-ring-card">
            <div class="overview-card-title">库存健康度</div>
            <div class="overview-ring-body">
              <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
                <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
                <circle
                  cx="36"
                  cy="36"
                  r="26"
                  fill="none"
                  :stroke="healthScoreColor"
                  stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="healthScoreDash"
                  stroke-dashoffset="0"
                  transform="rotate(-90 36 36)"
                  class="overview-ring-progress"
                />
              </svg>
              <div class="overview-ring-text">
                <span class="overview-ring-percent" :style="{ color: healthScoreColor }">{{ healthScore }}</span>
                <span class="overview-ring-sub">健康评分</span>
              </div>
            </div>
          </div>
          <div class="overview-card overview-alert-card">
            <div class="overview-card-title">预警分布</div>
            <div class="alert-bars">
              <div class="alert-bar-item">
                <span class="alert-bar-label" style="color: var(--color-danger)">耗尽</span>
                <div class="alert-bar-track">
                  <div
                    class="alert-bar-fill"
                    style="background: var(--color-danger)"
                    :style="{ width: alertPercent('exhausted') + '%' }"
                  ></div>
                </div>
                <span class="alert-bar-count">{{ inventoryStore.exhaustedCount }}</span>
              </div>
              <div class="alert-bar-item">
                <span class="alert-bar-label" style="color: var(--color-warning)">偏低</span>
                <div class="alert-bar-track">
                  <div
                    class="alert-bar-fill"
                    style="background: var(--color-warning)"
                    :style="{ width: alertPercent('low') + '%' }"
                  ></div>
                </div>
                <span class="alert-bar-count">{{ inventoryStore.lowStockCount }}</span>
              </div>
              <div class="alert-bar-item">
                <span class="alert-bar-label" style="color: var(--color-info)">超量</span>
                <div class="alert-bar-track">
                  <div
                    class="alert-bar-fill"
                    style="background: var(--color-info)"
                    :style="{ width: alertPercent('over') + '%' }"
                  ></div>
                </div>
                <span class="alert-bar-count">{{ inventoryStore.overStockCount }}</span>
              </div>
              <div class="alert-bar-item">
                <span class="alert-bar-label" style="color: var(--color-success)">正常</span>
                <div class="alert-bar-track">
                  <div
                    class="alert-bar-fill"
                    style="background: var(--color-success)"
                    :style="{ width: alertPercent('ok') + '%' }"
                  ></div>
                </div>
                <span class="alert-bar-count">{{ inventoryStore.normalStockCount }}</span>
              </div>
            </div>
          </div>
          <div class="overview-card overview-value-card">
            <div class="overview-card-title">库存价值TOP5</div>
            <div class="value-bars">
              <div v-for="(v, idx) in topValueItems" :key="v.code" class="value-bar-item">
                <span class="value-bar-label">{{ v.name }}</span>
                <div class="value-bar-track">
                  <div class="value-bar-fill" :style="{ width: v.percent + '%', background: VALUE_COLORS[idx] }"></div>
                </div>
                <span class="value-bar-amount">{{ formatNumber(v.value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 库存预警区域 -->
        <div v-if="criticalAlerts.length > 0" class="panel-card stock-alert-panel">
          <div class="panel-card-header">
            <span class="panel-card-title" style="color: var(--color-danger)">
              <span class="alert-dot-pulse-danger"></span>
              库存预警
            </span>
          </div>
          <div class="panel-card-body">
            <div
              v-for="(a, idx) in criticalAlerts"
              :key="a.id"
              class="stock-alert-item"
              :style="{ animationDelay: idx * 60 + 'ms' }"
            >
              <span class="stock-alert-badge" :class="'alert-' + a.alertStatus">
                {{ inventoryStore.ALERT_STATUS_MAP[a.alertStatus] }}
              </span>
              <span class="stock-alert-name">{{ a.name }}</span>
              <span class="stock-alert-code">{{ a.code }}</span>
              <span class="stock-alert-stock">
                库存:
                <strong :style="{ color: alertColor(a.alertStatus) }">{{ a.stock.toFixed(1) }}</strong>
                kg
              </span>
              <span class="stock-alert-safety">安全: {{ a.safetyStockVal }}kg</span>
              <button class="btn btn-ghost btn-sm" @click="emit('edit-item', a)">补货</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="inv-toolbar">
      <div class="inv-filters">
        <select v-model="stockCategoryFilter" class="form-select filter-select">
          <option value="">全部类别</option>
          <option value="raw">原材料</option>
        </select>
        <select v-model="stockWarehouseFilter" class="form-select filter-select">
          <option value="">全部仓库</option>
          <option value="main">主仓库</option>
        </select>
        <select v-model="stockAlertFilter" class="form-select filter-select">
          <option value="">全部预警状态</option>
          <option value="exhausted">库存耗尽</option>
          <option value="low">低于安全库存</option>
          <option value="over">超量库存</option>
          <option value="ok">库存正常</option>
        </select>
        <select v-model="stockPageSize" class="form-select filter-select" style="width: auto">
          <option :value="15">15条/页</option>
          <option :value="30">30条/页</option>
          <option :value="50">50条/页</option>
          <option :value="100">100条/页</option>
        </select>
      </div>
      <div class="column-config-wrapper">
        <button class="btn btn-outline" @click="toggleColumnConfig">
          <Icon name="setting" :size="14" />
          列
        </button>
        <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
          <label
            v-for="col in stockColumnDefs.filter((c) => c.hideable !== false)"
            :key="col.key"
            class="column-config-item"
          >
            <input v-model="stockColumnVisible[col.key]" type="checkbox" />
            {{ col.label }}
          </label>
        </div>
      </div>
    </div>

    <div class="inv-search" style="margin-bottom: var(--space-3)">
      <span class="search-icon"><Icon name="search" :size="14" /></span>
      <input v-model="stockSearch" type="text" class="search-input" placeholder="搜索编号/名称/牌号..." />
    </div>

    <div class="inv-toolbar-right" style="margin-bottom: var(--space-3)">
      <div class="view-toggle-dropdown">
        <button class="btn btn-ghost btn-sm" @click="stockViewMenuOpen = !stockViewMenuOpen">
          <Icon name="chart" :size="14" />
          视图
        </button>
        <div v-if="stockViewMenuOpen" class="view-toggle-menu">
          <button
            :class="{ active: stockView === 'table' }"
            @click="((stockView = 'table'), (stockViewMenuOpen = false))"
          >
            <Icon name="chart" :size="14" />
            表格视图
          </button>
          <button
            :class="{ active: stockView === 'list' }"
            @click="((stockView = 'list'), (stockViewMenuOpen = false))"
          >
            <Icon name="list" :size="14" />
            列表视图
          </button>
          <button
            :class="{ active: stockView === 'card' }"
            @click="((stockView = 'card'), (stockViewMenuOpen = false))"
          >
            <Icon name="card" :size="14" />
            卡片视图
          </button>
          <button
            :class="{ active: stockView === 'calendar' }"
            @click="((stockView = 'calendar'), (stockViewMenuOpen = false))"
          >
            <Icon name="calendar" :size="14" />
            日历视图
          </button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" @click="handleExport">
        <Icon name="upload" :size="14" />
        导出
      </button>
      <button class="btn btn-secondary btn-sm" @click="runInventoryAssessment">
        <Icon name="search" :size="14" />
        自主评估
      </button>
      <button
        v-if="canDeleteInbound"
        class="btn btn-sm"
        style="background: var(--color-danger); color: #fff; border-color: var(--color-danger)"
        @click="handleBatchDeleteInventory"
      >
        <Icon name="delete" :size="14" />
        批量删除
      </button>
      <button class="btn btn-primary btn-sm" @click="emit('edit-item', null)">新增物料</button>
    </div>

    <div v-if="stockView === 'table'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">库存查询表</span>
        <span class="result-count">共 {{ filteredInventory.length }} 条</span>
      </div>
      <div class="panel-card-body no-padding">
        <div class="inv-table-wrap">
          <table class="inv-table">
            <thead>
              <tr>
                <th style="width: 40px">
                  <input v-model="stockSelectAll" type="checkbox" @change="toggleStockSelectAll" />
                </th>
                <th style="width: 50px; text-align: center">序号</th>
                <th v-if="stockColumnVisible.materialCode">编号</th>
                <th v-if="stockColumnVisible.materialName">物料名称</th>
                <th v-if="stockColumnVisible.grade">牌号</th>
                <th v-if="stockColumnVisible.color">颜色</th>
                <th v-if="stockColumnVisible.lastInboundDate">最近入库日期</th>
                <th v-if="stockColumnVisible.remainingStock" style="cursor: pointer" @click="toggleStockSort('stock')">
                  剩余库存(kg)
                  <Icon :name="stockSortIcon" :size="14" class="sort-icon" />
                </th>
                <th v-if="stockColumnVisible.safetyStock">安全库存</th>
                <th v-if="stockColumnVisible.unitPrice && canViewCost">单价</th>
                <th v-if="stockColumnVisible.totalValue && canViewCost">总价值</th>
                <th v-if="stockColumnVisible.alertStatus">预警状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedInventory.length === 0">
                <td colspan="13" class="empty-cell">
                  <div class="empty-state-icon"><Icon name="package" :size="24" /></div>
                  暂无库存数据
                </td>
              </tr>
              <tr v-for="(item, idx) in paginatedInventory" :key="item.id" :style="{ animationDelay: idx * 20 + 'ms' }">
                <td><input v-model="stockSelectedIds" type="checkbox" :value="item.id" /></td>
                <td style="width: 50px; text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                  {{ (stockPage - 1) * stockPageSize + idx + 1 }}
                </td>
                <td v-if="stockColumnVisible.materialCode" class="cell-mono">{{ item.code }}</td>
                <td v-if="stockColumnVisible.materialName">
                  <strong>{{ item.name }}</strong>
                </td>
                <td v-if="stockColumnVisible.grade">{{ item.grade || item.brand || '-' }}</td>
                <td v-if="stockColumnVisible.color">{{ item.color || '-' }}</td>
                <td v-if="stockColumnVisible.lastInboundDate" class="cell-xs">{{ item.lastInboundDate }}</td>
                <td v-if="stockColumnVisible.remainingStock" class="cell-mono">
                  <div class="stock-cell-with-bar">
                    <span
                      :style="{
                        color: alertColor(item.alertStatus),
                        fontWeight: item.alertStatus === 'exhausted' || item.alertStatus === 'low' ? 700 : 400
                      }"
                    >
                      {{ item.stock.toFixed(1) }}
                    </span>
                    <div
                      class="stock-mini-bar"
                      :title="'库存: ' + item.stock.toFixed(1) + 'kg / 安全库存: ' + item.safetyStockVal + 'kg'"
                    >
                      <div
                        class="stock-mini-bar-fill"
                        :style="{ width: stockBarPercent(item) + '%', background: stockBarColor(item.alertStatus) }"
                      ></div>
                    </div>
                    <span
                      v-if="item.alertStatus === 'exhausted' || item.alertStatus === 'low'"
                      class="stock-red-indicator"
                      :title="item.alertStatus === 'exhausted' ? '库存耗尽' : '低于安全库存'"
                    >
                      ●
                    </span>
                    <span
                      v-if="item.lastInboundDate && item.lastInboundDate !== '无入库记录'"
                      class="stock-trend-icon"
                      :title="'最近入库: ' + item.lastInboundDate"
                    >
                      📈
                    </span>
                  </div>
                </td>
                <td v-if="stockColumnVisible.safetyStock">{{ item.safetyStockVal }}</td>
                <td v-if="stockColumnVisible.unitPrice && canViewCost">{{ item.unitCost.toFixed(2) }}</td>
                <td v-if="stockColumnVisible.totalValue && canViewCost">{{ item.totalValue.toFixed(2) }}</td>
                <td v-if="stockColumnVisible.alertStatus">
                  <span class="alert-badge" :class="'alert-' + item.alertStatus">
                    {{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-ghost btn-sm" @click="emit('edit-item', item)">
                    <Icon name="edit" :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="stockView === 'table' && stockTotalPages > 1" class="pagination-bar">
      <span class="page-info">第 {{ stockPage }} / {{ stockTotalPages }} 页，共 {{ filteredInventory.length }} 条</span>
      <div class="page-btns">
        <button class="btn btn-ghost btn-sm" :disabled="stockPage <= 1" @click="stockPage--">
          <Icon name="chevronLeft" :size="14" />
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="stockPage >= stockTotalPages" @click="stockPage++">
          <Icon name="chevronRight" :size="14" />
        </button>
      </div>
    </div>

    <div v-if="stockView === 'list'" class="panel-card" style="margin-top: var(--space-3)">
      <div class="panel-card-header">
        <span class="panel-card-title">库存列表视图</span>
        <span class="result-count">共 {{ filteredInventory.length }} 条</span>
      </div>
      <div class="panel-card-body no-padding">
        <div
          v-for="(item, idx) in paginatedInventory"
          :key="item.id"
          class="stock-list-item"
          :style="{ animationDelay: idx * 50 + 'ms' }"
          @click="emit('edit-item', item)"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <strong style="color: var(--color-text-primary)">{{ item.name }}</strong>
              <span
                style="margin-left: var(--space-2); color: var(--color-text-tertiary); font-size: var(--font-size-xs)"
              >
                {{ item.code }}
              </span>
            </div>
            <span class="alert-badge" :class="'alert-' + item.alertStatus">
              {{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}
            </span>
          </div>
          <div
            style="
              display: flex;
              gap: var(--space-4);
              margin-top: var(--space-1);
              font-size: var(--font-size-xs);
              color: var(--color-text-tertiary);
            "
          >
            <span>牌号: {{ item.grade || item.brand || '-' }}</span>
            <span>库存: {{ item.stock.toFixed(1) }}kg</span>
            <span>最近入库: {{ item.lastInboundDate }}</span>
          </div>
        </div>
        <div v-if="filteredInventory.length === 0" class="empty-cell" style="padding: var(--space-8)">
          <div class="empty-state-icon"><Icon name="package" :size="24" /></div>
          暂无库存数据
        </div>
      </div>
    </div>

    <div v-if="stockView === 'card'" style="margin-top: var(--space-3)">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3)">
        <span style="font-size: var(--font-size-sm); color: var(--color-text-tertiary)">
          共 {{ filteredInventory.length }} 条
        </span>
      </div>
      <div class="stock-card-grid">
        <div
          v-for="(item, idx) in paginatedInventory"
          :key="item.id"
          class="stock-card-item"
          :style="{ animationDelay: idx * 60 + 'ms' }"
          @click="emit('edit-item', item)"
        >
          <div class="stock-card-top-bar" :style="{ background: alertBarColor(item.alertStatus) }"></div>
          <div
            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2)"
          >
            <strong>{{ item.name }}</strong>
            <span class="alert-badge" :class="'alert-' + item.alertStatus">
              {{ inventoryStore.ALERT_STATUS_MAP[item.alertStatus] }}
            </span>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
            <div>
              <span class="detail-label">编码</span>
              {{ item.code }}
            </div>
            <div>
              <span class="detail-label">仓库</span>
              {{ item.warehouse === 'main' ? '主仓库' : item.warehouse }}
            </div>
            <div>
              <span class="detail-label">数量</span>
              {{ item.stock.toFixed(1) }} kg
            </div>
            <div>
              <span class="detail-label">安全库存</span>
              {{ item.safetyStockVal }} kg
            </div>
            <div v-if="canViewCost">
              <span class="detail-label">单价</span>
              {{ item.unitCost.toFixed(2) }} 元
            </div>
            <div v-if="canViewCost">
              <span class="detail-label">总值</span>
              {{ item.totalValue.toFixed(2) }} 元
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="stockView === 'calendar'" class="panel-card" style="margin-top: var(--space-3)">
      <div class="panel-card-header">
        <button class="btn btn-ghost btn-sm" @click="stockCalPrev"><Icon name="chevronLeft" :size="14" /></button>
        <span class="panel-card-title">{{ stockCalYear }}年{{ stockCalMonth + 1 }}月</span>
        <button class="btn btn-ghost btn-sm" @click="stockCalNext"><Icon name="chevronRight" :size="14" /></button>
        <button class="btn btn-ghost btn-sm" @click="stockCalToday">今天</button>
      </div>
      <div v-safe-html="stockCalHtml" class="panel-card-body no-padding"></div>
    </div>

    <div v-if="showAssessment" style="margin-top: var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">
            <Icon name="search" :size="14" />
            库存自主评估报告
          </span>
          <button class="btn btn-ghost btn-sm" @click="showAssessment = false">
            <Icon name="close" :size="14" />
            关闭
          </button>
        </div>
        <div class="panel-card-body">
          <div class="assess-section">
            <div class="assess-section-title">
              <Icon name="chart" :size="14" />
              健康度评分
            </div>
            <div style="text-align: center; margin-bottom: var(--space-4)">
              <div
                :style="{
                  fontSize: '48px',
                  fontWeight: 800,
                  color:
                    healthScore >= 80
                      ? 'var(--color-success)'
                      : healthScore >= 50
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)'
                }"
              >
                {{ healthScore }}
                <span style="font-size: 20px; color: var(--color-text-tertiary)">/100</span>
              </div>
              <div class="assess-bar" style="max-width: 300px; margin: var(--space-3) auto">
                <div
                  class="assess-bar-fill"
                  :style="{
                    width: healthScore + '%',
                    background:
                      healthScore >= 80
                        ? 'var(--color-success)'
                        : healthScore >= 50
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)'
                  }"
                ></div>
              </div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">
                {{ healthScore >= 80 ? '库存状况良好' : healthScore >= 50 ? '库存需要关注' : '库存状况危急' }}
              </div>
            </div>
          </div>
          <div class="assess-grid">
            <div class="assess-section">
              <div class="assess-section-title">
                <Icon name="list" :size="14" />
                基础指标
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">物料种类</span>
                <span class="assess-metric-value">{{ inventoryStore.enrichedInventory.length }}</span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">总库存(kg)</span>
                <span class="assess-metric-value">{{ inventoryStore.totalStockWeight.toFixed(1) }}</span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">库存总值(元)</span>
                <span class="assess-metric-value">{{ formatNumber(inventoryStore.totalStockValue) }}</span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">安全库存总量(kg)</span>
                <span class="assess-metric-value">{{ totalSafetyStock.toFixed(1) }}</span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">库存满足率</span>
                <span
                  class="assess-metric-value"
                  :style="{ color: fillRate >= 100 ? 'var(--color-success)' : 'var(--color-warning)' }"
                >
                  {{ fillRate }}%
                </span>
              </div>
            </div>
            <div class="assess-section">
              <div class="assess-section-title">
                <Icon name="warning" :size="14" />
                预警分布
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">库存耗尽</span>
                <span class="assess-metric-value" style="color: var(--color-danger)">
                  {{ inventoryStore.exhaustedCount }}
                </span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">低于安全库存</span>
                <span class="assess-metric-value" style="color: var(--color-warning)">
                  {{ inventoryStore.lowStockCount }}
                </span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">超量库存</span>
                <span class="assess-metric-value" style="color: var(--color-purple)">
                  {{ inventoryStore.overStockCount }}
                </span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">库存正常</span>
                <span class="assess-metric-value" style="color: var(--color-success)">
                  {{ inventoryStore.normalStockCount }}
                </span>
              </div>
              <div class="assess-metric">
                <span class="assess-metric-label">预警率</span>
                <span
                  class="assess-metric-value"
                  :style="{ color: alertRate > 30 ? 'var(--color-danger)' : 'var(--color-warning)' }"
                >
                  {{ alertRate }}%
                </span>
              </div>
            </div>
          </div>
          <div class="assess-section">
            <div class="assess-section-title">
              <Icon name="info" :size="14" />
              改进建议
            </div>
            <div v-for="(rec, idx) in assessmentRecommendations" :key="idx" class="assess-recommendation">
              <Icon :name="rec.icon" :size="14" />
              {{ rec.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'StockSection' }
</script>
<script setup>
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { usePermission } from '@/utils/permissionGuard'
import { escapeHtml, formatNumber } from '@/utils/format'
import { useClickOutside } from '@/composables/useClickOutside'

const emit = defineEmits(['edit-item', 'open-inbound-wizard'])

const inventoryStore = useInventoryStore()
const perm = usePermission()

const canDeleteInbound = computed(() => perm.isAllowed('inbound', 'inboundDelete'))
const canViewCost = computed(() => perm.isAllowed('inbound', 'inboundViewCost'))

/* 库存列表列配置 */
const stockColumnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'materialCode', label: '编号' },
  { key: 'materialName', label: '物料名称' },
  { key: 'grade', label: '牌号' },
  { key: 'color', label: '颜色' },
  { key: 'lastInboundDate', label: '最近入库日期' },
  { key: 'remainingStock', label: '剩余库存(kg)' },
  { key: 'safetyStock', label: '安全库存' },
  { key: 'unitPrice', label: '单价' },
  { key: 'totalValue', label: '总价值' },
  { key: 'alertStatus', label: '预警状态' },
  { key: 'actions', label: '操作', hideable: false }
]
const stockColumnVisible = ref(
  Object.fromEntries(stockColumnDefs.filter((c) => c.hideable !== false).map((c) => [c.key, true]))
)

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})

function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 8 + 'px', left: rect.left + 'px' }
  }
}

const stockSearch = ref('')
const stockCategoryFilter = ref('')
const stockAlertFilter = ref('')
const stockWarehouseFilter = ref('')
const stockPage = ref(1)
const stockPageSize = ref(15)
const stockSortField = ref('')
const stockSortDir = ref('asc')
const stockView = ref('table')
const stockViewMenuOpen = ref(false)
const stockSelectAll = ref(false)
const stockSelectedIds = ref([])
const showAssessment = ref(false)
const showStockStatsExpanded = ref(false)
const stockCalYear = ref(new Date().getFullYear())
const stockCalMonth = ref(new Date().getMonth())

const filteredInventory = computed(() => {
  let list = inventoryStore.enrichedInventory
  const search = stockSearch.value.toLowerCase()
  if (search) {
    list = list.filter((i) => [i.code, i.name, i.grade, i.brand, i.color].join(' ').toLowerCase().includes(search))
  }
  if (stockCategoryFilter.value) {
    list = list.filter((i) => i.category === stockCategoryFilter.value)
  }
  if (stockAlertFilter.value) {
    list = list.filter((i) => i.alertStatus === stockAlertFilter.value)
  }
  if (stockWarehouseFilter.value) {
    list = list.filter((i) => i.warehouse === stockWarehouseFilter.value)
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

const stockTotalPages = computed(() => Math.max(1, Math.ceil(filteredInventory.value.length / stockPageSize.value)))
const paginatedInventory = computed(() => {
  const start = (stockPage.value - 1) * stockPageSize.value
  return filteredInventory.value.slice(start, start + stockPageSize.value)
})

/* 筛选条件变化时重置页码 */
watch([stockSearch, stockCategoryFilter, stockAlertFilter, stockWarehouseFilter], () => {
  stockPage.value = 1
})

const stockSortIcon = computed(() => {
  if (!stockSortField.value) return 'filter'
  return stockSortDir.value === 'asc' ? 'chevronUp' : 'chevronDown'
})

/* ====== 概览面板计算 ====== */

/* 库存健康度 */
const healthScore = computed(() => {
  const total = inventoryStore.enrichedInventory.length
  return total > 0 ? Math.round((inventoryStore.normalStockCount / total) * 100) : 100
})
const RING_C = 2 * Math.PI * 26
const healthScoreColor = computed(() => {
  const s = healthScore.value
  if (s >= 80) return 'var(--color-success)'
  if (s >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const healthScoreDash = computed(() => {
  const p = healthScore.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 预警分布百分比 */
function alertPercent(status) {
  const total = inventoryStore.enrichedInventory.length
  if (total === 0) return 0
  const counts = {
    exhausted: inventoryStore.exhaustedCount,
    low: inventoryStore.lowStockCount,
    over: inventoryStore.overStockCount,
    ok: inventoryStore.normalStockCount
  }
  return Math.round(((counts[status] || 0) / total) * 100)
}

/* 库存价值TOP5 */
const VALUE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#64748b']
const topValueItems = computed(() => {
  const items = inventoryStore.enrichedInventory
    .map((i) => ({ code: i.code, name: i.name, value: i.totalValue || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const max = items.length > 0 ? items[0].value : 1
  return items.map((v, i) => ({
    ...v,
    percent: Math.round((v.value / max) * 100),
    color: VALUE_COLORS[i]
  }))
})

/* 库存预警 */
const criticalAlerts = computed(() => {
  return inventoryStore.enrichedInventory
    .filter((i) => i.alertStatus === 'exhausted' || i.alertStatus === 'low')
    .sort((a, b) => {
      if (a.alertStatus === 'exhausted' && b.alertStatus !== 'exhausted') return -1
      if (a.alertStatus !== 'exhausted' && b.alertStatus === 'exhausted') return 1
      return (a.stock || 0) - (b.stock || 0)
    })
    .slice(0, 8)
})

const totalSafetyStock = computed(() => inventoryStore.enrichedInventory.reduce((s, i) => s + i.safetyStockVal, 0))

const fillRate = computed(() => {
  const ts = totalSafetyStock.value
  return ts > 0 ? Math.round((inventoryStore.totalStockWeight / ts) * 100) : 100
})

const alertRate = computed(() => {
  const total = inventoryStore.enrichedInventory.length
  return total > 0 ? Math.round(((inventoryStore.exhaustedCount + inventoryStore.lowStockCount) / total) * 100) : 0
})

const assessmentRecommendations = computed(() => {
  const recs = []
  if (inventoryStore.exhaustedCount > 0)
    recs.push({
      icon: 'warning',
      text: '有 ' + inventoryStore.exhaustedCount + ' 种物料库存已耗尽，建议立即安排采购补货'
    })
  if (inventoryStore.lowStockCount > 0)
    recs.push({
      icon: 'warning',
      text: '有 ' + inventoryStore.lowStockCount + ' 种物料低于安全库存，建议尽快补货至安全水位'
    })
  if (inventoryStore.overStockCount > 0)
    recs.push({
      icon: 'circle',
      text: '有 ' + inventoryStore.overStockCount + ' 种物料超量库存，建议控制采购节奏，减少资金占用'
    })
  if (alertRate.value > 30) recs.push({ icon: 'warning', text: '预警率超过30%，建议重新评估安全库存阈值和采购策略' })
  if (fillRate.value < 80) recs.push({ icon: 'chevronDown', text: '库存满足率不足80%，建议增加安全库存或缩短采购周期' })
  if (recs.length === 0) recs.push({ icon: 'check', text: '库存状况良好，请继续保持当前管理水平' })
  return recs
})

const stockCalHtml = computed(() => {
  const year = stockCalYear.value
  const month = stockCalMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  const itemsByDate = {}
  for (const item of inventoryStore.enrichedInventory) {
    const d = item.lastInboundDate && item.lastInboundDate !== '无入库记录' ? item.lastInboundDate : ''
    if (d) {
      if (!itemsByDate[d]) itemsByDate[d] = []
      itemsByDate[d].push(item)
    }
  }
  let html =
    '<table class="cal-table"><thead><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr></thead><tbody>'
  let day = 1
  for (let i = 0; i < 6; i++) {
    if (day > daysInMonth) break
    html += '<tr>'
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) {
        html += '<td></td>'
        continue
      }
      if (day > daysInMonth) {
        html += '<td></td>'
        continue
      }
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      const isToday = dateStr === todayStr
      const dayItems = itemsByDate[dateStr] || []
      html +=
        '<td' +
        (isToday ? ' style="background:var(--color-accent-subtle)"' : '') +
        '><div style="font-weight:' +
        (isToday ? '700' : '400') +
        '">' +
        day +
        '</div>'
      for (const di of dayItems.slice(0, 2)) {
        html +=
          '<div style="font-size:10px;color:var(--color-text-tertiary);;overflow-wrap:break-word;word-wrap:break-word">' +
          escapeHtml(di.name) +
          '</div>'
      }
      if (dayItems.length > 2)
        html += '<div style="font-size:10px;color:var(--color-accent)">+' + (dayItems.length - 2) + '</div>'
      html += '</td>'
      day++
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
})

function toggleStockSort(field) {
  if (stockSortField.value === field) {
    stockSortDir.value = stockSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    stockSortField.value = field
    stockSortDir.value = 'asc'
  }
}

function alertColor(status) {
  return inventoryStore.ALERT_STATUS_COLORS[status] || 'var(--color-text-secondary)'
}

function stockBarPercent(item) {
  const safety = item.safetyStockVal || 1
  const stock = item.stock || 0
  const percent = Math.min(Math.round((stock / safety) * 100), 100)
  return Math.max(percent, 0)
}

function stockBarColor(status) {
  const map = {
    exhausted: 'var(--color-danger)',
    low: 'var(--color-warning)',
    over: 'var(--color-info)',
    ok: 'var(--color-success)'
  }
  return map[status] || 'var(--color-text-tertiary)'
}

function alertBarColor(status) {
  const map = {
    exhausted: 'var(--color-danger)',
    low: 'var(--color-warning)',
    over: 'var(--color-info)',
    ok: 'var(--color-success)'
  }
  return map[status] || 'var(--color-text-tertiary)'
}

function toggleStockSelectAll() {
  stockSelectedIds.value = stockSelectAll.value ? paginatedInventory.value.map((i) => i.id) : []
}

function handleBatchDeleteInventory() {
  if (stockSelectedIds.value.length === 0) return
  if (!window.confirm('确认删除选中的 ' + stockSelectedIds.value.length + ' 条物料？此操作不可撤销。')) return
  inventoryStore.batchDeleteInventory(stockSelectedIds.value)
  stockSelectedIds.value = []
  stockSelectAll.value = false
  inventoryStore.addAuditLog('delete', 'inventory', '批量删除物料')
}

function runInventoryAssessment() {
  showAssessment.value = true
}

function stockCalPrev() {
  stockCalMonth.value--
  if (stockCalMonth.value < 0) {
    stockCalMonth.value = 11
    stockCalYear.value--
  }
}

function stockCalNext() {
  stockCalMonth.value++
  if (stockCalMonth.value > 11) {
    stockCalMonth.value = 0
    stockCalYear.value++
  }
}

function stockCalToday() {
  stockCalYear.value = new Date().getFullYear()
  stockCalMonth.value = new Date().getMonth()
}

async function handleExport() {
  const data = inventoryStore.enrichedInventory
  const filename = '库存数据'
  try {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, filename)
    XLSX.writeFile(wb, filename + '_' + new Date().toISOString().split('T')[0] + '.xlsx')
  } catch (e) {
    console.warn('[StockSection] XLSX导出失败，回退为JSON导出:', e)
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

function handleColumnConfigClick(e) {
  const wrapper = document.querySelector('.column-config-wrapper')
  if (showColumnConfig.value && wrapper && !wrapper.contains(e.target)) {
    showColumnConfig.value = false
  }
}

useClickOutside(handleColumnConfigClick)
</script>

<style scoped>
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

/* ====== 预警优先状态条 ====== */
.alert-priority-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
  border: 1px solid;
}
.alert-priority-bar.danger {
  background: var(--color-danger-subtle);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger);
}
.alert-priority-bar.warning {
  background: var(--color-warning-subtle);
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--color-warning);
}
.alert-priority-bar.success {
  background: var(--color-success-subtle);
  border-color: rgba(16, 185, 129, 0.3);
  color: var(--color-success);
}
.alert-priority-bar .alert-priority-icon {
  font-size: 16px;
}
.alert-priority-bar .alert-priority-text {
  font-weight: 600;
}
.alert-priority-bar .alert-priority-detail {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  margin-left: auto;
}

/* ====== 紧凑指标条 ====== */
.compact-metrics {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
}
.compact-metric {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.compact-metric-dot {
  width: 6px;
  height: 6px;
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
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
}
.compact-metric-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.compact-metric-sep {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  margin: 0 var(--space-1);
}

/* ====== 统计卡片动画 ====== */
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
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.inv-stat-card:hover {
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
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
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
  0%,
  100% {
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
  }
}

.inv-stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* ====== 概览面板 ====== */
.stock-overview-row {
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

/* 预警分布条形图 */
.alert-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.alert-bar-item {
  display: grid;
  grid-template-columns: 36px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.alert-bar-label {
  font-weight: 500;
}
.alert-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.alert-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.alert-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* 库存价值TOP5 */
.value-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.value-bar-item {
  display: grid;
  grid-template-columns: 70px 1fr 60px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.value-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}
.value-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.value-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.value-bar-amount {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
  font-size: 10px;
}

/* ====== 库存预警区域 ====== */
.stock-alert-panel {
  margin-bottom: var(--space-3);
  border-left: 3px solid var(--color-danger);
}
.alert-dot-pulse-danger {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: alertDotPulseDanger 1.5s ease-in-out infinite;
  margin-right: var(--space-1);
}
@keyframes alertDotPulseDanger {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
  }
}
.stock-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.stock-alert-item:last-child {
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
.stock-alert-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.stock-alert-name {
  font-weight: 600;
  color: var(--color-text-primary);
}
.stock-alert-code {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.stock-alert-stock {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.stock-alert-safety {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  margin-left: auto;
}

/* ====== 工具栏 ====== */
.inv-toolbar {
  display: flex;
  justify-content: flex-start;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.inv-search {
  position: relative;
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

/* ====== 表格行入场动画 ====== */
.inv-table tbody tr {
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

/* ====== 库存水平可视化 ====== */
.stock-cell-with-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.stock-mini-bar {
  width: 40px;
  height: 4px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}
.stock-mini-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.stock-red-indicator {
  color: var(--color-danger);
  font-size: 8px;
  line-height: 1;
  animation: redIndicatorPulse 1.5s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes redIndicatorPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.stock-trend-icon {
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  cursor: help;
}

.cell-xs {
  font-size: var(--font-size-xs);
}

.cell-actions {
}

.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
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

.alert-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
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

.sort-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

/* ====== 列表视图 ====== */
.stock-list-item {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  animation: listSlideIn 0.3s ease-out both;
  transition: all 0.2s ease;
}
.stock-list-item:hover {
  background: var(--color-surface-hover);
  transform: translateX(2px);
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

/* ====== 卡片视图 ====== */
.stock-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.stock-card-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  padding-top: calc(var(--space-4) + var(--space-1));
  cursor: pointer;
  transition: all 0.25s ease;
  animation: cardFadeIn 0.4s ease-out both;
  overflow: hidden;
  position: relative;
}
.stock-card-item:hover {
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
.stock-card-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

/* ====== 评估报告 ====== */
.assess-section {
  margin-bottom: var(--space-4);
}

.assess-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.assess-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.assess-metric {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-base);
}

.assess-metric-label {
  color: var(--color-text-tertiary);
}

.assess-metric-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.assess-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.assess-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.assess-recommendation {
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

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
  overflow-wrap: break-word;
  word-wrap: break-word;
}

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
  z-index: var(--z-dropdown);
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

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  margin-right: var(--space-2);
}

@media (max-width: 1200px) {
  .inv-stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .stock-overview-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .inv-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .assess-grid {
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
}
</style>
