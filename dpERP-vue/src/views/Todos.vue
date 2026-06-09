<template>
  <div class="todo-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">待办事项管理</h2>
        <p class="page-header-subtitle">全面的任务管理系统，支持表格化展示、高级筛选、进度追踪、智能提醒</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in viewModes"
            :key="v.key"
            class="view-btn"
            :class="{ active: currentView === v.key }"
            @click="currentView = v.key"
          ><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <button v-if="canManage" class="btn btn-primary" @click="openAddModal">+ 新建任务</button>
          <button v-if="canManage" class="btn btn-outline" @click="handleBatchComplete" :disabled="selectedIds.length === 0"><Icon name="check" :size="14" /> 批量完成</button>
          <button v-if="canManage" class="btn btn-outline btn-danger" @click="handleBatchDelete" :disabled="selectedIds.length === 0"><Icon name="delete" :size="14" /> 批量删除</button>
          <button class="btn btn-outline" @click="handleExport"><Icon name="upload" :size="14" /> 导出</button>
      </div>
    </div>

    <div class="todo-toolbar">
      <div class="todo-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索任务标题、描述、备注..."
        />
      </div>
      <div class="todo-filters">
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="all">全部状态</option>
          <option value="pending">进行中</option>
          <option value="overdue">已逾期</option>
          <option value="completed">已完成</option>
        </select>
        <select v-model="filterPriority" class="form-select filter-select">
          <option value="all">全部优先级</option>
          <option value="high">高优先级</option>
          <option value="medium">中优先级</option>
          <option value="low">低优先级</option>
        </select>
        <select v-model="filterTag" class="form-select filter-select">
          <option value="all">全部标签</option>
          <option v-for="tag in todoStore.allTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="priority">按优先级</option>
          <option value="dueDate">按截止日期</option>
          <option value="progress">按完成度</option>
          <option value="remainDays">按剩余天数</option>
          <option value="createdAt">按创建时间</option>
        </select>
        <button
          class="btn btn-ghost btn-sm"
          @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
          :title="sortDir === 'asc' ? '升序' : '降序'"
        ><Icon :name="sortDir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="14" /></button>
      </div>
    </div>

    <div class="column-config-wrapper" style="margin-bottom: var(--space-3);">
      <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
      <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
        <label v-for="col in columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions')" :key="col.key" class="column-config-item">
          <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
        </label>
      </div>
    </div>

    <div class="todo-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span> 总计 {{ todoStore.stats.total }}</div>
      <div class="stat-item"><span class="stat-dot pending"></span> 进行中 {{ todoStore.stats.pending }}</div>
      <div class="stat-item"><span class="stat-dot overdue"></span> 逾期 {{ todoStore.stats.overdue }}</div>
      <div class="stat-item"><span class="stat-dot completed"></span> 已完成 {{ todoStore.stats.completed }}</div>
      <div class="stat-item stat-actions">
        <button class="btn btn-ghost btn-sm" @click="todoStore.completeAll()">全部完成</button>
        <button class="btn btn-ghost btn-sm" @click="confirmClearCompleted">清除已完成</button>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <!-- 表格视图 -->
    <div v-if="currentView === 'table'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="todo-table">
            <thead>
              <tr>
                <th class="col-check">
                  <div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">[√]</div>
                </th>
                <th v-if="columnVisible.idx" class="col-idx">#</th>
                <th v-if="columnVisible.title" class="col-title">任务标题</th>
                <th v-if="columnVisible.desc" class="col-desc">描述</th>
                <th v-if="columnVisible.priority" class="col-priority">优先级</th>
                <th v-if="columnVisible.tag" class="col-tag">标签</th>
                <th v-if="columnVisible.startDate" class="col-date">计划开始</th>
                <th v-if="columnVisible.dueDate" class="col-date">截止日期</th>
                <th v-if="columnVisible.reminder" class="col-reminder">提前提醒</th>
                <th v-if="columnVisible.status" class="col-status">状态</th>
                <th v-if="columnVisible.remain" class="col-remain">剩余</th>
                <th v-if="columnVisible.reminderStatus" class="col-reminder-status">提醒状态</th>
                <th v-if="columnVisible.remark" class="col-remark">备注</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, idx) in filteredTodos" :key="t.id" :class="{ 'completed-row': isCompleted(t) }">
                <td class="col-check">
                  <div class="checkbox" :class="{ checked: selectedIds.includes(t.id) }" @click="toggleSelect(t.id)">[√]</div>
                </td>
                <td v-if="columnVisible.idx" class="col-idx">{{ idx + 1 }}</td>
                <td v-if="columnVisible.title" class="col-title" @dblclick="startInlineEdit(t, 'title')">
                  <div v-if="!isInlineEditing(t.id, 'title')" class="title-cell">
                    {{ t.title }}
                    <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge"><Icon name="refresh" :size="14" /></span>
                    <span v-if="t.subtasks && t.subtasks.length > 0" class="subtask-count">
                      <Icon name="list" :size="14" /> {{ t.subtasks.filter(s => s.completed).length }}/{{ t.subtasks.length }}
                    </span>
                    <span v-if="t.auto" class="auto-badge">自动</span>
                  </div>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" ref="inlineTitleRef" />
                </td>
                <td v-if="columnVisible.desc" class="col-desc" @dblclick="startInlineEdit(t, 'notes')">
                  <div v-if="!isInlineEditing(t.id, 'notes')" class="desc-cell">{{ t.notes || '-' }}</div>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" />
                </td>
                <td v-if="columnVisible.priority" class="col-priority" @dblclick="startInlineEdit(t, 'priority')">
                  <span v-if="!isInlineEditing(t.id, 'priority')" class="priority-badge" :class="'p-' + (t.priority || 'medium')">
                    {{ prioLabel(t.priority) }}
                  </span>
                  <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(t)" @blur="confirmInlineEdit(t)" @keydown="onInlineKeydown($event, t)">
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </td>
                <td v-if="columnVisible.tag" class="col-tag" @dblclick="startInlineEdit(t, 'tag')">
                  <span v-if="!isInlineEditing(t.id, 'tag')" v-bind="t.tag ? { class: 'tag-badge' } : { class: 'text-muted' }">{{ t.tag || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" />
                </td>
                <td v-if="columnVisible.startDate" class="col-date" @dblclick="startInlineEdit(t, 'startDate')">
                  <span v-if="!isInlineEditing(t.id, 'startDate')">{{ t.startDate || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" type="date" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" />
                </td>
                <td v-if="columnVisible.dueDate" class="col-date" @dblclick="startInlineEdit(t, 'dueDate')">
                  <span v-if="!isInlineEditing(t.id, 'dueDate')">{{ t.dueDate || '-' }}</span>
                  <input v-else v-model="inlineEdit.value" type="date" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" />
                </td>
                <td v-if="columnVisible.reminder" class="col-reminder" @dblclick="startInlineEdit(t, 'reminder')">
                  <span v-if="!isInlineEditing(t.id, 'reminder')">{{ t.reminder || '-' }}</span>
                  <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(t)" @blur="confirmInlineEdit(t)" @keydown="onInlineKeydown($event, t)">
                    <option v-for="opt in reminderOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </td>
                <td v-if="columnVisible.status" class="col-status">
                  <span class="status-badge" :class="'s-' + getStatusClass(t)">{{ getStatusLabel(t) }}</span>
                </td>
                <td v-if="columnVisible.remain" class="col-remain">
                  <span class="remain-badge" :class="getRemainClass(t)">{{ getRemainText(t) }}</span>
                </td>
                <td v-if="columnVisible.reminderStatus" class="col-reminder-status">
                  <span class="reminder-status-badge" :class="getReminderStatusClass(t)">{{ getReminderStatus(t) }}</span>
                </td>
                <td v-if="columnVisible.remark" class="col-remark" @dblclick="startInlineEdit(t, 'remark')">
                  <div v-if="!isInlineEditing(t.id, 'remark')" class="remark-cell">{{ t.remark || '-' }}</div>
                  <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, t)" @blur="confirmInlineEdit(t)" />
                </td>
                <td class="col-actions">
                  <button class="action-btn-sm" @click="openEditModal(t)" title="编辑">编辑</button>
                  <button class="action-btn-sm" @click="handleToggle(t)" :title="isCompleted(t) ? '恢复' : '完成'">
                    {{ isCompleted(t) ? '恢复' : '完成' }}
                  </button>
                  <button v-if="canManage && !t.auto" class="action-btn-sm danger" @click="handleDelete(t)" title="删除">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-if="currentView === 'list'" class="todo-list-view">
      <div v-for="t in filteredTodos" :key="t.id" class="list-row" :class="{ 'completed-row': isCompleted(t), ['prio-' + (t.priority || 'medium')]: true }">
        <div class="list-check">
          <div class="checkbox" :class="{ checked: isCompleted(t) }" @click="handleToggle(t)">[√]</div>
        </div>
        <div class="list-body">
          <div class="list-title">{{ t.title }}</div>
          <div v-if="t.notes" class="list-notes">{{ t.notes }}</div>
          <div class="list-meta">
            <span class="priority-badge" :class="'p-' + (t.priority || 'medium')">{{ prioLabel(t.priority) }}</span>
            <span class="status-badge" :class="'s-' + getStatusClass(t)">{{ getStatusLabel(t) }}</span>
            <span v-if="t.tag" class="tag-badge">{{ t.tag }}</span>
            <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge"><Icon name="refresh" :size="14" /></span>
            <span v-if="t.startDate" class="meta-date"><Icon name="calendar" :size="14" /> 开始 {{ t.startDate }}</span>
            <span v-if="t.dueDate" class="meta-date"><Icon name="bell" :size="14" /> 截止 {{ t.dueDate }}</span>
            <span v-if="t.progress > 0" class="meta-progress">进度 {{ t.progress }}%</span>
            <span v-if="t.subtasks && t.subtasks.length > 0" class="meta-sub">
              <Icon name="list" :size="14" /> {{ t.subtasks.filter(s => s.completed).length }}/{{ t.subtasks.length }}
            </span>
          </div>
        </div>
        <div class="list-right">
          <span v-if="t.dueDate" class="remain-badge" :class="getRemainClass(t)">{{ getRemainText(t) }}</span>
          <div class="list-actions">
            <button class="action-btn-sm" @click="openEditModal(t)">编辑</button>
            <button class="action-btn-sm" @click="handleToggle(t)">{{ isCompleted(t) ? '恢复' : '完成' }}</button>
            <button v-if="!t.auto" class="action-btn-sm danger" @click="handleDelete(t)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-if="currentView === 'card'" class="todo-card-view">
      <div v-for="t in filteredTodos" :key="t.id" class="todo-card" :class="{ 'completed-card': isCompleted(t) }">
        <div class="card-prio-bar" :class="'prio-' + (t.priority || 'medium')"></div>
        <div class="card-header">
          <div class="checkbox" :class="{ checked: isCompleted(t) }" @click="handleToggle(t)">[√]</div>
          <div class="card-title">{{ t.title }}</div>
        </div>
        <div v-if="t.notes" class="card-desc">{{ t.notes }}</div>
        <div v-if="t.subtasks && t.subtasks.length > 0" class="card-subtasks">
          <div class="subtask-header"><Icon name="list" :size="14" /> 子任务 {{ t.subtasks.filter(s => s.completed).length }}/{{ t.subtasks.length }}</div>
          <div v-for="sub in t.subtasks" :key="sub.id" class="subtask-item" :class="{ completed: sub.completed }">
            <span class="subtask-check" @click="todoStore.toggleSubtask(t.id, sub.id)">{{ sub.completed ? '[√]' : '[□]' }}</span>
            {{ sub.title }}
          </div>
        </div>
        <div class="card-tags">
          <span class="priority-badge" :class="'p-' + (t.priority || 'medium')">{{ prioLabel(t.priority) }}</span>
          <span v-if="t.tag" class="tag-badge">{{ t.tag }}</span>
          <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge"><Icon name="refresh" :size="14" /></span>
        </div>
        <div class="card-info">
          <div v-if="t.startDate" class="info-item"><Icon name="calendar" :size="14" /> 开始 {{ t.startDate }}</div>
          <div v-if="t.dueDate" class="info-item"><Icon name="bell" :size="14" /> 截止 {{ t.dueDate }}</div>
          <div v-if="t.reminder && t.reminder !== '不提醒'" class="info-item">[提醒] {{ t.reminder }}</div>
        </div>
        <div class="card-progress">
          <div class="progress-bar"><div class="progress-fill" :class="getProgressClass(t)" :style="{ width: getProgress(t) + '%' }"></div></div>
          <span class="progress-text">{{ getProgress(t) }}%</span>
        </div>
        <div class="card-footer">
          <span class="status-badge" :class="'s-' + getStatusClass(t)">{{ getStatusLabel(t) }}</span>
          <div class="card-actions">
            <button class="action-btn-sm" @click="openEditModal(t)">编辑</button>
            <button class="action-btn-sm" @click="handleToggle(t)">{{ isCompleted(t) ? '恢复' : '完成' }}</button>
            <button v-if="!t.auto" class="action-btn-sm danger" @click="handleDelete(t)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-if="currentView === 'calendar'" class="todo-calendar-view">
      <div class="todo-calendar-header">
        <div class="todo-calendar-title">{{ calYear }}年 {{ calMonthNames[calMonth] }}</div>
        <div class="todo-calendar-nav">
          <button class="btn btn-ghost btn-sm" @click="calPrev"><Icon name="chevronLeft" :size="14" /> 上月</button>
          <button class="btn btn-ghost btn-sm" @click="calToday"><Icon name="checkCircle" :size="14" /> 今天</button>
          <button class="btn btn-ghost btn-sm" @click="calNext">下月 <Icon name="chevronRight" :size="14" /></button>
        </div>
      </div>
      <div class="todo-calendar-weekdays">
        <div v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="todo-calendar-weekday">{{ w }}</div>
      </div>
      <div class="todo-calendar-days">
        <div
          v-for="day in calDays"
          :key="day.key"
          class="todo-calendar-day"
          :class="{ 'other-month': !day.currentMonth, today: day.isToday }"
        >
          <div class="todo-calendar-day-num">{{ day.day }}</div>
          <div v-if="day.items.length > 0" class="todo-calendar-day-items">
            <div
              v-for="item in day.items.slice(0, 3)"
              :key="item.id"
              class="todo-calendar-item"
              :class="item.status === 'completed' ? 'completed' : item.priority || 'medium'"
              @click="openEditModal(item)"
            >{{ item.title }}</div>
            <div v-if="day.items.length > 3" class="todo-calendar-more">+{{ day.items.length - 3 }} 更多</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 周视图 -->
    <div v-if="currentView === 'week'" class="todo-week-view">
      <div class="todo-week-header">
        <div class="todo-week-title">{{ weekTitle }}</div>
        <div class="todo-week-nav">
          <button class="btn btn-ghost btn-sm" @click="weekPrev"><Icon name="chevronLeft" :size="14" /> 上周</button>
          <button class="btn btn-ghost btn-sm" @click="weekToday"><Icon name="checkCircle" :size="14" /> 本周</button>
          <button class="btn btn-ghost btn-sm" @click="weekNext">下周 <Icon name="chevronRight" :size="14" /></button>
        </div>
      </div>
      <div class="todo-week-day-columns">
        <div v-for="(d, di) in weekDays" :key="di" class="todo-week-day-col">
          <div class="todo-week-day-header" :class="{ today: d.isToday }">
            {{ weekDayNames[di] }}<span class="day-num">{{ d.dayNum }}</span>
          </div>
          <div class="todo-week-day-items">
            <div
              v-for="item in getWeekDayItems(d.dateStr)"
              :key="item.id"
              class="todo-week-item"
              :class="item.status === 'completed' ? 'completed' : item.priority || 'medium'"
              @click="openEditModal(item)"
            >
              <span class="todo-week-item-title">{{ item.title }}</span>
              <span v-if="item.dueDate" class="todo-week-item-due">{{ item.dueDate }}</span>
            </div>
            <div v-if="getWeekDayItems(d.dateStr).length === 0" class="todo-week-empty">无待办</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredTodos.length === 0" class="empty-state">
      <div class="empty-icon"><Icon name="list" :size="14" /></div>
      <div class="empty-text">暂无匹配的待办事项</div>
      <div class="empty-sub">尝试调整筛选条件或添加新任务</div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingTodo ? '编辑任务' : '新建任务' }}</h3>
            <button class="modal-close" @click="closeModal"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>任务标题 *</label>
                <input v-model="form.title" type="text" class="form-input" placeholder="输入任务标题..." />
              </div>
              <div class="form-group full-width">
                <label>任务描述</label>
                <textarea v-model="form.notes" class="form-textarea" rows="3" placeholder="输入描述..."></textarea>
              </div>
              <div class="form-group">
                <label>优先级</label>
                <select v-model="form.priority" class="form-select">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div class="form-group">
                <label>状态</label>
                <select v-model="form.status" class="form-select">
                  <option value="pending">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div class="form-group">
                <label>计划开始日期</label>
                <input v-model="form.startDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>截止日期</label>
                <input v-model="form.dueDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>自定义标签</label>
                <input v-model="form.tag" type="text" class="form-input" placeholder="如：工作、学习" />
              </div>
              <div class="form-group">
                <label>提前提醒</label>
                <select v-model="form.reminder" class="form-select">
                  <option value="不提醒">不提醒</option>
                  <option value="提前1天">提前1天</option>
                  <option value="提前2天">提前2天</option>
                  <option value="提前3天">提前3天</option>
                  <option value="提前1周">提前1周</option>
                </select>
              </div>
              <div class="form-group">
                <label>重复</label>
                <select v-model="form.repeat" class="form-select">
                  <option value="none">不重复</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="yearly">每年</option>
                </select>
              </div>
              <div class="form-group">
                <label>完成度 (%)</label>
                <input v-model.number="form.progress" type="number" min="0" max="100" class="form-input" />
              </div>
              <div class="form-group">
                <label>备注</label>
                <input v-model="form.remark" type="text" class="form-input" placeholder="输入备注..." />
              </div>
              <div class="form-group full-width">
                <label>子任务</label>
                <div class="subtask-editor">
                  <div v-for="(sub, idx) in form.subtasks" :key="idx" class="subtask-edit-row">
                    <span class="subtask-check-edit" @click="sub.completed = !sub.completed">{{ sub.completed ? '[√]' : '[□]' }}</span>
                    <input v-model="sub.title" type="text" class="form-input subtask-input" />
                    <button class="action-btn danger" @click="form.subtasks.splice(idx, 1)"><Icon name="close" :size="14" /></button>
                  </div>
                  <div class="subtask-add-row">
                    <input v-model="newSubtaskTitle" type="text" class="form-input" placeholder="添加子任务..." @keyup.enter="addSubtask" />
                    <button class="btn btn-ghost btn-sm" @click="addSubtask">+ 添加</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModal">取消</button>
            <button class="btn btn-primary" @click="saveTodo">{{ editingTodo ? '保存修改' : '创建任务' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px"><Icon name="warning" :size="14" /></div>
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmAction">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useSessionStore } from '@/stores/session'


const todoStore = useTodoStore()
const sessionStore = useSessionStore()

const canManage = !['查看者'].includes(sessionStore.currentRole)

const currentView = ref('table')
const searchText = ref('')
const filterStatus = ref('all')
const filterPriority = ref('all')
const filterTag = ref('all')
const sortField = ref('priority')
const sortDir = ref('asc')
const selectedIds = ref([])
const showModal = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const editingTodo = ref(null)
const newSubtaskTitle = ref('')
const inlineEdit = ref({ id: null, field: null, value: '' })

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})

const columnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'idx', label: '#' },
  { key: 'title', label: '任务标题' },
  { key: 'desc', label: '描述' },
  { key: 'priority', label: '优先级' },
  { key: 'tag', label: '标签' },
  { key: 'startDate', label: '计划开始' },
  { key: 'dueDate', label: '截止日期' },
  { key: 'reminder', label: '提前提醒' },
  { key: 'status', label: '状态' },
  { key: 'remain', label: '剩余' },
  { key: 'reminderStatus', label: '提醒状态' },
  { key: 'remark', label: '备注' },
  { key: 'actions', label: '操作', hideable: false }
]

const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions').map(c => [c.key, true])))
const visibleColCount = computed(() => columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions' && columnVisible.value[c.key]).length)

function toggleColumnConfig(e) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}

const viewModes = [
  { key: 'table', icon: 'chart', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const calMonthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const weekDayNames = ['周一','周二','周三','周四','周五','周六','周日']

const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth())

const weekStart = ref(getWeekStart(now))

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateStr(y, m, d) {
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
}

const calDays = computed(() => {
  const year = calYear.value
  const month = calMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')

  const todosByDate = {}
  for (const t of filteredTodos.value) {
    const dateKey = t.dueDate || t.startDate
    if (!dateKey) continue
    if (!todosByDate[dateKey]) todosByDate[dateKey] = []
    todosByDate[dateKey].push(t)
  }

  const days = []
  for (let i = 0; i < 42; i++) {
    let dayNum, dateStr, currentMonth = true
    if (i < startWeekday) {
      dayNum = prevMonthLastDay - startWeekday + i + 1
      const pm = month === 0 ? 11 : month - 1
      const py = month === 0 ? year - 1 : year
      dateStr = formatDateStr(py, pm, dayNum)
      currentMonth = false
    } else if (i - startWeekday >= daysInMonth) {
      dayNum = i - startWeekday - daysInMonth + 1
      const nm = month === 11 ? 0 : month + 1
      const ny = month === 11 ? year + 1 : year
      dateStr = formatDateStr(ny, nm, dayNum)
      currentMonth = false
    } else {
      dayNum = i - startWeekday + 1
      dateStr = formatDateStr(year, month, dayNum)
    }
    days.push({
      key: dateStr,
      day: dayNum,
      dateStr,
      currentMonth,
      isToday: dateStr === todayStr,
      items: todosByDate[dateStr] || []
    })
  }
  return days
})

function calPrev() {
  calMonth.value--
  if (calMonth.value < 0) { calMonth.value = 11; calYear.value-- }
}
function calNext() {
  calMonth.value++
  if (calMonth.value > 11) { calMonth.value = 0; calYear.value++ }
}
function calToday() {
  const n = new Date()
  calYear.value = n.getFullYear()
  calMonth.value = n.getMonth()
}

const weekDays = computed(() => {
  const ws = new Date(weekStart.value)
  const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws)
    d.setDate(d.getDate() + i)
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    result.push({
      date: d,
      dateStr,
      dayNum: d.getDate(),
      isToday: dateStr === todayStr
    })
  }
  return result
})

const weekTitle = computed(() => {
  const ws = new Date(weekStart.value)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  return ws.getFullYear() + '年 ' + (ws.getMonth() + 1) + '月' + ws.getDate() + '日 — ' + (we.getMonth() + 1) + '月' + we.getDate() + '日'
})

const weekTodosByDate = computed(() => {
  const map = {}
  for (const t of filteredTodos.value) {
    const dateKey = t.dueDate || t.startDate
    if (!dateKey) continue
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey].push(t)
  }
  return map
})

function getWeekDayItems(dateStr) {
  return weekTodosByDate.value[dateStr] || []
}

function weekPrev() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() - 7)
  weekStart.value = d
}
function weekNext() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 7)
  weekStart.value = d
}
function weekToday() {
  weekStart.value = getWeekStart(new Date())
}

const defaultForm = () => ({
  title: '',
  notes: '',
  priority: 'medium',
  status: 'pending',
  startDate: '',
  dueDate: '',
  tag: '',
  reminder: '不提醒',
  repeat: 'none',
  progress: 0,
  remark: '',
  subtasks: []
})

const form = reactive(defaultForm())

const filteredTodos = computed(() => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let list = [...todoStore.allTodos]

  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(t =>
      [t.title, t.notes, t.remark, t.tag].join(' ').toLowerCase().includes(q)
    )
  }

  list = list.filter(t => {
    if (filterStatus.value === 'pending' && (t.status === 'completed' || (t.dueDate && t.dueDate < today && t.status !== 'completed'))) return false
    if (filterStatus.value === 'overdue' && (t.status === 'completed' || !t.dueDate || t.dueDate >= today)) return false
    if (filterStatus.value === 'completed' && t.status !== 'completed') return false
    if (filterPriority.value !== 'all' && t.priority !== filterPriority.value) return false
    if (filterTag.value !== 'all' && (t.tag || '') !== filterTag.value) return false
    return true
  })

  const prioOrder = { high: 0, medium: 1, low: 2 }
  list.sort((a, b) => {
    let va, vb
    switch (sortField.value) {
      case 'priority': va = prioOrder[a.priority] ?? 3; vb = prioOrder[b.priority] ?? 3; break
      case 'dueDate': va = a.dueDate || '9999'; vb = b.dueDate || '9999'; break
      case 'progress': va = a.progress || 0; vb = b.progress || 0; break
      case 'remainDays': va = getRemainDays(a); vb = getRemainDays(b); break
      case 'createdAt': va = a.createdAt || ''; vb = b.createdAt || ''; break
      default: va = prioOrder[a.priority] ?? 3; vb = prioOrder[b.priority] ?? 3
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return 0
  })

  return list
})

const isAllSelected = computed(() => {
  return filteredTodos.value.length > 0 && filteredTodos.value.every(t => selectedIds.value.includes(t.id))
})

function isCompleted(t) { return t.status === 'completed' }
function isOverdue(t) { return !isCompleted(t) && t.dueDate && t.dueDate < todoStore.today }

function prioLabel(p) { return { high: '高', medium: '中', low: '低' }[p] || '中' }

function getStatusClass(t) {
  if (isCompleted(t)) return 'completed'
  if (isOverdue(t)) return 'overdue'
  return 'pending'
}

function getStatusLabel(t) {
  if (isCompleted(t)) return '已完成'
  if (isOverdue(t)) return '已逾期'
  return '进行中'
}

function getProgress(t) {
  return t.progress !== undefined ? t.progress : (isCompleted(t) ? 100 : 0)
}

function getProgressClass(t) {
  const p = getProgress(t)
  if (p >= 100) return 'done'
  if (p >= 60) return 'high'
  if (p >= 30) return 'mid'
  return 'low'
}

function getRemainDays(t) {
  if (!t.dueDate) return 9999
  return Math.ceil((new Date(t.dueDate) - new Date()) / 86400000)
}

function getRemainText(t) {
  const d = getRemainDays(t)
  if (!t.dueDate) return '-'
  if (d < 0) return '逾期' + Math.abs(d) + '天'
  if (d === 0) return '今天到期'
  return d + '天后'
}

function getRemainClass(t) {
  const d = getRemainDays(t)
  if (!t.dueDate) return 'safe'
  if (d < 0) return 'overdue'
  if (d <= 3) return 'urgent'
  if (d <= 7) return 'normal'
  return 'safe'
}

function getReminderStatus(t) {
  if (isCompleted(t)) return '已完成'
  if (!t.dueDate) return '-'
  const d = getRemainDays(t)
  if (d < 0) return '已逾期' + Math.abs(d) + '天'
  if (d === 0) return '今天到期'
  if (d <= 3) return '即将到期'
  return '正常'
}

function getReminderStatusClass(t) {
  if (isCompleted(t)) return 'done'
  if (!t.dueDate) return 'normal'
  const d = getRemainDays(t)
  if (d < 0) return 'danger'
  if (d <= 3) return 'warning'
  return 'normal'
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredTodos.value.map(t => t.id)
  }
}

function handleToggle(t) {
  todoStore.toggleTodo(t.id, t.auto || false)
}

function handleDelete(t) {
  confirmMessage.value = `确定要删除待办事项"${t.title}"吗？`
  confirmCallback.value = () => todoStore.deleteTodo(t.id)
  showConfirm.value = true
}

function confirmAction() {
  if (confirmCallback.value) confirmCallback.value()
  showConfirm.value = false
}

function handleBatchComplete() {
  todoStore.batchComplete(selectedIds.value)
  selectedIds.value = []
}

function handleBatchDelete() {
  confirmMessage.value = `确定要删除选中的 ${selectedIds.value.length} 条待办吗？`
  confirmCallback.value = () => {
    todoStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
  showConfirm.value = true
}

function confirmClearCompleted() {
  confirmMessage.value = `确定要清除所有已完成的待办吗？`
  confirmCallback.value = () => todoStore.clearCompleted()
  showConfirm.value = true
}

function handleExport() {
  const data = filteredTodos.value.map(t => ({
    标题: t.title,
    描述: t.notes,
    优先级: prioLabel(t.priority),
    状态: getStatusLabel(t),
    标签: t.tag || '',
    截止日期: t.dueDate || '',
    完成度: getProgress(t) + '%',
    备注: t.remark || ''
  }))
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `待办事项_${todoStore.today}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function openAddModal() {
  editingTodo.value = null
  Object.assign(form, defaultForm())
  form.dueDate = todoStore.today
  showModal.value = true
}

function openEditModal(t) {
  if (t.auto) return
  editingTodo.value = t
  Object.assign(form, {
    title: t.title || '',
    notes: t.notes || '',
    priority: t.priority || 'medium',
    status: t.status || 'pending',
    startDate: t.startDate || '',
    dueDate: t.dueDate || '',
    tag: t.tag || '',
    reminder: t.reminder || '不提醒',
    repeat: t.repeat || 'none',
    progress: t.progress || 0,
    remark: t.remark || '',
    subtasks: (t.subtasks || []).map(s => ({ ...s }))
  })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingTodo.value = null
}

function addSubtask() {
  if (!newSubtaskTitle.value.trim()) return
  form.subtasks.push({ id: 'sub_' + Date.now(), title: newSubtaskTitle.value.trim(), completed: false })
  newSubtaskTitle.value = ''
}

function saveTodo() {
  if (!form.title.trim()) return
  if (editingTodo.value) {
    todoStore.updateTodo(editingTodo.value.id, { ...form })
  } else {
    todoStore.addTodo({ ...form })
  }
  closeModal()
}

function startInlineEdit(todo, field) {
  if (todo.auto) return
  inlineEdit.value = { id: todo.id, field, value: String(todo[field] ?? '') }
}

function isInlineEditing(todoId, field) {
  return inlineEdit.value.id === todoId && inlineEdit.value.field === field
}

function confirmInlineEdit(todo) {
  const { field, value } = inlineEdit.value
  if (!field) return
  if (field === 'title' && !value.trim()) {
    cancelInlineEdit()
    return
  }
  todoStore.updateTodo(todo.id, { [field]: value })
  inlineEdit.value = { id: null, field: null, value: '' }
}

function cancelInlineEdit() {
  inlineEdit.value = { id: null, field: null, value: '' }
}

function onInlineKeydown(e, todo) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmInlineEdit(todo)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelInlineEdit()
  }
}

const reminderOptions = ['不提醒', '提前1天', '提前2天', '提前3天', '提前1周']

function handleClickOutside(e) {
  if (!e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
}
function handleResize() {
  showColumnConfig.value = false
}
function handleScroll() {
  showColumnConfig.value = false
}

onMounted(() => {
  todoStore.initSeedData()
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
.todo-page { }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); border-right: 1px solid var(--color-border); }
.view-btn:last-child { border-right: none; }
.view-btn:hover { background: var(--color-surface-hover); }
.view-btn.active { background: var(--color-accent-subtle); color: var(--color-accent); }

.todo-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.todo-search { display: flex; align-items: center; gap: var(--space-2); background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-1) var(--space-3); flex: 1; min-width: 200px; }
.todo-search:focus-within { border-color: var(--color-accent); }
.search-icon { font-size: 14px; color: var(--color-text-tertiary); }
.search-input { background: transparent; border: none; outline: none; color: var(--color-text-primary); font-size: var(--font-size-sm); width: 100%; }
.search-input::placeholder { color: var(--color-text-tertiary); }
.todo-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { width: auto; min-width: 100px; }

.todo-stats-bar { display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex-wrap: wrap; }
.stat-item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.pending { background: var(--color-warning); }
.stat-dot.overdue { background: var(--color-danger); }
.stat-dot.completed { background: var(--color-success); }
.stat-actions { margin-left: auto; display: flex; gap: var(--space-2); }

.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-accent-subtle); border-radius: var(--radius-md); margin-bottom: var(--space-3); font-size: var(--font-size-sm); color: var(--color-accent); }

.no-padding { padding: 0 !important; }
.table-container { overflow-x: auto; }

.todo-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.todo-table th { text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--color-text-tertiary); border-bottom: 2px solid var(--color-border); text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
.todo-table td { padding: 12px 16px; font-size: 14px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.todo-table tr:hover td { background: var(--color-surface-hover); }
.todo-table tr.completed-row td { opacity: 0.5; }
.todo-table tr.completed-row .col-title { text-decoration: line-through; }

.col-check { width: 44px; text-align: center; }
.col-idx { width: 44px; text-align: center; }
.col-title { min-width: 220px; }
.col-desc { min-width: 160px; max-width: 240px; }
.col-priority { width: 80px; text-align: center; }
.col-tag { width: 100px; }
.col-date { width: 110px; }
.col-status { width: 90px; text-align: center; }
.col-remain { width: 80px; text-align: center; }
.col-reminder { width: 90px; text-align: center; }
.col-reminder-status { width: 100px; text-align: center; }
.col-remark { min-width: 140px; max-width: 180px; }
.col-actions { width: 130px; }

.title-cell { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.desc-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; color: var(--color-text-tertiary); }

.checkbox { width: 18px; height: 18px; border: 2px solid var(--color-border-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all var(--transition-fast); flex-shrink: 0; }
.checkbox:hover { border-color: var(--color-accent); }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

.priority-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600; }
.p-high { background: var(--color-danger-subtle); color: var(--color-danger); }
.p-medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.p-low { background: var(--color-info-subtle); color: var(--color-info); }

.tag-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600; background: var(--color-purple-subtle); color: var(--color-purple); }

.status-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600; }
.s-completed { background: var(--color-success-subtle); color: var(--color-success); }
.s-overdue { background: var(--color-danger-subtle); color: var(--color-danger); }
.s-pending { background: var(--color-info-subtle); color: var(--color-info); }

.repeat-badge { font-size: 12px; }
.auto-badge { font-size: 11px; padding: 1px 6px; border-radius: var(--radius-full); background: var(--color-accent-subtle); color: var(--color-accent); }
.subtask-count { font-size: 12px; color: var(--color-text-tertiary); }

.remain-badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.remain-badge.overdue { background: var(--color-danger-subtle); color: var(--color-danger); }
.remain-badge.urgent { background: var(--color-warning-subtle); color: var(--color-warning); }
.remain-badge.normal { background: var(--color-info-subtle); color: var(--color-info); }
.remain-badge.safe { background: var(--color-success-subtle); color: var(--color-success); }

.reminder-status-badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.reminder-status-badge.danger { background: var(--color-danger-subtle); color: var(--color-danger); }
.reminder-status-badge.warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.reminder-status-badge.done { background: var(--color-success-subtle); color: var(--color-success); }
.reminder-status-badge.normal { color: var(--color-text-tertiary); }

.remark-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; color: var(--color-text-tertiary); }

.action-btn { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: var(--radius-sm); transition: all var(--transition-fast); }
.action-btn:hover { background: var(--color-surface-hover); }
.action-btn.danger:hover { background: var(--color-danger-subtle); }

.action-btn-sm { height: 28px; padding: 0 6px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all var(--transition-fast); font-size: var(--font-size-xs); white-space: nowrap; }
.action-btn-sm:hover { background: var(--color-surface-hover); color: var(--color-accent); }
.action-btn-sm.danger:hover { background: var(--color-danger-subtle); color: var(--color-danger); }

.inline-input { width: 100%; padding: 4px 8px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); }
.inline-select { width: 100%; padding: 4px 6px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); cursor: pointer; }
.col-title, .col-desc, .col-priority, .col-tag, .col-date, .col-reminder, .col-remark { cursor: pointer; }

.text-muted { color: var(--color-text-tertiary); }

/* 列表视图 */
.todo-list-view { display: flex; flex-direction: column; gap: var(--space-2); }
.list-row { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: all var(--transition-fast); border-left: 3px solid transparent; }
.list-row:hover { border-color: var(--color-border-light); }
.list-row.prio-high { border-left-color: var(--color-danger); }
.list-row.prio-medium { border-left-color: var(--color-warning); }
.list-row.prio-low { border-left-color: var(--color-info); }
.list-row.completed-row { opacity: 0.5; }
.list-row.completed-row .list-title { text-decoration: line-through; }
.list-check { padding-top: 2px; }
.list-body { flex: 1; min-width: 0; }
.list-title { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-primary); }
.list-notes { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; }
.list-meta { display: flex; gap: var(--space-2); align-items: center; margin-top: var(--space-1); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.meta-date, .meta-progress, .meta-sub { font-size: 10px; }
.list-right { display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-2); }
.list-actions { display: flex; gap: var(--space-1); }

/* 卡片视图 */
.todo-card-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4); }
.todo-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: all var(--transition-fast); }
.todo-card:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); }
.todo-card.completed-card { opacity: 0.5; }
.card-prio-bar { height: 3px; }
.card-prio-bar.prio-high { background: var(--color-danger); }
.card-prio-bar.prio-medium { background: var(--color-warning); }
.card-prio-bar.prio-low { background: var(--color-info); }
.card-header { display: flex; align-items: flex-start; gap: var(--space-2); padding: var(--space-3) var(--space-4) 0; }
.card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); flex: 1; }
.card-desc { font-size: var(--font-size-xs); color: var(--color-text-tertiary); padding: var(--space-1) var(--space-4) 0; }
.card-subtasks { padding: var(--space-2) var(--space-4) 0; }
.subtask-header { font-size: 10px; color: var(--color-text-tertiary); margin-bottom: var(--space-1); }
.subtask-item { font-size: var(--font-size-xs); color: var(--color-text-secondary); padding: 2px 0; display: flex; align-items: center; gap: var(--space-1); }
.subtask-item.completed { text-decoration: line-through; opacity: 0.5; }
.subtask-check { cursor: pointer; }
.card-tags { display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-4) 0; flex-wrap: wrap; }
.card-info { padding: var(--space-2) var(--space-4) 0; }
.info-item { font-size: var(--font-size-xs); color: var(--color-text-tertiary); padding: 1px 0; }
.card-progress { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); }
.card-footer { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-4) var(--space-3); }
.card-actions { display: flex; gap: var(--space-1); }

/* 日历视图 */
.todo-calendar-view { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }
.todo-calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.todo-calendar-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary); }
.todo-calendar-nav { display: flex; gap: var(--space-2); }
.todo-calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--color-border); }
.todo-calendar-weekday { text-align: center; padding: var(--space-2); font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-tertiary); }
.todo-calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); }
.todo-calendar-day { min-height: 90px; border: 1px solid var(--color-border); border-top: none; border-left: none; padding: var(--space-1); }
.todo-calendar-day:nth-child(7n) { border-right: none; }
.todo-calendar-day.other-month { background: var(--color-bg-tertiary); }
.todo-calendar-day.today { background: var(--color-accent-subtle); }
.todo-calendar-day-num { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); margin-bottom: 2px; }
.todo-calendar-day.today .todo-calendar-day-num { color: var(--color-accent); }
.todo-calendar-day-items { display: flex; flex-direction: column; gap: 1px; }
.todo-calendar-item { font-size: 9px; padding: 1px 4px; border-radius: 2px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.todo-calendar-item.high { background: var(--color-danger-subtle); color: var(--color-danger); }
.todo-calendar-item.medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.todo-calendar-item.low { background: var(--color-info-subtle); color: var(--color-info); }
.todo-calendar-item.completed { background: var(--color-success-subtle); color: var(--color-success); text-decoration: line-through; }
.todo-calendar-more { font-size: 9px; color: var(--color-text-tertiary); padding: 1px 4px; }

/* 周视图 */
.todo-week-view { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); }
.todo-week-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.todo-week-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary); }
.todo-week-nav { display: flex; gap: var(--space-2); }
.todo-week-day-columns { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.todo-week-day-col { background: var(--color-bg-primary); min-height: 120px; display: flex; flex-direction: column; }
.todo-week-day-header { padding: var(--space-2) var(--space-3); font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); background: var(--color-surface); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; gap: var(--space-1); }
.todo-week-day-header.today { color: var(--color-accent); background: var(--color-accent-subtle); }
.todo-week-day-header .day-num { font-size: var(--font-size-sm); }
.todo-week-day-items { flex: 1; padding: var(--space-1); display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.todo-week-item { font-size: 10px; padding: 3px 6px; border-radius: var(--radius-sm); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: var(--space-1); }
.todo-week-item-title { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.todo-week-item-due { font-size: 9px; opacity: 0.7; flex-shrink: 0; }
.todo-week-item.high { background: var(--color-danger-subtle); color: var(--color-danger); }
.todo-week-item.medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.todo-week-item.low { background: var(--color-info-subtle); color: var(--color-info); }
.todo-week-item.completed { background: var(--color-success-subtle); color: var(--color-success); text-decoration: line-through; }
.todo-week-empty { font-size: 10px; color: var(--color-text-tertiary); text-align: center; padding: var(--space-4) 0; }

/* 空状态 */
.empty-state { text-align: center; padding: var(--space-16) 0; }
.empty-icon { font-size: 48px; margin-bottom: var(--space-4); }
.empty-text { font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: var(--space-2); }
.empty-sub { color: var(--color-text-tertiary); font-size: var(--font-size-sm); }

/* 弹窗 */
.modal-overlay { animation: fade-in 200ms ease; }
.modal-dialog { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slide-up 200ms ease; }
.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); }
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
.form-textarea { padding: var(--space-2) var(--space-3); background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); font-size: var(--font-size-sm); resize: vertical; outline: none; }
.form-textarea:focus { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-subtle); }

.subtask-editor { display: flex; flex-direction: column; gap: var(--space-2); }
.subtask-edit-row { display: flex; align-items: center; gap: var(--space-2); }
.subtask-check-edit { cursor: pointer; font-size: 14px; }
.subtask-input { flex: 1; }
.subtask-add-row { display: flex; gap: var(--space-2); }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1024px) {
  .form-grid { grid-template-columns: repeat(2, 1fr); }
  .todo-card-view { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .todo-card-view { grid-template-columns: 1fr; }
  .page-header-actions { flex-direction: column; align-items: flex-start; }
}

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
</style>
