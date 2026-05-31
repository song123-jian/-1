<template>
  <div class="customer-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">客户管理</h2>
        <p class="page-header-subtitle">全面的客户关系管理，支持多视图、高级筛选、联系人管理</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" @click="currentView = v.key">{{ v.icon }} {{ v.label }}</button>
        </div>
        <button class="btn btn-primary" @click="openAddModal">+ 新增客户</button>
        <button class="btn btn-outline" @click="handleDownloadTemplate">📄 模板下载</button>
        <button class="btn btn-outline" @click="handleBatchAdd">📋 批量增加</button>
        <button class="btn btn-outline" @click="handleExport">📥 导出Excel</button>
        <button class="btn btn-outline btn-danger" @click="handleBatchDelete" :disabled="selectedIds.length === 0">🗑 批量删除</button>
      </div>
    </div>

    <div class="customer-toolbar">
      <div class="customer-search-grid">
        <div class="search-field">
          <label class="search-field-label">客户编号</label>
          <input v-model="advFilterNo" type="text" class="search-input" placeholder="输入客户编号..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">客户名称</label>
          <input v-model="advFilterName" type="text" class="search-input" placeholder="输入客户名称..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">手机号码</label>
          <input v-model="advFilterPhone" type="text" class="search-input" placeholder="输入手机号..." />
        </div>
        <div class="search-field">
          <label class="search-field-label">核心关注点</label>
          <input v-model="advFilterConcerns" type="text" class="search-input" placeholder="输入关注点..." />
        </div>
        <button class="btn btn-ghost search-reset-btn" @click="advFilterNo = ''; advFilterName = ''; advFilterPhone = ''; advFilterConcerns = ''">重置</button>
      </div>
      <div class="customer-filters">
        <select v-model="filterLevel" class="form-select filter-select">
          <option value="all">全部等级</option>
          <option value="A">大客户</option>
          <option value="B">B类客户</option>
          <option value="C">C类客户</option>
        </select>
        <select v-model="filterDept" class="form-select filter-select">
          <option value="all">全部部门</option>
          <option v-for="d in customerStore.allDepartments" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filterRegion" class="form-select filter-select">
          <option value="all">全部区域</option>
          <option v-for="r in customerStore.allRegions" :key="r" :value="r">{{ r }}</option>
        </select>
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="dormant">休眠</option>
        </select>
        <select v-model="filterDecision" class="form-select filter-select">
          <option value="all">全部决策权限</option>
          <option value="决策者">决策者</option>
          <option value="影响者">影响者</option>
          <option value="使用者">使用者</option>
          <option value="推荐者">推荐者</option>
          <option value="把关者">把关者</option>
        </select>
        <select v-model="filterTag" class="form-select filter-select">
          <option value="all">全部标签</option>
          <option v-for="t in customerStore.tags" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="level">按等级</option>
          <option value="balance">按余额</option>
          <option value="creditLimit">按信用额度</option>
          <option value="createdAt">按创建时间</option>
          <option value="name">按名称</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">{{ sortDir === 'asc' ? '↑' : '↓' }}</button>
      </div>
    </div>

    <div class="customer-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span> 总计 {{ customerStore.customers.length }}</div>
      <div class="stat-item"><span class="stat-dot active"></span> 活跃 {{ customerStore.activeCount }}</div>
      <div class="stat-item"><span class="stat-dot dormant"></span> 休眠 {{ customerStore.dormantCount }}</div>
      <div class="stat-item level-stats">
        <span v-for="lvl in levelList" :key="lvl" class="level-stat" :class="'ls-' + lvl">{{ levelLabel(lvl) }} {{ customerStore.levelStats[lvl] }}</span>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <select class="form-select" style="width:120px;font-size:12px" v-model="batchLevel" @change="handleBatchLevel">
        <option value="">调整等级...</option>
        <option value="A">大客户</option>
        <option value="B">B类客户</option>
        <option value="C">C类客户</option>
      </select>
      <button class="btn btn-outline" @click="handleBatchTag">🏷 批量标签</button>
      <button class="btn btn-outline" @click="handleBatchExport">📥 导出选中</button>
      <button class="btn btn-outline" @click="selectedIds = []">取消选择</button>
    </div>

    <!-- 表格视图 -->
    <div v-if="currentView === 'table'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-toolbar">
          <div class="column-config-wrapper">
            <button class="btn btn-outline" @click="toggleColumnConfig">⚙ 列</button>
            <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
              <label v-for="col in columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions')" :key="col.key" class="column-config-item">
                <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
              </label>
            </div>
          </div>
        </div>
        <div class="table-container">
          <table class="customer-table">
            <thead>
              <tr>
                <th class="col-check"><div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">✓</div></th>
                <th v-if="columnVisible.no" class="col-no">编号</th>
                <th v-if="columnVisible.name" class="col-name">客户全称</th>
                <th v-if="columnVisible.contact" class="col-contact">姓名</th>
                <th v-if="columnVisible.position" class="col-position">职位</th>
                <th v-if="columnVisible.phone" class="col-phone">手机号码</th>
                <th v-if="columnVisible.level" class="col-level">等级</th>
                <th v-if="columnVisible.decision" class="col-decision">决策权限</th>
                <th v-if="columnVisible.concerns" class="col-concerns">核心关注点</th>
                <th v-if="columnVisible.status" class="col-status">状态</th>
                <th v-if="columnVisible.docs" class="col-docs">关联单据</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in paginatedCustomers" :key="c.id" :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8' }" class="row-with-border">
                <td class="col-check"><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">✓</div></td>
                <td v-if="columnVisible.no" class="col-no"><strong class="text-accent">{{ c.customerNo || '-' }}</strong></td>
                <td v-if="columnVisible.name" class="col-name cell-editable" @dblclick="startInlineEdit(c, 'fullName')">
                  <div v-if="!isInlineEditing(c.id, 'fullName')" class="name-cell">
                    <strong>{{ c.fullName || c.name }}</strong>
                    <div v-if="c.tags && c.tags.length > 0" class="tag-row">
                      <span v-for="tagId in c.tags" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
                    </div>
                  </div>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
                </td>
                <td v-if="columnVisible.contact" class="cell-editable" @dblclick="startInlineEdit(c, 'contactName')">
                  <span v-if="!isInlineEditing(c.id, 'contactName')">{{ c.contactName || c.contact || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
                </td>
                <td v-if="columnVisible.position" class="cell-editable" @dblclick="startInlineEdit(c, 'position')">
                  <span v-if="!isInlineEditing(c.id, 'position')">{{ c.position || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
                </td>
                <td v-if="columnVisible.phone" class="mono cell-editable" @dblclick="startInlineEdit(c, 'phone')">
                  <span v-if="!isInlineEditing(c.id, 'phone')">{{ c.phone || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
                </td>
                <td v-if="columnVisible.level" class="cell-editable" @dblclick="startInlineEdit(c, 'level')">
                  <span v-if="!isInlineEditing(c.id, 'level')" class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
                  <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                    <option value="A">大客户</option>
                    <option value="B">B类客户</option>
                    <option value="C">C类客户</option>
                  </select>
                </td>
                <td v-if="columnVisible.decision" class="cell-editable" @dblclick="startInlineEdit(c, 'decisionAuthority')">
                  <span v-if="!isInlineEditing(c.id, 'decisionAuthority')">{{ c.decisionAuthority || '-' }}</span>
                  <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                    <option v-for="opt in decisionOptions" :key="opt" :value="opt">{{ opt || '请选择' }}</option>
                  </select>
                </td>
                <td v-if="columnVisible.concerns" class="col-concerns cell-editable" @dblclick="startInlineEdit(c, 'coreConcerns')">
                  <span v-if="!isInlineEditing(c.id, 'coreConcerns')">{{ c.coreConcerns || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
                </td>
                <td v-if="columnVisible.status" class="cell-editable" @dblclick="startInlineEdit(c, 'status')">
                  <span v-if="!isInlineEditing(c.id, 'status')" class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
                  <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                    <option value="active">活跃</option>
                    <option value="dormant">休眠</option>
                  </select>
                </td>
                <td v-if="columnVisible.docs" class="col-docs">
                  <div class="docs-cell">
                    <span v-if="getCustomerDocCount(c) > 0" class="doc-badge" @click.stop="openDetailModal(c)">{{ getCustomerDocCount(c) }}份</span>
                    <span v-else class="doc-empty">-</span>
                  </div>
                </td>
                <td class="col-actions">
                  <button class="action-btn" @click="openEditModal(c)" title="编辑">✏️ 编辑</button>
                  <button class="action-btn" @click="openDetailModal(c)" title="详情" style="color:var(--color-purple)">👁 详情</button>
                  <button class="action-btn danger" @click="handleDelete(c)" title="删除">🗑 删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPages > 1" class="pagination-bar">
          <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
          <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
          <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
          <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
          <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
          <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredCustomers.length }} 条</span>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-if="currentView === 'list'" class="panel-card">
      <div class="panel-card-body">
        <div v-for="c in filteredCustomers" :key="c.id" class="list-item" :class="{ 'list-item-dormant': c.status === 'dormant' }" @click="openDetailModal(c)">
          <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">✓</div></div>
          <div class="list-item-avatar" :style="{ background: levelColors[c.level] || '#94a3b8' }">{{ (c.fullName || c.name || '?').charAt(0) }}</div>
          <div class="list-item-main">
            <div class="list-item-row1">
              <strong class="list-item-name">{{ c.fullName || c.name }}</strong>
              <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
              <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
              <span v-for="tagId in (c.tags || [])" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
            </div>
            <div class="list-item-row2">
              <span>{{ c.customerNo }}</span>
              <span v-if="c.contactName || c.contact">👤 {{ c.contactName || c.contact }}</span>
              <span v-if="c.department">🏢 {{ c.department }}</span>
              <span v-if="c.phone">📱 {{ c.phone }}</span>
              <span v-if="c.region">📍 {{ c.region }}</span>
              <span v-if="c.decisionAuthority">⚖ {{ c.decisionAuthority }}</span>
            </div>
            <div class="list-item-row3">
              <span class="mono">余额 ¥{{ formatNumber(c.balance) }}</span>
              <span class="mono">授信 ¥{{ formatNumber(c.creditLimit) }}</span>
              <span v-if="c.coreConcerns" class="text-muted">关注: {{ c.coreConcerns }}</span>
            </div>
          </div>
          <div class="list-item-actions" @click.stop>
            <button class="action-btn" @click="openEditModal(c)" title="编辑">✏️</button>
            <button class="action-btn danger" @click="handleDelete(c)" title="删除">🗑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-if="currentView === 'card'" class="customer-card-view">
      <div v-for="c in filteredCustomers" :key="c.id" class="customer-card" :class="{ 'dormant-card': c.status === 'dormant' }">
        <div class="card-prio-bar" :style="{ background: levelColors[c.level] || '#94a3b8' }"></div>
        <div class="card-header">
          <div class="card-avatar" :style="{ background: levelColors[c.level] || '#94a3b8' }">{{ (c.fullName || c.name || '?').charAt(0) }}</div>
          <div class="card-title-area">
            <div class="card-title">{{ c.fullName || c.name }}</div>
            <div class="card-sub">{{ c.customerNo }} · {{ c.department || '' }}</div>
          </div>
          <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
        </div>
        <div class="card-body">
          <div class="card-field"><span class="field-label">联系人</span><span>{{ c.contactName || c.contact || '-' }}</span></div>
          <div class="card-field"><span class="field-label">电话</span><span class="mono">{{ c.phone || '-' }}</span></div>
          <div class="card-field"><span class="field-label">区域</span><span>{{ c.region || '-' }}</span></div>
          <div class="card-field"><span class="field-label">余额</span><span class="mono">¥{{ formatNumber(c.balance) }}</span></div>
          <div class="card-field"><span class="field-label">信用额度</span><span class="mono">¥{{ formatNumber(c.creditLimit) }}</span></div>
          <div v-if="c.tags && c.tags.length > 0" class="card-tags">
            <span v-for="tagId in c.tags" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
          <div class="card-actions">
            <button class="action-btn" @click="openEditModal(c)">✏️</button>
            <button class="action-btn" @click="openDetailModal(c)">👁</button>
            <button class="action-btn danger" @click="handleDelete(c)">🗑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-if="currentView === 'calendar'" class="panel-card">
      <div class="panel-card-header" style="justify-content:space-between">
        <span class="panel-card-title">📅 客户日历</span>
        <div class="cal-nav">
          <button class="dp-nav-btn" @click="calPrevYear">«</button>
          <button class="dp-nav-btn" @click="calPrevMonth">◀</button>
          <button class="dp-today-btn" @click="calGoToday">今天</button>
          <button class="dp-nav-btn" @click="calNextMonth">▶</button>
          <button class="dp-nav-btn" @click="calNextYear">»</button>
          <span class="cal-range-label">{{ calYear }}年{{ calMonth }}月</span>
        </div>
      </div>
      <div class="panel-card-body">
        <div class="cal-weekdays">
          <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="cal-weekday">{{ d }}</div>
        </div>
        <div class="cal-days">
          <div
            v-for="day in calDays"
            :key="day.key"
            class="cal-day"
            :class="{ 'other-month': !day.currentMonth, today: day.isToday, selected: day.date === calSelectedDate }"
            @click="calSelectDate(day.date)"
          >
            <div class="cal-day-num">{{ day.day }}</div>
            <div class="cal-day-items">
              <div
                v-for="c in day.customers.slice(0, 3)"
                :key="c.id"
                class="cal-customer-dot"
                :style="{ background: levelColors[c.level] || '#94a3b8' }"
                :title="c.fullName || c.name"
                @click.stop="openDetailModal(c)"
              ></div>
              <span v-if="day.customers.length > 3" class="cal-more">+{{ day.customers.length - 3 }}</span>
            </div>
          </div>
        </div>
        <div v-if="calSelectedCustomers.length > 0" class="cal-selected-detail">
          <div class="cal-detail-header">
            <span>{{ calSelectedDate }} 创建的客户 ({{ calSelectedCustomers.length }})</span>
          </div>
          <div class="cal-detail-list">
            <div v-for="c in calSelectedCustomers" :key="c.id" class="cal-detail-item" @click="openDetailModal(c)">
              <div class="cal-detail-avatar" :style="{ background: levelColors[c.level] || '#94a3b8' }">{{ (c.fullName || c.name || '?').charAt(0) }}</div>
              <div class="cal-detail-info">
                <div class="cal-detail-name">{{ c.fullName || c.name }}</div>
                <div class="cal-detail-sub">{{ c.customerNo }} · {{ c.region || '-' }} · {{ c.contactName || c.contact || '-' }}</div>
              </div>
              <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
              <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 周视图 -->
    <div v-if="currentView === 'week'" class="panel-card">
      <div class="panel-card-header" style="justify-content:space-between">
        <span class="panel-card-title">🗓 客户周视图</span>
        <div class="cal-nav">
          <button class="dp-nav-btn" @click="custWeekPrev">◀ 上一周</button>
          <button class="dp-today-btn" @click="custWeekGoToday">本周</button>
          <button class="dp-nav-btn" @click="custWeekNext">下一周 ▶</button>
          <span class="cal-range-label">{{ custWeekRangeLabel }}</span>
        </div>
      </div>
      <div class="panel-card-body">
        <div class="cust-week-grid">
          <div
            v-for="day in custWeekDays"
            :key="day.date"
            class="cust-week-col"
            :class="{ today: day.isToday }"
          >
            <div class="cust-week-header">
              <div class="cust-week-name">{{ day.weekday }}</div>
              <div class="cust-week-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
              <div class="cust-week-date-label">{{ day.date.slice(5) }}</div>
            </div>
            <div class="cust-week-customers">
              <div
                v-for="c in day.customers"
                :key="c.id"
                class="cust-week-card"
                :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8' }"
                @click="openDetailModal(c)"
              >
                <div class="cust-week-card-top">
                  <span class="cust-week-card-name">{{ c.fullName || c.name }}</span>
                  <span class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
                </div>
                <div class="cust-week-card-info">
                  <span v-if="c.contactName || c.contact">👤 {{ c.contactName || c.contact }}</span>
                  <span v-if="c.region">📍 {{ c.region }}</span>
                </div>
                <div class="cust-week-card-bottom">
                  <span class="mono">¥{{ formatNumber(c.balance) }}</span>
                  <span class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
                </div>
              </div>
              <div v-if="day.customers.length === 0" class="cust-week-empty">无客户</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredCustomers.length === 0" class="empty-state">
      <div class="empty-icon">🏢</div>
      <div class="empty-text">暂无匹配的客户数据</div>
      <div class="empty-sub">尝试调整筛选条件或添加新客户</div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingCustomer ? '编辑客户' : '新增客户' }}</h3>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="!editingCustomer" class="smart-recognize-panel" :class="{ expanded: showSmartRec }">
              <div class="smart-recognize-header" @click="showSmartRec = !showSmartRec">
                <div class="sr-header-left"><span class="sr-icon">🧠</span> 智能识别 <span class="sr-badge sr-badge-success">AI</span></div>
                <span class="sr-toggle">{{ showSmartRec ? '收起 ▲' : '展开 ▼' }}</span>
              </div>
              <div v-if="showSmartRec" class="smart-recognize-body">
                <textarea v-model="smartRecInput" class="form-textarea" rows="3" placeholder="粘贴客户信息文本（名片、邮件等），AI将自动识别并提取关键字段..."></textarea>
                <div class="sr-actions">
                  <label class="btn btn-ghost btn-sm">
                    📎 上传文件
                    <input type="file" accept=".txt,.csv,.json" style="display:none" @change="handleSmartFileUpload" />
                  </label>
                  <button class="btn btn-ghost btn-sm" @click="smartRecInput = ''; smartRecResult = null">清空</button>
                  <button class="btn btn-primary btn-sm" @click="runSmartRecognize">🔍 开始识别</button>
                </div>
                <div v-if="smartRecResult" class="sr-result-panel">
                  <div class="sr-result-header" :class="{ 'has-warnings': smartRecResult.lowConfCount > 0 }">
                    ✓ 已识别 <strong>{{ smartRecResult.identifiedCount }}</strong> 个字段
                    <span v-if="smartRecResult.lowConfCount > 0" class="sr-badge sr-badge-warning">{{ smartRecResult.lowConfCount }}项需确认</span>
                    <span v-else class="sr-badge sr-badge-success">全部可信</span>
                  </div>
                  <div class="sr-result-body">
                    <div v-for="item in smartRecResult.items" :key="item.key" class="sr-result-item">
                      <span class="sr-result-label">{{ item.label }}</span>
                      <input class="sr-result-input" v-model="item.value" />
                      <span class="sr-result-confidence" :class="item.confLevel">{{ item.confLabel }} {{ item.confidence }}%</span>
                    </div>
                  </div>
                  <div v-if="smartRecResult.identifiedCount === 0" class="sr-empty-tip">未能识别出有效客户信息，请检查输入内容格式</div>
                  <div v-if="smartRecResult.identifiedCount > 0" class="sr-result-actions">
                    <button class="btn btn-ghost btn-sm" @click="runSmartRecognize">重新识别</button>
                    <button class="btn btn-primary btn-sm" @click="applySmartRecognize">✓ 确认填入</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>客户编号</label>
                <input v-model="form.customerNo" type="text" class="form-input" :readonly="!!editingCustomer" :style="editingCustomer ? 'opacity:0.7;cursor:not-allowed' : ''" />
              </div>
              <div class="form-group">
                <label>客户全称</label>
                <input v-model="form.fullName" type="text" class="form-input" placeholder="公司全称（选填）" />
              </div>
              <div class="form-group">
                <label>姓名</label>
                <input v-model="form.contactName" type="text" class="form-input" placeholder="联系人姓名（选填）" />
              </div>
              <div class="form-group">
                <label>部门</label>
                <select v-model="form.department" class="form-select" @change="handleDeptChange">
                  <option value="">请选择部门</option>
                  <option v-for="d in customerStore.allDepartments" :key="d" :value="d">{{ d }}</option>
                  <option value="__new__">+ 新建部门...</option>
                </select>
              </div>
              <div class="form-group">
                <label>职位</label>
                <input v-model="form.position" type="text" class="form-input" placeholder="职位（选填）" />
              </div>
              <div class="form-group">
                <label>手机号码</label>
                <input v-model="form.phone" type="tel" class="form-input" placeholder="手机号码（选填）" maxlength="11" @input="form.phone = form.phone.replace(/[^0-9]/g, '')" />
              </div>
              <div class="form-group">
                <label>客户等级</label>
                <select v-model="form.level" class="form-select">
                  <option value="A">大客户</option>
                  <option value="B">B类客户</option>
                  <option value="C">C类客户</option>
                </select>
              </div>
              <div class="form-group">
                <label>决策权限</label>
                <select v-model="form.decisionAuthority" class="form-select">
                  <option value="">请选择</option>
                  <option value="决策者">决策者</option>
                  <option value="影响者">影响者</option>
                  <option value="使用者">使用者</option>
                  <option value="推荐者">推荐者</option>
                  <option value="把关者">把关者</option>
                </select>
              </div>
              <div class="form-group">
                <label>邮箱</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="邮箱地址" />
              </div>
              <div class="form-group full-width">
                <label>核心关注点</label>
                <textarea v-model="form.coreConcerns" class="form-textarea" rows="2" placeholder="如：交货速度、产品质量（选填）"></textarea>
              </div>
              <div class="form-group">
                <label>地区</label>
                <input v-model="form.region" type="text" class="form-input" placeholder="如：华东、华北" />
              </div>
              <div class="form-group">
                <label>信用额度</label>
                <input v-model.number="form.creditLimit" type="number" step="0.01" min="0" class="form-input" placeholder="0" @input="form.creditLimit = String(form.creditLimit).replace(/[^0-9.]/g, '')" />
              </div>
              <div class="form-group full-width">
                <label>地址</label>
                <textarea v-model="form.address" class="form-textarea" rows="2" placeholder="详细地址"></textarea>
              </div>
              <div class="form-group full-width">
                <label>标签</label>
                <div class="tag-selector">
                  <span v-for="tag in customerStore.tags" :key="tag.id"
                    class="tag-option"
                    :class="{ selected: form.tags.includes(tag.id) }"
                    :style="form.tags.includes(tag.id) ? { background: tag.color + '20', color: tag.color, borderColor: tag.color } : {}"
                    @click="toggleFormTag(tag.id)"
                  >{{ tag.name }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModal">取消</button>
            <button class="btn btn-primary" @click="saveCustomer">{{ editingCustomer ? '保存修改' : '新增客户' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 360°全景详情弹窗 -->
    <Teleport to="body">
      <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
        <div class="modal-dialog modal-xl">
          <div class="modal-header">
            <h3>客户360°全景 - {{ detailCustomer?.fullName || detailCustomer?.name }}</h3>
            <button class="modal-close" @click="showDetail = false">✕</button>
          </div>
          <div class="modal-body" v-if="detailCustomer">
            <div class="detail-top-bar">
              <div class="detail-avatar-lg" :style="{ background: levelColors[detailCustomer.level] || '#94a3b8' }">{{ (detailCustomer.fullName || detailCustomer.name || '?').charAt(0) }}</div>
              <div class="detail-top-info">
                <div class="detail-name">{{ detailCustomer.fullName || detailCustomer.name }}</div>
                <div class="detail-top-badges">
                  <span class="level-badge" :class="'level-' + detailCustomer.level">{{ levelLabel(detailCustomer.level) }}</span>
                  <span class="status-badge" :class="'status-' + detailCustomer.status">{{ detailCustomer.status === 'active' ? '活跃' : '休眠' }}</span>
                  <span v-for="tagId in (detailCustomer.tags || [])" :key="tagId" class="mini-tag" :style="getTagStyle(tagId)">{{ getTagName(tagId) }}</span>
                </div>
                <div class="detail-top-meta">{{ detailCustomer.customerNo }} · {{ detailCustomer.region || '未知区域' }} · {{ detailCustomer.contactName || detailCustomer.contact || '未指定联系人' }}</div>
              </div>
              <div class="detail-top-kpis">
                <div class="kpi-card">
                  <div class="kpi-label">余额</div>
                  <div class="kpi-value mono">¥{{ formatNumber(detailCustomer.balance) }}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">授信额度</div>
                  <div class="kpi-value mono">¥{{ formatNumber(detailCustomer.creditLimit) }}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">信用利用率</div>
                  <div class="kpi-value mono" :class="creditUtilization > 80 ? 'text-danger' : creditUtilization > 50 ? 'text-warning' : 'text-success'">{{ creditUtilization }}%</div>
                </div>
              </div>
            </div>

            <div class="detail-tabs">
              <button v-for="tab in detailTabs" :key="tab.key" class="detail-tab-btn" :class="{ active: activeDetailTab === tab.key }" @click="activeDetailTab = tab.key">{{ tab.icon }} {{ tab.label }}</button>
            </div>

            <!-- 基本信息 Tab -->
            <div v-if="activeDetailTab === 'basic'" class="detail-tab-content">
              <div class="detail-grid-2col">
                <div class="detail-section">
                  <div class="detail-section-title">📋 联系信息</div>
                  <div class="detail-fields">
                    <div class="detail-field"><span class="df-label">客户编号</span><span class="mono">{{ detailCustomer.customerNo || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">联系人</span><span>{{ detailCustomer.contactName || detailCustomer.contact || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">部门</span><span>{{ detailCustomer.department || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">职位</span><span>{{ detailCustomer.position || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">手机</span><span class="mono">{{ detailCustomer.phone || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">邮箱</span><span>{{ detailCustomer.email || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">地址</span><span>{{ detailCustomer.address || '-' }}</span></div>
                  </div>
                </div>
                <div class="detail-section">
                  <div class="detail-section-title">💼 商业信息</div>
                  <div class="detail-fields">
                    <div class="detail-field"><span class="df-label">决策权限</span><span>{{ detailCustomer.decisionAuthority || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">核心关注点</span><span>{{ detailCustomer.coreConcerns || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">区域</span><span>{{ detailCustomer.region || '-' }}</span></div>
                    <div class="detail-field"><span class="df-label">信用额度</span><span class="mono">¥{{ formatNumber(detailCustomer.creditLimit) }}</span></div>
                    <div class="detail-field"><span class="df-label">创建时间</span><span>{{ detailCustomer.createdAt || '-' }}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 交易概览 Tab -->
            <div v-if="activeDetailTab === 'trade'" class="detail-tab-content">
              <div class="trade-summary">
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono">¥{{ formatNumber(customerTradeStats.totalQuotationAmount) }}</div>
                  <div class="trade-kpi-label">报价总额</div>
                </div>
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono">{{ customerTradeStats.quotationCount }}</div>
                  <div class="trade-kpi-label">报价次数</div>
                </div>
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono">¥{{ formatNumber(customerTradeStats.totalCollectionAmount) }}</div>
                  <div class="trade-kpi-label">回款总额</div>
                </div>
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono">{{ customerTradeStats.collectionCount }}</div>
                  <div class="trade-kpi-label">回款次数</div>
                </div>
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono" :class="customerTradeStats.avgProfitMargin > 15 ? 'text-success' : 'text-warning'">{{ customerTradeStats.avgProfitMargin }}%</div>
                  <div class="trade-kpi-label">平均利润率</div>
                </div>
                <div class="trade-kpi">
                  <div class="trade-kpi-value mono" :class="customerTradeStats.collectionRate >= 80 ? 'text-success' : customerTradeStats.collectionRate >= 50 ? 'text-warning' : 'text-danger'">{{ customerTradeStats.collectionRate }}%</div>
                  <div class="trade-kpi-label">回款率</div>
                </div>
              </div>

              <div class="detail-section" style="margin-top:var(--space-4)">
                <div class="detail-section-title">📊 报价记录</div>
                <table v-if="customerQuotations.length > 0" class="detail-table">
                  <thead>
                    <tr><th>报价单号</th><th>日期</th><th>金额</th><th>利润率</th><th>状态</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="q in customerQuotations" :key="q.id">
                      <td class="mono">{{ q.quoteNo }}</td>
                      <td>{{ q.date }}</td>
                      <td class="mono">¥{{ formatNumber(q.total) }}</td>
                      <td class="mono">{{ q.profitMargin }}%</td>
                      <td><span class="status-badge" :class="quoteStatusClass(q.status)">{{ quoteStatusLabel(q.status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="detail-empty">暂无报价记录</div>
              </div>

              <div class="detail-section" style="margin-top:var(--space-4)">
                <div class="detail-section-title">💰 回款记录</div>
                <table v-if="customerCollections.length > 0" class="detail-table">
                  <thead>
                    <tr><th>回款单号</th><th>日期</th><th>金额</th><th>方式</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="col in customerCollections" :key="col.id">
                      <td class="mono">{{ col.collectionNo }}</td>
                      <td>{{ col.date }}</td>
                      <td class="mono">¥{{ formatNumber(col.amount) }}</td>
                      <td>{{ collectionMethodLabel(col.method) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="detail-empty">暂无回款记录</div>
              </div>

              <div class="detail-section" style="margin-top:var(--space-4)">
                <div class="detail-section-title">📄 合同记录</div>
                <table v-if="customerContracts.length > 0" class="detail-table">
                  <thead>
                    <tr><th>合同编号</th><th>金额</th><th>有效期</th><th>状态</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="ct in customerContracts" :key="ct.id">
                      <td class="mono">{{ ct.contractNo }}</td>
                      <td class="mono">¥{{ formatNumber(ct.amount) }}</td>
                      <td>{{ ct.startDate }} ~ {{ ct.endDate }}</td>
                      <td><span class="status-badge" :class="contractStatusClass(ct.status)">{{ contractStatusLabel(ct.status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="detail-empty">暂无合同记录</div>
              </div>
            </div>

            <!-- 标签管理 Tab -->
            <div v-if="activeDetailTab === 'tags'" class="detail-tab-content">
              <div class="detail-section">
                <div class="detail-section-title">🏷 当前标签</div>
                <div class="detail-tags-area" v-if="(detailCustomer.tags || []).length > 0">
                  <span v-for="tagId in (detailCustomer.tags || [])" :key="tagId" class="detail-tag" :style="getTagStyle(tagId)">
                    {{ getTagName(tagId) }}
                    <span class="tag-remove" @click="removeTag(tagId)">✕</span>
                  </span>
                </div>
                <div v-else class="detail-empty">暂无标签</div>
              </div>
              <div class="detail-section" style="margin-top:var(--space-4)">
                <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
                  <span>➕ 添加标签</span>
                  <button class="btn btn-ghost btn-sm" @click="showInlineTagCreate = true">➕ 新建标签</button>
                </div>
                <div v-if="!showInlineTagCreate">
                  <div v-for="group in availableTagsByGroup" :key="group.name" style="margin-bottom:var(--space-3)">
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1)">{{ group.name }}</div>
                    <div class="detail-tags-available">
                      <span v-for="tag in group.tags" :key="tag.id" class="tag-add-btn" :style="{ borderColor: tag.color, color: tag.color }" @click="addTag(tag.id)">+ {{ tag.name }}</span>
                    </div>
                  </div>
                  <div v-if="availableTags.length === 0" class="detail-empty">所有标签已添加</div>
                </div>
                <div v-else class="inline-tag-create">
                  <div class="form-row form-row-2" style="gap:var(--space-2)">
                    <div class="form-group" style="margin:0">
                      <input v-model="inlineTagForm.name" type="text" class="form-input" placeholder="标签名称" style="font-size:var(--font-size-xs)" />
                    </div>
                    <div class="form-group" style="margin:0">
                      <select v-model="inlineTagForm.group" class="form-select" style="font-size:var(--font-size-xs)">
                        <option v-for="g in detailTagGroups" :key="g" :value="g">{{ g }}</option>
                      </select>
                    </div>
                  </div>
                  <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);align-items:center">
                    <div class="color-picker-row">
                      <span v-for="c in inlinePresetColors" :key="c" class="color-dot-sm" :class="{ active: inlineTagForm.color === c }" :style="{ background: c }" @click="inlineTagForm.color = c"></span>
                    </div>
                    <button class="btn btn-primary btn-sm" @click="createInlineTag" :disabled="!inlineTagForm.name.trim()">创建并添加</button>
                    <button class="btn btn-ghost btn-sm" @click="showInlineTagCreate = false">取消</button>
                  </div>
                </div>
              </div>
              <div class="detail-section" style="margin-top:var(--space-4)">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span class="detail-section-title">📋 标签库管理</span>
                  <router-link to="/tag-category" class="btn btn-ghost btn-sm">前往标签分类 →</router-link>
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)">在标签分类页面可编辑、删除标签及管理分组</div>
              </div>
            </div>

            <!-- 互动时间线 Tab -->
            <div v-if="activeDetailTab === 'timeline'" class="detail-tab-content">
              <div class="timeline">
                <div v-for="(evt, idx) in customerTimeline" :key="idx" class="timeline-item">
                  <div class="timeline-dot" :class="evt.dotClass"></div>
                  <div class="timeline-content">
                    <div class="timeline-date">{{ evt.date }}</div>
                    <div class="timeline-text">{{ evt.text }}</div>
                  </div>
                </div>
                <div v-if="customerTimeline.length === 0" class="detail-empty">暂无互动记录</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDetail = false">关闭</button>
            <button class="btn btn-primary" @click="openEditModal(detailCustomer); showDetail = false">编辑客户</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px">⚠️</div>
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmAction">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 批量标签弹窗 -->
    <Teleport to="body">
      <div v-if="showBatchTagModal" class="modal-overlay" @click.self="showBatchTagModal = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <h3>🏷️ 批量添加标签</h3>
            <button class="modal-close" @click="showBatchTagModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text-secondary)">
              已选 <strong>{{ selectedIds.length }}</strong> 位客户，请选择要添加的标签：
            </div>
            <div class="batch-tag-list">
              <span v-for="tag in customerStore.tags" :key="tag.id"
                class="batch-tag-option"
                :class="{ selected: batchSelectedTags.includes(tag.id) }"
                :style="batchSelectedTags.includes(tag.id) ? { background: tag.color + '20', color: tag.color, borderColor: tag.color } : {}"
                @click="toggleBatchTag(tag.id)"
              >{{ tag.name }}</span>
            </div>
            <div v-if="customerStore.tags.length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);text-align:center;padding:var(--space-4)">
              暂无可用标签，请先在标签分类中创建
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showBatchTagModal = false">取消</button>
            <button class="btn btn-primary" @click="applyBatchTags" :disabled="batchSelectedTags.length === 0">确认添加 ({{ batchSelectedTags.length }})</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { useDataStore } from '@/stores/data'
import { useQuotationStore } from '@/stores/quotation'

const customerStore = useCustomerStore()
const dataStore = useDataStore()
const quotationStore = useQuotationStore()

const currentView = ref('table')
const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
const columnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'no', label: '编号' },
  { key: 'name', label: '客户全称' },
  { key: 'contact', label: '姓名' },
  { key: 'position', label: '职位' },
  { key: 'phone', label: '手机号码' },
  { key: 'level', label: '等级' },
  { key: 'decision', label: '决策权限' },
  { key: 'concerns', label: '核心关注点' },
  { key: 'status', label: '状态' },
  { key: 'docs', label: '关联单据' },
  { key: 'actions', label: '操作', hideable: false }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions').map(c => [c.key, true])))
const visibleColCount = computed(() => columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions' && columnVisible.value[c.key]).length)

function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = {
      top: rect.bottom + 8 + 'px',
      left: rect.left + 'px'
    }
  }
}

const advFilterNo = ref('')
const advFilterName = ref('')
const advFilterPhone = ref('')
const advFilterConcerns = ref('')
const filterLevel = ref('all')
const filterDept = ref('all')
const filterRegion = ref('all')
const filterStatus = ref('all')
const filterDecision = ref('all')
const filterTag = ref('all')
const sortField = ref('level')
const sortDir = ref('asc')
const showSmartRec = ref(false)
const smartRecInput = ref('')
const smartRecResult = ref(null)
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = 15
const showModal = ref(false)
const showDetail = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const editingCustomer = ref(null)
const detailCustomer = ref(null)
const batchLevel = ref('')
const activeDetailTab = ref('basic')
const inlineEdit = ref({ id: null, field: null, value: '' })
const showBatchTagModal = ref(false)
const batchSelectedTags = ref([])
const showInlineTagCreate = ref(false)
const inlineTagForm = reactive({ name: '', color: '#3b82f6', group: '关系' })
const inlinePresetColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#94a3b8']

const levelColors = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' }
const levelList = ['A', 'B', 'C']
const levelLabelMap = { A: '大客户', B: 'B类客户', C: 'C类客户' }
function levelLabel(lvl) { return levelLabelMap[lvl] || lvl }

const viewModes = [
  { key: 'table', icon: '📊', label: '表格' },
  { key: 'list', icon: '📋', label: '列表' },
  { key: 'card', icon: '🗂', label: '卡片' },
  { key: 'calendar', icon: '📅', label: '日历' },
  { key: 'week', icon: '🗓', label: '周视图' }
]

const detailTabs = [
  { key: 'basic', icon: '📋', label: '基本信息' },
  { key: 'trade', icon: '💰', label: '交易概览' },
  { key: 'tags', icon: '🏷', label: '标签管理' },
  { key: 'timeline', icon: '📅', label: '互动时间线' }
]

const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth() + 1)
const calSelectedDate = ref(new Date().toISOString().slice(0, 10))
const custWeekOffset = ref(0)

const calWeekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const calDays = computed(() => {
  const year = calYear.value
  const month = calMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const result = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    const date = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({
      key: date, day, currentMonth: false, isToday: date === today, date,
      customers: filteredCustomers.value.filter(c => c.createdAt === date)
    })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: true, isToday: date === today, date,
      customers: filteredCustomers.value.filter(c => c.createdAt === date)
    })
  }

  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const date = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: false, isToday: date === today, date,
      customers: filteredCustomers.value.filter(c => c.createdAt === date)
    })
  }

  return result
})

const calSelectedCustomers = computed(() => {
  return filteredCustomers.value.filter(c => c.createdAt === calSelectedDate.value)
})

const custWeekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + custWeekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayCustomers = filteredCustomers.value.filter(c => c.createdAt === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: calWeekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      customers: dayCustomers
    })
  }
  return result
})

const custWeekRangeLabel = computed(() => {
  if (custWeekDays.value.length === 0) return ''
  const first = custWeekDays.value[0]
  const last = custWeekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function calPrevYear() { calYear.value-- }
function calNextYear() { calYear.value++ }
function calPrevMonth() {
  if (calMonth.value === 1) { calMonth.value = 12; calYear.value-- }
  else calMonth.value--
}
function calNextMonth() {
  if (calMonth.value === 12) { calMonth.value = 1; calYear.value++ }
  else calMonth.value++
}
function calGoToday() {
  const now = new Date()
  calYear.value = now.getFullYear()
  calMonth.value = now.getMonth() + 1
  calSelectedDate.value = now.toISOString().slice(0, 10)
}
function calSelectDate(date) { calSelectedDate.value = date }
function custWeekPrev() { custWeekOffset.value-- }
function custWeekNext() { custWeekOffset.value++ }
function custWeekGoToday() { custWeekOffset.value = 0 }

const defaultForm = () => ({
  customerNo: '', fullName: '', shortName: '', contactName: '', phone: '',
  email: '', department: '', position: '', region: '',
  level: 'B', decisionAuthority: '', coreConcerns: '',
  creditLimit: 0, status: 'active', tags: [], address: ''
})

const form = reactive(defaultForm())

const filteredCustomers = computed(() => {
  let list = [...customerStore.customers]
  if (advFilterNo.value) list = list.filter(c => (c.customerNo || '').includes(advFilterNo.value))
  if (advFilterName.value) list = list.filter(c => (c.fullName || c.name || '').includes(advFilterName.value))
  if (advFilterPhone.value) list = list.filter(c => (c.phone || '').includes(advFilterPhone.value))
  if (advFilterConcerns.value) list = list.filter(c => (c.coreConcerns || '').includes(advFilterConcerns.value))
  if (filterLevel.value !== 'all') list = list.filter(c => c.level === filterLevel.value)
  if (filterDept.value !== 'all') list = list.filter(c => c.department === filterDept.value)
  if (filterRegion.value !== 'all') list = list.filter(c => c.region === filterRegion.value)
  if (filterStatus.value !== 'all') list = list.filter(c => c.status === filterStatus.value)
  if (filterDecision.value !== 'all') list = list.filter(c => c.decisionAuthority === filterDecision.value)
  if (filterTag.value !== 'all') list = list.filter(c => c.tags && c.tags.includes(filterTag.value))

  const levelOrder = { A: 0, B: 1, C: 2 }
  list.sort((a, b) => {
    let va, vb
    switch (sortField.value) {
      case 'level': va = levelOrder[a.level] ?? 4; vb = levelOrder[b.level] ?? 4; break
      case 'balance': va = a.balance || 0; vb = b.balance || 0; break
      case 'creditLimit': va = a.creditLimit || 0; vb = b.creditLimit || 0; break
      case 'createdAt': va = a.createdAt || ''; vb = b.createdAt || ''; break
      case 'name': va = (a.fullName || a.name || '').toLowerCase(); vb = (b.fullName || b.name || '').toLowerCase(); break
      default: va = levelOrder[a.level] ?? 4; vb = levelOrder[b.level] ?? 4
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / pageSize)))
const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredCustomers.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const pages = []
  const sp = Math.max(1, currentPage.value - 2)
  const ep = Math.min(totalPages.value, currentPage.value + 2)
  for (let p = sp; p <= ep; p++) pages.push(p)
  return pages
})

const isAllSelected = computed(() =>
  paginatedCustomers.value.length > 0 && paginatedCustomers.value.every(c => selectedIds.value.includes(c.id))
)

const availableTags = computed(() => {
  if (!detailCustomer.value) return []
  return customerStore.tags.filter(t => !(detailCustomer.value.tags || []).includes(t.id))
})

const availableTagsByGroup = computed(() => {
  const tags = availableTags.value
  const groups = [...new Set(tags.map(t => t.group || '其他'))].sort()
  return groups.map(name => ({
    name,
    tags: tags.filter(t => (t.group || '其他') === name)
  }))
})

const detailTagGroups = computed(() => {
  const groups = new Set()
  customerStore.tags.forEach(t => { if (t.group) groups.add(t.group) })
  return [...groups].sort()
})

function createInlineTag() {
  const name = inlineTagForm.name.trim()
  if (!name) return
  const id = name
  if (customerStore.tags.some(t => t.id === id)) {
    addTag(id)
    showInlineTagCreate.value = false
    return
  }
  customerStore.addTag({ id, name, color: inlineTagForm.color, group: inlineTagForm.group })
  addTag(id)
  showInlineTagCreate.value = false
  inlineTagForm.name = ''
  inlineTagForm.color = '#3b82f6'
}

const creditUtilization = computed(() => {
  if (!detailCustomer.value) return 0
  const limit = detailCustomer.value.creditLimit || 0
  if (limit === 0) return 0
  return Math.round(((detailCustomer.value.balance || 0) / limit) * 100)
})

const customerQuotations = computed(() => {
  if (!detailCustomer.value) return []
  const cid = detailCustomer.value.id
  const cname = detailCustomer.value.fullName || detailCustomer.value.name || ''
  return quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname)
})

const customerCollections = computed(() => {
  if (!detailCustomer.value) return []
  const cid = detailCustomer.value.id
  const cname = detailCustomer.value.fullName || detailCustomer.value.name || ''
  return dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname)
})

const customerContracts = computed(() => {
  if (!detailCustomer.value) return []
  const cid = detailCustomer.value.id
  const cname = detailCustomer.value.fullName || detailCustomer.value.name || ''
  return dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname)
})

const customerTradeStats = computed(() => {
  const quotes = customerQuotations.value
  const cols = customerCollections.value
  const totalQuotationAmount = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const totalCollectionAmount = cols.reduce((s, c) => s + (c.amount || 0), 0)
  const profitMargins = quotes.filter(q => q.profitMargin).map(q => q.profitMargin)
  const avgProfitMargin = profitMargins.length > 0 ? Math.round(profitMargins.reduce((s, m) => s + m, 0) / profitMargins.length * 10) / 10 : 0
  const collectionRate = totalQuotationAmount > 0 ? Math.round((totalCollectionAmount / totalQuotationAmount) * 100) : 0
  return {
    quotationCount: quotes.length,
    totalQuotationAmount,
    collectionCount: cols.length,
    totalCollectionAmount,
    avgProfitMargin,
    collectionRate
  }
})

const customerTimeline = computed(() => {
  if (!detailCustomer.value) return []
  const events = []
  const cid = detailCustomer.value.id
  const cname = detailCustomer.value.fullName || detailCustomer.value.name || ''

  if (detailCustomer.value.createdAt) {
    events.push({ date: detailCustomer.value.createdAt, text: '创建客户档案', dotClass: 'dot-info' })
  }

  quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname).forEach(q => {
    events.push({ date: q.date, text: `报价 ${q.quoteNo} · ¥${formatNumber(q.total)} · ${quoteStatusLabel(q.status)}`, dotClass: 'dot-quote' })
  })

  dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname).forEach(col => {
    events.push({ date: col.date, text: `回款 ${col.collectionNo} · ¥${formatNumber(col.amount)} · ${collectionMethodLabel(col.method)}`, dotClass: 'dot-money' })
  })

  dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname).forEach(ct => {
    events.push({ date: ct.startDate, text: `签约 ${ct.contractNo} · ¥${formatNumber(ct.amount)} · ${contractStatusLabel(ct.status)}`, dotClass: 'dot-contract' })
  })

  events.sort((a, b) => b.date.localeCompare(a.date))
  return events
})

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function getTagName(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  return tag ? tag.name : tagId
}

function getTagStyle(tagId) {
  const tag = customerStore.tags.find(t => t.id === tagId)
  if (!tag) return {}
  return { background: tag.color + '20', color: tag.color }
}

function quoteStatusLabel(s) {
  const map = { draft: '草稿', pending: '待审', sent: '已发送', accepted: '已接受', approved: '已批准', rejected: '已拒绝', expired: '已过期' }
  return map[s] || s
}

function quoteStatusClass(s) {
  const map = { draft: 'status-draft', pending: 'status-pending', sent: 'status-sent', accepted: 'status-accepted', approved: 'status-approved', rejected: 'status-rejected', expired: 'status-expired' }
  return map[s] || ''
}

function contractStatusLabel(s) {
  const map = { pending: '待签', active: '执行中', completed: '已完成', expired: '已过期', terminated: '已终止' }
  return map[s] || s
}

function contractStatusClass(s) {
  const map = { pending: 'status-pending', active: 'status-accepted', completed: 'status-approved', expired: 'status-expired', terminated: 'status-rejected' }
  return map[s] || ''
}

function collectionMethodLabel(m) {
  const map = { bank_transfer: '银行转账', cash: '现金', check: '支票', other: '其他' }
  return map[m] || m || '-'
}

function getCustomerDocCount(c) {
  const cid = c.id
  const cname = c.fullName || c.name || ''
  const quotes = quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname).length
  const cols = dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname).length
  const contracts = dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname).length
  return quotes + cols + contracts
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !paginatedCustomers.value.some(c => c.id === id))
  } else {
    paginatedCustomers.value.forEach(c => {
      if (!selectedIds.value.includes(c.id)) selectedIds.value.push(c.id)
    })
  }
}

function toggleFormTag(tagId) {
  const idx = form.tags.indexOf(tagId)
  if (idx === -1) form.tags.push(tagId)
  else form.tags.splice(idx, 1)
}

function openAddModal() {
  editingCustomer.value = null
  const defaults = defaultForm()
  defaults.customerNo = customerStore.generateCustomerNo()
  Object.assign(form, defaults)
  showSmartRec.value = false
  smartRecInput.value = ''
  smartRecResult.value = null
  showModal.value = true
}

function openEditModal(c) {
  editingCustomer.value = c
  Object.assign(form, {
    customerNo: c.customerNo || '',
    fullName: c.fullName || c.name || '',
    shortName: c.shortName || '',
    contactName: c.contactName || c.contact || '',
    phone: c.phone || '',
    email: c.email || '',
    department: c.department || '',
    position: c.position || '',
    region: c.region || '',
    level: c.level || 'B',
    decisionAuthority: c.decisionAuthority || '',
    coreConcerns: c.coreConcerns || '',
    creditLimit: c.creditLimit || 0,
    status: c.status || 'active',
    tags: [...(c.tags || [])],
    address: c.address || ''
  })
  showModal.value = true
}

function openDetailModal(c) {
  detailCustomer.value = c
  activeDetailTab.value = 'basic'
  showDetail.value = true
}

function closeModal() {
  showModal.value = false
  editingCustomer.value = null
}

function saveCustomer() {
  if (!form.fullName.trim() && !form.contactName.trim() && !form.phone.trim()) return
  if (editingCustomer.value) {
    customerStore.updateCustomer(editingCustomer.value.id, { ...form, name: form.fullName, contact: form.contactName })
  } else {
    customerStore.addCustomer({ ...form, name: form.fullName })
  }
  closeModal()
}

function startInlineEdit(customer, field) {
  let value = customer[field]
  if (field === 'fullName' && !value) value = customer.name
  if (field === 'contactName' && !value) value = customer.contact
  inlineEdit.value = { id: customer.id, field, value: String(value ?? '') }
}

function isInlineEditing(customerId, field) {
  return inlineEdit.value.id === customerId && inlineEdit.value.field === field
}

function confirmInlineEdit(customer) {
  const { field, value } = inlineEdit.value
  if (!field) return
  const updates = { [field]: value }
  if (field === 'fullName') updates.name = value
  if (field === 'contactName') updates.contact = value
  customerStore.updateCustomer(customer.id, updates)
  inlineEdit.value = { id: null, field: null, value: '' }
}

function cancelInlineEdit() {
  inlineEdit.value = { id: null, field: null, value: '' }
}

function onInlineKeydown(e, customer) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmInlineEdit(customer)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelInlineEdit()
  }
}

const decisionOptions = ['', '决策者', '影响者', '使用者', '推荐者', '把关者']

function handleDelete(c) {
  confirmMessage.value = `确定要删除客户"${c.fullName || c.name}"吗？`
  confirmCallback.value = () => customerStore.deleteCustomer(c.id)
  showConfirm.value = true
}

function confirmAction() {
  if (confirmCallback.value) confirmCallback.value()
  showConfirm.value = false
}

function handleBatchDelete() {
  confirmMessage.value = `确定要删除选中的 ${selectedIds.value.length} 个客户吗？`
  confirmCallback.value = () => {
    customerStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
  showConfirm.value = true
}

function handleBatchLevel() {
  if (!batchLevel.value || selectedIds.value.length === 0) return
  customerStore.batchUpdateLevel(selectedIds.value, batchLevel.value)
  batchLevel.value = ''
  selectedIds.value = []
}

function handleBatchTag() {
  if (selectedIds.value.length === 0) return
  batchSelectedTags.value = []
  showBatchTagModal.value = true
}

function toggleBatchTag(tagId) {
  const idx = batchSelectedTags.value.indexOf(tagId)
  if (idx === -1) batchSelectedTags.value.push(tagId)
  else batchSelectedTags.value.splice(idx, 1)
}

function applyBatchTags() {
  if (batchSelectedTags.value.length === 0) return
  selectedIds.value.forEach(id => {
    batchSelectedTags.value.forEach(tagId => {
      customerStore.addTagToCustomer(id, tagId)
    })
  })
  showBatchTagModal.value = false
  selectedIds.value = []
}

function handleBatchExport() {
  const selected = customerStore.customers.filter(c => selectedIds.value.includes(c.id))
  const data = selected.map(c => ({
    编号: c.customerNo, 名称: c.fullName || c.name, 联系人: c.contactName || c.contact,
    电话: c.phone, 邮箱: c.email, 部门: c.department, 等级: levelLabel(c.level),
      决策权: c.decisionAuthority, 区域: c.region, 余额: c.balance,
      信用额度: c.creditLimit, 状态: c.status === 'active' ? '活跃' : '休眠'
  }))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `客户数据_选中${selected.length}条_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function addTag(tagId) {
  if (!detailCustomer.value) return
  customerStore.addTagToCustomer(detailCustomer.value.id, tagId)
  detailCustomer.value = customerStore.getCustomerById(detailCustomer.value.id)
}

function removeTag(tagId) {
  if (!detailCustomer.value) return
  customerStore.removeTagFromCustomer(detailCustomer.value.id, tagId)
  detailCustomer.value = customerStore.getCustomerById(detailCustomer.value.id)
}

function handleExport() {
  const data = filteredCustomers.value.map(c => ({
    编号: c.customerNo, 名称: c.fullName || c.name, 联系人: c.contactName || c.contact,
    电话: c.phone, 邮箱: c.email, 部门: c.department, 等级: levelLabel(c.level),
    决策权: c.decisionAuthority, 区域: c.region, 余额: c.balance,
    信用额度: c.creditLimit, 状态: c.status === 'active' ? '活跃' : '休眠'
  }))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `客户数据_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const SR_REGION_MAP = {
  '上海': '华东', '江苏': '华东', '浙江': '华东', '安徽': '华东', '福建': '华东', '江西': '华东', '山东': '华东',
  '北京': '华北', '天津': '华北', '河北': '华北', '山西': '华北', '内蒙古': '华北',
  '广东': '华南', '广西': '华南', '海南': '华南',
  '四川': '西南', '重庆': '西南', '贵州': '西南', '云南': '西南', '西藏': '西南',
  '湖北': '华中', '湖南': '华中', '河南': '华中',
  '辽宁': '东北', '吉林': '东北', '黑龙江': '东北',
  '陕西': '西北', '甘肃': '西北', '青海': '西北', '宁夏': '西北', '新疆': '西北'
}

function parseCustomerInfo(text) {
  const result = {
    name: { value: '', confidence: 0 },
    contact: { value: '', confidence: 0 },
    phone: { value: '', confidence: 0 },
    email: { value: '', confidence: 0 },
    region: { value: '', confidence: 0 },
    address: { value: '', confidence: 0 },
    creditLimit: { value: '', confidence: 0 }
  }
  if (!text || !text.trim()) return result
  const fullText = text.replace(/[\n\r]+/g, ' ')

  const emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) { result.email.value = emailMatch[0]; result.email.confidence = 95 }

  const phonePatterns = [
    { re: /(?:电话|手机|联系方式|联系电话|Tel|Phone|Mobile)[：:\s]*((?:\+86[\s\-]?)?1[3-9]\d{9})/i, conf: 90 },
    { re: /((?:\+86[\s\-]?)?1[3-9]\d{9})/, conf: 70 },
    { re: /(?:电话|固话|Tel|Phone)[：:\s]*(0\d{2,3}[\s\-]?\d{7,8})/i, conf: 90 },
    { re: /(0\d{2,3}[\s\-]?\d{7,8})/, conf: 55 }
  ]
  for (const p of phonePatterns) {
    const m = fullText.match(p.re)
    if (m) { result.phone.value = m[1]; result.phone.confidence = p.conf; break }
  }

  const companySuffixes = '有限公司|有限责任公司|集团|股份公司|股份有限公司|公司|厂|商行|商社|事务所|研究所|研究院|中心'
  const companyPatterns = [
    { re: new RegExp(`(?:公司名称|客户名称|单位名称|企业名称|Company)[：:\\s]*(([\\u4e00-\\u9fa5]+?(?:${companySuffixes})))`, 'i'), conf: 95 },
    { re: new RegExp(`(([\\u4e00-\\u9fa5]{2,6}(?:${companySuffixes})))`, 'g'), conf: 65 }
  ]
  for (const p of companyPatterns) {
    const m = fullText.match(p.re)
    if (m) { result.name.value = m[1]; result.name.confidence = p.conf; break }
  }

  const contactPatterns = [
    { re: /(?:联系人|联系|姓名|负责人|对接人|经办人|Name|Contact)[：:\s]*([\u4e00-\u9fa5]{2,4}(?:经理|总|总监|主任|先生|女士|小姐)?)/i, conf: 95 },
    { re: /([\u4e00-\u9fa5]{2,3}(?:经理|总|总监|主任|先生|女士|小姐))/, conf: 60 }
  ]
  for (const p of contactPatterns) {
    const m = fullText.match(p.re)
    if (m && !(result.name.value && result.name.value.includes(m[1]))) {
      result.contact.value = m[1]; result.contact.confidence = p.conf; break
    }
  }

  const addressPatterns = [
    { re: /(?:地址|住址|Addr|Address)[：:\s]*([^\n\r,，;；]{5,80})/i, conf: 90 },
    { re: /((?:[\u4e00-\u9fa5]{2,3}(?:省|市|自治区|特别行政区))[\u4e00-\u9fa5]{2,}(?:路|街|道|巷|弄|号|栋|楼|室|区|园|广场|大厦|中心)[\u4e00-\u9fa5\d\-]{0,50})/, conf: 60 }
  ]
  for (const p of addressPatterns) {
    const m = fullText.match(p.re)
    if (m) { result.address.value = m[1].trim(); result.address.confidence = p.conf; break }
  }

  if (result.address.value) {
    for (const prov in SR_REGION_MAP) {
      if (result.address.value.includes(prov)) { result.region.value = SR_REGION_MAP[prov]; result.region.confidence = 85; break }
    }
  }
  if (!result.region.value) {
    const regionPatterns = [
      { re: /(?:地区|区域|大区)[：:\s]*(华东|华北|华南|西南|华中|东北|西北)/i, conf: 90 },
      { re: /(华东|华北|华南|西南|华中|东北|西北)/, conf: 50 }
    ]
    for (const p of regionPatterns) {
      const m = fullText.match(p.re)
      if (m) { result.region.value = m[1]; result.region.confidence = p.conf; break }
    }
  }

  const creditMatch = fullText.match(/(?:信用额度|授信额度|信用限额|Credit\s*Limit)[：:\s]*([\d,]+(?:\.\d+)?)/i)
  if (creditMatch) { result.creditLimit.value = creditMatch[1].replace(/,/g, ''); result.creditLimit.confidence = 90 }

  return result
}

function runSmartRecognize() {
  if (!smartRecInput.value.trim()) return
  const parsed = parseCustomerInfo(smartRecInput.value)
  const fieldDefs = [
    { key: 'name', label: '客户全称', formKey: 'fullName' },
    { key: 'contact', label: '姓名', formKey: 'contactName' },
    { key: 'phone', label: '手机号码', formKey: 'phone' },
    { key: 'email', label: '邮箱', formKey: 'email' },
    { key: 'region', label: '地区', formKey: 'region' },
    { key: 'address', label: '地址', formKey: 'address' },
    { key: 'creditLimit', label: '信用额度', formKey: 'creditLimit' }
  ]
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0
  for (const def of fieldDefs) {
    const item = parsed[def.key]
    if (item && item.value) {
      identifiedCount++
      const confLevel = item.confidence >= 80 ? 'high' : (item.confidence >= 60 ? 'medium' : 'low')
      const confLabel = item.confidence >= 80 ? '高' : (item.confidence >= 60 ? '中' : '低')
      if (item.confidence < 80) lowConfCount++
      items.push({ key: def.key, label: def.label, formKey: def.formKey, value: item.value, confidence: item.confidence, confLevel, confLabel })
    }
  }
  smartRecResult.value = { items, identifiedCount, lowConfCount }
}

function applySmartRecognize() {
  if (!smartRecResult.value) return
  for (const item of smartRecResult.value.items) {
    if (item.value && form[item.formKey] !== undefined) {
      form[item.formKey] = item.formKey === 'creditLimit' ? parseFloat(item.value) || 0 : item.value
    }
  }
  showSmartRec.value = false
}

function handleSmartFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    smartRecInput.value = e.target.result
  }
  reader.readAsText(file)
  event.target.value = ''
}

function handleDeptChange() {
  if (form.department === '__new__') {
    const newDept = prompt('请输入新部门名称：')
    if (newDept && newDept.trim()) {
      form.department = newDept.trim()
    } else {
      form.department = ''
    }
  }
}

function handleDownloadTemplate() {
  const headers = ['客户编号', '客户全称', '联系人', '部门', '职位', '手机号码', '邮箱', '等级', '决策权限', '核心关注点', '地区', '信用额度', '地址']
  const csv = headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '客户导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleBatchAdd() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,.xlsx,.xls,.json,.txt,.tsv,.xml,.ods'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      let data = await parseImportFile(file)
      if (Array.isArray(data)) {
        data = data.map(row => autoMapRow(row))
        data = data.filter(row => {
          const hasAny = Object.values(row).some(v => v !== '' && v !== 0 && v !== undefined && v !== null)
          return hasAny
        })
        if (data.length === 0) {
          alert('未识别到有效数据，请检查文件内容')
          return
        }
        const result = customerStore.importCustomers(data)
        alert(`导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条`)
      } else {
        alert('文件格式无法识别，请确保文件包含表格数据')
      }
    } catch (err) {
      alert('导入失败：' + err.message)
    }
  }
  input.click()
}

const HEADER_ALIASES = {
  customerNo: ['客户编号', '编号', '客户号', '客户代码', '客户ID', '编号', '代码', 'customerno', 'customer_no', 'code', 'id'],
  fullName: ['客户全称', '客户名称', '公司名称', '公司全称', '公司', '企业名称', '企业', '单位名称', '客户', '名称', 'fullname', 'full_name', 'name', 'company', 'companyname', 'company_name'],
  contactName: ['联系人', '姓名', '联系人姓名', '联系姓名', '客户联系人', '对接人', '负责人', 'contactname', 'contact_name', 'contact', 'contactperson', 'person'],
  department: ['部门', '所属部门', '部门名称', 'department', 'dept', 'departmentname'],
  position: ['职位', '职务', '岗位', '职称', 'position', 'title', 'job', 'role'],
  phone: ['手机号码', '手机', '电话', '联系方式', '联系电话', '手机号', '移动电话', 'phone', 'mobile', 'tel', 'telephone', 'cellphone', 'cell'],
  email: ['邮箱', '电子邮件', '邮件', 'email', 'mail', 'e_mail', 'e-mail', 'emailaddress'],
  level: ['等级', '客户等级', '级别', '等级', 'level', 'grade', 'customerlevel', 'customer_level', 'class'],
  decisionAuthority: ['决策权限', '决策权', '决策角色', '权限', 'decisionauthority', 'decision_authority', 'authority', 'role', 'decisionrole'],
  coreConcerns: ['核心关注点', '关注点', '核心关注', '关注', 'concerns', 'coreconcerns', 'core_concerns', 'focus', 'keyconcerns'],
  region: ['地区', '区域', '大区', '所在地区', '所在区域', 'region', 'area', 'zone', 'district'],
  creditLimit: ['信用额度', '授信额度', '信用限额', '额度', 'creditlimit', 'credit_limit', 'credit', 'creditamount'],
  address: ['地址', '详细地址', '通讯地址', '联系地址', '住址', 'address', 'addr', 'location', 'fulladdress'],
  shortName: ['简称', '客户简称', '公司简称', 'shortname', 'short_name', 'short', 'abbreviation', 'abbr'],
  tags: ['标签', '标记', 'tags', 'tag', 'label', 'labels'],
  status: ['状态', '客户状态', 'status', 'state', 'customerstatus']
}

function autoMapRow(row) {
  const mapped = {}
  const lowerKeyMap = {}
  for (const key of Object.keys(row)) {
    lowerKeyMap[key.toLowerCase().trim()] = key
  }
  for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES)) {
    let found = false
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase().trim()
      if (lowerKeyMap[lowerAlias] !== undefined) {
        mapped[fieldKey] = row[lowerKeyMap[lowerAlias]]
        found = true
        break
      }
    }
    if (!found) {
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase().trim()
        for (const alias of aliases) {
          const lowerAlias = alias.toLowerCase().trim()
          if (lowerKey.includes(lowerAlias) || lowerAlias.includes(lowerKey)) {
            mapped[fieldKey] = row[key]
            found = true
            break
          }
        }
        if (found) break
      }
    }
  }
  for (const [key, val] of Object.entries(row)) {
    if (mapped[key] === undefined) {
      mapped[key] = val
    }
  }
  return mapped
}

async function parseImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'json') {
    const text = await readFileAsText(file)
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    const XLSX = await import('xlsx')
    const buffer = await readFileAsArrayBuffer(file)
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    const text = await readFileAsText(file)
    return parseDelimitedText(text, ext === 'tsv' ? '\t' : null)
  }
  if (ext === 'xml') {
    const text = await readFileAsText(file)
    return parseXmlText(text)
  }
  const text = await readFileAsText(file)
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return parseDelimitedText(text, null)
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function parseDelimitedText(text, forceSep) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  let sep = forceSep
  if (!sep) {
    const firstLine = lines[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const tabCount = (firstLine.match(/\t/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const pipeCount = (firstLine.match(/\|/g) || []).length
    const counts = [
      { sep: ',', count: commaCount },
      { sep: '\t', count: tabCount },
      { sep: ';', count: semicolonCount },
      { sep: '|', count: pipeCount }
    ]
    counts.sort((a, b) => b.count - a.count)
    sep = counts[0].count > 0 ? counts[0].sep : ','
  }
  const headers = splitLine(lines[0], sep)
  const data = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = splitLine(lines[i], sep)
    const obj = {}
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim() })
    data.push(obj)
  }
  return data
}

function splitLine(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseXmlText(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const rows = doc.querySelectorAll('row, item, record, customer, entry')
  if (rows.length === 0) {
    const rootChildren = doc.documentElement ? doc.documentElement.children : []
    if (rootChildren.length > 0) {
      return Array.from(rootChildren).map(el => {
        const obj = {}
        for (const child of el.children) {
          obj[child.tagName] = child.textContent
        }
        return obj
      })
    }
    return []
  }
  return Array.from(rows).map(el => {
    const obj = {}
    for (const child of el.children) {
      obj[child.tagName] = child.textContent
    }
    for (const attr of el.attributes) {
      obj[attr.name] = attr.value
    }
    return obj
  })
}

function closeColumnConfigOnClick(e) {
  const wrapper = document.querySelector('.column-config-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    showColumnConfig.value = false
  }
}

function closeColumnConfigOnResize() {
  showColumnConfig.value = false
}

function closeColumnConfigOnScroll() {
  showColumnConfig.value = false
}

onMounted(() => {
  customerStore.initSeedData()
  dataStore.initSeedData()
  document.addEventListener('click', closeColumnConfigOnClick)
  window.addEventListener('resize', closeColumnConfigOnResize)
  window.addEventListener('scroll', closeColumnConfigOnScroll, true)
})
</script>

<style scoped>
.customer-page { max-width: 1600px; margin: 0 auto; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); font-weight: 500; background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); border-right: 1px solid var(--color-border); }
.view-btn:last-child { border-right: none; }
.view-btn:hover { background: var(--color-surface-hover); }
.view-btn.active { background: var(--color-accent-subtle); color: var(--color-accent); }

.customer-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: end; }

.smart-recognize-panel { margin-bottom: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.smart-recognize-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: var(--color-surface-elevated); cursor: pointer; user-select: none; }
.smart-recognize-header:hover { background: var(--color-surface-hover); }
.sr-header-left { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); font-weight: 600; }
.sr-icon { font-size: 16px; }
.sr-badge { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); font-weight: 700; }
.sr-badge-success { background: rgba(16,185,129,0.12); color: #10b981; }
.sr-badge-warning { background: rgba(245,158,11,0.12); color: #f59e0b; }
.sr-toggle { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.smart-recognize-body { padding: var(--space-3); border-top: 1px solid var(--color-border); }
.sr-actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); align-items: center; }
.sr-result-panel { margin-top: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.sr-result-header { padding: var(--space-2) var(--space-3); background: var(--color-success-subtle); font-size: var(--font-size-sm); }
.sr-result-header.has-warnings { background: rgba(245,158,11,0.08); }
.sr-result-body { padding: var(--space-2) var(--space-3); }
.sr-result-item { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.sr-result-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); min-width: 70px; }
.sr-result-input { flex: 1; padding: 2px 6px; font-size: var(--font-size-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-primary); color: var(--color-text-primary); }
.sr-result-confidence { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); font-weight: 600; min-width: 60px; text-align: center; }
.sr-result-confidence.high { background: rgba(16,185,129,0.12); color: #10b981; }
.sr-result-confidence.medium { background: rgba(245,158,11,0.12); color: #f59e0b; }
.sr-result-confidence.low { background: rgba(239,68,68,0.12); color: #ef4444; }
.sr-empty-tip { padding: var(--space-3); text-align: center; font-size: var(--font-size-sm); color: var(--color-text-tertiary); }
.sr-result-actions { display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-top: 1px solid var(--color-border); justify-content: flex-end; }

.required { color: #ef4444; }
.customer-search-grid { display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: var(--space-3); align-items: end; flex: 1; }
.search-field { display: flex; flex-direction: column; gap: 4px; }
.search-field-label { font-size: 11px; font-weight: 600; color: var(--color-text-tertiary); white-space: nowrap; }
.search-field .search-input { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 10px; font-size: 13px; color: var(--color-text-primary); width: 100%; outline: none; }
.search-field .search-input:focus { border-color: var(--color-accent); }
.search-field .search-input::placeholder { color: var(--color-text-tertiary); }
.search-reset-btn { align-self: end; }
.customer-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { width: auto; min-width: 100px; }

.customer-stats-bar { display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex-wrap: wrap; }
.stat-item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-base); color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.active { background: var(--color-success); }
.stat-dot.dormant { background: var(--color-text-tertiary); }
.level-stats { display: flex; gap: var(--space-2); }
.level-stat { font-size: var(--font-size-sm); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.ls-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.ls-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.ls-C { background: rgba(59,130,246,0.12); color: #3b82f6; }

.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-accent-subtle); border-radius: var(--radius-md); margin-bottom: var(--space-3); font-size: var(--font-size-sm); color: var(--color-accent); }

.no-padding { padding: 0 !important; }
.table-container { overflow-x: auto; }

.customer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.customer-table th { text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--color-text-tertiary); border-bottom: 2px solid var(--color-border); white-space: nowrap; letter-spacing: 0.03em; text-transform: uppercase; }
.customer-table td { padding: 12px 16px; font-size: 14px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.customer-table tr:hover td { background: var(--color-surface-hover); }
.row-with-border { border-left: 3px solid transparent; }

.table-toolbar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 14px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-elevated); }

.col-check { width: 44px; text-align: center; }
.col-no { width: 140px; }
.col-name { min-width: 200px; }
.col-contact { width: 90px; }
.col-position { width: 90px; }
.col-phone { width: 130px; }
.col-level { width: 80px; text-align: center; }
.col-decision { width: 90px; }
.col-concerns { min-width: 120px; max-width: 160px; }
.col-status { width: 72px; text-align: center; }
.col-docs { width: 80px; text-align: center; }
.col-actions { width: 170px; }

.name-cell strong { color: var(--color-text-primary); }
.docs-cell { text-align: center; }
.doc-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--color-accent); color: #fff; cursor: pointer; transition: opacity var(--transition-fast); }
.doc-badge:hover { opacity: 0.8; }
.doc-empty { color: var(--color-text-tertiary); }
.tag-row { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.mini-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
.text-accent { color: var(--color-accent); }
.mono { font-family: var(--font-mono); }

.checkbox { width: 18px; height: 18px; border: 2px solid var(--color-border-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all var(--transition-fast); flex-shrink: 0; }
.checkbox:hover { border-color: var(--color-accent); }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }

.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.status-draft { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.status-pending { background: rgba(245,158,11,0.12); color: #f59e0b; }
.status-sent { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-accepted { background: var(--color-success-subtle); color: var(--color-success); }
.status-approved { background: var(--color-success-subtle); color: var(--color-success); }
.status-rejected { background: rgba(239,68,68,0.12); color: #ef4444; }
.status-expired { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }

.action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: var(--radius-sm); transition: all var(--transition-fast); color: var(--color-text-secondary); white-space: nowrap; }
.action-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.action-btn.danger:hover { background: var(--color-danger-subtle); color: var(--color-danger); }

.inline-input { width: 100%; padding: 4px 8px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); }
.inline-select { width: 100%; padding: 4px 6px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); cursor: pointer; }
.cell-editable { cursor: pointer; }

.pagination-bar { display: flex; align-items: center; gap: 4px; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border); flex-wrap: wrap; }
.pagination-btn { padding: 4px 10px; font-size: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: transparent; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.pagination-btn:hover:not(:disabled) { background: var(--color-surface-hover); }
.pagination-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info { font-size: 12px; color: var(--color-text-tertiary); margin-left: 8px; }

/* 列表视图 */
.list-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background var(--transition-fast); }
.list-item:hover { background: var(--color-surface-hover); }
.list-item-dormant { opacity: 0.6; }
.list-item-check { flex-shrink: 0; }
.list-item-avatar { width: 36px; height: 36px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-sm); flex-shrink: 0; }
.list-item-main { flex: 1; min-width: 0; }
.list-item-row1 { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.list-item-name { font-size: var(--font-size-sm); color: var(--color-text-primary); }
.list-item-row2 { display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px; flex-wrap: wrap; }
.list-item-row3 { display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; flex-wrap: wrap; }
.list-item-actions { display: flex; gap: var(--space-1); flex-shrink: 0; }
.text-muted { color: var(--color-text-tertiary); }

/* 卡片视图 */
.customer-card-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-4); }
.customer-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: all var(--transition-fast); }
.customer-card:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); }
.customer-card.dormant-card { opacity: 0.6; }
.card-prio-bar { height: 3px; }
.card-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
.card-avatar { width: 40px; height: 40px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-lg); flex-shrink: 0; }
.card-title-area { flex: 1; min-width: 0; }
.card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); }
.card-sub { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.card-body { padding: 0 var(--space-4) var(--space-3); }
.card-field { display: flex; justify-content: space-between; padding: 2px 0; font-size: var(--font-size-xs); }
.field-label { color: var(--color-text-tertiary); }
.card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: var(--space-2); }
.card-footer { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-4) var(--space-3); }
.card-actions { display: flex; gap: var(--space-1); }

/* 空状态 */
.empty-state { text-align: center; padding: var(--space-16) 0; }
.empty-icon { font-size: 48px; margin-bottom: var(--space-4); }
.empty-text { font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: var(--space-2); }
.empty-sub { color: var(--color-text-tertiary); font-size: var(--font-size-sm); }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fade-in 200ms ease; }
.modal-dialog { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slide-up 200ms ease; }
.modal-lg { max-width: 800px; }
.modal-xl { max-width: 960px; }
.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 1; }
.modal-header h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary); }
.modal-close { background: none; border: none; font-size: 18px; color: var(--color-text-tertiary); cursor: pointer; padding: 4px; border-radius: var(--radius-sm); }
.modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }
.btn-danger { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
.btn-danger:hover { opacity: 0.9; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); }

.form-textarea { width: 100%; padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-primary); color: var(--color-text-primary); resize: vertical; font-family: inherit; line-height: 1.5; }
.form-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-subtle); }
.form-textarea::placeholder { color: var(--color-text-tertiary); }

.tag-selector { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag-option { padding: 3px 10px; border-radius: 14px; font-size: 11px; cursor: pointer; border: 1px dashed var(--color-border); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.tag-option:hover { border-style: solid; }
.tag-option.selected { border-style: solid; }

/* 360°详情 */
.detail-top-bar { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-4); }
.detail-avatar-lg { width: 64px; height: 64px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-2xl); flex-shrink: 0; }
.detail-top-info { flex: 1; min-width: 0; }
.detail-name { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); }
.detail-top-badges { display: flex; align-items: center; gap: var(--space-2); margin-top: 4px; flex-wrap: wrap; }
.detail-top-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 4px; }
.detail-top-kpis { display: flex; gap: var(--space-3); flex-shrink: 0; }
.kpi-card { text-align: center; padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); min-width: 80px; }
.kpi-label { font-size: 10px; color: var(--color-text-tertiary); }
.kpi-value { font-size: var(--font-size-sm); font-weight: 700; }
.text-danger { color: var(--color-danger); }
.text-warning { color: #f59e0b; }
.text-success { color: var(--color-success); }

.detail-tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); }
.detail-tab-btn { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all var(--transition-fast); }
.detail-tab-btn:hover { color: var(--color-text-primary); }
.detail-tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }

.detail-tab-content { }

.detail-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.detail-section { }
.detail-section-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.detail-fields { }
.detail-field { display: flex; padding: 3px 0; font-size: var(--font-size-sm); }
.df-label { color: var(--color-text-tertiary); width: 80px; flex-shrink: 0; white-space: nowrap; }
.detail-empty { font-size: var(--font-size-sm); color: var(--color-text-tertiary); padding: var(--space-4) 0; text-align: center; }

.trade-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-3); }
.trade-kpi { text-align: center; padding: var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.trade-kpi-value { font-size: var(--font-size-lg); font-weight: 700; }
.trade-kpi-label { font-size: 10px; color: var(--color-text-tertiary); margin-top: 2px; }

.detail-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-xs); }
.detail-table th { text-align: left; padding: var(--space-2) var(--space-2); color: var(--color-text-tertiary); border-bottom: 1px solid var(--color-border); font-weight: 600; }
.detail-table td { padding: var(--space-2) var(--space-2); border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); }

.detail-tags-area { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-3); }
.detail-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; font-size: 12px; }
.tag-remove { cursor: pointer; font-size: 10px; opacity: 0.7; }
.tag-remove:hover { opacity: 1; }
.detail-tags-available { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag-add-btn { padding: 3px 10px; border-radius: 14px; font-size: 11px; cursor: pointer; border: 1px dashed; background: transparent; transition: all var(--transition-fast); }
.tag-add-btn:hover { border-style: solid; }

.batch-tag-list { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.batch-tag-option { padding: 4px 12px; border-radius: 14px; font-size: var(--font-size-sm); cursor: pointer; border: 1px dashed var(--color-border); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.batch-tag-option:hover { border-style: solid; }
.batch-tag-option.selected { border-style: solid; }

.inline-tag-create { padding: var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); }
.color-picker-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.color-dot-sm { width: 18px; height: 18px; border-radius: var(--radius-full); cursor: pointer; border: 2px solid transparent; transition: all var(--transition-fast); }
.color-dot-sm:hover { transform: scale(1.15); }
.color-dot-sm.active { border-color: var(--color-text-primary); box-shadow: 0 0 0 2px var(--color-accent-subtle); }

/* 时间线 */
.timeline { position: relative; padding-left: 24px; }
.timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--color-border); }
.timeline-item { position: relative; padding-bottom: var(--space-4); }
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: var(--radius-full); border: 2px solid var(--color-bg-secondary); }
.dot-info { background: var(--color-accent); }
.dot-quote { background: #3b82f6; }
.dot-money { background: var(--color-success); }
.dot-contract { background: #8b5cf6; }
.timeline-date { font-size: 10px; color: var(--color-text-tertiary); }
.timeline-text { font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: 2px; }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .customer-card-view { grid-template-columns: 1fr; }
  .detail-grid-2col { grid-template-columns: 1fr; }
  .page-header-actions { flex-direction: column; align-items: flex-start; }
  .detail-top-bar { flex-direction: column; align-items: flex-start; }
  .detail-top-kpis { width: 100%; }
  .trade-summary { grid-template-columns: repeat(3, 1fr); }
}

.modal-xl { max-width: 1100px; width: 95vw; }
.detail-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.detail-table th, .detail-table td { padding: 6px 8px; border-bottom: 1px solid var(--color-border); text-align: left; white-space: nowrap; }
.detail-table th { background: var(--color-surface-elevated); font-weight: 600; position: sticky; top: 0; }
.text-danger { color: var(--color-danger, #e53e3e); font-weight: 600; }
.text-success { color: var(--color-success, #38a169); }

.cal-nav { display: flex; align-items: center; gap: var(--space-2); }
.cal-range-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 2px 10px; border-radius: var(--radius-sm); font-weight: 600; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-1); }
.cal-weekday { padding: var(--space-2) 0; font-weight: 600; }
.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-day { min-height: 80px; padding: var(--space-1); border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; background: var(--color-bg-primary); }
.cal-day:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.cal-day.other-month { opacity: 0.35; }
.cal-day.today { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.cal-day.selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent); }
.cal-day-num { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
.cal-day.today .cal-day-num { color: var(--color-accent); }
.cal-day-items { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.cal-customer-dot { width: 8px; height: 8px; border-radius: 50%; cursor: pointer; transition: transform 0.15s; }
.cal-customer-dot:hover { transform: scale(1.5); }
.cal-more { font-size: 9px; color: var(--color-text-tertiary); }
.cal-selected-detail { margin-top: var(--space-4); border-top: 1px solid var(--color-border); padding-top: var(--space-3); }
.cal-detail-header { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-2); }
.cal-detail-list { display: flex; flex-direction: column; gap: var(--space-2); }
.cal-detail-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); cursor: pointer; transition: all 0.15s; }
.cal-detail-item:hover { background: var(--color-accent-subtle); }
.cal-detail-avatar { width: 32px; height: 32px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-sm); flex-shrink: 0; }
.cal-detail-info { flex: 1; min-width: 0; }
.cal-detail-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); }
.cal-detail-sub { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

.cust-week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-2); }
.cust-week-col { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); min-height: 200px; display: flex; flex-direction: column; }
.cust-week-col.today { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.cust-week-header { text-align: center; margin-bottom: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
.cust-week-name { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
.cust-week-num { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); margin-top: 2px; }
.cust-week-num.is-today { color: var(--color-accent); }
.cust-week-date-label { font-size: 10px; color: var(--color-text-tertiary); margin-top: 1px; }
.cust-week-customers { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); }
.cust-week-card { padding: var(--space-2); background: var(--color-surface-elevated); border-radius: var(--radius-sm); border-left: 3px solid var(--color-border); cursor: pointer; transition: all 0.15s; }
.cust-week-card:hover { background: var(--color-surface-hover); transform: translateY(-1px); }
.cust-week-card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-1); margin-bottom: 2px; }
.cust-week-card-name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.cust-week-card-info { font-size: 10px; color: var(--color-text-tertiary); display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 2px; }
.cust-week-card-bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-1); }
.cust-week-empty { text-align: center; color: var(--color-text-tertiary); font-size: var(--font-size-sm); padding: var(--space-4) 0; }

@media (max-width: 1024px) {
  .cust-week-grid { grid-template-columns: repeat(4, 1fr); }
  .cust-week-col:nth-child(n+5) { display: none; }
  .cal-day { min-height: 60px; }
}
@media (max-width: 640px) {
  .cust-week-grid { grid-template-columns: repeat(3, 1fr); }
  .cust-week-col:nth-child(n+4) { display: none; }
  .cal-day { min-height: 50px; }
}

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
</style>
