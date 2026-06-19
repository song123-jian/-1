<template>
  <div class="contract-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">合同管理</h2>
        <div class="page-header-subtitle status-flow-bar">
          <button
            v-for="(label, key) in statusLabels"
            :key="key"
            class="status-flow-chip"
            :class="{ active: filterStatus === key }"
            @click="filterStatus = filterStatus === key ? '' : key"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in viewModes.filter((vm) => !vm.inMore)"
            :key="v.key"
            class="view-btn"
            :class="{ active: currentView === v.key }"
            :title="v.label"
            @click="currentView = v.key"
          >
            <Icon :name="v.icon" :size="14" />
          </button>
          <div class="view-more-wrapper">
            <button
              class="view-btn"
              :class="{ active: viewModes.filter((vm) => vm.inMore).some((vm) => currentView === vm.key) }"
              title="更多视图"
              @click="showViewMore = !showViewMore"
            >
              <Icon name="chevronDown" :size="14" />
            </button>
            <div v-if="showViewMore" class="view-more-dropdown">
              <button
                v-for="v in viewModes.filter((vm) => vm.inMore)"
                :key="v.key"
                class="view-more-item"
                :class="{ active: currentView === v.key }"
                @click="currentView = v.key; showViewMore = false"
              >
                {{ v.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline btn-icon" title="列配置" @click="toggleColumnConfig">
            <Icon name="setting" :size="14" />
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
        <button
          class="btn btn-outline btn-icon"
          :title="showAnalytics ? '列表' : '分析'"
          @click="showAnalytics = !showAnalytics"
        >
          <Icon :name="showAnalytics ? 'list' : 'chart'" :size="14" />
        </button>
        <div class="more-actions-wrapper">
          <button class="btn btn-outline btn-icon" title="更多操作" @click="showMoreActions = !showMoreActions">
            <Icon name="more" :size="14" />
          </button>
          <div v-if="showMoreActions" class="more-actions-dropdown">
            <button
              class="more-actions-item"
              @click="handleExport; showMoreActions = false"
            >
              <Icon name="download" :size="14" />
              导出
            </button>
            <button
              v-if="canDelete"
              class="more-actions-item"
              :disabled="selectedIds.length === 0"
              @click="handleBatchDelete; showMoreActions = false"
            >
              <Icon name="delete" :size="14" />
              批量删除
            </button>
            <button
              class="more-actions-item"
              @click="openTemplateManager; showMoreActions = false"
            >
              <Icon name="file" :size="14" />
              模板管理
            </button>
          </div>
        </div>
        <button v-if="canCreate" class="btn btn-primary btn-lg" @click="openWizard">新建合同</button>
      </div>
    </div>

    <div class="contract-toolbar">
      <div class="contract-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索合同编号/客户名称/合同类型..." />
      </div>
      <select v-model="filterStatus" class="form-select filter-select">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_approval">待审批</option>
        <option value="approved">已审批</option>
        <option value="signed">已签订</option>
        <option value="archived">已归档</option>
        <option value="cancelled">已作废</option>
      </select>
      <select v-model="filterType" class="form-select filter-select">
        <option value="">全部类型</option>
        <option value="购销合同">购销合同</option>
        <option value="采购合同">采购合同</option>
        <option value="服务合同">服务合同</option>
        <option value="框架协议">框架协议</option>
        <option value="技术协议">技术协议</option>
      </select>
      <button class="btn btn-outline btn-sm" @click="showAdvFilter = !showAdvFilter">
        {{ showAdvFilter ? '收起' : '高级筛选' }}
        <Icon :name="showAdvFilter ? 'chevronUp' : 'chevronDown'" :size="12" />
      </button>
    </div>
    <div v-if="showAdvFilter" class="contract-toolbar-adv">
      <select v-model="filterSettlement" class="form-select filter-select">
        <option value="">全部结算方式</option>
        <option value="款到发货">款到发货</option>
        <option value="月结30天">月结30天</option>
        <option value="月结60天">月结60天</option>
        <option value="月结90天">月结90天</option>
        <option value="货到付款">货到付款</option>
      </select>
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
      <div class="filter-date-group">
        <input v-model="filterDateFrom" type="date" class="form-input filter-date" title="签订日期起" />
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateTo" type="date" class="form-input filter-date" title="签订日期止" />
      </div>
      <input v-model.number="filterAmountMin" type="number" class="form-input filter-amount" placeholder="金额≥(万)" />
      <input v-model.number="filterAmountMax" type="number" class="form-input filter-amount" placeholder="金额≤(万)" />
      <button class="btn btn-outline filter-reset-btn" @click="resetFilters">重置</button>
    </div>
    <div v-if="hasActiveFilters" class="filter-tags-bar">
      <span v-if="filterStatus" class="filter-tag">
        {{ statusLabels[filterStatus] }}
        <button @click="filterStatus = ''">×</button>
      </span>
      <span v-if="filterType" class="filter-tag">
        {{ filterType }}
        <button @click="filterType = ''">×</button>
      </span>
      <span v-if="filterSettlement" class="filter-tag">
        {{ filterSettlement }}
        <button @click="filterSettlement = ''">×</button>
      </span>
      <span v-if="filterCustomerId" class="filter-tag">
        客户筛选
        <button @click="filterCustomerId = ''">×</button>
      </span>
      <span v-if="filterDateFrom" class="filter-tag">
        {{ filterDateFrom }}起
        <button @click="filterDateFrom = ''">×</button>
      </span>
      <span v-if="filterDateTo" class="filter-tag">
        {{ filterDateTo }}止
        <button @click="filterDateTo = ''">×</button>
      </span>
      <span v-if="filterAmountMin" class="filter-tag">
        ≥{{ filterAmountMin }}万
        <button @click="filterAmountMin = ''">×</button>
      </span>
      <span v-if="filterAmountMax" class="filter-tag">
        ≤{{ filterAmountMax }}万
        <button @click="filterAmountMax = ''">×</button>
      </span>
      <button class="filter-tag-clear" @click="resetFilters">清除全部</button>
    </div>

    <div class="contract-stats-bar">
      <div class="kpi-card-sm" @click="filterStatus = 'signed'">
        <div class="kpi-ring-sm" title="点击筛选已签订合同">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-border)" stroke-width="3" />
            <circle
              cx="20"
              cy="20"
              r="15"
              fill="none"
              :stroke="signRateColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="signRateDashSmall"
              stroke-dashoffset="0"
              transform="rotate(-90 20 20)"
              class="stats-ring-progress"
            />
          </svg>
          <span class="kpi-ring-val" :style="{ color: signRateColor }">{{ signRate }}%</span>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">
            <Icon name="chart" :size="12" class="kpi-icon" />
            签订率
          </span>
          <span class="kpi-trend" :class="signRateTrendDir">
            {{ signRateTrendDir === 'up' ? '↑' : '↓' }} {{ signRateTrendVal }}%
          </span>
        </div>
      </div>
      <div class="kpi-card-sm" @click="filterStatus = ''">
        <div class="kpi-info">
          <span class="kpi-val mono">¥{{ formatNumber(contractStore.totalAmount) }}</span>
          <span class="kpi-label">
            <Icon name="list" :size="12" class="kpi-icon" />
            合同总额
          </span>
          <span class="kpi-trend up">↑ 12.5%</span>
        </div>
      </div>
      <div class="kpi-card-sm" @click="filterStatus = 'signed'">
        <div class="kpi-info">
          <span class="kpi-val mono text-success">¥{{ formatNumber(contractStore.signedAmount) }}</span>
          <span class="kpi-label">
            <Icon name="edit" :size="12" class="kpi-icon" />
            已签订金额
          </span>
          <span class="kpi-trend up">↑ 8.3%</span>
        </div>
      </div>
      <div
        v-if="contractStore.expiringCount > 0"
        class="kpi-card-sm kpi-card-expiring"
        @click="filterStatus = 'signed'"
      >
        <div class="kpi-info">
          <span class="kpi-val mono text-warning expiring-pulse">{{ contractStore.expiringCount }}</span>
          <span class="kpi-label">
            <Icon name="clock" :size="12" class="kpi-icon" />
            即将到期
          </span>
          <span class="kpi-trend down">↓ 3.2%</span>
        </div>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <div v-if="showAnalytics" class="analytics-panel">
      <div class="analytics-kpis">
        <div class="kpi-card">
          <div class="kpi-value">{{ contractStore.contracts.length }}</div>
          <div class="kpi-label">合同总数</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-success">{{ contractStore.signedCount }}</div>
          <div class="kpi-label">已签订</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-accent">¥{{ formatNumber(contractStore.signedAmount) }}</div>
          <div class="kpi-label">已签金额</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-warning">{{ contractStore.expiringCount }}</div>
          <div class="kpi-label">即将到期</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-danger">{{ contractStore.cancelledCount }}</div>
          <div class="kpi-label">已作废</div>
        </div>
      </div>
      <div class="analytics-grid">
        <div class="panel-card">
          <div class="panel-card-header">状态分布</div>
          <div class="panel-card-body">
            <div v-for="(label, key) in statusLabels" :key="key" class="bar-row">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: barWidth(key), background: statusColors[key] }"></div>
              </div>
              <span class="bar-value">{{ contractStore.statusCounts[key] || 0 }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">客户合同金额 TOP10</div>
          <div class="panel-card-body">
            <div v-for="(c, i) in contractStore.customerTopList" :key="c.name" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.name }}</span>
              <span class="top-amount mono">¥{{ formatNumber(c.amount) }}</span>
            </div>
            <div v-if="contractStore.customerTopList.length === 0" class="empty-hint">暂无数据</div>
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
                  <th style="width: 40px">
                    <div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">[√]</div>
                  </th>
                  <th style="width: 50px; text-align: center">
                    <Icon name="list" :size="12" class="th-icon" />
                    序号
                  </th>
                  <th v-if="columnVisible.contractNo" style="width: 140px">
                    <Icon name="file" :size="12" class="th-icon" />
                    合同编号
                  </th>
                  <th v-if="columnVisible.signDate" style="width: 110px; text-align: center">
                    <Icon name="calendar" :size="12" class="th-icon" />
                    签订日期
                  </th>
                  <th v-if="columnVisible.partyA" style="min-width: 100px">
                    <Icon name="user" :size="12" class="th-icon" />
                    甲方
                  </th>
                  <th v-if="columnVisible.partyB" style="min-width: 100px">
                    <Icon name="user" :size="12" class="th-icon" />
                    乙方
                  </th>
                  <th v-if="columnVisible.paymentDate" style="width: 110px; text-align: center">
                    <Icon name="clock" :size="12" class="th-icon" />
                    回款日
                  </th>
                  <th v-if="columnVisible.unitPrice" style="width: 100px; text-align: right">
                    <Icon name="tag" :size="12" class="th-icon" />
                    单价
                  </th>
                  <th v-if="columnVisible.totalAmount" style="width: 120px; text-align: right">
                    <Icon name="chart" :size="12" class="th-icon" />
                    金额
                  </th>
                  <th v-if="columnVisible.settlement" style="width: 100px; text-align: center">
                    <Icon name="setting" :size="12" class="th-icon" />
                    结算方式
                  </th>
                  <th v-if="columnVisible.status" style="width: 80px; text-align: center">
                    <Icon name="eye" :size="12" class="th-icon" />
                    状态
                  </th>
                  <th v-if="columnVisible.relatedDocs" style="width: 80px; text-align: center">
                    <Icon name="link" :size="12" class="th-icon" />
                    关联单据
                  </th>
                  <th style="min-width: 200px; text-align: center">
                    <Icon name="more" :size="12" class="th-icon" />
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedContracts.length === 0">
                  <td colspan="13" class="empty-state">
                    <div class="empty-state-icon"><Icon name="file" :size="24" /></div>
                    <div>暂无合同数据</div>
                    <button
                      v-if="canCreate"
                      class="btn btn-primary btn-sm"
                      style="margin-top: var(--space-3)"
                      @click="openWizard"
                    >
                      创建第一份合同
                    </button>
                  </td>
                </tr>
                <tr v-for="(c, index) in pagedContracts" :key="c.id" class="data-row" @click="openPreview(c)">
                  <td>
                    <div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">
                      [√]
                    </div>
                  </td>
                  <td style="width: 50px; text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                    {{ (currentPage - 1) * pageSize + index + 1 }}
                  </td>
                  <td v-if="columnVisible.contractNo" class="mono">
                    <strong style="color: var(--color-accent)">{{ c.contractNo }}</strong>
                  </td>
                  <td v-if="columnVisible.signDate" style="text-align: center">{{ c.signDate || '-' }}</td>
                  <td v-if="columnVisible.partyA">{{ c.partyA }}</td>
                  <td v-if="columnVisible.partyB">{{ c.partyB || COMPANY_DEFAULTS.name }}</td>
                  <td v-if="columnVisible.paymentDate" style="text-align: center">{{ getPaymentDate(c) }}</td>
                  <td v-if="columnVisible.unitPrice" class="mono" style="text-align: right">
                    {{ getFirstUnitPrice(c) }}
                  </td>
                  <td v-if="columnVisible.totalAmount" class="mono" style="text-align: right">
                    ¥{{ formatNumber(c.totalAmount) }}
                  </td>
                  <td v-if="columnVisible.settlement" style="text-align: center">{{ c.settlement || '-' }}</td>
                  <td v-if="columnVisible.status" style="text-align: center">
                    <span class="status-badge" :class="'status-' + c.status">
                      {{ statusLabels[c.status] || c.status }}
                    </span>
                  </td>
                  <td v-if="columnVisible.relatedDocs" style="text-align: center">
                    <span
                      v-if="getRelatedCount(c) > 0"
                      class="related-count-badge"
                      @click="openPreview(c); previewTab = 'related'"
                    >
                      {{ getRelatedCount(c) }}份
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td class="cell-actions">
                    <button class="action-btn action-btn-primary" @click="openPreview(c)">预览</button>
                    <button class="action-btn action-btn-primary" @click="openWizard(c.id)">编辑</button>
                    <button
                      v-if="c.status === 'draft'"
                      class="action-btn action-btn-primary"
                      @click="handleSubmitApproval(c)"
                    >
                      提交审批
                    </button>
                    <button
                      v-if="c.status === 'approved' && canSign"
                      class="action-btn action-btn-primary action-btn-sign"
                      @click="handleSign(c)"
                    >
                      签订
                    </button>
                    <div class="action-more-wrapper">
                      <button class="action-btn action-btn-text" @click="toggleRowActions(c.id)">更多 ▾</button>
                      <div v-if="activeRowActions === c.id" class="action-more-dropdown">
                        <button
                          v-if="c.status === 'pending_approval' && canApprove"
                          class="action-more-item"
                          @click="handleApprove(c); activeRowActions = null"
                        >
                          通过
                        </button>
                        <button
                          v-if="c.status === 'pending_approval'"
                          class="action-more-item danger"
                          @click="handleReject(c); activeRowActions = null"
                        >
                          驳回
                        </button>
                        <button
                          v-if="c.status === 'signed'"
                          class="action-more-item"
                          @click="handleArchive(c); activeRowActions = null"
                        >
                          归档
                        </button>
                        <button
                          v-if="c.status === 'approved' || c.status === 'signed'"
                          class="action-more-item danger"
                          @click="handleCancel(c); activeRowActions = null"
                        >
                          作废
                        </button>
                        <button
                          class="action-more-item"
                          @click="handleDuplicate(c); activeRowActions = null"
                        >
                          复制
                        </button>
                        <button
                          v-if="canDelete"
                          class="action-more-item danger"
                          @click="handleDelete(c); activeRowActions = null"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="totalPages > 1" class="pagination-bar">
            <select
              v-model.number="pageSize"
              class="form-select"
              style="height: 28px; font-size: 12px; width: auto; padding: 0 var(--space-2)"
            >
              <option :value="15">15条/页</option>
              <option :value="30">30条/页</option>
              <option :value="50">50条/页</option>
            </select>
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
              第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredContracts.length }} 条
            </span>
          </div>
        </div>
      </div>

      <ContractListView
        :current-view="currentView"
        :contracts="filteredContracts"
        :selected-ids="selectedIds"
        :status-labels="statusLabels"
        :status-colors="statusColors"
        :can-delete="canDelete"
        :can-sign="canSign"
        @open-preview="openPreview"
        @open-wizard="openWizard"
        @toggle-select="toggleSelect"
        @duplicate="handleDuplicate"
        @delete="handleDelete"
        @submit-approval="handleSubmitApproval"
        @sign="handleSign"
      />

      <ContractCalendarView
        :current-view="currentView"
        :calendar-month="calendarMonth"
        :calendar-days="calendarDays"
        :week-days="weekDays"
        :status-labels="statusLabels"
        :status-colors="statusColors"
        @open-preview="openPreview"
        @prev-month="prevMonth"
        @next-month="nextMonth"
        @prev-week="prevWeek"
        @next-week="nextWeek"
        @today-month="
          calendarMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
        "
        @today-week="weekViewDate = new Date()"
      />

      <div v-if="currentView === 'funnel'" class="sales-funnel">
        <div v-for="(stage, idx) in funnelStages" :key="stage.key" class="funnel-stage">
          <div class="funnel-bar" :style="{ width: stage.width + '%', background: statusColors[stage.key] }">
            <span class="funnel-label">{{ stage.label }}</span>
            <span class="funnel-count">{{ stage.count }} 笔</span>
            <span class="funnel-amount">¥{{ formatNumber(stage.amount) }}</span>
          </div>
          <div v-if="idx < funnelStages.length - 1" class="funnel-conversion">
            <span class="funnel-arrow">↓</span>
            <span class="funnel-rate">{{ stage.conversionRate }}%</span>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <ContractFormModal
        v-model:wizard-data="wizardData"
        :show-modal="showWizard"
        :wizard-step="wizardStep"
        :is-editing="isEditing"
        :terms-editing="termsEditing"
        :customers="customerStore.customers"
        :save-as-template-flag="saveAsTemplateFlag"
        :show-template-modal="showTemplateModal"
        :templates="contractStore.templates"
        :ai-parsing="aiParsing"
        :show-reject-modal="showRejectModal"
        :reject-reason="rejectReason"
        @close="closeWizard"
        @next-step="nextStep"
        @prev-step="wizardStep--"
        @save-draft="saveDraft"
        @submit-contract="submitContract"
        @add-product-row="addProductRow"
        @remove-product-row="removeProductRow"
        @party-a-change="onPartyAChange"
        @upload-seal="uploadSeal"
        @toggle-terms-editing="termsEditing = !termsEditing"
        @update:save-as-template-flag="saveAsTemplateFlag = $event"
        @close-template-modal="showTemplateModal = false"
        @template-drop="handleContractTemplateDrop"
        @template-file-select="handleContractTemplateFileSelect"
        @use-template="useTemplate"
        @delete-template="deleteTemplate"
        @save-as-template="saveCurrentAsTemplate"
        @close-reject-modal="showRejectModal = false"
        @update:reject-reason="rejectReason = $event"
        @confirm-reject="confirmReject"
      />

      <ContractPreview
        :show-preview="showPreview"
        :contract="previewContract"
        :preview-tab="previewTab"
        @close="showPreview = false; previewContract = null; document.body.style.overflow = ''"
        @update-preview-tab="previewTab = $event"
      />
    </Teleport>
  </div>
</template>

<script>
export default { name: 'Contracts' }
</script>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import { usePermission } from '@/utils/permissionGuard'
import { formatNumber, toLocalDateStr } from '@/utils/format'
import { COMPANY_DEFAULTS } from '../config/companyDefaults'

import ContractFormModal from '@/modules/sales/components/contracts/ContractFormModal.vue'
import ContractPreview from '@/modules/sales/components/contracts/ContractPreview.vue'
import ContractCalendarView from '@/modules/sales/components/contracts/ContractCalendarView.vue'
import ContractListView from '@/modules/sales/components/contracts/ContractListView.vue'
import DataSelect from '@/components/DataSelect.vue'

const contractStore = useContractStore()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()
const perm = usePermission()

const canCreate = computed(() => perm.isAllowed('quote_contract', 'canCreateContract'))
const canDelete = computed(() => perm.isAllowed('quote_contract', 'canDeleteContract'))
const canSign = computed(() => perm.isAllowed('quote_contract', 'canSignContract'))
const canApprove = computed(() => perm.isAllowed('quote_contract', 'canApproveContract'))

const statusLabels = {
  draft: '草稿',
  pending_approval: '待审批',
  approved: '已审批',
  signed: '已签订',
  archived: '已归档',
  cancelled: '已作废'
}
const statusColors = {
  draft: '#64748b',
  pending_approval: '#f59e0b',
  approved: '#3b82f6',
  signed: '#22c55e',
  archived: '#06b6d4',
  cancelled: '#ef4444'
}

const RING_CIRC = 2 * Math.PI * 15
const signRate = computed(() => {
  const total = contractStore.contracts.length
  if (total === 0) return 0
  return Math.round((contractStore.signedCount / total) * 100)
})
const signRateColor = computed(() => {
  const r = signRate.value
  if (r >= 60) return 'var(--color-success)'
  if (r >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const signRateDashSmall = computed(() => {
  const p = signRate.value / 100
  return `${p * RING_CIRC} ${RING_CIRC}`
})
const signRateTrendDir = computed(() => (signRate.value >= 50 ? 'up' : 'down'))
const signRateTrendVal = computed(() => {
  const total = contractStore.contracts.length
  if (total === 0) return 0
  return Math.abs(Math.round((contractStore.signedCount / total) * 100 - 45))
})

const viewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图', inMore: true },
  { key: 'funnel', icon: 'filter', label: '漏斗', inMore: true }
]

const currentView = ref('table')
const showAnalytics = ref(false)
const showViewMore = ref(false)
const showMoreActions = ref(false)
const showAdvFilter = ref(false)
const searchText = ref('')
const filterStatus = ref('')
const filterSettlement = ref('')
const filterType = ref('')
const filterCustomerId = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAmountMin = ref('')
const filterAmountMax = ref('')
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = ref(15)

const columnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'contractNo', label: '合同编号' },
  { key: 'signDate', label: '签订日期' },
  { key: 'partyA', label: '甲方' },
  { key: 'partyB', label: '乙方' },
  { key: 'paymentDate', label: '回款日' },
  { key: 'unitPrice', label: '单价' },
  { key: 'totalAmount', label: '金额' },
  { key: 'settlement', label: '结算方式' },
  { key: 'status', label: '状态' },
  { key: 'relatedDocs', label: '关联单据' },
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

const filteredContracts = computed(() => {
  let list = contractStore.contracts
  const s = searchText.value.toLowerCase()
  if (s) {
    list = list.filter(
      (c) =>
        (c.contractNo || '').toLowerCase().includes(s) ||
        (c.partyA || '').toLowerCase().includes(s) ||
        (c.contractType || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) list = list.filter((c) => c.status === filterStatus.value)
  if (filterSettlement.value) list = list.filter((c) => c.settlement === filterSettlement.value)
  if (filterType.value) list = list.filter((c) => (c.contractType || '购销合同') === filterType.value)
  if (filterCustomerId.value) list = list.filter((c) => c.partyAId === filterCustomerId.value)
  if (filterDateFrom.value) list = list.filter((c) => c.signDate && c.signDate >= filterDateFrom.value)
  if (filterDateTo.value) list = list.filter((c) => c.signDate && c.signDate <= filterDateTo.value)
  if (filterAmountMin.value !== '' && Number(filterAmountMin.value) > 0)
    list = list.filter((c) => (c.totalAmount || 0) >= Number(filterAmountMin.value) * 10000)
  if (filterAmountMax.value !== '' && Number(filterAmountMax.value) > 0)
    list = list.filter((c) => (c.totalAmount || 0) <= Number(filterAmountMax.value) * 10000)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredContracts.value.length / pageSize.value)))
const pagedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredContracts.value.slice(start, start + pageSize.value)
})
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  const pages = []
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i)
  return pages
})

const isAllSelected = computed(
  () => pagedContracts.value.length > 0 && pagedContracts.value.every((c) => selectedIds.value.includes(c.id))
)

const calendarMonth = ref(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
const weekViewDate = ref(new Date())

const calendarDays = computed(() => {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days = []
  for (let i = 1 - startPad; i <= lastDay.getDate(); i++) {
    const d = new Date(y, m - 1, i)
    const dateStr = toLocalDateStr(d)
    const contracts = filteredContracts.value.filter((c) => c.signDate === dateStr || c.endDate === dateStr)
    days.push({
      date: dateStr,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === m - 1,
      contracts,
      isToday: dateStr === todayStr()
    })
  }
  return days
})

const weekDays = computed(() => {
  const base = new Date(weekViewDate.value)
  const dow = (base.getDay() + 6) % 7
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)
  const days = []
  const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = toLocalDateStr(d)
    const contracts = filteredContracts.value.filter((c) => c.signDate === dateStr || c.endDate === dateStr)
    days.push({ date: dateStr, day: d.getDate(), label: weekLabels[i], contracts, isToday: dateStr === todayStr() })
  }
  return days
})

const funnelStages = computed(() => {
  const stageKeys = ['draft', 'pending_approval', 'approved', 'signed', 'archived']
  const contracts = filteredContracts.value
  const stages = stageKeys.map((key) => {
    const items = contracts.filter((c) => c.status === key)
    return {
      key,
      label: statusLabels[key],
      count: items.length,
      amount: items.reduce((s, c) => s + (c.totalAmount || 0), 0)
    }
  })
  const maxCount = Math.max(...stages.map((s) => s.count), 1)
  for (let i = 0; i < stages.length; i++) {
    stages[i].width = Math.round((stages[i].count / maxCount) * 100)
    if (stages[i].width > 0 && stages[i].width < 20) stages[i].width = 20
    if (i < stages.length - 1) {
      const current = stages[i].count
      const next = stages[i + 1].count
      stages[i].conversionRate = current > 0 ? Math.round((next / current) * 100) : 0
    }
  }
  return stages
})

function prevMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 1) calendarMonth.value = y - 1 + '-12'
  else calendarMonth.value = y + '-' + String(m - 1).padStart(2, '0')
}

function nextMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 12) calendarMonth.value = y + 1 + '-01'
  else calendarMonth.value = y + '-' + String(m + 1).padStart(2, '0')
}

function prevWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() - 7)
  weekViewDate.value = d
}

function nextWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() + 7)
  weekViewDate.value = d
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !pagedContracts.value.some((c) => c.id === id))
  } else {
    for (const c of pagedContracts.value) {
      if (!selectedIds.value.includes(c.id)) selectedIds.value.push(c.id)
    }
  }
}

function barWidth(key) {
  const total = contractStore.contracts.length
  if (total === 0) return '0%'
  return (((contractStore.statusCounts[key] || 0) / total) * 100).toFixed(0) + '%'
}

function getPaymentDate(c) {
  if (!c.signDate || !c.settlement) return '-'
  const signDate = new Date(c.signDate)
  if (isNaN(signDate.getTime())) return '-'
  const match = c.settlement.match(/(\d+)/)
  if (match) {
    const days = parseInt(match[1])
    signDate.setDate(signDate.getDate() + days)
    // 使用本地日期格式避免时区偏移
    const y = signDate.getFullYear()
    const m = String(signDate.getMonth() + 1).padStart(2, '0')
    const d = String(signDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return c.endDate || '-'
}

function getFirstUnitPrice(c) {
  try {
    const products = c.products
    if (Array.isArray(products) && products.length > 0 && products[0].unitPrice) {
      return '¥' + parseFloat(products[0].unitPrice).toFixed(2)
    }
  } catch {
    /* ignore */
  }
  return '-'
}

function todayStr() {
  return toLocalDateStr(new Date())
}

const showWizard = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const wizardStep = ref(1)
const termsEditing = ref(false)
const wizardData = ref({})
const saveAsTemplateFlag = ref(false)

function getDefaultWizardData() {
  return {
    contractType: '购销合同',
    contractNo: '',
    partyA: '',
    partyAId: '',
    partyB: COMPANY_DEFAULTS.name,
    signPlace: COMPANY_DEFAULTS.signPlace,
    signDate: todayStr(),
    endDate: '',
    settlement: '款到发货',
    products: [{ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' }],
    totalAmount: 0,
    terms: contractStore.getDefaultTerms(),
    partyAInfo: { address: '', representative: '', contact: '', date: todayStr(), seal: '' },
    partyBInfo: {
      companyName: COMPANY_DEFAULTS.name,
      address: COMPANY_DEFAULTS.address,
      representative: COMPANY_DEFAULTS.representative,
      contact: COMPANY_DEFAULTS.contact,
      date: todayStr(),
      seal: 'preset'
    },
    status: 'draft',
    sourceQuoteId: '',
    notes: ''
  }
}

function openWizard(editId) {
  wizardStep.value = 1
  termsEditing.value = false
  if (editId) {
    const c = contractStore.getContractById(editId)
    if (!c) {
      alert('未找到该合同')
      return
    }
    isEditing.value = true
    editingId.value = editId
    wizardData.value = JSON.parse(JSON.stringify(c))
  } else {
    isEditing.value = false
    editingId.value = null
    wizardData.value = getDefaultWizardData()
  }
  showWizard.value = true
  document.body.style.overflow = 'hidden'
}

function closeWizard() {
  showWizard.value = false
  document.body.style.overflow = ''
  wizardStep.value = 1
  editingId.value = null
}

const productsTotal = computed(() => {
  return wizardData.value.products?.reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0) || 0
})

function addProductRow() {
  wizardData.value.products.push({
    productName: '',
    spec: '',
    quantity: 0,
    unitPrice: 0,
    amount: 0,
    deliveryPlace: '',
    remark: ''
  })
}

function removeProductRow(idx) {
  wizardData.value.products.splice(idx, 1)
  if (wizardData.value.products.length === 0) {
    wizardData.value.products.push({
      productName: '',
      spec: '',
      quantity: 0,
      unitPrice: 0,
      amount: 0,
      deliveryPlace: '',
      remark: ''
    })
  }
}

function onPartyAChange() {
  const name = wizardData.value.partyA
  const c = customerStore.customers.find((x) => (x.fullName || x.name) === name)
  if (c) {
    wizardData.value.partyAId = c.id
    wizardData.value.partyAInfo = wizardData.value.partyAInfo || {}
    if (c.address) wizardData.value.partyAInfo.address = c.address
    if (c.contact || c.contactName) wizardData.value.partyAInfo.representative = c.contact || c.contactName
    if (c.phone) wizardData.value.partyAInfo.contact = c.phone
  }
}

function uploadSeal(party) {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = () => {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (party === 'A') {
        wizardData.value.partyAInfo.seal = e.target.result
        wizardData.value.partyAInfo.sealTimestamp = new Date().toISOString()
      } else if (party === 'B') {
        wizardData.value.partyBInfo.seal = e.target.result
        wizardData.value.partyBInfo.sealTimestamp = new Date().toISOString()
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function nextStep() {
  const d = wizardData.value
  if (wizardStep.value === 1) {
    const existing = contractStore.contracts.filter((c) => c.contractNo === d.contractNo && c.id !== editingId.value)
    if (d.contractNo && existing.length > 0) {
      alert('合同编号 ' + d.contractNo + ' 已存在')
      return
    }
    if (d.endDate && d.signDate && d.endDate < d.signDate) {
      alert('到期日期不能早于签订日期')
      return
    }
  }
  if (wizardStep.value === 2) {
    const hasValid = d.products.some((p) => p.productName && p.quantity > 0 && p.unitPrice > 0)
    if (!hasValid) {
      alert('请至少添加一条完整的产品明细')
      return
    }
    for (let i = 0; i < d.products.length; i++) {
      if (d.products[i].quantity < 0) {
        alert('第' + (i + 1) + '行数量不能为负数')
        return
      }
      if (d.products[i].unitPrice < 0) {
        alert('第' + (i + 1) + '行单价不能为负数')
        return
      }
    }
    d.totalAmount = Math.round(productsTotal.value * 100) / 100
  }
  if (wizardStep.value < 4) wizardStep.value++
}

function saveAsTemplateIfNeeded(d) {
  if (!saveAsTemplateFlag.value) return
  const name = prompt('请输入模板名称：', '标准购销合同模板')
  if (name) {
    contractStore.addTemplate({
      name,
      contractType: d.contractType,
      settlement: d.settlement,
      terms: JSON.parse(JSON.stringify(d.terms || {})),
      partyBInfo: JSON.parse(JSON.stringify(d.partyBInfo || {})),
      products: JSON.parse(JSON.stringify(d.products || []))
    })
  }
  saveAsTemplateFlag.value = false
}

function saveDraft() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'draft'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
  } else {
    contractStore.addContract(d)
    editingId.value = contractStore.contracts[contractStore.contracts.length - 1].id
    isEditing.value = true
  }
  saveAsTemplateIfNeeded(d)
  alert('草稿已保存，合同编号: ' + d.contractNo)
}

function submitContract() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'pending_approval'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
    contractStore.addHistoryEvent(editingId.value, 'submit', d.contractNo + ' 提交审批')
  } else {
    const c = contractStore.addContract(d)
    contractStore.addHistoryEvent(c.id, 'submit', c.contractNo + ' 提交审批')
  }
  saveAsTemplateIfNeeded(d)
  closeWizard()
  alert('合同已提交审批')
}

function handleSubmitApproval(c) {
  if (c.status !== 'draft') {
    alert('只有草稿状态的合同才能提交审批')
    return
  }
  contractStore.changeStatus(c.id, 'pending_approval')
}

function handleApprove(c) {
  if (c.status !== 'pending_approval') {
    alert('该合同不在待审批状态')
    return
  }
  if (confirm('确认审批通过合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'approved')
  }
}

const showRejectModal = ref(false)
const rejectTargetId = ref(null)
const rejectReason = ref('')

function handleReject(c) {
  if (c.status !== 'pending_approval') {
    alert('该合同不在待审批状态')
    return
  }
  rejectTargetId.value = c.id
  rejectReason.value = ''
  showRejectModal.value = true
}

function confirmReject() {
  contractStore.changeStatus(rejectTargetId.value, 'draft', { reason: rejectReason.value })
  showRejectModal.value = false
}

function handleSign(c) {
  if (c.status !== 'approved') {
    alert('只有已审批的合同才能签订')
    return
  }
  if (confirm('确认签订合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'signed')
  }
}

function handleArchive(c) {
  if (c.status !== 'signed') {
    alert('只有已签订的合同才能归档')
    return
  }
  if (confirm('确认归档合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'archived')
  }
}

function handleCancel(c) {
  if (c.status !== 'approved' && c.status !== 'signed') {
    alert('只有已审批或已签订的合同才能作废')
    return
  }
  if (confirm('确认作废合同 ' + c.contractNo + '？作废后不可恢复。')) {
    contractStore.changeStatus(c.id, 'cancelled')
  }
}

function handleDuplicate(c) {
  const dup = contractStore.duplicateContract(c.id)
  if (dup) alert('已复制合同 ' + c.contractNo + '，新单号：' + dup.contractNo)
}

function handleDelete(c) {
  if (confirm('确认删除合同 ' + c.contractNo + '？此操作不可恢复。')) {
    contractStore.deleteContract(c.id)
    selectedIds.value = selectedIds.value.filter((id) => id !== c.id)
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条合同？')) {
    contractStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  try {
    const fmt = prompt('请选择导出格式：\n1 - JSON（完整数据）\n2 - CSV（表格数据）\n\n请输入 1 或 2', '2')
    if (fmt === null) return
    if (fmt === '1' || fmt.trim() === '1') {
      const data = JSON.stringify(contractStore.contracts, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contracts_export.json'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = [
        '合同编号',
        '合同类型',
        '甲方',
        '乙方',
        '签订日期',
        '到期日',
        '金额',
        '结算方式',
        '状态',
        '签订地点'
      ]
      const statusMap = {
        draft: '草稿',
        pending_approval: '待审批',
        approved: '已审批',
        signed: '已签订',
        archived: '已归档',
        cancelled: '已作废'
      }
      const rows = contractStore.contracts.map((c) => [
        c.contractNo,
        c.contractType,
        c.partyA,
        c.partyB || COMPANY_DEFAULTS.name,
        c.signDate,
        c.endDate,
        c.totalAmount,
        c.settlement,
        statusMap[c.status] || c.status,
        c.signPlace
      ])
      const csvContent = [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contracts_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

const showPreview = ref(false)
const previewContract = ref(null)
const previewTab = ref('content')

function getRelatedCount(c) {
  const customerName = c.partyA
  const contractNo = c.contractNo
  const sourceQuoteId = c.sourceQuoteId
  let count = 0
  count += quotationStore.quotations.filter(
    (q) =>
      q.id === sourceQuoteId || q.customerName === customerName || (q.quoteNo && c.notes && c.notes.includes(q.quoteNo))
  ).length
  count += deliveryStore.deliveries.filter(
    (d) => d.customerName === customerName || (d.contractNo && d.contractNo === contractNo)
  ).length
  count += collectionStore.collections.filter(
    (col) => col.customerName === customerName || (col.contractNo && col.contractNo === contractNo)
  ).length
  return count
}

function openPreview(c) {
  previewContract.value = c
  previewTab.value = 'content'
  showPreview.value = true
  document.body.style.overflow = 'hidden'
}

const showTemplateModal = ref(false)
const aiParsing = ref(false)

function handleContractTemplateFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function handleContractTemplateDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function parseContractTemplateFile(file) {
  aiParsing.value = true
  setTimeout(() => {
    aiParsing.value = false
    const name = prompt('AI识别完成，请确认模板名称：', file.name.replace(/\.[^.]+$/, ''))
    if (name) {
      contractStore.addTemplate({
        name,
        contractType: '购销合同',
        settlement: '款到发货',
        terms: contractStore.getDefaultTerms(),
        partyBInfo: {
          companyName: COMPANY_DEFAULTS.name,
          address: COMPANY_DEFAULTS.address,
          representative: COMPANY_DEFAULTS.representative,
          contact: COMPANY_DEFAULTS.contact
        }
      })
      alert('模板"' + name + '"已通过AI识别创建，请编辑确认详细信息')
    }
  }, 2000)
}

function openTemplateManager() {
  showTemplateModal.value = true
  document.body.style.overflow = 'hidden'
}

function useTemplate(tpl) {
  showTemplateModal.value = false
  const data = getDefaultWizardData()
  data.contractType = tpl.contractType || data.contractType
  data.terms = JSON.parse(JSON.stringify(tpl.terms || {}))
  data.settlement = tpl.settlement || data.settlement
  data.partyBInfo = JSON.parse(JSON.stringify(tpl.partyBInfo || {}))
  if (tpl.products && tpl.products.length > 0) {
    data.products = JSON.parse(JSON.stringify(tpl.products))
  }
  wizardData.value = data
  isEditing.value = false
  editingId.value = null
  wizardStep.value = 1
  showWizard.value = true
}

function deleteTemplate(id) {
  if (confirm('确认删除该模板？')) {
    contractStore.deleteTemplate(id)
  }
}

function saveCurrentAsTemplate() {
  const name = prompt('请输入模板名称：', '标准购销合同模板')
  if (!name) return
  contractStore.addTemplate({
    name,
    settlement: wizardData.value.settlement,
    terms: JSON.parse(JSON.stringify(wizardData.value.terms || {})),
    partyBInfo: JSON.parse(JSON.stringify(wizardData.value.partyBInfo || {}))
  })
  alert('模板"' + name + '"已保存')
}

watch(
  [
    searchText,
    filterStatus,
    filterSettlement,
    filterType,
    filterCustomerId,
    filterDateFrom,
    filterDateTo,
    filterAmountMin,
    filterAmountMax
  ],
  () => {
    currentPage.value = 1
  }
)

const activeRowActions = ref(null)
function toggleRowActions(id) {
  activeRowActions.value = activeRowActions.value === id ? null : id
}

const hasActiveFilters = computed(
  () =>
    filterStatus.value ||
    filterType.value ||
    filterSettlement.value ||
    filterCustomerId.value ||
    filterDateFrom.value ||
    filterDateTo.value ||
    filterAmountMin.value ||
    filterAmountMax.value
)

function resetFilters() {
  searchText.value = ''
  filterStatus.value = ''
  filterSettlement.value = ''
  filterType.value = ''
  filterCustomerId.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAmountMin.value = ''
  filterAmountMax.value = ''
}

function handleClickOutside(e) {
  if (showColumnConfig.value && !e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
  if (activeRowActions.value && !e.target.closest('.action-more-wrapper')) {
    activeRowActions.value = null
  }
  if (showMoreActions.value && !e.target.closest('.more-actions-wrapper')) {
    showMoreActions.value = false
  }
  if (showViewMore.value && !e.target.closest('.view-more-wrapper')) {
    showViewMore.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  /* 组件卸载时恢复body滚动，防止模态框打开时卸载导致页面锁定 */
  document.body.style.overflow = ''
})
</script>

<style scoped>
.contract-page {
  max-width: 100%;
  margin: calc(var(--space-6) * -1);
  min-height: calc(100vh - var(--topbar-height));
  padding: var(--space-6);
  background: var(--color-bg-primary);
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
  font-size: var(--font-size-base);
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

.contract-toolbar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.contract-search {
  position: relative;
  min-width: 200px;
  flex: 1 1 200px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 34px;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--color-accent);
}
.filter-select {
  height: 34px;
  min-width: 110px;
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  border-radius: var(--radius-md);
}
.filter-date-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.filter-date {
  height: 34px;
  width: 130px;
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  border-radius: var(--radius-md);
}
.filter-date-sep {
  color: var(--color-text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
}
.filter-amount {
  height: 34px;
  width: 100px;
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  border-radius: var(--radius-md);
}
.filter-reset-btn {
  height: 34px;
  white-space: nowrap;
}

.contract-stats-bar {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
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
@keyframes pendingPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
  }
}
@keyframes expiringPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.7);
  }
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
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-draft {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.status-pending_approval {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.status-approved {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.status-signed {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-archived {
  background: var(--color-cyan-subtle);
  color: var(--color-info);
}
.status-cancelled {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
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
}
.action-btn {
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.action-btn:hover {
  background: var(--color-bg-tertiary);
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
  font-size: 12px;
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
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-left: var(--space-2);
}

.analytics-panel {
  margin-bottom: var(--space-4);
}
.analytics-kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.kpi-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.kpi-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}
.bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.bar-label {
  width: 60px;
  font-size: 12px;
}
.bar-track {
  flex: 1;
  height: 20px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width 0.3s;
  position: relative;
  overflow: hidden;
}
.bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: barShimmer 2s ease-in-out infinite;
}
@keyframes barShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
.bar-value {
  font-size: 12px;
  min-width: 30px;
  text-align: right;
}
.top-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}
.top-rank {
  width: 24px;
  font-weight: 700;
  color: var(--color-accent);
}
.top-name {
  flex: 1;
}
.top-amount {
  font-weight: 600;
}
.empty-hint {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-5);
}

.btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn:hover {
  background: var(--color-bg-secondary);
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
  font-size: 12px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 100%;
}
.panel-card-header {
  padding: var(--space-4) var(--space-5);
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid var(--color-border);
}
.panel-card-body {
  padding: var(--space-4) var(--space-5);
}
.panel-card-body.no-padding {
  padding: 0;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 900px;
}
.data-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  font-size: 12px;
  white-space: nowrap;
}
.th-icon {
  margin-right: var(--space-1);
  opacity: 0.5;
  vertical-align: middle;
}
.data-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.related-count-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(99, 102, 241, 0.1);
  cursor: pointer;
  transition: background 0.2s;
}
.related-count-badge:hover {
  background: rgba(99, 102, 241, 0.2);
}
.action-btn-text {
  font-size: 12px;
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.action-btn-text:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.action-btn-primary {
  font-size: 12px;
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  background: transparent;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.action-btn-primary:hover {
  background: var(--color-accent);
  color: #fff;
}
.action-btn-sign {
  border-color: var(--color-success, #22c55e);
  color: var(--color-success, #22c55e);
}
.action-btn-sign:hover {
  background: var(--color-success, #22c55e);
  color: #fff;
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

@media (max-width: 1024px) {
  .analytics-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .analytics-grid {
    grid-template-columns: 1fr 1fr;
  }
  .contract-toolbar {
    flex-wrap: wrap;
  }
}
@media (max-width: 768px) {
  .contract-page {
    padding: var(--space-3);
  }
  .page-header {
    flex-direction: column;
  }
  .analytics-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  .contract-toolbar {
    flex-wrap: wrap;
  }
  .contract-search {
    min-width: 100%;
    flex: 1 1 100%;
  }
  .filter-date-group {
    flex-direction: row;
  }
  .filter-select,
  .filter-date,
  .filter-amount,
  .filter-reset-btn {
    flex: 1 1 calc(50% - var(--space-2));
    min-width: 0;
  }
}

.btn-outline {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.btn-outline:hover {
  background: var(--color-bg-secondary);
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

.status-flow-bar {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  flex-wrap: wrap;
}
.status-flow-chip {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.status-flow-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.status-flow-chip.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn-icon {
  padding: var(--space-2);
  min-width: 34px;
  text-align: center;
}
.btn-lg {
  font-size: 15px;
  padding: var(--space-2) var(--space-5);
  font-weight: 600;
}

.view-more-wrapper {
  position: relative;
  display: inline-flex;
}
.view-more-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  z-index: var(--z-dropdown);
  min-width: 100px;
  box-shadow: var(--shadow-lg);
}
.view-more-item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  text-align: left;
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}
.view-more-item:hover {
  background: var(--color-bg-secondary);
}
.view-more-item.active {
  color: var(--color-accent);
  font-weight: 600;
}

.more-actions-wrapper {
  position: relative;
  display: inline-flex;
}
.more-actions-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  z-index: var(--z-dropdown);
  min-width: 140px;
  box-shadow: var(--shadow-lg);
}
.more-actions-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  text-align: left;
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}
.more-actions-item:hover {
  background: var(--color-bg-secondary);
}
.more-actions-item.danger {
  color: var(--color-danger);
}
.more-actions-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kpi-card-sm {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 160px;
}
.kpi-card-sm:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.kpi-ring-sm {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-ring-val {
  position: absolute;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.kpi-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-val {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}
.kpi-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.kpi-icon {
  opacity: 0.6;
  flex-shrink: 0;
}
.kpi-trend {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.kpi-trend.up {
  color: var(--color-success, #22c55e);
}
.kpi-trend.down {
  color: var(--color-danger, #ef4444);
}
.kpi-card-expiring {
  border-color: var(--color-warning, #f59e0b) !important;
}
.expiring-pulse {
  animation: expiringPulse 2s ease-in-out infinite;
}
@keyframes expiringPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.contract-toolbar-adv {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.filter-tags-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  transition: all 0.15s;
}
.filter-tag:hover {
  background: var(--color-accent);
  color: #fff;
}
.filter-tag:hover button {
  color: #fff;
}
.filter-tag button {
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}
.filter-tag-clear {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  text-decoration: underline;
  padding: var(--space-1) var(--space-2);
  transition: color 0.15s;
}
.filter-tag-clear:hover {
  color: var(--color-danger);
}

.action-more-wrapper {
  position: relative;
  display: inline-flex;
}
.action-more-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  z-index: var(--z-dropdown);
  min-width: 100px;
  box-shadow: var(--shadow-lg);
}
.action-more-item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  text-align: left;
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
}
.action-more-item:hover {
  background: var(--color-bg-secondary);
}
.action-more-item.danger {
  color: var(--color-danger);
}

.data-row {
  cursor: pointer;
}
.data-row:hover {
  background: var(--color-bg-secondary);
}
.data-row:hover td:first-child {
  box-shadow: inset 4px 0 0 var(--color-accent);
}
</style>
