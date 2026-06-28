<template>
  <div class="project-tracking-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">项目追踪</h2>
        <p class="page-header-subtitle">汽车/非汽车项目全生命周期管理 — 风险跟踪与数据统计分析</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline" title="打印报表" @click="printView">
          <Icon name="print" :size="14" />
          打印
        </button>
        <button class="btn btn-outline" title="操作日志" @click="showOpLogModal = true">
          <Icon name="edit" :size="14" />
          日志
        </button>
        <button v-if="activeTab !== 'stats'" class="btn btn-outline" @click="exportCSV">
          <Icon name="download" :size="14" />
          导出
        </button>
        <button v-if="activeTab !== 'stats'" class="btn btn-outline" @click="triggerImport">
          <Icon name="upload" :size="14" />
          导入
        </button>
        <input ref="importFileRef" type="file" style="display: none" @change="importCSV" />
        <button v-if="activeTab !== 'stats'" class="btn btn-primary" @click="openAddModal">{{ addBtnLabel }}</button>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'auto' }" @click="activeTab = 'auto'">
        [汽车] 汽车项目
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'nonauto' }" @click="activeTab = 'nonauto'">
        <Icon name="building" :size="14" />
        非汽车项目
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'risk' }" @click="activeTab = 'risk'">
        <Icon name="warning" :size="14" />
        风险跟踪
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">
        <Icon name="trendUp" :size="14" />
        统计报表
      </button>
    </div>

    <div class="tab-content-scroll">
      <!-- ==================== 汽车项目Tab ==================== -->
      <div v-show="activeTab === 'auto'">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
              [汽车]
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ autoProjects.length }}</div>
              <div class="stat-card-label">汽车项目总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="refresh" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ autoActiveCount }}</div>
              <div class="stat-card-label">进行中</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="check" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ autoMassCount }}</div>
              <div class="stat-card-label">已量产</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
              <Icon name="warning" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ autoRiskCount }}</div>
              <div class="stat-card-label">有风险</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              [提醒]
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value" style="color: var(--color-danger)">{{ autoOverdueCount }}</div>
              <div class="stat-card-label">逾期跟进</div>
            </div>
          </div>
        </div>
        <div class="quick-filters">
          <button
            class="quick-filter-tag"
            :class="{ active: autoQuickFilter === 'overdue' }"
            @click="toggleAutoQuickFilter('overdue')"
          >
            [提醒] 逾期跟进
            <span v-if="autoOverdueCount" class="qf-badge">{{ autoOverdueCount }}</span>
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: autoQuickFilter === 'sopThisMonth' }"
            @click="toggleAutoQuickFilter('sopThisMonth')"
          >
            <Icon name="calendar" :size="14" />
            本月SOP
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: autoQuickFilter === 'hasRisk' }"
            @click="toggleAutoQuickFilter('hasRisk')"
          >
            [红色] 有风险
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: autoQuickFilter === 'notQuoted' }"
            @click="toggleAutoQuickFilter('notQuoted')"
          >
            <Icon name="dollar" :size="14" />
            未报价
          </button>
          <button v-if="autoQuickFilter" class="quick-filter-tag clear" @click="autoQuickFilter = ''">
            <Icon name="close" :size="14" />
            清除筛选
          </button>
        </div>
        <div class="filter-bar">
          <input
            v-model="autoSearch"
            type="text"
            class="form-input"
            placeholder="搜索客户/主机厂/零件/编号..."
            style="min-width: 180px"
          />
          <select v-model="autoStageFilter" class="form-select">
            <option value="">全部阶段</option>
            <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="autoQuoteFilter" class="form-select">
            <option value="">全部报价状态</option>
            <option v-for="s in quoteStatuses" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="autoOwnerFilter" class="form-select">
            <option value="">全部负责人</option>
            <option v-for="o in autoOwners" :key="o" :value="o">{{ o }}</option>
          </select>
          <button v-if="autoSelected.length > 0" class="btn btn-outline btn-danger" @click="confirmBatchDeleteAuto">
            <Icon name="delete" :size="14" />
            批量删除({{ autoSelected.length }})
          </button>
          <select
            v-if="autoSelected.length > 0"
            v-model="batchStageVal"
            class="form-select"
            style="max-width: 160px"
            @change="batchChangeStage"
          >
            <option value="">批量修改阶段...</option>
            <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
          </select>
          <div class="column-config-wrapper">
            <button class="btn btn-outline" @click="toggleAutoColumnConfig">
              <Icon name="setting" :size="14" />
              列
            </button>
            <div v-if="showAutoColumnConfig" class="column-config-dropdown" :style="autoColDropdownStyle">
              <label v-for="col in autoColumnDefs" :key="col.key" class="column-config-item">
                <input v-model="autoColumnVisible[col.key]" type="checkbox" />
                {{ col.label }}
              </label>
            </div>
          </div>
          <div class="view-switcher">
            <button
              class="view-btn"
              :class="{ active: autoView === 'table' }"
              title="表格视图"
              @click="autoView = 'table'"
            >
              <Icon name="table" :size="14" />
              表格
            </button>
            <button
              class="view-btn"
              :class="{ active: autoView === 'list' }"
              title="列表视图"
              @click="autoView = 'list'"
            >
              <Icon name="list" :size="14" />
              列表
            </button>
            <button
              class="view-btn"
              :class="{ active: autoView === 'card' }"
              title="卡片视图"
              @click="autoView = 'card'"
            >
              <Icon name="card" :size="14" />
              卡片
            </button>
            <button
              class="view-btn"
              :class="{ active: autoView === 'calendar' }"
              title="日历视图"
              @click="autoView = 'calendar'"
            >
              <Icon name="calendar" :size="14" />
              日历
            </button>
            <button class="view-btn" :class="{ active: autoView === 'week' }" title="周视图" @click="autoView = 'week'">
              <Icon name="calendar" :size="14" />
              周视图
            </button>
            <button
              class="view-btn"
              :class="{ active: autoView === 'gantt' }"
              title="甘特图"
              @click="autoView = 'gantt'"
            >
              <Icon name="table" :size="14" />
              甘特图
            </button>
          </div>
        </div>
        <!-- <Icon name="table" :size="14" /> 表格视图 -->
        <div v-show="autoView === 'table'" class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              表格 — 汽车项目列表
            </span>
            <span class="panel-card-count">共 {{ filteredAutoProjects.length }} 条</span>
          </div>
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 30px">
                      <input
                        type="checkbox"
                        :checked="
                          autoSelected.length === filteredAutoProjects.length && filteredAutoProjects.length > 0
                        "
                        @change="toggleAutoSelectAll"
                      />
                    </th>
                    <th v-if="autoColumnVisible.projectId" style="width: 100px">项目编码</th>
                    <th v-if="autoColumnVisible.customer" style="width: 100px">客户单位</th>
                    <th v-if="autoColumnVisible.oem" style="width: 100px">主机厂商</th>
                    <th v-if="autoColumnVisible.vehicleModels" style="width: 120px">配套车型型号</th>
                    <th v-if="autoColumnVisible.partName" style="width: 110px">零部件名称</th>
                    <th v-if="autoColumnVisible.material" style="width: 100px">所用材料</th>
                    <th v-if="autoColumnVisible.stage" style="width: 120px">项目所处阶段</th>
                    <th v-if="autoColumnVisible.quoteStatus" style="width: 120px">报价跟进状态</th>
                    <th v-if="autoColumnVisible.massStatus" style="width: 120px">量产执行状态</th>
                    <th v-if="autoColumnVisible.owner" style="width: 100px">项目负责人</th>
                    <th v-if="autoColumnVisible.followUp" style="width: 90px">跟进</th>
                    <th style="width: 100px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="p in filteredAutoProjects"
                    :key="p.id"
                    :class="{ 'row-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产' }"
                  >
                    <td><input v-model="autoSelected" type="checkbox" :value="p.id" /></td>
                    <td v-if="autoColumnVisible.projectId">
                      <span class="project-id">{{ p.projectId }}</span>
                    </td>
                    <td
                      v-if="autoColumnVisible.customer"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'customer')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'customer')">{{ p.customer }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td v-if="autoColumnVisible.oem" class="cell-editable" @dblclick="startInlineEdit(p, 'oem')">
                      <span v-if="!isInlineEditing(p.id, 'oem')">{{ p.oem }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td
                      v-if="autoColumnVisible.vehicleModels"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'vehicleModels')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'vehicleModels')">{{ p.vehicleModels }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td
                      v-if="autoColumnVisible.partName"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'partName')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'partName')">{{ p.partName }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td
                      v-if="autoColumnVisible.material"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'material')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'material')">{{ p.material }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td v-if="autoColumnVisible.stage" class="cell-editable" @dblclick="startInlineEdit(p, 'stage')">
                      <span
                        v-if="!isInlineEditing(p.id, 'stage')"
                        class="stage-tag"
                        :class="'stage-' + stageIdx(p.stage)"
                      >
                        {{ p.stage }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                      >
                        <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </td>
                    <td
                      v-if="autoColumnVisible.quoteStatus"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'quoteStatus')"
                    >
                      <span
                        v-if="!isInlineEditing(p.id, 'quoteStatus')"
                        class="quote-tag"
                        :class="'qs-' + p.quoteStatus"
                      >
                        {{ p.quoteStatus }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                      >
                        <option v-for="s in quoteStatuses" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </td>
                    <td
                      v-if="autoColumnVisible.massStatus"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'massStatus')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'massStatus')" class="mass-tag" :class="'ms-' + p.massStatus">
                        {{ p.massStatus }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                      >
                        <option value="未量产">未量产</option>
                        <option value="小批量">小批量</option>
                        <option value="量产">量产</option>
                      </select>
                    </td>
                    <td v-if="autoColumnVisible.owner" class="cell-editable" @dblclick="startInlineEdit(p, 'owner')">
                      <span v-if="!isInlineEditing(p.id, 'owner')">{{ p.owner }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td
                      v-if="autoColumnVisible.followUp"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'nextFollowUp')"
                    >
                      <span
                        v-if="!isInlineEditing(p.id, 'nextFollowUp')"
                        v-bind="
                          p.nextFollowUp ? { class: { overdue: p.nextFollowUp < today && p.stage !== '量产' } } : {}
                        "
                      >
                        {{ p.nextFollowUp || '-' }}
                      </span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        type="date"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'auto')"
                        @blur="confirmInlineEdit(p, 'auto')"
                      />
                    </td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-ghost btn-sm" @click="openAutoDetail(p)">详情</button>
                        <button class="btn btn-ghost btn-sm" @click="editAutoProject(p)">编辑</button>
                        <button class="btn btn-ghost btn-sm btn-danger-text" @click="confirmDeleteAuto(p.id)">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredAutoProjects.length === 0">
                    <td :colspan="autoVisibleColCount + 2" class="empty-cell">暂无数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <!-- <Icon name="list" :size="14" /> 列表视图 -->
        <div v-show="autoView === 'list'" class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="list" :size="14" />
              列表 — 汽车项目
            </span>
            <span class="panel-card-count">共 {{ filteredAutoProjects.length }} 条</span>
          </div>
          <div class="panel-card-body no-padding">
            <div
              v-for="p in filteredAutoProjects"
              :key="p.id"
              class="list-item"
              :class="{ 'list-item-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产' }"
              @click="openAutoDetail(p)"
            >
              <div class="list-item-main">
                <span class="project-id">{{ p.projectId }}</span>
                <span class="list-item-title">{{ p.customer }} - {{ p.partName }}</span>
                <span class="stage-tag" :class="'stage-' + stageIdx(p.stage)">{{ p.stage }}</span>
                <span v-if="p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产'" class="overdue-badge">
                  逾期
                </span>
              </div>
              <div class="list-item-meta">
                <span>{{ p.oem }}</span>
                <span>{{ p.owner }}</span>
                <span :class="{ overdue: p.nextFollowUp && p.nextFollowUp < today }">{{ p.nextFollowUp || '-' }}</span>
              </div>
            </div>
            <div v-if="filteredAutoProjects.length === 0" class="empty-cell" style="padding: var(--space-8)">
              暂无数据
            </div>
          </div>
        </div>
        <!-- <Icon name="card" :size="14" /> 卡片视图 -->
        <div v-show="autoView === 'card'" class="panel-card">
          <div class="card-view-header">
            <span class="panel-card-title">
              <Icon name="card" :size="14" />
              卡片 — 汽车项目
            </span>
            <span class="panel-card-count">共 {{ filteredAutoProjects.length }} 条</span>
          </div>
          <div class="pt-card-grid">
            <div
              v-for="p in filteredAutoProjects"
              :key="p.id"
              class="pt-card"
              :class="{ 'pt-card-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产' }"
              @click="openAutoDetail(p)"
            >
              <div class="pt-card-header-row">
                <span class="stage-tag" :class="'stage-' + stageIdx(p.stage)">{{ p.stage }}</span>
                <span class="project-id">{{ p.projectId }}</span>
                <span v-if="p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产'" class="overdue-badge">
                  逾期
                </span>
              </div>
              <div class="pt-card-title">{{ p.partName }}</div>
              <div class="pt-card-sub">{{ p.customer }} | {{ p.oem }}</div>
              <div class="stage-progress-mini">
                <div
                  v-for="(s, i) in stages"
                  :key="s"
                  class="spm-dot"
                  :class="{ active: i <= stages.indexOf(p.stage), current: s === p.stage }"
                  :title="s"
                ></div>
              </div>
              <div class="pt-card-row">
                <span>车型:</span>
                <span>{{ p.vehicleModels || '-' }}</span>
              </div>
              <div class="pt-card-row">
                <span>材料:</span>
                <span>{{ p.material || '-' }}</span>
              </div>
              <div class="pt-card-row">
                <span>报价:</span>
                <span class="quote-tag" :class="'qs-' + p.quoteStatus">{{ p.quoteStatus }}</span>
              </div>
              <div class="pt-card-row">
                <span>量产:</span>
                <span class="mass-tag" :class="'ms-' + p.massStatus">{{ p.massStatus }}</span>
              </div>
              <div class="pt-card-footer">
                <span>{{ p.owner }}</span>
                <span :class="{ overdue: p.nextFollowUp && p.nextFollowUp < today }">{{ p.nextFollowUp || '-' }}</span>
              </div>
            </div>
          </div>
          <div v-if="filteredAutoProjects.length === 0" class="empty-cell" style="padding: var(--space-8)">
            暂无数据
          </div>
        </div>
        <!-- <Icon name="calendar" :size="14" /> 日历视图 -->
        <div v-show="autoView === 'calendar'" class="panel-card">
          <div class="panel-card-header">
            <button class="btn btn-ghost btn-sm" @click="calPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="panel-card-title">
              <Icon name="calendar" :size="14" />
              日历 — {{ calYear }}年{{ calMonth }}月
            </span>
            <button class="btn btn-ghost btn-sm" @click="calNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-2)" @click="calToday">今天</button>
          </div>
          <div class="panel-card-body no-padding">
            <div class="cal-grid">
              <div v-for="d in weekDays" :key="d" class="cal-header">{{ d }}</div>
              <div
                v-for="(cell, idx) in calCells"
                :key="idx"
                class="cal-cell"
                :class="{ today: cell.isToday, hasEvent: cell.events.length > 0 }"
              >
                <div class="cal-date">{{ cell.day || '' }}</div>
                <div class="cal-events">
                  <div
                    v-for="e in cell.events.slice(0, 2)"
                    :key="e.id"
                    class="cal-event"
                    :class="'evt-' + e.type"
                    @click="openAutoDetail(autoProjects.find((p) => p.id === e.id))"
                  >
                    {{ e.label }}
                  </div>
                  <div v-if="cell.events.length > 2" class="cal-more">+{{ cell.events.length - 2 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- <Icon name="calendar" :size="14" /> 周视图 -->
        <div v-show="autoView === 'week'" class="panel-card">
          <div class="panel-card-header">
            <button class="btn btn-ghost btn-sm" @click="weekPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="panel-card-title">
              <Icon name="calendar" :size="14" />
              周视图 — {{ weekRangeLabel }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="weekNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-2)" @click="weekToday">本周</button>
          </div>
          <div class="panel-card-body no-padding">
            <div class="week-grid">
              <div v-for="(d, i) in weekDays" :key="d" class="week-header">
                <span>{{ d }}</span>
                <span class="week-header-date">{{ weekDates[i] }}</span>
              </div>
              <div
                v-for="(day, idx) in weekDaysData"
                :key="idx"
                class="week-col"
                :class="{ 'week-col-today': day.isToday }"
              >
                <div v-if="day.events.length === 0" class="week-empty">无事项</div>
                <div
                  v-for="e in day.events"
                  :key="e.id"
                  class="week-event"
                  :class="'evt-' + e.type"
                  @click="openAutoDetail(autoProjects.find((p) => p.id === e.id))"
                >
                  <div class="week-event-title">{{ e.label }}</div>
                  <div class="week-event-meta">{{ e.meta || '' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- <Icon name="table" :size="14" /> 甘特图视图 -->
        <div v-show="autoView === 'gantt'" class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              甘特图 — 项目阶段时间线
            </span>
            <span class="panel-card-count">共 {{ filteredAutoProjects.length }} 个项目</span>
          </div>
          <div class="panel-card-body no-padding">
            <div class="gantt-container">
              <div class="gantt-header">
                <div class="gantt-label-col">项目</div>
                <div class="gantt-bars-col">
                  <div class="gantt-stages-header">
                    <div v-for="s in stages" :key="s" class="gantt-stage-col" :title="s">{{ s.slice(0, 2) }}</div>
                  </div>
                </div>
              </div>
              <div v-for="p in filteredAutoProjects" :key="p.id" class="gantt-row" @click="openAutoDetail(p)">
                <div class="gantt-label-col">
                  <span class="project-id">{{ p.projectId }}</span>
                  {{ p.partName }}
                </div>
                <div class="gantt-bars-col">
                  <div class="gantt-stages-row">
                    <div
                      v-for="(s, i) in stages"
                      :key="s"
                      class="gantt-stage-cell"
                      :class="{
                        'gantt-passed': i < stages.indexOf(p.stage),
                        'gantt-current': s === p.stage,
                        'gantt-future': i > stages.indexOf(p.stage)
                      }"
                    ></div>
                  </div>
                </div>
              </div>
              <div v-if="filteredAutoProjects.length === 0" class="gantt-empty">暂无项目数据</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 非汽车项目Tab ==================== -->
      <div v-show="activeTab === 'nonauto'">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
              <Icon name="building" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ nonAutoProjects.length }}</div>
              <div class="stat-card-label">非汽车项目总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="refresh" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ napActiveCount }}</div>
              <div class="stat-card-label">进行中</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="dollar" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ nonAutoTotalAmount }}</div>
              <div class="stat-card-label">合同总额(万)</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              <Icon name="package" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ nonAutoMonthlyQty }}</div>
              <div class="stat-card-label">月订单量(吨)</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              [提醒]
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value" style="color: var(--color-danger)">{{ napOverdueCount }}</div>
              <div class="stat-card-label">逾期跟进</div>
            </div>
          </div>
        </div>
        <div class="quick-filters">
          <button
            class="quick-filter-tag"
            :class="{ active: napQuickFilter === 'overdue' }"
            @click="toggleNapQuickFilter('overdue')"
          >
            [提醒] 逾期跟进
            <span v-if="napOverdueCount" class="qf-badge">{{ napOverdueCount }}</span>
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: napQuickFilter === 'hasRisk' }"
            @click="toggleNapQuickFilter('hasRisk')"
          >
            [红色] 有风险
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: napQuickFilter === 'notQuoted' }"
            @click="toggleNapQuickFilter('notQuoted')"
          >
            <Icon name="dollar" :size="14" />
            未报价
          </button>
          <button
            class="quick-filter-tag"
            :class="{ active: napQuickFilter === 'unpaid' }"
            @click="toggleNapQuickFilter('unpaid')"
          >
            [支付] 未回款
          </button>
          <button v-if="napQuickFilter" class="quick-filter-tag clear" @click="napQuickFilter = ''">
            <Icon name="close" :size="14" />
            清除筛选
          </button>
        </div>
        <div class="filter-bar">
          <input
            v-model="nonAutoSearch"
            type="text"
            class="form-input"
            placeholder="搜索客户/编号..."
            style="min-width: 180px"
          />
          <select v-model="nonAutoStageFilter" class="form-select">
            <option value="">全部阶段</option>
            <option v-for="s in napStages" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="nonAutoPaymentFilter" class="form-select">
            <option value="">全部回款状态</option>
            <option value="未回款">未回款</option>
            <option value="部分回款">部分回款</option>
            <option value="已回款">已回款</option>
          </select>
          <div class="column-config-wrapper">
            <button class="btn btn-outline" @click="toggleNapColumnConfig">
              <Icon name="setting" :size="14" />
              列
            </button>
            <div v-if="showNapColumnConfig" class="column-config-dropdown" :style="napColDropdownStyle">
              <label v-for="col in napColumnDefs" :key="col.key" class="column-config-item">
                <input v-model="napColumnVisible[col.key]" type="checkbox" />
                {{ col.label }}
              </label>
            </div>
          </div>
          <div class="view-switcher">
            <button
              class="view-btn"
              :class="{ active: nonAutoView === 'table' }"
              title="表格视图"
              @click="nonAutoView = 'table'"
            >
              <Icon name="table" :size="14" />
              表格
            </button>
            <button
              class="view-btn"
              :class="{ active: nonAutoView === 'list' }"
              title="列表视图"
              @click="nonAutoView = 'list'"
            >
              <Icon name="list" :size="14" />
              列表
            </button>
            <button
              class="view-btn"
              :class="{ active: nonAutoView === 'card' }"
              title="卡片视图"
              @click="nonAutoView = 'card'"
            >
              <Icon name="card" :size="14" />
              卡片
            </button>
            <button
              class="view-btn"
              :class="{ active: nonAutoView === 'calendar' }"
              title="日历视图"
              @click="nonAutoView = 'calendar'"
            >
              <Icon name="calendar" :size="14" />
              日历
            </button>
            <button
              class="view-btn"
              :class="{ active: nonAutoView === 'week' }"
              title="周视图"
              @click="nonAutoView = 'week'"
            >
              <Icon name="calendar" :size="14" />
              周视图
            </button>
          </div>
        </div>
        <!-- <Icon name="table" :size="14" /> 表格视图 -->
        <div v-show="nonAutoView === 'table'" class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              表格 — 非汽车项目列表
            </span>
            <span class="panel-card-count">共 {{ filteredNonAutoProjects.length }} 条</span>
          </div>
          <div class="panel-card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th v-if="napColumnVisible.projectId" style="width: 100px">项目ID</th>
                    <th v-if="napColumnVisible.customerName" style="width: 100px">客户名称</th>
                    <th v-if="napColumnVisible.techRequirements" style="width: 120px">技术要求</th>
                    <th v-if="napColumnVisible.monthlyOrderQty" style="width: 110px">月订单量(吨)</th>
                    <th v-if="napColumnVisible.contractAmount" style="width: 110px">合同金额(万)</th>
                    <th v-if="napColumnVisible.stage" style="width: 100px">项目阶段</th>
                    <th v-if="napColumnVisible.quoteStatus" style="width: 100px">报价状态</th>
                    <th v-if="napColumnVisible.contractStatus" style="width: 100px">合同状态</th>
                    <th v-if="napColumnVisible.paymentStatus" style="width: 100px">回款状态</th>
                    <th v-if="napColumnVisible.owner" style="width: 90px">负责人</th>
                    <th v-if="napColumnVisible.followUp" style="width: 90px">跟进</th>
                    <th style="width: 100px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="p in filteredNonAutoProjects"
                    :key="p.id"
                    :class="{ 'row-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成' }"
                  >
                    <td v-if="napColumnVisible.projectId">
                      <span class="project-id">{{ p.projectId }}</span>
                    </td>
                    <td
                      v-if="napColumnVisible.customerName"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'customerName')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'customerName')">{{ p.customerName }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td
                      v-if="napColumnVisible.techRequirements"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'techRequirements')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'techRequirements')">{{ p.techRequirements || '-' }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td
                      v-if="napColumnVisible.monthlyOrderQty"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'monthlyOrderQty')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'monthlyOrderQty')">{{ p.monthlyOrderQty || '-' }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        type="number"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td
                      v-if="napColumnVisible.contractAmount"
                      class="cell-editable amount-cell"
                      @dblclick="startInlineEdit(p, 'contractAmount')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'contractAmount')">{{ p.contractAmount || '-' }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        type="number"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td v-if="napColumnVisible.stage" class="cell-editable" @dblclick="startInlineEdit(p, 'stage')">
                      <span
                        v-if="!isInlineEditing(p.id, 'stage')"
                        class="stage-tag"
                        :class="'stage-' + napStageIdx(p.stage)"
                      >
                        {{ p.stage }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                      >
                        <option v-for="s in napStages" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </td>
                    <td
                      v-if="napColumnVisible.quoteStatus"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'quoteStatus')"
                    >
                      <span
                        v-if="!isInlineEditing(p.id, 'quoteStatus')"
                        class="quote-tag"
                        :class="'qs-' + p.quoteStatus"
                      >
                        {{ p.quoteStatus }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                      >
                        <option v-for="s in quoteStatuses" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </td>
                    <td
                      v-if="napColumnVisible.contractStatus"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'contractStatus')"
                    >
                      <span v-if="!isInlineEditing(p.id, 'contractStatus')">{{ p.contractStatus || '-' }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td
                      v-if="napColumnVisible.paymentStatus"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'paymentStatus')"
                    >
                      <span
                        v-if="!isInlineEditing(p.id, 'paymentStatus')"
                        class="payment-tag"
                        :class="'ps-' + (p.paymentStatus || '')"
                      >
                        {{ p.paymentStatus || '-' }}
                      </span>
                      <select
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-select"
                        @change="confirmInlineEdit(p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                      >
                        <option value="未回款">未回款</option>
                        <option value="部分回款">部分回款</option>
                        <option value="已回款">已回款</option>
                      </select>
                    </td>
                    <td v-if="napColumnVisible.owner" class="cell-editable" @dblclick="startInlineEdit(p, 'owner')">
                      <span v-if="!isInlineEditing(p.id, 'owner')">{{ p.owner }}</span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td
                      v-if="napColumnVisible.followUp"
                      class="cell-editable"
                      @dblclick="startInlineEdit(p, 'nextFollowUp')"
                    >
                      <span
                        v-if="!isInlineEditing(p.id, 'nextFollowUp')"
                        v-bind="
                          p.nextFollowUp ? { class: { overdue: p.nextFollowUp < today && p.stage !== '完成' } } : {}
                        "
                      >
                        {{ p.nextFollowUp || '-' }}
                      </span>
                      <input
                        v-else
                        v-model="inlineEdit.value"
                        type="date"
                        class="inline-input"
                        @keydown="onInlineKeydown($event, p, 'nonauto')"
                        @blur="confirmInlineEdit(p, 'nonauto')"
                      />
                    </td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-ghost btn-sm" @click="openNonAutoDetail(p)">详情</button>
                        <button class="btn btn-ghost btn-sm" @click="editNonAutoProject(p)">编辑</button>
                        <button class="btn btn-ghost btn-sm btn-danger-text" @click="confirmDeleteNonAuto(p.id)">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredNonAutoProjects.length === 0">
                    <td :colspan="napVisibleColCount + 1" class="empty-cell">暂无数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <!-- <Icon name="list" :size="14" /> 列表视图 -->
        <div v-show="nonAutoView === 'list'" class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="list" :size="14" />
              列表 — 非汽车项目
            </span>
            <span class="panel-card-count">共 {{ filteredNonAutoProjects.length }} 条</span>
          </div>
          <div class="panel-card-body no-padding">
            <div
              v-for="p in filteredNonAutoProjects"
              :key="p.id"
              class="list-item"
              :class="{ 'list-item-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成' }"
              @click="openNonAutoDetail(p)"
            >
              <div class="list-item-main">
                <span class="project-id">{{ p.projectId }}</span>
                <span class="list-item-title">{{ p.customerName }}</span>
                <span class="stage-tag" :class="'stage-' + napStageIdx(p.stage)">{{ p.stage }}</span>
                <span class="payment-tag" :class="'ps-' + (p.paymentStatus || '')">{{ p.paymentStatus }}</span>
                <span v-if="p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成'" class="overdue-badge">
                  逾期
                </span>
              </div>
              <div class="list-item-meta">
                <span>合同: {{ p.contractAmount }}万</span>
                <span>{{ p.owner }}</span>
                <span :class="{ overdue: p.nextFollowUp && p.nextFollowUp < today }">{{ p.nextFollowUp || '-' }}</span>
              </div>
            </div>
            <div v-if="filteredNonAutoProjects.length === 0" class="empty-cell" style="padding: var(--space-8)">
              暂无数据
            </div>
          </div>
        </div>
        <!-- <Icon name="card" :size="14" /> 卡片视图 -->
        <div v-show="nonAutoView === 'card'" class="panel-card">
          <div class="card-view-header">
            <span class="panel-card-title">
              <Icon name="card" :size="14" />
              卡片 — 非汽车项目
            </span>
            <span class="panel-card-count">共 {{ filteredNonAutoProjects.length }} 条</span>
          </div>
          <div class="pt-card-grid">
            <div
              v-for="p in filteredNonAutoProjects"
              :key="p.id"
              class="pt-card"
              :class="{ 'pt-card-overdue': p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成' }"
              @click="openNonAutoDetail(p)"
            >
              <div class="pt-card-header-row">
                <span class="stage-tag" :class="'stage-' + napStageIdx(p.stage)">{{ p.stage }}</span>
                <span class="project-id">{{ p.projectId }}</span>
                <span v-if="p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成'" class="overdue-badge">
                  逾期
                </span>
              </div>
              <div class="pt-card-title">{{ p.customerName }}</div>
              <div class="pt-card-sub">{{ p.techRequirements || '无技术要求' }}</div>
              <div class="stage-progress-mini">
                <div
                  v-for="(s, i) in napStages"
                  :key="s"
                  class="spm-dot"
                  :class="{ active: i <= napStages.indexOf(p.stage), current: s === p.stage }"
                  :title="s"
                ></div>
              </div>
              <div class="pt-card-row">
                <span>月订单:</span>
                <span>{{ p.monthlyOrderQty || 0 }}吨</span>
              </div>
              <div class="pt-card-row">
                <span>合同金额:</span>
                <span>{{ p.contractAmount || 0 }}万</span>
              </div>
              <div class="pt-card-row">
                <span>回款:</span>
                <span class="payment-tag" :class="'ps-' + (p.paymentStatus || '')">{{ p.paymentStatus || '-' }}</span>
              </div>
              <div class="pt-card-footer">
                <span>{{ p.owner }}</span>
                <span :class="{ overdue: p.nextFollowUp && p.nextFollowUp < today }">{{ p.nextFollowUp || '-' }}</span>
              </div>
            </div>
          </div>
          <div v-if="filteredNonAutoProjects.length === 0" class="empty-cell" style="padding: var(--space-8)">
            暂无数据
          </div>
        </div>
        <!-- <Icon name="calendar" :size="14" /> 日历视图 -->
        <div v-show="nonAutoView === 'calendar'" class="panel-card">
          <div class="panel-card-header">
            <button class="btn btn-ghost btn-sm" @click="napCalPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="panel-card-title">
              <Icon name="calendar" :size="14" />
              日历 — {{ napCalYear }}年{{ napCalMonth }}月
            </span>
            <button class="btn btn-ghost btn-sm" @click="napCalNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-2)" @click="napCalToday">今天</button>
          </div>
          <div class="panel-card-body no-padding">
            <div class="cal-grid">
              <div v-for="d in weekDays" :key="d" class="cal-header">{{ d }}</div>
              <div
                v-for="(cell, idx) in napCalCells"
                :key="idx"
                class="cal-cell"
                :class="{ today: cell.isToday, hasEvent: cell.events.length > 0 }"
              >
                <div class="cal-date">{{ cell.day || '' }}</div>
                <div class="cal-events">
                  <div
                    v-for="e in cell.events.slice(0, 2)"
                    :key="e.id"
                    class="cal-event"
                    :class="'evt-' + e.type"
                    @click="openNonAutoDetail(nonAutoProjects.find((p) => p.id === e.id))"
                  >
                    {{ e.label }}
                  </div>
                  <div v-if="cell.events.length > 2" class="cal-more">+{{ cell.events.length - 2 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- <Icon name="calendar" :size="14" /> 周视图 -->
        <div v-show="nonAutoView === 'week'" class="panel-card">
          <div class="panel-card-header">
            <button class="btn btn-ghost btn-sm" @click="napWeekPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="panel-card-title">
              <Icon name="calendar" :size="14" />
              周视图 — {{ napWeekRangeLabel }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="napWeekNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-2)" @click="napWeekToday">本周</button>
          </div>
          <div class="panel-card-body no-padding">
            <div class="week-grid">
              <div v-for="(d, i) in weekDays" :key="d" class="week-header">
                <span>{{ d }}</span>
                <span class="week-header-date">{{ napWeekDates[i] }}</span>
              </div>
              <div
                v-for="(day, idx) in napWeekDaysData"
                :key="idx"
                class="week-col"
                :class="{ 'week-col-today': day.isToday }"
              >
                <div v-if="day.events.length === 0" class="week-empty">无事项</div>
                <div
                  v-for="e in day.events"
                  :key="e.id"
                  class="week-event"
                  :class="'evt-' + e.type"
                  @click="openNonAutoDetail(nonAutoProjects.find((p) => p.id === e.id))"
                >
                  <div class="week-event-title">{{ e.label }}</div>
                  <div class="week-event-meta">{{ e.meta || '' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 风险跟踪Tab ==================== -->
      <div v-show="activeTab === 'risk'">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
              <Icon name="warning" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ projectRisks.length }}</div>
              <div class="stat-card-label">风险总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
              [红色]
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value" style="color: var(--color-danger)">{{ activeRiskCount }}</div>
              <div class="stat-card-label">活跃风险</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
              <Icon name="refresh" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ processingRiskCount }}</div>
              <div class="stat-card-label">处理中</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
              <Icon name="check" :size="14" />
            </div>
            <div class="stat-card-body">
              <div class="stat-card-value">{{ resolvedRiskCount }}</div>
              <div class="stat-card-label">已解决</div>
            </div>
          </div>
        </div>
        <div class="filter-bar">
          <input
            v-model="riskSearch"
            type="text"
            class="form-input"
            placeholder="搜索项目ID/名称/描述..."
            style="min-width: 180px"
          />
          <select v-model="riskLevelFilter" class="form-select">
            <option value="">全部等级</option>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
          <select v-model="riskStatusFilter" class="form-select">
            <option value="">全部状态</option>
            <option value="未处理">未处理</option>
            <option value="处理中">处理中</option>
            <option value="已解决">已解决</option>
            <option value="已关闭">已关闭</option>
          </select>
          <button class="btn btn-outline btn-danger" @click="openRiskAddModal">新增风险</button>
        </div>
        <div class="content-grid content-grid-2-1">
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="warning" :size="14" />
                风险列表
              </span>
              <span class="panel-card-count">共 {{ filteredRisks.length }} 条</span>
            </div>
            <div class="panel-card-body no-padding">
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 100px">项目ID</th>
                      <th style="width: 100px">项目名称</th>
                      <th style="width: 120px">风险描述</th>
                      <th style="width: 70px">等级</th>
                      <th style="width: 80px">状态</th>
                      <th style="width: 90px">责任人</th>
                      <th style="width: 100px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in filteredRisks" :key="r.id">
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'projectId')">
                        <span v-if="!isInlineEditing(r.id, 'projectId')" class="project-id">{{ r.projectId }}</span>
                        <input
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-input"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                        />
                      </td>
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'projectName')">
                        <span v-if="!isInlineEditing(r.id, 'projectName')">{{ r.projectName }}</span>
                        <input
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-input"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                        />
                      </td>
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'description')">
                        <span v-if="!isInlineEditing(r.id, 'description')">{{ r.description }}</span>
                        <input
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-input"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                        />
                      </td>
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'level')">
                        <span v-if="!isInlineEditing(r.id, 'level')" class="risk-level-tag" :class="'rl-' + r.level">
                          {{ r.level }}
                        </span>
                        <select
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-select"
                          @change="confirmInlineEdit(r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                        >
                          <option value="高">高</option>
                          <option value="中">中</option>
                          <option value="低">低</option>
                        </select>
                      </td>
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'status')">
                        <span v-if="!isInlineEditing(r.id, 'status')" class="risk-status-tag" :class="'rs-' + r.status">
                          {{ r.status }}
                        </span>
                        <select
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-select"
                          @change="confirmInlineEdit(r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                        >
                          <option value="未处理">未处理</option>
                          <option value="处理中">处理中</option>
                          <option value="已解决">已解决</option>
                          <option value="已关闭">已关闭</option>
                        </select>
                      </td>
                      <td class="cell-editable" @dblclick="startInlineEdit(r, 'owner')">
                        <span v-if="!isInlineEditing(r.id, 'owner')">{{ r.owner }}</span>
                        <input
                          v-else
                          v-model="inlineEdit.value"
                          class="inline-input"
                          @keydown="onInlineKeydown($event, r, 'risk')"
                          @blur="confirmInlineEdit(r, 'risk')"
                        />
                      </td>
                      <td>
                        <div class="action-btns">
                          <button class="btn btn-ghost btn-sm" @click="editRisk(r)">编辑</button>
                          <button class="btn btn-ghost btn-sm btn-danger-text" @click="confirmDeleteRisk(r.id)">
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="filteredRisks.length === 0"><td colspan="7" class="empty-cell">暂无风险记录</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">[漏斗] 风险矩阵</span></div>
            <div class="panel-card-body">
              <div class="risk-matrix">
                <div class="rm-row">
                  <div class="rm-cell rm-high" :class="{ 'rm-has': rmCount('高', '高') }" title="高概率×高影响">
                    {{ rmCount('高', '高') }}
                  </div>
                  <div class="rm-cell rm-med" :class="{ 'rm-has': rmCount('中', '高') }" title="中概率×高影响">
                    {{ rmCount('中', '高') }}
                  </div>
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('低', '高') }" title="低概率×高影响">
                    {{ rmCount('低', '高') }}
                  </div>
                  <div class="rm-row-label">影响 高</div>
                </div>
                <div class="rm-row">
                  <div class="rm-cell rm-med" :class="{ 'rm-has': rmCount('高', '中') }" title="高概率×中影响">
                    {{ rmCount('高', '中') }}
                  </div>
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('中', '中') }" title="中概率×中影响">
                    {{ rmCount('中', '中') }}
                  </div>
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('低', '中') }" title="低概率×中影响">
                    {{ rmCount('低', '中') }}
                  </div>
                  <div class="rm-row-label">影响 中</div>
                </div>
                <div class="rm-row">
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('高', '低') }" title="高概率×低影响">
                    {{ rmCount('高', '低') }}
                  </div>
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('中', '低') }" title="中概率×低影响">
                    {{ rmCount('中', '低') }}
                  </div>
                  <div class="rm-cell rm-low" :class="{ 'rm-has': rmCount('低', '低') }" title="低概率×低影响">
                    {{ rmCount('低', '低') }}
                  </div>
                  <div class="rm-row-label">影响 低</div>
                </div>
                <div class="rm-blank"></div>
                <div class="rm-col-label">概率 高</div>
                <div class="rm-col-label">概率 中</div>
                <div class="rm-col-label">概率 低</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 统计报表Tab ==================== -->
      <div v-show="activeTab === 'stats'">
        <div class="content-grid content-grid-2-1" style="margin-bottom: var(--space-4)">
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="table" :size="14" />
                项目阶段分布
              </span>
            </div>
            <div class="panel-card-body" style="min-height: 300px"><canvas ref="stageChartRef"></canvas></div>
          </div>
          <div>
            <div class="panel-card" style="margin-bottom: var(--space-3)">
              <div class="panel-card-header">
                <span class="panel-card-title">
                  <Icon name="trendUp" :size="14" />
                  统计概览
                </span>
              </div>
              <div class="panel-card-body">
                <div class="stat-overview-item">
                  <span class="stat-overview-label">汽车项目总数</span>
                  <span class="stat-overview-value">{{ autoProjects.length }}</span>
                </div>
                <div class="stat-overview-item">
                  <span class="stat-overview-label">非汽车项目总数</span>
                  <span class="stat-overview-value">{{ nonAutoProjects.length }}</span>
                </div>
                <div class="stat-overview-item">
                  <span class="stat-overview-label">活跃风险数</span>
                  <span class="stat-overview-value" style="color: var(--color-danger)">{{ activeRiskCount }}</span>
                </div>
                <div class="stat-overview-item">
                  <span class="stat-overview-label">已量产项目</span>
                  <span class="stat-overview-value" style="color: var(--color-success)">{{ autoMassCount }}</span>
                </div>
                <div class="stat-overview-item">
                  <span class="stat-overview-label">合同总额(万)</span>
                  <span class="stat-overview-value">{{ nonAutoTotalAmount }}</span>
                </div>
                <div class="stat-overview-item">
                  <span class="stat-overview-label">逾期跟进</span>
                  <span class="stat-overview-value" style="color: var(--color-danger)">
                    {{ autoOverdueCount + napOverdueCount }}
                  </span>
                </div>
              </div>
            </div>
            <div class="panel-card">
              <div class="panel-card-header">
                <span class="panel-card-title">
                  <Icon name="chevronDown" :size="14" />
                  月度订单量趋势
                </span>
              </div>
              <div class="panel-card-body" style="min-height: 200px"><canvas ref="trendChartRef"></canvas></div>
            </div>
          </div>
        </div>
        <div class="content-grid content-grid-3" style="margin-bottom: var(--space-4)">
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">[饼图] 客户分布</span></div>
            <div class="panel-card-body" style="min-height: 260px"><canvas ref="customerChartRef"></canvas></div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="table" :size="14" />
                负责人项目数
              </span>
            </div>
            <div class="panel-card-body" style="min-height: 260px"><canvas ref="ownerChartRef"></canvas></div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">[漏斗] 阶段转化漏斗</span></div>
            <div class="panel-card-body" style="min-height: 260px"><canvas ref="funnelChartRef"></canvas></div>
          </div>
        </div>
      </div>

      <!-- ==================== 详情面板 ==================== -->
      <div v-if="showDetailPanel" class="detail-panel-overlay" @click.self="showDetailPanel = false">
        <div class="detail-panel">
          <div class="detail-panel-header">
            <h3 class="detail-panel-title">
              {{ detailData?.projectId }} — {{ detailData?.partName || detailData?.customerName }}
            </h3>
            <button class="modal-close" @click="showDetailPanel = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="detail-panel-body">
            <div class="stage-progress-full">
              <div
                v-for="(s, i) in detailType === 'auto' ? stages : napStages"
                :key="s"
                class="spf-item"
                :class="{
                  active: i <= (detailType === 'auto' ? stages : napStages).indexOf(detailData?.stage),
                  current: s === detailData?.stage
                }"
              >
                <div class="spf-dot"></div>
                <span class="spf-label">{{ s }}</span>
              </div>
            </div>
            <div v-if="detailType === 'auto'" class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">项目ID</span>
                <span class="detail-value">{{ detailData.projectId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">客户</span>
                <span class="detail-value">{{ detailData.customer }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">主机厂</span>
                <span class="detail-value">{{ detailData.oem }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">配套车型</span>
                <span class="detail-value">{{ detailData.vehicleModels }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">零件名称</span>
                <span class="detail-value">{{ detailData.partName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">材料</span>
                <span class="detail-value">{{ detailData.material }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">材料牌号</span>
                <span class="detail-value">{{ detailData.materialGrade || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">配套供应商</span>
                <span class="detail-value">{{ detailData.supplier || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">竞争对手</span>
                <span class="detail-value">{{ detailData.competitor || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">颜色</span>
                <span class="detail-value">{{ detailData.color || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">项目阶段</span>
                <span class="detail-value">
                  <span class="stage-tag" :class="'stage-' + stageIdx(detailData.stage)">{{ detailData.stage }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">报价状态</span>
                <span class="detail-value">
                  <span class="quote-tag" :class="'qs-' + detailData.quoteStatus">{{ detailData.quoteStatus }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">合同状态</span>
                <span class="detail-value">{{ detailData.contractStatus || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">量产状态</span>
                <span class="detail-value">
                  <span class="mass-tag" :class="'ms-' + detailData.massStatus">{{ detailData.massStatus }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">SOP日期</span>
                <span class="detail-value">{{ detailData.sop || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">负责人</span>
                <span class="detail-value">{{ detailData.owner }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">下次跟进</span>
                <span
                  class="detail-value"
                  :class="{ overdue: detailData.nextFollowUp && detailData.nextFollowUp < today }"
                >
                  {{ detailData.nextFollowUp || '-' }}
                </span>
              </div>
            </div>
            <div v-else class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">项目ID</span>
                <span class="detail-value">{{ detailData.projectId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">客户名称</span>
                <span class="detail-value">{{ detailData.customerName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">项目阶段</span>
                <span class="detail-value">
                  <span class="stage-tag" :class="'stage-' + napStageIdx(detailData.stage)">
                    {{ detailData.stage }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">报价状态</span>
                <span class="detail-value">
                  <span class="quote-tag" :class="'qs-' + detailData.quoteStatus">{{ detailData.quoteStatus }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">合同状态</span>
                <span class="detail-value">{{ detailData.contractStatus || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">竞争对手</span>
                <span class="detail-value">{{ detailData.competitor || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">月订单量(吨)</span>
                <span class="detail-value">{{ detailData.monthlyOrderQty || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">合同金额(万)</span>
                <span class="detail-value">{{ detailData.contractAmount || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">回款状态</span>
                <span class="detail-value">
                  <span class="payment-tag" :class="'ps-' + (detailData.paymentStatus || '')">
                    {{ detailData.paymentStatus || '-' }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">负责人</span>
                <span class="detail-value">{{ detailData.owner }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">下次跟进</span>
                <span
                  class="detail-value"
                  :class="{ overdue: detailData.nextFollowUp && detailData.nextFollowUp < today }"
                >
                  {{ detailData.nextFollowUp || '-' }}
                </span>
              </div>
            </div>
            <div v-if="detailData?.techRequirements" class="detail-section">
              <h4 class="detail-section-title">技术要求</h4>
              <pre class="detail-pre">{{ detailData.techRequirements }}</pre>
            </div>
            <div v-if="detailData?.bizRequirements" class="detail-section">
              <h4 class="detail-section-title">商务要求</h4>
              <pre class="detail-pre">{{ detailData.bizRequirements }}</pre>
            </div>
            <div v-if="detailData?.notes" class="detail-section">
              <h4 class="detail-section-title">备注</h4>
              <pre class="detail-pre">{{ detailData.notes }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 汽车项目弹窗 ==================== -->
    <div v-if="showAutoModal" class="modal-overlay" @click.self="showAutoModal = false">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3 class="modal-title">{{ isAutoEditing ? '编辑汽车项目' : '新建汽车项目' }}</h3>
          <button class="modal-close" @click="showAutoModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">客户</label>
              <select v-model="autoForm.customer" class="form-select">
                <option value="">请选择</option>
                <option v-for="c in customerStore.customers" :key="c.id" :value="c.fullName || c.name">
                  {{ c.fullName || c.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">主机厂</label>
              <input v-model="autoForm.oem" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">配套车型</label>
              <input v-model="autoForm.vehicleModels" class="form-input" placeholder="多车型用/分隔" />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">零件名称</label>
              <input v-model="autoForm.partName" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">材料</label>
              <input v-model="autoForm.material" class="form-input" placeholder="如 FRPA66+35GF" />
            </div>
            <div class="form-group">
              <label class="form-label">材料牌号</label>
              <input v-model="autoForm.materialGrade" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">配套供应商</label>
              <input v-model="autoForm.supplier" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">竞争对手</label>
              <input v-model="autoForm.competitor" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">颜色</label>
              <input v-model="autoForm.color" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">项目阶段</label>
              <select v-model="autoForm.stage" class="form-select">
                <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">报价状态</label>
              <select v-model="autoForm.quoteStatus" class="form-select">
                <option v-for="s in quoteStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">合同签订状态</label>
              <select v-model="autoForm.contractStatus" class="form-select">
                <option value="未签订">未签订</option>
                <option value="签订中">签订中</option>
                <option value="已签订">已签订</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">量产状态</label>
              <select v-model="autoForm.massStatus" class="form-select">
                <option value="未量产">未量产</option>
                <option value="小批量">小批量</option>
                <option value="量产">量产</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">SOP日期</label>
              <input v-model="autoForm.sop" class="form-input" type="date" />
            </div>
            <div class="form-group">
              <label class="form-label">负责人</label>
              <input v-model="autoForm.owner" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">下次跟进时间</label>
              <input v-model="autoForm.nextFollowUp" class="form-input" type="date" />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="autoForm.notes" class="form-input form-textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showAutoModal = false">取消</button>
          <button class="btn btn-primary" @click="saveAutoProject">保存</button>
        </div>
      </div>
    </div>

    <!-- ==================== 非汽车项目弹窗 ==================== -->
    <div v-if="showNapModal" class="modal-overlay" @click.self="showNapModal = false">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3 class="modal-title">{{ isNapEditing ? '编辑非汽车项目' : '新建非汽车项目' }}</h3>
          <button class="modal-close" @click="showNapModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">客户名称</label>
              <select v-model="napForm.customerName" class="form-select">
                <option value="">请选择</option>
                <option v-for="c in customerStore.customers" :key="c.id" :value="c.fullName || c.name">
                  {{ c.fullName || c.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">项目阶段</label>
              <select v-model="napForm.stage" class="form-select">
                <option v-for="s in napStages" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">报价状态</label>
              <select v-model="napForm.quoteStatus" class="form-select">
                <option v-for="s in quoteStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">合同金额(万)</label>
              <input v-model.number="napForm.contractAmount" class="form-input" type="number" />
            </div>
            <div class="form-group">
              <label class="form-label">月订单量(吨)</label>
              <input v-model.number="napForm.monthlyOrderQty" class="form-input" type="number" />
            </div>
            <div class="form-group">
              <label class="form-label">回款状态</label>
              <select v-model="napForm.paymentStatus" class="form-select">
                <option value="未回款">未回款</option>
                <option value="部分回款">部分回款</option>
                <option value="已回款">已回款</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">合同状态</label>
              <select v-model="napForm.contractStatus" class="form-select">
                <option value="未签订">未签订</option>
                <option value="签订中">签订中</option>
                <option value="已签订">已签订</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">竞争对手</label>
              <input v-model="napForm.competitor" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">负责人</label>
              <input v-model="napForm.owner" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">技术要求</label>
              <textarea v-model="napForm.techRequirements" class="form-input form-textarea" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">商务要求</label>
              <textarea v-model="napForm.bizRequirements" class="form-input form-textarea" rows="2"></textarea>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">下次跟进时间</label>
              <input v-model="napForm.nextFollowUp" class="form-input" type="date" />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="napForm.notes" class="form-input form-textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showNapModal = false">取消</button>
          <button class="btn btn-primary" @click="saveNapProject">保存</button>
        </div>
      </div>
    </div>

    <!-- ==================== 风险弹窗 ==================== -->
    <div v-if="showRiskModal" class="modal-overlay" @click.self="showRiskModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isRiskEditing ? '编辑风险' : '新增风险' }}</h3>
          <button class="modal-close" @click="showRiskModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">项目ID</label>
              <input v-model="riskForm.projectId" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">项目名称</label>
              <input v-model="riskForm.projectName" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">责任人</label>
              <input v-model="riskForm.owner" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">等级</label>
              <select v-model="riskForm.level" class="form-select">
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="riskForm.status" class="form-select">
                <option value="未处理">未处理</option>
                <option value="处理中">处理中</option>
                <option value="已解决">已解决</option>
                <option value="已关闭">已关闭</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">风险描述</label>
            <textarea v-model="riskForm.description" class="form-input form-textarea" rows="3"></textarea>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">概率</label>
              <select v-model="riskForm.probability" class="form-select">
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">影响</label>
              <select v-model="riskForm.impact" class="form-select">
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">应对措施</label>
            <textarea v-model="riskForm.mitigation" class="form-input form-textarea" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showRiskModal = false">取消</button>
          <button class="btn btn-primary" @click="saveRisk">保存</button>
        </div>
      </div>
    </div>

    <!-- ==================== 操作日志弹窗 ==================== -->
    <div v-if="showOpLogModal" class="modal-overlay" @click.self="showOpLogModal = false">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3 class="modal-title">
            <Icon name="edit" :size="14" />
            操作日志
          </h3>
          <button class="modal-close" @click="showOpLogModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body" style="max-height: 500px; overflow-y: auto">
          <div
            v-if="opLogs.length === 0"
            style="text-align: center; color: var(--color-text-tertiary); padding: var(--space-8)"
          >
            暂无操作记录
          </div>
          <div v-for="log in opLogs" :key="log.id" class="op-log-item">
            <span class="op-log-time">{{ log.time }}</span>
            <span class="op-log-action" :class="'ola-' + log.action">{{ log.actionLabel }}</span>
            <span class="op-log-detail">{{ log.detail }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="opLogs = []; persistOpLogs()">
            清空日志
          </button>
          <button class="btn btn-ghost" @click="showOpLogModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ==================== 确认弹窗 ==================== -->
    <div v-if="showConfirmDialog" class="modal-overlay" @click.self="showConfirmDialog = false">
      <div class="modal-content" style="max-width: 420px">
        <div class="modal-header">
          <h3 class="modal-title">
            <Icon name="warning" :size="14" />
            确认操作
          </h3>
          <button class="modal-close" @click="showConfirmDialog = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <p>{{ confirmMsg }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showConfirmDialog = false">取消</button>
          <button class="btn btn-danger" @click="doConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ProjectTracking' }
</script>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const customerStore = useCustomerStore()

const AUTO_KEY = 'gj_erp_autoProjects'
const NONAUTO_KEY = 'gj_erp_nonAutoProjects'
const RISK_KEY = 'gj_erp_projectRisks'
const OP_LOG_KEY = 'gj_erp_opLogs'

const today = new Date().toISOString().slice(0, 10)

function loadLS(key) {
  try {
    const r = localStorage.getItem(key)
    return r ? JSON.parse(r) : []
  } catch {
    return []
  }
}
function persistLS(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('存储失败:', e)
  }
}

const activeTab = ref('auto')
const stages = ['立项', '报价', '定点', '开模', '试模', 'PPAP', '量产', '落选']
const napStages = ['接触', '报价', '谈判', '签约', '执行', '完成']
const quoteStatuses = ['未报价', '报价中', '已报价', '落选']
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const autoProjects = ref(loadLS(AUTO_KEY))
const nonAutoProjects = ref(loadLS(NONAUTO_KEY))
const projectRisks = ref(loadLS(RISK_KEY))

function genAutoId() {
  const y = new Date().getFullYear()
  const existing = autoProjects.value.map((p) => p.projectId || '')
  let seq = 1
  while (existing.includes(`AP-${y}-${String(seq).padStart(3, '0')}`)) seq++
  return `AP-${y}-${String(seq).padStart(3, '0')}`
}
function genNapId() {
  const y = new Date().getFullYear()
  const existing = nonAutoProjects.value.map((p) => p.projectId || '')
  let seq = 1
  while (existing.includes(`NP-${y}-${String(seq).padStart(3, '0')}`)) seq++
  return `NP-${y}-${String(seq).padStart(3, '0')}`
}

function stageIdx(s) {
  return Math.min(stages.indexOf(s), stages.length - 1)
}
function napStageIdx(s) {
  return Math.min(napStages.indexOf(s), napStages.length - 1)
}

const addBtnLabel = computed(() => {
  if (activeTab.value === 'auto') return '+ 新建汽车项目'
  if (activeTab.value === 'nonauto') return '+ 新建非汽车项目'
  return '+ 新建'
})

const autoSearch = ref('')
const autoStageFilter = ref('')
const autoQuoteFilter = ref('')
const autoOwnerFilter = ref('')
const autoQuickFilter = ref('')
const autoSelected = ref([])
const autoView = ref('table')
const batchStageVal = ref('')
const showAutoColumnConfig = ref(false)
const autoColDropdownStyle = ref({})
const napColDropdownStyle = ref({})

function toggleAutoColumnConfig(e) {
  showAutoColumnConfig.value = !showAutoColumnConfig.value
  if (showAutoColumnConfig.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    autoColDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}
function toggleNapColumnConfig(e) {
  showNapColumnConfig.value = !showNapColumnConfig.value
  if (showNapColumnConfig.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    napColDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}

const autoColumnDefs = [
  { key: 'projectId', label: '项目编码' },
  { key: 'customer', label: '客户单位' },
  { key: 'oem', label: '主机厂商' },
  { key: 'vehicleModels', label: '配套车型型号' },
  { key: 'partName', label: '零部件名称' },
  { key: 'material', label: '所用材料' },
  { key: 'stage', label: '项目所处阶段' },
  { key: 'quoteStatus', label: '报价跟进状态' },
  { key: 'massStatus', label: '量产执行状态' },
  { key: 'owner', label: '项目负责人' },
  { key: 'followUp', label: '跟进' }
]
const autoColumnVisible = ref(Object.fromEntries(autoColumnDefs.map((c) => [c.key, true])))
const autoVisibleColCount = computed(() => autoColumnDefs.filter((c) => autoColumnVisible.value[c.key]).length)
const autoOwners = computed(() => [...new Set(autoProjects.value.map((p) => p.owner).filter(Boolean))])

const nonAutoSearch = ref('')
const nonAutoStageFilter = ref('')
const nonAutoPaymentFilter = ref('')
const napQuickFilter = ref('')
const nonAutoView = ref('table')
const showNapColumnConfig = ref(false)

const napColumnDefs = [
  { key: 'projectId', label: '项目ID' },
  { key: 'customerName', label: '客户名称' },
  { key: 'techRequirements', label: '技术要求' },
  { key: 'monthlyOrderQty', label: '月订单量' },
  { key: 'contractAmount', label: '合同金额' },
  { key: 'stage', label: '项目阶段' },
  { key: 'quoteStatus', label: '报价状态' },
  { key: 'contractStatus', label: '合同状态' },
  { key: 'paymentStatus', label: '回款状态' },
  { key: 'owner', label: '负责人' },
  { key: 'followUp', label: '跟进' }
]
const napColumnVisible = ref(Object.fromEntries(napColumnDefs.map((c) => [c.key, true])))
const napVisibleColCount = computed(() => napColumnDefs.filter((c) => napColumnVisible.value[c.key]).length)

const riskSearch = ref('')
const riskLevelFilter = ref('')
const riskStatusFilter = ref('')
const inlineEdit = ref({ id: null, field: null, value: '' })

const autoActiveCount = computed(() => autoProjects.value.filter((p) => !['落选', '量产'].includes(p.stage)).length)
const autoRiskCount = computed(() => autoProjects.value.filter((p) => p.hasRisk).length)
const autoMassCount = computed(() => autoProjects.value.filter((p) => p.stage === '量产').length)
const autoOverdueCount = computed(
  () => autoProjects.value.filter((p) => p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产').length
)

const napActiveCount = computed(() => nonAutoProjects.value.filter((p) => !['完成'].includes(p.stage)).length)
const napOverdueCount = computed(
  () => nonAutoProjects.value.filter((p) => p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成').length
)
const nonAutoTotalAmount = computed(() =>
  nonAutoProjects.value.reduce((s, p) => s + (Number(p.contractAmount) || 0), 0)
)
const nonAutoMonthlyQty = computed(() =>
  nonAutoProjects.value.reduce((s, p) => s + (Number(p.monthlyOrderQty) || 0), 0)
)

const activeRiskCount = computed(() => projectRisks.value.filter((r) => r.status === '未处理').length)
const processingRiskCount = computed(() => projectRisks.value.filter((r) => r.status === '处理中').length)
const resolvedRiskCount = computed(
  () => projectRisks.value.filter((r) => ['已解决', '已关闭'].includes(r.status)).length
)

function toggleAutoQuickFilter(f) {
  autoQuickFilter.value = autoQuickFilter.value === f ? '' : f
}
function toggleNapQuickFilter(f) {
  napQuickFilter.value = napQuickFilter.value === f ? '' : f
}

const filteredAutoProjects = computed(() => {
  let list = autoProjects.value
  const q = autoSearch.value.toLowerCase()
  if (q)
    list = list.filter((p) =>
      [p.customer, p.oem, p.partName, p.projectId, p.vehicleModels].some((v) => (v || '').toLowerCase().includes(q))
    )
  if (autoStageFilter.value) list = list.filter((p) => p.stage === autoStageFilter.value)
  if (autoQuoteFilter.value) list = list.filter((p) => p.quoteStatus === autoQuoteFilter.value)
  if (autoOwnerFilter.value) list = list.filter((p) => p.owner === autoOwnerFilter.value)
  if (autoQuickFilter.value === 'overdue')
    list = list.filter((p) => p.nextFollowUp && p.nextFollowUp < today && p.stage !== '量产')
  if (autoQuickFilter.value === 'sopThisMonth') {
    const m = new Date().toISOString().slice(0, 7)
    list = list.filter((p) => p.sop && p.sop.startsWith(m))
  }
  if (autoQuickFilter.value === 'hasRisk') list = list.filter((p) => p.hasRisk)
  if (autoQuickFilter.value === 'notQuoted') list = list.filter((p) => p.quoteStatus === '未报价')
  return list
})

const filteredNonAutoProjects = computed(() => {
  let list = nonAutoProjects.value
  const q = nonAutoSearch.value.toLowerCase()
  if (q) list = list.filter((p) => [p.customerName, p.projectId].some((v) => (v || '').toLowerCase().includes(q)))
  if (nonAutoStageFilter.value) list = list.filter((p) => p.stage === nonAutoStageFilter.value)
  if (nonAutoPaymentFilter.value) list = list.filter((p) => p.paymentStatus === nonAutoPaymentFilter.value)
  if (napQuickFilter.value === 'overdue')
    list = list.filter((p) => p.nextFollowUp && p.nextFollowUp < today && p.stage !== '完成')
  if (napQuickFilter.value === 'hasRisk') list = list.filter((p) => p.hasRisk)
  if (napQuickFilter.value === 'notQuoted') list = list.filter((p) => p.quoteStatus === '未报价')
  if (napQuickFilter.value === 'unpaid') list = list.filter((p) => p.paymentStatus === '未回款')
  return list
})

const filteredRisks = computed(() => {
  let list = projectRisks.value
  const q = riskSearch.value.toLowerCase()
  if (q)
    list = list.filter((r) =>
      [r.projectId, r.projectName, r.description].some((v) => (v || '').toLowerCase().includes(q))
    )
  if (riskLevelFilter.value) list = list.filter((r) => r.level === riskLevelFilter.value)
  if (riskStatusFilter.value) list = list.filter((r) => r.status === riskStatusFilter.value)
  return list
})

function rmCount(prob, imp) {
  return projectRisks.value.filter((r) => r.probability === prob && r.impact === imp).length
}

const showAutoModal = ref(false)
const isAutoEditing = ref(false)
const editingAutoId = ref(null)
const autoForm = ref({
  customer: '',
  oem: '',
  vehicleModels: '',
  partName: '',
  material: '',
  materialGrade: '',
  supplier: '',
  competitor: '',
  color: '',
  stage: '立项',
  quoteStatus: '未报价',
  contractStatus: '未签订',
  massStatus: '未量产',
  sop: '',
  owner: '',
  nextFollowUp: '',
  notes: ''
})

const showNapModal = ref(false)
const isNapEditing = ref(false)
const editingNapId = ref(null)
const napForm = ref({
  customerName: '',
  stage: '接触',
  quoteStatus: '未报价',
  contractStatus: '未签订',
  contractAmount: 0,
  monthlyOrderQty: 0,
  paymentStatus: '未回款',
  competitor: '',
  owner: '',
  techRequirements: '',
  bizRequirements: '',
  nextFollowUp: '',
  notes: ''
})

const showRiskModal = ref(false)
const isRiskEditing = ref(false)
const editingRiskId = ref(null)
const riskForm = ref({
  projectId: '',
  projectName: '',
  description: '',
  level: '中',
  status: '未处理',
  probability: '中',
  impact: '中',
  owner: '',
  mitigation: ''
})

const showDetailPanel = ref(false)
const detailData = ref(null)
const detailType = ref('auto')

const showOpLogModal = ref(false)
const showConfirmDialog = ref(false)
const confirmMsg = ref('')
let confirmAction = null

const opLogs = ref(loadLS(OP_LOG_KEY))
function persistOpLogs() {
  persistLS(OP_LOG_KEY, opLogs.value)
}
function addOpLog(action, actionLabel, detail) {
  opLogs.value.unshift({ id: Date.now(), time: new Date().toLocaleString('zh-CN'), action, actionLabel, detail })
  if (opLogs.value.length > 200) opLogs.value.length = 200
  persistOpLogs()
}

function openAddModal() {
  if (activeTab.value === 'auto') {
    isAutoEditing.value = false
    editingAutoId.value = null
    autoForm.value = {
      customer: '',
      oem: '',
      vehicleModels: '',
      partName: '',
      material: '',
      materialGrade: '',
      supplier: '',
      competitor: '',
      color: '',
      stage: '立项',
      quoteStatus: '未报价',
      contractStatus: '未签订',
      massStatus: '未量产',
      sop: '',
      owner: '',
      nextFollowUp: '',
      notes: ''
    }
    showAutoModal.value = true
  } else if (activeTab.value === 'nonauto') {
    isNapEditing.value = false
    editingNapId.value = null
    napForm.value = {
      customerName: '',
      stage: '接触',
      quoteStatus: '未报价',
      contractStatus: '未签订',
      contractAmount: 0,
      monthlyOrderQty: 0,
      paymentStatus: '未回款',
      competitor: '',
      owner: '',
      techRequirements: '',
      bizRequirements: '',
      nextFollowUp: '',
      notes: ''
    }
    showNapModal.value = true
  }
}

function editAutoProject(p) {
  isAutoEditing.value = true
  editingAutoId.value = p.id
  autoForm.value = { ...p }
  showAutoModal.value = true
}
function editNonAutoProject(p) {
  isNapEditing.value = true
  editingNapId.value = p.id
  napForm.value = { ...p }
  showNapModal.value = true
}

function saveAutoProject() {
  const f = autoForm.value
  if (isAutoEditing.value) {
    const idx = autoProjects.value.findIndex((p) => p.id === editingAutoId.value)
    if (idx !== -1) {
      autoProjects.value[idx] = { ...autoProjects.value[idx], ...f }
      addOpLog('edit', '编辑', `编辑汽车项目 ${f.projectId || f.partName}`)
    }
  } else {
    const newP = { id: Date.now(), projectId: genAutoId(), ...f, hasRisk: false, createdAt: new Date().toISOString() }
    autoProjects.value.unshift(newP)
    addOpLog('add', '新增', `新增汽车项目 ${newP.projectId}`)
  }
  persistLS(AUTO_KEY, autoProjects.value)
  showAutoModal.value = false
}

function saveNapProject() {
  const f = napForm.value
  if (isNapEditing.value) {
    const idx = nonAutoProjects.value.findIndex((p) => p.id === editingNapId.value)
    if (idx !== -1) {
      nonAutoProjects.value[idx] = { ...nonAutoProjects.value[idx], ...f }
      addOpLog('edit', '编辑', `编辑非汽车项目 ${f.projectId || f.customerName}`)
    }
  } else {
    const newP = { id: Date.now(), projectId: genNapId(), ...f, hasRisk: false, createdAt: new Date().toISOString() }
    nonAutoProjects.value.unshift(newP)
    addOpLog('add', '新增', `新增非汽车项目 ${newP.projectId}`)
  }
  persistLS(NONAUTO_KEY, nonAutoProjects.value)
  showNapModal.value = false
}

function openRiskAddModal() {
  isRiskEditing.value = false
  editingRiskId.value = null
  riskForm.value = {
    projectId: '',
    projectName: '',
    description: '',
    level: '中',
    status: '未处理',
    probability: '中',
    impact: '中',
    owner: '',
    mitigation: ''
  }
  showRiskModal.value = true
}
function editRisk(r) {
  isRiskEditing.value = true
  editingRiskId.value = r.id
  riskForm.value = { ...r }
  showRiskModal.value = true
}

function saveRisk() {
  const f = riskForm.value
  if (isRiskEditing.value) {
    const idx = projectRisks.value.findIndex((r) => r.id === editingRiskId.value)
    if (idx !== -1) {
      projectRisks.value[idx] = { ...projectRisks.value[idx], ...f }
      addOpLog('edit', '编辑', `编辑风险 ${f.projectId}`)
    }
  } else {
    projectRisks.value.unshift({ id: Date.now(), ...f, createdAt: new Date().toISOString() })
    addOpLog('add', '新增', `新增风险 ${f.projectId}`)
  }
  persistLS(RISK_KEY, projectRisks.value)
  showRiskModal.value = false
}

function startInlineEdit(item, field) {
  inlineEdit.value = { id: item.id, field, value: String(item[field] ?? '') }
}

function isInlineEditing(itemId, field) {
  return inlineEdit.value.id === itemId && inlineEdit.value.field === field
}

function confirmInlineEdit(item, type) {
  const { field, value } = inlineEdit.value
  if (!field) return
  const numericFields = ['monthlyOrderQty', 'contractAmount']
  const finalValue = numericFields.includes(field) ? Number(value) || 0 : value
  let list, key, logName
  if (type === 'auto') {
    list = autoProjects
    key = AUTO_KEY
    logName = '汽车项目'
  } else if (type === 'nonauto') {
    list = nonAutoProjects
    key = NONAUTO_KEY
    logName = '非汽车项目'
  } else {
    list = projectRisks
    key = RISK_KEY
    logName = '风险'
  }
  const idx = list.value.findIndex((x) => x.id === item.id)
  if (idx !== -1) {
    list.value[idx] = { ...list.value[idx], [field]: finalValue }
    persistLS(key, list.value)
    addOpLog('edit', '编辑', `内联编辑${logName} ${field}`)
  }
  inlineEdit.value = { id: null, field: null, value: '' }
}

function cancelInlineEdit() {
  inlineEdit.value = { id: null, field: null, value: '' }
}

function onInlineKeydown(e, item, type) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmInlineEdit(item, type)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelInlineEdit()
  }
}

function confirmDeleteAuto(id) {
  confirmMsg.value = '确定要删除该汽车项目吗？此操作不可恢复。'
  confirmAction = () => {
    autoProjects.value = autoProjects.value.filter((p) => p.id !== id)
    persistLS(AUTO_KEY, autoProjects.value)
    addOpLog('delete', '删除', '删除汽车项目')
  }
  showConfirmDialog.value = true
}
function confirmDeleteNonAuto(id) {
  confirmMsg.value = '确定要删除该非汽车项目吗？此操作不可恢复。'
  confirmAction = () => {
    nonAutoProjects.value = nonAutoProjects.value.filter((p) => p.id !== id)
    persistLS(NONAUTO_KEY, nonAutoProjects.value)
    addOpLog('delete', '删除', '删除非汽车项目')
  }
  showConfirmDialog.value = true
}
function confirmDeleteRisk(id) {
  confirmMsg.value = '确定要删除该风险记录吗？此操作不可恢复。'
  confirmAction = () => {
    projectRisks.value = projectRisks.value.filter((r) => r.id !== id)
    persistLS(RISK_KEY, projectRisks.value)
    addOpLog('delete', '删除', '删除风险记录')
  }
  showConfirmDialog.value = true
}
function confirmBatchDeleteAuto() {
  confirmMsg.value = `确定要批量删除选中的 ${autoSelected.value.length} 个汽车项目吗？`
  confirmAction = () => {
    autoProjects.value = autoProjects.value.filter((p) => !autoSelected.value.includes(p.id))
    persistLS(AUTO_KEY, autoProjects.value)
    autoSelected.value = []
    addOpLog('batchDelete', '批量删除', '批量删除汽车项目')
  }
  showConfirmDialog.value = true
}
function doConfirm() {
  if (confirmAction) confirmAction()
  showConfirmDialog.value = false
  confirmAction = null
}

function toggleAutoSelectAll(e) {
  autoSelected.value = e.target.checked ? filteredAutoProjects.value.map((p) => p.id) : []
}
function batchChangeStage() {
  if (!batchStageVal.value) return
  autoSelected.value.forEach((id) => {
    const p = autoProjects.value.find((x) => x.id === id)
    if (p) p.stage = batchStageVal.value
  })
  persistLS(AUTO_KEY, autoProjects.value)
  batchStageVal.value = ''
  autoSelected.value = []
  addOpLog('batchEdit', '批量修改', '批量修改项目阶段')
}

function openAutoDetail(p) {
  detailType.value = 'auto'
  detailData.value = { ...p }
  showDetailPanel.value = true
}
function openNonAutoDetail(p) {
  detailType.value = 'nonauto'
  detailData.value = { ...p }
  showDetailPanel.value = true
}

const importFileRef = ref(null)
function triggerImport() {
  importFileRef.value?.click()
}

function exportCSV() {
  try {
    const isAuto = activeTab.value === 'auto'
    const data = isAuto ? filteredAutoProjects.value : filteredNonAutoProjects.value
    if (!data.length) {
      alert('暂无数据可导出')
      return
    }
    const headers = isAuto
      ? [
          '项目编码',
          '客户单位',
          '主机厂商',
          '配套车型型号',
          '零部件名称',
          '所用材料',
          '项目所处阶段',
          '报价跟进状态',
          '量产执行状态',
          '项目负责人',
          '下次跟进'
        ]
      : ['项目ID', '客户名称', '项目阶段', '报价状态', '合同金额', '月订单量', '回款状态', '负责人', '下次跟进']
    const rows = data.map((p) =>
      isAuto
        ? [
            p.projectId,
            p.customer,
            p.oem,
            p.vehicleModels,
            p.partName,
            p.material,
            p.stage,
            p.quoteStatus,
            p.massStatus,
            p.owner,
            p.nextFollowUp
          ]
        : [
            p.projectId,
            p.customerName,
            p.stage,
            p.quoteStatus,
            p.contractAmount,
            p.monthlyOrderQty,
            p.paymentStatus,
            p.owner,
            p.nextFollowUp
          ]
    )
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${isAuto ? '汽车项目' : '非汽车项目'}_${today}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    addOpLog('export', '导出', `导出${isAuto ? '汽车' : '非汽车'}项目CSV`)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败: ' + e.message)
  }
}

function importCSV(e) {
  try {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        alert('CSV文件为空')
        return
      }
      const isAuto = activeTab.value === 'auto'
      for (let i = 1; i < lines.length; i++) {
        const clean = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim())
        if (isAuto) {
          autoProjects.value.unshift({
            id: Date.now() + i,
            projectId: clean[0] || genAutoId(),
            customer: clean[1] || '',
            oem: clean[2] || '',
            vehicleModels: clean[3] || '',
            partName: clean[4] || '',
            material: clean[5] || '',
            stage: clean[6] || '立项',
            quoteStatus: clean[7] || '未报价',
            massStatus: clean[8] || '未量产',
            owner: clean[9] || '',
            nextFollowUp: clean[10] || '',
            hasRisk: false
          })
        } else {
          nonAutoProjects.value.unshift({
            id: Date.now() + i,
            projectId: clean[0] || genNapId(),
            customerName: clean[1] || '',
            stage: clean[2] || '接触',
            quoteStatus: clean[3] || '未报价',
            contractAmount: Number(clean[4]) || 0,
            monthlyOrderQty: Number(clean[5]) || 0,
            paymentStatus: clean[6] || '未回款',
            owner: clean[7] || '',
            nextFollowUp: clean[8] || '',
            hasRisk: false
          })
        }
      }
      persistLS(isAuto ? AUTO_KEY : NONAUTO_KEY, isAuto ? autoProjects.value : nonAutoProjects.value)
      addOpLog('import', '导入', `导入${isAuto ? '汽车' : '非汽车'}项目CSV`)
    }
    reader.readAsText(file)
    e.target.value = ''
  } catch (e) {
    console.error('导入失败:', e)
    alert('导入失败: ' + e.message)
  }
}

function printView() {
  window.print()
  addOpLog('print', '打印', '打印报表')
}

const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth() + 1)
function calPrev() {
  if (calMonth.value === 1) {
    calMonth.value = 12
    calYear.value--
  } else calMonth.value--
}
function calNext() {
  if (calMonth.value === 12) {
    calMonth.value = 1
    calYear.value++
  } else calMonth.value++
}
function calToday() {
  const d = new Date()
  calYear.value = d.getFullYear()
  calMonth.value = d.getMonth() + 1
}

const calCells = computed(() => {
  const first = new Date(calYear.value, calMonth.value - 1, 1)
  const lastDay = new Date(calYear.value, calMonth.value, 0).getDate()
  const startDow = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push({ day: 0, events: [], isToday: false })
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === today
    const events = autoProjects.value
      .filter((p) => p.nextFollowUp === dateStr || p.sop === dateStr)
      .map((p) => ({ id: p.id, label: p.partName || p.projectId, type: p.sop === dateStr ? 'sop' : 'follow' }))
    cells.push({ day: d, events, isToday })
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, events: [], isToday: false })
  return cells
})

const weekOffset = ref(0)
function weekPrev() {
  weekOffset.value--
}
function weekNext() {
  weekOffset.value++
}
function weekToday() {
  weekOffset.value = 0
}
const weekDates = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})
const weekRangeLabel = computed(() => {
  const d = weekDates.value
  return d.length ? `${d[0]} ~ ${d[6]}` : ''
})
const weekDaysData = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      isToday: dateStr === today,
      events: autoProjects.value
        .filter((p) => p.nextFollowUp === dateStr || p.sop === dateStr)
        .map((p) => ({
          id: p.id,
          label: p.partName || p.projectId,
          type: p.sop === dateStr ? 'sop' : 'follow',
          meta: p.owner
        }))
    }
  })
})

const napCalYear = ref(new Date().getFullYear())
const napCalMonth = ref(new Date().getMonth() + 1)
function napCalPrev() {
  if (napCalMonth.value === 1) {
    napCalMonth.value = 12
    napCalYear.value--
  } else napCalMonth.value--
}
function napCalNext() {
  if (napCalMonth.value === 12) {
    napCalMonth.value = 1
    napCalYear.value++
  } else napCalMonth.value++
}
function napCalToday() {
  const d = new Date()
  napCalYear.value = d.getFullYear()
  napCalMonth.value = d.getMonth() + 1
}

const napCalCells = computed(() => {
  const first = new Date(napCalYear.value, napCalMonth.value - 1, 1)
  const lastDay = new Date(napCalYear.value, napCalMonth.value, 0).getDate()
  const startDow = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push({ day: 0, events: [], isToday: false })
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${napCalYear.value}-${String(napCalMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === today
    const events = nonAutoProjects.value
      .filter((p) => p.nextFollowUp === dateStr)
      .map((p) => ({ id: p.id, label: p.customerName || p.projectId, type: 'follow' }))
    cells.push({ day: d, events, isToday })
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, events: [], isToday: false })
  return cells
})

const napWeekOffset = ref(0)
function napWeekPrev() {
  napWeekOffset.value--
}
function napWeekNext() {
  napWeekOffset.value++
}
function napWeekToday() {
  napWeekOffset.value = 0
}
const napWeekDates = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + napWeekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})
const napWeekRangeLabel = computed(() => {
  const d = napWeekDates.value
  return d.length ? `${d[0]} ~ ${d[6]}` : ''
})
const napWeekDaysData = computed(() => {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + napWeekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      isToday: dateStr === today,
      events: nonAutoProjects.value
        .filter((p) => p.nextFollowUp === dateStr)
        .map((p) => ({ id: p.id, label: p.customerName || p.projectId, type: 'follow', meta: p.owner }))
    }
  })
})

const stageChartRef = ref(null)
const trendChartRef = ref(null)
const customerChartRef = ref(null)
const ownerChartRef = ref(null)
const funnelChartRef = ref(null)
let charts = []

function destroyCharts() {
  charts.forEach((c) => c.destroy())
  charts = []
}

function initCharts() {
  destroyCharts()
  const textColor = '#94a3b8'
  const gridColor = 'rgba(148,163,184,0.1)'
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor } } },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } }
    }
  }

  if (stageChartRef.value) {
    const stageCounts = stages.map((s) => autoProjects.value.filter((p) => p.stage === s).length)
    charts.push(
      new Chart(stageChartRef.value, {
        type: 'bar',
        data: {
          labels: stages,
          datasets: [{ label: '汽车项目', data: stageCounts, backgroundColor: 'rgba(59,130,246,0.6)' }]
        },
        options: chartOpts
      })
    )
  }
  if (trendChartRef.value) {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - 5 + i)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const qtyData = months.map((m) =>
      nonAutoProjects.value
        .filter((p) => p.createdAt && p.createdAt.startsWith(m))
        .reduce((s, p) => s + (Number(p.monthlyOrderQty) || 0), 0)
    )
    charts.push(
      new Chart(trendChartRef.value, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: '月订单量',
              data: qtyData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: chartOpts
      })
    )
  }
  if (customerChartRef.value) {
    const custMap = {}
    autoProjects.value.forEach((p) => {
      custMap[p.customer] = (custMap[p.customer] || 0) + 1
    })
    const labels = Object.keys(custMap).slice(0, 8)
    const data = labels.map((l) => custMap[l])
    charts.push(
      new Chart(customerChartRef.value, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f43f5e', '#6366f1']
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
        }
      })
    )
  }
  if (ownerChartRef.value) {
    const ownerMap = {}
    ;[...autoProjects.value, ...nonAutoProjects.value].forEach((p) => {
      if (p.owner) ownerMap[p.owner] = (ownerMap[p.owner] || 0) + 1
    })
    const labels = Object.keys(ownerMap)
    const data = labels.map((l) => ownerMap[l])
    charts.push(
      new Chart(ownerChartRef.value, {
        type: 'bar',
        data: { labels, datasets: [{ label: '项目数', data, backgroundColor: 'rgba(34,197,94,0.6)' }] },
        options: { ...chartOpts, indexAxis: 'y' }
      })
    )
  }
  if (funnelChartRef.value) {
    const funnelData = stages.map(
      (s) => autoProjects.value.filter((p) => stages.indexOf(p.stage) >= stages.indexOf(s)).length
    )
    charts.push(
      new Chart(funnelChartRef.value, {
        type: 'bar',
        data: {
          labels: stages,
          datasets: [{ label: '累计项目数', data: funnelData, backgroundColor: 'rgba(168,85,247,0.6)' }]
        },
        options: chartOpts
      })
    )
  }
}

watch(activeTab, (v) => {
  if (v === 'stats') nextTick(() => initCharts())
})
function handleClickOutside(e) {
  if (!e.target.closest('.column-config-wrapper')) {
    showAutoColumnConfig.value = false
    showNapColumnConfig.value = false
  }
}
function handleResize() {
  showAutoColumnConfig.value = false
  showNapColumnConfig.value = false
}
function handleScroll() {
  showAutoColumnConfig.value = false
  showNapColumnConfig.value = false
}

onMounted(() => {
  if (activeTab.value === 'stats') nextTick(() => initCharts())
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<style scoped>
.project-tracking-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.page-header-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}
.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.tab-bar {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-6);
  flex-shrink: 0;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}
.tab-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}
.tab-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  font-weight: 600;
}
.tab-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-6);
  min-height: 0;
}
.stats-row {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex: 1;
  min-width: 140px;
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.stat-card:nth-child(1) {
  animation-delay: 0ms;
}
.stat-card:nth-child(2) {
  animation-delay: 60ms;
}
.stat-card:nth-child(3) {
  animation-delay: 120ms;
}
.stat-card:nth-child(4) {
  animation-delay: 180ms;
}
.stat-card:nth-child(5) {
  animation-delay: 240ms;
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
.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.stat-card:hover .stat-card-icon {
  transform: scale(1.1);
}
.stat-card-body {
  display: flex;
  flex-direction: column;
}
.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
  font-family: var(--font-mono);
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.quick-filters {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.quick-filter-tag {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border-light, var(--color-border));
  border-radius: 20px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.quick-filter-tag:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.quick-filter-tag.active {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-accent-hover, var(--color-accent));
  font-weight: 600;
}
.quick-filter-tag.clear {
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.qf-badge {
  background: var(--color-danger);
  color: #fff;
  border-radius: 10px;
  padding: 0 var(--space-2);
  font-size: 12px;
  min-width: 18px;
  text-align: center;
  line-height: 18px;
}
.filter-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
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
  z-index: var(--z-toast);
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
.view-switcher {
  display: flex;
  gap: var(--space-1);
  border-radius: var(--radius-md);
  padding: 0;
}
.view-btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  white-space: nowrap;
}
.view-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}
.view-btn.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
}
.panel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.panel-card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}
.panel-card-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.panel-card-body {
  padding: var(--space-4);
}
.panel-card-body.no-padding {
  padding: 0;
}
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
}
.data-table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.data-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.data-table td.wrap-cell {
  white-space: normal;
  word-break: break-all;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.data-table tr:hover td {
  background: var(--color-surface-hover);
  overflow-wrap: break-word;
  word-wrap: break-word;
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
.row-overdue td {
  background: var(--color-danger-subtle);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
@keyframes overduePulse {
  0%,
  100% {
    background: var(--color-danger-subtle);
  }
  50% {
    background: rgba(239, 68, 68, 0.08);
  }
}
.row-overdue td {
  animation: overduePulse 3s ease-in-out infinite;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.project-id {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}
.stage-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.stage-0 {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.stage-1 {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.stage-2 {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}
.stage-3 {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.stage-4 {
  background: var(--color-cyan-subtle);
  color: var(--color-info);
}
.stage-5 {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.stage-6 {
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-weight: 600;
}
.stage-7 {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.quote-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
}
.qs-未报价 {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.qs-报价中 {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.qs-已报价 {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.qs-落选 {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.mass-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
}
.ms-未量产 {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.ms-小批量 {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.ms-量产 {
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-weight: 600;
}
.payment-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
}
.ps-未回款 {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.ps-部分回款 {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.ps-已回款 {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.risk-level-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.rl-高 {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.rl-中 {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.rl-低 {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.risk-status-tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
}
.rs-未处理 {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.rs-处理中 {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.rs-已解决 {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.rs-已关闭 {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.overdue {
  color: var(--color-danger) !important;
}
.overdue-badge {
  background: var(--color-danger);
  color: #fff;
  padding: var(--space-1) var(--space-2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  animation: overdueBadgePulse 2s ease-in-out infinite;
}
@keyframes overdueBadgePulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
  }
}
.action-btns {
  display: flex;
  gap: var(--space-1);
}
.btn-danger-text {
  color: var(--color-danger) !important;
}
.empty-cell {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) !important;
}
.text-truncate {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.amount-cell {
  font-weight: 600;
  color: var(--color-success);
}
.content-grid {
  display: grid;
  gap: var(--space-4);
}
.content-grid-2-1 {
  grid-template-columns: 2fr 1fr;
}
.content-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.stat-overview-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
.stat-overview-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}
.stat-overview-value {
  font-weight: 600;
  color: var(--color-text-primary);
}
.risk-matrix {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: var(--space-1);
}
.rm-row {
  display: contents;
}
.rm-cell {
  padding: var(--space-3);
  text-align: center;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rm-high {
  background: var(--color-danger-subtle);
}
.rm-med {
  background: var(--color-warning-subtle);
}
.rm-low {
  background: var(--color-success-subtle);
}
.rm-has {
  box-shadow:
    inset 0 0 0 2px var(--color-accent),
    0 0 8px rgba(59, 130, 246, 0.15);
}
.rm-row-label {
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding-left: var(--space-2);
}
.rm-blank {
  grid-column: 1/-1;
  height: 4px;
}
.rm-col-label {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding-top: var(--space-1);
}
.list-item {
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
  background: var(--color-surface-hover);
  transform: translateX(2px);
}
.list-item-overdue {
  border-left: 3px solid var(--color-danger);
}
.list-item-main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.list-item-title {
  font-weight: 600;
  color: var(--color-text-primary);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.card-view-area {
  margin-bottom: var(--space-4);
}
.card-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.pt-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}
.pt-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
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
.pt-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.pt-card-overdue {
  border-left: 3px solid var(--color-danger);
}
.pt-card-header-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.pt-card-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
.pt-card-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}
.stage-progress-mini {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}
.spm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
}
.spm-dot.active {
  background: var(--color-accent);
  opacity: 0.5;
}
.spm-dot.current {
  background: var(--color-accent);
  opacity: 1;
  box-shadow: 0 0 4px var(--color-accent);
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%,
  100% {
    box-shadow: 0 0 4px var(--color-accent);
  }
  50% {
    box-shadow: 0 0 8px var(--color-accent);
  }
}
.pt-card-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-1) 0;
}
.pt-card-footer {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-header {
  padding: var(--space-2);
  text-align: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}
.cal-cell {
  min-height: 80px;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-top: none;
  transition: background 0.2s;
}
.cal-cell:hover {
  background: var(--color-surface-hover);
}
.cal-cell.today {
  background: var(--color-accent-subtle);
}
.cal-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.cal-cell.today .cal-date {
  color: var(--color-accent);
  font-weight: 700;
  animation: todayPulse 2s ease-in-out infinite;
}
@keyframes todayPulse {
  0%,
  100% {
    text-shadow: 0 0 0 transparent;
  }
  50% {
    text-shadow: 0 0 6px var(--color-accent);
  }
}
.cal-events {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.cal-event {
  font-size: 12px;
  padding: var(--space-1) var(--space-1);
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.cal-event:hover {
  transform: scale(1.02);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.evt-follow {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.evt-sop {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.cal-more {
  font-size: 11px;
  color: var(--color-text-tertiary);
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.week-header {
  padding: var(--space-2);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
}
.week-header span:first-child {
  display: block;
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.week-header-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.week-col {
  min-height: 120px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-top: none;
}
.week-col-today {
  background: var(--color-accent-subtle);
}
.week-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  padding-top: var(--space-4);
}
.week-event {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  cursor: pointer;
  transition: transform 0.15s;
}
.week-event:hover {
  transform: translateX(2px);
}
.week-event-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
}
.week-event-meta {
  font-size: 12px;
  opacity: 0.7;
}
.gantt-container {
  overflow-x: auto;
}
.gantt-header {
  display: flex;
  border-bottom: 2px solid var(--color-border);
}
.gantt-label-col {
  min-width: 180px;
  padding: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.gantt-bars-col {
  flex: 1;
}
.gantt-stages-header {
  display: flex;
}
.gantt-stage-col {
  flex: 1;
  padding: var(--space-2);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  border-left: 1px solid var(--color-border);
}
.gantt-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s;
}
.gantt-row:hover {
  background: var(--color-surface-hover);
}
.gantt-stages-row {
  display: flex;
}
.gantt-stage-cell {
  flex: 1;
  height: 32px;
  border-left: 1px solid var(--color-border);
}
.gantt-passed {
  background: var(--color-success-subtle);
}
.gantt-current {
  background: var(--color-accent-subtle);
  border: 2px solid var(--color-accent);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}
.gantt-future {
  background: transparent;
}
.gantt-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8);
}
.detail-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-dropdown);
  display: flex;
  justify-content: flex-end;
}
.detail-panel {
  width: 480px;
  max-width: 90vw;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.25s ease-out;
}
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.detail-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.detail-panel-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.detail-panel-body {
  padding: var(--space-4);
  flex: 1;
}
.stage-progress-full {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: var(--space-4);
}
.spf-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: 1;
}
.spf-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}
.spf-item.active .spf-dot {
  background: var(--color-accent);
  opacity: 0.5;
}
.spf-item.current .spf-dot {
  background: var(--color-accent);
  opacity: 1;
  box-shadow: 0 0 6px var(--color-accent);
  animation: dotPulse 2s ease-in-out infinite;
}
.spf-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.spf-item.active .spf-label {
  color: var(--color-text-secondary);
}
.spf-item.current .spf-label {
  color: var(--color-accent);
  font-weight: 600;
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
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
.detail-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}
.detail-section {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.detail-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.detail-pre {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  background: var(--color-bg-secondary);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-wide {
  max-width: 860px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.modal-close {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: var(--space-1);
}
.modal-close:hover {
  color: var(--color-text-primary);
}
.modal-body {
  padding: var(--space-4);
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}
.form-row {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.form-row-2 {
  grid-template-columns: 1fr 1fr;
}
.form-row-3 {
  grid-template-columns: 1fr 1fr 1fr;
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
.form-textarea {
  resize: vertical;
  min-height: 48px;
}
.op-log-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  align-items: center;
}
.op-log-time {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  min-width: 140px;
}
.op-log-action {
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.ola-add {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.ola-edit {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.ola-delete {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.ola-export {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}
.ola-import {
  background: var(--color-cyan-subtle);
  color: var(--color-info);
}
.ola-backup {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.ola-restore {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.ola-print {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.ola-batchDelete {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.ola-batchEdit {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.op-log-detail {
  color: var(--color-text-primary);
  flex: 1;
}
.inline-input {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
}
.inline-select {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
  cursor: pointer;
}
.cell-editable {
  cursor: pointer;
}
@media (max-width: 1024px) {
  .content-grid-2-1,
  .content-grid-3 {
    grid-template-columns: 1fr 1fr;
  }
  .stats-row {
    flex-wrap: wrap;
  }
  .stat-card {
    min-width: 140px;
  }
}
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }
  .page-header-actions {
    width: 100%;
  }
  .stats-row {
    flex-direction: column;
  }
  .stat-card {
    min-width: auto;
  }
  .filter-bar {
    flex-direction: column;
  }
  .view-switcher {
    margin-left: 0;
    width: 100%;
    overflow-x: auto;
  }
  .content-grid-2-1,
  .content-grid-3 {
    grid-template-columns: 1fr;
  }
  .form-row-2,
  .form-row-3 {
    grid-template-columns: 1fr;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .detail-panel {
    width: 100%;
  }
  .tab-bar {
    overflow-x: auto;
  }
  .cal-grid,
  .week-grid {
    font-size: 0.7rem;
  }
  .cal-cell {
    min-height: 50px;
  }
  .gantt-label-col {
    min-width: 100px;
  }
}
</style>
