<template>
  <div class="todo-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">寰呭姙浜嬮」绠＄悊</h2>
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
          >
            <Icon :name="v.icon" :size="14" />
            {{ v.label }}
          </button>
        </div>
        <button v-if="canManage" class="btn btn-primary" @click="openAddModal">鏂板缓浠诲姟</button>
        <button
          v-if="canManage"
          class="btn btn-outline"
          :disabled="selectedIds.length === 0"
          @click="handleBatchComplete"
        >
          <Icon name="check" :size="14" />
          鎵归噺瀹屾垚
        </button>
        <button
          v-if="canManage"
          class="btn btn-outline btn-danger"
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >
          <Icon name="delete" :size="14" />
          鎵归噺鍒犻櫎
        </button>
        <button class="btn btn-outline" @click="handleExport">
          <Icon name="upload" :size="14" />
          瀵煎嚭
        </button>
      </div>
    </div>

    <div class="todo-quick-stats">
      <div v-for="stat in quickStats" :key="stat.label" class="todo-quick-stat" :class="stat.tone">
        <span class="todo-quick-stat-value">{{ stat.value }}</span>
        <span class="todo-quick-stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <div class="todo-toolbar">
      <div class="todo-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input v-model="searchText" type="text" class="search-input" placeholder="鎼滅储浠诲姟鏍囬銆佹弿杩般€佸娉?.." />
      </div>
      <div class="todo-filters">
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="all">全部状态</option>
          <option value="pending">进行中</option>
          <option value="overdue">宸查€炬湡</option>
          <option value="completed">已完成</option>
        </select>
        <select v-model="filterPriority" class="form-select filter-select">
          <option value="all">全部优先级</option>
          <option value="high">楂樹紭鍏堢骇</option>
          <option value="medium">涓紭鍏堢骇</option>
          <option value="low">浣庝紭鍏堢骇</option>
        </select>
        <select v-model="filterTag" class="form-select filter-select">
          <option value="all">全部标签</option>
          <option v-for="tag in todoStore.allTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="priority">鎸変紭鍏堢骇</option>
          <option value="dueDate">按截止日期</option>
          <option value="progress">鎸夊畬鎴愬害</option>
          <option value="remainDays">按剩余天数</option>
          <option value="createdAt">按创建时间</option>
        </select>
        <button
          class="btn btn-ghost btn-sm"
          :title="sortDir === 'asc' ? '鍗囧簭' : '闄嶅簭'"
          @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
        >
          <Icon :name="sortDir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="14" />
        </button>
      </div>
    </div>

    <div class="todo-source-legend">
      <span v-for="(label, key) in sourceGroupLabels" :key="key" class="source-legend-item">
        <span class="source-legend-dot" :class="'group-' + key"></span>
        {{ label }}
      </span>
    </div>

    <div class="column-config-wrapper" style="margin-bottom: var(--space-3)">
      <button class="btn btn-outline" @click="toggleColumnConfig">
        <Icon name="setting" :size="14" />
        鍒?
      </button>
      <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
        <label
          v-for="col in columnDefs.filter((c) => c.key !== 'check' && c.key !== 'actions')"
          :key="col.key"
          class="column-config-item"
        >
          <input v-model="columnVisible[col.key]" type="checkbox" />
          {{ col.label }}
        </label>
      </div>
    </div>

    <!-- 澧炲己缁熻鏍?-->
    <div class="todo-stats-bar">
      <div class="stats-ring-section">
        <svg width="56" height="56" viewBox="0 0 56 56" class="stats-ring-svg">
          <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-border)" stroke-width="4" />
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            :stroke="completionColor"
            stroke-width="4"
            stroke-linecap="round"
            :stroke-dasharray="completionDash"
            stroke-dashoffset="0"
            transform="rotate(-90 28 28)"
            class="stats-ring-progress"
          />
        </svg>
        <div class="stats-ring-text">
          <span class="stats-ring-percent" :style="{ color: completionColor }">{{ completionPercent }}%</span>
          <span class="stats-ring-label">完成率</span>
        </div>
      </div>
      <div class="stats-items">
        <div class="stat-item">
          <span class="stat-dot total"></span>
          <span class="stat-num">{{ todoStore.stats.total }}</span>
          <span class="stat-label">鎬昏</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot pending"></span>
          <span class="stat-num">{{ todoStore.stats.pending }}</span>
          <span class="stat-label">进行中</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot overdue"></span>
          <span class="stat-num">{{ todoStore.stats.overdue }}</span>
          <span class="stat-label">閫炬湡</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot completed"></span>
          <span class="stat-num">{{ todoStore.stats.completed }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>
      <div class="stat-actions">
        <button class="btn btn-ghost btn-sm" @click="todoStore.completeAll()">鍏ㄩ儴瀹屾垚</button>
        <button class="btn btn-ghost btn-sm" @click="confirmClearCompleted">娓呴櫎宸插畬鎴�</button>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>宸查€?{{ selectedIds.length }} 椤?/span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">鍙栨秷閫夋嫨</button>
    </div>

    <!-- 琛ㄦ牸瑙嗗浘 -->
    <div v-if="currentView === 'table'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="todo-table">
            <thead>
              <tr>
                <th class="col-check">
                  <div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">[鈭歖</div>
                </th>
                <th v-if="columnVisible.idx" class="col-idx" style="width: 50px; text-align: center">搴忓彿</th>
                <th v-if="columnVisible.title" class="col-title">浠诲姟鏍囬</th>
                <th v-if="columnVisible.desc" class="col-desc">鎻忚堪</th>
                <th v-if="columnVisible.priority" class="col-priority">浼樺厛绾?/th>
                <th v-if="columnVisible.tag" class="col-tag">鏍囩</th>
                <th v-if="columnVisible.startDate" class="col-date">璁″垝寮€濮?/th>
                <th v-if="columnVisible.dueDate" class="col-date">鎴鏃ユ湡</th>
                <th v-if="columnVisible.reminder" class="col-reminder">鎻愬墠鎻愰啋</th>
                <th v-if="columnVisible.status" class="col-status">鐘舵€?/th>
                <th v-if="columnVisible.remain" class="col-remain">鍓╀綑</th>
                <th v-if="columnVisible.reminderStatus" class="col-reminder-status">鎻愰啋鐘舵€?/th>
                <th v-if="columnVisible.remark" class="col-remark">澶囨敞</th>
                <th class="col-actions">鎿嶄綔</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(t, idx) in filteredTodos"
                :key="t.id"
                :class="{ 'completed-row': isCompleted(t), 'overdue-row': isOverdue(t) }"
                :style="{ animationDelay: idx * 30 + 'ms' }"
                class="table-row-animated"
              >
                <td class="col-check">
                  <div class="checkbox" :class="{ checked: selectedIds.includes(t.id) }" @click="toggleSelect(t.id)">
                    [鈭歖
                  </div>
                </td>
                <td v-if="columnVisible.idx" class="col-idx" style="text-align: center">
                  <span class="prio-indicator" :class="'prio-' + (t.priority || 'medium')"></span>
                  {{ idx + 1 }}
                </td>
                <td v-if="columnVisible.title" class="col-title" @dblclick="startInlineEdit(t, 'title')">
                  <div v-if="!isInlineEditing(t.id, 'title')" class="title-cell">
                    {{ t.title }}
                    <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge">
                      <Icon name="refresh" :size="14" />
                    </span>
                    <span v-if="t.subtasks && t.subtasks.length > 0" class="subtask-count">
                      <Icon name="list" :size="14" />
                      {{ t.subtasks.filter((s) => s.completed).length }}/{{ t.subtasks.length }}
                    </span>
                    <span v-if="t.auto" class="auto-badge">鑷姩</span>
                  </div>
                  <input
                    v-else
                    ref="inlineTitleRef"
                    v-model="inlineEdit.value"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td v-if="columnVisible.desc" class="col-desc" @dblclick="startInlineEdit(t, 'notes')">
                  <div v-if="!isInlineEditing(t.id, 'notes')" class="desc-cell">{{ t.notes || '-' }}</div>
                  <input
                    v-else
                    v-model="inlineEdit.value"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td v-if="columnVisible.priority" class="col-priority" @dblclick="startInlineEdit(t, 'priority')">
                  <span
                    v-if="!isInlineEditing(t.id, 'priority')"
                    class="priority-badge"
                    :class="'p-' + (t.priority || 'medium')"
                  >
                    {{ prioLabel(t.priority) }}
                  </span>
                  <select
                    v-else
                    v-model="inlineEdit.value"
                    class="inline-select"
                    @change="confirmInlineEdit(t)"
                    @blur="confirmInlineEdit(t)"
                    @keydown="onInlineKeydown($event, t)"
                  >
                    <option value="high">楂?/option>
                    <option value="medium">涓?/option>
                    <option value="low">浣?/option>
                  </select>
                </td>
                <td v-if="columnVisible.tag" class="col-tag" @dblclick="startInlineEdit(t, 'tag')">
                  <span
                    v-if="!isInlineEditing(t.id, 'tag')"
                    v-bind="t.tag ? { class: 'tag-badge' } : { class: 'text-muted' }"
                  >
                    {{ t.tag || '-' }}
                  </span>
                  <input
                    v-else
                    v-model="inlineEdit.value"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td v-if="columnVisible.startDate" class="col-date" @dblclick="startInlineEdit(t, 'startDate')">
                  <span v-if="!isInlineEditing(t.id, 'startDate')">{{ t.startDate || '-' }}</span>
                  <input
                    v-else
                    v-model="inlineEdit.value"
                    type="date"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td v-if="columnVisible.dueDate" class="col-date" @dblclick="startInlineEdit(t, 'dueDate')">
                  <span v-if="!isInlineEditing(t.id, 'dueDate')">{{ t.dueDate || '-' }}</span>
                  <input
                    v-else
                    v-model="inlineEdit.value"
                    type="date"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td v-if="columnVisible.reminder" class="col-reminder" @dblclick="startInlineEdit(t, 'reminder')">
                  <span v-if="!isInlineEditing(t.id, 'reminder')">{{ t.reminder || '-' }}</span>
                  <select
                    v-else
                    v-model="inlineEdit.value"
                    class="inline-select"
                    @change="confirmInlineEdit(t)"
                    @blur="confirmInlineEdit(t)"
                    @keydown="onInlineKeydown($event, t)"
                  >
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
                  <span class="reminder-status-badge" :class="getReminderStatusClass(t)">
                    {{ getReminderStatus(t) }}
                  </span>
                </td>
                <td v-if="columnVisible.remark" class="col-remark" @dblclick="startInlineEdit(t, 'remark')">
                  <div v-if="!isInlineEditing(t.id, 'remark')" class="remark-cell">{{ t.remark || '-' }}</div>
                  <input
                    v-else
                    v-model="inlineEdit.value"
                    class="inline-input"
                    @keydown="onInlineKeydown($event, t)"
                    @blur="confirmInlineEdit(t)"
                  />
                </td>
                <td class="col-actions">
                  <button class="action-btn-sm" title="缂栬緫" @click="openEditModal(t)">缂栬緫</button>
                  <button class="action-btn-sm" :title="isCompleted(t) ? '鎭㈠' : '瀹屾垚'" @click="handleToggle(t)">
                    {{ isCompleted(t) ? '鎭㈠' : '瀹屾垚' }}
                  </button>
                  <button
                    v-if="canManage && !t.auto"
                    class="action-btn-sm danger"
                    title="鍒犻櫎"
                    @click="handleDelete(t)"
                  >
                    鍒犻櫎
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 鍒楄〃瑙嗗浘 -->
    <div v-if="currentView === 'list'" class="todo-list-view">
      <div
        v-for="(t, idx) in filteredTodos"
        :key="t.id"
        class="list-row"
        :class="{ 'completed-row': isCompleted(t), ['prio-' + (t.priority || 'medium')]: true }"
        :style="{ animationDelay: idx * 50 + 'ms' }"
      >
        <div class="list-check">
          <div class="checkbox" :class="{ checked: isCompleted(t) }" @click="handleToggle(t)">[鈭歖</div>
        </div>
        <div class="list-body">
          <div class="list-title">{{ t.title }}</div>
          <div v-if="t.notes" class="list-notes">{{ t.notes }}</div>
          <div class="list-meta">
            <span class="priority-badge" :class="'p-' + (t.priority || 'medium')">{{ prioLabel(t.priority) }}</span>
            <span class="status-badge" :class="'s-' + getStatusClass(t)">{{ getStatusLabel(t) }}</span>
            <span v-if="t.tag" class="tag-badge">{{ t.tag }}</span>
            <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge"><Icon name="refresh" :size="14" /></span>
            <span v-if="t.startDate" class="meta-date">
              <Icon name="calendar" :size="14" />
              寮€濮?{{ t.startDate }}
            </span>
            <span v-if="t.dueDate" class="meta-date">
              <Icon name="bell" :size="14" />
              鎴 {{ t.dueDate }}
            </span>
            <span v-if="t.subtasks && t.subtasks.length > 0" class="meta-sub">
              <Icon name="list" :size="14" />
              {{ t.subtasks.filter((s) => s.completed).length }}/{{ t.subtasks.length }}
            </span>
          </div>
          <div v-if="t.progress > 0 || (t.subtasks && t.subtasks.length > 0)" class="list-progress">
            <div class="progress-bar">
              <div class="progress-fill" :class="getProgressClass(t)" :style="{ width: getProgress(t) + '%' }"></div>
            </div>
            <span class="progress-text">{{ getProgress(t) }}%</span>
          </div>
        </div>
        <div class="list-right">
          <span v-if="t.dueDate" class="remain-badge" :class="getRemainClass(t)">{{ getRemainText(t) }}</span>
          <div class="list-actions">
            <button class="action-btn-sm" @click="openEditModal(t)">缂栬緫</button>
            <button class="action-btn-sm" @click="handleToggle(t)">{{ isCompleted(t) ? '鎭㈠' : '瀹屾垚' }}</button>
            <button v-if="!t.auto" class="action-btn-sm danger" @click="handleDelete(t)">鍒犻櫎</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 鍗＄墖瑙嗗浘 -->
    <div v-if="currentView === 'card'" class="todo-card-view">
      <div
        v-for="(t, idx) in filteredTodos"
        :key="t.id"
        class="todo-card"
        :class="{ 'completed-card': isCompleted(t), 'overdue-card': isOverdue(t) }"
        :style="{ animationDelay: idx * 60 + 'ms' }"
      >
        <div class="card-prio-bar" :class="'prio-' + (t.priority || 'medium')"></div>
        <div class="card-header">
          <div class="checkbox" :class="{ checked: isCompleted(t) }" @click="handleToggle(t)">[鈭歖</div>
          <div class="card-title">{{ t.title }}</div>
          <span v-if="t.auto" class="auto-badge">鑷姩</span>
        </div>
        <div v-if="t.notes" class="card-desc">{{ t.notes }}</div>
        <div v-if="t.subtasks && t.subtasks.length > 0" class="card-subtasks">
          <div class="subtask-header">
            <Icon name="list" :size="14" />
            瀛愪换鍔?{{ t.subtasks.filter((s) => s.completed).length }}/{{ t.subtasks.length }}
          </div>
          <div v-for="sub in t.subtasks" :key="sub.id" class="subtask-item" :class="{ completed: sub.completed }">
            <span class="subtask-check" @click="todoStore.toggleSubtask(t.id, sub.id)">
              {{ sub.completed ? '[鈭歖' : '[鈻' }}
            </span>
            {{ sub.title }}
          </div>
        </div>
        <div class="card-tags">
          <span class="priority-badge" :class="'p-' + (t.priority || 'medium')">{{ prioLabel(t.priority) }}</span>
          <span v-if="t.tag" class="tag-badge">{{ t.tag }}</span>
          <span v-if="t.repeat && t.repeat !== 'none'" class="repeat-badge"><Icon name="refresh" :size="14" /></span>
        </div>
        <div class="card-info">
          <div v-if="t.startDate" class="info-item">
            <Icon name="calendar" :size="14" />
            寮€濮?{{ t.startDate }}
          </div>
          <div v-if="t.dueDate" class="info-item">
            <Icon name="bell" :size="14" />
            鎴 {{ t.dueDate }}
          </div>
          <div v-if="t.reminder && t.reminder !== '不提醒'" class="info-item">[提醒] {{ t.reminder }}</div>
        </div>
        <div class="card-progress">
          <div class="progress-bar">
            <div class="progress-fill" :class="getProgressClass(t)" :style="{ width: getProgress(t) + '%' }"></div>
          </div>
          <span class="progress-text">{{ getProgress(t) }}%</span>
        </div>
        <div class="card-footer">
          <span class="status-badge" :class="'s-' + getStatusClass(t)">{{ getStatusLabel(t) }}</span>
          <span v-if="t.dueDate" class="remain-badge" :class="getRemainClass(t)">{{ getRemainText(t) }}</span>
          <div class="card-actions">
            <button class="action-btn-sm" @click="openEditModal(t)">缂栬緫</button>
            <button class="action-btn-sm" @click="handleToggle(t)">{{ isCompleted(t) ? '鎭㈠' : '瀹屾垚' }}</button>
            <button v-if="!t.auto" class="action-btn-sm danger" @click="handleDelete(t)">鍒犻櫎</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 鏃ュ巻瑙嗗浘 -->
    <div v-if="currentView === 'calendar'" class="todo-calendar-view">
      <div class="todo-calendar-header">
        <div class="todo-calendar-title">{{ calYear }}骞?{{ calMonthNames[calMonth] }}</div>
        <div class="todo-calendar-nav">
          <button class="btn btn-ghost btn-sm" @click="calPrev">
            <Icon name="chevronLeft" :size="14" />
            涓婃湀
          </button>
          <button class="btn btn-ghost btn-sm" @click="calToday">
            <Icon name="checkCircle" :size="14" />
            浠婂ぉ
          </button>
          <button class="btn btn-ghost btn-sm" @click="calNext">
            涓嬫湀
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
      <div class="todo-calendar-weekdays">
        <div v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="todo-calendar-weekday">
          {{ w }}
        </div>
      </div>
      <div class="todo-calendar-days">
        <div
          v-for="day in calDays"
          :key="day.key"
          class="todo-calendar-day"
          :class="{ 'other-month': !day.currentMonth, today: day.isToday }"
        >
          <div class="todo-calendar-day-num" :class="{ 'is-today': day.isToday }">{{ day.day }}</div>
          <div v-if="day.items.length > 0" class="todo-calendar-day-items">
            <div
              v-for="item in day.items.slice(0, 3)"
              :key="item.id"
              class="todo-calendar-item"
              :class="item.status === 'completed' ? 'completed' : item.priority || 'medium'"
              @click="openEditModal(item)"
            >
              {{ item.title }}
            </div>
            <div v-if="day.items.length > 3" class="todo-calendar-more">+{{ day.items.length - 3 }} 鏇村</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 鍛ㄨ鍥?-->
    <div v-if="currentView === 'week'" class="todo-week-view">
      <div class="todo-week-header">
        <div class="todo-week-title">{{ weekTitle }}</div>
        <div class="todo-week-nav">
          <button class="btn btn-ghost btn-sm" @click="weekPrev">
            <Icon name="chevronLeft" :size="14" />
            涓婂懆
          </button>
          <button class="btn btn-ghost btn-sm" @click="weekToday">
            <Icon name="checkCircle" :size="14" />
            鏈懆
          </button>
          <button class="btn btn-ghost btn-sm" @click="weekNext">
            涓嬪懆
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
      <div class="todo-week-day-columns">
        <div v-for="(d, di) in weekDays" :key="di" class="todo-week-day-col" :class="{ 'is-today': d.isToday }">
          <div class="todo-week-day-header" :class="{ today: d.isToday }">
            {{ weekDayNames[di] }}
            <span class="day-num">{{ d.dayNum }}</span>
            <span v-if="getWeekDayItems(d.dateStr).length > 0" class="week-day-count-badge">
              {{ getWeekDayItems(d.dateStr).length }}
            </span>
          </div>
          <div class="todo-week-day-items">
            <div
              v-for="item in getWeekDayItems(d.dateStr)"
              :key="item.id"
              class="todo-week-item"
              :class="item.status === 'completed' ? 'completed' : item.priority || 'medium'"
              @click="openEditModal(item)"
            >
              <span class="week-item-dot" :class="item.priority || 'medium'"></span>
              <span class="todo-week-item-title">{{ item.title }}</span>
              <span v-if="item.dueDate" class="todo-week-item-due">{{ item.dueDate }}</span>
            </div>
            <div v-if="getWeekDayItems(d.dateStr).length === 0" class="todo-week-empty">无待办</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 绌虹姸鎬?-->
    <div v-if="filteredTodos.length === 0" class="empty-state">
      <div class="empty-icon-circle"><Icon name="list" :size="24" /></div>
      <div class="empty-text">暂无匹配的待办事项</div>
      <div class="empty-sub">尝试调整筛选条件或添加新任务</div>
    </div>

    <!-- 鏂板缓/缂栬緫寮圭獥 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingTodo ? '缂栬緫浠诲姟' : '鏂板缓浠诲姟' }}</h3>
            <button class="modal-close" @click="closeModal"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>浠诲姟鏍囬 *</label>
                <input v-model="form.title" type="text" class="form-input" placeholder="杈撳叆浠诲姟鏍囬..." />
              </div>
              <div class="form-group full-width">
                <label>浠诲姟鎻忚堪</label>
                <textarea v-model="form.notes" class="form-textarea" rows="3" placeholder="杈撳叆鎻忚堪..."></textarea>
              </div>
              <div class="form-group">
                <label>浼樺厛绾?/label>
                <select v-model="form.priority" class="form-select">
                  <option value="high">楂?/option>
                  <option value="medium">涓?/option>
                  <option value="low">浣?/option>
                </select>
              </div>
              <div class="form-group">
                <label>鐘舵€?/label>
                <select v-model="form.status" class="form-select">
                  <option value="pending">杩涜涓?/option>
                  <option value="completed">宸插畬鎴?/option>
                </select>
              </div>
              <div class="form-group">
                <label>璁″垝寮€濮嬫棩鏈?/label>
                <input v-model="form.startDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>鎴鏃ユ湡</label>
                <input v-model="form.dueDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>鑷畾涔夋爣绛?/label>
                <input v-model="form.tag" type="text" class="form-input" placeholder="例如：工作、学习" />
              </div>
              <div class="form-group">
                <label>鎻愬墠鎻愰啋</label>
                <select v-model="form.reminder" class="form-select">
                  <option value="不提醒">不提醒</option>
                  <option value="提前1天">提前1天</option>
                  <option value="提前2天">提前2天</option>
                  <option value="提前3天">提前3天</option>
                  <option value="提前1周">提前1周</option>
                </select>
              </div>
              <div class="form-group">
                <label>閲嶅</label>
                <select v-model="form.repeat" class="form-select">
                  <option value="none">涓嶉噸澶?/option>
                  <option value="daily">姣忓ぉ</option>
                  <option value="weekly">姣忓懆</option>
                  <option value="monthly">姣忔湀</option>
                  <option value="yearly">姣忓勾</option>
                </select>
              </div>
              <div class="form-group">
                <label>瀹屾垚搴?(%)</label>
                <input v-model.number="form.progress" type="number" min="0" max="100" class="form-input" />
              </div>
              <div class="form-group">
                <label>澶囨敞</label>
                <input v-model="form.remark" type="text" class="form-input" placeholder="杈撳叆澶囨敞..." />
              </div>
              <div class="form-group full-width">
                <label>瀛愪换鍔?/label>
                <div class="subtask-editor">
                  <div v-for="(sub, idx) in form.subtasks" :key="idx" class="subtask-edit-row">
                    <span class="subtask-check-edit" @click="sub.completed = !sub.completed">
                      {{ sub.completed ? '[鈭歖' : '[鈻' }}
                    </span>
                    <input v-model="sub.title" type="text" class="form-input subtask-input" />
                    <button class="action-btn danger" @click="form.subtasks.splice(idx, 1)">
                      <Icon name="close" :size="14" />
                    </button>
                  </div>
                  <div class="subtask-add-row">
                    <input
                      v-model="newSubtaskTitle"
                      type="text"
                      class="form-input"
                      placeholder="娣诲姞瀛愪换鍔?.."
                      @keyup.enter="addSubtask"
                    />
                    <button class="btn btn-ghost btn-sm" @click="addSubtask">娣诲姞</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModal">鍙栨秷</button>
            <button class="btn btn-primary" @click="saveTodo">{{ editingTodo ? '淇濆瓨淇敼' : '鍒涘缓浠诲姟' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 纭寮圭獥 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align: center; padding: 32px 20px">
            <div class="confirm-icon"><Icon name="warning" :size="28" /></div>
            <div style="font-size: 15px; color: var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">鍙栨秷</button>
            <button class="btn btn-danger" @click="confirmAction">纭鍒犻櫎</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default { name: 'Todos' }
</script>
<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useSessionStore } from '@/stores/session'

const todoStore = useTodoStore()
const sessionStore = useSessionStore()

const canManage = !['查看者'].includes(sessionStore.currentRole)

const currentView = ref('list')
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
  { key: 'title', label: '浠诲姟鏍囬' },
  { key: 'desc', label: '鎻忚堪' },
  { key: 'priority', label: '优先级' },
  { key: 'tag', label: '鏍囩' },
  { key: 'startDate', label: '计划开始' },
  { key: 'dueDate', label: '鎴鏃ユ湡' },
  { key: 'reminder', label: '鎻愬墠鎻愰啋' },
  { key: 'status', label: '状态' },
  { key: 'remain', label: '鍓╀綑' },
  { key: 'reminderStatus', label: '提醒状态' },
  { key: 'remark', label: '澶囨敞' },
  { key: 'actions', label: '鎿嶄綔', hideable: false }
]

const columnVisible = ref(
  Object.fromEntries(columnDefs.filter((c) => c.key !== 'check' && c.key !== 'actions').map((c) => [c.key, true]))
)
function toggleColumnConfig(e) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}

const viewModes = [
  { key: 'table', icon: 'chart', label: '琛ㄦ牸' },
  { key: 'list', icon: 'list', label: '鍒楄〃' },
  { key: 'card', icon: 'card', label: '鍗＄墖' },
  { key: 'calendar', icon: 'calendar', label: '鏃ュ巻' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const calMonthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const weekDayNames = ['鍛ㄤ竴', '鍛ㄤ簩', '鍛ㄤ笁', '鍛ㄥ洓', '鍛ㄤ簲', '鍛ㄥ叚', '鍛ㄦ棩']

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
  const todayStr =
    new Date().getFullYear() +
    '-' +
    String(new Date().getMonth() + 1).padStart(2, '0') +
    '-' +
    String(new Date().getDate()).padStart(2, '0')

  const todosByDate = {}
  for (const t of filteredTodos.value) {
    const dateKey = t.dueDate || t.startDate
    if (!dateKey) continue
    if (!todosByDate[dateKey]) todosByDate[dateKey] = []
    todosByDate[dateKey].push(t)
  }

  const days = []
  for (let i = 0; i < 42; i++) {
    let dayNum,
      dateStr,
      currentMonth = true
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
  if (calMonth.value < 0) {
    calMonth.value = 11
    calYear.value--
  }
}
function calNext() {
  calMonth.value++
  if (calMonth.value > 11) {
    calMonth.value = 0
    calYear.value++
  }
}
function calToday() {
  const n = new Date()
  calYear.value = n.getFullYear()
  calMonth.value = n.getMonth()
}

const weekDays = computed(() => {
  const ws = new Date(weekStart.value)
  const todayStr =
    new Date().getFullYear() +
    '-' +
    String(new Date().getMonth() + 1).padStart(2, '0') +
    '-' +
    String(new Date().getDate()).padStart(2, '0')
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws)
    d.setDate(d.getDate() + i)
    const dateStr =
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
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
  return (
    ws.getFullYear() +
    '年' +
    (ws.getMonth() + 1) +
    '月' +
    ws.getDate() +
    '日 - ' +
    (we.getMonth() + 1) +
    '月' +
    we.getDate() +
    '日'
  )
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

const sourceGroupLabels = {
  workflow: '审批',
  warehouse: '仓储',
  sales: '业务',
  finance: '财务',
  notification: '消息',
  custom: '自定义',
  auto: '自动'
}

const quickStats = computed(() => [
  { label: '待处理', value: todoStore.stats.pending, tone: 'tone-warning' },
  { label: '逾期', value: todoStore.stats.overdue, tone: 'tone-danger' },
  { label: '已完成', value: todoStore.stats.completed, tone: 'tone-success' },
  { label: '自动任务', value: todoStore.stats.auto, tone: 'tone-info' },
])

const filteredTodos = computed(() => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let list = [...todoStore.allTodos]

  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter((t) => [t.title, t.notes, t.remark, t.tag].join(' ').toLowerCase().includes(q))
  }

  list = list.filter((t) => {
    if (
      filterStatus.value === 'pending' &&
      (t.status === 'completed' || (t.dueDate && t.dueDate < today && t.status !== 'completed'))
    )
      return false
    if (filterStatus.value === 'overdue' && (t.status === 'completed' || !t.dueDate || t.dueDate >= today)) return false
    if (filterStatus.value === 'completed' && t.status !== 'completed') return false
    if (filterPriority.value !== 'all' && t.priority !== filterPriority.value) return false
    if (filterTag.value !== 'all' && (t.tag || '') !== filterTag.value) return false
    return true
  })

  const prioOrder = { high: 0, medium: 1, low: 2 }
  const groupOrder = { workflow: 0, sales: 1, finance: 2, warehouse: 3, notification: 4, custom: 5, auto: 6 }
  list.sort((a, b) => {
    const ag = groupOrder[a.sourceGroup] ?? 9
    const bg = groupOrder[b.sourceGroup] ?? 9
    if (ag < bg) return -1
    if (ag > bg) return 1

    let va, vb
    switch (sortField.value) {
      case 'priority':
        va = prioOrder[a.priority] ?? 3
        vb = prioOrder[b.priority] ?? 3
        break
      case 'dueDate':
        va = a.dueDate || '9999'
        vb = b.dueDate || '9999'
        break
      case 'progress':
        va = a.progress || 0
        vb = b.progress || 0
        break
      case 'remainDays':
        va = getRemainDays(a)
        vb = getRemainDays(b)
        break
      case 'createdAt':
        va = a.createdAt || ''
        vb = b.createdAt || ''
        break
      default:
        va = prioOrder[a.priority] ?? 3
        vb = prioOrder[b.priority] ?? 3
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
  return filteredTodos.value.length > 0 && filteredTodos.value.every((t) => selectedIds.value.includes(t.id))
})

/* 瀹屾垚鐜囪繘搴︾幆 */
const CIRCUMFERENCE = 2 * Math.PI * 22
const completionPercent = computed(() => {
  const total = todoStore.stats.total
  if (total === 0) return 0
  return Math.round((todoStore.stats.completed / total) * 100)
})
const completionDash = computed(() => {
  const p = completionPercent.value / 100
  return `${p * CIRCUMFERENCE} ${CIRCUMFERENCE}`
})
const completionColor = computed(() => {
  const p = completionPercent.value
  if (p >= 80) return 'var(--color-success)'
  if (p >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

function isCompleted(t) {
  return t.status === 'completed'
}
function isOverdue(t) {
  return !isCompleted(t) && t.dueDate && t.dueDate < todoStore.today
}

function prioLabel(p) {
  return { high: '高', medium: '中', low: '低' }[p] || '中'
}

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
  return t.progress !== undefined ? t.progress : isCompleted(t) ? 100 : 0
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
  if (d === 0) return '浠婂ぉ鍒版湡'
  return d + '澶╁悗'
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
    selectedIds.value = filteredTodos.value.map((t) => t.id)
  }
}

function handleToggle(t) {
  todoStore.toggleTodo(t.id, t.auto || false)
}

function handleDelete(t) {
  confirmMessage.value = `确定要删除待办事项“${t.title}”吗？`
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
  try {
    const data = filteredTodos.value.map((t) => ({
      title: t.title,
      notes: t.notes,
      priority: prioLabel(t.priority),
      status: getStatusLabel(t),
      tag: t.tag || '',
      dueDate: t.dueDate || '',
      progress: getProgress(t) + '%',
      remark: t.remark || ''
    }))
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `寰呭姙浜嬮」_${todoStore.today}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('瀵煎嚭澶辫触:', e)
    alert('瀵煎嚭澶辫触: ' + e.message)
  }
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
    subtasks: (t.subtasks || []).map((s) => ({ ...s }))
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
.todo-page {
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
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-right: 1px solid var(--color-border);
}
.view-btn:last-child {
  border-right: none;
}
.view-btn:hover {
  background: var(--color-surface-hover);
}
.view-btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.todo-toolbar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.todo-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
  flex: 1;
  min-width: 200px;
}
.todo-search:focus-within {
  border-color: var(--color-accent);
}
.search-icon {
  font-size: 14px;
  color: var(--color-text-tertiary);
}
.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  width: 100%;
}
.search-input::placeholder {
  color: var(--color-text-tertiary);
}
.todo-filters {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.filter-select {
  width: auto;
  min-width: 100px;
}

/* 妗岄潰蹇€熺粺璁?*/
.todo-quick-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.todo-quick-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.todo-quick-stat-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}
.todo-quick-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.todo-quick-stat.tone-warning .todo-quick-stat-value {
  color: var(--color-warning);
}
.todo-quick-stat.tone-danger .todo-quick-stat-value {
  color: var(--color-danger);
}
.todo-quick-stat.tone-success .todo-quick-stat-value {
  color: var(--color-success);
}
.todo-quick-stat.tone-info .todo-quick-stat-value {
  color: var(--color-info);
}

/* 澧炲己缁熻鏍?*/
.todo-source-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.source-legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.source-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.source-legend-dot.group-workflow { background: var(--color-primary); }
.source-legend-dot.group-sales { background: var(--color-success); }
.source-legend-dot.group-finance { background: var(--color-warning); }
.source-legend-dot.group-warehouse { background: var(--color-info); }
.source-legend-dot.group-notification { background: var(--color-danger); }
.source-legend-dot.group-custom { background: var(--color-text-secondary); }
.source-legend-dot.group-auto { background: var(--color-text-tertiary); }

.todo-stats-bar {
  display: flex;
  gap: var(--space-5);
  align-items: center;
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stats-ring-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: var(--space-4);
  border-right: 1px solid var(--color-border);
}

@keyframes ringDraw {
  from {
    stroke-dashoffset: 138.23;
  }
}

.stats-ring-progress {
  animation: ringDraw 1s ease-out;
  transition: stroke-dasharray 0.6s ease;
}

.stats-ring-svg {
  flex-shrink: 0;
}

.stats-ring-text {
  display: flex;
  flex-direction: column;
}

.stats-ring-percent {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}

.stats-ring-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.stats-items {
  display: flex;
  gap: var(--space-5);
  flex: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.stat-dot.total {
  background: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent-subtle);
}
.stat-dot.pending {
  background: var(--color-warning);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.2);
}
.stat-dot.overdue {
  background: var(--color-danger);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.2);
  animation: overduePulse 2s ease-in-out infinite;
}
.stat-dot.completed {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.2);
}

@keyframes overduePulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.2);
  }
  50% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
}

.stat-num {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.stat-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.stat-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}

.no-padding {
  padding: 0 !important;
}
.table-container {
  overflow-x: auto;
}

.todo-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.todo-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  border-bottom: 2px solid var(--color-border);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.todo-table td {
  padding: var(--space-2) var(--space-3);
  font-size: 14px;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.todo-table tr:hover td {
  background: var(--color-surface-hover);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.todo-table tr.completed-row td {
  opacity: 0.5;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.todo-table tr.completed-row .col-title {
  text-decoration: line-through;
}
.todo-table tr.overdue-row td {
  background: rgba(239, 68, 68, 0.03);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* 琛ㄦ牸琛屽叆鍦哄姩鐢?*/
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.table-row-animated {
  animation: rowSlideIn 0.3s ease-out both;
}

/* 浼樺厛绾ф寚绀虹伅 */
.prio-indicator {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: var(--space-2);
  vertical-align: middle;
}

.prio-indicator.prio-high {
  background: var(--color-danger);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}
.prio-indicator.prio-medium {
  background: var(--color-warning);
  box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
}
.prio-indicator.prio-low {
  background: var(--color-info);
}

.col-check {
  width: 44px;
  text-align: center;
}
.col-idx {
  width: 50px;
  text-align: center;
}
.col-title {
  min-width: 220px;
}
.col-desc {
  min-width: 160px;
  max-width: 240px;
}
.col-priority {
  width: 80px;
  text-align: center;
}
.col-tag {
  width: 100px;
}
.col-date {
  width: 110px;
}
.col-status {
  width: 90px;
  text-align: center;
}
.col-remain {
  width: 80px;
  text-align: center;
}
.col-reminder {
  width: 90px;
  text-align: center;
}
.col-reminder-status {
  width: 100px;
  text-align: center;
}
.col-remark {
  min-width: 140px;
  max-width: 180px;
}
.col-actions {
  width: 130px;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.desc-cell {
  overflow-wrap: break-word;
  word-wrap: break-word;
  max-width: 200px;
  color: var(--color-text-tertiary);
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  color: transparent;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.checkbox:hover {
  border-color: var(--color-accent);
}
.checkbox.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.priority-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}
.p-high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.p-medium {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.p-low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.tag-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}

.status-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}
.s-completed {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.s-overdue {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  animation: overduePulse 2s ease-in-out infinite;
}
.s-pending {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.repeat-badge {
  font-size: 12px;
}
.auto-badge {
  font-size: 11px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.subtask-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.remain-badge {
  font-size: 12px;
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.remain-badge.overdue {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.remain-badge.urgent {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.remain-badge.normal {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.remain-badge.safe {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.reminder-status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.reminder-status-badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.reminder-status-badge.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.reminder-status-badge.done {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.reminder-status-badge.normal {
  color: var(--color-text-tertiary);
}

.remark-cell {
  overflow-wrap: break-word;
  word-wrap: break-word;
  max-width: 150px;
  color: var(--color-text-tertiary);
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: var(--space-1) var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}
.action-btn:hover {
  background: var(--color-surface-hover);
}
.action-btn.danger:hover {
  background: var(--color-danger-subtle);
}

.action-btn-sm {
  height: 28px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.action-btn-sm:hover {
  background: var(--color-surface-hover);
  color: var(--color-accent);
}
.action-btn-sm.danger:hover {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
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
.col-title,
.col-desc,
.col-priority,
.col-tag,
.col-date,
.col-reminder,
.col-remark {
  cursor: pointer;
}

.text-muted {
  color: var(--color-text-tertiary);
}

/* 鍒楄〃瑙嗗浘 */
.todo-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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

.list-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
  animation: listSlideIn 0.3s ease-out both;
}

.list-row:hover {
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
  transform: translateX(2px);
}
.list-row.prio-high {
  border-left-color: var(--color-danger);
}
.list-row.prio-medium {
  border-left-color: var(--color-warning);
}
.list-row.prio-low {
  border-left-color: var(--color-info);
}
.list-row.completed-row {
  opacity: 0.5;
}
.list-row.completed-row .list-title {
  text-decoration: line-through;
}
.list-check {
  padding-top: var(--space-1);
}
.list-body {
  flex: 1;
  min-width: 0;
}
.list-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}
.list-notes {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
  max-width: 400px;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.list-meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-1);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.meta-date,
.meta-progress,
.meta-sub {
  font-size: 10px;
}
.list-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}
.list-actions {
  display: flex;
  gap: var(--space-1);
}

/* 鍒楄〃杩涘害鏉?*/
.list-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  max-width: 200px;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.progress-fill.done {
  background: var(--color-success);
}
.progress-fill.high {
  background: var(--color-info);
}
.progress-fill.mid {
  background: var(--color-warning);
}
.progress-fill.low {
  background: var(--color-danger);
}

.progress-text {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  min-width: 28px;
}

/* 鍗＄墖瑙嗗浘 */
.todo-card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
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

.todo-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.25s ease;
  animation: cardFadeIn 0.4s ease-out both;
}

.todo-card:hover {
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.todo-card.completed-card {
  opacity: 0.5;
}
.todo-card.overdue-card {
  border-color: rgba(239, 68, 68, 0.3);
}

.card-prio-bar {
  height: 3px;
}
.card-prio-bar.prio-high {
  background: linear-gradient(90deg, var(--color-danger), #ff7b7b);
}
.card-prio-bar.prio-medium {
  background: linear-gradient(90deg, var(--color-warning), #fbbf24);
}
.card-prio-bar.prio-low {
  background: linear-gradient(90deg, var(--color-info), #60a5fa);
}
.card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) 0;
}
.card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}
.card-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-4) 0;
}
.card-subtasks {
  padding: var(--space-2) var(--space-4) 0;
}
.subtask-header {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}
.subtask-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  padding: var(--space-1) 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.subtask-item.completed {
  text-decoration: line-through;
  opacity: 0.5;
}
.subtask-check {
  cursor: pointer;
}
.card-tags {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4) 0;
  flex-wrap: wrap;
}
.card-info {
  padding: var(--space-2) var(--space-4) 0;
}
.info-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-1) 0;
}
.card-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4) var(--space-3);
  gap: var(--space-2);
}
.card-actions {
  display: flex;
  gap: var(--space-1);
}

/* 鏃ュ巻瑙嗗浘 */
.todo-calendar-view {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.todo-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.todo-calendar-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.todo-calendar-nav {
  display: flex;
  gap: var(--space-2);
}
.todo-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--color-border);
}
.todo-calendar-weekday {
  text-align: center;
  padding: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
}
.todo-calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.todo-calendar-day {
  min-height: 90px;
  border: 1px solid var(--color-border);
  border-top: none;
  border-left: none;
  padding: var(--space-1);
  transition: background 0.2s;
}
.todo-calendar-day:nth-child(7n) {
  border-right: none;
}
.todo-calendar-day.other-month {
  background: var(--color-bg-tertiary);
}
.todo-calendar-day.today {
  background: var(--color-accent-subtle);
}
.todo-calendar-day:hover {
  background: var(--color-surface-hover);
}
.todo-calendar-day-num {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.todo-calendar-day-num.is-today {
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

.todo-calendar-day-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.todo-calendar-item {
  font-size: 9px;
  padding: var(--space-1) var(--space-2);
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.todo-calendar-item:hover {
  transform: scale(1.02);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.todo-calendar-item.high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.todo-calendar-item.medium {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.todo-calendar-item.low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.todo-calendar-item.completed {
  background: var(--color-success-subtle);
  color: var(--color-success);
  text-decoration: line-through;
}
.todo-calendar-more {
  font-size: 9px;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-1);
}

/* 鍛ㄨ鍥?*/
.todo-week-view {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.todo-week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.todo-week-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.todo-week-nav {
  display: flex;
  gap: var(--space-2);
}
.todo-week-day-columns {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
  background: var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.todo-week-day-col {
  background: var(--color-bg-primary);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  transition: background 0.2s;
}
.todo-week-day-col.is-today {
  background: var(--color-accent-subtle);
}
.todo-week-day-header {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  position: relative;
}
.todo-week-day-header.today {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.todo-week-day-header .day-num {
  font-size: var(--font-size-sm);
}

/* 鍛ㄨ鍥惧緟鍔炶鏁?badge */
.week-day-count-badge {
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-1);
  margin-left: var(--space-1);
}

.todo-week-day-items {
  flex: 1;
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}
.todo-week-item {
  font-size: 10px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  transition: transform 0.15s;
}
.todo-week-item:hover {
  transform: translateX(2px);
}

/* 鍛ㄨ鍥句紭鍏堢骇灏忓渾鐐?*/
.week-item-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.week-item-dot.high {
  background: var(--color-danger);
}
.week-item-dot.medium {
  background: var(--color-warning);
}
.week-item-dot.low {
  background: var(--color-info);
}

.todo-week-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.todo-week-item-due {
  font-size: 9px;
  opacity: 0.7;
  flex-shrink: 0;
}
.todo-week-item.high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.todo-week-item.medium {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.todo-week-item.low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.todo-week-item.completed {
  background: var(--color-success-subtle);
  color: var(--color-success);
  text-decoration: line-through;
}
.todo-week-empty {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4) 0;
}

/* 绌虹姸鎬?*/
.empty-state {
  text-align: center;
  padding: var(--space-16) 0;
}
.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-text {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.empty-sub {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

/* 寮圭獥 */
.modal-overlay {
  animation: fade-in 200ms ease;
}
.modal-dialog {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  animation: slide-up 200ms ease;
}
.modal-sm {
  max-width: 400px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}
.modal-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
.btn-danger {
  background: var(--color-danger);
  color: #fff;
  border-color: var(--color-danger);
}
.btn-danger:hover {
  opacity: 0.9;
}

/* 纭寮圭獥鍥炬爣 */
.confirm-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
}
.form-textarea {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  resize: vertical;
  outline: none;
}
.form-textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.subtask-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.subtask-edit-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.subtask-check-edit {
  cursor: pointer;
  font-size: 14px;
}
.subtask-input {
  flex: 1;
}
.subtask-add-row {
  display: flex;
  gap: var(--space-2);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .todo-card-view {
    grid-template-columns: repeat(2, 1fr);
  }
  .todo-stats-bar {
    flex-wrap: wrap;
  }
  .stats-ring-section {
    border-right: none;
    padding-right: 0;
  }
}
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .todo-card-view {
    grid-template-columns: 1fr;
  }
  .page-header-actions {
    flex-direction: column;
    align-items: flex-start;
  }
  .stats-items {
    flex-wrap: wrap;
    gap: var(--space-3);
  }
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
</style>
